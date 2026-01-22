# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**重要约定**: 本项目所有新增内容（代码注释、文档、变量名等）默认使用中文，除非是英文技术术语。

---

## 项目简介

贵阳市小学生测评服务平台 - 一个为贵阳市小学生设计的在线测评服务平台，支持多科目在线考试、自动评分、成绩查询和证书生成等功能。

---

## 开发命令

### Docker 开发（推荐）

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重新构建并启动
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f [service_name]

# 重启特定服务
docker-compose restart backend
docker-compose restart frontend
```

### 后端开发

```bash
cd backend
npm install
npm run dev         # 开发服务器（nodemon）
npm start           # 生产服务器
npm test            # 运行Jest测试
npm run lint        # ESLint代码检查
```

### 前端开发

```bash
cd frontend
npm install
npm run dev         # Vite开发服务器
npm run build       # TypeScript编译 + Vite构建
npm run preview     # 预览生产构建
npm run lint        # ESLint with TypeScript
```

### 数据库操作

```bash
# 连接到PostgreSQL
docker exec -it guiyang_oj_postgres psql -U postgres -d guiyang_oj

# 导入schema和seed数据
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/schema.sql
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/seed.sql

# 备份数据库
docker exec guiyang_oj_postgres pg_dump -U postgres guiyang_oj > backup_$(date +%Y%m%d_%H%M%S).sql

# 运行数据库迁移
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/migrations/xxx_migration.sql
```

### 测试命令

```bash
# E2E测试
npx playwright test -c tests/playwright.config.ts                    # 所有测试
npx playwright test tests/e2e/smoke/ -c tests/playwright.config.ts   # 冒烟测试
npx playwright test tests/e2e/regression/ -c tests/playwright.config.ts  # 回归测试
npx playwright test --ui -c tests/playwright.config.ts                # UI模式（调试）
npx playwright test --headed -c tests/playwright.config.ts            # 有头模式

