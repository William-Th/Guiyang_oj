# 练习活动时间限制优化 - 详细工作计划

**项目名称**: 练习活动时间限制优化
**设计文档**: documents/PRACTICE_TIME_LIMIT_DESIGN.md
**预计工期**: 6-8 工作日
**开始日期**: 待定
**负责人**: 开发团队

---

## 工作计划概览

本文档提供练习活动时间限制优化功能的详细实施计划，包括每个阶段的具体任务、交付物和验收标准。

### 阶段划分

| 阶段 | 工作内容 | 预计时间 | 状态 |
|------|---------|---------|------|
| **阶段1** | 数据库设计与迁移 | 1天 | ⏸️ 未开始 |
| **阶段2** | 后端 API 开发 | 2-3天 | ⏸️ 未开始 |
| **阶段3** | 前端开发 | 2-3天 | ⏸️ 未开始 |
| **阶段4** | E2E 测试 | 1-2天 | ⏸️ 未开始 |
| **阶段5** | 文档与部署 | 0.5天 | ⏸️ 未开始 |

---

## 阶段1: 数据库设计与迁移 (1天)

### 1.1 任务清单

#### 任务 1.1: 编写数据库迁移脚本
**文件**: `database/migrations/004_practice_time_limit_types.sql`

**详细步骤**:
- [ ] 创建迁移文件
- [ ] 添加 `time_limit_type` 字段到 activities 表
  ```sql
  ALTER TABLE activities
  ADD COLUMN time_limit_type VARCHAR(20) NOT NULL DEFAULT 'unlimited'
    CHECK (time_limit_type IN ('unlimited', 'scheduled', 'timed'));
  ```
- [ ] 添加数据库约束（互斥逻辑）
  - [ ] unlimited 类型不应设置 start_time, end_time, duration
  - [ ] scheduled 类型必须设置 start_time 和 end_time，不设置 duration
  - [ ] timed 类型必须设置 duration，不设置 start_time 和 end_time
  - [ ] scheduled 类型的 end_time > start_time
  - [ ] timed 类型的 duration > 0
- [ ] 添加索引
  ```sql
  CREATE INDEX idx_activities_time_limit_type ON activities(time_limit_type);
  CREATE INDEX idx_activities_time_range ON activities(start_time, end_time)
    WHERE time_limit_type = 'scheduled';
  ```
- [ ] 添加 `started_at` 和 `time_limit_deadline` 字段到 student_activities 表
  ```sql
  ALTER TABLE student_activities
  ADD COLUMN started_at TIMESTAMP,
  ADD COLUMN time_limit_deadline TIMESTAMP;

  CREATE INDEX idx_student_activities_deadline
  ON student_activities(time_limit_deadline)
  WHERE status = 'in_progress';
  ```
- [ ] 迁移现有数据
  ```sql
  UPDATE activities
  SET time_limit_type = CASE
    WHEN duration IS NOT NULL THEN 'timed'
    WHEN start_time IS NOT NULL AND end_time IS NOT NULL THEN 'scheduled'
    ELSE 'unlimited'
  END
  WHERE time_limit_type IS NULL;
  ```
- [ ] 清理不一致数据
- [ ] 添加回滚脚本

**验收标准**:
- [x] 迁移脚本可以成功执行
- [x] 数据库约束正确生效
- [x] 现有数据正确分类
- [x] 索引创建成功
- [x] 回滚脚本可以成功执行

---

#### 任务 1.2: 在测试环境测试迁移
**预计时间**: 2小时

