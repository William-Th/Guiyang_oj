-- 测试数据：创建学生可访问的含题活动
-- 创建日期: 2026-02-01
-- 说明: 为学生答题流程测试创建一个有题目的发布活动

-- 首先删除旧的测试活动
DELETE FROM activity_questions WHERE activity_id IN (SELECT id FROM activities WHERE title LIKE '%【测试】学生答题流程%');
DELETE FROM activities WHERE title LIKE '%【测试】学生答题流程%';

-- 创建活动
INSERT INTO activities (
    title,
    description,
    subject,
    grade,
    type,
    status,
    ability_level,
    scope,
    duration,
    total_score,
    pass_score,
    time_limit_type,
    created_by,
    paper_status,
    is_official
) VALUES
(
    '【测试】学生答题流程测试活动',
    '用于学生答题流程回归测试的活动',
    '数学',
    '二年级',
    'practice',
    'published',      -- 发布状态
    'L4',
    'system',         -- 系统级，所有学生可访问
    60,
    100,
    60,
    'timed',
    40,               -- teacher_yy_ps_01 的ID
    'completed',      -- 已完成组卷
    true
);

-- 获取刚创建的活动ID并添加题目
DO $$
DECLARE
    v_activity_id INTEGER;
    v_qb_id INTEGER;
    v_order_index INTEGER := 1;
BEGIN
    -- 获取活动ID
    SELECT id INTO v_activity_id FROM activities WHERE title = '【测试】学生答题流程测试活动' ORDER BY id DESC LIMIT 1;

    IF v_activity_id IS NOT NULL THEN
        -- 添加5道已发布的单选题到活动
        -- 只选择options是JSON数组格式的题目（排除对象格式）
        FOR v_qb_id IN
            SELECT qb.id
            FROM question_bank qb
            JOIN question_drafts qd ON qb.draft_id = qd.id
            WHERE qb.status = 'published'
            AND qd.type = 'single'
            AND qd.is_active = true
            AND jsonb_typeof(qd.options) = 'array'  -- 确保options是数组
            ORDER BY qb.id
            LIMIT 5
        LOOP
            INSERT INTO activity_questions (activity_id, question_id, order_index, score)
            VALUES (v_activity_id, v_qb_id, v_order_index, 10);
            v_order_index := v_order_index + 1;
        END LOOP;

        -- 更新活动题目数量
        UPDATE activities SET question_count = v_order_index - 1 WHERE id = v_activity_id;

        RAISE NOTICE 'Created test activity with ID: %, questions: %', v_activity_id, v_order_index - 1;
    ELSE
        RAISE NOTICE 'Activity not found';
    END IF;
END $$;

-- 显示结果
SELECT a.id, a.title, a.status, a.scope, a.question_count,
       (SELECT COUNT(*) FROM activity_questions WHERE activity_id = a.id) as actual_question_count
FROM activities a
WHERE a.title LIKE '%【测试】学生答题流程%'
ORDER BY a.id DESC;
