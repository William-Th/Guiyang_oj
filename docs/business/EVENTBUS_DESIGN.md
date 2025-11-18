# EventBus 系统设计文档

**版本**: 1.0
**日期**: 2025-11-09
**状态**: 设计中

---

## 1. 概述

EventBus（事件总线）是成就系统和日常任务系统的核心组件，负责在业务事件发生时通知相关的监听器，实现解耦的事件驱动架构。

### 1.1 设计目标

- **解耦**: 业务逻辑不需要知道成就系统或任务系统的存在
- **可扩展**: 轻松添加新的事件监听器
- **异步处理**: 不阻塞主业务流程
- **容错**: 单个监听器失败不影响其他监听器
- **可追踪**: 完整的事件日志记录

### 1.2 核心概念

```
业务操作 → 发布事件 → EventBus → 通知监听器 → 成就检测/任务更新
```

---

## 2. 系统架构

### 2.1 组件关系图

```
┌─────────────────────────────────────────────────────────┐
│                     业务层 (Routes)                      │
├─────────────────────────────────────────────────────────┤
│  StudentActivities │ Auth │ Questions │ Grading │ ...   │
└──────────┬──────────────────────────────────┬───────────┘
           │                                  │
           │ emit('student.activity.completed')
           │                                  │
           ▼                                  ▼
┌─────────────────────────────────────────────────────────┐
│                     EventBus                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Event Registry                                   │   │
│  │  - student.activity.completed → [listeners]       │   │
│  │  - student.login → [listeners]                    │   │
│  │  - student.practice.completed → [listeners]       │   │
│  └──────────────────────────────────────────────────┘   │
└──────────┬──────────────────────────────────┬───────────┘
           │                                  │
           │ notify listeners                 │
           │                                  │
           ▼                                  ▼
┌──────────────────────┐         ┌──────────────────────┐
│ AchievementDetector  │         │ DailyTaskTracker     │
├──────────────────────┤         ├──────────────────────┤
│ - 检查触发条件        │         │ - 更新任务进度        │
│ - 授予成就           │         │ - 发放积分           │
│ - 发放积分           │         │ - 记录完成历史        │
└──────────────────────┘         └──────────────────────┘
```

### 2.2 数据流

```
1. 学生完成活动
   ↓
2. StudentActivitiesController.submitActivity()
   ↓
3. eventBus.emit('student.activity.completed', {
      studentId: 123,
      activityId: 456,
      score: 95,
      ...
   })
   ↓
4. EventBus查找该事件的所有监听器
   ↓
5. 异步调用各监听器
   ├─→ AchievementDetector.onActivityCompleted()
   │   └─→ 检查"第一滴血"、"完美答卷"等成就
   │
   └─→ DailyTaskTracker.onActivityCompleted()
       └─→ 更新"每日测评"、"一周完成3次测评"等任务
   ↓
6. 返回主流程，不阻塞响应
```

---

## 3. EventBus API设计

### 3.1 核心接口

```javascript
class EventBus {
  /**
   * 订阅事件
   * @param {string} eventName - 事件名称
   * @param {Function} listener - 监听器函数
   * @param {Object} options - 配置选项
   */
  on(eventName, listener, options = {}) {}

  /**
   * 订阅一次性事件
   * @param {string} eventName - 事件名称
   * @param {Function} listener - 监听器函数
   */
  once(eventName, listener) {}

  /**
   * 取消订阅
   * @param {string} eventName - 事件名称
   * @param {Function} listener - 监听器函数
   */
  off(eventName, listener) {}

  /**
   * 发布事件
   * @param {string} eventName - 事件名称
   * @param {Object} data - 事件数据
   */
  async emit(eventName, data) {}

  /**
   * 同步发布事件（等待所有监听器完成）
   * @param {string} eventName - 事件名称
   * @param {Object} data - 事件数据
   */
  async emitSync(eventName, data) {}

  /**
   * 移除某个事件的所有监听器
   * @param {string} eventName - 事件名称
   */
  removeAllListeners(eventName) {}
}
```

### 3.2 监听器选项

```javascript
{
  priority: 0,          // 优先级（数值越大优先级越高）
  async: true,          // 是否异步执行
  once: false,          // 是否只执行一次
  maxRetries: 0,        // 失败重试次数
  retryDelay: 1000,     // 重试延迟（毫秒）
  timeout: 5000         // 超时时间（毫秒）
}
```

---

## 4. 事件定义规范

### 4.1 命名规范

事件名称采用点分隔的命名空间：

```
<领域>.<实体>.<动作>
```

示例：
- `student.activity.completed` - 学生完成活动
- `student.login` - 学生登录
- `student.practice.completed` - 学生完成练习
- `teacher.question.reviewed` - 教师审核题目
- `admin.user.created` - 管理员创建用户

### 4.2 事件数据结构

所有事件数据应包含基础字段：

```javascript
{
  // 基础字段
  eventName: 'student.activity.completed',
  timestamp: '2025-11-09T10:30:00.000Z',
  source: 'StudentActivitiesController',

  // 业务数据
  studentId: 123,
  activityId: 456,
  score: 95,
  completedAt: '2025-11-09T10:29:55.000Z',

  // 可选元数据
  metadata: {
    ip: '127.0.0.1',
    userAgent: 'Mozilla/5.0...',
    // ...
  }
}
```

