const logger = require('../utils/logger');

/**
 * EventBus - 事件总线
 * 用于解耦的事件驱动架构，支持异步处理和错误隔离
 */
class EventBus {
  constructor() {
    this.listeners = new Map(); // eventName -> [listener objects]
    this.stats = {
      totalEvents: 0,
      eventCounts: new Map(),
      errorCounts: new Map()
    };

    logger.info('EventBus initialized');
  }

  /**
   * 订阅事件
   * @param {string} eventName - 事件名称
   * @param {Function} handler - 处理函数
   * @param {Object} options - 配置选项
   * @param {number} options.priority - 优先级（数值越大优先级越高）
   * @param {boolean} options.async - 是否异步执行
   * @param {boolean} options.once - 是否只执行一次
   * @param {number} options.maxRetries - 最大重试次数
   * @param {number} options.retryDelay - 重试延迟（毫秒）
   * @param {number} options.timeout - 超时时间（毫秒）
   */
  on(eventName, handler, options = {}) {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    const listener = {
      handler,
      priority: options.priority || 0,
      async: options.async !== false, // 默认异步
      once: options.once || false,
      maxRetries: options.maxRetries || 0,
      retryDelay: options.retryDelay || 1000,
      timeout: options.timeout || 0,
      retries: 0,
      id: `${eventName}-${Date.now()}-${Math.random()}`
    };

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    this.listeners.get(eventName).push(listener);

    logger.debug('Event listener registered', {
      eventName,
      listenerId: listener.id,
      priority: listener.priority
    });

    return listener.id;
  }

  /**
   * 订阅一次性事件
   * @param {string} eventName - 事件名称
   * @param {Function} handler - 处理函数
   * @param {Object} options - 配置选项
   */
  once(eventName, handler, options = {}) {
    return this.on(eventName, handler, { ...options, once: true });
  }

  /**
   * 取消订阅
   * @param {string} eventName - 事件名称
   * @param {string} listenerId - 监听器ID（由on方法返回）
   */
  off(eventName, listenerId) {
    const listeners = this.listeners.get(eventName);
    if (!listeners) return false;

    const index = listeners.findIndex(l => l.id === listenerId);
    if (index !== -1) {
      listeners.splice(index, 1);
      logger.debug('Event listener removed', { eventName, listenerId });
      return true;
    }

    return false;
  }

  /**
   * 移除某个事件的所有监听器
   * @param {string} eventName - 事件名称
   */
  removeAllListeners(eventName) {
    if (eventName) {
      this.listeners.delete(eventName);
      logger.debug('All listeners removed for event', { eventName });
    } else {
      this.listeners.clear();
      logger.debug('All event listeners cleared');
    }
  }

  /**
   * 发布事件（异步，不等待监听器完成）
   * @param {string} eventName - 事件名称
   * @param {Object} data - 事件数据
   */
  async emit(eventName, data) {
    // 更新统计
    this.stats.totalEvents++;
    this.stats.eventCounts.set(
      eventName,
      (this.stats.eventCounts.get(eventName) || 0) + 1
    );

    const listeners = this.listeners.get(eventName);
    if (!listeners || listeners.length === 0) {
      logger.debug('No listeners for event', { eventName });
      return;
    }

    // 确保数据包含元信息
    const eventData = {
      eventName,
      timestamp: new Date().toISOString(),
      ...data
    };

    logger.info('Event emitted', {
      eventName,
      listenerCount: listeners.length,
      dataKeys: Object.keys(data)
    });

    // 按优先级排序
    const sorted = [...listeners].sort((a, b) => b.priority - a.priority);

    // 异步执行所有监听器（不等待结果）
    sorted.forEach(listener => {
      this._executeListener(listener, eventData, eventName)
        .catch(error => {
          this.stats.errorCounts.set(
            eventName,
            (this.stats.errorCounts.get(eventName) || 0) + 1
          );
          logger.error('Listener execution failed', {
            eventName,
            listenerId: listener.id,
            error: error.message,
            stack: error.stack
          });
        });
    });

    // 立即返回，不等待监听器完成
    return;
  }

  /**
   * 同步发布事件（等待所有监听器完成）
   * @param {string} eventName - 事件名称
   * @param {Object} data - 事件数据
   */
  async emitSync(eventName, data) {
    // 更新统计
    this.stats.totalEvents++;
    this.stats.eventCounts.set(
      eventName,
      (this.stats.eventCounts.get(eventName) || 0) + 1
    );

    const listeners = this.listeners.get(eventName);
    if (!listeners || listeners.length === 0) {
      logger.debug('No listeners for event', { eventName });
      return;
    }

    const eventData = {
      eventName,
      timestamp: new Date().toISOString(),
      ...data
    };

    logger.info('Event emitted (sync)', {
      eventName,
      listenerCount: listeners.length
    });

    // 按优先级排序
    const sorted = [...listeners].sort((a, b) => b.priority - a.priority);

    // 同步执行所有监听器
    const results = [];
    for (const listener of sorted) {
      try {
        const result = await this._executeListener(listener, eventData, eventName);
        results.push({ success: true, result });
      } catch (error) {
        this.stats.errorCounts.set(
          eventName,
          (this.stats.errorCounts.get(eventName) || 0) + 1
        );
        results.push({ success: false, error: error.message });
        logger.error('Listener execution failed (sync)', {
          eventName,
          listenerId: listener.id,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 执行单个监听器
   * @private
   */
  async _executeListener(listener, data, eventName) {
    try {
      let result;

      if (listener.timeout > 0) {
        // 带超时执行
        result = await Promise.race([
          listener.handler(data),
          this._timeout(listener.timeout, eventName, listener.id)
        ]);
      } else {
        // 正常执行
        result = await listener.handler(data);
      }

      // 如果是一次性监听器，执行后移除
      if (listener.once) {
        this.off(eventName, listener.id);
      }

      return result;
    } catch (error) {
      // 重试逻辑
      if (listener.retries < listener.maxRetries) {
        listener.retries++;
        logger.warn('Retrying listener', {
          eventName,
          listenerId: listener.id,
          attempt: listener.retries,
          maxRetries: listener.maxRetries
        });

        await this._delay(listener.retryDelay);
        return this._executeListener(listener, data, eventName);
      }

      throw error;
    }
  }

  /**
   * 超时Promise
   * @private
   */
  _timeout(ms, eventName, listenerId) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Listener timeout after ${ms}ms for event ${eventName} (${listenerId})`));
      }, ms);
    });
  }

  /**
   * 延迟Promise
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalEvents: this.stats.totalEvents,
      totalListeners: Array.from(this.listeners.values())
        .reduce((sum, listeners) => sum + listeners.length, 0),
      eventCounts: Object.fromEntries(this.stats.eventCounts),
      errorCounts: Object.fromEntries(this.stats.errorCounts),
      topEvents: Array.from(this.stats.eventCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([event, count]) => ({ event, count }))
    };
  }

  /**
   * 获取某个事件的监听器数量
   */
  listenerCount(eventName) {
    const listeners = this.listeners.get(eventName);
    return listeners ? listeners.length : 0;
  }

  /**
   * 获取所有事件名称
   */
  eventNames() {
    return Array.from(this.listeners.keys());
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalEvents: 0,
      eventCounts: new Map(),
      errorCounts: new Map()
    };
    logger.info('EventBus stats reset');
  }
}

// 导出单例
const eventBus = new EventBus();

module.exports = eventBus;
