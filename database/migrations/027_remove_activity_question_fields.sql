-- Migration: 027_remove_activity_question_fields.sql
-- Description: 移除 activity_questions 表中的 is_required 和 section 字段
-- Date: 2025-11-30
-- Reason: 这两个字段不再使用，组卷功能已简化

-- 移除 section 相关索引
DROP INDEX IF EXISTS idx_activity_questions_activity_section;

-- 移除 is_required 字段
ALTER TABLE activity_questions DROP COLUMN IF EXISTS is_required;

-- 移除 section 字段
ALTER TABLE activity_questions DROP COLUMN IF EXISTS section;

-- 更新 get_activity_paper 函数 (移除 is_required 和 section 返回值)
CREATE OR REPLACE FUNCTION public.get_activity_paper(p_activity_id integer)
RETURNS TABLE(
  question_id integer,
  order_index integer,
  score numeric,
  question_code character varying,
  question_type character varying,
  content text,
  options jsonb,
  correct_answer text,
  difficulty character varying,
  subject character varying,
  grade character varying,
  knowledge_points text[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    aq.question_id,
    aq.order_index,
    aq.score,
    qb.question_code,
    qb.type as question_type,
    qb.content,
    qb.options,
    qb.correct_answer,
    qb.difficulty,
    qb.subject,
    qb.grade,
    qb.knowledge_points
  FROM activity_questions aq
  INNER JOIN question_bank qb ON aq.question_id = qb.id
  WHERE aq.activity_id = p_activity_id
  ORDER BY aq.order_index;
END;
$$;

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

  INSERT INTO schema_migrations (version) VALUES ('027_remove_activity_question_fields')
  ON CONFLICT (version) DO NOTHING;
END $$;
