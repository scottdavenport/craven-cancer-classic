-- Sprint 18 PR C —
-- 1. Drop sponsors_active view (SELECT * pins columns — must recreate after DROP COLUMN)
-- 2. Drop sponsors.contact_name, contact_email, contact_phone (replaced by sponsor_contacts in PR B)
-- 3. Recreate sponsors_active view (will now include is_active from PR A)
-- 4. Seed 14 sponsors scraped from cravencancerclassic.org homepage
--
-- S11 RETRO DEPENDENCY AUDIT:
--   grep "contact_name\|contact_email\|contact_phone" supabase/migrations/*.sql
--   References:
--     20260414000001_initial_schema.sql — DDL that added the columns (schema creation)
--     20260424000003_sponsor_registry_and_contacts.sql — PR B backfill PL/pgSQL that reads the
--       columns before this migration runs; by the time this migration executes, PR B has already
--       migrated data to sponsor_contacts. Safe to drop here.
--   No views, functions, or policies (other than sponsors_active SELECT * below) reference these columns.
--   sponsors_active view uses SELECT * — must DROP before ALTER TABLE, recreate after.
--
-- NOTE: After this migration, sponsors_active SELECT * now includes is_active (added in PR A).
-- Consumers of the view can filter on is_active going forward.

-- ROLLBACK (manual):
--   BEGIN;
--   DELETE FROM public.sponsors WHERE year = 2026 AND name IN (
--     'Carolina East Health', 'Fuel Market', 'Sports Connection', 'Chick-fil-A', 'BSH',
--     'TIC', 'Tony Tresie', 'Richard & Cathy'
--   );
--   DELETE FROM public.sponsors WHERE year = 2026 AND name LIKE '(%— rename%)';
--   DROP VIEW public.sponsors_active;
--   ALTER TABLE public.sponsors
--     ADD COLUMN contact_name text,
--     ADD COLUMN contact_email text,
--     ADD COLUMN contact_phone text;
--   CREATE OR REPLACE VIEW public.sponsors_active AS
--     SELECT * FROM public.sponsors WHERE deleted_at IS NULL;
--   COMMIT;

-- ========== 1. Drop sponsors_active view ==========

DROP VIEW IF EXISTS public.sponsors_active;

-- ========== 2. Drop denormalized contact columns ==========

ALTER TABLE public.sponsors
  DROP COLUMN IF EXISTS contact_name,
  DROP COLUMN IF EXISTS contact_email,
  DROP COLUMN IF EXISTS contact_phone;

-- ========== 3. Recreate sponsors_active ==========

CREATE OR REPLACE VIEW public.sponsors_active AS
  SELECT * FROM public.sponsors WHERE deleted_at IS NULL;

-- RLS policies on the view are inherited from the underlying sponsors table.

-- ========== 4. Seed 14 scraped sponsors ==========

-- From cravencancerclassic.org homepage scrape (2026-04-20). Logo URLs point to
-- Squarespace CDN — per Scott's ask, imported as-is. Admin will rename the
-- "(— rename)" placeholders via the sponsor drawer UI post-import.
--
-- Tier mapping (exact names from sponsorship_items table):
--   'Champion Sponsor' ($5k) → Champion-tier rows
--   'Eagle Sponsor' ($2.5k) → Eagle-tier rows
--   'Morning Biscuit Sponsor' → added in PR B (active=false, price=0)
--   'Shot of the Day' → added in PR B (active=false, price=0)
--
-- All rows: year=2026, is_active=true, payment_status='pending', amount_paid_cents=0.
-- display_order incrementing by tier.
--
-- Idempotent: WHERE NOT EXISTS guards against re-insert on re-apply.
-- If a JOIN tier name doesn't exist (e.g. PR A not yet applied), that tier's rows
-- silently produce 0 — safe failure mode.

INSERT INTO public.sponsors
  (tier_id, name, logo_url, year, is_active, payment_status, amount_paid_cents, display_order)
SELECT
  t.id AS tier_id,
  s.name,
  s.logo_url,
  2026,
  true,
  'pending',
  0,
  s.display_order
FROM (VALUES
  -- Champion Sponsor ($5k)
  ('Champion Sponsor', 'Carolina East Health', 'https://images.squarespace-cdn.com/content/v1/55871a9ce4b0c7da4911d63b/1629596078630-4PR6HEVF8B1XEM10T28E/carolinaeast-feature.jpeg', 1),
  ('Champion Sponsor', 'Fuel Market', 'https://images.squarespace-cdn.com/content/v1/55871a9ce4b0c7da4911d63b/23606448-6e61-4bff-b952-c09be947ee00/Fuel-Market-Metallic-Oval-logo.jpg', 2),
  ('Champion Sponsor', '(Champion Sponsor — rename)', 'https://images.squarespace-cdn.com/content/v1/55871a9ce4b0c7da4911d63b/7594871b-3bfd-44fb-b4aa-31b21219b4a9/CCC+Personal+Oct+20+2022+%283%29.png', 3),
  ('Champion Sponsor', '(Champion Sponsor — rename)', 'https://images.squarespace-cdn.com/content/v1/55871a9ce4b0c7da4911d63b/1694464442940-8OE4O73NVS2V24HYRD0P/CCC+Personal-4.png', 4),
  -- Eagle Sponsor ($2.5k)
  ('Eagle Sponsor', 'Sports Connection', 'https://images.squarespace-cdn.com/content/v1/55871a9ce4b0c7da4911d63b/1694463378634-V0OPBPQC2V0EC7LTY1AS/sportsconnection.png', 1),
  ('Eagle Sponsor', 'Chick-fil-A', 'https://images.squarespace-cdn.com/content/v1/55871a9ce4b0c7da4911d63b/1662990372442-P51HLP0LPA5Q9ZHG6JF5/Chick-fil-A+White+Script+Logo+on+PMS+186+Large_master.jpg', 2),
  ('Eagle Sponsor', 'BSH', 'https://images.squarespace-cdn.com/content/v1/55871a9ce4b0c7da4911d63b/1694464031909-4HREHIUBP20JXWBB34LA/BSH_logo.jpg', 3),
  ('Eagle Sponsor', '(Eagle Sponsor — rename, was SMDonation)', 'https://images.squarespace-cdn.com/content/v1/55871a9ce4b0c7da4911d63b/1663090374158-A90ZZQNXFBTWC4HY90Y1/SMDonation.png', 4),
  ('Eagle Sponsor', '(Eagle Sponsor — rename, was screenshot upload)', 'https://images.squarespace-cdn.com/content/v1/55871a9ce4b0c7da4911d63b/1755631057671-U5M01FJBCM76YW03ISOF/Screenshot+2025-08-19+at+3.17.28%E2%80%AFPM.png', 5),
  -- Morning Biscuit Sponsor
  ('Morning Biscuit Sponsor', 'TIC', 'https://images.squarespace-cdn.com/content/v1/55871a9ce4b0c7da4911d63b/1696454556511-C6KTZ9OFF0UIPZ9OAZQ6/TIC_Logo_PNG.png', 1),
  -- Shot of the Day
  ('Shot of the Day', 'Tony Tresie', 'https://images.squarespace-cdn.com/content/v1/55871a9ce4b0c7da4911d63b/1662058439630-TB4MIFZAT80JW6DJ0ECJ/TonyTresie.png', 1),
  ('Shot of the Day', 'Richard & Cathy', 'https://images.squarespace-cdn.com/content/v1/55871a9ce4b0c7da4911d63b/1662058439163-IN9RLR93JOGTXTCA9EAP/RichardCathy.png', 2),
  ('Shot of the Day', '(Shot of the Day — rename)', 'https://images.squarespace-cdn.com/content/v1/55871a9ce4b0c7da4911d63b/1753018219673-VAEJ8SAIC4RPI30V0LI8/CCC+Personal+Oct+20+2022.png', 3),
  ('Shot of the Day', '(Shot of the Day — rename)', 'https://images.squarespace-cdn.com/content/v1/55871a9ce4b0c7da4911d63b/1753018256089-YAC06PM17D5U6JQNU9DF/CCC+Personal+Oct+20+2022+%281%29.png', 4)
) AS s(tier_name, name, logo_url, display_order)
JOIN public.sponsorship_items t
  ON t.name = s.tier_name
  AND t.year = 2026
  AND t.deleted_at IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.sponsors existing
  WHERE existing.name = s.name
    AND existing.tier_id = t.id
    AND existing.year = 2026
);
