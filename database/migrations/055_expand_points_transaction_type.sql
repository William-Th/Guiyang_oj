-- 055_expand_points_transaction_type.sql
-- 扩展 points_transactions.transaction_type 的 CHECK 约束
--
-- 背景：原 CHECK 仅允许 7 种类型（achievement/daily_task/activity/redemption/
--   manual/teacher_reward/expired），但代码实际写入 practice/wrong_redo/streak/
--   shop_purchase（答题/错题重做/连胜/商城兑换），均被约束拒绝，导致这些积分
--   流水写入失败、账户余额在答题时不增长。详见积分系统修复方案。
--
-- 本次：保留全部历史合法值，新增 4 种实际在用的类型，使既有代码可正常入库。
-- 兼容历史数据（activity/daily_task/redemption/teacher_reward/expired 仍合法）。

ALTER TABLE points_transactions DROP CONSTRAINT IF EXISTS check_transaction_type;

ALTER TABLE points_transactions ADD CONSTRAINT check_transaction_type CHECK (
  transaction_type IN (
    -- 历史 / 既有合法值
    'achievement', 'daily_task', 'activity', 'redemption',
    'manual', 'teacher_reward', 'expired',
    -- 本次新增：与代码实际写入对齐
    'practice',    -- 答题奖励（PointsPolicy.awardForCorrectAnswer）
    'wrong_redo',  -- 错题重做奖励
    'streak',      -- 连胜奖励（PointsPolicy.awardStreak）
    'shop_purchase' -- 商城兑换消费（shop.js deductPoints）
  )
);

-- 更新列注释，补全新增类型说明
COMMENT ON COLUMN points_transactions.transaction_type IS
  '交易类型：获得类 achievement(成就)/practice(答题)/wrong_redo(错题重做)/streak(连胜)/daily_task(日常任务)/activity(活动)/teacher_reward(教师奖励)/manual(手动调整)；消耗类 redemption(兑换)/shop_purchase(商城消费)/manual；过期 expired';
