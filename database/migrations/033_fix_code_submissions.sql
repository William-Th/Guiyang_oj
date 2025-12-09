-- Migration 033: Fix code_submissions table constraints
-- Date: 2025-12-09
-- Description: Make student_activity_id nullable for testing and quick-run scenarios

-- Make student_activity_id nullable to allow code testing without a specific activity
ALTER TABLE code_submissions
    ALTER COLUMN student_activity_id DROP NOT NULL;

-- Add comment to clarify the use case
COMMENT ON COLUMN code_submissions.student_activity_id IS 'Optional reference to student_activities.id. NULL for quick-run tests outside of an activity context.';

-- Verify the change
DO $$
BEGIN
    RAISE NOTICE 'Migration 033: student_activity_id is now nullable in code_submissions table';
END $$;
