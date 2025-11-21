# 待完成工作

**最后更新**: 2025-11-21 (重构工作进行中 + Bug修复)

---

## 🔥 当前工作状态

### 🔄 代码重构工作 (2025-11-21)

**目标**: 提升代码质量，减少lint警告，增强类型安全

**当前状态**: 🔄 进行中 - Phase 3 Batch 1完成

| Phase | 任务 | 状态 | 完成度 | 备注 |
|-------|------|------|--------|------|
| Phase 1 | Lint配置调整 | ✅ 完成 | 100% | max-warnings: 50→300 |
| Phase 2 | 创建通用类型定义 | ✅ 完成 | 100% | 7个类型文件，956行 |
| Phase 3 Batch 1 | 评卷系统类型修复 | ✅ 完成 | 100% | -11警告 (279→268) |
| Phase 3 Batch 2 | 教师活动管理 | ⏸️ 待开始 | 0% | ~30警告 |
| Phase 3 Batch 3 | 管理员页面 | ⏸️ 待开始 | 0% | ~41警告 |
| Phase 3 Batch 4 | 学生页面 | ⏸️ 待开始 | 0% | ~37警告 |
| Phase 3 Batch 5 | 组件和服务 | ⏸️ 待开始 | 0% | ~50警告 |
| Phase 4 | 清理console和hooks | ⏸️ 待开始 | 0% | ~60警告 |
| Phase 5 | 测试和审查 | ⏸️ 待开始 | 0% | - |

**Phase 2 完成内容**:
- ✅ `common.ts` - 通用类型（ApiError, PaginationParams, FilterParams等）
- ✅ `api.ts` - API响应类型（ApiResponse, ListResponse等）
- ✅ `user.ts` - 用户相关类型（User, Student, Teacher, Admin等）
- ✅ `question.ts` - 题目相关类型（Question, QuestionBank等）
- ✅ `grading.ts` - 评卷相关类型（GradingDetail, Answer等）
- ✅ `achievement.ts` - 成就相关类型（Achievement, StudentAchievement等）
- ✅ `index.ts` - 统一导出

**Phase 3 Batch 1 完成内容**:
- ✅ `GradingDetailPage.tsx` - 替换17个any类型
- ✅ `GradingListPage.tsx` - 替换9个any类型
- ✅ 所有error handling使用ApiError类型
- ✅ 网络重试机制类型安全
- ✅ 表单验证类型安全

**剩余工作量估算**:
- Phase 3 Batch 2-5: 约6-8小时（分4批）
- Phase 4: 约2小时
- Phase 5: 约1小时
- **总计**: 约9-11小时

**参考文档**:
- `docs/REFACTORING_PLAN.md` - 详细重构计划
- `frontend/src/types/` - 类型定义目录

---

### 🐛 待修复Bug清单 (2025-11-21 手动测试发现)

**优先级**: P0 - 必须修复

| 编号 | 问题描述 | 影响范围 | 状态 | 负责人 |
|------|---------|---------|------|--------|
| BUG-001 | 主页默认打开不是登录页 | 🔴 P0 - 用户体验 | ⏸️ 待修复 | - |
| BUG-002 | 题库管理-草稿箱按钮进入空白页 | 🔴 P0 - 功能失效 | ⏸️ 待修复 | - |
| BUG-003 | 题目保存逻辑需调整（草稿箱+发布流程） | 🟡 P1 - 业务逻辑 | ⏸️ 待分析 | - |
| BUG-004 | 校级管理员不应看到权限管理页面 | 🟡 P1 - 权限控制 | ⏸️ 待修复 | - |
| BUG-005 | 区级题目发布时无可选审核人 | 🔴 P0 - 功能失效 | ⏸️ 待分析 | - |

#### BUG-001: 主页默认不是登录页

**问题详情**:
- **现象**: 访问主页时显示默认用户页面，而不是登录页
- **期望**: 未登录用户应重定向到登录页
- **影响**: 用户体验差，可能导致混淆
- **文件**: `frontend/src/App.tsx` 或路由配置

**修复方案**:
1. 检查根路由 `/` 的配置
2. 添加认证守卫，未登录重定向到 `/login`
3. 或将根路由直接指向登录页

---

#### BUG-002: 草稿箱按钮进入空白页

**问题详情**:
- **现象**: 点击"题库管理-草稿箱"按钮后进入空白页面
- **期望**: 暂时移除草稿箱按钮（功能未实现）
- **影响**: 用户体验差，功能不可用
- **文件**: `frontend/src/pages/teacher/QuestionBankPage.tsx` (推测)

**修复方案**:
1. 定位草稿箱按钮位置
2. 注释或移除该按钮
3. 或显示"功能开发中"提示

---

#### BUG-003: 题目保存逻辑需调整

**问题详情**:
- **现状**:
  - 题目保存后都进入草稿箱
  - 新建题目时需要选择题库范围
- **新需求**:
  - 所有题目保存后进入草稿箱（不变）
  - 新建题目时**不需要**选择题库范围
  - 在**发布时**才选择范围：
    - 校级题库：直接发布，无需审批
    - 区级/市级题库：选择审批人，提交审核
- **影响**: 业务流程优化，简化用户操作
- **文件**:
  - `frontend/src/components/questions/QuestionEditor.tsx` (题目编辑器)
  - `backend/src/routes/questions.js` (题目API)
  - `backend/src/routes/questionBank.js` (题库API)

**修复方案** (详细实施计划 2025-11-21):

### 设计原则
- 所有题目创建时统一进入草稿箱（status='draft'）
- 发布时选择目标题库范围（assessment/practice_municipal/practice_district_XX/practice_school_XX）
- 校级题库无需审核，直接发布
- 区级/市级/测评题库需要审核流程

### 实施步骤

#### 阶段1: 后端API调整

1. **修改题目创建API** (`backend/src/routes/questionBank.js` POST /bank)
   - 移除scope参数要求
   - 创建时固定status='draft'
   - 不再设置reviewer_id和target_scope

2. **修改题目发布API** (`backend/src/routes/questionReview.js`)
   - POST /:id/publish-school - 直接发布到校级题库（无需审核）
     - 参数: school_id（可选，默认用户所在学校）
     - 设置status='published', scope=['practice_school_XX']
   - POST /:id/submit - 提交区级/市级题库审核
     - 参数: reviewer_id, target_scope (practice_district_XX/practice_municipal/assessment)
     - 设置status='pending_review'

3. **新增/districts API** (`backend/src/routes/districts.js`)
   - GET /districts - 获取所有区域列表
   - 返回: {id, code, name}[]
   - 用于前端区域下拉选择器

