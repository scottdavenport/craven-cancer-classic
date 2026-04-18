-- Add registration_fee_cents to event_settings
-- Stores the per-team registration fee in cents to align with Stripe.
-- Default: 70000 cents = $700.00

ALTER TABLE event_settings
  ADD COLUMN registration_fee_cents bigint NOT NULL DEFAULT 70000;
