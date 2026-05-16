# e2e Test Data Cleanup — Design

**Status:** approved (Scott, 2026-05-15)
**Sprint slug (proposed):** `e2e-cleanup`
**Goal:** Zero `e2e-*` rows in the production Supabase project (`kybfsxjruczbiokucyft`) after any Playwright run.

## Problem

Playwright e2e specs run against craven's live Supabase project — there is no preview branch or staging DB. Only 6 of 15 specs attempt cleanup; the rest leave rows in `contacts`, `teams`, `team_members`, `sponsors`, `scores`, etc. Pollution has accumulated over the e2e-stability sprint (2026-05-10 close) and prior. The `e2e-*@example.com` "Forge orphan cleanup" comment in `tests/e2e/team-delete-type-to-confirm.spec.ts:26` references a scrub process that does not exist.

## Non-goals

- Moving e2e onto a Supabase preview branch or separate staging project (deferred — out of scope; Scott chose "keep using prod, make cleanup bulletproof").
- Refactoring spec assertions or flake-fixing (e2e-stability sprint just closed; do not re-litigate).
- Touching vitest unit/component tests — they hit mocks, not the DB.

## Architecture

**Marker convention — every test row carries an identifiable e2e marker.**

- **Email-bearing rows (`contacts`, `auth.users`, captain records):** email matches `e2e-*@example.com`. Already partially in use.
- **Non-email rows (`teams`, `sponsors`, `sponsorships`, `scores`, `registrations`):** a chosen text field (name, title, notes — finalized per table in Issue A) contains `e2e-<seedTag>`, where `seedTag` is a per-test random suffix (`crypto.randomUUID().slice(0,8)` or similar).
- **Rows that genuinely cannot carry a marker** (rare — pure server-state or trigger-generated rows): the spec calls `registerOrphan(table, id)` and the helper tracks them in-memory for that test's `afterAll`.

**Cleanup runs in three layers, in order of who-cleans-first.**

1. **Primary — per-test `afterAll`** invokes `cleanupTestData(seedTag)`. Service-role Supabase client deletes by marker. Cascades through dependent tables in FK-safe order (the exact order is derived from the schema in Issue A — generally child tables first, parent tables last). Idempotent — running twice is a no-op. Throws on partial failure so a broken cleanup is visible, not silent.
2. **Safety net — `npm run e2e:scrub`** is a standalone Node script that deletes ALL rows matching the marker patterns across the whole DB. Runs:
   - As a CI post-step with `if: always()` (catches crashed/aborted runs)
   - Locally on demand (interactive prompt before delete)
   - Always logs per-table counts before executing (audit trail)
3. **Verification gate — `npm run e2e:verify-clean`** queries each tracked table for any remaining `e2e-*` rows. Exits 0 if clean, non-zero with a per-table breakdown if anything leaked past the scrub. CI fails the build on non-zero. This is the literal sprint goal made enforceable.

**Service-role key handling.** Helper + scrub + verifier all need bypass-RLS access. Stored as `SUPABASE_SERVICE_ROLE_KEY`, loaded from `.env.local` locally and GitHub Actions secrets in CI. Never exposed to spec code — only imported by `cleanup-helper.ts` and the two scripts. Add to `.env.local.example` with a placeholder.

## Components

**Five new files, plus edits to all 15 existing specs.**

### `tests/e2e/fixtures/cleanup-helper.ts` (new)

- `serviceRoleClient()` — singleton Supabase client, server-side only, bypasses RLS
- `cleanupTestData(seedTag: string): Promise<{ deleted: Record<string, number> }>` — deletes by marker across all tracked tables in FK-safe order; idempotent; logs counts; throws on partial failure
- `registerOrphan(table, id)` — escape hatch for marker-less rows; tracked in module-local map keyed by seedTag

### `scripts/e2e-scrub.ts` (new)

- Standalone Node script (not part of the Playwright bundle)
- Reads `SUPABASE_SERVICE_ROLE_KEY` + URL from `.env.local` (interactive) or env (CI)
- For each tracked table, queries rows matching the marker pattern
- Prints a pre-scrub summary: `table → count`
- Interactive mode (`npm run e2e:scrub`): prompts before delete
- CI mode (`npm run e2e:scrub:ci`): proceeds without prompt
- Exits 0 on success (clean or scrubbed), 1 on failure

### `scripts/e2e-verify-clean.ts` (new)

- Same queries as scrub, but no DELETE
- Exits 0 if all tracked tables return 0 rows for the marker pattern
- Exits non-zero with a per-table breakdown otherwise
- The CI gate

### `.github/workflows/e2e.yml` (edit existing or create)

Two new post-steps that always run, regardless of test outcome:

```yaml
- name: e2e scrub (safety net)
  if: always()
  run: npm run e2e:scrub:ci
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

- name: e2e verify clean (gate)
  if: always()
  run: npm run e2e:verify-clean
  env: ...
```

### `tests/e2e/_lint-marker-convention.spec.ts` (new)

- Runs at e2e startup as a regular `test()` block (alphabetically first via `_` prefix)
- Scans the other 15 spec files for fixture-insert patterns (`.from("contacts").insert`, `createTestContact`, etc.)
- Fails the test if any insert isn't tagged with a `seedTag`
- Cheap (<1s); catches future drift when new specs are added without marker discipline

### Spec changes (all 15)

Every spec gets:

```ts
import { cleanupTestData } from "./fixtures/cleanup-helper";
const SEED_TAG = `e2e-${crypto.randomUUID().slice(0, 8)}`;
test.afterAll(async () => {
  await cleanupTestData(SEED_TAG);
});
```

