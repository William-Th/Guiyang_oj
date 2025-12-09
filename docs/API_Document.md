# API 接口文档

贵阳市小学生测评服务平台 - 后端API接口文档

**最后更新**: 2025-01-20
**API 版本**: v1.0
**Base URL**: `http://localhost:3001/api`

---

## 📚 目录

- [认证授权 API](#认证授权-api)
- [用户管理 API](#用户管理-api)
- [考试管理 API](#考试管理-api)
- [题库管理 API](#题库管理-api)
- [题库审核 API](#题库审核-api)
- [成绩管理 API](#成绩管理-api)
- [证书管理 API](#证书管理-api)
- [学生答题 API](#学生答题-api) ⭐ 新增
- [教师评卷 API](#教师评卷-api) ⭐ 新增
- [系统配置 API](#系统配置-api)
- [错误码说明](#错误码说明)

---

## 🔐 认证授权 API

### 用户登录

**POST** `/api/auth/login`

用户登录获取 JWT token。

**请求体**:
```json
{
  "username": "string",      // 用户名或身份证号
  "password": "string",      // 密码
  "loginType": "student|teacher"  // 登录类型
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "student001",
      "role": "student",
      "name": "张三"
    }
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "用户名或密码错误"
}
```

---

### 刷新 Token

**POST** `/api/auth/refresh`

刷新过期的 JWT token。

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 登出

**POST** `/api/auth/logout`

用户登出。

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "message": "登出成功"
}
```

---

## 👥 用户管理 API

### 获取当前用户信息

**GET** `/api/users/profile`

获取当前登录用户的详细信息。返回内容根据用户角色动态包含角色特定字段。

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例 - 学生**:
```json
{
  "user": {
    "id": 1,
    "username": "13800138003",
    "role": "student",
    "realName": "张小明",
    "idCard": "520102200001011234",
    "phone": "13800138003",
    "email": "zhangxiaoming@example.com",
    "avatarUrl": null,
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "studentNo": "2024010001",
    "grade": "三年级",
    "class": "1班",
    "school": "云岩区第一小学",
    "district": "云岩区"
  }
}
```

**响应示例 - 教师**:
```json
{
  "user": {
    "id": 2,
    "username": "teacher_yy_ps_math",
    "role": "teacher",
    "realName": "王雪梅",
    "idCard": "520102198001011234",
    "phone": "13900139001",
    "email": "wangxuemei@example.com",
    "avatarUrl": null,
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "teacherNo": "T202401001",
    "subjects": ["数学"],
    "title": "一级教师",
    "schoolId": 1,
    "school": "云岩区第一小学",
    "district": "云岩区"
  }
}
```

**响应示例 - 管理员**:
```json
{
  "user": {
    "id": 3,
    "username": "baiyun_admin",
    "role": "district_admin",
    "realName": "白云区管理员",
    "phone": "13700137001",
    "email": "baiyun_admin@example.com",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "managementLevel": "区级管理",
    "schoolId": null,
    "school": null,
    "districtId": 2,
    "district": "白云区",
    "permissionScope": "district_wide"
  }
}
```

**字段说明**:

通用字段 (所有角色):
- `id`: 用户ID
- `username`: 用户名
- `role`: 用户角色 (student/teacher/admin/school_admin/district_admin等)
- `realName`: 真实姓名
- `idCard`: 身份证号
- `phone`: 手机号
- `email`: 邮箱
- `avatarUrl`: 头像URL
- `status`: 账户状态 (active/inactive/suspended)
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

学生特定字段:
- `studentNo`: 学号
- `grade`: 年级
- `class`: 班级
- `school`: 所属学校
- `district`: 所属区域

教师特定字段:
- `teacherNo`: 教师编号
- `subjects`: 任教科目数组
- `title`: 职称
- `schoolId`: 学校ID
- `school`: 所属学校
- `district`: 所属区域

管理员特定字段:
- `managementLevel`: 管理级别 (校级/区级/市级等)
- `schoolId`: 管理学校ID (校级管理员)
- `school`: 管理学校名称 (校级管理员)
- `districtId`: 管理区域ID (区级管理员)
- `district`: 管理区域名称
- `permissionScope`: 权限范围

---

### 更新用户信息

**PUT** `/api/users/profile`

更新当前用户的个人信息。

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "name": "string",
  "email": "string",
  "phone": "string"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "更新成功",
  "data": {
    // 更新后的用户信息
  }
}
```

---

### 修改密码

**POST** `/api/users/change-password`

修改当前用户密码。

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "oldPassword": "string",
  "newPassword": "string"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "密码修改成功"
}
```

---

## 📝 考试管理 API

### 获取考试列表

**GET** `/api/exams`

获取可用的考试列表（学生端）或所有考试（教师端）。

**请求头**:
```
Authorization: Bearer <token>
```

**查询参数**:
- `status` (可选): 考试状态 - `published`, `draft`, `finished`
- `subject` (可选): 科目筛选
- `grade` (可选): 年级筛选
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 10

**响应示例**:
```json
{
  "success": true,
  "data": {
    "exams": [
      {
        "id": 1,
        "title": "六年级数学期末考试",
        "subject": "数学",
        "grade": "六年级",
        "duration": 90,
        "total_score": 100,
        "start_time": "2024-06-15T09:00:00.000Z",
        "end_time": "2024-06-15T11:00:00.000Z",
        "status": "published",
        "question_count": 20
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

---

### 获取考试详情

**GET** `/api/exams/:id`

获取指定考试的详细信息。

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "六年级数学期末考试",
    "description": "本学期数学期末测评",
    "subject": "数学",
    "grade": "六年级",
    "duration": 90,
    "total_score": 100,
    "pass_score": 60,
    "start_time": "2024-06-15T09:00:00.000Z",
    "end_time": "2024-06-15T11:00:00.000Z",
    "status": "published",
    "instructions": "请认真作答，注意时间...",
    "question_count": 20,
    "created_by": "teacher01",
    "created_at": "2024-06-01T00:00:00.000Z"
  }
}
```

---

### 创建考试

**POST** `/api/exams`

创建新考试（教师/管理员权限）。

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "title": "string",
  "description": "string",
  "subject": "string",
  "grade": "string",
  "duration": 90,
  "total_score": 100,
  "pass_score": 60,
  "start_time": "2024-06-15T09:00:00.000Z",
  "end_time": "2024-06-15T11:00:00.000Z",
  "instructions": "string",
  "question_ids": [1, 2, 3, 4, 5]
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "考试创建成功",
  "data": {
    "id": 1,
    // 考试详情
  }
}
```

---

### 更新考试

**PUT** `/api/exams/:id`

更新考试信息（教师/管理员权限）。

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**: 同创建考试

**响应示例**:
```json
{
  "success": true,
  "message": "考试更新成功",
  "data": {
    // 更新后的考试详情
  }
}
```

---

### 删除考试

**DELETE** `/api/exams/:id`

删除考试（管理员权限）。

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "message": "考试删除成功"
}
```

---

### 开始考试

**POST** `/api/exams/:id/start`

学生开始考试，创建考试记录。

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "exam_attempt_id": 123,
    "exam": {
      // 考试详情
    },
    "questions": [
      {
        "id": 1,
        "type": "single_choice",
        "content": "1 + 1 = ?",
        "options": ["1", "2", "3", "4"],
        "score": 5
      }
    ],
    "start_time": "2024-06-15T09:00:00.000Z",
    "end_time": "2024-06-15T10:30:00.000Z"
  }
}
```

---

### 提交答案

**POST** `/api/exams/:id/submit`

提交考试答案。

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "exam_attempt_id": 123,
  "answers": [
    {
      "question_id": 1,
      "answer": "2"
    },
    {
      "question_id": 2,
      "answer": ["A", "B"]
    }
  ]
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "提交成功",
  "data": {
    "score": 85,
    "total_score": 100,
    "passed": true,
    "correct_count": 17,
    "total_count": 20,
    "result_id": 456
  }
}
```

---

## 📚 题库管理 API

### 获取题目列表

**GET** `/api/question-bank`

获取题库中的题目列表。

**请求头**:
```
Authorization: Bearer <token>
```

**查询参数**:
- `type` (可选): 题目类型 - `single_choice`, `multiple_choice`, `true_false`, `fill_blank`, `short_answer`, `coding`
- `subject` (可选): 科目
- `grade` (可选): 年级
- `level` (可选): 难度级别 - `L1`, `L2`, `L3`, `L4`, `L5`
- `difficulty` (可选): 难度 - `简单`, `中等`, `困难`
- `status` (可选): 状态 - `published`, `draft`, `pending_review`
- `search` (可选): 搜索关键词
- `page` (可选): 页码
- `limit` (可选): 每页数量

**响应示例**:
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": 1,
        "question_code": "MATH2510200001",
        "type": "single_choice",
        "subject": "数学",
        "grade": "六年级",
        "content": "1 + 1 = ?",
        "options": ["1", "2", "3", "4"],
        "correct_answer": "2",
        "level": "L1",
        "difficulty": "简单",
        "score": 5,
        "knowledge_points": ["加法运算"],
        "abilities": ["计算能力"],
        "status": "published",
        "created_by": "teacher01",
        "created_at": "2024-06-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

---

### 获取题目详情

**GET** `/api/question-bank/:id`

获取指定题目的详细信息。

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "question_code": "MATH2510200001",
    "type": "single_choice",
    "subject": "数学",
    "grade": "六年级",
    "content": "1 + 1 = ?",
    "options": ["1", "2", "3", "4"],
    "correct_answer": "2",
    "explanation": "1加1等于2",
    "level": "L1",
    "difficulty": "简单",
    "score": 5,
    "knowledge_points": ["加法运算"],
    "abilities": ["计算能力"],
    "status": "published",
    "created_by": "teacher01",
    "created_at": "2024-06-01T00:00:00.000Z",
    "updated_at": "2024-06-01T00:00:00.000Z"
  }
}
```

---

### 创建题目

**POST** `/api/question-bank`

创建新题目（教师权限）。

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "type": "single_choice",
  "subject": "数学",
  "grade": "六年级",
  "content": "题目内容",
  "options": ["选项A", "选项B", "选项C", "选项D"],
  "correct_answer": "选项B",
  "explanation": "解析内容",
  "level": "L1",
  "difficulty": "简单",
  "score": 5,
  "knowledge_points": ["知识点1", "知识点2"],
  "abilities": ["能力1"],
  "status": "draft"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "题目创建成功",
  "data": {
    "id": 1,
    "question_code": "MATH2510200001",
    // 题目详情
  }
}
```

**注意**:
- `question_code` 会自动生成，格式为：学科代码(4位) + 年月日(6位) + 序号(4位)
- 例如：`MATH2510200001` 表示数学科目，2025年10月20日创建的第1题

---

### 更新题目

**PUT** `/api/question-bank/:id`

更新题目信息（教师权限）。

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**: 同创建题目

**响应示例**:
```json
{
  "success": true,
  "message": "题目更新成功",
  "data": {
    // 更新后的题目详情
  }
}
```

---

### 删除题目

**DELETE** `/api/question-bank/:id`

删除题目（管理员权限）。

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "message": "题目删除成功"
}
```

---

### 通过编码查询题目

**GET** `/api/question-bank/by-code/:code`

通过题目编码查询题目。

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    // 题目详情
  }
}
```

---

## ✅ 题库审核 API

### 提交题目审核

**POST** `/api/question-review/submit`

将草稿题目提交给审核人审核。

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "question_id": 1,
  "reviewer_id": 2,
  "applicable_scopes": ["练习", "考试"]
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "提交审核成功",
  "data": {
    "review_id": 123,
    "status": "pending_review"
  }
}
```

---

### 审核题目

**POST** `/api/question-review/:id/review`

审核题目（审核人权限）。

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "decision": "approved|rejected",
  "comment": "审核意见"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "审核成功",
  "data": {
    "review_id": 123,
    "decision": "approved",
    "reviewed_at": "2024-06-01T10:00:00.000Z"
  }
}
```

---

### 获取待审核列表

**GET** `/api/question-review/pending`

获取待我审核的题目列表。

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": 123,
        "question": {
          // 题目信息
        },
        "submitter": "teacher01",
        "submitted_at": "2024-06-01T09:00:00.000Z",
        "status": "pending_review"
      }
    ]
  }
}
```

---

### 获取审核历史

**GET** `/api/question-review/history/:questionId`

获取题目的审核历史。

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": 123,
        "reviewer": "admin",
        "decision": "approved",
        "comment": "审核通过",
        "reviewed_at": "2024-06-01T10:00:00.000Z"
      }
    ]
  }
}
```

---

## 📊 成绩管理 API

### 获取学生成绩列表

**GET** `/api/results/student/:studentId`

获取指定学生的成绩列表。

**请求头**:
```
Authorization: Bearer <token>
```

**查询参数**:
- `subject` (可选): 科目筛选
- `start_date` (可选): 开始日期
- `end_date` (可选): 结束日期

**响应示例**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 456,
        "exam": {
          "id": 1,
          "title": "六年级数学期末考试",
          "subject": "数学"
        },
        "score": 85,
        "total_score": 100,
        "passed": true,
        "rank": 15,
        "percentile": 75,
        "completed_at": "2024-06-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

### 获取成绩详情

**GET** `/api/results/:id`

获取指定成绩的详细信息。

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 456,
    "exam": {
      // 考试信息
    },
    "student": {
      // 学生信息
    },
    "score": 85,
    "total_score": 100,
    "passed": true,
    "answers": [
      {
        "question_id": 1,
        "question": {
          // 题目信息
        },
        "student_answer": "2",
        "correct_answer": "2",
        "is_correct": true,
        "score": 5
      }
    ],
    "start_time": "2024-06-15T09:00:00.000Z",
    "completed_at": "2024-06-15T10:30:00.000Z",
    "duration": 90
  }
}
```

---

### 获取考试统计

**GET** `/api/results/exam/:examId/statistics`

获取指定考试的统计数据（教师/管理员权限）。

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "exam_id": 1,
    "total_participants": 50,
    "completed": 48,
    "average_score": 78.5,
    "highest_score": 98,
    "lowest_score": 45,
    "pass_rate": 85.4,
    "score_distribution": {
      "90-100": 10,
      "80-89": 15,
      "70-79": 12,
      "60-69": 8,
      "0-59": 5
    },
    "question_analysis": [
      {
        "question_id": 1,
        "correct_rate": 92.5,
        "average_score": 4.6,
        "total_score": 5
      }
    ]
  }
}
```

---

## 🎓 证书管理 API

### 生成证书

**POST** `/api/certificates/generate`

为成绩合格的学生生成证书。

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "result_id": 456
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "证书生成成功",
  "data": {
    "certificate_id": "CERT2024060100123",
    "download_url": "/api/certificates/download/CERT2024060100123"
  }
}
```

