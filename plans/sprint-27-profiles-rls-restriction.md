# Sprint 27 — profiles RLS restriction (#244)

**Status:** Planning — awaiting Forge approval before Flux spawns.
**Driver:** Sentinel security review (2026-04-26) of issue #244 confirmed `profiles.SELECT` policy is `USING (true)` (public-readable), exposing email + full_name + role for every user to anyone with the anon key. Trivial enumeration vector for phishing / admin-account fingerprinting.

**Sentinel's full analysis:** captured in agent report — migration SQL + read-path inventory + risk assessment all complete. No Scott input required; no blockers; all 4 read paths verified to keep working under new policy.

## Scope

Single migration that swaps the public `USING (true)` SELECT policy on `public.profiles` for two restrictive policies:
- Authenticated users can read their OWN row (`auth.uid() = auth_user_id`)
- Admins can read all rows (`public.is_admin()` — existing SECURITY DEFINER helper)

Plus an inline RLS test that locks the new behavior (Flux writes; no separate Spec phase).

## Non-Goals

- Don't restructure other policies on `profiles` (UPDATE/INSERT/DELETE intentionally absent — already audited by Sentinel)
- Don't touch the `is_admin()` function
- Don't audit RLS on other tables (out of scope per `feedback_surgical_changes.md` — issue #244 is named scope)
- Don't add `WITH CHECK (public.is_admin())` to the existing admin `FOR ALL` policy (Sentinel flagged as nice-to-have; keep separate)

## Read paths verified by Sentinel (none break under new policy)

| Call site | Auth | Filter | Outcome under new policy |
|---|---|---|---|
| `src/lib/supabase/admin.ts:22` `getProfile()` | SSR anon (RLS active) | `auth_user_id = user.id` | ✓ own-row policy satisfied |
| `src/app/admin/teams/actions.ts:50` `getTeams()` | SSR anon (RLS active) | `auth_user_id = user.id` | ✓ own-row policy satisfied |
| `src/app/admin/trash/actions.ts:30` `resolveDeletedByNames()` | SSR anon (RLS active), `requireAdmin()` upstream | `auth_user_id IN (...)` | ✓ admin-read policy satisfied (helper runs after `requireAdmin()`) |
| `src/app/api/invite/accept/route.ts:83` | service-role (bypasses RLS) | upsert | ✓ unchanged |

## Files

| File | Action |
|---|---|
| `supabase/migrations/20260425000002_restrict_profiles_select.sql` | CREATE — DROP `USING (true)` + CREATE 2 new policies (own-row + admin-read) |
| `src/__tests__/rls-profiles-select.test.ts` | CREATE — assert unauthenticated client gets 0 rows; authenticated non-admin gets exactly 1 row (their own); authenticated admin gets all rows |
| `plans/sprint-27-profiles-rls-restriction.md` | CREATE (this file, ships with PR) |

No production code changes. No type changes (table schema unchanged).

## Migration SQL (locked, from Sentinel)

```sql
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
```

## Acceptance Criteria

1. Migration file `supabase/migrations/20260425000002_restrict_profiles_select.sql` exists with the SQL above (verbatim)
2. After migration applies to prod, `select * from public.profiles` from anon-key context returns 0 rows
3. Same query from authenticated non-admin user returns exactly 1 row (their own profile)
4. Same query from authenticated admin returns all rows
5. RLS test file `src/__tests__/rls-profiles-select.test.ts` covers the 3 cases above
6. All 4 verified read paths in `src/**` continue to work in prod after deploy
7. `/admin/trash` page still resolves Deleted-By names correctly (this was the read path that originally surfaced #244)

## Test Plan (Flux writes inline)

`src/__tests__/rls-profiles-select.test.ts` — integration test using Supabase test clients (anon, authenticated user, authenticated admin). Patterns:

1. **Anon client** (no session): `select * from profiles` returns `data: []` (0 rows)
2. **Authenticated non-admin** (test fixture user): `select * from profiles` returns 1 row (their own); column values match the test fixture
3. **Authenticated admin** (test fixture admin): `select * from profiles` returns all rows (or at least the seeded ones)

Reference the existing `src/__tests__/rls-self-promotion.test.ts` (Sprint 22) for the RLS-test pattern in this codebase. If that test uses real Supabase test instance via Vercel preview / local docker, follow the same setup. If it uses mocks, the test needs to be a real integration test (RLS policies can't be unit-tested).

If the existing RLS test pattern doesn't support these 3 client modes cleanly, document the gap in the PR and propose a follow-up Spec ticket. Don't block PR on it — the migration is what protects production.

## Watchdog Gate

Standard QA + the new `feedback_pr_body_verification_must_be_real.md` rule:
- Migration file diff verified character-for-character against Sentinel's locked SQL
- Test file genuinely exercises the 3 RLS modes (or documents the gap if Supabase test infra doesn't support it)
- After merge: Forge applies migration to prod via deploy-production.yml (auto-trigger on push to main with `supabase/migrations/**` path filter — same as Sprint 22 PR A)
- Forge verifies in prod: `SELECT count(*) FROM profiles` from anon-key client returns 0
- Forge verifies the `/admin/trash` page still resolves Deleted-By names

## PR Structure

Single Flux PR. Plan + migration + RLS test in one commit. Watchdog reviews. Forge merges. deploy-production.yml auto-applies migration to prod Supabase.

## Effort Estimate

| Work | Owner | Size | Estimate |
|---|---|---|---|
| Plan write | Forge | XS | 0 (this file) |
| Migration + RLS test | Flux | S | ~1h |
| Watchdog review | Watchdog | XS | ~15min |
| Apply migration to prod (auto via deploy-production.yml) | CI | XS | ~3min |
| Verify prod RLS state via Supabase query | Forge | XS | ~5min |

**Total wall-clock:** ~1.5h.

## Risks

- **`is_admin()` SECURITY DEFINER function must exist on prod.** Sentinel verified it does (defined in `20260415000001_fix_rls_recursion.sql`, already on main). If for any reason it's not deployed, the admin policy will fail. Flux verifies via Supabase MCP before opening PR.
- **Existing tests that hit `profiles` via anon-key may need updates.** Sentinel said "none of the 4 src/** call sites break" but didn't audit test files. Flux runs the full vitest suite — any failures triggered by RLS change get fixed inline.
- **Reversibility:** if the migration causes prod issues, revert is a one-commit `drop policy ... + create policy ... USING (true)` — back-out path is fast (~5min).
