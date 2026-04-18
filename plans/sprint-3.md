# Sprint 3 — Brand Polish + Auth + Data Integrity

**Sprint goal:** Apply the locked purple accent, close the committee invite gap with an admin/viewer RBAC model, and eliminate all known data-integrity and reliability holes before Stripe goes live.

**Target dates:** ~2 weeks from sprint start (5-month runway to September 2026)

**Baseline:** 130 tests passing, tsc clean, Stripe test-mode only. Photo seed and Stripe live-key flip deferred to ~1 week after Sprint 3.

---

## Research findings (verified before writing this plan)

- **Bare catches confirmed at 17**, not 16 (one additional in `src/lib/supabase/server.ts:21` — counts as a legitimate target). All 17 are in source (non-test) files.
- **SVG test already exists** at `src/__tests__/upload-photo.test.ts:287-293` in the "S2-7 gap coverage" describe block. The Watchdog flag from S2-6 is already resolved. Item 7 in the approved queue is **done — do not rework**.
- **`redirectTo` in middleware** (`src/lib/supabase/middleware.ts:45`): parameter is set on the login redirect but the login page (`src/app/auth/login/page.tsx`) never reads it. Not a live open-redirect (the parameter goes nowhere), but is an invitation to future bugs if anyone wires it naively. Fix: delete the `url.searchParams.set("redirectTo", ...)` line, or replace it with `safeRedirectPath()` if a login-redirect UX is desired.
- **Webhook partial-failure**: `stripe_events.insert` succeeds, then `teams.update` fails → returns 500 → Stripe retries → idempotency check sees 23505 → short-circuits with 200 → update is lost. Fix: add a `processed_at timestamptz` column to `stripe_events`, stamp it only after all downstream writes succeed. Idempotency check becomes: if row exists AND `processed_at IS NOT NULL`, short-circuit. If row exists but `processed_at IS NULL`, re-run downstream work (retry path is safe).
- **Session-cap race**: checkout reads count, then inserts — no transaction guard. Two concurrent requests can both read count < cap and both insert. Fix: wrap in a Postgres RPC (advisory lock or serializable transaction) or use `INSERT ... SELECT` with a count check inline.
- **`sold_count` trigger**: `sponsorship_items.sold_count` is set to 0 on insert and never incremented. Webhook marks the purchase paid but does not increment `sold_count`. Fix: either a DB trigger on `sponsorship_purchases` (when `payment_status` changes to `'paid'`, `UPDATE sponsorship_items SET sold_count = sold_count + 1 WHERE id = item_id`), or add the increment to the webhook handler after the purchase update.
- **Committee invites**: No invite table, no viewer role, no invite API. `profiles.role` CHECK constraint only allows `'admin'` and `'user'`. Adding `'viewer'` requires a migration. This is a 3-PR item: schema (Flux) → API + invite email (Flux) → Admin UI (Bolt). Breakdown recommended below.
- **`error.tsx`**: Zero exist in the codebase. Route segments that benefit most: `(public)`, `admin`, and the root `app/` level. Suggest starting with the 3 high-value placements rather than every leaf.
- **Leaderboard `revalidate`**: Page has no `export const revalidate` — it is currently dynamic (no-store). Adding `export const revalidate = 300` (5 minutes) is safe; scores only update when admin imports a CSV.
- **Gallery pagination**: `getApprovedPhotos()` fetches all photos with no `.range()` call. No `LIMIT`/`OFFSET`. Fine at current scale (zero approved photos), needs `.range()` before real photos land.

---

## Scope

### Group A — Brand Polish

---

#### Issue S3-1: Apply purple accent token

**Specialist:** Bolt  
**Effort:** small  
**Labels:** `feature`, `P1-high`, `size:S`

**Already built:** Token spec fully locked at `plans/design/accent-token-spec.md`. No design decisions remain.

