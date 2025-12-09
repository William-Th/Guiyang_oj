# 编程题判题服务设计文档

## 1. 概述

本文档描述贵阳市小学生测评平台的C++编程题判题服务设计方案。该服务参考了洛谷、Judge0等主流OJ系统的设计理念，采用Docker沙箱实现安全的代码执行环境。

### 1.1 设计目标

- **安全性**: 使用Docker容器隔离用户代码，防止恶意代码攻击宿主机
- **可靠性**: 支持编译超时、运行超时、内存限制等保护机制
- **可扩展性**: 采用微服务架构，支持水平扩展判题节点
- **易用性**: 提供友好的前端代码编辑器和实时判题反馈

### 1.2 支持的语言

当前版本仅支持 **C++** (g++ 11/14)，后续可扩展支持Python、Java等语言。

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              前端 (React + Monaco Editor)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  代码编辑器   │  │  提交按钮    │  │  判题状态    │  │  结果显示        │ │
│  │ (Monaco)     │  │              │  │  (实时)      │  │  (测试点详情)    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/WebSocket
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              后端 API (Express.js)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ /api/judge   │  │ 代码验证     │  │ 任务队列     │  │ 结果通知         │ │
│  │ /submit      │  │ (安全检查)   │  │ (Redis)      │  │ (WebSocket)      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Redis Queue
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           判题服务 (Judge Service)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ 任务消费者   │  │ 编译模块     │  │ 执行模块     │  │ 结果比对         │ │
│  │ (Worker)     │  │ (g++)        │  │ (沙箱)       │  │ (Checker)        │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Docker API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Docker 沙箱容器                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Alpine Linux + GCC/G++                                               │   │
│  │  - 资源限制: CPU, Memory, Disk, Network                               │   │
│  │  - 安全限制: seccomp, capabilities, read-only fs                      │   │
│  │  - 超时控制: 编译5s, 运行2s (可配置)                                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 判题流程

```
用户提交代码
      │
      ▼
┌─────────────┐
│ 1. 代码验证 │ ─── 检查代码长度、危险函数、编码格式
└──────┬──────┘
       │ 通过
       ▼
┌─────────────┐
│ 2. 入队列   │ ─── 写入Redis队列，返回submission_id
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 3. 编译代码 │ ─── Docker内执行 g++ -O2 -std=c++17
└──────┬──────┘
       │ 成功              │ 失败
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│ 4. 运行测试 │     │ CE: 编译错误 │
└──────┬──────┘     └─────────────┘
       │
       ▼ (对每个测试点)
┌─────────────────────────────┐
│ 4.1 注入输入                │
│ 4.2 执行程序 (限时限内存)   │
│ 4.3 收集输出                │
│ 4.4 比对结果                │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────┐
│ 5. 汇总结果 │ ─── AC/WA/TLE/MLE/RE 等
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 6. 更新数据库│ ─── 写入判题记录，计算得分
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 7. 通知前端 │ ─── WebSocket推送结果
└─────────────┘
```

---

## 3. 数据库设计

### 3.1 新增表结构

#### 3.1.1 test_cases (测试用例表)

存储编程题的测试用例（输入输出数据）。

```sql
-- 测试用例表
CREATE TABLE test_cases (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL,           -- 关联 question_bank.id (draft_id)
    case_number INTEGER NOT NULL,           -- 测试点编号 (1, 2, 3...)
    input_data TEXT NOT NULL,               -- 输入数据
    expected_output TEXT NOT NULL,          -- 期望输出
    score INTEGER DEFAULT 10,               -- 该测试点分值
    time_limit INTEGER DEFAULT 1000,        -- 时间限制 (毫秒)
    memory_limit INTEGER DEFAULT 256,       -- 内存限制 (MB)
    is_sample BOOLEAN DEFAULT false,        -- 是否为样例 (展示给学生)
    description VARCHAR(200),               -- 测试点描述 (如: "基础测试", "边界测试")
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_test_cases_question
        FOREIGN KEY (question_id) REFERENCES question_drafts(id) ON DELETE CASCADE,
    CONSTRAINT unique_question_case UNIQUE (question_id, case_number)
);

-- 索引
CREATE INDEX idx_test_cases_question ON test_cases(question_id);
CREATE INDEX idx_test_cases_sample ON test_cases(question_id, is_sample);

COMMENT ON TABLE test_cases IS '编程题测试用例表';
COMMENT ON COLUMN test_cases.question_id IS '关联的题目ID (question_drafts.id)';
COMMENT ON COLUMN test_cases.case_number IS '测试点编号，从1开始';
COMMENT ON COLUMN test_cases.input_data IS '测试输入数据';
COMMENT ON COLUMN test_cases.expected_output IS '期望的正确输出';
COMMENT ON COLUMN test_cases.score IS '该测试点的分值';
COMMENT ON COLUMN test_cases.time_limit IS '时间限制(毫秒)，默认1000ms';
COMMENT ON COLUMN test_cases.memory_limit IS '内存限制(MB)，默认256MB';
COMMENT ON COLUMN test_cases.is_sample IS '是否为样例测试点(展示给学生)';
```

