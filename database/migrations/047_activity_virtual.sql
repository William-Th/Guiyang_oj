-- Migration 047: 虚拟练习标记（C2）
-- Date: 2026-06-17
-- Description: activities 增加 is_virtual 字段。虚拟练习与真实题库关联，
--   但不显示在学生活动列表，仅用于教师导入成绩。

BEGIN;

ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS is_virtual BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.activities.is_virtual IS '是否虚拟练习（C2）：不显示给学生，用于导入成绩';

COMMIT;
