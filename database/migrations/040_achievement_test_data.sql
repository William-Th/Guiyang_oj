-- ==========================================
-- Achievement Test Data Migration
-- 创建时间: 2026-01-22
-- 说明: 为测试学生账号创建成就测试数据
--      包括：已获得成就、进度追踪记录
-- 测试账号: 张小明 (user_id=3, student_id=1)
-- ==========================================

BEGIN;

-- ==========================================
-- 第1部分：验证测试账号存在
-- ==========================================
DO $$
DECLARE
    v_student_exists INTEGER;
    v_user_id INTEGER;
BEGIN
    -- 检查测试学生是否存在
    SELECT COUNT(*), MAX(user_id)
    INTO v_student_exists, v_user_id
    FROM students
    WHERE id = 1;

    IF v_student_exists = 0 THEN
        RAISE EXCEPTION '测试学生账号不存在 (student_id=1)';
    END IF;

    RAISE NOTICE '✅ 找到测试学生: user_id=%, student_id=1', v_user_id;
END$$;

-- ==========================================
-- 第2部分：清理已有测试数据（可选）
-- ==========================================
-- 如果需要重新生成测试数据，取消注释下面的删除语句
-- DELETE FROM student_achievements WHERE student_id = 1;
-- DELETE FROM achievement_progress WHERE student_id = 1;

-- ==========================================
-- 第3部分：插入已获得成就
-- ==========================================

-- 成就1: 初体验 - 首次完成测评活动
INSERT INTO student_achievements (
    student_id,
    achievement_id,
    achieved_at,
    points_awarded
)
SELECT
    1,
    achievement_id,
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    points_reward
FROM achievements
WHERE achievement_code = 'EXAM_FIRST_COMPLETE'
ON CONFLICT (student_id, achievement_id) DO NOTHING;

-- 成就2: 初试锋芒 - 完成第1次练习活动
INSERT INTO student_achievements (
    student_id,
    achievement_id,
    achieved_at,
    points_awarded
)
SELECT
    1,
    achievement_id,
    CURRENT_TIMESTAMP - INTERVAL '8 days',
    points_reward
FROM achievements
WHERE achievement_code = 'PRACTICE_FIRST'
ON CONFLICT (student_id, achievement_id) DO NOTHING;

-- 成就3: 三日之约 - 连续3天登录
INSERT INTO student_achievements (
    student_id,
    achievement_id,
    achieved_at,
    points_awarded
)
SELECT
    1,
    achievement_id,
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    points_reward
FROM achievements
WHERE achievement_code = 'LOGIN_STREAK_3'
ON CONFLICT (student_id, achievement_id) DO NOTHING;

-- ==========================================
-- 第4部分：插入进度追踪记录
-- ==========================================

-- 进度1: 勤学苦练 (PRACTICE_5) - 当前完成1/5
INSERT INTO achievement_progress (
    student_id,
    achievement_id,
    current_value,
    target_value,
    last_updated
)
SELECT
    1,
    achievement_id,
    1,
    5,
    CURRENT_TIMESTAMP
FROM achievements
WHERE achievement_code = 'PRACTICE_5'
ON CONFLICT (student_id, achievement_id)
DO UPDATE SET
    current_value = EXCLUDED.current_value,
    last_updated = EXCLUDED.last_updated;

-- 进度2: 百炼成钢 (PRACTICE_10) - 当前完成1/10
INSERT INTO achievement_progress (
    student_id,
    achievement_id,
    current_value,
    target_value,
    last_updated
)
SELECT
    1,
    achievement_id,
    1,
    10,
    CURRENT_TIMESTAMP
FROM achievements
WHERE achievement_code = 'PRACTICE_10'
ON CONFLICT (student_id, achievement_id)
DO UPDATE SET
    current_value = EXCLUDED.current_value,
    last_updated = EXCLUDED.last_updated;

-- 进度3: 七日之志 (LOGIN_STREAK_7) - 当前完成3/7天
INSERT INTO achievement_progress (
    student_id,
    achievement_id,
    current_value,
    target_value,
    last_updated
)
SELECT
    1,
    achievement_id,
    3,
    7,
    CURRENT_TIMESTAMP
