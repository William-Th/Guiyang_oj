/**
 * 补充简单配置型成就数据（第二批）
 *
 * 目标：将成就数量从48个增加到60个
 * 本次新增：12个成就
 *
 * 分类分布：
 * - 社交协作类：5个（评论互动、帮助他人、分享知识、团队合作）
 * - 特殊事件类：3个（节日活动、季节成就、纪念日）
 * - 学习成长类：2个（学习习惯、能力提升）
 * - 测评认证类：2个（等级提升、跨学科认证）
 *
 * 创建日期: 2025-11-14
 */

BEGIN;

-- ============================================
-- 社交协作类成就（5个）
-- ============================================

-- 评论互动成就
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc,
    category, subcategory, rarity, achievement_icon,
    points_reward, trigger_condition, is_hidden, is_active,
    display_order
) VALUES
(
    'SOCIAL_COMMENT_10',
    '初露锋芒',
    '发表10条有价值的评论',
    'social_collaboration',
    'interaction',
    'common',
    '💬',
    50,
    '{
        "trigger_mode": "real_time",
        "condition_type": "count",
        "event_name": "student.comment.created",
        "target_count": 10
    }'::json,
    false,
    true,
    501
),
(
    'SOCIAL_COMMENT_50',
    '评论达人',
    '发表50条有价值的评论',
    'social_collaboration',
    'interaction',
    'rare',
    '💬',
    200,
    '{
        "trigger_mode": "real_time",
        "condition_type": "count",
        "event_name": "student.comment.created",
        "target_count": 50
    }'::json,
    false,
    true,
    502
);

-- 帮助他人成就
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc,
    category, subcategory, rarity, achievement_icon,
    points_reward, trigger_condition, is_hidden, is_active,
    display_order
) VALUES
(
    'SOCIAL_HELP_ANSWER_10',
    '乐于助人',
    '回答10个同学的问题',
    'social_collaboration',
    'help',
    'common',
    '🤝',
    100,
    '{
        "trigger_mode": "real_time",
        "condition_type": "count",
        "event_name": "student.answer.created",
        "target_count": 10
    }'::json,
    false,
    true,
    503
),
(
    'SOCIAL_LIKE_RECEIVED_50',
    '受人喜爱',
    '你的评论收到50个赞',
    'social_collaboration',
    'recognition',
    'rare',
    '👍',
    150,
    '{
        "trigger_mode": "real_time",
        "condition_type": "count",
        "event_name": "student.comment.liked",
        "target_count": 50
    }'::json,
    false,
    true,
    504
);

-- 分享知识成就
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc,
    category, subcategory, rarity, achievement_icon,
    points_reward, trigger_condition, is_hidden, is_active,
    display_order
) VALUES
(
    'SOCIAL_SHARE_EXPERIENCE',
    '知识分享者',
    '分享5次学习经验或心得',
    'social_collaboration',
    'sharing',
    'rare',
    '📚',
    200,
    '{
        "trigger_mode": "real_time",
        "condition_type": "count",
        "event_name": "student.experience.shared",
        "target_count": 5
    }'::json,
    false,
    true,
    505
);

-- ============================================
-- 特殊事件类成就（3个）
-- ============================================

-- 春节成就
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc,
    category, subcategory, rarity, achievement_icon,
    points_reward, trigger_condition, is_hidden, is_active,
    valid_from, valid_to,
    display_order
) VALUES
(
    'EVENT_SPRING_FESTIVAL',
    '春节快乐',
    '在春节期间登录系统',
    'special_event',
    'holiday',
    'epic',
    '🧧',
    300,
    '{
        "trigger_mode": "real_time",
        "condition_type": "state",
        "event_name": "student.login",
        "first_time": true,
        "time_window": {
            "start": "CURRENT_YEAR-02-01",
            "end": "CURRENT_YEAR-02-15"
        }
    }'::json,
    false,
    true,
    '2025-02-01'::date,
    '2099-12-31'::date,
    601
);

-- 六一儿童节成就
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc,
    category, subcategory, rarity, achievement_icon,
    points_reward, trigger_condition, is_hidden, is_active,
    valid_from, valid_to,
    display_order
) VALUES
(
    'EVENT_CHILDRENS_DAY',
    '快乐童年',
    '在六一儿童节登录系统',
    'special_event',
    'holiday',
    'rare',
    '🎈',
    200,
    '{
        "trigger_mode": "real_time",
        "condition_type": "state",
        "event_name": "student.login",
        "first_time": true,
        "time_window": {
            "start": "CURRENT_YEAR-06-01",
            "end": "CURRENT_YEAR-06-01"
        }
    }'::json,
    false,
    true,
    '2025-06-01'::date,
    '2099-12-31'::date,
    602
);

