-- =====================================================
-- 初始日常任务数据插入脚本
-- =====================================================
-- 迁移编号: 023
-- 创建日期: 2025-11-09
-- 描述: 插入初始日常任务定义
-- 依赖: 022_enhance_daily_task_system.sql
-- =====================================================

-- =====================================================
-- 1. 每日任务 (daily)
-- =====================================================

INSERT INTO daily_tasks (
    task_code, task_name, task_desc, task_icon,
    category, task_type, points_reward, bonus_points,
    target_value, progress_type, reset_period, reset_time,
    trigger_condition, is_active, display_order
) VALUES
('DAILY_LOGIN', '每日登录', '每天至少登录一次系统', '📅',
 'daily', 'login', 10, 5,
 1, 'count', 'daily', '00:00:00',
 '{"event_name": "student.login", "condition_type": "count", "threshold": 1}',
 true, 1),

('DAILY_PRACTICE_5', '每日练习5题', '每天完成至少5道练习题', '📝',
 'daily', 'practice', 20, 10,
 5, 'count', 'daily', '00:00:00',
 '{"event_name": "student.practice.completed", "condition_type": "count", "threshold": 5}',
 true, 2),

('DAILY_PRACTICE_10', '每日练习10题', '每天完成至少10道练习题', '✍️',
 'daily', 'practice', 40, 20,
 10, 'count', 'daily', '00:00:00',
 '{"event_name": "student.practice.completed", "condition_type": "count", "threshold": 10}',
 true, 3),

('DAILY_EXAM', '每日测评', '每天完成至少1次测评活动', '📋',
 'daily', 'exam', 50, 25,
 1, 'count', 'daily', '00:00:00',
 '{"event_name": "student.exam.completed", "condition_type": "count", "threshold": 1}',
 true, 4),

('DAILY_ACCURACY_80', '今日正确率达80%', '当天练习正确率达到80%以上', '🎯',
 'daily', 'practice', 30, 15,
 80, 'score', 'daily', '00:00:00',
 '{"event_name": "student.daily.accuracy", "condition_type": "threshold", "threshold": 80}',
 true, 5);

-- =====================================================
-- 2. 每周任务 (weekly)
-- =====================================================

INSERT INTO daily_tasks (
    task_code, task_name, task_desc, task_icon,
    category, task_type, points_reward, bonus_points,
    target_value, progress_type, reset_period, reset_time,
    trigger_condition, is_active, display_order
) VALUES
('WEEKLY_LOGIN_5', '一周登录5天', '一周内登录至少5天', '🗓️',
 'weekly', 'login', 100, 50,
 5, 'count', 'weekly', '00:00:00',
 '{"event_name": "student.weekly.login.days", "condition_type": "count", "threshold": 5}',
 true, 10),

('WEEKLY_PRACTICE_50', '一周练习50题', '一周内完成至少50道练习题', '📚',
 'weekly', 'practice', 150, 75,
 50, 'count', 'weekly', '00:00:00',
 '{"event_name": "student.practice.completed", "condition_type": "count", "threshold": 50}',
 true, 11),

('WEEKLY_PRACTICE_100', '一周练习100题', '一周内完成至少100道练习题', '🎓',
 'weekly', 'practice', 300, 150,
 100, 'count', 'weekly', '00:00:00',
 '{"event_name": "student.practice.completed", "condition_type": "count", "threshold": 100}',
 true, 12),

('WEEKLY_EXAM_3', '一周完成3次测评', '一周内完成至少3次测评活动', '📊',
 'weekly', 'exam', 200, 100,
 3, 'count', 'weekly', '00:00:00',
 '{"event_name": "student.exam.completed", "condition_type": "count", "threshold": 3}',
 true, 13),

('WEEKLY_ACCURACY_85', '本周正确率达85%', '本周总体练习正确率达到85%以上', '🌟',
 'weekly', 'practice', 250, 125,
 85, 'score', 'weekly', '00:00:00',
 '{"event_name": "student.weekly.accuracy", "condition_type": "threshold", "threshold": 85}',
 true, 14);

-- =====================================================
-- 3. 每月任务 (monthly)
-- =====================================================

INSERT INTO daily_tasks (
    task_code, task_name, task_desc, task_icon,
    category, task_type, points_reward, bonus_points,
    target_value, progress_type, reset_period, reset_time,
    trigger_condition, is_active, display_order
) VALUES
('MONTHLY_LOGIN_20', '本月登录20天', '本月内登录至少20天', '📆',
 'monthly', 'login', 500, 250,
 20, 'count', 'monthly', '00:00:00',
 '{"event_name": "student.monthly.login.days", "condition_type": "count", "threshold": 20}',
 true, 20),

