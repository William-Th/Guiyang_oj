-- 创建个人练习成就
-- 创建日期: 2025-11-20
-- 用途: 为学生个人练习进度创建成就定义

BEGIN;

-- 个人练习成就：完成1次练习（初试锋芒）
INSERT INTO achievements (
    achievement_code,
    achievement_name,
    achievement_desc,
    category,
    subcategory,
    rarity,
    points_reward,
    trigger_condition,
    is_hidden,
    is_active,
    max_times,
    display_order,
    created_by
) VALUES (
    'PRACTICE_FIRST',
    '初试锋芒',
    '完成第1次练习活动',
    'learning_growth',
    '练习进度',
    'common',
    10,
    '{
        "trigger_mode": "real_time",
        "trigger_frequency": "real_time",
        "condition_type": "count",
        "event_name": "student.activity.completed",
        "threshold": 1,
        "filter": {
            "type": "practice",
            "status": "submitted"
        }
    }'::json,
    false,
    true,
    1,
    100,
    1
) ON CONFLICT (achievement_code) DO UPDATE SET
    achievement_name = EXCLUDED.achievement_name,
    achievement_desc = EXCLUDED.achievement_desc,
    trigger_condition = EXCLUDED.trigger_condition,
    updated_at = CURRENT_TIMESTAMP;

-- 个人练习成就：完成5次练习（勤学苦练）
INSERT INTO achievements (
    achievement_code,
    achievement_name,
    achievement_desc,
    category,
    subcategory,
    rarity,
    points_reward,
    trigger_condition,
    is_hidden,
    is_active,
    max_times,
    display_order,
    created_by
) VALUES (
    'PRACTICE_5',
    '勤学苦练',
    '完成5次练习活动',
    'learning_growth',
    '练习进度',
    'rare',
    50,
    '{
        "trigger_mode": "real_time",
        "trigger_frequency": "real_time",
        "condition_type": "count",
        "event_name": "student.activity.completed",
        "threshold": 5,
        "filter": {
            "type": "practice",
            "status": "submitted"
        }
    }'::json,
    false,
    true,
    1,
    101,
    1
) ON CONFLICT (achievement_code) DO UPDATE SET
    achievement_name = EXCLUDED.achievement_name,
    achievement_desc = EXCLUDED.achievement_desc,
    trigger_condition = EXCLUDED.trigger_condition,
    updated_at = CURRENT_TIMESTAMP;

-- 个人练习成就：完成10次练习（百炼成钢）
INSERT INTO achievements (
    achievement_code,
    achievement_name,
    achievement_desc,
    category,
    subcategory,
    rarity,
    points_reward,
    trigger_condition,
    is_hidden,
    is_active,
    max_times,
    display_order,
    created_by
) VALUES (
    'PRACTICE_10',
    '百炼成钢',
    '完成10次练习活动',
    'learning_growth',
    '练习进度',
    'epic',
    100,
    '{
        "trigger_mode": "real_time",
        "trigger_frequency": "real_time",
        "condition_type": "count",
        "event_name": "student.activity.completed",
        "threshold": 10,
        "filter": {
            "type": "practice",
            "status": "submitted"
        }
    }'::json,
    false,
    true,
    1,
    102,
    1
) ON CONFLICT (achievement_code) DO UPDATE SET
    achievement_name = EXCLUDED.achievement_name,
    achievement_desc = EXCLUDED.achievement_desc,
    trigger_condition = EXCLUDED.trigger_condition,
    updated_at = CURRENT_TIMESTAMP;

-- 验证创建结果
SELECT
    achievement_id,
    achievement_code,
    achievement_name,
    category,
    rarity,
    points_reward
FROM achievements
WHERE achievement_code IN ('PRACTICE_FIRST', 'PRACTICE_5', 'PRACTICE_10')
ORDER BY display_order;

COMMIT;