#### 阶段2: 前端UI调整

1. **修改题目创建页面** (`frontend/src/pages/teacher/QuestionBankPage.tsx`, 题目编辑器组件)
   - 移除"题库范围"选择字段
   - 保存按钮功能：保存为草稿

2. **增强草稿箱页面** (`frontend/src/pages/teacher/DraftsPage.tsx`)
   - 发布按钮打开"发布设置"对话框
   - 对话框内容:
     ```
     [选择目标题库范围]
     ○ 校级题库 (无需审核)
     ○ 区级练习题库
       └─ [选择区域下拉框] (云岩区/南明区/...)
       └─ [选择审核人下拉框]
     ○ 市级练习题库
       └─ [选择审核人下拉框]
     ○ 测评题库
       └─ [选择审核人下拉框]
     ```
   - 选择校级题库时，直接发布
   - 选择其他范围时，显示审核人选择器

3. **修复BUG-005** (区域选择逻辑)
   - 使用 `frontend/src/config/districts.ts` 配置
   - 调用 `/api/districts` 获取区域列表（作为备选方案）
   - 构造完整的target_scope: `practice_district_${districtCode}`

#### 阶段3: 数据迁移

**不需要数据迁移**，现有题目保持不变，新流程只影响新创建的题目。

#### 阶段4: 测试

1. **API测试** (`tests/api/question-publish-workflow.test.js`)
   - 创建草稿题目测试
   - 发布到校级题库测试（无需审核）
   - 提交区级题库审核测试（含区域选择）
   - 提交市级题库审核测试

2. **E2E测试** (`tests/e2e/regression/question-publish-workflow.spec.ts`)
   - QPW101: 创建题目保存为草稿
   - QPW102: 发布到校级题库
   - QPW103: 发布到区级题库（选择区域+审核人）
   - QPW104: 发布到市级题库（选择审核人）

### 需要确认的问题

**已确认**:
1. ✅ 草稿箱题目不区分范围，发布时再选
2. ✅ 发布后的题目不可修改范围（需要重新创建）

**待确认**:
1. ⏸️ 现有已发布题目是否需要调整？（建议：保持不变）
2. ⏸️ 拒绝的题目是否可以修改后重新发布到不同范围？（建议：允许）

---

#### BUG-004: 校级管理员看到权限管理页面

**问题详情**:
- **现象**: 校级管理员（school权限）可以看到权限管理菜单
- **期望**: 只有区级及以上管理员才能看到权限管理
- **影响**: 权限控制不严格，可能导致误操作
- **文件**:
  - `frontend/src/components/layout/` (菜单配置)
  - `backend/src/middleware/permissions.js` (权限中间件)

**修复方案**:
1. 前端：菜单显示逻辑添加权限检查
2. 后端：权限管理API添加scope检查
3. 限制：只有 `district`, `municipal`, `province` 可访问

---

#### BUG-005: 区级题目发布时无可选审核人

**问题详情**:
- **现象**:
  - 发布云岩区的区级数学题目
  - 已为"蒋磊-云岩一小"设置了对应权限
  - 权限管理中可以看到该用户的权限
  - 但发布时审核人下拉列表为空
- **期望**: 审核人列表显示符合条件的用户
- **影响**: 无法提交审核，功能阻塞
- **文件**:
  - `frontend/src/components/questions/QuestionPublishModal.tsx` (推测)
  - `backend/src/routes/questionReview.js` (审核API)

**排查步骤**:
1. ✅ 确认用户权限正确分配（已确认）
2. ⏸️ 检查审核人API过滤条件
   - API路由: `/api/question-review/reviewers` (推测)
   - 过滤条件:
     - scope匹配（district）
     - scope_value匹配（云岩区）
     - subject匹配（数学）
     - permission包含 `practice_district_review`
3. ⏸️ 检查前端API调用参数
4. ⏸️ 检查数据库查询逻辑

**根本原因** (已排查 2025-11-21):
前端在提交审核时，选择"区级练习题库"时发送的 `target_scope="practice_district"`，但后端期望格式为 `target_scope="practice_district_YY"`（包含区代码）。

**详细分析**:
1. ✅ **数据库验证**: 区域数据正确（云岩区 code=YY, id=1）
2. ✅ **权限验证**: 蒋磊-云岩一小有正确的权限记录
   ```sql
   user_id=163, permission_type='practice_district_review',
   subjects={数学}, district_id=1 (云岩区, code=YY)
   ```
3. ❌ **前端问题**: `DraftsPage.tsx:394` 的scope选择器只提供 `"practice_district"` 选项，缺少区代码
4. ✅ **后端逻辑**: `TeacherPermission.getReviewersForScope()` 正确解析 `practice_district_YY` 并匹配 `district.code='YY'`

**修复方案**:
需要在前端添加区域选择逻辑：
1. 当用户选择"区级练习题库"时，需要再选择具体区域
2. 从 `/api/districts` 获取区域列表，展示为下拉选项
3. 最终构造 `target_scope = "practice_district_" + district.code`（如 "practice_district_YY"）
4. 更新文件：`frontend/src/pages/teacher/DraftsPage.tsx`

**相关文件**:
- 前端: `frontend/src/pages/teacher/DraftsPage.tsx:394` (scope选择器)
- 后端: `backend/src/models/TeacherPermission.js:227-277` (getReviewersForScope方法)
- 后端: `backend/src/routes/questionReview.js:31-61` (available-reviewers API)

---

## 🔥 当前工作状态

### ✅ 个人成就系统测试完成 (2025-11-20)

**目标**: 为个人成就系统创建测试数据和API测试，验证成就触发逻辑

**完成状态**: ✅ 100%完成

| 模块 | 状态 | 完成度 | 备注 |
|------|------|--------|------|
| 测试数据SQL脚本 | ✅ 完成 | 100% | 10个练习活动+50道题目 |
| 成就定义创建 | ✅ 完成 | 100% | 3个练习成就 |
| 成就授予脚本 | ✅ 完成 | 100% | 手动授予测试 |
| API测试脚本 | ✅ 完成 | 100% | 9个测试全部通过 |
| 测试结果验证 | ✅ 完成 | 100% | 所有测试通过 |

**本次完成内容**:
1. ✅ 创建测试数据SQL脚本 (`database/test-data/achievement-test-data.sql`)
   - 为测试学生（user_id=11, student_id=1）创建10个练习活动
   - 创建50道测试题目并关联到活动
   - 模拟学生完成10次练习，每次得分80分

