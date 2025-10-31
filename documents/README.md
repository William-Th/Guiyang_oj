# 项目文档中心

本文件夹包含贵阳市小学生测评服务平台的核心文档，包括开发状态追踪、API文档、系统设计文档和需求文档。

---

## 📚 核心文档列表

### 1. [开发状态追踪](./DEVELOPMENT_STATUS.md) ⭐ NEW
**文件名**: `DEVELOPMENT_STATUS.md`
**文件大小**: 25KB (466行)
**最后更新**: 2025-10-30
**文档类型**: 项目开发进度和功能状态追踪

**主要内容**:
- 所有功能模块的开发状态（数据库/后端/API测试/前端/E2E测试）
- 学生自主注册系统状态
- 学生活动答题与成绩系统状态
- 活动组卷管理系统状态
- 练习模式与计时系统状态
- 题库审核与质量控制系统状态
- 开发优先级和下一步工作计划

**适用人员**:
- 项目经理（跟踪进度）
- 开发团队（了解各模块状态）
- 测试团队（了解测试覆盖情况）
- 产品经理（规划下一阶段工作）

**快速查看**: 每个功能模块都有状态表格，使用表情符号快速识别完成度（✅ 已完成 / 🚧 进行中 / ❌ 未开始）

---

### 2. [API文档](./API_Document.md)
**文件名**: `API_Document.md`
**文件大小**: 38KB
**最后更新**: 2025-10-30
**文档类型**: API接口文档

**主要内容**:
- 完整的RESTful API接口说明
- 请求/响应格式定义
- 认证和授权机制
- 错误码说明
- 接口使用示例

**涵盖的API模块**:
- 认证API (`/api/auth/*`)
- 用户管理API (`/api/users/*`)
- 活动管理API (`/api/activities/*`) - 替代原 exams
- 题库管理API (`/api/question-bank/*`)
- 成绩管理API (`/api/results/*`)
- 证书管理API (`/api/certificates/*`)
- 学生注册API (`/api/registration/*`)

**适用人员**:
- 前端开发人员
- API集成开发人员
- 测试人员
- 第三方系统对接人员

---

### 3. [功能需求文档](./FEATURE_REQUIREMENTS.md)
**文件名**: `FEATURE_REQUIREMENTS.md`
**文件大小**: 31KB
**最后更新**: 2025-10-21
**文档类型**: 系统需求规格说明书

**主要内容**:
- 用户角色和权限矩阵
- 三大子系统架构（学生端/教师端/管理员端）
- 核心功能需求详细说明
- 业务流程描述
- 非功能性需求
- 验收标准

**核心子系统**:
- 学生管理子系统（注册、答题、成绩查询）
- 教师管理子系统（题库、练习活动、组卷、批阅）
- 管理员管理子系统（用户管理、测评活动、权限管理、审核）

**适用人员**:
- 产品经理
- 项目经理
- 开发团队
- 测试团队
- 业务方

---

### 4. [系统设计文档](./updated_system_design_0707_v2.md)
**文件名**: `updated_system_design_0707_v2.md`
**文件大小**: 53KB
**最后更新**: 2025-07-07
**文档类型**: 系统架构和数据库设计文档

**主要内容**:
- 系统架构设计
- 数据库表结构设计（Schema）
- 实体关系图（ERD）
- 数据流图
- 系统组件说明
- 技术栈选型说明
- 部署架构

**数据库表设计**:
- 用户相关表：users, schools, teacher_permissions
- 活动相关表：activities, student_activities, activity_questions
- 题库相关表：question_bank, question_review
- 成绩相关表：answers, certificates
- 注册相关表：student_registrations

**适用人员**:
- 后端开发人员
- 数据库管理员
- 系统架构师
- 新加入团队的开发人员

---

## 📋 辅助文档列表

### 5. [开发最佳实践](./DEVELOP_BEST_PRACTICES.md)
**文件大小**: 47KB (1129行) | **更新**: 2025-10-30
- 测试认证状态管理
- 权限系统设计与调试
- React组件设计与UI一致性
- Docker开发工作流（前端/后端）
- 全栈问题调试策略
- Playwright E2E测试最佳实践
- React Router与权限集成
- 代码审查清单
- 常见问题速查

### 6. [前端性能优化](./FRONTEND_PERFORMANCE_OPTIMIZATION.md)
**文件大小**: 19KB | **更新**: 2025-10-19
- 虚拟滚动优化记录
- 组件懒加载策略
- 打包优化配置