#### 3.1.2 code_submissions (代码提交记录表)

记录学生的代码提交和判题结果。

```sql
-- 代码提交记录表
CREATE TABLE code_submissions (
    id SERIAL PRIMARY KEY,
    student_activity_id INTEGER NOT NULL,   -- 关联 student_activities.id
    question_id INTEGER NOT NULL,           -- 关联 question_bank.id (发布后的题目)
    student_id INTEGER NOT NULL,            -- 学生ID

    -- 提交信息
    source_code TEXT NOT NULL,              -- 提交的源代码
    language VARCHAR(20) DEFAULT 'cpp',     -- 编程语言 (cpp, python, java等)
    code_length INTEGER,                    -- 代码长度 (字符数)

    -- 判题结果
    status VARCHAR(20) DEFAULT 'pending',   -- 状态: pending, judging, accepted, wrong_answer,
                                            --       compile_error, runtime_error, time_limit,
                                            --       memory_limit, system_error
    score INTEGER DEFAULT 0,                -- 得分
    total_score INTEGER,                    -- 总分

    -- 执行统计
    time_used INTEGER,                      -- 最大运行时间 (毫秒)
    memory_used INTEGER,                    -- 最大内存使用 (KB)

    -- 详细信息
    compile_output TEXT,                    -- 编译输出 (错误信息)
    judge_result JSONB,                     -- 详细判题结果 (每个测试点)
    error_message TEXT,                     -- 错误信息

    -- 时间戳
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    judged_at TIMESTAMP,

    CONSTRAINT fk_submission_student_activity
        FOREIGN KEY (student_activity_id) REFERENCES student_activities(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_student
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_submissions_student_activity ON code_submissions(student_activity_id);
CREATE INDEX idx_submissions_student ON code_submissions(student_id);
CREATE INDEX idx_submissions_status ON code_submissions(status);
CREATE INDEX idx_submissions_question ON code_submissions(question_id);
CREATE INDEX idx_submissions_time ON code_submissions(submitted_at DESC);

COMMENT ON TABLE code_submissions IS '编程题代码提交记录表';
COMMENT ON COLUMN code_submissions.status IS '判题状态: pending-等待, judging-判题中, accepted-通过, wrong_answer-答案错误, compile_error-编译错误, runtime_error-运行错误, time_limit-超时, memory_limit-内存超限, system_error-系统错误';
COMMENT ON COLUMN code_submissions.judge_result IS 'JSON格式的详细判题结果，包含每个测试点的状态';
```

#### 3.1.3 judge_result JSONB 结构示例

```json
{
  "test_cases": [
    {
      "case_number": 1,
      "status": "accepted",
      "time_used": 15,
      "memory_used": 1024,
      "score": 10,
      "is_sample": true
    },
    {
      "case_number": 2,
      "status": "wrong_answer",
      "time_used": 20,
      "memory_used": 1280,
      "score": 0,
      "is_sample": false,
      "expected_output_preview": "5",
      "actual_output_preview": "4"
    },
    {
      "case_number": 3,
      "status": "time_limit",
      "time_used": 1000,
      "memory_used": 2048,
      "score": 0,
      "is_sample": false
    }
  ],
  "summary": {
    "total_cases": 3,
    "passed_cases": 1,
    "total_score": 30,
    "earned_score": 10
  }
}
```

### 3.2 修改现有表

#### 3.2.1 question_drafts 表增加编程题字段

```sql
-- 为 question_drafts 表添加编程题相关字段
ALTER TABLE question_drafts ADD COLUMN IF NOT EXISTS
    code_template TEXT;                      -- 代码模板 (预填充给学生的代码框架)

ALTER TABLE question_drafts ADD COLUMN IF NOT EXISTS
    time_limit INTEGER DEFAULT 1000;         -- 默认时间限制 (毫秒)

ALTER TABLE question_drafts ADD COLUMN IF NOT EXISTS
    memory_limit INTEGER DEFAULT 256;        -- 默认内存限制 (MB)

ALTER TABLE question_drafts ADD COLUMN IF NOT EXISTS
    judge_mode VARCHAR(20) DEFAULT 'standard'; -- 判题模式: standard(标准), special(特判)

ALTER TABLE question_drafts ADD COLUMN IF NOT EXISTS
    special_judge_code TEXT;                 -- 特判程序代码 (judge_mode='special'时使用)

COMMENT ON COLUMN question_drafts.code_template IS '编程题代码模板，预填充给学生';
COMMENT ON COLUMN question_drafts.time_limit IS '默认时间限制(毫秒)';
COMMENT ON COLUMN question_drafts.memory_limit IS '默认内存限制(MB)';
COMMENT ON COLUMN question_drafts.judge_mode IS '判题模式: standard-标准比对, special-特判程序';
```

