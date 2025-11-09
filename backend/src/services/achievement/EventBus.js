/**
 * EventBus - 事件总线
 * 用于发布和订阅成就相关事件
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * 订阅事件
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 回调函数
   */
  subscribe(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
  }

  /**
   * 取消订阅
   * @param {string} eventName
   * @param {Function} callback
   */
  unsubscribe(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      return;
    }

    const callbacks = this.listeners.get(eventName);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * 发布事件
   * @param {string} eventName
   * @param {Object} data - 事件数据
   */
  async publish(eventName, data) {
    if (!this.listeners.has(eventName)) {
      return;
    }

    const callbacks = this.listeners.get(eventName);
    for (const callback of callbacks) {
      try {
        await callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${eventName}:`, error);
      }
    }
  }

  /**
   * 清除所有监听器
   */
  clear() {
    this.listeners.clear();
  }
}

// 导出单例
const eventBus = new EventBus();
module.exports = eventBus;