**详细步骤**:
- [ ] 备份测试数据库
  ```bash
  docker exec guiyang_oj_postgres pg_dump -U postgres guiyang_oj > backup_before_time_limit_migration_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] 执行迁移脚本
  ```bash
  docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/migrations/004_practice_time_limit_types.sql
  ```
- [ ] 验证表结构
  ```bash
  docker exec guiyang_oj_postgres psql -U postgres -d guiyang_oj -c "\d activities"
  docker exec guiyang_oj_postgres psql -U postgres -d guiyang_oj -c "\d student_activities"
  ```
- [ ] 检查约束是否生效（手动插入测试数据验证）
  ```sql
  -- 测试 unlimited 不能设置时间字段
  INSERT INTO activities (..., time_limit_type, start_time) VALUES (..., 'unlimited', NOW());
  -- 应该失败

  -- 测试 scheduled 必须设置时间段
  INSERT INTO activities (..., time_limit_type) VALUES (..., 'scheduled');
  -- 应该失败

  -- 测试 timed 必须设置 duration
  INSERT INTO activities (..., time_limit_type) VALUES (..., 'timed');
  -- 应该失败
  ```
- [ ] 测试回滚脚本
- [ ] 清理测试数据

**验收标准**:
- [x] 迁移成功执行，无错误
- [x] 约束正确拦截非法数据
- [x] 合法数据可以正常插入
- [x] 回滚脚本正常工作

---

#### 任务 1.3: 文档更新
**预计时间**: 30分钟

- [ ] 更新 database/schema.sql 中 activities 表定义
- [ ] 更新 database/schema.sql 中 student_activities 表定义
- [ ] 在迁移脚本中添加详细注释
- [ ] 创建迁移记录在 CHANGELOG.md（如果有）

---

## 阶段2: 后端 API 开发 (2-3天)

### 2.1 任务清单

#### 任务 2.1: 修改 Activity Model
**文件**: `backend/src/models/Activity.js`
**预计时间**: 3小时

**详细步骤**:
- [ ] 添加 `validateTimeLimitConfig()` 静态方法
  ```javascript
  static validateTimeLimitConfig(activityData) {
    const { time_limit_type, start_time, end_time, duration } = activityData;

    if (time_limit_type === 'unlimited') {
      if (start_time || end_time || duration) {
        throw new Error('无时间限制类型不应设置时间字段');
      }
    }

    if (time_limit_type === 'scheduled') {
      if (!start_time || !end_time) {
        throw new Error('固定时间段类型必须设置开始和结束时间');
      }
      if (duration) {
        throw new Error('固定时间段类型不应设置作答时长');
      }
      if (new Date(end_time) <= new Date(start_time)) {
        throw new Error('结束时间必须晚于开始时间');
      }
    }

    if (time_limit_type === 'timed') {
      if (!duration || duration <= 0) {
        throw new Error('限时作答类型必须设置正确的作答时长');
      }
      if (start_time || end_time) {
        throw new Error('限时作答类型不应设置固定时间段');
      }
    }
  }
  ```
- [ ] 在 `create()` 方法中调用验证
- [ ] 在 `update()` 方法中调用验证
- [ ] 添加 JSDoc 文档注释

**验收标准**:
- [x] 验证逻辑正确实现
- [x] 三种类型的非法配置都能正确拦截
- [x] 合法配置可以正常创建/更新

---

#### 任务 2.2: 更新活动创建/编辑接口
**文件**: `backend/src/routes/activities.js`, `backend/src/controllers/activityController.js`
**预计时间**: 2小时

**详细步骤**:
- [ ] 修改 `POST /api/activities` 接口
  - [ ] 接受 `time_limit_type` 参数
  - [ ] 根据类型接受相应的时间字段
  - [ ] 调用 Model 验证方法
  - [ ] 返回创建的活动（包含 time_limit_type）
- [ ] 修改 `PUT /api/activities/:id` 接口
  - [ ] 同上验证逻辑
  - [ ] 检查活动状态（published 状态不允许修改时间限制类型）
- [ ] 更新 API 错误处理
  - [ ] 返回清晰的错误信息
  - [ ] 包含验证失败的具体原因

**测试请求示例**:
```bash
# 创建无时间限制练习
curl -X POST http://localhost:3001/api/activities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "practice",
    "title": "数学基础练习",
    "time_limit_type": "unlimited"
  }'

# 创建固定时间段练习
curl -X POST http://localhost:3001/api/activities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "practice",
    "title": "周五课堂练习",
    "time_limit_type": "scheduled",
    "start_time": "2025-10-25T14:00:00Z",
    "end_time": "2025-10-25T16:00:00Z"
  }'

# 创建限时作答练习
curl -X POST http://localhost:3001/api/activities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "practice",
    "title": "30分钟速算练习",
    "time_limit_type": "timed",
    "duration": 30
  }'
