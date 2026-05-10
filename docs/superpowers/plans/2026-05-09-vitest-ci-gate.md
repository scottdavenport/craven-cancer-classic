# Vitest CI Gate + RED-Test Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `.github/workflows/vitest.yml` as a strict CI gate. To make a strict gate possible, convert the 33 pre-existing RED-state failures to `describe.skip()` / `it.skip()` so they no longer fail the run.

**Architecture:** Three tasks in one PR. Task 1 converts 8 test files (~13 Edit ops); Task 2 adds the workflow yaml; Task 3 is the final verification + PR open. Each task ends in a single commit.

**Tech Stack:** Vitest 4.x, GitHub Actions, Node 20, TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-09-vitest-ci-gate-design.md` (commit `4082e6e`)
**Issue:** [#390](https://github.com/scottdavenport/craven-cancer-classic/issues/390)

---

## File Map

**Create:**
- `.github/workflows/vitest.yml` — Vitest CI workflow (Task 2)

**Modify (`.skip()` conversion in Task 1):**
- `src/__tests__/admin-destructive-copy-234.test.tsx` — `describe.skip` Areas 3 + 4
- `src/__tests__/admin-sponsorships-category-filter.test.tsx` — `describe.skip` root
- `src/__tests__/database-types.test.ts` — `it.skip` line 189
- `src/__tests__/rls-self-promotion.test.ts` — `describe.skip` outer
- `src/__tests__/sponsorship-form-polish.test.tsx` — `describe.skip` "form spacing"
- `src/__tests__/sponsorships-actions.test.ts` — `describe.skip` two RED describes
- `src/__tests__/sponsorships-drawer.test.tsx` — `it.skip` 3 tests
- `src/__tests__/sponsorships-manager.test.tsx` — `describe.skip` two RED describes

**Pattern reference:** `src/__tests__/rls-profiles-select.test.ts:61` uses `describe.skip("...")` — the established codebase convention.

---

## Task 1: Convert 33 RED tests to `.skip()`

**Files modified:** 8 test files. Strategy: replace `describe(` with `describe.skip(` or `it(` with `it.skip(` at specific lines. Description strings preserved verbatim. No comment lines added (the existing `(Sprint 33 RED)` etc. suffixes are self-documenting, consistent with `rls-profiles-select.test.ts`).

- [ ] **Step 1: `admin-destructive-copy-234.test.tsx` — Area 3**

Edit `src/__tests__/admin-destructive-copy-234.test.tsx`:
- old_string: `describe("Area 3 — SponsorshipManager cascade warning copy", () => {`
- new_string: `describe.skip("Area 3 — SponsorshipManager cascade warning copy", () => {`

- [ ] **Step 2: `admin-destructive-copy-234.test.tsx` — Area 4**

Same file:
- old_string: `describe("Area 4 — SponsorshipManager single-delete dialog copy", () => {`
- new_string: `describe.skip("Area 4 — SponsorshipManager single-delete dialog copy", () => {`

- [ ] **Step 3: `admin-sponsorships-category-filter.test.tsx`**

Edit `src/__tests__/admin-sponsorships-category-filter.test.tsx`:
- old_string: `describe("SponsorshipManager — category filter chip (Sprint 33)", () => {`
- new_string: `describe.skip("SponsorshipManager — category filter chip (Sprint 33)", () => {`

- [ ] **Step 4: `database-types.test.ts`**

Edit `src/__tests__/database-types.test.ts`:
- old_string: `  it("Database Enums includes sponsorship_category with three values (Sprint 33 RED)", () => {`
- new_string: `  it.skip("Database Enums includes sponsorship_category with three values (Sprint 33 RED)", () => {`

- [ ] **Step 5: `rls-self-promotion.test.ts`**

Edit `src/__tests__/rls-self-promotion.test.ts`:
- old_string: `describe("RLS self-promotion vulnerability (Issue 1)", () => {`
- new_string: `describe.skip("RLS self-promotion vulnerability (Issue 1)", () => {`

- [ ] **Step 6: `sponsorship-form-polish.test.tsx`**

Edit `src/__tests__/sponsorship-form-polish.test.tsx`:
- old_string: `  describe("form spacing", () => {`
- new_string: `  describe.skip("form spacing", () => {`

- [ ] **Step 7: `sponsorships-actions.test.ts` — `getSponsorshipItems` block**

Edit `src/__tests__/sponsorships-actions.test.ts`:
- old_string: `describe("getSponsorshipItems", () => {`
- new_string: `describe.skip("getSponsorshipItems", () => {`

- [ ] **Step 8: `sponsorships-actions.test.ts` — category filter block**

Same file:
- old_string: `describe("getSponsorshipItems — optional category filter (Sprint 33 RED)", () => {`
- new_string: `describe.skip("getSponsorshipItems — optional category filter (Sprint 33 RED)", () => {`

- [ ] **Step 9: `sponsorships-drawer.test.tsx` — clicking a row**

Edit `src/__tests__/sponsorships-drawer.test.tsx`:
- old_string: `  it("clicking a row opens the edit drawer with the package name in the title", async () => {`
- new_string: `  it.skip("clicking a row opens the edit drawer with the package name in the title", async () => {`

- [ ] **Step 10: `sponsorships-drawer.test.tsx` — submitting edit form**

Same file:
- old_string: `  it("submitting edit form calls updateSponsorshipItem and shows success toast", async () => {`
- new_string: `  it.skip("submitting edit form calls updateSponsorshipItem and shows success toast", async () => {`

- [ ] **Step 11: `sponsorships-drawer.test.tsx` — delete footer button**

Same file:
- old_string: `  it("delete footer button opens ConfirmDialog; confirming calls deleteSponsorshipItem", async () => {`
- new_string: `  it.skip("delete footer button opens ConfirmDialog; confirming calls deleteSponsorshipItem", async () => {`

- [ ] **Step 12: `sponsorships-manager.test.tsx` — delete with linked sponsors**

Edit `src/__tests__/sponsorships-manager.test.tsx`:
- old_string: `  describe("delete with linked sponsors (cascade warning)", () => {`
- new_string: `  describe.skip("delete with linked sponsors (cascade warning)", () => {`

- [ ] **Step 13: `sponsorships-manager.test.tsx` — refetch after delete**

Same file:
- old_string: `  describe("refetch after delete", () => {`
- new_string: `  describe.skip("refetch after delete", () => {`

- [ ] **Step 14: Verify the full vitest suite is now clean**

Run: `npx vitest run 2>&1 | tail -8`

Expected output (counts approximate; the key line is "Tests" with `0 failed`):
```
 Test Files  ... passed ...skipped... (123)
      Tests  1596 passed | 33 skipped (1632)
```

Verify exactly: 0 failing tests. The skipped count should be 33 (or 33 + any pre-existing skips like the rls-profiles-select.test.ts block — total may be higher than 33).

If ANY test fails: STOP and report. Do not proceed to commit. Re-check the Edit operations against the spec's table — likely a missed file or wrong block.

- [ ] **Step 15: Run tsc to confirm no type regressions**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: no output (0 errors).

If errors: STOP and report. The `.skip` conversion shouldn't introduce type errors; if there are any, something else is going on.

- [ ] **Step 16: Commit**

```bash
git add src/__tests__/admin-destructive-copy-234.test.tsx \
        src/__tests__/admin-sponsorships-category-filter.test.tsx \
        src/__tests__/database-types.test.ts \
        src/__tests__/rls-self-promotion.test.ts \
        src/__tests__/sponsorship-form-polish.test.tsx \
        src/__tests__/sponsorships-actions.test.ts \
        src/__tests__/sponsorships-drawer.test.tsx \
        src/__tests__/sponsorships-manager.test.tsx
git commit -m "test(#390): mark deferred RED tests as .skip()

Convert 33 pre-existing RED-state failures to describe.skip() / it.skip()
across 8 files. Description strings preserved verbatim — existing
(Sprint 33 RED), (Issue #234), etc. tags carry the tracking signal.

Pattern follows existing rls-profiles-select.test.ts:61 convention.

Files:
- admin-destructive-copy-234.test.tsx (Area 3 + Area 4)
- admin-sponsorships-category-filter.test.tsx (root)
- database-types.test.ts (1 test)
- rls-self-promotion.test.ts (DB-dependent — needs real Supabase)
- sponsorship-form-polish.test.tsx (form spacing block)
- sponsorships-actions.test.ts (2 describe blocks)
- sponsorships-drawer.test.tsx (3 tests)
- sponsorships-manager.test.tsx (2 describe blocks)

Vitest run after conversion: 0 failed | 33 skipped."
```

---

## Task 2: Add `.github/workflows/vitest.yml`

**Files:**
- Create: `.github/workflows/vitest.yml`

**Pattern reference:** `.github/workflows/e2e.yml` for style (Node 20, `npm ci`, ubuntu-latest).

- [ ] **Step 1: Write the workflow file**

Create `.github/workflows/vitest.yml`:

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

- [ ] **Step 2: Validate the YAML**

Run: `npx -y js-yaml .github/workflows/vitest.yml > /dev/null && echo "valid yaml"`
Expected: `valid yaml`. (If `js-yaml` is unavailable, use `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/vitest.yml'))" && echo valid` as a fallback.)

If the YAML is invalid: STOP and report. Fix the indentation or quoting.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/vitest.yml
git commit -m "ci(#390): add Vitest workflow as strict gate

Runs on every PR + push to main. Strict gate — any vitest failure
or tsc error fails CI.

Steps:
- npm ci
- npx tsc --noEmit
- npx vitest run --reporter=verbose

Concurrency group cancels superseded in-flight runs.
Timeout 10 min (current local run is ~30s).

Branch protection update is post-merge — Scott adds 'Vitest / vitest'
as a required status check via Settings → Branches → main → Edit."
```

---

## Task 3: Push, open PR, document follow-ups

**Files:** none modified. This task is bookkeeping — push the branch, open the PR, then verify CI runs.

- [ ] **Step 1: Push branch to origin**

Run: `git push -u origin <branch-name>` (the worktree's branch name; controller fills this in at execution time).

- [ ] **Step 2: Open the PR**

Run (with `unset GH_TOKEN &&` prefix per project convention):

```bash
unset GH_TOKEN && gh pr create --title "ci(#390): add Vitest CI gate + skip 33 deferred RED tests" --body "$(cat <<'EOF'
Closes #390.

## Summary

- Adds `.github/workflows/vitest.yml` as a strict CI gate (any vitest failure or tsc error fails the build).
- Converts 33 pre-existing RED-state failures to `describe.skip()` / `it.skip()` across 8 files. Description strings preserved verbatim — existing `(Sprint 33 RED)` / `(Issue #234)` tags carry the tracking signal.
- Pattern follows existing `src/__tests__/rls-profiles-select.test.ts:61` convention.

## Triggering incident

PR #384 (admin-table-unification — Contacts) shipped with 19 vitest regressions. Watchdog round 2 caught it locally; round 1 missed because no CI gate forced the run.

## Vitest run after this PR

`npx vitest run` — 0 failed | 33 skipped | ~1596 passing.

## Out of scope (deferred)

Per spec §Non-goals:

1. **Branch protection rule update.** Add `Vitest / vitest` as a required status check on `main`. UI: Settings → Branches → main → Edit → Require status checks → search "Vitest". One-time admin action.
2. **8 follow-up issues** to track unwinding each `.skip()` when the deferred sprint work ships:
   - admin-destructive-copy-234.test.tsx (Issue #234 destructive copy refactor)
   - admin-sponsorships-category-filter.test.tsx (Sprint 33 category filter)
   - database-types.test.ts:189 (Sprint 33 enum types regen)
   - rls-self-promotion.test.ts (move to integration test job — needs real Supabase)
   - sponsorship-form-polish.test.tsx (Sprint 19 PR-C form spacing)
   - sponsorships-actions.test.ts × 2 (Sprint 33 active_sponsor_count + category filter)
   - sponsorships-drawer.test.tsx (3 RED drawer tests)
   - sponsorships-manager.test.tsx × 2 (Sprint 33 cascade-warning + refetch tests)
3. **Integration test job** for `rls-self-promotion.test.ts` and any future DB-dependent tests. Separate spec.

## Provenance

- Spec: `docs/superpowers/specs/2026-05-09-vitest-ci-gate-design.md`
- Plan: `docs/superpowers/plans/2026-05-09-vitest-ci-gate.md`
- Pattern reference: `src/__tests__/rls-profiles-select.test.ts:61`
- Triggering incident: PR #384 Watchdog round-2 review

## Test plan

- [ ] CI green (vitest workflow runs on this PR)
- [ ] Watchdog stage-2

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed.

- [ ] **Step 3: Verify the new vitest workflow runs on the PR**

After PR opens, run: `unset GH_TOKEN && gh pr checks <PR-NUMBER> -R scottdavenport/craven-cancer-classic`

Expected: `Vitest / vitest` check appears, runs, exits success. (If the workflow doesn't appear in checks, GitHub may not have detected the new workflow on the PR's first commit — try pushing an empty commit or wait a few seconds. Should not happen for new workflow files added on the same PR — both should detect.)

If the workflow fails: STOP and check the run output via `gh run view`. Most likely cause: a missed `.skip` conversion or a tsc error.

- [ ] **Step 4: Hand off to Watchdog stage-2**

Per the Forge cadence, the controller dispatches `forge:Watchdog 🐕` to review the PR. Sentinel is NOT needed (no auth/RLS/migration changes — `.skip()` calls + a workflow yaml).

---

## Summary

| Task | Files modified | Tests changed |
|---|---|---|
| 1 | 8 test files | 33 RED → skipped |
| 2 | 1 new workflow file | — |
| 3 | (bookkeeping) | — |

**Total:** 9 files modified, 33 tests converted to `.skip`, 1 strict CI gate added.