### 7. [待办事项追踪](./PENDING_WORK.md)
**文件大小**: 26KB | **更新**: 2025-10-29
- 当前待完成任务
- 已知问题列表
- 技术债务记录

### 8. [用户管理指南](./USER_MANAGEMENT_GUIDE.md)
**文件大小**: 21KB | **更新**: 2025-10-28
- 用户角色说明
- 权限管理操作
- 账号创建流程

### 9. [系统业务流程](./SYSTEM_BUSINESS_FLOWS.md)
**文件大小**: 26KB | **更新**: 2025-10-27
- 完整业务流程图
- 用户操作路径
- 系统交互说明

---

## 🗂️ 文档关系图

```
项目文档体系
│
├── 📁 documents/ (本文件夹)
│   ├── ⭐ DEVELOPMENT_STATUS.md     ← 【核心】开发状态追踪
│   ├── 📘 FEATURE_REQUIREMENTS.md   ← 【核心】功能需求规格
│   ├── 📗 API_Document.md           ← 【核心】API接口规范
│   ├── 📙 updated_system_design_0707_v2.md ← 【核心】系统架构设计
│   ├── DEVELOP_BEST_PRACTICES.md    ← 全栈开发规范（合并了前端规范）
│   ├── FRONTEND_PERFORMANCE_OPTIMIZATION.md ← 前端性能优化
│   ├── PENDING_WORK.md              ← 待办事项
│   ├── USER_MANAGEMENT_GUIDE.md     ← 用户管理
│   ├── SYSTEM_BUSINESS_FLOWS.md     ← 业务流程
│   └── 📁 archive/                  ← 【归档】历史文档（10个）
│       ├── PROGRESS.md              ← 开发进度记录（已合并）
│       ├── FRONTEND_BEST_PRACTICES.md  ← 前端最佳实践（已合并）
│       ├── EXAM_CENTER_DEVELOPMENT_PLAN.md  ← 考试中心开发计划
│       ├── PAPER_GENERATION_SUMMARY.md      ← 组卷功能总结
│       ├── STUDENT_REGISTRATION_PROGRESS.md ← 学生注册系统详细文档
│       ├── STUDENT_ACTIVITY_GRADING_COMPLETION.md ← 学生答题系统
│       ├── PRACTICE_TIME_LIMIT_DESIGN.md    ← 练习计时系统设计
│       ├── PRACTICE_ASSESSMENT_DEVELOPMENT_PLAN.md ← 练习系统开发计划
│       ├── PHASE4_TEST_SUMMARY.md           ← 第四阶段测试总结
│       └── PENDING_FEATURES.md              ← 待开发功能列表
│
├── 📁 report/
│   ├── 功能实现状态报告.md          ← 功能实现进度
│   ├── 题库管理系统实现报告.md      ← 技术实现细节
│   ├── 前端实现报告.md              ← 前端技术细节
│   └── ...                          ← 其他技术报告
│
└── 📁 项目根目录/
    ├── README.md                    ← 项目总体说明
    ├── CLAUDE.md                    ← Claude Code开发指南
    └── ...                          ← 其他项目文件
```

---

## 📖 文档使用指南

### 快速上手流程

#### 对于新加入的开发人员 👨‍💻
1. **第一步**: 阅读 [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) 了解项目当前开发状态
2. **第二步**: 阅读 [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md) 了解系统业务需求
3. **第三步**: 阅读 [系统设计文档](./updated_system_design_0707_v2.md) 了解技术架构
4. **第四步**: 参考 [API文档](./API_Document.md) 进行开发
5. **第五步**: 查看 `../CLAUDE.md` 了解开发流程和规范

#### 对于前端开发人员 🎨
1. 查看 [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) 了解前端开发进度
2. 重点阅读 [API文档](./API_Document.md) 了解接口规范
3. 参考 [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md) 理解业务逻辑
4. 阅读 [FRONTEND_BEST_PRACTICES.md](./FRONTEND_BEST_PRACTICES.md) 了解前端规范
5. 查看 [FRONTEND_PERFORMANCE_OPTIMIZATION.md](./FRONTEND_PERFORMANCE_OPTIMIZATION.md) 了解性能优化要点

#### 对于后端开发人员 ⚙️
1. 查看 [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) 了解后端API开发进度
2. 重点阅读 [系统设计文档](./updated_system_design_0707_v2.md) 了解数据库设计
3. 参考 [API文档](./API_Document.md) 实现接口
4. 阅读 [DEVELOP_BEST_PRACTICES.md](./DEVELOP_BEST_PRACTICES.md) 了解开发规范
5. 查看 `database/migrations/` 了解数据库变更历史

