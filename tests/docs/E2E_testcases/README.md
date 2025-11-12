# E2E 测试用例文档

本目录包含所有端到端（E2E）测试用例文档，按功能模块进行拆分组织。

**最后更新**: 2025-11-04

---

## 📁 目录结构

| 文档文件 | 功能模块 | 测试用例数量 | 说明 |
|---------|---------|------------|------|
| [authentication-testcases.md](authentication-testcases.md) | 认证功能 (AUT) | 10 | 学生/教师/管理员登录、权限验证 |
| [student-testcases.md](student-testcases.md) | 学生功能 (STU) | 6 | 学生端页面访问、考试列表、成绩查询 |
| [admin-testcases.md](admin-testcases.md) | 管理员功能 (ADM) | 6 | 管理后台、用户管理、考试管理 |
| [hierarchical-permissions-testcases.md](hierarchical-permissions-testcases.md) | 分层权限系统 (PRM/QBC/REV) | 6 | 权限授予、题库创建、审核流程 |
| [questionbank-creation-testcases.md](questionbank-creation-testcases.md) | 题库创建 (QBC) | 10 | 各类题型创建、表单验证 |
| [questionbank-draft-testcases.md](questionbank-draft-testcases.md) | 题库草稿箱 (DFT) | 3 | 草稿管理、编辑、删除 |
| [questionbank-review-testcases.md](questionbank-review-testcases.md) | 题库审核流程 (REV) | 8 | 提交审核、审核批准/拒绝 |
| [activity-testcases.md](activity-testcases.md) | 活动管理 (ACT) | 19 | 练习/测评活动创建、管理、筛选 |
| [time-limit-testcases.md](time-limit-testcases.md) | 时间限制功能 (PTL) | 10 | 时间限制类型测试 |
| [paper-generation-testcases.md](paper-generation-testcases.md) | 组卷功能 (PPG) | 4 | 智能组卷、手动组卷 |

**总计**: 82 个测试用例 (12 个冒烟测试 + 70 个回归测试)

---

## 🔢 测试用例编号规范

### 编号格式

**三位字母 + 三位数字** (例如: AUT001, QBC101, ACT001)

- **三位字母**: 功能模块代码
- **三位数字**: 测试序号
  - **001-099**: 冒烟测试 (Smoke Tests)
  - **101-999**: 回归测试 (Regression Tests)

### 功能模块代码

| 模块代码 | 功能模块 | 英文全称 |
|---------|---------|----------|
| **AUT** | 认证功能 | Authentication |
| **STU** | 学生功能 | Student |
| **ADM** | 管理员功能 | Admin |
| **PRM** | 权限管理 | Permission Management |
| **QBC** | 题库创建 | Question Bank Creation |
| **DFT** | 题库草稿箱 | Draft |
| **REV** | 题库审核流程 | Review |
| **ACT** | 活动管理 | Activity |
| **PTL** | 时间限制功能 | Practice Time Limit |
| **PPG** | 组卷功能 | Paper Generation |
| **CRT** | 证书管理 | Certificate |

### 编号示例

**冒烟测试 (001-099)**:
- AUT001 - 学生登录测试
- AUT002 - 教师登录测试
- AUT003 - 管理员登录测试
- STU001 - 学生首页显示测试
- ADM001 - 管理员首页显示测试
- ACT001 - 教师访问活动管理页面

**回归测试 (101-999)**:
- AUT101 - 学生正确凭证登录
- AUT102 - 学生错误密码登录
- QBC101 - 创建单选题-完整流程
- DFT101 - 草稿箱列表显示
- REV101 - 提交草稿进行审核
- ACT101 - 创建带完整信息的练习活动

---

## 📊 测试用例统计

### 按模块分布

| 模块代码 | 功能模块 | 冒烟测试 | 回归测试 | 总计 |
|---------|---------|---------|---------|------|
| AUT | 认证功能 | 3 | 7 | 10 |
| STU | 学生功能 | 1 | 5 | 6 |
| ADM | 管理员功能 | 1 | 5 | 6 |
| PRM | 权限管理 | 0 | 2 | 2 |
| QBC | 题库创建 | 0 | 12 | 12 |
| DFT | 题库草稿箱 | 0 | 3 | 3 |
| REV | 题库审核流程 | 0 | 10 | 10 |
| ACT | 活动管理 | 6 | 13 | 19 |
| PTL | 时间限制功能 | 0 | 10 | 10 |
| PPG | 组卷功能 | 0 | 4 | 4 |
| **总计** | | **12** | **71** | **83** |

### 测试状态

- ✅ 已通过: 63/63 (100%)
- ❌ 失败: 0
- ⏸️ 待实现: 0

---

## 🔍 如何使用

### 1. 查找测试用例

