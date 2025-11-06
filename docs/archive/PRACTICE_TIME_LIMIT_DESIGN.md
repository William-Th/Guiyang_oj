# 练习活动时间限制优化设计文档

**文档版本**: 1.0
**创建日期**: 2025-10-25
**最后更新**: 2025-10-25
**状态**: 设计中

---

## 1. 功能概述

本文档描述练习活动（Practice Activity）的时间限制功能优化设计。将现有的单一时间模式扩展为三种明确的时间限制类型，以满足不同教学场景的需求。

### 1.1 设计目标

- 支持多样化的练习场景（课堂练习、课后作业、自主学习）
- 提供灵活的时间控制机制
- 保持与现有测评（Assessment）系统的兼容性
- 确保学生体验流畅，时间规则清晰易懂

### 1.2 适用范围

- **适用对象**: Practice（练习）类型活动
- **不适用**: Assessment（测评）类型活动（测评通常为固定时间段考试）
- **角色**: 教师、学校管理员

---

## 2. 时间限制类型设计

### 2.1 类型一：无时间限制 (Unlimited)

**定义**: 学生可以随时开始，随时提交，不受时间约束。

**使用场景**:
- 自主学习练习
- 课后复习作业
- 知识点巩固练习
- 长期开放的练习资源

**数据库字段配置**:
```javascript
{
  time_limit_type: 'unlimited',
  start_time: null,
  end_time: null,
  duration: null
}
```

**业务逻辑**:
- ✅ 学生可在任何时间开始作答
- ✅ 无作答时长限制
- ✅ 可多次进入和退出（如果 allow_retake=true）
- ✅ 学生自主决定提交时间
- ❌ 不会自动结束

**前端展示**:
```
时间限制: 无限制
说明: 随时可以开始，不限时长
```

---

### 2.2 类型二：固定时间段 (Scheduled)

**定义**: 学生只能在指定的时间段内参加，时间段结束后自动提交。

**使用场景**:
- 课堂限时练习（如45分钟课堂）
- 定时作业（如晚自习期间）
- 阶段性测试（如每周五下午）
- 同步练习活动

**数据库字段配置**:
```javascript
{
  time_limit_type: 'scheduled',
  start_time: '2025-10-25 14:00:00',  // 活动开始时间
  end_time: '2025-10-25 16:00:00',    // 活动结束时间
  duration: null  // 不使用
}
```

**业务逻辑**:
- ❌ 当前时间 < start_time: 学生无法开始，显示"活动未开始"
- ✅ start_time ≤ 当前时间 ≤ end_time: 学生可以开始作答
- ✅ 学生可以在时间段内**任意时刻**开始
- ✅ 学生可以**提前提交**
- ⚠️ 当前时间 > end_time:
  - 已开始但未提交的学生 → 系统**自动提交**
  - 未开始的学生 → 显示"活动已结束"
- ⏰ 系统需要定时任务检查并自动提交超时的作答

**前端展示**:
```
时间限制: 固定时间段
开始时间: 2025-10-25 14:00
结束时间: 2025-10-25 16:00
剩余时间: 1小时30分钟（动态倒计时）
说明: 只能在指定时间段内参加，结束时间到后自动提交
```

**注意事项**:
- 需要后端定时任务（cron job）每分钟检查是否有超时未提交的作答
- 前端需要显示倒计时提醒
- 需要考虑时区问题（建议使用 UTC 存储，前端转换为本地时间）

---

### 2.3 类型三：限时作答 (Timed)

**定义**: 从学生点击"开始作答"时开始计时，累计到固定时长后自动提交。

**使用场景**:
- 限时练习（如30分钟练习）
- 模拟考试（如1小时模拟测试）
- 速度训练（如10分钟速算）
- 个性化限时练习

**数据库字段配置**:
```javascript
{
  time_limit_type: 'timed',
  start_time: null,  // 不使用
  end_time: null,    // 不使用
  duration: 30  // 作答时长（分钟）
}
```

**业务逻辑**:
- ✅ 学生可在任何时间点击"开始作答"
- ⏰ 点击"开始作答"后，记录 `student_activities.started_at`
- ⏱️ 计算截止时间: `deadline = started_at + duration 分钟`
- ✅ 学生可以**提前提交**
- ⚠️ 当前时间 > deadline: 系统**自动提交**
- 🔒 一旦开始，**不可暂停**（除非系统异常）
- ❌ 不允许中途退出后重新开始（同一次attempt）

