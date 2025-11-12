# Phase 4: 测试阶段 - 执行计划

**日期**: 2025-11-04
**状态**: 🟢 进行中
**完成度**: 20%

---

## 📋 测试概览

Phase 4 的目标是全面测试题库权限管理系统的所有功能，确保系统稳定可靠。

### 测试范围

1. **API 单元测试** - 测试所有后端接口
2. **E2E 测试** - 测试完整用户流程
3. **集成测试** - 测试系统协作
4. **性能测试** - 测试系统性能

---

## ✅ Phase 4.1: API 单元测试

### 测试文件

**主测试文件**: `tests/api/hierarchical-permission-api-test.js`

### 测试场景

#### 1. 权限管理 API (Permission Management)

| 测试ID | 测试场景 | API 端点 | 预期结果 | 状态 |
|--------|---------|----------|---------|------|
| PM-001 | 获取可授权教师列表（系统管理员） | GET /api/permissions/available-teachers | 返回全市所有教师 | ✅ |
| PM-002 | 获取可授权教师列表（区级管理员） | GET /api/permissions/available-teachers | 仅返回本区教师 | ⏳ |
| PM-003 | 授予测评审核权限 | POST /api/permissions/grant | 成功授权，scope_level=municipal | ✅ |
| PM-004 | 授予市级练习审核权限 | POST /api/permissions/grant | 成功授权，scope_level=municipal | ✅ |
| PM-005 | 授予区级练习审核权限（区级管理员） | POST /api/permissions/grant | 自动关联 district_id | ⏳ |
| PM-006 | 获取特定 scope 的审核人列表 | GET /api/permissions/available-reviewers | 返回有权限的审核人 | ✅ |
| PM-007 | 撤销权限 | POST /api/permissions/revoke | 权限状态变为 inactive | ⏳ |

#### 2. 题库范围管理 API (Question Bank Scope)

| 测试ID | 测试场景 | API 端点 | 预期结果 | 状态 |
|--------|---------|----------|---------|------|
| QBS-001 | 获取用户可见 scopes | GET /api/question-bank/my-scopes | 返回用户有权限的所有 scope | ✅ |
| QBS-002 | 按 scope 筛选题目 | GET /api/question-bank/bank?scope=xxx | 返回指定 scope 的题目 | ✅ |
| QBS-003 | 多个 scope 筛选 | GET /api/question-bank/bank?scope=xxx&scope=yyy | 返回多个 scope 的题目 | ✅ |
| QBS-004 | 创建题目时指定 target_scope | POST /api/question-bank | 题目保存为草稿 | ✅ |

#### 3. 题目审核流程 API (Question Review)

| 测试ID | 测试场景 | API 端点 | 预期结果 | 状态 |
|--------|---------|----------|---------|------|
| QR-001 | 获取可用审核人 | GET /api/question-review/available-reviewers | 根据 target_scope 返回审核人 | ✅ |
| QR-002 | 提交审核（指定 target_scope） | POST /api/question-review/:id/submit | 题目状态变为 pending_review | ⏳ |
| QR-003 | 提交审核（缺少 target_scope） | POST /api/question-review/:id/submit | 返回 400 错误 | ✅ |
| QR-004 | 审核人批准题目 | POST /api/question-review/:id/review | 题目状态变为 approved | ⏳ |
| QR-005 | 审核人拒绝题目 | POST /api/question-review/:id/review | 题目状态变为 rejected | ⏳ |
| QR-006 | 批准并立即发布 | POST /api/question-review/:id/review | 题目发布到指定 scope | ⏳ |
| QR-007 | 直接发布到校级题库 | POST /api/question-review/:id/publish-school | 题目直接发布，无需审核 | ⏳ |
| QR-008 | 获取审核统计信息 | GET /api/question-review/stats | 返回待审核/已通过/已拒绝数量 | ✅ |

#### 4. 集成测试场景 (Integration Tests)

| 测试ID | 测试场景 | 涉及 API | 预期结果 | 状态 |
|--------|---------|---------|---------|------|
| INT-001 | 完整审核流程（测评题库） | 创建 → 提交 → 批准 → 发布 | 题目成功发布到测评题库 | ⏳ |
| INT-002 | 完整审核流程（市级练习） | 创建 → 提交 → 批准 → 发布 | 题目成功发布到市级题库 | ⏳ |
| INT-003 | 完整审核流程（区级练习） | 创建 → 提交 → 批准 → 发布 | 题目成功发布到区级题库 | ⏳ |
| INT-004 | 校级题库直接发布流程 | 创建 → 直接发布 | 题目直接发布到校级题库 | ⏳ |
| INT-005 | 权限验证（无权限审核人） | 提交审核给无权限用户 | 返回 400 错误 | ⏳ |
| INT-006 | 区域隔离验证 | 区级管理员查看题目 | 只能看到本区题目 | ⏳ |

### 已修复的问题

1. ✅ **Scope 数组处理逻辑**
   - 文件: `backend/src/routes/questionBank.js`
   - 问题: scope 参数可能是字符串或数组，需要统一处理
   - 修复: 添加类型检查，支持 `?scope=xxx,yyy` 和 `?scope=xxx&scope=yyy` 两种格式