**Files to touch:**
- `src/app/globals.css` — add `--purple`, `--purple-hover`, `--purple-muted`, `--purple-foreground` to `:root` and `.dark`; change `--ring` from `#5B8FA8` to `#6B5DB8` in `:root`, `#8B7DCC` in `.dark`; add `@theme inline` entries
- `src/app/page.tsx` — Donate CTA: `bg-purple text-purple-foreground hover:bg-purple-hover`; Become a Sponsor (outline): `border-purple/60 text-purple/80 hover:border-purple hover:text-purple hover:bg-purple-muted`; Register CTAs: no change
- `src/app/(public)/donate/page.tsx` — Donate Now CTA: purple fill
- `src/app/(public)/sponsorships/sponsorship-grid.tsx` — Become a Sponsor CTA: purple fill or outline per existing variant

**Acceptance criteria:**
- `--purple` (`#6B5DB8`), `--purple-hover` (`#5A4DA0`), `--purple-muted` (`#EEEAF8`), `--purple-foreground` (`#FFFFFF`) present in `:root`
- Dark variants present in `.dark` per spec
- `--ring` updated to `#6B5DB8` in `:root` and `#8B7DCC` in `.dark`
- Donate and Donate Now CTAs render with purple fill (`bg-purple`), white text
- Become a Sponsor outline CTA renders with purple border/text; solid variant uses `bg-purple`
- Register Your Team and Register to Play CTAs are visually unchanged (still teal)
- `tsc` clean, all 130 existing tests pass, no new bare catches

**Dependencies:** None. Can start immediately.

---

#### Issue S3-2: Leaderboard `revalidate` + gallery pagination

**Specialist:** Bolt  
**Effort:** small  
**Labels:** `chore`, `P2-medium`, `size:S`

**Files to touch:**
- `src/app/(public)/leaderboard/page.tsx` — add `export const revalidate = 300`
- `src/app/(public)/gallery/page.tsx` — add `.range(0, 23)` (first 24) to `getApprovedPhotos()`, pass `totalCount` to component for pagination controls
- `src/app/(public)/gallery/gallery-grid.tsx` — add client-side page navigation if more than 24 photos exist (URL-param approach: `?page=N`)

**Acceptance criteria:**
- `leaderboard/page.tsx` exports `revalidate = 300`; confirmed by reading the export in the built file (or by Watchdog inspection)
- `getApprovedPhotos()` uses `.range(offset, offset+23)` so only 24 photos fetch at a time
- Gallery renders page-navigation controls (Prev / Next or numbered) when `totalCount > 24`
- Navigation works: clicking Next loads the next 24; clicking Prev loads the previous 24
- Empty gallery still shows correct empty state
- `tsc` clean, all existing tests pass

**Dependencies:** None. Can run parallel with S3-1.

---

### Group B — Auth / RBAC

**Note on split:** The approved queue treats committee invites as one item. Research shows it spans schema, API, email delivery, and admin UI — minimum 3 PRs to avoid merge hell and keep each PR reviewable in <4h. Recommended split: S3-3 (schema + `viewer` role), S3-4 (invite API + email), S3-5 (admin invite UI). Scott must approve this split before builders start.

---

#### Issue S3-3: Schema — add `viewer` role + `invitations` table

**Specialist:** Flux + Sentinel review  
**Effort:** small  
**Labels:** `feature`, `P1-high`, `size:S`

**Files to touch:**
- `supabase/migrations/20260419000001_add_viewer_role_and_invitations.sql` (new)

**Migration contents:**
1. Alter `profiles.role` CHECK: `check (role in ('admin', 'viewer', 'user'))` — adds `'viewer'` as a valid value
2. Create `public.invitations` table:
   ```
   id uuid primary key default gen_random_uuid()
   email text not null
   role text not null default 'viewer' check (role in ('admin', 'viewer'))
   invited_by uuid not null references public.profiles(id) on delete set null
   token text not null unique default encode(gen_random_bytes(32), 'hex')
   expires_at timestamptz not null default now() + interval '7 days'
   accepted_at timestamptz
   created_at timestamptz not null default now()
   ```
