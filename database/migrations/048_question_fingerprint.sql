-- Migration 048: 题目同质化指纹（算法① L0/L1）
-- Date: 2026-06-17
-- Description: 存储题目 SimHash 文本指纹与结构化键，用于同质化粗筛。
--   L0 结构化键：type|subject|grade|difficulty|knowledge_points(sorted)
--   L1 SimHash：64bit 文本指纹，汉明距离越小越相似。

BEGIN;

CREATE TABLE IF NOT EXISTS public.question_fingerprint (
    draft_id INTEGER PRIMARY KEY,
    content_hash TEXT,                         -- SimHash 64bit 指纹（十进制字符串，避免 BIGINT 溢出）
    structured_key TEXT,                       -- L0 结构化键
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qf_structured_key ON public.question_fingerprint(structured_key);

COMMENT ON TABLE public.question_fingerprint IS '题目同质化指纹（算法① L0/L1）';
COMMENT ON COLUMN public.question_fingerprint.content_hash IS 'SimHash 64bit 指纹';
COMMENT ON COLUMN public.question_fingerprint.structured_key IS 'L0 结构化键 type|subject|grade|difficulty|kp';

COMMIT;