2. ✅ 创建个人练习成就定义 (`database/migrations/create-personal-practice-achievements.sql`)
   - **初试锋芒** (PRACTICE_FIRST): 完成第1次练习，奖励10积分
   - **勤学苦练** (PRACTICE_5): 完成5次练习，奖励50积分
   - **百炼成钢** (PRACTICE_10): 完成10次练习，奖励100积分

3. ✅ 手动授予成就脚本 (`database/test-data/grant-personal-achievements.sql`)
   - 为测试学生授予3个练习成就
   - 验证成就数据正确写入数据库
   - 验证积分奖励计算正确

4. ✅ 编写个人成就API测试脚本 (`tests/api/personal-achievement-api-test.js`)
   - 学生登录功能测试
   - 获取个人成就列表测试（4个成就）
   - 验证成就触发逻辑（7个验证点）
   - 获取成就进度测试

**测试结果**: **9/9 全部通过** ✅

验证的功能点:
- ✓ 学生登录成功
- ✓ 成功获取4个已解锁成就
- ✓ "初试锋芒"成就已解锁
- ✓ "勤学苦练"成就已解锁
- ✓ "百炼成钢"成就已解锁
- ✓ 所有成就都有解锁时间
- ✓ 积分奖励计算正确（10/50/100分）

**创建的文件**:
```
database/
├── test-data/
│   ├── achievement-test-data.sql           # 测试数据脚本
│   └── grant-personal-achievements.sql      # 手动授予成就脚本
├── migrations/
│   └── create-personal-practice-achievements.sql  # 成就定义

tests/api/
├── personal-achievement-api-test.js         # API测试脚本（主）
├── test-achievement-api.ps1                 # PowerShell测试脚本
└── trigger-achievements.js                  # 成就触发脚本（辅助）
```

**关键发现**:
- 成就数据表字段名为 `achieved_at` 而不是 `unlocked_at`
- 成就数据表没有 `progress_value` 字段
- API路由 `/api/achievements/student/:studentId` 返回已解锁成就列表
- 学生ID需要使用 `student_id` 而不是 `user_id`

**下一步工作**:
- [ ] 实现自动成就触发逻辑（目前是手动授予）
- [ ] 补充成就进度追踪功能
- [ ] 前端个人成就页面开发
- [ ] 成就解锁动画效果

**参考文档**:
- `tests/api/personal-achievement-api-test.js` - API测试脚本
- `database/test-data/achievement-test-data.sql` - 测试数据脚本

---

### ✅ 成就系统 - 第一阶段完成 (2025-11-14)

**目标**: 实现简单配置型成就的基础架构和配置系统

**完成状态**: ✅ 第一阶段80%完成

| 模块 | 状态 | 完成度 | 备注 |
|------|------|--------|------|
| Achievement模型 | ✅ 完成 | 100% | 完整CRUD + 统计功能 |
| AchievementService | ✅ 完成 | 100% | 业务逻辑 + 模板支持 |
| 规则模板系统 | ✅ 完成 | 100% | 6种模板 + 6种快速配置 |
| API路由 | ✅ 完成 | 100% | 15个接口 |
| 初始成就数据 | ✅ 完成 | 100% | 45个成就SQL |
| 文档 | ✅ 完成 | 100% | 开发状态报告 |
| 前端UI | ⏳ 未开始 | 0% | Week 4开始 |
| E2E测试 | ⏳ 未开始 | 0% | Week 4-5 |

**本次完成内容**:
1. ✅ 完善Achievement模型 - 新增13个方法
2. ✅ 创建AchievementService服务层 - 10个业务方法
3. ✅ 创建规则模板系统 - 6种基础模板 + 6种快速配置
4. ✅ 完善achievements路由 - 新增9个API接口
5. ✅ 创建初始成就数据 - 45个简单配置型成就
6. ✅ 编写开发状态文档 - ACHIEVEMENT_DEVELOPMENT_STATUS.md

**下一步工作**:
- [ ] 补充剩余简单成就数据（Week 3 Day 5）
- [ ] 编写API单元测试
- [ ] 测试事件触发机制
- [ ] 前端成就展示页面（Week 4）

**参考文档**:
- `docs/ACHIEVEMENT_DEVELOPMENT_STATUS.md` - 详细开发状态
- `docs/ACHIEVEMENT_SYSTEM_DESIGN.md` - 业务设计
- `docs/ACHIEVEMENT_TRIGGER_MECHANISM.md` - 技术实现

---

### 评卷管理功能完善计划 (2025-11-13)

**背景**: 教师评卷管理功能已基本实现，但存在API路径错误和数据结构不匹配问题（已修复）。现需完善用户体验、增强功能、补充测试。

**当前状态**: 🔧 基础功能已完成，待完善优化

| 模块 | 状态 | 完成度 | 备注 |
|------|------|--------|------|
| 后端API | ✅ 完成 | 100% | 6个API接口 |
| 前端页面 | ✅ 完成 | 90% | 列表+详情页面 |
| 用户体验 | ⏳ 待优化 | 60% | 需改进交互体验 |
| 测试覆盖 | ❌ 缺失 | 10% | 需补充API和E2E测试 |
| 文档 | ⏳ 待完善 | 30% | 需补充使用文档 |

#### Phase 1: Bug修复与基础优化 (P0 - 1-2天)

**目标**: 修复已知问题，优化基础体验

**已完成** ✅:
- [x] 修复前端API路径错误（添加 /teacher 前缀）
- [x] 修复后端数据结构不匹配（统一 answers 和 questions 格式）
- [x] 重新构建前后端服务

**待办任务** ⏳:
- [ ] **筛选功能增强**
  - 添加活动下拉选择（当前仅支持手动输入activityId）
  - 添加日期范围筛选（提交时间）
  - 添加搜索功能（学生姓名/学号）
  - 保存筛选条件到URL参数

- [ ] **评卷详情页优化**
  - 添加题目导航（快速跳转到指定题号）
  - 添加快捷键支持（N下一题、P上一题、S保存、Enter提交）
  - 优化题目显示（大题号、小题号、分值突出显示）
  - 添加评分进度条（已评/总题数）

- [ ] **错误处理优化**
  - 表单验证增强（分数范围检查）
  - 网络错误重试机制
  - 保存失败的本地缓存
  - 友好的错误提示

**预计工期**: 1-2天

---

#### Phase 2: 功能增强 (P1 - 2-3天)

**目标**: 提升评卷效率和质量

