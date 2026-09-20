# 数据库部署分析报告

生成时间：2025-11-11
分析人：Claude Code
状态：🔴 **发现严重问题，需要立即修复**

---

## 📋 执行摘要

本次分析检查了贵阳市小学生测评平台的所有数据库相关文件，发现了多个严重问题，可能导致服务器部署失败。以下是主要问题分类：

### 🔴 严重问题（必须修复）
1. **schema.sql 不完整** - 缺少25个表定义
2. **seed.sql 和 sample_data.sql 使用已废弃字段** - id_card字段冲突
3. **迁移脚本编号冲突** - 多个脚本使用相同编号

### 🟡 中等问题（建议修复）
1. **备份文件混杂在主目录** - 应归档
2. **无编号的迁移脚本** - 难以追踪执行顺序
3. **测试数据文件分散** - 缺乏统一管理

---

## 🔴 严重问题详细分析

### 问题 1: schema.sql 严重不完整

**问题描述：**
- 当前 `database/schema.sql` 仅包含 **12个表**
- 数据库实际运行有 **37个表**
- **缺失25个关键表**，包括核心业务表

**缺失的关键表：**
```
activities                      -- 活动表（核心）
student_activities              -- 学生活动表（核心）
question_bank                   -- 题库表（核心）
question_reviews                -- 题目审核表
subjects                        -- 科目表
student_registration_requests   -- 学生注册表
achievements                    -- 成就表
daily_tasks                     -- 每日任务表
student_achievements            -- 学生成就表
student_daily_tasks             -- 学生任务表
teacher_permissions             -- 教师权限表
leaderboards                    -- 排行榜表
student_points                  -- 学生积分表
points_shop_items               -- 积分商城表
... (共25个表)
```

**影响：**
- ⛔ 使用 schema.sql 部署会导致系统完全无法运行
- ⛔ 缺少核心业务表，所有功能将失效

**解决方案：**
```bash
# 已生成完整schema文件
database/schema_actual.sql  # 从当前数据库导出的完整schema（37个表）

# 建议操作：
1. 备份当前 schema.sql 为 schema_old.sql
2. 使用 schema_actual.sql 替换 schema.sql
3. 验证新schema文件的完整性
```

---

### 问题 2: seed.sql 使用已废弃的 id_card 字段

**问题描述：**
- 迁移脚本 `011_remove_id_card_field.sql` 已删除 users 表的 id_card 字段
- 但 `seed.sql` 和 `sample_data.sql` 仍在使用 id_card 字段插入数据

**冲突位置：**

**database/seed.sql:76**
```sql
INSERT INTO users (username, password, role, real_name, id_card, phone, email) VALUES
('520102200801011234', '$2a$10$...', 'student', '张小明', '520102200801011234', ...)
```

**database/sample_data.sql:15 和 21**
```sql
INSERT INTO users (username, password, role, real_name, id_card, phone, email) VALUES
(...)
```

**影响：**
- ⛔ 执行 seed.sql 会因字段不存在而失败
- ⛔ 学生账号无法创建，导致测试和演示环境失效

**解决方案：**
```sql
-- 修改 seed.sql 和 sample_data.sql 中的 INSERT 语句
-- 移除 id_card 字段

-- 修改前：
INSERT INTO users (username, password, role, real_name, id_card, phone, email) VALUES
('520102200801011234', '$2a$10$...', 'student', '张小明', '520102200801011234', '13800138003', ...);

-- 修改后：
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('13800138003', '$2a$10$...', 'student', '张小明', '13800138003', ...);
-- 注意：username 也需要从身份证号改为手机号
```

---

### 问题 3: 迁移脚本编号严重冲突

**问题描述：**
多个迁移脚本使用相同编号，无法确定正确执行顺序

**冲突列表：**

| 编号 | 脚本数量 | 文件名 |
|------|---------|--------|
| 001 | 2个 | `001_enhance_questions.sql`<br/>`001_add_score_to_certificates.sql` |
| 002 | 2个 | `002_activity_system_migration.sql`<br/>`002_rollback.sql` |
| 004 | 3个 | `004_fix_time_limit_data.sql`<br/>`004_fix_time_limit_data_v2.sql`<br/>`004_practice_time_limit_types.sql` |
| 011 | 3个 | `011_remove_id_card_field.sql`<br/>`011_add_creator_not_null_constraint.sql`<br/>`011_populate_reviewer_data.sql` |
| 012 | 2个 | `012_create_subjects_table.sql`<br/>`012_cleanup_old_permissions.sql` |
| 022 | 2个 | `022_daily_task_system_schema.sql`<br/>`022_enhance_daily_task_system.sql` |
| 023 | 2个 | `023_insert_initial_daily_tasks.sql`<br/>`023_fix_daily_tasks_constraints.sql` |