---

### 下载证书

**GET** `/api/certificates/download/:certificateId`

下载证书PDF文件。

**请求头**:
```
Authorization: Bearer <token>
```

**响应**: PDF文件流

---

### 验证证书

**GET** `/api/certificate-verify/:certificateId`

验证证书真伪（公开接口，无需认证）。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "certificate_id": "CERT2024060100123",
    "student_name": "张三",
    "exam_title": "六年级数学期末考试",
    "score": 85,
    "issued_date": "2024-06-15",
    "is_valid": true
  }
}
```

---

## 📝 组卷管理 API

### 获取可用题目列表

**GET** `/api/activities/:id/available-questions`

获取可添加到活动的题目列表（未添加的已发布题目）。

**请求参数**:
- `id` (路径参数): 活动ID

**查询参数**:
```
type: string          // 题型筛选 (single, multiple, blank, essay, code)
difficulty: string    // 难度筛选 (easy, medium, hard)
level: string         // 等级筛选 (L1-L9)
knowledge_point: string  // 知识点筛选
search: string        // 搜索关键词（题目内容或题号）
```

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "questions": [
    {
      "id": 1,
      "question_code": "MATH2510200001",
      "type": "single",
      "content": "1 + 1 = ?",
      "difficulty": "easy",
      "level": "L1",
      "suggested_score": 5,
      "knowledge_points": ["加法"],
      "subject": "数学",
      "grade": "二年级"
    }
  ],
  "paperStats": {
    "activity_id": 1,
    "question_count": 0,
    "total_score": 0,
    "paper_status": "empty"
  },
  "totalAvailable": 100
}
```