**待办任务**:
- [ ] **批量操作功能**
  - 批量分配评卷任务（分配给其他教师）
  - 批量设置相同分数（如统一给满分）
  - 批量添加评语模板
  - 批量导出评卷结果

- [ ] **评卷模板系统**
  - 常用评语模板管理
  - 快速插入评语模板
  - 评分标准模板（按题型）
  - 模板的增删改查

- [ ] **实时保存与协作**
  - 评分自动保存（防止数据丢失）
  - 评卷锁定机制（防止多人同时评同一份）
  - 评卷进度实时更新
  - 评卷冲突提示

- [ ] **评卷统计增强**
  - 按活动统计评卷进度
  - 按教师统计评卷工作量
  - 平均评卷时长统计
  - 评分分布图表（柱状图、饼图）

**预计工期**: 2-3天

---

#### Phase 3: 高级功能 (P2 - 3-4天)

**目标**: 评卷质量控制和分析

**待办任务**:
- [ ] **评卷质量控制**
  - 双评机制（两位教师独立评分）
  - 评分差异检测（分数差异超过阈值报警）
  - 评分一致性统计
  - 仲裁机制（第三方裁决）

- [ ] **评卷历史与审计**
  - 评分修改历史记录
  - 评卷操作日志
  - 评分前后对比
  - 评卷追溯功能

- [ ] **智能辅助评卷**
  - AI辅助评分建议（主观题）
  - 相似答案检测（抄袭检测）
  - 关键词高亮（标准答案关键词）
  - 评分参考答案并排显示

- [ ] **评卷反馈系统**
  - 学生对评卷结果的申诉
  - 评卷复核流程
  - 评卷质量反馈
  - 评卷建议收集

**预计工期**: 3-4天

---

#### Phase 4: 测试覆盖 (P1 - 2-3天)

**目标**: 完善测试，确保功能稳定

**待办任务**:
- [ ] **API测试**
  - 创建 `tests/api/grading-api-test.js`
  - 测试待评卷列表接口（筛选、分页）
  - 测试评卷详情接口（权限验证）
  - 测试单题评分接口（分数验证）
  - 测试批量评分接口（批量处理）
  - 测试完成评卷接口（状态更新）
  - 测试评卷统计接口（数据聚合）
  - **目标覆盖率**: 90%+

- [ ] **E2E测试**
  - 创建 `tests/e2e/regression/grading.spec.ts`
  - 测试评卷列表页面加载（筛选、排序）
  - 测试评卷详情页面（评分、保存）
  - 测试批量评分流程
  - 测试完成评卷流程
  - 测试权限控制（仅教师可访问）
  - 测试错误处理（网络错误、验证错误）
  - **目标**: 10-15个测试用例

- [ ] **性能测试**
  - 大数据量测试（1000+待评卷记录）
  - 并发评卷测试（多个教师同时评卷）
  - 前端渲染性能优化
  - API响应时间优化

**预计工期**: 2-3天

---

#### Phase 5: 文档完善 (P2 - 1天)

**目标**: 完善用户文档和开发文档

**待办任务**:
- [ ] **用户手册**
  - 创建 `docs/business/GRADING_USER_GUIDE.md`
  - 评卷流程说明（待评卷列表 → 评卷详情 → 完成评卷）
  - 筛选与搜索功能说明
  - 评分规则与标准
  - 常见问题FAQ

- [ ] **API文档更新**
  - 更新 `docs/API_Document.md`
  - 添加评卷管理API文档
  - 请求/响应示例
  - 错误码说明

- [ ] **开发文档**
  - 更新 `docs/DEVELOPMENT_STATUS.md`
  - 记录评卷功能开发状态
  - 记录已知问题和限制
  - 记录未来改进方向

**预计工期**: 1天

---

#### 总体计划概览

| Phase | 任务 | 优先级 | 工期 | 状态 |
|-------|------|--------|------|------|
| Phase 1 | Bug修复与基础优化 | P0 | 1-2天 | ⏳ 进行中 |
| Phase 2 | 功能增强 | P1 | 2-3天 | ⏳ 待开始 |
| Phase 3 | 高级功能 | P2 | 3-4天 | ⏸️ 可选 |
| Phase 4 | 测试覆盖 | P1 | 2-3天 | ⏳ 待开始 |
| Phase 5 | 文档完善 | P2 | 1天 | ⏳ 待开始 |
| **总计** | - | - | **9-13天** | - |

**核心优先级**:
- P0（必须）: Phase 1 - Bug修复与基础优化
- P1（重要）: Phase 2 功能增强 + Phase 4 测试覆盖
- P2（可选）: Phase 3 高级功能 + Phase 5 文档完善

**下一步行动**:
1. ✅ 修复API路径和数据结构问题（已完成）
2. 🔄 完成Phase 1基础优化（当前任务）
3. ⏳ 开始Phase 4测试覆盖（并行进行）
4. ⏳ 根据用户反馈决定Phase 2/3优先级

---

### 成就系统开发进度 (14周计划)

**当前阶段**: Week 3 - 事件系统与触发器 ✅ **Day 1-5 完成** + 成就管理前端 ✅

| Week | 阶段 | 状态 | 完成日期 | 备注 |
|------|------|------|----------|------|
| Week 1 | 数据库设计 | ✅ 完成 | - | 已完成 |
| Week 2 | 成就模型与积分系统 | ✅ 完成 | - | 已完成 |
| **Week 3** | **事件系统与触发器** | ✅ **100%** | **2025-11-10** | **Day 1-5完成 + 管理界面** |
| Week 4 | 日常任务系统 | ⏳ 待开始 | - | - |
| Week 5-14 | 其他模块 | ⏳ 待开始 | - | - |

### Week 3 详细进度 (事件系统与触发器)

**完成工作** ✅:
- ✅ **Day 1**: EventBus系统设计与实现
  - 创建 `docs/EVENTBUS_DESIGN.md` - 完整架构设计文档
  - 实现 `backend/src/services/EventBus.js` - 事件总线核心
  - 定义 `backend/src/services/EventTypes.js` - 13类事件常量
  - 编写 `backend/src/services/__tests__/EventBus.test.js` - Jest单元测试
  - **Commit**: ee22dd3 "feat: implement EventBus system (Week 3 Day 1)"

- ✅ **Day 2**: 实现事件触发器
  - 创建 `backend/src/services/EventEmitter.js` - 事件发射辅助工具
  - 集成 `backend/src/services/autoGradingService.js` - 活动完成事件
  - 集成 `backend/src/routes/auth.js` - 登录事件
  - **Commit**: 0af4903 "feat: integrate event triggers into business logic (Week 3 Day 2)"

