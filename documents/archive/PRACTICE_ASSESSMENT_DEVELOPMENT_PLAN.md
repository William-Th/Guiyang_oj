# 学生练习中心、测评中心和评卷系统开发计划

**版本**: 1.0
**创建日期**: 2025-10-30
**项目**: 贵阳市小学生测评平台

---

## 📋 需求概述

### 功能模块
1. **学生练习中心** - 学生参与练习活动的答题系统
2. **学生测评中心** - 学生参与测评活动的答题系统
3. **教师评卷系统** - 教师/管理员对学生答题进行评卷

### 核心特性
- ✅ 统一的答题界面(支持练习和测评两种活动类型)
- ✅ 自动判题(客观题:单选、多选、填空)
- ✅ 人工评卷(主观题:简答、编程)
- ✅ 实时答题保存
- ✅ 倒计时功能(限时活动)
- ✅ 防作弊机制(IP记录、时间控制)
- ✅ 成绩统计和排名

---

## 🎯 开发流程 (按CLAUDE.md规范)

### ⚠️ 重要原则
**API测试优先于前端开发** - 必须先完成后端API开发并通过API测试后,才能开始前端开发

### 开发顺序

```
1️⃣ 需求分析 ✓
2️⃣ 数据库设计和完善
3️⃣ 后端API开发
4️⃣ API测试 (必须通过!)
5️⃣ 前端开发
6️⃣ E2E测试
7️⃣ 文档更新
```

---

## 📊 第一阶段: 数据库设计和完善

### 现有表结构分析

#### ✅ 已存在的表

**activities** (活动表)
- 原exams表,已重命名为activities
- 包含字段:
  - `id`, `title`, `description`, `subject`, `grade`
  - `type`: 'assessment' | 'practice'
  - `status`: 'draft' | 'published' | 'ended' | 'cancelled'
  - `ability_level`: L1-L7
  - `scope`: 活动范围
  - `time_limit_type`: 'unlimited' | 'timed' | 'scheduled'
  - `duration`: 限时时长(分钟)
  - `start_time`, `end_time`: 活动时间窗口
  - `total_score`, `pass_score`
  - `allow_retake`: 是否允许重做
  - `max_attempts`: 最大尝试次数

**student_activities** (学生活动记录表)
- 原student_exams表,已重命名
- 包含字段:
  - `id`, `student_id`, `activity_id`, `session_id`
  - `status`: 'registered' | 'in_progress' | 'submitted' | 'graded'
  - `start_time`, `started_at`: 开始时间
  - `submit_time`: 提交时间
  - `time_limit_deadline`: 限时截止时间
  - `score`: 最终得分
  - `rank`: 排名
  - `ip_address`: 答题IP地址

**answers** (答题记录表)
- 存储每道题的答题记录
- 包含字段:
  - `id`, `student_exam_id`, `question_id`
  - `answer`: 学生答案(TEXT)
  - `is_correct`: 是否正确(BOOLEAN)
  - `score`: 得分
  - `graded_by`: 评卷人ID
  - `graded_at`: 评卷时间

**activity_questions** (活动题目关联表)
- 组卷系统创建的题目列表
- 包含字段:
  - `activity_id`, `question_id`
  - `order_index`: 题目顺序
  - `score`: 该题分值
  - `is_required`: 是否必答

**question_bank** (题库表)
- 题目主表
- 包含字段:
  - `id`, `question_code`, `type`, `content`
  - `type`: 'single' | 'multiple' | 'fill_blank' | 'short_answer' | 'programming'
  - `options`: 选项(JSONB)
  - `correct_answer`: 标准答案(JSONB)
  - `subject`, `grade`, `difficulty`

### 需要完善的内容

#### 🔧 student_activities表
需要确认字段是否完整:
- ✅ `status`状态流转: registered → in_progress → submitted → graded
- ✅ `grading_status`: 新增字段,评卷状态
  - 'pending': 待评卷(刚提交)
  - 'auto_graded': 自动评卷完成(只有客观题)
  - 'partial_graded': 部分评卷(客观题已判,主观题待判)
  - 'completed': 全部评卷完成

#### 🔧 answers表
需要确认字段是否完整:
- ✅ `grading_status`: 该题评卷状态
  - 'pending': 待评卷
  - 'auto_graded': 自动评卷
  - 'manual_graded': 人工评卷
- ✅ `feedback`: 评卷批注(TEXT)
- ✅ `auto_score`: 自动判题得分
- ✅ `manual_score`: 人工评分

---