---

### 获取活动试卷

**GET** `/api/activities/:id/paper`

获取活动的完整试卷（包含所有已添加的题目详情）。

**请求参数**:
- `id` (路径参数): 活动ID

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "activity": {
    "id": 1,
    "title": "二年级数学练习",
    "subject": "数学",
    "grade": "二年级",
    "total_score": 100,
    "question_count": 10
  },
  "questions": [
    {
      "activity_question_id": 1,
      "question_id": 1,
      "order_index": 1,
      "score": 10,
      "is_required": true,
      "section": "第一部分",
      "question_code": "MATH2510200001",
      "type": "single",
      "content": "1 + 1 = ?",
      "options": ["1", "2", "3", "4"],
      "correct_answer": "2",
      "difficulty": "easy",
      "knowledge_points": ["加法"]
    }
  ],
  "paperStats": {
    "activity_id": 1,
    "question_count": 10,
    "total_score": 100,
    "single_choice_count": 5,
    "multiple_choice_count": 3,
    "blank_count": 2,
    "easy_count": 4,
    "medium_count": 4,
    "hard_count": 2
  }
}
```

---

### 获取试卷统计

**GET** `/api/activities/:id/paper/stats`

获取活动试卷的统计信息（题型分布、难度分布等）。

**请求参数**:
- `id` (路径参数): 活动ID

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "stats": {
    "activity_id": 1,
    "title": "二年级数学练习",
    "type": "practice",
    "subject": "数学",
    "paper_status": "completed",
    "total_score": 100,
    "question_count": 10,
    "single_choice_count": 5,
    "multiple_choice_count": 3,
    "blank_count": 2,
    "essay_count": 0,
    "code_count": 0,
    "easy_count": 4,
    "medium_count": 4,
    "hard_count": 2
  }
}
```

