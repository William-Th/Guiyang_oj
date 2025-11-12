-- 为题库添加能力和知识点字段
-- Add abilities and knowledge_points fields to question_bank table

-- 添加 abilities 字段 (文本数组，存储能力ID列表)
ALTER TABLE question_bank
ADD COLUMN IF NOT EXISTS abilities TEXT[] DEFAULT '{}';

-- 添加 knowledge_points 字段 (文本数组，存储知识点ID列表)
ALTER TABLE question_bank
ADD COLUMN IF NOT EXISTS knowledge_points TEXT[] DEFAULT '{}';

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_question_bank_abilities ON question_bank USING GIN (abilities);
CREATE INDEX IF NOT EXISTS idx_question_bank_knowledge_points ON question_bank USING GIN (knowledge_points);

-- 添加注释
COMMENT ON COLUMN question_bank.abilities IS '题目考察的能力列表（如抽象思维、计算思维等），存储能力ID数组';
COMMENT ON COLUMN question_bank.knowledge_points IS '题目涉及的知识点列表，存储知识点ID数组';
