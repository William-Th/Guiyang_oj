# 功能开发状态追踪

本文档记录所有功能模块的开发进度和测试状态。

## 图例说明

| 状态 | 说明 |
|------|------|
| ✅ | 已完成并通过测试 |
| 🚧 | 进行中 |
| ⏸️ | 已暂停 |
| ❌ | 未开始 |
| 🐛 | 存在已知问题 |

## 核心功能模块

### 1. 用户认证与授权

| 功能 | 数据库 | 后端API | API测试 | 前端 | E2E测试 | 备注 |
|------|--------|---------|---------|------|---------|------|
| 学生登录（身份证） | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 教师登录（用户名） | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 管理员登录 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| JWT令牌刷新 | ✅ | ✅ | ✅ | ✅ | ❌ | 前端已实现，缺E2E测试 |
| 登出 | ✅ | ✅ | ✅ | ✅ | ❌ | 前端已实现，缺E2E测试 |
| 密码修改 | ✅ | ✅ | ❌ | ✅ | ❌ | 缺少API测试和E2E测试 |

### 2. 考试管理

| 功能 | 数据库 | 后端API | API测试 | 前端 | E2E测试 | 备注 |
|------|--------|---------|---------|------|---------|------|
| 考试列表查询 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 考试详情查看 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 创建考试 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 编辑考试 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 删除考试 | ✅ | ✅ | ✅ | ✅ | ❌ | 缺少E2E测试 |
| 发布/取消发布 | ✅ | ✅ | ✅ | ✅ | ❌ | 缺少E2E测试 |
| 考试报名 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 开始考试 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 提交答案 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 自动计时 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |

### 3. 题库管理

| 功能 | 数据库 | 后端API | API测试 | 前端 | E2E测试 | 备注 |
|------|--------|---------|---------|------|---------|------|
| 题目列表查询 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 题目详情查看 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 新建题目 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 编辑题目 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成（R402测试通过） |
| 删除题目 | ✅ | ✅ | ✅ | ✅ | ❌ | 缺少E2E测试 |
| 题目搜索 | ✅ | ✅ | ✅ | ✅ | ❌ | 缺少E2E测试 |
| 题目筛选 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 题目编码（唯一标识） | ✅ | ✅ | ✅ | ✅ | ✅ | 完成（R402测试通过，自动生成唯一编码） |
| 题目导入 | ✅ | ✅ | ❌ | ✅ | ❌ | 缺少测试 |
| 题目导出 | ❌ | ❌ | ❌ | ❌ | ❌ | 未实现 |

### 4. 题库草稿与审核系统

| 功能 | 数据库 | 后端API | API测试 | 前端 | E2E测试 | 备注 |
|------|--------|---------|---------|------|---------|------|
| 创建草稿 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成（R401测试通过） |
| 编辑草稿 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成（R402测试通过） |
| 查看草稿列表 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 提交审核 | ✅ | ✅ | ❌ | ✅ | ❌ | 缺少测试（R403） |
| 审核题目 | ✅ | ✅ | ❌ | ✅ | ❌ | 缺少测试（R404） |
| 发布题目 | ✅ | ✅ | ❌ | ✅ | ❌ | 缺少测试（R405） |
| 驳回题目 | ✅ | ✅ | ❌ | ✅ | ❌ | 缺少测试（R406） |

### 5. 成绩管理

| 功能 | 数据库 | 后端API | API测试 | 前端 | E2E测试 | 备注 |
|------|--------|---------|---------|------|---------|------|
| 学生成绩查询 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 成绩详情查看 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 成绩统计 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 成绩导出 | ✅ | ✅ | ❌ | ✅ | ❌ | 缺少测试 |
| 证书生成 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 证书下载 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |
| 证书验证 | ✅ | ✅ | ✅ | ✅ | ✅ | 完成 |

### 6. 用户管理

| 功能 | 数据库 | 后端API | API测试 | 前端 | E2E测试 | 备注 |
|------|--------|---------|---------|------|---------|------|
| 学生列表查询 | ✅ | ✅ | ✅ | ✅ | ❌ | 缺少E2E测试 |
| 学生详情查看 | ✅ | ✅ | ✅ | ✅ | ❌ | 缺少E2E测试 |
| 学生信息编辑 | ✅ | ✅ | ✅ | ✅ | ❌ | 缺少E2E测试 |
| 学生批量导入 | ✅ | ✅ | ❌ | ✅ | ❌ | 缺少测试 |
| 教师管理 | ✅ | ✅ | ✅ | ✅ | ❌ | 缺少E2E测试 |
| 权限管理 | ✅ | ✅ | ✅ | ✅ | ❌ | API测试完成(32个测试),缺E2E测试 |

### 7. Activity 活动系统（测评/练习）

**新增功能**: 活动系统是对原有考试系统的扩展，支持两种类型的活动：
- **Practice (练习)**: 可由教师和管理员创建，供学生练习使用
- **Assessment (测评)**: 仅高级管理员可创建，用于正式评估，可颁发证书

| 功能 | 数据库 | 后端API | API测试 | 前端 | E2E测试 | 备注 |
|------|--------|---------|---------|------|---------|------|
| 数据库迁移 | ✅ | N/A | N/A | N/A | N/A | activities表及相关字段迁移完成 |
| Practice活动创建 | ✅ | ✅ | ✅ | ✅ | ✅ | 完整流程已实现并测试 (API: 87.5%, E2E: 已创建) |
| Assessment活动创建 | ✅ | ✅ | ✅ | ✅ | ✅ | 完整流程已实现并测试 (仅高级管理员, ACT130已修复) |
| 活动列表查询 | ✅ | ✅ | ✅ | ✅ | ✅ | 支持类型、能力等级、范围筛选 |
| 活动详情查看 | ✅ | ✅ | ✅ | ✅ | ✅ | 包含基本信息、参与者、统计数据 |
| 活动编辑 | ✅ | ✅ | ✅ | ✅ | ✅ | 仅草稿状态可编辑 |
| 活动发布/取消发布 | ✅ | ✅ | ✅ | ✅ | ✅ | 状态管理完整 |
| 活动删除 | ✅ | ✅ | ✅ | ✅ | ✅ | 仅草稿状态可删除 |
| 活动权限控制 | ✅ | ✅ | ✅ | ✅ | ✅ | Practice/Assessment权限验证通过,活动权限边界测试完成(13个测试) |
| 能力等级管理 | ✅ | ✅ | ✅ | ✅ | ✅ | L1-L7等级系统，验证通过 |
| 活动筛选功能 | ✅ | ✅ | ✅ | ✅ | ✅ | 支持类型、科目、等级、状态筛选 |
| 学生注册活动 | ✅ | ✅ | ⏸️ | ❌ | ❌ | API已实现，前端和E2E测试待添加 |
| 学生开始活动 | ✅ | ✅ | ⏸️ | ❌ | ❌ | API已实现，前端和E2E测试待添加 |
| 活动提交 | ✅ | ✅ | ❌ | ❌ | ❌ | 后端已实现，测试待添加 |
| 重做机制 | ✅ | ✅ | ❌ | ✅ | ❌ | 后端和前端已实现，测试待添加 |
| 官方证书配置 | ✅ | ✅ | ❌ | ✅ | ❌ | 后端和前端已实现，测试待添加 |

**开发状态**: ✅ **已完成** | API测试87.5%通过 | E2E测试19个（冒烟6+回归13）

---

### 7.1 活动管理功能细化 (NEW - 2025-10-23)

**背景**: 现有活动管理系统支持测评(assessment)和练习(practice)两种类型，但学生、教师、管理员使用相同的界面，用户体验不够清晰。

**目标**:
- 学生端：测评中心（只看测评）+ 练习中心（只看练习）
- 教师端：练习管理（只能创建和管理练习）
- 管理员端：测评管理（可以创建和管理测评）

