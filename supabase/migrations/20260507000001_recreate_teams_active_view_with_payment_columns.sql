-- Recreate teams_active view to include the 3 new payment columns added in
-- 20260506000001_add_team_payment_columns.sql.
--
-- Per `feedback_migration_dependency_audit.md`: SELECT-with-explicit-columns
-- views pin their column set at creation; they do NOT auto-adapt when the
-- base table gains columns. The prior migration added payment_method,
-- payment_reference, paid_at to teams, but `getTeams()` reads from
-- teams_active and selects those columns — every load of /admin/teams was
-- throwing `ERROR: 42703: column "payment_method" does not exist` until
-- this view recreation lands. Caught by Watchdog on PR #386 review via
-- direct prod query (per feedback_verify_against_prod_not_source.md).

CREATE OR REPLACE VIEW teams_active AS
SELECT
  id,
  session,
  payment_status,
  stripe_payment_id,
  amount_paid_cents,
  payment_method,
  payment_reference,
  paid_at,
  notes,
  year,
  created_at,
  captain_contact_id,
  deleted_at,
  deleted_by
FROM teams
WHERE deleted_at IS NULL;