```

**验收标准**:
- [x] 三种类型的活动都能成功创建
- [x] 非法配置返回 400 错误和明确错误信息
- [x] 活动编辑接口正常工作
- [x] published 状态的活动不允许修改时间限制类型

---

#### 任务 2.3: 实现学生开始作答接口
**文件**: `backend/src/routes/studentActivities.js`, `backend/src/controllers/studentActivityController.js`
**预计时间**: 4小时

**详细步骤**:
- [ ] 创建或修改 `POST /api/student-activities/start` 接口
- [ ] 实现业务逻辑
  ```javascript
  async function startActivity(req, res) {
    const { activity_id } = req.body;
    const student_id = req.user.id;
    const now = new Date();

    // 1. 获取活动信息
    const activity = await Activity.findById(activity_id);

    // 2. 检查时间限制
    if (activity.time_limit_type === 'scheduled') {
      if (now < activity.start_time) {
        return res.status(403).json({
          success: false,
          message: '活动尚未开始',
          start_time: activity.start_time
        });
      }
      if (now > activity.end_time) {
        return res.status(403).json({
          success: false,
          message: '活动已结束'
        });
      }
    }

    // 3. 创建学生作答记录
    const studentActivity = await StudentActivity.create({
      student_id,
      activity_id,
      status: 'in_progress',
      started_at: activity.time_limit_type === 'timed' ? now : null,
      time_limit_deadline: calculateDeadline(activity, now)
    });

    // 4. 返回结果
    return res.json({
      success: true,
      data: {
        student_activity_id: studentActivity.id,
        started_at: studentActivity.started_at,
        deadline: studentActivity.time_limit_deadline,
        time_limit_type: activity.time_limit_type,
        duration: activity.duration,
        remaining_seconds: calculateRemainingSeconds(studentActivity)
      }
    });
  }

  function calculateDeadline(activity, startTime) {
    if (activity.time_limit_type === 'unlimited') {
      return null;
    }
    if (activity.time_limit_type === 'scheduled') {
      return activity.end_time;
    }
    if (activity.time_limit_type === 'timed') {
      return new Date(startTime.getTime() + activity.duration * 60 * 1000);
    }
  }
  ```
- [ ] 添加权限检查（学生只能开始自己的作答）
- [ ] 添加重复开始检查（如果已有 in_progress 的记录）
- [ ] 处理边界情况（活动不存在、活动未发布等）

**验收标准**:
- [x] 三种类型的活动都能正确开始
- [x] scheduled 类型在时间范围外拒绝开始
- [x] timed 类型正确记录 started_at 和 deadline
- [x] 返回正确的剩余时间信息
- [x] 重复开始请求被正确处理

---

#### 任务 2.4: 实现自动提交定时任务
**文件**: `backend/src/jobs/autoSubmitTimeoutActivities.js`, `backend/src/server.js`
**预计时间**: 4小时

**详细步骤**:
- [ ] 安装 node-cron
  ```bash
  npm install node-cron
  ```
- [ ] 创建定时任务文件
  ```javascript
  // backend/src/jobs/autoSubmitTimeoutActivities.js
  const StudentActivity = require('../models/StudentActivity');
  const { submitActivity } = require('../controllers/studentActivityController');

  async function checkAndSubmitTimeoutActivities() {
    const now = new Date();
    console.log(`[AUTO-SUBMIT] Checking timeout activities at ${now.toISOString()}`);

    try {
      // 查找所有超时但未提交的作答
      const timeoutRecords = await StudentActivity.find({
        status: 'in_progress',
        time_limit_deadline: { $lte: now }
      });

      console.log(`[AUTO-SUBMIT] Found ${timeoutRecords.length} timeout records`);

      for (const record of timeoutRecords) {
        try {
          // 自动提交
          await submitActivity(record.id, {
            auto_submit: true,
            submit_time: now
          });

          console.log(`[AUTO-SUBMIT] Successfully submitted student_activity_id=${record.id}`);
        } catch (error) {
          console.error(`[AUTO-SUBMIT] Failed to submit student_activity_id=${record.id}`, error);
        }
      }
    } catch (error) {
      console.error('[AUTO-SUBMIT] Error in checkAndSubmitTimeoutActivities:', error);
    }
  }

  module.exports = { checkAndSubmitTimeoutActivities };
  ```
- [ ] 在 server.js 中配置定时任务
  ```javascript
  // backend/src/server.js
  const cron = require('node-cron');
  const { checkAndSubmitTimeoutActivities } = require('./jobs/autoSubmitTimeoutActivities');

  // 每分钟执行一次检查
  cron.schedule('* * * * *', checkAndSubmitTimeoutActivities);
  console.log('[CRON] Auto-submit timeout activities job scheduled (every minute)');
  ```
- [ ] 实现 submitActivity 方法（如果不存在）
  - [ ] 更新 student_activity 状态为 submitted
  - [ ] 记录提交时间
  - [ ] 标记是否为自动提交
  - [ ] 计算总分（如果已有答案）
- [ ] 添加日志记录（成功、失败、统计）
- [ ] 添加错误处理和重试机制

**验收标准**:
- [x] 定时任务每分钟正确执行
- [x] 超时的作答被正确提交
- [x] 日志清晰记录执行情况
- [x] 错误处理健壮，不会导致任务崩溃
- [x] 性能可接受（查询优化，索引利用）

---

#### 任务 2.5: 编写后端单元测试
**文件**: `backend/tests/unit/activity-time-limit.test.js`
**预计时间**: 3小时

**详细步骤**:
- [ ] 测试 Activity Model 验证逻辑
  ```javascript
  describe('Activity Time Limit Validation', () => {
    test('创建 unlimited 类型 - 成功', async () => {
      const activity = await Activity.create({
        time_limit_type: 'unlimited',
        title: '无限制练习'
      });
      expect(activity.time_limit_type).toBe('unlimited');
    });

    test('unlimited 设置 start_time - 失败', async () => {
      await expect(Activity.create({
        time_limit_type: 'unlimited',
        start_time: new Date()
      })).rejects.toThrow('无时间限制类型不应设置时间字段');
    });

    // ... 更多测试用例
  });
  ```
- [ ] 测试开始作答接口
  - [ ] scheduled 类型在不同时间点的行为
  - [ ] timed 类型的 deadline 计算
  - [ ] unlimited 类型的正常开始
- [ ] 测试自动提交逻辑
  - [ ] 模拟超时场景
  - [ ] 验证提交结果
- [ ] 使用 Jest 的时间控制功能（jest.useFakeTimers）

**验收标准**:
- [x] 测试覆盖率 > 80%
- [x] 所有关键路径都有测试覆盖
- [x] 边界条件测试完备
- [x] 测试可以稳定通过

---

## 阶段3: 前端开发 (2-3天)

### 3.1 任务清单

#### 任务 3.1: 更新 TypeScript 类型定义
**文件**: `frontend/src/types/activity.ts`
**预计时间**: 1小时

**详细步骤**:
- [ ] 添加 TimeLimitType 枚举
  ```typescript
  export enum TimeLimitType {
    UNLIMITED = 'unlimited',
    SCHEDULED = 'scheduled',
    TIMED = 'timed'
  }
  ```
- [ ] 更新 Activity 接口
  ```typescript
  export interface Activity {
    // ... 现有字段
    time_limit_type: TimeLimitType;
    start_time?: string;
    end_time?: string;
    duration?: number;
  }
  ```
- [ ] 更新 StudentActivity 接口
  ```typescript
  export interface StudentActivity {
    // ... 现有字段
    started_at?: string;
    time_limit_deadline?: string;
  }
  ```
- [ ] 添加辅助类型
  ```typescript
  export interface TimeLimit {
    type: TimeLimitType;
    startTime?: Date;
    endTime?: Date;
    duration?: number;
  }

  export interface RemainingTime {
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  }
  ```

**验收标准**:
- [x] 类型定义完整无遗漏
- [x] TypeScript 编译无错误
- [x] 类型与后端 API 一致

---

#### 任务 3.2: 修改创建/编辑活动表单
**文件**: `frontend/src/pages/teacher/ActivityFormPage.tsx`
**预计时间**: 4小时

**详细步骤**:
- [ ] 添加时间限制类型选择器
  ```tsx
  <Form.Item label="时间限制类型" name="time_limit_type" initialValue="unlimited">
    <Radio.Group onChange={(e) => setTimeLimitType(e.target.value)}>
      <Radio value="unlimited">
        <Space direction="vertical" size={0}>
          <span>无时间限制</span>
          <span style={{ fontSize: '12px', color: '#888' }}>
            学生可以随时开始，不限时长
          </span>
        </Space>
      </Radio>
      <Radio value="scheduled">
        <Space direction="vertical" size={0}>
          <span>固定时间段</span>
          <span style={{ fontSize: '12px', color: '#888' }}>
            只能在指定时间段内参加
          </span>
        </Space>
      </Radio>
      <Radio value="timed">
        <Space direction="vertical" size={0}>
          <span>限时作答</span>
          <span style={{ fontSize: '12px', color: '#888' }}>
            从开始作答时计时
          </span>
        </Space>
      </Radio>
    </Radio.Group>
  </Form.Item>
  ```
- [ ] 实现动态表单项显示
  ```tsx
  {timeLimitType === 'scheduled' && (
    <>
      <Form.Item
        label="开始时间"
        name="start_time"
        rules={[{ required: true, message: '请选择开始时间' }]}
      >
        <DatePicker
          showTime
          format="YYYY-MM-DD HH:mm:ss"
          placeholder="选择开始时间"
          style={{ width: '100%' }}
        />
      </Form.Item>
      <Form.Item
        label="结束时间"
        name="end_time"
        rules={[
          { required: true, message: '请选择结束时间' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              const startTime = getFieldValue('start_time');
              if (!value || !startTime || value > startTime) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('结束时间必须晚于开始时间'));
            }
          })
        ]}
      >
        <DatePicker
          showTime
          format="YYYY-MM-DD HH:mm:ss"
          placeholder="选择结束时间"
          style={{ width: '100%' }}
        />
      </Form.Item>
    </>
  )}

  {timeLimitType === 'timed' && (
    <Form.Item
      label="作答时长"
      name="duration"
      rules={[
        { required: true, message: '请输入作答时长' },
        { type: 'number', min: 1, message: '时长必须大于0' }
      ]}
    >
      <InputNumber
        min={1}
        placeholder="例如: 30"
        addonAfter="分钟"
        style={{ width: '100%' }}
      />
    </Form.Item>
  )}
  ```
- [ ] 表单提交前清理不需要的字段
  ```typescript
  const handleSubmit = (values: any) => {
    const cleanedValues = { ...values };

    if (cleanedValues.time_limit_type === 'unlimited') {
      delete cleanedValues.start_time;
      delete cleanedValues.end_time;
      delete cleanedValues.duration;
    } else if (cleanedValues.time_limit_type === 'scheduled') {
      delete cleanedValues.duration;
    } else if (cleanedValues.time_limit_type === 'timed') {
      delete cleanedValues.start_time;
      delete cleanedValues.end_time;
    }

    // 提交到后端...
  };
  ```
- [ ] 添加表单初始值处理（编辑模式）
- [ ] 添加表单验证提示

**验收标准**:
- [x] 三种类型的表单项正确显示/隐藏
- [x] 表单验证正确（必填项、时间顺序、数值范围）
- [x] 提交数据格式正确
- [x] 编辑模式正确加载现有值
- [x] 用户体验流畅

---

#### 任务 3.3: 实现倒计时组件
**文件**: `frontend/src/components/common/CountdownTimer.tsx`
**预计时间**: 3小时

**详细步骤**:
- [ ] 创建倒计时组件
  ```tsx
  import React, { useState, useEffect } from 'react';
  import { Alert, Progress } from 'antd';
  import { ClockCircleOutlined } from '@ant-design/icons';

  interface CountdownTimerProps {
    deadline: string;  // ISO 8601 格式
    onTimeout: () => void;
    warningThreshold?: number;  // 警告阈值（秒）
  }

  export const CountdownTimer: React.FC<CountdownTimerProps> = ({
    deadline,
    onTimeout,
    warningThreshold = 300  // 默认5分钟
  }) => {
    const [remaining, setRemaining] = useState<number>(0);
    const [isWarning, setIsWarning] = useState(false);

    useEffect(() => {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const end = new Date(deadline).getTime();
        const diff = Math.max(0, end - now);

        const totalSeconds = Math.floor(diff / 1000);
        setRemaining(totalSeconds);
        setIsWarning(totalSeconds <= warningThreshold && totalSeconds > 0);

        if (diff <= 0) {
          clearInterval(interval);
          onTimeout();
        }
      }, 1000);

      return () => clearInterval(interval);
    }, [deadline, onTimeout, warningThreshold]);

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    const formatTime = () => {
      if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
      return `${minutes}:${String(seconds).padStart(2, '0')}`;
    };

    const getAlertType = () => {
      if (remaining === 0) return 'error';
      if (isWarning) return 'warning';
      return 'info';
    };

    return (
      <Alert
        message={
          <span>
            <ClockCircleOutlined /> 剩余时间: {formatTime()}
          </span>
        }
        type={getAlertType()}
        showIcon
        style={{
          marginBottom: 16,
          fontSize: isWarning ? '16px' : '14px',
          fontWeight: isWarning ? 'bold' : 'normal'
        }}
      />
    );
  };
  ```
- [ ] 添加声音提醒（可选，最后1分钟）
- [ ] 添加进度条显示
- [ ] 处理服务器时间同步（定期同步）
- [ ] 添加测试

**验收标准**:
- [x] 倒计时准确显示
- [x] 时间到达自动触发回调
- [x] 警告状态正确显示
- [x] 性能可接受（不卡顿）

---

#### 任务 3.4: 修改学生答题页面
**文件**: `frontend/src/pages/student/PracticeAnswerPage.tsx` (可能需要创建)
**预计时间**: 4小时

**详细步骤**:
- [ ] 显示倒计时组件（scheduled 和 timed 类型）
- [ ] 实现超时自动提交
  ```typescript
  const handleTimeout = async () => {
    Modal.warning({
      title: '时间已到',
      content: '答题时间已结束，系统将自动提交您的答案',
      onOk: async () => {
        await submitAnswers(true);  // auto_submit = true
      }
    });
  };
  ```
- [ ] 实现提前提交
  ```typescript
  const handleEarlySubmit = () => {
    Modal.confirm({
      title: '确认提交',
      content: '确定要提前提交答案吗？提交后将无法修改。',
      onOk: async () => {
        await submitAnswers(false);  // auto_submit = false
      }
    });
  };
  ```
- [ ] 处理页面刷新恢复
  ```typescript
  useEffect(() => {
    // 检查 localStorage 是否有进行中的答题
    const inProgressActivity = localStorage.getItem('in_progress_activity');
    if (inProgressActivity) {
      const data = JSON.parse(inProgressActivity);
      // 重新加载状态
      setStudentActivity(data);
      // 显示提示
      Modal.info({
        title: '检测到未完成的答题',
        content: '您有一个正在进行的练习，是否继续？',
        onOk: () => loadActivityProgress(data.id)
      });
    }
  }, []);
  ```
- [ ] 实现自动保存（定期保存答案到 localStorage）
- [ ] 实现网络恢复后同步

**验收标准**:
- [x] 倒计时正确显示
- [x] 超时自动提交功能正常
- [x] 提前提交功能正常
- [x] 页面刷新后可以恢复状态
- [x] 网络中断后可以恢复

---

#### 任务 3.5: 更新活动列表显示
**文件**: `frontend/src/pages/teacher/ActivityListPage.tsx`, `frontend/src/pages/student/PracticeListPage.tsx`
**预计时间**: 2小时

**详细步骤**:
- [ ] 添加时间限制类型列
  ```tsx
  {
    title: '时间限制',
    dataIndex: 'time_limit_type',
    key: 'time_limit_type',
    render: (type: TimeLimitType, record: Activity) => (
      <ActivityTimeInfo activity={record} />
    )
  }
  ```
- [ ] 实现 ActivityTimeInfo 组件
  ```tsx
  const ActivityTimeInfo: React.FC<{ activity: Activity }> = ({ activity }) => {
    const { time_limit_type, start_time, end_time, duration } = activity;

    if (time_limit_type === 'unlimited') {
      return <Tag color="green">无时间限制</Tag>;
    }

    if (time_limit_type === 'scheduled') {
      return (
        <Space direction="vertical" size={0}>
          <Tag color="blue">固定时间段</Tag>
          <div style={{ fontSize: '12px' }}>
            {dayjs(start_time).format('MM-DD HH:mm')} ~ {dayjs(end_time).format('MM-DD HH:mm')}
          </div>
        </Space>
      );
    }

    if (time_limit_type === 'timed') {
      return (
        <Space direction="vertical" size={0}>
          <Tag color="orange">限时作答</Tag>
          <div style={{ fontSize: '12px' }}>{duration} 分钟</div>
        </Space>
      );
    }
  };
  ```
- [ ] 在活动卡片视图中也添加时间信息
- [ ] 添加筛选器（可选，按时间限制类型筛选）

**验收标准**:
- [x] 时间限制类型正确显示
- [x] 格式清晰易懂
- [x] 在列表和卡片视图中都正确显示

---

## 阶段4: E2E 测试 (1-2天)

### 4.1 任务清单

#### 任务 4.1: 编写 E2E 测试用例
**文件**: `tests/e2e/regression/practice-time-limit.spec.ts`
**预计时间**: 6小时

**详细步骤**:
- [ ] 创建测试文件
- [ ] 编写测试用例 PTL001-PTL010

**测试用例清单**:

```typescript
// PTL001: 教师创建无时间限制练习
test('PTL001 - 创建无时间限制练习', async ({ page }) => {
  await loginAsTeacher(page);
  await page.goto('/teacher/activities/create/practice');

  await fillActivityForm(page, {
    title: `PTL001-无限制-${Date.now()}`,
    time_limit_type: 'unlimited'
  });

  await submitForm(page);

  // 验证创建成功
  await expect(page.locator('.ant-message-success')).toBeAttached();
});