---

## 4. 判题服务详细设计

### 4.1 判题状态定义

| 状态码 | 英文名 | 中文名 | 说明 |
|--------|--------|--------|------|
| `pending` | Pending | 等待判题 | 已入队，等待判题机处理 |
| `judging` | Judging | 判题中 | 正在编译或执行 |
| `accepted` | Accepted | 通过 | 所有测试点全部正确 (AC) |
| `wrong_answer` | Wrong Answer | 答案错误 | 输出与预期不符 (WA) |
| `compile_error` | Compile Error | 编译错误 | 代码编译失败 (CE) |
| `runtime_error` | Runtime Error | 运行错误 | 程序崩溃、段错误等 (RE) |
| `time_limit` | Time Limit Exceeded | 超时 | 运行时间超过限制 (TLE) |
| `memory_limit` | Memory Limit Exceeded | 内存超限 | 内存使用超过限制 (MLE) |
| `output_limit` | Output Limit Exceeded | 输出超限 | 输出内容过多 (OLE) |
| `system_error` | System Error | 系统错误 | 判题系统内部错误 |
| `partial` | Partial Accepted | 部分通过 | 部分测试点正确 |

### 4.2 安全措施

#### 4.2.1 代码预检查 (提交前)

```javascript
// 危险函数/关键字黑名单
const BLACKLIST = {
  cpp: [
    'system',           // 系统调用
    'exec',             // 执行命令
    'fork',             // 创建进程
    'popen',            // 管道执行
    '__asm__',          // 内联汇编
    'asm',              // 汇编
    '#include <unistd.h>',  // Unix系统调用
    '#include <sys/',   // 系统头文件
    'socket',           // 网络
    'connect',          // 网络连接
    'bind',             // 端口绑定
    'listen',           // 监听
    'accept',           // 接受连接
  ]
};

// 代码长度限制
const MAX_CODE_LENGTH = 65536; // 64KB
```

#### 4.2.2 Docker容器安全配置

```yaml
# 沙箱容器安全配置
security_opts:
  - no-new-privileges:true      # 禁止提权
  - seccomp:unconfined          # 或使用自定义seccomp配置

cap_drop:
  - ALL                         # 移除所有capabilities

cap_add:
  - SETUID                      # 仅保留必要的
  - SETGID

read_only: true                 # 只读文件系统
network_mode: none              # 禁用网络
pids_limit: 64                  # 限制进程数
```

#### 4.2.3 资源限制

```javascript
const RESOURCE_LIMITS = {
  // 时间限制
  compile_timeout: 10000,       // 编译超时 10秒
  run_timeout: 2000,            // 默认运行超时 2秒 (可由题目配置)

  // 内存限制
  memory_limit: 256 * 1024,     // 默认 256MB (KB)

  // 输出限制
  output_limit: 64 * 1024,      // 输出限制 64KB

  // CPU限制
  cpu_quota: 100000,            // CPU配额 (100%)
  cpu_period: 100000,

  // 磁盘限制
  disk_limit: 64 * 1024 * 1024, // 64MB临时空间
};
```

### 4.3 输出比对策略

#### 4.3.1 标准模式 (Standard)

```javascript
/**
 * 标准输出比对
 * 1. 去除末尾空白
 * 2. 统一换行符
 * 3. 逐行比对
 */
function standardCompare(expected, actual) {
  // 预处理
  const normalize = (str) => {
    return str
      .replace(/\r\n/g, '\n')     // 统一换行符
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => line.trimEnd()) // 去除行末空白
      .join('\n')
      .trimEnd();                  // 去除末尾空行
  };

  return normalize(expected) === normalize(actual);
}
```

#### 4.3.2 特判模式 (Special Judge)

对于有多个正确答案的题目（如求最短路径），支持自定义特判程序：

```cpp
// special_judge.cpp 示例
// 参数: input_file output_file answer_file
// 返回: 0=AC, 1=WA, 2=PE(格式错误)

#include <fstream>
using namespace std;

int main(int argc, char* argv[]) {
    ifstream fin(argv[1]);   // 输入文件
    ifstream fout(argv[2]);  // 用户输出
    ifstream fans(argv[3]);  // 标准答案

    // 自定义比对逻辑
    int user_ans, std_ans;
    fout >> user_ans;
    fans >> std_ans;

    if (user_ans == std_ans) {
        return 0;  // Accepted
    }
    return 1;      // Wrong Answer
}
```

---

## 5. API 接口设计

### 5.1 提交代码

```
POST /api/judge/submit
```

**请求体:**
```json
{
  "student_activity_id": 123,
  "question_id": 456,
  "source_code": "#include <iostream>\nusing namespace std;\nint main() {...}",
  "language": "cpp"
}
```

