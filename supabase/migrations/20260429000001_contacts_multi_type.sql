-- Migration: contacts_multi_type
-- Sprint 31 — Issue #264
-- Replaces contacts.type (single text) with contacts.types (text[]).
-- Also adds handicap, shirt_size, show_on_wall, recognition_name columns.
-- Drops and recreates contacts_active view (it lists type explicitly — no SELECT *).
-- All steps are atomic; any failure rolls the entire migration back.

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Add the new types[] column with a safe NOT NULL default.
--    Existing rows will default to ARRAY['other'] until the backfill below runs.
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE contacts
  ADD COLUMN types text[] NOT NULL DEFAULT ARRAY['other']::text[];

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Backfill — three-step, idempotent, catches join-based misalignments.
--    (Decision #9 from the plan amendments.)
-- ──────────────────────────────────────────────────────────────────────────────

-- Step 1: Seed types from the existing single-type column.
UPDATE contacts
SET types = ARRAY[type]
WHERE type IS NOT NULL;

-- Step 2: UNION-add 'player' for every contact present in team_members.
--         Catches contacts mislabeled in the type column who are on a team.
UPDATE contacts c
SET types = ARRAY(SELECT DISTINCT unnest(c.types || ARRAY['player']::text[]))
WHERE EXISTS (SELECT 1 FROM team_members tm WHERE tm.contact_id = c.id)
  AND NOT ('player' = ANY(c.types));

-- Step 3: UNION-add 'sponsor' for every contact present in sponsor_contacts.
--         Same rationale as step 2.
UPDATE contacts c
SET types = ARRAY(SELECT DISTINCT unnest(c.types || ARRAY['sponsor']::text[]))
WHERE EXISTS (SELECT 1 FROM sponsor_contacts sc WHERE sc.contact_id = c.id)
  AND NOT ('sponsor' = ANY(c.types));

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. CHECK constraint on the new types column.
--    Includes 'volunteer' (added in this sprint — decision #6).
--    'other' is stackable with any other type (decision #5).
--    Array must have at least one element.
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE contacts
  ADD CONSTRAINT contacts_types_check
  CHECK (
    types <@ ARRAY['player','sponsor','donor','volunteer','other']::text[]
    AND array_length(types, 1) >= 1
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Player-only field: handicap.
--    Nullable (blank allowed). CHECK enforces USGA range when non-null.
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE contacts
  ADD COLUMN handicap smallint
  CHECK (handicap IS NULL OR (handicap >= 0 AND handicap <= 54));

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Shared field: shirt_size.
--    Used by Player AND Volunteer (decision #7). NOT Player-only.
--    Nullable (blank allowed).
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE contacts
  ADD COLUMN shirt_size text
  CHECK (shirt_size IS NULL OR shirt_size IN ('S','M','L','XL','2XL','3XL'));

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Donor field: show_on_wall.
--    Replaces original plan's anonymous_default (which never existed in prod).
--    Default true = contact is recognized on the public tribute wall (decision #11).
--    Positive framing removes inversion confusion.
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE contacts
  ADD COLUMN show_on_wall boolean NOT NULL DEFAULT true;

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. Donor field: recognition_name.
--    Optional. When NULL, the tribute wall falls back to full_name (decision #3).
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE contacts
  ADD COLUMN recognition_name text;

-- ──────────────────────────────────────────────────────────────────────────────
-- 8a. Drop dependent view BEFORE dropping the type column.
--     contacts_active explicitly selects type — it cannot survive the column drop.
-- ──────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS contacts_active;

-- ──────────────────────────────────────────────────────────────────────────────
-- 8b. Drop the legacy single-type column (and its attached constraint + index).
--     contacts_type_check is a column-level CHECK — it drops with the column.
--     idx_contacts_type is a separate btree index — drop it explicitly below.
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE contacts DROP COLUMN type;

-- ──────────────────────────────────────────────────────────────────────────────
-- 8c. Recreate contacts_active with the new schema.
--     Original column list (from live prod view, queried 2026-04-29):
--       id, full_name, email, phone, type, year_first_seen, notes, created_at,
--       first_name, last_name, salutation, address1, address2, city, state, zip,
--       company, marketing_consent, source, deleted_at, deleted_by
--     Changes:
--       - type removed
--       - types, handicap, shirt_size, show_on_wall, recognition_name added
--     All other columns preserved in original order.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE VIEW contacts_active AS
  SELECT
    id,
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

-- ──────────────────────────────────────────────────────────────────────────────
-- 9. Drop the legacy btree index on type (no longer exists).
--    Create a GIN index on the new types array, partial on active rows only.
-- ──────────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_contacts_type;
CREATE INDEX idx_contacts_types ON contacts USING GIN (types) WHERE deleted_at IS NULL;

COMMIT;
