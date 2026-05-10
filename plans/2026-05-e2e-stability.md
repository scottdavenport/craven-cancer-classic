# e2e-stability
**Milestone:** e2e-stability (GitHub milestone #3)
**Target date:** 2026-05-14
**Plan written:** 2026-05-10
**Specialist:** Compass

---

## Plain-English Readout

This sprint closes the e2e test flakiness that remained after the test-refresh sprint (PR #394).
Webkit moved from consistent failures to intermittent ones — still unacceptable in CI because
they block PR merges on random runs. Two issues address this: #402 owns the three webkit specs
(one structural selector fix + one retry-bump judgment call) and #410 owns characterization of
three chromium contacts flakes that appeared in PR #408 dispatch runs. The sprint is purely
test-infrastructure work — no application code changes, no new features, no user-facing behavior.

The deliverable is a CI run on `main` where all five named specs pass consistently across both
webkit and chromium: no intermittent failures over three consecutive CI runs. One spec
(`contact-bulk-delete.spec.ts`) appears in both issues on different browsers — the webkit fix
and the chromium characterization are independent investigations that may or may not converge
on the same root cause. The sprint is NOT in scope for fixing any flakes outside the five named
specs, and it does NOT touch application source except where a test selector fix is impossible
without a corresponding component change (flagged as a risk below).

---

## Aria Upfront-Gate

No user-facing strings. This sprint adds no labels, CTAs, errors, empty/loading states,
microcopy, or visible date/number/units formats. All changes are test files and/or config.
If any implementation surfaces a new user-facing string, the builder must pause and request
an Aria spawn before shipping.

---

## Per-Issue Spec Enrichment

### Issue #402 — Webkit residual flake — 3 specs intermittent in CI

**Three sub-problems; fix order matters:**

#### Sub-problem A — `contact-bulk-delete.spec.ts:37` — pointer-events interception in webkit

**Diagnosis (confirmed from run 25585469083):** The `<div class="flex items-center justify-end gap-2">` at `src/app/admin/contacts/contact-list.tsx:1005` wraps `<RowActions>`. The `RowActions` actions `<span>` carries `pointer-events-none group-hover/row:pointer-events-auto` — correct. However the parent `<div>` wrapper at line 1005 has no `pointer-events-none` guard, so in webkit it can intercept clicks on nearby elements (per-row checkboxes, etc.) before the hover-reveal completes. `force: true` does NOT bypass element-interception — it only bypasses actionability checks. This is a real DOM hit-test issue.

**Fix approach (test-side first):** The test at `contact-bulk-delete.spec.ts:54-59` already uses `[data-slot='checkbox']` scoping and `force: true`. If the webkit failure is at the checkbox click (line 58), add an explicit `waitFor({ state: 'visible' })` on the checkbox locator before the `click({ force: true })` — this makes the actionability window deterministic before webkit's pointer-event dispatch. Additionally, add a `page.waitForTimeout(200)` after each checkbox click to allow webkit's opacity transition to settle before moving to the next row (since `reducedMotion: "reduce"` is already set but webkit's transition engine may still buffer the pointer-event queue).

**If test-side fix is insufficient:** The underlying issue is that `contact-list.tsx:1005`'s wrapper `<div>` needs `pointer-events-none` to not compete with the checkbox. That is a source change — flag to Scott and file a follow-up issue for Bolt. Do NOT modify `src/app/admin/contacts/contact-list.tsx` or `src/components/admin/row-actions.tsx` in this sprint unless Scott explicitly approves expanding scope.

**Acceptance criteria:**

- `contact-bulk-delete.spec.ts` passes in webkit on 3 consecutive CI runs with no TimeoutError at the checkbox click loop (lines 54-59)`
- `contact-bulk-delete.spec.ts` webkit run does not emit "intercepts pointer events" in trace output`
- `grep -n "force: true" tests/e2e/contact-bulk-delete.spec.ts` returns ≥ 1 result at the checkbox click site (force stays — it's defense-in-depth; the new guard is the `waitFor` before it)`
- If source-side change was required: a follow-up GitHub issue is filed describing the `contact-list.tsx:1005` wrapper `pointer-events-none` gap before the PR merges`
- `Watchdog APPROVED before merge (sentinel-required)`

#### Sub-problem B — `team-deleted-member-placeholder.spec.ts:24` — webkit timing race

**Diagnosis:** Pure timing race at line 24 (`await contactRow.hover()`) or the subsequent `click({ force: true })` on the Edit button. The spec's Step 3 already uses `force: true` on both `hover()` and the Edit click. The intermittency profile (passes in chromium, passes in most webkit runs) matches a marginal timing window — the RowActions `<span>` transitions from `pointer-events-none` to `pointer-events-auto` on hover, but webkit's hover event and the CSS transition may not complete atomically.

**Fix approach:** Bump CI retries from 2 → 3 in `playwright.config.ts` as the first lever (low cost, 1-line change). If this spec still fails at retry=3 in post-merge CI runs, the deeper fix is to add `await page.waitForSelector('[aria-label="Edit PlaceholderTest Member"]', { state: 'visible' })` before the click — this waits for the RowActions cluster to be both visible AND in the DOM before clicking rather than relying on hover → opacity transition completing in time.

**Acceptance criteria:**

- `playwright.config.ts retries: process.env.CI ? 3 : 0` (bumped from 2)
- `team-deleted-member-placeholder.spec.ts` passes in webkit on 3 consecutive post-merge CI runs (zero failures across those runs)`
- If the retry bump alone is declared sufficient: a code comment is added at `playwright.config.ts:11` documenting why retries=3 (webkit timing races on RowActions opacity transitions for #402-B and #402-C)`

#### Sub-problem C — `unique-email-after-softdelete.spec.ts:28` — webkit timing race

**Diagnosis:** Same profile as sub-problem B. The failure is at or near the Step 2 click sequence in `unique-email-after-softdelete.spec.ts:50-54` (hover + Edit click on the origRow). The spec already uses `hover({ force: true })` and `click({ force: true })`. Intermittent in webkit, consistent in chromium.

**Fix approach:** Same retry bump from sub-problem B covers this (they share `playwright.config.ts`). If still flaky post-retry-bump, add `await origRow.getByRole("button", { name: /^Edit/i }).waitFor({ state: 'visible' })` before the `click({ force: true })` at line 51 — makes the Edit button's visibility deterministic before dispatch.

**Acceptance criteria:**

- `unique-email-after-softdelete.spec.ts` passes in webkit on 3 consecutive post-merge CI runs
- No additional `waitFor` guard required if retry bump holds; if guard IS added, it targets `tests/e2e/unique-email-after-softdelete.spec.ts:51` specifically

**Combined files to create/modify for #402:**

- MODIFY: `playwright.config.ts` — bump `retries: process.env.CI ? 2 : 0` to `retries: process.env.CI ? 3 : 0`; add comment at the retries line citing #402-B/#402-C
- MODIFY: `tests/e2e/contact-bulk-delete.spec.ts` — add `waitFor({ state: 'visible' })` before checkbox `click({ force: true })` loop at line 58; optionally add 200ms settle gap between iterations
- MODIFY: `tests/e2e/team-deleted-member-placeholder.spec.ts` — if retry bump is insufficient, add `waitFor({ state: 'visible' })` guard before Edit button click at line 66
- MODIFY: `tests/e2e/unique-email-after-softdelete.spec.ts` — if retry bump is insufficient, add `waitFor({ state: 'visible' })` guard before Edit button click at line 51

**Effort estimate:** S (2-4 files; the retry bump alone covers sub-problems B and C with 1 file)

**Specialist routing:** Spec (all changes are test files or config). If sub-problem A requires `contact-list.tsx:1005` source change, pause and spawn Bolt for that sub-task; Spec does not touch application source.

---

### Issue #410 — Characterize 3 chromium contacts flakes

**Framing decision (Compass call):** The title says "characterize," and Compass is keeping that framing. The evidence — three intermittent failures on a PR that didn't touch contacts code — confirms flakes, not regressions. The right deliverable is: (1) reproduce each flake locally with `--repeat-each=10` to confirm the failure pattern, (2) identify whether it shares a root cause with the webkit fix in #402, and (3) either land a fix if it's a trivial selector/wait guard OR file a follow-up issue with a characterization report if it requires deeper work. Do not ship a speculative fix without local reproduction.

**Three sub-problems:**

#### Sub-problem A — `contact-bulk-delete.spec.ts:37` — chromium variant

**Overlap note:** This spec is also in #402 (webkit). The webkit diagnosis is pointer-events interception on the checkbox loop. The chromium failure in PR #408 run 1 is a single intermittent hit — different browser, possibly different mechanism. The webkit fix (waitFor guard on checkbox loop) may incidentally fix the chromium variant too, since the guard makes the click more deterministic in all browsers. Characterization task: run `npx playwright test tests/e2e/contact-bulk-delete.spec.ts --project=chromium --repeat-each=10` locally and observe whether the failure appears. If #402's test-side fix is already merged, rerun against that branch.

**Acceptance criteria:**

- Builder runs `contact-bulk-delete.spec.ts --project=chromium --repeat-each=10` and documents the failure rate in the PR body (e.g., "3/10 runs failed at line 58" or "0/10 — webkit fix resolved it too")
- If failure rate > 0 after #402's fix: a fix lands in `tests/e2e/contact-bulk-delete.spec.ts` targeting the chromium-specific click site, OR a new issue is filed with the reproduction report before this PR merges
- If failure rate = 0 after #402's fix: PR body notes "chromium variant resolved by #402 webkit fix; no additional change needed"

#### Sub-problem B — `contact-bulk-blocked-alert.spec.ts:78` — chromium

**Diagnosis starting point:** Line 78 is the test `"bulk Remove Player: blocked contacts surface inline Alert with name + reason, Alert dismissible"`. The test body at lines 78-161 selects checkboxes (lines 105-107), clicks the "Remove type" combobox (line 122), and picks "Player" (line 129). The chromium failure is intermittent under load — the most likely candidates are: (a) the `checkboxes.nth(i).click()` loop at line 105-107 not completing before the "X selected" indicator assertion at line 110, or (b) the combobox option not resolving before the `playerOption.isVisible` check times out at line 128.

**Characterization task:** Run `npx playwright test tests/e2e/contact-bulk-blocked-alert.spec.ts --project=chromium --repeat-each=10` locally. Note which assertion fails and at what line number.

**Acceptance criteria:**

- Builder documents the reproduction rate and failing assertion in the PR body
- If root cause is the checkbox click loop: add `await expect(checkboxes.nth(i)).toBeEnabled()` guard before each `click()` at line 105-107 in `contact-bulk-blocked-alert.spec.ts`
- If root cause is the combobox option timing: extend the `isVisible` timeout on `playerOption` from 1_000ms to 3_000ms at line 128
- If root cause is uncharacterizable locally (0/10 reproductions): PR body documents that and files a follow-up CI-only investigation issue before merging
- `contact-bulk-blocked-alert.spec.ts` passes in chromium on 3 consecutive CI runs post-fix

#### Sub-problem C — `contact-soft-delete-restore.spec.ts:23` — chromium

**Diagnosis starting point:** Line 23 is the test `"soft-deletes a contact, finds it in Trash, restores it"`. The chromium failure on PR #408 run 2 is intermittent. The test body's Step 2 at lines 40-55 does a `hover({ force: true })` + Edit button click + modal interaction. The restore at line 74 clicks a `getByRole("button", { name: /restore/i })` with no `waitFor` guard. Most likely candidate: the restore button click resolves before the Trash tab's row has fully rendered, especially under CI load.

**Characterization task:** Run `npx playwright test tests/e2e/contact-soft-delete-restore.spec.ts --project=chromium --repeat-each=10` locally.

**Acceptance criteria:**

- Builder documents the reproduction rate and failing assertion in the PR body
- If root cause is the restore button timing: add `await contactRow.getByRole("button", { name: /restore/i }).waitFor({ state: 'visible' })` before the `.click()` at line 74 in `contact-soft-delete-restore.spec.ts`
- If root cause is the "restored|success" toast timing: extend the `toBeVisible` timeout from 5_000ms to 10_000ms at line 77
- If root cause is uncharacterizable: file a follow-up issue before this PR merges
- `contact-soft-delete-restore.spec.ts` passes in chromium on 3 consecutive CI runs post-fix

**Combined files to create/modify for #410:**

- MODIFY: `tests/e2e/contact-bulk-delete.spec.ts` — only if chromium variant needs a separate fix from #402's webkit fix
- MODIFY: `tests/e2e/contact-bulk-blocked-alert.spec.ts` — add guard(s) per sub-problem B characterization
- MODIFY: `tests/e2e/contact-soft-delete-restore.spec.ts` — add guard(s) per sub-problem C characterization

**Effort estimate:** M (characterization pass = 1h; fixes = 0.5-1h per spec; follow-up issue filing = 0.25h if needed; total 2-4h depending on reproduction rates)

**Specialist routing:** Spec for all characterization and test-side fixes. If characterization reveals a source-side race (e.g., the restore action is missing an await on a server action promise), pause and spawn Bolt.

---

## Dependency + Parallelism Map

| Issue | Files touched |
|-------|--------------|
| #402  | `playwright.config.ts`, `tests/e2e/contact-bulk-delete.spec.ts`, `tests/e2e/team-deleted-member-placeholder.spec.ts`, `tests/e2e/unique-email-after-softdelete.spec.ts` |
| #410  | `tests/e2e/contact-bulk-delete.spec.ts` (possibly), `tests/e2e/contact-bulk-blocked-alert.spec.ts`, `tests/e2e/contact-soft-delete-restore.spec.ts` |

**Overlap:** `tests/e2e/contact-bulk-delete.spec.ts` is touched by BOTH #402 (webkit checkbox fix) and #410 (chromium characterization). These issues MUST run serially — #402 first, since its webkit fix may resolve #410-A too. If #410 runs before #402 merges, the chromium characterization baseline is dirty (you don't know which fix caused which outcome).

**`playwright.config.ts`** is touched only by #402 (retry bump). #410 does not touch it.

**Serial requirement:** #402 → #410. Run #410 only after #402 is merged to main.

---

## Execution Order

**Wave 1 — #402 (Spec):**
- Sub-problem A first: add `waitFor` guard to `contact-bulk-delete.spec.ts` checkbox loop
- Sub-problem B/C together: bump retries in `playwright.config.ts` (1-line change covers both)
- Verify locally with `npx playwright test --project=webkit --repeat-each=5` on the three specs
- PR → Watchdog APPROVED → merge

**Wave 2 — #410 (Spec), after #402 is merged:**
- Pull fresh main (includes #402's retry bump and webkit fix)
- Characterize each sub-problem with `--repeat-each=10` per spec per browser
- For any spec still failing: land targeted fix (per AC above)
- For any spec at 0/10 reproductions: note in PR body, no fix needed
- File follow-up issues for any uncharacterizable failures before merging
- PR → Watchdog APPROVED → merge

**One-liner:** Wave 1: #402 (Spec) — webkit fixes → merge → Wave 2: #410 (Spec) — chromium characterization on clean main → targeted fixes or follow-up issues.

**Total builder time estimate:**

| Issue | Sub-problem | Estimate |
|-------|-------------|----------|
| #402-A | contact-bulk-delete webkit selector fix | 1.0h |
| #402-B/C | retry bump + conditional waitFor guards | 0.5h |
| #410 | characterization runs (3 specs × 10 repeats) | 1.0h |
| #410 | targeted fixes (per characterization results) | 0.5-1.5h |
| **Total** | | **3.0-4.0h** |

**Confidence band:** 3h (if retry bump + webkit guard fully resolves B/C, and chromium issues clear after #402 merge) to 5h (if all three chromium specs need independent fixes and two follow-up issues need filing).

---

## Risks + Out-of-Scope

**Risk 1 — Source-side selector change for #402-A.**
The webkit pointer-events interception on `contact-bulk-delete.spec.ts:37` may require adding `pointer-events-none` to the `<div class="flex items-center justify-end gap-2">` wrapper at `contact-list.tsx:1005`. That is a source change outside Spec's domain. If the test-side `waitFor` guard is insufficient: pause, file a follow-up Bolt issue for `contact-list.tsx:1005`, and merge whatever test-side improvement was possible. Do not block the sprint on this.

**Risk 2 — Retry bump masks, not fixes, sub-problems B/C.**
Bumping retries from 2 → 3 reduces the probability of a flake making it through CI but does not fix the underlying race. If sub-problems B/C are marginal-window timing races (most likely), 3 retries will hold in CI. If they are structural races (hover cluster never resolves under certain load conditions), retries will eventually fail again. The `waitFor` guard approach is the correct fix; the retry bump is the low-cost first lever. Builder should document which approach was used in the PR body.

**Risk 3 — `contact-bulk-delete.spec.ts` owned by both issues.**
If both #402 and #410 create PRs for this file without the serial execution order, a merge conflict is guaranteed. Serial order (Wave 1 → Wave 2) eliminates this. Do not start #410's PR until #402 is merged.

**Risk 4 — Chromium "characterize" framing on #410.**
Compass has kept the "characterize" framing. The AC above defines specific characterization tasks (--repeat-each=10 runs) and conditional fix criteria. If characterization finds 0/10 reproductions on all three specs after #402 is merged, the correct outcome is "chromium flakes resolved by webkit retry infrastructure" — close #410 with the reproduction report as PR body, no code change needed. Do not ship fixes that weren't reproduced locally.

**Out of scope:** Any spec not in the five named files. Any source-side change to `row-actions.tsx`, `contact-list.tsx`, or any server action. Any CI workflow changes (`.github/workflows/`). Any new e2e specs.

---

## Forge Engagement Checklist

Before running this sprint, Forge must verify:

- [ ] Plan PR at branch `e2e-stability/sprint-plan` → Watchdog APPROVED → merge to main before builder spawns
- [ ] Both issues (#402, #410) are assigned milestone `e2e-stability` (milestone #3) — confirm via `gh issue list --milestone e2e-stability`
- [ ] Both issues carry labels `type:tech-debt priority:p2 size:S` (#402) and `type:tech-debt priority:p2 size:M` (#410) — no unlabeled issues
- [ ] Builder branch naming: `e2e-stability/fix-webkit-flakes` for #402; `e2e-stability/characterize-chromium-flakes` for #410
- [ ] #402 branch pulls from fresh main before starting work
- [ ] #410 branch pulls from main AFTER #402 is merged — serial requirement, not parallel
- [ ] Spec is the routing specialist for both issues; Bolt is on standby only if source-side change is needed for #402-A
- [ ] Watchdog sentinel review required on both PRs before merge

---

## Target Date Recommendation

**Recommended milestone target: 2026-05-14 (4 days from plan date)**

Reasoning:
- Total builder work is 3-4h — one builder can finish both issues in two focused sessions.
- Serial execution adds ~24h between wave 1 merge and wave 2 start (Watchdog turnaround buffer).
- No design, copy, or migration dependencies — all Aria gates are no-strings attestations.
- Admin-hardening got 2026-05-16 at ~4h; e2e-stability is smaller (2 issues, no migration), so 2026-05-14 is achievable.
- Event date is September 2026 — no external deadline pressure, but flaky CI blocks all future PRs. Closing this sprint before the next feature sprint starts is the right call.
