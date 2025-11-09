-- =====================================================
-- 初始成就数据插入脚本
-- =====================================================
-- 迁移编号: 021
-- 创建日期: 2025-11-09
-- 描述: 插入初始成就定义，涵盖4个类别、5个稀有度
-- 依赖: 020_achievement_system_schema.sql
-- =====================================================

-- =====================================================
-- 1. 考试认证类成就 (exam_certification) - 40%
-- =====================================================

-- 普通成就 (common)
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc, achievement_icon,
    category, subcategory, rarity, points_reward, trigger_condition, is_hidden, max_times
) VALUES
('FIRST_BLOOD', '第一滴血', '首次通过任意级别认证', '🏆',
 'exam_certification', 'first_time', 'common', 50,
 '{"event_name": "student.activity.completed", "condition_type": "count", "threshold": 1, "trigger_mode": "realtime"}',
 false, 1),

('PERFECT_SCORE_BRONZE', '完美答卷·铜', '获得满分（铜级认证）', '🥉',
 'exam_certification', 'perfect_score', 'common', 100,
 '{"event_name": "student.high.score", "condition_type": "threshold", "threshold": 100, "grade_level": "bronze", "trigger_mode": "realtime"}',
 false, 1),

('PASS_10_EXAMS', '十全十美', '通过10次认证', '✅',
 'exam_certification', 'milestone', 'common', 200,
 '{"event_name": "student.activity.completed", "condition_type": "count", "threshold": 10, "trigger_mode": "scheduled"}',
 false, 1);

-- 稀有成就 (rare)
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc, achievement_icon,
    category, subcategory, rarity, points_reward, trigger_condition, is_hidden, max_times
) VALUES
('PERFECT_SCORE_SILVER', '完美答卷·银', '获得满分（银级认证）', '🥈',
 'exam_certification', 'perfect_score', 'rare', 200,
 '{"event_name": "student.high.score", "condition_type": "threshold", "threshold": 100, "grade_level": "silver", "trigger_mode": "realtime"}',
 false, 1),

('TRIPLE_CROWN', '三冠王', '在数学、语文、英语三个科目均获得金级认证', '👑',
 'exam_certification', 'multi_subject', 'rare', 300,
 '{"event_name": "student.multi.subject", "condition_type": "combination", "operator": "AND", "conditions": [{"subject": "数学", "grade": "gold"}, {"subject": "语文", "grade": "gold"}, {"subject": "英语", "grade": "gold"}], "trigger_mode": "scheduled"}',
 false, 1);

-- 史诗成就 (epic)
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc, achievement_icon,
    category, subcategory, rarity, points_reward, trigger_condition, is_hidden, max_times
) VALUES
('PERFECT_SCORE_GOLD', '完美答卷·金', '获得满分（金级认证）', '🥇',
 'exam_certification', 'perfect_score', 'epic', 500,
 '{"event_name": "student.high.score", "condition_type": "threshold", "threshold": 100, "grade_level": "gold", "trigger_mode": "realtime"}',
 false, 1),

('GRAND_SLAM', '大满贯', '在所有主要科目均获得金级认证', '🏅',
 'exam_certification', 'multi_subject', 'epic', 800,
 '{"event_name": "student.all.subjects.gold", "condition_type": "state", "target_value": "all_gold", "trigger_mode": "scheduled"}',
 false, 1);

-- 传说成就 (legendary)
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc, achievement_icon,
    category, subcategory, rarity, points_reward, trigger_condition, is_hidden, max_times
) VALUES
('PERFECT_YEAR', '完美学年', '一学年内所有认证均满分', '⭐',
 'exam_certification', 'long_term', 'legendary', 1500,
 '{"event_name": "student.year.perfect", "condition_type": "state", "target_value": "year_perfect", "trigger_mode": "scheduled"}',
 true, 1);

-- =====================================================
-- 2. 学习成长类成就 (learning_growth) - 35%
-- =====================================================

-- 普通成就
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc, achievement_icon,
    category, subcategory, rarity, points_reward, trigger_condition, is_hidden, max_times
) VALUES
('DAILY_LOGIN_7', '坚持七天', '连续登录7天', '📅',
 'learning_growth', 'daily_task', 'common', 50,
 '{"event_name": "student.login", "condition_type": "count", "threshold": 7, "consecutive": true, "trigger_mode": "realtime"}',
 false, 1),

('COMPLETE_100_QUESTIONS', '百题斩', '完成100道练习题', '📝',
 'learning_growth', 'practice', 'common', 100,
 '{"event_name": "student.question.completed", "condition_type": "count", "threshold": 100, "trigger_mode": "scheduled"}',
 false, 1),

('FAST_LEARNER', '速度之星', '在10分钟内完成一次练习（至少20题）', '⚡',
 'learning_growth', 'speed', 'common', 80,
 '{"event_name": "student.practice.fast", "condition_type": "threshold", "max_time": 600, "min_questions": 20, "trigger_mode": "realtime"}',
 false, 1);

-- 稀有成就
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc, achievement_icon,
    category, subcategory, rarity, points_reward, trigger_condition, is_hidden, max_times
) VALUES
('DAILY_LOGIN_30', '坚持一月', '连续登录30天', '🗓️',
 'learning_growth', 'daily_task', 'rare', 300,
 '{"event_name": "student.login", "condition_type": "count", "threshold": 30, "consecutive": true, "trigger_mode": "realtime"}',
 false, 1),

