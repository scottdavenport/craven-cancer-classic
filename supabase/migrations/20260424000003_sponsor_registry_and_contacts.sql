-- Sprint 18 PR A — sponsor registry schema
-- 1. Add is_active to sponsors
-- 2. Create sponsor_contacts join table
-- 3. Add Morning Biscuit + Shot of the Day tiers (active=false, price=0)
-- 4. Backfill: existing sponsor denorm contact_* data → contacts + sponsor_contacts
--
-- ROLLBACK (manual, if needed):
--   BEGIN;
--   DELETE FROM public.sponsor_contacts WHERE sponsor_id IN (...);
--   DELETE FROM public.contacts WHERE source = 'migration_from_sponsor_denorm';
--   DROP TABLE public.sponsor_contacts;
--   DELETE FROM public.sponsorship_items WHERE name IN ('Morning Biscuit Sponsor', 'Shot of the Day') AND year = 2026;
--   ALTER TABLE public.sponsors DROP COLUMN is_active;
--   DROP INDEX IF EXISTS idx_sponsors_is_active;
--   COMMIT;

-- ========== 1. is_active on sponsors ==========

ALTER TABLE public.sponsors
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Index so filters on active work fast with many rows
CREATE INDEX IF NOT EXISTS idx_sponsors_is_active ON public.sponsors (is_active)
  WHERE deleted_at IS NULL;

-- ========== 2. sponsor_contacts join table ==========

CREATE TABLE IF NOT EXISTS public.sponsor_contacts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id  uuid        NOT NULL REFERENCES public.sponsors(id)  ON DELETE CASCADE,
  contact_id  uuid        NOT NULL REFERENCES public.contacts(id)  ON DELETE RESTRICT,
  role        text        NOT NULL CHECK (role IN ('primary', 'billing', 'other')) DEFAULT 'primary',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sponsor_id, contact_id)
);

ALTER TABLE public.sponsor_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sponsor_contacts"
  ON public.sponsor_contacts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Viewers can select sponsor_contacts"
  ON public.sponsor_contacts FOR SELECT
  USING (public.is_admin_or_viewer());

CREATE INDEX IF NOT EXISTS idx_sponsor_contacts_sponsor_id ON public.sponsor_contacts (sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_contacts_contact_id ON public.sponsor_contacts (contact_id);

-- ========== 3. New sponsorship_items tiers ==========

-- Morning Biscuit Sponsor + Shot of the Day — placeholders for legacy-site sponsor import.
-- Marked inactive so they don't show on public /sponsorships page. Scott will activate + set
-- price via admin UI when ready to accept new purchases.
-- sort_order 90 and 100 — existing items occupy 10–80.

-- Guarded by NOT EXISTS sub-select instead of ON CONFLICT because sponsorship_items has
-- no unique (name, year) constraint. Supabase tracks migrations in schema_migrations so
-- this won't re-run; the guard is belt-and-suspenders in case of manual re-apply.
INSERT INTO public.sponsorship_items
  (name, description, price_cents, max_quantity, active, year, sort_order)
SELECT * FROM (VALUES
  ('Morning Biscuit Sponsor'::text, NULL::text, 0::int, NULL::int, false, 2026, 90),
  ('Shot of the Day'::text, NULL::text, 0::int, NULL::int, false, 2026, 100)
) AS new_tiers(name, description, price_cents, max_quantity, active, year, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.sponsorship_items existing
  WHERE existing.name = new_tiers.name AND existing.year = new_tiers.year
);

-- ========== 4. Backfill denorm contacts → contacts + sponsor_contacts ==========

-- For each sponsor row with non-null contact data:
--   - If a contact with the same email (non-null) already exists, link that contact
--   - Else create a new contact (type=sponsor, source=migration_from_sponsor_denorm)
--   - Insert a sponsor_contacts row (role=primary)

DO $$
DECLARE
  sponsor_row RECORD;
  existing_contact_id uuid;
  new_contact_id uuid;
  derived_first text;
  derived_last text;
BEGIN
  FOR sponsor_row IN
    SELECT id, name, contact_name, contact_email, contact_phone, year
    FROM public.sponsors
    WHERE deleted_at IS NULL
      AND (contact_name IS NOT NULL OR contact_email IS NOT NULL OR contact_phone IS NOT NULL)
  LOOP
    existing_contact_id := NULL;

    -- Try to find an existing contact by email (non-null) — avoids duplicate contacts
    IF sponsor_row.contact_email IS NOT NULL AND sponsor_row.contact_email <> '' THEN
      SELECT id INTO existing_contact_id
      FROM public.contacts
      WHERE email = lower(trim(sponsor_row.contact_email))
        AND deleted_at IS NULL
      LIMIT 1;
    END IF;

    IF existing_contact_id IS NOT NULL THEN
      -- Link existing contact
      INSERT INTO public.sponsor_contacts (sponsor_id, contact_id, role)
      VALUES (sponsor_row.id, existing_contact_id, 'primary')
      ON CONFLICT (sponsor_id, contact_id) DO NOTHING;
    ELSE
      -- Create a new contact
      -- Derive first/last from contact_name (best-effort split on first space)
      IF sponsor_row.contact_name IS NOT NULL AND sponsor_row.contact_name <> '' THEN
        derived_first := split_part(trim(sponsor_row.contact_name), ' ', 1);
        derived_last := NULLIF(substring(trim(sponsor_row.contact_name) FROM position(' ' IN trim(sponsor_row.contact_name)) + 1), '');
      ELSE
        derived_first := NULL;
        derived_last := NULL;
      END IF;

      INSERT INTO public.contacts
        (full_name, first_name, last_name, email, phone, type, source, year_first_seen, company)
      VALUES
        (
          COALESCE(NULLIF(trim(sponsor_row.contact_name), ''), sponsor_row.name),
          derived_first,
          derived_last,
          NULLIF(lower(trim(sponsor_row.contact_email)), ''),
          NULLIF(trim(sponsor_row.contact_phone), ''),
          'sponsor',
          'migration_from_sponsor_denorm',
          sponsor_row.year,
          CASE WHEN sponsor_row.contact_name IS NULL OR trim(sponsor_row.contact_name) = '' THEN NULL ELSE sponsor_row.name END
        )
      RETURNING id INTO new_contact_id;

      INSERT INTO public.sponsor_contacts (sponsor_id, contact_id, role)
      VALUES (sponsor_row.id, new_contact_id, 'primary')
      ON CONFLICT (sponsor_id, contact_id) DO NOTHING;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete. Check: SELECT COUNT(*) FROM public.sponsor_contacts;';
END $$;

-- ========== Verification queries (for post-deploy check — not executed as part of migration) ==========
-- SELECT COUNT(*) FROM public.sponsors WHERE is_active = true;  -- should equal all non-deleted existing rows
-- SELECT COUNT(*) FROM public.sponsor_contacts;  -- should be >= count of sponsors with non-null denorm contact data
-- SELECT s.name, sc.role, c.full_name, c.email FROM public.sponsors s
--   JOIN public.sponsor_contacts sc ON sc.sponsor_id = s.id
--   JOIN public.contacts c ON c.id = sc.contact_id;
