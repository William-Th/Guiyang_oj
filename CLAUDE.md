# CLAUDE.md - 贵阳市小学生测评平台开发指南

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository.

**项目简介**: 一个为贵阳市小学生设计的在线测评服务平台，支持多科目在线考试、自动评分、成绩查询和证书生成等功能。

---

## 📚 目录

1. [开发命令](#开发命令)
2. [系统架构](#系统架构)
3. [开发实践流程](#开发实践流程)
4. [测试指南](#测试指南)
5. [文档规范](#文档规范)
6. [故障排除](#故障排除)

---

## 开发命令

### Docker Development (Recommended)

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up -d --build

# View logs
docker-compose logs -f [service_name]

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
```

### Backend Development

```bash
cd backend
npm install
npm run dev         # Development server with nodemon
npm run start       # Production server
npm test            # Run Jest tests
npm run lint        # ESLint code checking
npm run migrate     # Database migrations
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev         # Vite development server
npm run build       # TypeScript compilation + Vite build
npm run preview     # Preview production build
npm run lint        # ESLint with TypeScript
```

### Database Operations

```bash
# Connect to PostgreSQL
docker exec -it guiyang_oj_postgres psql -U postgres -d guiyang_oj

# Import schema and seed data
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/schema.sql
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/seed.sql

# Backup database
docker exec guiyang_oj_postgres pg_dump -U postgres guiyang_oj > backup_$(date +%Y%m%d_%H%M%S).sql

# Run database migration
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/migrations/001_migration.sql

# Reset database
docker-compose down
docker volume rm guiyang_oj_postgres_data
docker-compose up -d
```

### Testing Commands

```bash
# E2E Tests
npx playwright test -c tests/playwright.config.ts                    # All tests
npx playwright test tests/e2e/smoke/ -c tests/playwright.config.ts   # Smoke tests
npx playwright test tests/e2e/regression/ -c tests/playwright.config.ts  # Regression tests
npx playwright test --ui -c tests/playwright.config.ts                # UI mode (debugging)
npx playwright test --headed -c tests/playwright.config.ts            # Headed mode
npx playwright show-report tests/test-results/html                    # View report

# API Tests
node tests/api/smoke-test.js                  # API smoke tests
node tests/api/test-admin-api.js              # Admin API tests
bash tests/api/test-admin-inside-docker.sh    # Tests inside Docker
```

---

## 系统架构

### System Components

- **Frontend**: React 18 + TypeScript + Ant Design 5 + Redux Toolkit + Vite
- **Backend**: Node.js + Express.js + PostgreSQL + Redis + JWT authentication
- **Database**: PostgreSQL 15 with comprehensive schema
- **Deployment**: Docker + Docker Compose + Nginx
- **Testing**: Playwright (E2E) + Jest (Unit/API)
- **Security**: Helmet.js, rate limiting, CORS, bcrypt, JWT

### Application Structure

```
guiyang_oj/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── models/         # Database models
│   │   ├── middleware/     # auth.js, permissions
│   │   ├── services/       # Business logic
│   │   └── server.js       # Express configuration
├── frontend/                # React TypeScript SPA
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Route pages
│   │   ├── store/          # Redux state
│   │   └── services/       # API layer
├── database/                # SQL schema and migrations
│   ├── schema.sql          # Complete database schema
│   ├── seed.sql            # Seed data
│   └── migrations/         # Database migrations
├── tests/                   # Testing suite
│   ├── e2e/                # Playwright E2E tests
│   ├── api/                # API tests
│   └── docs/               # Test documentation
├── documents/               # Project documentation
├── nginx/                   # Reverse proxy config
└── docker-compose.yml       # Multi-container orchestration
```

### Service Ports

- Frontend: http://localhost:3000 (Vite dev) or http://localhost:80 (Nginx)
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- pgAdmin: http://localhost:5050

### Demo Accounts

All demo accounts use password: `password123`

- **Student**: `13800138003` (phone login, 真实姓名: 张小明)
- **Teacher**: `teacher01`
- **Admin**: `admin`

### API Endpoints Structure

- `/api/auth/*` - Authentication (login, logout, token refresh)
- `/api/activities/*` - Activity system (测评/练习) - New activity-based system
- `/api/exams/*` - Legacy exam routes (will be deprecated)
- `/api/questions/*` - Question bank management
- `/api/question-bank/*` - Question bank CRUD
- `/api/question-review/*` - Question review workflow
- `/api/results/*` - Results and statistics
- `/api/users/*` - User management
- `/api/permissions/*` - Permission management
- `/api/certificates/*` - Certificate generation and download

### Database Schema Key Tables

- `users` - All user accounts with role-based access
- `activities` - Activity definitions (formerly `exams`)
- `student_activities` - Student registration and attempts (formerly `student_exams`)
- `questions` - Question bank with multiple types
- `question_bank` - Question metadata and categorization
- `question_review` - Question review workflow
- `answers` - Individual question responses with scoring
- `certificates` - Certificate records
- `activity_history` - Audit trail for activities

---

## 开发实践流程

为了提高开发效率和代码质量，本项目采用以下标准化开发流程。

### 开发流程步骤

每个新功能的开发应该按照以下顺序进行：

#### 1️⃣ 数据库设计

- 设计数据表结构
- 编写SQL schema文件（`database/schema.sql`）
- 创建数据库迁移脚本（`database/migrations/`）
- 验证数据表创建成功
- **📝 文档更新：**
  - 更新数据库表结构文档
  - 在迁移脚本中添加详细注释说明变更原因
  - 如有字段修改，同时更新 `schema.sql` 和保留迁移记录

#### 2️⃣ 后端API开发

- 创建数据模型（Models）
- 实现业务逻辑（Services）
- 编写API路由和控制器（Routes/Controllers）
- 添加输入验证和错误处理
- 实现权限控制
- **📝 文档更新：**
  - 更新 **API_Document.md**，添加新接口的详细文档
  - 包含请求/响应格式、参数说明、错误码说明
  - 添加使用示例和注意事项

#### 2.5️⃣ 重新构建和重启后端服务

- **重要步骤：** 后端代码修改后必须重新构建Docker镜像才能生效
- 重新构建后端：`docker-compose up --build -d backend`
- 等待服务启动完成（约10-30秒）
- 验证服务正常运行：`curl http://localhost:3001/health`
- 检查日志确认无错误：`docker-compose logs backend`

#### 3️⃣ API测试

- 编写API单元测试（`tests/api/`）
  - 测试单个 API 端点功能
  - 验证输入验证和错误处理
  - 测试边界条件和异常情况
- 编写业务流程集成测试（`tests/api/`）
  - 测试完整业务流程
  - 验证多个 API 的协作
  - 确保数据一致性
- 运行测试并确保通过：`npx jest tests/api`
- **✅ 里程碑：API测试通过后才能进入前端开发**
- **📝 文档更新：**
  - 创建或更新API测试用例文档
  - 记录测试覆盖的场景和边界条件
  - 记录已知限制和待测试项

#### 4️⃣ 前端开发

- 创建页面组件（`frontend/src/pages/`, `frontend/src/components/`）
- 实现UI交互逻辑
- 集成API服务（`frontend/src/services/api.ts`）
- 处理加载和错误状态
- 优化用户体验
- **📝 文档更新：**
  - 更新UI组件文档（如有复杂组件）
  - 记录用户交互流程
  - 记录特殊UI处理逻辑（如虚拟滚动、动态表单等）

#### 4.5️⃣ 重新构建和重启服务

- **重要步骤：** 前端代码修改后必须重新构建Docker镜像才能生效
- 重新构建前端：`docker-compose up --build -d frontend`
- 重新构建后端：`docker-compose up --build -d backend`
- 等待服务启动完成（约10-30秒）
- 验证服务正常运行：`curl http://localhost:3000` 或 `curl http://localhost:3001/health`

#### 5️⃣ 前端E2E测试

- 编写Playwright端到端测试用例（`tests/e2e/`）
- 测试关键用户流程
- 验证UI交互正确性
- 运行测试并确保通过
- **✅ 里程碑：E2E测试通过后功能开发完成**
- **📝 文档更新：**
  - 更新相应的测试追踪文档（参见 **tests/docs/README.md**）
  - 回归测试：更新 **regression-test-tracking.md**
  - 记录测试用例ID、测试步骤、预期结果
  - 记录测试状态（通过/失败）和备注信息

#### 6️⃣ 最终文档整理

- 确认所有阶段的文档都已更新完成
- 更新 **DEVELOPMENT_STATUS.md** 标记功能完成状态
- 更新项目进度文档（如需要）
- 记录已知问题和注意事项
- 整理技术决策和实现要点到 **report/** 文件夹（如有重要技术点）

### 开发状态追踪

所有功能的开发状态应记录在 **DEVELOPMENT_STATUS.md** 文件中。

每个功能包含以下状态：
- 🟦 **数据库** - 已完成/进行中/未开始
- 🟩 **后端API** - 已完成/进行中/未开始
- 🟨 **API测试** - 已通过/进行中/未开始
- 🟧 **前端** - 已完成/进行中/未开始
- 🟥 **E2E测试** - 已通过/进行中/未开始

### 示例：开发新功能的完整流程

假设要开发"题目评论"功能：

```bash
# 1. 数据库设计
database/migrations/add_question_comments.sql  # 创建迁移脚本
database/schema.sql  # 更新完整schema
# 📝 在迁移脚本中添加注释说明表结构和字段用途

# 2. 后端API开发
backend/src/models/QuestionComment.js  # 创建数据模型
backend/src/routes/questionComments.js  # 创建路由
# 📝 更新 API_Document.md，添加评论相关接口文档

# 2.5. 重新构建后端
docker-compose up --build -d backend  # 重新构建后端
docker-compose logs backend  # 检查日志

# 3. API测试
tests/api/questionComments.test.js  # 编写测试
npx jest tests/api/questionComments.test.js  # 运行测试
# 📝 记录测试用例和覆盖场景

# 4. 前端开发
frontend/src/components/QuestionComments.tsx  # 评论组件
frontend/src/pages/QuestionDetail.tsx  # 集成到详情页
# 📝 记录复杂UI逻辑（如需要）

# 4.5. 重新构建服务
docker-compose up --build -d frontend  # 重新构建前端

# 5. E2E测试
tests/e2e/question-comments.spec.ts  # 编写E2E测试
npm run test:e2e  # 运行测试
# 📝 更新 tests/docs/regression-test-tracking.md

# 6. 最终文档整理
# 📝 更新 DEVELOPMENT_STATUS.md，标记各阶段完成状态
# 📝 如有重要技术决策，整理到 report/ 文件夹
```

---

## 测试指南

### 测试级别

#### 1️⃣ 冒烟测试 (Smoke Tests)

**目标**: 快速验证系统核心功能是否正常工作

**执行时间**: 约 2-5 分钟

**覆盖范围**:
- ✅ 学生/教师/管理员登录
- ✅ 首页基本显示
- ✅ API健康检查
- ✅ 数据库连接

**执行命令**:
```bash
# E2E冒烟测试
npx playwright test tests/e2e/smoke/ -c tests/playwright.config.ts

# API冒烟测试
node tests/api/smoke-test.js
```

#### 2️⃣ 回归测试 (Regression Tests)

**目标**: 验证系统各功能模块，确保新代码不会破坏现有功能

**执行时间**: 约 10-20 分钟

**覆盖范围**:
- 认证模块 (R001-R007) - 7个测试
- 学生功能模块 (R101-R105) - 5个测试
- 管理员功能模块 (R201-R205) - 5个测试
- 题库创建模块 (R301-R310) - 10个测试
- 题库工作流模块 (R401-R410) - 10个测试

**执行命令**:
```bash
# 运行所有回归测试
npx playwright test tests/e2e/regression/ -c tests/playwright.config.ts

# 运行特定模块
npx playwright test tests/e2e/regression/question-bank-creation.spec.ts -c tests/playwright.config.ts
```

### 测试最佳实践 (重要！)

详细的测试编写最佳实践请参考 **tests/docs/测试脚本最佳实践.md**，以下是核心要点：

#### ✅ Ant Design 组件测试

```typescript
// ❌ 错误 - 使用 toBeVisible() 检查虚拟滚动表格
await expect(page.locator('.ant-table-tbody')).toBeVisible();

// ✅ 正确 - 使用 toBeAttached() 检查元素存在
await expect(page.locator('.ant-table-tbody tr[data-row-key]').first()).toBeAttached();

// ✅ 正确 - 使用 role-based selectors
await expect(page.getByRole('columnheader', { name: '题型' })).toBeAttached();
```

#### ⚠️ Ant Design 5 Select 虚拟滚动问题（常见测试问题）

**问题描述**:
Ant Design 5 的 Select 组件默认启用虚拟滚动（virtual scrolling）以优化性能。虚拟滚动会将下拉选项标记为 "hidden"，导致 Playwright 无法与这些选项交互，测试会超时失败。

**错误信息示例**:
```
Error: locator.click: Test timeout of 90000ms exceeded.
- waiting for getByRole('option', { name: '数学' })
- locator resolved to <div role="option">数学</div>
- element is not visible
- unexpected value "hidden"
```

**根本原因**:
- Ant Design 5 虚拟滚动只渲染视口内的选项
- 视口外的选项在 DOM 中标记为 "hidden"
- Playwright 的 `click()`, `isVisible()` 等方法无法操作隐藏元素

**解决方案 1: 禁用虚拟滚动（推荐用于测试环境）**:

```typescript
// 在 Select 组件中添加 virtual={false} 属性
<Select
  placeholder="请选择科目"
  virtual={false}  // 禁用虚拟滚动以支持 E2E 测试
>
  <Option value="语文">语文</Option>
  <Option value="数学">数学</Option>
  <Option value="英语">英语</Option>
</Select>
```

**注意事项**:
- ⚠️ 临时禁用虚拟滚动会影响性能优化
- 📝 必须在 **FRONTEND_PERFORMANCE_OPTIMIZATION.md** 中记录需要恢复虚拟滚动的组件
- 🚀 正式上线前应移除 `virtual={false}` 并更新测试策略

**解决方案 2: 使用 evaluate() 绕过可见性检查**:

```typescript
// 打开下拉框
await page.click('#subject');
await page.waitForTimeout(500);

// 使用 evaluate 直接操作 DOM
await page.getByRole('option', { name: '数学' }).evaluate((el: HTMLElement) => el.click());
```

**解决方案 3: 使用 force: true 选项（不推荐）**:

```typescript
// 强制点击（绕过可见性检查）
await page.getByRole('option', { name: '数学' }).click({ force: true });
```

**最佳实践建议**:
1. **开发测试阶段**: 使用 `virtual={false}` 确保测试稳定性
2. **记录文档**: 在 FRONTEND_PERFORMANCE_OPTIMIZATION.md 中记录所有禁用虚拟滚动的组件
3. **生产环境**: 移除 `virtual={false}`，恢复性能优化
4. **测试适配**: 更新 E2E 测试使用 `evaluate()` 或其他策略

**已知受影响的组件**:
- `frontend/src/pages/teacher/ActivityListPage.tsx` - 4 个筛选 Select
- `frontend/src/pages/teacher/ActivityFormPage.tsx` - 4 个表单 Select

详见 **FRONTEND_PERFORMANCE_OPTIMIZATION.md** 获取完整列表和恢复指南。

#### ✅ 虚拟滚动表格操作

```typescript
// 等待表格行加载（确保DOM中有数据）
const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
await expect(tableRows.first()).toBeAttached({ timeout: 5000 });

// 定位目标按钮
const editButtons = page.locator('button:has([aria-label="edit"])');
await editButtons.first().waitFor({ state: 'attached', timeout: 5000 });

// 使用 evaluate() 绕过可见性检查
await editButtons.first().evaluate((button: HTMLElement) => button.click());
```

#### ✅ Checkbox 测试

```typescript
// ✅ 正确方案 - 使用 evaluate 检查原生状态后点击 label
const checkbox = page.locator('label:has-text("练习题库") input[type="checkbox"]');
const isChecked = await checkbox.evaluate((el: HTMLInputElement) => el.checked);

if (!isChecked) {
  await page.locator('label:has-text("练习题库")').click();
  await page.waitForTimeout(300); // 等待动画完成
}
```

#### ✅ 测试数据唯一性（关键！）

```typescript
// ❌ 错误 - 使用固定内容，多次运行会匹配到历史数据
const questionCode = await createDraftQuestion(page, {
  content: '【R405】测试审核批准功能 - 2+2=4',  // ❌ 固定内容
});

// ✅ 正确 - 使用时间戳确保唯一性
const timestamp = Date.now();
const uniqueContent = `【R405-${timestamp}】测试审核批准功能 - 2+2=4`;

const questionCode = await createDraftQuestion(page, {
  content: uniqueContent,  // ✅ 每次运行都不同
});

// 后续查找也使用相同的时间戳
const targetRow = page.locator('.ant-table-tbody tr')
  .filter({ hasText: `【R405-${timestamp}】` })  // ✅ 只匹配本次创建的记录
  .first();
```

#### ✅ 页面导航策略

```typescript
// ❌ 错误 - 直接URL跳转，无法发现导航问题
await page.goto('/teacher/question-bank');

// ✅ 正确 - 使用点击导航，模拟真实用户操作
await loginAsTeacher(page, 'teacher01', 'password');
const menuLink = page.locator('a:has-text("题库管理")');
await expect(menuLink).toBeVisible();  // 验证菜单存在
await menuLink.click();  // 模拟真实用户操作
await page.waitForURL(/\/teacher\/question-bank/);  // 验证导航正确
```

### 测试文档

- **完整测试指南**: tests/docs/测试指南.md
- **测试脚本最佳实践**: tests/docs/测试脚本最佳实践.md（必读！）
- **E2E测试用例文档**: tests/docs/E2E_testcases/ (按功能模块拆分)
- **回归测试追踪**: tests/docs/regression-test-tracking.md
- **冒烟测试追踪**: tests/docs/smoke-test-tracking.md

### E2E测试用例文档结构

所有E2E测试用例文档统一存放在 `tests/docs/E2E_testcases/` 目录下，按功能模块拆分：

| 文档文件 | 功能模块 | 说明 |
|---------|---------|------|
| authentication-testcases.md | 认证功能 | 学生/教师/管理员登录、权限验证 |
| student-testcases.md | 学生功能 | 学生端页面访问、考试列表、成绩查询 |
| admin-testcases.md | 管理员功能 | 管理后台、用户管理、考试管理 |
| questionbank-creation-testcases.md | 题库创建 | 各类题型创建、表单验证 |
| questionbank-draft-testcases.md | 题库草稿箱 | 草稿管理、编辑、删除 |
| questionbank-review-testcases.md | 题库审核流程 | 提交审核、审核批准/拒绝 |
| activity-testcases.md | 活动管理 | 练习/测评活动创建、管理、筛选 |

### 测试用例编号规范

**编号格式**: **三位字母 + 三位数字** (如 AUT001, QBC101, ACT001)

- **三位字母**: 功能模块代码
- **三位数字**: 测试序号
  - **001-099**: 冒烟测试 (Smoke Tests)
  - **101-999**: 回归测试 (Regression Tests)

#### 功能模块代码映射

| 模块代码 | 功能模块 | 说明 | 示例 |
|---------|---------|------|------|
| **AUT** | Authentication | 认证功能 | AUT001 (冒烟), AUT101 (回归) |
| **STU** | Student | 学生功能 | STU001, STU101 |
| **ADM** | Admin | 管理员功能 | ADM001, ADM101 |
| **QBC** | Question Bank Creation | 题库创建 | QBC101-QBC110 |
| **DFT** | Draft | 题库草稿箱 | DFT101-DFT103 |
| **REV** | Review | 题库审核流程 | REV101-REV108 |
| **ACT** | Activity | 活动管理 | ACT001-ACT006, ACT101-ACT113 |
| **CRT** | Certificate | 证书管理 | CRT101-CRT103 |

#### 编号示例

**冒烟测试 (001-099)**:
```
AUT001 - 学生登录测试
AUT002 - 教师登录测试
AUT003 - 管理员登录测试
STU001 - 学生首页显示测试
ADM001 - 管理员首页显示测试
ACT001 - 教师访问活动管理页面
ACT002 - 教师创建练习活动
```

**回归测试 (101-999)**:
```
AUT101 - 学生正确凭证登录
AUT102 - 学生错误密码登录
QBC101 - 创建单选题-完整流程
QBC102 - 单选题必填字段验证
DFT101 - 草稿箱列表显示
REV101 - 提交草稿进行审核
ACT101 - 创建带完整信息的练习活动
```

#### 运行特定模块测试

```bash
# 按模块代码运行测试
npx playwright test --grep "AUT"     # 认证模块所有测试
npx playwright test --grep "QBC"     # 题库创建模块
npx playwright test --grep "ACT"     # 活动管理模块

# 运行特定测试用例
npx playwright test --grep "AUT001"  # 学生登录冒烟测试
npx playwright test --grep "QBC101"  # 创建单选题回归测试
```

---

## 文档规范

### 文档编写规则

1. **语言规范**:
   - 所有 Markdown 文档（除 README.md 外）应使用中文编写
   - 文件名和技术术语使用英文
   - 代码注释使用英文

2. **文档更新要求**:
   - 完成功能开发后必须更新 **documents/PROGRESS.md**
   - API 变更必须更新 **documents/API_Document.md**
   - 开发状态更新到 **documents/DEVELOPMENT_STATUS.md**
   - 重要技术决策记录到 **documents/DEVELOP_BEST_PRACTICES.md** 或 **report/** 目录

3. **参考文档**:
   - 开发进度: documents/PROGRESS.md
   - 整体规划: @MVP_Plan.md
   - 功能需求: documents/FEATURE_REQUIREMENTS.md
   - 开发状态: documents/DEVELOPMENT_STATUS.md
   - 开发最佳实践: documents/DEVELOP_BEST_PRACTICES.md
   - 前端性能优化: documents/FRONTEND_PERFORMANCE_OPTIMIZATION.md

### Git 提交规范

```bash
# 使用约定式提交格式
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建过程或辅助工具的变动
```

---

## 故障排除

### 常见问题

#### 1. Docker 容器无法启动

```bash
# 检查容器状态
docker-compose ps

# 查看日志
docker-compose logs backend
docker-compose logs frontend

# 重启服务
docker-compose restart

# 完全重建
docker-compose down
docker-compose up -d --build
```

#### 2. 端口占用

```bash
# Windows
netstat -ano | findstr :3001

# Mac/Linux
lsof -i :3001

# 修改 docker-compose.yml 中的端口映射
```

#### 3. 数据库连接失败

```bash
# 检查 PostgreSQL 容器
docker-compose ps postgres

# 测试数据库连接
docker exec -it guiyang_oj_postgres psql -U postgres -d guiyang_oj -c "SELECT 1"

# 查看数据库日志
docker-compose logs postgres
```

#### 4. 测试失败

```bash
# 使用 UI 模式调试
npx playwright test --ui -c tests/playwright.config.ts

# 查看失败截图和视频
ls tests/test-results/artifacts/

# 生成测试报告
npx playwright show-report tests/test-results/html
```

#### 5. 前端无法连接后端

```bash
# 检查后端健康
curl http://localhost:3001/health

# 检查 CORS 配置
# 确认 backend/.env 中 CORS_ORIGIN 设置正确

# 查看浏览器控制台错误
# 检查网络请求是否正确
```

#### 6. Playwright 测试结果路径错误（tests/tests/test-results）⚠️

**问题现象**:
测试运行后发现结果保存在 `tests/tests/test-results/` 而不是正确的 `tests/test-results/`

**根本原因**:
配置文件 `tests/playwright.config.ts` 中的路径配置相对于**配置文件所在目录**解析，而不是执行目录。

```typescript
// ❌ 错误配置（导致双重 tests/ 目录）
// 配置文件在 tests/ 目录下，路径又写了 ./tests/
export default defineConfig({
  testDir: './e2e',
  reporter: [
    ['html', { outputFolder: './tests/test-results/html' }],  // ❌ 错误
  ],
  outputDir: './tests/test-results/artifacts',  // ❌ 错误
});

// ✅ 正确配置
// 路径相对于配置文件所在的 tests/ 目录
export default defineConfig({
  testDir: './e2e',
  reporter: [
    ['html', { outputFolder: './test-results/html' }],  // ✅ 正确
  ],
  outputDir: './test-results/artifacts',  // ✅ 正确
});
```

**解析逻辑**:
- 配置文件位置: `tests/playwright.config.ts`
- 错误配置: `outputDir: './tests/test-results/artifacts'`
  - 相对于配置文件: `tests/` + `tests/test-results/artifacts`
  - 结果: `tests/tests/test-results/artifacts` ❌
- 正确配置: `outputDir: './test-results/artifacts'`
  - 相对于配置文件: `tests/` + `test-results/artifacts`
  - 结果: `tests/test-results/artifacts` ✅

**修复步骤**:
```bash
# 1. 修正配置文件路径（移除重复的 tests/）
# 编辑 tests/playwright.config.ts
# 将所有 './tests/test-results/*' 改为 './test-results/*'

# 2. 清理错误的目录
rm -rf tests/tests

# 3. 验证配置
npx playwright test tests/e2e/smoke/ -c tests/playwright.config.ts

# 4. 确认结果保存在正确位置
ls tests/test-results/
```

**关键要点**:
- ⚠️ **所有相对路径都是相对于配置文件所在目录，不是执行目录！**
- ✅ 配置文件在 `tests/` 目录，路径应该从 `./e2e`, `./test-results` 开始
- ❌ 不要在路径中重复写 `./tests/`

#### 7. E2E测试无法连接到服务 - 未启动所有容器 ⚠️⚠️⚠️

**问题现象**:
- Playwright E2E测试无法连接到 `http://localhost:80`
- 测试报错: `net::ERR_CONNECTION_REFUSED` 或超时
- API直接测试（curl/Postman）正常工作

**常见误判**:
- ❌ 误以为是代理问题（因为curl显示通过proxy连接）
- ❌ 误以为是Playwright配置问题（修改baseURL等）
- ❌ 误以为是前端构建问题

**根本原因**:
Docker Compose定义了多个服务，但**并非所有服务都自动启动**！本项目定义了6个服务：
1. ✅ postgres - 数据库（通常会自动启动）
2. ✅ redis - 缓存（通常会自动启动）
3. ✅ backend - API服务（通常会自动启动）
4. ✅ frontend - React应用（通常会自动启动）
5. ⚠️ **nginx** - 反向代理（80端口）- **可能未启动！**
6. ⚠️ **pgadmin** - 数据库管理工具 - **可能未启动！**

**排查步骤**:

```bash
# 1. 首先检查所有容器状态（不要假设都在运行！）
docker-compose ps

# 2. 查看定义了哪些服务
docker-compose config --services

# 3. 如果发现缺少容器，启动所有服务
docker-compose up -d

# 4. 验证nginx（端口80）是否可访问
curl http://localhost:80

# 5. 验证所有端口是否正常
netstat -an | findstr "80.*LISTEN"    # Windows
netstat -an | grep "80.*LISTEN"       # Linux/Mac
```

**正确的测试前准备流程**:

```bash
# Step 1: 确保所有服务都在运行（关键！）
docker-compose up -d

# Step 2: 验证服务状态
docker-compose ps
# 应该看到6个容器都是 "Up" 状态

# Step 3: 验证端口访问
curl http://localhost:80           # 前端（通过nginx）
curl http://localhost:3000         # 前端（直接）
curl http://localhost:3001/health  # 后端API

# Step 4: 运行E2E测试
npx playwright test -c tests/playwright.config.ts
```

**经验教训**:
1. ⚠️ **永远不要假设所有定义的服务都在运行！**
2. ✅ 测试前第一步：`docker-compose ps` 检查容器状态
3. ✅ 如果缺少容器：`docker-compose up -d` 启动所有服务
4. ✅ E2E测试使用 `http://localhost:80`（nginx），而不是 `http://localhost:3000`（frontend直连）
5. ❌ 不要因为curl有代理就误判为代理问题 - 先检查容器！

**为什么容器可能未启动**:
- 之前运行了 `docker-compose up -d backend frontend` 只启动了部分服务
- 运行了 `docker-compose down` 停止后，后续只启动了部分依赖服务
- 手动 `docker stop` 停止了某些容器
- 系统重启后只有部分服务自动启动

**最佳实践**:
- 开发开始时：`docker-compose up -d` 启动所有服务
- 代码修改后：`docker-compose up --build -d [service]` 重建特定服务
- 测试前验证：`docker-compose ps | wc -l` 确认服务数量正确

### 调试技巧

```bash
# 1. UI模式（最推荐）
npx playwright test --ui -c tests/playwright.config.ts

# 2. 有头模式（查看浏览器）
npx playwright test --headed tests/e2e/smoke/ -c tests/playwright.config.ts

# 3. 调试模式（单步执行）
npx playwright test --debug tests/e2e/regression/auth.spec.ts

# 4. 生成代码（录制操作）
npx playwright codegen http://localhost:3000

# 5. 查看失败截图和视频
# 自动保存在 tests/test-results/artifacts/ 目录
```

---

### 常见开发陷阱与解决方案

本节总结实际开发中遇到的常见问题和最佳解决方案，帮助避免重复踩坑。

#### 问题1: Ant Design 5 按钮文本空格渲染问题 ⚠️⚠️⚠️

**问题现象**:
- Playwright测试无法找到按钮，如 `button:has-text("发布")`
- 实际DOM渲染为: `<button>发 布</button>` （文字中间有空格）
- 影响按钮: 发布、删除、保存、创建、编辑等所有中文按钮

**根本原因**:
- Ant Design 5 在某些情况下会在按钮文字中间插入空格
- 可能与Button组件的样式处理或国际化有关
- 具体表现为2-4个汉字的按钮经常出现此问题

**解决方案**:
```typescript
// ❌ 错误 - 不会匹配带空格的文本
const publishButton = page.locator('button:has-text("发布")');

// ✅ 正确 - 使用正则表达式匹配可能的空格
const publishButton = page.locator('button').filter({ hasText: /发\s*布/ });
const deleteButton = page.locator('button').filter({ hasText: /删\s*除/ });
const saveButton = page.locator('button').filter({ hasText: /保\s*存/ });
const createButton = page.locator('button').filter({ hasText: /创\s*建/ });
```

**最佳实践**:
- 所有涉及中文按钮文本的测试，都应该使用正则表达式 `\s*` 来容错空格
- 考虑创建辅助函数统一处理按钮选择器

**影响范围**:
- frontend/src/pages/teacher/ActivityListPage.tsx:318 - "创建活动" 按钮
- frontend/src/pages/admin/AssessmentManagementPage.tsx:258 - "创建测评" 按钮
- 所有使用 Ant Design Button 组件的地方

**文件位置**:
- 问题发现: tests/e2e/regression/activity-management.spec.ts
- 修复示例: tests/e2e/regression/activity-management.spec.ts:374-448

---

#### 问题2: 导航菜单与页面标题不一致导致测试失败 ⚠️

**问题现象**:
- 测试期望菜单项为"练习管理"/"测评管理"
- 实际前端显示为"活动管理"
- 测试无法找到菜单项: `getByRole('menuitem', { name: /练习管理/ })`

**根本原因**:
- 前端设计变更但测试未同步更新
- 权限分离需求：教师只管理练习，管理员只管理测评
- MainLayout.tsx 中菜单标签使用了通用名称"活动管理"

**解决方案**:
```typescript
// frontend/src/components/layout/MainLayout.tsx

// ✅ 教师菜单 - 明确为"练习管理"
const teacherMenuItems: MenuProps['items'] = [
  {
    key: '/teacher/activities',
    icon: <ProjectOutlined />,
    label: '练习管理',  // ← 改为练习管理
  },
];

// ✅ 管理员菜单 - 明确为"测评管理"
const adminMenuItems: MenuProps['items'] = [
  {
    key: '/admin/assessments',
    icon: <ProjectOutlined />,
    label: '测评管理',  // ← 改为测评管理
  },
];
```

**页面标题也需要同步修改**:
```typescript
// frontend/src/pages/teacher/ActivityListPage.tsx
<Card title="练习管理" ...>  // ← 改为练习管理

// frontend/src/pages/admin/AssessmentManagementPage.tsx
<Card title="测评管理" ...>  // ← 改为测评管理
```

**最佳实践**:
- 前端UI文案变更时，务必同步更新E2E测试
- 导航菜单名称应该与页面标题保持一致
- 权限分离设计中，不同角色的菜单应该有明确的功能指向

**影响测试**:
- ACT101, ACT102, ACT104, ACT120, ACT121, ACT123, ACT124, ACT126

**修复记录**: 2025-10-25

---

#### 问题3: 测试数据依赖导致的不可重复性 ⚠️

**问题现象**:
- 第一次运行测试通过，第二次运行失败
- 测试找到多个匹配的记录，定位不准确
- 测试相互影响，顺序敏感

**根本原因**:
- 测试依赖数据库中现有的记录
- 多次运行测试产生重复数据
- 测试用例之间共享数据，缺乏隔离

**错误示例**:
```typescript
// ❌ 错误 - 使用固定内容，多次运行会找到多条记录
test('查看活动详情', async ({ page }) => {
  await page.goto('/teacher/activities');

  // 假设数据库中已存在标题为"数学练习"的活动
  const targetRow = page.locator('.ant-table-tbody tr')
    .filter({ hasText: '数学练习' })  // ❌ 可能匹配多条
    .first();
});
```

**正确解决方案**:
```typescript
// ✅ 正确 - 测试自己创建唯一数据
test('ACT108 - 查看活动详情', async ({ page }) => {
  // 1. 使用时间戳确保唯一性
  const timestamp = Date.now();
  const uniqueTitle = `ACT108-查看详情-${timestamp}`;

  // 2. 创建测试数据
  await page.goto('/teacher/activities/create/practice');
  await fillActivityForm(page, {
    title: uniqueTitle,
    description: 'ACT108测试活动',
    subject: '语文',
    grade: '二年级',
    // ...
  });
  await submitButton.click();

  // 3. 使用唯一标识定位
  const targetRow = page.locator('.ant-table-tbody tr')
    .filter({ hasText: uniqueTitle })  // ✅ 只会匹配本次创建的记录
    .first();

  // 4. 执行测试操作
  await viewButton.click();
  // ...
});
```

**最佳实践**:
- **每个测试都应该自己创建所需的数据**
- 使用 `Date.now()` 或 `uuid` 生成唯一标识
- 测试数据命名包含测试用例ID: `[ACT108-${timestamp}]`
- 清理测试数据（可选，但自包含测试可以不清理）

**参考文档**:
- tests/docs/测试脚本最佳实践.md - 第9章：测试数据隔离与唯一性

**修复示例**:
- tests/e2e/regression/activity-management.spec.ts:213 (ACT108)
- tests/e2e/regression/activity-management.spec.ts:283 (ACT109)
- tests/e2e/regression/activity-management.spec.ts:374 (ACT110)

---

#### 问题4: Docker容器未重建导致代码变更不生效 ⚠️⚠️⚠️

**问题现象**:
- 修改了前端代码，但测试仍然使用旧版本
- 浏览器访问仍然显示旧的界面
- 后端API修改后返回旧的响应

**根本原因**:
- **Docker容器在启动时构建镜像，代码修改不会自动生效**
- 修改代码后未执行 `docker-compose up --build`
- 开发者误以为热重载会自动更新容器

**症状识别**:
```bash
# 检查容器创建时间
docker-compose ps

# 如果"CREATED"时间早于代码修改时间，说明需要重建
NAME                  IMAGE          CREATED         STATUS
guiyang_oj_frontend   git-frontend   2 hours ago     Up 2 hours  # ← 注意这个时间
```

**解决方案**:
```bash
# ✅ 方案1: 重建特定服务（推荐）
docker-compose up --build -d frontend   # 仅重建前端
docker-compose up --build -d backend    # 仅重建后端

# ✅ 方案2: 重建所有服务
docker-compose up --build -d

# ❌ 错误做法 - 只重启不重建，代码变更不生效
docker-compose restart frontend  # ❌ 不会重新构建镜像
```

**重建后的验证**:
```bash
# 1. 检查容器启动时间
docker-compose ps

# 2. 验证服务可访问
curl http://localhost:80           # 前端
curl http://localhost:3001/health  # 后端

# 3. 查看构建日志确认无错误
docker-compose logs frontend | tail -50
docker-compose logs backend | tail -50
```

**开发流程最佳实践**:

```
修改代码 → 重新构建Docker → 等待启动完成 → 运行测试

┌─────────────────┐
│  1. 修改代码    │
│  ├─ 前端文件    │
│  ├─ 后端文件    │
│  └─ 配置文件    │
└────────┬────────┘
         ↓
┌─────────────────┐
│  2. 重建容器    │ ← ⚠️ 关键步骤！不能跳过！
│  docker-compose │
│  up --build -d  │
└────────┬────────┘
         ↓
┌─────────────────┐
│  3. 等待启动    │
│  约10-30秒      │
│  检查容器状态   │
└────────┬────────┘
         ↓
┌─────────────────┐
│  4. 验证服务    │
│  curl测试端口   │
│  检查日志       │
└────────┬────────┘
         ↓
┌─────────────────┐
│  5. 运行测试    │
│  npx playwright │
│  test           │
└─────────────────┘
```

**常见错误场景**:
1. ❌ 修改前端 → 直接运行测试 → 失败（容器未重建）
2. ❌ 修改后端 → `docker-compose restart backend` → 失败（restart不重建）
3. ❌ 重建完成 → 立即运行测试 → 失败（服务未完全启动）
4. ✅ 修改代码 → `docker-compose up --build -d` → 等待30秒 → 验证 → 测试

**重建时间参考**:
- Frontend: 约30-60秒（包含npm build）
- Backend: 约10-20秒
- 完全重建: 约1-2分钟

**影响范围**: 所有Docker化的服务

**参考章节**: 开发实践流程 - 2.5️⃣ 和 4.5️⃣

---

#### 问题5: Ant Design Select虚拟滚动导致测试元素不可见

**问题现象**:
- `page.getByRole('option', { name: '数学' }).click()` 超时
- 错误信息: `element is not visible - unexpected value "hidden"`
- 下拉选项在DOM中存在但标记为hidden

**根本原因**:
- Ant Design 5 的 Select 组件默认启用虚拟滚动优化性能
- 虚拟滚动只渲染视口内的选项，视口外标记为 "hidden"
- Playwright 的 `click()` 无法操作hidden元素

**临时解决方案（测试环境）**:
```typescript
// 在Select组件中禁用虚拟滚动
<Select
  placeholder="请选择科目"
  virtual={false}  // ← 禁用虚拟滚动以支持E2E测试
>
  <Option value="语文">语文</Option>
  <Option value="数学">数学</Option>
</Select>
```

**⚠️ 重要提醒**:
- 禁用虚拟滚动会影响性能，仅用于测试环境
- 必须在 `FRONTEND_PERFORMANCE_OPTIMIZATION.md` 中记录
- 生产环境上线前应恢复虚拟滚动

**测试代码解决方案（不修改前端）**:
```typescript
// 方案1: 使用 evaluate() 绕过可见性检查
await page.click('#subject');
await page.waitForTimeout(500);
await page.getByRole('option', { name: '数学' }).evaluate((el: HTMLElement) => el.click());

// 方案2: 使用 force 选项（不推荐）
await page.getByRole('option', { name: '数学' }).click({ force: true });
```

**已知受影响组件**:
- frontend/src/pages/teacher/ActivityListPage.tsx - 4个筛选Select
- frontend/src/pages/teacher/ActivityFormPage.tsx - 4个表单Select
- frontend/src/pages/admin/AssessmentManagementPage.tsx - 3个筛选Select

**详细说明**: CLAUDE.md - 测试指南 - Ant Design 5 Select虚拟滚动问题

---

#### 问题6: 测试命名规范不统一影响维护性

**问题现象**:
- 测试ID混乱: R401, R-A04, R-A06, ACT001
- 难以快速定位测试用例
- 测试文档与代码不一致

**根本原因**:
- 早期测试命名没有统一规范
- 多人协作时命名风格不同
- 未及时重构旧测试代码

**解决方案 - 统一命名规范**:

**格式**: `[三位字母][三位数字]`
- 三位字母: 功能模块代码（如AUT, STU, QBC, ACT）
- 三位数字: 测试序号
  - 001-099: 冒烟测试
  - 101-999: 回归测试

**示例转换**:
```typescript
// ❌ 旧命名
test('R401 - 创建练习活动', ...)
test('R-A04 - 发布活动', ...)
test('R-A06 - 按类型筛选', ...)

// ✅ 新命名
test('ACT107 - 创建带完整信息的练习活动', ...)
test('ACT110 - 发布活动', ...)
test('ACT112 - 按类型筛选活动', ...)
```

**重构步骤**:
1. 确定功能模块代码（参考CLAUDE.md - 测试用例编号规范）
2. 按测试类型分配序号段（冒烟/回归）
3. 批量重命名测试用例
4. 更新测试追踪文档（regression-test-tracking.md）
5. 运行测试验证重命名正确

**维护建议**:
- 新测试必须使用标准命名格式
- Code Review检查测试命名规范
- 每季度审查并重构旧测试命名

**参考**: CLAUDE.md - 测试用例编号规范

**重构示例**: tests/e2e/regression/activity-management.spec.ts (2025-10-25)

---

#### 问题7: 页面导航测试策略不当

**问题现象**:
- 测试直接使用 `page.goto('/teacher/activities')` 跳转
- 无法发现导航菜单配置错误
- 真实用户流程未被测试覆盖

**根本原因**:
- 为了测试便利性直接URL跳转
- 忽略了导航菜单是用户主要入口
- 测试未模拟真实用户操作

**错误示例**:
```typescript
// ❌ 错误 - 直接URL跳转，无法发现菜单问题
test('教师访问活动管理', async ({ page }) => {
  await page.goto('/teacher/activities');  // ❌ 绕过了导航菜单

  // 即使菜单配置错误，测试也能通过
});
```

**正确示例**:
```typescript
// ✅ 正确 - 通过点击导航菜单进入页面
test('ACT101 - 教师访问活动管理页面', async ({ page }) => {
  await loginAsTeacher(page);

  // 验证菜单存在
  const practiceMenu = page.getByRole('menuitem', { name: /练习管理/ });
  await expect(practiceMenu).toBeVisible();

  // 模拟真实用户操作 - 点击菜单
  await practiceMenu.click();

  // 验证导航正确
  await page.waitForURL(/\/teacher\/activities/);
  await page.waitForLoadState('networkidle');

  // 验证页面内容
  await expect(page.locator('.ant-card-head-title:has-text("练习管理")')).toBeAttached();
});
```

**测试策略对比**:

| 策略 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| 直接URL跳转 | 快速，简单 | 无法测试导航，不符合真实用户流程 | 单元测试、快速验证 |
| 点击导航菜单 | 测试完整流程，发现UI问题 | 稍慢，依赖菜单配置 | E2E测试、冒烟测试 |
| 混合策略 | 平衡速度和覆盖率 | 需要明确场景划分 | 回归测试 |

**最佳实践**:
- **冒烟测试和E2E测试**: 必须通过点击导航
- **回归测试**: 首次使用点击导航，后续页面可直接跳转
- **单元/API测试**: 可以直接URL跳转

**参考文档**: tests/docs/测试脚本最佳实践.md - 第10章：页面导航测试策略

---

#### 问题8: 虚拟滚动表格中按钮操作失败

**问题现象**:
- `editButton.click()` 抛出错误: "element is not visible"
- 表格行存在于DOM但按钮无法点击
- 使用 `toBeVisible()` 断言失败

**根本原因**:
- Ant Design Table 使用虚拟滚动优化长列表性能
- 只有视口内的行真正渲染，视口外的行标记为hidden
- Playwright 默认不允许点击不可见元素

**解决方案**:
```typescript
// ✅ 方案1: 使用 toBeAttached() 代替 toBeVisible()
const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
await expect(tableRows.first()).toBeAttached({ timeout: 5000 });  // ✅ 正确

// ✅ 方案2: 使用 evaluate() 绕过可见性检查
const editButton = targetRow.locator('button:has([aria-label="edit"])');
await editButton.evaluate((button: HTMLElement) => button.click());  // ✅ 正确

// ❌ 错误: 直接点击虚拟滚动外的元素
await expect(tableRows.first()).toBeVisible();  // ❌ 可能失败
await editButton.click();  // ❌ 可能超时
```

**完整示例**:
```typescript
test('编辑草稿题目', async ({ page }) => {
  await page.goto('/teacher/question-bank');
  await page.waitForLoadState('networkidle');

  // 1. 等待表格加载（使用 toBeAttached）
  const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
  await expect(tableRows.first()).toBeAttached({ timeout: 5000 });

  // 2. 定位目标行
  const questionCode = 'PHYS2510200012';
  const targetRow = page.locator('.ant-table-tbody tr')
    .filter({ hasText: questionCode })
    .first();

  // 3. 等待按钮出现在DOM中（不要求可见）
  const editButton = targetRow.locator('button:has([aria-label="edit"])');
  await editButton.waitFor({ state: 'attached', timeout: 5000 });

  // 4. 使用evaluate绕过可见性检查
  await editButton.evaluate((button: HTMLElement) => button.click());

  // 5. 验证导航
  await page.waitForURL(/\/edit/);
});
```

**最佳实践**:
- 虚拟滚动表格: 使用 `toBeAttached()` 检查元素存在
- 操作按钮: 使用 `evaluate()` 执行点击
- 避免使用: `toBeVisible()`, `isVisible()`

**参考**: CLAUDE.md - 测试最佳实践 - 虚拟滚动表格操作

---

#### 小结：开发中的关键检查清单 ✅

在提交代码或运行测试前，请检查以下事项：

**前端开发**:
- [ ] 中文按钮文本是否会产生空格？（Ant Design）
- [ ] 导航菜单标签与页面标题是否一致？
- [ ] Select组件是否需要禁用虚拟滚动？（测试环境）
- [ ] 修改后是否重新构建Docker镜像？

**测试开发**:
- [ ] 测试是否自己创建数据？（使用时间戳）
- [ ] 选择器是否使用正则表达式容错空格？
- [ ] 测试命名是否符合ACT规范？
- [ ] 是否通过点击导航而非直接URL跳转？
- [ ] 虚拟滚动表格是否使用 `toBeAttached()`？

**Docker部署**:
- [ ] 代码修改后是否执行 `docker-compose up --build -d`？
- [ ] 是否等待服务完全启动（30秒）？
- [ ] 是否验证服务可访问（curl测试）？

**文档维护**:
- [ ] 是否更新测试追踪文档？
- [ ] 是否记录重要技术决策？
- [ ] 是否更新DEVELOPMENT_STATUS.md？

---

## 重要提醒

### 开发时必须注意

1. **Docker 重建**: 代码修改后必须重新构建 Docker 镜像
   ```bash
   docker-compose up --build -d backend
   docker-compose up --build -d frontend
   ```

2. **测试数据隔离**: E2E 测试必须使用时间戳或 UUID 确保数据唯一性

3. **文档同步**: 代码变更后必须同步更新相关文档

4. **测试优先**: API 测试通过后再开发前端，E2E 测试通过后才算功能完成

5. **参考最佳实践**: 编写测试前必读 **tests/docs/测试脚本最佳实践.md**

### 关键文档位置

- **开发实践**: CLAUDE.md (本文件)
- **测试指南**: tests/docs/测试指南.md
- **测试最佳实践**: tests/docs/测试脚本最佳实践.md（必读！）
- **API文档**: documents/API_Document.md
- **功能需求**: documents/FEATURE_REQUIREMENTS.md
- **开发状态**: documents/DEVELOPMENT_STATUS.md
- **开发最佳实践**: documents/DEVELOP_BEST_PRACTICES.md
- **前端性能优化**: documents/FRONTEND_PERFORMANCE_OPTIMIZATION.md
- **进度追踪**: documents/PROGRESS.md

---

**📅 文档最后更新**: 2025-10-25
**🔗 项目仓库**: 贵阳市小学生测评服务平台
**📧 维护**: 开发团队