('ACCURACY_MASTER', '精准大师', '练习正确率达到95%（至少50题）', '🎯',
 'learning_growth', 'accuracy', 'rare', 250,
 '{"event_name": "student.practice.accuracy", "condition_type": "threshold", "threshold": 95, "min_questions": 50, "trigger_mode": "scheduled"}',
 false, 1);

-- 史诗成就
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc, achievement_icon,
    category, subcategory, rarity, points_reward, trigger_condition, is_hidden, max_times
) VALUES
('DAILY_LOGIN_100', '百日坚持', '连续登录100天', '🏆',
 'learning_growth', 'daily_task', 'epic', 1000,
 '{"event_name": "student.login", "condition_type": "count", "threshold": 100, "consecutive": true, "trigger_mode": "realtime"}',
 false, 1),

('KNOWLEDGE_MASTER', '知识大师', '在某一科目完成1000道练习题', '📚',
 'learning_growth', 'practice', 'epic', 800,
 '{"event_name": "student.subject.questions", "condition_type": "count", "threshold": 1000, "trigger_mode": "scheduled"}',
 false, 1);

-- =====================================================
-- 3. 社交协作类成就 (social_collaboration) - 15%
-- =====================================================

-- 普通成就
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc, achievement_icon,
    category, subcategory, rarity, points_reward, trigger_condition, is_hidden, max_times
) VALUES
('HELPFUL_STUDENT', '乐于助人', '帮助同学解答问题3次', '🤝',
 'social_collaboration', 'help', 'common', 60,
 '{"event_name": "student.help.others", "condition_type": "count", "threshold": 3, "trigger_mode": "realtime"}',
 false, 1);

-- 稀有成就
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc, achievement_icon,
    category, subcategory, rarity, points_reward, trigger_condition, is_hidden, max_times
) VALUES
('TOP_10_RANK', '进入前十', '在班级排行榜进入前10名', '🏅',
 'social_collaboration', 'competition', 'rare', 200,
 '{"event_name": "student.rank.update", "condition_type": "threshold", "max_rank": 10, "scope": "class", "trigger_mode": "scheduled"}',
 false, 1);

-- 史诗成就
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc, achievement_icon,
    category, subcategory, rarity, points_reward, trigger_condition, is_hidden, max_times
) VALUES
('CLASS_CHAMPION', '班级冠军', '在班级排行榜排名第一', '👑',
 'social_collaboration', 'competition', 'epic', 500,
 '{"event_name": "student.rank.update", "condition_type": "threshold", "max_rank": 1, "scope": "class", "trigger_mode": "scheduled"}',
 false, 1);

-- =====================================================
-- 4. 特殊活动类成就 (special_event) - 10%
-- =====================================================

-- 稀有成就
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc, achievement_icon,
    category, subcategory, rarity, points_reward, trigger_condition, is_hidden, max_times,
    valid_from, valid_to
) VALUES
('WINTER_FESTIVAL_2025', '2025冬季节日', '在冬季节日活动期间完成特定任务', '❄️',
 'special_event', 'seasonal', 'rare', 300,
 '{"event_name": "student.event.winter", "condition_type": "state", "target_value": "completed", "trigger_mode": "realtime"}',
 false, 1,
 '2025-12-01', '2026-02-28');

INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc, achievement_icon,
    category, subcategory, rarity, points_reward, trigger_condition, is_hidden, max_times
) VALUES
('EARLY_BIRD', '早起的鸟儿', '在上午6-8点完成练习', '🌅',
 'special_event', 'time_based', 'rare', 150,
 '{"event_name": "student.practice.morning", "condition_type": "state", "target_value": "morning_practice", "hour_range": [6, 8], "trigger_mode": "realtime"}',
 false, 999);

-- 神话成就 (mythic) - 最高稀有度
INSERT INTO achievements (
    achievement_code, achievement_name, achievement_desc, achievement_icon,
    category, subcategory, rarity, points_reward, trigger_condition, is_hidden, max_times
) VALUES
('LEGEND_OF_GUIYANG', '贵阳传奇', '在市级排行榜排名第一', '🌟',
 'social_collaboration', 'competition', 'mythic', 5000,
 '{"event_name": "student.rank.update", "condition_type": "threshold", "max_rank": 1, "scope": "city", "trigger_mode": "scheduled"}',
 true, 1),

('ULTIMATE_SCHOLAR', '终极学者', '获得所有其他成就', '💎',
 'special_event', 'collection', 'mythic', 10000,
 '{"event_name": "student.all.achievements", "condition_type": "state", "target_value": "all_collected", "trigger_mode": "scheduled"}',
 true, 1);

-- =====================================================
-- 验证插入
-- =====================================================

DO $$
DECLARE
    achievement_count INTEGER;
    category_stats RECORD;
BEGIN
    -- 统计总数
    SELECT COUNT(*) INTO achievement_count FROM achievements;
    RAISE NOTICE '✅ 成就总数: %', achievement_count;

    -- 按类别统计
    FOR category_stats IN
        SELECT category, COUNT(*) as count
        FROM achievements
        GROUP BY category
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  - %: % 个成就', category_stats.category, category_stats.count;
    END LOOP;

    -- 按稀有度统计
    RAISE NOTICE '按稀有度统计:';
    FOR category_stats IN
        SELECT rarity, COUNT(*) as count
        FROM achievements
        GROUP BY rarity
        ORDER BY
            CASE rarity
                WHEN 'common' THEN 1
                WHEN 'rare' THEN 2
                WHEN 'epic' THEN 3
                WHEN 'legendary' THEN 4
                WHEN 'mythic' THEN 5
            END
    LOOP
        RAISE NOTICE '  - %: % 个', category_stats.rarity, category_stats.count;
    END LOOP;
END $$;
