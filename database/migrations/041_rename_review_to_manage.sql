-- Migration 041: 将审核权限重命名为管理权限
-- Date: 2026-02-20
-- Description: 将 _review 权限类型升级为 _manage（包含审核 + 撤回）

BEGIN;

-- 重命名审核权限为管理权限
UPDATE teacher_permissions SET permission_type = 'assessment_manage'
  WHERE permission_type = 'assessment_review';

UPDATE teacher_permissions SET permission_type = 'practice_municipal_manage'
  WHERE permission_type = 'practice_municipal_review';

UPDATE teacher_permissions SET permission_type = 'practice_district_manage'
  WHERE permission_type = 'practice_district_review';

UPDATE teacher_permissions SET permission_type = 'competition_manage'
  WHERE permission_type = 'competition_review';

-- 处理更早期的遗留权限类型 question_bank_review（统一迁移到测评管理权限）
-- 旧 question_bank_review 语义最接近"测评题库审核"，统一升级为 assessment_manage
-- 若同用户已存在 assessment_manage 同scope记录，唯一约束 (user_id, permission_type, scope_level, district_id)
-- 会触发 ON CONFLICT 行为；这里采用先禁用再清理的策略，避免冲突
UPDATE teacher_permissions
  SET is_active = false,
      notes = COALESCE(notes, '') || ' [系统自动禁用：question_bank_review 已废弃，需重新授权 assessment_manage]',
      updated_at = CURRENT_TIMESTAMP
  WHERE permission_type = 'question_bank_review';

COMMIT;
