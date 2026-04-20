-- S11-2: Drop deprecated captain_name, captain_email, captain_phone text columns
-- from public.teams. Captain info is now stored in contacts via the
-- team_members → contacts join (captain_contact_id FK + team_members.role='captain').
-- Data has been duplicated into contacts prior to this migration — nothing is lost.

ALTER TABLE public.teams
  DROP COLUMN IF EXISTS captain_name,
  DROP COLUMN IF EXISTS captain_email,
  DROP COLUMN IF EXISTS captain_phone;
