-- Migration 057: protect public registration-status lookups with a random code.
-- The API returns the plaintext code once; only its SHA-256 digest is persisted.
BEGIN;

ALTER TABLE public.student_registration_requests
  ADD COLUMN IF NOT EXISTS inquiry_code_hash CHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_registration_inquiry_code_hash
  ON public.student_registration_requests (inquiry_code_hash)
  WHERE inquiry_code_hash IS NOT NULL;

COMMENT ON COLUMN public.student_registration_requests.inquiry_code_hash IS
  'SHA-256 digest of the random registration status inquiry code; never store plaintext';

COMMIT;
