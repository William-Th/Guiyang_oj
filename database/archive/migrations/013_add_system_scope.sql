-- Migration: Add 'system' scope to activities table
-- Date: 2025-11-05
-- Purpose: Support system_admin role with system-wide activity scope
--
-- Related Changes:
-- - backend/src/middleware/activityPermission.js: Added system_admin to PRACTICE_ALLOWED_ROLES
-- - Tests: tests/api/activity-permission-boundaries.test.js
--
-- Reason:
-- The system_admin role (highest administrative level) needs to be able to create
-- both practice and assessment activities with system-wide scope. Previously,
-- the database constraint only allowed: municipal, district, base_school,
-- municipal_school, school, class.

-- Drop existing constraint
ALTER TABLE activities
DROP CONSTRAINT IF EXISTS exams_scope_check;

-- Recreate constraint with 'system' scope added
ALTER TABLE activities
ADD CONSTRAINT exams_scope_check
CHECK (scope IN (
  'system',           -- System-wide scope (highest level)
  'municipal',        -- Municipal/city level
  'district',         -- District level
  'base_school',      -- Base school level
  'municipal_school', -- Municipal school level
  'school',           -- School level
  'class'             -- Class level
));

-- Verification query (should return the new constraint)
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'exams_scope_check';
