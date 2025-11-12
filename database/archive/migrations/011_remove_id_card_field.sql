-- Migration: 011_remove_id_card_field.sql
-- Purpose: Remove id_card (身份证号) field from users table
-- Date: 2025-11-05
-- Author: System
-- Reason:
--   - Privacy compliance: Removing sensitive personal identification data
--   - Simplified user management: Only use phone number for student login
--   - Reduce data exposure risk

-- ============================================================================
-- STEP 1: Drop constraints and indexes related to id_card
-- ============================================================================

-- Drop unique constraint on id_card
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_card_key;

-- Drop index on id_card
DROP INDEX IF EXISTS idx_users_id_card;

-- ============================================================================
-- STEP 2: Remove id_card column from users table
-- ============================================================================

ALTER TABLE users DROP COLUMN IF EXISTS id_card;

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Verify id_card column has been removed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'id_card'
    ) THEN
        RAISE EXCEPTION 'Migration failed: id_card column still exists';
    END IF;

    RAISE NOTICE 'Migration successful: id_card column removed from users table';
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. This migration is irreversible - id_card data will be permanently deleted
-- 2. Affected UI components:
--    - frontend/src/pages/ProfilePage.tsx (remove id_card display)
--    - frontend/src/pages/LoginPage.tsx (change placeholder from "身份证号或手机号" to "手机号")
-- 3. Affected backend:
--    - backend/src/models/User.js (check for id_card references)
-- 4. Student login will use phone number only
