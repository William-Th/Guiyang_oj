# 贵阳市小学生测评服务平台

一个为贵阳市小学生设计的在线测评服务平台，支持多科目在线考试与练习、自动评分、智能推荐、错题集、学习统计、成绩查询与证书生成等功能，覆盖学生、教师、管理员、家长多端角色。

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
- 前端：http://localhost:3100
- 后端 API：http://localhost:3003
- Nginx 统一入口：http://localhost:8080
- 判题服务：http://localhost:3002
- PostgreSQL：localhost:5433（容器内 5432）
- Redis：localhost:6379
- pgAdmin：http://localhost:5051（容器内 80）

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
├── backend/                 # 后端 API 服务（Express.js）
│   ├── src/
│   │   ├── routes/         # API 路由（auth、activities、questionDrafts、statistics、judge 等）
│   │   ├── controllers/    # 控制器
│   │   ├── models/         # 数据模型
│   │   ├── services/       # 业务逻辑（autoGrading、recommend 推荐算法等）
│   │   ├── middleware/     # 中间件（auth、permissions）
│   │   ├── config/         # 配置
│   │   ├── database/       # 数据库初始化
│   │   ├── utils/          # 工具函数
│   │   └── server.js       # 服务入口
│   ├── package.json
│   └── Dockerfile
├── frontend/                # 前端应用（React 18 + TypeScript + Ant Design）
│   ├── src/
│   │   ├── components/     # React 组件
│   │   ├── pages/          # 页面组件（student / teacher / admin 等）
│   │   ├── services/       # API 服务层
│   │   ├── store/          # Redux 状态管理
│   │   └── App.tsx         # 应用入口
│   ├── package.json
│   └── Dockerfile
├── judge-service/           # 独立判题微服务（编程题自动判题 + Docker 沙箱）
│   ├── src/                # 判题逻辑
│   └── Dockerfile
├── database/                # 数据库 schema、种子数据与迁移脚本
│   ├── schema.sql
│   ├── seed.sql
│   └── migrations/         # 增量迁移脚本
├── config/                  # 全局配置（学校、区县、能力、知识点、角色层级等 JSON）
├── tests/                   # 测试套件
│   ├── e2e/                # Playwright E2E 测试
│   ├── api/                # API / 业务流程测试
│   └── docs/               # 测试规范文档
├── docs/                    # 📋 项目文档（开发状态、API、推荐算法、需求等）
├── documents/               # 判题服务设计文档（JUDGE_SERVICE_DESIGN.md）
├── buget/                   # 预算与部署配置记录
├── nginx/                   # Nginx 反向代理配置
├── docker-compose.yml       # Docker Compose 编排
├── CLAUDE.md                # Claude Code 使用指南
└── README.md                # 项目说明（本文档）

