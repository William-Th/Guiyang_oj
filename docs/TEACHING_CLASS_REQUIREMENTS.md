# 教学班管理系统需求文档

## 1. 功能概述

### 1.1 背景

教学班是一种虚拟班级概念，允许教师跨越物理班级界限组织学生进行学习和测评活动。教学班可以在不同的行政级别（学校、区县、市级）创建，并需要相应级别管理员的审批。

### 1.2 系统定位

教学班管理系统是成长学习资源系统的重要组成部分，为教师提供灵活的学生组织管理方式，支持：
- **跨班级教学**: 同一学校不同班级的学生可以组成教学班
- **跨校协作**: 同一区县不同学校的学生可以组成区级教学班
- **市级项目**: 全市范围内的学生可以组成市级教学班

### 1.3 核心价值

- **灵活组织**: 打破传统物理班级界限
- **分级管理**: 权责明确的审批流程
- **高效协作**: 支持跨校、跨区域教学活动
- **数据统计**: 以教学班为单位进行成绩分析

## 2. 教学班分类体系

### 2.1 按创建范围分类

| 教学班类型 | 范围代码 | 说明 | 创建者 | 审批者 |
|-----------|---------|------|--------|--------|
| 校级教学班 | school | 仅限本校学生 | 本校教师 | 校级管理员 |
| 区级教学班 | district | 同一区县内多校学生 | 区级以上管理员授权的教师 | 区级管理员 |
| 市级教学班 | municipal | 全市范围学生 | 市级管理员授权的教师 | 市级管理员 |

### 2.2 教学班状态

| 状态 | 状态码 | 说明 |
|------|--------|------|
| 草稿 | draft | 刚创建，可编辑 |
| 待审批 | pending | 已提交审批，等待管理员处理 |
| 已批准 | approved | 审批通过，可正常使用 |
| 已拒绝 | rejected | 审批被拒绝，需修改后重新提交 |
| 已归档 | archived | 不再使用，保留历史记录 |

## 3. 功能模块设计

### 3.1 教学班创建模块

#### 3.1.1 基本信息填写
- **班级名称**: 必填，2-50字符
- **班级描述**: 可选，最多500字符
- **创建范围**: 必选，school/district/municipal
- **所属学科**: 可选，用于分类
- **学年学期**: 必选，如"2025-2026学年第一学期"

#### 3.1.2 范围选择规则
- **校级班级**: 创建者只能选择自己所属学校
- **区级班级**: 需要选择区县，创建者需有区级权限
- **市级班级**: 需要市级权限才能创建

#### 3.1.3 创建流程
```
┌──────────────┐
│ 1. 填写信息  │
└──────┬───────┘
       ↓
┌──────────────┐
│ 2. 选择范围  │
└──────┬───────┘
       ↓
┌──────────────┐
│ 3. 保存草稿  │ → 可继续编辑
└──────┬───────┘
       ↓
┌──────────────┐
│ 4. 提交审批  │ → 进入审批流程
└──────────────┘
```

### 3.2 审批管理模块

#### 3.2.1 审批权限矩阵

| 创建范围 | 初审权限 | 超时流转 | 最终审批 |
|---------|---------|---------|---------|
| 校级(school) | 校级管理员 | 7天后→区级 | 区级管理员 |
| 区级(district) | 区级管理员 | 7天后→市级 | 市级管理员 |
| 市级(municipal) | 市级管理员 | 无 | 市级管理员 |

#### 3.2.2 审批操作
- **批准**: 教学班状态变为approved，可正常使用
- **拒绝**: 需填写拒绝原因，状态变为rejected
- **退回修改**: 退回给创建者修改后重新提交

#### 3.2.3 超时流转机制
- 系统每小时检查待审批申请
- 超过7天未处理的申请自动升级到上级管理员
- 流转时记录超时日志

### 3.3 学生管理模块

#### 3.3.1 添加学生方式
1. **手动添加**: 搜索学生并逐个添加
2. **批量导入**: 通过Excel模板批量导入
3. **从班级导入**: 选择物理班级批量导入学生

#### 3.3.2 学生范围限制
- **校级班级**: 只能添加本校学生
- **区级班级**: 只能添加本区县学校的学生
- **市级班级**: 可添加全市学生

#### 3.3.3 学生管理操作
- 添加学生
- 移除学生
- 查看学生列表
- 导出学生名单

### 3.4 教学活动管理模块

#### 3.4.1 关联活动
- 教学班可关联练习活动(practice)
- 区级以上教学班可关联测评活动(assessment)

#### 3.4.2 活动统计
- 班级整体完成率
- 班级平均分
- 学生成绩排名
- 知识点掌握分析

### 3.5 数据统计模块

#### 3.5.1 班级概览
- 学生总数
- 活动完成情况
- 平均成绩趋势

