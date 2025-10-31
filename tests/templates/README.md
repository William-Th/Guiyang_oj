# 测试模板使用指南

本目录包含项目测试的标准化模板，帮助开发者快速创建规范的测试用例。

## 📁 模板文件

### 1. API测试模板
**文件**: `api-test-template.js`

**用途**: 用于创建后端API的单元测试和集成测试

**使用步骤**:
```bash
# 1. 复制模板到backend/tests/目录
cp tests/templates/api-test-template.js backend/tests/myFeature.test.js

# 2. 编辑文件，替换以下占位符：
#    [FEATURE_NAME] - 功能名称（如 QuestionComment）
#    [endpoint] - API端点（如 question-comments）
#    [table_name] - 数据表名称

# 3. 根据实际API修改测试用例

# 4. 运行测试
cd backend
npm test
```

**模板包含的测试**:
- ✅ POST - 创建资源
- ✅ GET - 获取列表（支持分页）
- ✅ GET /:id - 获取详情
- ✅ PUT /:id - 更新资源
- ✅ DELETE /:id - 删除资源
- ✅ 业务流程测试
- ✅ 权限验证测试
- ✅ 错误处理测试

### 2. E2E测试模板
**文件**: `e2e-test-template.spec.ts`

**用途**: 用于创建前端端到端测试

**使用步骤**:
```bash
# 1. 复制模板到tests/e2e/目录
cp tests/templates/e2e-test-template.spec.ts tests/e2e/my-feature.spec.ts

# 2. 编辑文件，替换以下占位符：
#    [FEATURE_NAME] - 功能名称（如 题目评论）
#    [feature-path] - 页面路径（如 question-comments）
#    [TEST_ID] - 测试用例ID（如 R501, R502等）

# 3. 根据实际页面修改测试用例

# 4. 运行测试
npm run test:e2e
```

**模板包含的测试**:
- ✅ 创建功能
- ✅ 查看详情
- ✅ 编辑功能
- ✅ 搜索功能
- ✅ 筛选功能
- ✅ 删除功能
- ✅ 分页功能
- ✅ 完整业务流程
- ✅ 表单验证
- ✅ 权限控制

## 🔧 常用辅助函数

### API测试

```javascript
// 获取认证token
const getAuthToken = async (username, password) => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ username, password });
  return response.body.data.token;
};

// 创建测试数据
const createTestData = async (endpoint, data, token) => {
  const response = await request(app)
    .post(endpoint)
    .set('Authorization', `Bearer ${token}`)
    .send(data);
  return response.body.data;
};
```

### E2E测试

```typescript
// 选择Ant Design Select选项
const selectAntOption = async (page: Page, fieldName: string, optionText: string) => {
  await page.click(`#${fieldName}`);
  await page.waitForTimeout(500);
  await page.click(`.ant-select-dropdown .ant-select-item-option:has-text("${optionText}")`);
};

// 等待加载完成
const waitForLoadingComplete = async (page: Page) => {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.ant-spin', { state: 'hidden', timeout: 5000 }).catch(() => {});
};

// 验证成功消息
const expectSuccessMessage = async (page: Page) => {
  await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
};
```

## 📝 测试命名规范

### API测试文件命名
- 格式: `{feature}.test.js`
- 示例: `questionComments.test.js`, `userPermissions.test.js`

### E2E测试文件命名
- 格式: `{feature}.spec.ts`
- 示例: `question-comments.spec.ts`, `user-management.spec.ts`

### 测试用例ID规范
- R开头表示回归测试: R401, R402, R403...
- S开头表示冒烟测试: S001, S002, S003...
- I开头表示集成测试: I101, I102, I103...

## ✅ 测试最佳实践

### 1. 遵循AAA模式
```javascript
test('应该成功创建用户', async () => {
  // Arrange - 准备测试数据
  const userData = {
    username: 'testuser',
    password: 'password123'
  };

  // Act - 执行操作
  const response = await createUser(userData);

  // Assert - 验证结果
  expect(response.status).toBe(201);
  expect(response.body.data.username).toBe('testuser');
});
```

### 2. 使用描述性的测试名称
```javascript
// ❌ 不好
test('测试1', async () => { ... });

// ✅ 好
test('应该在缺少必填字段时返回400错误', async () => { ... });
```

### 3. 独立的测试用例
- 每个测试应该独立运行
- 不依赖其他测试的执行顺序
- 清理测试数据

### 4. 使用beforeEach和afterEach
```javascript
beforeEach(async () => {
  // 每个测试前的准备工作
});

afterEach(async () => {
  // 每个测试后的清理工作
});
```

### 5. 合理使用超时设置
```typescript
// E2E测试中设置超时
await expect(page.locator('.element')).toBeVisible({ timeout: 10000 });

// API测试中设置超时
jest.setTimeout(15000);
```

## 🐛 常见问题

### API测试问题

**Q: 测试间出现数据污染**
```javascript
// A: 在afterEach中清理测试数据
afterEach(async () => {
  await db.query('DELETE FROM test_table WHERE created_by = $1', [testUserId]);
});
```

**Q: 权限测试失败**
```javascript
// A: 确保使用正确的角色登录
const adminToken = await getAuthToken('admin', 'admin123');
const teacherToken = await getAuthToken('teacher01', 'password123');
```

### E2E测试问题

**Q: 元素未找到**
```typescript
// A: 增加等待时间或使用更稳定的选择器
await page.waitForSelector('.ant-table', { timeout: 10000 });
await page.locator('[data-testid="submit-button"]').click();
```

**Q: 虚拟滚动表格中的元素不可见**
```typescript
// A: 使用filter和first定位正确的行
const targetRow = page
  .locator('.ant-table-tbody tr')
  .filter({ hasText: '目标文本' })
  .first();
```

## 📚 参考资源

- [Jest文档](https://jestjs.io/docs/getting-started)
- [Supertest文档](https://github.com/visionmedia/supertest)
- [Playwright文档](https://playwright.dev/docs/intro)
- [项目测试指南](../../README.md#测试策略)

## 🔄 更新日志

- 2025-01-20: 创建测试模板和使用指南
- 添加API测试模板
- 添加E2E测试模板
- 添加常用辅助函数

---

*如有问题或建议，请联系开发团队*
