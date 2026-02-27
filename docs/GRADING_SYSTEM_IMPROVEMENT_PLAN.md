# 批改判题系统完善计划

**创建日期**: 2026-02-27
**状态**: 待开发
**预计工期**: 11小时

---

## 一、当前系统状态

### 1.1 自动判题服务 (autoGradingService.js)

| 题型 | 代码标识 | 自动判题 | 判题方式 | 优先级 |
|------|---------|---------|---------|-------|
| 单选题 | `single` | ✅ 支持 | 精确匹配选项 | - |
| 多选题 | `multiple` | ✅ 支持 | 数组完全匹配 | - |
| 填空题 | `blank` / `fill_blank` | ✅ 支持 | 多答案支持(\|分隔) | - |
| 判断题 | `true_false` | ⚠️ 归类到single | 应独立支持 | **P0** |
| 编程题 | `code` | ✅ 支持 | judge-service异步 | - |
| 主观题 | `essay` | ❌ 不支持 | 需人工批改 | - |
| 匹配题 | `matching` | ❌ 不支持 | 需人工批改 | **P0** |

### 1.2 批改状态流转

```
┌─────────────┐
│   pending   │ 学生刚提交，待批改
└──────┬──────┘
       │ [自动判题服务]
       ▼
┌──────────────┐
│ auto_graded  │ 已自动评分（全客观题）
└──────┬───────┘
       │ [发现主观题]
       ▼
┌────────────────┐
│ partial_graded │ 部分评分（有主观题待批）
└──────┬─────────┘
       │ [教师批改剩余]
       ▼
┌──────────────┐
│  completed   │ 已完成 → status = 'graded'
└──────────────┘
```

### 1.3 "谁发布谁批改"原则

已实现在 `backend/src/routes/grading.js` 路由中：

```javascript
WHERE a.created_by = $1  // 只能批改自己创建的活动
```

权限控制：
- **创建者**: 完全批改权限
- **管理员**: 可查看所有，但遵循"谁发布谁批改"
- **其他教师**: 无权批改

### 1.4 学生端结果页面 (ActivityResultPage.tsx)

当前状态：
- ✅ 显示总分、正确率、答题统计
- ✅ 练习立即显示答案，测评需等待result_publish_time
- ❌ **未按题型分组显示**（当前是按序号平铺）
- ❌ 缺少题型级别的分数统计

### 1.5 教师端批改页面 (GradingDetailPage.tsx)

当前状态：
- ✅ 显示学生答案、评分输入、评语
- ✅ 批量保存、完成评卷
- ✅ 题目导航（侧边栏）
- ❌ **未按题型分组显示**
- ❌ 缺少题型级别的批改进度统计
- ❌ 缺少题型快速跳转

---

## 二、改进目标

### 2.1 完善自动判题服务

#### 目标1: 判断题独立支持

**当前问题**: `true_false` 类型被归类为 `single` 处理，不够规范

**支持格式**:
- 布尔值: `true` / `false`
- 数字: `1` / `0`
- 中文: `对` / `错`、`是` / `否`
- 英文简写: `T` / `F`、`Y` / `N`

**实现位置**: `backend/src/services/autoGradingService.js`

#### 目标2: 匹配题自动判题

**当前问题**: `matching` 类型完全不支持自动判题

**数据格式**:
```javascript
// 学生答案格式
[{"A":"1"}, {"B":"2"}, {"C":"3"}]

// 正确答案格式（支持两种）
[{"left":"A", "right":"1"}, {"left":"B", "right":"2"}, ...]
// 或
[{"A":"1"}, {"B":"2"}, ...]
```

**评分规则**: 按正确匹配数量比例给分

### 2.2 优化学生端结果展示

#### 目标1: 按题型分组显示

**格式要求**:
```
一、单选题（共5题，共10分）
1. 题目内容...
2. 题目内容...

二、多选题（共3题，共9分）
1. 题目内容...
2. 题目内容...
```

#### 目标2: 题型分数统计

- 各题型得分/满分
- 各题型正确率

### 2.3 优化教师端批改界面

#### 目标1: 按题型分组显示

与学生端类似的结构

#### 目标2: 题型快速导航

侧边栏按题型分组，点击快速跳转

#### 目标3: 题型统计卡片

显示各题型的批改进度

---

## 三、实现方案

### 3.1 后端实现

#### 3.1.1 添加判断题判题方法

**文件**: `backend/src/services/autoGradingService.js`