#### 对于测试人员 🧪
1. 查看 [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) 了解各模块测试状态
2. 阅读 [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md) 制定测试用例
3. 参考 [API文档](./API_Document.md) 进行接口测试
4. 查看 `../tests/docs/` 了解E2E测试规范和用例
5. 阅读 [PENDING_WORK.md](./PENDING_WORK.md) 了解已知问题

#### 对于项目经理 📊
1. **重点查看** [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) 跟踪开发进度
2. 参考 [PENDING_WORK.md](./PENDING_WORK.md) 了解待办任务和优先级
3. 查看 [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md) 确认功能范围

---

## 🔍 文档内容速查

### API端点速查

**认证相关**:
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `POST /api/auth/refresh` - 刷新Token

**活动相关** (替代原 exams):
- `GET /api/activities` - 获取活动列表
- `POST /api/activities` - 创建活动
- `GET /api/activities/:id` - 获取活动详情
- `POST /api/student-activities/:id/start` - 开始活动
- `POST /api/student-activities/:id/submit` - 提交活动

**题库相关**:
- `GET /api/question-bank/bank` - 获取题库列表
- `POST /api/question-bank/bank` - 创建题目
- `PUT /api/question-bank/bank/:id` - 更新题目
- `DELETE /api/question-bank/bank/:id` - 删除题目

**成绩相关**:
- `GET /api/results/student/:id` - 获取学生成绩
- `GET /api/results/exam/:id` - 获取考试成绩
- `GET /api/results/exam/:id/statistics` - 获取统计数据

详细信息请参考 [API文档](./API_Document.md)

### 数据库表速查

**用户相关表**:
- `users` - 用户基本信息
- `schools` - 学校信息
- `students` - 学生详细信息
- `teachers` - 教师详细信息

**活动相关表** (替代原 exams):
- `activities` - 活动定义（练习/测评）
- `student_activities` - 学生活动记录
- `activity_questions` - 活动题目关联
- `activity_history` - 活动审计日志

**题库相关表**:
- `question_bank` - 题库题目
- `question_categories` - 题目分类
- `import_logs` - 导入日志

**成绩相关表**:
- `answers` - 答题记录
- `certificates` - 证书记录

详细结构请参考 [系统设计文档](./updated_system_design_0707_v2.md)

---

## 📊 文档更新记录

| 文档名称 | 最后更新 | 更新内容 | 维护人员 |
|---------|---------|---------|---------|
| DEVELOP_BEST_PRACTICES.md | 2025-10-30 | 合并前端最佳实践，扩充至1129行 | 开发团队 |
| DEVELOPMENT_STATUS.md | 2025-10-30 | 精简并更新开发状态（703→466行） | 开发团队 |
| API_Document.md | 2025-10-30 | 更新活动管理API | 开发团队 |
| FEATURE_REQUIREMENTS.md | 2025-10-21 | 更新功能需求规格 | 产品团队 |
| README.md (本文件) | 2025-10-30 | 重构文档索引，添加archive说明 | 开发团队 |
| 系统设计文档 | 2025-07-07 | v2版本更新 | 架构团队 |

### 文档归档记录 (2025-10-30)

以下10个文档已移动到 `documents/archive/` 目录：

| # | 归档文档 | 归档原因 | 参考章节/文档 |
|---|---------|---------|---------------|
| 1 | PROGRESS.md | 已合并到DEVELOPMENT_STATUS.md | DEVELOPMENT_STATUS.md 完整内容 |
| 2 | FRONTEND_BEST_PRACTICES.md | 已合并到DEVELOP_BEST_PRACTICES.md | DEVELOP_BEST_PRACTICES.md 章节3 |
| 3 | EXAM_CENTER_DEVELOPMENT_PLAN.md | 历史开发计划（系统已演变） | - |
| 4 | STUDENT_REGISTRATION_PROGRESS.md | 详细设计文档已同步 | DEVELOPMENT_STATUS.md Chapter 10 |
| 5 | STUDENT_ACTIVITY_GRADING_COMPLETION.md | 详细实现文档已同步 | DEVELOPMENT_STATUS.md Chapter 7.3 |
| 6 | PAPER_GENERATION_SUMMARY.md | 详细总结已同步 | DEVELOPMENT_STATUS.md Chapter 8.1 |
| 7 | PRACTICE_TIME_LIMIT_DESIGN.md | 详细设计文档已同步 | DEVELOPMENT_STATUS.md Chapter 7.2 |
| 8 | PRACTICE_ASSESSMENT_DEVELOPMENT_PLAN.md | 详细开发计划已同步 | DEVELOPMENT_STATUS.md Chapter 7.2 |
| 9 | PHASE4_TEST_SUMMARY.md | 测试结果已同步 | DEVELOPMENT_STATUS.md Chapter 7.2 |
| 10 | PENDING_FEATURES.md | 待开发功能已同步 | DEVELOPMENT_STATUS.md Chapter 8.1 |

