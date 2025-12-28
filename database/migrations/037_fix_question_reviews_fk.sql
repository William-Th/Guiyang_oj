-- Migration 037: Fix question_reviews foreign key constraint
-- The foreign key is pointing to an old backup table instead of question_bank
-- This fix updates the constraint to reference the correct table

-- Drop the incorrect foreign key constraint
ALTER TABLE question_reviews
DROP CONSTRAINT IF EXISTS question_reviews_question_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE question_reviews
ADD CONSTRAINT question_reviews_question_id_fkey
FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE;

-- Log the fix
DO $$
BEGIN
    RAISE NOTICE 'Migration 037: Fixed question_reviews.question_id foreign key to reference question_bank(id)';
END $$;
