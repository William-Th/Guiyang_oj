# 测评报名功能需求文档

**创建日期**: 2025-11-30
**文档版本**: v1.0
**功能状态**: 待开发

---

## 1. 功能概述

### 1.1 背景说明

测评活动（assessment）与练习活动（practice）的核心区别在于报名机制。测评活动需要学生提前报名参加，根据能力等级不同，测评分为两种形式：

- **纯线上测评** (L1-L3): 学生在线报名后，直接在线上系统完成测评
- **线上线下结合测评** (L4-L7): 学生在线报名并选择测评点，到现场使用线上系统完成测评

### 1.2 核心目标

1. 实现测评活动的学生报名管理
2. 支持线上测评和线下现场测评两种模式
3. 实现测评点管理和容量控制
4. 为后续通知系统提供数据基础

### 1.3 能力等级与测评模式

| 能力等级 | 测评模式 | 报名流程 | 人数限制 | 场地要求 |
|---------|---------|---------|---------|---------|
| L1 | 纯线上 | 直接报名 | 无限制 | 无 |
| L2 | 纯线上 | 直接报名 | 无限制 | 无 |
| L3 | 纯线上 | 直接报名 | 无限制 | 无 |
| L4 | 线下现场 | 报名+选择测评点 | **有限制** | 需选择测评点 |
| L5 | 线下现场 | 报名+选择测评点 | **有限制** | 需选择测评点 |
| L6 | 线下现场 | 报名+选择测评点 | **有限制** | 需选择测评点 |
| L7 | 线下现场 | 报名+选择测评点 | **有限制** | 需选择测评点 |

---

## 2. 功能模块设计

### 2.1 测评点管理模块

#### 2.1.1 测评点信息

测评点是L4+级别测评的考试场地，由管理员创建和管理。

**测评点属性**:
- 测评点名称（如：贵阳一中考点）
- 测评点地址
- 容纳人数上限
- 已报名人数（实时统计）
- 测评时间段（可选，支持同一活动多个时间段）
- 联系人信息
- 备注说明
- 是否启用

#### 2.1.2 测评点管理功能

| 功能 | 描述 | 操作角色 |
|------|------|---------|
| 创建测评点 | 为L4+测评创建考试地点 | 区级+管理员 |
| 编辑测评点 | 修改测评点信息 | 区级+管理员 |
| 删除测评点 | 删除未使用的测评点 | 区级+管理员 |
| 查看测评点列表 | 查看某活动的所有测评点 | 管理员/学生 |
| 容量监控 | 实时查看各测评点报名情况 | 管理员 |

### 2.2 学生报名模块

#### 2.2.1 L1-L3 纯线上报名流程

```
┌─────────────────────────────────────────────────────────────┐
│                    L1-L3 纯线上报名流程                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  学生浏览测评列表 → 选择测评 → 查看详情 → 点击报名           │
│                                    ↓                        │
│                             系统检查资格                     │
│                            ┌────┴────┐                      │
│                            ↓         ↓                      │
│                         通过       不通过                    │
│                          ↓          ↓                       │
│                      创建报名记录   显示原因                  │
│                          ↓                                  │
│                      报名成功                                │
│                          ↓                                  │
│                   等待测评开始时间                            │
│                          ↓                                  │
│                   开始在线测评                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**资格检查项**:
1. 学生账号状态（已激活）
2. 是否已报名过该测评
3. 是否满足年级要求
4. 是否满足学校/区域要求（如有target_audience限制）
5. 是否在报名时间内

#### 2.2.2 L4-L7 线下现场报名流程

```
┌─────────────────────────────────────────────────────────────┐
│                  L4-L7 线下现场报名流程                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  学生浏览测评列表 → 选择L4+测评 → 查看详情                   │
│                                    ↓                        │
│                            查看测评点列表                     │
│                     (显示各测评点地址、容量、剩余名额)         │
│                                    ↓                        │
│                            选择测评点                        │
│                            ┌────┴────┐                      │
│                            ↓         ↓                      │
│                         有名额     名额已满                   │
│                          ↓          ↓                       │
│                      系统检查资格   提示选择其他测评点         │
│                            ↓                                │
│                         通过                                 │
│                          ↓                                  │
│                      创建报名记录                            │
│                     (关联测评点)                             │
│                          ↓                                  │
│                      报名成功                                │
│                     显示测评点信息                            │
│                          ↓                                  │
│                   等待测评日期                                │
│                          ↓                                  │
│                   到现场参加测评                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**额外检查项（L4+）**:
1. 所有L1-L3的检查项
2. 所选测评点是否有剩余名额
3. 是否在报名截止时间前

