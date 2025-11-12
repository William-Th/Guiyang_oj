-- Migration: 011_populate_reviewer_data.sql
-- Purpose: Initialize reviewer_id for historical questions in question_bank
-- Date: 2025-11-05
-- Description:
--   This migration addresses the issue where many approved/published questions
--   don't have reviewer_id populated due to historical data gaps.
--
-- Current Situation (before migration):
--   - Total active questions: 489
--   - Questions with created_by: 489 (100%)
--   - Questions with reviewer_id: 27 (5.5%)
--   - Breakdown by status:
--     * draft: 114 questions (0 with reviewer) - EXPECTED
--     * pending_review: 23 questions (23 with reviewer) - OK
--     * approved: 80 questions (0 with reviewer) - NEEDS FIX
--     * published: 272 questions (4 with reviewer) - NEEDS FIX
--
-- Strategy:
--   1. Questions with review records in question_reviews table:
--      Use reviewer from question_reviews (already correct)
--   2. Published questions with published_by:
--      Set reviewer_id = published_by (reasonable assumption)
--   3. Historical approved questions without review data:
--      Leave reviewer_id as NULL (no accurate data available)
--
-- Note: Future question approvals will correctly populate reviewer_id
--       through the application code.

BEGIN;

-- Report current state before migration
DO $$
DECLARE
    v_total INTEGER;
    v_with_reviewer INTEGER;
    v_to_update INTEGER;
BEGIN
    -- Count total questions needing review data
    SELECT COUNT(*) INTO v_total
    FROM question_bank
    WHERE is_active = true
      AND status IN ('approved', 'published');

    -- Count questions that already have reviewer
    SELECT COUNT(*) INTO v_with_reviewer
    FROM question_bank
    WHERE is_active = true
      AND status IN ('approved', 'published')
      AND reviewer_id IS NOT NULL;

    -- Count questions that will be updated
    SELECT COUNT(*) INTO v_to_update
    FROM question_bank
    WHERE is_active = true
      AND status = 'published'
      AND reviewer_id IS NULL
      AND published_by IS NOT NULL;

    RAISE NOTICE '=== Migration 011: Populate Reviewer Data ===';
    RAISE NOTICE 'Questions in approved/published status: %', v_total;
    RAISE NOTICE 'Questions with reviewer_id: %', v_with_reviewer;
    RAISE NOTICE 'Questions to be updated (published with published_by): %', v_to_update;
    RAISE NOTICE 'Questions to remain NULL (no historical data): %', v_total - v_with_reviewer - v_to_update;
END $$;

-- Step 1: Update published questions where published_by exists
-- Assumption: The person who published the question also reviewed it
UPDATE question_bank
SET
    reviewer_id = published_by,
    reviewed_at = published_at,
    review_comment = 'Historical data: reviewer populated from published_by during migration 011'
WHERE
    is_active = true
    AND status = 'published'
    AND reviewer_id IS NULL
    AND published_by IS NOT NULL;

-- Step 2: Verify the update
DO $$
DECLARE
    v_updated INTEGER;
    v_remaining_null INTEGER;
BEGIN
    -- Count updated questions
    SELECT COUNT(*) INTO v_updated
    FROM question_bank
    WHERE is_active = true
      AND status IN ('approved', 'published')
      AND reviewer_id IS NOT NULL;

    -- Count questions still without reviewer
    SELECT COUNT(*) INTO v_remaining_null
    FROM question_bank
    WHERE is_active = true
      AND status IN ('approved', 'published')
      AND reviewer_id IS NULL;

    RAISE NOTICE '=== Migration Result ===';
    RAISE NOTICE 'Questions now with reviewer_id: %', v_updated;
    RAISE NOTICE 'Questions still without reviewer_id: %', v_remaining_null;
    RAISE NOTICE '';
    RAISE NOTICE 'Note: Questions without reviewer_id are historical entries';
    RAISE NOTICE 'without accurate review data. Future approvals will be tracked correctly.';
END $$;

-- Step 3: Add migration tracking
INSERT INTO schema_migrations (version, description, applied_at)
VALUES ('011', 'Populate reviewer data for historical questions', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Rollback script (if needed):
-- BEGIN;
-- UPDATE question_bank
-- SET
--     reviewer_id = NULL,
--     reviewed_at = NULL,
--     review_comment = NULL
-- WHERE
--     is_active = true
--     AND status = 'published'
--     AND review_comment = 'Historical data: reviewer populated from published_by during migration 011';
-- DELETE FROM schema_migrations WHERE version = '011';
-- COMMIT;
