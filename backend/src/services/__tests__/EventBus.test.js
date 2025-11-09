const EventBus = require('../EventBus');

describe('EventBus', () => {
  let eventBus;

  beforeEach(() => {
    // 获取EventBus实例（单例）
    eventBus = EventBus;
    // 清理所有监听器
    eventBus.removeAllListeners();
    // 重置统计
    eventBus.resetStats();
  });

  describe('on() - 订阅事件', () => {
    it('should register a listener for an event', () => {
      const handler = jest.fn();
      const listenerId = eventBus.on('test.event', handler);

      expect(listenerId).toBeDefined();
      expect(eventBus.listenerCount('test.event')).toBe(1);
    });

    it('should throw error if handler is not a function', () => {
      expect(() => {
        eventBus.on('test.event', 'not a function');
      }).toThrow('Handler must be a function');
    });

    it('should support priority option', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on('test.event', handler1, { priority: 1 });
      eventBus.on('test.event', handler2, { priority: 10 });

      expect(eventBus.listenerCount('test.event')).toBe(2);
    });
  });

  describe('once() - 订阅一次性事件', () => {
    it('should register a one-time listener', () => {
      const handler = jest.fn();
      eventBus.once('test.event', handler);

      expect(eventBus.listenerCount('test.event')).toBe(1);
    });
  });

  describe('off() - 取消订阅', () => {
    it('should remove a specific listener', () => {
      const handler = jest.fn();
      const listenerId = eventBus.on('test.event', handler);

      const removed = eventBus.off('test.event', listenerId);

      expect(removed).toBe(true);
      expect(eventBus.listenerCount('test.event')).toBe(0);
    });

    it('should return false if listener not found', () => {
      const removed = eventBus.off('test.event', 'non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('removeAllListeners() - 移除所有监听器', () => {
    it('should remove all listeners for an event', () => {
      eventBus.on('test.event', jest.fn());
      eventBus.on('test.event', jest.fn());

      eventBus.removeAllListeners('test.event');

      expect(eventBus.listenerCount('test.event')).toBe(0);
    });

    it('should remove all listeners if no event specified', () => {
      eventBus.on('event1', jest.fn());
      eventBus.on('event2', jest.fn());

      eventBus.removeAllListeners();

      expect(eventBus.eventNames()).toHaveLength(0);
    });
  });

  describe('emit() - 发布事件', () => {
    it('should call all listeners for an event', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on('test.event', handler1);
      eventBus.on('test.event', handler2);

      await eventBus.emit('test.event', { data: 'test' });

      // 等待异步执行
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(handler1).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'test.event',
          data: 'test'
        })
      );
      expect(handler2).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'test.event',
          data: 'test'
        })
      );
    });

    it('should call listeners in priority order', async () => {
      const callOrder = [];
      const handler1 = jest.fn(() => callOrder.push(1));
      const handler2 = jest.fn(() => callOrder.push(2));
      const handler3 = jest.fn(() => callOrder.push(3));

      eventBus.on('test.event', handler1, { priority: 1 });
      eventBus.on('test.event', handler2, { priority: 10 });
      eventBus.on('test.event', handler3, { priority: 5 });

      await eventBus.emit('test.event', {});

      // 等待异步执行
      await new Promise(resolve => setTimeout(resolve, 100));

      // 应该按priority降序执行: handler2(10) -> handler3(5) -> handler1(1)
      expect(callOrder).toEqual([2, 3, 1]);
    });

    it('should not throw if no listeners registered', async () => {
      await expect(
        eventBus.emit('non-existent.event', {})
      ).resolves.not.toThrow();
    });

    it('should handle listener errors gracefully', async () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalHandler = jest.fn();

      eventBus.on('test.event', errorHandler);
      eventBus.on('test.event', normalHandler);

      await eventBus.emit('test.event', {});

      // 等待异步执行
      await new Promise(resolve => setTimeout(resolve, 100));

      // 正常handler应该仍然被调用
      expect(normalHandler).toHaveBeenCalled();
    });
  });

  describe('emitSync() - 同步发布事件', () => {
    it('should wait for all listeners to complete', async () => {
      const handler1 = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'result1';
      });
      const handler2 = jest.fn(async () => {
        return 'result2';
      });

      eventBus.on('test.event', handler1);
      eventBus.on('test.event', handler2);

      const results = await eventBus.emitSync('test.event', {});

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ success: true, result: 'result1' });
      expect(results[1]).toEqual({ success: true, result: 'result2' });
    });

    it('should return error results for failed listeners', async () => {
      const handler = jest.fn(() => {
        throw new Error('Test error');
      });

      eventBus.on('test.event', handler);

      const results = await eventBus.emitSync('test.event', {});

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Test error');
    });
  });

  describe('once listener', () => {
    it('should be called only once', async () => {
      const handler = jest.fn();

      eventBus.once('test.event', handler);

      await eventBus.emit('test.event', {});
      await new Promise(resolve => setTimeout(resolve, 100));

      await eventBus.emit('test.event', {});
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(eventBus.listenerCount('test.event')).toBe(0);
    });
  });

  describe('getStats() - 获取统计信息', () => {
    it('should track event counts', async () => {
      eventBus.on('test.event', jest.fn());

      await eventBus.emit('test.event', {});
      await eventBus.emit('test.event', {});
      await eventBus.emit('test.event', {});

      const stats = eventBus.getStats();

      expect(stats.totalEvents).toBe(3);
      expect(stats.eventCounts['test.event']).toBe(3);
    });

    it('should track listener count', () => {
      eventBus.on('event1', jest.fn());
      eventBus.on('event2', jest.fn());
      eventBus.on('event2', jest.fn());

      const stats = eventBus.getStats();

      expect(stats.totalListeners).toBe(3);
    });

    it('should track top events', async () => {
      eventBus.on('event1', jest.fn());
      eventBus.on('event2', jest.fn());

      await eventBus.emit('event1', {});
      await eventBus.emit('event1', {});
      await eventBus.emit('event1', {});
      await eventBus.emit('event2', {});

      const stats = eventBus.getStats();

      expect(stats.topEvents[0]).toEqual({ event: 'event1', count: 3 });
    });
  });

  describe('eventNames() - 获取所有事件名称', () => {
    it('should return all registered event names', () => {
      eventBus.on('event1', jest.fn());
      eventBus.on('event2', jest.fn());
      eventBus.on('event3', jest.fn());

      const names = eventBus.eventNames();

      expect(names).toEqual(expect.arrayContaining(['event1', 'event2', 'event3']));
      expect(names).toHaveLength(3);
    });
  });

  describe('listenerCount() - 获取监听器数量', () => {
    it('should return correct listener count', () => {
      eventBus.on('test.event', jest.fn());
      eventBus.on('test.event', jest.fn());

      expect(eventBus.listenerCount('test.event')).toBe(2);
    });

    it('should return 0 for event with no listeners', () => {
      expect(eventBus.listenerCount('non-existent')).toBe(0);
    });
  });
});