**数据库扩展** (`student_activities` 表):
```sql
ALTER TABLE student_activities
ADD COLUMN started_at TIMESTAMP,  -- 学生实际开始作答的时间
ADD COLUMN time_limit_deadline TIMESTAMP;  -- 计算出的截止时间
```

**前端展示**:
```
时间限制: 限时作答
时长: 30分钟
剩余时间: 28分15秒（动态倒计时）
说明: 点击开始后计时，30分钟后自动提交
```

**注意事项**:
- 需要前端精确计时器
- 后端需要定时任务检查超时
- 需要处理网络中断、页面刷新等异常情况
- 建议每隔一段时间（如1分钟）向后端同步进度

---

## 3. 数据库设计

### 3.1 activities 表修改

**新增字段**:
```sql
ALTER TABLE activities
ADD COLUMN time_limit_type VARCHAR(20) NOT NULL DEFAULT 'unlimited'
  CHECK (time_limit_type IN ('unlimited', 'scheduled', 'timed'));

-- 添加索引优化查询
CREATE INDEX idx_activities_time_limit_type ON activities(time_limit_type);
CREATE INDEX idx_activities_time_range ON activities(start_time, end_time) WHERE time_limit_type = 'scheduled';
```

**字段约束逻辑**:
```sql
-- 约束：unlimited 类型不应该设置时间字段
ALTER TABLE activities
ADD CONSTRAINT check_unlimited_no_time
CHECK (
  (time_limit_type = 'unlimited' AND start_time IS NULL AND end_time IS NULL AND duration IS NULL)
  OR time_limit_type != 'unlimited'
);

-- 约束：scheduled 类型必须设置 start_time 和 end_time
ALTER TABLE activities
ADD CONSTRAINT check_scheduled_time_range
CHECK (
  (time_limit_type = 'scheduled' AND start_time IS NOT NULL AND end_time IS NOT NULL AND duration IS NULL)
  OR time_limit_type != 'scheduled'
);

-- 约束：timed 类型必须设置 duration
ALTER TABLE activities
ADD CONSTRAINT check_timed_duration
CHECK (
  (time_limit_type = 'timed' AND duration IS NOT NULL AND start_time IS NULL AND end_time IS NULL)
  OR time_limit_type != 'timed'
);

-- 约束：scheduled 类型的结束时间必须晚于开始时间
ALTER TABLE activities
ADD CONSTRAINT check_scheduled_time_order
CHECK (
  (time_limit_type = 'scheduled' AND end_time > start_time)
  OR time_limit_type != 'scheduled'
);

-- 约束：timed 类型的 duration 必须大于 0
ALTER TABLE activities
ADD CONSTRAINT check_timed_duration_positive
CHECK (
  (time_limit_type = 'timed' AND duration > 0)
  OR time_limit_type != 'timed'
);
```

### 3.2 student_activities 表修改

**新增字段**:
```sql
ALTER TABLE student_activities
ADD COLUMN started_at TIMESTAMP,  -- 学生实际开始作答的时间（用于 timed 类型）
ADD COLUMN time_limit_deadline TIMESTAMP;  -- 计算出的截止时间（用于 timed 类型）

-- 添加索引优化查询超时记录
CREATE INDEX idx_student_activities_deadline ON student_activities(time_limit_deadline)
WHERE status = 'in_progress';
```

**字段说明**:
- `started_at`: 学生点击"开始作答"的时间戳（timed 类型专用）
- `time_limit_deadline`: 后端计算的截止时间 = started_at + activity.duration（timed 类型专用）
- 对于 scheduled 类型，使用 activity.end_time 作为截止时间
- 对于 unlimited 类型，这两个字段为 NULL

---

## 4. 后端 API 设计

### 4.1 创建/编辑活动接口

**请求示例**:

```javascript
// 类型一：无时间限制
POST /api/activities
{
  "type": "practice",
  "title": "数学基础练习",
  "time_limit_type": "unlimited",
  // start_time, end_time, duration 不传或传 null
}

// 类型二：固定时间段
POST /api/activities
{
  "type": "practice",
  "title": "周五课堂练习",
  "time_limit_type": "scheduled",
  "start_time": "2025-10-25 14:00:00",
  "end_time": "2025-10-25 16:00:00"
  // duration 不传或传 null
}

// 类型三：限时作答
POST /api/activities
{
  "type": "practice",
  "title": "30分钟速算练习",
  "time_limit_type": "timed",
  "duration": 30  // 分钟
  // start_time, end_time 不传或传 null
}
```

