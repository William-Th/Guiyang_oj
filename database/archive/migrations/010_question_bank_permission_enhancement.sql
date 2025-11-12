-- ======================================================================
-- 题库权限管理系统优化迁移脚本
-- Version: 1.0
-- Date: 2025-11-03
-- Description: 实现分级题库管理和精细化权限控制
-- ======================================================================
--
-- 功能说明:
-- 1. 题库分级：测评题库、市级练习题库、区级练习题库、校级练习题库
-- 2. 权限细化：assessment_review, practice_municipal_review, practice_district_review
-- 3. 区域关联：district_id 字段自动关联区级权限
-- 4. 审核流程：严格的审核流程控制（除校级题库外）
--
-- 执行前请务必备份数据库！
-- pg_dump -U postgres guiyang_oj > backup_before_qb_permission_$(date +%Y%m%d_%H%M%S).sql
--
-- ======================================================================

BEGIN;

-- ======================================================================
-- STEP 1: 备份现有权限数据
-- ======================================================================

-- 创建临时备份表
CREATE TEMP TABLE teacher_permissions_backup AS
SELECT * FROM teacher_permissions;

-- 验证备份
DO $$
DECLARE
  original_count INTEGER;
  backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO original_count FROM teacher_permissions;
  SELECT COUNT(*) INTO backup_count FROM teacher_permissions_backup;

  IF original_count != backup_count THEN
    RAISE EXCEPTION 'Backup failed: count mismatch (original: %, backup: %)', original_count, backup_count;
  END IF;

  RAISE NOTICE 'Backup successful: % records backed up', backup_count;
END $$;

-- ======================================================================
-- STEP 2: 修改 teacher_permissions 表结构
-- ======================================================================

-- 2.1 添加新字段
ALTER TABLE teacher_permissions
ADD COLUMN IF NOT EXISTS scope_level VARCHAR(20) CHECK (scope_level IN ('municipal', 'district', 'school')),
ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id),
ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);

-- 2.2 添加字段注释
COMMENT ON COLUMN teacher_permissions.scope_level IS '权限层级: municipal-市级, district-区级, school-校级';
COMMENT ON COLUMN teacher_permissions.district_id IS '区级权限关联的区ID（scope_level=district时必填）';
COMMENT ON COLUMN teacher_permissions.school_id IS '校级权限关联的学校ID（scope_level=school时必填，当前预留）';
COMMENT ON COLUMN teacher_permissions.permission_type IS '权限类型: assessment_review-测评审核, practice_municipal_review-市级练习审核, practice_district_review-区级练习审核';

-- 2.3 删除旧的唯一约束
ALTER TABLE teacher_permissions DROP CONSTRAINT IF EXISTS teacher_permissions_user_id_permission_type_key;

-- 2.4 添加新的唯一约束（防止重复授权）
ALTER TABLE teacher_permissions
ADD CONSTRAINT teacher_permissions_unique_grant
UNIQUE (user_id, permission_type, scope_level, district_id);

-- 2.5 创建索引
CREATE INDEX IF NOT EXISTS idx_teacher_permissions_scope_level ON teacher_permissions(scope_level);
CREATE INDEX IF NOT EXISTS idx_teacher_permissions_district_id ON teacher_permissions(district_id);
CREATE INDEX IF NOT EXISTS idx_teacher_permissions_school_id ON teacher_permissions(school_id);

-- ======================================================================
-- STEP 3: 迁移现有权限数据到新结构
-- ======================================================================

-- 3.1 将旧的 question_bank_review 权限拆分为三种新权限

-- 为系统管理员和市级管理员添加所有三种权限
INSERT INTO teacher_permissions (user_id, permission_type, subjects, scope_level, district_id, granted_by, is_active, notes)
SELECT
  tp.user_id,
  'assessment_review' as permission_type,
  tp.subjects,
  'municipal' as scope_level,
  NULL as district_id,
  tp.granted_by,
  tp.is_active,
  '由旧的 question_bank_review 权限迁移而来'
FROM teacher_permissions tp
JOIN users u ON tp.user_id = u.id
WHERE tp.permission_type = 'question_bank_review'
  AND u.role IN ('system_admin', 'municipal_admin')
