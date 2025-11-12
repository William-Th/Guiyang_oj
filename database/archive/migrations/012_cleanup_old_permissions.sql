-- Migration: 012_cleanup_old_permissions.sql
-- Purpose: Clean up deprecated question_bank_review permissions
-- Date: 2025-11-05
-- Description:
--   The old 'question_bank_review' permission type has been deprecated
--   and replaced with more granular permission types:
--   - assessment_review: For assessment question bank review
--   - practice_municipal_review: For municipal-level practice question bank review
--   - practice_district_review: For district-level practice question bank review
--
-- Current State (before cleanup):
--   - 3 active question_bank_review permissions for users 1, 9, 10
--   - These permissions are no longer used in the system
--
-- Action:
--   1. Disable (soft delete) these deprecated permissions
--   2. Notify affected users to request new granular permissions if needed
--
-- Note: This is a soft delete (is_active = false) rather than hard delete
--       to maintain historical audit records.

BEGIN;

-- Report current state
DO $$
DECLARE
    v_count INTEGER;
    v_active_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM teacher_permissions
    WHERE permission_type = 'question_bank_review';

    SELECT COUNT(*) INTO v_active_count
    FROM teacher_permissions
    WHERE permission_type = 'question_bank_review'
      AND is_active = true;

    RAISE NOTICE '=== Migration 012: Cleanup Old Permissions ===';
    RAISE NOTICE 'Total question_bank_review permissions: %', v_count;
    RAISE NOTICE 'Active question_bank_review permissions: %', v_active_count;
END $$;

-- Step 1: Soft delete all question_bank_review permissions
UPDATE teacher_permissions
SET
    is_active = false,
    updated_at = CURRENT_TIMESTAMP,
    notes = COALESCE(notes || ' | ', '') ||
            'Deprecated on 2025-11-05: question_bank_review permission has been replaced with granular permissions (assessment_review, practice_municipal_review, practice_district_review)'
WHERE
    permission_type = 'question_bank_review'
    AND is_active = true;

-- Step 2: Report results
DO $$
DECLARE
    v_disabled_count INTEGER;
    v_remaining_active INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_disabled_count
    FROM teacher_permissions
    WHERE permission_type = 'question_bank_review'
      AND is_active = false
      AND notes LIKE '%Deprecated on 2025-11-05%';

    SELECT COUNT(*) INTO v_remaining_active
    FROM teacher_permissions
    WHERE permission_type = 'question_bank_review'
      AND is_active = true;

    RAISE NOTICE '=== Migration Result ===';
    RAISE NOTICE 'Disabled question_bank_review permissions: %', v_disabled_count;
    RAISE NOTICE 'Remaining active question_bank_review permissions: %', v_remaining_active;
    RAISE NOTICE '';
    RAISE NOTICE 'Note: Affected users (user_id: 1, 9, 10) will need to request';
    RAISE NOTICE 'new granular permissions if they still require review access.';
    RAISE NOTICE '';
    RAISE NOTICE 'Available replacement permissions:';
    RAISE NOTICE '  - assessment_review: For assessment question bank';
    RAISE NOTICE '  - practice_municipal_review: For municipal practice bank';
    RAISE NOTICE '  - practice_district_review: For district practice bank';
END $$;

-- Step 3: Add migration tracking
INSERT INTO schema_migrations (version, description, applied_at)
VALUES ('012', 'Cleanup deprecated question_bank_review permissions', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Rollback script (if needed):
-- This rollback should only be used if the migration was applied incorrectly
-- and needs to be reversed immediately.
--
-- BEGIN;
-- UPDATE teacher_permissions
-- SET
--     is_active = true,
--     updated_at = CURRENT_TIMESTAMP,
--     notes = REPLACE(notes, ' | Deprecated on 2025-11-05: question_bank_review permission has been replaced with granular permissions (assessment_review, practice_municipal_review, practice_district_review)', '')
-- WHERE
--     permission_type = 'question_bank_review'
--     AND notes LIKE '%Deprecated on 2025-11-05%';
-- DELETE FROM schema_migrations WHERE version = '012';
-- COMMIT;
