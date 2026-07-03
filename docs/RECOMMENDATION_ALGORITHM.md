# 智能推荐算法设计文档

> 本文档记录"智能练习"模块的推荐算法(算法②碎片化推荐 / 算法③每日推题)、答题判题与积分反馈逻辑，供后期回溯、调参与演进参考。
>
> 所有内容以实际代码为准（代码为 single source of truth）。若代码与本文档冲突，以代码为准并同步更新本文档。

---

## 1. 模块目标

为学生提供两类个性化推题入口：

| 入口 | 算法 | 目标 |
|------|------|------|
| 碎片化推荐 | 算法② `QuestionRecommender` | 实时计算，针对薄弱知识点推荐 N 道新题 |
| 每日推题 | 算法③ `DailyQuestionService` | 每日 10 题 = 错题复习 + 弱项新题，当天缓存 |

设计原则：**薄弱点优先**（掌握度权重最高）、难度落在最近发展区、错题间隔重复、已掌握题不再推、**仅推客观题**（`single/multiple/true_false/blank`，支持在线作答与自动判题，不推 `code/essay/matching`）。

### 1.1 推荐数据流总览（两条独立管线）

推荐结果 = **新题槽** + **复习槽**，两条线数据源独立、互为补充：

| 管线 | 数据源 | 占比 | 依赖错题？ | 选题依据 |
|------|--------|------|-----------|----------|
| **新题槽**（主体） | `question_bank` 候选池 | 碎片化 70%、每日 65% | 否 | 掌握度 0.35 + 难度匹配 0.25 + 新鲜度 0.15 打分 |
| **复习槽**（温故） | `student_wrong_questions` 错题集 | 碎片化 30%、每日 35% | 是 | SM-2 到期程度 |

> ⚠️ **常见误解澄清**：错题只是「复习槽」这一条线的来源，**不是整个推荐的来源**。新题槽才是主体，没有错题也能正常推荐（见下方冷启动）。

**冷启动（学生没做过题）时如何推荐？**
新题槽在零数据下靠默认值兜底，仍能推题：
- `_getAbility` 无掌握度记录 → 能力默认 **0.5**
- 知识点未覆盖 → 掌握度默认 **0.5**（中性）
- 新鲜度：没做过 → **满分 1**
- 已答对集合空 → 不排除任何题
- 复习槽空 → 配额全部让给新题（每日 10 题全为新题）

→ 退化为「**难度匹配 + 新鲜度 + 同质去重**」选题。全新学生登录选科目即可立即拿到难度适中、互不雷同的题。

**随答题积累逐步精准**：

| 积累的数据 | 作用管线 | 效果 |
|-----------|----------|------|
| `student_knowledge_stats`（知识点正确率） | 新题槽 | 薄弱知识点被优先推（mastery 因子生效） |
| `student_wrong_questions`（错题集） | 复习槽 | SM-2 到期错题回流复习 |
| `student_question_practice` / `answers` 答对记录 | 新题槽 | 答对的题不再重复推（correctSet 排除） |

### 1.2 设计决策：卷子错题入错题集

正式活动/卷子提交批量判题时，客观题答错会调用 `WrongQuestion.addIfWrong` 入错题集（`backend/src/routes/studentActivities.js` 提交接口的批量判题循环）。**决定保留**，理由：

- 卷子是学生**最大量的答题场景**，也是错题的主要产生地；若只收推荐练习的错题，错题集会很稀疏。
- 复习槽（每日 35% / 碎片化 30% 配额）的数据来源就是错题集；错题过少 → 复习槽常空 → SM-2 间隔复习无法发挥作用。
- 已与积分、连胜、推荐复习槽打通；去掉只削弱"温故"这一环，**不影响新题推荐**。

> 即：「没有错题就不能推荐」是误解；真正的影响是「复习功能需要足够多的错题才有意义」。

---

## 2. 数据模型

推荐依赖以下表（PostgreSQL）：

