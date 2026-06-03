-- ============================================================
-- 演示数据补充脚本 (database/demo_data.sql)
-- 用途：为系统各功能页面填充丰富的演示数据
-- 运行时机：在 schema.sql + seed.sql + 迁移文件之后运行
-- 运行方式：
--   docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/demo_data.sql
-- ============================================================

-- 修复过时的FK约束（activity_questions.question_id 指向已备份的旧表）
ALTER TABLE activity_questions DROP CONSTRAINT IF EXISTS activity_questions_question_id_fkey;
ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_question_id_fkey;

DO $$
DECLARE
  -- 核心用户/学生ID
  v_stu1_uid INT; v_stu2_uid INT; v_stu3_uid INT;
  v_stu1_id INT := 28;  -- 张小明 students.id
  v_stu2_id INT := 29;  -- 李小红
  v_stu3_id INT := 30;  -- 王小刚
  v_tchr_yy_math_uid INT; v_tchr_yy_it_uid INT;
  v_admin_id INT;
  v_school_admin_uid INT;

  -- 题库ID（已有35道，取子集使用）
  v_qb_math_ids INTEGER[];
  v_qb_it_ids INTEGER[];

  -- 新活动ID
  v_act_past1 INT; v_act_past2 INT; v_act_past3 INT;
  v_act_ongoing1 INT; v_act_ongoing2 INT;
  v_act_future1 INT;
  v_act_draft1 INT;
  v_practice1 INT; v_practice2 INT;

  -- 新学生活动ID
  v_sa_new1 INT; v_sa_new2 INT; v_sa_new3 INT; v_sa_new4 INT;
  v_sa_new5 INT; v_sa_new6 INT; v_sa_new7 INT;

  -- 教学班ID
  v_tc1 INT; v_tc2 INT; v_tc3 INT;

