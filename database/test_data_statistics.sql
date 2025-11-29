-- ============================================================================
-- Test Data for Data Visualization Module
-- Created: 2025-11-24
-- Purpose: Generate test data for student statistics and teacher analytics
-- ============================================================================

-- This script creates:
-- 1. Question drafts with abilities and knowledge_points
-- 2. Published questions in question_bank
-- 3. Activities (practice/assessment)
-- 4. Student registrations and answers
-- 5. Graded answers to trigger statistics updates

BEGIN;

-- ============================================================================
-- 1. Create Question Drafts (数学题目 - 三年级)
-- ============================================================================

-- 数学题目 1: 加法运算
INSERT INTO question_drafts (
  type, subject, grade, level, difficulty,
  content, options, correct_answer, explanation,
  suggested_score, abilities, knowledge_points,
  created_by
) VALUES (
  'single', '数学', '三年级', 'L2', 'easy',
  '计算：25 + 38 = ?',
  '["55", "63", "73", "65"]'::jsonb,
  '"B"'::jsonb,
  '25 + 38 = 63，先计算个位，再计算十位',
  5,
  ARRAY['运算能力', '数感'],
  ARRAY['两位数加法', '进位加法'],
  2  -- teacher01
);

-- 数学题目 2: 减法运算
INSERT INTO question_drafts (
  type, subject, grade, level, difficulty,
  content, options, correct_answer, explanation,
  suggested_score, abilities, knowledge_points,
  created_by
) VALUES (
  'single', '数学', '三年级', 'L2', 'easy',
  '计算：82 - 47 = ?',
  '["35", "45", "25", "55"]'::jsonb,
  '"A"'::jsonb,
  '82 - 47 = 35，需要借位',
  5,
  ARRAY['运算能力', '数感'],
  ARRAY['两位数减法', '退位减法'],
  2
);

-- 数学题目 3: 乘法运算
INSERT INTO question_drafts (
  type, subject, grade, level, difficulty,
  content, options, correct_answer, explanation,
  suggested_score, abilities, knowledge_points,
  created_by
) VALUES (
  'single', '数学', '三年级', 'L3', 'medium',
  '计算：6 × 7 = ?',
  '["40", "42", "44", "46"]'::jsonb,
  '"B"'::jsonb,
  '6 × 7 = 42，背诵乘法口诀表',
  5,
  ARRAY['运算能力', '记忆能力'],
  ARRAY['乘法口诀', '乘法运算'],
  2
);

-- 数学题目 4: 除法运算
INSERT INTO question_drafts (
  type, subject, grade, level, difficulty,
  content, options, correct_answer, explanation,
  suggested_score, abilities, knowledge_points,
  created_by
) VALUES (
  'single', '数学', '三年级', 'L3', 'medium',
  '计算：56 ÷ 8 = ?',
  '["6", "7", "8", "9"]'::jsonb,
  '"B"'::jsonb,
  '56 ÷ 8 = 7，因为 8 × 7 = 56',
  5,
  ARRAY['运算能力', '逻辑推理'],
  ARRAY['除法运算', '乘除法关系'],
  2
);

-- 数学题目 5: 应用题
INSERT INTO question_drafts (
  type, subject, grade, level, difficulty,
  content, options, correct_answer, explanation,
  suggested_score, abilities, knowledge_points,
  created_by
) VALUES (
  'single', '数学', '三年级', 'L4', 'hard',
  '小明有35个苹果，小红有的苹果是小明的2倍，小红有多少个苹果？',
  '["60", "65", "70", "75"]'::jsonb,
  '"C"'::jsonb,
  '小红的苹果 = 35 × 2 = 70个',
  10,
  ARRAY['问题解决', '逻辑推理', '运算能力'],
  ARRAY['乘法应用', '倍数关系', '应用题'],
  2
);

-- ============================================================================
-- 2. Create Question Drafts (语文题目 - 三年级)
-- ============================================================================

-- 语文题目 1: 拼音
INSERT INTO question_drafts (
  type, subject, grade, level, difficulty,
  content, options, correct_answer, explanation,
  suggested_score, abilities, knowledge_points,
  created_by
) VALUES (
  'single', '语文', '三年级', 'L1', 'easy',
  '下列词语中，拼音标注正确的是：',
  '["蝴蝶（hú dié）", "困难（kùn nán）", "美丽（mēi lì）", "朋友（péng yǒu）"]'::jsonb,
  '"D"'::jsonb,
  '"朋友"的正确拼音是péng yǒu',
  5,
  ARRAY['语言基础', '识字能力'],
  ARRAY['拼音', '词语读音'],
  2
);