| 表 | 作用 |
|----|------|
| `question_drafts` | 题目内容主表：`content / options / correct_answer / explanation / type / difficulty / knowledge_points / grade / subject` |
| `question_bank` | 发布记录：`draft_id / status / is_active / is_hidden`。一个 draft 可对应多条发布记录 |
| `student_knowledge_stats` | 学生知识点掌握度：`(student_id, subject, knowledge_point) → accuracy_rate(0-100), total_questions` |
| `student_wrong_questions` | 错题集：`review_count / last_wrong_at / status(active/inactive)`，供 SM-2 间隔重复。**错题来源两处**：① 卷子提交批量判题答错（`studentActivities` 提交接口）② 推荐答题答错（见 §5） |
| `student_question_practice` | **推荐答题记录**：`(student_id, question_id) → is_correct`，用于排除已答对的题 |
| `answers` + `student_activities` | 正式活动答题记录，同样参与"已答对排除" |

> `student_question_practice` 与正式 `answers` 表解耦：推荐答题是独立碎片化练习，不在任何活动内，故单独记录。建表迁移见 `database/migrations/create_student_question_practice.sql`。

---

## 3. 算法② 碎片化推荐（QuestionRecommender）

**代码位置**：`backend/src/services/recommend/QuestionRecommender.js`

### 3.1 评分公式

```
Score(q) = 0.35·mastery + 0.25·zpd + 0.20·spaced + 0.15·novelty − 0.05·homogenize
```

| 因子 | 权重 | 含义 |
|------|------|------|
| **mastery（掌握度）** | **0.35（最高）** | 题目涉及知识点中**最低正确率** → `1 - min(正确率)`。越薄弱分越高 |
| zpd（最近发展区） | 0.25 | 期望正确率落在 `[0.6, 0.85]` 得分最高 |
| spaced（间隔重复） | 0.20 | 错题按 SM-2 到期程度打分 |
| novelty（新鲜度） | 0.15 | 近 7 天做过的题得 0 分 |
| homogenize（同质惩罚） | 0.05 | 与批次内已选同质则跳过（去重） |

### 3.2 各因子计算

#### mastery（薄弱优先）
```js
kps = q.knowledge_points;  // 题目知识点数组
accs = kps.map(kp => mastery[kp] ? mastery[kp].accuracy : 0.5);  // 未覆盖知识点默认 0.5
masteryScore = 1 - Math.min(...accs);  // 取最薄弱知识点 → 分越高
```
> 这就是"针对性薄弱点推荐"的核心：题目只要含一个未掌握的知识点，就会被优先推荐。

#### zpd（ZPD 难度匹配）
```js
// 难度 → 基准期望正确率
dMap = { easy: 0.85, medium: 0.65, hard: 0.4 };
expected = min(1, max(0, dMap[difficulty] * (0.5 + ability)));
// ability = 学生该科目平均正确率（0-1），取自 student_knowledge_stats
// 落在 [0.6, 0.85] → 1.0；低于 0.6 → expected/0.6；高于 0.85 → (1-expected)/0.15
```

#### spaced（SM-2 间隔重复）
```js
// 间隔天数：I(0)=1, I(1)=3, I(n)=round(3 * 2.5^(n-1))
interval = n===0 ? 1 : n===1 ? 3 : round(3 * 2.5^(n-1));
elapsedDays = (now - last_wrong_at) / 86400000;
spacedScore = elapsedDays >= interval ? 1 : max(0, elapsedDays / interval);
```
> n = `student_wrong_questions.review_count`（重做次数）。到期/过期得 1，未到期按接近程度递减。

#### novelty（新鲜度）
```js
noveltyScore = 近7天答过(draft_id ∈ recentSet) ? 0 : 1;
// recentSet 取自 answers 表近 7 天记录
```

#### homogenize（同质去重）
打分排序后，取 `top count*3` 候选池，贪心选择；每选一道，调用 `QuestionSimilarityService.checkHomogeneity` 与已选比对，同质则跳过。

### 3.3 候选池与排除规则