---

### 添加题目到活动

**POST** `/api/activities/:id/questions`

添加一个题目到活动试卷。

**请求参数**:
- `id` (路径参数): 活动ID

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "questionId": 1,        // 必填，题目ID
  "score": 10,            // 可选，该题分值（默认使用题目建议分值）
  "isRequired": true,     // 可选，是否必答（默认true）
  "section": "第一部分"   // 可选，所属章节
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "题目添加成功",
  "question": {
    "id": 1,
    "activity_id": 1,
    "question_id": 1,
    "order_index": 1,
    "score": 10,
    "is_required": true,
    "section": "第一部分"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "Question already added to this activity"
}
```

---

### 批量添加题目

**POST** `/api/activities/:id/questions/batch`

批量添加多个题目到活动试卷。

**请求参数**:
- `id` (路径参数): 活动ID

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "questions": [
    {
      "questionId": 1,
      "score": 10,
      "isRequired": true,
      "section": "第一部分"
    },
    {
      "questionId": 2,
      "score": 15
    }
  ]
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "成功添加 2 个题目",
  "added": [
    {
      "id": 1,
      "question_id": 1,
      "order_index": 1
    },
    {
      "id": 2,
      "question_id": 2,
      "order_index": 2
    }
  ],
  "errors": []
}
```