-- 语文题目 2: 词语理解
INSERT INTO question_drafts (
  type, subject, grade, level, difficulty,
  content, options, correct_answer, explanation,
  suggested_score, abilities, knowledge_points,
  created_by
) VALUES (
  'single', '语文', '三年级', 'L2', 'medium',
  '"欣欣向荣"的意思是：',
  '["非常高兴", "蓬勃发展", "向前生长", "欣赏美景"]'::jsonb,
  '"B"'::jsonb,
  '"欣欣向荣"形容草木茂盛，比喻事业蓬勃发展',
  5,
  ARRAY['理解能力', '词汇积累'],
  ARRAY['成语理解', '词语含义'],
  2
);

-- 语文题目 3: 阅读理解
INSERT INTO question_drafts (
  type, subject, grade, level, difficulty,
  content, correct_answer, explanation,
  suggested_score, abilities, knowledge_points,
  created_by
) VALUES (
  'essay', '语文', '三年级', 'L3', 'medium',
  '阅读下面的短文，回答问题：\n\n春天来了，小草从地下钻出来了，树木抽出了新的枝条，长出了嫩绿的叶子。花园里，各种各样的花都开了，有红的、黄的、白的、紫的，美丽极了。\n\n问题：春天来了，大自然有哪些变化？',
  '"小草钻出来了，树木长出新枝条和嫩叶，各种花都开了"'::jsonb,
  '答案应包含：小草、树木、花朵等自然景物的变化',
  10,
  ARRAY['阅读理解', '概括能力', '语言表达'],
  ARRAY['阅读理解', '归纳概括', '自然景物描写'],
  2
);

-- ============================================================================
-- 3. Publish Questions to Question Bank (发布到school_1范围)
-- ============================================================================

-- 发布数学题目
INSERT INTO question_bank (draft_id, scope, school_id, status, published_by)
SELECT id, 'school_1', 1, 'published', 2
FROM question_drafts
WHERE subject = '数学' AND created_by = 2
ORDER BY id
LIMIT 5;

-- 发布语文题目
INSERT INTO question_bank (draft_id, scope, school_id, status, published_by)
SELECT id, 'school_1', 1, 'published', 2
FROM question_drafts
WHERE subject = '语文' AND created_by = 2
ORDER BY id
LIMIT 3;

-- ============================================================================
-- 4. Create Activities (活动)
-- ============================================================================

-- 数学练习活动
INSERT INTO activities (
  title, description, subject, grade, type,
  time_limit_type,
  start_time, end_time,
  total_score, pass_score, status,
  created_by, scope, ability_level
) VALUES (
  '三年级数学综合练习',
  '包含加减乘除和应用题的综合练习',
  '数学', '三年级', 'practice',
  'scheduled',
  NOW() - INTERVAL '7 days', NOW() + INTERVAL '30 days',
  35, 21, 'published',
  2, 'school', 'L3'
);

-- 语文练习活动
INSERT INTO activities (
  title, description, subject, grade, type,
  time_limit_type,
  start_time, end_time,
  total_score, pass_score, status,
  created_by, scope, ability_level
) VALUES (
  '三年级语文阅读练习',
  '包含拼音、词语理解和阅读理解',
  '语文', '三年级', 'practice',
  'scheduled',
  NOW() - INTERVAL '7 days', NOW() + INTERVAL '30 days',
  20, 12, 'published',
  2, 'school', 'L3'
);

-- ============================================================================
-- 5. Create Activity Papers (关联题目到活动)
-- ============================================================================

-- 数学活动的试卷 (假设activity_id是上面插入的第一个)
DO $$
DECLARE
  v_activity_id INTEGER;
  v_question_id INTEGER;
  v_order INTEGER := 1;
BEGIN
  -- 获取数学活动ID
  SELECT id INTO v_activity_id
  FROM activities
  WHERE title = '三年级数学综合练习'
  ORDER BY id DESC LIMIT 1;

  -- 关联数学题目
  FOR v_question_id IN
    SELECT id FROM question_bank WHERE draft_id IN (
      SELECT id FROM question_drafts WHERE subject = '数学' ORDER BY id LIMIT 5
    )
  LOOP
    INSERT INTO activity_questions (activity_id, question_id, order_index, score)
    VALUES (v_activity_id, v_question_id, v_order, 7.00);
    v_order := v_order + 1;
  END LOOP;