候选池（`question_bank ⋈ question_drafts`）采用**两级范围**（同年级优先，不足时回退，应对题库偏小）：
- 第一级（同年级）：`qd.grade = 学生年级 AND qd.subject = 科目`
- 第二级（全年级兜底）：当同年级去排除后选不足 `count` 时，回退 `qd.subject = 科目` 的**其他年级**题补足
- 公共筛选：`status = 'published'` 且 `is_active = true` 且 `is_hidden ≠ true`
- **仅客观题**：`type IN ('single','multiple','true_false','blank')`（不推编程/问答/匹配）
- 各级 `LIMIT 500`

**排除规则**（打分循环中跳过）：
1. `excludeDraftIds`：调用方传入的 draft 排除集（如每日推题中已用作复习的 draft）
2. **`correctSet`：该生已答对的题**（重点）——来源是两处 UNION：
   - `student_question_practice` 中 `is_correct = true`（推荐答题答对）
   - `answers` 中 `is_correct = true`（正式活动答对）
3. **`excludeShownIds`：本会话已展示过的 `question_id`**（碎片化"换一批"时前端累积传入，强制换内容，见 3.6）
4. 同质去重阶段：与已选题同质

> 这保证了"答对的题不再重复推送"，且"换一批"能真正换内容。

**打分随机扰动**：排序键 `_sortScore = rawScore + Math.random()·JITTER`（`JITTER = 0.03`），让分数相近的题目每次顺序不同；返回字段 `score` 仍保留原始值供前端展示。薄弱优先的大方向不变（mastery 权重最高），但同分附近题目换一批时有真实变化。

### 3.4 返回字段

```js
{
  question_id, draft_id, difficulty, type,
  content,        // 完整题目内容（HTML，供作答展示）
  options,        // 选项（供作答展示）
  score,          // 综合分（保留4位小数）
  factors: { mastery, zpd, spaced, novelty }  // 各因子（保留3位）
}
```
> 注：`content` 返回完整内容（不再截断），`options` 一并返回，二者用于前端答题弹窗。

### 3.5 错题复习槽（碎片化推荐 `includeReviews`）

碎片化推荐（API 路由 `/recommend`）开启 `includeReviews` 时，先取 **~30%** 的 SM-2 到期客观题错题作为复习槽，剩余配额给打分新题：

```
碎片化 N 题 = round(N·0.30) 道到期错题 + (N − 复习数) 道打分新题
```

- 复习槽来源：`_getDueReviews`（`status='active'` 的客观题错题）——先按 `_spacedScore` 到期程度排序取"较到期"候选池（top `limit·2`），**池内 Fisher-Yates 随机采样** `limit` 道，避免每次换一批都是同样错题；`excludeShownIds` 同时作用于复习槽
- 复习题的 `draft_id` 并入 `excludeDraftIds`，**新题槽不再重复推送**
- 合并后统一做同质去重（复习槽优先放入，新题补足至 N）
- 复习题项标记 `factors.review = true`、`score = dueScore`（便于前端区分）
- `meta.reviewCount` 返回实际混入的错题数

> 每日推题（算法③）自行管理复习槽（35%），调用 `recommend` 时 **不** 开启 `includeReviews`（默认 false），避免复习题重复。

### 3.6「换一批」机制（碎片化推荐）

碎片化推荐点"换一批"时，前端把**本会话已展示的 `question_id` 累积**传入 `excludeShownIds`，后端据此排除已展示题，彻底解决"换一批结果不变"（算法此前纯确定性 + 同年级候选偏小，导致每次返回相同题目）：

- 前端 `shownRecIdsRef` 累积每批 qid，请求 `/recommend?subject=..&excludeShownIds=1,2,3`
- 后端排除 shown → 同年级不足触发全年级兜底（3.3）→ 若 `selected` 仍为空且 `shownSet` 非空，**清空 shown 重试**（保证总有题可推）
- 前端额外兜底：返回 < 3 道时重置 `shownRecIdsRef` 重新拉取，形成循环推荐
- 切科目清空累积，避免跨科目误排除
- 每日推题（算法③）当天题集缓存固定，不参与此机制

---

## 4. 算法③ 每日推题（DailyQuestionService）

**代码位置**：`backend/src/services/recommend/DailyQuestionService.js`

### 4.1 题集结构

