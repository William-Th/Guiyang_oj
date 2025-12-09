# Judge Service

贵阳市小学生测评平台 - 编程题判题服务

## 功能特性

- Docker 沙箱隔离执行用户代码
- 支持 C/C++ 编程语言
- Redis 消息队列异步判题
- 多测试用例并行执行
- 实时判题状态推送
- 安全代码检查

## 快速开始

### 1. 构建沙箱镜像

```bash
# 进入 sandbox 目录
cd judge-service/sandbox

# 构建沙箱镜像
docker build -t guiyang_oj_sandbox:latest .

# 或使用脚本
bash build.sh
```

### 2. 启动服务

```bash
# 使用 docker-compose 启动所有服务
docker-compose up -d judge-service

# 单独启动判题服务
cd judge-service
npm install
npm run dev
```

### 3. 验证服务

```bash
# 检查健康状态
curl http://localhost:3002/health

# 获取支持的语言
curl http://localhost:3002/api/judge/languages
```

## API 接口

### 提交代码判题

```bash
POST /api/judge/submit
Content-Type: application/json

{
  "questionId": 1,
  "userId": 1,
  "activityId": 1,
  "code": "#include<iostream>\nusing namespace std;\nint main(){cout<<\"Hello World\";return 0;}",
  "language": "cpp"
}
```

### 查询判题状态

```bash
GET /api/judge/status/:submissionId
```

### 快速运行（不保存）

```bash
POST /api/judge/run
Content-Type: application/json

{
  "code": "#include<iostream>\nusing namespace std;\nint main(){int a,b;cin>>a>>b;cout<<a+b;return 0;}",
  "language": "cpp",
  "input": "1 2",
  "expectedOutput": "3"
}
```

### 测试用例管理

```bash
# 获取题目测试用例
GET /api/testcases/:questionId

# 获取样例（公开显示）
GET /api/testcases/:questionId/samples

# 创建测试用例
POST /api/testcases/:questionId

# 批量创建
POST /api/testcases/:questionId/bulk
```

## 判题状态码

| 状态 | 说明 |
|------|------|
| AC | Accepted - 通过 |
| WA | Wrong Answer - 答案错误 |
| CE | Compile Error - 编译错误 |
| RE | Runtime Error - 运行时错误 |
| TLE | Time Limit Exceeded - 超时 |
| MLE | Memory Limit Exceeded - 内存超限 |
| OLE | Output Limit Exceeded - 输出超限 |
| SE | System Error - 系统错误 |

## 配置说明

环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 3002 | 服务端口 |
| DB_HOST | localhost | 数据库地址 |
| REDIS_HOST | localhost | Redis 地址 |
| SANDBOX_IMAGE | guiyang_oj_sandbox:latest | 沙箱镜像 |
| WORKER_ID | worker_${pid} | Worker 标识 |
| MAX_CONCURRENT | 2 | 最大并发判题数 |
| COMPILE_TIMEOUT | 10000 | 编译超时(ms) |
| RUN_TIMEOUT | 2000 | 运行超时(ms) |
| MEMORY_LIMIT | 268435456 | 内存限制(bytes) |

## 安全措施

1. **网络隔离**: 沙箱容器禁用网络 (`networkMode: none`)
2. **资源限制**: CPU、内存、进程数限制
3. **代码检查**: 检测危险函数调用（system, fork, exec 等）
4. **权限降级**: 沙箱内以非 root 用户运行
5. **输出限制**: 防止输出过大导致内存耗尽

## 目录结构

```
judge-service/
├── src/
│   ├── config.js           # 配置文件
│   ├── index.js            # 主入口
│   ├── judge/
│   │   ├── Checker.js      # 输出比较
│   │   ├── Compiler.js     # 代码编译
│   │   ├── Executor.js     # 代码执行
│   │   └── JudgeService.js # 判题服务
│   ├── models/
│   │   ├── db.js           # 数据库连接
│   │   ├── Submission.js   # 提交记录
│   │   └── TestCase.js     # 测试用例
│   ├── queue/
│   │   ├── Consumer.js     # 队列消费者
│   │   └── RedisQueue.js   # Redis 队列
│   ├── routes/
│   │   ├── judge.js        # 判题 API
│   │   └── testcases.js    # 测试用例 API
│   ├── sandbox/
│   │   └── DockerSandbox.js # Docker 沙箱
│   └── utils/
│       └── logger.js       # 日志工具
├── sandbox/
│   ├── Dockerfile          # 沙箱镜像
│   └── build.sh            # 构建脚本
├── Dockerfile              # 服务镜像
├── package.json
└── README.md
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产模式
npm start

# 运行测试
npm test
```
