-- Migration: 20260510000001_security_invoker_active_views.sql
--
-- PURPOSE: Set the security_invoker view option on all 5 *_active soft-delete views.
--
-- WHY: By default Postgres views run as the view owner (security_definer), bypassing
-- RLS on the underlying tables. The security_invoker option makes views evaluate RLS
-- using the calling user's identity — honoring the same policies that would apply if
-- the caller queried the base table directly. This is the Supabase-recommended
-- defense-in-depth posture for views built atop RLS-protected tables (issue #389).
-- Current callers use the service role (RLS bypass) so behavior is unchanged today;
-- the fix closes the gap for future anon/authenticated callers.
--
-- APPROACH: CREATE OR REPLACE VIEW public.<name> WITH (security_invoker option) AS <body>.
-- SELECT bodies taken verbatim from pg_get_viewdef() on prod (queried 2026-05-10).
-- Source-file bodies cross-checked; divergences noted inline.
--
-- SAFETY: All 5 DDL statements run in a single implicit transaction in Postgres.
-- If any statement fails, all 5 roll back together — no partial migration possible.
--
-- ROLLBACK: Re-apply each view definition without the security_invoker storage param
-- to revert to the default security_definer behavior.
--
-- CONSUMER AUDIT: The invoker-rights change is transparent to callers — the view
-- returns identical rows. No application code breaks from this option addition.
-- Grep evidence in PR body.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. contacts_active
--    Prod body: explicit 24-column list (no SELECT *).
--    Source (20260429000001_contacts_multi_type.sql:111) matches prod. ✓
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.contacts_active
  WITH (security_invoker=true)
AS
 SELECT id,
    full_name,
    email,
    phone,
    types,
    year_first_seen,
    notes,
    created_at,
    first_name,
    last_name,
    salutation,
    address1,
    address2,
    city,
    state,
    zip,
    company,
    marketing_consent,
    source,
    deleted_at,
    deleted_by,
    handicap,
    shirt_size,
    show_on_wall,
    recognition_name
   FROM contacts
  WHERE deleted_at IS NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. photos_active
--    Prod body: explicit 10-column list (SELECT * from initial migration
--    was expanded by Postgres to concrete columns at view-create time).
--    Source (20260419191227_soft_delete_foundation.sql:60) uses SELECT *;
--    prod expanded to explicit columns — TRUSTING PROD.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.photos_active
  WITH (security_invoker=true)
AS
 SELECT id,
    uploaded_by_name,
    uploaded_by_email,
    image_url,
    caption,
    status,
    year,
    created_at,
    deleted_at,
    deleted_by
   FROM photos
  WHERE deleted_at IS NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. sponsors_active
--    Prod body: explicit 14-column list.
--    Source (20260424000004_drop_sponsor_denorm_and_seed.sql:49) uses SELECT *;
--    prod expanded to explicit columns — TRUSTING PROD.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.sponsors_active
  WITH (security_invoker=true)
AS
 SELECT id,
    tier_id,
    name,
    logo_url,
    website,
    amount_paid_cents,
    payment_status,
    stripe_payment_id,
    display_order,
    year,
    created_at,
    deleted_at,
    deleted_by,
    is_active
   FROM sponsors
  WHERE deleted_at IS NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. sponsorship_items_active
--    Prod body: explicit 14-column list.
--    Source (20260501000001_sponsorship_items_category.sql:22) matches prod. ✓
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.sponsorship_items_active
  WITH (security_invoker=true)
AS
 SELECT id,
    name,
    description,
    price_cents,
    max_quantity,
    sold_count,
    active,
    year,
    created_at,
    benefits,
    sort_order,
    deleted_at,
    deleted_by,
    category
   FROM sponsorship_items
  WHERE deleted_at IS NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. teams_active
--    Prod body: explicit 14-column list (with 3 payment columns appended).
--    Source (20260507000001_recreate_teams_active_view_with_payment_columns.sql:23)
--    matches prod. ✓
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.teams_active
  WITH (security_invoker=true)
AS
 SELECT id,
    session,
    payment_status,
    stripe_payment_id,
    amount_paid_cents,
    notes,
    year,
    created_at,
    captain_contact_id,
    deleted_at,
    deleted_by,
    payment_method,
    payment_reference,
    paid_at
   FROM teams
  WHERE deleted_at IS NULL;
