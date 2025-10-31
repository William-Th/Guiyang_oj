# 贵阳市小学生测评服务平台

一个为贵阳市小学生设计的在线测评服务平台，支持多科目在线考试、自动评分、成绩查询和证书生成等功能。

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+ (如果不使用Docker)
- Redis 7+ (如果不使用Docker)

### 使用Docker启动（推荐）

```bash
# 克隆项目
git clone <repository-url>
cd guiyang_oj

# 使用Docker Compose启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

服务将在以下端口启动：
- 前端：http://localhost:3000
- 后端API：http://localhost:3001
- PostgreSQL：localhost:5432
- Redis：localhost:6379
- pgAdmin：http://localhost:5050

### 本地开发环境

#### 后端启动

```bash
cd backend

# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env

# 编辑.env文件，配置数据库连接等信息

# 启动开发服务器
npm run dev
```

#### 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 📁 项目结构

```
guiyang_oj/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── routes/         # API路由
│   │   ├── controllers/    # 控制器
│   │   ├── models/         # 数据模型
│   │   ├── middleware/     # 中间件
│   │   ├── services/       # 业务逻辑
│   │   ├── utils/          # 工具函数
│   │   └── server.js       # 服务器入口
│   ├── package.json
│   └── Dockerfile
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── components/     # React组件
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API服务
│   │   ├── store/          # Redux状态管理
│   │   ├── utils/          # 工具函数
│   │   └── App.tsx         # 应用入口
│   ├── package.json
│   └── Dockerfile
├── database/                # 数据库相关
│   ├── schema.sql          # 数据库架构
│   ├── seed.sql            # 种子数据
│   └── import_*.js         # 数据导入脚本
├── documents/               # 📋 核心项目文档
│   ├── README.md           # 文档索引
│   ├── API_Document.md     # API接口文档
│   ├── updated_system_design_0707_v2.md  # 系统设计文档
│   └── 功能需求文档.md     # 功能需求文档
├── report/                  # 📊 技术报告文档
│   ├── README.md           # 报告索引
│   ├── 功能实现状态报告.md  # 实现进度
│   ├── data-restructuring-report.md  # 数据重构报告
│   └── ...                 # 其他技术报告
├── docker/                  # Docker配置
├── nginx/                   # Nginx配置
├── docker-compose.yml       # Docker Compose配置
├── README.md               # 项目说明
├── PROGRESS.md             # 开发进度
└── MVP_Plan.md             # MVP计划

```

## 🔑 默认登录账号

所有演示账号的密码统一为：`password123`

### 学生账号
- 手机号：`13800138003`
- 真实姓名：张小明
- 密码：`password123`

### 教师账号
- 用户名：`teacher01`
- 密码：`password123`

### 管理员账号
- 用户名：`admin`
- 密码：`password123`

## 🛠 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **UI库**: Ant Design 5
- **状态管理**: Redux Toolkit
- **路由**: React Router v6
- **构建工具**: Vite
- **图表**: Recharts

### 后端
- **运行时**: Node.js 18
- **框架**: Express.js
- **数据库**: PostgreSQL 15
- **缓存**: Redis 7
- **认证**: JWT
- **验证**: express-validator

### 基础设施
- **容器化**: Docker
- **反向代理**: Nginx
- **数据库管理**: pgAdmin

## 📊 功能特性

### 学生端
- ✅ 手机号登录
- ✅ 在线考试
- ✅ 自动计时
- ✅ 成绩查询
- ✅ 证书下载
- ✅ 考试历史

### 教师端
- ✅ 题库管理
- ✅ 考试发布
- ✅ 成绩统计
- ✅ 学生管理
- ✅ 批量导入

### 管理端
- ✅ 用户管理
- ✅ 学校管理
- ✅ 数据统计
- ✅ 系统配置
- ✅ 审计日志

## 🔧 常用命令

### Docker命令

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重新构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f [service_name]

# 进入容器
docker exec -it guiyang_oj_backend sh
```

### 数据库操作

```bash
# 连接到PostgreSQL
docker exec -it guiyang_oj_postgres psql -U postgres -d guiyang_oj

# 导入数据
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/schema.sql

# 备份数据库
docker exec guiyang_oj_postgres pg_dump -U postgres guiyang_oj > backup.sql
```

## 📚 项目文档

### 核心文档
- **[README.md](./README.md)** - 项目总体说明（本文档）
- **[DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md)** - 🔥 功能开发状态追踪
- **[PROGRESS.md](./PROGRESS.md)** - 开发进度追踪
- **[MVP_Plan.md](./MVP_Plan.md)** - MVP开发计划
- **[API_Document.md](./API_Document.md)** - 完整API接口文档
- **[CLAUDE.md](./CLAUDE.md)** - Claude Code使用指南
- **[DEMO_GUIDE.md](./DEMO_GUIDE.md)** - 演示指南

