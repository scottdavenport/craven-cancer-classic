# Sprint 4 — Deploy Pipeline + Polish

**Sprint goal:** Wire a staging-first CI deploy pipeline, close the advisory-lock gap on webhook concurrency, and eliminate six categories of technical debt flagged in Sprint 3 reviews.

**Target dates:** ~1 week (5-month runway to September 2026 tournament)

**Baseline:** 190 tests passing, tsc clean, main at `dfc6558`. No `.github/workflows/` directory exists in this repo yet.

---

## Research findings (verified before writing this plan)

- **No CI workflows exist.** `ls /craven-cancer-classic/.github/workflows/` returns nothing. The deploy pipeline is a greenfield addition.
- **Coach-v3 deploy pattern:** `deploy.yml` auto-deploys on push to main (paths: `supabase/migrations/**`, `supabase/functions/**`). Uses `environment: staging` gate and `SUPABASE_PROJECT_REF` + `SUPABASE_ACCESS_TOKEN` secrets. `deploy-production.yml` is `workflow_dispatch` only, verifies staging ran first, then deploys. This is the pattern to port.
- **Craven has no staging Supabase project.** Production ref: `kybfsxjruczbiokucyft`. An open question exists on whether Scott will create a staging project or limit Sprint 4 to production-only deploy with a manual gate.
- **Craven has no edge functions** (`supabase/functions/` does not exist). The deploy workflow only needs to handle migrations — no function deploy logic needed yet, though the scaffolding should be included so it's not a breaking change later.
- **Webhook advisory lock (S4-2):** `src/app/api/webhooks/stripe/route.ts` already has the `processed_at` idempotency logic from S3-7 (lines 57-86). The advisory lock wraps the entire idempotency path in `pg_advisory_xact_lock(hashtext('stripe_event:' || event.id))` to serialize concurrent deliveries of the same event ID. This requires a migration (a new RPC or inline via `supabase.rpc('begin_advisory_lock', ...)`) and a change to `route.ts`.
- **`database-types.test.ts` hardcodes 12 tables** (line 100: `expect(tables).toHaveLength(12)`). Actual tables in `database.ts` as of `dfc6558`: `contacts`, `email_log`, `event_settings`, `invitations`, `photos`, `players`, `profiles`, `scores`, `sponsor_tiers`, `sponsors`, `sponsorship_items`, `sponsorship_purchases`, `stripe_events`, `teams` — **14 tables**. The test array lists 12 and the `invitations` and `stripe_events` tables are missing from it. The fix must enumerate from `Database["public"]["Tables"]` dynamically and assert against the runtime set.
- **`invite/accept/route.ts` catchall:** Lines 47-48 return `{ error: "Invalid token" }` on `selectError || !invitation` (covers not-found). Line 51-53 returns `{ error: "Invite has expired" }`. Line 58-59 returns `{ error: "Invite already accepted" }`. Lines 73-75 return `{ error: "Invite invalid or already accepted" }` when the atomic update returns null (race condition path). The item is to add proper HTTP status codes (404 / 410 / 409) and user-readable messages for the first three paths. The line 73-75 race path can keep its 400 or become 409 — builder's call.
- **`contacts/route.ts` error string:** Line 17 returns `{ error: "Invalid request body" }` (status 400). The invite route uses `"Invalid body"`. No test currently asserts on the contacts error string literal, so renaming will not break existing tests.
- **Dead helpers in `checkout-sponsorship.test.ts`:** `makeTeamsCountChain` (line 219) and `makeTeamsInsertChain` (line 227) are defined but never called. They are pre-RPC scaffolding from Sprint 2. Grep confirms zero call sites. The `morning_cap`/`afternoon_cap` fields in `OPEN_SETTINGS_*` fixtures (lines 234-253) are NOT dead — `route.ts` line 52 still selects `morning_cap` and `afternoon_cap` from `event_settings` and passes them to the RPC. Do not remove those fixture fields.
- **Supabase types note:** `database.ts` is the type authority. Builders must not regenerate types from a local DB during this sprint (per `feedback_types_never_regen_parallel.md`). Any item touching schema will flag this explicitly.

---

## Scope

### Group A — Foundation

---

#### Issue S4-1: Deploy pipeline — production with manual-approval gate

**Specialist:** Flux
**Effort:** small
**Labels:** `feature`, `P1-high`, `size:S`