# API测试
node tests/api/smoke-test.js                  # API冒烟测试
node tests/api/test-admin-api.js              # 管理员API测试
```

---

## 系统架构

### 技术栈

- **前端**: React 18 + TypeScript + Ant Design 5 + Redux Toolkit + Vite
- **后端**: Node.js + Express.js + PostgreSQL + Redis + JWT
- **数据库**: PostgreSQL 15
- **部署**: Docker + Docker Compose + Nginx
- **测试**: Playwright (E2E) + Jest (API/单元)
- **判题**: 独立判题服务（judge-service），支持编程题自动判题

### 应用结构

```
guiyang_oj/
├── backend/                 # Express.js API服务器
│   ├── src/
│   │   ├── routes/         # API路由（27个路由文件）
│   │   ├── models/         # 数据模型
│   │   ├── middleware/     # 中间件（auth, permissions）
│   │   ├── services/       # 业务逻辑（autoGrading, questionCode等）
│   │   └── server.js       # Express配置
│   └── Dockerfile
├── frontend/                # React TypeScript SPA
│   ├── src/
│   │   ├── components/     # UI组件
│   │   ├── pages/          # 页面组件
│   │   ├── store/          # Redux状态
│   │   └── services/       # API层
│   └── Dockerfile
├── judge-service/          # 独立判题服务
│   ├── src/               # 判题逻辑
│   └── Dockerfile
├── database/                # SQL schema和迁移
│   ├── schema.sql          # 完整数据库架构
│   ├── seed.sql            # 种子数据
│   └── migrations/         # 数据库迁移
├── tests/                   # 测试套件
│   ├── e2e/                # Playwright E2E测试
│   ├── api/                # API测试
│   └── docs/               # 测试文档
├── docs/                    # 项目文档
│   ├── DEVELOPMENT_STATUS.md       # 开发状态追踪
│   ├── API_Document.md             # API文档
│   ├── BUG_FIX_TRACKING_GUIDE.md   # Bug修复指南
│   └── ...
├── nginx/                   # Nginx反向代理配置
└── docker-compose.yml       # Docker Compose编排
```

### 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Frontend | 3100 | 容器内80端口映射 |
| Backend | 3003 | 容器内3001端口映射 |
| Nginx | 8080 | 反向代理，对外统一入口 |
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存 |
| pgAdmin | 5050 | 数据库管理 |
| Judge Service | 3002 | 判题服务 |

### 演示账号

所有账号密码：`password123`

| 角色 | 用户名 | 说明 |
|------|--------|------|
| 管理员 | admin | 系统管理员 |
| 学生 | 13800138003 | 手机号登录 |
| 教师 | teacher01 | 教师账号 |

### API路由结构

```
/api/auth              # 认证（登录、登出、刷新token）
/api/users            # 用户管理
/api/admin            # 管理员管理
/api/activities       # 活动系统（测评/练习）- 新系统
/api/student/activities # 学生活动答题
/api/teacher/grading  # 教师评卷系统
/api/questions        # 题目相关
/api/question-bank    # 题库CRUD
/api/question-drafts  # 题目草稿管理
/api/question-review  # 题目审核流程
/api/permissions      # 权限管理
/api/results          # 成绩和统计
/api/certificates     # 证书生成和下载
/api/registration     # 学生注册申请和审核
/api/subjects         # 科目配置管理
/api/achievements     # 成就系统
/api/points            # 积分系统
/api/daily-tasks       # 日常任务系统
/api/upload           # 文件上传
/api/statistics       # 数据统计与可视化
/api/teaching-classes  # 教学班管理
/api/notifications    # 通知系统
/api/judge            # 编程题判题服务
/api/testcases        # 测试用例管理
```

---

## 开发实践流程

### 标准开发步骤

每个新功能开发按以下顺序进行：

#### 1. 数据库设计
- 编写SQL schema文件（`database/schema.sql`）
- 创建迁移脚本（`database/migrations/`）
- **关键**：同步更新 `database/schema.sql` 和 `database/seed.sql`

#### 2. 后端API开发
- 创建数据模型
- 实现业务逻辑
- 编写API路由
- 添加输入验证和错误处理
- **重要**：错误消息必须使用中文

#### 2.5. 重新构建后端
```bash
docker-compose up --build -d backend
```

#### 3. API测试
- 编写API单元测试
- 运行测试确保通过
- **验证点覆盖要求**：测试必须验证具体字段和数据逻辑

#### 4. 前端开发
- 创建页面组件
- 实现UI交互逻辑
- 集成API服务

#### 4.5. 重新构建前端
```bash
docker-compose up --build -d frontend
```

#### 5. E2E测试
- 编写Playwright测试用例
- 运行测试确保通过
- **验证点覆盖要求**：测试必须验证UI元素、数据显示和权限控制

#### 6. 文档更新
- 更新 `docs/DEVELOPMENT_STATUS.md`
- 更新测试追踪文档

### 开发状态追踪

所有功能开发状态记录在 `docs/DEVELOPMENT_STATUS.md`

---

## 测试指南

### 测试级别

| 级别 | 覆盖范围 | 执行命令 |
|------|---------|---------|
| 冒烟测试 | 登录、首页、健康检查 | `npx playwright test tests/e2e/smoke/` |
| 回归测试 | 认证、学生、管理员、题库、活动管理 | `npx playwright test tests/e2e/regression/` |
| API测试 | 接口功能和业务流程 | `node tests/api/smoke-test.js` |

### 测试用例编号规范

格式：**三位字母 + 三位数字**（如 AUT001, QBC101, ACT001）

- **001-099**: 冒烟测试
- **101-999**: 回归测试

| 模块代码 | 功能模块 |
|---------|---------|
| AUT | Authentication（认证） |
| STU | Student（学生功能） |
| ADM | Admin（管理员功能） |
| PRM | Permission Management（权限管理） |
| QBC | Question Bank Creation（题库创建） |
| DFT | Draft（题库草稿箱） |
| REV | Review（题库审核） |
| ACT | Activity（活动管理） |
| CRT | Certificate（证书管理） |

### 测试最佳实践

**Ant Design 5 虚拟滚动问题**：
- 测试环境：添加 `virtual={false}` 属性
- 需记录在 `docs/FRONTEND_PERFORMANCE_OPTIMIZATION.md`

**虚拟滚动表格操作**：
- 使用 `toBeAttached()` 代替 `toBeVisible()`
- 使用 `evaluate()` 绕过可见性检查

**测试数据唯一性**：
```typescript
const timestamp = Date.now();
const uniqueContent = `【QBC101-${timestamp}】测试题目`;
```

---

## 权限系统

### 权限类型定义（来自数据库迁移文件）

**审核权限**：
- `assessment_review` - 测评题库审核
- `practice_municipal_review` - 市级练习题库审核
- `practice_district_review` - 区级练习题库审核
- `competition_review` - 竞赛审核

**发布权限**：
- `practice_publish_municipal` - 市级练习发布
- `practice_publish_district` - 区级练习发布
- `practice_publish_school` - 校级练习发布
- `practice_publish_base_school` - 基地学校练习发布
- `practice_publish_municipal_school` - 市直学校练习发布

### 角色层级

| 角色 | 层级 | 权限范围 |
|------|------|---------|
| system_admin | 7 | 全部权限 |
| municipal_admin | 7 | 市级全部权限 |
| municipal_school_admin | 6 | 市直属学校 |
| base_school_admin | 5 | 基地学校 |
| district_admin | 4 | 区级 |
| school_admin | 3 | 校级 |
| teacher | 2 | 教师 |
| student | 1 | 学生 |

---

## 重要文档位置

| 文档 | 路径 | 说明 |
|------|------|------|
| 开发状态追踪 | `docs/DEVELOPMENT_STATUS.md` | 功能开发进度 |
| API文档 | `docs/API_Document.md` | API接口规范 |
| Bug修复指南 | `docs/BUG_FIX_TRACKING_GUIDE.md` | Bug修复流程 |
| 测试指南 | `tests/docs/测试指南.md` | 测试规范 |
| 测试最佳实践 | `tests/docs/测试脚本最佳实践.md` | E2E测试编写 |
| 系统设计 | `docs/business/updated_system_design_0707_v2.md` | 架构设计 |
| 权限管理指南 | `docs/business/QUESTION_BANK_PERMISSION_MANAGEMENT.md` | 权限系统 |

---

## 常见问题

### Docker代码变更不生效
**解决**: 必须重建镜像
```bash
docker-compose up --build -d backend
docker-compose up --build -d frontend
```

### E2E测试无法连接服务
**解决**: 确保所有容器都在运行
```bash
docker-compose up -d
docker-compose ps  # 验证所有服务Up
```

### Ant Design按钮文本空格问题
**解决**: 使用正则表达式
```typescript
page.locator('button').filter({ hasText: /发\s*布/ })
```

### Playwright配置路径错误
**解决**: 配置文件在 `tests/` 目录，路径相对于配置文件
```typescript
// 正确
outputDir: './test-results/html'

// 错误（会变成 tests/tests/test-results/）
outputDir: './tests/test-results/html'
```

---

## 语言规范

1. **文档**: 中文（除README.md外）
2. **文件名**: 英文
3. **代码注释**: 英文
4. **错误消息**: **中文**
5. **数据库字段名**: 英文（snake_case）

---

**最后更新**: 2025-01-21
