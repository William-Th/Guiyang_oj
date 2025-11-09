-- =====================================================
-- 日常任务系统增强迁移
-- =====================================================
-- 迁移编号: 022
-- 创建日期: 2025-11-09
-- 描述: 增强daily_tasks表，添加缺失字段
-- 依赖: 020_achievement_system_schema.sql
-- =====================================================

-- =====================================================
-- 1. 增强 daily_tasks 表
-- =====================================================

-- 添加 category 字段（任务周期类别）
ALTER TABLE daily_tasks
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'daily';

-- 添加 bonus_points 字段（连续完成奖励）
ALTER TABLE daily_tasks
ADD COLUMN IF NOT EXISTS bonus_points INTEGER DEFAULT 0;

-- 添加 progress_type 字段（进度类型）
ALTER TABLE daily_tasks
ADD COLUMN IF NOT EXISTS progress_type VARCHAR(50) DEFAULT 'count';

-- 添加 reset_period 字段（重置周期）
ALTER TABLE daily_tasks
ADD COLUMN IF NOT EXISTS reset_period VARCHAR(20) DEFAULT 'daily';

-- 添加 reset_time 字段（重置时间点）
ALTER TABLE daily_tasks
ADD COLUMN IF NOT EXISTS reset_time TIME DEFAULT '00:00:00';

-- 添加 valid_from 字段（有效期起始）
ALTER TABLE daily_tasks
ADD COLUMN IF NOT EXISTS valid_from DATE;

-- 添加 valid_to 字段（有效期结束）
ALTER TABLE daily_tasks
ADD COLUMN IF NOT EXISTS valid_to DATE;

-- 更新索引
CREATE INDEX IF NOT EXISTS idx_daily_tasks_category ON daily_tasks(category);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_valid_dates ON daily_tasks(valid_from, valid_to);

-- 添加注释
COMMENT ON COLUMN daily_tasks.category IS '任务周期类别：daily/weekly/monthly';
COMMENT ON COLUMN daily_tasks.bonus_points IS '连续完成额外奖励';
COMMENT ON COLUMN daily_tasks.progress_type IS '进度类型：count/duration/score';
COMMENT ON COLUMN daily_tasks.reset_period IS '重置周期';
COMMENT ON COLUMN daily_tasks.reset_time IS '每日重置时间点';
COMMENT ON COLUMN daily_tasks.valid_from IS '任务有效期起始日期';
COMMENT ON COLUMN daily_tasks.valid_to IS '任务有效期结束日期';

-- =====================================================
-- 2. 确保 student_task_progress 表存在且完整
-- =====================================================

-- student_task_progress 应该已经在 020 迁移中创建，这里只做验证
-- 添加缺失的字段（如果有）
ALTER TABLE student_task_progress
ADD COLUMN IF NOT EXISTS bonus_awarded INTEGER DEFAULT 0;

ALTER TABLE student_task_progress
ADD COLUMN IF NOT EXISTS period_start DATE;

ALTER TABLE student_task_progress
ADD COLUMN IF NOT EXISTS period_end DATE;

ALTER TABLE student_task_progress
ADD COLUMN IF NOT EXISTS reset_count INTEGER DEFAULT 0;

-- 添加注释
COMMENT ON COLUMN student_task_progress.bonus_awarded IS '获得的奖励积分';
COMMENT ON COLUMN student_task_progress.period_start IS '任务周期开始日期';
COMMENT ON COLUMN student_task_progress.period_end IS '任务周期结束日期';
COMMENT ON COLUMN student_task_progress.reset_count IS '任务重置次数，用于连续完成追踪';

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_student_task_progress_period ON student_task_progress(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_student_task_progress_student_period ON student_task_progress(student_id, period_start);

-- =====================================================
-- 3. 确保 task_completion_history 表存在且完整
-- =====================================================

-- task_completion_history 应该已经在 020 迁移中创建
-- 添加缺失的字段（如果有）
ALTER TABLE task_completion_history
ADD COLUMN IF NOT EXISTS bonus_earned INTEGER DEFAULT 0;

ALTER TABLE task_completion_history
ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 1;

-- 添加注释
COMMENT ON COLUMN task_completion_history.bonus_earned IS '获得的奖励积分';
COMMENT ON COLUMN task_completion_history.streak_count IS '连续完成次数（用于计算连续奖励）';

-- =====================================================
-- 4. 验证迁移
-- =====================================================

DO $$
DECLARE
    daily_tasks_count INTEGER;
BEGIN
    -- 检查 daily_tasks 表列数
    SELECT COUNT(*) INTO daily_tasks_count
    FROM information_schema.columns
    WHERE table_name = 'daily_tasks';

    RAISE NOTICE '✅ 日常任务系统表增强完成';
    RAISE NOTICE '  - daily_tasks: % 个字段', daily_tasks_count;
    RAISE NOTICE '  - 新增字段: category, bonus_points, progress_type, reset_period, reset_time, valid_from, valid_to';
    RAISE NOTICE '  - student_task_progress: 增强完成';
    RAISE NOTICE '  - task_completion_history: 增强完成';
END $$;
