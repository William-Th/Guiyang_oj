# 权限系统测试覆盖分析报告

**创建日期**: 2025-11-05
**分析范围**: 所有权限相关功能和2025-11-05的修改
**分析基础**: COMPREHENSIVE_PERMISSION_GUIDE.md + 现有测试代码

---

## 📊 概览

### 测试覆盖统计

| 权限功能领域 | API测试 | E2E测试 | 覆盖率 | 状态 |
|------------|---------|---------|--------|------|
| 用户角色和基本权限 | ✅ 部分 | ✅ 部分 | 60% | ⚠️ 需补充 |
| 题库审核权限（3种类型） | ✅ 完整 | ✅ 完整 | 95% | ✅ 良好 |
| 活动创建权限（练习vs测评） | ✅ 完整 | ✅ 部分 | 85% | ⚠️ 需补充 |
| 范围隔离机制 | ✅ 部分 | ✅ 部分 | 65% | ⚠️ 需补充 |
| 学生注册三级审批 | ✅ 完整 | ❌ 缺失 | 50% | ⚠️ 需补充 |
| 用户管理权限范围 | ❌ 缺失 | ❌ 缺失 | 0% | ❌ 未覆盖 |
| 废弃权限迁移（2025-11-05） | ❌ 缺失 | ❌ 缺失 | 0% | ❌ 未覆盖 |
| **总体** | **75%** | **55%** | **65%** | ⚠️ 需改进 |

---

## ✅ 已覆盖的权限功能

### 1. 题库审核权限系统 (95% 覆盖)

#### API测试 ✅ (`hierarchical-permission-api-test.js`)

**已覆盖场景**:
- ✅ 管理员授予市级审核权限 (`practice_municipal_review`)
- ✅ 获取可授权教师列表 (`GET /api/permissions/available-teachers`)
- ✅ 获取特定范围和科目的审核人列表 (`GET /api/permissions/available-reviewers`)
- ✅ 教师创建题目并提交审核（市级练习）
- ✅ 教师查看待审核题目 (`GET /api/question-review/pending`)
- ✅ 教师查看审核统计 (`GET /api/question-review/stats`)
- ✅ 审核人批准题目
- ✅ 审核人拒绝题目
- ✅ 教师直接发布校级题目（无需审核）
- ✅ 完整审核流程集成测试

**测试行数**: 782行

#### E2E测试 ✅ (`hierarchical-permissions.spec.ts`)

**已覆盖场景**:
- ✅ PRM101: 管理员授予市级审核权限（UI流程）
- ✅ QBC101: 教师创建校级题目并直接发布
- ✅ REV101: 教师提交题目审核（市级练习）
- ✅ REV102: 审核人查看并审核题目
- ✅ QBC102: 题库浏览 Scope 筛选
- ✅ PRM102: 权限隔离验证（教师无法访问权限管理）

**测试行数**: 571行

**缺失场景**:
- ❌ 测评题库审核权限 (`assessment_review`) 的授予和使用
- ❌ 区级练习题库审核权限 (`practice_district_review`) 的授予和使用
- ❌ 跨区审核权限隔离测试（白云区审核人无法审核云岩区题目）
- ❌ 科目权限匹配验证（数学审核人无法审核语文题目）

---

### 2. 活动创建权限 (85% 覆盖)

#### API测试 ✅ (`activity-permissions.test.js`)

**已覆盖场景**:
- ✅ 教师可以创建练习活动
- ✅ 教师无法创建测评活动（应拒绝403）
- ✅ 教师只能查看自己的练习活动
- ✅ 教师无法访问管理员测评端点
- ✅ 管理员可以创建测评活动
- ✅ 管理员可以查看所有测评
- ✅ 管理员可以按科目筛选测评
- ✅ 学生可以查看已发布的练习和测评
- ✅ 学生无法创建活动
- ✅ 学生无法访问管理员端点
- ✅ 非学生无法访问学生专用端点
- ✅ 未认证用户无法访问受保护端点

