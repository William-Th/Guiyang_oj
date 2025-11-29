-- 个人成就系统测试数据
-- 创建日期: 2025-11-20
-- 用途: 为学生账户创建测试活动和成绩，触发各类个人成就
-- 测试学生: user_id=11 (13800138003), student_id=1

-- 清理现有测试数据（可选，谨慎使用）
-- DELETE FROM student_achievements WHERE student_id = 1;
-- DELETE FROM answers WHERE student_exam_id IN (SELECT id FROM student_activities WHERE student_id = 1);
-- DELETE FROM student_activities WHERE student_id = 1;

BEGIN;

-- ============================================
-- 1. 创建测试题目（简化版，仅用于触发成就）
-- ============================================

-- 创建50道简单测试题（用于10个活动，每个5题）
INSERT INTO question_bank (
    type, subject, grade, content, options, correct_answer,
    score, difficulty, created_by, status, suggested_score
)
SELECT
    'single',
    '数学',
    '一年级',
    '【测试题】' || n || ' + 1 = ?',
    jsonb_build_object(
        'A', (n + 1)::text,
        'B', (n + 2)::text,
        'C', (n + 3)::text,
        'D', (n + 4)::text
    ),
    jsonb_build_object('answer', 'A'),
    20,
    'easy',
    1,
    'published',
    20
FROM generate_series(1, 50) AS n
ON CONFLICT DO NOTHING;

-- 获取刚创建的题目ID范围
DO $$
DECLARE
    min_q_id INT;
    max_q_id INT;
BEGIN
    SELECT MIN(id), MAX(id) INTO min_q_id, max_q_id
    FROM question_bank
    WHERE content LIKE '【测试题】%';

    RAISE NOTICE '题目ID范围: % - %', min_q_id, max_q_id;
END $$;

-- ============================================
-- 2. 创建测试活动（供学生完成）
-- ============================================

-- 测试活动1-10: 用于触发各类成就
INSERT INTO activities (
    title, subject, grade, type, start_time, end_time,
    total_score, pass_score, created_by, status, time_limit_type
)
SELECT
    '【测试】数学练习' || n,
    '数学',
    '一年级',
    'practice',
    CURRENT_TIMESTAMP - INTERVAL '3 hours',
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    100,
    60,
    1,
    'published',
    'scheduled'
FROM generate_series(1, 10) AS n
ON CONFLICT DO NOTHING;

-- 获取刚创建的活动ID
DO $$
DECLARE
    activity_ids INT[];
    activity_id INT;
    q_ids INT[];
    i INT;
BEGIN
    -- 获取测试活动ID
    SELECT ARRAY_AGG(id ORDER BY id DESC) INTO activity_ids
    FROM activities
    WHERE title LIKE '【测试】数学练习%'
    LIMIT 10;

    -- 获取测试题目ID
    SELECT ARRAY_AGG(id ORDER BY id DESC) INTO q_ids
    FROM question_bank
    WHERE content LIKE '【测试题】%'
    LIMIT 50;

    RAISE NOTICE '活动ID数组: %', activity_ids;
    RAISE NOTICE '题目ID数组长度: %', array_length(q_ids, 1);

    -- 为每个活动分配5道题
    FOR i IN 1..10 LOOP
        activity_id := activity_ids[i];

        -- 关联5道题到活动
        INSERT INTO activity_questions (activity_id, question_id, order_index)
        SELECT
            activity_id,
            q_ids[(i-1)*5 + j],
            j
        FROM generate_series(1, 5) AS j
        ON CONFLICT DO NOTHING;

        -- 学生注册活动 (跳过已存在的记录)
        IF NOT EXISTS (SELECT 1 FROM student_activities sa WHERE sa.student_id = 1 AND sa.activity_id = activity_ids[i]) THEN
            INSERT INTO student_activities (student_id, activity_id, status, created_at)
            VALUES (1, activity_ids[i], 'registered', CURRENT_TIMESTAMP - INTERVAL '2 hours');
        END IF;
    END LOOP;
END $$;

-- ============================================
-- 3. 模拟学生完成活动（创建答题记录）
-- ============================================

DO $$
DECLARE
    activity_ids INT[];
    activity_id INT;
    student_activity_id INT;
    q_ids INT[];
    base_time TIMESTAMP;
    i INT;
    j INT;
BEGIN
    -- 获取测试活动ID
    SELECT ARRAY_AGG(id ORDER BY id DESC) INTO activity_ids
    FROM activities
    WHERE title LIKE '【测试】数学练习%'
    LIMIT 10;

    -- 获取测试题目ID
    SELECT ARRAY_AGG(id ORDER BY id DESC) INTO q_ids
    FROM question_bank
    WHERE content LIKE '【测试题】%'
    LIMIT 50;

    base_time := CURRENT_TIMESTAMP - INTERVAL '2 hours';

    -- 为每个活动创建答题记录
    FOR i IN 1..10 LOOP
        activity_id := activity_ids[i];

        -- 获取student_activity的ID
        SELECT sa.id INTO student_activity_id
        FROM student_activities sa
        WHERE sa.student_id = 1 AND sa.activity_id = activity_ids[i];

        IF student_activity_id IS NULL THEN
            RAISE NOTICE '未找到student_activity记录，activity_id=%', activity_id;
            CONTINUE;
        END IF;

        -- 更新活动开始时间
        UPDATE student_activities
        SET status = 'in_progress',
            started_at = base_time + ((i-1) * 20 || ' minutes')::INTERVAL,
            start_time = base_time + ((i-1) * 20 || ' minutes')::INTERVAL
        WHERE id = student_activity_id;

        -- 创建答题记录（前4道正确，最后1道错误，得分80分）
        FOR j IN 1..5 LOOP
            INSERT INTO answers (
                student_exam_id, question_id, answer,
                is_correct, score, grading_status, created_at
            ) VALUES (
                student_activity_id,
                q_ids[(i-1)*5 + j],
                CASE WHEN j <= 4 THEN 'A' ELSE 'B' END,
                CASE WHEN j <= 4 THEN true ELSE false END,
                CASE WHEN j <= 4 THEN 20 ELSE 0 END,
                'auto_graded',
                base_time + ((i-1) * 20 + j * 2 || ' minutes')::INTERVAL
            ) ON CONFLICT (student_exam_id, question_id) DO NOTHING;
        END LOOP;

        -- 提交活动
        UPDATE student_activities
        SET status = 'submitted',
            submit_time = base_time + ((i-1) * 20 + 15 || ' minutes')::INTERVAL,
            score = 80.00,
            grading_status = 'completed'
        WHERE id = student_activity_id;

        RAISE NOTICE '完成活动 %, student_activity_id=%', i, student_activity_id;
    END LOOP;
END $$;

-- ============================================
-- 4. 验证数据
-- ============================================

-- 检查学生完成的活动数量
SELECT
    '学生完成活动数量' AS check_item,
    COUNT(*) AS count
FROM student_activities
WHERE student_id = 1 AND status = 'submitted';

-- 检查学生答题记录数量
SELECT
    '学生答题记录数量' AS check_item,
    COUNT(*) AS count
FROM answers a
JOIN student_activities sa ON a.student_exam_id = sa.id
WHERE sa.student_id = 1;

-- 检查学生成绩统计
SELECT
    '学生成绩统计' AS check_item,
    ROUND(AVG(score), 2) AS avg_score,
    MAX(score) AS max_score,
    MIN(score) AS min_score
FROM student_activities
WHERE student_id = 1 AND status = 'submitted';

COMMIT;