FROM achievements
WHERE achievement_code = 'LOGIN_STREAK_7'
ON CONFLICT (student_id, achievement_id)
DO UPDATE SET
    current_value = EXCLUDED.current_value,
    last_updated = EXCLUDED.last_updated;

-- 进度4: 初入学堂 (LEARN_TIME_10H) - 当前学习5/10小时
INSERT INTO achievement_progress (
    student_id,
    achievement_id,
    current_value,
    target_value,
    last_updated
)
SELECT
    1,
    achievement_id,
    300,  -- 5小时 = 300分钟
    600,  -- 10小时 = 600分钟
    CURRENT_TIMESTAMP
FROM achievements
WHERE achievement_code = 'LEARN_TIME_10H'
ON CONFLICT (student_id, achievement_id)
DO UPDATE SET
    current_value = EXCLUDED.current_value,
    last_updated = EXCLUDED.last_updated;

-- 进度5: 第一滴血 (EXAM_FIRST_ANY) - 当前完成0/1（即将解锁）
INSERT INTO achievement_progress (
    student_id,
    achievement_id,
    current_value,
    target_value,
    last_updated
)
SELECT
    1,
    achievement_id,
    0,
    1,
    CURRENT_TIMESTAMP
FROM achievements
WHERE achievement_code = 'EXAM_FIRST_ANY'
ON CONFLICT (student_id, achievement_id)
DO UPDATE SET
    current_value = EXCLUDED.current_value,
    last_updated = EXCLUDED.last_updated;

-- 进度6: 连续通过3次 (PASS_STREAK_3) - 当前完成0/3
INSERT INTO achievement_progress (
    student_id,
    achievement_id,
    current_value,
    target_value,
    last_updated
)
SELECT
    1,
    achievement_id,
    0,
    3,
    CURRENT_TIMESTAMP
FROM achievements
WHERE achievement_code = 'PASS_STREAK_3'
ON CONFLICT (student_id, achievement_id)
DO UPDATE SET
    current_value = EXCLUDED.current_value,
    last_updated = EXCLUDED.last_updated;

COMMIT;

-- ==========================================
-- 验证数据插入结果
-- ==========================================
DO $$
DECLARE
    v_earned_count INTEGER;
    v_progress_count INTEGER;
    v_total_points INTEGER;
BEGIN
    -- 统计已获得成就数量
    SELECT COUNT(*) INTO v_earned_count
    FROM student_achievements
    WHERE student_id = 1;

    -- 统计进度追踪记录数量
    SELECT COUNT(*) INTO v_progress_count
    FROM achievement_progress
    WHERE student_id = 1;

    -- 统计总积分
    SELECT COALESCE(SUM(points_awarded), 0) INTO v_total_points
    FROM student_achievements
    WHERE student_id = 1;

    RAISE NOTICE '================================================';
    RAISE NOTICE '   成就测试数据插入完成';
    RAISE NOTICE '================================================';
    RAISE NOTICE '测试学生: student_id=1 (张小明)';
    RAISE NOTICE '✅ 已获得成就: % 个', v_earned_count;
    RAISE NOTICE '✅ 进度追踪记录: % 个', v_progress_count;
    RAISE NOTICE '✅ 总积分: % 分', v_total_points;
    RAISE NOTICE '================================================';
END$$;

-- 显示已获得成就详情
SELECT
    sa.id,
    a.achievement_code,
    a.achievement_name,
    a.rarity,
    sa.points_awarded,
    sa.achieved_at
FROM student_achievements sa
JOIN achievements a ON sa.achievement_id = a.achievement_id
WHERE sa.student_id = 1
ORDER BY sa.achieved_at DESC;

-- 显示进度追踪详情
SELECT
    ap.achievement_id,
    a.achievement_code,
    a.achievement_name,
    ap.current_value,
    ap.target_value,
    ap.progress_percentage,
    ap.last_updated
FROM achievement_progress ap
JOIN achievements a ON ap.achievement_id = a.achievement_id
WHERE ap.student_id = 1
ORDER BY ap.progress_percentage DESC;