3. Enable RLS on `invitations`
4. RLS policies: admin can insert/select/delete invitations; public can select by token (needed for accept-invite route)
5. Index on `invitations(token)` and `invitations(email)`

**Acceptance criteria:**
- `supabase db diff` shows only the new table and the altered CHECK constraint
- A user with `role = 'viewer'` can be inserted into `profiles` without violating the CHECK
- RLS: anon can select an invitation row by its token; non-admin authenticated users cannot list all invitations
- `tsc` clean (types regenerated from updated schema)
- Sentinel reviews before Watchdog

**Dependencies:** None. Can start immediately. S3-4 and S3-5 depend on this merging first.

---

#### Issue S3-4: Invite API + email delivery

**Specialist:** Flux  
**Effort:** medium  
**Labels:** `feature`, `P1-high`, `size:M`

**Decision locked (Scott 2026-04-19):** Use Supabase built-in via `supabase.auth.admin.inviteUserByEmail(email, { data: { role, invitation_id } })`. This sends a branded invite email with a signup link — no separate SMTP wiring, no third-party provider, no API key management. The `invitations` table still tracks role + status; Supabase handles the email send and the landing-page signup.

**Files to touch:**
- `src/app/api/invite/route.ts` (new) — POST endpoint, admin-only; inserts into `invitations` then calls `auth.admin.inviteUserByEmail()` with `invitation_id` in the metadata
- `src/app/api/invite/accept/route.ts` (new) — GET `?token=xxx` endpoint; validates the invitation token, creates/links profile with correct role, marks `accepted_at`. Triggered by the user following the Supabase invite link → completing signup → hitting this accept route via a server-side hook or explicit redirect
- (no separate `lib/email.ts` needed — Supabase admin client handles send)

**Acceptance criteria:**
- POST `/api/invite` with `{ email, role }` (admin auth required): inserts a row into `invitations`, calls `sendInviteEmail()`, returns 200
- POST `/api/invite` without admin auth: returns 403
- POST `/api/invite` with duplicate pending email (unexpired): returns 409 with message "Invite already pending for this email"
- GET `/api/invite/accept?token=xxx` with valid token: marks `accepted_at`, upserts a `profiles` row with the specified role, returns redirect to `/admin`
- GET `/api/invite/accept?token=xxx` with expired token: returns 400 with message "Invite has expired"
- GET `/api/invite/accept?token=xxx` with already-accepted token: returns 400 with message "Invite already accepted"
- Stub `sendInviteEmail()` logs the invite link to console (acceptable until email provider chosen)
- `tsc` clean, no new bare catches

**Dependencies:** S3-3 merged (needs `invitations` table and `viewer` role).

---

#### Issue S3-5: Admin invite UI

**Specialist:** Bolt  
**Effort:** medium  
**Labels:** `feature`, `P1-high`, `size:M`

**Files to touch:**
- `src/app/admin/settings/page.tsx` (new — currently the `settings/` directory exists but is empty)
- `src/app/admin/settings/invite-form.tsx` (new) — client component: email input + role selector (Admin / Viewer) + Send Invite button
- `src/components/admin/admin-sidebar.tsx` (modify) — add "Settings" nav link if not present

**Acceptance criteria:**
- `/admin/settings` renders without error when signed in as admin
- Invite form has: email input, role dropdown (Admin / Viewer), Send Invite button
- On success: inline success message with the invited email address
- On error (409 duplicate, network): inline error message, form remains populated
- Admin sidebar shows a "Settings" link that navigates to `/admin/settings`
- Non-admin users who somehow reach `/admin/settings` are redirected to `/auth/login` (enforced by `requireAdmin()` in `src/lib/supabase/admin.ts`)
- `tsc` clean, all existing tests pass