### 4.3 核心事件列表

#### 学生活动相关

| 事件名 | 说明 | 数据字段 |
|--------|------|----------|
| student.activity.completed | 完成活动 | studentId, activityId, score, completedAt |
| student.activity.started | 开始活动 | studentId, activityId, startedAt |
| student.activity.submitted | 提交答案 | studentId, activityId, answerId |
| student.high.score | 获得高分 | studentId, activityId, score, gradeLevel |

#### 学生登录相关

| 事件名 | 说明 | 数据字段 |
|--------|------|----------|
| student.login | 登录 | studentId, loginAt, method |
| student.login.morning | 早晨登录 | studentId, loginAt |
| student.first.login | 首次登录 | studentId, loginAt |

#### 学生练习相关

| 事件名 | 说明 | 数据字段 |
|--------|------|----------|
| student.practice.completed | 完成练习 | studentId, questionCount, correctCount |
| student.practice.fast | 快速完成 | studentId, questionCount, duration |
| student.practice.accuracy | 正确率记录 | studentId, accuracy, questionCount |

#### 日常任务相关

| 事件名 | 说明 | 数据字段 |
|--------|------|----------|
| student.daily.accuracy | 每日正确率 | studentId, accuracy, date |
| student.weekly.accuracy | 每周正确率 | studentId, accuracy, weekStart |
| student.monthly.accuracy | 每月正确率 | studentId, accuracy, monthStart |

---

## 5. 实现细节

### 5.1 EventBus单例模式

```javascript
// services/EventBus.js
class EventBus {
  constructor() {
    this.listeners = new Map(); // eventName -> [listeners]
    this.logger = require('../utils/logger');
  }

  // ... 方法实现
}

// 导出单例
module.exports = new EventBus();
```

### 5.2 异步处理

```javascript
async emit(eventName, data) {
  const listeners = this.listeners.get(eventName) || [];

  // 按优先级排序
  const sorted = listeners.sort((a, b) => b.priority - a.priority);

  // 异步执行，不等待结果
  sorted.forEach(listener => {
    this._executeListener(listener, data).catch(error => {
      this.logger.error(`Listener error for ${eventName}:`, error);
    });
  });
}
```

### 5.3 错误隔离

每个监听器独立执行，互不影响：

```javascript
async _executeListener(listener, data) {
  try {
    if (listener.timeout) {
      await Promise.race([
        listener.handler(data),
        this._timeout(listener.timeout)
      ]);
    } else {
      await listener.handler(data);
    }
  } catch (error) {
    this.logger.error('Listener execution failed:', error);

    // 重试逻辑
    if (listener.retries < listener.maxRetries) {
      listener.retries++;
      await this._delay(listener.retryDelay);
      return this._executeListener(listener, data);
    }

    throw error;
  }
}
```

### 5.4 日志记录

```javascript
emit(eventName, data) {
  this.logger.info('Event emitted', {
    eventName,
    dataKeys: Object.keys(data),
    listenerCount: (this.listeners.get(eventName) || []).length
  });

  // ... 执行逻辑
}
```

---

## 6. 集成示例

### 6.1 业务层发布事件

```javascript
// routes/studentActivities.js
const eventBus = require('../services/EventBus');

router.post('/:activityId/submit', authMiddleware, async (req, res) => {
  try {
    // 1. 业务逻辑：提交答案
    const result = await submitActivity(req.user.id, req.params.activityId, req.body);

    // 2. 发布事件（异步，不阻塞响应）
    eventBus.emit('student.activity.completed', {
      eventName: 'student.activity.completed',
      timestamp: new Date().toISOString(),
      source: 'StudentActivitiesController',
      studentId: req.user.id,
      activityId: req.params.activityId,
      score: result.score,
      completedAt: result.completedAt
    });

    // 3. 立即返回响应
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    // ... 错误处理
  }
});
```

### 6.2 成就检测器订阅事件

```javascript
// services/achievement/AchievementDetector.js
const eventBus = require('../EventBus');

class AchievementDetector {
  initialize() {
    // 订阅活动完成事件
    eventBus.on('student.activity.completed',
      this.onActivityCompleted.bind(this),
      { priority: 10 }
    );

    // 订阅登录事件
    eventBus.on('student.login',
      this.onStudentLogin.bind(this),
      { priority: 10 }
    );
  }

  async onActivityCompleted(data) {
    const { studentId, activityId, score } = data;

    // 检查"第一滴血"成就
    await this.checkFirstBlood(studentId);

    // 检查"完美答卷"成就
    if (score === 100) {
      await this.checkPerfectScore(studentId, activityId);
    }
  }
}
```

### 6.3 日常任务追踪器订阅事件

