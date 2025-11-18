-- ==========================================
-- 初始简单配置型成就数据
-- 创建时间: 2025-11-14
-- 说明: 添加第一阶段的简单配置型成就（约53个）
-- ==========================================

-- ==========================================
-- 分类1：首次突破类成就（15个）
-- ==========================================

-- 首次通过任意级别认证
INSERT INTO achievements (
  achievement_code,
  achievement_name,
  achievement_desc,
  category,
  subcategory,
  rarity,
  achievement_icon,
  points_reward,
  trigger_condition,
  is_hidden,
  is_active,
  max_times,
  display_order
) VALUES
(
  'EXAM_FIRST_ANY',
  '第一滴血',
  '首次通过任意级别认证测评',
  'exam_certification',
  'first_breakthrough',
  'common',
  '/images/achievements/first_blood.png',
  50,
  '{
    "trigger_mode": "real_time",
    "trigger_frequency": "real_time",
    "condition_type": "state",
    "event_name": "student.activity.completed",
    "first_time": true,
    "filter": {
      "type": "certification",
      "status": "passed"
    }
  }'::json,
  false,
  true,
  1,
  10
),
-- 首次通过1级认证
(
  'EXAM_FIRST_L1',
  '初识认证',
  '首次通过1级能力认证测评',
  'exam_certification',
  'first_breakthrough',
  'common',
  '/images/achievements/first_pass_level_1.png',
  20,
  '{
    "trigger_mode": "real_time",
    "trigger_frequency": "real_time",
    "condition_type": "state",
    "event_name": "student.activity.completed",
    "first_time": true,
    "filter": {
      "type": "certification",
      "ability_level": "1",
      "status": "passed"
    }
  }'::json,
  false,
  true,
  1,
  11
),
-- 首次通过2级认证
(
  'EXAM_FIRST_L2',
  '进阶之路',
  '首次通过2级能力认证测评',
  'exam_certification',
  'first_breakthrough',
  'common',
  '/images/achievements/first_pass_level_2.png',
  40,
  '{
    "trigger_mode": "real_time",
    "trigger_frequency": "real_time",
    "condition_type": "state",
    "event_name": "student.activity.completed",
    "first_time": true,
    "filter": {
      "type": "certification",
      "ability_level": "2",
      "status": "passed"
    }
  }'::json,
  false,
  true,
  1,
  12
),
-- 首次通过3级认证
(
  'EXAM_FIRST_L3',
  '稳步前行',
  '首次通过3级能力认证测评',
  'exam_certification',
  'first_breakthrough',
  'common',
  '/images/achievements/first_pass_level_3.png',
  60,
  '{
    "trigger_mode": "real_time",
    "trigger_frequency": "real_time",
    "condition_type": "state",
    "event_name": "student.activity.completed",
    "first_time": true,
    "filter": {
      "type": "certification",
      "ability_level": "3",
      "status": "passed"
    }
  }'::json,
  false,
  true,
  1,
  13
),
-- 首次通过4级认证
(
  'EXAM_FIRST_L4',
  '实力证明',
  '首次通过4级能力认证测评',
  'exam_certification',
  'first_breakthrough',
  'rare',
  '/images/achievements/first_pass_level_4.png',
  80,
  '{
    "trigger_mode": "real_time",
    "trigger_frequency": "real_time",
    "condition_type": "state",
    "event_name": "student.activity.completed",
    "first_time": true,
    "filter": {
      "type": "certification",
      "ability_level": "4",
      "status": "passed"
    }
  }'::json,
  false,
  true,
  1,
  14
),
-- 首次通过5级认证
(
  'EXAM_FIRST_L5',
  '优秀标准',
  '首次通过5级能力认证测评',
  'exam_certification',
  'first_breakthrough',
  'rare',
  '/images/achievements/first_pass_level_5.png',
  100,
  '{
    "trigger_mode": "real_time",
    "trigger_frequency": "real_time",
    "condition_type": "state",
    "event_name": "student.activity.completed",
    "first_time": true,
    "filter": {
      "type": "certification",
      "ability_level": "5",
      "status": "passed"
    }
  }'::json,
  false,
  true,
  1,
  15
),
-- 首次通过6级认证
(
  'EXAM_FIRST_L6',
  '卓越征途',
  '首次通过6级能力认证测评',
  'exam_certification',
  'first_breakthrough',
  'epic',
  '/images/achievements/first_pass_level_6.png',
  120,
  '{
    "trigger_mode": "real_time",
    "trigger_frequency": "real_time",
    "condition_type": "state",
    "event_name": "student.activity.completed",
    "first_time": true,
    "filter": {
      "type": "certification",
      "ability_level": "6",
      "status": "passed"
    }
  }'::json,
  false,
  true,
  1,
  16
),
-- 首次通过7级认证
(
  'EXAM_FIRST_L7',
  '王者降临',
  '首次通过7级能力认证测评',
  'exam_certification',
  'first_breakthrough',
  'epic',
  '/images/achievements/first_pass_level_7.png',
  140,
  '{
    "trigger_mode": "real_time",
    "trigger_frequency": "real_time",
    "condition_type": "state",
    "event_name": "student.activity.completed",
    "first_time": true,
    "filter": {
      "type": "certification",
      "ability_level": "7",
      "status": "passed"
    }
  }'::json,
  false,
  true,
  1,
  17
),
-- 首次获得满分（练习）
(
  'EXAM_FIRST_PERFECT',
  '满分学霸',
  '单次练习获得满分',
  'exam_certification',
  'first_breakthrough',
  'rare',
  '/images/achievements/perfect_score.png',
  150,
  '{
    "trigger_mode": "real_time",
    "trigger_frequency": "real_time",
    "condition_type": "state",
    "event_name": "student.perfect.score",
    "filter": {
      "type": "practice",
      "score": 100
    }
  }'::json,
  false,
  true,
  1,
  18
),
-- 首次完成测评（任意类型）
(
  'EXAM_FIRST_COMPLETE',
  '初体验',
  '首次完成测评活动',
  'exam_certification',
  'first_breakthrough',
  'common',
  '/images/achievements/first_complete.png',
  30,
  '{
    "trigger_mode": "real_time",
    "trigger_frequency": "real_time",
    "condition_type": "state",
    "event_name": "student.activity.completed",
    "first_time": true
  }'::json,
  false,
  true,
  1,
  9
);