**Dependencies:** S3-4 merged (invite API must exist for the form to POST to).

---

### Group C — Security Fixes

---

#### Issue S3-6: Remove dead `redirectTo` from middleware

**Specialist:** Flux  
**Effort:** small  
**Labels:** `bug`, `P1-high`, `size:S`

**Problem:** `src/lib/supabase/middleware.ts:45` sets `url.searchParams.set("redirectTo", request.nextUrl.pathname)` on the login redirect. The login page (`src/app/auth/login/page.tsx`) never reads this parameter. The parameter is dead today, but if anyone adds a `?redirectTo=` reader to the login page without also routing it through `safeRedirectPath()`, it becomes an open redirect.

**Decision for builder:** Delete the `url.searchParams.set(...)` line entirely. Do NOT add a `safeRedirectPath()` consumer unless Scott explicitly asks for post-login redirect UX (it is not in the Sprint 3 scope).

**Files to touch:**
- `src/lib/supabase/middleware.ts` — delete line 45 (`url.searchParams.set("redirectTo", request.nextUrl.pathname)`)

**Acceptance criteria:**
- `middleware.ts` no longer sets any `redirectTo` (or equivalent) search param on the login redirect URL
- Unauthenticated requests to `/admin` still redirect to `/auth/login` (behavior unchanged — only the extra param is removed)
- `tsc` clean

**Dependencies:** None. Standalone 1-file change.

---

### Group D — Data Integrity

---

#### Issue S3-7: Webhook partial-failure fix — `processed_at` stamp

**Specialist:** Flux + Sentinel review  
**Effort:** medium  
**Labels:** `bug`, `P1-high`, `size:M`

**Problem:** `stripe_events.insert` succeeds → downstream `teams.update` fails → handler returns 500 → Stripe retries → idempotency check hits 23505 duplicate key → short-circuits with 200 → `teams.update` is permanently skipped. The fix is to stamp `processed_at` only after all downstream writes succeed, so the idempotency retry path knows whether prior processing completed.

**Files to touch:**
- `supabase/migrations/20260419000002_stripe_events_processed_at.sql` (new) — `ALTER TABLE stripe_events ADD COLUMN processed_at timestamptz;`
- `src/app/api/webhooks/stripe/route.ts` — change idempotency logic:
  1. Attempt `insert into stripe_events(id) values (event.id)`. If 23505 and existing row has `processed_at IS NOT NULL` → short-circuit 200. If 23505 and `processed_at IS NULL` → prior attempt failed mid-way, fall through to re-run downstream work. Any other insert error → 500.
  2. After all downstream writes succeed, `UPDATE stripe_events SET processed_at = now() WHERE id = event.id`.
- `src/__tests__/webhook-idempotency.test.ts` — update mock expectations to cover the partial-failure retry path

**Acceptance criteria:**
- If `stripe_events` insert returns 23505 AND a select on that row shows `processed_at IS NOT NULL`: handler returns 200 immediately (fully processed duplicate)
- If `stripe_events` insert returns 23505 AND `processed_at IS NULL`: handler re-runs downstream writes (partial failure recovery)
- After all downstream writes succeed, `processed_at` is stamped
- `teams.update` failure after a successful `stripe_events.insert` leaves `processed_at = NULL` on the `stripe_events` row, so the next Stripe retry re-runs the update
- `tsc` clean, no new bare catches
- Sentinel reviews migration and route change before Watchdog

**Dependencies:** None. Can start parallel with other Flux work, but touches `route.ts` — must not overlap with any other branch modifying that file.

---

#### Issue S3-8: `sponsorship_items.sold_count` trigger

**Specialist:** Flux  
**Effort:** small  
**Labels:** `bug`, `P2-medium`, `size:S`

**Problem:** `sold_count` is initialized at 0 and never incremented. The "Sold Out" check on the sponsorship page gates on `sold_count >= max_quantity`, which is always false because `sold_count` never moves.