#### 2.2.3 报名状态管理

| 状态 | 英文 | 描述 | 可转换状态 |
|------|------|------|-----------|
| 待确认 | pending | 报名已提交，等待系统/管理员确认 | confirmed, rejected |
| 已确认 | confirmed | 报名成功，等待参加测评 | cancelled, completed |
| 已拒绝 | rejected | 报名被拒绝（资格不符等） | - |
| 已取消 | cancelled | 学生主动取消报名 | - |
| 已完成 | completed | 已参加测评 | - |
| 缺考 | absent | 未参加测评 | - |

### 2.3 报名管理模块（管理员）

#### 2.3.1 报名列表查看

管理员可以查看某个测评活动的所有报名记录：

| 字段 | 描述 |
|------|------|
| 学生姓名 | 报名学生姓名 |
| 学校 | 学生所属学校 |
| 年级/班级 | 学生年级和班级 |
| 报名时间 | 报名提交时间 |
| 测评点 | L4+显示选择的测评点 |
| 状态 | 报名状态 |
| 操作 | 查看详情、取消报名 |

#### 2.3.2 报名统计

| 统计项 | 描述 |
|-------|------|
| 总报名人数 | 所有报名记录数 |
| 已确认人数 | confirmed状态的数量 |
| 待确认人数 | pending状态的数量 |
| 已取消人数 | cancelled状态的数量 |
| 各测评点报名情况 | L4+按测评点统计 |
| 各学校报名情况 | 按学校统计报名人数 |
| 各年级报名情况 | 按年级统计报名人数 |

### 2.4 取消报名规则

| 场景 | 是否允许取消 | 说明 |
|------|-------------|------|
| L1-L3 测评开始前 | ✅ 允许 | 学生可自由取消 |
| L1-L3 测评进行中 | ❌ 不允许 | 已开始不可取消 |
| L4+ 报名截止前 | ✅ 允许 | 取消后释放名额 |
| L4+ 报名截止后 | ❌ 不允许 | 需联系管理员 |
| 管理员操作 | ✅ 允许 | 管理员可随时取消 |

---

## 3. 数据库设计

### 3.1 新增表结构

#### 3.1.1 测评点表 (assessment_locations)

```sql
CREATE TABLE assessment_locations (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,           -- 测评点名称
    address VARCHAR(300),                 -- 详细地址
    district_id INTEGER REFERENCES districts(id), -- 所属区县
    capacity INTEGER NOT NULL DEFAULT 50, -- 容纳人数上限
    registered_count INTEGER DEFAULT 0,   -- 已报名人数（冗余字段，通过触发器维护）
    contact_name VARCHAR(50),             -- 联系人姓名
    contact_phone VARCHAR(20),            -- 联系电话
    exam_date DATE,                       -- 测评日期
    exam_time_start TIME,                 -- 测评开始时间
    exam_time_end TIME,                   -- 测评结束时间
    check_in_time TIME,                   -- 签到时间
    notes TEXT,                           -- 备注说明
    is_active BOOLEAN DEFAULT TRUE,       -- 是否启用
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_assessment_locations_activity ON assessment_locations(activity_id);
CREATE INDEX idx_assessment_locations_district ON assessment_locations(district_id);
```

#### 3.1.2 测评报名表 (assessment_registrations)

```sql
CREATE TABLE assessment_registrations (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES assessment_locations(id), -- L4+需要，L1-L3为NULL

    -- 状态管理
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending: 待确认, confirmed: 已确认, rejected: 已拒绝,
    -- cancelled: 已取消, completed: 已完成, absent: 缺考

    -- 时间记录
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 报名时间
    confirmed_at TIMESTAMP,                             -- 确认时间
    cancelled_at TIMESTAMP,                             -- 取消时间

    -- 取消相关
    cancel_reason TEXT,                                 -- 取消原因
    cancelled_by INTEGER REFERENCES users(id),          -- 取消操作人

    -- 审核相关（如需人工审核）
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    review_notes TEXT,

    -- 关联到student_activities（参加测评后关联）
    student_activity_id INTEGER REFERENCES student_activities(id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 唯一约束：同一学生不能重复报名同一活动
    UNIQUE(activity_id, student_id)
);

-- 状态约束
ALTER TABLE assessment_registrations
ADD CONSTRAINT chk_registration_status
CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'absent'));

-- 索引
CREATE INDEX idx_registrations_activity ON assessment_registrations(activity_id);
CREATE INDEX idx_registrations_student ON assessment_registrations(student_id);
CREATE INDEX idx_registrations_location ON assessment_registrations(location_id);
CREATE INDEX idx_registrations_status ON assessment_registrations(status);
```