**无编号的迁移脚本：**
- `add_abilities_knowledge_points.sql`
- `add_question_code.sql`
- `add_question_level_review_system.sql`
- `add_teacher_assessment_permissions.sql`

**影响：**
- ⚠️ 无法确定迁移脚本的执行顺序
- ⚠️ 可能导致依赖关系错误
- ⚠️ 部署到新服务器时可能执行错误的脚本

**解决方案：**
需要重新编号所有迁移脚本，建议命名规范：
```
NNN_descriptive_name.sql

NNN = 三位数字（001-999）
descriptive_name = 描述性名称
```

**建议的重新编号方案（按功能和时间顺序）：**
```
001_enhance_questions.sql                    → 保持
002_add_score_to_certificates.sql           → 重命名（原001）
003_activity_system_migration.sql            → 重命名（原002）
004_remove_exam_tables.sql                   → 保持（原003）
005_practice_time_limit_types.sql            → 重命名（原004）
006_fix_time_limit_data.sql                  → 重命名（原004）
007_fix_time_limit_data_v2.sql              → 重命名（原004）
008_permission_system_enhancement.sql        → 重命名（原005）
009_student_registration_system.sql          → 重命名（原006）
010_activity_paper_generation.sql            → 重命名（原007）
011_assign_teachers_and_create_school_accounts.sql → 重命名（原008）
012_practice_assessment_system.sql           → 重命名（原009）
013_question_bank_permission_enhancement.sql → 重命名（原010）
014_remove_id_card_field.sql                → 重命名（原011）
015_add_creator_not_null_constraint.sql     → 重命名（原011）
016_populate_reviewer_data.sql              → 重命名（原011）
017_create_subjects_table.sql               → 重命名（原012）
018_cleanup_old_permissions.sql             → 重命名（原012）
019_add_system_scope.sql                    → 重命名（原013）
020_achievement_system_schema.sql            → 保持
021_insert_initial_achievements.sql          → 保持
022_daily_task_system_schema.sql            → 保持
023_enhance_daily_task_system.sql           → 重命名（原022）
024_insert_initial_daily_tasks.sql          → 重命名（原023）
025_fix_daily_tasks_constraints.sql         → 重命名（原023）
026_add_abilities_knowledge_points.sql      → 新编号
027_add_question_code.sql                   → 新编号
028_add_question_level_review_system.sql    → 新编号
029_add_teacher_assessment_permissions.sql  → 新编号
```

---

## 🟡 中等问题详细分析

### 问题 4: 备份文件混杂在主目录

**问题描述：**
多个备份文件直接存放在 `database/` 目录，未归档

**备份文件列表：**
```
database/backup_before_activity_migration_20251021_212342.sql    (1.5MB)
database/backup_before_exam_removal_20251023_015018.sql          (1.2MB)
database/backup_before_qb_permission_20251103_213445.sql         (2.1MB)
database/backup_before_time_limit_migration_20251025_213139.sql  (1.3MB)
```

**建议操作：**
```bash
# 创建备份目录
mkdir -p database/backups

# 移动备份文件
mv database/backup_*.sql database/backups/

# 移动清理脚本（如果不再需要）
mv database/cleanup*.sql database/backups/
```

---

### 问题 5: 测试数据文件分散

**测试/演示数据文件：**
```
database/seed.sql                      (18KB)  - 主种子数据
database/sample_data.sql               (9.5KB) - 示例数据
database/insert_test_questions.sql     (12KB)  - 测试题目
database/insert_baiyun_questions.sql   (22KB)  - 白云区题目
database/add_question_bank_data.sql    (58KB)  - 题库数据
database/create_baiyun_admin.sql       (小文件) - 白云区管理员
```

**问题：**
- 文件用途不清晰
- 缺少执行顺序说明
- 不清楚哪些是必需的，哪些是可选的

**建议：**
创建 `database/README.md` 说明文件用途和执行顺序

---

## ✅ 部署建议方案

### 方案 A: 全新部署（推荐用于新服务器）

**步骤：**
```bash
# 1. 创建数据库
psql -U postgres -c "CREATE DATABASE guiyang_oj;"

# 2. 导入完整schema（使用导出的实际schema）
psql -U postgres -d guiyang_oj -f database/schema_actual.sql

# 3. 导入基础数据（修复id_card问题后）
# 注意：需要先修复 seed.sql 中的 id_card 问题
psql -U postgres -d guiyang_oj -f database/seed.sql

# 4. 导入题库数据（可选）
psql -U postgres -d guiyang_oj -f database/add_question_bank_data.sql

# 5. 验证
psql -U postgres -d guiyang_oj -c "\dt"  # 应显示37个表
```

### 方案 B: 使用迁移脚本部署（需要修复编号冲突）

**前置条件：**
- 必须先重新编号所有迁移脚本
- 创建迁移执行追踪表