**Approach:** DB trigger on `sponsorship_purchases` — when a row's `payment_status` is updated to `'paid'`, increment `sponsorship_items.sold_count` by 1. Use a DB trigger rather than application code so it fires regardless of which path marks the purchase paid (webhook, admin manual comping, etc.).

**Files to touch:**
- `supabase/migrations/20260419000003_sold_count_trigger.sql` (new)

**Migration contents:**
```sql
create or replace function public.increment_sold_count()
returns trigger language plpgsql as $$
begin
  if NEW.payment_status = 'paid' and (OLD.payment_status is distinct from 'paid') then
    update public.sponsorship_items
    set sold_count = sold_count + 1
    where id = NEW.item_id;
  end if;
  return NEW;
end;
$$;

create trigger on_sponsorship_purchase_paid
  after update of payment_status on public.sponsorship_purchases
  for each row execute function public.increment_sold_count();
```

**Acceptance criteria:**
- `supabase db diff` shows only the function and trigger (no unintended table changes)
- After a `sponsorship_purchases` row is updated from `pending` to `paid`, the related `sponsorship_items.sold_count` increments by 1
- Updating `payment_status` from `paid` to `paid` (no-op) does NOT double-increment
- Updating non-`payment_status` columns on a paid row does NOT increment
- `tsc` clean

**Dependencies:** None. Standalone migration only.

---

#### Issue S3-9: Session-cap race transaction

**Specialist:** Flux  
**Effort:** medium  
**Labels:** `bug`, `P2-medium`, `size:M`

**Problem:** `handleRegistrationCheckout` in `src/app/api/checkout/route.ts` reads `count` from `teams` then inserts a new team — two separate operations. Two concurrent requests can both read `count < cap` and both insert, overselling the session.

**Fix:** Wrap the count-check and insert in a Postgres RPC function using an advisory lock or a `FOR UPDATE` pattern to serialize concurrent requests. Alternative: use a `serializable` transaction via Supabase `rpc()`. Recommended implementation: a `register_team` RPC that takes all team fields and returns the new team id or an error code, so the count-check and insert happen atomically in Postgres.

**Files to touch:**
- `supabase/migrations/20260419000004_register_team_rpc.sql` (new) — the `register_team(...)` function with advisory lock or serializable isolation
- `src/app/api/checkout/route.ts` — replace the count-check + insert sequence with a single `supabase.rpc('register_team', {...})` call

**Acceptance criteria:**
- Two concurrent POST requests for the same session when `count === cap - 1` result in exactly one successful team insert and one rejection (400: "session full")
- The RPC returns a structured error code for "session full" that the route handler maps to a 400 response
- Non-concurrent happy path (count < cap, single request) continues to work correctly
- `tsc` clean, no new bare catches

**Dependencies:** S3-7 should merge before S3-9 if both touch `route.ts`. Check file overlap — if S3-7 is still in flight when S3-9 starts, S3-9 builder must rebase on S3-7's branch.

---

### Group E — Reliability Polish

---

#### Issue S3-10: Log all 17 bare catches

**Specialist:** Bolt (UI components) + Flux (server files)  
**Effort:** small  
**Labels:** `chore`, `P3-low`, `size:S`

**Current bare catches (verified 17 total):**

Bolt owns (client components):
- `src/app/auth/login/page.tsx` (lines 44, 59) — intentional: swallows redirect throws. These are the one legitimate case; keep them as-is with an explanatory comment (already have one on line 44, add one on line 59).
- `src/app/admin/scores/score-manager.tsx` (lines 54, 75)
- `src/app/admin/sponsors/sponsor-list.tsx` (lines 49, 66, 81)
- `src/app/admin/sponsorships/sponsorship-manager.tsx` (lines 54, 71, 86)
- `src/app/admin/event/event-settings-form.tsx` (line 44)
- `src/app/admin/registrations/registration-list.tsx` (lines 52, 67)
- `src/app/(public)/gallery/gallery-grid.tsx` (line 66)
- `src/app/(public)/register/registration-form.tsx` (line 100)
- `src/app/(public)/sponsorships/sponsorship-grid.tsx` (line 127)