| 功能 | 数据库 | 后端API | API测试 | 前端 | E2E测试 | 备注 |
|------|--------|---------|---------|------|---------|------|
| 学生端-测评中心：查看测评列表 | ✅ | ✅ | ❌ | 🐛 | ❌ | API已实现`/api/student/activities/assessment`，前端字段映射已修复(2025-10-31) |
| 学生端-测评中心：筛选测评（科目/年级/等级） | ✅ | ✅ | ❌ | ✅ | ❌ | 前端3个筛选器已实现，API支持参数 |
| 学生端-测评中心：查看测评详情 | ✅ | ✅ | ❌ | 🚧 | ❌ | API已实现，前端详情页待完善 |
| 学生端-测评中心：检查参加资格 | ✅ | ✅ | ❌ | 🚧 | ❌ | API已有基础逻辑，需前端集成 |
| 学生端-测评中心：开始测评 | ✅ | ✅ | ❌ | 🚧 | ❌ | 后端API已实现，前端跳转待完善 |
| 学生端-测评中心：查看成绩和证书 | ✅ | ✅ | ❌ | 🚧 | ❌ | 复用现有成绩模块，待集成 |
| 学生端-练习中心：查看练习列表 | ✅ | ✅ | ❌ | 🐛 | 🚧 | API已实现`/api/student/activities/practice`，前端字段映射已修复(2025-10-31)，STU202测试通过 |
| 学生端-练习中心：筛选练习 | ✅ | ✅ | ❌ | ✅ | ❌ | 前端3个筛选器已实现（科目/年级/能力等级） |
| 学生端-练习中心：开始练习 | ✅ | ✅ | ❌ | ✅ | 🐛 | 后端和前端已实现，但测试活动缺题目配置(STU203-205失败) |
| 学生端-练习中心：重做练习（如允许） | ✅ | ✅ | ❌ | ✅ | ❌ | 后端已实现，前端集成完成 |
| 教师端-练习管理：只显示练习类型 | ✅ | ❌ | ❌ | ❌ | ❌ | 修改 ActivityListPage |
| 教师端-练习管理：创建练习（禁止创建测评） | ✅ | ❌ | ❌ | ❌ | ❌ | 修改 ActivityFormPage |
| 教师端-练习管理：只看自己的练习 | ✅ | ❌ | ❌ | ❌ | ❌ | 后端API筛选 |
| 教师端-练习管理：编辑/删除练习 | ✅ | ✅ | ❌ | ✅ | ❌ | 已有功能，需测试 |
| 管理员端-测评管理：查看所有测评 | ✅ | ❌ | ❌ | ❌ | ❌ | 需新建API `/api/activities/admin/assessments` |
| 管理员端-测评管理：创建测评 | ✅ | ❌ | ❌ | ❌ | ❌ | 需新建API `/api/activities/admin/assessment` |
| 管理员端-测评管理：配置证书模板 | ✅ | ✅ | ❌ | ❌ | ❌ | 后端已有，需前端 |
| 管理员端-测评管理：设置目标受众 | ✅ | ✅ | ❌ | ❌ | ❌ | 后端已有，需前端 |
| 管理员端-测评管理：管理测评范围 | ✅ | ✅ | ❌ | ❌ | ❌ | 后端已有，需前端 |

**状态**: ⏸️ **已暂停** | 预计工期1-1.5周 | 参考文档: `documents/activity-refinement-plan.md`

---

### 7.2 练习活动时间限制优化 (NEW - 2025-10-25)

**背景**: 现有练习活动的时间控制模式单一，无法满足不同教学场景的需求。需要将时间限制细分为三种类型。

**设计文档**: `documents/PRACTICE_TIME_LIMIT_DESIGN.md`

**目标**:
将练习活动的时间限制从单一模式扩展为三种明确类型：
1. **无时间限制** (unlimited): 学生可以随时开始，随时提交，不受时间约束
2. **固定时间段** (scheduled): 学生只能在指定时间段内参加，到时自动提交
3. **限时作答** (timed): 从学生开始作答时计时，累计到固定时长后自动提交

| 功能 | 数据库 | 后端API | API测试 | 前端 | E2E测试 | 备注 |
|------|--------|---------|---------|------|---------|------|
| **数据库设计** |  |  |  |  |  |  |
| 添加 time_limit_type 字段 | ❌ | N/A | N/A | N/A | N/A | 枚举: unlimited/scheduled/timed |
| 添加数据库约束 | ❌ | N/A | N/A | N/A | N/A | 确保字段配置互斥 |
| 添加 started_at 字段 | ❌ | N/A | N/A | N/A | N/A | student_activities表，用于timed类型 |
| 添加 time_limit_deadline 字段 | ❌ | N/A | N/A | N/A | N/A | student_activities表 |
| 编写数据库迁移脚本 | ❌ | N/A | N/A | N/A | N/A | 004_practice_time_limit_types.sql |
| **后端 API 开发** |  |  |  |  |  |  |
| Activity Model 验证逻辑 | ❌ | ❌ | ❌ | N/A | N/A | 三种类型的字段验证 |
| POST /api/activities 接口 | ❌ | ❌ | ❌ | N/A | N/A | 支持time_limit_type参数 |
| PUT /api/activities/:id 接口 | ❌ | ❌ | ❌ | N/A | N/A | 更新时验证 |
| POST /api/student-activities/start | ❌ | ❌ | ❌ | N/A | N/A | 检查时间限制，记录started_at |
| 自动提交定时任务 | ❌ | ❌ | ❌ | N/A | N/A | cron job每分钟检查超时 |
| 后端单元测试 | ❌ | N/A | ❌ | N/A | N/A | 覆盖三种类型的验证逻辑 |
| **前端开发** |  |  |  |  |  |  |
| Activity 类型定义更新 | ❌ | N/A | N/A | ❌ | N/A | frontend/src/types/activity.ts |
| 创建/编辑活动表单 | ❌ | N/A | N/A | ❌ | N/A | 时间限制类型选择器 |
| 倒计时组件 | ❌ | N/A | N/A | ❌ | N/A | CountdownTimer.tsx |
| 学生答题页面 | ❌ | N/A | N/A | ❌ | N/A | 显示倒计时，处理超时 |
| 活动列表显示 | ❌ | N/A | N/A | ❌ | N/A | 显示时间限制类型信息 |
| 异常处理 | ❌ | N/A | N/A | ❌ | N/A | 网络中断、页面刷新 |
| **E2E 测试** |  |  |  |  |  |  |
| PTL001-PTL003: 创建三种类型 | ❌ | N/A | N/A | N/A | ❌ | 教师创建各类型活动 |
| PTL004-PTL006: 固定时间段测试 | ❌ | N/A | N/A | N/A | ❌ | 开始前/中/后行为测试 |
| PTL007-PTL008: 限时作答测试 | ❌ | N/A | N/A | N/A | ❌ | 开始计时、自动提交 |
| PTL009: 超时自动提交测试 | ❌ | N/A | N/A | N/A | ❌ | 模拟超时场景 |
| PTL010: 提前提交测试 | ❌ | N/A | N/A | N/A | ❌ | 无时间限制提交 |

**状态**: 🚧 **部分完成** | 后端API已实现，API测试100%通过（6/6） | 前端和E2E测试待开发 | 参考: `documents/archive/PRACTICE_TIME_LIMIT_DESIGN.md`, `documents/archive/PHASE4_TEST_SUMMARY.md`

---

### 7.3 学生答题与教师评卷功能 (NEW - 2025-10-30)

**背景**: 实现完整的学生在线答题流程和教师人工评卷工作流。

**设计文档**: `documents/STUDENT_ACTIVITY_GRADING_COMPLETION.md`

**目标**:
- 学生端：完整答题流程（开始、填写、自动保存、提交、查看结果）
- 教师端：人工评卷管理（待评卷列表、评分、批量保存、完成评卷）
- 自动评分：客观题自动评分，主观题标记为待人工评卷