END $$;

-- 语文活动的试卷
DO $$
DECLARE
  v_activity_id INTEGER;
  v_question_id INTEGER;
  v_order INTEGER := 1;
BEGIN
  -- 获取语文活动ID
  SELECT id INTO v_activity_id
  FROM activities
  WHERE title = '三年级语文阅读练习'
  ORDER BY id DESC LIMIT 1;

  -- 关联语文题目
  FOR v_question_id IN
    SELECT id FROM question_bank WHERE draft_id IN (
      SELECT id FROM question_drafts WHERE subject = '语文' ORDER BY id LIMIT 3
    )
  LOOP
    INSERT INTO activity_questions (activity_id, question_id, order_index, score)
    VALUES (v_activity_id, v_question_id, v_order, 7.00);
    v_order := v_order + 1;
  END LOOP;
END $$;

-- ============================================================================
-- 6. Create Student Activity Registrations (学生参与活动)
-- ============================================================================

-- 学生参与数学练习
DO $$
DECLARE
  v_activity_id INTEGER;
  v_student_id INTEGER;
BEGIN
  -- 获取数学活动ID
  SELECT id INTO v_activity_id
  FROM activities
  WHERE title = '三年级数学综合练习'
  ORDER BY id DESC LIMIT 1;

  -- 为每个三年级学生创建参与记录 (假设user_id 3-7是学生)
  FOR v_student_id IN 3..7 LOOP
    INSERT INTO student_activities (
      student_id, activity_id, status, started_at
    ) VALUES (
      v_student_id, v_activity_id, 'in_progress', NOW() - INTERVAL '2 days'
    );
  END LOOP;
END $$;

-- 学生参与语文练习
DO $$
DECLARE
  v_activity_id INTEGER;
  v_student_id INTEGER;
BEGIN
  -- 获取语文活动ID
  SELECT id INTO v_activity_id
  FROM activities
  WHERE title = '三年级语文阅读练习'
  ORDER BY id DESC LIMIT 1;

  -- 为每个三年级学生创建参与记录
  FOR v_student_id IN 3..7 LOOP
    INSERT INTO student_activities (
      student_id, activity_id, status, started_at
    ) VALUES (
      v_student_id, v_activity_id, 'in_progress', NOW() - INTERVAL '1 day'
    );
  END LOOP;
END $$;

-- ============================================================================
-- 7. Create Student Answers (学生答题记录)
-- ============================================================================

-- 数学答题记录 (不同学生不同正确率)
DO $$
DECLARE
  v_student_activity_id INTEGER;
  v_question_id INTEGER;
  v_student_id INTEGER;
  v_question_score NUMERIC;
  v_is_correct BOOLEAN;
  v_accuracy NUMERIC;
BEGIN
  -- 为每个学生创建答题记录
  FOR v_student_id IN 3..7 LOOP
    -- 获取该学生的student_activity_id
    SELECT sa.id INTO v_student_activity_id
    FROM student_activities sa
    JOIN activities a ON sa.activity_id = a.id
    WHERE sa.student_id = v_student_id
      AND a.title = '三年级数学综合练习'
    ORDER BY sa.id DESC LIMIT 1;

    -- 设置不同学生的正确率
    CASE v_student_id
      WHEN 3 THEN v_accuracy := 0.9;  -- 90%正确率
      WHEN 4 THEN v_accuracy := 0.7;  -- 70%正确率
      WHEN 5 THEN v_accuracy := 0.8;  -- 80%正确率
      WHEN 6 THEN v_accuracy := 0.6;  -- 60%正确率
      WHEN 7 THEN v_accuracy := 0.85; -- 85%正确率
    END CASE;

    -- 为每道题创建答案
    FOR v_question_id IN
      SELECT ap.question_id
      FROM activity_questions ap
      JOIN activities a ON ap.activity_id = a.id
      WHERE a.title = '三年级数学综合练习'
      ORDER BY ap.order_index
    LOOP
      -- 根据正确率随机决定是否正确
      v_is_correct := (RANDOM() < v_accuracy);

      -- 获取题目分值
      SELECT qd.suggested_score INTO v_question_score
      FROM question_bank qb
      JOIN question_drafts qd ON qb.draft_id = qd.id
      WHERE qb.id = v_question_id;

      -- 插入答案
      INSERT INTO answers (
        student_exam_id, question_id, answer,
        is_correct, score, grading_status
      ) VALUES (
        v_student_activity_id, v_question_id,
        CASE WHEN v_is_correct THEN 'B' ELSE 'C' END,
        v_is_correct,
        CASE WHEN v_is_correct THEN v_question_score ELSE 0 END,
        'auto_graded'
      );
    END LOOP;

    -- 更新student_activity状态为completed
    UPDATE student_activities
    SET status = 'graded',
        submit_time = NOW() - INTERVAL '1 day'
    WHERE id = v_student_activity_id;
  END LOOP;