## 🔧 第二阶段: 后端API开发

### API模块划分

#### 1. 学生答题API (`/api/student/activities`)

**1.1 获取可用活动列表**
```
GET /api/student/activities/practice
GET /api/student/activities/assessment
```
- 筛选条件: subject, grade, ability_level
- 返回: 可参与的练习/测评列表
- 权限: student

**1.2 活动详情**
```
GET /api/student/activities/:id
```
- 返回: 活动基本信息、题目数量、时长、是否已参与

**1.3 开始活动**
```
POST /api/student/activities/:id/start
```
- 创建student_activities记录,状态为'in_progress'
- 记录started_at、计算time_limit_deadline
- 返回: session_id, deadline

**1.4 获取题目列表**
```
GET /api/student/activities/:id/questions
```
- 返回: 活动的所有题目(按order_index排序)
- 不返回correct_answer

**1.5 提交单题答案**
```
POST /api/student/activities/:id/answers
Body: { questionId, answer }
```
- 实时保存答案到answers表
- 不立即判题,只保存
- 返回: 保存成功状态

**1.6 获取已答题目**
```
GET /api/student/activities/:id/my-answers
```
- 返回: 当前会话已保存的答案
- 用于页面刷新恢复

**1.7 提交整个活动**
```
POST /api/student/activities/:id/submit
```
- 更新student_activities状态为'submitted'
- 触发自动判题流程
- 返回: 提交成功,跳转结果页

**1.8 查看结果**
```
GET /api/student/activities/:id/result
```
- 返回: 总分、排名、每题得分情况
- 只有提交后才能查看

#### 2. 自动判题API (内部调用)

**2.1 自动判题引擎**
```javascript
POST /api/grading/auto-grade
Body: { studentActivityId }
```
- 遍历所有客观题答案
- 对比correct_answer进行判分
- 更新answers表的is_correct和score
- 更新student_activities的score和grading_status

**判题规则**:
- **单选题**: 答案完全匹配
- **多选题**: 答案集合完全匹配(顺序无关)
- **填空题**:
  - 完全匹配或关键词匹配
  - 支持多个正确答案(用|分隔)
- **主观题**: 不自动判题,标记为pending

#### 3. 教师评卷API (`/api/teacher/grading`)

**3.1 获取待评卷列表**
```
GET /api/teacher/grading/pending
Query: activityId, subject, grade
```
- 返回: 需要人工评卷的学生答题列表
- 筛选条件: 只显示自己创建的活动
- 权限: teacher, admin

**3.2 获取学生答题详情**
```
GET /api/teacher/grading/student-activity/:id
```
- 返回: 学生所有答题记录
- 包含客观题已判分结果
- 主观题待评分

**3.3 评分单题**
```
PUT /api/teacher/grading/answers/:answerId
Body: { score, feedback }
```
- 更新answers表的score和feedback
- 标记graded_by和graded_at
- 更新grading_status为'manual_graded'

**3.4 批量评分**
```
PUT /api/teacher/grading/batch
Body: { answers: [{ answerId, score, feedback }] }
```
- 批量更新多个答案的评分

**3.5 完成评卷**
```
POST /api/teacher/grading/student-activity/:id/complete
```
- 计算总分并更新student_activities
- 更新grading_status为'completed'
- 更新status为'graded'

**3.6 评卷统计**
```
GET /api/teacher/grading/stats/:activityId
```
- 返回: 总提交人数、已评卷人数、待评卷人数
- 平均分、最高分、最低分

---

## 🧪 第三阶段: API测试 (✅ 必须通过!)

### API测试文件
创建 `tests/api/practice-assessment-api-test.js`

### 测试用例组

**1. 学生答题流程测试 (15个测试)**
- TC-PA-001: 学生登录
- TC-PA-002: 获取练习活动列表
- TC-PA-003: 获取测评活动列表
- TC-PA-004: 查看活动详情
- TC-PA-005: 开始练习活动
- TC-PA-006: 获取题目列表
- TC-PA-007: 提交单选题答案
- TC-PA-008: 提交多选题答案
- TC-PA-009: 提交填空题答案
- TC-PA-010: 提交主观题答案
- TC-PA-011: 获取已答题目
- TC-PA-012: 提交整个活动
- TC-PA-013: 查看结果(自动判题后)
- TC-PA-014: 不能重复开始活动
- TC-PA-015: 超时自动提交