---

## 🔄 相关文档链接

### 项目核心文档
- [项目README](../README.md) - 项目总体说明和快速启动
- [Claude Code开发指南](../CLAUDE.md) - 完整的开发流程、测试规范、故障排除
- [开发状态追踪](./DEVELOPMENT_STATUS.md) - ⭐ 最新开发进度（替代原 PROGRESS.md）

### 归档文档
- [archive/PROGRESS.md](./archive/PROGRESS.md) - 历史开发进度记录
- [archive/EXAM_CENTER_DEVELOPMENT_PLAN.md](./archive/EXAM_CENTER_DEVELOPMENT_PLAN.md) - 考试中心开发计划（历史）
- [archive/](./archive/) - 查看所有归档文档

### 技术报告
- [技术报告索引](../report/README.md) - 所有技术报告
- [数据重构报告](../report/data-restructuring-report.md) - 数据重构记录
- [题库系统报告](../report/question-bank-implementation-report.md) - 题库系统实现细节

### 测试文档
- [测试指南](../tests/docs/测试指南.md) - 测试流程和规范
- [测试最佳实践](../tests/docs/测试脚本最佳实践.md) - E2E测试编写规范
- [回归测试追踪](../tests/docs/regression-test-tracking.md) - 回归测试用例追踪

---

## 💡 文档维护规范

### 更新原则
1. **及时性**: 功能变更后立即更新相关文档
2. **完整性**: 确保文档内容完整，无遗漏
3. **准确性**: 保证文档内容与实际实现一致
4. **可读性**: 使用清晰的语言和结构化格式

### 版本控制
- 所有文档更新都应提交到Git
- 重大更新需要在文档中标注版本号和更新日期
- 保留重要文档的历史版本

### 审核流程
- API文档：由后端负责人审核
- 系统设计文档：由架构师审核
- 功能需求文档：由产品经理审核

---

## 📞 文档反馈

如有文档相关问题或建议，请联系：

- **技术文档问题**: 技术负责人
- **需求文档问题**: 产品经理
- **文档改进建议**: 项目管理团队

或通过项目Issue系统提交反馈。

---

## 📁 归档目录说明

`documents/archive/` 目录存放历史文档和详细设计文档。这些文档的关键信息已同步到 DEVELOPMENT_STATUS.md 中。

**何时查看归档文档**:
- 需要了解某个功能的详细设计思路
- 查找历史开发决策和背景
- 研究某个功能的完整实现过程
- 需要详细的测试结果和数据

**归档规则**:
- 已完成功能的详细设计文档（核心状态已同步到主文档）
- 历史开发计划和总结报告
- 过时的系统设计方案（如考试中心改为活动模式）
- 阶段性测试总结报告

---

**文档中心维护**: 项目管理团队
**最后更新**: 2025-10-30
**文档版本**: v2.0

**v2.0 更新内容** (2025-10-30):
- ⭐ 新增 DEVELOPMENT_STATUS.md 作为核心状态追踪文档
- 📁 创建 archive/ 目录，归档9个历史文档
- 🔄 更新所有文档引用和快速上手指南
- 📋 添加辅助文档列表（开发规范、最佳实践等）
- 📊 新增文档归档记录表格

---

## 附录

### 文档模板

#### API接口文档模板
```markdown
## 接口名称

**请求地址**: `POST /api/xxx`
**权限要求**: 需要登录 / 管理员权限
**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| param1 | string | 是 | 参数说明 |

**响应格式**:
{
  "success": true,
  "data": {}
}

**错误码**:
- 400: 参数错误
- 401: 未授权
```

#### 数据库表文档模板
```sql
-- 表名：table_name
-- 说明：表的用途说明
CREATE TABLE table_name (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

**README结束**
