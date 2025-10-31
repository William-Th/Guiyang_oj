# 测试文档目录

本文件夹包含所有E2E测试的文档和追踪信息。

## 📂 文档结构

### 主要测试文档

| 文档名称 | 说明 | 格式 | 状态 |
|---------|------|------|------|
| **[e2e-test-cases.md](./e2e-test-cases.md)** | 📋 完整E2E测试用例文档 | Markdown | ✅ 最新 |
| **[regression-test-tracking.md](./regression-test-tracking.md)** | 回归测试用例追踪 | Markdown | ✅ 最新 |
| **[smoke-test-tracking.md](./smoke-test-tracking.md)** | 冒烟测试用例追踪 | Markdown | ✅ 最新 |
| **[测试指南.md](./测试指南.md)** | E2E测试完整指南 | Markdown | ✅ 最新 |
| **[测试脚本最佳实践.md](./测试脚本最佳实践.md)** | 测试脚本编写规范 | Markdown | ✅ 最新 |
| **[smoke-test-guide.md](./smoke-test-guide.md)** | 冒烟测试指南 | Markdown | ✅ 最新 |

### 测试报告与分析

| 文档名称 | 说明 | 更新日期 |
|---------|------|----------|
| **[测试最终报告_20251019.md](./测试最终报告_20251019.md)** | 2025-10-19 测试总结 | 2025-10-19 |
| **[测试问题最终分析_20251019.md](./测试问题最终分析_20251019.md)** | 测试问题深度分析 | 2025-10-19 |
| **[workflow-test-summary.md](./workflow-test-summary.md)** | 工作流测试总结 | 2025-10-18 |

### 工作流测试

| 文档名称 | 说明 | 格式 | 状态 |
|---------|------|------|------|
| workflow-tests-to-add.csv | 待添加的工作流测试 | CSV | ⚠️ 待转换 |
| workflow-tracking-to-add.csv | 工作流测试追踪 | CSV | ⚠️ 待转换 |

---

## 📝 文档格式说明

### 为什么从 CSV 转换到 Markdown？

**更新日期**: 2025-01-20

我们决定将测试文档从 CSV 格式迁移到 Markdown 格式，原因如下：

1. **编码问题**: CSV 文件使用 GB2312 编码，在不同系统和编辑器中经常出现乱码
2. **可读性**: Markdown 格式更易于阅读和维护
3. **版本控制**: Markdown 在 Git 中的 diff 更清晰，更容易进行代码审查
4. **富文本支持**: 支持更丰富的格式化选项（链接、代码块、表格等）
5. **协作友好**: 团队成员可以直接在 GitHub 上查看和编辑
6. **搜索便利**: 内容可以直接被文本搜索工具索引

### 旧文件状态

以下 CSV 文件已被 Markdown 版本替代，保留仅作参考：

| CSV 文件 | 替代的 Markdown 文件 | 状态 |
|---------|---------------------|------|
| regression-test-tracking.csv | regression-test-tracking.md | ✅ 已转换 |
| smoke-test-tracking.csv | smoke-test-tracking.md | ✅ 已转换 |
| E2E测试用例文档.csv | e2e-test-cases.md | ✅ 已转换 |

> **注意**: CSV 文件将在确认 Markdown 版本稳定后删除。

---

## 🚀 快速导航

### 按测试类型

- **📋 完整测试用例**: 查看 [e2e-test-cases.md](./e2e-test-cases.md) - 所有测试用例详细信息
- **冒烟测试**: 查看 [smoke-test-tracking.md](./smoke-test-tracking.md) - 快速验证核心功能
- **回归测试**: 查看 [regression-test-tracking.md](./regression-test-tracking.md) - 回归测试追踪
- **工作流测试**: 查看 [workflow-test-summary.md](./workflow-test-summary.md) - 工作流测试总结

### 按文档用途

- **查看测试用例**: 查看 [e2e-test-cases.md](./e2e-test-cases.md)
- **编写测试**: 查看 [测试脚本最佳实践.md](./测试脚本最佳实践.md)
- **运行测试**: 查看 [测试指南.md](./测试指南.md)
- **问题排查**: 查看 [测试问题最终分析_20251019.md](./测试问题最终分析_20251019.md)

---

## 📊 测试统计概览

### 总体测试覆盖

- **冒烟测试**: 6个用例，100% 通过
- **回归测试**: 41个用例，85% 通过
- **总计**: 47个自动化测试用例

### 最新更新 (2025-01-20)

- ✅ **R402 测试修复**: 实现题目编码系统，解决虚拟滚动表格定位问题
- ✅ **R403 测试优化**: 使用题目编码提升测试准确性
- 📝 **文档格式迁移**: 从 CSV 转换到 Markdown，避免编码问题

详见 [regression-test-tracking.md](./regression-test-tracking.md)

---

## 🔧 测试命令

### 运行测试

```bash
# 运行所有测试
npm run test:e2e

# 运行冒烟测试
npm run test:smoke

# 运行回归测试
npm run test:regression

# 运行特定测试
npx playwright test --grep "R402"

# 运行带UI的测试（调试模式）
npx playwright test --headed --grep "R402"
```

### 查看测试报告

```bash
# 生成并查看HTML报告
npx playwright show-report
```

---

## 📖 相关文档

- **主项目 README**: [../../README.md](../../README.md)
- **开发状态追踪**: [../../DEVELOPMENT_STATUS.md](../../DEVELOPMENT_STATUS.md)
- **API 文档**: [../../API_Document.md](../../API_Document.md)

---

*最后更新: 2025-01-20*
*维护人员: 测试团队*