ON CONFLICT (user_id, permission_type, scope_level, district_id) DO NOTHING;

INSERT INTO teacher_permissions (user_id, permission_type, subjects, scope_level, district_id, granted_by, is_active, notes)
SELECT
  tp.user_id,
  'practice_municipal_review' as permission_type,
  tp.subjects,
  'municipal' as scope_level,
  NULL as district_id,
  tp.granted_by,
  tp.is_active,
  '由旧的 question_bank_review 权限迁移而来'
FROM teacher_permissions tp
JOIN users u ON tp.user_id = u.id
WHERE tp.permission_type = 'question_bank_review'
  AND u.role IN ('system_admin', 'municipal_admin')
ON CONFLICT (user_id, permission_type, scope_level, district_id) DO NOTHING;

-- 为区级管理员和普通教师添加区级权限（需要关联所属区）
INSERT INTO teacher_permissions (user_id, permission_type, subjects, scope_level, district_id, granted_by, is_active, notes)
SELECT
  tp.user_id,
  'practice_district_review' as permission_type,
  tp.subjects,
  'district' as scope_level,
  s.district_id,
  tp.granted_by,
  tp.is_active,
  '由旧的 question_bank_review 权限迁移而来（自动关联到教师所在区）'
FROM teacher_permissions tp
JOIN users u ON tp.user_id = u.id
JOIN teachers t ON u.id = t.user_id
JOIN schools s ON t.school_id = s.id
WHERE tp.permission_type = 'question_bank_review'
  AND u.role = 'teacher'
  AND s.district_id IS NOT NULL
ON CONFLICT (user_id, permission_type, scope_level, district_id) DO NOTHING;

-- 3.2 更新旧权限的 scope_level（保留兼容性）
UPDATE teacher_permissions
SET scope_level = 'municipal'
WHERE permission_type IN ('question_bank_review', 'assessment_review', 'competition_review')
  AND scope_level IS NULL;

-- 3.3 删除旧的 question_bank_review 权限（可选，建议保留一段时间以便回滚）
-- DELETE FROM teacher_permissions WHERE permission_type = 'question_bank_review';

-- ======================================================================
-- STEP 4: 更新 question_bank 表的 scope 字段
-- ======================================================================

-- 4.1 为现有题目添加默认 scope
-- 如果 scope 为空，默认设为市级练习题库
UPDATE question_bank
SET scope = ARRAY['practice_municipal']
WHERE (scope IS NULL OR scope = '{}')
  AND status = 'published';

-- 4.2 添加字段注释
COMMENT ON COLUMN question_bank.scope IS '题库范围数组: assessment-测评题库, practice_municipal-市级练习, practice_district_{code}-区级练习, practice_school_{id}-校级练习';

-- ======================================================================
-- STEP 5: 创建辅助函数和触发器
-- ======================================================================