#### 3.1.3 触发器：维护测评点报名人数

```sql
-- 创建触发器函数
CREATE OR REPLACE FUNCTION update_location_registered_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.location_id IS NOT NULL AND NEW.status = 'confirmed' THEN
            UPDATE assessment_locations
            SET registered_count = registered_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.location_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- 状态变为confirmed，增加计数
        IF NEW.location_id IS NOT NULL AND NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
            UPDATE assessment_locations
            SET registered_count = registered_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.location_id;
        END IF;
        -- 状态从confirmed变为其他，减少计数
        IF OLD.location_id IS NOT NULL AND OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
            UPDATE assessment_locations
            SET registered_count = GREATEST(0, registered_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.location_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.location_id IS NOT NULL AND OLD.status = 'confirmed' THEN
            UPDATE assessment_locations
            SET registered_count = GREATEST(0, registered_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.location_id;
        END IF;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_update_location_count
AFTER INSERT OR UPDATE OR DELETE ON assessment_registrations
FOR EACH ROW EXECUTE FUNCTION update_location_registered_count();
```

### 3.2 修改现有表

#### 3.2.1 activities 表新增字段

```sql
-- 添加报名相关字段
ALTER TABLE activities ADD COLUMN IF NOT EXISTS registration_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS registration_start_time TIMESTAMP;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS registration_end_time TIMESTAMP;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS max_participants INTEGER; -- L1-L3也可限制总人数
ALTER TABLE activities ADD COLUMN IF NOT EXISTS require_location BOOLEAN DEFAULT FALSE; -- 是否需要选择测评点

-- 添加注释
COMMENT ON COLUMN activities.registration_enabled IS '是否开启报名功能';
COMMENT ON COLUMN activities.registration_start_time IS '报名开始时间';
COMMENT ON COLUMN activities.registration_end_time IS '报名截止时间';
COMMENT ON COLUMN activities.max_participants IS '最大参与人数限制';
COMMENT ON COLUMN activities.require_location IS '是否需要选择测评点（L4+自动设为true）';
```

---

## 4. API设计

### 4.1 测评点管理API

#### 4.1.1 创建测评点
```
POST /api/activities/:activityId/locations

请求体:
{
  "name": "贵阳一中考点",
  "address": "贵阳市云岩区xxx路xxx号",
  "district_id": 1,
  "capacity": 100,
  "contact_name": "张老师",
  "contact_phone": "13800138000",
  "exam_date": "2025-01-15",
  "exam_time_start": "09:00",
  "exam_time_end": "11:00",
  "check_in_time": "08:30",
  "notes": "请携带学生证"
}

响应:
{
  "success": true,
  "location": { ... }
}
```

#### 4.1.2 获取测评点列表
```
GET /api/activities/:activityId/locations

查询参数:
- district_id: 筛选特定区县
- available_only: true - 只返回有剩余名额的

响应:
{
  "success": true,
  "locations": [
    {
      "id": 1,
      "name": "贵阳一中考点",
      "address": "...",
      "capacity": 100,
      "registered_count": 45,
      "remaining": 55,
      "exam_date": "2025-01-15",
      "exam_time": "09:00-11:00",
      "is_full": false
    }
  ]
}
```

#### 4.1.3 更新测评点
```
PUT /api/activities/:activityId/locations/:locationId

请求体: { ... 同创建 ... }
```

#### 4.1.4 删除测评点
```
DELETE /api/activities/:activityId/locations/:locationId

注：只能删除没有报名记录的测评点
```

### 4.2 学生报名API

