-- Migration 049: content_hash 改为 TEXT（修复 SimHash 64bit 无符号值超出 BIGINT 范围）
-- Date: 2026-06-17
-- Description: SimHash 指纹为无符号 64bit，最大 ~1.8e19 超过 PG BIGINT 上限(9.2e18)。
--   改用 TEXT 存储十进制字符串，读取时 BigInt(str) 还原。

BEGIN;

ALTER TABLE public.question_fingerprint ALTER COLUMN content_hash TYPE TEXT USING content_hash::text;

COMMIT;
