-- Migration 032: Update question_bank_with_draft view to include programming question fields
-- Date: 2025-12-08
-- Description: Add code_template, time_limit, memory_limit, judge_mode, special_judge_code,
--              supported_languages fields to the view for programming questions support

-- ============================================================================
-- PART 1: Drop and recreate the view with programming question fields
-- ============================================================================

DROP VIEW IF EXISTS question_bank_with_draft;

CREATE VIEW question_bank_with_draft AS
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

    -- Draft content fields
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

    -- Programming question fields (new)
    qd.code_template,
    qd.time_limit,
    qd.memory_limit,
    qd.judge_mode,
    qd.special_judge_code,
    qd.supported_languages,

    -- User and location info
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

COMMENT ON VIEW question_bank_with_draft IS 'Question bank records with draft content view (includes programming question fields)';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
    v_column_exists BOOLEAN;
BEGIN
    -- Check if code_template column exists in the view
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'question_bank_with_draft'
        AND column_name = 'code_template'
    ) INTO v_column_exists;

    IF v_column_exists THEN
        RAISE NOTICE 'Migration 032 completed successfully: question_bank_with_draft view now includes programming question fields';
    ELSE
        RAISE EXCEPTION 'Migration 032 failed: code_template column not found in view';
    END IF;
END $$;