Flux owns (server files):
- `src/lib/supabase/server.ts` (line 21)

**Fix pattern:** `catch (err) { console.error('[ComponentName] operation failed:', err); /* existing error handling */ }`. Do NOT change error handling behavior — only add the log.

**Split recommendation:** Bolt handles all the client components in one PR. Flux handles `server.ts` in a separate micro-PR (or bundles into another Flux PR in this sprint). If there is file overlap with other sprint PRs, serialize accordingly.

**Files to touch (Bolt PR):**
- `src/app/admin/scores/score-manager.tsx`
- `src/app/admin/sponsors/sponsor-list.tsx`
- `src/app/admin/sponsorships/sponsorship-manager.tsx`
- `src/app/admin/event/event-settings-form.tsx`
- `src/app/admin/registrations/registration-list.tsx`
- `src/app/(public)/gallery/gallery-grid.tsx`
- `src/app/(public)/register/registration-form.tsx`
- `src/app/(public)/sponsorships/sponsorship-grid.tsx`

**Files to touch (Flux micro-PR):**
- `src/lib/supabase/server.ts`

**Acceptance criteria:**
- `grep -rn "catch {" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__"` returns only the 2 intentional catches in `login/page.tsx` (with comments explaining why they're silent)
- No behavior change — only logging added
- `tsc` clean

**Dependencies:** Bolt PR can run parallel with S3-1 only if Bolt carefully checks file overlap. `sponsorship-grid.tsx` is also touched by S3-1 (purple accent). These two must be serialized — S3-1 merges first, then S3-10 Bolt PR rebases.

---

#### Issue S3-11: `error.tsx` per route segment

**Specialist:** Bolt  
**Effort:** small  
**Labels:** `chore`, `P2-medium`, `size:S`

**Scope:** Create `error.tsx` files at the 3 most valuable segments. Not every leaf — a boundary at `(public)`, `admin`, and root `app/` covers all public and admin surfaces without redundancy.

**Files to touch (all new):**
- `src/app/error.tsx` — root-level error boundary (catches anything not caught by nested boundaries)
- `src/app/(public)/error.tsx` — public marketing pages
- `src/app/admin/error.tsx` — admin panel

**Each `error.tsx` pattern:**
```tsx
"use client";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center px-4">
      <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
      <p className="text-muted-foreground text-sm">We hit an unexpected error. Please try again.</p>
      <button onClick={reset} className="text-sm text-primary underline">Try again</button>
    </div>
  );
}
```

Public `(public)/error.tsx` should use brand styling (teal Try Again link). Admin `admin/error.tsx` can be plain. Root `app/error.tsx` is the fallback.

**Acceptance criteria:**
- `src/app/error.tsx`, `src/app/(public)/error.tsx`, and `src/app/admin/error.tsx` all exist
- Each is a `"use client"` component accepting `{ error, reset }` props
- Each calls `console.error(error)` in a `useEffect`
- Each renders a user-facing message and a "Try again" button calling `reset()`
- `tsc` clean

**Dependencies:** None. Can run after S3-1 merges (no file overlap, but good practice to not have too many Bolt PRs in flight on overlapping directories).

---

## Item 7 disposition — SVG rejection test

The approved queue listed "explicit SVG rejection test (Watchdog flag from S2-6)" as item 7. **Research shows this test already exists.** `src/__tests__/upload-photo.test.ts` lines 287-293 contain:

```
describe("SVG and other rejected types", () => {
  it("returns 400 for image/svg+xml (explicit SVG rejection)", ...)
```

The test passes in the current 130-test baseline. No work needed. Removing from sprint scope and noting as already done.

---

## Execution Order

```
Phase 1 — Parallel (no file overlap across builders):

  S3-1   [Bolt]   feat/purple-accent
         Files: globals.css, page.tsx (root), donate/page.tsx, sponsorships/sponsorship-grid.tsx

  S3-2   [Bolt]   chore/leaderboard-revalidate-gallery-pagination
         Files: leaderboard/page.tsx, gallery/page.tsx, gallery/gallery-grid.tsx

  S3-3   [Flux]   feat/viewer-role-invitations-schema
         Files: migrations/20260419000001_*

  S3-6   [Flux]   fix/dead-redirect-to
         Files: middleware.ts

  S3-7   [Flux]   fix/webhook-processed-at  ← Sentinel reviews first, then Watchdog
         Files: migrations/20260419000002_*, webhooks/stripe/route.ts, webhook-idempotency.test.ts

  S3-8   [Flux]   fix/sold-count-trigger
         Files: migrations/20260419000003_*

  S3-9   [Flux]   fix/session-cap-rpc   ← Depends on S3-7 if route.ts is still open
         Files: migrations/20260419000004_*, src/app/api/checkout/route.ts

  NOTE: S3-7 and S3-9 both touch checkout/webhook routes — run them serial if any overlap.
        S3-7 touches webhooks/stripe/route.ts; S3-9 touches api/checkout/route.ts.
        These are DIFFERENT files — they can run in parallel. No conflict.

Phase 2 — After S3-1 merges:

  S3-10  [Bolt]   chore/bare-catches
         Files: 8 admin/public client components (NOT sponsorship-grid.tsx until S3-1 is merged)
         NOTE: sponsorship-grid.tsx is touched by both S3-1 and S3-10. S3-1 must merge first.

Phase 3 — After S3-3 merges:

  S3-4   [Flux]   feat/invite-api
         Files: api/invite/route.ts, api/invite/accept/route.ts, lib/email.ts

Phase 4 — After S3-4 merges:

  S3-5   [Bolt]   feat/admin-invite-ui
         Files: admin/settings/page.tsx, admin/settings/invite-form.tsx, components/admin/admin-sidebar.tsx

Phase 5 — Can start after Phase 1 settles:

  S3-11  [Bolt]   chore/error-boundaries
         Files: app/error.tsx, app/(public)/error.tsx, app/admin/error.tsx
         NOTE: no file overlap with any other sprint issue — can run any time after Phase 1.

Flux server.ts micro-fix (bare catch in src/lib/supabase/server.ts):
  Bundle into S3-6 PR (same Flux, server file, tiny change) or open as its own micro-PR.
  Forge decides at build time based on S3-6 PR size.
```

**Conflict zones:**
- `sponsorships/sponsorship-grid.tsx`: touched by S3-1 (purple) AND S3-10 (bare catches). Serial — S3-1 first.
- `webhooks/stripe/route.ts`: touched by S3-7 only.
- `api/checkout/route.ts`: touched by S3-9 only.
- `middleware.ts`: touched by S3-6 only.
- All migration files are unique — no conflicts.

**Watchdog review required on every PR. Sentinel required before Watchdog on S3-3 (migration + RLS) and S3-7 (migration + webhook auth logic).**

---

## Total estimated builder time

| Issue | Specialist | Estimate |
|---|---|---|
| S3-1 Purple accent | Bolt | 2h |
| S3-2 Revalidate + pagination | Bolt | 2h |
| S3-3 Schema (viewer + invitations) | Flux + Sentinel | 2h |
| S3-4 Invite API + email | Flux | 3h |
| S3-5 Admin invite UI | Bolt | 2h |
| S3-6 Dead redirectTo cleanup | Flux | 0.5h |
| S3-7 Webhook processed_at fix | Flux + Sentinel | 3h |
| S3-8 sold_count trigger | Flux | 1h |
| S3-9 Session-cap RPC | Flux | 3h |
| S3-10 Bare catches | Bolt | 2h |
| S3-11 error.tsx | Bolt | 1h |
| **Total** | | **~21h** |

With Bolt and Flux running in parallel in Phase 1 (5 issues), effective wall-clock time is roughly 7–10 hours of parallel work.

---

## Definition of Done (per issue)

1. PR open against `origin/main` with correct branch name
2. `tsc` passes (no type errors)
3. All 130+ existing tests pass; new tests pass
4. Acceptance criteria verifiable in the running app or test output
5. Sentinel has reviewed S3-3 and S3-7 first
6. Watchdog has reviewed and approved (formal GitHub approval from forge-watchdog)
7. PR merged to `origin/main` by scottdavenport
8. Staging deploy confirmed green (auto-deploys on merge via `deploy.yml`)

Sprint is complete when all 11 issues meet the above AND Scott sanity-checks on Vercel staging.

---

## Open Questions (Scott must decide before builders start)

**OQ-1 — Email provider for invite emails — RESOLVED 2026-04-19**
Scott chose **Supabase built-in** via `auth.admin.inviteUserByEmail()`. S3-4 uses this directly — no Resend, no SMTP, no `lib/email.ts` adapter.

**OQ-2 — Viewer role permissions — RESOLVED 2026-04-19**
Scott chose **read-only admin**. A `viewer` can SELECT across all admin-visible tables (registrations, scores, contacts, sponsorships, settings) but cannot INSERT/UPDATE/DELETE anything. RLS pattern: add `role IN ('admin', 'viewer')` to SELECT policies, keep write policies admin-only.

**OQ-3 — Leaderboard revalidate value — DEFAULT (unresolved, non-blocking)**
Ships with `revalidate = 300` (5 min). Not admin-configurable in Sprint 3. Separate issue if Scott wants admin control later (e.g. set to 0 during live tournament day).

---

## Risks and Unknowns

1. **Invite email provider undecided (OQ-1).** S3-4 can stub `sendEmail()` (log to console), allowing S3-5 UI to be built and tested. But the real invite flow cannot be verified end-to-end until a provider is chosen. If Resend is approved, Flux can integrate it in S3-4 directly — ~30 min of additional work.

2. **`profiles.role` CHECK alteration on production.** Changing a CHECK constraint requires the migration to run cleanly against the live `profiles` table. If any existing rows have roles outside `{admin, user, viewer}` (they shouldn't — only `admin` and `user` are currently valid), the migration will fail. Flux must verify on staging before production. Likely safe, but flag it.

3. **Session-cap RPC complexity (S3-9).** The RPC approach moves business logic into Postgres. If Supabase's JS client has limitations on passing complex types to RPC, the builder may need to use a simpler approach (serializable `BEGIN/COMMIT` via raw SQL). The acceptance criteria is behavioral — the implementation can adapt. Flag any type-generation issues to Forge before proceeding.

4. **`sponsorship-grid.tsx` serial dependency.** If S3-1 (purple) is delayed for any reason, S3-10 (bare catches) on that file is also delayed. Mitigation: Bolt can do S3-10 on all OTHER files first and handle `sponsorship-grid.tsx` last, after S3-1 merges.

5. **`processed_at` migration on live `stripe_events` table.** Adding a nullable column is safe and non-destructive. However, existing rows (from Stripe test-mode events) will have `processed_at = NULL`. The updated idempotency logic treats `NULL` as "incomplete" — a prior event that never got `processed_at` stamped would be re-processed on the next delivery. In practice, test-mode events don't get re-delivered after hours/days, so this is safe. Worth calling out for Sentinel to verify.

6. **Item 7 (SVG rejection test) is already done.** It is NOT in the sprint build queue. If Forge or Scott see it listed elsewhere, disregard — no builder work needed.

7. **Bare catch count is 17, not 16.** The original Sprint 1 audit counted 16; `server.ts` was added or missed. Current verified count is 17. S3-10 accounts for all 17.