**Context:** Craven has no CI workflow at all. This PR creates the production deploy workflow (manual `workflow_dispatch` trigger, `environment: production` gate with required reviewer approval, `kybfsxjruczbiokucyft` ref) so Scott can deploy migrations to production through GitHub Actions instead of running `supabase db push` locally. **Scott's decision 2026-04-18: Option C — skip staging for now.** The `environment: production` required-reviewer gate IS the safeguard; staging may be added in a future sprint.

**Files to create:**
- `.github/workflows/deploy-production.yml` — manual `workflow_dispatch` trigger; inputs: `deploy_migrations` (boolean, default true), `deploy_functions` (boolean, default true, currently a no-op since no functions exist), `functions` (string, leave empty to detect from last commit). Steps: checkout, setup Supabase CLI, link production project (`${{ secrets.SUPABASE_PROJECT_REF }}`), push migrations if `deploy_migrations` is true, deploy functions if `deploy_functions` and function list is non-empty (skip silently if no functions dir). Port the pattern from `~/github/coach-v3/.github/workflows/deploy-production.yml`. **Omit** the "Verify staging deployed first" step — Option C skips staging. The `environment: production` required-reviewer gate is the only pre-deploy safeguard.

**Secrets required in GitHub repo (Scott must configure):**
- `SUPABASE_PROJECT_REF` — production ref: `kybfsxjruczbiokucyft`
- `SUPABASE_ACCESS_TOKEN` — Supabase CLI personal access token (Scott's account)

These secrets must exist in the `production` environment in GitHub Settings → Environments → production. The `production` environment must also have **required reviewers** configured (Scott's GitHub account) so deploys pause for manual approval before running.

**Acceptance criteria:**
- `.github/workflows/deploy-production.yml` exists in the repo
- Workflow trigger is `workflow_dispatch` only (never runs on push)
- Workflow uses `environment: production` (GitHub environment gate)
- Dry-run: manually trigger the workflow on a branch with no migration changes → workflow runs, skips migration step (no-op), exits 0
- `tsc` clean, all 190 existing tests pass

**Dependencies:** None. Can start immediately.

---

### Group B — Security Polish

---

#### Issue S4-2: Webhook advisory lock

**Specialist:** Flux + Sentinel review
**Effort:** medium
**Labels:** `feature`, `P2-medium`, `size:M`

**Context:** Sentinel accepted S3-7's `processed_at` idempotency as safe for at-least-once delivery. The advisory lock closes the concurrent-delivery window fully: if two Stripe retries arrive simultaneously (before the first fully processes), only one acquires the lock and runs downstream; the second blocks until the lock releases, then finds `processed_at IS NOT NULL` and short-circuits.

**Schema context (verified):** `stripe_events` table has columns `id text`, `processed_at timestamptz | null`, `received_at timestamptz`. Table defined in migration `20260419000005_stripe_events_processed_at.sql`.

**NOTE — type authority:** The builder must NOT regenerate `src/types/database.ts` from a local DB. Take `main` as the type authority. No schema columns are being added; the advisory lock is a Postgres session-level lock acquired at the start of the idempotency block, not a new column.

**Implementation approach:** Wrap the idempotency block in `route.ts` in a Postgres advisory lock using a database RPC. Create a migration with a helper function:

```sql
-- supabase/migrations/20260420000001_webhook_advisory_lock.sql
create or replace function public.acquire_stripe_event_lock(event_id text)
returns void language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext('stripe_event:' || event_id));
end;
$$;
```

Then in `route.ts`, call `await supabase.rpc('acquire_stripe_event_lock', { event_id: event.id })` as the first operation after constructing the client, before the `stripe_events.insert`. The `pg_advisory_xact_lock` is transaction-scoped — it releases automatically when the database transaction ends. Since Supabase JS uses the PostgREST connection pool (not explicit transactions), the builder must verify lock scope. If transaction-scoping doesn't work over PostgREST, fall back to `pg_advisory_lock` / `pg_advisory_unlock` pair.

**Files to touch:**
- `supabase/migrations/20260420000001_webhook_advisory_lock.sql` (new)
- `src/app/api/webhooks/stripe/route.ts` — add `supabase.rpc('acquire_stripe_event_lock', ...)` call before the idempotency insert block
- `src/__tests__/webhook-idempotency.test.ts` — add test asserting the lock RPC is called before the stripe_events insert

**Acceptance criteria:**
- Migration creates `acquire_stripe_event_lock(event_id text)` function in public schema
- `route.ts` calls `acquire_stripe_event_lock` before the idempotency insert
- If lock RPC call fails (db error), handler returns 500 so Stripe retries (do not silently skip)
- Two concurrent test calls with the same event ID: the mock verifies the lock is acquired before the insert on each call
- Existing webhook idempotency tests still pass
- `tsc` clean, no new bare catches
- Sentinel reviews migration before Watchdog

**Dependencies:** None. Can start parallel with other work. Shares `route.ts` — if any other S4 issue touches `route.ts` concurrently, serialize. (No other S4 issue touches this file.)

---

### Group C — Test Robustness

---

#### Issue S4-3: `database-types.test.ts` dynamic enumeration

**Specialist:** Flux (test infra change, not UI)
**Effort:** small
**Labels:** `chore`, `P2-medium`, `size:S`

**Context:** `src/__tests__/database-types.test.ts` line 100 hardcodes `expect(tables).toHaveLength(12)` and the array lists 12 tables. Actual tables in `src/types/database.ts` as of `dfc6558`: 14 tables (`contacts`, `email_log`, `event_settings`, `invitations`, `photos`, `players`, `profiles`, `scores`, `sponsor_tiers`, `sponsors`, `sponsorship_items`, `sponsorship_purchases`, `stripe_events`, `teams`). `invitations` (added in S3-3, migration `20260419000001_add_viewer_role_and_invitations.sql`) and `stripe_events` (migration `20260418000001_webhook_idempotency.sql`) are missing from the test array. The fix makes the test self-updating.

**NOTE — type authority:** Builder reads from `src/types/database.ts` on main. Do NOT regenerate types.

**Files to touch:**
- `src/__tests__/database-types.test.ts` — replace the hardcoded `tables` array and `toHaveLength(12)` assertion with a dynamic enumeration derived from `Database["public"]["Tables"]`. Pattern:

```ts
it("Database type has all expected tables", () => {
  type TableNames = keyof Database["public"]["Tables"];
  // Compile-time exhaustive set — if a new table is added to database.ts
  // without being listed here, tsc will error.
  const knownTables = new Set<TableNames>([
    "contacts",
    "email_log",
    "event_settings",
    "invitations",
    "photos",
    "players",
    "profiles",
    "scores",
    "sponsor_tiers",
    "sponsors",
    "sponsorship_items",
    "sponsorship_purchases",
    "stripe_events",
    "teams",
  ]);
  // Runtime assertion: count matches what we enumerated
  expect(knownTables.size).toBe(14);
});
```

This approach uses TypeScript's structural checking — if `database.ts` gains a table that's not in the Set literal, `tsc` will flag it as a type error on the Set construction. The `expect(knownTables.size).toBe(14)` then serves as a runtime double-check.

**Acceptance criteria:**
- `src/__tests__/database-types.test.ts` no longer contains the literal `12` in the table-count assertion
- `invitations` and `stripe_events` are both present in the enumeration
- `tsc` passes (type-level exhaustiveness check works)
- Test passes in `vitest run`
- If a new table is added to `database.ts` in a future sprint without updating this test, `tsc` will error — builder must verify this property holds for the chosen implementation

**Dependencies:** None. Standalone 1-file change.

---

### Group D — Error UX

---

#### Issue S4-4: Invite accept route — split 400 into 404 / 410 / 409

**Specialist:** Flux
**Effort:** small
**Labels:** `chore`, `P2-medium`, `size:S`

**Context:** `src/app/api/invite/accept/route.ts` currently returns:
- Line 48: status 400, `"Invalid token"` — when the invitation row is not found (token doesn't exist in DB)
- Line 53: status 400, `"Invite has expired"` — when `expires_at` is in the past
- Line 59: status 400, `"Invite already accepted"` — when `accepted_at IS NOT NULL`
- Line 74: status 400, `"Invite invalid or already accepted"` — race-condition fallback from the atomic update

The spec is to give each case a semantically correct HTTP status so clients and UX can render distinct messages.

**Files to touch:**
- `src/app/api/invite/accept/route.ts` — change status codes:
  - Not found (line 48): 404, message `"Invite not found"`
  - Expired (line 53): 410, message `"Invite has expired"`
  - Already accepted (line 59): 409, message `"Invite already accepted"`
  - Race fallback (line 74): 409, message `"Invite already accepted"` (concurrent accept race — effectively the same state)
- `src/__tests__/invite-accept.test.ts` — update test assertions that currently assert status 400 for these paths to assert the new status codes (404, 410, 409)

**Acceptance criteria:**
- GET `/api/invite/accept?token=NONEXISTENT` returns 404 with `{ error: "Invite not found" }`
- GET `/api/invite/accept?token=EXPIRED` returns 410 with `{ error: "Invite has expired" }`
- GET `/api/invite/accept?token=ALREADY_USED` returns 409 with `{ error: "Invite already accepted" }`
- GET `/api/invite/accept?token=VALID` still returns 302 redirect to `/admin` (happy path unchanged)
- `src/__tests__/invite-accept.test.ts` updated to assert the new codes
- All 190 existing tests pass
- `tsc` clean

**Dependencies:** None. Standalone 2-file change.

---

#### Issue S4-5: `contacts/route.ts` error string normalization

**Specialist:** Flux
**Effort:** small
**Labels:** `chore`, `P3-low`, `size:S`

**Context:** `src/app/api/contacts/route.ts` line 17 returns `{ error: "Invalid request body" }` (status 400). The invite route (`src/app/api/invite/route.ts` lines 28, 40) uses `"Invalid body"`. No test currently asserts on the contacts error string literal, so the rename will not break tests.

Grep sweep confirmed: no other API route in `src/app/api/` returns `"Bad request"` or `"Malformed"`. The only inconsistency is `"Invalid request body"` vs `"Invalid body"`. Decision: normalize to `"Invalid body"` (shorter, matches the newer route standard).

**Files to touch:**
- `src/app/api/contacts/route.ts` — line 17: change `"Invalid request body"` to `"Invalid body"`

**Acceptance criteria:**
- `grep -rn "Invalid request body" src/app/api/` returns zero results
- GET `/api/contacts` with a malformed body returns 400 with `{ error: "Invalid body" }`
- All 190 existing tests pass (no test asserts on the old string)
- `tsc` clean

**Dependencies:** None. Standalone 1-line change.

---

### Group E — Test Cleanup

---

#### Issue S4-6: Remove dead test helpers from `checkout-sponsorship.test.ts`

**Specialist:** Flux (test file cleanup)
**Effort:** small
**Labels:** `chore`, `P3-low`, `size:S`

**Context:** `src/__tests__/checkout-sponsorship.test.ts` contains two unused function definitions:
- `makeTeamsCountChain` (line 219) — pre-RPC scaffold for mocking `teams.select().eq().eq()` count queries. Zero call sites.
- `makeTeamsInsertChain` (line 227) — pre-RPC scaffold for mocking `teams.insert().select().single()`. Zero call sites.

Both were made obsolete when S3-9 replaced the direct count/insert pattern with the `register_team` RPC. They are dead code that will confuse future builders about how the route works.

The `morning_cap` and `afternoon_cap` fields in the `OPEN_SETTINGS_*` fixture objects (lines 234-253) are NOT dead — they are still selected by `src/app/api/checkout/route.ts` line 52 (`select("registration_open, morning_cap, afternoon_cap, registration_fee_cents")`). Do not remove those fixture fields.

**Files to touch:**
- `src/__tests__/checkout-sponsorship.test.ts` — delete the `makeTeamsCountChain` function (lines 219-224) and `makeTeamsInsertChain` function (lines 227-232)

**Acceptance criteria:**
- `grep -n "makeTeamsCountChain\|makeTeamsInsertChain" src/__tests__/checkout-sponsorship.test.ts` returns zero results
- `OPEN_SETTINGS_DEFAULT_FEE`, `OPEN_SETTINGS_CUSTOM_FEE`, and `OPEN_SETTINGS_NULL_FEE` are unchanged (still include `morning_cap`, `afternoon_cap`)
- All 190 existing tests pass
- `tsc` clean (no "declared but never used" errors from the removal)

**Dependencies:** None. Standalone 1-file change.

---

## Execution Order

```
Phase 1 — All 6 issues parallel (zero file overlap):

  S4-1   [Flux]     feat/deploy-pipeline-production
         Files: .github/workflows/deploy-production.yml (new)

  S4-2   [Flux]     fix/webhook-advisory-lock  ← Sentinel reviews first, then Watchdog
         Files: supabase/migrations/20260420000001_webhook_advisory_lock.sql (new)
                src/app/api/webhooks/stripe/route.ts
                src/__tests__/webhook-idempotency.test.ts

  S4-3   [Flux]     chore/database-types-dynamic
         Files: src/__tests__/database-types.test.ts

  S4-4   [Flux]     fix/invite-accept-error-codes
         Files: src/app/api/invite/accept/route.ts
                src/__tests__/invite-accept.test.ts

  S4-5   [Flux]     chore/contacts-error-string
         Files: src/app/api/contacts/route.ts

  S4-6   [Flux]     chore/dead-test-helpers
         Files: src/__tests__/checkout-sponsorship.test.ts
```

**Conflict zones:**
- `supabase/migrations/`: S4-2 creates one new file. Unique filename — no conflict with any other S4 migration.
- `src/app/api/webhooks/stripe/route.ts`: S4-2 only.
- `src/app/api/invite/accept/route.ts`: S4-4 only.
- `src/app/api/contacts/route.ts`: S4-5 only.
- `.github/workflows/deploy-production.yml`: S4-1 only.

**Watchdog review required on every PR. Sentinel required before Watchdog on S4-2 (migration + webhook auth path).**

---

## Open Questions for Scott

**OQ-1 — Staging Supabase project — RESOLVED 2026-04-18**
Scott chose **Option C**: skip staging for now. S4-1 ships the production workflow with `environment: production` + required-reviewer gate as the only pre-deploy safeguard. Staging may be added in a future sprint.

---

## Risks and Unknowns

1. **Advisory lock over PostgREST (S4-2 implementation risk).** `pg_advisory_xact_lock` is transaction-scoped. PostgREST uses connection pooling and may not guarantee a single transaction wraps the entire request. If the lock doesn't hold across the insert → downstream-writes sequence, the builder must fall back to `pg_advisory_lock(...)` / `pg_advisory_unlock(...)` at the start and end of the idempotency block. Sentinel should flag this explicitly in review. Acceptance criteria are behavioral, not prescriptive — the implementation can adapt.

2. **GitHub environment secrets for S4-1a.** The `production` environment must be created in GitHub Settings → Environments with `SUPABASE_PROJECT_REF` and `SUPABASE_ACCESS_TOKEN` before the workflow will succeed. If secrets are missing, the workflow will fail at the link step. Flux should note this in the PR description. Scott must configure secrets before the workflow can run.

3. **`database-types.test.ts` tsc exhaustiveness (S4-3).** The `Set<TableNames>` approach catches additions at the type level only if the `TableNames` type is properly constrained. Flux must verify the implementation actually produces a tsc error when a new table is added to `database.ts` without being added to the set. A simple test: temporarily add a fake table name to `database.ts` and confirm tsc catches it.

4. **`invite-accept.test.ts` assertion count (S4-4).** The test file (`src/__tests__/invite-accept.test.ts`) currently asserts on status 400 for the not-found, expired, and already-accepted cases. Flux must update all three assertion sites. If any are missed, the test will catch the regression.

5. **All Flux work in Phase 1 is parallel but same specialist.** Six issues are all Flux, all parallel (no file overlap). Forge should spawn them serially if using one Flux instance, or spawn up to 3 concurrently if isolation is available. Each is small (≤3 files) — estimated 1-2h each. Sequential single-Flux execution: ~7h wall-clock. Concurrent Flux workers: ~2.5h.

6. **No staging pass — production workflow goes direct.** Option C means every migration merged via S4-1's workflow writes to production Supabase on first run. The required-reviewer gate is the safety net. Scott must configure the `production` environment in GitHub with required reviewers before S4-1 can be used safely.

---

## Total Estimated Builder Time

| Issue | Specialist | Estimate |
|---|---|---|
| S4-1 Deploy pipeline (production) | Flux | 2h |
| S4-2 Webhook advisory lock | Flux + Sentinel | 2.5h |
| S4-3 Database types dynamic | Flux | 1h |
| S4-4 Invite accept error codes | Flux | 1h |
| S4-5 Contacts error string | Flux | 0.25h |
| S4-6 Dead test helpers | Flux | 0.25h |
| **Total** | | **~7h** |

With Phase 1 fully parallel (6 issues, zero file overlap), effective wall-clock is dominated by S4-2 (~2.5h) if Flux instances run concurrently.

---

## Definition of Done (per issue)

1. PR open against `origin/main` with correct branch name
2. `tsc` passes (no type errors)
3. All 190 existing tests pass; new tests pass
4. Acceptance criteria verifiable in running app or test output
5. Sentinel has reviewed S4-2 before Watchdog
6. Watchdog has reviewed and approved (formal GitHub approval from forge-watchdog)
7. PR merged to `origin/main` by scottdavenport
8. For S4-1: workflow visible in GitHub Actions tab and runs successfully (manual dry-run on a no-op commit)

Sprint is complete when all 6 issues (S4-1 through S4-6) meet the above and Scott confirms the production workflow is ready to use.
