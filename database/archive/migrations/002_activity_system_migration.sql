-- ======================================================================
-- Activity System Migration Script
-- Version: 1.0
-- Date: 2025-10-21
-- Description: Migrates exam system to activity system with assessment/practice types
-- ======================================================================

-- IMPORTANT: Backup your database before running this migration!
-- Command: pg_dump -U postgres guiyang_oj > backup_before_activity_migration_$(date +%Y%m%d_%H%M%S).sql

BEGIN;

-- ======================================================================
-- STEP 1: Add new columns to existing exams table
-- ======================================================================
ALTER TABLE exams
ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'practice'
  CHECK (type IN ('assessment', 'practice'));

ALTER TABLE exams
ADD COLUMN ability_level VARCHAR(10)
  CHECK (ability_level IN ('L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'));

ALTER TABLE exams
ADD COLUMN scope VARCHAR(50)
  CHECK (scope IN ('municipal', 'district', 'base_school', 'municipal_school', 'school', 'class'));

ALTER TABLE exams
ADD COLUMN allow_retake BOOLEAN DEFAULT FALSE;

ALTER TABLE exams
ADD COLUMN max_attempts INTEGER DEFAULT 1
  CHECK (max_attempts > 0);

ALTER TABLE exams
ADD COLUMN is_official BOOLEAN DEFAULT FALSE;

ALTER TABLE exams
ADD COLUMN target_audience JSONB DEFAULT '{"grades": [], "schools": [], "classes": []}';

ALTER TABLE exams
ADD COLUMN certificate_config JSONB DEFAULT '{"enabled": false, "template": null}';

-- ======================================================================
-- STEP 2: Update existing data with default values
-- ======================================================================
-- All existing exams default to 'practice' type
UPDATE exams SET type = 'practice' WHERE type IS NULL;

-- Set is_official based on creator role
UPDATE exams e
SET is_official = true
FROM users u
WHERE e.created_by = u.id
  AND u.role IN ('district_admin', 'base_school_admin', 'municipal_school_admin', 'municipal_admin');

-- Set scope based on creator role
UPDATE exams e
SET scope = CASE
  WHEN u.role = 'municipal_admin' THEN 'municipal'
  WHEN u.role = 'district_admin' THEN 'district'
  WHEN u.role = 'base_school_admin' THEN 'base_school'
  WHEN u.role = 'municipal_school_admin' THEN 'municipal_school'
  WHEN u.role = 'school_admin' THEN 'school'
  WHEN u.role = 'teacher' THEN 'class'
  ELSE 'school'
END
FROM users u
WHERE e.created_by = u.id;

-- ======================================================================
-- STEP 3: Rename tables
-- ======================================================================
ALTER TABLE exams RENAME TO activities;
ALTER TABLE student_exams RENAME TO student_activities;

-- ======================================================================
-- STEP 4: Update foreign key references
-- ======================================================================
-- Rename columns in student_activities table
ALTER TABLE student_activities
RENAME COLUMN exam_id TO activity_id;

-- Update foreign key constraint names
ALTER TABLE student_activities
DROP CONSTRAINT IF EXISTS student_exams_exam_id_fkey;

ALTER TABLE student_activities
ADD CONSTRAINT student_activities_activity_id_fkey
FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE;

ALTER TABLE student_activities
DROP CONSTRAINT IF EXISTS student_exams_student_id_fkey;

ALTER TABLE student_activities
ADD CONSTRAINT student_activities_student_id_fkey
FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- Note: answers table uses student_exam_id, not exam_id
-- No changes needed for answers table in this migration

-- ======================================================================
-- STEP 5: Create indexes for performance
-- ======================================================================
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_ability_level ON activities(ability_level);
CREATE INDEX idx_activities_scope ON activities(scope);
CREATE INDEX idx_activities_subject ON activities(subject);
CREATE INDEX idx_activities_is_official ON activities(is_official);
CREATE INDEX idx_activities_created_by ON activities(created_by);
CREATE INDEX idx_activities_status ON activities(status);

-- Composite indexes for common queries
CREATE INDEX idx_activities_type_subject ON activities(type, subject);
CREATE INDEX idx_activities_type_ability_level ON activities(type, ability_level);
CREATE INDEX idx_activities_subject_ability_level ON activities(subject, ability_level);

-- ======================================================================
-- STEP 6: Add attempt tracking to student_activities
-- ======================================================================
ALTER TABLE student_activities
ADD COLUMN attempt_number INTEGER DEFAULT 1;

ALTER TABLE student_activities
ADD COLUMN is_retake BOOLEAN DEFAULT FALSE;

ALTER TABLE student_activities
ADD COLUMN previous_attempt_id INTEGER REFERENCES student_activities(id);

-- ======================================================================
-- STEP 7: Create activity history table for audit trail
-- ======================================================================
CREATE TABLE IF NOT EXISTS activity_history (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  changed_by INTEGER REFERENCES users(id),
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_history_activity_id ON activity_history(activity_id);
CREATE INDEX idx_activity_history_created_at ON activity_history(created_at DESC);

-- ======================================================================
-- STEP 8: Update sequences
-- ======================================================================
-- Rename sequence if it exists
ALTER SEQUENCE IF EXISTS exams_id_seq RENAME TO activities_id_seq;
ALTER SEQUENCE IF EXISTS student_exams_id_seq RENAME TO student_activities_id_seq;

-- ======================================================================
-- STEP 9: Create views for backward compatibility (optional)
-- ======================================================================
CREATE OR REPLACE VIEW exams AS
SELECT * FROM activities;

CREATE OR REPLACE VIEW student_exams AS
SELECT * FROM student_activities;

-- ======================================================================
-- STEP 10: Add comments for documentation
-- ======================================================================
COMMENT ON TABLE activities IS 'Stores all learning activities including assessments and practice exercises';
COMMENT ON COLUMN activities.type IS 'Activity type: assessment (formal evaluation) or practice (informal exercise)';
COMMENT ON COLUMN activities.ability_level IS 'Target ability level: L1-L7 (basic to excellence)';
COMMENT ON COLUMN activities.scope IS 'Distribution scope: municipal, district, school, or class';
COMMENT ON COLUMN activities.allow_retake IS 'Whether students can retake this activity';
COMMENT ON COLUMN activities.max_attempts IS 'Maximum number of attempts allowed';
COMMENT ON COLUMN activities.is_official IS 'Whether this is an official activity that can issue certificates';
COMMENT ON COLUMN activities.target_audience IS 'JSON specification of target grades, schools, classes';
COMMENT ON COLUMN activities.certificate_config IS 'JSON configuration for certificate generation';

-- ======================================================================
-- STEP 11: Validation queries
-- ======================================================================
-- Verify migration
DO $$
DECLARE
  activity_count INTEGER;
  student_activity_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO activity_count FROM activities;
  SELECT COUNT(*) INTO student_activity_count FROM student_activities;

  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Total activities: %', activity_count;
  RAISE NOTICE 'Total student activities: %', student_activity_count;
END $$;

COMMIT;

-- ======================================================================
-- Post-migration verification queries (run separately)
-- ======================================================================
-- SELECT type, COUNT(*) as count FROM activities GROUP BY type;
-- SELECT ability_level, COUNT(*) as count FROM activities GROUP BY ability_level;
-- SELECT scope, COUNT(*) as count FROM activities GROUP BY scope;
-- SELECT is_official, COUNT(*) as count FROM activities GROUP BY is_official;
