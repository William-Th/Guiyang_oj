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
│   └── schema.sql          # 数据库架构
├── docker/                  # Docker配置
├── nginx/                   # Nginx配置
├── docs/                    # 文档
├── docker-compose.yml       # Docker Compose配置
└── README.md               # 项目说明

```

## 🔑 默认登录账号

### 学生账号
- 身份证号：520102200501011234
- 密码：123456

### 教师账号
- 用户名：teacher01
- 密码：123456

### 管理员账号
- 用户名：admin
- 密码：admin123

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
- ✅ 身份证号登录
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

## 🚦 API文档

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