```javascript
/**
 * Grade true/false question
 * @param {string} studentAnswer - Student's answer
 * @param {string|Object} correctAnswer - Correct answer
 * @param {number} maxScore - Maximum score
 * @returns {Object} Grading result
 */
static gradeTrueFalse(studentAnswer, correctAnswer, maxScore) {
  // 标准化输入
  const normalizedStudent = String(studentAnswer || '').trim().toLowerCase();
  const normalizedCorrect = String(correctAnswer || '').trim().toLowerCase();

  // 支持多种格式
  const trueValues = ['true', '1', '对', '是', 't', 'y', 'yes'];
  const falseValues = ['false', '0', '错', '否', 'f', 'n', 'no'];

  const studentBool = trueValues.includes(normalizedStudent) ? true :
                      falseValues.includes(normalizedStudent) ? false : null;
  const correctBool = trueValues.includes(normalizedCorrect) ? true :
                       falseValues.includes(normalizedCorrect) ? false : null;

  const isCorrect = studentBool === correctBool && studentBool !== null;

  return {
    isCorrect,
    score: isCorrect ? parseFloat(maxScore) : 0,
    message: isCorrect ? '正确' : '错误'
  };
}
```

#### 3.1.2 添加匹配题判题方法

**文件**: `backend/src/services/autoGradingService.js`

```javascript
/**
 * Grade matching question
 * @param {string|Array} studentAnswer - Student's answer (JSON array)
 * @param {string|Object|Array} correctAnswer - Correct answer
 * @param {number} maxScore - Maximum score
 * @returns {Object} Grading result
 */
static gradeMatching(studentAnswer, correctAnswer, maxScore) {
  try {
    let studentPairs = [];
    let correctPairs = [];

    // 解析学生答案
    if (typeof studentAnswer === 'string') {
      studentPairs = JSON.parse(studentAnswer);
    } else if (Array.isArray(studentAnswer)) {
      studentPairs = studentAnswer;
    }

    // 解析正确答案
    if (typeof correctAnswer === 'string') {
      correctPairs = JSON.parse(correctAnswer);
    } else if (correctAnswer.pairs && Array.isArray(correctAnswer.pairs)) {
      correctPairs = correctAnswer.pairs;
    } else if (Array.isArray(correctAnswer)) {
      correctPairs = correctAnswer;
    }

    // 标准化为 {left, right} 格式
    const normalizePair = (pair) => {
      if (pair.left && pair.right) {
        return { left: String(pair.left), right: String(pair.right) };
      }
      const keys = Object.keys(pair);
      return { left: keys[0], right: String(pair[keys[0]]) };
    };

    const normalizedStudent = studentPairs.map(normalizePair);
    const normalizedCorrect = correctPairs.map(normalizePair);

    // 计算正确匹配数量
    let correctCount = 0;
    normalizedCorrect.forEach(correct => {
      const match = normalizedStudent.find(s =>
        s.left === correct.left && s.right === correct.right
      );
      if (match) correctCount++;
    });

    const totalCount = normalizedCorrect.length;
    const scorePerPair = totalCount > 0 ? parseFloat(maxScore) / totalCount : 0;
    const earnedScore = correctCount * scorePerPair;

    return {
      isCorrect: correctCount === totalCount,
      score: earnedScore,
      correctCount,
      totalCount,
      correctRate: totalCount > 0 ? correctCount / totalCount : 0
    };
  } catch (error) {
    logger.error('Grade matching error:', error);
    return {
      isCorrect: false,
      score: 0,
      error: 'Matching grading error'
    };
  }
}
```

#### 3.1.3 更新 autoGradeActivity 方法

**文件**: `backend/src/services/autoGradingService.js`

在第66-70行附近修改：

```javascript
// 检查题型并调用相应的判题方法
const normalizedType = question_type === 'blank' ? 'fill_blank' : question_type;

if (['single', 'multiple', 'fill_blank'].includes(normalizedType)) {
  // 现有的客观题判题
  const gradingResult = this.gradeQuestion(
    normalizedType,
    student_answer,
    correct_answer,
    max_score
  );
  // ... 更新答案
} else if (question_type === 'true_false') {
  // 新增：判断题判题
  const gradingResult = this.gradeTrueFalse(
    student_answer,
    correct_answer,
    max_score
  );
  // ... 更新答案
} else if (question_type === 'matching') {
  // 新增：匹配题判题
  const gradingResult = this.gradeMatching(
    student_answer,
    correct_answer,
    max_score
  );
  // ... 更新答案
} else if (question_type === 'code') {
  // 现有的编程题判题
  // ...
} else {
  // 主观题待人工批改
  hasSubjectiveQuestions = true;
}
```

### 3.2 前端实现

#### 3.2.1 学生端结果页面 - 按题型分组

**文件**: `frontend/src/pages/student/ActivityResultPage.tsx`

添加题型分组逻辑：

