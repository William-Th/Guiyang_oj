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
6. [Bug修复追踪流程](#bug修复追踪流程)
7. [故障排除快速参考](#故障排除快速参考)

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
- **🔴 关键要求（必须遵守）：**
  - **同步 schema.sql**：每次创建新的迁移文件后，必须同步更新 `database/schema.sql`
    - 将迁移文件中的表结构变更手动添加到 schema.sql 中
    - 确保 schema.sql 反映最新的完整数据库结构
    - 这样可以确保在其他服务器上部署时，直接导入 schema.sql 即可获得完整数据库
  - **同步 seed.sql**：开发测试过程中创建的所有测试数据，必须同步到 `database/seed.sql`
    - 如果创建了新的演示数据、测试账号、示例记录，必须添加到 seed.sql
    - 可以使用 `\i database/migrations/xxx.sql` 引用迁移文件中的数据插入语句
    - 确保其他服务器上也能使用相同的测试数据进行测试
- **📝 文档更新：**
  - 更新数据库表结构文档
  - 在迁移脚本中添加详细注释说明变更原因
  - 如有字段修改，同时更新 `schema.sql` 和保留迁移记录

**⚠️ 为什么这很重要？**
- `schema.sql` 是数据库的"单一真相来源"，反映当前完整的数据库结构
- 其他团队成员在新服务器上部署时，只需导入 schema.sql 即可创建完整数据库
- `seed.sql` 提供一致的测试数据环境，确保所有开发者使用相同的测试数据
- 避免因数据库结构不一致导致的部署失败和测试问题

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
- **⚠️ 验证点覆盖要求（重要！）**
  - 测试不仅要覆盖功能，更要覆盖具体验证点
  - 必须验证响应中的关键字段存在性和正确性
  - 必须验证数据过滤逻辑（权限控制、业务规则）
  - 必须验证数据持久化（写入后读取验证）
  - 参考：**docs/BUG_FIX_TRACKING_GUIDE.md - 验证点覆盖要求**
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
- **⚠️ 验证点覆盖要求（重要！）**
  - 测试不仅要覆盖功能，更要覆盖具体验证点
  - 必须验证UI元素的存在性或不存在性（正向/负向断言）
  - 必须验证数据显示的正确性（字段值、格式、排序）
  - 必须验证权限控制的有效性（菜单显示、按钮禁用）
  - 必须验证用户操作的结果（导航、数据变更、错误提示）
  - 参考：**docs/BUG_FIX_TRACKING_GUIDE.md - 验证点覆盖要求**
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
- 认证模块 (AUT001-AUT007) - 7个测试
- 学生功能模块 (STU101-STU105) - 5个测试
- 管理员功能模块 (ADM101-ADM105) - 5个测试
- 题库创建模块 (QBC101-QBC110) - 10个测试
- 题库工作流模块 (REV101-REV110) - 10个测试

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

#### ✅ Ant Design 5 Select 虚拟滚动问题

**解决方案 1: 禁用虚拟滚动（测试环境）**:
```typescript
<Select virtual={false}>  // 禁用虚拟滚动以支持 E2E 测试
  <Option value="数学">数学</Option>
</Select>
```

**解决方案 2: 使用 evaluate() 绕过可见性检查**:
```typescript
await page.getByRole('option', { name: '数学' }).evaluate((el: HTMLElement) => el.click());
```

⚠️ **注意**: 禁用虚拟滚动需在 **FRONTEND_PERFORMANCE_OPTIMIZATION.md** 中记录，上线前恢复。

#### ✅ 虚拟滚动表格操作

```typescript
// 等待表格行加载（确保DOM中有数据）
const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
await expect(tableRows.first()).toBeAttached({ timeout: 5000 });

// 使用 evaluate() 绕过可见性检查
await editButtons.first().evaluate((button: HTMLElement) => button.click());
```

#### ✅ Checkbox 测试

```typescript
const checkbox = page.locator('label:has-text("练习题库") input[type="checkbox"]');
const isChecked = await checkbox.evaluate((el: HTMLInputElement) => el.checked);

if (!isChecked) {
  await page.locator('label:has-text("练习题库")').click();
  await page.waitForTimeout(300);
}
```

#### ✅ 测试数据唯一性（关键！）

```typescript
// ✅ 正确 - 使用时间戳确保唯一性
const timestamp = Date.now();
const uniqueContent = `【R405-${timestamp}】测试审核批准功能`;

const questionCode = await createDraftQuestion(page, {
  content: uniqueContent,
});

// 后续查找使用相同的时间戳
const targetRow = page.locator('.ant-table-tbody tr')
  .filter({ hasText: `【R405-${timestamp}】` })
  .first();
```

#### ✅ 页面导航策略

```typescript
// ✅ 正确 - 使用点击导航，模拟真实用户操作
await loginAsTeacher(page, 'teacher01', 'password');
const menuLink = page.locator('a:has-text("题库管理")');
await expect(menuLink).toBeVisible();
await menuLink.click();
await page.waitForURL(/\/teacher\/question-bank/);
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
| **PRM** | Permission Management | 分层权限管理 | PRM101-PRM102 |
| **QBC** | Question Bank Creation | 题库创建 | QBC101-QBC110 |
| **DFT** | Draft | 题库草稿箱 | DFT101-DFT103 |
| **REV** | Review | 题库审核流程 | REV101-REV108 |
| **ACT** | Activity | 活动管理 | ACT001-ACT006, ACT101-ACT113 |
| **CRT** | Certificate | 证书管理 | CRT101-CRT103 |

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

## Bug修复追踪流程

### 概述

为了更好地追踪和管理Bug修复过程，项目采用CSV格式的追踪文档来记录所有发现和修复的问题。

**追踪文档位置**: `docs/BUG_FIX_TRACKING.csv`

### 追踪字段说明

| 字段名 | 说明 | 示例 |
|--------|------|------|
| 序号 | Bug编号，递增 | 1, 2, 3... |
| 日期 | 问题发现日期 | 2025-11-07 |
| 问题描述 | 用户提出的问题原始描述 | 用户管理中存在身份证字段 |
| 功能分类 | 问题所属功能模块 | 用户管理、权限管理、个人信息等 |
| 解决状态 | 当前状态 | 未开始、进行中、待复核、已解决 |
| 出现位置 | 问题出现的代码层 | 前端、后端、前后端 |
| 原因分析 | 问题产生的根本原因 | 需求理解问题、工作失误、描述不清等 |
| 相关文件 | 涉及的源代码文件 | frontend/src/pages/admin/UserManagement.tsx |
| 修复说明 | 简要说明修复方式 | 移除User接口中的id_card字段... |
| API测试覆盖 | 是否有API测试覆盖该修复 | 是 - tests/api/xxx.test.js、否、待补充 |
| E2E测试覆盖 | 是否有E2E测试覆盖该修复 | 是 - tests/e2e/regression/xxx.spec.ts、否、待补充 |
| 复核状态 | 是否通过复核 | 空（未复核）、通过、未通过 |
| 复核人 | 复核负责人 | 通常为项目负责人 |
| 复核日期 | 复核完成日期 | 2025-11-07 |

### Bug修复工作流

```
┌──────────────┐
│ 1. 问题发现  │ - 用户报告或测试发现
└──────┬───────┘
       ↓
┌──────────────┐
│ 2. 问题记录  │ - Claude在CSV中记录问题
│              │ - 填写：序号、日期、问题描述、功能分类
│              │ - 状态标记为"未开始"
└──────┬───────┘
       ↓
┌──────────────┐
│ 3. 问题分析  │ - 分析出现位置（前端/后端）
│              │ - 分析原因（理解问题/工作失误/描述问题）
│              │ - 定位相关文件
│              │ - 状态更新为"进行中"
└──────┬───────┘
       ↓
┌──────────────┐
│ 4. 实施修复  │ - 修改相关代码
│              │ - 填写修复说明
│              │ - 重新构建Docker服务
│              │ - 状态更新为"待复核"
└──────┬───────┘
       ↓
┌──────────────┐
│ 5. 用户复核  │ - 用户手工测试验证
│              │ - 确认问题是否真正解决
│              │ ┌─────────────────┐
│              │ │ 复核通过        │
│              │ │ - 填写复核状态  │
│              │ │ - 填写复核人    │
│              │ │ - 填写复核日期  │
│              │ │ - 状态→"已解决" │
│              │ └─────────────────┘
│              │ ┌─────────────────┐
│              │ │ 复核未通过      │
│              │ │ - 添加复核备注  │
│              │ │ - 状态→"进行中" │
│              │ │ - 返回步骤3重新分析 │
│              │ └─────────────────┘
└──────────────┘
```

### 操作规范

#### Claude端操作

1. **记录新问题**
   - 在CSV文件末尾添加新行，填写基本信息
   - 状态标记为"未开始"

2. **更新修复进度**
   - 开始修复：解决状态 → "进行中"
   - 完成修复：解决状态 → "待复核"，填写修复说明
   - **重要**: 只有用户复核通过后，才能标记为"已解决"

3. **禁止操作**
   - ❌ 不要自行将状态标记为"已解决"
   - ❌ 不要修改已复核通过的记录（除非有新的修复）

#### 用户端操作

1. **复核验证**
   - 根据"修复说明"进行手工测试
   - 验证问题是否真正解决

2. **更新复核结果**
   - 复核通过：复核状态 → "通过"，解决状态 → "已解决"
   - 复核未通过：复核状态 → "未通过"，解决状态 → "进行中"

### 原因分类说明

1. **需求理解问题** - Claude对需求的理解偏差、业务逻辑理解错误
2. **工作失误** - 代码逻辑错误、遗漏关键代码、测试不充分
3. **描述不清** - 用户需求描述模糊、缺少关键信息
4. **其他** - 第三方库问题、环境配置问题

### 测试覆盖策略

Bug修复后必须根据以下策略补充测试：

#### 策略1：数据点移除类Bug
- **适用场景**: 从UI/API中移除某个字段或数据点
- **测试要求**:
  - ❌ 不需要E2E测试（节省时间）
  - ✅ 可选API测试（验证响应中无该字段）
  - ✅ 依赖手动复核

#### 策略2：前端功能Bug
- **适用场景**: UI交互逻辑、数据显示、权限控制问题
- **测试要求**:
  - ✅ **必须E2E测试**（手动复核通过后创建）
  - ✅ **必须验证点覆盖**（验证具体修复点，而非仅功能）
  - ✅ 测试数据使用时间戳确保唯一性

#### 策略3：后端逻辑Bug
- **适用场景**: API响应错误、业务逻辑错误、数据库操作问题
- **测试要求**:
  - ✅ **必须API测试**
  - ✅ **必须验证点覆盖**（验证具体字段、数据结构、过滤逻辑）
  - ✅ 可选E2E测试（如果影响前端显示）

### 验证点覆盖要求

**功能覆盖 vs 验证点覆盖**：
- **功能覆盖**: 测试涉及到相关功能模块（例如：测试了"权限管理"）
- **验证点覆盖**: 测试具体验证了Bug修复的关键点（例如：验证了"区级管理员只看到practice_district_review类型"）

**编写测试时的自检问题**：
1. ✅ 我的测试验证了什么具体点？（而不是"测试这个功能"）
2. ✅ 如果Bug重现，我的测试会失败吗？
3. ✅ 我的断言是否直接验证了修复点？（而不是间接验证）

**详细指南**: 参见 **docs/BUG_FIX_TRACKING_GUIDE.md**

---

## 故障排除快速参考

### 常见问题快速解决

#### 1. Docker容器问题
```bash
# 检查状态
docker-compose ps

# 重建服务
docker-compose down
docker-compose up -d --build

# 查看日志
docker-compose logs [service_name]
```

#### 2. 端口占用
```bash
# Windows: 查找占用进程
netstat -ano | findstr :3001

# 修改 docker-compose.yml 中的端口映射
```

#### 3. 数据库连接
```bash
# 测试连接
docker exec -it guiyang_oj_postgres psql -U postgres -d guiyang_oj -c "SELECT 1"

# 查看日志
docker-compose logs postgres
```

#### 4. Playwright测试失败
```bash
# UI调试模式
npx playwright test --ui -c tests/playwright.config.ts

# 查看测试报告
npx playwright show-report tests/test-results/html
```

### 关键经验总结

#### ⚠️ Docker代码变更不生效
**解决**: 必须重建镜像 `docker-compose up --build -d [service]`

#### ⚠️ E2E测试无法连接服务
**解决**: 确保所有容器都在运行 `docker-compose up -d`

#### ⚠️ Playwright配置路径错误
**解决**: 相对路径是相对于配置文件所在目录，不是执行目录

#### ⚠️ Ant Design按钮文本空格问题
**解决**: 使用正则表达式 `.filter({ hasText: /发\s*布/ })`

#### ⚠️ 测试数据不唯一
**解决**: 使用时间戳 `const unique = \`ACT-${Date.now()}\``

#### ⚠️ 虚拟滚动元素不可见
**解决**:
- 表格：使用 `toBeAttached()` 代替 `toBeVisible()`
- 按钮：使用 `evaluate((el) => el.click())`
- Select：添加 `virtual={false}` 或使用 `evaluate()`

### 开发检查清单

**代码修改后**:
- [ ] 重新构建Docker镜像 (`docker-compose up --build -d`)
- [ ] 等待服务完全启动（30秒）
- [ ] 验证服务可访问 (`curl http://localhost:3001/health`)

**测试编写时**:
- [ ] 测试数据使用时间戳确保唯一性
- [ ] 中文按钮使用正则表达式容错空格
- [ ] 通过点击导航而非直接URL跳转
- [ ] 虚拟滚动表格使用 `toBeAttached()`
- [ ] **验证点覆盖**: 测试验证了具体修复点，而非仅功能
- [ ] **自检**: 如果Bug重现，测试会失败吗？
- [ ] **断言**: 断言直接验证了修复点，而非间接验证

**文档维护**:
- [ ] 更新 API_Document.md
- [ ] 更新 DEVELOPMENT_STATUS.md
- [ ] 更新测试追踪文档

### 调试技巧

```bash
# Playwright UI模式（最推荐）
npx playwright test --ui -c tests/playwright.config.ts

# 有头模式（查看浏览器）
npx playwright test --headed tests/e2e/smoke/ -c tests/playwright.config.ts

# 调试模式（单步执行）
npx playwright test --debug tests/e2e/regression/auth.spec.ts

# 生成代码（录制操作）
npx playwright codegen http://localhost:3000
```

---

## 重要提醒

### 开发时必须注意

1. **🔴 数据库迁移文件必须同步 schema.sql 和 seed.sql**
   - 创建新迁移文件后，必须手动更新 `database/schema.sql`
   - 开发测试数据必须同步到 `database/seed.sql`
   - 这是部署到其他服务器的关键步骤，**不可跳过**！

2. **Docker 重建**: 代码修改后必须重新构建 Docker 镜像
   ```bash
   docker-compose up --build -d backend
   docker-compose up --build -d frontend
   ```

3. **测试数据隔离**: E2E 测试必须使用时间戳或 UUID 确保数据唯一性

4. **文档同步**: 代码变更后必须同步更新相关文档

5. **测试优先**: API 测试通过后再开发前端，E2E 测试通过后才算功能完成

6. **参考最佳实践**: 编写测试前必读 **tests/docs/测试脚本最佳实践.md**

### 关键文档位置

- **开发实践**: CLAUDE.md (本文件)
- **Bug修复追踪指南**: docs/BUG_FIX_TRACKING_GUIDE.md（重要！）
- **Bug修复追踪表**: docs/BUG_FIX_TRACKING.csv
- **测试覆盖分析**: docs/BUG_FIX_TEST_COVERAGE_ANALYSIS.md
- **测试指南**: tests/docs/测试指南.md
- **测试最佳实践**: tests/docs/测试脚本最佳实践.md（必读！）
- **API文档**: documents/API_Document.md
- **功能需求**: documents/FEATURE_REQUIREMENTS.md
- **开发状态**: documents/DEVELOPMENT_STATUS.md
- **开发最佳实践**: documents/DEVELOP_BEST_PRACTICES.md
- **前端性能优化**: documents/FRONTEND_PERFORMANCE_OPTIMIZATION.md
- **进度追踪**: documents/PROGRESS.md

---

**📅 文档最后更新**: 2025-11-08
**🔗 项目仓库**: 贵阳市小学生测评服务平台
**📧 维护**: 开发团队