**响应:**
```json
{
  "success": true,
  "submission_id": 789,
  "message": "代码已提交，正在判题中"
}
```

### 5.2 查询判题结果

```
GET /api/judge/result/:submission_id
```

**响应:**
```json
{
  "success": true,
  "submission": {
    "id": 789,
    "status": "accepted",
    "score": 100,
    "total_score": 100,
    "time_used": 45,
    "memory_used": 2048,
    "judge_result": {
      "test_cases": [
        {
          "case_number": 1,
          "status": "accepted",
          "time_used": 15,
          "memory_used": 1024,
          "score": 50,
          "is_sample": true
        },
        {
          "case_number": 2,
          "status": "accepted",
          "time_used": 30,
          "memory_used": 2048,
          "score": 50,
          "is_sample": false
        }
      ]
    },
    "submitted_at": "2025-12-08T10:30:00Z",
    "judged_at": "2025-12-08T10:30:05Z"
  }
}
```

### 5.3 获取测试用例 (样例)

```
GET /api/judge/samples/:question_id
```

**响应:**
```json
{
  "success": true,
  "samples": [
    {
      "case_number": 1,
      "input": "5\n1 2 3 4 5",
      "output": "15",
      "description": "基础测试：5个数求和"
    }
  ]
}
```

### 5.4 教师：管理测试用例

```
POST /api/judge/test-cases/:question_id
```

**请求体:**
```json
{
  "test_cases": [
    {
      "case_number": 1,
      "input_data": "5\n1 2 3 4 5",
      "expected_output": "15",
      "score": 20,
      "time_limit": 1000,
      "memory_limit": 256,
      "is_sample": true,
      "description": "基础测试"
    },
    {
      "case_number": 2,
      "input_data": "3\n100 200 300",
      "expected_output": "600",
      "score": 30,
      "is_sample": false,
      "description": "大数测试"
    }
  ]
}
```

### 5.5 WebSocket 实时推送

```javascript
// 连接 WebSocket
const ws = new WebSocket('ws://localhost:3001/ws/judge');

// 订阅判题结果
ws.send(JSON.stringify({
  type: 'subscribe',
  submission_id: 789
}));

// 接收更新
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data = { type: 'status_update', submission_id: 789, status: 'judging', ... }
};
```

---

## 6. Docker 沙箱设计

### 6.1 判题镜像 Dockerfile

```dockerfile
# judge-sandbox/Dockerfile
FROM alpine:3.19

# 安装编译器和运行时
RUN apk add --no-cache \
    g++ \
    gcc \
    libc-dev \
    libstdc++ \
    make \
    && rm -rf /var/cache/apk/*

# 创建判题用户 (非root)
RUN addgroup -S judge && adduser -S judge -G judge

# 创建工作目录
RUN mkdir -p /workspace /tmp/judge && \
    chown -R judge:judge /workspace /tmp/judge

# 设置工作目录
WORKDIR /workspace

# 默认使用判题用户
USER judge

# 默认命令
CMD ["sh"]
```

### 6.2 判题服务 Dockerfile

```dockerfile
# judge-service/Dockerfile
FROM node:18-alpine

# 安装 Docker CLI (用于控制沙箱容器)
RUN apk add --no-cache docker-cli

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3002

CMD ["node", "src/index.js"]
```

### 6.3 docker-compose 配置

```yaml
# 添加到 docker-compose.yml
services:
  # ... 现有服务 ...

  # 判题服务
  judge-service:
    build:
      context: ./judge-service
      dockerfile: Dockerfile
    container_name: guiyang_oj_judge
    ports:
      - "3002:3002"
    environment:
      NODE_ENV: production
      REDIS_HOST: redis
      REDIS_PORT: 6379
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: guiyang_oj
      DB_USER: postgres
      DB_PASSWORD: postgres123
      # 沙箱配置
      SANDBOX_IMAGE: guiyang_oj_sandbox:latest
      COMPILE_TIMEOUT: 10000
      RUN_TIMEOUT: 2000
      MEMORY_LIMIT: 262144
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # Docker-in-Docker
      - judge_workspace:/workspace
    depends_on:
      - postgres
      - redis
    networks:
      - guiyang_network
    # 重启策略
    restart: unless-stopped
    # 资源限制
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  # 判题沙箱基础镜像 (构建时使用)
  judge-sandbox:
    build:
      context: ./judge-sandbox
      dockerfile: Dockerfile
    image: guiyang_oj_sandbox:latest
    # 这个服务仅用于构建镜像，不需要常驻运行
    profiles:
      - build

volumes:
  # ... 现有 volumes ...
  judge_workspace:
```

---

## 7. 前端集成

### 7.1 Monaco Editor 集成

#### 7.1.1 安装依赖

```bash
cd frontend
npm install @monaco-editor/react
```

#### 7.1.2 代码编辑器组件