```
每日 10 题 = 35% 错题复习 + 65% 弱项新题
  reviewCount = round(10 * 0.35) = 3~4
  newCount    = 10 - reviewCount
```

### 4.2 槽位生成

- **槽1 错题复习**：取 SM-2 到期的错题（`_getDueReviews`）
  - 按 `last_wrong_at ASC` 取 `limit*3`，再用 `_spacedScore` 排序取 top `limit`
  - 仅取客观题错题（`type IN ('single','multiple','true_false','blank')`）
- **槽2 弱项新题**：调用 `QuestionRecommender.recommend`，`count = newCount + 5`（多取以备同质去重），`excludeDraftIds = 槽1已用的 draft`
- **合并 + 同质去重**：贪心遍历合并集，调用 `checkHomogeneity` 去重至 `count` 道

### 4.3 当日缓存

生成结果 upsert 到 `daily_question_sets(student_id, stat_date, subject, question_ids)`：
- `getToday` 先查缓存，无则即时生成
- 当天题集固定，不因答题变化（保证一天内题量稳定）
- cron `warmupRecentStudents`：每日 03:07 为近 14 天活跃学生预热（`LIMIT 500`）

### 4.4 详情返回

`getToday` 附加 `questions` 数组（按 `question_ids` 原顺序）：
```js
{ question_id, draft_id, content, options, type, difficulty }
```
> **刻意不返回 `correct_answer / explanation`**，避免答案泄露；判对错统一走答题接口。

---

## 5. 答题判题与反馈

### 5.1 接口

`POST /api/student/activities/recommend/:questionId/answer`，body `{ answer }`

**代码位置**：`backend/src/routes/studentActivities.js`

### 5.2 判题规则（judgeObjective）

文件内局部函数（与 `wrongQuestions.js` 的 redo 判题一致）：

| 题型 | 判定 |
|------|------|
| `single` / `true_false` | 标准化后 `a === correct` 且非空 |
| `multiple` | 数组排序后 `|` 连接比对（如 `A|C`） |
| `blank` | 答案在正确答案集合中（支持多答案） |
| `code` / `essay` / `matching` | 返回 `null`，**不支持自动判题** |

标准化 `norm`：去空白、转大写；数组排序去空；布尔转 `TRUE/FALSE`。

### 5.3 答题处理链

1. 取题目（`question_bank ⋈ question_drafts`）→ 判题
2. **upsert `student_question_practice`**（`source='recommend'`，保留最后作答状态）
3. 分支：
   - **答对**：
     - `PointsPolicy.awardForCorrectAnswer`（`isRedo:false, sourceType:'recommend_practice'`）
     - `WrongQuestion.markMastered`（若在错题集中，标记掌握 → 状态 inactive）
   - **答错**：
     - `WrongQuestion.addIfWrong`（幂等 upsert：已存在则 `error_count++`，重置 `status='active'`）
4. **连胜**：`StreakService.recordResult(correct)`（无论对错都更新，错则归零）
5. 返回 `{ correct, awarded, streak, type, options, correct_answer?, explanation? }`
   - `correct_answer / explanation` **仅答错时返回**（防泄露）

### 5.4 积分收益递减（PointsPolicy）

`awardForCorrectAnswer`（`backend/src/services/points/PointsPolicy.js`）：
```
basePoints = policy[difficulty + '_base']       // easy/medium/hard 基础分
points = floor(basePoints / (1 + λ · 当日该难度已答对数))   // λ = decay_lambda (默认0.15)
if (isRedo) points *= redoRatio                 // 错题重做打折 (默认0.5)
// 再受 单难度每日上限 / 每日总上限 约束
```
> 当学生当日答对题数较多时，`points` 会递减到 0（设计如此，防刷分）。此时 `awarded=0` 但连胜仍累计——属正常现象。

---

## 6. 前端

**代码位置**：`frontend/src/pages/student/SmartPracticePage.tsx`

- 两个 Tab（每日推题 / 碎片化推荐）共用同一答题弹窗
- **点击选择作答**（非手输）：
  - `single` / `true_false` → Radio
  - `multiple` → Checkbox.Group（提交选中 key 数组，如 `["A","C"]`）
  - `blank` → TextArea
  - `code / essay / matching` → 提示"不支持在线自动判题"
