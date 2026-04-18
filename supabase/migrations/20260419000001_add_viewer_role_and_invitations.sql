-- S3-3: Add viewer role + invitations table with RLS
-- viewer = read-only admin (SELECT across all admin-visible tables, no writes)

-- ============================================
-- 1. EXTEND profiles.role CHECK CONSTRAINT
-- ============================================
-- CHECK constraints cannot be altered in place; drop and re-add.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
    check (role in ('admin', 'viewer', 'user'));

-- ============================================
-- 2. HELPER: is_admin_or_viewer()
-- ============================================
create or replace function public.is_admin_or_viewer()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid() and role in ('admin', 'viewer')
  );
$$;

-- ============================================
-- 3. CREATE invitations TABLE
-- ============================================
create table public.invitations (
  id          uuid        primary key default gen_random_uuid(),
  email       text        not null,
  role        text        not null default 'viewer' check (role in ('admin', 'viewer')),
  invited_by  uuid        references public.profiles(id) on delete set null,
  token       text        not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  expires_at  timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.invitations enable row level security;

-- ============================================
-- 4. RLS POLICIES ON invitations
-- ============================================

-- Admins can CRUD all invitations
create policy "admin_all_invitations"
  on public.invitations for all using (public.is_admin())
  with check (public.is_admin());

-- Anon/authenticated can SELECT by token (token is the secret — 32-byte hex, unguessable)
-- Route: /invite/[token] reads the row to validate before accepting
create policy "public_select_by_token"
  on public.invitations for select using (expires_at > now() AND accepted_at IS NULL);

-- ============================================
-- 5. INDEXES ON invitations
-- ============================================
-- token UNIQUE already creates a unique index implicitly; adding named index for clarity
create index idx_invitations_email on public.invitations(email);

-- ============================================
-- 6. EXTEND VIEWER READ ACCESS ON EXISTING TABLES
-- ============================================
-- For every table whose SELECT is currently admin-only, add a parallel
-- SELECT policy that also grants read to viewers.
-- We do NOT touch INSERT/UPDATE/DELETE policies — viewers stay read-only.

-- teams: "Teams are viewable by admins" → extend to viewers
drop policy if exists "Teams are viewable by admins" on public.teams;
create policy "Teams are viewable by admins"
  on public.teams for select using (public.is_admin_or_viewer());

-- photos: "Admins can view all photos" → extend to viewers
drop policy if exists "Admins can view all photos" on public.photos;
create policy "Admins can view all photos"
  on public.photos for select using (public.is_admin_or_viewer());

-- contacts: no dedicated SELECT policy exists (covered by the ALL policy).
-- Add a viewer-scoped SELECT policy so viewers can read without write perms.
create policy "Viewers can select contacts"
  on public.contacts for select using (public.is_admin_or_viewer());

-- players: same pattern as contacts
create policy "Viewers can select players"
  on public.players for select using (public.is_admin_or_viewer());

-- sponsorship_purchases: same pattern
create policy "Viewers can select sponsorship purchases"
  on public.sponsorship_purchases for select using (public.is_admin_or_viewer());

-- email_log: same pattern
create policy "Viewers can select email log"
  on public.email_log for select using (public.is_admin_or_viewer());

-- stripe_events: admin-only (no existing SELECT policy; add viewer read)
create policy "Viewers can select stripe events"
  on public.stripe_events for select using (public.is_admin_or_viewer());