```tsx
// frontend/src/components/CodeEditor.tsx
import React, { useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'cpp',
  readOnly = false,
  height = '400px'
}) => {
  const editorRef = useRef(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // 配置 C++ 语言
    monaco.languages.setLanguageConfiguration('cpp', {
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ]
    });
  };

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      onChange={(val) => onChange(val || '')}
      onMount={handleEditorDidMount}
      theme="vs-dark"
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        wordWrap: 'off',
        folding: true,
        renderLineHighlight: 'all'
      }}
    />
  );
};

export default CodeEditor;
```

#### 7.1.3 编程题答题组件

```tsx
// frontend/src/components/questions/CodeQuestionDisplay.tsx
import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Tag, Tabs, Alert, Spin, Progress, message } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import CodeEditor from '../CodeEditor';
import api from '../../services/api';

interface TestCase {
  case_number: number;
  input: string;
  output: string;
  description?: string;
}

interface JudgeResult {
  status: string;
  score: number;
  total_score: number;
  time_used: number;
  memory_used: number;
  judge_result: {
    test_cases: Array<{
      case_number: number;
      status: string;
      time_used: number;
      memory_used: number;
      score: number;
    }>;
  };
}

interface CodeQuestionDisplayProps {
  question: {
    id: number;
    content: string;
    code_template?: string;
    time_limit?: number;
    memory_limit?: number;
  };
  studentActivityId: number;
  onSubmit?: (result: JudgeResult) => void;
}

const CodeQuestionDisplay: React.FC<CodeQuestionDisplayProps> = ({
  question,
  studentActivityId,
  onSubmit
}) => {
  const [code, setCode] = useState(question.code_template || defaultCppTemplate);
  const [samples, setSamples] = useState<TestCase[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [pollingId, setPollingId] = useState<number | null>(null);

  // 获取样例
  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const res = await api.get(`/judge/samples/${question.id}`);
        setSamples(res.data.samples || []);
      } catch (err) {
        console.error('获取样例失败', err);
      }
    };
    fetchSamples();
  }, [question.id]);

  // 提交代码
  const handleSubmit = async () => {
    if (!code.trim()) {
      message.warning('请输入代码');
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const res = await api.post('/judge/submit', {
        student_activity_id: studentActivityId,
        question_id: question.id,
        source_code: code,
        language: 'cpp'
      });

      const submissionId = res.data.submission_id;

      // 轮询获取结果
      pollResult(submissionId);
    } catch (err) {
      message.error('提交失败');
      setSubmitting(false);
    }
  };

  // 轮询判题结果
  const pollResult = async (submissionId: number) => {
    const poll = async () => {
      try {
        const res = await api.get(`/judge/result/${submissionId}`);
        const submission = res.data.submission;

        if (['pending', 'judging'].includes(submission.status)) {
          // 继续轮询
          setTimeout(poll, 1000);
        } else {
          // 判题完成
          setResult(submission);
          setSubmitting(false);
          onSubmit?.(submission);
        }
      } catch (err) {
        setSubmitting(false);
        message.error('获取结果失败');
      }
    };

    poll();
  };

  // 状态标签
  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      accepted: { color: 'success', text: 'AC 通过' },
      wrong_answer: { color: 'error', text: 'WA 答案错误' },
      compile_error: { color: 'warning', text: 'CE 编译错误' },
      runtime_error: { color: 'error', text: 'RE 运行错误' },
      time_limit: { color: 'orange', text: 'TLE 超时' },
      memory_limit: { color: 'orange', text: 'MLE 内存超限' },
      partial: { color: 'processing', text: '部分通过' }
    };
    const info = statusMap[status] || { color: 'default', text: status };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  return (
    <div className="code-question">
      {/* 题目信息 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Tag>时间限制: {question.time_limit || 1000}ms</Tag>
          <Tag>内存限制: {question.memory_limit || 256}MB</Tag>
        </Space>
      </Card>

      {/* 样例展示 */}
      {samples.length > 0 && (
        <Card title="样例" size="small" style={{ marginBottom: 16 }}>
          <Tabs
            items={samples.map((sample, idx) => ({
              key: String(idx),
              label: `样例 ${idx + 1}`,
              children: (
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>输入:</strong>
                    <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                      {sample.input}
                    </pre>
                  </div>
                  <div>
                    <strong>输出:</strong>
                    <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                      {sample.output}
                    </pre>
                  </div>
                  {sample.description && (
                    <div style={{ color: '#666', marginTop: 8 }}>
                      说明: {sample.description}
                    </div>
                  )}
                </div>
              )
            }))}
          />
        </Card>
      )}

      {/* 代码编辑器 */}
      <Card
        title="代码编辑"
        size="small"
        style={{ marginBottom: 16 }}
        extra={
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={submitting}
            onClick={handleSubmit}
          >
            {submitting ? '判题中...' : '提交运行'}
          </Button>
        }
      >
        <CodeEditor
          value={code}
          onChange={setCode}
          language="cpp"
          height="350px"
        />
      </Card>

      {/* 判题结果 */}
      {submitting && (
        <Card size="small">
          <Spin tip="正在判题中...">
            <div style={{ padding: 40, textAlign: 'center' }} />
          </Spin>
        </Card>
      )}

      {result && (
        <Card title="判题结果" size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Space>
                {getStatusTag(result.status)}
                <span>得分: {result.score} / {result.total_score}</span>
                <span>用时: {result.time_used}ms</span>
                <span>内存: {Math.round(result.memory_used / 1024)}MB</span>
              </Space>
            </div>

            {/* 测试点详情 */}
            {result.judge_result?.test_cases && (
              <div style={{ marginTop: 16 }}>
                <strong>测试点详情:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {result.judge_result.test_cases.map((tc) => (
                    <Tag
                      key={tc.case_number}
                      color={tc.status === 'accepted' ? 'success' : 'error'}
                      icon={tc.status === 'accepted' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                    >
                      #{tc.case_number} {tc.score}分 {tc.time_used}ms
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {/* 编译错误信息 */}
            {result.status === 'compile_error' && result.compile_output && (
              <Alert
                type="error"
                message="编译错误"
                description={
                  <pre style={{ maxHeight: 200, overflow: 'auto', margin: 0 }}>
                    {result.compile_output}
                  </pre>
                }
              />
            )}
          </Space>
        </Card>
      )}
    </div>
  );
};

// 默认 C++ 模板
const defaultCppTemplate = `#include <iostream>
using namespace std;

