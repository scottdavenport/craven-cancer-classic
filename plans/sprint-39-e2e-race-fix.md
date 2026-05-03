# Sprint 39 — Fix race-condition in contact-bulk-blocked-alert spec

## § 1 Plain-English readout

The admin contact page has had a continuously red CI suite since 2026-05-01 22:12 — every push to main fails the same single test. Admins are not affected (the production UI works correctly), but every PR gets a red check, eroding trust in the test suite and making it harder to catch real regressions. This sprint fixes the one failing test in `tests/e2e/contact-bulk-blocked-alert.spec.ts` so CI goes green and stays green.

No user-visible changes. No production code changes. Test file only.

---

## § 2 Background / why now

**CI has been red for 12 consecutive pushes.** The last green commit was `19b59e8` (2026-05-01 19:xx). Every run since: 95 passed / 1 failed. The failing test is line 161 — "bulk Remove with blocked rows: Alert lists blocked contact name + reason."

**Sprint 31 shipped this UI in full** (PRs #265, #268, #269, #270, et al.). The stale docstring at lines 11-14 of the spec ("FAILING on unmodified main because: bulkRemoveContactType doesn't exist…") is months wrong. Sprint 31 built all of this. The header misleads any reader into thinking the code is missing rather than the test being broken.

**Root cause (static analysis confirmed by Forge):**

1. Test clicks the team filter dropdown → picks first option. Under the hood this fires `handleTeamFilterChange` (contact-list.tsx:238), which calls `fetchWithServerFilter` (contact-list.tsx:225), which runs `getContacts` inside `startTransition` — fire-and-forget async. The re-fetch is not awaited by the click handler.
2. Test immediately checks the `thead` header checkbox without waiting for the re-fetch to complete.
3. At click moment, `filtered` array is still empty (transition in flight). `handleHeaderCheckbox` (contact-list.tsx:284) iterates an empty `filteredIds` → `selected` Set stays empty.
4. The bulk-action bar (contact-list.tsx:607) only renders when `selected.size > 0`. With selected empty, no bar renders.
5. Test's guard at line 193 (`getByRole("checkbox", { checked: true }).count() >= 1`) passes — but only because Playwright's `.check()` marks the header checkbox's visual state synchronously. The React `selected` state is still empty.
6. Test asserts `removeBulkBtn.toBeVisible({timeout: 3000})` at line 203 → timeout → FAIL.

**Bonus latent bug:** line 181 uses `page.getByRole("option").first()` to pick a team, but the first option in the dropdown is "All Teams" (contact-list.tsx:570) — not an actual team. So even after fixing the race, the test was filtering to "all teams" (a no-op), not to a real team's members. The blocked-row Alert path requires contacts that are team members, so this second bug must also be fixed for the test to exercise its intended code path.

---

## § 3 Specialist gates

**No Aria upfront-gate needed.**

> **No user-facing strings.** This sprint adds no labels, CTAs, errors, empty/loading states, microcopy, or visible date/number/units formats. The single file modified is a Playwright test. If the implementation surfaces any new string, the builder must pause and request an Aria spawn before shipping.

**Spec only.** This is a test-only file. No Bolt, no Pixel, no Compass re-spawn needed at execution time. Spec executes the four edits below, verifies locally, then opens the PR.

---

## § 4 Acceptance criteria

Each AC maps directly to one of the four edits below.

### AC-1: Stale docstring replaced

```
grep -n "FAILING on unmodified main" tests/e2e/contact-bulk-blocked-alert.spec.ts
```
Expected output: **0 lines** (no match).

```
grep -n "Sprint 31 blocked-row Alert" tests/e2e/contact-bulk-blocked-alert.spec.ts
```
Expected output: **1 line** (the replacement header).

### AC-2: Team filter wait inserted after team selection click

```
grep -n "waitFor" tests/e2e/contact-bulk-blocked-alert.spec.ts
```
Expected output: **at least 2 lines** (one already exists at line ~91 in the third test; the new one must appear after the `firstTeam.click()` call in the fourth test, targeting `tbody tr` becoming visible before proceeding).

The wait must appear between the `firstTeam.click()` line and the `headerCheckbox.check()` line in the fourth test.

### AC-3: "All Teams" skip replaced with actual-team selection

```
grep -n "getByRole(\"option\").first()" tests/e2e/contact-bulk-blocked-alert.spec.ts
```
Expected output: **0 lines** (the `first()` form is gone).

```
grep -n "nth(1)" tests/e2e/contact-bulk-blocked-alert.spec.ts
```
Expected output: **at least 1 line** in the fourth test, where the team option is picked.

The code must also handle the case where `nth(1)` returns no visible option (no real teams in DB) — annotate and return rather than fail.

### AC-4: Selection-state guard replaces checkbox-count guard

```
grep -n "getByRole(\"checkbox\", { checked: true }).count()" tests/e2e/contact-bulk-blocked-alert.spec.ts
```
Expected output: **0 lines** (old guard gone).

```
grep -n "selected" tests/e2e/contact-bulk-blocked-alert.spec.ts | grep -v "//.*selected"
```
The fourth test must contain a `waitFor` or `isVisible` check on `page.getByText(/\d+ selected/)` (or equivalent `X selected` indicator from the bulk bar) before it attempts to assert `removeBulkBtn.toBeVisible()`.

### AC-5: Suite passes locally

Spec runs the targeted spec file and pastes the literal output of:

```
cd ~/github/craven-s39-plan && npx playwright test tests/e2e/contact-bulk-blocked-alert.spec.ts --project=chromium
```

Output must contain a line matching `X passed` (where X >= 1) with zero lines matching `failed`. Per `feedback_skip_is_not_pass`: "skipped" alone does not satisfy this AC. At least one test must have the literal word `passed`.

### AC-6: Full e2e suite passes in CI

Watchdog triggers a `workflow_dispatch` run on the build PR's branch. CI output must show `95 passed` (or more if new tests are added) / `0 failed`. This is Watchdog's gate, not Spec's — but Spec must confirm the PR branch exists and CI is running before declaring done.

---

## § 5 Files touched

Exactly one file:

- `tests/e2e/contact-bulk-blocked-alert.spec.ts` — modify (four edits below)

No production files. No migrations. No config changes.

---

## § 6 Risks and open questions

**Q1: Is networkidle reliable in CI for this pattern?**
No — `waitForLoadState("networkidle")` has historically been fragile in Next.js apps where background fetches are common. The more deterministic pattern is to wait for a DOM element that only appears after the data arrives. The `tbody tr` waitFor pattern is already used at line 91 of the third test (`contact-bulk-blocked-alert.spec.ts:91`) and should be reused here.

**Q2: What if no teams exist in seed data after the filter pick?**
If `nth(1)` has no visible option (empty DB), the `isVisible` check at line 182 (currently guarding `.first()`) catches it and returns early. After the fix, the same guard catches it for `nth(1)`. The test annotates "no teams in DB" and exits cleanly — consistent with the sibling graceful-skip pattern at lines 138-158 and 222-236.

**Q3: After fixing the race and picking an actual team, will the test actually reach the Alert branch?**
Only if: (a) at least one team exists, (b) at least one contact in that team has Player type, and (c) `bulkRemoveContactType` returns blocked rows. In PROD data this is likely; in a fresh seed DB it may not be. The test already has the conditional `if (alertVisible)` branch at lines 222-236 — it annotates and exits cleanly if no blocked contacts are found. This is correct behavior. The test is exercising "does the Alert render if there are blocked rows" — the `if`-branch is not a failure, it's an honest "no blocked data in this run" annotation.

**Q4: Does the bulk-delete or bulk-subscribe spec have an established post-filter-wait pattern to copy?**
No. Neither `contact-bulk-subscribe.spec.ts` nor `contact-bulk-delete.spec.ts` uses a team filter step — they both work with the full contact list without filtering. The pattern to borrow is scoped: use `tbody tr` `waitFor` as already done in the third test of this same spec (line 91). That is the canonical pattern for this file.

---

## § 7 Implementation notes for Spec

Four edits to `tests/e2e/contact-bulk-blocked-alert.spec.ts`:

### Edit A — Replace stale docstring (lines 11-14)

Remove:
```
 * FAILING on unmodified main because:
 * - bulkRemoveContactType doesn't exist (only bulkUpdateContacts)
 * - No blocked-row Alert component exists in contact-list.tsx
 * - The bulk action bar has Set-Type only (no Add/Remove split)
```

Replace with:
```
 * Sprint 31 shipped the blocked-row Alert UI (PRs #265, #268-#270).
 * These tests exercise the Sprint 31 blocked-row Alert path.
```

### Edit B — Skip "All Teams" option (around line 181)

Current code:
```ts
const firstTeam = page.getByRole("option").first();
```

Replace with:
```ts
// nth(0) is "All Teams" — skip it and pick the first real team (nth(1)).
const firstTeam = page.getByRole("option").nth(1);
```

The `isVisible` guard immediately below already handles the case where no option is visible — it returns early. No further change needed to the guard itself.

### Edit C — Wait for data to arrive after filter click (after line 185, the `firstTeam.click()` call)

After `await firstTeam.click();`, insert:
```ts
// Wait for the async getContacts re-fetch (startTransition) to settle.
// The tbody row appearing is more deterministic than networkidle in CI.
await page
  .locator("tbody tr")
  .first()
  .waitFor({ state: "visible", timeout: 5_000 })
  .catch(() => null);
```

The `.catch(() => null)` means an empty result (no team members) doesn't throw — the test continues to the `headerCheckbox` step, finds nothing to select, and exits via the existing `selCount < 1` guard (lines 193-196) or the new AC-4 guard.

### Edit D — Replace checkbox-count guard with bulk-bar visibility guard (lines 193-196)

Current code:
```ts
const selCount = await page.getByRole("checkbox", { checked: true }).count();
if (selCount < 1) {
  return;
}
```

Replace with:
```ts
// Wait for the bulk-action bar's "X selected" indicator — this confirms
// React state has updated (selected.size > 0) rather than just the visual
// checkbox state, which Playwright marks synchronously on .check().
const selectedIndicator = page.getByText(/\d+ selected/).first();
const bulkBarVisible = await selectedIndicator.isVisible({ timeout: 3_000 }).catch(() => false);
if (!bulkBarVisible) {
  test.info().annotations.push({
    type: "skip-reason",
    description: "Header checkbox check did not produce a selection (filtered list may be empty). Skipping bulk-bar assertion.",
  });
  return;
}
```

This is the deterministic fix for the race: the bulk bar's "X selected" text only renders when `selected.size > 0` in React state, which only happens after `handleHeaderCheckbox` iterates a non-empty `filteredIds` — which only happens after the async re-fetch settles (Edit C above).

---

## § 8 Execution order

1. Spec creates worktree: `git worktree add ../craven-s39-build -b s39-e2e-race-fix main`
2. Spec applies Edits A, B, C, D to `tests/e2e/contact-bulk-blocked-alert.spec.ts`
3. Spec runs `npx playwright test tests/e2e/contact-bulk-blocked-alert.spec.ts --project=chromium` and pastes output
4. Spec opens PR (`unset GH_TOKEN && gh pr create`) with title `fix: e2e race-condition in contact-bulk-blocked-alert spec (sprint 39)`
5. Forge triggers Watchdog review
6. Watchdog triggers CI via `workflow_dispatch` on the PR branch — must show 0 failed
7. Watchdog APPROVED → merge

Estimated builder time: S (1 file, 4 small edits, ~1h including local run verification).
