-- Sprint 32: Drop team_name from teams + scores, rewrite register_team RPC
-- Closes #283
--
-- Migration order is critical:
--   1. Drop view that pins team_name via named-column SELECT
--   2. Drop existing register_team (references team_name in INSERT)
--   3. Recreate register_team without p_team_name param
--   4. Drop team_name column from teams
--   5. Drop team_name column from scores
--   6. Recreate teams_active view (SELECT * — auto-adapts to current columns)

-- Step 1: Drop the view that references team_name (named-column SELECT, not SELECT *)
DROP VIEW IF EXISTS public.teams_active;

-- Step 2: Drop the existing register_team function (must match current prod signature exactly)
DROP FUNCTION IF EXISTS public.register_team(text, text, text, text, text);

-- Step 3: Recreate register_team without p_team_name
--   Signature: (p_session, p_captain_name, p_captain_email, p_captain_phone)
--   Captain params are vestigial back-compat per register-team-rpc-contract.test.ts:147-148 (S11-2 contract)
CREATE OR REPLACE FUNCTION public.register_team(
  p_session       text,
  p_captain_name  text,
  p_captain_email text,
  p_captain_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
declare
  v_cap           int;
  v_count         int;
  v_team_id       uuid;
  v_current_year  int;
  v_fee_cents     bigint;
begin
  -- Validate session value
  if p_session not in ('morning', 'afternoon') then
    raise exception 'invalid session value' using errcode = 'INVAL';
  end if;

  -- Serialize concurrent registrations for the same session using advisory lock.
  -- hashtext returns int4; combine with a constant offset per session.
  perform pg_advisory_xact_lock(
    hashtext('register_team:' || p_session)
  );

  v_current_year := extract(year from now())::int;

  -- Read the cap for this session from event_settings
  select
    case when p_session = 'morning' then morning_cap else afternoon_cap end
  into v_cap
  from public.event_settings
  where year = v_current_year
  limit 1;

  if v_cap is null then
    raise exception 'event settings not found for year %', v_current_year
      using errcode = 'P0002';
  end if;

  -- Count existing teams in this session for this year
  select count(*)
  into v_count
  from public.teams
  where session = p_session
    and year = v_current_year;

  if v_count >= v_cap then
    raise exception 'session is at capacity'
      using errcode = 'SESSION_FULL';
  end if;

  -- Also read the registration fee while we have event_settings in scope
  select registration_fee_cents
  into v_fee_cents
  from public.event_settings
  where year = v_current_year
  limit 1;

  -- Atomic insert — cap confirmed, lock held, proceed.
  -- captain_name/email/phone columns intentionally omitted: they are being
  -- dropped in migration 20260424000002. Captain info is stored in contacts
  -- via the team_members join table instead.
  insert into public.teams (
    session,
    payment_status,
    amount_paid_cents,
    year
  ) values (
    p_session,
    'pending',
    0,
    v_current_year
  )
  returning id into v_team_id;

  return jsonb_build_object(
    'team_id', v_team_id,
    'registration_fee_cents', coalesce(v_fee_cents, 70000)
  );
end;
$$;

-- Preserve grants per precedent (20260424000001_update_register_team_rpc.sql)
GRANT EXECUTE ON FUNCTION public.register_team(text, text, text, text) TO anon, authenticated;

-- Step 4: Drop team_name column from teams
ALTER TABLE public.teams DROP COLUMN team_name;

-- Step 5: Drop team_name column from scores
ALTER TABLE public.scores DROP COLUMN team_name;

-- Step 6: Recreate teams_active view without team_name
--   Using SELECT * so it auto-adapts if columns change in future migrations.
CREATE OR REPLACE VIEW public.teams_active AS
  SELECT * FROM public.teams WHERE deleted_at IS NULL;