#### 3.5.2 对比分析
- 校级班级可与本校其他班级对比
- 区级班级可与区内其他班级对比
- 市级班级可查看全市排名

## 4. 数据库设计

### 4.1 教学班表 (teaching_classes)

```sql
CREATE TABLE teaching_classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,                    -- 班级名称
    description TEXT,                              -- 班级描述
    scope VARCHAR(20) NOT NULL,                    -- 范围: school/district/municipal
    school_id INTEGER REFERENCES schools(id),      -- 所属学校(校级班级)
    district_code VARCHAR(10),                     -- 所属区县(区级班级)
    subject VARCHAR(50),                           -- 所属学科
    academic_year VARCHAR(20) NOT NULL,            -- 学年学期
    status VARCHAR(20) NOT NULL DEFAULT 'draft',   -- 状态
    created_by INTEGER NOT NULL REFERENCES users(id), -- 创建者
    approved_by INTEGER REFERENCES users(id),      -- 审批者
    approved_at TIMESTAMP,                         -- 审批时间
    rejection_reason TEXT,                         -- 拒绝原因
    submitted_at TIMESTAMP,                        -- 提交审批时间
    current_reviewer_level VARCHAR(20),            -- 当前审核级别
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_scope CHECK (scope IN ('school', 'district', 'municipal')),
    CONSTRAINT valid_status CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'archived'))
);

-- 索引
CREATE INDEX idx_teaching_classes_scope ON teaching_classes(scope);
CREATE INDEX idx_teaching_classes_status ON teaching_classes(status);
CREATE INDEX idx_teaching_classes_school ON teaching_classes(school_id);
CREATE INDEX idx_teaching_classes_district ON teaching_classes(district_code);
CREATE INDEX idx_teaching_classes_created_by ON teaching_classes(created_by);
```

### 4.2 教学班成员表 (teaching_class_members)

```sql
CREATE TABLE teaching_class_members (
    id SERIAL PRIMARY KEY,
    teaching_class_id INTEGER NOT NULL REFERENCES teaching_classes(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    removed_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE(teaching_class_id, student_id)
);

-- 索引
CREATE INDEX idx_tcm_class ON teaching_class_members(teaching_class_id);
CREATE INDEX idx_tcm_student ON teaching_class_members(student_id);
CREATE INDEX idx_tcm_active ON teaching_class_members(is_active);
```

### 4.3 教学班教师表 (teaching_class_teachers)

```sql
CREATE TABLE teaching_class_teachers (
    id SERIAL PRIMARY KEY,
    teaching_class_id INTEGER NOT NULL REFERENCES teaching_classes(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id),
    role VARCHAR(20) NOT NULL DEFAULT 'teacher', -- creator/teacher/assistant
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE(teaching_class_id, teacher_id)
);
```

### 4.4 教学班审批记录表 (teaching_class_approvals)

```sql
CREATE TABLE teaching_class_approvals (
    id SERIAL PRIMARY KEY,
    teaching_class_id INTEGER NOT NULL REFERENCES teaching_classes(id),
    reviewer_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(20) NOT NULL,                   -- approve/reject/escalate
    comment TEXT,
    reviewer_level VARCHAR(20) NOT NULL,           -- school/district/municipal
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_tca_class ON teaching_class_approvals(teaching_class_id);
```

### 4.5 教学班活动关联表 (teaching_class_activities)

```sql
CREATE TABLE teaching_class_activities (
    id SERIAL PRIMARY KEY,
    teaching_class_id INTEGER NOT NULL REFERENCES teaching_classes(id) ON DELETE CASCADE,
    activity_id INTEGER NOT NULL REFERENCES activities(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER NOT NULL REFERENCES users(id),

    UNIQUE(teaching_class_id, activity_id)
);
```

## 5. API设计

### 5.1 教学班管理API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/teaching-classes | 创建教学班 | 教师+ |
| GET | /api/teaching-classes | 获取教学班列表 | 教师+ |
| GET | /api/teaching-classes/:id | 获取教学班详情 | 教师+ |
| PUT | /api/teaching-classes/:id | 更新教学班 | 创建者(draft状态) |
| DELETE | /api/teaching-classes/:id | 删除教学班 | 创建者(draft状态) |
| POST | /api/teaching-classes/:id/submit | 提交审批 | 创建者 |

### 5.2 审批管理API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/teaching-classes/pending | 获取待审批列表 | 管理员 |
| POST | /api/teaching-classes/:id/approve | 批准 | 对应级别管理员 |
| POST | /api/teaching-classes/:id/reject | 拒绝 | 对应级别管理员 |

