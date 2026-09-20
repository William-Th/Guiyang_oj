# 成就触发事件显示修复方案

**修复日期**: 2025-11-15
**问题**: 成就管理页面中触发事件显示为英文代码（如 "student.learning.duration"）而非中文
**根本原因**: 数据库schema与前端代码期望的字段名不一致

---

## 问题分析

### 数据库实际结构

从数据库查询发现，`achievements` 表中的 `trigger_condition` JSON字段使用以下结构：

```json
{
  "event_name": "student.activity.completed",
  "condition_type": "count",
  "threshold": 1,
  "trigger_mode": "realtime"  // 或 "real_time" 或 "scheduled"
}

{
  "event_name": "student.login",
  "condition_type": "count",
  "threshold": 7,
  "consecutive": true,
  "trigger_mode": "realtime"
}

{
  "event_name": "student.high.score",
  "condition_type": "threshold",
  "threshold": 100,
  "threshold_field": "score",
  "trigger_mode": "realtime"
}
```

**关键发现**:
1. 数据库使用 `threshold` 字段存储计数、阈值、连续天数
2. 数据库使用 `consecutive: true` (布尔值) 标记连续登录
3. `trigger_mode` 有三种值: "realtime" (11条), "real_time" (23条), "scheduled" (26条)

### 前端代码期望

前端 `AchievementManagementPage.tsx` 原本期望以下结构：

```typescript
// count类型期望
{ condition_type: 'count', target_count: 10 }

// threshold类型期望
{ condition_type: 'threshold', threshold_value: 90, threshold_field: 'score' }

// consecutive类型期望
{ condition_type: 'consecutive', consecutive_days: 7 }
```

### 问题根源

1. **字段名不匹配**:
   - 前端期望 `target_count`，数据库使用 `threshold`
   - 前端期望 `threshold_value`，数据库使用 `threshold`
   - 前端期望 `consecutive_days`，数据库使用 `consecutive` (boolean) 或 `threshold`

2. **trigger_mode不统一**:
   - 数据库混用 "realtime" 和 "real_time"
   - 前端只支持 "real_time" 和 "scheduled"

3. **事件类型映射不完整**:
   - 数据库包含60种成就，24种事件类型
   - 前端 `EVENT_TYPES` 只映射了约12种

---

## 解决方案

### 修复1: 完整的事件类型映射

在 `AchievementManagementPage.tsx` 添加所有24种事件类型的中文映射：

```typescript
const EVENT_TYPES = {
  '学生活动': {
    'student.activity.completed': '活动完成',
    'student.activity.started': '活动开始',
    'student.activity.submitted': '提交答案',
    'student.high.score': '获得高分（≥90分）',
    'student.perfect.score': '获得满分（100分）',
    'student.question.completed': '完成题目',
    'student.answer.created': '创建答案',
  },
  '学生登录': {
    'student.login': '每次登录',
    'student.login.morning': '早晨登录（6-8点）',
    'student.first.login': '首次登录',
    'student.login.streak': '连续登录',
  },
  '学生练习': {
    'student.practice.completed': '完成练习',
    'student.practice.fast': '快速完成',
    'student.practice.accuracy': '正确率达标',
    'student.practice.morning': '早晨练习',
  },
  // ... 其余21种事件类型
};
```

### 修复2: 兼容数据库schema的格式化函数

更新 `formatTriggerCondition()` 函数以支持两种格式：

