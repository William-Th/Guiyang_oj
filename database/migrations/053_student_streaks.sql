-- Migration 053: 学生连胜计数（D2）
-- Date: 2026-06-17
-- Description: 连续答对计数，断则归零，达步长倍数触发连胜奖励。

BEGIN;

CREATE TABLE IF NOT EXISTS public.student_streaks (
    student_id INTEGER PRIMARY KEY,
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    last_correct_at TIMESTAMPTZ
);

COMMENT ON TABLE public.student_streaks IS '学生连胜计数（D2），连续答对累计，答错或超时归零';

COMMIT;
