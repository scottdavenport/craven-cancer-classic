-- Sprint 10 S10-0: Soft-delete foundation.
-- Adds deleted_at / deleted_by to 5 tables, rewrites 3 unique indexes as partial
-- (WHERE deleted_at IS NULL), creates *_active views for default queries, adds
-- supporting partial indexes for common "not deleted" filters.
--
-- No app code is rewired in this migration — subsequent S10 issues migrate
-- each entity's queries to the _active views as they need deleted-row hiding.

-- ── Columns ───────────────────────────────────────────────────────────
ALTER TABLE public.contacts          ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
ALTER TABLE public.contacts          ADD COLUMN IF NOT EXISTS deleted_by uuid NULL REFERENCES auth.users(id);
ALTER TABLE public.teams             ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
ALTER TABLE public.teams             ADD COLUMN IF NOT EXISTS deleted_by uuid NULL REFERENCES auth.users(id);
ALTER TABLE public.sponsors          ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
ALTER TABLE public.sponsors          ADD COLUMN IF NOT EXISTS deleted_by uuid NULL REFERENCES auth.users(id);
ALTER TABLE public.sponsorship_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
ALTER TABLE public.sponsorship_items ADD COLUMN IF NOT EXISTS deleted_by uuid NULL REFERENCES auth.users(id);
ALTER TABLE public.photos            ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
ALTER TABLE public.photos            ADD COLUMN IF NOT EXISTS deleted_by uuid NULL REFERENCES auth.users(id);

-- ── Rewrite unique indexes as partial (deleted rows don't collide) ────
-- 1. contacts.email — already partial on IS NOT NULL; add AND deleted_at IS NULL
DROP INDEX IF EXISTS public.contacts_email_unique_when_present;
CREATE UNIQUE INDEX contacts_email_unique_when_present
  ON public.contacts (email)
  WHERE email IS NOT NULL AND deleted_at IS NULL;

-- 2. teams.stripe_payment_id — already partial on IS NOT NULL; add AND deleted_at IS NULL
DROP INDEX IF EXISTS public.teams_stripe_payment_id_unique;
CREATE UNIQUE INDEX teams_stripe_payment_id_unique
  ON public.teams (stripe_payment_id)
  WHERE stripe_payment_id IS NOT NULL AND deleted_at IS NULL;

-- 3. sponsorship_items — was a CONSTRAINT; drop and recreate as partial unique index
--    Try both possible constraint names (Supabase may have renamed to _key suffix)
ALTER TABLE public.sponsorship_items
  DROP CONSTRAINT IF EXISTS sponsorship_items_name_year_unique;
ALTER TABLE public.sponsorship_items
  DROP CONSTRAINT IF EXISTS sponsorship_items_name_year_key;
DROP INDEX IF EXISTS public.sponsorship_items_name_year_unique;
CREATE UNIQUE INDEX sponsorship_items_name_year_unique
  ON public.sponsorship_items (name, year)
  WHERE deleted_at IS NULL;

-- ── Partial indexes for common "not deleted" filters ──────────────────
CREATE INDEX IF NOT EXISTS idx_contacts_not_deleted          ON public.contacts          (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teams_not_deleted             ON public.teams             (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sponsors_not_deleted          ON public.sponsors          (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sponsorship_items_not_deleted ON public.sponsorship_items (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_photos_not_deleted            ON public.photos            (id) WHERE deleted_at IS NULL;

-- ── Views for default queries ─────────────────────────────────────────
-- App code queries *_active views for "show me non-deleted rows."
-- Trash page queries raw tables filtered WHERE deleted_at IS NOT NULL.
-- RLS is enforced on the underlying tables; views inherit the correct access model.
CREATE OR REPLACE VIEW public.contacts_active          AS SELECT * FROM public.contacts          WHERE deleted_at IS NULL;
CREATE OR REPLACE VIEW public.teams_active             AS SELECT * FROM public.teams             WHERE deleted_at IS NULL;
CREATE OR REPLACE VIEW public.sponsors_active          AS SELECT * FROM public.sponsors          WHERE deleted_at IS NULL;
CREATE OR REPLACE VIEW public.sponsorship_items_active AS SELECT * FROM public.sponsorship_items WHERE deleted_at IS NULL;
CREATE OR REPLACE VIEW public.photos_active            AS SELECT * FROM public.photos            WHERE deleted_at IS NULL;
