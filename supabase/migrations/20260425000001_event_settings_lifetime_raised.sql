-- Add lifetime_raised_cents to event_settings
-- Tracks cumulative dollars raised since the tournament's founding (2010).
-- Nullable; UI omits the stat gracefully when null.
-- Admin sets this manually via /admin/event.

ALTER TABLE public.event_settings
  ADD COLUMN lifetime_raised_cents bigint NULL;

COMMENT ON COLUMN public.event_settings.lifetime_raised_cents IS
  'Cumulative amount raised across all years, in cents. Null = not yet set. Displayed as the third masthead stat on /sponsors.';