Fixtures inside each spec are updated to interpolate `SEED_TAG` into the marker field (email for contacts/captains, name/title/notes for everything else).

The 6 specs with existing partial cleanup get migrated to the helper (delete the ad-hoc afterAll/finally blocks; replace with the standard one). The 9 without get the standard block added fresh.

## Tracked tables — initial list

Finalized by Issue A (DB audit) before any cleanup code is written. Initial list to validate against the schema:

`contacts`, `teams`, `team_members`, `contact_team_memberships`, `sponsors`, `sponsorships`, `scores`, `registrations`, `auth.users` (matched by email prefix, requires the service-role key)

If Issue A finds e2e rows in tables not on this list, the list expands. If a table is on this list but has no e2e rows and no spec writes to it, it drops off.

## Data flow

```
test starts
  └─ SEED_TAG generated
  └─ fixture rows inserted with SEED_TAG in marker field
test runs assertions
test.afterAll
  └─ cleanupTestData(SEED_TAG) → service-role deletes by marker
                                  → cascades FK-safe
                                  → logs counts

[CI only — runs whether tests passed, failed, or crashed]
  └─ e2e-scrub:ci → deletes ALL e2e-* rows DB-wide
  └─ e2e-verify-clean → queries all tracked tables
                       → exit 0 if clean, non-zero otherwise
                       → CI step fails build if non-zero
```

## Error handling

- **Helper throws on partial failure.** If `cleanupTestData` deletes 3 of 4 expected rows, it throws with the table that failed. Better to fail loud than leave silent orphans.
- **Scrub logs before delete.** Pre-scrub summary is captured in CI logs. If something unexpected gets deleted, the audit trail shows what.
- **Verify-clean fails CI but does not block PR merging on its own** — the existing branch e2e PR gate stays as the merge blocker. Verify-clean failure surfaces as a Watchdog HIGH finding so the team sees it but doesn't block emergency hotfixes.
- **Service-role key absent.** Helper, scrub, and verify all check on import and refuse to run (clear error message). Prevents silent partial-cleanup with anon key.

## Testing

- **`cleanup-helper.ts`** has a vitest unit test that hits the local Supabase stack (`npx supabase start`), inserts marker rows, runs the helper, asserts deletes. Mirrors the integration-test discipline from prior craven sprints.
- **`scripts/e2e-scrub.ts`** has a smoke test that runs against a temp DB, validates the dry-run output, validates the delete count.
- **`_lint-marker-convention.spec.ts`** is itself the test for the convention — meta-tested by a fixture spec that intentionally violates the rule.

## Sprint shape

Five waves, ~6 issues. Compass enrichment will set the exact dependency graph.

**Wave 0 — Audit.** *(blocks everything else)*
- **Issue A:** Query the prod DB for existing pollution across all candidate tables. Quantify per-table row counts. Finalize the tracked-tables list. Output: a markdown table in the issue comment.

**Wave 1 — Foundation.** *(can start after Wave 0)*
- **Issue B:** Build `cleanup-helper.ts` with full table coverage from Issue A. Vitest unit test against local Supabase. Service-role client + tracked-tables list + FK-safe cascade.
- **Issue C:** Build `scripts/e2e-scrub.ts` and `scripts/e2e-verify-clean.ts`. Add `npm run e2e:scrub`, `e2e:scrub:ci`, `e2e:verify-clean` package.json scripts.

**Wave 2 — Apply.** *(can start after Wave 1)*
- **Issue D:** Migrate all 15 specs to use `cleanupTestData(SEED_TAG)` in `afterAll`. The 6 specs with existing partial cleanup get the ad-hoc blocks deleted and replaced. The 9 without get the standard block added. Each spec keeps its existing fixtures but interpolates SEED_TAG into the marker field.

**Wave 3 — Safety net.** *(can start after Wave 1; parallel to Wave 2)*
- **Issue E:** Wire `e2e:scrub:ci` + `e2e:verify-clean` into `.github/workflows/e2e.yml` as `if: always()` post-steps. Add `SUPABASE_SERVICE_ROLE_KEY` to repo secrets. Update `.env.local.example`.

**Wave 4 — Lint + one-time scrub + verification.** *(closes the sprint)*
- **Issue F:** Add `tests/e2e/_lint-marker-convention.spec.ts`. Run one-time scrub against prod DB (using the new script — `npm run e2e:scrub`) to clean up existing pollution. Capture pre-scrub and post-scrub `e2e:verify-clean` outputs in the PR description as proof. Sprint goal verification: CI run of the final PR must show `e2e:verify-clean` exit 0.

## Success criteria

The sprint closes when **all** of these hold:

1. `npm run e2e:verify-clean` exits 0 against prod DB (no `e2e-*` rows in any tracked table)
2. CI run of the final PR shows the scrub step deleting 0 rows (proving per-test cleanup worked end-to-end)
3. CI run of the final PR shows the verify-clean step passing
4. All 15 specs have `test.afterAll(cleanupTestData(SEED_TAG))` and use the helper-provided seedTag
5. `_lint-marker-convention.spec.ts` passes against the current spec set
6. `e2e:scrub:ci` post-step runs even when tests fail (verified by intentionally failing one spec in a throwaway commit before merge)

## Out of scope (deferred)

- **Move e2e to a Supabase preview branch.** Considered and rejected — Scott chose prod with bulletproof cleanup. Reconsider if pollution recurs after this sprint ships.
- **Per-table soft-delete versus hard-delete policy for test data.** Helper hard-deletes — soft-delete would defeat the purpose.
- **Performance — scrub speed against very large DBs.** Acceptable as long as it stays under the CI step timeout; optimize later if needed.