**步骤：**
```bash
# 1. 创建数据库
psql -U postgres -c "CREATE DATABASE guiyang_oj;"

# 2. 导入基础schema（仅基础表）
psql -U postgres -d guiyang_oj -f database/schema.sql

# 3. 按顺序执行迁移脚本（需要按新编号执行）
for file in database/migrations/*.sql; do
  echo "Executing $file..."
  psql -U postgres -d guiyang_oj -f "$file"
done

# 4. 导入种子数据
psql -U postgres -d guiyang_oj -f database/seed.sql
```

### 方案 C: 使用当前数据库导出（最安全，推荐用于迁移）

**步骤：**
```bash
# 1. 导出完整数据库（包括schema和数据）
docker exec guiyang_oj_postgres pg_dump -U postgres guiyang_oj > database/full_backup.sql

# 2. 在新服务器上创建数据库
psql -U postgres -c "CREATE DATABASE guiyang_oj;"

# 3. 导入完整备份
psql -U postgres -d guiyang_oj -f database/full_backup.sql

# 4. 验证
psql -U postgres -d guiyang_oj -c "SELECT COUNT(*) FROM users;"
```

---

## 📝 立即需要执行的修复操作

### 1. 修复 schema.sql（最高优先级）

```bash
# 备份旧文件
cp database/schema.sql database/schema_old_incomplete.sql

# 使用完整schema
cp database/schema_actual.sql database/schema.sql

# 验证
grep -c "^CREATE TABLE" database/schema.sql  # 应显示37
```

### 2. 修复 seed.sql 中的 id_card 问题（高优先级）

需要手工编辑以下文件，移除 id_card 字段：
- `database/seed.sql` - 第76行
- `database/sample_data.sql` - 第15行和第21行

修改示例参考上面"问题2"的解决方案。

### 3. 整理备份文件（中优先级）

```bash
mkdir -p database/backups
mv database/backup_*.sql database/backups/
mv database/cleanup*.sql database/backups/
```

### 4. 创建数据库文件说明文档（中优先级）

创建 `database/README.md` 说明：
- 每个SQL文件的用途
- 部署时的执行顺序
- 必需文件 vs 可选文件

---

## 📊 文件清单总结

### 核心文件（必需）
- ✅ `schema_actual.sql` - 完整schema（37个表）⚠️ **新生成**
- ⚠️ `schema.sql` - 旧schema（12个表）**需要替换**
- ⚠️ `seed.sql` - 种子数据 **需要修复id_card**

### 迁移脚本（29个，需要重新编号）
- 位于 `database/migrations/`
- 存在编号冲突，需要重新组织

### 备份文件（4个，建议归档）
- `backup_before_*.sql` (4个文件，共6.1MB)

### 测试/补充数据（可选）
- `sample_data.sql`
- `insert_test_questions.sql`
- `insert_baiyun_questions.sql`
- `add_question_bank_data.sql`
- `create_baiyun_admin.sql`

### 临时/清理文件（可归档或删除）
- `cleanup_old_subjects.sql`
- `cleanup_subjects.sql`
- `insert_test_questions.sql`
- `new_subjects_data.sql`
- `supplement_questions.sql`

---

## ⚠️ 部署风险警告

### 高风险操作（请勿执行）
❌ **直接使用当前的 schema.sql 部署** - 会导致系统完全无法运行
❌ **直接使用当前的 seed.sql** - 会因id_card字段不存在而失败
❌ **按文件名顺序执行迁移脚本** - 编号冲突导致错误

### 安全操作（推荐）
✅ **使用 schema_actual.sql 替换 schema.sql**
✅ **修复 seed.sql 后再使用**
✅ **或者直接导出当前完整数据库使用**（方案C）

---

## 🎯 总结和建议

### 当前状态
- 🔴 数据库文件存在严重不一致问题
- 🔴 无法直接用于生产环境部署
- 🟡 需要整理和规范化管理

### 推荐行动方案

**立即执行（今天）：**
1. ✅ 使用 schema_actual.sql 替换 schema.sql
2. ✅ 修复 seed.sql 和 sample_data.sql 中的 id_card 问题
3. ✅ 在测试环境验证修复后的文件

**短期执行（本周）：**
1. 重新编号所有迁移脚本
2. 整理备份文件到 backups/ 目录
3. 创建 database/README.md 文档
4. 在测试服务器上完整部署一次，验证所有步骤

**长期改进（本月）：**
1. 建立迁移脚本版本追踪机制
2. 创建自动化部署脚本
3. 定期同步 schema.sql 与实际数据库
4. 建立数据库变更审查流程

---

## 📞 联系和支持

如有任何问题或需要进一步协助，请联系开发团队。

**文档版本：** 1.0
**生成日期：** 2025-11-11
**下次审查：** 修复完成后