**按功能模块查找**:
- 需要测试登录功能？查看 [authentication-testcases.md](authentication-testcases.md)
- 需要测试题库创建？查看 [questionbank-creation-testcases.md](questionbank-creation-testcases.md)
- 需要测试活动管理？查看 [activity-testcases.md](activity-testcases.md)

**按测试编号查找**:
- 在任何文档中使用 Ctrl+F 搜索测试编号（如 "AUT101"）

### 2. 运行测试用例

```bash
# 运行特定模块的所有测试
npx playwright test --grep "AUT"     # 认证模块
npx playwright test --grep "QBC"     # 题库创建模块
npx playwright test --grep "ACT"     # 活动管理模块

# 运行特定测试用例
npx playwright test --grep "AUT001"  # 学生登录冒烟测试
npx playwright test --grep "QBC101"  # 创建单选题回归测试

# 运行所有冒烟测试（001-099）
npx playwright test tests/e2e/smoke/

# 运行所有回归测试（101-999）
npx playwright test tests/e2e/regression/
```

### 3. 添加新测试用例

1. **确定功能模块**: 选择合适的模块代码（AUT, STU, QBC 等）
2. **分配测试编号**:
   - 冒烟测试: 使用 001-099 范围
   - 回归测试: 使用 101-999 范围
3. **更新文档**: 在对应的 testcases.md 文件中添加测试用例
4. **更新追踪文档**: 同步更新 `smoke-test-tracking.md` 或 `regression-test-tracking.md`
5. **实现测试**: 在 `tests/e2e/` 目录下编写测试脚本

---

## 📝 相关文档

- **测试追踪**:
  - [冒烟测试追踪](../smoke-test-tracking.md)
  - [回归测试追踪](../regression-test-tracking.md)

- **测试指南**:
  - [完整测试指南](../测试指南.md)
  - [测试脚本最佳实践](../测试脚本最佳实践.md) ⭐ 必读！

- **开发指南**:
  - [CLAUDE.md](../../../CLAUDE.md) - 项目开发指南

---

## 🔄 更新历史

### 2025-11-04 - 分层权限系统测试用例同步 ✨

**新增文档**: [hierarchical-permissions-testcases.md](hierarchical-permissions-testcases.md)

**更新内容**:
1. **新增模块代码**:
   - PRM (Permission Management) - 权限管理
   - PTL (Practice Time Limit) - 时间限制功能
   - PPG (Paper Generation) - 组卷功能

2. **新增测试用例** (6个):
   - PRM101 - 管理员授予市级审核权限
   - PRM102 - 权限隔离验证
   - QBC101 - 教师创建校级题目并直接发布
   - QBC102 - 题库浏览 Scope 筛选
   - REV101 - 教师提交题目审核（市级练习）
   - REV102 - 审核人查看并审核题目

3. **测试统计更新**: 总计从 62 个增加到 82 个测试用例

4. **文档完善**: 详细记录了分层权限系统的测试步骤、预期结果和已知问题

---

### 2025-10-22 - 测试用例文档重构 🎉

**重大更新**: 测试用例编号系统全面升级！

#### 变更内容
1. **新编号系统**: 采用三位字母+三位数字格式（如 AUT001, QBC101）
2. **文档拆分**: 按功能模块拆分测试用例文档
3. **统一组织**: 所有 E2E 测试用例集中到 `E2E_testcases/` 目录
4. **改进追踪**: 更新追踪文档，增加模块代码映射

#### 编号系统对比

**旧编号系统**:
- S001, S002, S003... (冒烟测试)
- R001, R002, R003... (回归测试)
- 难以区分功能模块

**新编号系统**:
- AUT001, AUT002 (认证-冒烟)
- AUT101, AUT102 (认证-回归)
- QBC101, QBC102 (题库创建-回归)
- 清晰的模块归属，易于管理

#### 文档结构对比

**旧结构**:
```
tests/docs/
├── e2e-test-cases.md (巨大的单文件)
├── activity-e2e-tests.md
```

**新结构**:
```
tests/docs/E2E_testcases/
├── authentication-testcases.md
├── student-testcases.md
├── admin-testcases.md
├── questionbank-creation-testcases.md
├── questionbank-draft-testcases.md
├── questionbank-review-testcases.md
├── activity-testcases.md
└── README.md (本文件)
```

---

## 💡 提示

- **测试用例编号全局唯一**: 确保每个测试编号在整个项目中唯一
- **模块代码一致性**: 在测试脚本和文档中使用相同的模块代码
- **及时更新文档**: 添加或修改测试用例后，同步更新文档
- **遵循最佳实践**: 参考 [测试脚本最佳实践](../测试脚本最佳实践.md)

---

*最后更新: 2025-11-04*
*维护人员: 测试团队*
