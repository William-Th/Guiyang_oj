-- Migration 050: 每日推题缓存（D3，算法③）
-- Date: 2026-06-17
-- Description: 缓存学生每日推荐题集（错题复习 + 弱项新题 + 难度匹配），避免重复推题。

BEGIN;

CREATE TABLE IF NOT EXISTS public.daily_question_sets (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    stat_date DATE NOT NULL,
    subject VARCHAR(50),                       -- 科目（按科目各一份）
    question_ids INTEGER[] DEFAULT '{}'::int[], -- question_bank.id 列表
    streak_count INTEGER DEFAULT 0,            -- 当日连胜
    completed_count INTEGER DEFAULT 0,         -- 已完成数
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT daily_qs_unique UNIQUE (student_id, stat_date, subject)
);

CREATE INDEX IF NOT EXISTS idx_daily_qs_student_date
    ON public.daily_question_sets(student_id, stat_date);

COMMENT ON TABLE public.daily_question_sets IS '每日推题缓存（D3，算法③）';

COMMIT;
