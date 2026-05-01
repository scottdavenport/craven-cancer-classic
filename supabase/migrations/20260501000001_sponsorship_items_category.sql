-- 1. Enum type
CREATE TYPE sponsorship_category AS ENUM ('sponsorship', 'tribute', 'supporter');

-- 2. Add column with non-null default
ALTER TABLE sponsorship_items
  ADD COLUMN category sponsorship_category NOT NULL DEFAULT 'sponsorship';

-- 3. Explicit per-row backfill (locked Q2)
UPDATE sponsorship_items SET category = 'tribute'   WHERE name = 'Balloons';
UPDATE sponsorship_items SET category = 'supporter' WHERE name IN ('Tee Sign', 'Yard Sign');

-- 4. Index for filter queries
CREATE INDEX idx_sponsorship_items_category ON sponsorship_items(category);

-- 5. Tribute recipient on purchases
ALTER TABLE sponsorship_purchases
  ADD COLUMN tribute_recipient text;

-- 6. Drop + recreate sponsorship_items_active to include category
--    (existing view is explicit columns, NOT SELECT *, so it does not auto-adapt)
DROP VIEW sponsorship_items_active;
CREATE VIEW sponsorship_items_active AS
  SELECT id, name, description, price_cents, max_quantity, sold_count, active,
         year, created_at, benefits, sort_order, deleted_at, deleted_by, category
  FROM sponsorship_items
  WHERE deleted_at IS NULL;