### 5.3 学生管理API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/teaching-classes/:id/students | 获取学生列表 | 班级教师+ |
| POST | /api/teaching-classes/:id/students | 添加学生 | 班级教师 |
| POST | /api/teaching-classes/:id/students/batch | 批量添加学生 | 班级教师 |
| DELETE | /api/teaching-classes/:id/students/:studentId | 移除学生 | 班级教师 |

### 5.4 活动管理API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/teaching-classes/:id/activities | 获取关联活动 | 班级教师+ |
| POST | /api/teaching-classes/:id/activities | 关联活动 | 班级教师 |
| DELETE | /api/teaching-classes/:id/activities/:activityId | 取消关联 | 班级教师 |
| GET | /api/teaching-classes/:id/statistics | 班级统计数据 | 班级教师+ |

## 6. 前端页面设计

### 6.1 页面列表

| 页面 | 路径 | 角色 | 说明 |
|------|------|------|------|
| 教学班列表 | /teacher/teaching-classes | 教师 | 查看和管理教学班 |
| 创建教学班 | /teacher/teaching-classes/create | 教师 | 创建新教学班 |
| 教学班详情 | /teacher/teaching-classes/:id | 教师 | 班级详情和管理 |
| 学生管理 | /teacher/teaching-classes/:id/students | 教师 | 管理班级学生 |
| 审批管理 | /admin/teaching-class-approvals | 管理员 | 审批教学班申请 |

### 6.2 教师端界面

#### 6.2.1 教学班列表页
- 筛选器：状态、范围、学科
- 列表字段：名称、范围、学生数、状态、创建时间
- 操作：查看、编辑(草稿)、提交审批、删除(草稿)

#### 6.2.2 创建/编辑页
- 基本信息表单
- 范围选择器（根据权限显示可选范围）
- 学年学期选择

#### 6.2.3 教学班详情页
- 基本信息展示
- 学生列表Tab
- 活动列表Tab
- 统计数据Tab

### 6.3 管理员端界面

#### 6.3.1 审批列表页
- 筛选器：范围、状态
- 列表字段：名称、创建者、范围、提交时间、待审天数
- 操作：批准、拒绝、查看详情

## 7. 权限控制

### 7.1 创建权限

| 用户角色 | 校级班级 | 区级班级 | 市级班级 |
|---------|---------|---------|---------|
| 普通教师 | ✅ | ❌ | ❌ |
| 校级管理员 | ✅ | ❌ | ❌ |
| 区级管理员 | ✅ | ✅ | ❌ |
| 市级管理员 | ✅ | ✅ | ✅ |

### 7.2 审批权限

| 用户角色 | 校级班级 | 区级班级 | 市级班级 |
|---------|---------|---------|---------|
| 校级管理员 | ✅ | ❌ | ❌ |
| 区级管理员 | ✅(流转后) | ✅ | ❌ |
| 市级管理员 | ✅(流转后) | ✅(流转后) | ✅ |

### 7.3 特殊权限

- **teaching_class_district_create**: 允许普通教师创建区级教学班
- **teaching_class_municipal_create**: 允许教师创建市级教学班

## 8. 开发计划

### 8.1 第一阶段：数据库与基础API（预计3天）

1. 数据库迁移脚本
2. 教学班CRUD API
3. 基础权限控制

### 8.2 第二阶段：审批流程（预计2天）

1. 审批API
2. 超时流转服务
3. 审批记录

### 8.3 第三阶段：学生管理（预计2天）

1. 学生管理API
2. 批量导入功能
3. 范围限制校验

### 8.4 第四阶段：前端页面（预计3天）

1. 教师端页面
2. 管理员审批页面
3. 表单验证

### 8.5 第五阶段：测试与优化（预计2天）

1. API测试
2. E2E测试
3. 性能优化

**总预计工期：12天**

## 9. 测试计划

### 9.1 API测试用例

| 测试ID | 测试场景 | 预期结果 |
|--------|---------|---------|
| TC001 | 教师创建校级教学班 | 成功创建草稿状态班级 |
| TC002 | 教师尝试创建区级教学班（无权限） | 返回403错误 |
| TC003 | 提交审批后状态变更 | 状态变为pending |
| TC004 | 校级管理员批准校级班级 | 状态变为approved |
| TC005 | 超时7天自动流转 | 流转到上级管理员 |
| TC006 | 添加范围外学生 | 返回400错误 |

### 9.2 E2E测试用例

| 测试ID | 测试场景 | 测试步骤 |
|--------|---------|---------|
| TCE001 | 完整创建审批流程 | 教师创建→提交→管理员批准 |
| TCE002 | 学生管理流程 | 添加学生→查看列表→移除学生 |
| TCE003 | 审批拒绝流程 | 提交→拒绝→修改→重新提交 |

---

*文档版本：v1.0*
*创建日期：2025-11-26*
*状态：待开发*
