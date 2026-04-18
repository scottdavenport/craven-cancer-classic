-- S5-1: Rename amount_paid → amount_paid_cents on sponsors, sponsorship_purchases, teams.
-- Convert numeric(10,2) → bigint using ROUND(x * 100)::bigint so existing dollar values
-- (e.g. 700.00) become integer cents (e.g. 70000).
--
-- Also recreates register_team RPC with amount_paid_cents in the INSERT column list.
-- The original function body (20260419000006_register_team_rpc.sql) is reproduced in full
-- with only the column name changed; all logic is identical.

-- ── sponsors ──────────────────────────────────────────────────────────────────
ALTER TABLE public.sponsors
  RENAME COLUMN amount_paid TO amount_paid_cents;
ALTER TABLE public.sponsors
  ALTER COLUMN amount_paid_cents TYPE bigint
    USING ROUND(amount_paid_cents * 100)::bigint;

-- ── sponsorship_purchases ─────────────────────────────────────────────────────
ALTER TABLE public.sponsorship_purchases
  RENAME COLUMN amount_paid TO amount_paid_cents;
ALTER TABLE public.sponsorship_purchases
  ALTER COLUMN amount_paid_cents TYPE bigint
    USING ROUND(amount_paid_cents * 100)::bigint;

-- ── teams ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.teams
  RENAME COLUMN amount_paid TO amount_paid_cents;
ALTER TABLE public.teams
  ALTER COLUMN amount_paid_cents TYPE bigint
    USING ROUND(amount_paid_cents * 100)::bigint;

-- ── register_team RPC (recreate) ──────────────────────────────────────────────
-- CRITICAL: the original INSERT referenced amount_paid; after the rename above that
-- column no longer exists. CREATE OR REPLACE the function with amount_paid_cents.
-- Every other line is byte-for-byte identical to 20260419000006_register_team_rpc.sql.

create or replace function public.register_team(
  p_session       text,
  p_team_name     text,
  p_captain_name  text,
  p_captain_email text,
  p_captain_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

  -- Atomic insert — cap confirmed, lock held, proceed
  insert into public.teams (
    team_name,
    captain_name,
    captain_email,
    captain_phone,
    session,
    payment_status,
    amount_paid_cents,
    year
  ) values (
    p_team_name,
    p_captain_name,
    p_captain_email,
    p_captain_phone,
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

-- Grant execute to the anon and authenticated roles so the client-side
-- Supabase JS can call it. The function is security definer so it runs
-- with the schema owner's rights and bypasses team INSERT RLS for the
-- duration of the call (the "Anyone can register a team" insert policy
-- already allows this; security definer is an extra safety layer so the
-- count-check and insert are fully atomic even if RLS evolves).
grant execute on function public.register_team(text, text, text, text, text)
  to anon, authenticated;
