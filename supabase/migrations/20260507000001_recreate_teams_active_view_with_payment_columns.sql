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
--
-- IMPORTANT: new columns MUST be appended at the END of the existing
-- column list. Postgres `CREATE OR REPLACE VIEW` allows ADDING columns
-- to the tail but rejects reordering — inserting a new column in the
-- middle reads as a column rename and fails with SQLSTATE 42P16. The
-- first attempt at this migration (PR #386) inserted payment_method
-- after amount_paid_cents and the production deploy errored:
-- `ERROR: cannot change name of view column "notes" to "payment_method"`.
-- Hotfix retains the original 11 columns in their existing positions
-- (1–11) and appends the 3 new payment columns at the end (12–14).

CREATE OR REPLACE VIEW teams_active AS
SELECT
  id,
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