END $$;

-- 语文答题记录
DO $$
DECLARE
  v_student_activity_id INTEGER;
  v_question_id INTEGER;
  v_student_id INTEGER;
  v_question_score NUMERIC;
  v_is_correct BOOLEAN;
  v_accuracy NUMERIC;
BEGIN
  -- 为每个学生创建答题记录
  FOR v_student_id IN 3..7 LOOP
    -- 获取该学生的student_activity_id
    SELECT sa.id INTO v_student_activity_id
    FROM student_activities sa
    JOIN activities a ON sa.activity_id = a.id
    WHERE sa.student_id = v_student_id
      AND a.title = '三年级语文阅读练习'
    ORDER BY sa.id DESC LIMIT 1;

    -- 设置不同学生的正确率
    CASE v_student_id
      WHEN 3 THEN v_accuracy := 0.85;
      WHEN 4 THEN v_accuracy := 0.75;
      WHEN 5 THEN v_accuracy := 0.8;
      WHEN 6 THEN v_accuracy := 0.65;
      WHEN 7 THEN v_accuracy := 0.9;
    END CASE;

    -- 为每道题创建答案
    FOR v_question_id IN
      SELECT ap.question_id
      FROM activity_questions ap
      JOIN activities a ON ap.activity_id = a.id
      WHERE a.title = '三年级语文阅读练习'
      ORDER BY ap.order_index
    LOOP
      -- 根据正确率随机决定是否正确
      v_is_correct := (RANDOM() < v_accuracy);

      -- 获取题目分值
      SELECT qd.suggested_score INTO v_question_score
      FROM question_bank qb
      JOIN question_drafts qd ON qb.draft_id = qd.id
      WHERE qb.id = v_question_id;

      -- 插入答案
      INSERT INTO answers (
        student_exam_id, question_id, answer,
        is_correct, score, grading_status
      ) VALUES (
        v_student_activity_id, v_question_id,
        CASE WHEN v_is_correct THEN '正确答案' ELSE '错误答案' END,
        v_is_correct,
        CASE WHEN v_is_correct THEN v_question_score ELSE v_question_score * 0.5 END,
        'manual_graded'
      );
    END LOOP;

    -- 更新student_activity状态为completed
    UPDATE student_activities
    SET status = 'graded',
        submit_time = NOW()
    WHERE id = v_student_activity_id;
  END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check created data
SELECT 'Question Drafts' as table_name, COUNT(*) as count FROM question_drafts WHERE created_by = 2
UNION ALL
SELECT 'Question Bank', COUNT(*) FROM question_bank WHERE published_by = 2
UNION ALL
SELECT 'Activities', COUNT(*) FROM activities WHERE title LIKE '%三年级%'
UNION ALL
SELECT 'Student Activities', COUNT(*) FROM student_activities WHERE activity_id IN (SELECT id FROM activities WHERE title LIKE '%三年级%')
UNION ALL
SELECT 'Answers', COUNT(*) FROM answers WHERE student_exam_id IN (SELECT id FROM student_activities WHERE activity_id IN (SELECT id FROM activities WHERE title LIKE '%三年级%'));

-- Check statistics (should be auto-generated by triggers)
SELECT 'Student Ability Stats' as table_name, COUNT(*) as count FROM student_ability_stats
UNION ALL
SELECT 'Student Knowledge Stats', COUNT(*) FROM student_knowledge_stats;

-- Show sample student statistics
SELECT
  sa.student_id,
  sa.ability,
  sa.subject,
  sa.total_questions,
  sa.correct_count,
  sa.accuracy_rate
FROM student_ability_stats sa
ORDER BY sa.student_id, sa.subject, sa.ability
LIMIT 10;
