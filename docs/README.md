# 项目文档中心

贵阳市小学生测评服务平台文档索引。**项目状态总账见 [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md)**（持续维护，最近更新 2026-09）。

> 文档规则：阶段性汇报、已完成计划、一次性修复记录一律移入 [archive/](./archive/)，不再在根目录维护副本；新增长期文档请同步更新本索引。

---

## ⭐ 核心文档

| 文档 | 说明 |
|------|------|
| [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) | 🔥 开发状态总账（唯一持续维护，2026-09 起含各轮修复台账） |
| [API_Document.md](./API_Document.md) | 后端 API 接口总文档 |
| [DEPLOYMENT_BUDGET.md](./DEPLOYMENT_BUDGET.md) | 合规部署预算（市级公网、等保三级） |

## 📐 需求与设计（现行有效）

| 文档 | 说明 |
|------|------|
| [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md) | 平台功能需求总纲 |
| [QUESTION_BANK_REDESIGN.md](./QUESTION_BANK_REDESIGN.md) | 题库草稿/发布分离设计 |
| [ASSESSMENT_REGISTRATION_REQUIREMENTS.md](./ASSESSMENT_REGISTRATION_REQUIREMENTS.md) | 测评报名（L1-L7 分级）需求 |
| [TEACHING_CLASS_REQUIREMENTS.md](./TEACHING_CLASS_REQUIREMENTS.md) | 教学班（虚拟班级）需求 |
| [DATA_VISUALIZATION_REQUIREMENTS.md](./DATA_VISUALIZATION_REQUIREMENTS.md) | 学习统计与可视化需求 |
| [GRADING_SYSTEM_IMPROVEMENT_PLAN.md](./GRADING_SYSTEM_IMPROVEMENT_PLAN.md) | 批改判题系统完善计划 |
| [RECOMMENDATION_ALGORITHM.md](./RECOMMENDATION_ALGORITHM.md) | 智能推荐 / 每日推题算法设计 |
| [JUDGE_SERVICE_DESIGN.md](./JUDGE_SERVICE_DESIGN.md) | 判题微服务（judge-service）设计 |
| [ACHIEVEMENT_SYSTEM_DESIGN.md](./ACHIEVEMENT_SYSTEM_DESIGN.md) | 成就与积分业务设计 |
| [ACHIEVEMENT_TRIGGER_MECHANISM.md](./ACHIEVEMENT_TRIGGER_MECHANISM.md) | 成就触发机制技术设计 |
| [COS_IMPLEMENTATION.md](./COS_IMPLEMENTATION.md) | 腾讯云 COS 直传存储实现 |
| [architecture-resources/](./architecture-resources/) | 系统架构图与参考设计图 |

## 🧭 规范与手册

| 文档 | 说明 |
|------|------|
| [DEVELOP_BEST_PRACTICES.md](./DEVELOP_BEST_PRACTICES.md) | 开发 / 测试 / Docker 最佳实践 |
| [BUG_FIX_TRACKING_GUIDE.md](./BUG_FIX_TRACKING_GUIDE.md) | Bug 修复流程与 CSV 台账规范（配套 BUG_FIX_TRACKING.csv） |
| [DEMO_GUIDE.md](./DEMO_GUIDE.md) | 演示操作指南（测试账号手册） |
| [DEMO_DOCUMENT.md](./DEMO_DOCUMENT.md) | 全功能演示手册（账号 + 截图） |
| [RESUBMIT_REJECTED_QUESTION_FEATURE.md](./RESUBMIT_REJECTED_QUESTION_FEATURE.md) | 驳回题目重提交功能说明 |
| [FRONTEND_PERFORMANCE_OPTIMIZATION.md](./FRONTEND_PERFORMANCE_OPTIMIZATION.md) | 题库虚拟滚动性能优化建议 |

## 📌 历史需求（2026-06 批次，多数已落地）

| 文档 | 说明 |
|------|------|
| [新的更新要求_实施方案.md](./新的更新要求_实施方案.md) | 2026-06 新需求总表与实施方案（顶部附 2026-09 完成状态备注） |

---

## 🗂 子目录

| 目录 | 内容 |
|------|------|
| [business/](./business/) | 现行业务指南（权限体系、用户管理、EventBus、题库权限、系统设计 v2） |
| [screenshots/](./screenshots/) | 演示截图（按功能编号） |
| [archive/](./archive/) | 历史归档（阶段性进度、周报、旧待办账本、旧状态 CSV、修复记录） |

---

## 🧹 文档维护约定（2026-09 整理）

- `DEVELOPMENT_STATUS.md` 是**唯一**持续维护的状态总账；其余进度类文档一律归档，不再更新。
- 归档文档内容保持原样（不做修订），仅作历史查阅。
- 新增文档请放本目录并在上表登记；一次性工作汇报直接进 `archive/`。