**2. 自动判题测试 (8个测试)**
- TC-AG-001: 单选题正确判题
- TC-AG-002: 单选题错误判题
- TC-AG-003: 多选题正确判题
- TC-AG-004: 多选题部分选中
- TC-AG-005: 填空题完全匹配
- TC-AG-006: 填空题关键词匹配
- TC-AG-007: 主观题不自动判题
- TC-AG-008: 混合题型批量判题

**3. 教师评卷测试 (10个测试)**
- TC-TG-001: 教师登录
- TC-TG-002: 获取待评卷列表
- TC-TG-003: 查看学生答题详情
- TC-TG-004: 评分简答题
- TC-TG-005: 评分编程题
- TC-TG-006: 添加评语
- TC-TG-007: 批量评分
- TC-TG-008: 完成评卷并计算总分
- TC-TG-009: 评卷统计数据
- TC-TG-010: 权限控制(不能评其他人的活动)

**总计**: 33个API测试用例

### 测试通过标准
- ✅ 所有33个测试用例必须通过
- ✅ 通过率必须达到100%
- ✅ 自动判题准确率100%
- ✅ 评卷流程完整无错误

**里程碑**: ⚠️ API测试通过后才能进入前端开发阶段!

---

## 🎨 第四阶段: 前端开发

**前置条件**: API测试必须全部通过!

### 前端页面结构

#### 1. 学生练习中心页面
**路径**: `/student/practice`
**文件**: `frontend/src/pages/student/PracticeCenterPage.tsx`

**功能**:
- 显示可用练习活动列表
- 筛选: 科目、年级、能力等级
- 活动卡片: 标题、描述、题目数、时长、参与状态
- 点击"开始练习"按钮进入答题

#### 2. 学生测评中心页面
**路径**: `/student/assessment`
**文件**: `frontend/src/pages/student/AssessmentCenterPage.tsx`

**功能**:
- 显示可用测评活动列表
- 筛选: 科目、年级、能力等级
- 测评卡片: 官方标识、时间限制、证书信息
- 点击"开始测评"按钮进入答题

#### 3. 统一答题页面
**路径**: `/student/activity/:id/exam`
**文件**: `frontend/src/pages/student/ExamPage.tsx`

**功能**:
- 题目导航栏(显示所有题号,已答/未答状态)
- 题目内容展示区
- 答案输入区(根据题型动态渲染)
  - 单选: Radio
  - 多选: Checkbox
  - 填空: Input
  - 简答: TextArea
  - 编程: CodeMirror
- 上一题/下一题按钮
- 答题卡(快速跳转)
- 倒计时组件(限时活动)
- 暂存/提交按钮
- 自动保存(每30秒或切换题目时)

#### 4. 答题结果页面
**路径**: `/student/activity/:id/result`
**文件**: `frontend/src/pages/student/ExamResultPage.tsx`

**功能**:
- 总分显示
- 客观题得分/主观题待评
- 每题详情(题目、我的答案、正确答案、得分)
- 评语展示(教师评卷后)
- 排名信息(如果是测评)

#### 5. 教师评卷页面
**路径**: `/teacher/grading`
**文件**: `frontend/src/pages/teacher/GradingPage.tsx`

**功能**:
- 待评卷列表(按活动筛选)
- 统计信息(待评/已评/总数)
- 点击学生进入评卷详情

#### 6. 评卷详情页面
**路径**: `/teacher/grading/student-activity/:id`
**文件**: `frontend/src/pages/teacher/GradingDetailPage.tsx`

**功能**:
- 学生基本信息
- 客观题自动判分结果(只读)
- 主观题列表(待评分)
- 每题评分输入框
- 评语输入框(TextArea)
- 保存单题评分
- 完成评卷按钮(更新总分)

### UI组件设计

#### 核心组件
- `ActivityCard.tsx`: 活动卡片组件
- `QuestionRenderer.tsx`: 题目渲染组件
- `AnswerInput.tsx`: 答案输入组件
- `QuestionNavigator.tsx`: 题目导航组件
- `Countdown.tsx`: 倒计时组件
- `AnswerSheet.tsx`: 答题卡组件
- `GradingForm.tsx`: 评分表单组件

---

## 🧪 第五阶段: E2E测试

### E2E测试文件
创建以下测试文件:
- `tests/e2e/smoke/practice-assessment-smoke.spec.ts`
- `tests/e2e/regression/practice-center.spec.ts`
- `tests/e2e/regression/assessment-center.spec.ts`
- `tests/e2e/regression/exam-taking.spec.ts`
- `tests/e2e/regression/teacher-grading.spec.ts`

### 测试用例编号规范

