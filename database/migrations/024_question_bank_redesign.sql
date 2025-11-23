-- ============================================================================
-- Migration 024: Question Bank Redesign
-- ============================================================================
-- Description: 重构题库系统，将草稿和发布分离到两张表
--   - question_drafts: 存储题目草稿（母版），可多次发布
--   - question_bank: 存储发布记录，一个草稿可有多条发布记录
--
-- Author: Claude
-- Date: 2025-11-22
-- Version: 1.0
--
-- Breaking Changes: YES - 数据库结构重大变更
-- Rollback: 见本文件末尾 ROLLBACK 部分
-- ============================================================================

-- ============================================================================
-- PART 1: 创建新表 question_drafts
-- ============================================================================

CREATE TABLE IF NOT EXISTS question_drafts (
    id SERIAL PRIMARY KEY,

    -- 题目基本信息
    type VARCHAR(20) NOT NULL CHECK (type IN ('single', 'multiple', 'blank', 'true_false', 'essay', 'code', 'matching')),
    subject VARCHAR(50) NOT NULL,
    grade VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    options JSONB,
    correct_answer JSONB,
    explanation TEXT,
    image_url VARCHAR(500),

    -- 分类和难度
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    level VARCHAR(10) CHECK (level IN ('L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9')),
    suggested_score INTEGER DEFAULT 5,

    -- 能力和知识点
    abilities TEXT[] DEFAULT '{}',
    knowledge_points TEXT[] DEFAULT '{}',
    tags TEXT[],

    -- 创建者信息
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 统计信息（从发布记录聚合）
    publish_count INTEGER DEFAULT 0,
    total_usage_count INTEGER DEFAULT 0,

    -- 软删除
    is_active BOOLEAN DEFAULT true
);

-- 索引
CREATE INDEX idx_question_drafts_created_by ON question_drafts(created_by);
CREATE INDEX idx_question_drafts_subject ON question_drafts(subject);
CREATE INDEX idx_question_drafts_grade ON question_drafts(grade);
CREATE INDEX idx_question_drafts_level ON question_drafts(level);
CREATE INDEX idx_question_drafts_is_active ON question_drafts(is_active);

-- 注释
COMMENT ON TABLE question_drafts IS '题目草稿表：存储题目的原始内容，可多次发布到不同范围';
COMMENT ON COLUMN question_drafts.publish_count IS '该题目被发布的次数（一个题目可发布到多个范围）';
COMMENT ON COLUMN question_drafts.total_usage_count IS '所有发布版本的累计使用次数';

-- ============================================================================
-- PART 2: 数据迁移 - 将现有数据迁移到 question_drafts
-- ============================================================================

-- 2.1 迁移所有草稿状态的题目
INSERT INTO question_drafts (
    type, subject, grade, content, options, correct_answer,
    difficulty, level, suggested_score, abilities, knowledge_points,
    tags, explanation, image_url, created_by, created_at, updated_at,
    is_active
)
SELECT
    type, subject, grade, content, options, correct_answer,
    difficulty, level, suggested_score, abilities, knowledge_points,
    tags, explanation, image_url, created_by, created_at, updated_at,
    is_active
FROM question_bank
WHERE status = 'draft'
ON CONFLICT DO NOTHING;

-- 2.2 为每个已发布的题目创建草稿（去重）
INSERT INTO question_drafts (
    type, subject, grade, content, options, correct_answer,
    difficulty, level, suggested_score, abilities, knowledge_points,
    tags, explanation, image_url, created_by, created_at, updated_at,
    publish_count, is_active
)
SELECT DISTINCT ON (content, subject, grade, type, created_by)
    type, subject, grade, content, options, correct_answer,
    difficulty, level, suggested_score, abilities, knowledge_points,
    tags, explanation, image_url, created_by, created_at, updated_at,
    1 as publish_count, -- 初始发布计数为1
    is_active
