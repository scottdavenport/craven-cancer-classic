# Sprint 2 — Stripe Hardening + Security Baseline

**Sprint goal:** Harden all four Stripe-critical paths so Scott can safely flip to live keys, and close the two auth/upload security holes.

**Target dates:** ~2 weeks from sprint start (no hard deadline — 5-month runway)

**Specialists:** Flux (migrations + API routes), Bolt (UI only if needed), Spec (test coverage), Sentinel (security review)

---

## Sprint 1 state confirmed

All 6 PRs are merged on `origin/main` at commit `60aa363` (PR #6 — Photos). Sprint 2 branches from that point. The Unsplash `remotePatterns` entry is still in `next.config.ts` tagged TEMPORARY — will be removed when Scott runs the seed with real photos (not a Sprint 2 issue; housekeeping follow-up).

---

## Out of Scope — Sprint 3+

These items are deferred. Reason noted for each.

| Item | Reason deferred |
|---|---|
| **Committee invites + admin/viewer roles (#8)** | Requires schema design decision (invite flow, 'viewer' CHECK value), Supabase email integration, and admin UI — 3+ day effort. P1 but not Stripe-blocking. Sprint 3. |
| **Purple accent token (#9)** | Pixel has not produced the token spec. Bolt cannot implement without it. Phase: Pixel spec in Sprint 2, Bolt applies in Sprint 3. |
| **`sold_count` trigger (#10)** | P2. No customer impact until tournament. Sprint 3. |
| **Session-cap race condition (#11)** | P2. Not on the critical path; low probability at current registration volume. Sprint 3. |
| **Money standardization — bigint migration (#12)** | High-risk, multi-table migration. Needs its own sprint with staging validation. Sprint 4+. |
| **Leaderboard revalidate + gallery pagination (#13)** | P2 performance. Tournament is 5 months away. Sprint 3. |
| **16 bare catches in legacy code (#14)** | P3 housekeeping. Sprint 3 or ongoing. |
| **`error.tsx` per route segment (#15)** | P2 polish. Sprint 3. |
| **`registration_fee` rename consistency check (#17)** | Already done: migration `20260416000002` added `registration_fee_cents`. Column name is correct on origin/main. No action needed. |

---

## Issues

---

### Issue S2-1: Fix sponsorship checkout — server-side price fetch

**Effort:** S  
**Specialist:** Flux  
**Parallelism:** Runs parallel with S2-2, S2-3, S2-4 (different files)

**Problem:** `src/app/api/checkout/route.ts:209` passes `unit_amount: price_cents` taken directly from the request body. A client can set any price and Stripe will charge exactly that. Registration already does this correctly via a server-side lookup.

**Fix:** In `handleSponsorshipCheckout`, after parsing `item_id` from the request body, fetch `sponsorship_items` by that `item_id` from Supabase server-side. Use the returned `price` column (in cents, converted: `Math.round(item.price * 100)`) as `unit_amount`. Ignore the client-supplied `price_cents` entirely. If no item is found or item is inactive, return 400.

**Acceptance criteria:**
- [ ] `unit_amount` in the Stripe session is sourced from `sponsorship_items.price` fetched by `item_id`, not from request body
- [ ] Request with a tampered `price_cents` (e.g., `1`) still creates a Stripe session at the correct DB price
- [ ] Request with a non-existent `item_id` returns 400
- [ ] `tsc` clean, no new lint warnings

**Affected files:**
- `src/app/api/checkout/route.ts` (modify `handleSponsorshipCheckout`)

**Dependencies:** None

**Builder notes:**
- Branch from `origin/main`: `git fetch origin && git checkout -b fix/checkout-server-price origin/main`
- Read `node_modules/next/dist/docs/` before writing Next patterns
- Push as **scottdavenport**
- The `sponsorship_items.price` column is `numeric(10,2)` — multiply by 100 and `Math.round()` to get cents

---

### Issue S2-2: Fix webhook DB-error silent failures

**Effort:** S  
**Specialist:** Flux  
**Parallelism:** Runs parallel with S2-1, S2-3, S2-4 (different files)

**Problem:** `src/app/api/webhooks/stripe/route.ts:54-61` and `85-93` call `.update()` with no error check. If the DB write fails, Stripe receives 200, records a successful delivery, and never retries. The team or purchase stays `pending` while the customer is charged.

**Fix:** Destructure `{ error }` from both `.update()` calls. If error is non-null, `console.error` with event id and return `NextResponse.json({ error: 'db_update_failed' }, { status: 500 })`. Stripe will retry on 5xx. Apply the same check to the `contacts.upsert` on line ~71 (secondary failure — log and continue; do not fail the webhook for a contact upsert error).

**Acceptance criteria:**
- [ ] Both `teams.update` and `sponsorship_purchases.update` destructure and check `error`
- [ ] A DB update failure returns HTTP 500 (Stripe retries)
- [ ] A `contacts.upsert` failure is logged but does NOT return 500 (non-critical path)
- [ ] `tsc` clean

**Affected files:**
- `src/app/api/webhooks/stripe/route.ts`

**Dependencies:** None

**Builder notes:**
- Branch from `origin/main`: `git fetch origin && git checkout -b fix/webhook-db-errors origin/main`
- Read `node_modules/next/dist/docs/` before writing Next patterns
- Push as **scottdavenport**
- Do NOT return 500 for the contacts upsert — that would cause Stripe to retry and double-charge

---

### Issue S2-3: Webhook idempotency — stripe_events dedupe table

**Effort:** M  
**Specialist:** Flux  
**Parallelism:** Runs parallel with S2-1, S2-2, S2-4; must complete before S2-7 (spec coverage)

**Problem:** The webhook has no event-level deduplication. Stripe can deliver `checkout.session.completed` multiple times (network retries, Stripe's at-least-once guarantee). Each delivery updates payment status and potentially creates a contact. No unique index on `stripe_payment_id` either.

**Fix:**
1. Migration: create `stripe_events(id text primary key, received_at timestamptz not null default now())`. Add `unique` indexes on `teams.stripe_payment_id` and `sponsorship_purchases.stripe_payment_id` (both currently nullable — unique index on non-null values: `create unique index ... where stripe_payment_id is not null`).
2. Webhook handler: at the top of the `checkout.session.completed` block, attempt `insert into stripe_events(id) values (event.id)`. If insert fails (duplicate key), short-circuit with `return NextResponse.json({ received: true })`. Use the service-role client.

**Acceptance criteria:**
- [ ] Migration file exists: `supabase/migrations/20260418000001_webhook_idempotency.sql`
- [ ] Migration creates `stripe_events` table with `id text primary key`
- [ ] Migration adds `unique index` on `teams.stripe_payment_id where stripe_payment_id is not null`
- [ ] Migration adds `unique index` on `sponsorship_purchases.stripe_payment_id where stripe_payment_id is not null`
- [ ] Webhook handler inserts into `stripe_events` before processing; duplicate event id returns 200 immediately without updating DB records
- [ ] `tsc` clean

**Affected files:**
- `supabase/migrations/20260418000001_webhook_idempotency.sql` (new)
- `src/app/api/webhooks/stripe/route.ts`

**Dependencies:** S2-2 should merge first (the two files overlap — serial to avoid conflict)

**Builder notes:**
- Branch from `origin/main`: `git fetch origin && git checkout -b fix/webhook-idempotency origin/main`
- Read `node_modules/next/dist/docs/` before writing Next patterns
- Push as **scottdavenport**
- If S2-2 has not merged yet, rebase this branch on top of S2-2's branch to avoid conflicts on `route.ts`

---

### Issue S2-4: Wire registration checkout to event_settings.registration_fee_cents

**Effort:** S  
**Specialist:** Flux  
**Parallelism:** Runs parallel with S2-1, S2-2 (no file overlap); shares `route.ts` with S2-3, so serial after S2-3 merges OR rebase

**Problem:** `src/app/api/checkout/route.ts:129` uses `REGISTRATION_PRICE_CENTS` (hardcoded `70000`) as the Stripe `unit_amount`. The admin can edit the fee in `event_settings.registration_fee_cents` but that value is never passed to Stripe. Admin fee changes have zero effect until this is wired.

**Fix:** In `handleRegistrationCheckout`, the code already queries `event_settings` by year for `registration_open`. Extend the select to include `registration_fee_cents`. Use `eventSettings.registration_fee_cents ?? REGISTRATION_PRICE_CENTS` as `unit_amount`. Keep `REGISTRATION_PRICE_CENTS` as the fallback only.

**Acceptance criteria:**
- [ ] `unit_amount` in the registration Stripe session uses `event_settings.registration_fee_cents` when present
- [ ] Falls back to `REGISTRATION_PRICE_CENTS` if column is null (defensive)
- [ ] If `event_settings` row is missing entirely, behavior is unchanged (still returns 400 for closed registration)
- [ ] `tsc` clean

**Affected files:**
- `src/app/api/checkout/route.ts`

**Dependencies:** Can run parallel with S2-1 and S2-2. Shares `route.ts` with S2-3 — if S2-3 is in flight, rebase on top of S2-3's branch.

**Builder notes:**
- Branch from `origin/main`: `git fetch origin && git checkout -b fix/checkout-fee-wire origin/main`
- Read `node_modules/next/dist/docs/` before writing Next patterns
- Push as **scottdavenport**
- The `event_settings` select already exists in `handleRegistrationCheckout` — just extend the column list

---

### Issue S2-5: Fix open redirect on auth callback

**Effort:** S  
**Specialist:** Flux  
**Parallelism:** Runs parallel with S2-1 through S2-4 (no file overlap)

**Problem:** `src/app/auth/callback/route.ts:7-12` — the `next` query param is concatenated to `origin` with no validation. An attacker can craft a link like `?next=//evil.com` and redirect authenticated users off-site after login.

**Fix:** Validate that `next`: (1) is a non-empty string, (2) starts with `/`, (3) does NOT start with `//`. If validation fails, default to `/admin`. One-liner guard before the redirect.

**Acceptance criteria:**
- [ ] `next=//evil.com` redirects to `/admin` instead
- [ ] `next=/admin/registrations` redirects correctly to `/admin/registrations`
- [ ] `next=` (empty) redirects to `/admin`
- [ ] `tsc` clean

**Affected files:**
- `src/app/auth/callback/route.ts`

**Dependencies:** None

**Builder notes:**
- Branch from `origin/main`: `git fetch origin && git checkout -b fix/auth-redirect origin/main`
- Read `node_modules/next/dist/docs/` before writing Next patterns
- Push as **scottdavenport**

---

### Issue S2-6: MIME validation on photo upload

**Effort:** S  
**Specialist:** Flux  
**Parallelism:** Runs parallel with all other Sprint 2 issues (unique file)

**Problem:** `src/app/api/upload-photo/route.ts:30` derives the file extension from `file.name` (user-controlled). A user can upload `evil.html` renamed to `evil.jpg`, or set `file.name = 'xss.html'`. The file is stored in the public `photos` bucket and served at a public URL, enabling stored XSS.

**Fix:** Validate `file.type` against an allowlist before the upload. Allowlist: `['image/jpeg', 'image/png', 'image/webp', 'image/gif']`. Derive the extension from `file.type` (a server-side map) rather than from `file.name`. Return 400 if `file.type` is not in the allowlist.

**Acceptance criteria:**
- [ ] Upload with `file.type = 'text/html'` returns 400 with error message "Invalid file type"
- [ ] Upload with `file.type = 'image/jpeg'` succeeds
- [ ] Upload with `file.type = 'image/png'` succeeds
- [ ] Extension stored in Supabase is derived from `file.type`, not `file.name`
- [ ] `tsc` clean

**Affected files:**
- `src/app/api/upload-photo/route.ts`

**Dependencies:** None

**Builder notes:**
- Branch from `origin/main`: `git fetch origin && git checkout -b fix/upload-mime-validation origin/main`
- Read `node_modules/next/dist/docs/` before writing Next patterns
- Push as **scottdavenport**
- MIME-to-extension map: `{ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }`

---

### Issue S2-7: Spec — test coverage for checkout, webhook, auth callback, upload

**Effort:** M  
**Specialist:** Spec  
**Parallelism:** Serial AFTER S2-1, S2-2, S2-3, S2-4, S2-5, S2-6 all merge (tests must match final behavior)

**Problem:** These routes have zero test coverage today. Combined they are the entire money-handling surface of the app.

**Scope:**
- `src/app/api/checkout/route.ts` — registration path (fee from DB, fallback, session-full) + sponsorship path (server-side price fetch, invalid item_id)
- `src/app/api/webhooks/stripe/route.ts` — registration paid (updates team, creates contact), sponsorship paid (updates purchase), duplicate event id short-circuits, DB error returns 500
- `src/app/auth/callback/route.ts` — valid `next`, open-redirect attempts, missing code
- `src/app/api/upload-photo/route.ts` — valid JPEG upload, blocked HTML upload, missing name

**Acceptance criteria:**
- [ ] New test file: `src/__tests__/checkout-route.test.ts` with coverage for all cases above
- [ ] New test file: `src/__tests__/webhook-stripe.test.ts` with idempotency, DB-error, and both payment types
- [ ] New test file: `src/__tests__/auth-callback.test.ts` with redirect validation cases
- [ ] New test file: `src/__tests__/upload-photo.test.ts` with MIME allowlist cases
- [ ] All 59 existing tests still pass + new tests pass
- [ ] `tsc` clean

**Affected files:**
- `src/__tests__/checkout-route.test.ts` (new)
- `src/__tests__/webhook-stripe.test.ts` (new)
- `src/__tests__/auth-callback.test.ts` (new)
- `src/__tests__/upload-photo.test.ts` (new)

**Dependencies:** S2-1 through S2-6 all merged

**Builder notes:**
- Branch from `origin/main` AFTER all S2-1—S2-6 PRs are merged: `git fetch origin && git checkout -b test/s2-coverage origin/main`
- Read `node_modules/next/dist/docs/` before writing Next patterns
- Push as **scottdavenport**
- Mock Stripe and Supabase clients — do not hit real APIs in tests
- Reuse existing mock patterns from `src/__tests__/` for Supabase client mocking

---

### Issue S2-8: Pixel — purple accent token spec

**Effort:** S  
**Specialist:** Pixel  
**Parallelism:** Runs parallel with all builder issues. Output gates Sprint 3 Bolt work.

**Problem:** Raw queue item #9 specifies a purple accent token to be applied across key CTAs/links. Teal stays primary. Bolt cannot pick colors — a token spec must exist before any implementation.

**Deliverable:** A written token spec (can be a `plans/design/accent-token-spec.md`) covering:
- Exact hex value for the purple accent (with accessible contrast ratios against the site's navy/white/gold backgrounds)
- Token name (e.g., `--color-accent-purple`) and where it slots into the existing Tailwind 4 config
- Which specific UI elements adopt it (CTAs, links, focus rings, etc.) and which stay teal
- Dark mode variant if applicable

**Acceptance criteria:**
- [ ] Spec file exists at `plans/design/accent-token-spec.md`
- [ ] Hex value provided with WCAG contrast ratio against the two primary backgrounds (navy `#1B2A4A` and white `#FFFFFF`)
- [ ] Explicit list of UI elements that adopt purple vs. stay teal
- [ ] No code changes — spec only

**Affected files:**
- `plans/design/accent-token-spec.md` (new)

**Dependencies:** None. Does not block Sprint 2. Gates Sprint 3 Bolt issue.

---

## Execution Order

```
Phase 1 — Parallel (no file overlap):
  S2-1  fix/checkout-server-price      → src/app/api/checkout/route.ts
  S2-2  fix/webhook-db-errors          → src/app/api/webhooks/stripe/route.ts
  S2-5  fix/auth-redirect              → src/app/auth/callback/route.ts
  S2-6  fix/upload-mime-validation     → src/app/api/upload-photo/route.ts
  S2-8  pixel/accent-token-spec        → plans/design/ only (no code)

Phase 2 — Serial (depends on Phase 1):
  S2-3  fix/webhook-idempotency        → route.ts (overlaps S2-2) + new migration
        → Wait for S2-2 to merge, then rebase S2-3 on origin/main

Phase 3 — Serial (depends on Phase 2):
  S2-4  fix/checkout-fee-wire          → route.ts (overlaps S2-1 and S2-3)
        → Wait for S2-1 and S2-3 to merge, then rebase S2-4 on origin/main

Phase 4 — Serial (all prior merged):
  S2-7  test/s2-coverage               → new test files only, no prod file overlap
        → Start only after S2-1 through S2-6 all merged to origin/main
```

**Conflict zones:**
- `src/app/api/checkout/route.ts` is touched by S2-1, S2-3, S2-4 — must be serial (S2-1 first, then S2-3, then S2-4)
- `src/app/api/webhooks/stripe/route.ts` is touched by S2-2 and S2-3 — S2-2 before S2-3

**Total estimated builder time:** 10-14 hours across all issues  
**Parallelism available:** Up to 4 builders in Phase 1

---

## Definition of Done (per issue)

An issue is done when ALL of the following are true:
1. PR is open against `origin/main` with the correct branch name
2. `tsc` passes (no type errors)
3. All existing tests pass (59 baseline + any new)
4. Acceptance criteria are all checkable in the running app or test output
5. Watchdog has reviewed and approved the PR
6. Sentinel has reviewed S2-3 (migration) and S2-5 (auth) — security surface
7. PR merged to `origin/main` by scottdavenport

---

## Risks

1. **S2-3 migration on Supabase production.** `stripe_events` is a new table; partial unique indexes on `teams` and `sponsorship_purchases` could fail if duplicate `stripe_payment_id` values already exist (they shouldn't in test mode, but verify). Run migration on staging first, inspect for errors before prod.

2. **PR #6 unmerged.** If Scott defers PR #6, the `feat/photos-placeholders` branch will diverge further from main as Sprint 2 merges land. Rebase cost grows each sprint. Recommend merging it before Sprint 2 starts.

3. **Stripe in test mode.** All P0 fixes are untestable end-to-end until Scott flips to live keys. Spec coverage (S2-7) is the substitute signal. Sprint 2 does not flip the keys — that is Scott's call after reviewing these PRs.

4. **`sponsorship_items.price` is `numeric(10,2)` (dollars), not cents.** S2-1 builder must multiply by 100 and `Math.round()`. Easy to miss — call it out explicitly in the PR description.

5. **S2-7 mock fidelity.** Webhook tests require mocking Stripe's `constructEvent` and the service-role Supabase client. If mocks don't match the real shape, tests pass but bugs remain. Spec must test against actual function signatures, not reimplemented logic.