---

### 移除题目

**DELETE** `/api/activities/:id/questions/:questionId`

从活动试卷中移除一个题目。

**请求参数**:
- `id` (路径参数): 活动ID
- `questionId` (路径参数): 题目ID

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "message": "题目移除成功"
}
```

---

### 更新题目属性

**PUT** `/api/activities/:id/questions/:questionId`

更新试卷中题目的属性（分值、必答状态、章节）。

**请求参数**:
- `id` (路径参数): 活动ID
- `questionId` (路径参数): 题目ID

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "score": 20,            // 可选，新分值
  "isRequired": false,    // 可选，是否必答
  "section": "第二部分"   // 可选，所属章节
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "题目更新成功",
  "question": {
    "id": 1,
    "activity_id": 1,
    "question_id": 1,
    "score": 20,
    "is_required": false,
    "section": "第二部分"
  }
}
```

---

### 重排题目顺序

**PUT** `/api/activities/:id/questions/reorder`

批量更新试卷中题目的显示顺序。

**请求参数**:
- `id` (路径参数): 活动ID

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "orders": [
    {
      "questionId": 2,
      "orderIndex": 1
    },
    {
      "questionId": 1,
      "orderIndex": 2
    }
  ]
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "题目顺序更新成功",
  "questions": [
    {
      "id": 2,
      "question_id": 2,
      "order_index": 1
    },
    {
      "id": 1,
      "question_id": 1,
      "order_index": 2
    }
  ]
}
```

---

### 清空试卷

**DELETE** `/api/activities/:id/paper`

清空活动试卷的所有题目。

**请求参数**:
- `id` (路径参数): 活动ID

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "message": "已清空试卷，移除 10 个题目",
  "removed": 10
}
```

---

### 智能推荐题目

**POST** `/api/activities/:id/questions/recommend`

根据活动特征和指定条件智能推荐题目。

**请求参数**:
- `id` (路径参数): 活动ID

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "count": 20,             // 可选，推荐题目数量（默认20，最大100）
  "difficulty": {          // 可选，难度分布百分比
    "easy": 40,
    "medium": 40,
    "hard": 20
  },
  "types": {               // 可选，题型分布百分比
    "single": 40,
    "multiple": 30,
    "blank": 20,
    "essay": 10
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "推荐 20 个题目",
  "questions": [
    {
      "id": 1,
      "question_code": "MATH2510200001",
      "type": "single",
      "content": "1 + 1 = ?",
      "difficulty": "easy",
      "suggested_score": 5
    }
  ]
}
```

---

### 验证试卷

**GET** `/api/activities/:id/paper/validate`

验证试卷是否符合要求（题目数量、总分等）。

**请求参数**:
- `id` (路径参数): 活动ID

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "valid": true,
  "errors": [],
  "stats": {
    "question_count": 10,
    "total_score": 100
  }
}
```

**验证失败示例**:
```json
{
  "success": true,
  "valid": false,
  "errors": [
    "Activity has no questions",
    "Total score mismatch: expected 100, got 85"
  ],
  "stats": {
    "question_count": 0,
    "total_score": 0
  }
}
```

---

### 权限说明

**组卷功能权限**:
- 教师：只能对自己创建的练习活动进行组卷
- 区级/市级管理员：可以对所有活动进行组卷
- 限制：已发布的活动不能修改试卷

---

## 📝 学生答题 API

### 开始活动

**POST** `/api/student/activities/:activityId/start`

学生开始一个练习或测评活动。