int main() {
    // 在这里编写你的代码

    return 0;
}
`;

export default CodeQuestionDisplay;
```

---

## 8. 判题服务核心代码

### 8.1 目录结构

```
judge-service/
├── src/
│   ├── index.js              # 入口文件
│   ├── config.js             # 配置
│   ├── queue/
│   │   └── consumer.js       # Redis队列消费者
│   ├── judge/
│   │   ├── JudgeService.js   # 判题主服务
│   │   ├── Compiler.js       # 编译模块
│   │   ├── Executor.js       # 执行模块
│   │   └── Checker.js        # 结果比对模块
│   ├── sandbox/
│   │   └── DockerSandbox.js  # Docker沙箱封装
│   └── utils/
│       └── logger.js         # 日志
├── Dockerfile
└── package.json
```

### 8.2 JudgeService 核心逻辑

```javascript
// judge-service/src/judge/JudgeService.js
const DockerSandbox = require('../sandbox/DockerSandbox');
const Compiler = require('./Compiler');
const Executor = require('./Executor');
const Checker = require('./Checker');
const logger = require('../utils/logger');

class JudgeService {
  constructor(config) {
    this.config = config;
    this.sandbox = new DockerSandbox(config);
  }

  /**
   * 执行判题
   * @param {Object} submission - 提交记录
   * @param {Array} testCases - 测试用例
   * @returns {Object} 判题结果
   */
  async judge(submission, testCases) {
    const startTime = Date.now();
    const result = {
      status: 'accepted',
      score: 0,
      total_score: 0,
      time_used: 0,
      memory_used: 0,
      compile_output: null,
      test_cases: []
    };

    try {
      // 1. 创建沙箱容器
      const containerId = await this.sandbox.create();
      logger.info(`Created sandbox container: ${containerId}`);

      try {
        // 2. 写入源代码
        await this.sandbox.writeFile(containerId, 'main.cpp', submission.source_code);

        // 3. 编译
        const compileResult = await Compiler.compile(this.sandbox, containerId, {
          timeout: this.config.compile_timeout || 10000
        });

        if (!compileResult.success) {
          result.status = 'compile_error';
          result.compile_output = compileResult.output;
          return result;
        }

        // 4. 运行每个测试点
        for (const testCase of testCases) {
          result.total_score += testCase.score;

          const tcResult = await this.runTestCase(
            containerId,
            testCase,
            submission.time_limit || this.config.run_timeout,
            submission.memory_limit || this.config.memory_limit
          );

          result.test_cases.push(tcResult);

          // 更新统计
          result.score += tcResult.score;
          result.time_used = Math.max(result.time_used, tcResult.time_used);
          result.memory_used = Math.max(result.memory_used, tcResult.memory_used);

          // 更新整体状态
          if (tcResult.status !== 'accepted' && result.status === 'accepted') {
            result.status = tcResult.status;
          }
        }

        // 判断是否部分通过
        if (result.score > 0 && result.score < result.total_score) {
          result.status = 'partial';
        }

      } finally {
        // 5. 清理沙箱
        await this.sandbox.destroy(containerId);
        logger.info(`Destroyed sandbox container: ${containerId}`);
      }

    } catch (error) {
      logger.error('Judge error:', error);
      result.status = 'system_error';
      result.error_message = error.message;
    }

    result.judge_time = Date.now() - startTime;
    return result;
  }

  /**
   * 运行单个测试点
   */
  async runTestCase(containerId, testCase, timeLimit, memoryLimit) {
    const result = {
      case_number: testCase.case_number,
      status: 'accepted',
      time_used: 0,
      memory_used: 0,
      score: 0,
      is_sample: testCase.is_sample
    };

    try {
      // 执行程序
      const execResult = await Executor.run(this.sandbox, containerId, {
        input: testCase.input_data,
        timeout: testCase.time_limit || timeLimit,
        memory_limit: testCase.memory_limit || memoryLimit
      });

      result.time_used = execResult.time_used;
      result.memory_used = execResult.memory_used;

      // 判断执行状态
      if (execResult.timeout) {
        result.status = 'time_limit';
      } else if (execResult.memory_exceeded) {
        result.status = 'memory_limit';
      } else if (execResult.exit_code !== 0) {
        result.status = 'runtime_error';
      } else {
        // 比对输出
        const checkResult = Checker.standardCheck(
          testCase.expected_output,
          execResult.output
        );

        if (checkResult.correct) {
          result.status = 'accepted';
          result.score = testCase.score;
        } else {
          result.status = 'wrong_answer';
          // 对于样例，可以返回预期/实际输出的预览
          if (testCase.is_sample) {
            result.expected_output_preview = testCase.expected_output.substring(0, 100);
            result.actual_output_preview = execResult.output.substring(0, 100);
          }
        }
      }

    } catch (error) {
      logger.error(`Test case ${testCase.case_number} error:`, error);
      result.status = 'system_error';
    }

    return result;
  }
}

module.exports = JudgeService;
```

