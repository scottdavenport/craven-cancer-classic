-- Issue #244: restrict profiles SELECT
--
-- The original "Public profiles are viewable by everyone" policy used
-- USING (true), making the entire profiles table (including emails, full
-- names, and role assignments) readable by anyone with the public anon key.
-- There is no public-facing UI that requires unauthenticated profile reads.
--
-- Replace with:
--   1. Authenticated users may read their own profile (auth.uid() = auth_user_id)
--   2. Admins may read all profiles (via is_admin() helper, SECURITY DEFINER,
--      defined in 20260415000001_fix_rls_recursion.sql)
--
-- Verified read paths (none break under new policy):
--   - src/lib/supabase/admin.ts getProfile()        → own row
--   - src/app/admin/teams/actions.ts getTeams()     → own row
--   - src/app/admin/trash/actions.ts resolveDeletedByNames() → admin-gated upstream
--   - src/app/api/invite/accept/route.ts            → service-role, bypasses RLS

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = auth_user_id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.is_admin());