- **选项归一化 `normalizeOptions`**：题库 options 有三种格式，统一为 `{key, text}`：
  - 带前缀字符串数组 `["A. 12", "B. 15"]`（single/true_false）→ 提取字母 key + 去前缀 text
  - 对象数组 `[{label:"A",content:"Python"}]`（multiple）→ label 作 key，content 作 text
  - 无前缀字符串 → 用 `65+i` 推字母兜底
  > 这解决了"选项序号重复渲染"问题（数据已带 `A.` 前缀时不再补）。
- **true_false 的 key 是 `A`/`B`**（匹配 `correct_answer` 实际存储 `"A"/"B"`），**不是** `true/false`——与正式活动页 TakeActivityPage 不同（后者用 true/false 会判错）。
- **已作答移除（按来源分离）**：`dailyAnswered` 与 `recAnswered` 独立维护——每日推题作答不影响碎片化推荐列表，反之亦然；碎片化「换一批」重置 `recAnswered`，新批次可完整展示与重复作答。
- **「换一批」累积排除**：`shownRecIdsRef` 累积本会话已展示的 `question_id`，换一批时作为 `excludeShownIds` 传入后端强制换内容；返回 < 3 道时重置 ref 重新拉取形成循环；切科目清空累积（详见 3.6）。

**API 层**：`frontend/src/services/api.ts`
```ts
recommendApi.recommend(subject, count, excludeShownIds?)  // GET /student/activities/recommend
recommendApi.dailyQuestions(subject)                      // GET /student/activities/daily-questions
recommendApi.answerQuestion(questionId, answer)           // POST /student/activities/recommend/:id/answer
```

---

## 7. 关键文件索引

| 文件 | 职责 |
|------|------|
| `backend/src/services/recommend/QuestionRecommender.js` | 算法② 打分推荐 + 同质去重 + 已答对排除 |
| `backend/src/services/recommend/DailyQuestionService.js` | 算法③ 每日题集（复习+新题）+ 缓存 |
| `backend/src/services/similarity/QuestionSimilarityService.js` | 同质检测（算法①，复用） |
| `backend/src/routes/studentActivities.js` | 推荐题列表 / 每日推题 / **推荐答题判题** 接口 |
| `backend/src/routes/wrongQuestions.js` | 错题重做判题（参考实现） |
| `backend/src/models/WrongQuestion.js` | 错题入库 / 标记掌握 / 重做计数 |
| `backend/src/services/points/PointsPolicy.js` | 答题积分（收益递减 + 上限） |
| `backend/src/services/streak/StreakService.js` | 连胜 |
| `database/migrations/create_student_question_practice.sql` | 推荐答题记录表 |
| `frontend/src/pages/student/SmartPracticePage.tsx` | 智能练习页 + 答题弹窗 |

---

## 8. 调参与演进建议

当前权重（`QuestionRecommender.WEIGHTS`）：
```js
{ mastery: 0.35, zpd: 0.25, spaced: 0.20, novelty: 0.15, homogenize: 0.05 }
```

可调点：
- 若希望更激进地补薄弱：提高 `mastery`（如 0.45），降低 `novelty`
- 若希望更多复习错题：提高 `spaced`，或在算法③ 提高 `REVIEW_RATIO`（当前 0.35）
- `ZPD_LOW / ZPD_HIGH`（0.6 / 0.85）控制难度区间宽度
- `RECENT_DAYS`（7）控制新鲜度窗口
- SM-2 间隔系数 `2.5` 可按学科调整
- `JITTER`（0.03）打分随机扰动幅度：调大 → 换一批更多样但薄弱聚焦减弱；调小 → 更稳定但换一批变化少

数据冷启动：详见 §1.1。新生无任何答题记录时，推荐退化为「难度匹配 + 新鲜度 + 同质去重」，仍可正常推题；随答题积累（卷子 + 推荐练习），掌握度与错题数据丰富，推荐逐步精准。

---

**最后更新**：2026-07-03
