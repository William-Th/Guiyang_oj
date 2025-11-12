# 教师数据结构重构总结

**日期**: 2025-11-04
**目的**: 移除通用教师账号,改为学校特定教师账号,仅保留数学和信息科技两个科目

---

## ✅ 已完成任务

### 1. 数据库种子文件更新 (database/seed.sql)

**变更内容**:
- ✅ 删除通用教师账号 (teacher01, teacher02, teacher03)
- ✅ 创建 18 个学校特定教师账号:
  - 白云区 6 人: teacher_by_ps_math/it, teacher_by_ms_math/it, teacher_by_hs_math/it
  - 南明区 6 人: teacher_nm_ps_math/it, teacher_nm_ms_math/it, teacher_nm_hs_math/it
  - 云岩区 6 人: teacher_yy_ps_math/it, teacher_yy_ms_math/it, teacher_yy_hs_math/it
- ✅ 删除语文考试和语文题目样本数据
- ✅ 删除科学考试和科学题目样本数据
- ✅ 保留数学考试题目,添加信息科技考试题目
- ✅ 更新教师记录表 (teachers table) - 18 条记录
- ✅ 更新密码注释文档,列出所有新教师账号

**教师账号命名规范**:
- 格式: `teacher_{区县}_{学校}_{科目}`
- 区县: by (白云), nm (南明), yy (云岩)
- 学校: ps (小学), ms (中学), hs (高中)
- 科目: math (数学), it (信息科技)

### 2. DEMO_GUIDE.md 文档更新

**更新内容**:
- ✅ 删除"通用教师账号"章节
- ✅ 重写"白云区教师账号"章节为三个独立章节:
  - 白云区教师 (6人)
  - 南明区教师 (6人)
  - 云岩区教师 (6人)
- ✅ 添加账号命名规范说明
- ✅ 更新教师权限说明
- ✅ 更新教师测试流程,推荐使用 `teacher_yy_ps_math`
- ✅ 添加测试建议 (科目测试、区域隔离测试、权限测试)

---

## 📋 待完成任务

### 3. API 测试文件更新

需要更新以下 API 测试文件中的教师账号和科目:

| 文件 | 需要修改的内容 | 优先级 |
|------|--------------|--------|
| **hierarchical-permission-api-test.js** | • Line 126: teacher01 → teacher_yy_ps_math<br>• Line 193: subjects: ['数学', '语文'] → ['数学', '信息科技']<br>• Line 282, 579: subject: '语文' → '数学' | P0 - 最高 |
| **time-limit-feature.test.js** | • Line 36: subject: '英语' → '数学'<br>• Line 49: subject: '语文' → '信息科技'<br>• Line 65: teacher01 → teacher_yy_ps_math | P1 |
| **question-bank-api-test.js** | • Line 87: teacher01 → teacher_yy_ps_math<br>• Line 191: subject: '语文' → '数学' | P1 |
| **exam-api-test.js** | • Line 178: teacher01 → teacher_yy_ps_math | P1 |
| **smoke-test.js** | • Line 185: teacher01 → teacher_yy_ps_math | P1 |
| **paper-generation-api-test.js** | • Line 226: teacher01 → teacher_yy_ps_math | P2 |
| **practice-assessment-api-test.js** | • Line 251: teacher01 → teacher_yy_ps_math | P2 |
| **activity-permissions.test.js** | • Line 46: teacher01 → teacher_yy_ps_math | P2 |
| **student-activity-integration.test.js** | • Line 26: teacher01 → teacher_yy_ps_math | P2 |
| **comprehensive-api-test.js** | • Line 32: teacher01 → teacher_yy_ps_math | P2 |
| **student-activities.test.js** | • Line 35: teacher01 → teacher_yy_ps_math | P2 |
| **activity-api-test.js** | • Line 186: teacher01 → teacher_yy_ps_math | P2 |
| **student-registration.test.js** | • Line 168-169: teacher01 → teacher_yy_ps_math | P2 |

**总计**: 13 个测试文件需要更新

**推荐批量替换策略**:
```bash
# 使用 sed 或编辑器批量替换
find tests/api -name "*.js" -type f -exec sed -i 's/teacher01/teacher_yy_ps_math/g' {} \;
find tests/api -name "*.js" -type f -exec sed -i "s/'语文'/'数学'/g" {} \;
find tests/api -name "*.js" -type f -exec sed -i "s/'英语'/'信息科技'/g" {} \;
find tests/api -name "*.js" -type f -exec sed -i "s/'科学'/'信息科技'/g" {} \;
```

### 4. E2E 测试文件更新

需要搜索并更新所有引用 teacher01 的 E2E 测试文件:

**搜索命令**:
```bash
grep -r "teacher01" tests/e2e/ --include="*.ts"
```

