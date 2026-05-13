# 题库权限管理系统规范文档

**版本**: 3.0
**日期**: 2026-02-20
**状态**: 设计规范

---

## 📋 目录

1. [系统概述](#系统概述)
2. [题库类型与层级](#题库类型与层级)
3. [权限管理规则](#权限管理规则)
4. [审核流程](#审核流程)
5. [管理员角色与职责](#管理员角色与职责)
6. [数据模型设计](#数据模型设计)
7. [业务流程图](#业务流程图)
8. [实施计划](#实施计划)

---

## 系统概述

贵阳市小学生测评平台的题库权限管理系统旨在实现**分级分权**的题库管理模式，确保题目质量和适用范围的合理控制。

### 核心原则

1. **分级管理**: 题库分为测评题库和练习题库，练习题库进一步分为市级、区级、校级三个层次
2. **权限下放**: 市级管理员和系统总管理员可赋予教师审核权限
3. **区域限制**: 区级管理员只能管理本区教师和题库，区级题库只对本区开放
4. **严格审核**: 测评题库题目必须经过有权限的教师审核后方可发布
5. **灵活发布**: 校级题库无需审核，教师可直接发布供本校使用

---

## 题库类型与层级

### 1. 测评题库 (Assessment Question Bank)

**用途**: 正式测评、考试、竞赛等高标准评估场景

**特点**:
- ✅ 题目质量要求高
- ✅ 必须经过审核流程
- ✅ 全市统一标准
- ✅ 发布后全市可用

**审核要求**:
- 题目创建者提交审核请求
- 必须由拥有相关科目审核权限的教师审核
- 审核权限只能由**市级管理员**或**系统总管理员**赋予
- 审核通过后方可发布到测评题库

---

### 2. 练习题库 (Practice Question Bank)

练习题库分为**三个层级**，各有不同的管理规则和可见范围。

#### 2.1 市级公开题库 (Municipal Public Question Bank)

**Scope**: `practice_municipal`

**特点**:
- 🌐 全市所有师生可见可用
- ⭐ 优质题目共享平台
- 📢 鼓励优秀教师贡献题目

**审核规则**:
- 题目创建者提交审核请求
- 必须由拥有市级审核权限的教师审核
- 审核权限只能由**市级管理员**或**系统总管理员**赋予

**可见范围**:
- ✅ 全市所有区县的师生
- ✅ 市直属学校师生
- ✅ 所有层级的管理员

---

#### 2.2 区级题库 (District Question Bank)

**Scope**: `practice_district_{district_code}`
**示例**: `practice_district_BY` (白云区), `practice_district_YY` (云岩区)

**特点**:
- 🏘️ 区内共享，区外不可见
- 📚 满足区域特色教学需求
- 🔒 保护区域教学资源

**审核规则**:
- 题目创建者提交审核请求
- 必须由拥有该区审核权限的教师审核
- 审核权限只能由**对应区级管理员**赋予
- 或由**市级管理员**、**系统总管理员**赋予

**可见范围**:
- ✅ 该区所有学校的师生
- ✅ 该区的区级管理员
- ✅ 市级管理员、系统总管理员

**权限约束**:
- ❌ 区级管理员只能为本区教师授权
- ❌ 其他区的师生无法查看和使用

---

#### 2.3 校级题库 (School Question Bank)

**Scope**: `practice_school_{school_id}`
**示例**: `practice_school_15` (某学校ID为15)

**特点**:
- 🏫 校内共享，校外不可见
- ⚡ 无需审核，快速发布
- 🎯 灵活满足校本教学

**审核规则**:
- ❌ **无需审核**
- ✅ 教师可直接发布到校级题库
- ✅ 发布后立即生效

**可见范围**:
- ✅ 本校所有师生
- ✅ 本校的校级管理员
- ✅ 所属区的区级管理员
- ✅ 市级管理员、系统总管理员

**使用限制**:
- ❌ 其他学校的师生无法查看和使用

---

## 权限管理规则

### 权限类型 (Permission Types)

系统定义三种管理权限类型（包含审核和撤回功能）：

| 权限类型 | 代码 | 说明 | 适用范围 |
|---------|------|------|---------|
| **测评题库管理权限** | `assessment_manage` | 管理测评题库题目（审核+撤回） | 全市 |
| **市级练习题库管理权限** | `practice_municipal_manage` | 管理市级公开练习题目（审核+撤回） | 全市 |
| **区级练习题库管理权限** | `practice_district_manage` | 管理区级练习题目（审核+撤回） | 特定区 |

### 授权规则

#### 1. 测评题库审核权限授权

**授权者**:
- ✅ 系统总管理员 (`system_admin`)
- ✅ 市级管理员 (`municipal_admin`)

**被授权者**:
- ✅ 全市任何教师 (`teacher`)
- ✅ 可授权多个科目

**授权范围**:
- 全市范围内所有测评题目
- 不受区域和学校限制

---

#### 2. 市级练习题库审核权限授权

**授权者**:
- ✅ 系统总管理员 (`system_admin`)
- ✅ 市级管理员 (`municipal_admin`)

**被授权者**:
- ✅ 全市任何教师
- ✅ 可授权多个科目

**授权范围**:
- 全市范围内所有提交到市级的练习题目

---

#### 3. 区级练习题库审核权限授权

**授权者**:
- ✅ 系统总管理员 (`system_admin`)
- ✅ 市级管理员 (`municipal_admin`)
- ✅ **对应区级管理员** (`district_admin`)

**被授权者**:
- ✅ **仅限本区的教师**
- ✅ 可授权多个科目

**授权范围**:
- 仅限该区提交的练习题目

**特殊规则**:
- 区级管理员授权时，**系统自动关联管理员所在区**
- 界面上只需选择**教师**和**科目**，无需选择区域
- 后台自动读取管理员的 `district_id` 并设置到权限记录中

---

### 权限数据结构

#### teacher_permissions 表结构优化

```sql
CREATE TABLE teacher_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_type VARCHAR(50) NOT NULL, -- assessment_manage, practice_municipal_manage, practice_district_manage
  subjects TEXT[] NOT NULL, -- 可审核的科目列表 ['数学', '语文']
  scope_level VARCHAR(20), -- 'municipal', 'district', 'school'
  district_id INTEGER REFERENCES districts(id), -- 区级权限时必填
  school_id INTEGER REFERENCES schools(id), -- 校级权限时必填（预留）
  granted_by INTEGER REFERENCES users(id), -- 授权人
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- 权限过期时间（可选）
  is_active BOOLEAN DEFAULT true,
  notes TEXT, -- 备注
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, permission_type, scope_level, district_id) -- 防止重复授权
);
```

**关键字段说明**:
- `scope_level`: 权限层级，决定可审核的题库范围
  - `municipal`: 市级权限（测评题库、市级练习题库）
  - `district`: 区级权限（区级练习题库）
  - `school`: 校级权限（预留，未来扩展）
- `district_id`: 区级权限时，指定对应的区
- `school_id`: 校级权限时，指定对应的学校（当前未使用）

---

## 审核流程

### 测评题库审核流程

```
[教师创建题目] (status: draft)
       ↓
[提交审核] → 选择审核人 (status: pending_review)
       ↓                   ↑ 系统检查：
       ↓                   | - 审核人是否有 assessment_manage 权限
       ↓                   | - 审核人的 subjects 是否包含该科目
       ↓                   └─ 如不满足，拒绝提交
[审核人审核]
       ↓
    ┌──┴──┐
[批准]  [拒绝]
    │      │
    │   (status: rejected)
    │   - 题目返回草稿箱
    │   - 创建者可修改后重新提交
    │
(status: approved)
    ↓
[发布到测评题库] (status: published, scope: assessment)
    ↓
[全市可用]
```

---

### 市级练习题库审核流程

```
[教师创建题目] (status: draft)
       ↓
[提交审核] → 选择市级审核人 (status: pending_review)
       ↓                     ↑ 系统检查：
       ↓                     | - 审核人是否有 practice_municipal_manage 权限
       ↓                     | - 审核人的 subjects 是否包含该科目
       ↓                     └─ 如不满足，拒绝提交
[审核人审核]
       ↓
    ┌──┴──┐
[批准]  [拒绝]
    │      │
    │   (status: rejected)
    │   - 题目返回草稿箱
    │
(status: approved)
    ↓
[发布到市级练习题库] (status: published, scope: practice_municipal)
    ↓
[全市可用]
```

---

### 区级练习题库审核流程

```
[教师创建题目] (status: draft)
       ↓
[提交审核] → 选择区级审核人 (status: pending_review)
       ↓                     ↑ 系统检查：
       ↓                     | - 审核人是否有 practice_district_manage 权限
       ↓                     | - 审核人的 district_id 是否与题目创建者同区
       ↓                     | - 审核人的 subjects 是否包含该科目
       ↓                     └─ 如不满足，拒绝提交
[审核人审核]
       ↓
    ┌──┴──┐
[批准]  [拒绝]
    │      │
    │   (status: rejected)
    │   - 题目返回草稿箱
    │
(status: approved)
    ↓
[发布到区级练习题库] (status: published, scope: practice_district_{code})
    ↓
[本区可用]
```

---

### 校级题库发布流程（无需审核）

```
[教师创建题目] (status: draft)
       ↓
[直接发布到校级题库] (status: published, scope: practice_school_{id})
       ↓
[本校可用]
```

**说明**:
- ✅ 无需提交审核
- ✅ 无需等待审批
- ✅ 教师点击"发布"后立即生效
- ✅ 系统自动关联教师所在学校ID

---

## 管理员角色与职责

### 1. 系统总管理员 (system_admin)

**权限范围**: 整个系统

**职责**:
- ✅ 管理所有层级的题库和权限
- ✅ 为任何教师授予任何层级的审核权限
- ✅ 查看和管理所有题目（包括所有区、所有学校）
- ✅ 管理市级、区级、校级管理员
- ✅ 系统配置和全局设置

**授权能力**:
- 测评题库审核权限 → 任何教师
- 市级练习题库审核权限 → 任何教师
- 区级练习题库审核权限 → 任何区的教师

---

### 2. 市级管理员 (municipal_admin)

**权限范围**: 贵阳市全市

**职责**:
- ✅ 管理全市的题库和权限
- ✅ 为任何教师授予测评和市级练习题库审核权限
- ✅ 为任何区的教师授予区级练习题库审核权限
- ✅ 查看和管理所有题目
- ✅ 管理区级和校级管理员

**授权能力**:
- 测评题库审核权限 → 任何教师
- 市级练习题库审核权限 → 任何教师
- 区级练习题库审核权限 → 任何区的教师

---

### 3. 区级管理员 (district_admin)

**权限范围**: 特定区县（如白云区、云岩区）

**职责**:
- ✅ 管理本区的题库和权限
- ✅ 为**本区教师**授予区级练习题库审核权限
- ✅ 查看和管理本区的题目
- ✅ 管理本区的校级管理员和学校

**授权能力**:
- 区级练习题库审核权限 → **仅限本区教师**

**权限约束**:
- ❌ 无法为其他区的教师授权
- ❌ 无法查看其他区的区级题库
- ❌ 无法授予测评题库审核权限
- ❌ 无法授予市级练习题库审核权限

**授权界面优化**:
- 选择教师时，**系统自动过滤仅显示本区教师**
- 选择科目后，**系统自动关联管理员所在区**
- **不显示区域选择器**，防止误操作

---

### 4. 校级管理员 (school_admin / base_school_admin / municipal_school_admin)

**权限范围**: 特定学校

**职责**:
- ✅ 查看和管理本校的题目
- ✅ 管理本校教师和学生
- ✅ 查看本校教师创建的题目统计

**权限约束**:
- ❌ 无法授予审核权限（审核权限由上级管理员授予）
- ❌ 无法查看其他学校的校级题库
- ✅ 可以查看市级和本区的题库（使用权，非管理权）

---

## 数据模型设计

### 核心表结构

#### 1. question_bank 表（题库表）

```sql
CREATE TABLE question_bank (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL, -- single, multiple, blank, essay, code
  subject VARCHAR(50) NOT NULL, -- 数学, 语文, 英语, etc.
  grade VARCHAR(20) NOT NULL, -- 一年级, 二年级, etc.
  content TEXT NOT NULL, -- 题目内容
  options JSONB, -- 选项（选择题）
  correct_answer JSONB, -- 正确答案
  score DECIMAL(5,2) DEFAULT 5.00, -- 默认分值
  suggested_score INTEGER DEFAULT 5, -- 建议分值
  level VARCHAR(10), -- L1-L9 难度等级
  difficulty VARCHAR(20), -- easy, medium, hard
  explanation TEXT, -- 题目解析
  tags TEXT[], -- 标签
  image_url VARCHAR(255), -- 图片URL

  -- 状态管理
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'published')),

  -- 题库范围（关键字段）
  scope TEXT[] DEFAULT '{}',
    -- ['assessment'] - 测评题库
    -- ['practice_municipal'] - 市级练习题库
    -- ['practice_district_BY'] - 白云区练习题库
    -- ['practice_school_15'] - 15号学校题库

  -- 审核信息
  reviewer_id INTEGER REFERENCES users(id), -- 审核人
  review_comment TEXT, -- 审核意见
  reviewed_at TIMESTAMP, -- 审核时间

  -- 发布信息
  published_at TIMESTAMP, -- 发布时间
  published_by INTEGER REFERENCES users(id), -- 发布人

  -- 创建者信息
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 逻辑删除
  is_active BOOLEAN DEFAULT true,

  -- 其他字段
  category_id INTEGER REFERENCES question_categories(id),
  abilities TEXT[], -- 能力点
  knowledge_points TEXT[], -- 知识点
  usage_count INTEGER DEFAULT 0, -- 使用次数
  success_rate DECIMAL(5,2) -- 正确率
);

-- 索引
CREATE INDEX idx_question_bank_status ON question_bank(status);
CREATE INDEX idx_question_bank_scope ON question_bank USING GIN (scope);
CREATE INDEX idx_question_bank_subject ON question_bank(subject);
CREATE INDEX idx_question_bank_grade ON question_bank(grade);
CREATE INDEX idx_question_bank_created_by ON question_bank(created_by);
CREATE INDEX idx_question_bank_reviewer_id ON question_bank(reviewer_id);
```

---

#### 2. teacher_permissions 表（教师权限表）

完整结构见前文"权限数据结构"章节。

---

#### 3. question_reviews 表（审核历史表）

```sql
CREATE TABLE question_reviews (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  reviewer_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  comment TEXT, -- 审核意见
  reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_question_reviews_question_id ON question_reviews(question_id);
CREATE INDEX idx_question_reviews_reviewer_id ON question_reviews(reviewer_id);
```

**用途**: 记录题目的完整审核历史，便于追溯和审计。

---

### 关键业务查询

#### 查询1: 获取可审核的题目列表（审核人视角）

```sql
-- 市级审核人：可审核测评和市级练习题库
SELECT qb.*
FROM question_bank qb
WHERE qb.status = 'pending_review'
  AND qb.reviewer_id = :reviewer_id
  AND qb.subject = ANY(
    SELECT unnest(subjects)
    FROM teacher_permissions
    WHERE user_id = :reviewer_id
      AND permission_type IN ('assessment_manage', 'practice_municipal_manage')
      AND is_active = true
  );

-- 区级审核人：只能审核本区的区级练习题库
SELECT qb.*
FROM question_bank qb
JOIN users u ON qb.created_by = u.id
JOIN teachers t ON u.id = t.user_id
JOIN schools s ON t.school_id = s.id
WHERE qb.status = 'pending_review'
  AND qb.reviewer_id = :reviewer_id
  AND s.district_id = (
    SELECT district_id
    FROM teacher_permissions
    WHERE user_id = :reviewer_id
      AND permission_type = 'practice_district_manage'
      AND is_active = true
    LIMIT 1
  )
  AND qb.subject = ANY(
    SELECT unnest(subjects)
    FROM teacher_permissions
    WHERE user_id = :reviewer_id
      AND permission_type = 'practice_district_manage'
      AND is_active = true
  );
```

---

#### 查询2: 获取可用题库列表（教师视角）

```sql
-- 教师查看可用的题库题目
SELECT qb.*
FROM question_bank qb
WHERE qb.status = 'published'
  AND qb.is_active = true
  AND (
    -- 测评题库（全市可见）
    qb.scope @> ARRAY['assessment']

    OR

    -- 市级练习题库（全市可见）
    qb.scope @> ARRAY['practice_municipal']

    OR

    -- 区级练习题库（本区可见）
    qb.scope && ARRAY['practice_district_' || :user_district_code]

    OR

    -- 校级题库（本校可见）
    qb.scope && ARRAY['practice_school_' || :user_school_id::text]
  );
```

---

#### 查询3: 获取可授权的教师列表（区级管理员视角）

```sql
-- 区级管理员授权时，只能选择本区的教师
SELECT u.id, u.username, u.real_name, t.subjects
FROM users u
JOIN teachers t ON u.id = t.user_id
JOIN schools s ON t.school_id = s.id
WHERE u.role = 'teacher'
  AND u.status = 'active'
  AND s.district_id = :admin_district_id -- 管理员所在区
ORDER BY u.real_name;
```

---

## 业务流程图

### 题目发布决策树

```
教师创建题目
    ↓
目标题库类型？
    ├─ 测评题库 (Assessment)
    │      ↓
    │  必须审核 → 提交给有 assessment_manage 权限的审核人
    │      ↓
    │  [审核流程]
    │      ↓
    │  发布到测评题库 (scope: assessment)
    │      ↓
    │  全市可用
    │
    ├─ 市级练习题库 (Practice Municipal)
    │      ↓
    │  必须审核 → 提交给有 practice_municipal_manage 权限的审核人
    │      ↓
    │  [审核流程]
    │      ↓
    │  发布到市级练习题库 (scope: practice_municipal)
    │      ↓
    │  全市可用
    │
    ├─ 区级练习题库 (Practice District)
    │      ↓
    │  必须审核 → 提交给本区有 practice_district_manage 权限的审核人
    │      ↓
    │  [审核流程]
    │      ↓
    │  发布到区级练习题库 (scope: practice_district_{code})
    │      ↓
    │  本区可用
    │
    └─ 校级练习题库 (Practice School)
           ↓
       无需审核 → 教师直接发布
           ↓
       发布到校级题库 (scope: practice_school_{id})
           ↓
       本校可用
```

---

### 权限授予流程

```
管理员授予审核权限
    ↓
管理员类型？
    ├─ 系统总管理员 / 市级管理员
    │      ↓
    │  可授予的权限类型：
    │    ├─ 测评题库审核权限 (assessment_manage)
    │    ├─ 市级练习题库审核权限 (practice_municipal_manage)
    │    └─ 区级练习题库审核权限 (practice_district_manage)
    │      ↓
    │  可选择的教师范围：全市任何教师
    │      ↓
    │  选择教师 + 选择科目
    │      ↓
    │  如果是区级权限，还需选择目标区
    │      ↓
    │  授予权限
    │
    └─ 区级管理员
           ↓
       可授予的权限类型：
         └─ 区级练习题库审核权限 (practice_district_manage)
           ↓
       可选择的教师范围：**仅限本区教师**（系统自动过滤）
           ↓
       选择教师 + 选择科目（**无需选择区域，系统自动关联**）
           ↓
       后台自动设置：
         - scope_level = 'district'
         - district_id = 管理员所在区ID
           ↓
       授予权限
```

---

## 实施计划

### Phase 1: 数据库架构优化 (1-2天)

#### 任务清单

- [ ] **1.1 修改 question_bank 表**
  - 扩展 `scope` 字段支持新的格式
  - 添加注释说明
  - 创建必要的索引

- [ ] **1.2 修改 teacher_permissions 表**
  - 添加 `scope_level` 字段
  - 添加 `district_id` 字段
  - 添加 `school_id` 字段（预留）
  - 更新唯一约束
  - 创建必要的索引

- [ ] **1.3 创建数据迁移脚本**
  - 编写 `010_question_bank_permission_enhancement.sql`
  - 迁移现有数据到新结构
  - 验证数据完整性

- [ ] **1.4 更新权限类型**
  - 将 `question_bank_review` 拆分为：
    - `assessment_manage`
    - `practice_municipal_manage`
    - `practice_district_manage`

**输出**:
- ✅ 数据库迁移脚本
- ✅ 数据验证报告
- ✅ 回滚脚本（备用）

---

### Phase 2: 后端 API 开发 (2-3天)

#### 任务清单

- [ ] **2.1 更新 QuestionBank Model**
  - 修改 `submitForReview()` 方法支持新的 scope
  - 添加 `publishToScope()` 方法
  - 添加 scope 相关的查询方法

- [ ] **2.2 更新 TeacherPermission Model**
  - 添加 `grantDistrictPermission()` 方法
  - 添加 `getReviewersForScope()` 方法
  - 添加 `canReviewQuestion()` 验证方法

- [ ] **2.3 更新权限路由 (permissions.js)**
  - 修改 `/grant` 端点支持新字段
  - 添加区域自动关联逻辑
  - 添加教师过滤逻辑（区级管理员）

- [ ] **2.4 更新题目审核路由 (questionReview.js)**
  - 修改提交审核逻辑
  - 添加审核人权限验证
  - 支持按 scope 发布题目

- [ ] **2.5 更新题库查询路由 (questionBank.js)**
  - 添加按 scope 过滤的查询方法
  - 实现区级/校级可见性控制
  - 优化查询性能

- [ ] **2.6 添加辅助 API**
  - GET `/api/permissions/available-reviewers` - 获取可选审核人列表
  - GET `/api/permissions/my-scope` - 获取当前用户的管理范围
  - GET `/api/question-bank/scopes` - 获取用户可发布的题库范围

**输出**:
- ✅ 更新的 API 端点
- ✅ API 单元测试
- ✅ API 文档更新

---

### Phase 3: 前端开发 (3-4天)

#### 任务清单

- [ ] **3.1 权限管理页面优化**
  - 修改 `PermissionManagement.tsx`
  - 添加权限类型选择器（三选一）
  - 区级管理员界面：
    - 隐藏区域选择器
    - 教师列表自动过滤本区教师
    - 自动显示管理员所在区（只读）
  - 市级管理员界面：
    - 显示所有教师
    - 区级权限时显示区域选择器

- [ ] **3.2 题目创建/编辑页面**
  - 修改 `QuestionFormPage.tsx`
  - 添加目标题库类型选择器
    - 测评题库
    - 市级练习题库
    - 区级练习题库
    - 校级练习题库
  - 根据选择显示不同的发布流程提示

- [ ] **3.3 题目提交审核页面**
  - 创建 `QuestionReviewSubmit.tsx`
  - 动态加载可选审核人列表
  - 显示审核人的科目权限
  - 添加审核说明输入框

- [ ] **3.4 审核人工作台**
  - 创建 `QuestionReviewWorkbench.tsx`
  - 显示待审核题目列表
  - 按科目和题库类型筛选
  - 批量审核功能

- [ ] **3.5 题库浏览页面优化**
  - 修改 `QuestionBankPage.tsx`
  - 添加 scope 筛选器：
    - 测评题库
    - 市级练习题库
    - 区级练习题库（如有权限）
    - 校级题库（本校）
  - 显示题库来源标签

**输出**:
- ✅ 优化的前端页面
- ✅ 用户操作指南

---

### Phase 4: 测试与验证 (2-3天)

#### 任务清单

- [ ] **4.1 单元测试**
  - 后端 Model 测试
  - 权限验证逻辑测试
  - Scope 查询测试

- [ ] **4.2 集成测试**
  - 完整审核流程测试
  - 权限授予流程测试
  - 多角色协作测试

- [ ] **4.3 E2E 测试**
  - 创建 Playwright 测试脚本
  - 测试用例：
    - QBPM001: 市级管理员授予测评审核权限
    - QBPM002: 区级管理员授予区级审核权限（仅本区教师）
    - QBPM003: 教师提交测评题目审核
    - QBPM004: 审核人审核通过/拒绝题目
    - QBPM005: 教师直接发布校级题目
    - QBPM006: 学生查看不同层级题库

- [ ] **4.4 手动测试**
  - 不同角色登录测试
  - 边界条件测试
  - 性能测试（大量题目查询）

**输出**:
- ✅ 测试报告
- ✅ Bug 修复记录

---

### Phase 5: 文档与部署 (1天)

#### 任务清单

- [ ] **5.1 更新文档**
  - 更新 API_Document.md
  - 更新 DEVELOPMENT_STATUS.md
  - 创建用户操作手册

- [ ] **5.2 数据迁移**
  - 在测试环境执行迁移脚本
  - 验证数据完整性
  - 在生产环境执行迁移

- [ ] **5.3 部署**
  - 重新构建 Docker 镜像
  - 部署到生产环境
  - 监控系统运行状态

- [ ] **5.4 培训**
  - 管理员培训（权限授予）
  - 教师培训（题目创建和审核）

**输出**:
- ✅ 生产环境上线
- ✅ 用户培训材料

---

## 题目撤回功能

### 撤回说明

已发布的题目可以被撤回（状态从 `published` 变为 `inactive`），撤回后题目不再出现在题库浏览列表中，但不影响已组卷的活动和已提交的答案。

### 撤回权限规则

以下角色可以撤回已发布的题目：

1. **题目发布者本人** - 可以撤回自己发布的题目
2. **系统管理员 / 市级管理员** - 可以撤回任何题目
3. **区级管理员** - 可以撤回本区范围内的题目
4. **拥有对应范围管理权限的教师** - 可以撤回对应范围的题目

### 撤回流程

```
[已发布题目] (status: published)
       ↓
[点击撤回] → 填写撤回原因（必填）
       ↓
[权限检查]
       ↓
    ┌──┴──┐
[有权限]  [无权限]
    │      │
    │   返回403错误
    │
(status: inactive)
    ↓
[题目从浏览列表中消失]
[已组卷活动不受影响]
```

### 撤回数据字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `withdrawn_by` | INTEGER | 撤回操作人ID |
| `withdrawn_at` | TIMESTAMP | 撤回时间 |
| `withdraw_reason` | TEXT | 撤回原因 |

### 撤回API

**POST** `/api/question-bank/bank/:id/withdraw`

**请求体**:
```json
{
  "reason": "撤回原因说明"
}
```

---

## 总结

### 核心改进点

1. ✅ **题库分级管理**: 练习题库分为市级、区级、校级三个层次
2. ✅ **权限精细化控制**: 不同层级的管理员和管理人有明确的权限边界
3. ✅ **区域自动关联**: 区级管理员授权时自动关联所在区，避免误操作
4. ✅ **灵活的审核流程**: 校级题库无需审核，快速发布；测评和高级练习题库严格审核
5. ✅ **清晰的可见性规则**: 每个层级的题库都有明确的可见范围
6. ✅ **题目撤回机制**: 支持发布者和管理员撤回已发布题目，撤回不影响已组卷活动

### 预期收益

- 📈 **提高题目质量**: 严格的审核流程确保测评题库的高质量
- 🔒 **保护教学资源**: 区级和校级题库保护本区域的教学成果
- ⚡ **提升使用效率**: 校级题库快速发布，满足日常教学需求
- 🎯 **明确权责边界**: 不同层级管理员职责清晰，避免权限混乱
- 🌐 **促进资源共享**: 市级题库实现优质资源全市共享

---

**📅 文档最后更新**: 2026-02-20
**👤 文档维护人**: 开发团队
**📧 联系方式**: 如有疑问请联系系统管理员
