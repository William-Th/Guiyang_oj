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

-- 5) E2E 专属待审题目（教师审核流使用）：审核人固定 teacher_yy_ps_math。
--    审核动作会真实消费状态（approved→published / rejected→inactive），故每次运行前重置为待审。
INSERT INTO question_drafts (type, subject, grade, content, options, correct_answer, explanation, difficulty, suggested_score, knowledge_points, created_by)
SELECT 'single', '数学', '四年级',
       '【E2E】审核流测试题：小明有 12 个苹果，平均分给 3 个同学，每人分得几个？',
       '["3","4","6","12"]'::jsonb, '"B"'::jsonb, '12÷3=4，选 B。', 'easy', 5, ARRAY['除法']::text[], ru.id
FROM (SELECT id FROM users WHERE username = 'teacher_yy_ps_math') ru
WHERE NOT EXISTS (SELECT 1 FROM question_drafts WHERE content LIKE '【E2E】审核流测试题%');

INSERT INTO question_bank (draft_id, scope, status, reviewer_id, published_by)
SELECT d.id, 'practice_school_6', 'pending_review', ru.id, d.created_by
FROM question_drafts d
CROSS JOIN (SELECT id FROM users WHERE username = 'teacher_yy_ps_math') ru
WHERE d.content LIKE '【E2E】审核流测试题%'
  AND NOT EXISTS (SELECT 1 FROM question_bank qb WHERE qb.draft_id = d.id);

UPDATE question_bank qb
SET status = 'pending_review', review_comment = NULL, reviewed_at = NULL, is_active = true
FROM question_drafts d
WHERE qb.draft_id = d.id AND d.content LIKE '【E2E】审核流测试题%';

-- 6) E2E 专属未读通知（流程⑩通知中心使用）：无未读副本时补种，全部已读后重跑会再种
INSERT INTO user_notifications (user_id, type, title, content)
SELECT s.id, 'system', '【E2E】通知中心测试通知', '这是一条 E2E 测试通知，用于验证通知中心、未读角标与全部已读。'
FROM users s WHERE s.username = '13800138003'
  AND NOT EXISTS (
    SELECT 1 FROM user_notifications n
    WHERE n.user_id = s.id AND n.title = '【E2E】通知中心测试通知' AND n.is_read = false
  );

-- 7) E2E 专属报名记录（流程⑪学生"我的-报名记录"使用）：已驳回态，不进审批队列、
--    展示驳回原因字段；按 real_name 幂等。
INSERT INTO student_registration_requests
  (phone, real_name, birth_date, id_card_last4, district_id, district_code, district_name,
   school_id, school_code, school_name, grade, status, current_reviewer_level,
   reviewed_at, review_comment)
SELECT s.phone, 'E2E报名学生', '2014-05-20', '1234', sc.district_id, sc.code, sc.name,
       sc.id, sc.code, sc.name, '四年级', 'rejected', 3,
       CURRENT_TIMESTAMP, 'E2E：信息填写不完整，请补充后重新提交'
FROM users s
JOIN schools sc ON sc.id = 1
WHERE s.username = '13800138003'
  AND NOT EXISTS (
    SELECT 1 FROM student_registration_requests r
    WHERE r.phone = s.phone AND r.real_name = 'E2E报名学生'
  );

-- 8) E2E 编程题活动（流程⑫移动判题使用）：A+B 题（draft→bank 发布→用例挂 bank id）
INSERT INTO question_drafts (type, subject, grade, content, code_template, supported_languages, difficulty, suggested_score, knowledge_points, created_by, time_limit, memory_limit)
SELECT 'code', '信息科技', '五年级',
       '<p>A+B：输入两个整数（空格分隔），输出它们的和。</p>',
       E'# 输入两个整数，输出它们的和
# 在下面补全代码
',
       ARRAY['python','cpp','c']::text[], 'easy', 10, ARRAY['编程基础']::text[], ru.id, 1000, 256
FROM (SELECT id FROM users WHERE username = 'teacher_yy_ps_math') ru
WHERE NOT EXISTS (SELECT 1 FROM question_drafts WHERE content LIKE '%A+B：输入两个整数%');

INSERT INTO question_bank (draft_id, scope, status, reviewer_id, published_by, question_code)
SELECT d.id, 'practice_school_6', 'published', ru.id, ru.id, 'E2E-PB-0001'
FROM question_drafts d
CROSS JOIN (SELECT id FROM users WHERE username = 'teacher_yy_ps_math') ru
WHERE d.content LIKE '%A+B：输入两个整数%'
  AND NOT EXISTS (SELECT 1 FROM question_bank qb WHERE qb.draft_id = d.id);

-- 用例挂 bank id（judge-service 按提交的 questionId=bank.id 取用例）
INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, is_sample)
SELECT qb.id, t.n, t.i, t.o, 5, t.s
FROM question_bank qb
JOIN question_drafts d ON d.id = qb.draft_id AND d.content LIKE '%A+B：输入两个整数%'
CROSS JOIN (VALUES (1, '1 2', '3', true), (2, '10 20', '30', true)) AS t(n, i, o, s)
WHERE NOT EXISTS (
  SELECT 1 FROM test_cases tc WHERE tc.question_id = qb.id AND tc.case_number = t.n
);

