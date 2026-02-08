-- 完整流程测试数据
-- 创建日期: 2026-02-01
-- 说明: 为完整流程测试创建题目和活动

-- 清理旧测试数据
DELETE FROM answers WHERE student_exam_id IN (
  SELECT sa.id FROM student_activities sa
  JOIN activities a ON sa.activity_id = a.id
  WHERE a.title LIKE '%【完整流程测试】%'
);
DELETE FROM student_activities WHERE activity_id IN (
  SELECT id FROM activities WHERE title LIKE '%【完整流程测试】%'
);
DELETE FROM activity_questions WHERE activity_id IN (
  SELECT id FROM activities WHERE title LIKE '%【完整流程测试】%'
);
DELETE FROM activities WHERE title LIKE '%【完整流程测试】%';
DELETE FROM question_bank WHERE question_code LIKE '%LIFECYCLE%';
DELETE FROM question_drafts WHERE content LIKE '%【完整流程测试】%';

-- 1. 创建测试题目草稿
INSERT INTO question_drafts (
  type, subject, grade, difficulty, content, options, correct_answer,
  explanation, knowledge_points, level, created_by
) VALUES (
  'single',
  '数学',
  '二年级',
  'medium',
  '【完整流程测试】1 + 1 = ?',
  '["1", "2", "3", "4"]'::jsonb,
  '["B"]'::jsonb,
  '1加1等于2',
  ARRAY['加法']::text[],
  'L4',
  40
)
ON CONFLICT DO NOTHING;

-- 获取题目ID并创建对应的question_bank记录
DO $$
DECLARE
  v_draft_id INTEGER;
  v_question_code VARCHAR(20);
  v_activity_id INTEGER;
BEGIN
  -- 获取题目草稿ID
  SELECT id INTO v_draft_id FROM question_drafts
  WHERE content LIKE '%【完整流程测试】%'
  ORDER BY id DESC LIMIT 1;

  -- 生成题目编码
  v_question_code := 'LIFE' || TO_CHAR(CURRENT_TIMESTAMP, 'YYMMDD') || LPAD(CAST(v_draft_id AS TEXT), 4, '0');

  -- 创建question_bank记录
  INSERT INTO question_bank (draft_id, question_code, scope, published_by, status)
  VALUES (v_draft_id, v_question_code, 'system', 40, 'published')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created question with code: %', v_question_code;

  -- 2. 创建测试活动 (unlimited类型，不设置duration)
  INSERT INTO activities (
    title, description, subject, grade, type, status,
    scope, total_score, pass_score,
    time_limit_type, paper_status, is_official, created_by
  ) VALUES (
    '【完整流程测试】测试活动',
    '完整流程测试活动 - 练习类型，立即显示答案',
    '数学',
    '二年级',
    'practice',
    'published',
    'system',
    100,
    60,
    'unlimited',
    'completed',
    true,
    40
  )
  RETURNING id INTO v_activity_id;

  RAISE NOTICE 'Created activity with ID: %', v_activity_id;

  -- 3. 组卷 - 添加题目到活动
  INSERT INTO activity_questions (activity_id, question_id, order_index, score)
  SELECT v_activity_id, id, 1, 100 FROM question_bank WHERE question_code = v_question_code;

  RAISE NOTICE 'Added question to activity %', v_activity_id;
END $$;

-- 验证结果
SELECT
  a.id as activity_id,
  a.title as activity_title,
  a.status as activity_status,
  a.type as activity_type,
  a.paper_status,
  (SELECT COUNT(*) FROM activity_questions WHERE activity_id = a.id) as question_count,
  q.content as question_content
FROM activities a
LEFT JOIN question_drafts q ON q.content LIKE '%【完整流程测试】%'
WHERE a.title LIKE '%【完整流程测试】%';