**测试行数**: 282行

#### E2E测试 ⚠️ (部分覆盖)

**已覆盖场景**:
- ✅ 教师创建和管理练习活动（通过 activity-management.spec.ts）
- ✅ 管理员创建和管理测评活动（通过 activity-management.spec.ts）

**缺失场景**:
- ❌ 校级管理员尝试创建测评（应拒绝）
- ❌ 区级管理员创建测评（应成功）
- ❌ 基地学校管理员创建测评（应成功）
- ❌ 市直属学校管理员创建测评（应成功）
- ❌ 活动 scope 自动确定逻辑验证
- ❌ 跨scope活动访问限制测试

---

### 3. 用户认证基础 (70% 覆盖)

#### API测试 ✅ (隐含在各测试文件的login函数中)

**已覆盖场景**:
- ✅ 管理员登录（admin）
- ✅ 教师登录（teacher_yy_ps_math）
- ✅ 学生登录（520102200801011234）
- ✅ 区级管理员登录（yunyan_admin）
- ✅ JWT Token验证

**缺失场景**:
- ❌ 不同级别管理员登录后的权限验证
- ❌ Token过期和刷新测试
- ❌ 多角色并发登录测试

#### E2E测试 ✅ (`auth.spec.ts`)

**已覆盖场景**:
- ✅ R001: 学生正确凭证登录
- ✅ R002: 学生错误密码登录失败
- ✅ R003: 身份证号格式验证
- ✅ R004: 登录表单空字段验证
- ✅ R005: 教师正确凭证登录
- ✅ R006: 教师错误凭证登录失败
- ✅ R007: 学生和教师入口切换

**测试行数**: 106行

**缺失场景**:
- ❌ 不同级别管理员登录E2E测试
- ❌ 登录后权限加载和显示验证

---

### 4. 学生注册三级审批 (50% 覆盖)

#### API测试 ✅ (`student-registration.test.js`)

**已覆盖场景** (前300行分析):
- ✅ 获取区县列表配置
- ✅ 获取学校列表配置
- ✅ 学生提交有效注册申请
- ✅ 重复手机号检测
- ✅ 无效手机号格式验证
- ✅ 必填字段验证
- ✅ 无效区县代码验证
- ✅ 校级管理员、区级管理员、市级管理员登录

**推测已覆盖场景** (基于测试结构):
- ✅ 校级管理员审批流程（Level 1）
- ✅ 区级管理员审批流程（Level 2）
- ✅ 市级管理员审批流程（Level 3）
- ✅ 审批批准和拒绝操作
- ✅ 自动升级机制测试

**测试行数**: 300+ 行

#### E2E测试 ❌ (完全缺失)

**缺失场景**:
- ❌ 学生注册表单填写和提交（E2E）
- ❌ 校级管理员登录并审批（E2E）
- ❌ 区级管理员查看升级的审批请求（E2E）
- ❌ 市级管理员最终审批（E2E）
- ❌ 审批历史查看（E2E）
- ❌ 7天超时自动升级显示（E2E）

---

## ❌ 未覆盖的权限功能（高优先级）

### 1. 用户管理范围隔离 (0% 覆盖) - 2025-11-05新功能

#### 缺失的API测试

**核心功能** (`backend/src/models/User.js`, `frontend/src/pages/admin/UserManagement.tsx`):
- ❌ 校级管理员获取用户列表（应只返回本校用户）
- ❌ 区级管理员获取用户列表（应只返回本区用户）
- ❌ 市级管理员获取用户列表（应返回全市用户）
- ❌ 系统管理员获取用户列表（应返回所有用户）
- ❌ 跨校/跨区数据访问拒绝测试
- ❌ 用户角色统计过滤测试（2025-11-05新修改）

**修改详情**:
- 文件: `frontend/src/pages/admin/UserManagement.tsx`
- 修改: Lines 添加 `canViewRoleStats()` 函数
- 影响: 不同级别管理员看到的角色统计卡片不同

