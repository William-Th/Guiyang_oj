-- =====================================================
-- 修复日常任务表约束
-- =====================================================
-- 迁移编号: 023
-- 创建日期: 2025-11-09
-- 描述: 修复task_type约束，使其适配新的字段定义
-- =====================================================

-- 删除旧的check_task_type约束
ALTER TABLE daily_tasks
DROP CONSTRAINT IF EXISTS check_task_type;

-- 添加新的约束：task_type应该是活动类型（login/practice/exam/social等）
ALTER TABLE daily_tasks
ADD CONSTRAINT check_task_type CHECK (
    task_type IN ('login', 'practice', 'exam', 'social', 'weekly', 'monthly', 'other')
);

-- 添加category约束（时间周期）
ALTER TABLE daily_tasks
ADD CONSTRAINT check_category CHECK (
    category IN ('daily', 'weekly', 'monthly')
);

-- 添加reset_period约束
ALTER TABLE daily_tasks
ADD CONSTRAINT check_reset_period CHECK (
    reset_period IN ('daily', 'weekly', 'monthly')
);

-- 添加progress_type约束
ALTER TABLE daily_tasks
ADD CONSTRAINT check_progress_type CHECK (
    progress_type IN ('count', 'duration', 'score')
);

-- 验证
DO $$
BEGIN
    RAISE NOTICE '✅ 日常任务约束已更新';
    RAISE NOTICE '  - task_type: login/practice/exam/social/weekly/monthly/other';
    RAISE NOTICE '  - category: daily/weekly/monthly';
    RAISE NOTICE '  - reset_period: daily/weekly/monthly';
    RAISE NOTICE '  - progress_type: count/duration/score';
END $$;