```typescript
// 题型顺序
const typeOrder: Record<string, number> = {
  single: 1,
  multiple: 2,
  true_false: 3,
  blank: 4,
  essay: 5,
  code: 6,
  matching: 7,
};

// 中文数字
const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七'];

// 按题型分组
const groupAnswersByType = (answers: AnswerResult[]) => {
  const grouped = answers.reduce((acc, answer) => {
    const type = answer.question_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(answer);
    return acc;
  }, {} as Record<string, AnswerResult[]>);

  // 按typeOrder排序
  return Object.entries(grouped)
    .sort((a, b) => (typeOrder[a[0]] || 99) - (typeOrder[b[0]] || 99))
    .map(([type, typeAnswers]) => {
      const typeMaxScore = typeAnswers.reduce((sum, a) =>
        sum + parseFloat(a.max_score || 0), 0
      );
      return { type, answers: typeAnswers, maxScore: typeMaxScore };
    });
};
```

渲染分组题目：

```tsx
{/* 答题详情 - 按题型分组 */}
<Card title={<Title level={4}>答题详情</Title>}>
  {groupAnswersByType(answers).map((group, groupIndex) => (
    <div key={group.type} style={{ marginBottom: 24 }}>
      <Title level={5}>
        {chineseNumbers[groupIndex] || groupIndex + 1}、
        {getQuestionTypeName(group.type)}
        （共{group.answers.length}题，共{group.maxScore}分）
      </Title>
      {group.answers.map((answer, index) => (
        <Card
          key={answer.id}
          type="inner"
          style={{ marginBottom: 12 }}
          title={
            <Space>
              <Text strong>{index + 1}. </Text>
              {/* ... 其他标题信息 */}
            </Space>
          }
        >
          {/* ... 题目内容 */}
        </Card>
      ))}
    </div>
  ))}
</Card>
```

#### 3.2.2 教师端批改页面 - 按题型分组

**文件**: `frontend/src/pages/teacher/GradingDetailPage.tsx`

与学生端类似的分组逻辑，添加：
- 题型分组显示
- 题型快速导航（侧边栏）
- 题型批改进度统计

---

## 四、测试计划

### 4.1 单元测试

**测试文件**: `backend/tests/services/autoGradingService.test.js`

| 测试用例 | 描述 |
|---------|------|
| test_grade_true_false_correct | 判断题-正确答案 |
| test_grade_true_false_incorrect | 判断题-错误答案 |
| test_grade_true_false_formats | 判断题-多种格式支持 |
| test_grade_matching_full_score | 匹配题-满分 |
| test_grade_matching_partial_score | 匹配题-部分分数 |
| test_grade_matching_zero_score | 匹配题-零分 |

### 4.2 E2E测试

**测试文件**: `tests/e2e/regression/grading-system.spec.ts`

| 测试用例 | 编号 | 描述 |
|---------|------|------|
| 判断题自动判题 | GRD001 | 提交判断题后自动评分正确 |
| 匹配题自动判题 | GRD002 | 提交匹配题后按比例给分 |
| 学生结果题型分组 | GRD003 | 结果页按题型分组显示 |
| 教师批改题型分组 | GRD004 | 批改页按题型分组显示 |

---

## 五、开发任务清单

### Bug 修复 (优先)

- [ ] **🐛 Bug修复**: 评卷列表不显示已完成自动判题的活动
  - 文件: `backend/src/services/autoGradingService.js` 第138行
  - 修改: 将无主观题的活动状态从 `completed` 改为 `auto_graded`
  - 预计: 10分钟

### 功能开发

- [ ] **P0**: 添加判断题独立判题方法 (1h)
- [ ] **P0**: 添加匹配题自动判题方法 (2h)
- [ ] **P1**: 更新autoGradeActivity支持新题型 (1h)
- [ ] **P1**: 学生端结果按题型分组显示 (2h)
- [ ] **P2**: 教师端批改界面按题型分组 (2h)
- [ ] **P2**: 添加题型快速导航和统计 (1h)
- [ ] **P3**: API单元测试编写 (1h)
- [ ] **P3**: E2E测试编写 (1h)

---

## 六、相关文件

### 后端
- `backend/src/services/autoGradingService.js` - 自动判题服务
- `backend/src/routes/grading.js` - 教师评卷路由
- `backend/src/routes/studentActivities.js` - 学生活动路由

### 前端
- `frontend/src/pages/student/ActivityResultPage.tsx` - 学生结果页面
- `frontend/src/pages/teacher/GradingListPage.tsx` - 教师批改列表
- `frontend/src/pages/teacher/GradingDetailPage.tsx` - 教师批改详情
- `frontend/src/pages/student/TakeActivityPage.tsx` - 学生答题页面

### 测试
- `tests/e2e/regression/grading-system.spec.ts` - E2E测试（待创建）
- `backend/tests/services/autoGradingService.test.js` - 单元测试（待创建）

### 文档
- `docs/DEVELOPMENT_STATUS.md` - 开发状态追踪
- `docs/API_Document.md` - API文档