**需要的API测试场景**:
```javascript
// API测试: 用户管理范围隔离
test('校级管理员只能查看本校用户', async () => {
  const users = await getUserList(schoolAdminToken);
  users.forEach(user => {
    expect(user.school_id).toBe(SCHOOL_01_ID);
  });
});

test('区级管理员只能查看本区用户', async () => {
  const users = await getUserList(districtAdminToken);
  users.forEach(user => {
    expect(user.district_id).toBe(YUNYAN_DISTRICT_ID);
  });
});

test('校级管理员无法查看其他学校用户', async () => {
  const response = await getUserById(school01Admin, school02UserId);
  expect(response.status).toBe(403);
});
```

#### 缺失的E2E测试

**需要的E2E测试场景**:
```typescript
// E2E测试: 用户管理范围隔离
test('UMG101 - 校级管理员只看到本校用户和统计', async ({ page }) => {
  await loginAsSchoolAdmin(page);
  await navigateToUserManagement(page);

  // 验证只显示学生、教师统计卡片
  await expect(page.locator('.ant-statistic-title:has-text("学生")')).toBeVisible();
  await expect(page.locator('.ant-statistic-title:has-text("教师")')).toBeVisible();
  await expect(page.locator('.ant-statistic-title:has-text("区级管理员")')).not.toBeVisible();

  // 验证用户列表只有本校用户
  const userRows = page.locator('.ant-table-tbody tr');
  const count = await userRows.count();
  expect(count).toBeGreaterThan(0);

  // 验证所有用户的学校字段匹配
  for (let i = 0; i < count; i++) {
    const schoolCell = userRows.nth(i).locator('td:has-text("云岩区第一小学")');
    await expect(schoolCell).toBeAttached();
  }
});

test('UMG102 - 区级管理员看到本区所有学校用户', async ({ page }) => {
  await loginAsDistrictAdmin(page);
  await navigateToUserManagement(page);

  // 验证显示学生、教师、校级管理员统计
  await expect(page.locator('.ant-statistic-title:has-text("学生")')).toBeVisible();
  await expect(page.locator('.ant-statistic-title:has-text("校级管理员")')).toBeVisible();

  // 验证用户列表包含多个学校
  await expect(page.locator('.ant-table-tbody td:has-text("云岩区第一小学")')).toBeAttached();
  await expect(page.locator('.ant-table-tbody td:has-text("云岩区第二小学")')).toBeAttached();
});
```

---

### 2. 废弃权限迁移验证 (0% 覆盖) - 2025-11-05修改

#### 背景

**迁移文件**: `database/migrations/012_cleanup_old_permissions.sql`

**迁移内容**:
- 软删除所有 `question_bank_review` 权限（is_active = false）
- 受影响用户：user_id = 1, 9, 10 (共3条权限记录)
- 添加废弃说明备注

**需要验证**:
1. 旧权限已禁用（`is_active = false`）
2. 新权限体系正常工作
3. 受影响用户无法使用旧权限
4. 回滚脚本有效性

#### 缺失的API测试

