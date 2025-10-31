# Migration 004: Practice Activity Time Limit Types

**Date**: 2025-10-25
**Author**: System
**Type**: Feature Enhancement
**Status**: ✅ Completed

## Overview

This migration adds support for three distinct time limit types for practice activities, replacing the previous single-mode time control system.

## Time Limit Types

### 1. **unlimited** (无时间限制)
- Students can start anytime
- No time restriction on completion
- No deadline enforcement
- **Fields**: All time fields must be NULL
  - `start_time = NULL`
  - `end_time = NULL`
  - `duration = NULL`

### 2. **scheduled** (固定时间段)
- Students can only participate during a specific time window
- Activity has fixed start and end times
- Students can submit early before end_time
- Auto-submit when end_time is reached
- **Fields**:
  - `start_time` - Activity start time (required)
  - `end_time` - Activity end time (required)
  - `duration = NULL` (must be NULL)

### 3. **timed** (限时作答)
- Timer starts when student begins the activity
- Fixed duration from start (e.g., 30 minutes)
- Auto-submit when time expires
- No fixed time window - can start anytime
- **Fields**:
  - `duration` - Time limit in minutes (required)
  - `start_time = NULL` (must be NULL)
  - `end_time = NULL` (must be NULL)

## Database Changes

### Table: `activities`

#### New Column
```sql
time_limit_type VARCHAR(20) NOT NULL DEFAULT 'unlimited'
  CHECK (time_limit_type IN ('unlimited', 'scheduled', 'timed'))
```

#### New Constraints
```sql
-- Unlimited type: no time fields
check_unlimited_no_time
  CHECK (
    (time_limit_type = 'unlimited' AND start_time IS NULL AND end_time IS NULL AND duration IS NULL)
    OR time_limit_type != 'unlimited'
  )

-- Scheduled type: must have time range, no duration
check_scheduled_time_range
  CHECK (
    (time_limit_type = 'scheduled' AND start_time IS NOT NULL AND end_time IS NOT NULL AND duration IS NULL AND end_time > start_time)
    OR time_limit_type != 'scheduled'
  )

-- Timed type: must have duration, no time range
check_timed_duration
  CHECK (
    (time_limit_type = 'timed' AND duration IS NOT NULL AND duration > 0 AND start_time IS NULL AND end_time IS NULL)
    OR time_limit_type != 'timed'
  )
```

#### New Index
```sql
idx_activities_time_limit_type ON activities(time_limit_type)
```

#### Validation Trigger
```sql
trigger_validate_activity_time_limit
  - Fires BEFORE INSERT OR UPDATE
  - Validates time_limit_type configuration
  - Raises exceptions for invalid configurations
```

### Table: `student_activities`

#### New Columns
```sql
started_at TIMESTAMP
  -- Records when student starts the activity (for timed type)

time_limit_deadline TIMESTAMP
  -- Calculated deadline for auto-submit
  -- For scheduled: same as activity.end_time
  -- For timed: calculated as started_at + duration
```

#### New Indexes
```sql
idx_student_activities_deadline ON student_activities(time_limit_deadline)
  WHERE status = 'in_progress'

idx_student_activities_auto_submit ON student_activities(status, time_limit_deadline)
  WHERE status = 'in_progress' AND time_limit_deadline IS NOT NULL
```

## Data Migration

### Existing Data Handling
All existing activities (66 records) were migrated to `time_limit_type = 'unlimited'` with all time fields cleared:

```sql
UPDATE 66 rows
- Set time_limit_type = 'unlimited'
- Cleared start_time, end_time, duration to NULL
```

### Migration Logic
```sql
-- Priority: start_time/end_time > duration > unlimited
CASE
  WHEN start_time IS NOT NULL AND end_time IS NOT NULL THEN 'scheduled'
  WHEN duration IS NOT NULL AND duration > 0 THEN 'timed'
  ELSE 'unlimited'
END
```

## Verification Results

✅ All constraints created successfully
✅ All indexes created successfully
✅ Validation trigger active
✅ Data integrity verified:
- OK: All unlimited activities have no time fields
- OK: All scheduled activities have valid fields
- OK: All timed activities have valid fields

## Files

- `database/migrations/004_practice_time_limit_types.sql` - Initial migration
- `database/migrations/004_fix_time_limit_data_v2.sql` - Data fix script
- `database/backup_before_time_limit_migration_20251025_213139.sql` - Backup

## Next Steps

- [ ] Backend API implementation (Phase 2)
- [ ] Activity Model validation logic
- [ ] POST/PUT endpoints update
- [ ] Start activity endpoint implementation
- [ ] Auto-submit cron job

## Usage Examples

### Creating Activities

#### Unlimited Activity
```sql
INSERT INTO activities (title, subject, grade, type, time_limit_type)
VALUES ('自由练习', '数学', '三年级', 'practice', 'unlimited');
-- start_time, end_time, duration are all NULL
```

#### Scheduled Activity
```sql
INSERT INTO activities (
  title, subject, grade, type, time_limit_type,
  start_time, end_time
)
VALUES (
  '期中考试', '数学', '三年级', 'practice', 'scheduled',
  '2025-03-15 09:00:00', '2025-03-15 11:00:00'
);
-- duration must be NULL
```

#### Timed Activity
```sql
INSERT INTO activities (
  title, subject, grade, type, time_limit_type,
  duration
)
VALUES (
  '限时练习', '数学', '三年级', 'practice', 'timed',
  30  -- 30 minutes
);
-- start_time and end_time must be NULL
```

### Starting Activities

#### Starting a Timed Activity
```sql
-- When student starts a timed activity
UPDATE student_activities
SET
  started_at = NOW(),
  time_limit_deadline = NOW() + (duration * INTERVAL '1 minute'),
  status = 'in_progress'
WHERE id = <student_activity_id>;
```

#### Starting a Scheduled Activity
```sql
-- When student starts a scheduled activity
UPDATE student_activities
SET
  time_limit_deadline = (SELECT end_time FROM activities WHERE id = activity_id),
  status = 'in_progress'
WHERE id = <student_activity_id>;
```

## Rollback

If rollback is needed, run:
```sql
DROP TRIGGER IF EXISTS trigger_validate_activity_time_limit ON activities;
DROP FUNCTION IF EXISTS validate_activity_time_limit();
DROP INDEX IF EXISTS idx_student_activities_auto_submit;
DROP INDEX IF EXISTS idx_student_activities_deadline;
DROP INDEX IF EXISTS idx_activities_time_limit_type;
ALTER TABLE student_activities DROP COLUMN IF EXISTS time_limit_deadline;
ALTER TABLE student_activities DROP COLUMN IF EXISTS started_at;
ALTER TABLE activities DROP CONSTRAINT IF EXISTS check_timed_duration;
ALTER TABLE activities DROP CONSTRAINT IF EXISTS check_scheduled_time_range;
ALTER TABLE activities DROP CONSTRAINT IF EXISTS check_unlimited_no_time;
ALTER TABLE activities DROP COLUMN IF EXISTS time_limit_type;
```

## References

- Design Document: `documents/PRACTICE_TIME_LIMIT_DESIGN.md`
- Work Plan: `documents/PRACTICE_TIME_LIMIT_WORK_PLAN.md`
- Development Status: `documents/DEVELOPMENT_STATUS.md` (Section 7.2)