### 技术报告
所有技术报告和实现文档已整理到 **[report/](./report/)** 文件夹：
- **[功能需求文档](./report/功能需求文档.md)** - 完整的功能需求说明
- **[功能实现状态报告](./report/功能实现状态报告.md)** - 功能实现进度
- **[题库管理系统报告](./report/question-bank-implementation-report.md)** - 题库系统实现详情
- **[前端实现报告](./report/frontend-implementation-report.md)** - 前端开发详情
- **[问题修复汇总](./report/fix-summary.md)** - 常见问题解决方案

👉 查看完整报告列表：**[report/README.md](./report/README.md)**

## 🚦 API文档

详细的API文档请查看 **[API_Document.md](./API_Document.md)**

主要API端点：

### 认证
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/logout` - 用户登出

### 考试
- `GET /api/exams` - 获取考试列表
- `GET /api/exams/:id` - 获取考试详情
- `POST /api/exams/:id/start` - 开始考试
- `POST /api/exams/:id/submit` - 提交答案

### 成绩
- `GET /api/results/student/:id` - 获取学生成绩
- `GET /api/results/exam/:id` - 获取考试成绩
- `GET /api/results/exam/:id/statistics` - 获取统计数据

## 🐛 故障排除

### 端口占用
如果端口被占用，可以修改`docker-compose.yml`中的端口映射。

### 数据库连接失败
1. 确保PostgreSQL服务正在运行
2. 检查`.env`文件中的数据库配置
3. 确保数据库用户有正确的权限

### 前端无法连接后端
1. 检查后端服务是否正在运行
2. 确认API地址配置正确
3. 检查CORS配置

## 📝 开发规范

### Git提交规范
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建过程或辅助工具的变动

### 代码规范
- 使用ESLint进行代码检查
- 使用Prettier进行代码格式化
- TypeScript严格模式

## 🔄 开发实践流程

为了提高开发效率和代码质量，本项目采用以下标准化开发流程：

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
  - 更新 **[API_Document.md](docs/API_Document.md)**，添加新接口的详细文档
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
  - 创建或更新API测试用例文档（参见 **[tests/api/README.md](./tests/api/README.md)**）
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
  - 更新相应的测试追踪文档（参见 **[tests/docs/README.md](./tests/docs/README.md)**）
  - 回归测试：更新 **[regression-test-tracking.md](./tests/docs/regression-test-tracking.md)**
  - 记录测试用例ID、测试步骤、预期结果
  - 记录测试状态（通过/失败）和备注信息

#### 6️⃣ 最终文档整理
- 确认所有阶段的文档都已更新完成
- 更新 **[DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md)** 标记功能完成状态
- 更新项目进度文档（如需要）
- 记录已知问题和注意事项
- 整理技术决策和实现要点到 **[report/](./report/)** 文件夹（如有重要技术点）

### 开发状态追踪

所有功能的开发状态应记录在 **[DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md)** 文件中。

每个功能包含以下状态：
- 🟦 **数据库** - 已完成/进行中/未开始
- 🟩 **后端API** - 已完成/进行中/未开始
- 🟨 **API测试** - 已通过/进行中/未开始
- 🟧 **前端** - 已完成/进行中/未开始
- 🟥 **E2E测试** - 已通过/进行中/未开始

### 测试策略

#### API测试
- **框架**: Jest + Supertest
- **测试文件位置**: `tests/api/`
- **测试类型**:
  - **单元测试**: 测试单个 API 端点的功能
  - **流程测试**: 测试完整业务流程的 API 协作
- **运行命令**:
  ```bash
  # 运行所有 API 测试
  npx jest tests/api

  # 运行特定测试
  npx jest tests/api/questionCode.test.js

  # 运行冒烟测试
  npx jest tests/api/smoke-test.js
  ```
- **文档**: 详见 **[tests/api/README.md](./tests/api/README.md)**

#### E2E测试
- **框架**: Playwright
- **测试文件位置**: `tests/e2e/`
- **运行命令**:
  ```bash
  # 运行所有 E2E 测试
  npm run test:e2e

  # 运行特定测试
  npx playwright test regression/question-bank-workflow.spec.ts

  # 运行冒烟测试
  npm run test:smoke
  ```
- **文档**: 详见 **[tests/docs/README.md](./tests/docs/README.md)**

### 最佳实践

1. **测试驱动开发（TDD）**：先写测试，再写实现
2. **增量开发**：每次只开发一个小功能，确保测试通过后再继续
3. **代码审查**：重要功能需要代码审查
4. **持续集成**：每次提交都应该通过所有测试
5. **文档同步**：代码和文档同步更新

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

## 📄 许可证

本项目仅供教育部门内部使用。

## 👥 团队

- 产品设计：贵阳市教育局
- 技术开发：[开发团队]
- 测试支持：[测试团队]

## 📞 联系方式

如有问题，请联系：
- 技术支持：[support@example.com]
- 项目负责人：[manager@example.com]

---

*最后更新：2024年*