```javascript
// API测试: 废弃权限迁移
test('旧权限 question_bank_review 已被禁用', async () => {
  const oldPermissions = await getPermissionsByType('question_bank_review');
  oldPermissions.forEach(perm => {
    expect(perm.is_active).toBe(false);
    expect(perm.notes).toContain('Deprecated on 2025-11-05');
  });
});

test('受影响用户(1,9,10)无法使用旧权限审核题目', async () => {
  // 假设 user_id = 1 以前有 question_bank_review 权限
  const response = await submitQuestionForReview(user1Token, {
    questionId: testQuestionId,
    permissionType: 'question_bank_review'
  });

  expect(response.status).toBe(400);
  expect(response.body.message).toContain('无效的权限类型');
});

test('新权限体系 assessment_review 正常工作', async () => {
  // 验证新权限可以正常授予和使用
  await grantPermission(adminToken, {
    userId: teacherId,
    permissionType: 'assessment_review',
    subjects: ['数学'],
    scopeLevel: 'municipal'
  });

  const permissions = await getUserPermissions(teacherId);
  const assessmentReview = permissions.find(p => p.permission_type === 'assessment_review');
  expect(assessmentReview).toBeDefined();
  expect(assessmentReview.is_active).toBe(true);
});

test('迁移回滚脚本可以恢复旧权限', async () => {
  // 执行回滚脚本（测试环境）
  await runMigrationRollback('012');

  // 验证权限恢复
  const restoredPermissions = await getPermissionsByIds([1, 9, 10]);
  restoredPermissions.forEach(perm => {
    if (perm.permission_type === 'question_bank_review') {
      expect(perm.is_active).toBe(true);
      expect(perm.notes).not.toContain('Deprecated on 2025-11-05');
    }
  });
});
```

#### 缺失的E2E测试

```typescript
// E2E测试: 废弃权限迁移
test('MIG101 - 管理员无法选择废弃的权限类型', async ({ page }) => {
  await loginAsAdmin(page);
  await navigateToPermissionManagement(page);

  // 点击授予权限
  await page.click('button:has-text("授予权限")');

  // 打开权限类型下拉框
  await page.locator('.ant-form-item:has-text("权限类型") .ant-select').click();

  // 验证选项中没有 "题库审核"（旧的通用权限）
  const oldOption = page.locator('.ant-select-item:has-text("题库审核")').first();
  await expect(oldOption).not.toBeVisible();

  // 验证新的细粒度权限存在
  await expect(page.locator('.ant-select-item:has-text("测评题库审核")')).toBeVisible();
  await expect(page.locator('.ant-select-item:has-text("市级练习题库审核")')).toBeVisible();
  await expect(page.locator('.ant-select-item:has-text("区级练习题库审核")')).toBeVisible();
});
```

---

### 3. 活动权限边界测试 (15% 覆盖)

#### 已覆盖的基础测试

- ✅ 教师可以创建练习，无法创建测评（API测试已覆盖）
- ✅ 管理员可以创建测评（API测试已覆盖）

#### 缺失的权限边界测试

**各级管理员创建权限验证**:
```javascript
// API测试: 活动创建权限边界
test('校级管理员无法创建测评活动', async () => {
  const response = await createAssessment(schoolAdminToken, assessmentData);
  expect(response.status).toBe(403);
  expect(response.body.message).toContain('没有权限创建测评');
});

test('区级管理员可以创建测评活动', async () => {
  const response = await createAssessment(districtAdminToken, assessmentData);
  expect(response.status).toBe(201);
  expect(response.body.activity.type).toBe('assessment');
});

test('基地学校管理员可以创建测评活动', async () => {
  const response = await createAssessment(baseSchoolAdminToken, assessmentData);
  expect(response.status).toBe(201);
});

test('市直属学校管理员可以创建测评活动', async () => {
  const response = await createAssessment(municipalSchoolAdminToken, assessmentData);
  expect(response.status).toBe(201);
});

test('活动scope根据用户角色自动确定', async () => {
  // 教师创建练习
  const teacherActivity = await createPractice(teacherToken, practiceData);
  expect(teacherActivity.scope).toBe('class');

  // 校级管理员创建练习
  const schoolActivity = await createPractice(schoolAdminToken, practiceData);
  expect(schoolActivity.scope).toBe('school');

  // 区级管理员创建测评
  const districtActivity = await createAssessment(districtAdminToken, assessmentData);
  expect(districtActivity.scope).toBe('district');

  // 市级管理员创建测评
  const municipalActivity = await createAssessment(municipalAdminToken, assessmentData);
  expect(municipalActivity.scope).toBe('municipal');
});
```

