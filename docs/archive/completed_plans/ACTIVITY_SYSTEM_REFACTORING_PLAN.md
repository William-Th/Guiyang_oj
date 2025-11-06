# 活动系统重构计划 - 从考试到测评/练习

**项目名称**: 贵阳小学生测评服务平台 - 活动系统重构
**文档版本**: v1.0
**创建日期**: 2025-10-21
**重构阶段**: 重大架构调整
**优先级**: 🔴 极高

---

## 目录

1. [重构概述](#1-重构概述)
2. [核心变更](#2-核心变更)
3. [权限设计](#3-权限设计)
4. [数据库设计](#4-数据库设计)
5. [API设计](#5-api设计)
6. [前端重构](#6-前端重构)
7. [迁移策略](#7-迁移策略)
8. [测试计划](#8-测试计划)

---

## 1. 重构概述

### 1.1 变更背景

**原系统**: 单一的"考试"概念
**新系统**: "活动"概念，分为"测评"和"练习"两种类型

### 1.2 核心诉求

1. **概念统一**:
   - ❌ 考试 (Exam)
   - ✅ 活动 (Activity)
   - ✅ 测评 (Assessment) - 正式评测，权威性强
   - ✅ 练习 (Practice) - 日常练习，灵活性高

2. **权限分级**:
   - **练习**: 教师 + 普通校级管理员可创建
   - **测评**: 仅区级管理员、示范校管理员、市级管理员可创建

3. **分类管理**:
   - 按科目分类（数学、物理、化学、生物、计算机）
   - 按级别分类（L1-L7等级）

### 1.3 影响范围

| 模块 | 影响程度 | 说明 |
|-----|---------|------|
| 数据库 | 🔴 高 | 表重命名、新增字段、迁移数据 |
| 后端API | 🔴 高 | 路由重构、权限控制重写 |
| 前端页面 | 🔴 高 | 所有考试相关页面需重构 |
| 测试用例 | 🟡 中 | 需要更新测试数据和断言 |
| 文档 | 🟡 中 | API文档、需求文档需更新 |

---

## 2. 核心变更

### 2.1 术语映射

| 旧术语 | 新术语 | 英文 | 说明 |
|-------|-------|------|------|
| 考试 | 活动 | Activity | 顶层概念 |
| - | 测评 | Assessment | 正式测评活动 |
| - | 练习 | Practice | 日常练习活动 |
| 考试列表 | 活动中心 | Activity Center | 页面名称 |
| 参加考试 | 参加活动 | Join Activity | 操作名称 |
| 考试成绩 | 活动成绩 | Activity Score | 结果名称 |

### 2.2 活动类型定义

#### 2.2.1 测评 (Assessment)

**特征**:
- ✅ 正式性强，成绩权威
- ✅ 可颁发证书
- ✅ 计入学生档案
- ✅ 严格的时间控制
- ✅ 防作弊措施完善

**使用场景**:
- 学期期中/期末测评
- 能力等级认证测评
- 全市统一测评
- 竞赛选拔测评

**创建权限**:
- ✅ 区级管理员 (`district_admin`)
- ✅ 示范校管理员 (`base_school_admin`)
- ✅ 市直属学校管理员 (`municipal_school_admin`)
- ✅ 市级总管理员 (`municipal_admin`)
- ❌ 教师 (`teacher`)
- ❌ 普通校级管理员 (`school_admin`)

#### 2.2.2 练习 (Practice)

**特征**:
- ✅ 灵活性高，可反复参与
- ✅ 即时反馈
- ✅ 不计入正式档案
- ✅ 可以多次尝试
- ✅ 用于日常练习和自我提升

**使用场景**:
- 课堂随堂练习
- 单元测试
- 错题重练
- 知识点巩固

**创建权限**:
- ✅ 教师 (`teacher`)
- ✅ 校级管理员 (`school_admin`)
- ✅ 区级管理员 (`district_admin`)
- ✅ 示范校管理员 (`base_school_admin`)
- ✅ 市直属学校管理员 (`municipal_school_admin`)
- ✅ 市级总管理员 (`municipal_admin`)

### 2.3 科目和级别体系

#### 2.3.1 科目分类

当前系统支持科目:
```typescript
const SUBJECTS = [
  '数学',    // Mathematics
  '物理',    // Physics
  '化学',    // Chemistry
  '生物',    // Biology
  '计算机'   // Computer Science
];
```

#### 2.3.2 能力级别

```typescript
const ABILITY_LEVELS = [
  'L1',  // 基础级 - 七年级基础
  'L2',  // 初级   - 七年级进阶
  'L3',  // 中级   - 八年级基础
  'L4',  // 中高级 - 八年级进阶
  'L5',  // 高级   - 九年级基础
  'L6',  // 优秀级 - 九年级进阶
  'L7'   // 卓越级 - 竞赛级别
];
```

**级别说明**:
- **L1-L2**: 基础能力认证，对应七年级
- **L3-L4**: 中等能力认证，对应八年级
- **L5-L6**: 高级能力认证，对应九年级
- **L7**: 卓越能力认证，竞赛水平

---

## 3. 权限设计

### 3.1 角色权限矩阵

| 角色 | 英文角色 | 创建练习 | 创建测评 | 查看活动 | 参与活动 |
|-----|---------|---------|---------|---------|---------|
| 学生 | student | ❌ | ❌ | ✅ | ✅ |
| 教师 | teacher | ✅ | ❌ | ✅ | ❌ |
| 校级管理员 | school_admin | ✅ | ❌ | ✅ | ❌ |
| 区级管理员 | district_admin | ✅ | ✅ | ✅ | ❌ |
| 市直属管理员 | municipal_school_admin | ✅ | ✅ | ✅ | ❌ |
| 示范校管理员 | base_school_admin | ✅ | ✅ | ✅ | ❌ |
| 市级总管理员 | municipal_admin | ✅ | ✅ | ✅ | ❌ |

### 3.2 权限验证逻辑

```javascript
// backend/src/middleware/activityPermission.js

/**
 * 检查用户是否可以创建指定类型的活动
 */
function canCreateActivity(user, activityType) {
  // 测评创建权限
  if (activityType === 'assessment') {
    const allowedRoles = [
      'district_admin',
      'base_school_admin',
      'municipal_school_admin',
      'municipal_admin'
    ];
    return allowedRoles.includes(user.role);
  }

  // 练习创建权限
  if (activityType === 'practice') {
    const allowedRoles = [
      'teacher',
      'school_admin',
      'district_admin',
      'base_school_admin',
      'municipal_school_admin',
      'municipal_admin'
    ];
    return allowedRoles.includes(user.role);
  }

  return false;
}

/**
 * 活动创建权限中间件
 */
const requireActivityPermission = (activityType) => {
  return (req, res, next) => {
    if (!canCreateActivity(req.user, activityType)) {
      return res.status(403).json({
        success: false,
        error: `您没有权限创建${activityType === 'assessment' ? '测评' : '练习'}活动`
      });
    }
    next();
  };
};

module.exports = {
  canCreateActivity,
  requireActivityPermission
};
```

### 3.3 API权限示例

```javascript
// 创建练习 - 教师和所有管理员
router.post('/activities',
  authMiddleware,
  requireRole(['teacher', 'school_admin', 'district_admin', 'base_school_admin',
               'municipal_school_admin', 'municipal_admin']),
  validateActivityType,
  requireActivityPermission(req.body.type),
  ActivityController.create
);

// 创建测评 - 仅高级管理员
router.post('/activities/assessment',
  authMiddleware,
  requireRole(['district_admin', 'base_school_admin',
               'municipal_school_admin', 'municipal_admin']),
  ActivityController.createAssessment
);
```

---

## 4. 数据库设计

### 4.1 表重命名策略

#### 4.1.1 主表重命名

```sql
-- 方案1: 直接重命名（推荐）
ALTER TABLE exams RENAME TO activities;
ALTER TABLE student_exams RENAME TO student_activities;
ALTER TABLE exam_sessions RENAME TO activity_sessions;

-- 方案2: 创建新表 + 数据迁移（更安全）
-- 详见 4.2 节
```

#### 4.1.2 索引和约束重命名

```sql
-- 重命名主键约束
ALTER TABLE activities RENAME CONSTRAINT exams_pkey TO activities_pkey;

-- 重命名索引
ALTER INDEX idx_exams_subject RENAME TO idx_activities_subject;
ALTER INDEX idx_exams_status RENAME TO idx_activities_status;

-- 重命名外键
ALTER TABLE student_activities
  RENAME CONSTRAINT student_exams_exam_id_fkey TO student_activities_activity_id_fkey;

ALTER TABLE student_activities
  RENAME CONSTRAINT student_exams_student_id_fkey TO student_activities_student_id_fkey;
```

### 4.2 新增字段

#### 4.2.1 activities 表新增字段

```sql
-- 添加活动类型
ALTER TABLE activities
ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'practice'
CHECK (type IN ('assessment', 'practice'));

-- 添加能力级别
ALTER TABLE activities
ADD COLUMN ability_level VARCHAR(10)
CHECK (ability_level IN ('L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'));

-- 添加活动范围（班级/学校/区域/全市）
ALTER TABLE activities
ADD COLUMN scope VARCHAR(20) DEFAULT 'school'
CHECK (scope IN ('class', 'school', 'district', 'municipal'));

-- 添加目标班级（如果是班级活动）
ALTER TABLE activities
ADD COLUMN target_class_id INTEGER REFERENCES classes(id);

-- 添加允许重复参与（练习可以多次尝试）
ALTER TABLE activities
ADD COLUMN allow_retake BOOLEAN DEFAULT FALSE;

-- 添加最大尝试次数
ALTER TABLE activities
ADD COLUMN max_attempts INTEGER DEFAULT 1;

-- 添加是否计入档案
ALTER TABLE activities
ADD COLUMN is_official BOOLEAN DEFAULT FALSE;

-- 添加创建者所属机构
ALTER TABLE activities
ADD COLUMN created_by_org_id INTEGER;

ALTER TABLE activities
ADD COLUMN created_by_org_type VARCHAR(20)
CHECK (created_by_org_type IN ('school', 'district', 'municipal'));
```

#### 4.2.2 完整的 activities 表结构

```sql
CREATE TABLE activities (
  id SERIAL PRIMARY KEY,

  -- 基础信息
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- 活动类型和级别
  type VARCHAR(20) NOT NULL DEFAULT 'practice'
    CHECK (type IN ('assessment', 'practice')),
  ability_level VARCHAR(10)
    CHECK (ability_level IN ('L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7')),

  -- 科目和年级
  subject VARCHAR(50) NOT NULL,
  grade VARCHAR(20),

  -- 活动范围
  scope VARCHAR(20) DEFAULT 'school'
    CHECK (scope IN ('class', 'school', 'district', 'municipal')),
  target_class_id INTEGER REFERENCES classes(id),

  -- 时间设置
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  duration INTEGER, -- 活动时长（分钟）

  -- 分数设置
  total_score INTEGER DEFAULT 100,
  pass_score INTEGER DEFAULT 60,

  -- 参与设置
  allow_retake BOOLEAN DEFAULT FALSE,
  max_attempts INTEGER DEFAULT 1,

  -- 状态
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'ongoing', 'finished', 'cancelled')),

  -- 是否正式活动（测评为true，练习为false）
  is_official BOOLEAN DEFAULT FALSE,

  -- 创建者信息
  created_by INTEGER REFERENCES users(id),
  created_by_org_id INTEGER,
  created_by_org_type VARCHAR(20)
    CHECK (created_by_org_type IN ('school', 'district', 'municipal')),

  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_subject ON activities(subject);
CREATE INDEX idx_activities_ability_level ON activities(ability_level);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_scope ON activities(scope);
CREATE INDEX idx_activities_created_by ON activities(created_by);
CREATE INDEX idx_activities_start_time ON activities(start_time);
```

#### 4.2.3 student_activities 表更新

```sql
-- 重命名字段
ALTER TABLE student_activities
RENAME COLUMN exam_id TO activity_id;

-- 添加尝试次数
ALTER TABLE student_activities
ADD COLUMN attempt_number INTEGER DEFAULT 1;

-- 更新约束
ALTER TABLE student_activities
DROP CONSTRAINT IF EXISTS student_exams_student_id_exam_id_key;

-- 新的唯一约束（允许多次尝试）
CREATE UNIQUE INDEX idx_student_activities_unique
ON student_activities(student_id, activity_id, attempt_number);
```

### 4.3 数据迁移脚本

```sql
-- database/migrations/001_rename_exams_to_activities.sql

-- ============================================
-- 步骤1: 备份现有数据
-- ============================================
CREATE TABLE exams_backup AS SELECT * FROM exams;
CREATE TABLE student_exams_backup AS SELECT * FROM student_exams;
CREATE TABLE exam_sessions_backup AS SELECT * FROM exam_sessions;

-- ============================================
-- 步骤2: 重命名表
-- ============================================
ALTER TABLE exams RENAME TO activities;
ALTER TABLE student_exams RENAME TO student_activities;
ALTER TABLE exam_sessions RENAME TO activity_sessions;

-- ============================================
-- 步骤3: 重命名列
-- ============================================
ALTER TABLE student_activities RENAME COLUMN exam_id TO activity_id;
ALTER TABLE activity_sessions RENAME COLUMN exam_id TO activity_id;
ALTER TABLE questions RENAME COLUMN exam_id TO activity_id;
ALTER TABLE certificates RENAME COLUMN exam_id TO activity_id;

-- ============================================
-- 步骤4: 添加新字段
-- ============================================

-- 活动类型（默认为练习）
ALTER TABLE activities
ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'practice'
CHECK (type IN ('assessment', 'practice'));

-- 能力级别
ALTER TABLE activities
ADD COLUMN ability_level VARCHAR(10)
CHECK (ability_level IN ('L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'));

-- 活动范围
ALTER TABLE activities
ADD COLUMN scope VARCHAR(20) DEFAULT 'school'
CHECK (scope IN ('class', 'school', 'district', 'municipal'));

-- 目标班级
ALTER TABLE activities
ADD COLUMN target_class_id INTEGER REFERENCES classes(id);

-- 允许重复参与
ALTER TABLE activities
ADD COLUMN allow_retake BOOLEAN DEFAULT FALSE;

-- 最大尝试次数
ALTER TABLE activities
ADD COLUMN max_attempts INTEGER DEFAULT 1;

-- 是否正式活动
ALTER TABLE activities
ADD COLUMN is_official BOOLEAN DEFAULT FALSE;

-- 创建者机构信息
ALTER TABLE activities
ADD COLUMN created_by_org_id INTEGER;

ALTER TABLE activities
ADD COLUMN created_by_org_type VARCHAR(20)
CHECK (created_by_org_type IN ('school', 'district', 'municipal'));

-- ============================================
-- 步骤5: 更新现有数据
-- ============================================

-- 根据创建者角色推断活动类型
UPDATE activities a
SET type = CASE
  WHEN u.role IN ('district_admin', 'base_school_admin', 'municipal_school_admin', 'municipal_admin')
    THEN 'assessment'
  ELSE 'practice'
END,
is_official = CASE
  WHEN u.role IN ('district_admin', 'base_school_admin', 'municipal_school_admin', 'municipal_admin')
    THEN TRUE
  ELSE FALSE
END
FROM users u
WHERE a.created_by = u.id;

-- 根据年级推断能力级别（示例逻辑）
UPDATE activities
SET ability_level = CASE
  WHEN grade = '七年级' THEN 'L1'
  WHEN grade = '八年级' THEN 'L3'
  WHEN grade = '九年级' THEN 'L5'
  ELSE NULL
END;

-- ============================================
-- 步骤6: 添加尝试次数字段
-- ============================================
ALTER TABLE student_activities
ADD COLUMN attempt_number INTEGER DEFAULT 1;

-- ============================================
-- 步骤7: 更新约束和索引
-- ============================================

-- 删除旧的唯一约束
ALTER TABLE student_activities
DROP CONSTRAINT IF EXISTS student_exams_student_id_exam_id_key;

-- 创建新的唯一索引（支持多次尝试）
CREATE UNIQUE INDEX idx_student_activities_unique
ON student_activities(student_id, activity_id, attempt_number);

-- 创建新索引
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_ability_level ON activities(ability_level);
CREATE INDEX idx_activities_scope ON activities(scope);

-- ============================================
-- 步骤8: 验证数据完整性
-- ============================================

-- 检查记录数是否一致
DO $$
DECLARE
  old_count INTEGER;
  new_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_count FROM exams_backup;
  SELECT COUNT(*) INTO new_count FROM activities;

  IF old_count != new_count THEN
    RAISE EXCEPTION '数据迁移失败：记录数不一致 (旧: %, 新: %)', old_count, new_count;
  END IF;

  RAISE NOTICE '数据迁移成功：共 % 条记录', new_count;
END $$;

-- ============================================
-- 步骤9: 更新序列（如果需要）
-- ============================================

-- 重命名序列
ALTER SEQUENCE exams_id_seq RENAME TO activities_id_seq;
ALTER SEQUENCE student_exams_id_seq RENAME TO student_activities_id_seq;
ALTER SEQUENCE exam_sessions_id_seq RENAME TO activity_sessions_id_seq;

-- ============================================
-- 完成标记
-- ============================================
INSERT INTO schema_migrations (version, description, applied_at)
VALUES ('001', 'Rename exams to activities and add activity types', CURRENT_TIMESTAMP);
```

### 4.4 回滚脚本

```sql
-- database/migrations/001_rollback.sql

-- ============================================
-- 回滚步骤1: 删除新字段
-- ============================================
ALTER TABLE activities DROP COLUMN IF EXISTS type;
ALTER TABLE activities DROP COLUMN IF EXISTS ability_level;
ALTER TABLE activities DROP COLUMN IF EXISTS scope;
ALTER TABLE activities DROP COLUMN IF EXISTS target_class_id;
ALTER TABLE activities DROP COLUMN IF EXISTS allow_retake;
ALTER TABLE activities DROP COLUMN IF EXISTS max_attempts;
ALTER TABLE activities DROP COLUMN IF EXISTS is_official;
ALTER TABLE activities DROP COLUMN IF EXISTS created_by_org_id;
ALTER TABLE activities DROP COLUMN IF EXISTS created_by_org_type;

ALTER TABLE student_activities DROP COLUMN IF EXISTS attempt_number;

-- ============================================
-- 回滚步骤2: 恢复表名
-- ============================================
ALTER TABLE activities RENAME TO exams;
ALTER TABLE student_activities RENAME TO student_exams;
ALTER TABLE activity_sessions RENAME TO exam_sessions;

-- ============================================
-- 回滚步骤3: 恢复列名
-- ============================================
ALTER TABLE student_exams RENAME COLUMN activity_id TO exam_id;
ALTER TABLE exam_sessions RENAME COLUMN activity_id TO exam_id;
ALTER TABLE questions RENAME COLUMN activity_id TO exam_id;
ALTER TABLE certificates RENAME COLUMN activity_id TO exam_id;

-- ============================================
-- 回滚步骤4: 恢复序列名
-- ============================================
ALTER SEQUENCE activities_id_seq RENAME TO exams_id_seq;
ALTER SEQUENCE student_activities_id_seq RENAME TO student_exams_id_seq;
ALTER SEQUENCE activity_sessions_id_seq RENAME TO exam_sessions_id_seq;

-- ============================================
-- 回滚步骤5: 恢复约束
-- ============================================
ALTER TABLE student_exams
DROP INDEX IF EXISTS idx_student_activities_unique;

CREATE UNIQUE INDEX student_exams_student_id_exam_id_key
ON student_exams(student_id, exam_id);

-- ============================================
-- 回滚完成标记
-- ============================================
DELETE FROM schema_migrations WHERE version = '001';
```

---

## 5. API设计

### 5.1 RESTful API结构

#### 5.1.1 活动管理API

```javascript
// 基础路由：/api/activities

// ===== 公共接口 =====
GET    /api/activities                    # 获取活动列表（带筛选）
GET    /api/activities/:id                # 获取活动详情
GET    /api/activities/:id/questions      # 获取活动题目

// ===== 创建接口 =====
POST   /api/activities/practice           # 创建练习活动（教师+管理员）
POST   /api/activities/assessment         # 创建测评活动（高级管理员）

// ===== 学生接口 =====
POST   /api/activities/:id/register       # 报名参加活动
POST   /api/activities/:id/start          # 开始活动
POST   /api/activities/:id/submit         # 提交活动

// ===== 管理接口 =====
PUT    /api/activities/:id                # 更新活动
DELETE /api/activities/:id                # 删除活动
PUT    /api/activities/:id/status         # 更新活动状态
GET    /api/activities/:id/statistics     # 获取活动统计

// ===== 我的活动 =====
GET    /api/my/activities                 # 学生：我参加的活动
GET    /api/my/created-activities         # 教师/管理员：我创建的活动
```

#### 5.1.2 API详细设计

**1. 获取活动列表**

```http
GET /api/activities?type=practice&subject=数学&level=L3&status=published

Response:
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": 1,
        "title": "数学L3级练习 - 一元二次方程",
        "type": "practice",
        "subject": "数学",
        "ability_level": "L3",
        "grade": "八年级",
        "scope": "school",
        "start_time": "2025-10-25T14:00:00Z",
        "end_time": "2025-10-25T16:00:00Z",
        "duration": 60,
        "total_score": 100,
        "status": "published",
        "allow_retake": true,
        "max_attempts": 3,
        "is_official": false,
        "creator": {
          "id": 5,
          "name": "李老师",
          "role": "teacher"
        },
        "participants_count": 25,
        "created_at": "2025-10-20T10:00:00Z"
      }
    ],
    "total": 15,
    "page": 1,
    "pageSize": 20
  }
}
```

**2. 创建练习活动**

```http
POST /api/activities/practice
Authorization: Bearer <token>

Request:
{
  "title": "数学单元测试 - 三角形",
  "description": "三角形基础知识测试",
  "subject": "数学",
  "ability_level": "L2",
  "grade": "七年级",
  "scope": "class",
  "target_class_id": 5,
  "start_time": "2025-10-26T14:00:00Z",
  "end_time": "2025-10-26T15:30:00Z",
  "duration": 60,
  "total_score": 100,
  "pass_score": 60,
  "allow_retake": true,
  "max_attempts": 2,
  "question_ids": [101, 102, 103, 104, 105]
}

Response:
{
  "success": true,
  "message": "练习活动创建成功",
  "data": {
    "activity_id": 123,
    "type": "practice",
    "status": "draft",
    "created_at": "2025-10-21T10:30:00Z"
  }
}
```

**3. 创建测评活动**

```http
POST /api/activities/assessment
Authorization: Bearer <token>

Request:
{
  "title": "数学L3能力认证测评",
  "description": "八年级数学能力等级L3认证",
  "subject": "数学",
  "ability_level": "L3",
  "grade": "八年级",
  "scope": "district",
  "start_time": "2025-11-01T09:00:00Z",
  "end_time": "2025-11-01T11:00:00Z",
  "duration": 90,
  "total_score": 100,
  "pass_score": 60,
  "allow_retake": false,
  "max_attempts": 1,
  "is_official": true,
  "question_ids": [201, 202, 203, 204, 205, 206, 207, 208, 209, 210]
}

Response:
{
  "success": true,
  "message": "测评活动创建成功，等待审核",
  "data": {
    "activity_id": 124,
    "type": "assessment",
    "status": "pending_review",
    "requires_approval": true,
    "created_at": "2025-10-21T11:00:00Z"
  }
}
```

**4. 权限错误响应**

```http
POST /api/activities/assessment
Authorization: Bearer <teacher_token>

Response (403):
{
  "success": false,
  "error": "您没有权限创建测评活动",
  "details": {
    "required_roles": [
      "district_admin",
      "base_school_admin",
      "municipal_school_admin",
      "municipal_admin"
    ],
    "your_role": "teacher",
    "message": "测评活动只能由区级及以上管理员创建"
  }
}
```

### 5.2 后端控制器

```javascript
// backend/src/controllers/ActivityController.js

const Activity = require('../models/Activity');
const { canCreateActivity } = require('../middleware/activityPermission');
const logger = require('../utils/logger');

class ActivityController {
  /**
   * 创建练习活动
   */
  static async createPractice(req, res) {
    try {
      const activityData = {
        ...req.body,
        type: 'practice',
        is_official: false,
        created_by: req.user.id,
        created_by_org_type: req.user.org_type,
        created_by_org_id: req.user.org_id
      };

      const activity = await Activity.create(activityData);

      logger.info('Practice activity created', {
        activityId: activity.id,
        title: activity.title,
        createdBy: req.user.id,
        role: req.user.role
      });

      res.status(201).json({
        success: true,
        message: '练习活动创建成功',
        data: activity
      });
    } catch (error) {
      logger.error('Create practice activity error:', error);
      res.status(500).json({
        success: false,
        message: '创建练习活动失败'
      });
    }
  }

  /**
   * 创建测评活动
   */
  static async createAssessment(req, res) {
    try {
      // 验证权限
      if (!canCreateActivity(req.user, 'assessment')) {
        return res.status(403).json({
          success: false,
          error: '您没有权限创建测评活动',
          details: {
            required_roles: [
              'district_admin',
              'base_school_admin',
              'municipal_school_admin',
              'municipal_admin'
            ],
            your_role: req.user.role
          }
        });
      }

      const activityData = {
        ...req.body,
        type: 'assessment',
        is_official: true,
        status: 'pending_review', // 测评需要审核
        created_by: req.user.id,
        created_by_org_type: req.user.org_type,
        created_by_org_id: req.user.org_id
      };

      const activity = await Activity.create(activityData);

      logger.info('Assessment activity created', {
        activityId: activity.id,
        title: activity.title,
        createdBy: req.user.id,
        role: req.user.role
      });

      res.status(201).json({
        success: true,
        message: '测评活动创建成功，等待审核',
        data: activity
      });
    } catch (error) {
      logger.error('Create assessment activity error:', error);
      res.status(500).json({
        success: false,
        message: '创建测评活动失败'
      });
    }
  }

  /**
   * 获取活动列表（带筛选）
   */
  static async getActivities(req, res) {
    try {
      const { type, subject, ability_level, status, scope, page = 1, pageSize = 20 } = req.query;

      const filters = {};
      if (type) filters.type = type;
      if (subject) filters.subject = subject;
      if (ability_level) filters.ability_level = ability_level;
      if (status) filters.status = status;
      if (scope) filters.scope = scope;

      // 学生只能看到已发布的活动
      if (req.user && req.user.role === 'student') {
        filters.status = 'published';
      }

      const result = await Activity.findAll(filters, page, pageSize);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Get activities error:', error);
      res.status(500).json({
        success: false,
        message: '获取活动列表失败'
      });
    }
  }

  /**
   * 学生报名参加活动
   */
  static async registerActivity(req, res) {
    try {
      const { id } = req.params;
      const studentId = req.user.id;

      const activity = await Activity.findById(id);

      if (!activity) {
        return res.status(404).json({
          success: false,
          message: '活动不存在'
        });
      }

      if (activity.status !== 'published') {
        return res.status(400).json({
          success: false,
          message: '活动尚未发布或已结束'
        });
      }

      // 检查是否已报名
      const existingRegistration = await StudentActivity.findByStudentAndActivity(
        studentId,
        id
      );

      if (existingRegistration && !activity.allow_retake) {
        return res.status(400).json({
          success: false,
          message: '您已报名此活动'
        });
      }

      // 检查尝试次数
      if (existingRegistration) {
        const attemptCount = await StudentActivity.getAttemptCount(studentId, id);
        if (attemptCount >= activity.max_attempts) {
          return res.status(400).json({
            success: false,
            message: `您已达到最大尝试次数（${activity.max_attempts}次）`
          });
        }
      }

      const registration = await StudentActivity.register(studentId, id);

      logger.info('Student registered for activity', {
        studentId,
        activityId: id,
        attemptNumber: registration.attempt_number
      });

      res.json({
        success: true,
        message: '报名成功',
        data: registration
      });
    } catch (error) {
      logger.error('Register activity error:', error);
      res.status(500).json({
        success: false,
        message: '报名失败'
      });
    }
  }
}

module.exports = ActivityController;
```

---

## 6. 前端重构

### 6.1 目录结构调整

```
frontend/src/
├── pages/
│   ├── student/
│   │   ├── ActivityCenterPage.tsx       # 学生活动中心（原ExamCenterPage）
│   │   ├── ActivityDetailPage.tsx       # 活动详情
│   │   └── ActivityPage.tsx             # 参加活动页面（答题）
│   ├── teacher/
│   │   ├── ActivityCenterPage.tsx       # 教师活动中心
│   │   ├── CreatePracticeWizard.tsx     # 创建练习向导
│   │   └── ActivityStatisticsPage.tsx   # 活动统计
│   └── admin/
│       ├── ActivityCenterPage.tsx       # 管理员活动中心
│       ├── CreateAssessmentWizard.tsx   # 创建测评向导
│       └── ActivityMonitorPage.tsx      # 活动监控
├── components/
│   ├── activity/
│   │   ├── ActivityCard.tsx             # 活动卡片
│   │   ├── ActivityTypeTag.tsx          # 类型标签（测评/练习）
│   │   ├── AbilityLevelTag.tsx          # 级别标签（L1-L7）
│   │   └── ActivityTimeline.tsx         # 活动时间轴
│   └── ...
├── services/
│   └── activityApi.ts                   # 活动API服务
└── types/
    └── activity.ts                       # 活动类型定义
```

### 6.2 TypeScript类型定义

```typescript
// frontend/src/types/activity.ts

/**
 * 活动类型
 */
export enum ActivityType {
  ASSESSMENT = 'assessment',  // 测评
  PRACTICE = 'practice'       // 练习
}

/**
 * 能力级别
 */
export enum AbilityLevel {
  L1 = 'L1',
  L2 = 'L2',
  L3 = 'L3',
  L4 = 'L4',
  L5 = 'L5',
  L6 = 'L6',
  L7 = 'L7'
}

/**
 * 活动范围
 */
export enum ActivityScope {
  CLASS = 'class',          // 班级
  SCHOOL = 'school',        // 学校
  DISTRICT = 'district',    // 区域
  MUNICIPAL = 'municipal'   // 全市
}

/**
 * 活动状态
 */
export enum ActivityStatus {
  DRAFT = 'draft',               // 草稿
  PENDING_REVIEW = 'pending_review', // 待审核
  PUBLISHED = 'published',       // 已发布
  ONGOING = 'ongoing',           // 进行中
  FINISHED = 'finished',         // 已结束
  CANCELLED = 'cancelled'        // 已取消
}

/**
 * 活动信息接口
 */
export interface Activity {
  id: number;
  title: string;
  description?: string;

  // 类型和级别
  type: ActivityType;
  ability_level?: AbilityLevel;

  // 科目和年级
  subject: string;
  grade?: string;

  // 范围
  scope: ActivityScope;
  target_class_id?: number;

  // 时间
  start_time: string;
  end_time: string;
  duration: number;

  // 分数
  total_score: number;
  pass_score: number;

  // 参与设置
  allow_retake: boolean;
  max_attempts: number;

  // 状态
  status: ActivityStatus;
  is_official: boolean;

  // 创建者
  created_by: number;
  creator?: {
    id: number;
    name: string;
    role: string;
  };

  // 统计
  participants_count?: number;

  // 时间戳
  created_at: string;
  updated_at?: string;
}

/**
 * 学生活动记录
 */
export interface StudentActivity {
  id: number;
  student_id: number;
  activity_id: number;
  attempt_number: number;
  status: 'registered' | 'in_progress' | 'submitted' | 'graded';
  start_time?: string;
  submit_time?: string;
  score?: number;
  rank?: number;
  created_at: string;
}

/**
 * 创建活动请求
 */
export interface CreateActivityRequest {
  title: string;
  description?: string;
  subject: string;
  ability_level?: AbilityLevel;
  grade?: string;
  scope: ActivityScope;
  target_class_id?: number;
  start_time: string;
  end_time: string;
  duration: number;
  total_score: number;
  pass_score: number;
  allow_retake: boolean;
  max_attempts: number;
  question_ids: number[];
}
```

### 6.3 核心组件

#### 6.3.1 ActivityTypeTag 组件

```tsx
// frontend/src/components/activity/ActivityTypeTag.tsx

import React from 'react';
import { Tag } from 'antd';
import { ActivityType } from '@/types/activity';
import { TrophyOutlined, EditOutlined } from '@ant-design/icons';

interface ActivityTypeTagProps {
  type: ActivityType;
  size?: 'default' | 'small' | 'large';
}

const ActivityTypeTag: React.FC<ActivityTypeTagProps> = ({ type, size = 'default' }) => {
  if (type === ActivityType.ASSESSMENT) {
    return (
      <Tag color="gold" icon={<TrophyOutlined />} style={{ fontSize: size === 'large' ? '16px' : '14px' }}>
        测评
      </Tag>
    );
  }

  return (
    <Tag color="blue" icon={<EditOutlined />} style={{ fontSize: size === 'large' ? '16px' : '14px' }}>
      练习
    </Tag>
  );
};

export default ActivityTypeTag;
```

#### 6.3.2 AbilityLevelTag 组件

```tsx
// frontend/src/components/activity/AbilityLevelTag.tsx

import React from 'react';
import { Tag } from 'antd';
import { AbilityLevel } from '@/types/activity';

interface AbilityLevelTagProps {
  level: AbilityLevel;
}

const LEVEL_CONFIG = {
  L1: { color: '#52c41a', text: 'L1 基础' },
  L2: { color: '#1890ff', text: 'L2 初级' },
  L3: { color: '#722ed1', text: 'L3 中级' },
  L4: { color: '#eb2f96', text: 'L4 中高级' },
  L5: { color: '#fa8c16', text: 'L5 高级' },
  L6: { color: '#fa541c', text: 'L6 优秀' },
  L7: { color: '#f5222d', text: 'L7 卓越' },
};

const AbilityLevelTag: React.FC<AbilityLevelTagProps> = ({ level }) => {
  const config = LEVEL_CONFIG[level];

  return (
    <Tag color={config.color} style={{ fontWeight: 'bold' }}>
      {config.text}
    </Tag>
  );
};

export default AbilityLevelTag;
```

#### 6.3.3 ActivityCard 组件

```tsx
// frontend/src/components/activity/ActivityCard.tsx

import React from 'react';
import { Card, Space, Tag, Button, Typography } from 'antd';
import { ClockCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { Activity } from '@/types/activity';
import ActivityTypeTag from './ActivityTypeTag';
import AbilityLevelTag from './AbilityLevelTag';

const { Text, Title } = Typography;

interface ActivityCardProps {
  activity: Activity;
  role: 'student' | 'teacher' | 'admin';
  onAction?: (action: string, activityId: number) => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, role, onAction }) => {
  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card
      hoverable
      style={{ marginBottom: 16 }}
      title={
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <Title level={4} style={{ margin: 0 }}>{activity.title}</Title>
          <Space>
            <ActivityTypeTag type={activity.type} />
            {activity.ability_level && <AbilityLevelTag level={activity.ability_level} />}
            <Tag color="default">{activity.subject}</Tag>
          </Space>
        </Space>
      }
      extra={
        <Tag color={activity.status === 'published' ? 'green' : 'default'}>
          {activity.status === 'published' ? '进行中' : '已结束'}
        </Tag>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <ClockCircleOutlined />
          <Text>开始时间: {formatDateTime(activity.start_time)}</Text>
        </Space>
        <Space>
          <ClockCircleOutlined />
          <Text>时长: {activity.duration}分钟</Text>
        </Space>
        {activity.participants_count !== undefined && (
          <Space>
            <TeamOutlined />
            <Text>参与人数: {activity.participants_count}</Text>
          </Space>
        )}
        {activity.allow_retake && (
          <Tag color="orange">可重复参加（最多{activity.max_attempts}次）</Tag>
        )}

        {role === 'student' && onAction && (
          <Button
            type="primary"
            block
            onClick={() => onAction('start', activity.id)}
          >
            开始活动
          </Button>
        )}

        {(role === 'teacher' || role === 'admin') && onAction && (
          <Space>
            <Button onClick={() => onAction('edit', activity.id)}>编辑</Button>
            <Button onClick={() => onAction('stats', activity.id)}>统计</Button>
          </Space>
        )}
      </Space>
    </Card>
  );
};

export default ActivityCard;
```

### 6.4 API服务

```typescript
// frontend/src/services/activityApi.ts

import axios from 'axios';
import { Activity, CreateActivityRequest, StudentActivity } from '@/types/activity';

const API_BASE = '/api';

export const activityApi = {
  /**
   * 获取活动列表
   */
  getActivities: async (params?: {
    type?: string;
    subject?: string;
    ability_level?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const response = await axios.get(`${API_BASE}/activities`, { params });
    return response.data;
  },

  /**
   * 获取活动详情
   */
  getActivity: async (id: number) => {
    const response = await axios.get(`${API_BASE}/activities/${id}`);
    return response.data;
  },

  /**
   * 创建练习活动
   */
  createPractice: async (data: CreateActivityRequest) => {
    const response = await axios.post(`${API_BASE}/activities/practice`, data);
    return response.data;
  },

  /**
   * 创建测评活动
   */
  createAssessment: async (data: CreateActivityRequest) => {
    const response = await axios.post(`${API_BASE}/activities/assessment`, data);
    return response.data;
  },

  /**
   * 报名活动
   */
  registerActivity: async (id: number) => {
    const response = await axios.post(`${API_BASE}/activities/${id}/register`);
    return response.data;
  },

  /**
   * 开始活动
   */
  startActivity: async (id: number) => {
    const response = await axios.post(`${API_BASE}/activities/${id}/start`);
    return response.data;
  },

  /**
   * 提交活动
   */
  submitActivity: async (id: number, answers: any[]) => {
    const response = await axios.post(`${API_BASE}/activities/${id}/submit`, { answers });
    return response.data;
  },

  /**
   * 获取我的活动
   */
  getMyActivities: async (params?: { status?: string }) => {
    const response = await axios.get(`${API_BASE}/my/activities`, { params });
    return response.data;
  },

  /**
   * 获取我创建的活动
   */
  getCreatedActivities: async () => {
    const response = await axios.get(`${API_BASE}/my/created-activities`);
    return response.data;
  }
};
```

---

## 7. 迁移策略

### 7.1 迁移时间表

```
阶段1: 准备阶段（2天）
├─ Day 1: 数据备份和环境准备
└─ Day 2: 迁移脚本测试（在测试环境）

阶段2: 数据库迁移（1天）
└─ Day 3: 执行数据库迁移（生产环境）

阶段3: 后端迁移（3天）
├─ Day 4-5: 更新后端代码和API
└─ Day 6: 后端测试和验证

阶段4: 前端迁移（4天）
├─ Day 7-8: 更新前端页面和组件
├─ Day 9: 前端测试
└─ Day 10: 集成测试

阶段5: 上线部署（1天）
└─ Day 11: 生产环境部署和验证

总工期: 11个工作日（约2.5周）
```

### 7.2 迁移检查清单

#### 阶段1: 准备

- [ ] 备份生产数据库
- [ ] 在测试环境完整运行一遍迁移
- [ ] 验证测试环境数据完整性
- [ ] 准备回滚脚本

#### 阶段2: 数据库迁移

- [ ] 停止生产环境写入（维护模式）
- [ ] 执行迁移脚本
- [ ] 验证数据完整性
- [ ] 验证索引和约束
- [ ] 恢复生产环境

#### 阶段3: 后端迁移

- [ ] 更新Model层（Exam → Activity）
- [ ] 更新Controller层
- [ ] 更新API路由
- [ ] 添加权限中间件
- [ ] 更新单元测试
- [ ] API测试通过

#### 阶段4: 前端迁移

- [ ] 更新类型定义
- [ ] 更新API服务
- [ ] 更新页面组件
- [ ] 更新路由配置
- [ ] E2E测试通过

#### 阶段5: 上线

- [ ] 预生产环境验证
- [ ] 生产环境部署
- [ ] 功能冒烟测试
- [ ] 监控系统指标
- [ ] 用户反馈收集

---

## 8. 测试计划

### 8.1 单元测试

```javascript
// tests/unit/activityPermission.test.js

describe('活动权限控制', () => {
  test('教师可以创建练习活动', () => {
    const user = { role: 'teacher' };
    expect(canCreateActivity(user, 'practice')).toBe(true);
  });

  test('教师不能创建测评活动', () => {
    const user = { role: 'teacher' };
    expect(canCreateActivity(user, 'assessment')).toBe(false);
  });

  test('区级管理员可以创建测评活动', () => {
    const user = { role: 'district_admin' };
    expect(canCreateActivity(user, 'assessment')).toBe(true);
  });

  test('校级管理员不能创建测评活动', () => {
    const user = { role: 'school_admin' };
    expect(canCreateActivity(user, 'assessment')).toBe(false);
  });
});
```

### 8.2 E2E测试

```typescript
// tests/e2e/activity-system.spec.ts

describe('活动系统', () => {
  // ACS-001: 教师创建练习活动
  test('ACS-001 - 教师创建练习活动', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/activity-center');

    await page.click('button:has-text("创建练习")');
    await page.fill('input[name="title"]', '数学练习-三角形');
    await page.selectOption('select[name="subject"]', '数学');
    await page.selectOption('select[name="ability_level"]', 'L2');

    await page.click('button:has-text("创建")');
    await expect(page.locator('.ant-message-success')).toBeVisible();
  });

  // ACS-002: 教师尝试创建测评（应失败）
  test('ACS-002 - 教师无权创建测评', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/activity-center');

    // 应该看不到"创建测评"按钮
    await expect(page.locator('button:has-text("创建测评")')).not.toBeVisible();
  });

  // ACS-003: 区级管理员创建测评
  test('ACS-003 - 区级管理员创建测评', async ({ page }) => {
    await loginAsDistrictAdmin(page);
    await page.goto('/admin/activity-center');

    await page.click('button:has-text("创建测评")');
    await page.fill('input[name="title"]', '数学L3能力认证');
    await page.selectOption('select[name="type"]', 'assessment');
    await page.selectOption('select[name="ability_level"]', 'L3');

    await page.click('button:has-text("创建")');
    await expect(page.locator('.ant-message-success')).toBeVisible();
  });

  // ACS-004: 学生参加练习（可重复）
  test('ACS-004 - 学生多次参加练习', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/activity-center');

    // 第一次参加
    await page.click('button:has-text("开始练习")');
    // ... 完成练习 ...
    await page.click('button:has-text("提交")');

    // 第二次参加（练习允许重复）
    await page.goto('/student/activity-center');
    await expect(page.locator('button:has-text("再次练习")')).toBeVisible();
  });

  // ACS-005: 学生参加测评（不可重复）
  test('ACS-005 - 学生只能参加一次测评', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/activity-center');

    // 参加测评
    await page.click('button:has-text("开始测评")');
    // ... 完成测评 ...
    await page.click('button:has-text("提交")');

    // 验证不能再次参加
    await page.goto('/student/activity-center');
    await expect(page.locator('button:has-text("已完成")')).toBeVisible();
    await expect(page.locator('button:has-text("开始测评")')).not.toBeVisible();
  });
});
```

---

## 9. 风险与应对

### 9.1 风险识别

| 风险 | 影响 | 概率 | 应对措施 |
|-----|------|------|---------|
| 数据迁移失败 | 极高 | 低 | 完整备份、测试环境预演、准备回滚脚本 |
| 权限控制漏洞 | 高 | 中 | 完善权限测试、代码审查 |
| 现有功能中断 | 高 | 中 | 保持API向后兼容、灰度发布 |
| 性能下降 | 中 | 低 | 性能测试、数据库索引优化 |
| 用户混淆 | 中 | 高 | 用户指南、操作提示 |

### 9.2 应急预案

**场景1: 数据库迁移失败**
```bash
# 立即回滚
psql -d guiyang_oj < backup_YYYYMMDD.sql
psql -d guiyang_oj -f database/migrations/001_rollback.sql
```

**场景2: API不兼容导致前端报错**
```javascript
// 临时兼容层
router.get('/api/exams', (req, res, next) => {
  // 转发到新的activities接口
  req.url = '/api/activities';
  next();
});
```

**场景3: 权限控制过严**
```javascript
// 紧急放宽权限（临时）
if (process.env.EMERGENCY_MODE === 'true') {
  return next(); // 跳过权限检查
}
```

---

## 10. 总结

### 10.1 关键变更总结

1. **概念重构**: 考试 → 活动（测评/练习）
2. **权限分级**: 测评创建权限受限，练习权限宽松
3. **数据模型**: 新增type、ability_level等字段
4. **多次尝试**: 支持练习活动多次参与

### 10.2 预期收益

- ✅ 术语更准确，符合教育场景
- ✅ 权限控制更精细，职责更清晰
- ✅ 灵活性提升，支持多种使用场景
- ✅ 为能力认证体系奠定基础

### 10.3 后续扩展

- 🔮 自动生成证书（仅测评）
- 🔮 能力等级晋升推荐
- 🔮 个性化练习推荐
- 🔮 学习路径规划

---

**文档维护**: 本文档随重构进度持续更新
**下一步行动**:
1. [ ] 团队评审此重构方案
2. [ ] 确定迁移时间窗口
3. [ ] 在测试环境完整演练
4. [ ] 开始第一阶段：数据库迁移

---

*文档结束*
