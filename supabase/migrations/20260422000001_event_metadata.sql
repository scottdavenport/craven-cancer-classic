ALTER TABLE public.event_settings
  ADD COLUMN tournament_start_date date,
  ADD COLUMN tournament_end_date date,
  ADD COLUMN venue_name text;