**路径参数**:
- `activityId`: 活动ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "studentActivityId": 123,
    "startTime": "2025-10-30T10:30:00.000Z",
    "timeLimitDeadline": "2025-10-30T11:00:00.000Z"
  }
}
```

**说明**:
- 自动创建 `student_activities` 记录
- 如果活动有时间限制，返回截止时间
- 支持多次尝试（如果活动允许）

---

### 获取活动题目

**GET** `/api/student/activities/:activityId/questions`

获取活动的所有题目（学生视角）。

**路径参数**:
- `activityId`: 活动ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "activity": {
      "id": 1,
      "title": "二年级数学练习",
      "duration": 30,
      "totalScore": 100
    },
    "questions": [
      {
        "id": 1,
        "type": "single",
        "content": "1+1=?",
        "options": {
          "A": "1",
          "B": "2",
          "C": "3",
          "D": "4"
        },
        "score": 10,
        "orderIndex": 0
      }
    ]
  }
}
```

**说明**:
- 不返回正确答案和解析
- 按 `orderIndex` 排序
- 包含活动基本信息

---

### 提交单题答案

**POST** `/api/student/activities/:activityId/answers`

提交单道题目的答案（用于自动保存）。

**路径参数**:
- `activityId`: 活动ID

**请求体**:
```json
{
  "questionId": 1,
  "answer": "B"  // 或 ["A", "B"] 对于多选题
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "answerId": 456,
    "saved": true
  }
}
```

**说明**:
- 如果答案已存在则更新
- 对于客观题会自动评分
- 主观题评分状态为 `pending`

---

### 获取我的答案

**GET** `/api/student/activities/:activityId/my-answers`

获取学生在某个活动中已提交的答案。

**路径参数**:
- `activityId`: 活动ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "answers": [
      {
        "id": 456,
        "questionId": 1,
        "answer": "B",
        "score": 10,
        "autoScore": 10,
        "gradingStatus": "auto_graded"
      }
    ]
  }
}
```

**说明**:
- 用于恢复答题进度
- 不返回正确答案（答题阶段）

---

### 提交整个活动

**POST** `/api/student/activities/:activityId/submit`

提交整个活动，结束答题。

**路径参数**:
- `activityId`: 活动ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "studentActivityId": 123,
    "status": "completed",
    "score": 85,
    "submitTime": "2025-10-30T10:45:00.000Z"
  }
}
```

**说明**:
- 将 `student_activities.status` 更新为 `completed`
- 触发自动评分服务
- 计算总分（已评分题目）

---

### 获取学生活动详情

**GET** `/api/student/activities/:activityId/detail`

获取学生在活动中的答题详情（结果页）。

**路径参数**:
- `activityId`: 活动ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "studentActivity": {
      "id": 123,
      "status": "completed",
      "score": 85,
      "submitTime": "2025-10-30T10:45:00.000Z",
      "gradingStatus": "completed"
    },
    "activity": {
      "id": 1,
      "title": "二年级数学练习",
      "totalScore": 100
    },
    "answers": [
      {
        "id": 456,
        "questionId": 1,
        "answer": "B",
        "score": 10,
        "isCorrect": true,
        "correctAnswer": "B",
        "explanation": "1+1=2"
      }
    ]
  }
}
```

**说明**:
- 提交后才能查看正确答案
- 包含详细的评分和反馈

---

## 📊 教师评卷 API

### 获取待评卷列表

**GET** `/api/grading/pending`

获取需要人工评卷的学生提交列表。

**查询参数**:
- `activityId` (可选): 活动ID
- `subject` (可选): 科目筛选
- `grade` (可选): 年级筛选
- `grading_status` (可选): 评卷状态 (`pending`, `auto_graded`, `partial_graded`)

**响应示例**:
```json
{
  "success": true,
  "data": {
    "submissions": [
      {
        "studentActivityId": 123,
        "studentId": 456,
        "studentName": "张三",
        "studentUsername": "520102200801011234",
        "activityId": 1,
        "activityTitle": "二年级数学练习",
        "activityType": "practice",
        "subject": "数学",
        "grade": "二年级",
        "submitTime": "2025-10-30T10:45:00.000Z",
        "gradingStatus": "pending",
        "score": null,
        "pendingAnswers": 3,
        "totalAnswers": 10
      }
    ],
    "total": 1
  }
}
```

**说明**:
- 只返回已提交（`completed`）的活动
- `pendingAnswers`: 待评卷题目数量
- 教师只能看到自己创建活动的提交

---

### 获取评卷详情

**GET** `/api/grading/student-activity/:studentActivityId`

获取某个学生答题的详细信息，用于评卷。

**路径参数**:
- `studentActivityId`: 学生活动记录ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "studentActivity": {
      "id": 123,
      "studentId": 456,
      "activityId": 1,
      "status": "completed",
      "gradingStatus": "pending",
      "score": 50,
      "submitTime": "2025-10-30T10:45:00.000Z"
    },
    "student": {
      "id": 456,
      "realName": "张三",
      "username": "520102200801011234"
    },
    "activity": {
      "id": 1,
      "title": "二年级数学练习",
      "subject": "数学",
      "grade": "二年级",
      "totalScore": 100
    },
    "questions": [
      {
        "id": 1,
        "type": "short_answer",
        "content": "请简述加法的定义",
        "correctAnswer": "加法是将两个或多个数合并成一个数的运算",
        "explanation": "...",
        "score": 10
      }
    ],
    "answers": [
      {
        "id": 789,
        "questionId": 1,
        "answer": "加法就是把两个数字加在一起",
        "score": null,
        "autoScore": null,
        "manualScore": null,
        "isCorrect": null,
        "gradingStatus": "pending",
        "feedback": null
      }
    ]
  }
}
```