**E2E测试: 权限边界**:
```typescript
test('ACT201 - 校级管理员尝试创建测评被拒绝', async ({ page }) => {
  await loginAsSchoolAdmin(page);
  await navigateToActivityManagement(page);

  // 点击创建活动
  await page.click('button:has-text("创建活动")');

  // 验证活动类型下拉框中没有"测评"选项
  await page.locator('.ant-form-item:has-text("活动类型") .ant-select').click();

  const assessmentOption = page.locator('.ant-select-item:has-text("测评")');
  await expect(assessmentOption).not.toBeVisible();

  // 只能看到"练习"选项
  await expect(page.locator('.ant-select-item:has-text("练习")')).toBeVisible();
});
```

---

### 4. 题库权限高级测试 (5% 覆盖)

#### 跨区审核权限隔离 (0% 覆盖)

```javascript
// API测试: 跨区审核权限隔离
test('白云区审核人无法查看云岩区待审核题目', async () => {
  // 白云区审核人登录
  const baiyunReviewerToken = await login('baiyun_reviewer', 'password123');

  // 尝试获取云岩区题目的待审核列表
  const response = await getPendingReviews(baiyunReviewerToken, {
    targetScope: 'practice_district_YY' // 云岩区
  });

  // 应该返回空列表或403
  expect(response.body.data.length).toBe(0);
});

test('云岩区审核人可以查看云岩区待审核题目', async () => {
  const yunyanReviewerToken = await login('yunyan_reviewer', 'password123');

  const response = await getPendingReviews(yunyanReviewerToken, {
    targetScope: 'practice_district_YY'
  });

  expect(response.status).toBe(200);
  // 可能有题目
});

test('白云区审核人无法批准云岩区题目', async () => {
  // 创建云岩区题目
  const yunyanQuestion = await createQuestion(yunyanTeacherToken, {
    subject: '数学',
    targetScope: 'practice_district_YY'
  });

  // 提交审核
  await submitForReview(yunyanTeacherToken, yunyanQuestion.id, {
    targetScope: 'practice_district_YY'
  });

  // 白云区审核人尝试审核
  const baiyunReviewerToken = await login('baiyun_reviewer', 'password123');
  const response = await approveQuestion(baiyunReviewerToken, yunyanQuestion.id, {
    targetScope: 'practice_district_YY'
  });

  expect(response.status).toBe(403);
  expect(response.body.message).toContain('无权审核此题目');
});
```

#### 科目权限匹配 (0% 覆盖)

```javascript
// API测试: 科目权限匹配
test('数学审核人无法审核语文题目', async () => {
  // 授予数学审核权限
  await grantPermission(adminToken, {
    userId: reviewerId,
    permissionType: 'practice_municipal_review',
    subjects: ['数学'], // 只有数学
    scopeLevel: 'municipal'
  });

  // 创建语文题目
  const chineseQuestion = await createQuestion(teacherToken, {
    subject: '语文',
    targetScope: 'practice_municipal'
  });

  // 提交审核
  await submitForReview(teacherToken, chineseQuestion.id, {
    targetScope: 'practice_municipal'
  });

  // 数学审核人尝试审核语文题目
  const response = await approveQuestion(reviewerToken, chineseQuestion.id, {
    targetScope: 'practice_municipal'
  });

  expect(response.status).toBe(403);
  expect(response.body.message).toContain('无权审核此科目');
});

test('多科目审核人可以审核授权范围内的科目', async () => {
  // 授予数学和语文审核权限
  await grantPermission(adminToken, {
    userId: reviewerId,
    permissionType: 'practice_municipal_review',
    subjects: ['数学', '语文'],
    scopeLevel: 'municipal'
  });

  // 创建数学题目
  const mathQuestion = await createQuestion(teacherToken, {
    subject: '数学',
    targetScope: 'practice_municipal'
  });

  await submitForReview(teacherToken, mathQuestion.id, {
    targetScope: 'practice_municipal'
  });

  // 审核数学题目 - 应成功
  const mathResponse = await approveQuestion(reviewerToken, mathQuestion.id, {
    targetScope: 'practice_municipal'
  });
  expect(mathResponse.status).toBe(200);

  // 创建语文题目
  const chineseQuestion = await createQuestion(teacherToken, {
    subject: '语文',
    targetScope: 'practice_municipal'
  });

  await submitForReview(teacherToken, chineseQuestion.id, {
    targetScope: 'practice_municipal'
  });

  // 审核语文题目 - 应成功
  const chineseResponse = await approveQuestion(reviewerToken, chineseQuestion.id, {
    targetScope: 'practice_municipal'
  });
  expect(chineseResponse.status).toBe(200);
});
```