FROM question_bank
WHERE status IN ('published', 'pending_review', 'approved', 'rejected')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 3: 备份旧表并重构 question_bank
-- ============================================================================

-- 3.1 备份旧表
ALTER TABLE question_bank RENAME TO question_bank_old_backup_20251122;

-- 3.2 创建新的 question_bank 表
CREATE TABLE question_bank (
    id SERIAL PRIMARY KEY,

    -- 关联草稿表（核心字段）
    draft_id INTEGER NOT NULL REFERENCES question_drafts(id) ON DELETE CASCADE,

    -- 发布范围信息（核心字段）
    scope VARCHAR(100) NOT NULL,
    district_id INTEGER REFERENCES districts(id),
    school_id INTEGER REFERENCES schools(id),

    -- 审核信息
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'inactive', 'pending_review')),
    reviewer_id INTEGER REFERENCES users(id),
    review_comment TEXT,
    reviewed_at TIMESTAMP,

    -- 发布信息
    published_by INTEGER NOT NULL REFERENCES users(id),
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 题目编码（每个发布版本独立编码）
    question_code VARCHAR(20) UNIQUE,

    -- 使用统计
    usage_count INTEGER DEFAULT 0,
    success_rate NUMERIC(5,2),

    -- 软删除
    is_active BOOLEAN DEFAULT true,

    -- 唯一约束：同一草稿不能在同一范围重复发布
    CONSTRAINT unique_draft_scope UNIQUE (draft_id, scope)
);

-- 索引
CREATE INDEX idx_question_bank_draft_id ON question_bank(draft_id);
CREATE INDEX idx_question_bank_scope ON question_bank(scope);
CREATE INDEX idx_question_bank_district_id ON question_bank(district_id);
CREATE INDEX idx_question_bank_school_id ON question_bank(school_id);
CREATE INDEX idx_question_bank_published_by ON question_bank(published_by);
CREATE INDEX idx_question_bank_status ON question_bank(status);
CREATE INDEX idx_question_bank_is_active ON question_bank(is_active);

-- 注释
COMMENT ON TABLE question_bank IS '题目发布记录表：一个草稿可以有多条发布记录，每条对应一个发布范围';
COMMENT ON COLUMN question_bank.draft_id IS '关联的草稿题目ID';
COMMENT ON COLUMN question_bank.scope IS '发布范围（单值）：assessment, practice_municipal, practice_district_{code}, practice_school_{id}';
COMMENT ON COLUMN question_bank.district_id IS '区级题目时，关联的区ID（从scope解析或手动指定）';
COMMENT ON COLUMN question_bank.school_id IS '校级题目时，关联的学校ID';
COMMENT ON COLUMN question_bank.question_code IS '题目编码，每个发布版本独立生成（格式：科目代码+日期+序号）';

-- ============================================================================
-- PART 4: 数据迁移 - 将已发布题目迁移到新 question_bank
-- ============================================================================

-- 4.1 迁移已发布的题目（匹配草稿）
INSERT INTO question_bank (
    draft_id, scope, district_id, school_id, status, reviewer_id,
    review_comment, reviewed_at, published_by, published_at,
    question_code, usage_count, success_rate, is_active
)
SELECT
    qd.id as draft_id,
    -- 处理 scope：如果是数组取第一个，否则设置默认值
    CASE
        WHEN qb_old.scope IS NOT NULL AND array_length(qb_old.scope, 1) > 0
        THEN qb_old.scope[1]
        ELSE 'practice_school_' || COALESCE(qb_old.created_by::TEXT, '0')
    END as scope,
    NULL as district_id, -- 后续通过触发器自动填充
    NULL as school_id, -- 后续通过触发器自动填充
    CASE
        WHEN qb_old.status = 'published' THEN 'published'
        WHEN qb_old.status = 'pending_review' THEN 'pending_review'
        ELSE 'published'
    END as status,
    qb_old.reviewer_id,
    qb_old.review_comment,
    qb_old.reviewed_at,
    COALESCE(qb_old.published_by, qb_old.created_by) as published_by,
    COALESCE(qb_old.published_at, qb_old.created_at) as published_at,
    qb_old.question_code,
    qb_old.usage_count,
    qb_old.success_rate,
    qb_old.is_active