**说明**:
- 包含学生信息、活动信息、题目和答案
- `gradingStatus`: `pending` 需要评分，`auto_graded` 已自动评分，`manual_graded` 已人工评分

---

### 评分单题

**PUT** `/api/grading/answers/:answerId`

为单道题目评分。

**路径参数**:
- `answerId`: 答案记录ID

**请求体**:
```json
{
  "score": 8,
  "feedback": "回答基本正确，但缺少细节说明。"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "answerId": 789,
    "score": 8,
    "gradingStatus": "manual_graded"
  }
}
```

**说明**:
- 更新 `answers.manual_score` 和 `answers.feedback`
- 自动更新 `gradingStatus` 为 `manual_graded`
- 触发总分重新计算

---

### 批量评分

**PUT** `/api/grading/batch`

批量为多道题目评分。

**请求体**:
```json
{
  "answers": [
    {
      "answerId": 789,
      "score": 8,
      "feedback": "回答基本正确"
    },
    {
      "answerId": 790,
      "score": 10,
      "feedback": "回答完美"
    }
  ]
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "gradedCount": 2,
    "updatedAnswers": [789, 790]
  }
}
```

**说明**:
- 批量更新多个答案
- 事务处理，全部成功或全部失败

---

### 完成评卷

**POST** `/api/grading/student-activity/:studentActivityId/complete`

标记评卷完成，所有题目已评分。

**路径参数**:
- `studentActivityId`: 学生活动记录ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "studentActivityId": 123,
    "gradingStatus": "completed",
    "finalScore": 85
  }
}
```

**说明**:
- 验证所有题目已评分
- 更新 `student_activities.grading_status` 为 `completed`
- 计算并锁定最终分数

---

### 获取评卷统计

**GET** `/api/grading/stats/:activityId`

获取某个活动的评卷统计信息。

**路径参数**:
- `activityId`: 活动ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "totalSubmissions": 30,
    "pendingGrading": 5,
    "autoGraded": 15,
    "partialGraded": 8,
    "completed": 2,
    "averageScore": 78.5
  }
}
```

**说明**:
- 统计各评卷状态的提交数量
- 计算平均分

---

## ⚙️ 系统配置 API

### 获取科目列表

**GET** `/api/config/subjects`

获取系统配置的科目列表。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "subjects": ["数学", "语文", "英语", "物理", "化学", "生物", "计算机"]
  }
}
```

---

### 获取年级列表

**GET** `/api/config/grades`

获取系统配置的年级列表。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "grades": ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"]
  }
}
```

---

### 获取能力维度列表

**GET** `/api/config/abilities`

