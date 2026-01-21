-- Migration 038: 修复 question_reviews 表的外键约束
-- 日期: 2025-01-21
-- 说明:
--   迁移 024 重命名了 question_bank 表为 question_bank_old_backup_20251122
--   导致 question_reviews 表的外键约束指向了错误的备份表
--   此迁移修复外键约束，使其指向正确的 question_bank 表

-- 1. 删除指向备份表的错误外键约束
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'question_reviews_question_id_fkey'
        AND conrelid = 'question_reviews'::regclass
        AND confrelid = 'question_bank_old_backup_20251122'::regclass
    ) THEN
        ALTER TABLE question_reviews DROP CONSTRAINT question_reviews_question_id_fkey;
    END IF;
END $$;

-- 2. 清理无效的审核记录（question_id 不在 question_bank 中的记录）
DELETE FROM question_reviews
WHERE NOT EXISTS (
    SELECT 1 FROM question_bank WHERE question_bank.id = question_reviews.question_id
);

-- 3. 添加正确的外键约束，指向 question_bank 表
ALTER TABLE question_reviews
    ADD CONSTRAINT question_reviews_question_id_fkey
    FOREIGN KEY (question_id)
    REFERENCES question_bank(id)
    ON DELETE CASCADE;

-- 4. 验证外键已正确创建
DO $$
BEGIN
    RAISE NOTICE 'Foreign key constraint fixed: question_reviews.question_id -> question_bank.id';
END $$;
