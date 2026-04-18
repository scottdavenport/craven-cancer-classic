-- S3-7: Fix webhook partial-failure data loss.
-- processed_at is NULL until all downstream writes succeed.
-- Retry path re-runs downstream work if processed_at IS NULL.
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS processed_at timestamptz;