-- ==========================================
-- 分类2：学习时长类成就（12个）
-- ==========================================
INSERT INTO achievements (
  achievement_code,
  achievement_name,
  achievement_desc,
  category,
  subcategory,
  rarity,
  achievement_icon,
  points_reward,
  trigger_condition,
  is_hidden,
  is_active,
  max_times,
  display_order
) VALUES
(
  'LEARN_TIME_10H',
  '初入学堂',
  '累计学习时长达到10小时',
  'learning_growth',
  'learning_duration',
  'common',
  '/images/achievements/learning_10h.png',
  20,
  '{
    "trigger_mode": "scheduled",
    "trigger_frequency": "daily",
    "trigger_time": "00:10:00",
    "condition_type": "threshold",
    "event_name": "student.learning.duration",
    "metric": "total_learning_minutes",
    "operator": ">=",
    "threshold": 600
  }'::json,
  false,
  true,
  1,
  100
),
(
  'LEARN_TIME_50H',
  '勤学苦练',
  '累计学习时长达到50小时',
  'learning_growth',
  'learning_duration',
  'common',
  '/images/achievements/learning_50h.png',
  100,
  '{
    "trigger_mode": "scheduled",
    "trigger_frequency": "daily",
    "trigger_time": "00:10:00",
    "condition_type": "threshold",
    "event_name": "student.learning.duration",
    "metric": "total_learning_minutes",
    "operator": ">=",
    "threshold": 3000
  }'::json,
  false,
  true,
  1,
  101
),
(
  'LEARN_TIME_100H',
  '百时功勋',
  '累计学习时长达到100小时',
  'learning_growth',
  'learning_duration',
  'rare',
  '/images/achievements/learning_100h.png',
  200,
  '{
    "trigger_mode": "scheduled",
    "trigger_frequency": "daily",
    "trigger_time": "00:10:00",
    "condition_type": "threshold",
    "event_name": "student.learning.duration",
    "metric": "total_learning_minutes",
    "operator": ">=",
    "threshold": 6000
  }'::json,
  false,
  true,
  1,
  102
),
(
  'LEARN_TIME_200H',
  '勤奋标兵',
  '累计学习时长达到200小时',
  'learning_growth',
  'learning_duration',
  'rare',
  '/images/achievements/learning_200h.png',
  400,
  '{
    "trigger_mode": "scheduled",
    "trigger_frequency": "daily",
    "trigger_time": "00:10:00",
    "condition_type": "threshold",
    "event_name": "student.learning.duration",
    "metric": "total_learning_minutes",
    "operator": ">=",
    "threshold": 12000
  }'::json,
  false,
  true,
  1,
  103
),
(
  'LEARN_TIME_500H',
  '时间管理大师',
  '累计学习时长达到500小时',
  'learning_growth',
  'learning_duration',
  'epic',
  '/images/achievements/learning_500h.png',
  1000,
  '{
    "trigger_mode": "scheduled",
    "trigger_frequency": "daily",
    "trigger_time": "00:10:00",
    "condition_type": "threshold",
    "event_name": "student.learning.duration",
    "metric": "total_learning_minutes",
    "operator": ">=",
    "threshold": 30000
  }'::json,
  false,
  true,
  1,
  104
),
(
  'LEARN_TIME_1000H',
  '万时传奇',
  '累计学习时长达到1000小时',
  'learning_growth',
  'learning_duration',
  'legendary',
  '/images/achievements/learning_1000h.png',
  2000,
  '{
    "trigger_mode": "scheduled",
    "trigger_frequency": "daily",
    "trigger_time": "00:10:00",
    "condition_type": "threshold",
    "event_name": "student.learning.duration",
    "metric": "total_learning_minutes",
    "operator": ">=",
    "threshold": 60000
  }'::json,
  false,
  true,
  1,
  105
);

