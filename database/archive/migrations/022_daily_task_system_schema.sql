-- =====================================================
-- 日常任务系统数据库迁移
-- =====================================================
-- 迁移编号: 022
-- 创建日期: 2025-11-09
-- 描述: 创建日常任务系统相关表
-- 依赖: 020_achievement_system_schema.sql
-- =====================================================

-- =====================================================
-- 1. 日常任务定义表
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_tasks (
    task_id SERIAL PRIMARY KEY,
    task_code VARCHAR(50) UNIQUE NOT NULL,
    task_name VARCHAR(100) NOT NULL,
    task_desc TEXT,
    task_icon VARCHAR(20),

    -- 任务分类
    category VARCHAR(50) NOT NULL,  -- daily(每日), weekly(每周), monthly(每月)
    task_type VARCHAR(50) NOT NULL, -- login(登录), practice(练习), exam(考试), social(社交)

    -- 积分奖励
    points_reward INTEGER NOT NULL DEFAULT 0,
    bonus_points INTEGER DEFAULT 0,  -- 连续完成奖励

    -- 任务目标
    target_value INTEGER NOT NULL,  -- 目标数值（如登录1次、完成5题）
    progress_type VARCHAR(50) NOT NULL, -- count(计数), duration(时长), score(分数)

    -- 重置周期
    reset_period VARCHAR(20) NOT NULL, -- daily, weekly, monthly
    reset_time TIME DEFAULT '00:00:00', -- 重置时间点

    -- 触发条件（JSON格式）
    trigger_condition JSONB NOT NULL,

    -- 状态控制
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,

    -- 时间限制
    valid_from DATE,
    valid_to DATE,

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_daily_tasks_category ON daily_tasks(category);
CREATE INDEX idx_daily_tasks_task_type ON daily_tasks(task_type);
CREATE INDEX idx_daily_tasks_is_active ON daily_tasks(is_active);
CREATE INDEX idx_daily_tasks_valid_dates ON daily_tasks(valid_from, valid_to);

-- 注释
COMMENT ON TABLE daily_tasks IS '日常任务定义表';
COMMENT ON COLUMN daily_tasks.task_code IS '任务唯一代码';
COMMENT ON COLUMN daily_tasks.category IS '任务周期类别：daily/weekly/monthly';
COMMENT ON COLUMN daily_tasks.task_type IS '任务类型：login/practice/exam/social';
COMMENT ON COLUMN daily_tasks.points_reward IS '基础积分奖励';
COMMENT ON COLUMN daily_tasks.bonus_points IS '连续完成额外奖励';
COMMENT ON COLUMN daily_tasks.target_value IS '任务目标数值';
COMMENT ON COLUMN daily_tasks.progress_type IS '进度类型：count/duration/score';
COMMENT ON COLUMN daily_tasks.reset_period IS '重置周期';
COMMENT ON COLUMN daily_tasks.trigger_condition IS 'JSON格式的触发条件';

-- =====================================================
-- 2. 学生任务进度表
-- =====================================================

CREATE TABLE IF NOT EXISTS student_task_progress (
    progress_id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES daily_tasks(task_id) ON DELETE CASCADE,

    -- 进度追踪
    current_value INTEGER DEFAULT 0,  -- 当前进度值
    target_value INTEGER NOT NULL,    -- 目标值（从daily_tasks复制）
    completion_rate DECIMAL(5,2) DEFAULT 0.00, -- 完成率 (0-100)

    -- 完成状态
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,

    -- 奖励发放
    points_awarded INTEGER DEFAULT 0,
    bonus_awarded INTEGER DEFAULT 0,

    -- 重置追踪
    period_start DATE NOT NULL,  -- 任务周期开始日期
    period_end DATE NOT NULL,    -- 任务周期结束日期
    reset_count INTEGER DEFAULT 0, -- 重置次数（用于追踪连续完成）

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 唯一约束：每个学生在每个周期内对同一任务只有一条记录
    UNIQUE(student_id, task_id, period_start)
);

-- 索引
CREATE INDEX idx_student_task_progress_student ON student_task_progress(student_id);
CREATE INDEX idx_student_task_progress_task ON student_task_progress(task_id);
CREATE INDEX idx_student_task_progress_completed ON student_task_progress(is_completed);
CREATE INDEX idx_student_task_progress_period ON student_task_progress(period_start, period_end);
CREATE INDEX idx_student_task_progress_student_period ON student_task_progress(student_id, period_start);

-- 注释
COMMENT ON TABLE student_task_progress IS '学生日常任务进度表';
COMMENT ON COLUMN student_task_progress.current_value IS '当前完成进度值';
COMMENT ON COLUMN student_task_progress.completion_rate IS '完成率百分比';
COMMENT ON COLUMN student_task_progress.period_start IS '任务周期开始日期';
COMMENT ON COLUMN student_task_progress.period_end IS '任务周期结束日期';
COMMENT ON COLUMN student_task_progress.reset_count IS '任务重置次数，用于连续完成追踪';

-- =====================================================
-- 3. 任务完成历史表
-- =====================================================

CREATE TABLE IF NOT EXISTS task_completion_history (
    history_id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES daily_tasks(task_id) ON DELETE CASCADE,

    -- 完成信息
    completed_value INTEGER NOT NULL,  -- 完成时的值
    target_value INTEGER NOT NULL,     -- 目标值
    points_earned INTEGER DEFAULT 0,   -- 获得的积分
    bonus_earned INTEGER DEFAULT 0,    -- 获得的奖励积分

    -- 周期信息
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    completion_time TIMESTAMP NOT NULL,

    -- 连续完成追踪
    streak_count INTEGER DEFAULT 1,  -- 连续完成次数

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_task_history_student ON task_completion_history(student_id);
CREATE INDEX idx_task_history_task ON task_completion_history(task_id);
CREATE INDEX idx_task_history_completion_time ON task_completion_history(completion_time);

-- 注释
COMMENT ON TABLE task_completion_history IS '任务完成历史记录表';
COMMENT ON COLUMN task_completion_history.streak_count IS '连续完成次数（用于计算连续奖励）';

-- =====================================================
-- 4. 触发器：自动更新 updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_daily_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_tasks_updated_at
    BEFORE UPDATE ON daily_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_tasks_updated_at();

CREATE OR REPLACE FUNCTION update_student_task_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_student_task_progress_updated_at
    BEFORE UPDATE ON student_task_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_student_task_progress_updated_at();

-- =====================================================
-- 5. 触发器：自动计算完成率
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_task_completion_rate()
RETURNS TRIGGER AS $$
BEGIN
    -- 计算完成率
    IF NEW.target_value > 0 THEN
        NEW.completion_rate = LEAST((NEW.current_value::DECIMAL / NEW.target_value::DECIMAL) * 100, 100);
    ELSE
        NEW.completion_rate = 0;
    END IF;

    -- 检查是否完成
    IF NEW.current_value >= NEW.target_value AND NOT NEW.is_completed THEN
        NEW.is_completed = TRUE;
        NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_task_completion_rate
    BEFORE INSERT OR UPDATE ON student_task_progress
    FOR EACH ROW
    EXECUTE FUNCTION calculate_task_completion_rate();

-- =====================================================
-- 6. 验证迁移
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ 日常任务系统表创建成功';
    RAISE NOTICE '  - daily_tasks: 任务定义表';
    RAISE NOTICE '  - student_task_progress: 学生进度表';
    RAISE NOTICE '  - task_completion_history: 完成历史表';
    RAISE NOTICE '  - 触发器: updated_at 自动更新';
    RAISE NOTICE '  - 触发器: completion_rate 自动计算';
END $$;