FROM question_bank_old_backup_20251122 qb_old
INNER JOIN question_drafts qd ON (
    qd.content = qb_old.content AND
    qd.subject = qb_old.subject AND
    qd.grade = qb_old.grade AND
    qd.type = qb_old.type AND
    qd.created_by = qb_old.created_by
)
WHERE qb_old.status IN ('published', 'pending_review', 'approved')
ON CONFLICT (draft_id, scope) DO NOTHING;

-- ============================================================================
-- PART 5: 创建触发器 - 自动从 scope 解析 district_id 和 school_id
-- ============================================================================

CREATE OR REPLACE FUNCTION extract_scope_ids() RETURNS TRIGGER AS $$
BEGIN
    -- 解析 practice_district_{code} 获取 district_id
    IF NEW.scope LIKE 'practice_district_%' THEN
        SELECT id INTO NEW.district_id
        FROM districts
        WHERE code = SUBSTRING(NEW.scope FROM 'practice_district_(.+)');
    END IF;

    -- 解析 practice_school_{id} 获取 school_id
    IF NEW.scope LIKE 'practice_school_%' THEN
        NEW.school_id := CAST(SUBSTRING(NEW.scope FROM 'practice_school_(.+)') AS INTEGER);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_insert_update_question_bank
    BEFORE INSERT OR UPDATE ON question_bank
    FOR EACH ROW
    EXECUTE FUNCTION extract_scope_ids();

-- 更新现有记录的 district_id 和 school_id
UPDATE question_bank SET scope = scope; -- 触发触发器

-- ============================================================================
-- PART 6: 创建视图 - 方便查询带草稿内容的发布记录
-- ============================================================================

CREATE OR REPLACE VIEW question_bank_with_draft AS
SELECT
    qb.id,
    qb.draft_id,
    qb.scope,
    qb.district_id,
    qb.school_id,
    qb.status,
    qb.question_code,
    qb.usage_count,
    qb.success_rate,
    qb.published_by,
    qb.published_at,
    qb.reviewer_id,
    qb.review_comment,
    qb.reviewed_at,
    qb.is_active,

    -- 从草稿表获取题目内容
    qd.type,
    qd.subject,
    qd.grade,
    qd.content,
    qd.options,
    qd.correct_answer,
    qd.explanation,
    qd.image_url,
    qd.difficulty,
    qd.level,
    qd.suggested_score,
    qd.abilities,
    qd.knowledge_points,
    qd.tags,
    qd.created_by,
    qd.created_at,
    qd.updated_at,

    -- 关联用户信息
    u1.real_name as creator_name,
    u2.real_name as publisher_name,
    u3.real_name as reviewer_name,
    d.name as district_name,
    d.code as district_code,
    s.name as school_name

FROM question_bank qb
INNER JOIN question_drafts qd ON qb.draft_id = qd.id
LEFT JOIN users u1 ON qd.created_by = u1.id
LEFT JOIN users u2 ON qb.published_by = u2.id
LEFT JOIN users u3 ON qb.reviewer_id = u3.id
LEFT JOIN districts d ON qb.district_id = d.id
LEFT JOIN schools s ON qb.school_id = s.id
WHERE qb.is_active = true AND qd.is_active = true;

COMMENT ON VIEW question_bank_with_draft IS '题目发布记录带草稿内容视图，用于列表查询';

-- ============================================================================
-- PART 7: 更新 question_code 生成函数（支持新表）
-- ============================================================================