#### 4.2.1 获取可报名测评列表
```
GET /api/assessments/available

查询参数:
- subject: 学科
- grade: 年级
- ability_level: 能力等级

响应:
{
  "success": true,
  "assessments": [
    {
      "id": 1,
      "title": "2025年春季数学L3能力测评",
      "subject": "数学",
      "ability_level": "L3",
      "is_online": true,  // L1-L3为true
      "registration_deadline": "2025-01-10T23:59:59",
      "exam_time": "2025-01-15 09:00-11:00",
      "registration_status": null,  // null=未报名, "confirmed"=已报名等
      "can_register": true,
      "reason": null  // 不能报名时的原因
    }
  ]
}
```

#### 4.2.2 检查报名资格
```
GET /api/activities/:activityId/registration/eligibility

响应:
{
  "success": true,
  "eligible": true,
  "reasons": [],  // 不符合条件时的原因列表
  "require_location": false,  // 是否需要选择测评点
  "locations": []  // require_location为true时返回可选测评点
}
```

#### 4.2.3 提交报名（L1-L3）
```
POST /api/activities/:activityId/register

请求体:
{
  // L1-L3 不需要额外参数
}

响应:
{
  "success": true,
  "registration": {
    "id": 123,
    "status": "confirmed",
    "registered_at": "2025-01-05T10:30:00Z",
    "message": "报名成功！请在测评时间登录系统参加测评。"
  }
}
```

#### 4.2.4 提交报名（L4+）
```
POST /api/activities/:activityId/register

请求体:
{
  "location_id": 1  // 必填，选择的测评点
}

响应:
{
  "success": true,
  "registration": {
    "id": 124,
    "status": "confirmed",
    "location": {
      "name": "贵阳一中考点",
      "address": "...",
      "exam_date": "2025-01-15",
      "exam_time": "09:00-11:00",
      "check_in_time": "08:30"
    },
    "message": "报名成功！请按时到达测评点参加测评。"
  }
}
```

#### 4.2.5 取消报名
```
POST /api/activities/:activityId/register/cancel

请求体:
{
  "reason": "个人原因无法参加"  // 可选
}

响应:
{
  "success": true,
  "message": "报名已取消"
}
```

#### 4.2.6 查看我的报名
```
GET /api/assessments/my-registrations

查询参数:
- status: 筛选状态
- upcoming: true - 只看即将进行的

响应:
{
  "success": true,
  "registrations": [
    {
      "id": 123,
      "activity": {
        "id": 1,
        "title": "...",
        "ability_level": "L4",
        "exam_time": "..."
      },
      "location": { ... },  // L4+有
      "status": "confirmed",
      "registered_at": "..."
    }
  ]
}
```

### 4.3 管理员报名管理API

#### 4.3.1 查看活动报名列表
```
GET /api/activities/:activityId/registrations

查询参数:
- status: 筛选状态
- location_id: 筛选测评点
- school_id: 筛选学校
- page, page_size: 分页

响应:
{
  "success": true,
  "total": 150,
  "registrations": [
    {
      "id": 123,
      "student": {
        "id": 1,
        "name": "张小明",
        "school": "云岩一小",
        "grade": "三年级",
        "class_name": "3班"
      },
      "location": { ... },
      "status": "confirmed",
      "registered_at": "..."
    }
  ],
  "statistics": {
    "total": 150,
    "confirmed": 140,
    "pending": 5,
    "cancelled": 5
  }
}
```

#### 4.3.2 导出报名名单
```
GET /api/activities/:activityId/registrations/export

查询参数:
- format: xlsx | csv
- location_id: 导出特定测评点

响应: 文件下载
```

#### 4.3.3 批量操作报名
```
POST /api/activities/:activityId/registrations/batch

请求体:
{
  "action": "confirm" | "cancel" | "reject",
  "registration_ids": [1, 2, 3],
  "reason": "..."  // cancel/reject时可选
}
```

---

## 5. 前端页面设计

### 5.1 学生端页面

#### 5.1.1 测评报名列表页 `/student/assessments`

**页面功能**:
- 显示可报名的测评列表
- 筛选：学科、能力等级、报名状态
- 标签区分：L1-L3(线上) / L4+(现场)
- 显示报名截止时间倒计时

**列表字段**:
| 字段 | 说明 |
|------|------|
| 测评名称 | 活动标题 |
| 学科 | 科目标签 |
| 能力等级 | L1-L7 |
| 测评模式 | 线上/现场 |
| 报名截止 | 截止时间 |
| 测评时间 | 考试时间 |
| 状态 | 未报名/已报名/已截止 |
| 操作 | 报名/查看详情 |