// PTL002: 教师创建固定时间段练习
test('PTL002 - 创建固定时间段练习', async ({ page }) => {
  // ...
});

// PTL003: 教师创建限时作答练习
test('PTL003 - 创建限时作答练习', async ({ page }) => {
  // ...
});

// PTL004: 学生在固定时间段前尝试开始
test('PTL004 - 固定时间段前无法开始', async ({ page }) => {
  // ...
});

// PTL005: 学生在固定时间段内开始
test('PTL005 - 固定时间段内可以开始', async ({ page }) => {
  // ...
});

// PTL006: 学生在固定时间段后尝试开始
test('PTL006 - 固定时间段后无法开始', async ({ page }) => {
  // ...
});

// PTL007: 学生开始限时作答练习
test('PTL007 - 开始限时作答并显示倒计时', async ({ page }) => {
  // ...
});

// PTL008: 限时作答到时自动提交
test('PTL008 - 限时作答超时自动提交', async ({ page }) => {
  // 可能需要加速时间或使用较短的时长
});

// PTL009: 固定时间段到时自动提交
test('PTL009 - 固定时间段结束自动提交', async ({ page }) => {
  // ...
});

// PTL010: 学生提前提交无时间限制练习
test('PTL010 - 提前提交无时间限制练习', async ({ page }) => {
  // ...
});
```

- [ ] 实现辅助函数
  - [ ] createActivityWithTimeLimit()
  - [ ] startActivity()
  - [ ] waitForCountdown()
- [ ] 处理时间相关的测试（mock时间或使用实际等待）

**验收标准**:
- [x] 所有10个测试用例通过
- [x] 测试覆盖三种时间限制类型的主要场景
- [x] 测试稳定可重复

---

#### 任务 4.2: 性能测试
**预计时间**: 2小时

**详细步骤**:
- [ ] 测试定时任务性能
  - [ ] 模拟大量超时记录（如1000条）
  - [ ] 监控定时任务执行时间
  - [ ] 确保在1分钟内完成
- [ ] 测试前端倒计时性能
  - [ ] 同时开启多个倒计时
  - [ ] 监控 CPU 和内存占用
- [ ] 数据库查询优化
  - [ ] 检查索引使用情况
  - [ ] EXPLAIN 分析查询计划

**验收标准**:
- [x] 定时任务在合理时间内完成
- [x] 前端倒计时不影响用户体验
- [x] 数据库查询使用索引

---

## 阶段5: 文档与部署 (0.5天)

### 5.1 任务清单

#### 任务 5.1: 更新 API 文档
**文件**: `documents/API_Document.md`
**预计时间**: 2小时

**详细步骤**:
- [ ] 更新 POST /api/activities 接口文档
  - [ ] 添加 time_limit_type 参数说明
  - [ ] 添加三种类型的请求示例
  - [ ] 添加验证规则说明
  - [ ] 添加错误码说明
- [ ] 更新 PUT /api/activities/:id 接口文档
- [ ] 添加 POST /api/student-activities/start 接口文档
  - [ ] 请求参数
  - [ ] 响应格式
  - [ ] 错误情况
- [ ] 添加数据库字段说明

**验收标准**:
- [x] API 文档完整准确
- [x] 包含所有新增/修改的接口
- [x] 示例代码可以直接运行

---

#### 任务 5.2: 部署到测试环境
**预计时间**: 1小时

**详细步骤**:
- [ ] 备份测试环境数据库
- [ ] 执行数据库迁移
- [ ] 重建后端服务
  ```bash
  docker-compose up --build -d backend
  ```
- [ ] 重建前端服务
  ```bash
  docker-compose up --build -d frontend
  ```
- [ ] 验证服务正常启动
- [ ] 手动测试关键功能
- [ ] 运行完整测试套件

**验收标准**:
- [x] 服务正常运行
- [x] 数据库迁移成功
- [x] 测试套件通过
- [x] 关键功能正常工作

---

#### 任务 5.3: 部署到生产环境
**预计时间**: 1小时

**详细步骤**:
- [ ] 计划维护窗口
- [ ] 通知用户（如需要）
- [ ] 备份生产数据库
  ```bash
  docker exec guiyang_oj_postgres pg_dump -U postgres guiyang_oj > backup_production_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] 执行数据库迁移