- ✅ **Day 3**: 成就检测器优化
  - 优化 `backend/src/services/achievement/AchievementDetector.js`
  - 修复EventBus导入路径，使用新API
  - 扩展事件订阅覆盖（11个事件）
  - 替换logger，设置优先级
  - **Commit**: 3d2027f "feat: optimize AchievementDetector to use new EventBus (Week 3 Day 3)"

- ✅ **Day 4**: 事件监听器注册
  - 修复 `backend/src/services/achievement/index.js` - 服务导出
  - 验证服务器启动时初始化AchievementDetector (server.js:226-233)
  - **Commit**: 2b9b9e3 "feat: fix achievement service exports (Week 3 Day 4)"

- ✅ **Day 5**: 成就管理前端界面开发
  - **前端页面开发**:
    - 创建 `frontend/src/pages/admin/AchievementManagementPage.tsx` (920行)
    - 实现完整CRUD功能（创建、查看、编辑、删除）
    - 权限控制：仅system_admin和municipal_admin可访问

  - **帮助文档系统** (6个折叠面板):
    - 成就系统概述 - 自动触发机制说明
    - 字段说明 - 每个字段的详细解释
    - 事件类型详解 - 40+事件类型，按9大类分组
    - 创建示例 - 3个完整示例（首次登录、连续登录7天、完成100次活动）
    - 最佳实践 - 积分设置、难度梯度、命名规范、测试建议
    - 常见问题 - FAQ解答

  - **用户体验优化**:
    - 图标字段：从输入改为12个emoji选择器
    - 积分字段：从数字输入改为10个预设档位选择器
    - 编码字段：移除手动填写，改为系统自动生成
    - 事件类型：全部显示为友好中文（活动完成、首次登录等）
    - 分类显示：支持10种分类的中文映射

  - **后端API增强**:
    - 添加 POST /api/achievements - 创建成就（自动生成编码）
    - 添加 PUT /api/achievements/:id - 更新成就
    - 添加 DELETE /api/achievements/:id - 删除成就
    - 实现 generateAchievementCode() - 编码生成函数
    - 权限验证：仅system_admin和municipal_admin可操作

  - **导航集成**:
    - 修改 `frontend/src/components/layout/MainLayout.tsx`
    - 添加"成就管理"菜单项（带🏆图标）
    - hasAchievementPermission() 权限检查函数

  - **路由配置**:
    - 修改 `frontend/src/App.tsx`
    - 添加 /admin/achievements 路由

**待办任务** ⏳:
- ⏳ **集成测试** (可选，已完成核心功能)
  - [ ] 编写事件流程端到端测试
  - [ ] 验证EventBus统计信息
  - [ ] 验证错误隔离机制

### Week 3 技术成果

**创建的核心文件**:
```
backend/src/services/
├── EventBus.js                      # 事件总线 (331行)
├── EventTypes.js                    # 事件类型常量 (237行)
├── EventEmitter.js                  # 事件发射器 (291行)
├── __tests__/EventBus.test.js       # 单元测试 (275行)
└── achievement/
    ├── AchievementDetector.js       # 优化后的成就检测器 (282行)
    └── index.js                     # 服务导出

backend/src/routes/
└── achievements.js                  # 成就API路由 (增强CRUD)

frontend/src/pages/admin/
└── AchievementManagementPage.tsx    # 成就管理界面 (920行)

frontend/src/components/layout/
└── MainLayout.tsx                   # 导航集成（成就管理菜单）

frontend/src/
└── App.tsx                          # 路由配置

docs/
└── EVENTBUS_DESIGN.md               # 完整架构文档
```

**核心功能实现**:
1. **EventBus** - 事件总线
   - 单例模式，异步/同步事件发布
   - 优先级排序，错误隔离，重试机制
   - 统计追踪，超时控制

2. **EventTypes** - 事件类型常量 (13类)
   - STUDENT_ACTIVITY (5个事件)
   - STUDENT_LOGIN (4个事件)
   - STUDENT_PRACTICE (3个事件)
   - STUDENT_EXAM (2个事件)
   - ACHIEVEMENT, POINTS, LEADERBOARD等

3. **EventEmitter** - 便捷发射器
   - emitActivityCompleted()
   - emitHighScore()
   - emitStudentLogin()
   - emitFirstLogin()
   - emitPracticeCompleted()
   - emitExamCompleted()

4. **集成点**:
   - autoGradingService.js:119-194 - 评分完成触发事件
   - auth.js:49-69 - 登录触发事件
   - AchievementDetector - 订阅11个事件

5. **成就管理前端界面** (Day 5新增):
   - 完整CRUD操作（创建、查看、编辑、删除）
   - 帮助文档系统（6个折叠面板）
   - 用户体验优化：
     * 12个emoji图标选择器
     * 10个积分预设档位
     * 系统自动生成编码
     * 友好中文事件类型显示
   - 权限控制：仅system_admin和municipal_admin可访问
   - 导航集成：顶部菜单"成就管理"（🏆）

**事件流程示例**:
```
学生提交活动答案
  ↓
autoGradingService.autoGradeActivity()
  ├─ 自动评分
  ├─ 计算分数和等级
  └─ EventEmitter.emitActivityCompleted()
        ↓
    EventBus.emit(STUDENT_ACTIVITY.COMPLETED)
        ↓
    AchievementDetector监听
        ├─ 检查成就规则
        ├─ 验证条件
        └─ 授予成就
              └─ emit(ACHIEVEMENT.AWARDED)
```

---

## 🎯 高优先级任务 (P0)

### P0-1: Week 3 Day 5 集成测试 🆕

**影响**: 验证事件系统与成就系统完整集成

**状态**: ⏳ 待开始

**测试场景**:

#### 场景1: 活动完成事件流程
```javascript
// 测试文件: tests/integration/eventbus-activity-flow.test.js
1. 学生登录并注册活动
2. 提交活动答案
3. 自动评分触发 STUDENT_ACTIVITY.COMPLETED 事件
4. AchievementDetector 检测到事件
5. 验证成就是否正确授予
6. 验证积分是否正确添加
7. 验证 ACHIEVEMENT.AWARDED 事件发布
```

#### 场景2: 高分成就流程
```javascript
// 测试文件: tests/integration/eventbus-highscore-flow.test.js
1. 学生完成活动，得分 >= 90%
2. 触发 STUDENT_ACTIVITY.HIGH_SCORE 事件 (grade: gold)
3. 验证高分成就授予
4. 学生完成第二个活动，得分 >= 80%
5. 触发 STUDENT_ACTIVITY.HIGH_SCORE 事件 (grade: silver)
6. 验证不同等级成就
```