**后端验证逻辑**:
```javascript
function validateTimeLimitConfig(activityData) {
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

### 4.2 学生开始作答接口

**请求**: `POST /api/student-activities/start`

```javascript
{
  "activity_id": 123
}
```

**响应**:
```javascript
{
  "success": true,
  "data": {
    "student_activity_id": 456,
    "activity_id": 123,
    "started_at": "2025-10-25 15:30:00",  // 仅 timed 类型
    "deadline": "2025-10-25 16:00:00",    // scheduled 或 timed 类型
    "time_limit_type": "timed",
    "duration": 30,  // 分钟
    "remaining_seconds": 1800  // 剩余秒数
  }
}
```

**业务逻辑**:
```javascript
async function startActivity(studentId, activityId) {
  const activity = await Activity.findById(activityId);
  const now = new Date();

  // 检查时间限制类型
  if (activity.time_limit_type === 'scheduled') {
    if (now < activity.start_time) {
      throw new Error('活动尚未开始');
    }
    if (now > activity.end_time) {
      throw new Error('活动已结束');
    }
  }

  // 创建学生作答记录
  const studentActivity = await StudentActivity.create({
    student_id: studentId,
    activity_id: activityId,
    status: 'in_progress',
    started_at: activity.time_limit_type === 'timed' ? now : null,
    time_limit_deadline: calculateDeadline(activity, now)
  });

  return studentActivity;
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

### 4.3 检查超时并自动提交接口（定时任务）

**后端定时任务** (cron job, 每分钟执行):

```javascript
async function checkAndSubmitTimeoutActivities() {
  const now = new Date();

  // 查找所有超时但未提交的作答
  const timeoutRecords = await StudentActivity.find({
    status: 'in_progress',
    time_limit_deadline: { $lte: now }  // 截止时间 <= 当前时间
  });

  for (const record of timeoutRecords) {
    try {
      // 自动提交
      await submitActivity(record.id, {
        auto_submit: true,
        submit_time: now
      });

      console.log(`自动提交超时作答: student_activity_id=${record.id}`);
    } catch (error) {
      console.error(`自动提交失败: student_activity_id=${record.id}`, error);
    }
  }
}

// 使用 node-cron 配置定时任务
const cron = require('node-cron');
cron.schedule('* * * * *', checkAndSubmitTimeoutActivities);  // 每分钟执行
```

---

## 5. 前端设计

### 5.1 创建活动表单

**时间限制类型选择器**:

```tsx
<Form.Item label="时间限制类型" name="time_limit_type">
  <Radio.Group>
    <Radio value="unlimited">无时间限制</Radio>
    <Radio value="scheduled">固定时间段</Radio>
    <Radio value="timed">限时作答</Radio>
  </Radio.Group>
</Form.Item>

{/* 根据选择的类型动态显示不同的表单项 */}
{timeLimitType === 'scheduled' && (
  <>
    <Form.Item label="开始时间" name="start_time" rules={[{ required: true }]}>
      <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" />
    </Form.Item>
    <Form.Item label="结束时间" name="end_time" rules={[{ required: true }]}>
      <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" />
    </Form.Item>
  </>
)}

{timeLimitType === 'timed' && (
  <Form.Item
    label="作答时长（分钟）"
    name="duration"
    rules={[{ required: true, type: 'number', min: 1 }]}
  >
    <InputNumber min={1} placeholder="例如: 30" />
  </Form.Item>
)}
```

### 5.2 学生答题页面

**倒计时组件**:

```tsx
const CountdownTimer: React.FC<{ deadline: string; onTimeout: () => void }> = ({ deadline, onTimeout }) => {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(deadline).getTime();
      const diff = Math.max(0, end - now);

      setRemaining(Math.floor(diff / 1000));  // 转换为秒

      if (diff <= 0) {
        clearInterval(interval);
        onTimeout();  // 时间到，触发自动提交
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, onTimeout]);

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  return (
    <div className="countdown-timer">
      <span className={remaining < 300 ? 'text-red-500' : ''}>
        剩余时间: {hours}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
};
```

**答题页面逻辑**:

```tsx
const PracticeAnswerPage: React.FC = () => {
  const activity = useSelector(selectCurrentActivity);
  const studentActivity = useSelector(selectStudentActivity);

  const handleTimeout = async () => {
    message.warning('时间已到，系统自动提交答案');
    await submitAnswers(true);  // auto_submit = true
  };

  return (
    <div>
      <Card>
        {/* 显示倒计时 */}
        {studentActivity.time_limit_deadline && (
          <CountdownTimer
            deadline={studentActivity.time_limit_deadline}
            onTimeout={handleTimeout}
          />
        )}

        {/* 答题内容 */}
        <QuestionList questions={activity.questions} />

        {/* 提交按钮 */}
        <Button type="primary" onClick={() => submitAnswers(false)}>
          提前提交
        </Button>
      </Card>
    </div>
  );
};
```

### 5.3 活动列表显示

**时间限制信息展示**:

```tsx
const ActivityTimeInfo: React.FC<{ activity: Activity }> = ({ activity }) => {
  const { time_limit_type, start_time, end_time, duration } = activity;

  if (time_limit_type === 'unlimited') {
    return <Tag color="green">无时间限制</Tag>;
  }

  if (time_limit_type === 'scheduled') {
    return (
      <div>
        <Tag color="blue">固定时间段</Tag>
        <div>
          {dayjs(start_time).format('MM-DD HH:mm')} ~ {dayjs(end_time).format('MM-DD HH:mm')}
        </div>
      </div>
    );
  }

  if (time_limit_type === 'timed') {
    return (
      <div>
        <Tag color="orange">限时作答</Tag>
        <div>{duration} 分钟</div>
      </div>
    );
  }
};
```

---

## 6. 用户体验设计

### 6.1 时间提醒策略

**scheduled 类型**:
- 活动开始前15分钟：推送提醒（如果系统支持）
- 剩余30分钟：页面顶部显示黄色提示条
- 剩余5分钟：红色闪烁提示 + 声音提醒（可选）
- 剩余1分钟：弹窗提醒，建议提交

**timed 类型**:
- 剩余时间 < 总时长的25%：黄色提示
- 剩余5分钟：红色闪烁提示
- 剩余1分钟：弹窗提醒

### 6.2 异常处理

**网络中断恢复**:
- 前端使用 localStorage 定期保存答题进度
- 重新连接后，自动从后端同步最新状态
- 如果本地时间戳 > 后端时间戳，提示用户选择恢复

**页面刷新**:
- timed 类型：重新计算剩余时间（基于 started_at 和 duration）
- scheduled 类型：使用 end_time 计算剩余时间
- 提示用户"您有一个进行中的练习"

**系统时间不同步**:
- 后端以服务器时间为准
- 前端定期向后端同步时间（心跳机制）
- 显示"距离截止时间"而非"倒计时"

---

## 7. 测试计划

### 7.1 单元测试

**后端 API 测试**:
```javascript
describe('Activity Time Limit Validation', () => {
  test('创建 unlimited 类型活动 - 成功', async () => {
    const activity = await createActivity({
      time_limit_type: 'unlimited',
      title: '无限制练习'
    });
    expect(activity.time_limit_type).toBe('unlimited');
    expect(activity.start_time).toBeNull();
  });

  test('创建 scheduled 类型活动 - 缺少 end_time - 失败', async () => {
    await expect(createActivity({
      time_limit_type: 'scheduled',
      start_time: '2025-10-25 14:00:00'
    })).rejects.toThrow('固定时间段类型必须设置开始和结束时间');
  });

  test('创建 timed 类型活动 - duration 为负数 - 失败', async () => {
    await expect(createActivity({
      time_limit_type: 'timed',
      duration: -10
    })).rejects.toThrow();
  });
});

describe('Auto Submit Timeout Activities', () => {
  test('timed 类型活动 - 超时自动提交', async () => {
    // 模拟超时场景
    const activity = await createActivity({
      time_limit_type: 'timed',
      duration: 1  // 1分钟
    });

    const studentActivity = await startActivity(studentId, activity.id);

    // 快进时间 2分钟
    jest.advanceTimersByTime(120000);
    await checkAndSubmitTimeoutActivities();

    const updated = await StudentActivity.findById(studentActivity.id);
    expect(updated.status).toBe('submitted');
    expect(updated.auto_submit).toBe(true);
  });
});
```

### 7.2 E2E 测试

**测试用例**:

| 测试ID | 测试场景 | 预期结果 |
|--------|---------|---------|
| PTL001 | 教师创建无时间限制练习 | 成功创建，time_limit_type='unlimited' |
| PTL002 | 教师创建固定时间段练习 | 成功创建，包含 start_time 和 end_time |
| PTL003 | 教师创建限时作答练习 | 成功创建，包含 duration |
| PTL004 | 学生在固定时间段前尝试开始 | 显示"活动未开始" |
| PTL005 | 学生在固定时间段内开始 | 成功开始，显示剩余时间倒计时 |
| PTL006 | 学生在固定时间段结束后尝试开始 | 显示"活动已结束" |
| PTL007 | 学生开始限时作答练习 | 成功开始，显示倒计时 |
| PTL008 | 限时作答到时自动提交 | 系统自动提交，状态变为 submitted |
| PTL009 | 固定时间段到时自动提交 | 系统自动提交，状态变为 submitted |
| PTL010 | 学生提前提交无时间限制练习 | 成功提交，无时间限制 |

---

## 8. 迁移策略

### 8.1 现有数据兼容

**迁移脚本**:
```sql
-- 为现有活动设置默认类型
UPDATE activities
SET time_limit_type = CASE
  WHEN duration IS NOT NULL THEN 'timed'
  WHEN start_time IS NOT NULL AND end_time IS NOT NULL THEN 'scheduled'
  ELSE 'unlimited'
END
WHERE time_limit_type IS NULL;

-- 清理不一致的数据
UPDATE activities
SET start_time = NULL, end_time = NULL
WHERE time_limit_type = 'unlimited';

UPDATE activities
SET duration = NULL
WHERE time_limit_type = 'scheduled';

UPDATE activities
SET start_time = NULL, end_time = NULL
WHERE time_limit_type = 'timed';
```

### 8.2 向后兼容

- 旧版前端：如果未传 `time_limit_type`，后端默认为 `unlimited`
- API 版本控制：`/api/v2/activities` 使用新字段，`/api/v1/activities` 保持兼容
- 逐步迁移：先发布 API，再更新前端

---

## 9. 实施计划

### 9.1 阶段划分

**阶段 1: 数据库设计与迁移** (1天)
- [ ] 编写数据库迁移脚本
- [ ] 添加 `time_limit_type` 字段和约束
- [ ] 添加 `started_at` 和 `time_limit_deadline` 字段
- [ ] 测试迁移脚本
- [ ] 执行迁移

**阶段 2: 后端 API 开发** (2-3天)
- [ ] 修改 Activity Model 添加验证逻辑
- [ ] 更新 POST /api/activities 接口
- [ ] 更新 PUT /api/activities/:id 接口
- [ ] 实现 POST /api/student-activities/start 接口
- [ ] 实现自动提交定时任务
- [ ] 编写单元测试

**阶段 3: 前端开发** (2-3天)
- [ ] 更新 Activity 类型定义
- [ ] 修改创建/编辑活动表单
- [ ] 实现倒计时组件
- [ ] 修改学生答题页面
- [ ] 更新活动列表显示
- [ ] 处理异常场景（网络中断、页面刷新）

**阶段 4: E2E 测试** (1-2天)
- [ ] 编写 E2E 测试用例 (PTL001-PTL010)
- [ ] 执行测试并修复 bug
- [ ] 性能测试（定时任务负载）

**阶段 5: 文档与部署** (0.5天)
- [ ] 更新 API 文档
- [ ] 更新用户手册
- [ ] 部署到测试环境
- [ ] 部署到生产环境

**总计**: 约 **6-8 工作日**

### 9.2 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 数据库迁移失败 | 高 | 完整备份，先在测试环境验证 |
| 定时任务负载过高 | 中 | 优化查询，添加索引，分批处理 |
| 前端倒计时不准确 | 中 | 定期与后端同步时间 |
| 网络中断导致数据丢失 | 低 | 使用 localStorage 保存进度 |

---

## 10. 附录

### 10.1 数据库完整迁移脚本

参见: `database/migrations/004_practice_time_limit_types.sql`

### 10.2 相关文档

- **开发状态**: documents/DEVELOPMENT_STATUS.md
- **待办事项**: PENDING_WORK.md
- **API 文档**: documents/API_Document.md
- **测试指南**: tests/docs/测试指南.md

---

**文档维护者**: 开发团队
**审核状态**: 待审核
**下次更新**: 实施完成后
