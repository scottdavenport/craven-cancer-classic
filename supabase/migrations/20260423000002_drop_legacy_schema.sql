-- Drop players table (replaced by team_members in S9-0)
-- RLS policies and indexes are dropped automatically with the table.
DROP TABLE IF EXISTS public.players;

-- Drop legacy event_settings columns (replaced by tournament_start_date,
-- tournament_end_date, and venue_name in S8-0 / PR #105 dedupe fix)
ALTER TABLE public.event_settings DROP COLUMN IF EXISTS date;
ALTER TABLE public.event_settings DROP COLUMN IF EXISTS location;