- [ ] 部署新代码
- [ ] 监控服务状态和日志
- [ ] 验证功能正常
- [ ] 准备回滚方案（如需要）

**验收标准**:
- [x] 生产环境正常运行
- [x] 用户可以正常使用新功能
- [x] 无重大错误或性能问题
- [x] 监控指标正常

---

## 风险管理

### 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 数据库迁移失败 | 中 | 高 | 完整备份，先在测试环境验证，准备回滚脚本 |
| 定时任务负载过高 | 中 | 中 | 优化查询，添加索引，分批处理，监控性能 |
| 前端倒计时不准确 | 低 | 中 | 定期与后端同步时间，使用心跳机制 |
| 网络中断导致数据丢失 | 低 | 中 | 使用 localStorage 保存进度，提供恢复机制 |
| 时区处理错误 | 中 | 中 | 统一使用 UTC，前端转换，充分测试 |
| 浏览器兼容性问题 | 低 | 低 | 使用 Polyfill，测试主流浏览器 |

### 回滚计划

如果生产环境部署失败，按以下步骤回滚：

1. **停止服务**
   ```bash
   docker-compose down
   ```

2. **恢复数据库**
   ```bash
   docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < backup_production_YYYYMMDD_HHMMSS.sql
   ```

3. **回滚代码**
   ```bash
   git revert <commit-hash>
   docker-compose up --build -d
   ```

