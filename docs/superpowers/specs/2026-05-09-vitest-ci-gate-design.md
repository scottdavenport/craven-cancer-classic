# Design — Vitest CI gate + RED-test cleanup

**Issue:** [#390](https://github.com/scottdavenport/craven-cancer-classic/issues/390) — Add Vitest workflow to CI (currently only E2E + deploy gated)
**Owner:** Forge orchestrator (Scott)
**Status:** approved 2026-05-09
**Provenance:**
- Triggering incident — PR #384 shipped 19 vitest regressions across `contact-form-polish.test.tsx` + `contact-list.test.tsx`. Watchdog round 2 caught it; round 1 missed because no CI gate forced the run.
- Existing prior art for `.skip()` pattern: `src/__tests__/rls-profiles-select.test.ts:61` — `describe.skip("RLS profiles SELECT restriction (Issue #244)")`

---

## Goal

Add `.github/workflows/vitest.yml` as a strict CI gate (any vitest failure or tsc error fails the build). To make a strict gate possible, convert the 33 pre-existing RED-state failures to `describe.skip()` / `it.skip()` so they no longer fail the run. Each skipped block retains its existing tracking-issue/sprint reference in the description string for searchability.

## Non-goals (deferred)

- **Filing 8 follow-up issues** to unwind each `.skip()` when the deferred sprint work ships. PR body lists them; chore-issue creation is a post-merge step.
- **Investigating `rls-self-promotion.test.ts`.** This test needs real Supabase connectivity (30s timeout indicates network call). It belongs in an integration-test job, not vitest. Skipped here; integration-test job design is a separate spec.
- **Running vitest tests in parallel-job matrix.** The existing suite (~1599 passing tests) runs in ~30-40s sequentially. No parallelism needed.
- **Adding a coverage report.** Out of scope; would expand the workflow significantly.
- **Branch-protection rule update.** This requires repo-admin scope on the gh token. Documented as a one-time post-merge step Scott (or controller, if token has admin) flips after the workflow runs once and registers as a check.

## Architecture

Three artifacts. One PR.

### 1. Convert 33 RED tests to `.skip()`

Eight test files modified. Strategy per file:

| File | Failing tests | Strategy | Line(s) |
|---|---|---|---|
| `src/__tests__/admin-destructive-copy-234.test.tsx` | 6/20 | `describe.skip` two top-level Areas | 479, 586 |
| `src/__tests__/admin-sponsorships-category-filter.test.tsx` | 9/12 | `describe.skip` root describe | 236 |
| `src/__tests__/database-types.test.ts` | 1/13 | `it.skip` the one enum test | 189 |
| `src/__tests__/rls-self-promotion.test.ts` | 1/1 | `describe.skip` outer describe (DB-dependent) | 45 |
| `src/__tests__/sponsorship-form-polish.test.tsx` | 1/4 | `describe.skip` "form spacing" (1-test block) | 56 |
| `src/__tests__/sponsorships-actions.test.ts` | 8/15 | `describe.skip` two RED describes | 179, 305 |
| `src/__tests__/sponsorships-drawer.test.tsx` | 3/9 | `it.skip` per failing test | 102, 149, 171 |
| `src/__tests__/sponsorships-manager.test.tsx` | 4/10 | `describe.skip` two RED describes | 191, 259 |

**Rules for the conversion:**

- The existing description strings already include the tracking ref (e.g., `(Sprint 33 RED)`, `(Issue #234)`). Preserve them verbatim — do not rewrite.
- Where a whole describe block is RED (all its tests fail), use `describe.skip(...)`. Where a describe contains a mix of passing and failing tests (`sponsorships-drawer.test.tsx`), use `it.skip(...)` per failing test.
- No comment lines added — the `.skip` mechanism + the existing description strings are self-documenting (consistent with `rls-profiles-select.test.ts:61`).
- No test bodies removed. `.skip` preserves the body for un-skipping when the deferred work ships.
- For `admin-destructive-copy-234.test.tsx`: only Area 3 (line 479) and Area 4 (line 586) have failures. Area 1 (line 270), Area 2 (line 397), and Area 5 (line 645) pass — leave untouched.
- For `database-types.test.ts`: of 13 tests, only line 189 fails. The other "(Sprint 33 RED)" tests at lines 202, 227, 250, 276, 300 pass (probably ship-day artifacts). Leave them alone.

**Expected vitest exit after conversion:** ~1599 passing, 33 skipped (yellow), 0 failing.

### 2. `.github/workflows/vitest.yml`

```yaml
name: Vitest

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: vitest-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  vitest:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx vitest run --reporter=verbose
```

**Style notes:**
- Matches `e2e.yml` Node 20 + `cache: npm` + `npm ci` + ubuntu-latest convention.
- `concurrency` block auto-cancels superseded runs (push to a PR branch cancels the in-flight run for that branch, saves CI minutes).
- `timeout-minutes: 10` — current local run is ~30s; 10 min absorbs CI overhead + any future slowdowns. Compare e2e.yml's 20-minute budget.
- `tsc --noEmit` runs before vitest because a type error makes test results unreliable; no point running tests if the code doesn't compile.
- No env vars needed — vitest doesn't hit Supabase (the one test that did, `rls-self-promotion.test.ts`, is now skipped).

### 3. Branch protection — required check (post-merge)

After the workflow runs once on a PR, GitHub registers `Vitest / vitest` as a status check. Scott then adds it to main's branch protection rule via:

- **UI (recommended):** Settings → Branches → main → Edit → Require status checks → search "Vitest" → enable.
- **CLI (alternative):** `gh api repos/scottdavenport/craven-cancer-classic/branches/main/protection` requires the full protection-rule body for PUT (the API does not accept partial PATCH updates). The UI path is simpler unless scripting.

This is a one-time admin action — gated behind admin scope on the gh token. Documented in the PR body as a post-merge follow-up. Not gated by this PR.

## File map

**Create:**
- `.github/workflows/vitest.yml`

**Modify (test conversion):**
- `src/__tests__/admin-destructive-copy-234.test.tsx`
- `src/__tests__/admin-sponsorships-category-filter.test.tsx`
- `src/__tests__/database-types.test.ts`
- `src/__tests__/rls-self-promotion.test.ts`
- `src/__tests__/sponsorship-form-polish.test.tsx`
- `src/__tests__/sponsorships-actions.test.ts`
- `src/__tests__/sponsorships-drawer.test.tsx`
- `src/__tests__/sponsorships-manager.test.tsx`

## Data flow

1. PR opens or push to PR branch → GitHub triggers `vitest.yml`.
2. Concurrency group cancels any in-flight run on the same ref.
3. Worker checks out, restores npm cache, runs `npm ci`.
4. `npx tsc --noEmit` — fails fast on type errors.
5. `npx vitest run --reporter=verbose` — runs ~1599 tests, reports 33 skipped.
6. Exit 0 → check passes → required-check satisfied.
7. Any failure → exit non-zero → required-check fails → merge blocked.

## Error handling

- **TSC error:** workflow fails at the tsc step before running vitest. Faster signal.
- **Vitest run failure:** workflow fails. Reporter output (verbose) shows which test failed.
- **Cache miss / `npm ci` failure:** infra issue; re-run usually fixes. No special handling.
- **Timeout (>10 min):** signals a hung test or infra problem; workflow times out and fails.
- **Skipped test going GREEN:** vitest does NOT report newly-passing skipped tests as a failure. Drift is invisible. Tracked by the post-merge follow-up issues (one per skipped block) so deferred work eventually unwinds the `.skip`.

## Testing

- **The workflow itself is tested by running it.** PR #390 opens → workflow runs against the now-clean baseline → must exit 0 with 33 skipped + 0 failed.
- **No new vitest tests in this PR.** This is pure infra + cleanup.
- **Local verification:** `npx vitest run` after the conversion must exit 0. tsc must remain clean.

## Sequencing + routing

Single PR. Routing: **Flux** (CI/CD specialist). Watchdog stage-2 review. No Sentinel needed (no auth/RLS/migration changes — `.skip()` calls + a workflow yaml).

## Acceptance criteria

1. `.github/workflows/vitest.yml` present with the structure shown above.
2. Workflow triggers on `pull_request` (any branch) and `push` to `main`.
3. Concurrency group cancels in-flight runs on superseded refs.
4. Workflow runs `npm ci` → `tsc --noEmit` → `vitest run --reporter=verbose` in that order.
5. After conversion, `npx vitest run` exits 0 locally with 33 skipped + 0 failed.
6. Each of the 8 modified test files has the correct `.skip` placement per the table in §1.
7. No test descriptions rewritten — existing tracking-issue/sprint refs preserved verbatim.
8. No test bodies deleted.
9. PR body lists the 8 deferred follow-up issues to track unwinding each `.skip` when the underlying work ships.
10. Branch protection update is documented in the PR body as a post-merge step (not gated by this PR).

## Open questions

None. All scope decisions are locked.