-- 暑期学习成就
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc,
    category, subcategory, rarity, achievement_icon,
    points_reward, trigger_condition, is_hidden, is_active,
    valid_from, valid_to,
    display_order
) VALUES
(
    'EVENT_SUMMER_LEARNING',
    '暑假学霸',
    '暑假期间完成10次练习',
    'special_event',
    'seasonal',
    'rare',
    '☀️',
    250,
    '{
        "trigger_mode": "real_time",
        "condition_type": "count",
        "event_name": "student.activity.completed",
        "target_count": 10,
        "filter": {
            "activity_type": "practice"
        },
        "time_window": {
            "start": "CURRENT_YEAR-07-01",
            "end": "CURRENT_YEAR-08-31"
        }
    }'::json,
    false,
    true,
    '2025-07-01'::date,
    '2099-12-31'::date,
    603
);

-- ============================================
-- 学习成长类成就（2个）
-- ============================================

-- 学习习惯成就
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc,
    category, subcategory, rarity, achievement_icon,
    points_reward, trigger_condition, is_hidden, is_active,
    display_order
) VALUES
(
    'LEARN_WEEKLY_STREAK_4',
    '月度坚持',
    '连续4周每周至少学习3次',
    'learning_growth',
    'habit',
    'epic',
    '📅',
    400,
    '{
        "trigger_mode": "scheduled",
        "condition_type": "consecutive",
        "event_name": "student.weekly.learning",
        "consecutive_weeks": 4,
        "min_learning_days": 3
    }'::json,
    false,
    true,
    301
);

-- 能力提升成就
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc,
    category, subcategory, rarity, achievement_icon,
    points_reward, trigger_condition, is_hidden, is_active,
    display_order
) VALUES
(
    'LEARN_ACCURACY_IMPROVE',
    '精益求精',
    '单次测评正确率从60%提升到90%以上',
    'learning_growth',
    'improvement',
    'rare',
    '📈',
    200,
    '{
        "trigger_mode": "real_time",
        "condition_type": "threshold",
        "event_name": "student.activity.completed",
        "threshold_value": 90,
        "threshold_field": "accuracy",
        "filter": {
            "activity_type": "assessment",
            "status": "passed"
        }
    }'::json,
    false,
    true,
    302
);

-- ============================================
-- 测评认证类成就（2个）
-- ============================================

-- 等级提升成就
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc,
    category, subcategory, rarity, achievement_icon,
    points_reward, trigger_condition, is_hidden, is_active,
    display_order
) VALUES
(
    'EXAM_LEVEL_UP_3',
    '进阶之路',
    '能力等级从1级提升到3级',
    'exam_certification',
    'progression',
    'rare',
    '⬆️',
    300,
    '{
        "trigger_mode": "real_time",
        "condition_type": "state",
        "event_name": "student.level.upgraded",
        "filter": {
            "from_level": 1,
            "to_level": 3
        }
    }'::json,
    false,
    true,
    121
);

-- 跨学科认证成就
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc,
    category, subcategory, rarity, achievement_icon,
    points_reward, trigger_condition, is_hidden, is_active,
    display_order
) VALUES
(
    'EXAM_CROSS_SUBJECT',
    '全能学霸',
    '通过3个不同学科的认证',
    'exam_certification',
    'cross_subject',
    'epic',
    '🌟',
    500,
    '{
        "trigger_mode": "scheduled",
        "condition_type": "and",
        "sub_conditions": [
            {
                "condition_type": "count",
                "event_name": "student.certification.passed",
                "target_count": 3,
                "distinct_field": "subject"
            }
        ]
    }'::json,
    false,
    true,
    122
);

COMMIT;

-- 验证插入结果
DO $$
DECLARE
    v_count INTEGER;
    v_total INTEGER;
BEGIN
    -- 统计新增成就数量
    SELECT COUNT(*) INTO v_count
    FROM achievements
    WHERE achievement_code IN (
        'SOCIAL_COMMENT_10', 'SOCIAL_COMMENT_50', 'SOCIAL_HELP_ANSWER_10',
        'SOCIAL_LIKE_RECEIVED_50', 'SOCIAL_SHARE_EXPERIENCE',
        'EVENT_SPRING_FESTIVAL', 'EVENT_CHILDRENS_DAY', 'EVENT_SUMMER_LEARNING',
        'LEARN_WEEKLY_STREAK_4', 'LEARN_ACCURACY_IMPROVE',
        'EXAM_LEVEL_UP_3', 'EXAM_CROSS_SUBJECT'
    );

    -- 统计总成就数
    SELECT COUNT(*) INTO v_total FROM achievements WHERE is_active = true;

    RAISE NOTICE '=== 成就补充完成 ===';
    RAISE NOTICE '✅ 本次新增成就: % 个', v_count;
    RAISE NOTICE '✅ 当前总成就数: % 个', v_total;

    IF v_count = 12 THEN
        RAISE NOTICE '✅ 成就补充成功！';
    ELSE
        RAISE WARNING '⚠️ 预期新增12个，实际新增 % 个', v_count;
    END IF;
END$$;
