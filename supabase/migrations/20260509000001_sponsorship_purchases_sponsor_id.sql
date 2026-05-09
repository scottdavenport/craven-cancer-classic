-- Issue #380: link sponsorship_purchases to sponsors so the delete-confirm
-- can warn about linked records. ON DELETE SET NULL is defensive — sponsors
-- uses soft-delete, so this only fires on rare hard-delete (admin Trash → purge).
-- Backfill is a no-op: sponsorship_purchases is empty at migration write time.

ALTER TABLE sponsorship_purchases
  ADD COLUMN sponsor_id UUID NULL REFERENCES sponsors(id) ON DELETE SET NULL;

CREATE INDEX idx_sponsorship_purchases_sponsor_id
  ON sponsorship_purchases(sponsor_id) WHERE sponsor_id IS NOT NULL;
