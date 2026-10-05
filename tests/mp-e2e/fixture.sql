-- 小程序 E2E 夹具（幂等）：由 tests/mp-e2e/run.js 通过 docker exec psql 应用
-- 1) 家长测试账号（密码同种子 password123 的 bcrypt）
INSERT INTO users (username, password, role, real_name, phone, email)
VALUES ('mp_parent_test', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'parent', 'E2E家长', '13800139999', 'mp_parent_test@guiyang.edu')
ON CONFLICT (username) DO NOTHING;

-- 2) 家长-学生关联（绑定到种子学生 13800138003）
INSERT INTO parent_student_relations (parent_user_id, student_user_id, relation)
SELECT p.id, s.id, '父亲'
FROM users p, users s
WHERE p.username = 'mp_parent_test' AND s.username = '13800138003'
  AND NOT EXISTS (
    SELECT 1 FROM parent_student_relations r
    WHERE r.parent_user_id = p.id AND r.student_user_id = s.id
  );

-- 3) 学生错题：取一道未入错题本的单选题（供流程⑤错题重练）
INSERT INTO student_wrong_questions (student_id, question_id, draft_id, subject, knowledge_points, difficulty, error_count, status)
SELECT s.id, qb.id, qb.draft_id, qd.subject, COALESCE(qd.knowledge_points, ARRAY[]::text[]), 2, 1, 'active'
FROM users s
JOIN question_bank qb ON qb.is_active = true
JOIN question_drafts qd ON qd.id = qb.draft_id AND qd.is_active = true AND qd.type = 'single'
WHERE s.username = '13800138003'
  AND NOT EXISTS (
    SELECT 1 FROM student_wrong_questions w
    WHERE w.student_id = s.id AND w.question_id = qb.id
  )
LIMIT 1;
