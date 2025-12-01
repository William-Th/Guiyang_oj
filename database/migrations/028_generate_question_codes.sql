-- Migration: 028_generate_question_codes.sql
-- Description: 为已发布的题目生成题目编码 (question_code)
-- Date: 2025-11-30
-- Reason: 之前发布的题目没有生成编码，需要补充

-- 创建临时函数来生成题目编码
CREATE OR REPLACE FUNCTION generate_question_code_for_existing()
RETURNS void AS $$
DECLARE
    rec RECORD;
    subject_code VARCHAR(4);
    date_part VARCHAR(6);
    sequence_num INTEGER;
    new_code VARCHAR(20);
BEGIN
    -- 遍历所有没有编码的已发布题目
    FOR rec IN
        SELECT qb.id, qd.subject, qb.published_at
        FROM question_bank qb
        JOIN question_drafts qd ON qb.draft_id = qd.id
        WHERE qb.status = 'published'
          AND (qb.question_code IS NULL OR qb.question_code = '')
        ORDER BY qb.published_at ASC
    LOOP
        -- 获取科目代码
        CASE rec.subject
            WHEN '数学' THEN subject_code := 'MATH';
            WHEN '物理' THEN subject_code := 'PHYS';
            WHEN '化学' THEN subject_code := 'CHEM';
            WHEN '生物' THEN subject_code := 'BIOL';
            WHEN '计算机' THEN subject_code := 'COMP';
            ELSE subject_code := 'OTHR';
        END CASE;

        -- 获取日期部分 (YYMMDD)
        date_part := TO_CHAR(COALESCE(rec.published_at, CURRENT_TIMESTAMP), 'YYMMDD');

        -- 获取当天该科目的下一个序号
        SELECT COALESCE(MAX(CAST(SUBSTRING(question_code FROM 11) AS INTEGER)), 0) + 1
        INTO sequence_num
        FROM question_bank
        WHERE question_code LIKE subject_code || date_part || '%';

        -- 组合生成编码
        new_code := subject_code || date_part || LPAD(sequence_num::TEXT, 4, '0');

        -- 更新题目编码
        UPDATE question_bank
        SET question_code = new_code
        WHERE id = rec.id;

        RAISE NOTICE 'Generated code % for question ID %', new_code, rec.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 执行生成函数
SELECT generate_question_code_for_existing();

-- 删除临时函数
DROP FUNCTION IF EXISTS generate_question_code_for_existing();

-- 验证结果
DO $$
DECLARE
    total_published INTEGER;
    with_code INTEGER;
    without_code INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_published
    FROM question_bank WHERE status = 'published';

    SELECT COUNT(*) INTO with_code
    FROM question_bank WHERE status = 'published' AND question_code IS NOT NULL AND question_code != '';

    SELECT COUNT(*) INTO without_code
    FROM question_bank WHERE status = 'published' AND (question_code IS NULL OR question_code = '');

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Question Code Generation Summary:';
    RAISE NOTICE '  Total published questions: %', total_published;
    RAISE NOTICE '  Questions with code: %', with_code;
    RAISE NOTICE '  Questions without code: %', without_code;
    RAISE NOTICE '========================================';
END $$;

-- 记录迁移
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'schema_migrations'
  ) THEN
    CREATE TABLE schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  END IF;

  INSERT INTO schema_migrations (version) VALUES ('028_generate_question_codes')
  ON CONFLICT (version) DO NOTHING;
END $$;