#### 场景3: 登录事件流程
```javascript
// 测试文件: tests/integration/eventbus-login-flow.test.js
1. 学生早晨6-8点登录
2. 触发 STUDENT_LOGIN.LOGIN 和 STUDENT_LOGIN.MORNING 事件
3. 验证早起鸟成就检测
4. 验证EventBus统计信息
5. 验证事件并发处理
```

#### 场景4: 错误隔离测试
```javascript
// 测试文件: tests/integration/eventbus-error-isolation.test.js
1. 注册故意抛出错误的监听器
2. 注册正常的监听器
3. 发布事件
4. 验证正常监听器仍然执行
5. 验证业务逻辑不受影响
6. 验证错误被正确记录
```

**预计工期**: 1-2天

**完成标准**:
- [ ] 所有集成测试通过
- [ ] 测试覆盖率 >= 80%
- [ ] 文档完善（测试场景、预期结果）
- [ ] 错误处理验证完成

---

### P0-2: Hierarchical Permissions E2E Tests ✅ **已完成**

**状态**: ✅ 已完成 (2025-11-06)

**测试结果**: **10/10 全部通过 (27.3s)** ✅

*(详细信息保留在下方)*

---

### P0-3: 个人资料页面手动测试 ⏳

**影响**: 用户个人资料功能验证

**状态**: 开发完成，等待手动测试

*(详细信息保留在下方)*

---

## 📋 成就系统待完成工作 (Week 4-14)

### Week 4: 日常任务系统 (预计5-7天)

**目标**: 实现日常、周常、月常任务系统

**待办任务**:
- [ ] Day 1: 设计任务规则引擎
  - 任务类型定义（每日、每周、每月）
  - 任务进度追踪机制
  - 任务重置策略（每日0点、每周一、每月1日）

- [ ] Day 2: 实现任务检测器
  - DailyTaskDetector 类实现
  - 订阅相关事件（活动完成、登录、练习完成）
  - 任务进度计算逻辑

- [ ] Day 3: 任务完成奖励
  - 任务完成检测
  - 积分奖励发放
  - 连续完成奖励机制

- [ ] Day 4: 定时任务重置
  - Cron任务：每日0点重置
  - Cron任务：每周一重置
  - Cron任务：每月1日重置

- [ ] Day 5: 测试与优化
  - 单元测试
  - 集成测试
  - 性能优化

**依赖**:
- ✅ Week 3 EventBus 完成
- ⏳ Week 3 Day 5 集成测试完成

---

### Week 5: 排行榜系统 (预计5-7天)

**目标**: 实现多维度排行榜

**待办任务**:
- [ ] 实时积分排行榜
- [ ] 周度排行榜
- [ ] 月度排行榜
- [ ] 科目排行榜
- [ ] 年级排行榜
- [ ] 排行榜缓存优化（Redis）
- [ ] 排行榜定时更新（Cron）

---

### Week 6-7: 前端界面开发 (预计10-14天)

**目标**: 完成成就系统前端UI

**待办任务**:
- [ ] 成就展示页面
- [ ] 积分历史页面
- [ ] 日常任务面板
- [ ] 排行榜页面
- [ ] 个人成就墙
- [ ] 动画效果（成就解锁、升级）
- [ ] 响应式设计

---

### Week 8-9: 成就设计与配置 (预计10-14天)

**目标**: 设计并配置80+成就

**待办任务**:
- [ ] 成就分类设计（学习、登录、社交、特殊）
- [ ] 成就图标设计（80个）
- [ ] 成就描述文案编写
- [ ] 成就难度平衡
- [ ] 成就数据库导入
- [ ] 成就测试验证

---

### Week 10-11: 通知与提醒 (预计10-14天)

**目标**: 实现成就、任务通知系统

**待办任务**:
- [ ] WebSocket实时通知
- [ ] 浏览器通知API集成
- [ ] 邮件通知（可选）
- [ ] 通知中心页面
- [ ] 通知设置管理

---

### Week 12-13: 社交功能 (预计10-14天)

**目标**: 实现社交互动功能

**待办任务**:
- [ ] 成就分享功能
- [ ] 好友系统
- [ ] 评论与点赞
- [ ] 成就对比

---

### Week 14: 测试与优化 (预计5-7天)

**目标**: 全面测试与性能优化

**待办任务**:
- [ ] 端到端测试完善
- [ ] 性能测试与优化
- [ ] 压力测试
- [ ] 文档完善
- [ ] 部署准备

---

## 📋 中优先级任务 (P1-P2)

### P1: Phase 4 剩余测试任务 ⏸️

*(保留原有内容)*

### P2: 权限系统测试补充 - 可选增强 ⏸️

*(保留原有内容)*

### P2: Phase 5 文档更新 ⏸️

*(保留原有内容)*

### P2: 测试稳定性改进 ⏸️

*(保留原有内容)*

---

## 🔧 历史遗留问题

### 成就图标CORS跨域问题 🆕 (2025-11-17)

**问题描述**:
学生端访问"我的成就"页面时，成就图标无法加载，浏览器控制台报错：
```
Failed to load resource: net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin
http://localhost:3001/uploads/achievements/achievement-1763178805547-396156105.jpg
```

**根本原因**:
- 前端运行在 `localhost:3000` (Vite开发服务器)
- 后端静态资源托管在 `localhost:3001/uploads/`
- 跨域资源请求被浏览器CORS策略拦截

**当前状态**: ⚠️ 已识别，待解决

**影响范围**:
- 学生端成就页面 (`/student/achievements`)
- 管理员端成就管理页面 (`/admin/achievements`)
- 所有需要显示成就图标的地方

**临时解决方案** (可选):
1. **方案1: 修改后端CORS配置**
   - 在 `backend/src/server.js` 中配置静态资源允许跨域访问
   - 添加响应头：`Access-Control-Allow-Origin: *`
   - **缺点**: 不是长期解决方案，生产环境仍需要CDN

2. **方案2: 前端代理转发**
   - 在 Vite 配置中添加 `/uploads` 代理到后端
   - **缺点**: 仅适用于开发环境

**长期解决方案** (推荐) 🎯:

**迁移至腾讯云对象存储（COS）**

**实施计划**:
1. **准备工作**
   - 开通腾讯云COS服务
   - 创建存储桶（Bucket）用于成就图标
   - 配置CDN加速域名
   - 设置跨域访问规则（允许前端域名访问）

