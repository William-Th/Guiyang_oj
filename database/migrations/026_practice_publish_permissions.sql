-- Migration 026: 添加练习活动发布权限类型
-- 日期: 2025-11-26
-- 说明:
--   1. 扩展 teacher_permissions 表支持练习发布权限
--   2. 新增权限类型: practice_publish_municipal, practice_publish_district,
--      practice_publish_school, practice_publish_base_school, practice_publish_municipal_school
--   3. 班级练习不需要权限，管理员默认有对应区域权限

-- 更新 permission_type 列的注释，添加新的权限类型说明
COMMENT ON COLUMN teacher_permissions.permission_type IS
'权限类型:
  审核权限:
    assessment_review - 测评题库审核
    practice_municipal_review - 市级练习题库审核
    practice_district_review - 区级练习题库审核
  发布权限:
    practice_publish_municipal - 市级练习发布
    practice_publish_district - 区级练习发布
    practice_publish_school - 校级练习发布
    practice_publish_base_school - 基地学校练习发布
    practice_publish_municipal_school - 市直学校练习发布
  注意: 班级练习不需要权限，所有教师都可以创建';

-- 创建视图：查看练习发布权限统计
CREATE OR REPLACE VIEW practice_publish_permission_statistics AS
SELECT
  tp.permission_type,
  tp.scope_level,
  d.name AS district_name,
  s.name AS school_name,
  COUNT(DISTINCT tp.user_id) AS teacher_count,
  ARRAY(
    SELECT DISTINCT unnest(array_agg(tp2.subjects))
    FROM teacher_permissions tp2
    WHERE tp2.permission_type = tp.permission_type
      AND tp2.scope_level = tp.scope_level
      AND (tp2.district_id = tp.district_id OR (tp2.district_id IS NULL AND tp.district_id IS NULL))
      AND tp2.is_active = true
      AND (tp2.expires_at IS NULL OR tp2.expires_at > CURRENT_TIMESTAMP)
  ) AS covered_subjects
FROM teacher_permissions tp
LEFT JOIN districts d ON tp.district_id = d.id
LEFT JOIN schools s ON tp.school_id = s.id
WHERE tp.is_active = true
  AND (tp.expires_at IS NULL OR tp.expires_at > CURRENT_TIMESTAMP)
  AND tp.permission_type LIKE 'practice_publish_%'
GROUP BY tp.permission_type, tp.scope_level, d.name, s.name, tp.district_id
ORDER BY tp.scope_level, tp.permission_type;

COMMENT ON VIEW practice_publish_permission_statistics IS '练习发布权限统计视图';

-- 创建函数：检查用户是否有特定范围的练习发布权限
CREATE OR REPLACE FUNCTION check_practice_publish_permission(
  p_user_id INTEGER,
  p_scope VARCHAR(50),
  p_district_id INTEGER DEFAULT NULL,
  p_school_id INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_role VARCHAR(50);
  v_user_district_id INTEGER;
  v_user_school_id INTEGER;
  v_permission_type VARCHAR(50);
  v_has_permission BOOLEAN;
BEGIN
  -- 班级练习不需要权限
  IF p_scope = 'class' THEN
    RETURN TRUE;
  END IF;

  -- 获取用户角色和所属区域/学校信息
  SELECT u.role INTO v_user_role FROM users u WHERE u.id = p_user_id;

  -- 管理员默认有对应范围的权限
  IF v_user_role = 'system_admin' OR v_user_role = 'municipal_admin' THEN
    -- 系统管理员和市级管理员有所有权限
    RETURN TRUE;
  END IF;

  IF v_user_role = 'district_admin' AND p_scope = 'district' THEN
    -- 区级管理员默认有区级发布权限
    -- 检查是否在同一区域
    SELECT ap.district_id INTO v_user_district_id
    FROM admin_permissions ap WHERE ap.user_id = p_user_id;
    IF v_user_district_id = p_district_id OR p_district_id IS NULL THEN
      RETURN TRUE;
    END IF;
  END IF;

  IF v_user_role = 'school_admin' AND p_scope = 'school' THEN
    -- 校级管理员默认有校级发布权限
    SELECT ap.school_id INTO v_user_school_id
    FROM admin_permissions ap WHERE ap.user_id = p_user_id;
    IF v_user_school_id = p_school_id OR p_school_id IS NULL THEN
      RETURN TRUE;
    END IF;
  END IF;

  IF v_user_role = 'base_school_admin' AND p_scope = 'base_school' THEN
    RETURN TRUE;
  END IF;

  IF v_user_role = 'municipal_school_admin' AND p_scope = 'municipal_school' THEN
    RETURN TRUE;
  END IF;

  -- 检查 teacher_permissions 表中是否有授权
  v_permission_type := 'practice_publish_' || p_scope;

  SELECT EXISTS(
    SELECT 1 FROM teacher_permissions tp
    WHERE tp.user_id = p_user_id
      AND tp.permission_type = v_permission_type
      AND tp.is_active = true
      AND (tp.expires_at IS NULL OR tp.expires_at > CURRENT_TIMESTAMP)
      AND (p_district_id IS NULL OR tp.district_id IS NULL OR tp.district_id = p_district_id)
      AND (p_school_id IS NULL OR tp.school_id IS NULL OR tp.school_id = p_school_id)
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_practice_publish_permission(INTEGER, VARCHAR, INTEGER, INTEGER) IS
'检查用户是否有指定范围的练习发布权限。
参数:
  p_user_id: 用户ID
  p_scope: 范围 (class, school, district, base_school, municipal_school, municipal)
  p_district_id: 区域ID (可选)
  p_school_id: 学校ID (可选)
返回: BOOLEAN';

-- 完成
SELECT '练习发布权限迁移完成' AS status;
