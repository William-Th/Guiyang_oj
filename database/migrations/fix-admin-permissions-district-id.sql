-- Migration: Fix NULL district_id in admin_permissions table
-- Date: 2025-11-22
-- Author: Claude
-- Description: Update all admin_permissions records with NULL district_id
--              to use their school's district_id. This ensures school admins
--              can properly access district-level features like publishing
--              district-level questions.

-- Check affected records before update
SELECT
  COUNT(*) as affected_records,
  'Before update: Records with NULL district_id' as description
FROM admin_permissions
WHERE district_id IS NULL AND school_id IS NOT NULL;

-- Update NULL district_id values with school's district_id
UPDATE admin_permissions ap
SET district_id = s.district_id
FROM schools s
WHERE ap.school_id = s.id
  AND ap.district_id IS NULL
  AND s.district_id IS NOT NULL;

-- Verify the fix
SELECT
  COUNT(*) as remaining_null_records,
  'After update: Records still with NULL district_id' as description
FROM admin_permissions
WHERE district_id IS NULL AND school_id IS NOT NULL;

-- Show updated records
SELECT
  ap.id as permission_id,
  u.username,
  u.role,
  s.name as school_name,
  ap.district_id as updated_district_id,
  d.name as district_name,
  d.code as district_code
FROM admin_permissions ap
LEFT JOIN users u ON ap.user_id = u.id
LEFT JOIN schools s ON ap.school_id = s.id
LEFT JOIN districts d ON ap.district_id = d.id
WHERE ap.school_id IS NOT NULL
ORDER BY ap.district_id, ap.id
LIMIT 50;
