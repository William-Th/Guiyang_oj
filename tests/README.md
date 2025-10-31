# Tests 目录结构说明

本文档提供 `tests/` 目录的结构概览和文件说明。

> 📖 **详细的测试指南请查看**: [tests/docs/测试指南.md](docs/测试指南.md)

---

## 📁 目录结构

```
tests/
├── README.md                           # 本文档 - 目录结构说明
├── playwright.config.ts                # Playwright主配置文件
│
├── .auth/                              # 认证状态文件（自动生成）
│   ├── user.json                       # 学生用户认证状态
│   └── teacher.json                    # 教师/管理员认证状态
│
├── api/                                # API测试目录
│   ├── smoke-test.js                   # API冒烟测试 - 9个核心API快速验证
│   ├── test-admin-api.js               # 管理员API完整测试
│   ├── test-admin-simple.js            # 管理员API简化测试（独立版）
│   ├── test-admin.sh                   # 管理员测试脚本（后端Shell）
│   ├── test-admin-inside-docker.sh     # Docker容器内测试脚本
│   ├── exam-api-test.js                # 考试API功能测试
│   ├── exam-submit-flow-test.js        # 考试提交流程测试
│   └── question-bank-api-test.js       # 题库API功能测试
│
├── e2e/                                # E2E测试目录（Playwright）
│   ├── auth.setup.ts                   # 全局认证设置 - 登录状态准备
│   ├── test-config.ts                  # 测试配置常量 - 账号、超时、选择器等
│   │
│   ├── smoke/                          # 冒烟测试
│   │   └── smoke.spec.ts               # E2E冒烟测试 - 6个核心功能验证
│   │
│   ├── regression/                     # 回归测试
│   │   ├── auth.spec.ts                # 认证模块 (R001-R007)
│   │   ├── student-features.spec.ts    # 学生功能 (R101-R105)
│   │   ├── admin-features.spec.ts      # 管理员功能 (R201-R205)
│   │   ├── question-bank-creation.spec.ts  # 题库创建 (R301-R310)
│   │   └── question-bank-workflow.spec.ts  # 题库草稿箱与审核流程 (R401-R410)
│   │
│   ├── basic-ui.spec.ts                # 基础UI元素测试
│   ├── login.spec.ts                   # 登录功能详细测试
│   ├── student-flow.spec.ts            # 学生完整业务流程测试
│   ├── admin-flow.spec.ts              # 管理员完整业务流程测试
│   ├── certificate-verification.spec.ts # 证书验证功能测试
│   ├── ui-components.spec.ts           # UI组件专项测试
│   │
│   └── utils/                          # 测试工具
│       └── test-helpers.ts             # 测试辅助函数
│
├── docs/                               # 测试文档目录
│   ├── 测试指南.md                      # ⭐ 主要测试文档 - 测试指南和最佳实践
│   ├── E2E测试用例文档.csv              # 测试用例追踪表 - 41个测试用例详情
│   ├── smoke-test-guide.md             # 冒烟测试详细指南
│   ├── smoke-test-tracking.csv         # 冒烟测试追踪表
│   ├── regression-test-tracking.csv    # 回归测试追踪表
│   ├── regression-test-tracking-update.md  # 回归测试更新说明
│   ├── workflow-test-summary.md        # 工作流测试总结
│   ├── workflow-tests-to-add.csv       # 待添加的工作流测试
│   ├── workflow-tracking-to-add.csv    # 工作流测试追踪
│   ├── 测试脚本最佳实践.md              # 测试编写最佳实践
│   ├── 测试问题最终分析_20251019.md    # 测试问题分析报告
│   └── 测试最终报告_20251019.md        # 测试执行报告
│
└── test-results/                       # 测试结果目录（自动生成，.gitignore）
    ├── html/                           # HTML测试报告
    │   └── index.html                  # 报告入口文件
    ├── artifacts/                      # 测试artifacts（截图、视频、trace）
    │   └── [test-name]/                # 各测试的artifacts
    └── results.json                    # JSON格式测试结果
```

---

## 📄 主要文件说明

### 配置文件

| 文件 | 说明 |
|------|------|
| `playwright.config.ts` | Playwright主配置：测试目录、报告输出、浏览器设置、超时配置等 |
| `e2e/test-config.ts` | 测试常量配置：测试账号、超时时间、常用选择器、API地址等 |
| `e2e/auth.setup.ts` | 全局认证设置：为测试预先生成登录状态，避免每个测试重复登录 |

### 测试文件

#### API测试 (`api/`)
| 文件 | 测试内容 | 用途 |
|------|----------|------|
| `smoke-test.js` | 9个核心API | 快速健康检查，部署后验证 |
| `test-admin-api.js` | 管理员功能API | 完整的管理员功能测试 |
| `exam-api-test.js` | 考试相关API | 考试CRUD、提交、评分等 |
| `question-bank-api-test.js` | 题库相关API | 题目CRUD、分类、检索等 |

