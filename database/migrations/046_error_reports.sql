-- Migration 046: 题目纠错流程（C5）
-- Date: 2026-06-17
-- Description: 学生对题目提交纠错申请，出题人/审核人处理。
--   规则：同一道题累计纠错 3 次提醒区级关注，5 次封顶冻结；
--         单个学生对同一题只能纠错 1 次（UNIQUE 约束兜底）。

BEGIN;

CREATE TABLE IF NOT EXISTS public.question_error_reports (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL,                 -- question_bank.id
    draft_id INTEGER,                             -- 关联草稿
    reporter_id INTEGER NOT NULL,                 -- 纠错学生 users.id
    error_type VARCHAR(30) NOT NULL,              -- question/answer/explanation/options/other
    error_description TEXT NOT NULL,              -- 具体错误点
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending/accepted/rejected
    handler_id INTEGER,                           -- 处理人 users.id
    handle_comment TEXT,
    handled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT qer_reporter_question_unique UNIQUE (reporter_id, question_id),
    CONSTRAINT qer_status_check CHECK (status::text = ANY (ARRAY['pending', 'accepted', 'rejected']::text[])),
    CONSTRAINT qer_error_type_check CHECK (error_type::text = ANY (ARRAY['question', 'answer', 'explanation', 'options', 'other']::text[]))
);

CREATE INDEX IF NOT EXISTS idx_qer_question ON public.question_error_reports(question_id);
CREATE INDEX IF NOT EXISTS idx_qer_status ON public.question_error_reports(status);
CREATE INDEX IF NOT EXISTS idx_qer_handler ON public.question_error_reports(handler_id);

COMMENT ON TABLE public.question_error_reports IS '题目纠错流程（C5），单学生单题1次，累计5次封顶';
COMMENT ON COLUMN public.question_error_reports.error_type IS 'question-题干 answer-答案 explanation-解析 options-选项 other-其他';

COMMIT;
