-- 为测试账号添加测评题库审核权限
-- Add assessment review permissions for test teacher accounts

-- R409 测试需要 teacher01 和 teacher02 具有 assessment_review 权限
-- 这样他们才能审核提交到"测评题库"范围的题目

-- 为 teacher01 (李老师, user_id: 9) 添加测评题库审核权限
INSERT INTO teacher_permissions (user_id, permission_type, subjects, granted_by, is_active, notes)
VALUES
  (9, 'assessment_review', ARRAY['数学', '物理', '化学', '生物', '计算机'], 1, true, '为多选范围测试添加权限 - R409'),
  (10, 'assessment_review', ARRAY['数学', '物理', '化学', '生物', '计算机'], 1, true, '为多选范围测试添加权限 - R409')
ON CONFLICT (user_id, permission_type) DO UPDATE
SET subjects = EXCLUDED.subjects, is_active = true, updated_at = CURRENT_TIMESTAMP;

-- 验证权限已添加
-- 运行以下查询确认:
-- SELECT u.id, u.username, u.real_name, tp.permission_type, tp.subjects
-- FROM teacher_permissions tp
-- JOIN users u ON tp.user_id = u.id
-- WHERE u.username IN ('teacher01', 'teacher02')
-- ORDER BY u.id, tp.permission_type;

-- 预期结果应该包含:
--  id | username  | real_name |   permission_type    |           subjects
-- ----|-----------|-----------|----------------------|------------------------------
--   9 | teacher01 | 李老师    | assessment_review    | {数学,物理,化学,生物,计算机}
--   9 | teacher01 | 李老师    | question_bank_review | {数学,物理,化学,生物,计算机}
--  10 | teacher02 | 王老师    | assessment_review    | {数学,物理,化学,生物,计算机}
--  10 | teacher02 | 王老师    | question_bank_review | {数学,物理,化学,生物,计算机}
