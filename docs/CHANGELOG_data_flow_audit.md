# 数据流审查变更记录

## 2026-06-03 全栈数据流审查修复

### P1: 成就页面字段名不匹配修复

| 项目 | 详情 |
|------|------|
| **问题** | 前端 AchievementPage 期望的字段名（`awarded_at`, `awarded_count`, `points_reward` 等）与后端 Achievement 模型返回的字段名（`achieved_at`, `times_achieved` 等）不匹配 |
| **影响** | 成就获得时间显示 Invalid Date、获得次数显示 0、积分统计计算错误 |
| **修改文件** | `backend/src/models/Achievement.js` |
| **修改内容** | 修改 `getStudentAchievements()` SQL 查询：添加字段别名（`AS awarded_at`, `AS awarded_count`, `AS student_achievement_id`），补充缺失字段（`subcategory`, `points_reward`, `max_times`）；修改 `getStudentProgress()` 同步补充 `subcategory`, `points_reward` 字段 |

### P2: 个人成长中心页面替换 mock 数据

| 项目 | 详情 |
|------|------|
| **问题** | GrowthCenterPage 所有数据均为硬编码 mock（统计卡片、最近活动、学习轨迹、成就系统） |
| **修改文件** | `frontend/src/pages/student/GrowthCenterPage.tsx` |
| **修改内容** | 完全重写页面，使用 `statisticsApi.getStudentOverview()` 获取学习统计、`activityApi.getStudentCompletedPractices()` 获取已完成活动、`achievementApi.getStudentAchievements()` 获取成就摘要、`pointsApi.getPointsAccount()` 获取积分信息。学习轨迹从已完成活动按日期分组提取 |

### P3: 管理员首页替换 mock 数据

| 项目 | 详情 |
|------|------|
| **问题** | AdminHome 中 `workflows`（待处理工作流）和 `regionStats`（区域统计）全部使用 mock 数据 |
| **修改文件** | `backend/src/routes/admin.js`、`frontend/src/pages/admin/AdminHome.tsx` |
| **修改内容** | 后端新增 `GET /api/admin/dashboard/workflows`（查询学生注册、题目审核、活动管理、证书颁发的待处理数量）和 `GET /api/admin/dashboard/region-stats`（查询学校、教职工、学生、活动、审批数量）；前端替换 mock 数据为真实 API 调用 |

### P4: 成绩查询页面实现

| 项目 | 详情 |
|------|------|
| **问题** | ResultsPage 只显示"功能开发中"占位符 |
| **修改文件** | `frontend/src/pages/ResultsPage.tsx` |
| **修改内容** | 完全重写为成绩列表页面，使用 `activityApi.getStudentCompletedPractices()` 获取已完成活动的成绩数据。包含：统计概览卡片（完成次数、平均分、优秀次数、通过率）、成绩列表表格（名称、科目、得分、完成时间、批改状态）、科目筛选、跳转到详情页功能 |

### P5: 后端成绩路由修复 mock 接口

| 项目 | 详情 |
|------|------|
| **问题** | `results.js` 中证书相关接口全部使用 mock 数据，统计和导出接口为 TODO 桩 |
| **修改文件** | `backend/src/routes/results.js` |
| **修改内容** | (1) `GET /certificates/available` → 查询 `student_activities` + `certificates` 表获取真实可申请证书；(2) `POST /certificate` → 查询 DB 验证资格并插入 `certificates` 表；(3) `GET /certificate/:examId/download` → 使用 PDFKit 动态生成 PDF；(4) `GET /exam/:examId/statistics` → 实现真实统计查询；(5) `GET /export/:examId` → 实现真实成绩导出查询 |

### P6: 证书 PDF 生成功能（PDFKit 替换 Puppeteer）

| 项目 | 详情 |
|------|------|
| **问题** | 原有 `pdfCertificateService.js` 使用 Puppeteer（在 Docker Alpine 中无法运行），证书下载只返回 HTML |
| **修改文件** | `backend/src/services/pdfCertificateService.js`、`backend/src/controllers/certificateController.js`、`backend/src/routes/results.js` |
| **修改内容** | (1) 完全重写 `pdfCertificateService.js` 使用 PDFKit 替代 Puppeteer，支持 `generatePDFBuffer()` 动态生成和 `generatePDF()` 文件保存；(2) `certificateController.js` 的 `downloadCertificatePDF` 改为动态生成 PDF 返回；(3) `downloadCertificate` 改为动态生成 HTML 返回；(4) `results.js` 证书下载端点同步使用 PDFKit；(5) 新增依赖 `pdfkit` |

### P7: 清理废弃路由

| 项目 | 详情 |
|------|------|
| **问题** | `backend/src/routes/questions.js` 所有端点为 TODO 桩，实际功能已迁移到 `questionBank.js` 和 `questionDrafts.js` |
| **修改文件** | `backend/src/routes/questions.js` |
| **修改内容** | 将所有 TODO 桩替换为统一的 410 Gone 响应，返回废弃提示和替代路由信息（`/api/question-bank`、`/api/question-drafts`、`/api/question-review`） |

### P8: 统计页面 toFixed 类型错误修复

| 项目 | 详情 |
|------|------|
| **问题** | PostgreSQL 的 `numeric`/`decimal` 类型通过 pg 驱动返回的是**字符串**而非数字，调用 `.toFixed()` 时报 `TypeError: C.accuracy_rate.toFixed is not a function` |
| **影响页面** | 学生"我的统计"页面、教师"数据分析"页面 |
| **修改文件** | `frontend/src/pages/student/MyStatistics.tsx`、`frontend/src/pages/teacher/DataAnalytics.tsx` |
| **修改内容** | 在 `loadAbilities`、`loadKnowledgePoints`、`loadOverview`（学生端）和 `loadSchoolData`、`loadDistrictData`（教师端）中，对 API 返回数据使用 `parseFloat()`/`parseInt()` 统一转换 `accuracy_rate`、`avg_score`、`total_questions`、`correct_count`、`student_count`、`total_attempts` 等字段为数字类型 |

### P9: 练习中心答题详情为空（缺少 answers 数据）

| 项目 | 详情 |
|------|------|
| **问题** | 学生查看已完成练习的答题详情时，显示"暂无答题记录"。原因是 `answers` 表中缺少对应 `student_activities` 的答案记录 |
| **根因** | demo_data 脚本只为少数几条 `student_activities`（id=29,32,33）创建了 answers，张小明的 8 个已完成活动中只有 2 个有答案记录 |
| **修改方式** | 直接在数据库中为张小明（user_id=30）的 6 个缺少答案的活动批量插入 answers 数据，每个活动的答案总分与 `student_activities.score` 匹配 |
| **影响的活动** | sa_id=1(活动1), sa_id=4(活动2), sa_id=30(活动24), sa_id=31(活动25), sa_id=35(活动30), sa_id=36(活动32) |
| **验证** | `GET /api/student/activities/2/result` 正确返回 `can_show_answers: true` 和 6 条 answers（含 `question_type`, `question_content`, `my_answer` 等字段） |