### 8.3 Docker沙箱封装

```javascript
// judge-service/src/sandbox/DockerSandbox.js
const Docker = require('dockerode');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class DockerSandbox {
  constructor(config) {
    this.docker = new Docker();
    this.image = config.sandbox_image || 'guiyang_oj_sandbox:latest';
    this.config = config;
  }

  /**
   * 创建沙箱容器
   */
  async create() {
    const containerName = `judge_${uuidv4().substring(0, 8)}`;

    const container = await this.docker.createContainer({
      Image: this.image,
      name: containerName,
      Tty: false,
      OpenStdin: true,
      StdinOnce: true,
      NetworkDisabled: true,  // 禁用网络
      HostConfig: {
        Memory: (this.config.memory_limit || 256) * 1024 * 1024, // 内存限制
        MemorySwap: (this.config.memory_limit || 256) * 1024 * 1024, // 禁用swap
        CpuQuota: 100000,
        CpuPeriod: 100000,
        PidsLimit: 64,        // 进程数限制
        ReadonlyRootfs: false, // 需要写入代码，不能只读
        SecurityOpt: ['no-new-privileges'],
        CapDrop: ['ALL'],
        CapAdd: ['SETUID', 'SETGID'],
        // 临时文件系统
        Tmpfs: {
          '/tmp': 'rw,noexec,nosuid,size=64m'
        }
      },
      WorkingDir: '/workspace',
      User: 'judge'
    });

    await container.start();
    return container.id;
  }

  /**
   * 销毁容器
   */
  async destroy(containerId) {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: 1 }).catch(() => {});
      await container.remove({ force: true });
    } catch (error) {
      logger.error(`Failed to destroy container ${containerId}:`, error);
    }
  }

  /**
   * 写入文件到容器
   */
  async writeFile(containerId, filename, content) {
    const container = this.docker.getContainer(containerId);

    // 使用 exec 写入文件
    const exec = await container.exec({
      Cmd: ['sh', '-c', `cat > /workspace/${filename}`],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true
    });

    return new Promise((resolve, reject) => {
      exec.start({ hijack: true, stdin: true }, (err, stream) => {
        if (err) return reject(err);

        stream.write(content);
        stream.end();

        let output = '';
        stream.on('data', (chunk) => {
          output += chunk.toString();
        });
        stream.on('end', () => resolve(output));
        stream.on('error', reject);
      });
    });
  }

  /**
   * 在容器中执行命令
   */
  async exec(containerId, cmd, options = {}) {
    const container = this.docker.getContainer(containerId);
    const { timeout = 10000, input = '' } = options;

    const exec = await container.exec({
      Cmd: cmd,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true
    });

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // 超时控制
      const timer = setTimeout(() => {
        timedOut = true;
        // 强制停止
        exec.inspect().then(info => {
          if (info.Running) {
            container.kill({ signal: 'SIGKILL' }).catch(() => {});
          }
        });
      }, timeout);

      exec.start({ hijack: true, stdin: true }, (err, stream) => {
        if (err) {
          clearTimeout(timer);
          return reject(err);
        }

        // 发送输入
        if (input) {
          stream.write(input);
        }
        stream.end();

        // Docker 的 multiplexed stream 需要解析
        container.modem.demuxStream(stream,
          { write: (chunk) => stdout += chunk.toString() },
          { write: (chunk) => stderr += chunk.toString() }
        );

        stream.on('end', async () => {
          clearTimeout(timer);

          const execInfo = await exec.inspect();
          const timeUsed = Date.now() - startTime;

          resolve({
            stdout,
            stderr,
            exit_code: execInfo.ExitCode,
            time_used: timeUsed,
            timeout: timedOut
          });
        });

        stream.on('error', (error) => {
          clearTimeout(timer);
          reject(error);
        });
      });
    });
  }
}

module.exports = DockerSandbox;
```

