-- S9-0: Evolve contacts into unified roster/marketing table.
-- Create team_members join table. Add captain_contact_id to teams.
-- Fix webhook onConflict: add partial unique index on contacts.email.

-- ── contacts: make email nullable ─────────────────────────────────────────────
-- The existing idx_contacts_email is a plain (non-unique) index.
-- Drop it; we'll recreate as a partial unique index below.
DROP INDEX IF EXISTS public.idx_contacts_email;

-- Relax NOT NULL constraint on email.
ALTER TABLE public.contacts
  ALTER COLUMN email DROP NOT NULL;

-- Add new columns to contacts.
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS first_name        text,
  ADD COLUMN IF NOT EXISTS last_name         text,
  ADD COLUMN IF NOT EXISTS salutation        text,
  ADD COLUMN IF NOT EXISTS address1          text,
  ADD COLUMN IF NOT EXISTS address2          text,
  ADD COLUMN IF NOT EXISTS city              text,
  ADD COLUMN IF NOT EXISTS state             text,
  ADD COLUMN IF NOT EXISTS zip               text,
  ADD COLUMN IF NOT EXISTS company           text,
  ADD COLUMN IF NOT EXISTS marketing_consent boolean not null default true,
  ADD COLUMN IF NOT EXISTS source            text;

-- Partial unique index: rows with a non-null email must be unique.
-- This preserves the webhook's `onConflict: 'email'` behaviour for rows
-- that have an email, while allowing multiple rows with email IS NULL.
CREATE UNIQUE INDEX IF NOT EXISTS contacts_email_unique_when_present
  ON public.contacts (email)
  WHERE email IS NOT NULL;

-- Convenience lookup indexes.
CREATE INDEX IF NOT EXISTS idx_contacts_source     ON public.contacts (source);
CREATE INDEX IF NOT EXISTS idx_contacts_marketing  ON public.contacts (marketing_consent);

-- ── teams: add captain_contact_id ─────────────────────────────────────────────
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS captain_contact_id uuid
    REFERENCES public.contacts (id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teams_captain_contact
  ON public.teams (captain_contact_id);

-- ── team_members join table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid        NOT NULL REFERENCES public.teams (id)    ON DELETE CASCADE,
  contact_id  uuid        NOT NULL REFERENCES public.contacts (id) ON DELETE RESTRICT,
  role        text        NOT NULL CHECK (role IN ('captain', 'player')),
  slot        int         NOT NULL CHECK (slot BETWEEN 1 AND 4),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, slot),
  UNIQUE (team_id, contact_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Admin full access — uses the same is_admin() helper as all other admin tables.
CREATE POLICY "Admins can manage team_members"
  ON public.team_members FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Viewer read access — mirrors viewer policies on teams, contacts, etc.
CREATE POLICY "Viewers can select team_members"
  ON public.team_members FOR SELECT
  USING (public.is_admin_or_viewer());

CREATE INDEX IF NOT EXISTS idx_team_members_team_id
  ON public.team_members (team_id);

CREATE INDEX IF NOT EXISTS idx_team_members_contact_id
  ON public.team_members (contact_id);