**PRA**: Practice Center (练习中心)
**ASS**: Assessment Center (测评中心)
**EXM**: Exam Taking (答题过程)
**GRD**: Grading (评卷)

#### 冒烟测试 (6个)
- PRA001: 学生可以访问练习中心
- PRA002: 学生可以开始练习
- ASS001: 学生可以访问测评中心
- ASS002: 学生可以开始测评
- EXM001: 学生可以答题并提交
- GRD001: 教师可以访问评卷页面

#### 回归测试 (30个)
**练习中心 (PRA101-PRA110)**
- PRA101: 筛选练习活动
- PRA102: 查看活动详情
- PRA103: 开始练习
- ...

**测评中心 (ASS101-ASS110)**
- ASS101: 筛选测评活动
- ASS102: 查看官方测评
- ASS103: 开始测评
- ...

**答题流程 (EXM101-EXM120)**
- EXM101: 单选题答题
- EXM102: 多选题答题
- EXM103: 填空题答题
- EXM104: 简答题答题
- EXM105: 题目导航
- EXM106: 答题卡快速跳转
- EXM107: 自动保存
- EXM108: 倒计时功能
- EXM109: 提交确认
- EXM110: 查看结果
- ...

**评卷流程 (GRD101-GRD115)**
- GRD101: 查看待评卷列表
- GRD102: 进入评卷详情
- GRD103: 评分简答题
- GRD104: 添加评语
- GRD105: 批量评分
- GRD106: 完成评卷
- GRD107: 评卷统计
- ...

---

## 📚 第六阶段: 文档更新

### 需要更新的文档

#### 1. API文档
**文件**: `documents/API_Document.md`
- 添加学生答题API章节
- 添加自动判题API章节
- 添加教师评卷API章节

#### 2. 功能状态文档
**文件**: `documents/DEVELOPMENT_STATUS.md`
- 更新练习中心开发状态
- 更新测评中心开发状态
- 更新评卷系统开发状态

#### 3. 测试文档
**文件**: `tests/docs/API_testcases/practice-assessment-api-testcases.md`
**文件**: `tests/docs/E2E_testcases/practice-assessment-testcases.md`

#### 4. 回归测试追踪
**文件**: `tests/docs/regression-test-tracking.md`
- 添加新模块的测试追踪

---

## 📅 时间估算

| 阶段 | 预计时间 | 里程碑 |
|------|---------|--------|
| 1. 需求分析 | 0.5小时 | ✅ 完成计划文档 |
| 2. 数据库完善 | 0.5小时 | ✅ 迁移脚本执行成功 |
| 3. 后端API开发 | 3小时 | ✅ 所有API实现完成 |
| 4. API测试 | 1.5小时 | ✅ 33个测试100%通过 |
| 5. 前端开发 | 4小时 | ✅ 所有页面实现完成 |
| 6. E2E测试 | 1.5小时 | ✅ 36个测试通过 |
| 7. 文档更新 | 0.5小时 | ✅ 所有文档同步更新 |
| **总计** | **约12小时** | - |

---

## ⚠️ 关键风险和注意事项

### 技术风险
1. **自动判题准确性**: 填空题关键词匹配可能不准确
   - 缓解: 提供详细的正确答案配置(支持多答案、大小写不敏感)

2. **并发答题**: 多个学生同时答题可能导致数据库锁
   - 缓解: 使用乐观锁或行级锁

3. **超时处理**: 限时活动到期自动提交
   - 缓解: 后端定时任务检查超时会话

### 业务风险
1. **防作弊**: 学生可能刷新页面或多设备登录
   - 缓解: session_id验证、IP地址记录、答题时间异常检测

2. **评卷公平性**: 不同教师评分标准不一致
   - 缓解: 提供评分参考、评分范围限制

---

## 🎯 成功标准

### API开发完成标准
- ✅ 所有API端点实现完成
- ✅ 错误处理完善
- ✅ 权限验证正确
- ✅ 33个API测试100%通过

### 前端开发完成标准
- ✅ 所有页面UI实现完成
- ✅ 用户体验流畅
- ✅ 响应式设计
- ✅ 36个E2E测试通过

### 最终验收标准
- ✅ 学生可以完整走通答题流程
- ✅ 自动判题准确率100%
- ✅ 教师可以完整走通评卷流程
- ✅ 所有测试通过
- ✅ 文档完整更新

---

**文档版本**: 1.0
**最后更新**: 2025-10-30
**下一步**: 开始第二阶段 - 数据库设计和完善
