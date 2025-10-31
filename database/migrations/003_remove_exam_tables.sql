-- Migration: Remove Remaining Exam System Tables
-- Date: 2025-10-23
-- Description: Remove remaining exam_sessions table from the legacy exam system
--
-- Background:
--   - Migration 002 renamed 'exams' to 'activities' and 'student_exams' to 'student_activities'
--   - The exam_sessions table was not migrated and should be removed
--   - Answers table now references student_activities (via student_exam_id -> student_activity_id)
--
-- Affected tables:
--   - exam_sessions: Exam session tracking (no longer used by activity system)
--
-- Rollback: To restore exam_sessions, use the original schema.sql
--
-- IMPORTANT: Backup your database before running this migration!
-- Run: docker exec guiyang_oj_postgres pg_dump -U postgres guiyang_oj > backup_before_exam_removal.sql

BEGIN;

-- Drop exam_sessions table (no longer needed in activity system)
-- The activity system doesn't use the concept of exam sessions
DROP TABLE IF EXISTS exam_sessions CASCADE;

-- Note: The following tables were already migrated in 002_activity_system_migration.sql:
--   - exams -> activities (RENAMED)
--   - student_exams -> student_activities (RENAMED)
-- These tables should NOT be dropped as they are now part of the activity system.

COMMIT;

-- Verification queries (run after migration to verify):
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%exam%';
-- Should return no results

-- Migration completed successfully
-- Next steps:
-- 1. Rebuild backend: docker-compose up --build -d backend
-- 2. Rebuild frontend: docker-compose up --build -d frontend
-- 3. Verify activities system works correctly