| 功能 | 数据库 | 后端API | API测试 | 前端 | E2E测试 | 备注 |
|------|--------|---------|---------|------|---------|------|
| **学生答题流程** |  |  |  |  |  |  |
| 开始活动 | ✅ | ✅ | ✅ | ✅ | ✅ | POST `/api/student/activities/:id/start` |
| 获取题目列表 | ✅ | ✅ | ✅ | ✅ | ✅ | GET `/api/student/activities/:id/questions` |
| 提交单题答案 | ✅ | ✅ | ✅ | ✅ | ✅ | POST `/api/student/activities/:id/answers` |
| 获取已提交答案 | ✅ | ✅ | ✅ | ✅ | ✅ | GET `/api/student/activities/:id/my-answers` |
| 提交活动 | ✅ | ✅ | ✅ | ✅ | ✅ | POST `/api/student/activities/:id/submit` |
| 查看答题结果 | ✅ | ✅ | ✅ | ✅ | ✅ | GET `/api/student/activities/:id/detail` |
| 答案自动保存 | ✅ | ✅ | ✅ | ✅ | ✅ | 2秒debounce，LocalStorage备份 |
| LocalStorage备份 | N/A | N/A | N/A | ✅ | ✅ | 网络故障保护 |
| 倒计时功能 | ✅ | ✅ | ✅ | ✅ | ✅ | 限时活动倒计时提醒 |
| **教师评卷流程** |  |  |  |  |  |  |
| 待评卷列表 | ✅ | ✅ | ✅ | ✅ | ✅ | GET `/api/grading/pending` |
| 评卷详情 | ✅ | ✅ | ✅ | ✅ | ✅ | GET `/api/grading/student-activity/:id` |
| 单题评分 | ✅ | ✅ | ✅ | ✅ | ✅ | PUT `/api/grading/answers/:id` |
| 批量评分 | ✅ | ✅ | ✅ | ✅ | ✅ | PUT `/api/grading/batch` |
| 完成评卷 | ✅ | ✅ | ✅ | ✅ | ✅ | POST `/api/grading/student-activity/:id/complete` |
| 评卷统计 | ✅ | ✅ | ✅ | ✅ | ✅ | GET `/api/grading/stats/:id` |
| 多维度筛选 | ✅ | ✅ | ✅ | ✅ | ✅ | 科目、年级、状态筛选 |
| **自动评分系统** |  |  |  |  |  |  |
| 单选题自动评分 | ✅ | ✅ | ✅ | N/A | ✅ | autoGradingService.js |
| 多选题自动评分 | ✅ | ✅ | ✅ | N/A | ✅ | 完全匹配才得分 |
| 判断题自动评分 | ✅ | ✅ | ✅ | N/A | ✅ | true/false匹配 |
| 填空题自动评分 | ✅ | ✅ | ✅ | N/A | ✅ | 去除空格后精确匹配 |
| 主观题标记 | ✅ | ✅ | ✅ | N/A | ✅ | 标记为pending待人工评卷 |

**开发状态**: ✅ **已完成** | API测试100%通过 | E2E测试7/16通过（9个跳过-缺数据）| 参考: `documents/archive/STUDENT_ACTIVITY_GRADING_COMPLETION.md`

---

### 7.4 测评报名管理系统 (NEW - 2025-11-30)

**背景**: 测评活动与练习活动的核心区别在于报名机制。测评分为两种模式：
- **L1-L3 纯线上测评**: 学生在线报名后，直接在线上系统完成测评
- **L4-L7 线下现场测评**: 学生在线报名并选择测评点，到现场使用线上系统完成测评

**详细需求文档**: `docs/ASSESSMENT_REGISTRATION_REQUIREMENTS.md`

**功能列表**:

| 功能 | 数据库 | 后端API | API测试 | 前端 | E2E测试 | 备注 |
|------|--------|---------|---------|------|---------|------|
| **数据库设计** |  |  |  |  |  |  |
| assessment_locations表 | ❌ | N/A | N/A | N/A | N/A | 测评点管理（L4+使用） |
| assessment_registrations表 | ❌ | N/A | N/A | N/A | N/A | 报名记录管理 |
| activities表报名字段 | ❌ | N/A | N/A | N/A | N/A | 报名开始/截止时间等 |
| 报名计数触发器 | ❌ | N/A | N/A | N/A | N/A | 自动维护测评点已报名人数 |
| **测评点管理** |  |  |  |  |  |  |
| 创建测评点 | ❌ | ❌ | ❌ | ❌ | ❌ | POST /api/activities/:id/locations |
| 测评点列表 | ❌ | ❌ | ❌ | ❌ | ❌ | GET /api/activities/:id/locations |
| 编辑测评点 | ❌ | ❌ | ❌ | ❌ | ❌ | PUT /api/.../locations/:id |
| 删除测评点 | ❌ | ❌ | ❌ | ❌ | ❌ | DELETE /api/.../locations/:id |
| **学生报名** |  |  |  |  |  |  |
| 检查报名资格 | ❌ | ❌ | ❌ | ❌ | ❌ | GET /api/activities/:id/registration/eligibility |
| L1-L3报名 | ❌ | ❌ | ❌ | ❌ | ❌ | POST /api/activities/:id/register (无测评点) |
| L4+报名 | ❌ | ❌ | ❌ | ❌ | ❌ | POST /api/activities/:id/register (含测评点) |
| 取消报名 | ❌ | ❌ | ❌ | ❌ | ❌ | POST /api/activities/:id/register/cancel |
| 我的报名列表 | ❌ | ❌ | ❌ | ❌ | ❌ | GET /api/assessments/my-registrations |
| **管理员功能** |  |  |  |  |  |  |
| 报名列表查询 | ❌ | ❌ | ❌ | ❌ | ❌ | GET /api/activities/:id/registrations |
| 报名统计 | ❌ | ❌ | ❌ | ❌ | ❌ | 按测评点/学校/年级统计 |
| 导出报名名单 | ❌ | ❌ | ❌ | ❌ | ❌ | GET /api/.../registrations/export |
| 取消发布限制 | ❌ | ❌ | ❌ | ❌ | ❌ | 有报名后不可取消发布 |
| **前端页面** |  |  |  |  |  |  |
| 学生-测评报名列表 | N/A | N/A | N/A | ❌ | ❌ | /student/assessments |
| 学生-测评详情报名 | N/A | N/A | N/A | ❌ | ❌ | /student/assessments/:id |
| 学生-我的报名 | N/A | N/A | N/A | ❌ | ❌ | /student/my-registrations |
| 管理员-测评点管理 | N/A | N/A | N/A | ❌ | ❌ | /admin/activities/:id/locations |
| 管理员-报名管理 | N/A | N/A | N/A | ❌ | ❌ | /admin/activities/:id/registrations |

**开发计划**:

| 阶段 | 任务 | 工期 | 状态 |
|------|------|------|------|
| 1 | 数据库设计与迁移 | 1天 | ❌ 未开始 |
| 2 | 后端API - 测评点管理 | 1天 | ❌ 未开始 |
| 3 | 后端API - 学生报名 | 2天 | ❌ 未开始 |
| 4 | 后端API - 管理员报名管理 | 1天 | ❌ 未开始 |
| 5 | 前端 - 学生报名页面 | 2天 | ❌ 未开始 |
| 6 | 前端 - 管理员管理页面 | 2天 | ❌ 未开始 |
| 7 | 集成测试与优化 | 2天 | ❌ 未开始 |
| **总计** | - | **11天** | - |

**开发状态**: ❌ **未开始** | 需求设计完成 | 预计工期11天

---

### 8. 系统配置

| 功能 | 数据库 | 后端API | API测试 | 前端 | E2E测试 | 备注 |
|------|--------|---------|---------|------|---------|------|
| 科目配置 | ✅ | ✅ | ❌ | ✅ | ❌ | 缺少测试 |
| 能力维度配置 | ✅ | ✅ | ❌ | ✅ | ❌ | 缺少测试 |
| 知识点配置 | ✅ | ✅ | ❌ | ✅ | ❌ | 缺少测试 |
| 学校管理 | ✅ | ✅ | ❌ | ✅ | ❌ | 缺少测试 |

---

### 13. 编程题判题系统 (NEW - 2025-12-09)

**背景**: 支持编程题（type='code'）的在线评测功能，包括代码编译、执行、测试用例评测、自动评分等。

**设计文档**: `documents/JUDGE_SERVICE_DESIGN.md`

**目标**:
- 支持 C++ 和 C 语言代码在线编译和执行
- 支持测试用例管理和自动评测
- 支持时间/内存限制检测
- 集成到现有的活动系统中