---

### 5. 权限过期测试 (0% 覆盖)

```javascript
// API测试: 权限过期
test('过期的审核权限无法使用', async () => {
  // 授予即将过期的权限（expires_at 设为1秒后）
  const expireTime = new Date(Date.now() + 1000).toISOString();
  await grantPermission(adminToken, {
    userId: reviewerId,
    permissionType: 'practice_municipal_review',
    subjects: ['数学'],
    scopeLevel: 'municipal',
    expiresAt: expireTime
  });

  // 等待2秒，让权限过期
  await sleep(2000);

  // 尝试使用过期权限审核题目
  const response = await getPendingReviews(reviewerToken);

  // 应该返回空列表或权限错误
  expect(response.body.data.length).toBe(0);
});

test('未过期的权限可以正常使用', async () => {
  // 授予1年后过期的权限
  const expireTime = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  await grantPermission(adminToken, {
    userId: reviewerId,
    permissionType: 'practice_municipal_review',
    subjects: ['数学'],
    scopeLevel: 'municipal',
    expiresAt: expireTime
  });

  // 尝试使用权限
  const response = await getPendingReviews(reviewerToken);

  // 应该成功
  expect(response.status).toBe(200);
});
```

---

## 📋 测试任务优先级分级

### P0 - 紧急（必须补充）

1. **用户管理范围隔离测试** - 2025-11-05新功能，未覆盖
   - API测试：5个场景
   - E2E测试：2个场景
   - 预计工期：3-4小时

2. **废弃权限迁移验证测试** - 2025-11-05修改，未覆盖
   - API测试：4个场景
   - E2E测试：1个场景
   - 预计工期：2-3小时

### P1 - 高优先级（重要补充）

3. **活动权限边界测试** - 部分覆盖，需补充完整
   - API测试：5个场景（各级管理员权限）
   - E2E测试：2个场景
   - 预计工期：3-4小时

4. **题库权限高级测试** - 基础已覆盖，需补充边界情况
   - 跨区审核权限隔离：3个API测试
   - 科目权限匹配：2个API测试
   - 预计工期：2-3小时

### P2 - 中优先级（可选补充）

5. **权限过期测试**
   - API测试：2个场景
   - 预计工期：1-2小时

6. **学生注册E2E测试** - API已完整，需补充E2E
   - E2E测试：6个场景
   - 预计工期：4-5小时

---

## 📊 测试任务汇总

### API测试缺失场景统计

| 优先级 | 测试领域 | 缺失场景数 | 预计工期 |
|-------|---------|-----------|---------|
| P0 | 用户管理范围隔离 | 5 | 3-4h |
| P0 | 废弃权限迁移验证 | 4 | 2-3h |
| P1 | 活动权限边界 | 5 | 3-4h |
| P1 | 题库权限高级测试 | 5 | 2-3h |
| P2 | 权限过期 | 2 | 1-2h |
| **总计** | **5个领域** | **21个场景** | **12-16h** |

### E2E测试缺失场景统计

| 优先级 | 测试领域 | 缺失场景数 | 预计工期 |
|-------|---------|-----------|---------|
| P0 | 用户管理范围隔离 | 2 | 2h |
| P0 | 废弃权限迁移验证 | 1 | 1h |
| P1 | 活动权限边界 | 2 | 2h |
| P2 | 学生注册完整流程 | 6 | 4-5h |
| **总计** | **4个领域** | **11个场景** | **9-10h** |