```javascript
// services/tasks/DailyTaskTracker.js
const eventBus = require('../EventBus');

class DailyTaskTracker {
  initialize() {
    eventBus.on('student.activity.completed',
      this.onActivityCompleted.bind(this),
      { priority: 5 }  // 优先级低于成就检测
    );
  }

  async onActivityCompleted(data) {
    const { studentId, activityId } = data;

    // 更新"每日测评"任务
    await this.updateDailyExamTask(studentId);

    // 更新"一周完成3次测评"任务
    await this.updateWeeklyExamTask(studentId);
  }
}
```

---

## 7. 性能考虑

### 7.1 异步执行

- 事件发布后立即返回，不等待监听器完成
- 监听器在后台异步执行
- 不阻塞主业务流程

### 7.2 批量处理

对于高频事件，考虑批量处理：

```javascript
class BatchProcessor {
  constructor(eventBus, batchSize = 100, intervalMs = 5000) {
    this.eventBus = eventBus;
    this.buffer = [];
    this.batchSize = batchSize;

    setInterval(() => this.flush(), intervalMs);
  }

  add(event) {
    this.buffer.push(event);
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  flush() {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0);
    this.processBatch(batch);
  }
}
```

### 7.3 内存管理

- 定期清理已完成的一次性监听器
- 限制事件历史记录大小
- 监控监听器数量

---

## 8. 测试策略

### 8.1 单元测试

```javascript
describe('EventBus', () => {
  it('should emit events to listeners', async () => {
    const listener = jest.fn();
    eventBus.on('test.event', listener);

    await eventBus.emit('test.event', { data: 'test' });

    expect(listener).toHaveBeenCalledWith({ data: 'test' });
  });

  it('should handle listener errors', async () => {
    const failingListener = jest.fn().mockRejectedValue(new Error('Test error'));
    eventBus.on('test.event', failingListener);

    await expect(eventBus.emit('test.event', {})).resolves.not.toThrow();
  });
});
```

### 8.2 集成测试

```javascript
describe('Achievement Integration', () => {
  it('should award achievement when event is emitted', async () => {
    await eventBus.emit('student.activity.completed', {
      studentId: 1,
      activityId: 1,
      score: 100
    });

    // 等待异步处理
    await new Promise(resolve => setTimeout(resolve, 1000));

    const achievements = await getStudentAchievements(1);
    expect(achievements).toContainEqual(
      expect.objectContaining({ achievement_code: 'FIRST_BLOOD' })
    );
  });
});
```

---

## 9. 监控和调试

### 9.1 事件统计

```javascript
class EventBus {
  constructor() {
    this.stats = {
      totalEvents: 0,
      eventCounts: new Map(),
      errorCounts: new Map()
    };
  }

  emit(eventName, data) {
    this.stats.totalEvents++;
    this.stats.eventCounts.set(
      eventName,
      (this.stats.eventCounts.get(eventName) || 0) + 1
    );

    // ... 发布逻辑
  }

  getStats() {
    return {
      totalEvents: this.stats.totalEvents,
      topEvents: Array.from(this.stats.eventCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    };
  }
}
```

### 9.2 调试模式

```javascript
if (process.env.DEBUG_EVENTS === 'true') {
  eventBus.on('*', (data) => {
    console.log('[EventBus Debug]', data.eventName, data);
  });
}
```

---

## 10. 部署和配置

### 10.1 环境变量

```env
# EventBus配置
EVENT_BUS_ENABLED=true
EVENT_BUS_ASYNC=true
EVENT_BUS_LOG_LEVEL=info
EVENT_BUS_MAX_LISTENERS=100
```

### 10.2 初始化顺序

```javascript
// server.js
async function initializeServer() {
  // 1. 初始化数据库连接
  await initDatabase();

  // 2. 初始化EventBus
  const eventBus = require('./services/EventBus');

  // 3. 注册监听器
  const achievementDetector = require('./services/achievement/AchievementDetector');
  await achievementDetector.initialize();

  const taskTracker = require('./services/tasks/DailyTaskTracker');
  await taskTracker.initialize();

  // 4. 启动服务器
  app.listen(PORT);
}
```

---

## 11. 未来扩展

### 11.1 持久化事件

考虑将事件持久化到数据库或消息队列：

```javascript
eventBus.on('*', async (data) => {
  await db.query(
    'INSERT INTO event_log (event_name, data, created_at) VALUES ($1, $2, NOW())',
    [data.eventName, JSON.stringify(data)]
  );
});
```

### 11.2 分布式事件总线

未来如果需要多实例部署，考虑使用Redis Pub/Sub：

```javascript
const redis = require('redis');
const publisher = redis.createClient();
const subscriber = redis.createClient();

eventBus.emit = async (eventName, data) => {
  await publisher.publish('events', JSON.stringify({ eventName, data }));
};

subscriber.subscribe('events');
subscriber.on('message', (channel, message) => {
  const { eventName, data } = JSON.parse(message);
  localEventBus.emit(eventName, data);
});
```

---

## 12. 参考资料

- Node.js EventEmitter: https://nodejs.org/api/events.html
- Event-driven architecture: https://martinfowler.com/articles/201701-event-driven.html
- Domain events pattern: https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-events-design-implementation

---

**文档版本**: 1.0
**最后更新**: 2025-11-09
**维护者**: 开发团队
