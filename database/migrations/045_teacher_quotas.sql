-- Migration 045: 教师题目配额（C4）
-- Date: 2026-06-17
-- Description: 教师题目上限（默认 1000 道），市级管理员可针对教师调整额度。
--   计数口径：question_drafts.is_active 为 true 且 created_by = 该教师 的题目数
--   （草稿 + 已发布题目本体，发布到多个范围算同一道题）。

BEGIN;

CREATE TABLE IF NOT EXISTS public.teacher_quotas (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,            -- 教师 users.id
    quota INTEGER NOT NULL DEFAULT 1000,        -- 题目上限
    granted_by INTEGER,                         -- 分配额度的管理员
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.teacher_quotas IS '教师题目配额（C4），默认1000道，市级管理员可调整';
COMMENT ON COLUMN public.teacher_quotas.user_id IS '教师 users.id';
COMMENT ON COLUMN public.teacher_quotas.quota IS '题目上限（草稿+已发布题目总数）';

COMMIT;