获取能力维度配置。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "abilities": [
      {
        "id": 1,
        "name": "计算能力",
        "description": "数学运算和计算技能"
      },
      {
        "id": 2,
        "name": "逻辑思维",
        "description": "逻辑推理和问题分析能力"
      }
    ]
  }
}
```

---

### 获取知识点列表

**GET** `/api/config/knowledge-points`

获取知识点配置。

**查询参数**:
- `subject` (可选): 按科目筛选
- `grade` (可选): 按年级筛选

**响应示例**:
```json
{
  "success": true,
  "data": {
    "knowledge_points": [
      {
        "id": 1,
        "name": "加法运算",
        "subject": "数学",
        "grade": "一年级",
        "description": "基本的加法运算"
      }
    ]
  }
}
```

---

## ⚠️ 错误码说明

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或token无效 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 500 | 服务器内部错误 |

### 业务错误码

| 错误码 | 说明 |
|--------|------|
| AUTH_001 | 用户名或密码错误 |
| AUTH_002 | Token已过期 |
| AUTH_003 | Token无效 |
| AUTH_004 | 权限不足 |
| EXAM_001 | 考试不存在 |
| EXAM_002 | 考试未开始 |
| EXAM_003 | 考试已结束 |
| EXAM_004 | 已经参加过该考试 |
| QUESTION_001 | 题目不存在 |
| QUESTION_002 | 题目编码已存在 |
| QUESTION_003 | 题目格式错误 |
| RESULT_001 | 成绩不存在 |
| CERT_001 | 证书不存在 |
| CERT_002 | 证书无效 |
| JUDGE_001 | 提交不存在 |
| JUDGE_002 | 判题服务不可用 |
| JUDGE_003 | 不支持的编程语言 |

### 错误响应格式

```json
{
  "success": false,
  "error": "错误消息",
  "error_code": "ERROR_CODE",
  "details": {
    // 详细错误信息
  }
}
```

---

## 📝 代码判题 API

### 提交代码

**POST** `/api/judge/submit`

提交代码进行判题。

**请求参数**:
```json
{
  "questionId": 1,           // 题目ID (question_bank.id)
  "code": "#include...",     // 源代码
  "language": "cpp",         // 编程语言: cpp, c, python, java
  "studentActivityId": 123   // 可选，学生活动ID
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "submissionId": 456,
    "status": "pending",
    "message": "提交成功，正在判题中"
  }
}
```

### 查询判题状态

**GET** `/api/judge/status/:submissionId`

查询提交的判题状态和结果。

**响应**:
```json
{
  "success": true,
  "data": {
    "submissionId": 456,
    "status": "accepted",      // pending, judging, accepted, wrong_answer, compile_error, runtime_error, time_limit, memory_limit, partial
    "score": 75,
    "totalScore": 100,
    "compileOutput": "Compilation successful",
    "executionTime": 120,      // 毫秒
    "testResults": [
      {
        "caseNumber": 1,
        "status": "accepted",
        "score": 25,
        "executionTime": 30
      }
    ],
    "submittedAt": "2025-12-09T10:00:00Z",
    "judgedAt": "2025-12-09T10:00:05Z"
  }
}
```

### 获取测试用例

**GET** `/api/judge/test-cases/:questionId`

获取题目的样例测试用例（is_sample=true的测试点）。

**响应**:
```json
{
  "success": true,
  "data": {
    "testCases": [
      {
        "caseNumber": 1,
        "input": "5\n1 2 3 4 5",
        "expectedOutput": "15",
        "description": "样例1：基础求和"
      }
    ],
    "timeLimit": 1000,
    "memoryLimit": 256,
    "supportedLanguages": ["cpp", "c", "python"]
  }
}
```

### 判题状态说明

| 状态码 | 说明 |
|-------|------|
| pending | 等待判题 |
| judging | 判题中 |
| accepted | 全部通过 (AC) |
| wrong_answer | 答案错误 (WA) |
| compile_error | 编译错误 (CE) |
| runtime_error | 运行错误 (RE) |
| time_limit | 运行超时 (TLE) |
| memory_limit | 内存超限 (MLE) |
| output_limit | 输出超限 (OLE) |
| partial | 部分通过 |
| system_error | 系统错误 |

---

## 📝 通用说明

### 认证方式

所有需要认证的接口都使用 JWT Bearer Token：

```
Authorization: Bearer <your_jwt_token>
```

### 分页参数

支持分页的接口使用以下查询参数：
- `page`: 页码，从 1 开始
- `limit`: 每页数量，默认 10，最大 100

### 日期时间格式

所有日期时间使用 ISO 8601 格式：
```
2024-06-15T09:00:00.000Z
```

### 响应格式

所有API响应遵循统一格式：

**成功响应**:
```json
{
  "success": true,
  "data": {
    // 响应数据
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "错误消息"
}
```

---

## 🔄 版本历史

### v1.2 (2025-12-09)
- ⭐ **新增**: 代码判题 API
  - 提交代码、查询判题状态
  - 获取样例测试用例
  - 支持 C++ 语言（可扩展 Python、Java）
- ⭐ **新增**: Judge Service 微服务
  - Docker 沙箱执行环境
  - Bull 队列异步判题
  - 多种判题状态支持

### v1.1 (2025-10-30)
- ⭐ **新增**: 学生答题 API
  - 开始活动、获取题目、提交答案
  - 自动保存功能
  - 答题进度恢复
- ⭐ **新增**: 教师评卷 API
  - 待评卷列表和筛选
  - 单题评分和批量评分
  - 评卷统计和完成流程
- ✅ **优化**: 自动评分服务
  - 客观题实时自动评分
  - 主观题人工评卷工作流
- ✅ **优化**: 评分计算逻辑
  - 支持自动评分和人工评分并存
  - 动态更新评卷状态

### v1.0 (2025-01-20)
- ✅ 完整的认证授权系统
- ✅ 考试管理功能
- ✅ 题库管理功能
- ✅ 题目编码系统
- ✅ 题库审核流程
- ✅ 成绩管理和统计
- ✅ 证书生成和验证
- ✅ 系统配置管理

---

*最后更新: 2025-12-09*
*文档维护: 开发团队*