#### 5.1.2 测评详情与报名页 `/student/assessments/:id`

**页面区域**:
1. **基本信息区**: 测评名称、学科、等级、时间等
2. **测评说明区**: 测评内容介绍、注意事项
3. **报名信息区**:
   - L1-L3: 直接显示报名按钮
   - L4+: 显示测评点选择列表
4. **我的报名状态**: 已报名时显示报名信息

#### 5.1.3 我的报名记录页 `/student/my-registrations`

**页面功能**:
- 查看历史报名记录
- 筛选：状态、时间范围
- 取消报名操作
- 查看测评点详情（L4+）

### 5.2 管理员端页面

#### 5.2.1 测评点管理页 `/admin/activities/:id/locations`

**页面功能**:
- 添加/编辑/删除测评点
- 查看各测评点报名情况
- 容量预警提示

#### 5.2.2 报名管理页 `/admin/activities/:id/registrations`

**页面功能**:
- 报名列表（表格形式）
- 统计卡片（总数、已确认、待确认等）
- 按测评点/学校/年级分组查看
- 导出报名名单
- 批量操作

---

## 6. 业务规则汇总

### 6.1 报名时间规则

| 规则 | 说明 |
|------|------|
| 报名开始 | 必须设置 registration_start_time |
| 报名截止 | 必须设置 registration_end_time，且早于测评开始时间 |
| 取消截止 | L4+ 取消截止时间 = 报名截止时间 |
| 超时处理 | 报名截止后不再接受新报名 |

### 6.2 容量控制规则

| 规则 | 说明 |
|------|------|
| L1-L3 | 默认无限制，可设置 max_participants |
| L4+ | 必须选择测评点，受测评点容量限制 |
| 并发控制 | 使用数据库事务防止超额报名 |
| 名额释放 | 取消报名后名额自动释放 |

### 6.3 资格检查规则

| 检查项 | 说明 |
|-------|------|
| 账号状态 | 必须为 active |
| 重复报名 | 同一活动只能报名一次 |
| 年级限制 | 匹配 target_audience.grades |
| 学校限制 | 匹配 target_audience.schools（如有）|
| 区域限制 | 匹配 scope 范围 |
| 等级前置 | 可选：要求通过前置等级（如L3需先通过L2）|

### 6.4 与活动生命周期的关系

| 活动状态 | 可否报名 | 可否取消报名 | 可否取消发布 |
|---------|---------|-------------|-------------|
| draft | ❌ | - | ✅ 可删除 |
| published | ✅ 在报名时间内 | ✅ 在取消截止前 | **❌ 有报名则不可** |
| ongoing | ❌ | ❌ | ❌ |
| finished | ❌ | ❌ | ❌ |

---

## 7. 开发计划

### 7.1 阶段划分

| 阶段 | 内容 | 预计工期 | 依赖 |
|------|------|---------|------|
| 阶段1 | 数据库设计与迁移 | 1天 | - |
| 阶段2 | 后端API - 测评点管理 | 1天 | 阶段1 |
| 阶段3 | 后端API - 学生报名 | 2天 | 阶段1 |
| 阶段4 | 后端API - 管理员报名管理 | 1天 | 阶段3 |
| 阶段5 | 前端 - 学生报名页面 | 2天 | 阶段3 |
| 阶段6 | 前端 - 管理员管理页面 | 2天 | 阶段4 |
| 阶段7 | 集成测试与优化 | 2天 | 阶段5,6 |
| **总计** | - | **11天** | - |

### 7.2 详细开发步骤

#### 阶段1: 数据库设计与迁移 (1天)

**任务清单**:
- [ ] 创建迁移文件 `database/migrations/027_assessment_registration.sql`
- [ ] 创建 assessment_locations 表
- [ ] 创建 assessment_registrations 表
- [ ] 创建触发器维护报名计数
- [ ] 修改 activities 表添加报名字段
- [ ] 同步更新 schema.sql
- [ ] 添加测试数据到 seed.sql

**产出文件**:
- `database/migrations/027_assessment_registration.sql`
- `database/schema.sql` (更新)
- `database/seed.sql` (更新)

#### 阶段2: 后端API - 测评点管理 (1天)