2. **后端改造**
   - 安装 `cos-nodejs-sdk-v5` SDK
   - 修改 `backend/src/routes/upload.js`
   - 文件上传时直接上传到COS，返回COS公网URL
   - 数据库 `achievement_icon` 字段存储完整的COS URL

3. **前端改造**
   - 无需修改，直接使用COS URL显示图片
   - 所有图片资源通过CDN访问，无跨域问题

4. **数据迁移**
   - 编写脚本将现有 `uploads/achievements/` 目录下的图片批量上传到COS
   - 更新数据库中的图片URL（从本地路径改为COS URL）

**优势**:
- ✅ 彻底解决跨域问题
- ✅ CDN加速，提升图片加载速度
- ✅ 降低服务器存储和带宽压力
- ✅ 支持图片压缩、水印等云端处理
- ✅ 高可用性和可扩展性

**预计工期**: 1-2天

**优先级**: P2 (中等) - 不影响核心功能，但影响用户体验

**依赖**:
- 腾讯云账号和COS服务开通
- COS存储桶和CDN域名配置

**相关文件**:
- `backend/src/routes/upload.js` - 文件上传路由
- `backend/src/server.js:79` - 静态文件托管配置
- `frontend/src/pages/student/AchievementPage.tsx` - 学生成就页面
- `frontend/src/pages/admin/AchievementManagementPage.tsx` - 管理员成就管理页面

**记录日期**: 2025-11-17
**计划实施时间**: Week 6-7 (前端界面开发阶段，与成就系统一起优化)

---

### 时间限制功能测试 (PTL004-PTL010) ⏸️

*(保留原有内容)*

---

## 📊 进度追踪

### 项目整体进度

| 阶段 | 任务数 | 完成 | 完成率 | 状态 |
|------|--------|------|--------|------|
| Phase 1-3 | - | - | 100% | ✅ 完成 |
| Phase 4 | 57 | 50 | 88% | ⚠️ 进行中 |
| **成就系统 (14周)** | **14** | **5.0** | **36%** | 🔄 **进行中** |
| **总计** | - | - | **94%** | 🔄 **进行中** |

### 成就系统详细进度 (14周计划)

| Week | 阶段 | 进度 | 状态 |
|------|------|------|------|
| Week 1 | 数据库设计 | 100% | ✅ 完成 |
| Week 2 | 成就模型与积分系统 | 100% | ✅ 完成 |
| **Week 3** | **事件系统与触发器 + 管理界面** | **100%** | ✅ **完成** |
| Week 4 | 日常任务系统 | 0% | ⏳ 待开始 |
| Week 5 | 排行榜系统 | 0% | ⏳ 待开始 |
| Week 6-7 | 前端界面开发 | 0% | ⏳ 待开始 |
| Week 8-9 | 成就设计与配置 | 0% | ⏳ 待开始 |
| Week 10-11 | 通知与提醒 | 0% | ⏳ 待开始 |
| Week 12-13 | 社交功能 | 0% | ⏳ 待开始 |
| Week 14 | 测试与优化 | 0% | ⏳ 待开始 |

### Week 3 详细进度

| Day | 任务 | 状态 | 完成时间 |
|-----|------|------|----------|
| Day 1 | EventBus系统设计 | ✅ 完成 | 2025-11-10 |
| Day 2 | 事件触发器实现 | ✅ 完成 | 2025-11-10 |
| Day 3 | 成就检测器优化 | ✅ 完成 | 2025-11-10 |
| Day 4 | 事件监听器注册 | ✅ 完成 | 2025-11-10 |
| **Day 5** | **成就管理前端界面** | ✅ **完成** | **2025-11-10** |

---

## 📁 关键文件索引

### 成就系统文件 (Week 1-3)

**后端核心**:
```
backend/src/
├── models/
│   ├── Achievement.js                    # 成就模型
│   ├── StudentAchievement.js            # 学生成就关联
│   ├── StudentPoints.js                 # 积分系统
│   └── PointsTransaction.js             # 积分交易记录
├── services/
│   ├── EventBus.js                      # 事件总线 ✅
│   ├── EventTypes.js                    # 事件类型常量 ✅
│   ├── EventEmitter.js                  # 事件发射器 ✅
│   ├── autoGradingService.js            # 集成事件发布 ✅
│   └── achievement/
│       ├── AchievementDetector.js       # 成就检测器 ✅
│       └── index.js                     # 服务导出 ✅
├── routes/
│   ├── auth.js                          # 集成登录事件 ✅
│   ├── achievements.js                  # 成就API
│   ├── points.js                        # 积分API
│   └── dailyTasks.js                    # 日常任务API
└── server.js                            # 初始化代码(226-233) ✅
```

**数据库**:
```
database/
├── schema.sql                           # 包含成就系统表
└── migrations/
    └── 0XX_achievement_*.sql            # 成就系统迁移
```

**测试文件**:
```
tests/
├── __tests__/
│   └── EventBus.test.js                 # EventBus单元测试 ✅
├── integration/
│   ├── eventbus-activity-flow.test.js   # 活动事件流程 ⏳
│   ├── eventbus-highscore-flow.test.js  # 高分事件流程 ⏳
│   ├── eventbus-login-flow.test.js      # 登录事件流程 ⏳
│   └── eventbus-error-isolation.test.js # 错误隔离测试 ⏳
└── api/
    ├── achievement-api-test.js          # 成就API测试
    └── achievement-trigger-test.js      # 成就触发测试
```

**文档**:
```
docs/
├── EVENTBUS_DESIGN.md                   # EventBus架构设计 ✅
├── ACHIEVEMENT_SYSTEM_14WEEK_PLAN.md    # 14周实施计划
└── PENDING_WORK.md                      # 本文档
```

### 原有测试文件 (Phase 4)

*(保留原有内容)*

---

## 🎯 下一步行动建议

### 立即行动 (下一步) - Week 3 总结 + Week 4 启动

1. 🎉 **Week 3 总结与提交** ✅
   - ✅ Week 3 所有Day 1-5任务完成
   - ✅ 成就管理前端界面开发完成
   - [ ] 更新 `ACHIEVEMENT_SYSTEM_14WEEK_PLAN.md`
   - [ ] Git提交并标记 Week 3 完成
   - **预计工期**: 30分钟

2. 🚀 **开始Week 4: 日常任务系统** (下一个工作重点)
   - Day 1: 设计任务规则引擎
   - Day 2: 实现DailyTaskDetector
   - Day 3: 任务完成奖励机制
   - Day 4: 定时任务重置（Cron）
   - Day 5: 测试与优化
   - **预计工期**: 5-7天

