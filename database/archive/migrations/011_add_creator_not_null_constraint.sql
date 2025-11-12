-- ===================================================================
-- Migration: 添加题目出题人必填约束
-- Date: 2025-11-05
-- Description:
--   为question_bank表的created_by字段添加NOT NULL约束
--   确保每道题目都有明确的出题人
--
-- Note:
--   - created_by字段必须有值（出题人）
--   - reviewer_id字段可以为空（审批人在审批前为空）
--   - published_by字段可以为空（发布人在发布前为空）
-- ===================================================================

BEGIN;

-- 添加NOT NULL约束到created_by字段
ALTER TABLE question_bank
ALTER COLUMN created_by SET NOT NULL;

-- 验证约束已添加
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'question_bank'
      AND column_name = 'created_by'
      AND is_nullable = 'NO'
  ) THEN
    RAISE NOTICE 'SUCCESS: created_by NOT NULL constraint added successfully';
  ELSE
    RAISE EXCEPTION 'FAILED: created_by NOT NULL constraint was not added';
  END IF;
END $$;

COMMIT;
