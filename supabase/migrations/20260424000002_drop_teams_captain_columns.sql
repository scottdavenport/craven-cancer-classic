-- S11-2: Drop deprecated captain_name, captain_email, captain_phone text columns
-- from public.teams. Captain info is now stored in contacts via the
-- team_members → contacts join (captain_contact_id FK + team_members.role='captain').
-- Data has been duplicated into contacts prior to this migration — nothing is lost.
--
-- The teams_active view (SELECT * FROM teams WHERE deleted_at IS NULL) has an
-- implicit column-level dependency on captain_* — Postgres resolves * at view
-- creation time and pins the column list. Drop-view-then-recreate is the
-- established pattern (preferred over DROP ... CASCADE so we don't silently
-- drop other dependents).

DROP VIEW IF EXISTS public.teams_active;

ALTER TABLE public.teams
  DROP COLUMN IF EXISTS captain_name,
  DROP COLUMN IF EXISTS captain_email,
  DROP COLUMN IF EXISTS captain_phone;

CREATE OR REPLACE VIEW public.teams_active
  AS SELECT * FROM public.teams
  WHERE deleted_at IS NULL;
