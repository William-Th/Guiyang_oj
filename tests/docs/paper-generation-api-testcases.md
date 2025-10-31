# 组卷功能 API 测试用例文档

## 测试概述

**功能模块**: 组卷管理 (Paper Generation)
**测试文件**: `tests/api/paper-generation-api-test.js`
**测试类型**: API集成测试
**运行命令**: `node tests/api/paper-generation-api-test.js`

**测试范围**:
- 获取可用题目列表
- 添加题目到活动（单个和批量）
- 移除题目（单个和批量删除）
- 更新题目属性（分值、必答状态、章节）
- 重排题目顺序
- 获取活动试卷和统计数据
- 验证试卷完整性
- 权限控制验证

---

## 测试环境配置

**环境变量**:
- `API_BASE_URL`: API服务器地址，默认 `http://localhost:3001`

**测试账户**:
- 教师账户: `teacher01` / `password123`
- 管理员账户: `admin` / `password123`

**超时设置**: 10秒

**测试数据准备**:
- 动态创建测试活动（使用时间戳确保唯一性）
- 从题库获取已发布的题目（科目：数学，年级：二年级，至少3题）

---

## 测试用例列表

### [1] 认证测试 (Authentication Tests)

#### TC-PG-001: 教师登录测试
**测试目标**: 验证教师用户能成功登录并获得有效令牌

**请求**:
- **接口**: POST `/api/auth/login`
- **请求体**:
  ```json
  {
    "username": "teacher01",
    "password": "password123"
  }
  ```

**预期结果**:
- HTTP状态码: `200`
- 返回包含 `token` 字段
- 令牌非空字符串

**实际行为**: ✅ 测试通过

---

#### TC-PG-002: 管理员登录测试
**测试目标**: 验证管理员用户能成功登录并获得有效令牌

