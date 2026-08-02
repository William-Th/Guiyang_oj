-- 056: invalidate all active access/refresh tokens after logout or password reset.
-- Existing rows keep version 0 and must sign in again after the application update.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_token_version_non_negative'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_token_version_non_negative
      CHECK (token_version >= 0);
  END IF;
END $$;
