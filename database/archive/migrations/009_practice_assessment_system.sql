-- ======================================================================
-- Practice and Assessment System Enhancement Migration
-- Version: 1.0
-- Date: 2025-10-30
-- Description: Add grading status fields to support practice/assessment workflow
-- ======================================================================

-- IMPORTANT: Backup your database before running this migration!
-- Command: pg_dump -U postgres guiyang_oj > backup_before_practice_assessment_$(date +%Y%m%d_%H%M%S).sql

BEGIN;

-- ======================================================================
-- STEP 0: Fix answers table foreign key to reference question_bank
-- ======================================================================
-- The answers table should reference question_bank (not questions table)

-- Drop the old foreign key constraint if it exists
ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_question_id_fkey;

-- Add new foreign key constraint referencing question_bank
ALTER TABLE answers ADD CONSTRAINT answers_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES question_bank(id);

COMMENT ON CONSTRAINT answers_question_id_fkey ON answers IS 'Foreign key to question_bank table';

-- ======================================================================
-- STEP 1: Add grading_status to student_activities table
-- ======================================================================
-- Add grading_status column to track overall grading progress
ALTER TABLE student_activities
ADD COLUMN IF NOT EXISTS grading_status VARCHAR(20) DEFAULT 'pending'
  CHECK (grading_status IN ('pending', 'auto_graded', 'partial_graded', 'completed'));

COMMENT ON COLUMN student_activities.grading_status IS '评卷状态: pending-待评卷, auto_graded-自动评卷完成, partial_graded-部分评卷, completed-全部完成';

-- Update existing records
-- If status is 'submitted' or 'graded', set grading_status accordingly
UPDATE student_activities
SET grading_status = CASE
  WHEN status = 'graded' THEN 'completed'
  WHEN status = 'submitted' THEN 'pending'
  ELSE 'pending'
END
WHERE grading_status IS NULL;

-- ======================================================================
-- STEP 2: Add grading fields to answers table
-- ======================================================================
-- Add grading_status column to track individual answer grading
ALTER TABLE answers
ADD COLUMN IF NOT EXISTS grading_status VARCHAR(20) DEFAULT 'pending'
  CHECK (grading_status IN ('pending', 'auto_graded', 'manual_graded'));

COMMENT ON COLUMN answers.grading_status IS '该题评卷状态: pending-待评卷, auto_graded-自动评卷, manual_graded-人工评卷';

-- Add feedback column for teacher comments
ALTER TABLE answers
ADD COLUMN IF NOT EXISTS feedback TEXT;

COMMENT ON COLUMN answers.feedback IS '评卷批注和反馈';

-- Add auto_score column to store auto-grading result
ALTER TABLE answers
ADD COLUMN IF NOT EXISTS auto_score DECIMAL(5,2);

COMMENT ON COLUMN answers.auto_score IS '自动判题得分';

-- Add manual_score column to store manual grading result
ALTER TABLE answers
ADD COLUMN IF NOT EXISTS manual_score DECIMAL(5,2);

COMMENT ON COLUMN answers.manual_score IS '人工评分';

-- Update existing records
-- If is_correct is not null, it means auto-graded
UPDATE answers
SET grading_status = 'auto_graded',
    auto_score = score
WHERE is_correct IS NOT NULL AND grading_status IS NULL;

-- If graded_by is not null, it means manually graded
UPDATE answers
SET grading_status = 'manual_graded',
    manual_score = score
WHERE graded_by IS NOT NULL AND grading_status IS NULL;

-- ======================================================================
-- STEP 3: Create indexes for performance optimization
-- ======================================================================
-- Index for finding pending grading tasks
CREATE INDEX IF NOT EXISTS idx_student_activities_grading_status
ON student_activities(grading_status, activity_id)
WHERE grading_status IN ('pending', 'partial_graded');

-- Index for finding answers needing manual grading
CREATE INDEX IF NOT EXISTS idx_answers_grading_status
ON answers(grading_status, student_exam_id)
WHERE grading_status = 'pending';

-- Index for teacher grading queries
CREATE INDEX IF NOT EXISTS idx_answers_graded_by
ON answers(graded_by, graded_at)
WHERE graded_by IS NOT NULL;

-- ======================================================================
-- STEP 4: Update status constraints if needed
-- ======================================================================
-- Ensure status includes all required values
-- The constraint already exists from previous migrations

-- ======================================================================
-- STEP 5: Create helper views for grading statistics
-- ======================================================================
-- View for activity grading statistics
CREATE OR REPLACE VIEW activity_grading_stats AS
SELECT
  a.id AS activity_id,
  a.title,
  a.type,
  COUNT(sa.id) AS total_submissions,
  COUNT(CASE WHEN sa.grading_status = 'pending' THEN 1 END) AS pending_count,
  COUNT(CASE WHEN sa.grading_status = 'auto_graded' THEN 1 END) AS auto_graded_count,
  COUNT(CASE WHEN sa.grading_status = 'partial_graded' THEN 1 END) AS partial_graded_count,
  COUNT(CASE WHEN sa.grading_status = 'completed' THEN 1 END) AS completed_count,
  ROUND(AVG(CASE WHEN sa.score IS NOT NULL THEN sa.score END), 2) AS avg_score,
  MAX(sa.score) AS max_score,
  MIN(sa.score) AS min_score
