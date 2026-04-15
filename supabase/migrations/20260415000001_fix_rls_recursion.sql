-- Fix infinite recursion in profiles RLS policies
-- The "Admins can manage all profiles" policy references profiles table itself,
-- causing infinite recursion. Replace with a simpler check using auth.jwt().

-- Drop the problematic policy
drop policy if exists "Admins can manage all profiles" on public.profiles;

-- Replace with a policy that checks the JWT metadata directly
-- This avoids querying the profiles table from within its own policy
create policy "Admins can manage all profiles"
  on public.profiles for all using (
    (auth.jwt() ->> 'role') = 'authenticated'
    and auth.uid() in (
      select auth_user_id from public.profiles where role = 'admin'
    )
  );

-- Actually the above still recurses. Use a security definer function instead.
drop policy if exists "Admins can manage all profiles" on public.profiles;

-- Create a helper function that bypasses RLS
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid() and role = 'admin'
  );
$$;

-- Now fix ALL admin policies to use the function instead of subqueries
-- This prevents recursion and is more efficient

-- Profiles
create policy "Admins can manage all profiles"
  on public.profiles for all using (public.is_admin());

-- Event settings
drop policy if exists "Admins can manage event settings" on public.event_settings;
create policy "Admins can manage event settings"
  on public.event_settings for all using (public.is_admin());

-- Sponsor tiers
drop policy if exists "Admins can manage sponsor tiers" on public.sponsor_tiers;
create policy "Admins can manage sponsor tiers"
  on public.sponsor_tiers for all using (public.is_admin());

-- Sponsors
drop policy if exists "Admins can manage sponsors" on public.sponsors;
create policy "Admins can manage sponsors"
  on public.sponsors for all using (public.is_admin());

-- Teams
drop policy if exists "Admins can manage teams" on public.teams;
create policy "Admins can manage teams"
  on public.teams for all using (public.is_admin());

drop policy if exists "Teams are viewable by admins" on public.teams;
create policy "Teams are viewable by admins"
  on public.teams for select using (public.is_admin());

-- Players
drop policy if exists "Admins can manage players" on public.players;
create policy "Admins can manage players"
  on public.players for all using (public.is_admin());

-- Sponsorship items
drop policy if exists "Admins can manage sponsorship items" on public.sponsorship_items;
create policy "Admins can manage sponsorship items"
  on public.sponsorship_items for all using (public.is_admin());

-- Sponsorship purchases
drop policy if exists "Admins can manage sponsorship purchases" on public.sponsorship_purchases;
create policy "Admins can manage sponsorship purchases"
  on public.sponsorship_purchases for all using (public.is_admin());

-- Photos
drop policy if exists "Admins can manage photos" on public.photos;
create policy "Admins can manage photos"
  on public.photos for all using (public.is_admin());

drop policy if exists "Admins can view all photos" on public.photos;
create policy "Admins can view all photos"
  on public.photos for select using (public.is_admin());

-- Scores
drop policy if exists "Admins can manage scores" on public.scores;
create policy "Admins can manage scores"
  on public.scores for all using (public.is_admin());

-- Contacts
drop policy if exists "Admins can manage contacts" on public.contacts;
create policy "Admins can manage contacts"
  on public.contacts for all using (public.is_admin());

-- Email log
drop policy if exists "Admins can manage email log" on public.email_log;
create policy "Admins can manage email log"
  on public.email_log for all using (public.is_admin());

-- Storage
drop policy if exists "Admins can upload to any bucket" on storage.objects;
create policy "Admins can upload to any bucket"
  on storage.objects for insert with check (public.is_admin());

drop policy if exists "Admins can delete from any bucket" on storage.objects;
create policy "Admins can delete from any bucket"
  on storage.objects for delete using (public.is_admin());
