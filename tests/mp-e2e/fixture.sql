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

-- 4) E2E 专属练习活动：可无限重做、不限时间（流程③整卷作答定向使用，与运行历史解耦）
INSERT INTO activities (title, description, subject, grade, type, time_limit_type, total_score, pass_score, status, created_by, scope, allow_retake, max_attempts)
SELECT '【E2E】小程序整卷作答练习', '小程序 E2E 专用，可重复作答', '数学', NULL, 'practice', 'unlimited', 100, 60, 'published',
 (SELECT id FROM users WHERE username = 'teacher_yy_ps_math'), 'school', true, 999
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE title = '【E2E】小程序整卷作答练习');

-- 给该活动绑 3 道单选题（幂等：已有题目则跳过）
INSERT INTO activity_questions (activity_id, question_id, order_index, score)
SELECT a.id, t.qid, t.rn, 10
FROM activities a
JOIN (
  SELECT qb.id AS qid, ROW_NUMBER() OVER (ORDER BY qb.id) AS rn
  FROM question_bank qb
  JOIN question_drafts qd ON qd.id = qb.draft_id
  WHERE qb.is_active = true AND qd.is_active = true AND qd.type = 'single'
  ORDER BY qb.id
  LIMIT 3
) t ON true
WHERE a.title = '【E2E】小程序整卷作答练习'
  AND NOT EXISTS (SELECT 1 FROM activity_questions aq WHERE aq.activity_id = a.id);

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

-- 4) E2E 专属待审注册申请（流程⑦管理端审批使用）
--    手机号由 run.js 按 '{{E2E_REG_PHONE}}' 占位轮换生成：审批会真实建号，同号二次审批会撞唯一约束，
--    故不做清理、每轮用新号（E2E 库允许留痕）。
INSERT INTO student_registration_requests (phone, real_name, birth_date, id_card_last4, district_id, district_code, district_name, school_id, school_code, school_name, grade, status, current_reviewer_level)
SELECT '{{E2E_REG_PHONE}}', 'E2E待审学生', '2014-05-20', '1234', d.id, d.code, d.name, sc.id, sc.code, sc.name, '五年级', 'pending', 2
FROM schools sc
JOIN districts d ON d.id = sc.district_id
WHERE sc.id = 1
  AND NOT EXISTS (SELECT 1 FROM student_registration_requests WHERE phone = '{{E2E_REG_PHONE}}');
