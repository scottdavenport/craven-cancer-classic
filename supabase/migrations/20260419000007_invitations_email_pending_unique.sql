-- Enforce one pending invite per email address.
-- A partial unique index on accepted_at IS NULL means:
--   - Two simultaneous pending invites for the same email are rejected (23505).
--   - After an invite is accepted (accepted_at IS NOT NULL) a new one can be sent.
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_email_pending
  ON public.invitations (email)
  WHERE accepted_at IS NULL;