**任务清单**:
- [ ] 创建 AssessmentLocation 模型
- [ ] 实现测评点 CRUD API
- [ ] 添加权限控制（区级+管理员）
- [ ] 编写 API 测试

**产出文件**:
- `backend/src/models/AssessmentLocation.js`
- `backend/src/routes/assessmentLocations.js`
- `tests/api/assessment-location-api-test.js`

#### 阶段3: 后端API - 学生报名 (2天)

**任务清单**:
- [ ] 创建 AssessmentRegistration 模型
- [ ] 实现报名资格检查逻辑
- [ ] 实现 L1-L3 报名接口
- [ ] 实现 L4+ 报名接口（含测评点选择）
- [ ] 实现取消报名接口
- [ ] 实现我的报名查询接口
- [ ] 添加并发控制（防止超额报名）
- [ ] 修改活动取消发布逻辑（检查报名）
- [ ] 编写 API 测试

**产出文件**:
- `backend/src/models/AssessmentRegistration.js`
- `backend/src/routes/assessmentRegistrations.js`
- `tests/api/assessment-registration-api-test.js`

#### 阶段4: 后端API - 管理员报名管理 (1天)

**任务清单**:
- [ ] 实现报名列表查询（含筛选、分页）
- [ ] 实现报名统计接口
- [ ] 实现批量操作接口
- [ ] 实现导出功能
- [ ] 编写 API 测试

**产出文件**:
- `backend/src/routes/assessmentRegistrations.js` (扩展)
- `tests/api/assessment-registration-admin-test.js`

#### 阶段5: 前端 - 学生报名页面 (2天)

**任务清单**:
- [ ] 创建测评报名列表页
- [ ] 创建测评详情与报名页
- [ ] 实现测评点选择组件（L4+）
- [ ] 创建我的报名记录页
- [ ] 添加路由和菜单入口
- [ ] 更新 API 服务层

**产出文件**:
- `frontend/src/pages/student/AssessmentRegistration.tsx`
- `frontend/src/pages/student/AssessmentDetail.tsx`
- `frontend/src/pages/student/MyRegistrations.tsx`
- `frontend/src/components/LocationSelector.tsx`
- `frontend/src/services/api.ts` (更新)

#### 阶段6: 前端 - 管理员管理页面 (2天)

**任务清单**:
- [ ] 创建测评点管理页面
- [ ] 创建报名管理页面
- [ ] 实现报名统计卡片
- [ ] 实现导出功能
- [ ] 添加路由和菜单入口

**产出文件**:
- `frontend/src/pages/admin/AssessmentLocations.tsx`
- `frontend/src/pages/admin/RegistrationManagement.tsx`

#### 阶段7: 集成测试与优化 (2天)

**任务清单**:
- [ ] 编写 E2E 测试用例
- [ ] 执行端到端测试
- [ ] 修复发现的问题
- [ ] 性能优化
- [ ] 更新文档

**产出文件**:
- `tests/e2e/regression/assessment-registration.spec.ts`
- `tests/docs/E2E_testcases/assessment-registration-testcases.md`
- `documents/API_Document.md` (更新)

---

## 8. 后续功能规划

### 8.1 通知系统集成

测评报名功能完成后，将开发通知系统来支持：

| 通知类型 | 触发时机 | 接收者 |
|---------|---------|-------|
| 测评发布通知 | 新测评发布时 | 符合条件的学生 |
| 报名成功通知 | 报名确认时 | 报名学生 |
| 报名截止提醒 | 截止前24小时 | 未报名学生 |
| 测评即将开始 | 测评前24小时 | 已报名学生 |
| 测评点变更通知 | 测评点信息变更 | 相关学生 |

### 8.2 扩展功能

- **候补名单**: L4+满额后支持候补排队
- **批量报名**: 教师为班级学生批量报名
- **报名审核**: 特定测评需要管理员审核报名
- **前置等级验证**: 要求先通过低等级测评

---

## 9. 相关文档

- 功能需求文档: `docs/FEATURE_REQUIREMENTS.md`
- 待完成工作: `docs/PENDING_WORK.md`
- API文档: `documents/API_Document.md`
- 开发状态: `documents/DEVELOPMENT_STATUS.md`

---

*文档版本：v1.0*
*创建日期：2025-11-30*
*文档状态：待评审*
