-- S5-0: Merge sponsor_tiers into sponsorship_items + price_cents rename + seed 8 canonical levels
--
-- sponsor_tiers (initial schema lines 88-97):
--   id uuid, name text, price numeric(10,2), sort_order int, benefits jsonb,
--   max_available int, active boolean, created_at timestamptz
--
-- sponsorship_items (initial schema lines 213-224):
--   id uuid, tier_id uuid -> sponsor_tiers(id), name text, description text,
--   price numeric(10,2), max_quantity int, sold_count int, active boolean,
--   year int, created_at timestamptz
--
-- sponsors.tier_id currently FK -> sponsor_tiers(id) (initial schema line 117)

-- Step 1: Add columns that sponsor_tiers has but sponsorship_items lacks
ALTER TABLE public.sponsorship_items
  ADD COLUMN benefits jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.sponsorship_items
  ADD COLUMN sort_order int NOT NULL DEFAULT 0;

-- Step 2: Add UNIQUE (name, year) so seed upserts are idempotent
ALTER TABLE public.sponsorship_items
  ADD CONSTRAINT sponsorship_items_name_year_unique UNIQUE (name, year);

-- Step 3: Drop the dead tier_id FK on sponsorship_items (points to sponsor_tiers, being dropped)
ALTER TABLE public.sponsorship_items DROP COLUMN IF EXISTS tier_id;

-- Step 4: Copy sponsor_tiers rows into sponsorship_items for 2026, preserving UUIDs
-- sponsor_tiers has no `year` column — we assign 2026 explicitly.
-- max_available -> max_quantity column mapping.
INSERT INTO public.sponsorship_items (id, name, price, benefits, sort_order, active, year, max_quantity)
  SELECT id, name, price, benefits, sort_order, active, 2026, max_available
  FROM public.sponsor_tiers
ON CONFLICT (name, year) DO NOTHING;

-- Step 5: Repoint sponsors.tier_id FK from sponsor_tiers to sponsorship_items
ALTER TABLE public.sponsors DROP CONSTRAINT IF EXISTS sponsors_tier_id_fkey;
ALTER TABLE public.sponsors
  ADD CONSTRAINT sponsors_tier_id_fkey
    FOREIGN KEY (tier_id) REFERENCES public.sponsorship_items(id) ON DELETE RESTRICT;

-- Step 6: Drop sponsor_tiers table (and its RLS policies, which drop with the table)
DROP TABLE public.sponsor_tiers;

-- Step 7: Rename price column and convert to bigint cents
ALTER TABLE public.sponsorship_items RENAME COLUMN price TO price_cents;
ALTER TABLE public.sponsorship_items
  ALTER COLUMN price_cents TYPE bigint USING ROUND(price_cents * 100)::bigint;

-- Step 8: Seed the 8 canonical sponsorship levels for 2026 (idempotent via ON CONFLICT)
INSERT INTO public.sponsorship_items (name, price_cents, active, year, max_quantity, sort_order, benefits)
VALUES
  ('Champion Sponsor',   500000, true, 2026, NULL, 10, '[]'::jsonb),
  ('Eagle Sponsor',      250000, true, 2026, NULL, 20, '[]'::jsonb),
  ('Golf Gift Sponsor',  250000, true, 2026, NULL, 30, '[]'::jsonb),
  ('Celebration Lunch',  200000, true, 2026, NULL, 40, '[]'::jsonb),
  ('Golf Carts',         100000, true, 2026, NULL, 50, '[]'::jsonb),
  ('Bloody Mary',        100000, true, 2026, NULL, 60, '[]'::jsonb),
  ('Thursday Night',      70000, true, 2026, NULL, 70, '[]'::jsonb),
  ('Wall Sponsor',        70000, true, 2026, NULL, 80, '[]'::jsonb)
ON CONFLICT (name, year) DO NOTHING;

-- Step 9: Harden sponsorship_items admin policy with WITH CHECK (Sentinel S5-0 review)
-- Recreate the policy originally missing WITH CHECK from 20260415000001_fix_rls_recursion.sql line 73-74
DROP POLICY IF EXISTS "Admins can manage sponsorship items" ON public.sponsorship_items;
CREATE POLICY "Admins can manage sponsorship items"
  ON public.sponsorship_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
