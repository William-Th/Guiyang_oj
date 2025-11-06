# 活动管理功能细化实施计划

**创建日期**: 2025-10-23  
**目标**: 将活动管理细化为学生端（测评中心/练习中心）、教师端（练习管理）、管理员端（测评管理）

---

## 📊 现状分析

### ✅ 已完成的基础设施
1. **数据库**: `activities` 表已支持 `type` 字段区分测评和练习
2. **权限控制**: `activityPermission.js` 中间件已实现角色权限
3. **基础API**: activities 路由已存在

### ❌ 需要完善的内容
1. **学生端**: 缺少测评中心/练习中心页面和API
2. **角色区分**: 教师和管理员使用相同界面，需要明确区分
3. **API适配**: 需要新增学生端接口和管理员专用接口
4. **测试**: 缺少完整的E2E测试覆盖

---

## 🎯 功能需求

### 学生端
- **测评中心** (`/student/assessments`): 只展示 `type='assessment'` 的活动
- **练习中心** (`/student/practice`): 只展示 `type='practice'` 的活动

### 教师端
- **练习管理** (`/teacher/activities`): 只能创建和管理 `type='practice'` 的活动

### 管理员端
- **测评管理** (`/admin/assessments`): 可以创建和管理 `type='assessment'` 的活动

---

## 📝 开发任务清单

### 1️⃣ 数据库层面（可选）
- [ ] 无需修改（现有schema已支持）
- [ ] 可选：添加索引优化 (`idx_activities_type_status`)

### 2️⃣ 后端API层面
- [ ] 新增学生端API
  - `GET /api/activities/practice` - 获取练习列表
  - `GET /api/activities/assessments` - 获取测评列表
  - `GET /api/activities/:id/eligibility` - 检查参加资格
- [ ] 修改教师端API
  - `POST /api/activities` - 强制 `type='practice'`
  - `GET /api/activities` - 只返回练习
- [ ] 新增管理员端API
  - `GET /api/activities/admin/assessments` - 获取所有测评
  - `POST /api/activities/admin/assessment` - 创建测评
- [ ] 编写API测试

### 3️⃣ 前端层面
- [ ] **学生端页面**（新建）
  - `AssessmentCenterPage.tsx` - 测评中心
  - `PracticeCenterPage.tsx` - 练习中心
- [ ] **教师端页面**（修改）
  - `ActivityListPage.tsx` - 改为"练习管理"
  - `ActivityFormPage.tsx` - 移除类型选择器
- [ ] **管理员端页面**（新建）
  - `AssessmentManagementPage.tsx` - 测评管理
  - `AssessmentFormPage.tsx` - 测评表单
- [ ] **路由和导航**
  - 更新 `App.tsx` 路由配置
  - 更新 `MainLayout.tsx` 导航菜单

### 4️⃣ 测试层面
- [ ] API测试
  - `activity-permissions.test.js` - 权限测试
  - `student-activities.test.js` - 学生端API测试
- [ ] E2E测试
  - `student/assessment-practice-centers.spec.ts` (STU101-STU110)
  - `teacher/practice-management.spec.ts` (TEA101-TEA110)
  - `admin/assessment-management.spec.ts` (ADM101-ADM110)

### 5️⃣ 文档更新
- [ ] 更新 `API_Document.md`
- [ ] 更新 `FEATURE_REQUIREMENTS.md`
- [ ] 更新 `DEVELOPMENT_STATUS.md`
- [ ] 创建测试用例文档

---

## 🚀 开发顺序（按CLAUDE.md流程）

### 阶段1: 后端API开发和测试（1-2天）
1. 实现学生端API
2. 修改教师端API权限控制
3. 实现管理员端API
4. 重新构建后端: `docker-compose up --build -d backend`
5. 编写并运行API测试: `npx jest tests/api/`
6. **里程碑**: ✅ API测试全部通过

### 阶段2: 前端开发（2-3天）
1. 创建学生端页面
2. 修改教师端页面
3. 创建管理员端页面
4. 更新路由和导航
5. 重新构建前端: `docker-compose up --build -d frontend`
6. **里程碑**: ✅ 前端页面可正常访问

### 阶段3: E2E测试（1-2天）
1. 编写学生端E2E测试
2. 编写教师端E2E测试
3. 编写管理员端E2E测试
4. 运行测试: `npx playwright test tests/e2e/...`
5. **里程碑**: ✅ E2E测试全部通过

### 阶段4: 文档整理（0.5天）
1. 更新API文档
2. 更新功能需求文档
3. 更新开发状态文档
4. 创建测试用例文档
5. **里程碑**: ✅ 所有文档更新完成

**预计总时间**: 4.5-7.5天（约1-1.5周）

---

## 📁 关键文件清单

### 后端文件
| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/src/routes/activities.js` | 修改 | 添加新路由，修改权限 |
| `backend/src/models/Activity.js` | 修改 | 添加资格检查方法 |

### 前端文件
| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/src/pages/student/AssessmentCenterPage.tsx` | 新建 | 测评中心 |
| `frontend/src/pages/student/PracticeCenterPage.tsx` | 新建 | 练习中心 |
| `frontend/src/pages/teacher/ActivityListPage.tsx` | 修改 | 改为练习管理 |
| `frontend/src/pages/teacher/ActivityFormPage.tsx` | 修改 | 只能创建练习 |
| `frontend/src/pages/admin/AssessmentManagementPage.tsx` | 新建 | 测评管理 |
| `frontend/src/pages/admin/AssessmentFormPage.tsx` | 新建 | 测评表单 |
| `frontend/src/App.tsx` | 修改 | 添加路由 |
| `frontend/src/components/layout/MainLayout.tsx` | 修改 | 更新导航菜单 |

### 测试文件
| 文件 | 类型 | 说明 |
|------|------|------|
| `tests/api/activity-permissions.test.js` | API | 权限测试 |
| `tests/e2e/student/assessment-practice-centers.spec.ts` | E2E | 学生端测试 |
| `tests/e2e/teacher/practice-management.spec.ts` | E2E | 教师端测试 |
| `tests/e2e/admin/assessment-management.spec.ts` | E2E | 管理员端测试 |

---

## ⚠️ 注意事项

1. **权限控制**: 后端验证 + 前端UI限制双重保障
2. **数据兼容**: 现有activities表无需修改，只是业务逻辑调整
3. **测试数据**: 使用时间戳确保E2E测试数据唯一性
4. **虚拟滚动**: 临时添加 `virtual={false}`，上线前需恢复
5. **Docker重建**: 代码修改后必须 `--build` 重新构建

---

## 🎯 核心原则

1. **数据层统一**: 所有角色操作同一个 `activities` 表
2. **类型区分**: 通过 `type` 字段区分测评和练习
3. **权限分离**: 教师只能创建练习，管理员才能创建测评
4. **用户体验**: 不同角色看到适合自己的界面和术语

---

**状态**: 📋 规划完成，待开始实施  
**维护**: 开发团队  
**参考**: CLAUDE.md, PENDING_WORK.md