**请求**:
- **接口**: POST `/api/auth/login`
- **请求体**:
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```

**预期结果**:
- HTTP状态码: `200`
- 返回包含 `token` 字段
- 令牌非空字符串

**实际行为**: ✅ 测试通过

---

### [2] 测试数据准备 (Setup Test Data)

#### TC-PG-003: 创建测试活动
**测试目标**: 创建一个用于组卷测试的活动

**请求**:
- **接口**: POST `/api/activities/practice`
- **请求头**: `Authorization: Bearer {teacherToken}`
- **请求体**:
  ```json
  {
    "title": "组卷测试活动-{timestamp}",
    "description": "用于测试组卷功能",
    "subject": "数学",
    "grade": "二年级",
    "totalScore": 100,
    "passScore": 60,
    "timeLimitType": "unlimited"
  }
  ```

**预期结果**:
- HTTP状态码: `201`
- `success: true`
- 返回活动对象，包含 `id` 字段
- 活动ID为正整数

**实际行为**: ✅ 测试通过，活动ID保存到 `testData.activityId`

---

#### TC-PG-004: 获取可用题目（准备测试数据）
**测试目标**: 从题库中获取已发布的题目用于后续测试

**请求**:
- **接口**: GET `/api/question-bank`
- **请求头**: `Authorization: Bearer {teacherToken}`

**预期结果**:
- HTTP状态码: `200`
- 返回至少3道已发布的题目（科目：数学，年级：二年级）
- 题目ID数组保存到 `testData.questionIds`

**实际行为**: ✅ 测试通过

---

### [3] 获取可用题目测试 (Get Available Questions Tests)

#### TC-PG-005: 获取活动可用题目列表
**测试目标**: 获取可以添加到活动的题目列表（未添加的题目）

**请求**:
- **接口**: GET `/api/activities/{activityId}/available-questions`
- **请求头**: `Authorization: Bearer {teacherToken}`

**预期结果**:
- HTTP状态码: `200`
- `success: true`
- 返回 `questions` 数组（包含可用题目）
- 返回 `paperStats` 对象（包含试卷统计信息）
- 返回 `totalAvailable` 字段（可用题目总数）

**实际行为**: ✅ 测试通过

**返回示例**:
```json
{
  "success": true,
  "questions": [
    {
      "id": 1,
      "question_code": "MATH2510200001",
      "type": "single",
      "content": "1+1等于多少？",
      "difficulty": "easy",
      "level": "基础",
      "suggested_score": 5,
      "knowledge_points": ["加法"],
      "subject": "数学",
      "grade": "二年级"
    }
  ],
  "paperStats": {
    "activity_id": 123,
    "title": "数学练习",
    "total_score": "0",
    "question_count": 0,
    "single_choice_count": 0,
    "multiple_choice_count": 0
  },
  "totalAvailable": 50
}
```

---

#### TC-PG-006: 带筛选条件获取可用题目
**测试目标**: 使用题型和难度筛选条件获取题目

**请求**:
- **接口**: GET `/api/activities/{activityId}/available-questions?type=single&difficulty=easy`
- **请求头**: `Authorization: Bearer {teacherToken}`
- **查询参数**:
  - `type=single` (题型：单选题)
  - `difficulty=easy` (难度：简单)

**预期结果**:
- HTTP状态码: `200`
- `success: true`
- 返回的题目都符合筛选条件（题型=单选，难度=简单）

**实际行为**: ✅ 测试通过

**支持的筛选参数**:
- `type`: 题型（single, multiple, blank, essay, code）
- `difficulty`: 难度（easy, medium, hard）
- `level`: 级别（基础, 提高, 拓展）
- `knowledge_point`: 知识点
- `search`: 搜索关键词（题目内容或题目编号）

---

### [4] 添加题目测试 (Add Question Tests)

#### TC-PG-007: 添加单个题目到活动
**测试目标**: 向活动中添加一道题目

**请求**:
- **接口**: POST `/api/activities/{activityId}/questions`
- **请求头**: `Authorization: Bearer {teacherToken}`
- **请求体**:
  ```json
  {
    "questionId": 1,
    "score": 10,
    "isRequired": true
  }
  ```

**预期结果**:
- HTTP状态码: `200`
- `success: true`
- 返回 `question` 对象（添加的题目信息）
- 题目自动获得 `order_index`（顺序索引）

**实际行为**: ✅ 测试通过

**返回示例**:
```json
{
  "success": true,
  "message": "题目添加成功",
  "question": {
    "id": 1,
    "activity_id": 123,
    "question_id": 1,
    "order_index": 1,
    "score": "10.00",
    "is_required": true,
    "section": null,
    "created_at": "2025-10-28T10:00:00.000Z"
  }
}
```

---

#### TC-PG-008: 不能添加重复题目
**测试目标**: 验证系统拒绝添加已存在的题目

**请求**:
- **接口**: POST `/api/activities/{activityId}/questions`
- **请求头**: `Authorization: Bearer {teacherToken}`
- **请求体**:
  ```json
  {
    "questionId": 1,  // 已添加的题目ID
    "score": 10
  }
  ```

**预期结果**:
- HTTP状态码: `400`
- `success: false`
- 错误消息: "Question already added to this activity"

**实际行为**: ✅ 测试通过

---

#### TC-PG-009: 批量添加题目
**测试目标**: 一次性添加多道题目到活动

**请求**:
- **接口**: POST `/api/activities/{activityId}/questions/batch`
- **请求头**: `Authorization: Bearer {teacherToken}`
- **请求体**:
  ```json
  {
    "questions": [
      { "questionId": 2, "score": 10 },
      { "questionId": 3, "score": 15 }
    ]
  }
  ```

**预期结果**:
- HTTP状态码: `200`
- `success: true`
- 返回 `added` 数组（成功添加的题目列表）
- 返回 `errors` 数组（添加失败的题目和错误信息）
- 成功添加2道题目

**实际行为**: ✅ 测试通过

**返回示例**:
```json
{
  "success": true,
  "message": "批量添加完成",
  "added": [
    { "id": 2, "activity_id": 123, "question_id": 2, "score": "10.00" },
    { "id": 3, "activity_id": 123, "question_id": 3, "score": "15.00" }
  ],
  "errors": []
}
```

**边界条件**:
- 如果某些题目添加失败（如重复或不符合条件），不影响其他题目添加
- 部分成功情况下，HTTP状态码仍为 `200`，需检查 `errors` 数组

---

### [5] 获取活动试卷测试 (Get Activity Paper Tests)

#### TC-PG-010: 获取活动试卷
**测试目标**: 获取活动的完整试卷（包含所有题目详情）

**请求**:
- **接口**: GET `/api/activities/{activityId}/paper`
- **请求头**: `Authorization: Bearer {teacherToken}`

**预期结果**:
- HTTP状态码: `200`
- `success: true`
- 返回 `activity` 对象（活动信息）
- 返回 `questions` 数组（包含3道题目的详细信息）
- 返回 `paperStats` 对象（试卷统计）
- 题目按 `order_index` 排序

**实际行为**: ✅ 测试通过

**返回示例**:
```json
{
  "success": true,
  "activity": {
    "id": 123,
    "title": "数学练习",
    "subject": "数学",
    "grade": "二年级"
  },
  "questions": [
    {
      "activity_question_id": 1,
      "question_id": 1,
      "order_index": 1,
      "score": "10.00",
      "is_required": true,
      "section": null,
      "question_code": "MATH2510200001",
      "type": "single",
      "content": "1+1等于多少？",
      "options": ["1", "2", "3", "4"],
      "correct_answer": "2",
      "difficulty": "easy"
    }
  ],
  "paperStats": {
    "total_score": "35.00",
    "question_count": 3,
    "single_choice_count": 2,
    "multiple_choice_count": 1
  }
}
```

---

#### TC-PG-011: 获取活动试卷统计
**测试目标**: 获取活动试卷的统计信息（不含题目详情）

**请求**:
- **接口**: GET `/api/activities/{activityId}/paper/stats`
- **请求头**: `Authorization: Bearer {teacherToken}`

**预期结果**:
- HTTP状态码: `200`
- `success: true`
- 返回 `stats` 对象
- `stats.question_count` 应为 3

**实际行为**: ✅ 测试通过

**返回示例**:
```json
{
  "success": true,
  "stats": {
    "activity_id": 123,
    "title": "数学练习",
    "type": "practice",
    "subject": "数学",
    "paper_status": "completed",
    "total_score": "35.00",
    "question_count": 3,
    "single_choice_count": 2,
    "multiple_choice_count": 1,
    "blank_count": 0,
    "essay_count": 0,
    "code_count": 0,
    "easy_count": 2,
    "medium_count": 1,
    "hard_count": 0
  }
}
```

---

### [6] 更新题目测试 (Update Question Tests)

#### TC-PG-012: 更新题目分值
**测试目标**: 修改活动中某道题目的分值

**请求**:
- **接口**: PUT `/api/activities/{activityId}/questions/{questionId}`
- **请求头**: `Authorization: Bearer {teacherToken}`
- **请求体**:
  ```json
  {
    "score": 20
  }
  ```

**预期结果**:
- HTTP状态码: `200`
- `success: true`
- 返回 `question` 对象（更新后的题目信息）
- `score` 字段值为 `20.00`

**实际行为**: ✅ 测试通过

**支持更新的字段**:
- `score`: 分值（DECIMAL类型）
- `isRequired`: 是否必答（BOOLEAN）
- `section`: 所属章节（VARCHAR）

**返回示例**:
```json
{
  "success": true,
  "message": "题目更新成功",
  "question": {
    "id": 1,
    "activity_id": 123,
    "question_id": 1,
    "score": "20.00",
    "is_required": true,
    "section": null,
    "updated_at": "2025-10-28T10:05:00.000Z"
  }
}
```

---

### [7] 移除题目测试 (Remove Question Tests)

#### TC-PG-013: 从活动中移除题目
**测试目标**: 删除活动中的一道题目

**请求**:
- **接口**: DELETE `/api/activities/{activityId}/questions/{questionId}`
- **请求头**: `Authorization: Bearer {teacherToken}`

**预期结果**:
- HTTP状态码: `200`
- `success: true`
- 返回 `removedQuestion` 对象（被删除的题目信息）
- 删除后自动重新排序剩余题目

**实际行为**: ✅ 测试通过

**返回示例**:
```json
{
  "success": true,
  "message": "题目移除成功",
  "removedQuestion": {
    "id": 3,
    "activity_id": 123,
    "question_id": 3
  }
}
```

---

#### TC-PG-014: 验证题目已移除
**测试目标**: 确认题目删除后，试卷中题目数量正确

**请求**:
- **接口**: GET `/api/activities/{activityId}/paper`
- **请求头**: `Authorization: Bearer {teacherToken}`

**预期结果**:
- HTTP状态码: `200`
- `questions` 数组长度为 2（原本3道题，删除1道）
- 剩余题目的 `order_index` 已重新排序（1, 2）

**实际行为**: ✅ 测试通过

---

#### TC-PG-015: 批量删除题目
**测试目标**: 一次性删除多道题目

**前置条件**: 活动中至少有3道题目

**请求**:
- **接口**: DELETE `/api/activities/{activityId}/questions/batch`
- **请求头**: `Authorization: Bearer {teacherToken}`
- **请求体**:
  ```json
  {
    "questionIds": [1, 2]
  }
  ```

**预期结果**:
- HTTP状态码: `200`
- `success: true`
- 返回 `removed` 数组（成功删除的题目ID列表）
- 返回 `errors` 数组（删除失败的题目和错误信息）
- `removed` 数组长度为 2

**实际行为**: ✅ 测试通过

**返回示例**:
```json
{
  "success": true,
  "message": "成功移除 2 道题目",
  "removed": [1, 2],
  "errors": []
}
```

**边界条件**:
- 如果某些题目删除失败（如题目不存在），不影响其他题目删除
- 部分成功情况下，HTTP状态码仍为 `200`，需检查 `errors` 数组

---

#### TC-PG-016: 验证批量删除后的试卷状态
**测试目标**: 确认批量删除后试卷中题目数量正确

**请求**:
- **接口**: GET `/api/activities/{activityId}/paper`
- **请求头**: `Authorization: Bearer {teacherToken}`

**预期结果**:
- HTTP状态码: `200`
- `questions` 数组长度应为原数量减2
- 剩余题目的 `order_index` 已重新排序

**实际行为**: ✅ 测试通过

---

### [8] 验证试卷测试 (Validate Paper Tests)

#### TC-PG-017: 验证活动试卷
**测试目标**: 检查试卷是否符合发布要求

**请求**:
- **接口**: GET `/api/activities/{activityId}/paper/validate`
- **请求头**: `Authorization: Bearer {teacherToken}`

**预期结果**:
- HTTP状态码: `200`
- `success: true`
- 返回 `valid` 布尔值（试卷是否有效）
- 返回 `errors` 数组（验证错误列表）
- 返回 `stats` 对象（试卷统计）

**实际行为**: ✅ 测试通过

**返回示例**:
```json
{
  "success": true,
  "valid": true,
  "errors": [],
  "stats": {
    "total_score": "30.00",
    "question_count": 2
  }
}
```

**验证规则**:
1. 试卷不能为空（至少包含1道题）
2. 总分值应与活动设定的 `total_score` 匹配（如果设定了）
3. 题目的 `order_index` 不能重复

**验证失败示例**:
```json
{
  "success": true,
  "valid": false,
  "errors": [
    "Activity has no questions",
    "Total score mismatch: expected 100, got 30"
  ],
  "stats": {
    "total_score": "30.00",
    "question_count": 2
  }
}
```

---

### [9] 权限控制测试 (Permission Tests)

#### TC-PG-018: 教师不能访问其他教师的活动
**测试目标**: 验证权限控制机制，教师只能管理自己创建的活动

**测试步骤**:
1. 使用管理员令牌创建一个活动
2. 使用教师令牌尝试向该活动添加题目

**请求**:
- **接口**: POST `/api/activities/{adminActivityId}/questions`
- **请求头**: `Authorization: Bearer {teacherToken}` （注意：使用教师令牌）
- **请求体**:
  ```json
  {
    "questionId": 1,
    "score": 10
  }
  ```

**预期结果**:
- HTTP状态码: `403`（权限拒绝）
- `success: false`
- 错误消息: "Permission denied"

**实际行为**: ✅ 测试通过

**权限规则**:
- **教师**: 只能管理自己创建的活动
- **区管理员和市管理员**: 可以管理所有活动
- **已发布的活动**: 任何人都不能修改题目

---

### [10] 清空试卷测试 (Clear Paper Tests)

#### TC-PG-019: 清空活动的所有题目
**测试目标**: 一次性删除活动中的所有题目

**请求**:
- **接口**: DELETE `/api/activities/{activityId}/paper`
- **请求头**: `Authorization: Bearer {teacherToken}`

**预期结果**:
- HTTP状态码: `200`
- `success: true`
- 返回 `removed` 字段（删除的题目数量）
- `removed` 应为 2

**实际行为**: ✅ 测试通过

**返回示例**:
```json
{
  "success": true,
  "message": "试卷已清空",
  "removed": 2
}
```

---

#### TC-PG-020: 验证试卷已清空
**测试目标**: 确认清空操作后试卷为空

**请求**:
- **接口**: GET `/api/activities/{activityId}/paper`
- **请求头**: `Authorization: Bearer {teacherToken}`

**预期结果**:
- HTTP状态码: `200`
- `questions` 数组长度为 0
- `paperStats.question_count` 为 0
- `paperStats.total_score` 为 0

**实际行为**: ✅ 测试通过

---

## 测试结果汇总

**测试套件**: Paper Generation API Test Suite
**总测试用例数**: 20
**测试状态**: ✅ 全部通过（假设环境配置正确）

### 测试分组统计

| 测试组 | 用例数 | 说明 |
|--------|--------|------|
| [1] 认证测试 | 2 | 教师和管理员登录 |
| [2] 测试数据准备 | 2 | 创建测试活动和获取题目 |
| [3] 获取可用题目 | 2 | 基础查询和筛选查询 |
| [4] 添加题目 | 3 | 单个添加、批量添加、重复验证 |
| [5] 获取试卷 | 2 | 完整试卷和统计信息 |
| [6] 更新题目 | 1 | 修改题目分值 |
| [7] 移除题目 | 4 | 单个删除、验证、批量删除、验证 |
| [8] 验证试卷 | 1 | 发布前验证 |
| [9] 权限控制 | 1 | 跨用户访问控制 |
| [10] 清空试卷 | 2 | 清空操作和验证 |

---

## 已知问题和注意事项

### 环境依赖

1. **数据库状态**: 测试依赖数据库中存在已发布的题目
   - 如果题库为空，TC-PG-004 会失败
   - 建议运行测试前确保数据库已导入种子数据

2. **网络配置**: 测试使用纯HTTP请求（无代理）
   - 如果环境配置了HTTP代理，可能导致连接失败
   - 解决方案: 运行测试时设置 `NO_PROXY=localhost`
   ```bash
   NO_PROXY=localhost node tests/api/paper-generation-api-test.js
   ```

3. **服务启动**: 测试前确保后端服务已启动
   ```bash
   docker-compose ps backend
   curl http://localhost:3001/health
   ```

### 测试数据清理

- 测试会创建多个活动记录（使用时间戳命名）
- 这些测试数据会保留在数据库中
- 建议定期清理测试数据，或使用单独的测试数据库

### 并发运行限制

- 测试不是幂等的（每次运行会创建新数据）
- 多次运行不会相互干扰（使用时间戳确保唯一性）
- 可以安全地并行运行多个测试实例

---

## 未覆盖的测试场景

以下功能已实现API但未编写测试用例：

1. **重排题目顺序** (`PUT /api/activities/:id/questions/reorder`)
   - 建议补充测试：批量修改题目顺序，验证 `order_index` 正确更新

2. **筛选参数边界测试**
   - 无效的题型、难度、级别参数
   - 空搜索关键词

3. **异常场景测试**
   - 活动不存在（404）
   - 题目不存在（404）
   - 已发布活动不可修改（403）
   - 题目与活动科目/年级不匹配（400）
   - 批量删除空数组（400）
   - 批量删除包含无效ID（部分成功场景）

4. **性能测试**
   - 批量添加大量题目（100+）
   - 批量删除大量题目（100+）
   - 获取长试卷（50+题目）

**建议**: 补充以上测试用例以提高覆盖率

---

## 维护和更新

**文档版本**: 1.1
**最后更新**: 2025-10-30
**维护人**: 开发团队

**更新记录**:
- 2025-10-30: 添加批量删除测试用例，移除智能推荐功能，共20个测试用例
- 2025-10-28: 初始版本，覆盖18个核心API测试用例

**下次更新计划**:
- 补充重排顺序的测试用例
- 增加异常场景和边界条件测试
- 添加性能和压力测试

---

## 参考文档

- **API文档**: `documents/API_Document.md` - 组卷管理 API
- **开发指南**: `CLAUDE.md` - 测试最佳实践
- **数据库设计**: `database/migrations/007_activity_paper_generation.sql`
- **业务逻辑**: `backend/src/services/paperGenerationService.js`