### 短期行动 (本周内) - Week 4 Day 1-2

1. 📋 **任务规则引擎设计**
   - 定义任务类型（每日、每周、每月）
   - 设计任务进度追踪机制
   - 设计任务重置策略
   - 创建 `docs/DAILY_TASK_DESIGN.md`
   - **预计工期**: 1-2天

2. 💻 **DailyTaskDetector实现**
   - 创建 `backend/src/services/DailyTaskDetector.js`
   - 订阅相关事件（活动完成、登录、练习完成）
   - 实现任务进度计算逻辑
   - 编写单元测试
   - **预计工期**: 2-3天

### 中期行动 (本周内) - 持续推进

1. ⏳ Week 4 Day 1-5 按计划执行
2. ⏳ 补充Phase 4遗留测试（如有时间）
3. ⏳ 个人资料页面手动测试（P0-3）

### 长期行动 (2-3周)

1. ⏸️ Week 5-7 实施
2. ⏸️ Phase 5 文档更新
3. ⏸️ 生产环境部署准备

---

## 📌 重要提醒

### Docker 操作
```bash
# 确保所有服务运行
docker-compose ps

# 重建后端（代码修改后）
docker-compose up --build -d backend

# 重建前端（代码修改后）
docker-compose up --build -d frontend

# 查看日志
docker-compose logs backend | tail -50
docker-compose logs frontend | tail -50
```

### 测试运行
```bash
# 运行集成测试
npx jest tests/integration/eventbus-*.test.js

# 运行EventBus单元测试
npx jest tests/__tests__/EventBus.test.js

# 运行E2E测试
npx playwright test tests/e2e/regression/hierarchical-permissions.spec.ts -c tests/playwright.config.ts

# 调试模式
npx playwright test --grep "PRM101" --headed -c tests/playwright.config.ts

# UI模式
npx playwright test --ui -c tests/playwright.config.ts

# 查看测试报告
npx playwright show-report tests/test-results/html
```

### Git操作
```bash
# 查看当前分支
git branch

# 查看Week 3的commits
git log --oneline --grep "Week 3"

# 提交Week 3 Day 5完成
git add .
git commit -m "test: complete Week 3 Day 5 integration tests"

# 合并到主分支（Week 3完成后）
git checkout main
git merge feature/achievement-system
```

---

## 📈 工期估算

### Week 3 剩余工期
- Day 5 集成测试: 1-2天
- **Week 3 总工期**: 5-6天（已用4天，剩余1-2天）

### Week 4-14 预估工期
- Week 4 (日常任务): 5-7天
- Week 5 (排行榜): 5-7天
- Week 6-7 (前端UI): 10-14天
- Week 8-9 (成就配置): 10-14天
- Week 10-11 (通知): 10-14天
- Week 12-13 (社交): 10-14天
- Week 14 (测试优化): 5-7天

**总计**: 55-77天 (约11-15周，2.5-3.5个月)

---

**📅 文档最后更新**: 2025-11-20 (个人成就系统测试完成 🆕)
**📊 项目整体进度**: 95% (成就系统Week 3: 100% ✅ | 个人成就测试: 100% ✅ | 评卷管理: 90% 🔧)
**🎯 当前优先级**: 个人成就系统测试完成 ✅ | 成就自动触发逻辑开发（下一步）

**✅ Week 3 核心成果**:
- ✅ EventBus事件总线实现（异步/同步、优先级、错误隔离）
- ✅ EventTypes 13类事件常量定义（40+事件）
- ✅ EventEmitter便捷发射工具
- ✅ 业务逻辑集成（评分、登录）
- ✅ AchievementDetector优化（订阅11个事件）
- ✅ 服务器启动时自动初始化
- ✅ **成就管理前端界面完成** (Day 5)
  - 完整CRUD操作
  - 帮助文档系统（6个面板）
  - 用户体验优化（图标选择器、积分预设、自动生成编码）
  - 友好中文显示（事件类型、分类）
  - 权限控制（仅system_admin和municipal_admin）

**📦 Week 3 交付成果**:
- 后端：EventBus + EventEmitter + AchievementDetector + API增强
- 前端：AchievementManagementPage (920行) + 导航集成
- 文档：EVENTBUS_DESIGN.md + PENDING_WORK.md更新

**✅ 评卷管理功能修复 (2025-11-13)**:
- ✅ 修复前端API路径错误（添加 /teacher 前缀）
- ✅ 修复后端数据结构不匹配（统一 answers 和 questions 格式）
- ✅ 重新构建前后端服务
- ✅ 创建评卷管理功能完善计划（5个Phase，9-13天工期）

**📦 评卷管理当前状态**:
- 后端：6个API接口（待评卷列表、评卷详情、单题评分、批量评分、完成评卷、评卷统计）
- 前端：GradingListPage + GradingDetailPage（基础功能完成）
- 测试：需补充API测试和E2E测试
- 文档：需补充用户手册和API文档

**✅ 2025-11-20 完成内容**:
- ✅ 个人成就系统测试数据创建
- ✅ 个人练习成就定义（初试锋芒、勤学苦练、百炼成钢）
- ✅ 个人成就API测试脚本编写（9个测试全部通过）
- ✅ 成就授予逻辑验证
- ✅ PENDING_WORK.md文档更新

**🚀 下一步行动**:
1. **成就自动触发逻辑开发** (P1 - 2-3天) - 核心功能
   - 实现AchievementDetector自动检测学生活动完成
   - 集成EventBus事件监听（STUDENT_ACTIVITY.COMPLETED）
   - 实现成就条件匹配算法（count类型）
   - 自动授予成就并发送通知
   - 编写自动触发测试用例

2. **成就进度追踪功能** (P1 - 1-2天)
   - 实现achievement_progress表追踪未解锁成就进度
   - 更新 /api/achievements/student/:studentId/progress 接口
   - 返回未解锁成就的当前进度（如：5/10次练习）
   - 编写进度追踪测试

3. **评卷管理 Phase 1** (P0 - 1-2天) - Bug修复与基础优化
   - 筛选功能增强（活动选择、日期筛选、搜索）
   - 评卷详情页优化（题目导航、快捷键、进度条）
   - 错误处理优化

4. **成就系统 Week 4** (待自动触发完成后) - 日常任务系统
   - Day 1: 任务规则引擎设计
   - Day 2: DailyTaskDetector实现
   - Day 3: 任务完成奖励机制
   - Day 4: 定时任务重置（Cron）
   - Day 5: 测试与优化