| 功能 | 数据库 | 后端API | API测试 | 前端 | E2E测试 | 备注 |
|------|--------|---------|---------|------|---------|------|
| **数据库设计** |  |  |  |  |  |  |
| test_cases表 | ✅ | N/A | N/A | N/A | N/A | 测试用例管理 |
| code_submissions表 | ✅ | N/A | N/A | N/A | N/A | 代码提交记录 |
| judge_queue表 | ✅ | N/A | N/A | N/A | N/A | 判题队列 |
| question_drafts编程字段 | ✅ | N/A | N/A | N/A | N/A | code_template, time_limit, memory_limit等 |
| question_bank_with_draft视图更新 | ✅ | N/A | N/A | N/A | N/A | 包含编程题字段 |
| **Judge-Service微服务** |  |  |  |  |  |  |
| Docker沙箱执行 | ✅ | ✅ | ✅ | N/A | N/A | DockerSandbox.js |
| 代码编译 | ✅ | ✅ | ✅ | N/A | N/A | Compiler.js |
| 代码执行 | ✅ | ✅ | ✅ | N/A | N/A | Executor.js |
| 结果检查 | ✅ | ✅ | ✅ | N/A | N/A | Checker.js |
| 异步队列处理 | ✅ | ✅ | ✅ | N/A | N/A | RedisQueue.js, Consumer.js |
| **后端API** |  |  |  |  |  |  |
| POST /api/judge/submit | ✅ | ✅ | ✅ | N/A | N/A | 提交代码评测 |
| POST /api/judge/run | ✅ | ✅ | ✅ | N/A | N/A | 快速运行（不保存） |
| GET /api/judge/status/:id | ✅ | ✅ | ✅ | N/A | N/A | 获取评测状态 |
| GET /api/judge/languages | ✅ | ✅ | ✅ | N/A | N/A | 获取支持的语言 |
| 测试用例CRUD | ✅ | ✅ | ✅ | N/A | N/A | /api/testcases/* |
| **前端组件** |  |  |  |  |  |  |
| CodeEditor组件 | N/A | N/A | N/A | ✅ | ❌ | Monaco Editor集成 |
| CodeQuestion组件 | N/A | N/A | N/A | ✅ | ❌ | 学生答题页面 |
| JudgeResult组件 | N/A | N/A | N/A | ✅ | ❌ | 评测结果展示 |
| CodeQuestionForm组件 | N/A | N/A | N/A | ✅ | ❌ | 题目配置表单 |
| TakeActivityPage集成 | N/A | N/A | N/A | ✅ | ❌ | 答题页面集成 |
| QuestionFormPage集成 | N/A | N/A | N/A | ✅ | ❌ | 题目创建表单集成 |

**开发状态**: ✅ **基础功能已完成** | API测试通过 | 前端集成完成 | E2E测试待补充

**迁移文件**:
- `database/migrations/031_judge_system.sql` - 判题系统主表
- `database/migrations/032_update_question_bank_view.sql` - 视图更新
- `database/migrations/033_fix_code_submissions.sql` - 约束修复

**未完成工作**: 参见 `docs/PENDING_WORK.md` - 编程题判题系统

---

### 12. 教学班管理系统 (NEW - 2025-11-26)

**背景**: 教学班是虚拟班级概念，支持教师跨越物理班级界限组织学生进行学习和测评活动。教学班可以在学校、区县、市级三个行政级别创建，需要对应级别管理员审批。

**设计文档**: `docs/TEACHING_CLASS_REQUIREMENTS.md`

**目标**:
- 支持三级教学班创建：校级、区级、市级
- 实现分级审批流程和超时自动流转机制
- 支持学生管理和活动关联
- 提供班级数据统计分析

| 功能 | 数据库 | 后端API | API测试 | 前端 | E2E测试 | 备注 |
|------|--------|---------|---------|------|---------|------|
| **数据库设计** |  |  |  |  |  |  |
| teaching_classes表 | ❌ | N/A | N/A | N/A | N/A | 教学班基本信息 |
| teaching_class_members表 | ❌ | N/A | N/A | N/A | N/A | 班级学生关联 |
| teaching_class_teachers表 | ❌ | N/A | N/A | N/A | N/A | 班级教师关联 |
| teaching_class_approvals表 | ❌ | N/A | N/A | N/A | N/A | 审批记录 |
| teaching_class_activities表 | ❌ | N/A | N/A | N/A | N/A | 活动关联 |
| 数据库迁移脚本 | ❌ | N/A | N/A | N/A | N/A | 026_teaching_class.sql |
| **教学班基础管理** |  |  |  |  |  |  |
| 创建教学班 | ❌ | ❌ | ❌ | ❌ | ❌ | POST /api/teaching-classes |
| 获取教学班列表 | ❌ | ❌ | ❌ | ❌ | ❌ | GET /api/teaching-classes |
| 获取教学班详情 | ❌ | ❌ | ❌ | ❌ | ❌ | GET /api/teaching-classes/:id |
| 更新教学班 | ❌ | ❌ | ❌ | ❌ | ❌ | PUT /api/teaching-classes/:id |
| 删除教学班 | ❌ | ❌ | ❌ | ❌ | ❌ | DELETE /api/teaching-classes/:id |
| 提交审批 | ❌ | ❌ | ❌ | ❌ | ❌ | POST /api/teaching-classes/:id/submit |
| **审批流程** |  |  |  |  |  |  |
| 获取待审批列表 | ❌ | ❌ | ❌ | ❌ | ❌ | GET /api/teaching-classes/pending |
| 批准教学班 | ❌ | ❌ | ❌ | ❌ | ❌ | POST /api/teaching-classes/:id/approve |
| 拒绝教学班 | ❌ | ❌ | ❌ | ❌ | ❌ | POST /api/teaching-classes/:id/reject |
| 超时自动流转服务 | ❌ | ❌ | ❌ | N/A | ❌ | cron每小时检查 |
| **学生管理** |  |  |  |  |  |  |
| 获取班级学生列表 | ❌ | ❌ | ❌ | ❌ | ❌ | GET /api/teaching-classes/:id/students |
| 添加学生 | ❌ | ❌ | ❌ | ❌ | ❌ | POST /api/teaching-classes/:id/students |
| 批量添加学生 | ❌ | ❌ | ❌ | ❌ | ❌ | POST /api/teaching-classes/:id/students/batch |
| 移除学生 | ❌ | ❌ | ❌ | ❌ | ❌ | DELETE /api/teaching-classes/:id/students/:studentId |
| 范围限制校验 | ❌ | ❌ | ❌ | N/A | ❌ | 校级/区级/市级学生范围 |
| **活动管理** |  |  |  |  |  |  |
| 获取关联活动 | ❌ | ❌ | ❌ | ❌ | ❌ | GET /api/teaching-classes/:id/activities |
| 关联活动 | ❌ | ❌ | ❌ | ❌ | ❌ | POST /api/teaching-classes/:id/activities |
| 取消关联活动 | ❌ | ❌ | ❌ | ❌ | ❌ | DELETE /api/teaching-classes/:id/activities/:activityId |
| 班级统计数据 | ❌ | ❌ | ❌ | ❌ | ❌ | GET /api/teaching-classes/:id/statistics |
| **前端页面** |  |  |  |  |  |  |
| 教学班列表页 | N/A | N/A | N/A | ❌ | ❌ | /teacher/teaching-classes |
| 创建/编辑教学班页 | N/A | N/A | N/A | ❌ | ❌ | /teacher/teaching-classes/create |
| 教学班详情页 | N/A | N/A | N/A | ❌ | ❌ | /teacher/teaching-classes/:id |
| 学生管理页 | N/A | N/A | N/A | ❌ | ❌ | /teacher/teaching-classes/:id/students |
| 管理员审批页 | N/A | N/A | N/A | ❌ | ❌ | /admin/teaching-class-approvals |

**开发状态**: ❌ **未开始** | 预计工期12天 | 参考: `docs/TEACHING_CLASS_REQUIREMENTS.md`

---

### 8.1 活动组卷管理系统 (2025-10-28)

**背景**: 为练习和测评活动提供完整的组卷功能，支持题目筛选、批量操作、智能推荐等。

| 功能 | 数据库 | 后端API | API测试 | 前端 | E2E测试 | 备注 |
|------|--------|---------|---------|------|---------|------|
| 题目库连接 | ✅ | ✅ | ✅ | ✅ | ❌ | activity_questions表 |
| 获取可用题目 | ✅ | ✅ | ✅ | ✅ | ❌ | 支持5种筛选条件 |
| 添加单个题目 | ✅ | ✅ | ✅ | ✅ | ❌ | POST /:id/questions |
| 批量添加题目 | ✅ | ✅ | ✅ | ✅ | ❌ | POST /:id/questions/batch |
| 移除题目 | ✅ | ✅ | ✅ | ✅ | ❌ | DELETE /:id/questions/:questionId |
| 更新题目属性 | ✅ | ✅ | ✅ | ✅ | ❌ | 分值、顺序、章节 |
| 题目重排序 | ✅ | ✅ | ✅ | ✅ | ❌ | PUT /:id/questions/reorder |
| 智能推荐 | ✅ | ✅ | ✅ | ✅ | ❌ | 基于科目/年级/能力等级 |
| 试卷统计 | ✅ | ✅ | ✅ | ✅ | ❌ | 总分、题目数、题型分布 |
| 试卷验证 | ✅ | ✅ | ✅ | ✅ | ❌ | 完整性检查 |
| 清空试卷 | ✅ | ✅ | ✅ | ✅ | ❌ | DELETE /:id/paper |

**开发状态**: ✅ **已完成** | 后端11个API接口 | API测试100%通过（18/18） | 前端已集成 | 参考: `documents/archive/PAPER_GENERATION_SUMMARY.md`

---

### 9. 个人成长系统 (NEW - 2025-10-30)

**背景**: 为学生提供个性化的成长追踪和学习激励体系，增强学习积极性和参与度。

**设计文档**: `documents/PENDING_FEATURES.md`

**目标**:
- 学生端：个人成长中心页面，展示学习进度、统计数据、学习轨迹
- 成就系统：游戏化学习激励机制，通过解锁成就提升学习动力
- 数据分析：学习行为分析，为学生提供个性化学习建议

| 功能 | 数据库 | 后端API | API测试 | 前端 | E2E测试 | 备注 |
|------|--------|---------|---------|------|---------|------|
| **个人成长中心** |  |  |  |  |  | **部分完成** |
| 学习统计展示 | ✅ | ❌ | ❌ | ✅ | ❌ | 前端Mock数据，待后端API |
| 学习进度追踪 | ✅ | ❌ | ❌ | ✅ | ❌ | 完成率、进行中数量 |
| 最近活动列表 | ✅ | ❌ | ❌ | ✅ | ❌ | 最近完成的练习/测评 |
| 学习轨迹时间线 | ✅ | ❌ | ❌ | ✅ | ❌ | 按日期展示学习历史 |
| 学习时长统计 | ❌ | ❌ | ❌ | ✅ | ❌ | Mock数据，待实现统计逻辑 |
| 连续学习天数 | ❌ | ❌ | ❌ | ✅ | ❌ | Mock数据，待实现追踪机制 |
| **成就系统** |  |  |  |  |  | **待开发** |
| 成就定义管理 | ❌ | ❌ | ❌ | ❌ | ❌ | 定义成就类型、解锁条件 |
| 成就徽章系统 | ❌ | ❌ | ❌ | ❌ | ❌ | 徽章图标、稀有度分级 |
| 成就进度追踪 | ❌ | ❌ | ❌ | ❌ | ❌ | 实时进度更新、解锁提示 |
| 成就墙展示 | ❌ | ❌ | ❌ | ✅ | ❌ | 前端占位已预留 |
| 成就积分系统 | ❌ | ❌ | ❌ | ❌ | ❌ | 积分累计、等级划分 |
| 成就排行榜 | ❌ | ❌ | ❌ | ❌ | ❌ | 学校/班级/全市排行 |

**当前状态**: 前端已完成(Mock数据) | 后端API待开发 | 优先级P2 | 预计2-4周 | 参考: `documents/PENDING_FEATURES.md`

---

### 10. 学生自主注册系统 (NEW - 2025-10-28)

**背景**: 实现学生自主注册申请系统，支持分级审核机制，减轻管理员手动创建账号的工作量。

**设计文档**: `documents/STUDENT_REGISTRATION_PROGRESS.md` (已归档)

**目标**:
- 学生提交注册申请（手机号、姓名、出生日期、身份证后4位、区县、学校）
- 三级审核机制：校级管理员→区县管理员→市级管理员
- 自动升级机制：3天未处理自动升级到上级管理员
- 审核通过后自动创建学生账号

| 功能 | 数据库 | 后端API | API测试 | 前端 | E2E测试 | 备注 |
|------|--------|---------|---------|------|---------|------|
| 学生注册申请 | ✅ | ✅ | ✅ | ✅ | ✅ | POST /api/registration/student, StudentRegisterPage.tsx, REG103 |
| 获取区县列表 | ✅ | ✅ | ✅ | ✅ | ✅ | GET /api/registration/config/districts, configService.js扩展 |
| 获取学校列表 | ✅ | ✅ | ✅ | ✅ | ✅ | GET /api/registration/config/schools/:districtCode, 36所学校配置 |
| 查询申请状态 | ✅ | ✅ | ✅ | ✅ | ✅ | GET /api/registration/status/:phone, RegisterStatusPage.tsx, REG104 |
| 自动升级机制 | ✅ | ✅ | ✅ | N/A | ✅ | registrationEscalationService.js, cron每小时检查 |
| 管理员查看待审核列表 | ✅ | ✅ | ✅ | ✅ | ✅ | GET /api/registration/admin/requests, RegistrationApprovalPage.tsx, REG105 |
| 管理员搜索注册申请 | ✅ | ✅ | ✅ | ✅ | ✅ | 按手机号/姓名搜索 |
| 管理员批准注册申请 | ✅ | ✅ | ✅ | ✅ | ✅ | POST /api/registration/admin/approve/:id, 自动创建学生账号, REG106-109 |
| 管理员拒绝注册申请 | ✅ | ✅ | ✅ | ✅ | ❌ | POST /api/registration/admin/reject/:id, 缺E2E测试 |
| 查看审核历史 | ✅ | ❌ | ❌ | ❌ | ❌ | GET /api/registration/admin/history/:id (待开发) |

**开发状态**: ✅ **已完成** | 完整工作流已实现 | E2E测试100%通过（REG103-REG109） | 参考: `documents/archive/STUDENT_REGISTRATION_PROGRESS.md`

---

### 11. 成绩查询系统优化 (NEW - 2025-10-30)

**背景**: 当前成绩查询页面为占位页面，需要完整实现成绩查询和分析功能。

**状态**: ⏳ **待开发**
**页面**: `frontend/src/pages/ResultsPage.tsx` (当前为待开发占位页面)

| 功能 | 数据库 | 后端API | API测试 | 前端 | E2E测试 | 备注 |
|------|--------|---------|---------|------|---------|------|
| 考试成绩列表 | ✅ | ❌ | ❌ | ❌ | ❌ | 数据库已有，待实现查询API |
| 成绩详情查看 | ✅ | ❌ | ❌ | ❌ | ❌ | 题目得分、正确答案对比 |
| 学习进度统计 | ✅ | ❌ | ❌ | ❌ | ❌ | 总次数、平均分、排名 |
| 证书下载功能 | ✅ | ✅ | ❌ | ❌ | ❌ | 后端已有，待前端集成 |
| 成绩趋势分析 | ✅ | ❌ | ❌ | ❌ | ❌ | 折线图、进步趋势 |

**开发状态**: ⏳ **待开发** | 优先级P1 | 预计1-2周 | 参考: `documents/PENDING_FEATURES.md`

---

## 测试覆盖率统计

### API测试覆盖率

| 模块 | 已测试 | 总数 | 覆盖率 |
|------|--------|------|--------|
| 认证授权 | 4/6 | 6 | 67% |
| 考试管理 | 8/10 | 10 | 80% |
| 题库管理 | 6/9 | 9 | 67% |
| 题库审核 | 2/7 | 7 | 29% |
| 成绩管理 | 5/7 | 7 | 71% |
| 用户管理 | 4/6 | 6 | 67% |
| 权限系统 | 32/32 | 32 | 100% |
| 系统配置 | 0/4 | 4 | 0% |
| **总计** | **61/81** | **81** | **75%** |

### E2E测试覆盖率

| 模块 | 已测试 | 总数 | 覆盖率 |
|------|--------|------|--------|
| 认证授权 | 3/6 | 6 | 50% |
| 考试管理 | 6/10 | 10 | 60% |
| 题库管理 | 5/9 | 9 | 56% |
| 题库审核 | 3/7 | 7 | 43% |
| 成绩管理 | 6/7 | 7 | 86% |
| 用户管理 | 0/6 | 6 | 0% |
| 系统配置 | 0/4 | 4 | 0% |
| **总计** | **23/49** | **49** | **47%** |

## 近期开发计划

### 优先级 P0（立即处理）

1. ✅ ~~修复R402编辑草稿题目测试用例~~ - 已完成
2. 完善题库审核流程的测试覆盖（R403-R406）
3. 添加用户管理模块的E2E测试

### 优先级 P1（本周完成）

1. 完善API测试覆盖率至80%以上
2. 实现题目导出功能
3. 完善系统配置模块的测试

### 优先级 P2（下周计划）

1. 提升E2E测试覆盖率至70%以上
2. 性能优化和压力测试
3. 安全性审计

## 已知问题

### 高优先级问题

1. 🐛 后端Rate Limiting错误 - `trust proxy`配置问题
   - 位置：`backend/src/server.js`
   - 影响：部分API请求可能被拦截
   - 状态：待修复

### 中优先级问题

1. 虚拟滚动表格的测试问题
   - 位置：题库列表页面
   - 影响：E2E测试需要使用特殊选择器
   - 状态：已有解决方案

### 低优先级问题

1. 部分页面缺少加载状态提示
   - 影响：用户体验
   - 状态：待优化

## 近期更新

### 2026-02-27
- 🐛 **修复练习中心刷新不显示数据问题**
  - 问题：刷新页面后数据不立即加载
  - 原因：useEffect只在依赖项变化时触发，初始加载时机不当
  - 解决：添加初始加载useEffect，同时加载两个列表
  - 文件：`frontend/src/pages/student/PracticeCenterPage.tsx`
  - 状态: ✅ 已完成
- 🎨 **优化练习中心显示**
  - 移除"可用练习"中的"查看详情"按钮
  - 添加已完成练习标识：🏆已完成 / 进行中
  - 文件：`frontend/src/pages/student/PracticeCenterPage.tsx`
  - 状态: ✅ 已完成
- ✨ **添加学生已完成的练习查看功能**
  - 问题：学生答完练习后无法再次查看已完成的练习结果
  - 解决：
    1. 后端添加 `/student/activities/practice/completed` API
    2. 前端练习中心添加选项卡，区分"可用练习"和"已完成"
    3. 已完成练习显示得分、完成时间、批改状态
    4. 添加"查看结果"按钮跳转到结果详情页
  - 文件：
    - `backend/src/routes/studentActivities.js` - 新增API
    - `frontend/src/services/api.ts` - 新增API调用
    - `frontend/src/pages/student/PracticeCenterPage.tsx` - 选项卡UI
  - 状态: ✅ 已完成
- 🎨 **优化答题卡滚动跟随功能**
  - 问题：滚动页面时答题卡选中状态不能跟随变化
  - 解决：优化滚动监听器初始化时机（延迟200ms），统一保护期为800ms
  - 效果：滚动页面时，答题卡自动高亮当前可见的题目
  - 文件：`frontend/src/pages/student/TakeActivityPage.tsx`
  - 状态: ✅ 已完成
- 🎨 **修复答题卡点击后选中状态不跟随问题**
  - 问题：点击答题卡按钮后，选中颜色没有立即变化
  - 原因：滚动监听器立即覆盖了手动点击设置的状态
  - 解决：添加 `manualClickRef` 标志，点击后500ms内暂停滚动监听器的自动更新
  - 文件：`frontend/src/pages/student/TakeActivityPage.tsx`
  - 状态: ✅ 已完成
- 🎨 **优化答题卡选中状态颜色显示**
  - 问题：当前选中题目的颜色不够明显，难以区分
  - 优化方案：
    1. 当前 + 已答：蓝色高亮 (#1677ff) + 白色文字 + 阴影效果
    2. 当前 + 未答：橙色边框 (#fa8c16) + 浅橙背景 + 3px粗边框 + 阴影
    3. 非当前 + 已答：浅绿色背景 (#f6ffed) + 绿色文字
    4. 非当前 + 未答：虚线边框
  - 文件：`frontend/src/pages/student/TakeActivityPage.tsx`
  - 状态: ✅ 已完成
- 🎨 **优化学生答题页面布局**
  - 问题：左右间距过宽，答题卡过于紧凑，题号显示不全
  - 优化内容：
    1. 减小左右间距：20px → 16px
    2. 增加答题卡宽度：150px → 220px
    3. 优化网格布局：5列 → 4列，按钮更大更易读
    4. 增大按钮尺寸：28px → 36px，字体 13px → 15px
    5. 增加右侧最大宽度：1000px → 1200px
  - 文件：`frontend/src/pages/student/TakeActivityPage.tsx`
  - 状态: ✅ 已完成
- 🐛 **修复审核工作台统计信息显示错误**
  - 问题：待审核、已通过、已拒绝、通过率显示不正确
  - 原因：统计API使用错误的状态值（`approved`/`rejected`），实际应为 `published`/`inactive`
  - 解决：修正SQL查询中的状态值，添加 `is_active = true` 过滤
  - 文件：`backend/src/routes/questionReview.js`
  - 状态: ✅ 已修复
- 🐛 **修复审核工作台目标范围显示问题**
  - 问题：目标范围列显示编码标记（如`practice_municipal`）而非中文名称
  - 原因：scope文本映射只在点击详情时加载，表格初始加载时为空
  - 解决：
    1. 加载列表时预加载所有scope的中文文本
    2. 添加默认中文映射作为后备（assessment→测评题库等）
  - 文件：`frontend/src/pages/teacher/ReviewWorkbench.tsx`
  - 状态: ✅ 已修复
- 🐛 **修复审核工作台提交人显示问题**
  - 问题：审核题目时提交人列显示为空
  - 原因：后端API返回 `creator_name`，前端期望 `submitted_by_name` 字段
  - 解决：后端添加 `submitted_by_name` 和 `target_scope` 字段
  - 文件：`backend/src/routes/questionReview.js`
  - 状态: ✅ 已修复
- 🐛 **修复登录后401 Unauthorized错误**
  - 问题：登录成功后API请求返回401，JWT token已过期（过期时间：2026-02-08）
  - 原因1：前端401错误处理只静默处理，没有清除过期的token
  - 原因2：登录时没有清除localStorage中旧的token
  - 解决：
    1. API拦截器：收到401时清除localStorage并跳转登录页
    2. 登录页面：登录前先清除旧的token和用户信息
  - 文件：
    - `frontend/src/services/api.ts` - 401错误处理
    - `frontend/src/pages/LoginPage.tsx` - 登录前清理token
  - 状态: ✅ 已修复

### 2026-02-26
- 🐛 **修复学生答题页面答题卡状态同步问题**
  - 问题1: 答题卡按钮与右侧答题状态不同步
    - 原因: `convertFieldNames` 函数使用异步状态 `activity` 导致转换失败
    - 解决: 改用局部变量 `activityData` 直接处理，避免异步状态问题
  - 问题2: 当前选中题目颜色不正确
    - 原因: Ant Design `type="primary"` 覆盖内联样式
    - 解决: 使用 `type="default"` + 内联样式实现自定义颜色
  - 问题3: 滚动时答题卡不自动更新当前选中状态
    - 解决: 添加滚动监听器，计算距离视口中心最近的题目
  - 答题卡颜色优化:
    - 当前 + 已答: 🟢 深绿色背景 (#52c41a) + 白色文字
    - 当前 + 未答: 🔵 蓝色边框 + 加粗文字
    - 已答（非当前）: 🟢 浅绿色背景 (#f6ffed) + 绿色文字
    - 未答（非当前）: ⚪ 虚线边框
  - 文件: `frontend/src/pages/student/TakeActivityPage.tsx`
  - 状态: ✅ 已修复并提交

### 2025-01-21
- 🐛 **修复通知API路由顺序问题** - `DELETE /notifications/read` 返回400错误
  - 问题: Express将 `/read` 路由匹配到 `/:id` 路由，导致验证失败
  - 解决: 将具体路由（`/batch`、`/read`）放在参数化路由（`/:id`）之前
  - 文件: `backend/src/routes/notifications.js`
  - 状态: ✅ 已修复
- 🐛 **修复审核题目500错误** - 外键约束指向错误的备份表
  - 问题: `question_reviews.question_id` 外键指向 `question_bank_old_backup_20251122` 而不是 `question_bank`
  - 原因: 迁移 024 重命名表时外键未正确更新
  - 解决: 删除错误外键，清理5条无效记录，创建正确外键
  - 迁移文件: `database/migrations/038_fix_question_reviews_fk.sql`
  - 状态: ✅ 已修复
- ✅ **审核页面中文名称显示** - 已完成
  - 后端新增API: `GET /api/question-bank/config/scopes` - 根据数据库返回格式化的scope文本
  - 修复内容:
    - `abilities` (考察能力): `computational_thinking` → "计算思维能力"
    - `knowledge_points` (知识点): `cs_basics` → "计算机基础"
    - `difficulty` (难度): `easy` → "简单", `medium` → "中等", `hard` → "困难"
    - `scope` (题库范围): 从数据库动态获取区县和学校名称
  - 文件:
    - `backend/src/routes/questionBank.js` - 新增 `/config/scopes` 端点
    - `frontend/src/services/api.ts` - 新增 `getScopeTexts` 方法
    - `frontend/src/pages/teacher/ReviewWorkbench.tsx` - 使用API获取scope文本
    - `frontend/src/pages/teacher/ReviewPage.tsx` - 使用API获取scope文本
  - 状态: ✅ 完成
- ✅ **修复草稿和提交页面问题**
  - 问题1: "我的草稿"提交后仍显示 - 修复: 排除已提交审核的草稿
  - 问题2: "我的提交"页面为空 - 修复: 重新实现提交记录显示
  - 文件:
    - `backend/src/models/QuestionDraft.js` - 更新 `getMyDrafts` 排除已提交草稿，新增 `getMySubmissions` 方法
    - `backend/src/routes/questionReview.js` - 更新 `/my-submissions` 端点
    - `frontend/src/pages/teacher/MySubmissionsPage.tsx` - 更新数据结构适配
  - 状态: ✅ 完成
- ✅ **拒绝后重新提交功能**
  - 功能: 已拒绝的题目可以修改后重新提交，更新已有记录而非新建
  - 实现逻辑: 检测到 `inactive` 状态时，更新为 `pending_review` 并重置审核字段
  - 文件: `backend/src/routes/questionReview.js` - 更新 `/:id/submit` 端点
  - 状态: ✅ 完成
- ✅ **修复API端点路径错误**
  - 问题: 题目编辑使用了错误的端点 `/question-bank/bank/:id`
  - 修复: 改为 `/question-bank/drafts/:id`
  - 文件: `frontend/src/services/api.ts`
  - 状态: ✅ 完成
- ✅ **修复审核历史权限问题**
  - 问题: 权限检查使用了错误的字段导致403错误
  - 修复: 检查提交者(published_by)而非创建者，添加published_by到查询
  - 文件: `backend/src/routes/questionReview.js` - 更新 `/:id/history` 端点
  - 状态: ✅ 完成
- ✅ **我的提交页面重新提交审核按钮** - 已完成
  - 功能: 在"我的提交"表格中为被拒绝的记录添加"重新提交审核"按钮
  - 实现细节:
    - 在操作列中添加"重新提交"按钮（仅被拒绝状态显示）
    - 点击按钮打开模态框，显示上次拒绝原因
    - 可选择新的目标范围和审核人
    - 调用现有的`submitForReview` API，会自动更新已有记录
  - 操作流程:
    1. 在"我的提交"页面查看被拒绝的记录
    2. 点击"修改"按钮编辑题目内容
    3. 修改完成后，点击"重新提交"按钮
    4. 选择新的审核人和目标范围，提交审核
  - 文件:
    - `frontend/src/pages/teacher/MySubmissionsPage.tsx` - 添加重新提交功能
    - `frontend/src/pages/teacher/QuestionFormPage.tsx` - 移除重新提交功能，保持纯粹的编辑功能
  - 状态: ✅ 完成
- ✅ **修复审核历史403权限错误** - 已完成
  - 问题: 前端调用历史API时使用了错误的ID字段
  - 原因: 后端 `getMySubmissions` 返回的 `id` 字段是 `draft_id`，应该使用 `submission_id`
  - 数据说明: 同一个draft可能有多条提交记录（不同范围），需要使用正确的 submission_id
  - 修复: 前端使用 `question.submission_id` 调用历史API
  - 文件:
    - `frontend/src/pages/teacher/MySubmissionsPage.tsx` - 使用正确的ID字段调用历史API
  - 状态: ✅ 完成

### 2025-12-09
- ✅ **编程题判题系统开发完成**
  - **数据库**: 3个迁移文件 (031-033)
    - test_cases表: 测试用例管理
    - code_submissions表: 代码提交记录
    - judge_queue表: 判题队列
    - question_drafts表扩展: 编程题字段
    - question_bank_with_draft视图更新
  - **Judge-Service微服务** (Docker独立容器):
    - DockerSandbox: 沙箱执行环境
    - Compiler: 代码编译 (C++/C)
    - Executor: 代码执行 (时间/内存限制)
    - Checker: 结果比对
    - RedisQueue + Consumer: 异步队列处理
  - **后端API**:
    - POST /api/judge/submit - 提交代码评测
    - POST /api/judge/run - 快速运行
    - GET /api/judge/status/:id - 获取评测状态
    - GET /api/judge/languages - 支持的语言
    - /api/testcases/* - 测试用例CRUD
  - **前端组件**:
    - CodeEditor: Monaco Editor代码编辑器
    - CodeQuestion: 学生答题组件
    - JudgeResult: 评测结果展示
    - CodeQuestionForm: 题目配置表单
    - TakeActivityPage/QuestionFormPage集成
  - **测试结果**: 基础流程测试通过 (75/100分, 3/4测试用例通过)
  - **未完成**: E2E测试、Python/Java语言支持、前端CodeQuestion测试集成

### 2025-11-26
- ✅ **教学班管理系统前后端开发完成**
  - 创建详细需求文档: `docs/TEACHING_CLASS_REQUIREMENTS.md`
  - **数据库**: `database/migrations/026_teaching_class.sql`
    - 5张数据表: teaching_classes, teaching_class_members, teaching_class_teachers, teaching_class_approvals, teaching_class_activities
    - 2个统计视图: v_teaching_class_summary, v_pending_teaching_classes
  - **后端**:
    - 模型: `backend/src/models/TeachingClass.js` (25+方法)
    - 路由: `backend/src/routes/teachingClasses.js` (15+端点)
  - **前端**:
    - 列表页: `frontend/src/pages/teacher/TeachingClassList.tsx`
    - 详情页: `frontend/src/pages/teacher/TeachingClassDetail.tsx`
    - 表单页: `frontend/src/pages/teacher/TeachingClassForm.tsx`
    - 学生管理: `frontend/src/pages/teacher/TeachingClassStudents.tsx`
    - 管理员审批: `frontend/src/pages/admin/TeachingClassApprovals.tsx`
    - API服务: `frontend/src/services/api.ts` (teachingClassApi)
    - 路由配置: `frontend/src/App.tsx`
    - 菜单入口: `frontend/src/components/layout/MainLayout.tsx`
  - **功能特性**:
    - 支持三级教学班：校级、区级、市级
    - 分级审批流程（校级→区级→市级管理员）
    - 7天超时自动流转机制
    - 学生批量管理、活动关联
    - 范围验证（学生只能被添加到对应范围的教学班）
  - API测试通过: 17/21 (81%)
  - schema.sql 已同步更新
  - 待完成: E2E测试
- ✅ 修复数据可视化模块前后端字段映射问题
  - 修复学生统计页面接口字段名不匹配
  - 修复教师数据分析页面接口字段名不匹配
  - 修复后端统计API的student_id查询逻辑
  - 统计API测试全部通过（5/5）

### 2025-11-05
- ✅ **权限系统API测试100%完成** - 3个测试文件，共32个测试全部通过
  - user-management-scope.test.js: 11个测试（用户管理范围隔离）
  - permission-migration.test.js: 8个测试（废弃权限迁移验证）
  - activity-permission-boundaries.test.js: 13个测试（活动权限边界）
- 🐛 **发现并修复3个关键Bug**:
  1. 后端允许授予废弃权限 (backend/src/routes/permissions.js)
  2. system_admin无法创建练习活动 (backend/src/middleware/activityPermission.js)
  3. 数据库约束缺少'system' scope (database/migrations/013_add_system_scope.sql)
- ✅ 权限系统测试覆盖率提升: 65% → 85%
- ✅ 整体API测试覆盖率提升: 59% → 75%
- 📝 完成测试文档: WORK_SESSION_2025-11-05_PERMISSION_TESTS.md

### 2025-10-31 (下午)
- ✅ **学生端练习中心和测评中心列表显示功能修复**
- 🐛 修复API响应字段名不匹配问题（`response.activities` → `response.practices`/`response.assessments`）
  - 文件: `frontend/src/pages/student/PracticeCenterPage.tsx`
  - 文件: `frontend/src/pages/student/AssessmentCenterPage.tsx`
- ✅ 修复favicon 404错误（移除不存在的vite.svg引用）
- ✅ E2E测试改进: STU201-STU202通过，可以成功查看10个已发布练习活动
- 🚧 答题流程测试STU203-205失败（原因：测试活动缺少题目配置，非代码问题）

### 2025-10-31 (上午)
- ✅ **学生注册工作流测试全部修复完成** - REG103-REG109（7个测试）100%通过
- ✅ 修复后端authMiddleware导入语法错误
- ✅ 实现管理员审核页面搜索功能（按手机号/姓名搜索）
- ✅ 修复校级管理员权限过滤逻辑
- ✅ 修复4个测试验证逻辑问题（REG106, REG107, REG108, REG109）
- ✅ 完成学生注册到登录完整E2E测试覆盖

### 2025-10-30
- ✅ 完成学生答题与教师评卷功能 - 13个API接口，5个前端页面，自动评分服务
- ✅ 个人成长系统前端（Mock数据）
- ✅ 学生界面优化（移除证书申请/验证）

### 2025-10-28
- ✅ 学生自主注册系统 - 学生注册前端完成，API测试68%通过

### 2025-10-25
- ✅ 修复ACT130测试用例，完善权限系统
- ✅ 创建开发最佳实践文档

### 2025-10-21
- ✅ E2E测试体系完善，100%通过率（41/41测试）
- ✅ 活动管理系统完成

---

### 2025-01-21
- ✅ **题库管理筛选条件热更新优化**
  - **问题**: 点击筛选子选项时无法热更新，需要手动刷新页面
  - **原因分析**:
    1. 筛选条件变化时没有重置页码，导致用户可能在非第一页看不到新筛选结果
    2. 缺少防抖机制，快速切换选项时可能产生多次不必要的API请求
    3. 年级选择器状态可能不同步
  - **优化措施**:
    1. 添加 `useCallback` 创建稳定的 `loadQuestions` 函数
    2. 创建 `updateFiltersWithReset` 函数，统一处理筛选条件更新和页码重置
    3. 所有筛选条件（科目、年级、难度、题型、区县、范围）变化时自动重置到第一页
    4. 科目变化时自动清空年级选择
    5. 重置筛选按钮增加 `selectedDistrictCode` 清理
  - **修改文件**:
    - `frontend/src/pages/teacher/QuestionBankPage.tsx`
      - 新增 `useRef`, `useCallback` 导入
      - 新增 `debounceTimerRef` 防抖定时器引用
      - `loadQuestions` 使用 `useCallback` 包装
      - 新增 `updateFiltersWithReset` 统一筛选更新函数
      - 所有筛选器 onChange 使用新函数
  - **状态**: ✅ 完成，前端构建成功

- ✅ **我的提交页面重新提交审核按钮** - 已完成
  - 功能: 在"我的提交"表格中为被拒绝的记录添加"重新提交审核"按钮
  - 修改文件: `frontend/src/pages/teacher/MySubmissionsPage.tsx`
  - 状态: ✅ 完成

- ✅ **修复审核历史403权限错误** - 已完成
  - 问题: 前端调用历史API时使用了错误的ID字段
  - 原因: 后端 `getMySubmissions` 返回的 `id` 字段是 `draft_id`，应该使用 `submission_id`
  - 修复: 前端使用 `question.submission_id` 调用历史API
  - 状态: ✅ 完成

---

### 2026-01-23
- ✅ **补全缺失的区县级管理员账号**
  - 创建 `huaxi_admin` (花溪区教育局管理员) 和 `wudang_admin` (乌当区教育局管理员)
  - 更新 `docs/DEMO_GUIDE.md` 文档，移除"暂无"警告
  - 当前区县级管理员数量: 12 (全覆盖)

- ✅ **组卷功能Bug修复** - 教师组卷页面
  - **Bug 1**: 题目分数和显示 "NaN 分"
    - 原因: API返回的score是字符串类型，JavaScript进行字符串拼接
    - 修复: 使用 `Number()` 转换分数值
    - 文件: `frontend/src/pages/teacher/PaperGenerationPage.tsx`
  - **Bug 2**: 创建活动设置的总分被题目总分覆盖
    - 原因: 数据库触发器 `update_activity_paper_stats()` 自动更新 total_score
    - 修复:
      - 修改触发器只更新 question_count，保留用户设置的 total_score
      - 后端添加 `actual_total_score` 字段返回实际题目分数和
      - 前端使用后端提供的 actual_total_score
    - 文件:
      - `database/migrations/039_fix_activity_total_score_trigger.sql`
      - `backend/src/models/ActivityQuestion.js`
      - `frontend/src/pages/teacher/PaperGenerationPage.tsx`

- ✅ **学生答题页面UI优化和Bug修复** - 已完成
  - **UI优化**:
    - 添加左侧题目导航（答题卡），5列网格布局
    - 按题型分组显示（单选题、多选题、填空题、主观题、编程题）
    - 提交按钮移至页面顶部
    - 已答题显示绿色，当前题高亮
    - 字体大小优化：题目18px，选项17px
    - 紧凑布局，答题卡自适应宽度
    - 隐藏题目难度显示
  - **Bug修复**:
    - **Bug 1**: 选择题目时其他题目同步被选中
      - 原因: React key冲突 + field name重复
      - 修复: 使用 `q_${index}_${question.id}` 确保字段名绝对唯一
      - Radio/Checkbox key改为 `${index}-${optIndex}`
    - **Bug 2**: 答题卡标记错误（刷新后消失、点击一题全标记）
      - 原因: `updateAnsweredTracking` 没有正确获取表单值
      - 修复: `handleFormChange` 显式传递 `allValues` 给跟踪函数
    - **Bug 3**: 答题时出现400后端错误
      - 原因: `autoSaveAnswers()` 函数每次表单变化都调用后端API
      - 修复: 完全移除自动保存逻辑，只使用localStorage备份
  - **文件**: `frontend/src/pages/student/TakeActivityPage.tsx`
  - **状态**: ✅ 已完成，待用户验证

---

### 2026-02-03
- ✅ **完整流程测试 - 学生登录和答题流程修复**
  - **修复内容**:
    1. 删除重复用户数据（ID 19-22与12-13重复）
    2. 将学生username更新为手机号（支持手机号登录）
    3. 修复密码hash格式（用户13）
    4. 修复STORAGE_STATE配置（test-config.ts改为对象格式）
    5. 修复auth.setup.ts中storageState引用
  - **测试结果**: 7/8测试通过
    - ✅ 学生认证 (auth.setup.ts)
    - ✅ STU201 - 学生访问练习中心
    - ✅ STU202 - 查看测试活动
    - ✅ STU203 - 开始答题
    - ✅ STU204 - 填写答案
    - ✅ STU205 - 提交答案
    - ⚠️ STU206 - 查看结果（因测试顺序问题，在提交前运行）
  - **测试数据**:
    - 测试活动ID: 320
    - 题目编码: LIFE2602010671
    - 学生账号: 13900139002 / password123
  - **文件修改**:
    - `tests/e2e/test-config.ts` - STORAGE_STATE改为对象格式
    - `tests/e2e/auth.setup.ts` - 修复storageState引用
    - `tests/e2e/regression/lifecycle-student-test.spec.ts` - 修复选择器语法
    - `tests/docs/完整流程测试报告.md` - 更新测试记录
  - **状态**: ✅ 学生登录和答题流程已验证正常

---

### 2026-02-26
- ✅ **项目整理 - 清理过期文件和备份**
  - **删除备份文件**:
    - `backend/src/models/QuestionBank.js.backup_20251122`
    - `backend/src/routes/questionBank.js.backup_20251122`
    - `backend/src/models/QuestionBank.js.bak`
    - `backend/tests/api/fixtures/test_questions.csv`
  - **清理临时文件**:
    - `backend/combined.log`
    - `backend/error.log`
    - `tests/test-results/*`
  - **新增文档**:
    - `docs/TEST_CLEANUP_REPORT.md` - 测试缺失分析报告
    - `docs/archive/README.md` - 归档文档索引（35个文件）
  - **测试状态分析**:
    - E2E测试: 42个文件正常运行
    - API测试: 45个文件正常运行
    - 缺失测试: 30+项（详见TEST_CLEANUP_REPORT.md）
  - **提交记录**:
    - `f07d805` chore: remove backup files and test fixtures
    - `9a51288` docs: add test cleanup report and archive index
  - **状态**: ✅ 项目整理完成

---

*最后更新时间：2026-02-26*
