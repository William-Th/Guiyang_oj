-- Fix migration 004: Correct time_limit_type data
-- Date: 2025-10-25
-- Purpose: Fix existing activities data to match time_limit_type constraints

-- ============================================================
-- STEP 1: Update time_limit_type based on existing data
-- ============================================================

-- First, identify what type each activity should be:
-- Priority: start_time/end_time > duration > unlimited
-- If has both start_time and end_time -> scheduled
-- Else if has duration only -> timed
-- Else -> unlimited

UPDATE activities
SET time_limit_type =
  CASE
    WHEN start_time IS NOT NULL AND end_time IS NOT NULL THEN 'scheduled'
    WHEN duration IS NOT NULL AND duration > 0 AND start_time IS NULL AND end_time IS NULL THEN 'timed'
    ELSE 'unlimited'
  END;

-- ============================================================
-- STEP 2: Clean up conflicting fields
-- ============================================================

-- For 'scheduled' type: clear duration (they can't have both)
UPDATE activities
SET duration = NULL
WHERE time_limit_type = 'scheduled' AND duration IS NOT NULL;

-- For 'timed' type: clear start_time and end_time
UPDATE activities
SET start_time = NULL, end_time = NULL
WHERE time_limit_type = 'timed' AND (start_time IS NOT NULL OR end_time IS NOT NULL);

-- For 'unlimited' type: clear all time fields
UPDATE activities
SET start_time = NULL, end_time = NULL, duration = NULL
WHERE time_limit_type = 'unlimited'
  AND (start_time IS NOT NULL OR end_time IS NOT NULL OR duration IS NOT NULL);

-- ============================================================
-- STEP 3: Add missing constraint
-- ============================================================

-- Add the check_unlimited_no_time constraint (was missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'check_unlimited_no_time'
  ) THEN
    ALTER TABLE activities
    ADD CONSTRAINT check_unlimited_no_time
    CHECK (
      (time_limit_type = 'unlimited' AND start_time IS NULL AND end_time IS NULL AND duration IS NULL)
      OR time_limit_type != 'unlimited'
    );
  END IF;
END $$;

-- ============================================================
-- STEP 4: Verify data integrity
-- ============================================================

-- This query should return 0 rows (no violations)
-- If it returns any rows, there are still data issues

DO $$
DECLARE
  violation_count INTEGER;
BEGIN
  -- Check for unlimited violations
  SELECT COUNT(*) INTO violation_count
  FROM activities
  WHERE time_limit_type = 'unlimited'
    AND (start_time IS NOT NULL OR end_time IS NOT NULL OR duration IS NOT NULL);

  IF violation_count > 0 THEN
    RAISE NOTICE 'WARNING: % activities with unlimited type have time fields', violation_count;
  END IF;

  -- Check for scheduled violations
  SELECT COUNT(*) INTO violation_count
  FROM activities
  WHERE time_limit_type = 'scheduled'
    AND (start_time IS NULL OR end_time IS NULL OR duration IS NOT NULL);

  IF violation_count > 0 THEN
    RAISE NOTICE 'WARNING: % activities with scheduled type have invalid fields', violation_count;
  END IF;

  -- Check for timed violations
  SELECT COUNT(*) INTO violation_count
  FROM activities
  WHERE time_limit_type = 'timed'
    AND (duration IS NULL OR start_time IS NOT NULL OR end_time IS NOT NULL);

  IF violation_count > 0 THEN
    RAISE NOTICE 'WARNING: % activities with timed type have invalid fields', violation_count;
  END IF;

  -- Success message
  RAISE NOTICE 'Data integrity verification completed';
END $$;

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================

-- Show distribution of time_limit_type
-- SELECT time_limit_type, COUNT(*) as count FROM activities GROUP BY time_limit_type ORDER BY time_limit_type;

-- Show sample data
-- SELECT id, SUBSTRING(title, 1, 40) as title,
--        time_limit_type,
--        start_time IS NOT NULL as has_start,
--        end_time IS NOT NULL as has_end,
--        duration
-- FROM activities
-- ORDER BY time_limit_type, id
-- LIMIT 10;
