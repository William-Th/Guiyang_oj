# API 测试文档

本目录包含所有后端 API 的测试，包括单元测试和业务流程测试。

## 📂 测试结构

### 单元测试

单元测试专注于测试单个 API 端点或服务的功能。

| 测试文件 | 测试内容 | 状态 |
|---------|---------|------|
| **[questionCode.test.js](./questionCode.test.js)** | 题目编码服务测试 | ✅ |
| **[question-bank-api-test.js](./question-bank-api-test.js)** | 题库 API 测试 | ✅ |
| **[exam-api-test.js](./exam-api-test.js)** | 考试 API 测试 | ✅ |
| **[test-admin-api.js](./test-admin-api.js)** | 管理员 API 测试 | ✅ |
| **[smoke-test.js](./smoke-test.js)** | API 冒烟测试 | ✅ |

### 业务流程测试

业务流程测试验证完整的业务流程，涉及多个 API 的协作。

| 测试文件 | 测试内容 | 状态 |
|---------|---------|------|
| **[exam-submit-flow-test.js](./exam-submit-flow-test.js)** | 考试提交完整流程 | ✅ |

## 🚀 运行测试

### 运行所有 API 测试

```bash
# 从项目根目录运行
npm run test:api

# 或使用 Jest 直接运行
npx jest tests/api
```

### 运行特定测试文件

```bash
# 运行题目编码测试
npx jest tests/api/questionCode.test.js

# 运行题库 API 测试
npx jest tests/api/question-bank-api-test.js

# 运行考试流程测试
npx jest tests/api/exam-submit-flow-test.js
```

### 运行冒烟测试

```bash
# 快速验证核心 API 功能
npx jest tests/api/smoke-test.js
```

## 📝 测试编写规范

### 测试文件命名

- **单元测试**: `[feature]-api-test.js` 或 `[service].test.js`
- **流程测试**: `[feature]-flow-test.js`
- **冒烟测试**: `smoke-test.js`

### 测试结构

```javascript
/**
 * 功能描述
 *
 * 测试内容：
 * 1. xxx
 * 2. xxx
 */

describe('Feature Name', () => {
  // Setup
  beforeAll(async () => {
    // 初始化测试环境
  });

  // Cleanup
  afterAll(async () => {
    // 清理测试数据
  });

  describe('具体功能', () => {
    it('应该完成某个操作', async () => {
      // Arrange
      const input = {...};

      // Act
      const result = await someFunction(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.property).toBe(expectedValue);
    });
  });
});
```

### 最佳实践

1. **独立性**: 每个测试应该独立运行，不依赖其他测试
2. **清理**: 使用 `afterAll`/`afterEach` 清理测试数据
3. **明确性**: 测试名称应清楚描述测试内容
4. **覆盖率**: 包括正常流程、边界条件和异常处理
5. **快速**: API 测试应该快速执行，避免长时间等待

## 🧪 测试覆盖范围

### 已测试的功能模块

- ✅ **认证授权**: 登录、权限验证
- ✅ **考试管理**: 考试CRUD、考试提交流程
- ✅ **题库管理**: 题目CRUD、题目编码
- ✅ **成绩管理**: 成绩查询、统计
- ✅ **用户管理**: 用户信息查询、更新

### 待测试的功能模块

- ⏳ **证书生成**: 证书创建、下载、验证
- ⏳ **权限管理**: 教师权限、审核权限
- ⏳ **系统配置**: 科目、能力维度、知识点配置
- ⏳ **题库审核**: 草稿提交、审核流程

## 🔧 测试配置

### Jest 配置

API 测试使用 Jest 作为测试框架。相关配置在项目根目录的 `jest.config.js` 中。

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/api/**/*.test.js', '**/tests/api/**/*-test.js'],
  testTimeout: 30000,
  // ...其他配置
};
```

### 环境变量

测试需要以下环境变量（通常在 `.env.test` 文件中配置）：

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=guiyang_oj_test
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=test_secret
```

## 📊 测试报告

运行测试后，可以生成覆盖率报告：

```bash
# 生成覆盖率报告
npx jest tests/api --coverage

# 查看 HTML 报告
open coverage/lcov-report/index.html
```

## 🐛 调试测试

### 使用 VS Code 调试

在 `.vscode/launch.json` 中添加配置：

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest: API Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "tests/api",
    "--runInBand",
    "--no-coverage"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### 日志输出

在测试中使用 `console.log` 输出调试信息：

```javascript
it('应该返回正确的结果', async () => {
  const result = await someFunction();
  console.log('Result:', JSON.stringify(result, null, 2));
  expect(result).toBeDefined();
});
```

---

*最后更新: 2025-01-20*
*维护人员: 开发团队*