```

## 🔑 默认登录账号

所有演示账号的密码统一为：`password123`。**学生用手机号登录，其余角色用用户名登录。**

| 身份 | 角色 | 用户名 | 姓名 | 手机号 |
|------|------|--------|------|--------|
| 系统管理员 / 市级管理员 | municipal_admin | `admin` | 系统管理员 | 13800138000 |
| 市直属学校管理员 | municipal_school_admin | `municipal_school_admin` | 市直属学校总管理员 | 13800138030 |
| 基地学校管理员 | base_school_admin | `base_school_admin` | 信息技术基地校管理员 | 13800138040 |
| 区级管理员 | district_admin | `yunyan_admin` | 云岩区管理员 | 13800138010 |
| 校级管理员 | school_admin | `school_admin_01` | 第一小学管理员 | 13800138020 |
| 教师 | teacher | `teacher_by_ps_math` | 陈刚（白云一小·数学） | 13800138101 |
| 学生 | student | `13800138003` | 张小明 | 13800138003 |
| 家长 | parent | `parent01` | 测试家长 | 13900000001 |

> - 当前最高管理员仅 `admin` 一个（role=municipal_admin），同时承担系统管理员与市级管理员职能。
> - 区级管理员共 6 个：`yunyan_admin` / `nanming_admin` / `guanshanhu_admin` / `baiyun_admin` / `huaxi_admin` / `wudang_admin`。
> - 教师共 18 个，命名规则 `teacher_<区缩写>_<学段>_<科目>`（如 `teacher_by_ps_math` = 白云·小学·数学，`teacher_nm_ms_it` = 南明·初中·信息科技）。
> - 学生共 10 个，用户名即手机号（13800138003 ~ 13800138009 等）。

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

### 判题服务
- **运行时**: Node.js（独立微服务）
- **能力**: 编程题自动判题，支持测试用例管理

### 基础设施
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **数据库管理**: pgAdmin
- **测试**: Playwright（E2E）+ Jest（API/单元）

## 📊 功能特性

> 以下功能反映截至 2026 年 7 月的最新迭代进度：✅ 为已有功能，🆕 为近期新增。

### 学生端
- ✅ 手机号登录、在线测评/练习、自动计时、自动交卷
- ✅ 成绩查询、考试/练习历史、证书下载
- 🆕 智能推荐：基于能力维度与薄弱知识点的个性化推题（仅推客观题，自动排除已掌握题目）
- 🆕 碎片化推荐：短时练习，混入错题复习槽，换一批不再雷同
- 🆕 每日推题：每日任务驱动，自动过滤隐藏/未发布题目
- 🆕 错题集：错题来源管理、错题复习
- 🆕 学习统计：能力维度雷达图/柱状图（维度 < 3 时自动降级柱状图）、知识点掌握度、薄弱知识点明细
- 🆕 智能练习在线作答：点击选择式答题弹窗
- 🆕 积分商店、连胜（streak）激励
- ✅ 题目插图展示

### 教师端
- ✅ 题库管理（草稿 / 审核 / 发布全流程）、批量导入
- 🆕 题库治理：配额管理（按 ID/用户名/姓名检索）、纠错、同质化检测、统计
- 🆕 试卷生成与 PDF 导出
- 🆕 教学班管理（学生增删、年级筛选）
- 🆕 数据分析面板（能力维度统计，无数据时降级查询）
- ✅ 成绩统计、教师评卷

### 管理端
- ✅ 用户管理（含家长角色）、学校管理
- 🆕 题库治理菜单、内容工作流（提级 / 隐藏 / 发布审核）
- ✅ 数据统计与可视化、系统配置、审计日志

### 家长端
- 🆕 选择孩子、查看学情（家长端后续集成到小程序）

### 判题服务
- 🆕 独立判题微服务，支持编程题自动判题与测试用例管理

### 通用
- ✅ 薄荷品牌设计规范（全前端主题重构）
- ✅ 响应式适配
- ✅ 多层级角色权限体系（system_admin → student，共 8 级）

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
- **[CLAUDE.md](./CLAUDE.md)** - Claude Code 使用指南
- **[开发状态追踪](./docs/DEVELOPMENT_STATUS.md)** - 🔥 功能开发状态
- **[API 接口文档](./docs/API_Document.md)** - 完整 API 接口文档
- **[推荐算法文档](./docs/RECOMMENDATION_ALGORITHM.md)** - 智能练习推荐算法设计
- **[演示指南](./docs/DEMO_GUIDE.md)** - 演示操作指南
- **[开发进度（归档）](./docs/archive/PROGRESS.md)** - 历史开发进度

### 需求与设计文档
- **[功能需求](./docs/FEATURE_REQUIREMENTS.md)** - 功能需求说明
- **[题库重构](./docs/QUESTION_BANK_REDESIGN.md)** - 题库系统设计
- **[教学班需求](./docs/TEACHING_CLASS_REQUIREMENTS.md)** - 教学班设计
- **[数据可视化需求](./docs/DATA_VISUALIZATION_REQUIREMENTS.md)** - 学习统计设计
- **[判题服务设计](./documents/JUDGE_SERVICE_DESIGN.md)** - judge-service 设计文档

👉 完整文档列表见 **[docs/README.md](./docs/README.md)**

## 🚦 API文档

详细的API文档请查看 **[API 接口文档](./docs/API_Document.md)**

主要 API 路由模块：

| 模块 | 路径 | 说明 |
|------|------|------|
| 认证 | `/api/auth` | 登录、登出、刷新 token |
| 用户 | `/api/users` | 用户管理（含家长角色） |
| 管理员 | `/api/admin` | 管理员管理、题库治理、工作流 |
| 活动 | `/api/activities` | 测评/练习活动系统 |
| 学生活动 | `/api/student/activities` | 学生答题、智能练习 |
| 教师评卷 | `/api/teacher/grading` | 教师评卷系统 |
| 题库 | `/api/question-bank` | 题库 CRUD |
| 题目草稿 | `/api/question-drafts` | 题目草稿管理 |
| 题目审核 | `/api/question-review` | 题目审核流程 |
| 智能推荐 | `/api/student/activities/recommend` | 碎片化推荐 / 每日推题 / 复习 |
| 成绩 | `/api/results` | 成绩查询与统计 |
| 学习统计 | `/api/statistics` | 数据统计与可视化 |
| 证书 | `/api/certificates` | 证书生成与下载 |
| 积分/成就 | `/api/points`、`/api/achievements` | 积分商店、成就系统 |
| 每日任务 | `/api/daily-tasks` | 日常任务系统 |
| 教学班 | `/api/teaching-classes` | 教学班管理 |
| 判题 | `/api/judge`、`/api/testcases` | 编程题判题与测试用例 |
| 通知 | `/api/notifications` | 通知系统 |

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
- 验证服务正常运行：`curl http://localhost:3003/health`
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
- 验证服务正常运行：`curl http://localhost:3100` 或 `curl http://localhost:3003/health`

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
- 更新 **[DEVELOPMENT_STATUS.md](./docs/DEVELOPMENT_STATUS.md)** 标记功能完成状态
- 更新项目进度文档（如需要）
- 记录已知问题和注意事项
- 整理技术决策和实现要点到 **[docs/](./docs/)** 文件夹（如有重要技术点）

### 开发状态追踪

所有功能的开发状态应记录在 **[DEVELOPMENT_STATUS.md](./docs/DEVELOPMENT_STATUS.md)** 文件中。

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
# 📝 如有重要技术决策，整理到 docs/ 文件夹
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

*最后更新：2026 年 7 月*