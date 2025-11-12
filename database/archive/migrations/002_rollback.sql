-- ======================================================================
-- Activity System Rollback Script
-- Version: 1.0
-- Date: 2025-10-21
-- Description: Rollback migration from activity system back to exam system
-- ======================================================================

-- IMPORTANT: This rollback script should only be used in emergency situations
-- Ensure you have a recent database backup before proceeding!

BEGIN;

-- ======================================================================
-- STEP 1: Drop views created for backward compatibility
-- ======================================================================
DROP VIEW IF EXISTS exams CASCADE;
DROP VIEW IF EXISTS student_exams CASCADE;

-- ======================================================================
-- STEP 2: Drop new tables created in migration
-- ======================================================================
DROP TABLE IF EXISTS activity_history CASCADE;

-- ======================================================================
-- STEP 3: Rename tables back to original names
-- ======================================================================
ALTER TABLE activities RENAME TO exams;
ALTER TABLE student_activities RENAME TO student_exams;

-- ======================================================================
-- STEP 4: Rename sequences back
-- ======================================================================
ALTER SEQUENCE IF EXISTS activities_id_seq RENAME TO exams_id_seq;
ALTER SEQUENCE IF EXISTS student_activities_id_seq RENAME TO student_exams_id_seq;

-- ======================================================================
-- STEP 5: Drop new indexes
-- ======================================================================
DROP INDEX IF EXISTS idx_activities_type;
DROP INDEX IF EXISTS idx_activities_ability_level;
DROP INDEX IF EXISTS idx_activities_scope;
DROP INDEX IF EXISTS idx_activities_subject;
DROP INDEX IF EXISTS idx_activities_is_official;
DROP INDEX IF EXISTS idx_activities_created_by;
DROP INDEX IF EXISTS idx_activities_status;
DROP INDEX IF EXISTS idx_activities_type_subject;
DROP INDEX IF EXISTS idx_activities_type_ability_level;
DROP INDEX IF EXISTS idx_activities_subject_ability_level;
DROP INDEX IF EXISTS idx_activity_history_activity_id;
DROP INDEX IF EXISTS idx_activity_history_created_at;

-- ======================================================================
-- STEP 6: Rename foreign key columns back
-- ======================================================================
-- In student_exams table
ALTER TABLE student_exams
RENAME COLUMN activity_id TO exam_id;

-- Note: answers table uses student_exam_id, not exam_id/activity_id
-- No changes needed for answers table in rollback

-- ======================================================================
-- STEP 7: Update foreign key constraints
-- ======================================================================
-- student_exams table
ALTER TABLE student_exams
DROP CONSTRAINT IF EXISTS student_activities_activity_id_fkey;

ALTER TABLE student_exams
DROP CONSTRAINT IF EXISTS student_activities_student_id_fkey;

ALTER TABLE student_exams
ADD CONSTRAINT student_exams_exam_id_fkey
FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;

ALTER TABLE student_exams
ADD CONSTRAINT student_exams_student_id_fkey
FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- Note: answers table uses student_exam_id, not exam_id/activity_id
-- No constraint changes needed for answers table

-- ======================================================================
-- STEP 8: Remove new columns added in migration
-- ======================================================================
ALTER TABLE student_exams
DROP COLUMN IF EXISTS attempt_number;

ALTER TABLE student_exams
DROP COLUMN IF EXISTS is_retake;

ALTER TABLE student_exams
DROP COLUMN IF EXISTS previous_attempt_id;

ALTER TABLE exams
DROP COLUMN IF EXISTS type;

ALTER TABLE exams
DROP COLUMN IF EXISTS ability_level;

ALTER TABLE exams
DROP COLUMN IF EXISTS scope;

ALTER TABLE exams
DROP COLUMN IF EXISTS allow_retake;

ALTER TABLE exams
DROP COLUMN IF EXISTS max_attempts;

ALTER TABLE exams
DROP COLUMN IF EXISTS is_official;

ALTER TABLE exams
DROP COLUMN IF EXISTS target_audience;

ALTER TABLE exams
DROP COLUMN IF EXISTS certificate_config;

-- ======================================================================
-- STEP 9: Validation
-- ======================================================================
DO $$
DECLARE
  exam_count INTEGER;
  student_exam_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO exam_count FROM exams;
  SELECT COUNT(*) INTO student_exam_count FROM student_exams;

  RAISE NOTICE 'Rollback completed successfully!';
  RAISE NOTICE 'Total exams: %', exam_count;
  RAISE NOTICE 'Total student exams: %', student_exam_count;
END $$;

COMMIT;

-- ======================================================================
-- Post-rollback verification queries (run separately)
-- ======================================================================
-- SELECT COUNT(*) FROM exams;
-- SELECT COUNT(*) FROM student_exams;
-- \d exams
-- \d student_exams
