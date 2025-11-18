# 用户管理指南 - 贵阳市小学生测评平台

本文档详细说明了管理员账号创建和学生注册审核的完整流程。

---

## 目录

1. [管理员账号创建流程](#管理员账号创建流程)
2. [学生注册流程](#学生注册流程)
3. [审核管理流程](#审核管理流程)
4. [技术实现细节](#技术实现细节)
5. [常见问题与解决方案](#常见问题与解决方案)

---

## 管理员账号创建流程

### 1. 管理员角色层级

系统支持多级管理员体系，按权限从低到高排列：

| 角色代码 | 角色名称 | 权限范围 | 审核层级 |
|---------|---------|---------|---------|
| `school_admin` | 校级管理员 | 单个学校 | Level 2 |
| `district_admin` | 区县管理员 | 区县内所有学校 | Level 3 |
| `municipal_school_admin` | 市直属学校管理员 | 市直属学校 | Level 3 |
| `base_school_admin` | 基地学校管理员 | 基地学校 | Level 3 |
| `municipal_admin` | 市级管理员 | 全市所有学校 | Level 4 |
| `system_admin` | 系统管理员 | 全系统 | Level 5 (超级权限) |

### 2. 创建管理员账号的方式

#### 方式一：通过用户管理界面创建（推荐）

**前端页面**: `/admin/users`

**操作步骤**:

1. 使用系统管理员或市级管理员账号登录
2. 进入"用户管理"页面
3. 点击"创建用户"按钮
4. 填写用户信息：
   ```
   - 用户名: 唯一标识（如: school_admin_001）
   - 密码: 初始密码（建议首次登录后修改）
   - 真实姓名: 管理员姓名
   - 角色: 选择管理员角色
   - 区县: 选择管理员所属区县（如适用）
   - 学校: 选择管理员所属学校（如适用）
   ```
5. 点击"提交"创建账号

**API接口**:
```http
POST /api/users/create
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "username": "school_admin_001",
  "password": "SecurePassword123!",
  "realName": "张三",
  "role": "school_admin",
  "districtCode": "520102",
  "schoolCode": "52010200001"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "用户创建成功",
  "data": {
    "id": 123,
    "username": "school_admin_001",
    "role": "school_admin"
  }
}
```

#### 方式二：直接数据库插入（仅开发/紧急情况）

**SQL示例**:
```sql
-- 1. 创建管理员用户
INSERT INTO users (username, password, real_name, role, district_code, school_code, created_at)
VALUES (
  'school_admin_001',
  -- 密码需要使用 bcrypt 加密，轮数为 10
  '$2b$10$YourBcryptHashedPasswordHere',
  '张三',
  'school_admin',
  '520102',
  '52010200001',
  NOW()
);

-- 2. 查询创建的用户
SELECT id, username, real_name, role, district_code, school_code
FROM users
WHERE username = 'school_admin_001';
```

**生成 bcrypt 密码哈希（Node.js）**:
```javascript
const bcrypt = require('bcrypt');
const password = 'YourPassword123!';
const hash = await bcrypt.hash(password, 10);
console.log(hash);
```

### 3. 管理员权限说明

#### 校级管理员 (`school_admin`)
- ✅ 审核本校学生注册申请（Level 2）
- ✅ 查看本校学生信息
- ✅ 管理本校教师账号
- ✅ 查看本校活动和成绩
- ❌ 无法审核其他学校的申请

#### 区县管理员 (`district_admin`)
- ✅ 审核区县内学生注册申请（Level 3）
- ✅ 处理校级管理员升级的申请
- ✅ 查看区县内所有学校数据
- ✅ 管理区县内学校管理员
- ❌ 无法跨区县操作

#### 市级管理员 (`municipal_admin`)
- ✅ 审核全市学生注册申请（Level 4）
- ✅ 处理区县管理员升级的申请
- ✅ 查看全市所有数据
- ✅ 管理所有下级管理员
- ✅ 系统配置权限

#### 系统管理员 (`system_admin`)
- ✅ 所有权限
- ✅ 数据库管理
- ✅ 系统维护
- ✅ 审核流程配置

---

## 学生注册流程

### 流程概览

```
学生填写注册表单
       ↓
提交注册申请（状态: pending, Level 2）
       ↓
校级管理员审核（3个工作日内）
       ↓
    ┌───────┴───────┐
    ↓               ↓
  批准           拒绝/超时升级
    ↓               ↓
创建账号        升级到区县级（Level 3）
    ↓               ↓
 登录使用       区县管理员审核
                    ↓
                ┌───┴───┐
                ↓       ↓
              批准   拒绝/超时升级
                ↓       ↓
            创建账号  升级到市级（Level 4）
                ↓       ↓
             登录使用  市级管理员审核
                            ↓
                        批准/拒绝
```

### 1. 学生注册申请

**前端页面**: `/register`

**必填信息**:
- 手机号: 11位中国大陆手机号（作为登录账号）
- 姓名: 学生真实姓名
- 出生日期: 用于生成初始密码
- 身份证后4位: 用于生成初始密码
- 所在区县: 从系统配置列表中选择
- 所在学校: 根据区县动态加载学校列表
- 年级: 一年级至六年级

**初始密码规则**:
```
初始密码 = 身份证后4位 + 出生年月日

示例:
- 身份证后4位: 1234
- 出生日期: 2015-05-15
- 初始密码: 12342015年05月15日
```

**API接口**:
```http
POST /api/registration/student
Content-Type: application/json

{
  "phone": "13800138000",
  "realName": "李小明",
  "birthDate": "2015-05-15",
  "idCardLast4": "1234",
  "districtCode": "520102",
  "schoolCode": "52010200001",
  "grade": "三年级"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "注册申请提交成功，请等待学校管理员审核",
  "data": {
    "id": 456,
    "estimatedReviewTime": "3个工作日内"
  }
}
```

### 2. 查询注册状态

**前端页面**: `/register-status/:phone`

学生可以使用手机号查询注册审核状态：

**API接口**:
```http
GET /api/registration/status/13800138000
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 456,
    "phone": "13800138000",
    "real_name": "李小明",
    "school_name": "贵阳市第一小学",
    "grade": "三年级",
    "status": "pending",
    "statusText": "待审核",
    "current_reviewer_level": 2,
    "submitted_at": "2025-10-27 14:30:00",
    "reviewed_at": null,
    "review_comment": null
  }
}
```

**状态说明**:
- `pending`: 待审核
- `approved`: 已批准（可以登录）
- `rejected`: 已拒绝（需要重新申请）

### 3. 自动升级机制

如果当前审核人超过 **3个工作日** 未处理，系统会自动升级到上一级管理员：

**升级规则**:
- Level 2 (校级) → Level 3 (区县级)
- Level 3 (区县级) → Level 4 (市级)
- Level 4 (市级): 最高级，不再升级

**自动升级任务**:
- 运行频率: 每小时执行一次
- Cron表达式: `0 * * * *`
- 实现位置: `backend/src/server.js:148-158`

**升级日志记录**:
```sql
INSERT INTO registration_audit_log
(request_id, action, action_level, comment)
VALUES
(456, 'auto_escalated', 3, '校级审核超时，自动升级到区县级');
```

---

## 审核管理流程

### 1. 审核管理页面

**前端页面**: `/admin/registration-approval`

**访问权限**: 仅管理员可访问

**功能特性**:
- ✅ 显示待审核申请列表
- ✅ 按状态筛选（待审核/已批准/已拒绝）
- ✅ 搜索功能（手机号/姓名）
- ✅ 批准操作（可选审核意见）
- ✅ 拒绝操作（必填拒绝原因）
- ✅ 查看审核历史（Timeline展示）
- ✅ 显示当前审核层级
- ✅ 分页支持

### 2. 批准学生申请

**操作步骤**:

1. 管理员登录系统
2. 进入"注册审核"页面
3. 查看待审核申请列表
4. 点击"批准"按钮
5. （可选）填写审核意见
6. 确认批准

**API接口**:
```http
POST /api/registration/admin/requests/456/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "comment": "信息核实无误，批准注册"
}
```

**后端处理逻辑**:
```javascript
// 1. 验证管理员权限
const hasPermission = checkReviewerPermission(
  adminLevel,
  requestLevel,
  districtCode,
  schoolCode
);

// 2. 创建学生用户账号
const userId = await createStudentUser({
  phone: request.phone,
  password: generateInitialPassword(birthDate, idCardLast4),
  realName: request.real_name,
  role: 'student',
  districtCode: request.district_code,
  schoolCode: request.school_code,
  grade: request.grade
});

// 3. 更新申请状态
await updateRequestStatus(requestId, 'approved');

// 4. 记录审核日志
await logAuditAction({
  requestId,
  action: 'approved',
  actionBy: adminId,
  actionLevel: adminLevel,
  comment: comment
});
```

**响应示例**:
```json
{
  "success": true,
  "message": "批准成功，学生账号已创建"
}
```

### 3. 拒绝学生申请

**操作步骤**:

1. 管理员登录系统
2. 进入"注册审核"页面
3. 查看待审核申请详情
4. 点击"拒绝"按钮
5. **必填**拒绝原因
6. 确认拒绝

**API接口**:
```http
POST /api/registration/admin/requests/456/reject
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "comment": "学校信息填写有误，请核实后重新申请"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "申请已拒绝"
}
```

### 4. 查看审核历史

**API接口**:
```http
GET /api/registration/admin/requests/456/history
Authorization: Bearer <admin_token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "action": "submitted",
        "action_by": null,
        "action_level": 2,
        "comment": "学生提交注册申请",
        "created_at": "2025-10-27 14:30:00"
      },
      {
        "action": "auto_escalated",
        "action_by": null,
        "action_level": 3,
        "comment": "校级审核超时，自动升级到区县级",
        "created_at": "2025-10-30 14:30:00"
      },
      {
        "action": "approved",
        "action_by": 12,
        "action_level": 3,
        "comment": "信息核实无误，批准注册",
        "created_at": "2025-10-30 15:45:00"
      }
    ]
  }
}
```

---

## 技术实现细节

### 1. 数据库表结构

#### `registration_requests` - 注册申请表
```sql
CREATE TABLE registration_requests (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(11) UNIQUE NOT NULL,
  real_name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  id_card_last_4 VARCHAR(4) NOT NULL,
  district_code VARCHAR(20) NOT NULL,
  school_code VARCHAR(20) NOT NULL,
  grade VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  current_reviewer_level INTEGER DEFAULT 2,
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  review_comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `registration_audit_log` - 审核日志表
```sql
CREATE TABLE registration_audit_log (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES registration_requests(id),
  action VARCHAR(50) NOT NULL,
  action_by INTEGER REFERENCES users(id),
  action_level INTEGER,
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. 权限验证逻辑

**文件位置**: `backend/src/routes/registration.js:267-313`

```javascript
function checkReviewerPermission(
  reviewerLevel,
  requestLevel,
  reviewerDistrictCode,
  requestDistrictCode,
  reviewerSchoolCode,
  requestSchoolCode
) {
  // 系统管理员：全局权限
  if (reviewerLevel === 5) {
    return true;
  }

  // 市级管理员：Level 4 可审核 Level 4 的申请
  if (reviewerLevel === 4 && requestLevel === 4) {
    return true;
  }

  // 区县管理员：Level 3 可审核同区县 Level 3 的申请
  if (reviewerLevel === 3 && requestLevel === 3) {
    return reviewerDistrictCode === requestDistrictCode;
  }

  // 校级管理员：Level 2 可审核同学校 Level 2 的申请
  if (reviewerLevel === 2 && requestLevel === 2) {
    return reviewerDistrictCode === requestDistrictCode &&
           reviewerSchoolCode === requestSchoolCode;
  }

  return false;
}
```

### 3. 初始密码生成

**文件位置**: `backend/src/routes/registration.js:316-325`

```javascript
function generateInitialPassword(birthDate, idCardLast4) {
  // 格式化出生日期
  const date = new Date(birthDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  // 生成密码: 身份证后4位 + 年 + "年" + 月 + "月" + 日 + "日"
  return `${idCardLast4}${year}年${month}月${day}日`;
}
```

### 4. 自动升级定时任务

**文件位置**: `backend/src/server.js:148-158`

```javascript
// 注册审核自动升级 - 每小时运行
cron.schedule('0 * * * *', async () => {
  try {
    // 查找超过3天未审核的申请
    const overdueRequests = await pool.query(`
      SELECT id, current_reviewer_level
      FROM registration_requests
      WHERE status = 'pending'
        AND current_reviewer_level < 4
        AND submitted_at < NOW() - INTERVAL '3 days'
    `);

    // 升级到上一级
    for (const request of overdueRequests.rows) {
      const newLevel = request.current_reviewer_level + 1;

      await pool.query(`
        UPDATE registration_requests
        SET current_reviewer_level = $1,
            updated_at = NOW()
        WHERE id = $2
      `, [newLevel, request.id]);

      // 记录升级日志
      await pool.query(`
        INSERT INTO registration_audit_log
        (request_id, action, action_level, comment)
        VALUES ($1, 'auto_escalated', $2, $3)
      `, [
        request.id,
        newLevel,
        `审核超时，自动升级到Level ${newLevel}`
      ]);
    }

    logger.info(`Registration escalation completed: ${overdueRequests.rows.length} requests escalated`);
  } catch (error) {
    logger.error('Registration escalation failed', { error: error.message });
  }
}, {
  timezone: 'Asia/Shanghai'
});
```

### 5. 前端组件架构

**主要组件**: `frontend/src/pages/admin/RegistrationApprovalPage.tsx`

**关键功能**:

```typescript
// 1. 数据加载
const fetchRequests = async () => {
  const response = await api.get('/registration/admin/requests', {
    params: { page, limit, status, search }
  });
  setRequests(response.data.data.requests);
};

// 2. 批准操作
const handleApprove = async () => {
  await api.post(`/registration/admin/requests/${id}/approve`, {
    comment: approveComment
  });
  message.success('批准成功');
  fetchRequests(); // 刷新列表
};

// 3. 拒绝操作
const handleReject = async () => {
  if (!rejectComment.trim()) {
    message.warning('请输入拒绝原因');
    return;
  }

  await api.post(`/registration/admin/requests/${id}/reject`, {
    comment: rejectComment
  });
  message.success('拒绝成功');
  fetchRequests();
};

// 4. 查看历史
const viewHistory = async (request) => {
  const response = await api.get(`/registration/admin/requests/${request.id}/history`);
  setAuditHistory(response.data.data.history);
  setHistoryModalVisible(true);
};
```

---

## 常见问题与解决方案

### Q1: 学生无法注册，提示"手机号已存在"

**原因**: 该手机号已经注册过或有待审核的申请

**解决方案**:
1. 使用该手机号登录系统（如果已批准）
2. 查询注册状态：访问 `/register-status/:phone`
3. 如果状态为"已拒绝"，可重新提交申请
4. 如果状态为"待审核"，请等待审核完成

### Q2: 管理员无法审核某个申请

**原因**: 权限不足或申请已被其他层级处理

**排查步骤**:
1. 检查管理员角色和权限层级
2. 确认申请的 `current_reviewer_level` 是否匹配
3. 检查区县/学校代码是否匹配
4. 查看审核历史，确认申请状态

**解决方案**:
```sql
-- 查询申请详情
SELECT r.*, u.username, u.role
FROM registration_requests r
LEFT JOIN users u ON r.id = u.id
WHERE r.phone = '13800138000';

-- 查询管理员权限
SELECT id, username, role, district_code, school_code
FROM users
WHERE id = <管理员ID>;
```

### Q3: 初始密码不正确

**原因**: 密码生成规则理解错误

**正确格式**:
```
身份证后4位 + 出生年 + "年" + 出生月 + "月" + 出生日 + "日"

示例:
- 身份证后4位: 1234
- 出生日期: 2015-05-15
- 初始密码: 12342015年05月15日 ← 注意中文字符
```

**验证方法**:
```javascript
// 生成密码
const password = generateInitialPassword('2015-05-15', '1234');
console.log(password); // "12342015年05月15日"

// 验证登录
const isValid = await bcrypt.compare(password, hashedPassword);
```

### Q4: 自动升级未生效

**排查步骤**:

1. 检查Cron任务是否运行
```bash
docker logs guiyang_oj_backend | grep "Registration escalation"
```

2. 检查申请提交时间
```sql
SELECT id, phone, submitted_at, current_reviewer_level
FROM registration_requests
WHERE status = 'pending'
  AND submitted_at < NOW() - INTERVAL '3 days';
```

3. 手动触发升级
```sql
-- 仅用于测试/紧急情况
UPDATE registration_requests
SET current_reviewer_level = current_reviewer_level + 1,
    updated_at = NOW()
WHERE id = <申请ID> AND current_reviewer_level < 4;
```

### Q5: 批准后学生无法登录

**排查步骤**:

1. 确认用户账号是否创建
```sql
SELECT id, username, role, created_at
FROM users
WHERE username = '13800138000';
```

2. 检查密码是否正确设置
```javascript
// 测试密码验证
const bcrypt = require('bcrypt');
const inputPassword = '12342015年05月15日';
const storedHash = '<数据库中的password字段>';
const isMatch = await bcrypt.compare(inputPassword, storedHash);
console.log('Password match:', isMatch);
```

3. 检查申请状态
```sql
SELECT status, reviewed_at, review_comment
FROM registration_requests
WHERE phone = '13800138000';
```

**解决方案**:
- 如果用户不存在：手动创建或重新批准申请
- 如果密码错误：重置密码
- 如果申请状态错误：更新状态

### Q6: 如何重置学生密码

**方式一：通过管理员界面**
1. 进入"用户管理"页面
2. 找到目标学生
3. 点击"重置密码"按钮
4. 密码将重置为初始密码（身份证后4位+出生日期）

**方式二：数据库直接更新**
```sql
-- 生成新密码的bcrypt哈希
-- 使用Node.js: bcrypt.hash('NewPassword123!', 10)

UPDATE users
SET password = '$2b$10$NewBcryptHashHere',
    updated_at = NOW()
WHERE username = '13800138000';
```

---

## 附录

### A. API接口完整列表

#### 学生注册相关

| 方法 | 路径 | 说明 | 权限 |
|-----|------|------|------|
| POST | `/api/registration/student` | 提交注册申请 | 公开 |
| GET | `/api/registration/status/:phone` | 查询注册状态 | 公开 |
| GET | `/api/registration/config/districts` | 获取区县列表 | 公开 |
| GET | `/api/registration/config/schools/:districtCode` | 获取学校列表 | 公开 |

#### 管理员审核相关

| 方法 | 路径 | 说明 | 权限 |
|-----|------|------|------|
| GET | `/api/registration/admin/requests` | 获取申请列表 | 管理员 |
| POST | `/api/registration/admin/requests/:id/approve` | 批准申请 | 管理员 |
| POST | `/api/registration/admin/requests/:id/reject` | 拒绝申请 | 管理员 |
| GET | `/api/registration/admin/requests/:id/history` | 查看审核历史 | 管理员 |

### B. 前端路由列表

| 路径 | 组件 | 说明 | 权限 |
|-----|------|------|------|
| `/register` | StudentRegisterPage | 学生注册页面 | 公开 |
| `/register-status/:phone` | RegisterStatusPage | 注册状态查询 | 公开 |
| `/admin/registration-approval` | RegistrationApprovalPage | 审核管理页面 | 管理员 |
| `/admin/users` | UserManagement | 用户管理页面 | 管理员 |

### C. 环境变量配置

```env
# 数据库配置
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=guiyang_oj

# JWT配置
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d

# 服务端口
PORT=3001

# CORS配置
CORS_ORIGIN=http://localhost:3000,http://localhost:80

# 日志级别
LOG_LEVEL=info

# 时区
TZ=Asia/Shanghai
```

### D. 相关文件位置

**后端**:
- 路由: `backend/src/routes/registration.js`
- 数据库Schema: `database/schema.sql`
- 服务器配置: `backend/src/server.js`

**前端**:
- 注册页面: `frontend/src/pages/StudentRegisterPage.tsx`
- 状态查询: `frontend/src/pages/RegisterStatusPage.tsx`
- 审核管理: `frontend/src/pages/admin/RegistrationApprovalPage.tsx`
- 路由配置: `frontend/src/App.tsx`
- 导航菜单: `frontend/src/components/layout/MainLayout.tsx`

**数据库**:
- Schema: `database/schema.sql`
- 种子数据: `database/seed.sql`

---

## 版本历史

| 版本 | 日期 | 说明 |
|-----|------|------|
| 1.0 | 2025-10-27 | 初始版本，包含完整的管理员创建和学生注册流程 |

---

**文档维护**: 开发团队
**最后更新**: 2025-10-27
**联系方式**: 请通过项目Issue反馈问题