-- ==========================================
-- 分类3：连续登录类成就（10个）
-- ==========================================
INSERT INTO achievements (
  achievement_code,
  achievement_name,
  achievement_desc,
  category,
  subcategory,
  rarity,
  achievement_icon,
  points_reward,
  trigger_condition,
  is_hidden,
  is_active,
  max_times,
  display_order
) VALUES
(
  'LOGIN_STREAK_3',
  '三日之约',
  '连续3天登录学习平台',
  'learning_growth',
  'learning_frequency',
  'common',
  '/images/achievements/consecutive_3d.png',
  15,
  '{
    "trigger_mode": "scheduled",
    "trigger_frequency": "daily",
    "trigger_time": "00:10:00",
    "condition_type": "consecutive",
    "event_name": "student.login",
    "consecutive_days": 3
  }'::json,
  false,
  true,
  1,
  200
),
(
  'LOGIN_STREAK_7',
  '七日之志',
  '连续7天登录学习平台',
  'learning_growth',
  'learning_frequency',
  'common',
  '/images/achievements/consecutive_7d.png',
  35,
  '{
    "trigger_mode": "scheduled",
    "trigger_frequency": "daily",
    "trigger_time": "00:10:00",
    "condition_type": "consecutive",
    "event_name": "student.login",
    "consecutive_days": 7
  }'::json,
  false,
  true,
  1,
  201
),
(
  'LOGIN_STREAK_14',
  '半月坚持',
  '连续14天登录学习平台',
  'learning_growth',
  'learning_frequency',
  'rare',
  '/images/achievements/consecutive_14d.png',
  70,
  '{
    "trigger_mode": "scheduled",
    "trigger_frequency": "daily",
    "trigger_time": "00:10:00",
    "condition_type": "consecutive",
    "event_name": "student.login",
    "consecutive_days": 14
  }'::json,
  false,
  true,
  1,
  202
),
(
  'LOGIN_STREAK_30',
  '月度冠军',
  '连续30天登录学习平台',
  'learning_growth',
  'learning_frequency',
  'rare',
  '/images/achievements/consecutive_30d.png',
  150,
  '{
    "trigger_mode": "scheduled",
    "trigger_frequency": "daily",
    "trigger_time": "00:10:00",
    "condition_type": "consecutive",
    "event_name": "student.login",
    "consecutive_days": 30
  }'::json,
  false,
  true,
  1,
  203
),
(
  'LOGIN_STREAK_60',
  '双月英雄',
  '连续60天登录学习平台',
  'learning_growth',
  'learning_frequency',
  'epic',
  '/images/achievements/consecutive_60d.png',
  300,
  '{
    "trigger_mode": "scheduled",
    "trigger_frequency": "daily",
    "trigger_time": "00:10:00",
    "condition_type": "consecutive",
    "event_name": "student.login",
    "consecutive_days": 60
  }'::json,
  false,
  true,
  1,
  204
),
(
  'LOGIN_STREAK_100',
  '百日传说',
  '连续100天登录学习平台',
  'learning_growth',
  'learning_frequency',
  'legendary',
  '/images/achievements/consecutive_100d.png',
  500,
  '{
    "trigger_mode": "scheduled",
    "trigger_frequency": "daily",
    "trigger_time": "00:10:00",
    "condition_type": "consecutive",
    "event_name": "student.login",
    "consecutive_days": 100
  }'::json,
  false,
  true,
  1,
  205
);