BEGIN
  -- 获取核心用户ID
  SELECT id INTO v_admin_id FROM users WHERE username = 'admin';
  SELECT id INTO v_stu1_uid FROM users WHERE username = '13800138003';
  SELECT id INTO v_stu2_uid FROM users WHERE username = '13800138004';
  SELECT id INTO v_stu3_uid FROM users WHERE username = '13800138005';
  SELECT id INTO v_tchr_yy_math_uid FROM users WHERE username = 'teacher_yy_ps_math';
  SELECT id INTO v_tchr_yy_it_uid FROM users WHERE username = 'teacher_yy_ps_it';
  SELECT id INTO v_school_admin_uid FROM users WHERE username = 'school_admin_01';

  RAISE NOTICE '用户ID已获取: admin=%, 张小明=%, 李小红=%, 王小刚=%', v_admin_id, v_stu1_uid, v_stu2_uid, v_stu3_uid;

  -- 获取已有题库ID（按科目分组）
  SELECT array_agg(qb.id ORDER BY qb.id) INTO v_qb_math_ids
  FROM question_bank qb JOIN question_drafts qd ON qb.draft_id = qd.id
  WHERE qd.subject = '数学' AND qb.status = 'published';

  SELECT array_agg(qb.id ORDER BY qb.id) INTO v_qb_it_ids
  FROM question_bank qb JOIN question_drafts qd ON qb.draft_id = qd.id
  WHERE qd.subject = '信息科技' AND qb.status = 'published';

  RAISE NOTICE '题库: 数学=%道, 信息科技=%道',
    COALESCE(array_length(v_qb_math_ids,1),0),
    COALESCE(array_length(v_qb_it_ids, 1), 0);

  -- ============================================
  -- 1. 补充题库：添加缺少的 essay 和 multiple 类型
  -- ============================================
  -- 先创建 question_drafts
  WITH new_drafts AS (
    INSERT INTO question_drafts (type, subject, grade, content, options, correct_answer, explanation, difficulty, level, suggested_score, abilities, knowledge_points, tags, created_by)
    VALUES
      -- 多选题
      ('multiple', '数学', '三年级', '下列哪些数是偶数？（多选）',
       '[{"label":"A","content":"12"},{"label":"B","content":"15"},{"label":"C","content":"28"},{"label":"D","content":"33"}]',
       '["A","C"]', '能被2整除的数是偶数：12÷2=6, 28÷2=14，所以12和28是偶数',
       'easy', 'L2', 8, '{"数感"}', '{"奇偶性"}', '{"偶数","多选"}', v_tchr_yy_math_uid),

      ('multiple', '信息科技', '四年级', '以下哪些属于编程语言？（多选）',
       '[{"label":"A","content":"Python"},{"label":"B","content":"Word"},{"label":"C","content":"Scratch"},{"label":"D","content":"C++"}]',
       '["A","C","D"]', 'Python、Scratch和C++都是编程语言，Word是文字处理软件',
       'medium', 'L3', 8, '{"计算思维"}', '{"编程概念"}', '{"编程语言"}', v_tchr_yy_it_uid),

      -- 简答题
      ('essay', '数学', '三年级', '小明有35元，买了一本书花了12元，又买了一个文具盒花了8元。请问他还剩多少钱？请写出计算过程。',
       NULL, '"35-12-8=15（元），答：小明还剩15元。"', '用总金额减去两次花费即可', 'easy', 'L2', 10,
       '{"计算思维"}', '{"两步计算"}', '{"减法","应用题"}', v_tchr_yy_math_uid),

      ('essay', '信息科技', '四年级', '请简述什么是算法？并用生活中的例子来解释。',
       NULL, '"算法是解决问题的一系列步骤。例如做菜的食谱就是一种算法——按照步骤准备食材、切菜、烹饪、调味。"',
       '算法是解决问题的有序步骤', 'medium', 'L3', 10,
       '{"计算思维"}', '{"算法基础"}', '{"算法","概念"}', v_tchr_yy_it_uid)
    RETURNING id
  )
  -- 为每个新 draft 创建对应的 question_bank 条目
  INSERT INTO question_bank (draft_id, scope, status, published_by)
  SELECT nd.id, 'assessment', 'published', v_tchr_yy_math_uid
  FROM new_drafts nd;

  -- 重新获取题库ID（包含新增的）
  SELECT array_agg(qb.id ORDER BY qb.id) INTO v_qb_math_ids
  FROM question_bank qb JOIN question_drafts qd ON qb.draft_id = qd.id
  WHERE qd.subject = '数学' AND qb.status = 'published';

  SELECT array_agg(qb.id ORDER BY qb.id) INTO v_qb_it_ids
  FROM question_bank qb JOIN question_drafts qd ON qb.draft_id = qd.id
  WHERE qd.subject = '信息科技' AND qb.status = 'published';

  RAISE NOTICE '题库已补充: 数学=%道, 信息科技=%道',
    COALESCE(array_length(v_qb_math_ids,1),0),
    COALESCE(array_length(v_qb_it_ids,1),0);

  -- ============================================
  -- 2. 更新已有活动的成绩（原数据分数太低）
  -- ============================================
  UPDATE student_activities SET score = 88.00, grading_status = 'completed' WHERE id = 1;  -- 张小明-数学
  UPDATE student_activities SET score = 95.00, grading_status = 'completed' WHERE id = 2;  -- 李小红-数学
  UPDATE student_activities SET score = 72.00, grading_status = 'completed' WHERE id = 3;  -- 王小刚-数学
  UPDATE student_activities SET score = 92.00, grading_status = 'completed' WHERE id = 4;  -- 张小明-信息科技
  UPDATE student_activities SET score = 85.00, grading_status = 'completed' WHERE id = 5;  -- 李小红-信息科技
  UPDATE student_activities SET score = 78.00, grading_status = 'completed' WHERE id = 6;  -- 王小刚-信息科技

  -- 更新已有活动的状态
  UPDATE activities SET status = 'finished', paper_status = 'completed', question_count = 6, total_score = 100 WHERE id = 1;
  UPDATE activities SET paper_status = 'completed', question_count = 6, total_score = 100 WHERE id = 2;

  -- 为已有活动添加题目关联
  FOR i IN 1..LEAST(6, COALESCE(array_length(v_qb_math_ids,1),0)) LOOP
    INSERT INTO activity_questions (activity_id, question_id, order_index, score)
    VALUES (1, v_qb_math_ids[i], i, CASE WHEN i <= 4 THEN 12 ELSE 26 END)
    ON CONFLICT (activity_id, question_id) DO NOTHING;
  END LOOP;

  FOR i IN 1..LEAST(6, COALESCE(array_length(v_qb_it_ids,1),0)) LOOP
    INSERT INTO activity_questions (activity_id, question_id, order_index, score)
    VALUES (2, v_qb_it_ids[i], i, CASE WHEN i <= 4 THEN 12 ELSE 26 END)
    ON CONFLICT (activity_id, question_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE '已有活动已更新';

  -- ============================================
  -- 3. 创建丰富的活动数据
  -- ============================================
  -- 已完成的测评
  INSERT INTO activities (title, description, subject, grade, type, time_limit_type, start_time, end_time, total_score, pass_score, status, created_by, scope, ability_level, paper_status, question_count, is_official)
  VALUES
    ('2025年秋季三年级数学期中测评', '2025年秋季学期三年级数学期中统一测评，涵盖计算、图形、应用题', '数学', '三年级', 'assessment', 'scheduled',
     '2025-11-15 09:00:00', '2025-11-15 10:30:00', 100, 60, 'finished',
     v_tchr_yy_math_uid, 'municipal', 'L2', 'completed', 8, true)
  RETURNING id INTO v_act_past1;

  INSERT INTO activities (title, description, subject, grade, type, time_limit_type, start_time, end_time, total_score, pass_score, status, created_by, scope, ability_level, paper_status, question_count, is_official)
  VALUES
    ('2025年秋季信息科技期末测评', '2025年秋季学期信息科技期末测评，考察计算机基础和编程概念', '信息科技', '三年级', 'assessment', 'scheduled',
     '2025-12-20 14:00:00', '2025-12-20 15:30:00', 100, 60, 'finished',
     v_tchr_yy_it_uid, 'municipal', 'L2', 'completed', 8, true)
  RETURNING id INTO v_act_past2;

  INSERT INTO activities (title, description, subject, grade, type, time_limit_type, start_time, end_time, total_score, pass_score, status, created_by, scope, ability_level, paper_status, question_count, is_official)
  VALUES
    ('2026年云岩区数学月考', '云岩区2026年3月三年级数学统一月考', '数学', '三年级', 'assessment', 'scheduled',
     '2026-03-20 09:00:00', '2026-03-20 10:00:00', 80, 48, 'finished',
     v_tchr_yy_math_uid, 'district', 'L3', 'completed', 6, false)
  RETURNING id INTO v_act_past3;

  -- 正在进行的测评
  INSERT INTO activities (title, description, subject, grade, type, time_limit_type, start_time, end_time, total_score, pass_score, status, created_by, scope, ability_level, paper_status, question_count, is_official)
  VALUES
    ('2026年春季数学期末测评', '2026年春季学期三年级数学期末统一测评', '数学', '三年级', 'assessment', 'scheduled',
     '2025-05-28 09:00:00', '2026-06-05 17:00:00', 100, 60, 'ongoing',
     v_tchr_yy_math_uid, 'municipal', 'L3', 'completed', 8, true)
  RETURNING id INTO v_act_ongoing1;

  INSERT INTO activities (title, description, subject, grade, type, time_limit_type, start_time, end_time, total_score, pass_score, status, created_by, scope, ability_level, paper_status, question_count, is_official)
  VALUES
    ('2026年信息科技能力认证-L3', '信息科技L3级别能力认证测评，包含编程基础和算法思维', '信息科技', '四年级', 'assessment', 'scheduled',
     '2026-05-25 09:00:00', '2026-06-10 17:00:00', 100, 60, 'ongoing',
     v_tchr_yy_it_uid, 'municipal', 'L3', 'completed', 8, true)
  RETURNING id INTO v_act_ongoing2;

  -- 即将开始的测评
  INSERT INTO activities (title, description, subject, grade, type, time_limit_type, start_time, end_time, total_score, pass_score, status, created_by, scope, ability_level, paper_status, question_count, is_official)
  VALUES
    ('2026年夏季数学竞赛', '贵阳市小学生数学竞赛选拔赛', '数学', '四年级', 'assessment', 'scheduled',
     '2026-06-20 09:00:00', '2026-06-20 11:00:00', 100, 60, 'published',
     v_admin_id, 'municipal', 'L5', 'completed', 10, true)
  RETURNING id INTO v_act_future1;

  -- 草稿
  INSERT INTO activities (title, description, subject, grade, type, time_limit_type, total_score, pass_score, status, created_by, scope, ability_level, paper_status, question_count)
  VALUES
    ('2026年秋季数学摸底测试', '新学期数学摸底测试（草稿中）', '数学', '四年级', 'assessment', 'unlimited', 80, 48, 'draft',
     v_tchr_yy_math_uid, 'school', 'L2', 'empty', 0)
  RETURNING id INTO v_act_draft1;

  -- 练习活动
  INSERT INTO activities (title, description, subject, grade, type, time_limit_type, total_score, pass_score, status, created_by, scope, ability_level, paper_status, question_count, allow_retake, max_attempts)
  VALUES
    ('数学基础计算天天练', '三年级数学基础计算练习，每天可做，巩固计算能力', '数学', '三年级', 'practice', 'unlimited', 30, 18, 'published',
     v_tchr_yy_math_uid, 'municipal', 'L1', 'completed', 5, true, 99)
  RETURNING id INTO v_practice1;

  INSERT INTO activities (title, description, subject, grade, type, time_limit_type, duration, total_score, pass_score, status, created_by, scope, ability_level, paper_status, question_count, allow_retake, max_attempts)
  VALUES
    ('信息科技知识闯关', '信息科技基础知识练习，限时30分钟', '信息科技', '三年级', 'practice', 'timed', 30, 50, 30, 'published',
     v_tchr_yy_it_uid, 'municipal', 'L1', 'completed', 8, true, 99)
  RETURNING id INTO v_practice2;

  RAISE NOTICE '活动数据已创建: 过去3 + 进行中2 + 未来1 + 草稿1 + 练习2';

  -- 为新活动分配题目
  -- 过去测评1（数学）
  FOR i IN 1..LEAST(8, COALESCE(array_length(v_qb_math_ids,1),0)) LOOP
    INSERT INTO activity_questions (activity_id, question_id, order_index, score)
    VALUES (v_act_past1, v_qb_math_ids[i], i,
      CASE WHEN i <= 4 THEN 10 WHEN i <= 6 THEN 12 WHEN i <= 7 THEN 8 ELSE 20 END)
    ON CONFLICT (activity_id, question_id) DO NOTHING;
  END LOOP;

  -- 过去测评2（信息科技）
  FOR i IN 1..LEAST(8, COALESCE(array_length(v_qb_it_ids,1),0)) LOOP
    INSERT INTO activity_questions (activity_id, question_id, order_index, score)
    VALUES (v_act_past2, v_qb_it_ids[i], i,
      CASE WHEN i <= 4 THEN 10 WHEN i <= 6 THEN 12 WHEN i <= 7 THEN 8 ELSE 20 END)
    ON CONFLICT (activity_id, question_id) DO NOTHING;
  END LOOP;

  -- 过去测评3（数学月考）
  FOR i IN 1..LEAST(6, COALESCE(array_length(v_qb_math_ids,1),0)) LOOP
    INSERT INTO activity_questions (activity_id, question_id, order_index, score)
    VALUES (v_act_past3, v_qb_math_ids[i], i, CASE WHEN i <= 4 THEN 10 ELSE 20 END)
    ON CONFLICT (activity_id, question_id) DO NOTHING;
  END LOOP;

  -- 进行中测评
  FOR i IN 1..LEAST(8, COALESCE(array_length(v_qb_math_ids,1),0)) LOOP
    INSERT INTO activity_questions (activity_id, question_id, order_index, score)
    VALUES (v_act_ongoing1, v_qb_math_ids[i], i,
      CASE WHEN i <= 4 THEN 10 WHEN i <= 6 THEN 12 WHEN i <= 7 THEN 8 ELSE 20 END)
    ON CONFLICT (activity_id, question_id) DO NOTHING;
  END LOOP;

  FOR i IN 1..LEAST(8, COALESCE(array_length(v_qb_it_ids,1),0)) LOOP
    INSERT INTO activity_questions (activity_id, question_id, order_index, score)
    VALUES (v_act_ongoing2, v_qb_it_ids[i], i,
      CASE WHEN i <= 4 THEN 10 WHEN i <= 6 THEN 12 WHEN i <= 7 THEN 8 ELSE 20 END)
    ON CONFLICT (activity_id, question_id) DO NOTHING;
  END LOOP;

  -- 练习活动
  FOR i IN 1..LEAST(5, COALESCE(array_length(v_qb_math_ids,1),0)) LOOP
    INSERT INTO activity_questions (activity_id, question_id, order_index, score)
    VALUES (v_practice1, v_qb_math_ids[i], i, 6)
    ON CONFLICT (activity_id, question_id) DO NOTHING;
  END LOOP;

  FOR i IN 1..LEAST(8, COALESCE(array_length(v_qb_it_ids,1),0)) LOOP
    INSERT INTO activity_questions (activity_id, question_id, order_index, score)
    VALUES (v_practice2, v_qb_it_ids[i], i, CASE WHEN i <= 4 THEN 5 ELSE 10 END)
    ON CONFLICT (activity_id, question_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE '活动题目关联已创建';

  -- ============================================
  -- 4. 创建学生活动记录（丰富的答题数据）
  -- ============================================
  -- 张小明 - 数学期中（已完成 88分）
  INSERT INTO student_activities (student_id, activity_id, status, start_time, submit_time, score, attempt_number, grading_status, started_at)
  VALUES (v_stu1_uid, v_act_past1, 'graded', '2025-11-15 09:05:00', '2025-11-15 10:15:00', 88.00, 1, 'completed', '2025-11-15 09:05:00')
  RETURNING id INTO v_sa_new1;

  -- 张小明 - 信息科技期末（已完成 92分）
  INSERT INTO student_activities (student_id, activity_id, status, start_time, submit_time, score, attempt_number, grading_status, started_at)
  VALUES (v_stu1_uid, v_act_past2, 'graded', '2025-12-20 14:02:00', '2025-12-20 15:10:00', 92.00, 1, 'completed', '2025-12-20 14:02:00')
  RETURNING id INTO v_sa_new2;

  -- 张小明 - 云岩区月考（已完成 76分）
  INSERT INTO student_activities (student_id, activity_id, status, start_time, submit_time, score, attempt_number, grading_status, started_at)
  VALUES (v_stu1_uid, v_act_past3, 'graded', '2026-03-20 09:03:00', '2026-03-20 09:55:00', 76.00, 1, 'completed', '2026-03-20 09:03:00')
  RETURNING id INTO v_sa_new3;

  -- 张小明 - 当前数学期末（已提交，有主观题待批改）
  INSERT INTO student_activities (student_id, activity_id, status, start_time, submit_time, score, attempt_number, grading_status, started_at)
  VALUES (v_stu1_uid, v_act_ongoing1, 'submitted', '2026-06-01 09:10:00', '2026-06-01 10:20:00', 72.00, 1, 'partial_graded', '2026-06-01 09:10:00')
  RETURNING id INTO v_sa_new4;

  -- 李小红 - 数学期中（95分）
  INSERT INTO student_activities (student_id, activity_id, status, start_time, submit_time, score, attempt_number, grading_status, started_at)
  VALUES (v_stu2_uid, v_act_past1, 'graded', '2025-11-15 09:00:00', '2025-11-15 09:50:00', 95.00, 1, 'completed', '2025-11-15 09:00:00')
  RETURNING id INTO v_sa_new5;

  -- 王小刚 - 数学期中（72分）
  INSERT INTO student_activities (student_id, activity_id, status, start_time, submit_time, score, attempt_number, grading_status, started_at)
  VALUES (v_stu3_uid, v_act_past1, 'graded', '2025-11-15 09:08:00', '2025-11-15 10:25:00', 72.00, 1, 'completed', '2025-11-15 09:08:00')
  RETURNING id INTO v_sa_new6;

  -- 张小明 - 数学基础练习
  INSERT INTO student_activities (student_id, activity_id, status, start_time, submit_time, score, attempt_number, grading_status, started_at)
  VALUES (v_stu1_uid, v_practice1, 'graded', '2026-06-02 16:30:00', '2026-06-02 16:45:00', 28.00, 1, 'auto_graded', '2026-06-02 16:30:00')
  RETURNING id INTO v_sa_new7;

  RAISE NOTICE '学生活动记录已创建: 7条';

  -- ============================================
  -- 5. 创建答题记录 (answers)
  -- ============================================
  -- 张小明 - 数学期中 (sa_new1, 88分)
  FOR i IN 1..LEAST(8, COALESCE(array_length(v_qb_math_ids,1),0)) LOOP
    INSERT INTO answers (student_exam_id, question_id, answer, is_correct, score, grading_status, auto_score)
    VALUES (
      v_sa_new1, v_qb_math_ids[i],
      CASE i WHEN 1 THEN '"B"' WHEN 2 THEN '"C"' WHEN 3 THEN '"B"' WHEN 4 THEN '"A"' WHEN 5 THEN '"B"'
             WHEN 6 THEN '"A"' WHEN 7 THEN '["120","40"]' ELSE '"小明还剩15元"' END,
      CASE i WHEN 1 THEN false WHEN 3 THEN false ELSE true END,
      CASE i WHEN 1 THEN 0 WHEN 3 THEN 0
        ELSE CASE WHEN i <= 4 THEN 10 WHEN i <= 6 THEN 12 WHEN i <= 7 THEN 8 ELSE 20 END END,
      CASE WHEN i <= 7 THEN 'auto_graded' ELSE 'manual_graded' END,
      CASE i WHEN 1 THEN 0 WHEN 3 THEN 0
        ELSE CASE WHEN i <= 4 THEN 10 WHEN i <= 6 THEN 12 WHEN i <= 7 THEN 8 ELSE NULL END END
    );
  END LOOP;

  -- 李小红 - 数学期中 (sa_new5, 95分，接近满分)
  FOR i IN 1..LEAST(8, COALESCE(array_length(v_qb_math_ids,1),0)) LOOP
    INSERT INTO answers (student_exam_id, question_id, answer, is_correct, score, grading_status, auto_score)
    VALUES (
      v_sa_new5, v_qb_math_ids[i],
      CASE i WHEN 1 THEN '"B"' WHEN 2 THEN '"C"' WHEN 3 THEN '"B"' WHEN 4 THEN '"A"' WHEN 5 THEN '"B"'
             WHEN 6 THEN '"A"' WHEN 7 THEN '["120","40"]' ELSE '"35-12-8=15元"' END,
      CASE i WHEN 1 THEN false WHEN 3 THEN false ELSE true END,
      CASE WHEN i <= 4 THEN 10 WHEN i <= 6 THEN 12 WHEN i <= 7 THEN 8 ELSE 20 END
        - CASE WHEN i = 1 THEN 5 ELSE 0 END,
      CASE WHEN i <= 7 THEN 'auto_graded' ELSE 'manual_graded' END,
      CASE WHEN i <= 7 THEN (CASE WHEN i <= 4 THEN 10 WHEN i <= 6 THEN 12 ELSE 8 END) - CASE WHEN i = 1 THEN 5 ELSE 0 END ELSE NULL END
    );
  END LOOP;

  -- 张小明 - 当前期末 (sa_new4, 有主观题待批改)
  FOR i IN 1..LEAST(8, COALESCE(array_length(v_qb_math_ids,1),0)) LOOP
    INSERT INTO answers (student_exam_id, question_id, answer, is_correct, score, grading_status, auto_score)
    VALUES (
      v_sa_new4, v_qb_math_ids[i],
      CASE i WHEN 1 THEN '"B"' WHEN 2 THEN '"C"' WHEN 3 THEN '"A"' WHEN 4 THEN '"A"' WHEN 5 THEN '"B"'
             WHEN 6 THEN '"A"' WHEN 7 THEN '["120","35"]' ELSE '"这道题我觉得..."' END,
      CASE i WHEN 1 THEN false WHEN 7 THEN false ELSE true END,
      CASE i WHEN 1 THEN 0 WHEN 7 THEN 4
        ELSE CASE WHEN i <= 4 THEN 10 WHEN i <= 6 THEN 12 WHEN i <= 7 THEN 8 ELSE NULL END END,
      CASE WHEN i <= 7 THEN 'auto_graded' ELSE 'pending' END,
      CASE i WHEN 1 THEN 0 WHEN 7 THEN 4
        ELSE CASE WHEN i <= 4 THEN 10 WHEN i <= 6 THEN 12 ELSE 8 END END
    );
  END LOOP;

  RAISE NOTICE '答题记录已创建';

  -- ============================================
  -- 6. 创建日常任务
  -- ============================================
  INSERT INTO daily_tasks (task_code, task_name, task_desc, task_icon, points_reward, task_type, trigger_condition, target_value, category, display_order, bonus_points, progress_type, reset_period)
  VALUES
    ('DAILY_LOGIN', '每日签到', '每天登录平台即可获得积分', '📅', 5, 'login', '{"event": "student.login"}', 1, 'daily', 1, 0, 'count', 'daily'),
    ('DAILY_PRACTICE', '每日练习', '每天完成一次练习', '✏️', 10, 'practice', '{"event": "student.activity.completed", "filter": {"type": "practice"}}', 1, 'daily', 2, 5, 'count', 'daily'),
    ('DAILY_EXAM', '参加测评', '参加一次正式测评', '📝', 20, 'exam', '{"event": "student.activity.completed", "filter": {"type": "assessment"}}', 1, 'daily', 3, 0, 'count', 'daily'),
    ('WEEKLY_PERFECT', '周满分之星', '一周内获得一次满分', '⭐', 50, 'weekly', '{"event": "student.activity.perfect_score"}', 1, 'weekly', 10, 20, 'count', 'weekly'),
    ('WEEKLY_PERSIST', '周坚持学习', '一周内每天登录平台', '🔥', 30, 'weekly', '{"event": "student.login", "consecutive_days": 7}', 7, 'weekly', 11, 10, 'count', 'weekly'),
    ('MONTHLY_STAR', '月度之星', '一个月内完成20次练习', '🏆', 100, 'monthly', '{"event": "student.activity.completed", "filter": {"type": "practice"}, "count": 20}', 20, 'monthly', 20, 50, 'count', 'monthly')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '日常任务已创建';

  -- ============================================
  -- 7. 更新积分数据
  -- ============================================
  -- 张小明：current=380, total=580, spent=150, frozen=50 (380 = 580-150-50)
  UPDATE student_points SET current_points = 380, total_points = 580, spent_points = 150, frozen_points = 50
  WHERE student_id = v_stu1_id;
  -- 李小红：current=420, total=520, spent=100, frozen=0
  UPDATE student_points SET current_points = 420, total_points = 520, spent_points = 100, frozen_points = 0
  WHERE student_id = v_stu2_id;
  -- 王小刚：current=210, total=300, spent=80, frozen=10
  UPDATE student_points SET current_points = 210, total_points = 300, spent_points = 80, frozen_points = 10
  WHERE student_id = v_stu3_id;

  -- 积分交易记录（张小明）
  INSERT INTO points_transactions (student_id, points_change, transaction_type, source_id, description, balance_before, balance_after)
  VALUES
    (v_stu1_id, 50, 'achievement', NULL, '获得成就「第一滴血」奖励', 0, 50),
    (v_stu1_id, 20, 'daily_task', NULL, '完成每日任务「参加测评」', 50, 70),
    (v_stu1_id, 30, 'achievement', NULL, '获得成就「每日签到7天」奖励', 70, 100),
    (v_stu1_id, 50, 'activity', NULL, '完成「2025年秋季数学期中测评」', 100, 150),
    (v_stu1_id, 50, 'activity', NULL, '完成「2025年秋季信息科技期末测评」', 150, 200),
    (v_stu1_id, 30, 'activity', NULL, '完成「2026年云岩区数学月考」', 200, 230),
    (v_stu1_id, 10, 'daily_task', NULL, '完成每日任务「每日练习」', 230, 240),
    (v_stu1_id, 100, 'achievement', NULL, '获得成就「月度之星」奖励', 240, 340),
    (v_stu1_id, 30, 'daily_task', NULL, '连续一周完成每日练习', 340, 370),
    (v_stu1_id, 10, 'daily_task', NULL, '完成每日签到', 370, 380),
    -- 李小红
    (v_stu2_id, 50, 'achievement', NULL, '获得成就「第一滴血」奖励', 0, 50),
    (v_stu2_id, 50, 'activity', NULL, '完成「数学期中测评」获得高分', 50, 100),
    (v_stu2_id, 100, 'achievement', NULL, '获得成就「满分之星」奖励', 100, 200),
    (v_stu2_id, 50, 'activity', NULL, '完成「信息科技期末测评」', 200, 250),
    (v_stu2_id, 30, 'daily_task', NULL, '完成每日任务', 250, 280),
    (v_stu2_id, -60, 'redemption', NULL, '兑换「专属头像框」', 480, 420),
    -- 王小刚
    (v_stu3_id, 50, 'achievement', NULL, '获得成就「第一滴血」奖励', 0, 50),
    (v_stu3_id, 30, 'activity', NULL, '完成「数学期中测评」', 50, 80),
    (v_stu3_id, 30, 'activity', NULL, '完成「云岩区数学月考」', 80, 110),
    (v_stu3_id, 20, 'daily_task', NULL, '完成每日练习', 110, 130);

  RAISE NOTICE '积分数据已更新';

  -- ============================================
  -- 8. 创建学生成就（为演示学生添加）
  -- ============================================
  INSERT INTO student_achievements (student_id, achievement_id, achieved_at, points_awarded, is_displayed, display_order)
  SELECT v_stu1_id, a.achievement_id, '2025-11-15 10:20:00', 50, true, 1
  FROM achievements a WHERE a.achievement_code = 'EXAM_FIRST_ANY' LIMIT 1;

  INSERT INTO student_achievements (student_id, achievement_id, achieved_at, points_awarded, is_displayed, display_order)
  SELECT v_stu1_id, a.achievement_id, '2026-05-20 08:00:00', 30, true, 2
  FROM achievements a WHERE a.achievement_code = 'LOGIN_7DAY_STREAK' LIMIT 1;

  INSERT INTO student_achievements (student_id, achievement_id, achieved_at, points_awarded, is_displayed, display_order)
  SELECT v_stu1_id, a.achievement_id, '2026-04-10 16:00:00', 40, true, 3
  FROM achievements a WHERE a.achievement_code = 'PRACTICE_10' LIMIT 1;

  INSERT INTO student_achievements (student_id, achievement_id, achieved_at, points_awarded, is_displayed, display_order)
  SELECT v_stu2_id, a.achievement_id, '2025-11-15 09:55:00', 50, true, 1
  FROM achievements a WHERE a.achievement_code = 'EXAM_FIRST_ANY' LIMIT 1;

  INSERT INTO student_achievements (student_id, achievement_id, achieved_at, points_awarded, is_displayed, display_order)
  SELECT v_stu2_id, a.achievement_id, '2025-11-15 09:55:00', 150, true, 2
  FROM achievements a WHERE a.achievement_code = 'EXAM_PERFECT_SCORE' LIMIT 1;

  INSERT INTO student_achievements (student_id, achievement_id, achieved_at, points_awarded, is_displayed, display_order)
  SELECT v_stu3_id, a.achievement_id, '2025-11-15 10:30:00', 50, true, 1
  FROM achievements a WHERE a.achievement_code = 'EXAM_FIRST_ANY' LIMIT 1;

  RAISE NOTICE '学生成就已创建';

  -- ============================================
  -- 9. 创建教学班
  -- ============================================
  INSERT INTO teaching_classes (name, description, scope, school_id, district_id, subject, grade, academic_year, status, created_by, approved_by, approved_at, submitted_at)
  VALUES
    ('云岩一小三年级数学1班', '云岩区第一小学三年级数学一班，由蒋磊老师授课', 'school', 1, 1, '数学', '三年级', '2025-2026学年第二学期', 'approved', v_tchr_yy_math_uid, v_school_admin_uid, '2026-02-20 10:00:00', '2026-02-18 09:00:00')
  RETURNING id INTO v_tc1;

  INSERT INTO teaching_classes (name, description, scope, school_id, district_id, subject, grade, academic_year, status, created_by, approved_by, approved_at, submitted_at)
  VALUES
    ('云岩一小信息科技兴趣班', '信息科技兴趣小组，由韩雪老师指导', 'school', 1, 1, '信息科技', '三年级', '2025-2026学年第二学期', 'approved', v_tchr_yy_it_uid, v_school_admin_uid, '2026-02-20 10:30:00', '2026-02-19 14:00:00')
  RETURNING id INTO v_tc2;

  INSERT INTO teaching_classes (name, description, scope, school_id, district_id, subject, grade, academic_year, status, created_by, submitted_at)
  VALUES
    ('云岩一小四年级数学提高班', '四年级数学提高班（待审批）', 'school', 1, 1, '数学', '四年级', '2025-2026学年第二学期', 'pending', v_tchr_yy_math_uid, '2026-05-28 10:00:00')
  RETURNING id INTO v_tc3;

  -- 教学班-教师关联
  INSERT INTO teaching_class_teachers (teaching_class_id, teacher_id, role, is_active)
  SELECT v_tc1, t.id, 'creator', true FROM teachers t WHERE t.user_id = v_tchr_yy_math_uid;

  INSERT INTO teaching_class_teachers (teaching_class_id, teacher_id, role, is_active)
  SELECT v_tc2, t.id, 'creator', true FROM teachers t WHERE t.user_id = v_tchr_yy_it_uid;

  INSERT INTO teaching_class_teachers (teaching_class_id, teacher_id, role, is_active)
  SELECT v_tc3, t.id, 'creator', true FROM teachers t WHERE t.user_id = v_tchr_yy_math_uid;

  -- 教学班-学生关联
  INSERT INTO teaching_class_members (teaching_class_id, student_id, is_active) VALUES
    (v_tc1, v_stu1_id, true), (v_tc1, v_stu2_id, true),
    (v_tc2, v_stu1_id, true), (v_tc2, v_stu3_id, true),
    (v_tc3, v_stu3_id, true);

  -- 教学班-活动关联
  INSERT INTO teaching_class_activities (teaching_class_id, activity_id, assigned_by, deadline, is_required) VALUES
    (v_tc1, v_act_ongoing1, v_tchr_yy_math_uid, '2026-06-05 17:00:00', true),
    (v_tc1, v_practice1, v_tchr_yy_math_uid, NULL, false),
    (v_tc2, v_act_ongoing2, v_tchr_yy_it_uid, '2026-06-10 17:00:00', true);

  RAISE NOTICE '教学班已创建: 3个';

  -- ============================================
  -- 10. 创建证书
  -- ============================================
  INSERT INTO certificates (student_id, exam_id, cert_no, issue_date, level, file_url) VALUES
    (v_stu1_id, v_act_past1, 'CERT-2025-MATH-M-001', '2025-11-20', 'A', '/certificates/cert_2025_math_zhangxm.pdf'),
    (v_stu2_id, v_act_past1, 'CERT-2025-MATH-M-002', '2025-11-20', 'A+', '/certificates/cert_2025_math_lixh.pdf'),
    (v_stu1_id, v_act_past2, 'CERT-2025-IT-F-001', '2025-12-25', 'A', '/certificates/cert_2025_it_zhangxm.pdf');

  RAISE NOTICE '证书已创建';

  -- ============================================
  -- 11. 创建注册申请
  -- ============================================
  INSERT INTO student_registration_requests (phone, real_name, birth_date, id_card_last4, district_id, district_code, district_name, school_id, school_code, school_name, grade, status, current_reviewer_level, submitted_at)
  VALUES
    ('13800138100', '赵小芳', '2016-05-12', '5678', 1, 'YY', '云岩区', 1, 'GY001', '贵阳市第一小学', '三年级', 'pending', 2, '2026-06-01 10:00:00'),
    ('13800138101', '钱小明', '2016-08-23', '9012', 2, 'NM', '南明区', 2, 'GY002', '贵阳市第二小学', '四年级', 'pending', 3, '2026-05-28 14:30:00'),
    ('13800138102', '孙小丽', '2015-11-03', '3456', 1, 'YY', '云岩区', 1, 'GY001', '贵阳市第一小学', '四年级', 'approved', 2, '2026-05-15 09:00:00');

  RAISE NOTICE '注册申请已创建';

  -- ============================================
  -- 12. 创建学生统计
  -- ============================================
  INSERT INTO student_ability_stats (student_id, ability, subject, total_questions, correct_count, accuracy_rate, avg_score) VALUES
    (v_stu1_uid, '计算思维', '数学', 85, 72, 84.71, 82.50),
    (v_stu1_uid, '空间思维', '数学', 30, 22, 73.33, 76.00),
    (v_stu1_uid, '数感', '数学', 45, 38, 84.44, 80.00),
    (v_stu1_uid, '信息意识', '信息科技', 50, 44, 88.00, 85.50),
    (v_stu1_uid, '计算思维', '信息科技', 35, 28, 80.00, 78.30),
    (v_stu2_uid, '计算思维', '数学', 80, 74, 92.50, 90.00),
    (v_stu2_uid, '空间思维', '数学', 28, 24, 85.71, 83.00),
    (v_stu3_uid, '计算思维', '数学', 65, 48, 73.85, 72.00),
    (v_stu3_uid, '空间思维', '数学', 22, 16, 72.73, 70.50)
  ON CONFLICT (student_id, ability, subject) DO UPDATE SET
    total_questions = EXCLUDED.total_questions,
    correct_count = EXCLUDED.correct_count,
    accuracy_rate = EXCLUDED.accuracy_rate,
    avg_score = EXCLUDED.avg_score;

  INSERT INTO student_knowledge_stats (student_id, knowledge_point, subject, total_questions, correct_count, accuracy_rate, avg_score) VALUES
    (v_stu1_uid, '三位数乘法', '数学', 25, 22, 88.00, 85.00),
    (v_stu1_uid, '图形面积', '数学', 15, 11, 73.33, 75.00),
    (v_stu1_uid, '计算机基础', '信息科技', 30, 28, 93.33, 90.00),
    (v_stu1_uid, 'Scratch基础', '信息科技', 15, 12, 80.00, 78.00),
    (v_stu2_uid, '三位数乘法', '数学', 22, 21, 95.45, 92.00),
    (v_stu3_uid, '三位数乘法', '数学', 20, 14, 70.00, 68.00)
  ON CONFLICT (student_id, knowledge_point, subject) DO UPDATE SET
    total_questions = EXCLUDED.total_questions,
    correct_count = EXCLUDED.correct_count,
    accuracy_rate = EXCLUDED.accuracy_rate,
    avg_score = EXCLUDED.avg_score;

  RAISE NOTICE '学生统计已创建';

  -- ============================================
  -- 13. 补充学生登录历史
  -- ============================================
  INSERT INTO student_login_history (student_id, user_id, login_date, login_time, login_method) VALUES
    (v_stu1_id, v_stu1_uid, CURRENT_DATE - 6, CURRENT_TIMESTAMP - INTERVAL '6 days', 'username'),
    (v_stu1_id, v_stu1_uid, CURRENT_DATE - 5, CURRENT_TIMESTAMP - INTERVAL '5 days', 'username'),
    (v_stu1_id, v_stu1_uid, CURRENT_DATE - 4, CURRENT_TIMESTAMP - INTERVAL '4 days', 'username'),
    (v_stu1_id, v_stu1_uid, CURRENT_DATE - 3, CURRENT_TIMESTAMP - INTERVAL '3 days', 'username'),
    (v_stu1_id, v_stu1_uid, CURRENT_DATE - 2, CURRENT_TIMESTAMP - INTERVAL '2 days', 'username'),
    (v_stu1_id, v_stu1_uid, CURRENT_DATE - 1, CURRENT_TIMESTAMP - INTERVAL '1 day', 'username'),
    (v_stu1_id, v_stu1_uid, CURRENT_DATE, CURRENT_TIMESTAMP, 'username'),
    (v_stu2_id, v_stu2_uid, CURRENT_DATE - 5, CURRENT_TIMESTAMP - INTERVAL '5 days', 'username'),
    (v_stu2_id, v_stu2_uid, CURRENT_DATE - 2, CURRENT_TIMESTAMP - INTERVAL '2 days', 'username'),
    (v_stu2_id, v_stu2_uid, CURRENT_DATE, CURRENT_TIMESTAMP, 'username')
  ON CONFLICT (student_id, login_date) DO NOTHING;

  RAISE NOTICE '登录历史已补充';

  -- ============================================
  -- 完成！
  -- ============================================
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 演示数据补充完成！';
  RAISE NOTICE '活动: +9个（3已完成 + 2进行中 + 1即将 + 1草稿 + 2练习）';
  RAISE NOTICE '题库: 补充 essay/multiple 类型';
  RAISE NOTICE '教学班: 3个（2已批准 + 1待审批）';
  RAISE NOTICE '========================================';

END$$;
