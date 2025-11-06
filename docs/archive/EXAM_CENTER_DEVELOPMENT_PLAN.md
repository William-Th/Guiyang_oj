# 考试中心开发计划

**项目名称**: 贵阳小学生测评服务平台 - 考试中心功能
**文档版本**: v1.0
**创建日期**: 2025-10-21
**开发阶段**: MVP v2.4
**优先级**: 🔴 高

---

## 目录

1. [项目概述](#1-项目概述)
2. [现状分析](#2-现状分析)
3. [功能设计](#3-功能设计)
4. [技术架构](#4-技术架构)
5. [开发计划](#5-开发计划)
6. [测试策略](#6-测试策略)
7. [上线方案](#7-上线方案)

---

## 1. 项目概述

### 1.1 项目目标

开发一个统一的**考试中心**功能模块，为学生、教师、管理员三个角色提供各自专属的考试管理界面，实现考试的全生命周期管理。

### 1.2 核心价值

- **学生视角**: 统一的考试入口，清晰的考试状态，便捷的报名和参加流程
- **教师视角**: 完整的考试管理工具，班级考试组织，成绩统计分析
- **管理员视角**: 全局考试监控，数据统计分析，系统配置管理

### 1.3 成功标准

- ✅ 三个角色都有专属的考试中心页面
- ✅ 考试流程完整且用户体验流畅
- ✅ 数据统计准确且可视化展示
- ✅ E2E测试覆盖率达到100%
- ✅ 页面加载时间 < 2秒

---

## 2. 现状分析

### 2.1 已实现功能 ✅

#### 2.1.1 后端API (100%完成)

**考试路由** (`backend/src/routes/exams.js`):
- ✅ `GET /api/exams` - 获取考试列表（支持筛选）
- ✅ `GET /api/exams/:id` - 获取考试详情
- ✅ `GET /api/exams/:id/questions` - 获取考试题目
- ✅ `POST /api/exams` - 创建考试（教师/管理员）
- ✅ `POST /api/exams/:id/start` - 开始考试（学生）
- ✅ `POST /api/exams/:id/submit` - 提交考试（学生）
- ✅ `POST /api/exams/:id/register` - 报名考试（学生）

**数据模型**:
- ✅ `Exam` - 考试基础信息
- ✅ `StudentExam` - 学生考试记录
- ✅ `Answer` - 答题记录
- ✅ `Question` - 题目管理

#### 2.1.2 前端页面 (部分完成)

**学生端** (70%完成):
- ✅ `ExamListPage.tsx` - 考试列表页（报名、查看状态）
- ✅ `ExamPage.tsx` - 在线答题页（倒计时、题目导航、提交）
- ⚠️ `ExamDetailPage.tsx` - 考试详情页（功能不完整）
- ❌ 缺少统一的考试中心页面

**教师端** (30%完成):
- ⚠️ `admin/ExamManagement.tsx` - 考试管理页（功能有限）
- ❌ 缺少创建考试向导
- ❌ 缺少班级考试统计
- ❌ 缺少学生答题情况分析

**管理员端** (30%完成):
- ⚠️ `admin/ExamManagement.tsx` - 与教师共用（需区分）
- ❌ 缺少系统级考试统计
- ❌ 缺少数据可视化仪表板

### 2.2 存在问题 ❌

#### 2.2.1 功能缺失

1. **学生角色**:
   - ❌ 没有统一的考试中心入口
   - ❌ 考试状态展示不清晰（已报名、进行中、已完成）
   - ❌ 缺少历史成绩查看
   - ❌ 缺少成绩分析和进步曲线

2. **教师角色**:
   - ❌ 考试创建流程复杂，缺少向导
   - ❌ 题目选择界面不友好
   - ❌ 缺少班级维度的成绩统计
   - ❌ 缺少学生答题情况分析

3. **管理员角色**:
   - ❌ 与教师界面混合，没有区分
   - ❌ 缺少全局考试监控
   - ❌ 缺少数据可视化仪表板
   - ❌ 缺少考试审核功能

#### 2.2.2 用户体验问题

1. **导航问题**:
   - ❌ 学生找不到"我的考试"入口
   - ❌ 教师需要记住URL才能访问考试管理
   - ❌ 缺少面包屑导航

2. **状态展示**:
   - ❌ 考试状态不直观（草稿、已发布、进行中、已结束）
   - ❌ 学生报名状态不清晰
   - ❌ 缺少倒计时提醒

3. **数据展示**:
   - ❌ 缺少图表可视化
   - ❌ 缺少数据筛选和排序
   - ❌ 缺少导出功能

### 2.3 技术债务

1. **代码重复**:
   - 教师和管理员共用 `ExamManagement.tsx`，导致权限判断复杂
   - 筛选逻辑在多个组件重复

2. **性能问题**:
   - 考试列表未启用虚拟滚动
   - 未使用分页加载

3. **类型定义**:
   - 缺少统一的 TypeScript 接口定义
   - API响应类型不完整

---

## 3. 功能设计

### 3.1 学生考试中心

#### 3.1.1 页面结构

**路由**: `/student/exam-center`

**页面布局**:
```
┌─────────────────────────────────────────────┐
│  考试中心 - 我的考试                         │
├─────────────────────────────────────────────┤
│  [统计卡片区域]                              │
│  ┌──────────┬──────────┬──────────┬────────┐│
│  │ 待参加   │ 进行中   │ 已完成   │ 总成绩 ││
│  │   3      │   1      │   12     │  89.5  ││
│  └──────────┴──────────┴──────────┴────────┘│
├─────────────────────────────────────────────┤
│  [Tab切换]                                   │
│  ├─ 可报名考试                               │
│  ├─ 我的考试（已报名）                       │
│  └─ 历史记录                                 │
├─────────────────────────────────────────────┤
│  [考试列表 - Table]                          │
│  考试名称 | 科目 | 时间 | 状态 | 操作       │
│  ─────────────────────────────────────────  │
│  数学期中考试 | 数学 | 明天14:00 | 已报名 │ [准备考试] │
│  物理单元测试 | 物理 | 今天16:00 | 进行中 │ [进入考场] │
│  化学基础测评 | 化学 | 昨天10:00 | 已完成 │ [查看成绩] │
└─────────────────────────────────────────────┘
```

#### 3.1.2 核心功能

**1. 考试状态管理**

```typescript
// 考试状态定义
enum ExamStatus {
  AVAILABLE = 'available',      // 可报名
  REGISTERED = 'registered',    // 已报名
  IN_PROGRESS = 'in_progress',  // 进行中
  SUBMITTED = 'submitted',      // 已提交
  GRADED = 'graded'             // 已批改
}

// 学生视角的考试状态
interface StudentExamView {
  id: number;
  title: string;
  subject: string;
  grade: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalScore: number;
  status: ExamStatus;
  studentStatus?: {
    registeredAt?: string;
    startedAt?: string;
    submittedAt?: string;
    score?: number;
  };
}
```

**2. 统计数据展示**

```typescript
interface StudentExamStats {
  toBeAttended: number;    // 待参加（已报名但未开始）
  inProgress: number;      // 进行中
  completed: number;       // 已完成
  averageScore: number;    // 平均成绩
  totalExams: number;      // 总考试数
}
```

**3. 操作按钮逻辑**

| 考试状态 | 学生状态 | 显示按钮 | 按钮操作 |
|---------|---------|---------|---------|
| published | - | 报名 | 报名考试 |
| published | registered | 已报名 | 禁用 |
| ongoing | registered | 进入考场 | 开始考试 |
| ongoing | in_progress | 继续答题 | 恢复考试 |
| ongoing | submitted | 已提交 | 禁用 |
| finished | submitted | 查看成绩 | 查看详情 |

**4. 快捷操作**

- ⏰ 考试倒计时提醒（考试前1小时/10分钟弹窗提醒）
- 📊 成绩分析（雷达图、趋势图）
- 📜 证书下载（成绩优秀自动生成）
- 🔍 历史记录搜索和筛选

#### 3.1.3 API需求

**新增API**:
```javascript
// GET /api/students/exam-center/stats
// 获取学生考试统计数据
{
  toBeAttended: 3,
  inProgress: 1,
  completed: 12,
  averageScore: 89.5,
  totalExams: 16
}

// GET /api/students/exam-center/exams?tab=available|registered|history
// 获取不同Tab的考试列表
{
  exams: [...],
  total: 15,
  page: 1,
  pageSize: 20
}
```

---

### 3.2 教师考试中心

#### 3.2.1 页面结构

**路由**: `/teacher/exam-center`

**页面布局**:
```
┌─────────────────────────────────────────────┐
│  考试中心 - 考试管理                         │
├─────────────────────────────────────────────┤
│  [操作区]                                    │
│  [+ 创建考试]  [导入题目]  [批量操作]       │
├─────────────────────────────────────────────┤
│  [Tab切换]                                   │
│  ├─ 我的考试（已创建）                       │
│  ├─ 进行中的考试                             │
│  └─ 历史考试                                 │
├─────────────────────────────────────────────┤
│  [筛选条件]                                  │
│  科目: [数学▾]  年级: [八年级▾]  状态: [全部▾]│
├─────────────────────────────────────────────┤
│  [考试列表 - Table]                          │
│  考试名称 | 科目 | 班级 | 时间 | 状态 | 报名/完成 | 操作 │
│  ───────────────────────────────────────────│
│  数学期中 | 数学 | 8-1 | 明天14:00 | 已发布 | 25/30 │ [查看][编辑][统计]│
│  物理单元 | 物理 | 8-2 | 进行中   | 进行中 | 18/28 │ [监控][提醒][结束]│
│  化学测评 | 化学 | 8-3 | 已结束   | 已结束 | 27/27 │ [成绩][分析][导出]│
└─────────────────────────────────────────────┘
```

#### 3.2.2 核心功能

**1. 创建考试向导**

```typescript
// 多步骤创建流程
interface CreateExamWizard {
  step1: {  // 基础信息
    title: string;
    description: string;
    subject: string;
    grade: string;
    class?: string;  // 可选：指定班级
  };
  step2: {  // 时间设置
    startTime: Date;
    endTime: Date;
    duration: number;  // 分钟
  };
  step3: {  // 题目选择
    questions: number[];  // 从题库选择
    totalScore: number;
    passScore: number;
  };
  step4: {  // 确认发布
    preview: boolean;
    publishImmediately: boolean;
  };
}
```

**向导步骤**:
1. **基础信息** - 标题、科目、年级、描述
2. **时间设置** - 开始时间、结束时间、答题时长
3. **题目选择** - 从题库选择题目、设置分值
4. **预览确认** - 预览考试、发布或保存草稿

**2. 题目选择界面**

```
┌─────────────────────────────────────────────┐
│  选择题目（已选 5/10 题，总分 50/100）       │
├─────────────────────────────────────────────┤
│  [题库筛选]                                  │
│  题型: [单选▾]  难度: [中等▾]  科目: [数学▾] │
├─────────────────────────────────────────────┤
│  [题目列表 - 左侧]         [已选题目 - 右侧] │
│  ┌─────────────────┐      ┌───────────────┐ │
│  │ □ Q1: 2+2=?     │      │ ☑ Q5: 光合作用│ │
│  │   难度: 简单     │      │   分值: 10    │ │
│  │   [+ 添加]      │      │   [- 移除]    │ │
│  │                 │      │               │ │
│  │ □ Q2: 勾股定理  │      │ ☑ Q8: 化学式  │ │
│  │   难度: 中等     │      │   分值: 15    │ │
│  │   [+ 添加]      │      │   [- 移除]    │ │
│  └─────────────────┘      └───────────────┘ │
└─────────────────────────────────────────────┘
```

**3. 考试统计分析**

**统计维度**:
- 📊 整体统计：平均分、及格率、优秀率、最高分、最低分
- 📈 分数分布：分数段柱状图
- 🎯 题目分析：每题正确率、易错题
- 👥 学生排名：成绩排行榜
- ⏱️ 答题时间：平均答题时长

**数据可视化**:
```typescript
interface ExamStatistics {
  overview: {
    totalStudents: number;
    submittedCount: number;
    averageScore: number;
    passRate: number;      // 及格率
    excellentRate: number; // 优秀率（>85分）
    highestScore: number;
    lowestScore: number;
  };
  scoreDistribution: {
    range: string;   // "0-60", "60-70", "70-80", "80-90", "90-100"
    count: number;
  }[];
  questionAnalysis: {
    questionId: number;
    content: string;
    correctRate: number;
    averageScore: number;
  }[];
  studentRanking: {
    rank: number;
    studentName: string;
    score: number;
    duration: string;
  }[];
}
```

**4. 班级管理**

```typescript
// 教师可以为班级创建考试
interface ClassExam {
  examId: number;
  classId: number;
  className: string;
  totalStudents: number;
  registeredCount: number;
  completedCount: number;
}
```

#### 3.2.3 API需求

**新增API**:
```javascript
// POST /api/exams/wizard
// 通过向导创建考试（支持草稿）
{
  step: 1|2|3|4,
  data: {...},
  isDraft: boolean
}

// GET /api/exams/:id/statistics
// 获取考试统计数据
{
  overview: {...},
  scoreDistribution: [...],
  questionAnalysis: [...],
  studentRanking: [...]
}

// GET /api/teachers/classes
// 获取教师的班级列表
{
  classes: [
    { id: 1, name: "八年级1班", studentCount: 30 }
  ]
}

// POST /api/exams/:id/remind
// 提醒未完成学生
{
  message: "考试即将结束，请抓紧时间完成"
}
```

---

### 3.3 管理员考试中心

#### 3.3.1 页面结构

**路由**: `/admin/exam-center`

**页面布局**:
```
┌─────────────────────────────────────────────┐
│  考试中心 - 系统管理                         │
├─────────────────────────────────────────────┤
│  [全局统计仪表板]                            │
│  ┌────────┬────────┬────────┬────────┬──────┐│
│  │今日考试│参与人数│平均分  │及格率  │活跃度││
│  │   8    │  456   │ 85.2  │ 92.3% │ 78%  ││
│  └────────┴────────┴────────┴────────┴──────┘│
├─────────────────────────────────────────────┤
│  [数据可视化]                                │
│  ┌─────────────────┐  ┌─────────────────┐   │
│  │ 考试趋势图      │  │ 科目分布图      │   │
│  │ [折线图]        │  │ [饼图]          │   │
│  └─────────────────┘  └─────────────────┘   │
├─────────────────────────────────────────────┤
│  [Tab切换]                                   │
│  ├─ 所有考试                                 │
│  ├─ 待审核                                   │
│  ├─ 进行中                                   │
│  └─ 数据分析                                 │
├─────────────────────────────────────────────┤
│  [考试列表 - 全局视图]                       │
│  考试名称 | 创建者 | 科目 | 时间 | 参与/总数 | 状态 | 操作 │
│  ──────────────────────────────────────────│
│  数学期中 | 李老师 | 数学 | 进行中 | 125/150 | 进行中 │ [监控][暂停]│
│  物理单元 | 王老师 | 物理 | 待审核 | 0/80    | 草稿   │ [审核][编辑]│
└─────────────────────────────────────────────┘
```

#### 3.3.2 核心功能

**1. 系统级统计仪表板**

```typescript
interface AdminDashboard {
  todayStats: {
    examCount: number;           // 今日考试数
    participantCount: number;    // 参与人数
    averageScore: number;        // 平均分
    passRate: number;            // 及格率
    activeRate: number;          // 活跃度（参与/报名）
  };
  trends: {
    date: string;
    examCount: number;
    participantCount: number;
    averageScore: number;
  }[];
  subjectDistribution: {
    subject: string;
    count: number;
    percentage: number;
  }[];
  gradeDistribution: {
    grade: string;
    count: number;
  }[];
}
```

**2. 考试审核功能**

```typescript
interface ExamReview {
  examId: number;
  title: string;
  creator: string;
  createdAt: string;
  subject: string;
  grade: string;
  questionCount: number;
  totalScore: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string;
}

// 审核操作
interface ReviewAction {
  examId: number;
  action: 'approve' | 'reject';
  notes: string;
}
```

**3. 实时监控**

```
┌─────────────────────────────────────────────┐
│  实时考试监控 - 数学期中考试                 │
├─────────────────────────────────────────────┤
│  [实时数据]                                  │
│  在线人数: 45  已提交: 32  剩余时间: 15:23  │
├─────────────────────────────────────────────┤
│  [学生状态列表]                              │
│  学生姓名 | IP地址 | 进度 | 剩余时间 | 状态 │
│  ───────────────────────────────────────── │
│  张三     | 192... | 8/10 | 12:34    | 答题中 │
│  李四     | 192... | 10/10| 提交     | 已完成 │
│  王五     | 192... | 5/10 | 15:20    | 答题中 │
└─────────────────────────────────────────────┘
```

**4. 数据导出**

支持导出格式:
- 📊 Excel (.xlsx) - 详细成绩表
- 📄 PDF - 成绩报告
- 📈 CSV - 数据分析

**5. 系统配置**

```typescript
interface SystemConfig {
  examSettings: {
    autoPublish: boolean;        // 自动发布
    requireReview: boolean;      // 需要审核
    allowLateSubmit: boolean;    // 允许迟交
    lateSubmitPenalty: number;   // 迟交扣分比例
  };
  gradingRules: {
    passScore: number;           // 及格分数线
    excellentScore: number;      // 优秀分数线
    autoGrade: boolean;          // 自动批改
  };
  notifications: {
    emailReminder: boolean;      // 邮件提醒
    smsReminder: boolean;        // 短信提醒
    beforeExamHours: number;     // 考前提醒（小时）
  };
}
```

#### 3.3.3 API需求

**新增API**:
```javascript
// GET /api/admin/exam-center/dashboard
// 获取管理员仪表板数据
{
  todayStats: {...},
  trends: [...],
  subjectDistribution: [...],
  gradeDistribution: [...]
}

// GET /api/admin/exams/pending-review
// 获取待审核考试列表
{
  exams: [...],
  total: 15
}

// POST /api/admin/exams/:id/review
// 审核考试
{
  action: 'approve' | 'reject',
  notes: '审核通过'
}

// GET /api/admin/exams/:id/monitor
// 实时监控考试
{
  onlineCount: 45,
  submittedCount: 32,
  remainingTime: 923,
  students: [
    {
      studentId: 1,
      name: '张三',
      ipAddress: '192.168.1.100',
      progress: '8/10',
      remainingTime: 754,
      status: 'in_progress'
    }
  ]
}

// GET /api/admin/exams/export?format=xlsx|pdf|csv
// 导出考试数据
```

---

## 4. 技术架构

### 4.1 前端架构

#### 4.1.1 目录结构

```
frontend/src/
├── pages/
│   ├── student/
│   │   └── ExamCenterPage.tsx           # 学生考试中心（新建）
│   ├── teacher/
│   │   ├── ExamCenterPage.tsx           # 教师考试中心（新建）
│   │   ├── CreateExamWizard.tsx         # 创建考试向导（新建）
│   │   └── ExamStatisticsPage.tsx       # 考试统计页（新建）
│   └── admin/
│       ├── ExamCenterPage.tsx           # 管理员考试中心（新建）
│       ├── ExamMonitorPage.tsx          # 考试监控页（新建）
│       └── ExamDashboard.tsx            # 考试仪表板（新建）
├── components/
│   ├── exam/
│   │   ├── ExamCard.tsx                 # 考试卡片组件（新建）
│   │   ├── ExamStatusTag.tsx            # 状态标签组件（新建）
│   │   ├── ExamStatistics.tsx           # 统计组件（新建）
│   │   ├── QuestionSelector.tsx         # 题目选择器（新建）
│   │   └── ExamTimeline.tsx             # 考试时间轴（新建）
│   └── charts/
│       ├── ScoreDistribution.tsx        # 分数分布图（新建）
│       ├── TrendChart.tsx               # 趋势图（新建）
│       └── SubjectPieChart.tsx          # 科目饼图（新建）
├── hooks/
│   ├── useExamCenter.ts                 # 考试中心Hook（新建）
│   ├── useExamStatistics.ts             # 统计数据Hook（新建）
│   └── useExamMonitor.ts                # 实时监控Hook（新建）
├── services/
│   └── examCenterApi.ts                 # 考试中心API（新建）
└── types/
    └── exam.ts                           # 考试类型定义（新建）
```

#### 4.1.2 核心组件设计

**1. ExamCard 组件**

```tsx
// components/exam/ExamCard.tsx
interface ExamCardProps {
  exam: ExamInfo;
  role: 'student' | 'teacher' | 'admin';
  onAction: (action: string, examId: number) => void;
}

const ExamCard: React.FC<ExamCardProps> = ({ exam, role, onAction }) => {
  // 根据角色显示不同的操作按钮
  return (
    <Card
      title={exam.title}
      extra={<ExamStatusTag status={exam.status} />}
    >
      <Space direction="vertical">
        <Text>科目: {exam.subject}</Text>
        <Text>时间: {formatDateTime(exam.startTime)}</Text>
        {role === 'student' && (
          <Button onClick={() => onAction('start', exam.id)}>
            开始考试
          </Button>
        )}
        {role === 'teacher' && (
          <Space>
            <Button onClick={() => onAction('edit', exam.id)}>编辑</Button>
            <Button onClick={() => onAction('stats', exam.id)}>统计</Button>
          </Space>
        )}
      </Space>
    </Card>
  );
};
```

**2. QuestionSelector 组件**

```tsx
// components/exam/QuestionSelector.tsx
interface QuestionSelectorProps {
  selectedQuestions: number[];
  onChange: (questions: number[]) => void;
  maxQuestions?: number;
  totalScore?: number;
}

const QuestionSelector: React.FC<QuestionSelectorProps> = ({
  selectedQuestions,
  onChange,
  maxQuestions,
  totalScore
}) => {
  // 双栏布局：左侧题库，右侧已选
  return (
    <Row gutter={16}>
      <Col span={12}>
        <QuestionLibrary onSelect={handleSelect} />
      </Col>
      <Col span={12}>
        <SelectedQuestions
          questions={selectedQuestions}
          onRemove={handleRemove}
          totalScore={totalScore}
        />
      </Col>
    </Row>
  );
};
```

**3. ScoreDistribution 图表**

```tsx
// components/charts/ScoreDistribution.tsx
import { Column } from '@ant-design/charts';

interface ScoreDistributionProps {
  data: { range: string; count: number }[];
}

const ScoreDistribution: React.FC<ScoreDistributionProps> = ({ data }) => {
  const config = {
    data,
    xField: 'range',
    yField: 'count',
    label: {
      position: 'top',
      style: { fill: '#000' }
    }
  };

  return <Column {...config} />;
};
```

#### 4.1.3 状态管理

使用 Redux Toolkit 管理考试中心状态:

```typescript
// store/examCenterSlice.ts
interface ExamCenterState {
  // 学生
  studentStats: StudentExamStats | null;
  studentExams: {
    available: ExamInfo[];
    registered: ExamInfo[];
    history: ExamInfo[];
  };

  // 教师
  teacherExams: ExamInfo[];
  currentExamStats: ExamStatistics | null;

  // 管理员
  adminDashboard: AdminDashboard | null;
  monitorData: ExamMonitorData | null;

  // 通用
  loading: boolean;
  error: string | null;
}

const examCenterSlice = createSlice({
  name: 'examCenter',
  initialState,
  reducers: {
    setStudentStats: (state, action) => {
      state.studentStats = action.payload;
    },
    setStudentExams: (state, action) => {
      state.studentExams = action.payload;
    },
    // ... 其他 reducers
  },
});
```

### 4.2 后端架构

#### 4.2.1 新增路由

```javascript
// backend/src/routes/examCenter.js
const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const ExamCenterController = require('../controllers/ExamCenterController');

// 学生路由
router.get('/students/stats',
  authMiddleware,
  requireRole(['student']),
  ExamCenterController.getStudentStats
);

router.get('/students/exams',
  authMiddleware,
  requireRole(['student']),
  ExamCenterController.getStudentExams
);

// 教师路由
router.post('/exams/wizard',
  authMiddleware,
  requireRole(['teacher', 'admin']),
  ExamCenterController.createExamWizard
);

router.get('/exams/:id/statistics',
  authMiddleware,
  requireRole(['teacher', 'admin']),
  ExamCenterController.getExamStatistics
);

// 管理员路由
router.get('/admin/dashboard',
  authMiddleware,
  requireRole(['admin']),
  ExamCenterController.getAdminDashboard
);

router.get('/admin/exams/:id/monitor',
  authMiddleware,
  requireRole(['admin']),
  ExamCenterController.monitorExam
);

router.post('/admin/exams/:id/review',
  authMiddleware,
  requireRole(['admin']),
  ExamCenterController.reviewExam
);

module.exports = router;
```

#### 4.2.2 控制器

```javascript
// backend/src/controllers/ExamCenterController.js
class ExamCenterController {
  // 获取学生统计数据
  static async getStudentStats(req, res) {
    try {
      const studentId = req.user.id;
      const stats = await ExamCenter.getStudentStats(studentId);
      res.json({ stats });
    } catch (error) {
      logger.error('Get student stats error:', error);
      res.status(500).json({ message: '获取统计数据失败' });
    }
  }

  // 获取考试统计数据
  static async getExamStatistics(req, res) {
    try {
      const { id } = req.params;
      const stats = await ExamCenter.getExamStatistics(id);
      res.json({ statistics: stats });
    } catch (error) {
      logger.error('Get exam statistics error:', error);
      res.status(500).json({ message: '获取考试统计失败' });
    }
  }

  // 获取管理员仪表板
  static async getAdminDashboard(req, res) {
    try {
      const dashboard = await ExamCenter.getAdminDashboard();
      res.json({ dashboard });
    } catch (error) {
      logger.error('Get admin dashboard error:', error);
      res.status(500).json({ message: '获取仪表板数据失败' });
    }
  }

  // 更多控制器方法...
}

module.exports = ExamCenterController;
```

#### 4.2.3 数据模型

```javascript
// backend/src/models/ExamCenter.js
class ExamCenter {
  // 获取学生统计数据
  static async getStudentStats(studentId) {
    const result = await query(`
      SELECT
        COUNT(CASE WHEN se.status = 'registered' THEN 1 END) as to_be_attended,
        COUNT(CASE WHEN se.status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN se.status = 'submitted' THEN 1 END) as completed,
        AVG(CASE WHEN se.score IS NOT NULL THEN se.score END) as average_score,
        COUNT(*) as total_exams
      FROM student_exams se
      WHERE se.student_id = $1
    `, [studentId]);

    return result.rows[0];
  }

  // 获取考试统计数据
  static async getExamStatistics(examId) {
    // 整体统计
    const overview = await query(`
      SELECT
        COUNT(*) as total_students,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_count,
        AVG(CASE WHEN score IS NOT NULL THEN score END) as average_score,
        COUNT(CASE WHEN score >= e.pass_score THEN 1 END)::FLOAT /
          NULLIF(COUNT(CASE WHEN score IS NOT NULL THEN 1 END), 0) as pass_rate,
        MAX(score) as highest_score,
        MIN(score) as lowest_score
      FROM student_exams se
      JOIN exams e ON se.exam_id = e.id
      WHERE se.exam_id = $1
    `, [examId]);

    // 分数分布
    const distribution = await query(`
      SELECT
        CASE
          WHEN score < 60 THEN '0-60'
          WHEN score >= 60 AND score < 70 THEN '60-70'
          WHEN score >= 70 AND score < 80 THEN '70-80'
          WHEN score >= 80 AND score < 90 THEN '80-90'
          ELSE '90-100'
        END as range,
        COUNT(*) as count
      FROM student_exams
      WHERE exam_id = $1 AND score IS NOT NULL
      GROUP BY range
      ORDER BY range
    `, [examId]);

    return {
      overview: overview.rows[0],
      scoreDistribution: distribution.rows
    };
  }

  // 获取管理员仪表板数据
  static async getAdminDashboard() {
    const todayStats = await query(`
      SELECT
        COUNT(DISTINCT e.id) as exam_count,
        COUNT(DISTINCT se.student_id) as participant_count,
        AVG(se.score) as average_score,
        COUNT(CASE WHEN se.score >= e.pass_score THEN 1 END)::FLOAT /
          NULLIF(COUNT(se.score), 0) as pass_rate
      FROM exams e
      LEFT JOIN student_exams se ON e.id = se.exam_id
      WHERE DATE(e.start_time) = CURRENT_DATE
    `);

    // 趋势数据
    const trends = await query(`
      SELECT
        DATE(e.start_time) as date,
        COUNT(DISTINCT e.id) as exam_count,
        COUNT(DISTINCT se.student_id) as participant_count,
        AVG(se.score) as average_score
      FROM exams e
      LEFT JOIN student_exams se ON e.id = se.exam_id
      WHERE e.start_time >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(e.start_time)
      ORDER BY date
    `);

    return {
      todayStats: todayStats.rows[0],
      trends: trends.rows
    };
  }
}

module.exports = ExamCenter;
```

### 4.3 数据库设计

#### 4.3.1 现有表 (无需修改)

- ✅ `exams` - 考试表
- ✅ `student_exams` - 学生考试记录表
- ✅ `questions` - 题目表
- ✅ `answers` - 答案表

#### 4.3.2 新增表 (可选)

**考试审核表** (如果需要审核功能):

```sql
CREATE TABLE exam_reviews (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id),
  reviewer_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exam_reviews_exam_id ON exam_reviews(exam_id);
CREATE INDEX idx_exam_reviews_status ON exam_reviews(status);
```

**班级表** (如果需要班级功能):

```sql
CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  teacher_id INTEGER NOT NULL REFERENCES users(id),
  school_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE class_students (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id),
  student_id INTEGER NOT NULL REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, student_id)
);
```

---

## 5. 开发计划

### 5.1 开发阶段划分

#### 第一阶段: 基础架构（3天）

**任务清单**:
- [ ] 创建目录结构和基础组件
- [ ] 定义TypeScript类型接口
- [ ] 设置Redux状态管理
- [ ] 配置路由和导航

**产出**:
- ✅ 完整的组件目录结构
- ✅ 类型定义文件 `types/exam.ts`
- ✅ Redux slice `examCenterSlice.ts`
- ✅ 路由配置更新

**负责人**: 前端开发
**优先级**: P0

---

#### 第二阶段: 学生考试中心（4天）

**Day 1-2: 页面开发**
- [ ] 开发 `StudentExamCenterPage.tsx`
- [ ] 实现统计卡片区域
- [ ] 实现Tab切换（可报名/已报名/历史）
- [ ] 实现考试列表Table

**Day 3: API集成**
- [ ] 后端开发学生统计API
- [ ] 后端开发考试列表API
- [ ] 前端集成API调用

**Day 4: 功能完善**
- [ ] 实现考试倒计时
- [ ] 实现快捷操作按钮
- [ ] 添加加载和错误处理
- [ ] UI优化和响应式适配

**产出**:
- ✅ 完整的学生考试中心页面
- ✅ 学生统计API接口
- ✅ E2E测试用例（10个）

**负责人**: 前后端协作
**优先级**: P0

---

#### 第三阶段: 教师考试中心（5天）

**Day 1-2: 创建考试向导**
- [ ] 开发4步骤向导组件
- [ ] 实现基础信息表单
- [ ] 实现时间设置表单
- [ ] 实现题目选择器组件

**Day 3: 考试管理页面**
- [ ] 开发 `TeacherExamCenterPage.tsx`
- [ ] 实现考试列表（筛选、排序）
- [ ] 实现批量操作功能

**Day 4: 统计分析**
- [ ] 开发 `ExamStatisticsPage.tsx`
- [ ] 实现分数分布图
- [ ] 实现题目分析
- [ ] 实现学生排名

**Day 5: API开发与集成**
- [ ] 后端开发创建考试API
- [ ] 后端开发统计分析API
- [ ] 前端API集成
- [ ] 功能测试和优化

**产出**:
- ✅ 完整的教师考试中心
- ✅ 创建考试向导
- ✅ 考试统计分析页面
- ✅ E2E测试用例（15个）

**负责人**: 前后端协作
**优先级**: P0

---

#### 第四阶段: 管理员考试中心（4天）

**Day 1: 仪表板开发**
- [ ] 开发 `AdminExamDashboard.tsx`
- [ ] 实现统计卡片
- [ ] 实现趋势图表
- [ ] 实现科目分布图

**Day 2: 考试监控**
- [ ] 开发 `ExamMonitorPage.tsx`
- [ ] 实现实时学生状态
- [ ] 实现WebSocket推送（可选）
- [ ] 实现提醒功能

**Day 3: 审核与配置**
- [ ] 实现考试审核功能
- [ ] 实现系统配置页面
- [ ] 实现数据导出功能

**Day 4: API开发与集成**
- [ ] 后端开发仪表板API
- [ ] 后端开发监控API
- [ ] 后端开发审核API
- [ ] 前端API集成

**产出**:
- ✅ 完整的管理员考试中心
- ✅ 实时监控功能
- ✅ 数据导出功能
- ✅ E2E测试用例（12个）

**负责人**: 前后端协作
**优先级**: P1

---

#### 第五阶段: 集成测试与优化（3天）

**Day 1: E2E测试**
- [ ] 编写完整的测试用例
- [ ] 运行回归测试
- [ ] 修复测试发现的问题

**Day 2: 性能优化**
- [ ] 启用虚拟滚动
- [ ] 实现分页加载
- [ ] 优化API请求（缓存）
- [ ] 代码分割和懒加载

**Day 3: 用户体验优化**
- [ ] UI/UX走查
- [ ] 响应式适配
- [ ] 错误提示优化
- [ ] 加载状态优化

**产出**:
- ✅ 37个E2E测试用例（100%通过）
- ✅ 性能报告（加载<2秒）
- ✅ 用户体验报告

**负责人**: 全栈 + 测试
**优先级**: P0

---

### 5.2 开发时间表

```
Week 1 (Day 1-5):
├─ Day 1-3: 第一阶段 - 基础架构
├─ Day 4-5: 第二阶段 - 学生考试中心 (前2天)

Week 2 (Day 6-10):
├─ Day 6-7: 第二阶段 - 学生考试中心 (后2天)
├─ Day 8-10: 第三阶段 - 教师考试中心 (前3天)

Week 3 (Day 11-15):
├─ Day 11-12: 第三阶段 - 教师考试中心 (后2天)
├─ Day 13-15: 第四阶段 - 管理员考试中心 (前3天)

Week 4 (Day 16-19):
├─ Day 16: 第四阶段 - 管理员考试中心 (最后1天)
├─ Day 17-19: 第五阶段 - 集成测试与优化
```

**总工期**: 19个工作日（约4周）

### 5.3 风险管理

| 风险 | 影响 | 概率 | 应对措施 |
|-----|------|------|---------|
| API设计变更 | 高 | 中 | 提前确定API接口规范 |
| 性能问题 | 中 | 中 | 提前进行性能测试 |
| 浏览器兼容性 | 低 | 低 | 使用成熟的UI库 |
| 数据量过大 | 高 | 高 | 实现分页和虚拟滚动 |
| 测试用例失败 | 中 | 中 | 每日运行测试，及时修复 |

---

## 6. 测试策略

### 6.1 E2E测试用例

#### 6.1.1 学生考试中心测试 (10个用例)

```typescript
// tests/e2e/student-exam-center.spec.ts

describe('学生考试中心', () => {
  // SEC-001: 访问考试中心页面
  test('SEC-001 - 学生访问考试中心页面', async ({ page }) => {
    await loginAsStudent(page);
    await page.click('a:has-text("考试中心")');

    await expect(page.locator('h1')).toHaveText('考试中心');
    await expect(page.locator('.stats-card')).toHaveCount(4);
  });

  // SEC-002: 查看统计数据
  test('SEC-002 - 查看考试统计数据', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/exam-center');

    const toBeAttended = await page.locator('.stat-to-be-attended').textContent();
    expect(parseInt(toBeAttended!)).toBeGreaterThanOrEqual(0);
  });

  // SEC-003: 切换Tab查看不同考试
  test('SEC-003 - 切换Tab查看考试列表', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/exam-center');

    await page.click('.ant-tabs-tab:has-text("可报名考试")');
    await expect(page.locator('.ant-table-tbody tr')).toHaveCount.greaterThan(0);

    await page.click('.ant-tabs-tab:has-text("我的考试")');
    // 验证列表切换
  });

  // SEC-004: 报名考试
  test('SEC-004 - 报名参加考试', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/exam-center');

    const timestamp = Date.now();
    // 创建测试考试...

    await page.click('button:has-text("报名")');
    await expect(page.locator('.ant-message-success')).toBeVisible();
  });

  // SEC-005: 开始考试
  test('SEC-005 - 开始参加考试', async ({ page }) => {
    // 已报名的考试
    await loginAsStudent(page);
    await page.goto('/student/exam-center');

    await page.click('.ant-tabs-tab:has-text("我的考试")');
    await page.click('button:has-text("进入考场")');

    await expect(page.url()).toContain('/exam/');
  });

  // ... 更多测试用例
});
```

#### 6.1.2 教师考试中心测试 (15个用例)

```typescript
// tests/e2e/teacher-exam-center.spec.ts

describe('教师考试中心', () => {
  // TEC-001: 访问考试中心
  test('TEC-001 - 教师访问考试中心页面', async ({ page }) => {
    await loginAsTeacher(page);
    await page.click('a:has-text("考试中心")');

    await expect(page.locator('h1')).toHaveText('考试中心');
    await expect(page.locator('button:has-text("创建考试")')).toBeVisible();
  });

  // TEC-002: 打开创建考试向导
  test('TEC-002 - 打开创建考试向导', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/exam-center');

    await page.click('button:has-text("创建考试")');
    await expect(page.locator('.wizard-step-1')).toBeVisible();
  });

  // TEC-003: 完成创建考试向导 - 步骤1
  test('TEC-003 - 填写考试基础信息', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/exam-center/create');

    const timestamp = Date.now();
    await page.fill('input[name="title"]', `测试考试-${timestamp}`);
    await page.fill('textarea[name="description"]', '这是测试考试');
    await page.selectOption('select[name="subject"]', '数学');
    await page.selectOption('select[name="grade"]', '八年级');

    await page.click('button:has-text("下一步")');
    await expect(page.locator('.wizard-step-2')).toBeVisible();
  });

  // TEC-004: 完成创建考试向导 - 步骤2
  test('TEC-004 - 设置考试时间', async ({ page }) => {
    // 进入步骤2
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await page.fill('input[name="startTime"]', tomorrow.toISOString());
    await page.fill('input[name="duration"]', '60');

    await page.click('button:has-text("下一步")');
    await expect(page.locator('.wizard-step-3')).toBeVisible();
  });

  // TEC-005: 选择题目
  test('TEC-005 - 选择考试题目', async ({ page }) => {
    // 进入步骤3
    await page.click('.question-item:first-child .add-button');
    await page.click('.question-item:nth-child(2) .add-button');

    const selectedCount = await page.locator('.selected-questions .question-card').count();
    expect(selectedCount).toBe(2);
  });

  // TEC-006: 查看考试统计
  test('TEC-006 - 查看考试统计分析', async ({ page }) => {
    await loginAsTeacher(page);
    // 假设已有考试ID
    await page.goto('/teacher/exam-center/statistics/1');

    await expect(page.locator('.score-distribution-chart')).toBeVisible();
    await expect(page.locator('.student-ranking-table')).toBeVisible();
  });

  // ... 更多测试用例
});
```

#### 6.1.3 管理员考试中心测试 (12个用例)

```typescript
// tests/e2e/admin-exam-center.spec.ts

describe('管理员考试中心', () => {
  // AEC-001: 访问管理员仪表板
  test('AEC-001 - 访问管理员考试仪表板', async ({ page }) => {
    await loginAsAdmin(page);
    await page.click('a:has-text("考试中心")');

    await expect(page.locator('.admin-dashboard')).toBeVisible();
    await expect(page.locator('.today-stats')).toHaveCount(5);
  });

  // AEC-002: 查看考试趋势图
  test('AEC-002 - 查看考试趋势图表', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/exam-center');

    await expect(page.locator('.trend-chart canvas')).toBeVisible();
  });

  // AEC-003: 实时监控考试
  test('AEC-003 - 实时监控进行中的考试', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/exam-center');

    await page.click('button:has-text("监控")');
    await expect(page.locator('.monitor-page')).toBeVisible();
    await expect(page.locator('.online-students')).toBeVisible();
  });

  // AEC-004: 审核考试
  test('AEC-004 - 审核待发布考试', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/exam-center');

    await page.click('.ant-tabs-tab:has-text("待审核")');
    await page.click('button:has-text("审核")');

    await page.fill('textarea[name="notes"]', '审核通过');
    await page.click('button:has-text("批准")');

    await expect(page.locator('.ant-message-success')).toBeVisible();
  });

  // AEC-005: 导出考试数据
  test('AEC-005 - 导出考试数据为Excel', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/exam-center');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("导出Excel")')
    ]);

    expect(download.suggestedFilename()).toContain('.xlsx');
  });

  // ... 更多测试用例
});
```

### 6.2 单元测试

**组件测试**:
```typescript
// tests/unit/ExamCard.test.tsx
import { render, screen } from '@testing-library/react';
import ExamCard from '@/components/exam/ExamCard';

describe('ExamCard组件', () => {
  test('正确渲染考试信息', () => {
    const exam = {
      id: 1,
      title: '数学期中考试',
      subject: '数学',
      startTime: '2025-10-22 14:00:00'
    };

    render(<ExamCard exam={exam} role="student" onAction={() => {}} />);

    expect(screen.getByText('数学期中考试')).toBeInTheDocument();
    expect(screen.getByText('科目: 数学')).toBeInTheDocument();
  });
});
```

**API测试**:
```typescript
// tests/unit/examCenterApi.test.ts
import { examCenterApi } from '@/services/examCenterApi';

describe('考试中心API', () => {
  test('获取学生统计数据', async () => {
    const stats = await examCenterApi.getStudentStats();

    expect(stats).toHaveProperty('toBeAttended');
    expect(stats).toHaveProperty('averageScore');
  });
});
```

### 6.3 性能测试

```typescript
// tests/performance/exam-center-performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('考试中心性能测试', () => {
  test('学生考试中心加载时间 < 2秒', async ({ page }) => {
    await loginAsStudent(page);

    const startTime = Date.now();
    await page.goto('/student/exam-center');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  });

  test('考试列表支持1000+数据', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/exam-center');

    // 验证虚拟滚动生效
    const renderedRows = await page.locator('.ant-table-tbody tr').count();
    expect(renderedRows).toBeLessThan(100); // 虚拟滚动只渲染可见行
  });
});
```

---

## 7. 上线方案

### 7.1 上线前检查清单

**功能检查**:
- [ ] 学生考试中心所有功能正常
- [ ] 教师考试中心所有功能正常
- [ ] 管理员考试中心所有功能正常
- [ ] 所有E2E测试通过（100%）
- [ ] 无已知Critical/High bug

**性能检查**:
- [ ] 页面加载时间 < 2秒
- [ ] API响应时间 < 1秒
- [ ] 虚拟滚动已启用
- [ ] 图片和资源已优化

**安全检查**:
- [ ] 权限验证正常（前后端）
- [ ] SQL注入测试通过
- [ ] XSS攻击测试通过
- [ ] CSRF保护已启用

**兼容性检查**:
- [ ] Chrome最新版测试通过
- [ ] Firefox最新版测试通过
- [ ] Safari测试通过
- [ ] Edge测试通过
- [ ] 移动端适配测试通过

**文档检查**:
- [ ] API文档已更新
- [ ] 用户手册已编写
- [ ] 测试文档已完善
- [ ] 代码注释完整

### 7.2 上线步骤

#### 7.2.1 预生产环境验证（1天）

```bash
# 1. 构建生产版本
npm run build

# 2. 部署到预生产环境
docker-compose -f docker-compose.staging.yml up -d

# 3. 运行完整测试套件
npm run test:e2e:production

# 4. 性能测试
npm run test:performance

# 5. 手动验证核心流程
```

#### 7.2.2 数据库迁移（如需要）

```bash
# 1. 备份生产数据库
pg_dump guiyang_oj > backup_$(date +%Y%m%d).sql

# 2. 运行迁移脚本
psql -d guiyang_oj -f database/migrations/add_exam_center_tables.sql

# 3. 验证数据完整性
psql -d guiyang_oj -c "SELECT COUNT(*) FROM exams;"
```

#### 7.2.3 生产环境部署（1天）

```bash
# 1. 创建发布标签
git tag v2.4.0-exam-center
git push origin v2.4.0-exam-center

# 2. 部署到生产环境
docker-compose down
docker-compose up -d --build

# 3. 健康检查
curl http://localhost:3001/health

# 4. 验证核心功能
# - 学生登录并访问考试中心
# - 教师创建考试
# - 管理员查看仪表板
```

#### 7.2.4 灰度发布策略（可选）

**阶段1**: 内测（5%用户）
- 选择5%的用户开放新功能
- 监控错误率和性能指标
- 收集用户反馈

**阶段2**: 小规模发布（25%用户）
- 扩大到25%用户
- 持续监控系统稳定性

**阶段3**: 全量发布（100%用户）
- 确认无重大问题后全量发布

### 7.3 监控与回滚

#### 7.3.1 监控指标

部署后24小时内监控:
- ✅ 错误率 < 0.1%
- ✅ 响应时间 < 2秒
- ✅ API成功率 > 99%
- ✅ 数据库连接正常
- ✅ 内存使用率 < 80%

#### 7.3.2 回滚计划

**触发条件**:
- 错误率 > 1%
- 核心功能不可用
- 数据丢失或损坏
- 性能严重下降

**回滚步骤**:
```bash
# 1. 快速回滚到上一版本
git checkout v2.3.0
docker-compose down
docker-compose up -d --build

# 2. 如需要，恢复数据库
psql -d guiyang_oj < backup_YYYYMMDD.sql

# 3. 验证系统恢复
curl http://localhost:3001/health

# 4. 通知用户
```

---

## 8. 附录

### 8.1 参考文档

- [功能需求文档](./FEATURE_REQUIREMENTS.md)
- [开发进度文档](./PROGRESS.md)
- [前端开发实践](./FRONTEND_BEST_PRACTICES.md)
- [测试脚本最佳实践](../tests/docs/测试脚本最佳实践.md)

### 8.2 技术栈

**前端**:
- React 18
- TypeScript 5.x
- Ant Design 5.x
- Redux Toolkit
- @ant-design/charts (数据可视化)
- Playwright (E2E测试)

**后端**:
- Node.js 18
- Express.js 4.x
- PostgreSQL 15
- Redis 7
- JWT认证

**开发工具**:
- Docker + Docker Compose
- ESLint + Prettier
- Husky (Git Hooks)
- VS Code

### 8.3 团队协作

**沟通渠道**:
- 每日站会 (15分钟)
- 周进度评审
- 代码Review (Pull Request)
- 问题追踪 (GitHub Issues)

**代码规范**:
- 遵循ESLint规则
- TypeScript严格模式
- Conventional Commits提交规范
- 代码注释完整

### 8.4 常见问题FAQ

**Q1: 考试中心和现有考试列表有什么区别？**
A: 考试中心是统一的考试管理入口，整合了报名、参加、成绩、统计等所有功能；现有考试列表仅提供基础的考试浏览和参加功能。

**Q2: 三个角色的考试中心是否共用组件？**
A: 部分基础组件共用（如ExamCard、ExamStatusTag），但每个角色有专属的页面和业务逻辑。

**Q3: 是否需要删除现有的考试相关页面？**
A: 不需要立即删除，可以先并行运行，待考试中心稳定后再逐步迁移用户。

**Q4: 如何处理历史数据？**
A: 现有的exams和student_exams表无需迁移，考试中心直接使用这些表。

**Q5: 性能优化策略是什么？**
A: 启用虚拟滚动、分页加载、API响应缓存、代码分割、图片懒加载。

---

**文档维护**: 本文档应在开发过程中持续更新
**下一步行动**:
1. [ ] 团队评审此计划
2. [ ] 分配开发任务
3. [ ] 创建GitHub Milestones
4. [ ] 开始第一阶段开发

---

*文档结束*