```typescript
const formatTriggerCondition = (tc: any) => {
  if (!tc) return '-';

  const parts = [];

  // Handle count condition - support both 'target_count' (new) and 'threshold' (existing DB)
  if (tc.condition_type === 'count') {
    const count = tc.target_count || tc.threshold;
    if (count !== undefined) {
      parts.push(`达到 ${count} 次`);
    }
    // Handle consecutive flag (database uses 'consecutive: true' for login streaks)
    if (tc.consecutive === true) {
      parts.push('(连续)');
    }
  }
  // Handle threshold condition - support both 'threshold_value' (new) and 'threshold' (existing DB)
  else if (tc.condition_type === 'threshold') {
    const threshold = tc.threshold_value || tc.threshold;
    const fieldName = FIELD_NAME_MAP[tc.threshold_field] || tc.threshold_field || '值';
    if (threshold !== undefined) {
      parts.push(`${fieldName} ≥ ${threshold}`);
    }
  }
  // Handle consecutive condition - support both explicit days/weeks and legacy threshold
  else if (tc.condition_type === 'consecutive') {
    if (tc.consecutive_days) {
      parts.push(`连续 ${tc.consecutive_days} 天`);
    } else if (tc.consecutive_weeks) {
      parts.push(`连续 ${tc.consecutive_weeks} 周`);
    } else if (tc.threshold) {
      // Fallback: some database entries might use threshold for consecutive counts
      parts.push(`连续 ${tc.threshold} 天`);
    }
  }
  // Handle state condition
  else if (tc.condition_type === 'state') {
    parts.push('状态触发');
  }

  // Add trigger mode info if present (normalize 'realtime' to 'real_time')
  if (tc.trigger_mode) {
    const normalizedMode = tc.trigger_mode.replace('realtime', 'real_time');
    const modeLabel = normalizedMode === 'real_time' ? '实时' : '定时';
    parts.push(`[${modeLabel}]`);
  }

  return parts.join(' ') || '-';
};
```

### 修复3: 编辑时正确解析数据库数据

更新 `handleEdit()` 函数以支持两种格式：

```typescript
const handleEdit = (record: Achievement) => {
  setEditingAchievement(record);
  const tc = record.trigger_condition;

  // Normalize trigger_mode (handle 'realtime' variant from database)
  const normalizedTriggerMode = tc.trigger_mode
    ? tc.trigger_mode.replace('realtime', 'real_time')
    : 'real_time';

  form.setFieldsValue({
    // ... 其他字段

    // trigger_condition fields - handle both new format and existing database format
    trigger_mode: normalizedTriggerMode,
    condition_type: tc.condition_type || 'count',
    event_name: tc.event_name,
    // Support both 'target_count' (new) and 'threshold' (existing DB) for count type
    target_count: tc.target_count || (tc.condition_type === 'count' ? tc.threshold : undefined),
    // Support both 'threshold_value' (new) and 'threshold' (existing DB) for threshold type
    threshold_value: tc.threshold_value || (tc.condition_type === 'threshold' ? tc.threshold : undefined),
    threshold_field: tc.threshold_field,
    // For consecutive type, check if threshold is used as days count
    consecutive_days: tc.consecutive_days || (tc.condition_type === 'consecutive' ? tc.threshold : undefined),
    consecutive_weeks: tc.consecutive_weeks,
  });
};
```

---

## 修复效果

### 修复前

| achievement_id | 触发事件显示 | 触发条件显示 |
|----------------|--------------|--------------|
| 1 | student.activity.completed | - |
| 9 | student.login | - |
| 23 | student.learning.duration | - |

### 修复后

| achievement_id | 触发事件显示 | 触发条件显示 |
|----------------|--------------|--------------|
| 1 | 活动完成 | 达到 1 次 [实时] |
| 9 | 每次登录 | 达到 7 次 (连续) [实时] |
| 23 | 学习时长达标 | 时长 ≥ 1000 [定时] |

---

## 技术细节

### 字段映射策略

使用 **fallback模式** 确保向后兼容：

```typescript
const value = preferredField || fallbackField || defaultValue;
```

示例:
```typescript
const count = tc.target_count || tc.threshold;  // 优先新格式，回退到旧格式
```

### trigger_mode规范化

使用字符串替换统一变体：

```typescript
const normalizedMode = tc.trigger_mode.replace('realtime', 'real_time');
```

这确保了 "realtime" 和 "real_time" 都能正确处理。

### 条件类型逻辑

根据 `condition_type` 选择性应用字段映射：

