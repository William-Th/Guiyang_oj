-- 添加题目编码功能
-- 创建时间: 2025-01-20
-- 说明: 为question_bank表添加唯一的题目编码字段

-- 1. 添加题目编码字段
ALTER TABLE question_bank
ADD COLUMN IF NOT EXISTS question_code VARCHAR(20) UNIQUE;

-- 2. 创建题目编码索引
CREATE INDEX IF NOT EXISTS idx_question_bank_code ON question_bank(question_code);

-- 3. 添加注释
COMMENT ON COLUMN question_bank.question_code IS '题目唯一编码，格式：科目代码+年月日+序号，如MATH250120001';

-- 4. 为现有题目生成编码的函数
CREATE OR REPLACE FUNCTION generate_question_code(
  p_subject VARCHAR,
  p_created_at TIMESTAMP
) RETURNS VARCHAR AS $$
DECLARE
  v_subject_code VARCHAR(4);
  v_date_part VARCHAR(6);
  v_sequence INT;
  v_code VARCHAR(20);
BEGIN
  -- 获取科目代码
  CASE p_subject
    WHEN '数学' THEN v_subject_code := 'MATH';
    WHEN '物理' THEN v_subject_code := 'PHYS';
    WHEN '化学' THEN v_subject_code := 'CHEM';
    WHEN '生物' THEN v_subject_code := 'BIOL';
    WHEN '计算机' THEN v_subject_code := 'COMP';
    ELSE v_subject_code := 'OTHR'; -- 其他科目
  END CASE;

  -- 获取日期部分 (YYMMDD)
  v_date_part := TO_CHAR(p_created_at, 'YYMMDD');

  -- 获取当天该科目的序号
  SELECT COALESCE(MAX(CAST(SUBSTRING(question_code FROM 11) AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM question_bank
  WHERE question_code LIKE v_subject_code || v_date_part || '%';

  -- 组合生成编码
  v_code := v_subject_code || v_date_part || LPAD(v_sequence::TEXT, 4, '0');

  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- 5. 为现有题目批量生成编码
DO $$
DECLARE
  v_question RECORD;
  v_code VARCHAR(20);
BEGIN
  FOR v_question IN
    SELECT id, subject, created_at
    FROM question_bank
    WHERE question_code IS NULL
    ORDER BY created_at, id
  LOOP
    v_code := generate_question_code(v_question.subject, v_question.created_at);

    UPDATE question_bank
    SET question_code = v_code
    WHERE id = v_question.id;
  END LOOP;
END $$;

-- 6. 创建触发器函数：在插入新题目时自动生成编码
CREATE OR REPLACE FUNCTION auto_generate_question_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.question_code IS NULL THEN
    NEW.question_code := generate_question_code(NEW.subject, NEW.created_at);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建触发器
DROP TRIGGER IF EXISTS trigger_auto_generate_question_code ON question_bank;
CREATE TRIGGER trigger_auto_generate_question_code
  BEFORE INSERT ON question_bank
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_question_code();

-- 8. 验证：查看生成的编码示例
SELECT
  id,
  question_code,
  subject,
  type,
  LEFT(content, 50) as content_preview,
  created_at
FROM question_bank
ORDER BY created_at DESC
LIMIT 10;