**可能受影响的文件**:
- tests/e2e/regression/question-bank-workflow.spec.ts
- tests/e2e/regression/activity-management.spec.ts
- tests/e2e/smoke/ 下的相关文件
- tests/helpers/auth.ts (如果有封装登录函数)

**更新内容**:
- 将 teacher01 替换为 teacher_yy_ps_math
- 确认科目选择为"数学"或"信息科技"
- 验证测试仍然通过

### 5. 前端个人资料页面

需要检查并更新教师和管理员的个人资料显示页面,确保姓名和信息正确显示。

**检查文件**:
- `frontend/src/components/layout/MainLayout.tsx` - 右上角用户菜单
- `frontend/src/pages/*/ProfilePage.tsx` - 个人资料页面(如果存在)

**验证点**:
- 登录为 teacher_yy_ps_math,检查右上角显示"蒋磊-云岩一小"
- 点击个人资料,检查详细信息是否正确
- 确认科目显示为"数学"

---

## 🔍 测试验证计划

### 数据库验证

完成更新后需要重新导入种子数据:

```bash
# 1. 备份当前数据库
docker exec guiyang_oj_postgres pg_dump -U postgres guiyang_oj > backup_before_teacher_restructure.sql

# 2. 删除并重建数据库
docker exec -it guiyang_oj_postgres psql -U postgres -c "DROP DATABASE IF EXISTS guiyang_oj;"
docker exec -it guiyang_oj_postgres psql -U postgres -c "CREATE DATABASE guiyang_oj;"

# 3. 导入schema
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/schema.sql

# 4. 导入新的种子数据
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/seed.sql

# 5. 验证数据
docker exec -it guiyang_oj_postgres psql -U postgres -d guiyang_oj -c "SELECT username, real_name, role FROM users WHERE role = 'teacher';"
```

**预期结果**: 应显示 18 个教师账号,无 teacher01/02/03

### API 测试验证

```bash
# 运行更新后的API测试
node tests/api/hierarchical-permission-api-test.js
node tests/api/smoke-test.js
```

### E2E 测试验证

```bash
# 运行smoke测试
npx playwright test tests/e2e/smoke/ -c tests/playwright.config.ts

# 运行回归测试
npx playwright test tests/e2e/regression/ -c tests/playwright.config.ts
```

---

## 📝 数据结构对照表

### 旧结构 vs 新结构

| 旧账号 | 新账号 (推荐) | 备注 |
|--------|-------------|------|
| teacher01 (张老师, 语文/数学) | teacher_yy_ps_math (蒋磊-云岩一小, 数学) | 主要测试账号 |
| teacher02 (李老师, 科学/英语) | teacher_yy_ps_it (韩雪-云岩一小, 信息科技) | 信息科技测试 |
| teacher03 (王老师, 物理) | 删除 | 不再使用 |

### 科目映射

| 旧科目 | 新科目 | 说明 |
|-------|--------|------|
| 语文 | 数学 | 改为数学科目 |
| 英语 | 信息科技 | 改为信息科技 |
| 科学 | 信息科技 | 改为信息科技 |
| 物理 | 删除 | 不再支持 |
| 数学 | 数学 | 保持不变 |

---

## ⚠️ 注意事项

1. **数据库迁移**: 如果生产环境已有数据,需要创建迁移脚本而非直接重建
2. **测试隔离**: 新教师账号按区县隔离,确保测试不会相互影响
3. **权限验证**: 验证不同区县教师之间的数据访问权限隔离
4. **文档同步**: 所有文档更新完成后,运行一次完整测试确保无遗漏
5. **回滚计划**: 保留 `backup_before_teacher_restructure.sql` 以防需要回滚

---

## 📊 进度跟踪

| 任务 | 状态 | 完成日期 |
|------|------|---------|
| database/seed.sql 更新 | ✅ 完成 | 2025-11-04 |
| docs/DEMO_GUIDE.md 更新 | ✅ 完成 | 2025-11-04 |
| API 测试文件更新 | ⏸️ 待处理 | - |
| E2E 测试文件更新 | ⏸️ 待处理 | - |
| 个人资料页面检查 | ⏸️ 待处理 | - |
| 数据库验证测试 | ⏸️ 待处理 | - |
| 完整回归测试 | ⏸️ 待处理 | - |

---

## 🔗 相关文档

- `database/seed.sql` - 种子数据文件 (已更新)
- `docs/DEMO_GUIDE.md` - 测试账号手册 (已更新)
- `documents/PENDING_WORK.md` - 待办事项
- `CLAUDE.md` - 开发指南

---

**最后更新**: 2025-11-04
**更新人**: Claude Code
**下一步行动**: 更新 API 测试文件 (13个文件)