---

## 9. 部署清单

### 9.1 构建判题镜像

```bash
# 1. 构建沙箱基础镜像
docker build -t guiyang_oj_sandbox:latest ./judge-sandbox/

# 2. 构建判题服务镜像
docker build -t guiyang_oj_judge:latest ./judge-service/

# 3. 启动所有服务
docker-compose up -d
```

### 9.2 数据库迁移

```bash
# 执行迁移脚本
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/migrations/031_judge_system.sql
```

### 9.3 验证服务

```bash
# 检查判题服务健康状态
curl http://localhost:3002/health

# 查看服务日志
docker-compose logs -f judge-service
```

---

## 10. 安全考量

### 10.1 已实现的安全措施

| 安全措施 | 实现方式 | 说明 |
|---------|---------|------|
| 代码预检查 | 黑名单关键字过滤 | 阻止系统调用、网络操作等 |
| 进程隔离 | Docker容器 | 每次判题使用独立容器 |
| 网络隔离 | `network_mode: none` | 容器无法访问网络 |
| 资源限制 | cgroups | CPU、内存、进程数限制 |
| 权限限制 | `no-new-privileges` | 禁止容器内提权 |
| 用户隔离 | 非root用户运行 | 使用专用judge用户 |
| 文件系统 | tmpfs + 限制大小 | 限制磁盘写入 |
| 超时控制 | 编译10s/运行2s | 防止死循环 |

### 10.2 建议的额外措施

1. **seccomp配置**: 限制系统调用白名单
2. **AppArmor/SELinux**: 额外的MAC安全策略
3. **资源配额**: 使用独立的判题服务器，与主服务隔离
4. **日志审计**: 记录所有判题请求和异常
5. **频率限制**: 限制每个用户的提交频率

---

## 11. 后续扩展

### 11.1 支持更多语言

```javascript
// 语言配置示例
const LANGUAGES = {
  cpp: {
    image: 'guiyang_oj_sandbox:cpp',
    compile: 'g++ -O2 -std=c++17 -o main main.cpp',
    run: './main',
    source_file: 'main.cpp',
    compile_timeout: 10000
  },
  python: {
    image: 'guiyang_oj_sandbox:python',
    compile: null,  // 解释型语言无需编译
    run: 'python3 main.py',
    source_file: 'main.py',
    compile_timeout: 0
  },
  java: {
    image: 'guiyang_oj_sandbox:java',
    compile: 'javac Main.java',
    run: 'java -Xmx256m Main',
    source_file: 'Main.java',
    compile_timeout: 30000
  }
};
```

### 11.2 支持交互题

对于需要多次交互的题目（如猜数字），可扩展为支持双向通信的判题模式。

### 11.3 支持提交记录展示

- 提交历史列表
- 代码对比（和正确答案对比）
- 排行榜（按通过数/提交时间排序）

---

## 12. 参考资料

- [Judge0 - Open Source Online Code Execution System](https://github.com/judge0/judge0)
- [HOJ - 基于微服务的OJ系统](https://docs.hdoi.cn/)
- [洛谷 - 国内知名OJ平台](https://www.luogu.com.cn/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Monaco Editor React](https://github.com/suren-atoyan/monaco-react)

---

## 13. 实现状态

### 13.1 已完成功能

- [x] 数据库迁移 (031_judge_system.sql)
  - test_cases 表
  - code_submissions 表
  - judge_queue 表
  - question_drafts 扩展字段
- [x] 判题服务核心实现 (judge-service/)
  - Docker 沙箱模块
  - 编译模块 (C/C++)
  - 执行模块
  - 输出比较模块
  - Redis 消息队列
  - REST API 接口
- [x] Docker 配置
  - 沙箱镜像 (guiyang_oj_sandbox)
  - judge-service 容器
  - docker-compose 配置
- [x] 测试数据 (database/test_data/code_questions.sql)
  - 6 道编程题
  - 32 个测试用例

### 13.2 待实现功能

- [ ] 前端代码编辑器 (Monaco Editor)
- [ ] 后端 API 集成 (backend/routes)
- [ ] 实时判题状态推送 (WebSocket)
- [ ] 提交历史和排行榜

---

**文档版本**: v1.1
**创建日期**: 2025-12-08
**更新日期**: 2025-12-08
**作者**: Claude Code
**状态**: 后端实现完成