('MONTHLY_PRACTICE_300', '本月练习300题', '本月内完成至少300道练习题', '📖',
 'monthly', 'practice', 800, 400,
 300, 'count', 'monthly', '00:00:00',
 '{"event_name": "student.practice.completed", "condition_type": "count", "threshold": 300}',
 true, 21),

('MONTHLY_PRACTICE_500', '本月练习500题', '本月内完成至少500道练习题', '🏆',
 'monthly', 'practice', 1500, 750,
 500, 'count', 'monthly', '00:00:00',
 '{"event_name": "student.practice.completed", "condition_type": "count", "threshold": 500}',
 true, 22),

('MONTHLY_EXAM_10', '本月完成10次测评', '本月内完成至少10次测评活动', '📈',
 'monthly', 'exam', 1000, 500,
 10, 'count', 'monthly', '00:00:00',
 '{"event_name": "student.exam.completed", "condition_type": "count", "threshold": 10}',
 true, 23),

('MONTHLY_ACCURACY_90', '本月正确率达90%', '本月总体练习正确率达到90%以上', '💯',
 'monthly', 'practice', 2000, 1000,
 90, 'score', 'monthly', '00:00:00',
 '{"event_name": "student.monthly.accuracy", "condition_type": "threshold", "threshold": 90}',
 true, 24),

('MONTHLY_PERFECT_WEEK', '本月完美一周', '本月内有一周完成所有每周任务', '⭐',
 'monthly', 'weekly', 1200, 600,
 1, 'count', 'monthly', '00:00:00',
 '{"event_name": "student.perfect.week", "condition_type": "count", "threshold": 1}',
 true, 25);

-- =====================================================
-- 4. 特殊任务 (时间限制)
-- =====================================================

-- 早起任务（早上6-8点登录）
INSERT INTO daily_tasks (
    task_code, task_name, task_desc, task_icon,
    category, task_type, points_reward, bonus_points,
    target_value, progress_type, reset_period, reset_time,
    trigger_condition, is_active, display_order,
    valid_from, valid_to
) VALUES
('EARLY_BIRD_DAILY', '早起的鸟儿', '早上6-8点登录系统', '🌅',
 'daily', 'login', 15, 10,
 1, 'count', 'daily', '00:00:00',
 '{"event_name": "student.login.morning", "condition_type": "state", "hour_range": [6, 8]}',
 true, 6,
 NULL, NULL);

-- =====================================================
-- 5. 验证插入
-- =====================================================

DO $$
DECLARE
    task_count INTEGER;
    category_stats RECORD;
BEGIN
    -- 统计总数
    SELECT COUNT(*) INTO task_count FROM daily_tasks;
    RAISE NOTICE '✅ 日常任务总数: %', task_count;

    -- 按类别统计
    RAISE NOTICE '';
    RAISE NOTICE '按任务周期分布:';
    FOR category_stats IN
        SELECT category, COUNT(*) as count
        FROM daily_tasks
        GROUP BY category
        ORDER BY
            CASE category
                WHEN 'daily' THEN 1
                WHEN 'weekly' THEN 2
                WHEN 'monthly' THEN 3
            END
    LOOP
        RAISE NOTICE '  - %: % 个任务', category_stats.category, category_stats.count;
    END LOOP;

    -- 按类型统计
    RAISE NOTICE '';
    RAISE NOTICE '按任务类型分布:';
    FOR category_stats IN
        SELECT task_type, COUNT(*) as count
        FROM daily_tasks
        GROUP BY task_type
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  - %: % 个任务', category_stats.task_type, category_stats.count;
    END LOOP;

    -- 计算总积分奖励
    RAISE NOTICE '';
    RAISE NOTICE '积分统计:';
    SELECT SUM(points_reward) INTO task_count FROM daily_tasks WHERE category = 'daily';
    RAISE NOTICE '  - 每日任务基础积分: %', task_count;

    SELECT SUM(points_reward) INTO task_count FROM daily_tasks WHERE category = 'weekly';
    RAISE NOTICE '  - 每周任务基础积分: %', task_count;

    SELECT SUM(points_reward) INTO task_count FROM daily_tasks WHERE category = 'monthly';
    RAISE NOTICE '  - 每月任务基础积分: %', task_count;
END $$;