INSERT INTO activities (title, description, subject, grade, type, time_limit_type, total_score, pass_score, status, created_by, scope, allow_retake, max_attempts)
SELECT '【E2E】小程序编程题练习', '小程序 E2E 编程判题专用', '信息科技', NULL, 'practice', 'unlimited', 10, 5, 'published',
 (SELECT id FROM users WHERE username = 'teacher_yy_ps_math'), 'school', true, 999
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE title = '【E2E】小程序编程题练习');

INSERT INTO activity_questions (activity_id, question_id, order_index, score)
SELECT a.id, qb.id, 1, 10
FROM activities a
JOIN question_bank qb ON qb.is_active = true
JOIN question_drafts d ON d.id = qb.draft_id AND d.content LIKE '%A+B：输入两个整数%'
WHERE a.title = '【E2E】小程序编程题练习'
  AND NOT EXISTS (SELECT 1 FROM activity_questions aq WHERE aq.activity_id = a.id);

-- 9) E2E 可报名测评（流程⑬学生自助报名使用）：报名窗口开放、未报名
INSERT INTO activities (title, description, subject, grade, type, time_limit_type, total_score, pass_score, status, created_by, scope, allow_retake, max_attempts, registration_enabled, registration_start_time, registration_end_time, start_time, end_time)
SELECT '【E2E】小程序测评报名', '小程序 E2E 报名流程专用（考试未开始）', '数学', '五年级', 'assessment', 'scheduled', 100, 60, 'published',
 (SELECT id FROM users WHERE username = 'teacher_yy_ps_math'), 'municipal', true, 999,
 true, NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 day',
 NOW() + INTERVAL '8 day', NOW() + INTERVAL '9 day'
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE title = '【E2E】小程序测评报名');

-- 每轮重置报名窗口与考试窗（报名后应在考试窗内才能作答；本活动考试窗始终未开始）
UPDATE activities
SET registration_start_time = NOW() - INTERVAL '1 day',
    registration_end_time = NOW() + INTERVAL '7 day',
    start_time = NOW() + INTERVAL '8 day',
    end_time = NOW() + INTERVAL '9 day'
WHERE title = '【E2E】小程序测评报名';

-- 9b) 已报名且考试窗进行中的测评（报名闸门正例：可作答）——直接插报名行
INSERT INTO activities (title, description, subject, grade, type, time_limit_type, total_score, pass_score, status, created_by, scope, allow_retake, max_attempts, registration_enabled, registration_start_time, registration_end_time, start_time, end_time)
SELECT '【E2E】小程序测评进行中', '小程序 E2E 已报名可作答专用', '数学', '五年级', 'assessment', 'scheduled', 100, 60, 'published',
 (SELECT id FROM users WHERE username = 'teacher_yy_ps_math'), 'municipal', true, 999,
 false, NOW() - INTERVAL '3 day', NOW() - INTERVAL '2 day',
 NOW() - INTERVAL '1 hour', NOW() + INTERVAL '1 day'
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE title = '【E2E】小程序测评进行中');

-- 保证该活动考试窗始终"进行中"
UPDATE activities
SET registration_start_time = NOW() - INTERVAL '3 day',
    registration_end_time = NOW() - INTERVAL '2 day',
    start_time = NOW() - INTERVAL '1 hour',
    end_time = NOW() + INTERVAL '1 day'
WHERE title = '【E2E】小程序测评进行中';

INSERT INTO assessment_registrations (activity_id, student_id, status, confirmed_at)
SELECT a.id, u.id, 'confirmed', NOW()
FROM activities a
CROSS JOIN (SELECT id FROM users WHERE username = '13800138003') u
WHERE a.title = '【E2E】小程序测评进行中'
  AND NOT EXISTS (
    SELECT 1 FROM assessment_registrations r
    WHERE r.activity_id = a.id AND r.student_id = u.id
  );

-- 给进行中测评绑 2 道单选题（列表可点入作答，与流程③同源选题）
INSERT INTO activity_questions (activity_id, question_id, order_index, score)
SELECT a.id, t.qid, t.rn, 10
FROM activities a
JOIN (
  SELECT qb.id AS qid, ROW_NUMBER() OVER (ORDER BY qb.id) AS rn
  FROM question_bank qb
  JOIN question_drafts qd ON qd.id = qb.draft_id
  WHERE qb.is_active = true AND qd.is_active = true AND qd.type = 'single'
  ORDER BY qb.id
  LIMIT 2
) t ON true
WHERE a.title = '【E2E】小程序测评进行中'
  AND NOT EXISTS (SELECT 1 FROM activity_questions aq WHERE aq.activity_id = a.id);

-- 每轮运行前清掉活动 13 的报名（E2E 流程⑬需从未报名态开始）
DELETE FROM assessment_registrations
WHERE activity_id = (SELECT id FROM activities WHERE title = '【E2E】小程序测评报名');