-- 5.1 函数：验证区级权限必须关联 district_id
CREATE OR REPLACE FUNCTION validate_teacher_permission()
RETURNS TRIGGER AS $$
BEGIN
  -- 区级权限必须有 district_id
  IF NEW.scope_level = 'district' AND NEW.district_id IS NULL THEN
    RAISE EXCEPTION 'District-level permissions must have a district_id';
  END IF;

  -- 校级权限必须有 school_id（当前预留）
  IF NEW.scope_level = 'school' AND NEW.school_id IS NULL THEN
    RAISE EXCEPTION 'School-level permissions must have a school_id';
  END IF;

  -- 市级权限不应该有 district_id 或 school_id
  IF NEW.scope_level = 'municipal' AND (NEW.district_id IS NOT NULL OR NEW.school_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Municipal-level permissions should not have district_id or school_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.2 创建触发器
DROP TRIGGER IF EXISTS trigger_validate_teacher_permission ON teacher_permissions;
CREATE TRIGGER trigger_validate_teacher_permission
BEFORE INSERT OR UPDATE ON teacher_permissions
FOR EACH ROW
EXECUTE FUNCTION validate_teacher_permission();

COMMENT ON FUNCTION validate_teacher_permission() IS '验证教师权限的 scope_level 与 district_id/school_id 匹配性';

-- ======================================================================
-- STEP 6: 创建视图和统计函数
-- ======================================================================

-- 6.1 视图：权限统计（按层级和权限类型）
CREATE OR REPLACE VIEW permission_statistics AS
SELECT
  tp.permission_type,
  tp.scope_level,
  d.name as district_name,
  COUNT(DISTINCT tp.user_id) as teacher_count,
  ARRAY(
    SELECT DISTINCT unnest(array_agg(tp2.subjects))
    FROM teacher_permissions tp2
    WHERE tp2.permission_type = tp.permission_type
      AND tp2.scope_level = tp.scope_level
      AND (tp2.district_id = tp.district_id OR (tp2.district_id IS NULL AND tp.district_id IS NULL))
      AND tp2.is_active = true
      AND (tp2.expires_at IS NULL OR tp2.expires_at > CURRENT_TIMESTAMP)
  ) as covered_subjects
FROM teacher_permissions tp
LEFT JOIN districts d ON tp.district_id = d.id
WHERE tp.is_active = true
  AND (tp.expires_at IS NULL OR tp.expires_at > CURRENT_TIMESTAMP)
GROUP BY tp.permission_type, tp.scope_level, d.name, tp.district_id
ORDER BY tp.scope_level, tp.permission_type;

COMMENT ON VIEW permission_statistics IS '权限统计视图：按层级和权限类型统计教师数量和覆盖科目';

-- 6.2 视图：题库分布统计（按 scope）
CREATE OR REPLACE VIEW question_bank_distribution AS
SELECT
  s.scope_type,
  qb.subject,
  qb.grade,
  COUNT(*) as question_count,
  COUNT(CASE WHEN qb.status = 'published' THEN 1 END) as published_count,
  COUNT(CASE WHEN qb.status = 'draft' THEN 1 END) as draft_count,
  COUNT(CASE WHEN qb.status = 'pending_review' THEN 1 END) as pending_review_count
FROM question_bank qb
CROSS JOIN LATERAL unnest(qb.scope) AS s(scope_type)
WHERE qb.is_active = true
GROUP BY s.scope_type, qb.subject, qb.grade
ORDER BY s.scope_type, qb.subject, qb.grade;

COMMENT ON VIEW question_bank_distribution IS '题库分布统计：按 scope、科目、年级统计题目数量';

-- ======================================================================
-- STEP 7: 数据验证
-- ======================================================================

DO $$
DECLARE
  total_permissions INTEGER;
  municipal_permissions INTEGER;
  district_permissions INTEGER;
  invalid_district_permissions INTEGER;
BEGIN
  -- 检查权限总数
  SELECT COUNT(*) INTO total_permissions FROM teacher_permissions;
  RAISE NOTICE 'Total permissions: %', total_permissions;

  -- 检查市级权限数量
  SELECT COUNT(*) INTO municipal_permissions
  FROM teacher_permissions
  WHERE scope_level = 'municipal' AND is_active = true;
  RAISE NOTICE 'Municipal permissions: %', municipal_permissions;

  -- 检查区级权限数量
  SELECT COUNT(*) INTO district_permissions
  FROM teacher_permissions
  WHERE scope_level = 'district' AND is_active = true;
  RAISE NOTICE 'District permissions: %', district_permissions;

  -- 检查是否有无效的区级权限（没有 district_id）
  SELECT COUNT(*) INTO invalid_district_permissions
  FROM teacher_permissions
  WHERE scope_level = 'district' AND district_id IS NULL;

  IF invalid_district_permissions > 0 THEN
    RAISE WARNING 'Found % invalid district permissions without district_id', invalid_district_permissions;
  END IF;

  RAISE NOTICE 'Data validation completed';
END $$;

-- ======================================================================
-- STEP 8: 权限类型更新说明
-- ======================================================================

-- 显示权限类型对照表
DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE '权限类型对照表';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '旧权限类型                 → 新权限类型';
  RAISE NOTICE '-----------------------------------------';
  RAISE NOTICE 'question_bank_review      → assessment_review (测评审核)';
  RAISE NOTICE 'question_bank_review      → practice_municipal_review (市级练习审核)';
  RAISE NOTICE 'question_bank_review      → practice_district_review (区级练习审核)';
  RAISE NOTICE 'assessment_review         → 保留（测评审核）';
  RAISE NOTICE 'competition_review        → 保留（竞赛审核）';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Scope Level 说明：';
  RAISE NOTICE '- municipal: 市级权限（不关联区域）';
  RAISE NOTICE '- district:  区级权限（必须关联 district_id）';
  RAISE NOTICE '- school:    校级权限（预留，必须关联 school_id）';
  RAISE NOTICE '=========================================';
END $$;

COMMIT;

-- ======================================================================
-- 迁移完成
-- ======================================================================

-- 验证最终状态
SELECT '✅ 迁移完成！' as status;

-- 显示权限统计
SELECT '权限统计：' as info;
SELECT * FROM permission_statistics;

-- 显示题库分布
SELECT '题库分布统计：' as info;
SELECT * FROM question_bank_distribution LIMIT 20;

-- ======================================================================
-- 回滚脚本（仅供参考，请勿执行）
-- ======================================================================
/*
BEGIN;

-- 1. 删除触发器和函数
DROP TRIGGER IF EXISTS trigger_validate_teacher_permission ON teacher_permissions;
DROP FUNCTION IF EXISTS validate_teacher_permission();

-- 2. 删除视图
DROP VIEW IF EXISTS permission_statistics;
DROP VIEW IF EXISTS question_bank_distribution;

-- 3. 删除新增的权限记录
DELETE FROM teacher_permissions
WHERE permission_type IN ('assessment_review', 'practice_municipal_review', 'practice_district_review')
  AND notes LIKE '%由旧的 question_bank_review 权限迁移而来%';

-- 4. 删除新增字段
ALTER TABLE teacher_permissions
DROP COLUMN IF EXISTS scope_level,
DROP COLUMN IF EXISTS district_id,
DROP COLUMN IF EXISTS school_id;

-- 5. 恢复旧的唯一约束
ALTER TABLE teacher_permissions DROP CONSTRAINT IF EXISTS teacher_permissions_unique_grant;
ALTER TABLE teacher_permissions
ADD CONSTRAINT teacher_permissions_user_id_permission_type_key
UNIQUE (user_id, permission_type);

-- 6. 从备份恢复数据（如果需要）
-- TRUNCATE TABLE teacher_permissions;
-- INSERT INTO teacher_permissions SELECT * FROM teacher_permissions_backup;

COMMIT;
*/

-- ======================================================================
-- 使用说明
-- ======================================================================
/*
迁移后的使用方式：

1. 市级管理员/系统管理员授予测评审核权限：
   INSERT INTO teacher_permissions (user_id, permission_type, subjects, scope_level, granted_by)
   VALUES (教师ID, 'assessment_review', ARRAY['数学'], 'municipal', 管理员ID);

2. 市级管理员/系统管理员授予市级练习审核权限：
   INSERT INTO teacher_permissions (user_id, permission_type, subjects, scope_level, granted_by)
   VALUES (教师ID, 'practice_municipal_review', ARRAY['数学'], 'municipal', 管理员ID);

3. 区级管理员授予区级练习审核权限（自动关联区域）：
   INSERT INTO teacher_permissions (user_id, permission_type, subjects, scope_level, district_id, granted_by)
   VALUES (教师ID, 'practice_district_review', ARRAY['数学'], 'district', 管理员所在区ID, 管理员ID);

4. 题目发布到不同层级题库：
   -- 测评题库
   UPDATE question_bank SET scope = ARRAY['assessment'], status = 'published' WHERE id = 题目ID;

   -- 市级练习题库
   UPDATE question_bank SET scope = ARRAY['practice_municipal'], status = 'published' WHERE id = 题目ID;

   -- 区级练习题库（白云区）
   UPDATE question_bank SET scope = ARRAY['practice_district_BY'], status = 'published' WHERE id = 题目ID;

   -- 校级题库（学校ID=15）
   UPDATE question_bank SET scope = ARRAY['practice_school_15'], status = 'published' WHERE id = 题目ID;
*/