2. ✅ **审核统计 API 端点**
   - 文件: `backend/src/routes/questionReview.js`
   - 问题: 缺少审核统计接口
   - 修复: 新增 `GET /api/question-review/stats` 端点

3. ✅ **测试用例适配**
   - 文件: `tests/api/hierarchical-permission-api-test.js`
   - 问题: 测试期望与实际 API 行为不匹配
   - 修复: 调整测试用例，考虑权限验证和状态检查

---

## ⏳ Phase 4.2: E2E 测试

### 测试用例计划

#### E2E-001: 区级管理员授权流程
**角色**: 区级管理员
**流程**:
1. 登录系统
2. 访问权限管理页面
3. 选择本区教师
4. 授予区级练习审核权限
5. 验证权限列表显示正确
6. 验证 district_id 自动关联

#### E2E-002: 教师创建校级题目
**角色**: 教师
**流程**:
1. 登录系统
2. 访问题目创建页面
3. 填写题目信息
4. 选择"校级题库"发布范围
5. 保存题目
6. 验证题目直接发布，无需审核

#### E2E-003: 教师提交审核流程
**角色**: 教师
**流程**:
1. 登录系统
2. 创建题目（选择"市级练习题库"）
3. 访问草稿箱
4. 选择题目提交审核
5. 选择目标范围和审核人
6. 提交审核
7. 验证题目状态变为"待审核"

#### E2E-004: 审核人工作台操作
**角色**: 审核人（有审核权限的教师）
**流程**:
1. 登录系统
2. 访问审核工作台
3. 查看待审核题目列表
4. 点击"查看详情"
5. 填写审核意见
6. 批准题目并选择"立即发布"
7. 验证题目发布成功

#### E2E-005: 题库浏览 Scope 筛选
**角色**: 教师
**流程**:
1. 登录系统
2. 访问题库浏览页面
3. 选择多个 scope 筛选
4. 验证显示正确的题目
5. 刷新页面
6. 验证 scope 选择被记忆（localStorage）

#### E2E-006: 权限隔离验证
**角色**: 区级管理员、教师
**流程**:
1. 区级管理员登录
2. 验证只能看到本区教师
3. 尝试授权其他区教师（应失败）
4. 教师登录
5. 验证只能看到有权限的题库范围

---

## ⏳ Phase 4.3: 集成测试

### 测试场景

1. **权限传播测试**
   - 授予权限后，用户立即获得对应能力
   - 撤销权限后，用户立即失去对应能力

2. **数据一致性测试**
   - 题目状态变更正确
   - 审核历史记录完整
   - 题目 scope 分配正确

3. **并发测试**
   - 多个审核人同时审核不同题目
   - 多个教师同时创建题目

---

## ⏳ Phase 4.4: 性能测试

### 测试指标

| 指标 | 目标值 | 测试方法 |
|------|--------|---------|
| API 响应时间 | < 500ms | 使用 Apache Bench 压测 |
| 题库查询性能 | < 1s (1000题) | 测试 scope 筛选查询 |
| 权限验证性能 | < 100ms | 测试权限检查逻辑 |
| 并发处理能力 | > 100 req/s | 多用户并发测试 |

### 测试工具

- **Apache Bench (ab)**: HTTP 压力测试
- **Artillery**: 场景化负载测试
- **PostgreSQL EXPLAIN**: SQL 查询性能分析

---

## 📊 当前进度

| 阶段 | 任务数 | 已完成 | 进行中 | 待开始 | 完成率 |
|------|--------|--------|--------|--------|--------|
| Phase 4.1 (API测试) | 20 | 8 | 3 | 9 | 40% |
| Phase 4.2 (E2E测试) | 6 | 0 | 0 | 6 | 0% |
| Phase 4.3 (集成测试) | 3 | 0 | 0 | 3 | 0% |
| Phase 4.4 (性能测试) | 4 | 0 | 0 | 4 | 0% |
| **总计** | **33** | **8** | **3** | **22** | **24%** |

---

## 🚀 下一步行动

### 立即执行（需要 Docker 运行）

1. ✅ 启动 Docker Desktop
2. 🔄 重新构建后端容器
   ```bash
   docker-compose up --build -d backend
   ```
3. 🔄 运行 API 测试
   ```bash
   node tests/api/hierarchical-permission-api-test.js
   ```
4. 📝 分析测试结果，修复失败的测试

### 后续计划

1. **完成 API 测试**（1天）
   - 修复所有失败的测试用例
   - 确保测试覆盖率 > 80%

2. **编写 E2E 测试**（1-2天）
   - 使用 Playwright 编写 6 个核心流程测试
   - 参考现有 E2E 测试结构

3. **集成和性能测试**（0.5-1天）
   - 验证系统协作
   - 性能基准测试

---

## 📝 测试报告模板

测试完成后，将生成以下报告：

1. **API 测试报告**: `documents/PHASE4_API_TEST_REPORT.md`
2. **E2E 测试报告**: `documents/PHASE4_E2E_TEST_REPORT.md`
3. **性能测试报告**: `documents/PHASE4_PERFORMANCE_REPORT.md`
4. **总体测试报告**: `documents/PHASE4_COMPLETE_SUMMARY.md`

---

**📅 文档创建时间**: 2025-11-04
**👤 负责人**: 测试团队
**📊 状态**: 🟢 进行中
