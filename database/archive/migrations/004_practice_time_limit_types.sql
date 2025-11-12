-- Migration 004: Practice Activity Time Limit Types
-- Date: 2025-10-25
-- Purpose: Add three types of time limits for practice activities
--   1. unlimited: No time restrictions
--   2. scheduled: Fixed time window (start_time to end_time)
--   3. timed: Duration-based (countdown from start)

-- ============================================================
-- STEP 1: Add time_limit_type field to activities table
-- ============================================================

ALTER TABLE activities
ADD COLUMN time_limit_type VARCHAR(20) NOT NULL DEFAULT 'unlimited'
  CHECK (time_limit_type IN ('unlimited', 'scheduled', 'timed'));

COMMENT ON COLUMN activities.time_limit_type IS '时间限制类型: unlimited(无限制), scheduled(固定时间段), timed(限时作答)';

-- ============================================================
-- STEP 2: Add CHECK constraints for mutual exclusivity
-- ============================================================

-- Constraint: unlimited type cannot have any time fields
ALTER TABLE activities
ADD CONSTRAINT check_unlimited_no_time
CHECK (
  (time_limit_type = 'unlimited' AND start_time IS NULL AND end_time IS NULL AND duration IS NULL)
  OR time_limit_type != 'unlimited'
);

-- Constraint: scheduled type must have time range, no duration
ALTER TABLE activities
ADD CONSTRAINT check_scheduled_time_range
CHECK (
  (time_limit_type = 'scheduled' AND start_time IS NOT NULL AND end_time IS NOT NULL AND duration IS NULL AND end_time > start_time)
  OR time_limit_type != 'scheduled'
);

-- Constraint: timed type must have duration, no time range
ALTER TABLE activities
ADD CONSTRAINT check_timed_duration
CHECK (
  (time_limit_type = 'timed' AND duration IS NOT NULL AND duration > 0 AND start_time IS NULL AND end_time IS NULL)
  OR time_limit_type != 'timed'
);

-- ============================================================
-- STEP 3: Add fields to student_activities table
-- ============================================================

ALTER TABLE student_activities
ADD COLUMN started_at TIMESTAMP;

COMMENT ON COLUMN student_activities.started_at IS '开始作答时间 (用于timed类型计算deadline)';

ALTER TABLE student_activities
ADD COLUMN time_limit_deadline TIMESTAMP;

COMMENT ON COLUMN student_activities.time_limit_deadline IS '时间限制截止时间 (scheduled类型使用activity.end_time, timed类型使用started_at + duration)';

-- ============================================================
-- STEP 4: Add indexes for performance
-- ============================================================

-- Index for filtering activities by time_limit_type
CREATE INDEX idx_activities_time_limit_type ON activities(time_limit_type);

-- Index for finding activities that need auto-submit (only for in_progress status)
CREATE INDEX idx_student_activities_deadline ON student_activities(time_limit_deadline)
WHERE status = 'in_progress';

-- Composite index for cron job query
CREATE INDEX idx_student_activities_auto_submit ON student_activities(status, time_limit_deadline)
WHERE status = 'in_progress' AND time_limit_deadline IS NOT NULL;

-- ============================================================
-- STEP 5: Migrate existing data
-- ============================================================

-- Update existing activities to set time_limit_type based on current fields
-- Logic:
--   - If has start_time and end_time: scheduled
--   - If has duration only: timed (rare case, most existing have no duration)
--   - Otherwise: unlimited

UPDATE activities
SET time_limit_type =
  CASE
    WHEN start_time IS NOT NULL AND end_time IS NOT NULL THEN 'scheduled'
    WHEN duration IS NOT NULL AND duration > 0 THEN 'timed'
    ELSE 'unlimited'
  END
WHERE time_limit_type = 'unlimited'; -- Only update default values

-- For scheduled activities, set time_limit_deadline to end_time for in_progress student_activities
UPDATE student_activities sa
SET time_limit_deadline = a.end_time
FROM activities a
WHERE sa.activity_id = a.id
  AND a.time_limit_type = 'scheduled'
  AND sa.status = 'in_progress'
  AND a.end_time IS NOT NULL;

-- ============================================================
-- STEP 6: Add validation trigger (optional, belt-and-suspenders)
-- ============================================================

-- Function to validate time_limit_type consistency
CREATE OR REPLACE FUNCTION validate_activity_time_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate unlimited type
  IF NEW.time_limit_type = 'unlimited' THEN
    IF NEW.start_time IS NOT NULL OR NEW.end_time IS NOT NULL OR NEW.duration IS NOT NULL THEN
      RAISE EXCEPTION '无时间限制类型不应设置时间字段';
    END IF;
  END IF;

  -- Validate scheduled type
  IF NEW.time_limit_type = 'scheduled' THEN
    IF NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
      RAISE EXCEPTION '固定时间段类型必须设置开始和结束时间';
    END IF;
    IF NEW.duration IS NOT NULL THEN
      RAISE EXCEPTION '固定时间段类型不应设置作答时长';
    END IF;
    IF NEW.end_time <= NEW.start_time THEN
      RAISE EXCEPTION '结束时间必须晚于开始时间';
    END IF;
  END IF;

  -- Validate timed type
  IF NEW.time_limit_type = 'timed' THEN
    IF NEW.duration IS NULL OR NEW.duration <= 0 THEN
      RAISE EXCEPTION '限时作答类型必须设置正确的作答时长（分钟）';
    END IF;
    IF NEW.start_time IS NOT NULL OR NEW.end_time IS NOT NULL THEN
      RAISE EXCEPTION '限时作答类型不应设置固定时间段';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_validate_activity_time_limit ON activities;
CREATE TRIGGER trigger_validate_activity_time_limit
BEFORE INSERT OR UPDATE ON activities
FOR EACH ROW
EXECUTE FUNCTION validate_activity_time_limit();

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check the new column and constraints
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'activities' AND column_name = 'time_limit_type';

-- Check constraint names
-- SELECT constraint_name, constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_name = 'activities' AND constraint_name LIKE 'check_%';

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'activities' OR tablename = 'student_activities';

-- Check data migration results
-- SELECT time_limit_type, COUNT(*) as count
-- FROM activities
-- GROUP BY time_limit_type;

-- ============================================================
-- ROLLBACK SCRIPT (for reference, not executed)
-- ============================================================

-- DROP TRIGGER IF EXISTS trigger_validate_activity_time_limit ON activities;
-- DROP FUNCTION IF EXISTS validate_activity_time_limit();
-- DROP INDEX IF EXISTS idx_student_activities_auto_submit;
-- DROP INDEX IF EXISTS idx_student_activities_deadline;
-- DROP INDEX IF EXISTS idx_activities_time_limit_type;
-- ALTER TABLE student_activities DROP COLUMN IF EXISTS time_limit_deadline;
-- ALTER TABLE student_activities DROP COLUMN IF EXISTS started_at;
-- ALTER TABLE activities DROP CONSTRAINT IF EXISTS check_timed_duration;
-- ALTER TABLE activities DROP CONSTRAINT IF EXISTS check_scheduled_time_range;
-- ALTER TABLE activities DROP CONSTRAINT IF EXISTS check_unlimited_no_time;
-- ALTER TABLE activities DROP COLUMN IF EXISTS time_limit_type;