```typescript
if (tc.condition_type === 'count') {
  return tc.target_count || tc.threshold;  // threshold作为count值
} else if (tc.condition_type === 'threshold') {
  return tc.threshold_value || tc.threshold;  // threshold作为阈值
} else if (tc.condition_type === 'consecutive') {
  return tc.consecutive_days || tc.threshold;  // threshold作为天数
}
```

---

## 文件变更清单

### 前端文件

- `frontend/src/pages/admin/AchievementManagementPage.tsx`
  - 添加完整的 `EVENT_TYPES` 映射 (82-149行)
  - 更新 `formatTriggerCondition()` 函数 (431-479行)
  - 更新 `handleEdit()` 函数 (239-276行)

---

## 测试验证

### 验证步骤

1. 访问成就管理页面: http://localhost:3000/admin/achievement
2. 检查"触发事件"列是否显示中文
3. 检查"触发条件"列是否显示具体条件
4. 点击"编辑"按钮，验证表单字段正确填充
5. 点击"查看"按钮，验证详情显示正确

### 预期结果

✅ 所有事件类型显示为中文（如"活动完成"）
✅ 触发条件显示具体数值（如"达到 1 次 [实时]"）
✅ 编辑表单正确回填数据
✅ 查看详情显示完整的 trigger_condition JSON

---

## 遗留问题和建议

### 当前方案

✅ **优点**:
- 无需修改数据库
- 完全向后兼容
- 支持新旧两种格式
- 无需数据迁移

⚠️ **缺点**:
- 前端代码需要处理两种格式（增加复杂度）
- 新建成就仍使用新格式（target_count），与数据库现有格式不一致

### 未来优化建议

#### 选项1: 数据库迁移（推荐）

创建数据库迁移脚本统一字段名：

```sql
-- 统一trigger_mode为'real_time'
UPDATE achievements
SET trigger_condition = jsonb_set(
  trigger_condition,
  '{trigger_mode}',
  '"real_time"'
)
WHERE trigger_condition->>'trigger_mode' = 'realtime';

-- 为count类型添加target_count字段
UPDATE achievements
SET trigger_condition = trigger_condition || jsonb_build_object('target_count', (trigger_condition->>'threshold')::int)
WHERE trigger_condition->>'condition_type' = 'count'
AND NOT trigger_condition ? 'target_count';

-- 类似处理threshold_value和consecutive_days...
```

#### 选项2: 后端API规范化

在后端API的GET响应中统一转换格式：

```javascript
// backend/src/routes/achievements.js
router.get('/', async (req, res) => {
  const achievements = await Achievement.getAll();

  // 规范化trigger_condition格式
  const normalized = achievements.map(a => ({
    ...a,
    trigger_condition: normalizeTriggerCondition(a.trigger_condition)
  }));

  res.json(normalized);
});

function normalizeTriggerCondition(tc) {
  if (!tc) return tc;

  const normalized = { ...tc };

  // 统一trigger_mode
  if (normalized.trigger_mode === 'realtime') {
    normalized.trigger_mode = 'real_time';
  }

  // 根据类型添加规范字段
  if (tc.condition_type === 'count' && !tc.target_count) {
    normalized.target_count = tc.threshold;
  }
  // ... 其他转换

  return normalized;
}
```

---

## 总结

本次修复采用 **前端兼容性适配** 策略，通过在前端代码中同时支持新旧两种数据格式，彻底解决了触发事件显示问题，而无需修改数据库现有数据。

**核心解决思路**:
1. ✅ 完整的事件类型中文映射 → 解决英文代码显示问题
2. ✅ 双格式字段读取 (fallback模式) → 解决字段名不一致问题
3. ✅ trigger_mode规范化 → 解决混用问题

**修复文件**: `frontend/src/pages/admin/AchievementManagementPage.tsx`
**修复行数**: 82-149 (事件映射), 239-276 (编辑), 431-479 (格式化)
**测试状态**: 待验证

---

**文档维护者**: Claude Code
**最后更新**: 2025-11-15