#### E2E测试 (`e2e/`)

**冒烟测试** (`smoke/`)
- `smoke.spec.ts`: 6个核心E2E测试，快速验证系统基本功能

**回归测试** (`regression/`)
| 文件 | 测试模块 | 测试用例编号 |
|------|----------|-------------|
| `auth.spec.ts` | 认证模块 | R001-R007 (7个) |
| `student-features.spec.ts` | 学生功能 | R101-R105 (5个) |
| `admin-features.spec.ts` | 管理员功能 | R201-R205 (5个) |
| `question-bank-creation.spec.ts` | 题库创建 | R301-R310 (10个) |
| `question-bank-workflow.spec.ts` | 题库草稿箱与审核 | R401-R410 (10个) |

**其他测试**
| 文件 | 说明 |
|------|------|
| `basic-ui.spec.ts` | 基础UI元素和布局测试 |
| `login.spec.ts` | 登录功能的详细测试 |
| `student-flow.spec.ts` | 学生端完整业务流程 |
| `admin-flow.spec.ts` | 管理员端完整业务流程 |
| `certificate-verification.spec.ts` | 证书生成和验证功能 |
| `ui-components.spec.ts` | UI组件专项测试 |

### 文档文件 (`docs/`)

| 文件 | 说明 |
|------|------|
| **测试指南.md** | ⭐ 主要文档：测试概述、运行方法、配置说明、最佳实践、故障排除 |
| **E2E测试用例文档.csv** | 所有测试用例的详细信息：步骤、验证点、状态（41个测试用例） |
| **smoke-test-guide.md** | 冒烟测试的详细指南和使用说明 |
| **regression-test-tracking.csv** | 回归测试用例追踪和状态 |
| **测试脚本最佳实践.md** | 测试编写规范、技巧和注意事项 |

---

## 🚀 快速开始

```bash
# 运行冒烟测试（推荐首选）
node tests/api/smoke-test.js
npx playwright test tests/e2e/smoke/ -c tests/playwright.config.ts

# 运行所有E2E测试
npx playwright test -c tests/playwright.config.ts

# 查看测试报告
npx playwright show-report tests/test-results/html
```

> 📖 **详细指南**: 完整的测试命令、环境配置、最佳实践等请查看 [测试指南](docs/测试指南.md)

---

## 📊 测试统计

### 测试用例总数：41个

- **冒烟测试** (S001-S006): 6个
- **认证模块** (R001-R007): 7个
- **学生功能** (R101-R105): 5个
- **管理员功能** (R201-R205): 5个
- **题库创建** (R301-R310): 10个
- **题库草稿箱** (R401-R402, R408): 3个
- **题库审核流程** (R403-R407, R409-R410): 7个

### API测试

- **API冒烟测试**: 9个核心API测试
- **完整API测试**: 管理员、考试、题库等模块API

---

## 📝 测试用例编号规范

| 前缀 | 类型 | 示例 | 说明 |
|------|------|------|------|
| **S** | Smoke Tests | S001-S006 | 冒烟测试 - 核心功能快速验证 |
| **R** | Regression Tests | R001-R999 | 回归测试 - 完整功能验证 |
| R0xx | 认证模块 | R001-R007 | 登录、注册、权限验证 |
| R1xx | 学生功能 | R101-R105 | 学生端功能 |
| R2xx | 管理员功能 | R201-R205 | 管理员端功能 |
| R3xx | 题库创建 | R301-R310 | 题目创建和表单 |
| R4xx | 题库工作流 | R401-R410 | 草稿箱、审核流程 |

---

## 🔗 相关文档

### 项目文档
- [CLAUDE.md](../CLAUDE.md) - 开发指南
- [README.md](../README.md) - 项目总览

### 测试文档
- [测试指南](docs/测试指南.md) - ⭐ 主要测试文档
- [冒烟测试指南](docs/smoke-test-guide.md) - 冒烟测试详细说明
- [E2E测试用例文档](docs/E2E测试用例文档.csv) - 所有测试用例详情
- [测试脚本最佳实践](docs/测试脚本最佳实践.md) - 编写规范

---

## 📦 文件类型说明

### 测试文件
- **`.spec.ts`**: Playwright E2E测试文件
- **`.js`**: Node.js API测试文件
- **`.sh`**: Shell脚本测试文件

### 配置文件
- **`playwright.config.ts`**: Playwright配置
- **`test-config.ts`**: 测试常量配置
- **`auth.setup.ts`**: 认证设置

### 文档文件
- **`.md`**: Markdown文档
- **`.csv`**: 测试用例追踪表

### 自动生成文件
- **`.auth/*.json`**: 认证状态（自动生成）
- **`test-results/`**: 测试结果（自动生成，已忽略）

---

**📅 文档最后更新**: 2025-10-20
**📧 支持**: 测试相关问题请查看 [测试指南](docs/测试指南.md) 或相关文档