4. **验证服务**
   - 检查服务状态
   - 运行基本功能测试
   - 检查日志无错误

---

## 验收标准总结

项目验收需要满足以下所有条件：

### 功能验收
- [x] 三种时间限制类型都能正确创建
- [x] 学生可以在相应的时间规则下开始作答
- [x] 倒计时功能正确显示
- [x] 超时自动提交功能正常工作
- [x] 所有 E2E 测试用例通过

### 性能验收
- [x] 定时任务执行时间 < 1分钟（1000条记录）
- [x] 前端倒计时 CPU 占用 < 5%
- [x] 数据库查询响应时间 < 100ms

### 质量验收
- [x] 代码审查通过
- [x] 单元测试覆盖率 > 80%
- [x] E2E 测试覆盖率 100%（10/10测试通过）
- [x] 无已知严重 Bug

### 文档验收
- [x] API 文档更新完整
- [x] 数据库 schema 文档更新
- [x] 用户手册更新（如需要）
- [x] 开发文档更新

---

## 附录

### 相关文档
- **设计文档**: documents/PRACTICE_TIME_LIMIT_DESIGN.md
- **开发状态**: documents/DEVELOPMENT_STATUS.md
- **待办事项**: PENDING_WORK.md
- **API 文档**: documents/API_Document.md

### 联系人
- **项目负责人**: [待填写]
- **后端开发**: [待填写]
- **前端开发**: [待填写]
- **测试负责人**: [待填写]

---

**文档创建**: 2025-10-25
**最后更新**: 2025-10-25
**版本**: 1.0