-- ==========================================
-- 分类4：连续通过类成就（10个）
-- ==========================================
INSERT INTO achievements (
  achievement_code,
  achievement_name,
  achievement_desc,
  category,
  subcategory,
  rarity,
  achievement_icon,
  points_reward,
  trigger_condition,
  is_hidden,
  is_active,
  max_times,
  display_order
) VALUES
(
  'PASS_STREAK_3',
  '连续通过3次',
  '连续通过3次认证测评（任意级别）',
  'exam_certification',
  'consecutive_success',
  'common',
  '/images/achievements/consecutive_pass_3.png',
  120,
  '{
    "trigger_mode": "real_time",
    "trigger_frequency": "real_time",
    "condition_type": "count",
    "event_name": "student.activity.completed",
    "target_count": 3,
    "consecutive": true,
    "filter": {
      "status": "passed"
    }
  }'::json,
  false,
  true,
  1,
  300
),
(
  'PASS_STREAK_5',
  '连续通过5次',
  '连续通过5次认证测评（任意级别）',
  'exam_certification',
  'consecutive_success',
  'rare',
  '/images/achievements/consecutive_pass_5.png',
  200,
  '{
    "trigger_mode": "real_time",
    "trigger_frequency": "real_time",
    "condition_type": "count",
    "event_name": "student.activity.completed",
    "target_count": 5,
    "consecutive": true,
    "filter": {
      "status": "passed"
    }
  }'::json,
  false,
  true,
  1,
  301
),
(
  'PASS_STREAK_10',
  '钻石品质',
  '连续通过10次认证测评（任意级别）',
  'exam_certification',
  'consecutive_success',
  'epic',
  '/images/achievements/consecutive_pass_10.png',
  400,
  '{
    "trigger_mode": "real_time",
    "trigger_frequency": "real_time",
    "condition_type": "count",
    "event_name": "student.activity.completed",
    "target_count": 10,
    "consecutive": true,
    "filter": {
      "status": "passed"
    }
  }'::json,
  false,
  true,
  1,
  302
);

-- ==========================================
-- 分类5：特殊事件类 - 节日成就（6个）
-- ==========================================
INSERT INTO achievements (
  achievement_code,
  achievement_name,
  achievement_desc,
  category,
  subcategory,
  rarity,
  achievement_icon,
  points_reward,
  trigger_condition,
  is_hidden,
  is_active,
  max_times,
  cooldown_days,
  display_order
) VALUES
(
  'EVENT_NEWYEAR',
  '新年新气象',
  '春节期间连续7天学习',
  'special_event',
  'holiday',
  'rare',
  '/images/achievements/newyear.png',
  200,
  '{
    "trigger_mode": "scheduled",
    "trigger_frequency": "daily",
    "trigger_time": "00:10:00",
    "condition_type": "time_window",
    "event_name": "student.login",
    "time_window": {
      "type": "date_range",
      "start": "${LUNAR_NEW_YEAR}",
      "end": "${LUNAR_NEW_YEAR_END}"
    },
    "consecutive_days": 7
  }'::json,
  false,
  true,
  999,
  365,
  400
);

-- 验证插入结果
SELECT
  achievement_code,
  achievement_name,
  category,
  subcategory,
  rarity,
  points_reward
FROM achievements
ORDER BY display_order;