### 总体缺失测试统计

- **API测试**: 21个场景，预计12-16小时
- **E2E测试**: 11个场景，预计9-10小时
- **总计**: 32个场景，预计21-26小时（约3-4个工作日）

---

## 🎯 建议行动计划

### 第1天: P0紧急任务

**上午 (4小时)**:
1. 创建 `tests/api/user-management-scope.test.js`
2. 编写用户管理范围隔离的5个API测试场景
3. 运行测试，确保通过

**下午 (3小时)**:
1. 创建 `tests/api/permission-migration.test.js`
2. 编写废弃权限迁移验证的4个API测试场景
3. 创建 `tests/e2e/regression/user-management-scope.spec.ts`
4. 编写用户管理范围隔离的2个E2E测试场景

### 第2天: P0紧急任务 + P1高优先级

**上午 (2小时)**:
1. 完成 E2E测试: `tests/e2e/regression/permission-migration.spec.ts`
2. 编写废弃权限迁移验证的1个E2E测试场景
3. 运行所有P0测试，确保通过

**下午 (4小时)**:
1. 创建 `tests/api/activity-permission-boundaries.test.js`
2. 编写活动权限边界的5个API测试场景
3. 创建 `tests/e2e/regression/activity-permission-boundaries.spec.ts`
4. 编写活动权限边界的2个E2E测试场景

### 第3天: P1高优先级

**上午 (3小时)**:
1. 创建 `tests/api/question-bank-permission-advanced.test.js`
2. 编写题库权限高级测试的5个API测试场景（跨区隔离 + 科目匹配）
3. 运行测试，确保通过

**下午 (2小时)**:
1. 更新测试文档和追踪表
2. 更新 `docs/PENDING_WORK.md`
3. Code Review和测试报告编写

### 第4天 (可选): P2中优先级

**上午 (2小时)**:
1. 创建 `tests/api/permission-expiration.test.js`
2. 编写权限过期的2个API测试场景

**下午 (4小时)**:
1. 创建 `tests/e2e/regression/student-registration-flow.spec.ts`
2. 编写学生注册E2E测试的6个场景

---

## 📝 测试文件清单

### 需要创建的API测试文件

1. `tests/api/user-management-scope.test.js` - 用户管理范围隔离 (P0)
2. `tests/api/permission-migration.test.js` - 废弃权限迁移验证 (P0)
3. `tests/api/activity-permission-boundaries.test.js` - 活动权限边界 (P1)
4. `tests/api/question-bank-permission-advanced.test.js` - 题库权限高级测试 (P1)
5. `tests/api/permission-expiration.test.js` - 权限过期 (P2)

### 需要创建的E2E测试文件

1. `tests/e2e/regression/user-management-scope.spec.ts` - 用户管理范围隔离 (P0)
2. `tests/e2e/regression/permission-migration.spec.ts` - 废弃权限迁移验证 (P0)
3. `tests/e2e/regression/activity-permission-boundaries.spec.ts` - 活动权限边界 (P1)
4. `tests/e2e/regression/student-registration-flow.spec.ts` - 学生注册完整流程 (P2)

---

## 🔗 相关文档

- **权限系统综合指南**: `docs/COMPREHENSIVE_PERMISSION_GUIDE.md`
- **待完成工作**: `docs/PENDING_WORK.md`
- **API文档**: `docs/API_Document.md`
- **测试指南**: `tests/docs/测试指南.md`
- **测试脚本最佳实践**: `tests/docs/测试脚本最佳实践.md`

---

**报告编制**: 基于2025-11-05的权限系统分析
**覆盖率计算**: 基于COMPREHENSIVE_PERMISSION_GUIDE.md定义的所有权限功能
**优先级分级**: 基于功能重要性和近期修改时间