FROM activities a
LEFT JOIN student_activities sa ON a.id = sa.activity_id AND sa.status IN ('submitted', 'graded')
GROUP BY a.id, a.title, a.type;

COMMENT ON VIEW activity_grading_stats IS '活动评卷统计视图';

-- View for teacher grading workload
CREATE OR REPLACE VIEW teacher_grading_workload AS
SELECT
  a.id AS activity_id,
  a.title,
  a.created_by AS teacher_id,
  u.real_name AS teacher_name,
  COUNT(DISTINCT sa.id) AS total_submissions,
  COUNT(DISTINCT CASE WHEN sa.grading_status IN ('pending', 'partial_graded') THEN sa.id END) AS pending_submissions,
  COUNT(ans.id) AS total_answers_to_grade,
  COUNT(CASE WHEN ans.grading_status = 'pending' THEN 1 END) AS pending_answers
FROM activities a
JOIN users u ON a.created_by = u.id
LEFT JOIN student_activities sa ON a.id = sa.activity_id AND sa.status IN ('submitted', 'graded')
LEFT JOIN answers ans ON sa.id = ans.student_exam_id AND ans.grading_status = 'pending'
WHERE a.status = 'published'
GROUP BY a.id, a.title, a.created_by, u.real_name;

COMMENT ON VIEW teacher_grading_workload IS '教师评卷工作量统计视图';

-- ======================================================================
-- STEP 6: Add triggers for automatic grading_status updates
-- ======================================================================
-- Function to update student_activities grading_status based on answers
CREATE OR REPLACE FUNCTION update_student_activity_grading_status()
RETURNS TRIGGER AS $$
DECLARE
  pending_count INTEGER;
  total_count INTEGER;
  auto_graded_count INTEGER;
BEGIN
  -- Count answers for this student_activities
  SELECT
    COUNT(*),
    COUNT(CASE WHEN grading_status = 'pending' THEN 1 END),
    COUNT(CASE WHEN grading_status = 'auto_graded' THEN 1 END)
  INTO total_count, pending_count, auto_graded_count
  FROM answers
  WHERE student_exam_id = NEW.student_exam_id;

  -- Update student_activities grading_status
  IF pending_count = 0 THEN
    -- All answers graded
    UPDATE student_activities
    SET grading_status = 'completed'
    WHERE id = NEW.student_exam_id;
  ELSIF pending_count < total_count THEN
    -- Some answers graded
    UPDATE student_activities
    SET grading_status = 'partial_graded'
    WHERE id = NEW.student_exam_id;
  ELSIF auto_graded_count = total_count THEN
    -- All answers auto-graded
    UPDATE student_activities
    SET grading_status = 'auto_graded'
    WHERE id = NEW.student_exam_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update student_activities when answer is graded
DROP TRIGGER IF EXISTS trigger_update_grading_status ON answers;
CREATE TRIGGER trigger_update_grading_status
AFTER INSERT OR UPDATE OF grading_status, score ON answers
FOR EACH ROW
EXECUTE FUNCTION update_student_activity_grading_status();

COMMENT ON FUNCTION update_student_activity_grading_status() IS '自动更新学生活动的评卷状态';

-- ======================================================================
-- STEP 7: Validation and verification
-- ======================================================================
-- Verify the migration was successful
DO $$
BEGIN
  -- Check if grading_status column exists in student_activities
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_activities' AND column_name = 'grading_status'
  ) THEN
    RAISE EXCEPTION 'Migration failed: grading_status column not added to student_activities';
  END IF;

  -- Check if grading_status column exists in answers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'answers' AND column_name = 'grading_status'
  ) THEN
    RAISE EXCEPTION 'Migration failed: grading_status column not added to answers';
  END IF;

  -- Check if feedback column exists in answers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'answers' AND column_name = 'feedback'
  ) THEN
    RAISE EXCEPTION 'Migration failed: feedback column not added to answers';
  END IF;

  RAISE NOTICE 'Migration successful: Practice and Assessment System fields added';
END $$;

COMMIT;

-- ======================================================================
-- ROLLBACK SCRIPT (for reference, do not execute unless needed)
-- ======================================================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS trigger_update_grading_status ON answers;
-- DROP FUNCTION IF EXISTS update_student_activity_grading_status();
-- DROP VIEW IF EXISTS teacher_grading_workload;
-- DROP VIEW IF EXISTS activity_grading_stats;
-- DROP INDEX IF EXISTS idx_answers_graded_by;
-- DROP INDEX IF EXISTS idx_answers_grading_status;
-- DROP INDEX IF EXISTS idx_student_activities_grading_status;
-- ALTER TABLE answers DROP COLUMN IF EXISTS manual_score;
-- ALTER TABLE answers DROP COLUMN IF EXISTS auto_score;
-- ALTER TABLE answers DROP COLUMN IF EXISTS feedback;
-- ALTER TABLE answers DROP COLUMN IF EXISTS grading_status;
-- ALTER TABLE student_activities DROP COLUMN IF EXISTS grading_status;
-- COMMIT;