-- 修改 generate_question_code 函数，使其同时支持 question_bank 和 question_drafts
CREATE OR REPLACE FUNCTION generate_question_code(p_subject VARCHAR, p_created_at TIMESTAMP)
RETURNS VARCHAR AS $$
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
    ELSE v_subject_code := 'OTHR';
  END CASE;

  -- 获取日期部分 (YYMMDD)
  v_date_part := TO_CHAR(p_created_at, 'YYMMDD');

  -- 获取当天该科目的序号（从新表查询）
  SELECT COALESCE(MAX(CAST(SUBSTRING(question_code FROM 11) AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM question_bank
  WHERE question_code LIKE v_subject_code || v_date_part || '%';

  -- 组合生成编码
  v_code := v_subject_code || v_date_part || LPAD(v_sequence::TEXT, 4, '0');

  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 8: 数据验证
-- ============================================================================

DO $$
DECLARE
    v_draft_count INTEGER;
    v_bank_count INTEGER;
    v_orphan_count INTEGER;
BEGIN
    -- 验证草稿数量
    SELECT COUNT(*) INTO v_draft_count FROM question_drafts;
    RAISE NOTICE 'question_drafts count: %', v_draft_count;

    -- 验证发布记录数量
    SELECT COUNT(*) INTO v_bank_count FROM question_bank;
    RAISE NOTICE 'question_bank count: %', v_bank_count;

    -- 验证外键关系（不应有孤立记录）
    SELECT COUNT(*) INTO v_orphan_count
    FROM question_bank qb
    LEFT JOIN question_drafts qd ON qb.draft_id = qd.id
    WHERE qd.id IS NULL;

    IF v_orphan_count > 0 THEN
        RAISE WARNING 'Found % orphan records in question_bank!', v_orphan_count;
    ELSE
        RAISE NOTICE 'All question_bank records have valid draft_id references';
    END IF;

    -- 验证district_id和school_id解析
    RAISE NOTICE 'Validating scope parsing...';
    SELECT COUNT(*) INTO v_orphan_count
    FROM question_bank
    WHERE scope LIKE 'practice_district_%' AND district_id IS NULL;

    IF v_orphan_count > 0 THEN
        RAISE WARNING 'Found % district scope records without district_id!', v_orphan_count;
    ELSE
        RAISE NOTICE 'All district scope records have valid district_id';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 9: 清理说明
-- ============================================================================

-- 迁移完成后，可选择性保留或删除备份表
-- 建议：保留备份表至少7天，确认系统运行正常后再删除
-- DROP TABLE IF EXISTS question_bank_old_backup_20251122;

COMMENT ON TABLE question_bank_old_backup_20251122 IS 'BACKUP: 2025-11-22 重构前的 question_bank 表备份，建议保留7天后删除';

-- ============================================================================
-- 迁移完成
-- ============================================================================

RAISE NOTICE '=======================================================';
RAISE NOTICE 'Migration 024 completed successfully!';
RAISE NOTICE 'question_drafts: % records', (SELECT COUNT(*) FROM question_drafts);
RAISE NOTICE 'question_bank: % records', (SELECT COUNT(*) FROM question_bank);
RAISE NOTICE 'Backup table: question_bank_old_backup_20251122';
RAISE NOTICE '=======================================================';

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (仅供参考，请勿直接执行)
-- ============================================================================

/*
-- 如果需要回滚此迁移，执行以下步骤：

-- 1. 删除新表和视图
DROP VIEW IF EXISTS question_bank_with_draft;
DROP TRIGGER IF EXISTS before_insert_update_question_bank ON question_bank;
DROP FUNCTION IF EXISTS extract_scope_ids();
DROP TABLE IF EXISTS question_bank;
DROP TABLE IF EXISTS question_drafts;

-- 2. 恢复旧表
ALTER TABLE question_bank_old_backup_20251122 RENAME TO question_bank;

-- 3. 恢复旧的 generate_question_code 函数（如有需要）
-- (从备份中恢复)

RAISE NOTICE 'Migration 024 rolled back successfully';
*/
