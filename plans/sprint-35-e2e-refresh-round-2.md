# Sprint 35 — E2E Spec Refresh Round 2 (#331)

**Date:** 2026-05-01
**Author:** Compass
**Status:** Plan (pending Forge review + PR open as scottdavenport)
**Closes:** #331
**Unblocks:** #322 (Playwright CI workflow)

---

## What this means in plain English

Per `feedback_plain_english_readouts`: test refresh sprints have no direct user-facing change. Frame it right.

The admin side of the app — contacts, teams, scores — went through three major shape changes in Sprint 31, 32, and 33: multi-type checkboxes replaced the type dropdown, side drawers migrated to centered modals, teams dropped the team_name column and now use captain identity, and scores gained a team dropdown. The E2E regression net should have caught any future break in those admin workflows automatically.

It doesn't, because the specs that cover those workflows are stale. They're clicking buttons that no longer exist, expecting UI patterns from the old shape, and many of them quietly skip rather than fail — hiding the rot. Sprint 34 fixed the first batch (contact-create-edit, soft-delete-restore, bulk-delete, email-locator sweep). Seven specs remain bit-rotten.

This sprint restores the regression net for all seven. When Sprint 35 ships:

- An engineer pushing a change that breaks the contact multi-type form will see a failing test on the first CI run, not a support ticket a week later.
- The team modal and score modal are pinned against the Sprint 32 contract. If someone accidentally re-adds a "Team Name" text input or reverts to a drawer, the spec catches it.
- The bulk type-removal flow (add/remove type on multiple contacts at once) is covered end-to-end.
- The type-removal guard (blocked when contact is on a team) is exercised against live PROD data.

No new product surfaces. No schema changes. What changes is that after this sprint, the E2E suite is a trustworthy regression net again — a hard requirement before enabling Playwright in CI (#322).

---

## 8 Patterns Reference

Established in Sprint 34 execution. All are relevant to this sprint's 7 specs.

| ID | Pattern | Canonical fix |
|----|---------|---------------|
| A | `getByLabel(/email/i)` → `getByRole("textbox", { name: "Email" })` | Sprint 31's marketing-consent switch added a second "Email" label; role+name avoids the collision |
| B | `getByRole("combobox", { name: /type/i })` → `getByRole("checkbox", { name: /^player$/i })` etc. | Sprint 31 replaced the type dropdown with multi-type checkboxes on the form side; filter dropdowns remain comboboxes |
| C | Stale "drawer" naming in describe blocks / comments | Replace "drawer" → "modal" or "centered modal" throughout |
| E | `/save/i` → `{ name: "Create", exact: true }` in create flow; `{ name: "Save", exact: true }` in edit flow | Modal renders "Create" on new contact, "Save" on edit; regex `/save/i` never matches "Create" |
| F | Submit attempt with no type checked → button disabled, test times out | Sprint 31 #268: at least one type checkbox must be checked before Save/Create is enabled; any test that doesn't `.check()` a type before clicking submit will time out |
| G | `getByRole("button", { name: /confirm|yes/i })` → `getByRole("button", { name: "Delete", exact: true })` | ConfirmDialog renders `confirmLabel="Delete"`; `/confirm|yes/i` matches nothing; also must disambiguate from the edit-modal "Delete contact" trigger (use `.last()` or scope within confirm dialog) |
| H | `getByText(TEST_EMAIL)` in Trash → `getByText(FULL_NAME)` | Trash column is `full_name`, not email; assertions on email text always fail |
| TS | Static names → per-run timestamps | Static test names accumulate in PROD across runs; strict-mode locators collide on the second run; use `Date.now()` suffix in email AND derive `FULL_NAME` from the name constants |

---

## Step 1 — Exhaustive Per-Spec Pattern Map

Per `feedback_pattern_enumeration_in_plan`: every pattern hit is enumerated BEFORE builders spawn. Iterative discovery during execution is the failure mode this rule prevents.

---

### tests/e2e/contact-multi-type.spec.ts

**Summary:** 11 tests, all inside `Sprint 31 — multi-type form`. This file was written for the Sprint 31 contract and is largely correct about form structure (checkboxes, modal, `getByRole("textbox", { name: "Email" })`). The dominant failure is Pattern E: every submit in a create-flow uses `getByRole("button", { name: /save/i })` which never matches the "Create" button label. There is also a Pattern G remnant in `softDeleteContact()` which is the file-local cleanup helper.

**Pattern E — Create vs Save (DOMINANT — all 11 tests affected)**

The `softDeleteContact()` helper (lines 50–64) opens the edit modal and clicks a delete trigger, then a confirm — this is the edit/delete path, so "Save" is not involved there. But all create-flow paths call:

```
await page.getByRole("button", { name: /save/i }).click();
```

In "Add contact" create-flow, the button label is **"Create"**, not "Save". `/save/i` will never match. The modal never submits. The test times out.

Affected lines (create-flow submit):

- Line 84–85: Test 1 (Player + Sponsor) — `getByRole("button", { name: /save/i })` × 2
- Line 119: Test 2 (Volunteer only) — `getByRole("button", { name: /save/i })`
- Line 148: Test 3 (Player + Volunteer) — `getByRole("button", { name: /save/i })`
- Line 187: Test 4 (Donor + wall toggle) — `getByRole("button", { name: /save/i })`
- Line 213: Test 5 (recognition_name blank) — `getByRole("button", { name: /save/i })`
- Lines 246, 252, 257: Test 6 (save-disabled discipline) — three uses of `/save/i`; this test is CHECKING the disabled state, so it may work partially but the re-enable assertion on line 252 will time out if the button is actually labeled "Create"
- Lines 290, 302: Test 7 (Preserve Player) — both creates
- Line 340: Test 8 (Volunteer round-trip)
- Line 385: Test 9 (Player + Sponsor round-trip)
- Lines 456, 466, 473, 481, 485: Test 11 (Handicap boundaries) — all five submit points

**Assessment for Test 6 specifically:** Test 6 is save-disabled discipline, which uses `/save/i` to check `toBeDisabled()`. If the button is labeled "Create", `/save/i` won't find it and `getByRole` will throw — Pattern E applies even to the disabled-state assertions.

**Fix:** In all create-flow submits: `{ name: "Create", exact: true }`. Tests 7 and 8 have an edit-flow re-open after initial create — those submits (after re-opening an existing contact) should use `{ name: "Save", exact: true }`.

**Edit-flow submits in this file (Pattern E — correct label is "Save"):**

- Line 302: Test 7 edit pass (uncheck Player, save with Donor) — correct label needed: `"Save"`
- Line 385: There is no edit-flow in Test 9 — it's create only

**Specific edit-flow submits in Test 7:**
- Line 290: First create (new contact) → `"Create"`
- Line 302: Edit pass (re-open, uncheck Player, check Donor) → `"Save"`

**Pattern G — `softDeleteContact()` helper (lines 56–63)**

The local cleanup helper at lines 50–64 clicks `getByRole("button", { name: /delete/i })` (line 56) then `getByRole("button", { name: /confirm|yes/i })` (line 59). The ConfirmDialog confirm button is `confirmLabel="Delete"` so `/confirm|yes/i` matches nothing. The confirm click silently fails; `catch(() => false)` on the visibility check masks it; the contact is never actually deleted.

- Line 59: `/confirm|yes/i` → `{ name: "Delete", exact: true }`
- Also need to disambiguate: the edit modal's "Delete" trigger (line 56, `{ name: /delete/i }`) opens the confirm dialog; the confirm-dialog's "Delete" confirm button is a second, different button. The current code uses `.isVisible()` with catch, so if the logic is correct (trigger → confirm), just fixing line 59 to exact "Delete" should work. Watchdog should verify both buttons are scoped correctly.

**Pattern TS — timestamps (PARTIAL COVERAGE)**

Line 28: `const TIMESTAMP = Date.now();` — good. Email addresses use `${TIMESTAMP}` on lines 77, 105, 134, 161, 202, 241, 275, 339, 379, 412, 448. This file already uses per-run timestamped emails.

However, the cleanup helper `softDeleteContact(page, fullName)` on line 50 is called with constructed names like `"Multi TypeTest"` (line 95), `"Val VolunteerTest"` (line 122), etc. These names are static. In strict mode, if the same contact was created in a prior run and not cleaned up (because `softDeleteContact` failed due to Pattern G), the `getByRole("row").filter({ hasText: fullName })` could match multiple rows. The email-based `getByRole("row", { name: new RegExp(TEST_EMAIL) })` pattern is the durable fix (per Sprint 34 retro), but the cleanup helper uses full_name not email.

**Risk:** The static full-names in cleanup paths (lines 95, 122, 151, 190, 230, 322, 365, 397) could collide in strict mode IF orphan contacts were left from prior failed runs. After fixing Pattern G (confirm button), successful cleanups will prevent accumulation. Assess during verification whether per-row email scoping is needed in the cleanup helper too.

**Pattern A — NOT applicable**

Line 47 already uses `getByRole("textbox", { name: "Email" })` — Pattern A already applied. This file is clean on Pattern A.

**Pattern B — NOT applicable**

File already uses checkboxes throughout (lines 80, 82, 111, 137–138, etc.). Sprint 31 checkboxes correctly used.

**Pattern C — NOT applicable**

Comments use "modal", "Dialog", "centered modal" correctly throughout.

**Pattern F — NOT applicable**

This file's tests consistently `.check()` a type before any save. Test 6 explicitly tests the disabled state. No F failures expected.

**Pattern H — NOT applicable**

No Trash assertions in this file.

**Summary for contact-multi-type.spec.ts:**

| Pattern | Hits | Lines |
|---------|------|-------|
| E (create → "Create" exact) | 10 create-flow submits | 85, 119, 148, 187, 213, 246, 252, 256, 290, 340, 385, 456, 466, 473, 481, 485 |
| E (edit → "Save" exact) | 1 edit-flow submit | 302 |
| G (confirm button) | 1 — in `softDeleteContact()` | 59 |
| TS (static names in cleanup paths) | LOW RISK if G is fixed | 95, 122, 151, 190, 230, 322, 365, 397 |
| A, B, C, F, H | N/A | — |

---

### tests/e2e/contact-bulk-subscribe.spec.ts

**Summary:** 1 test, 49 lines. Tests that selecting 3 contacts and clicking "Subscribe" in the bulk-action bar shows a success toast. Simple flow, no modal, no type selection.

**Pattern A — NOT applicable**

No email locator. The test doesn't open a contact form.

**Pattern B — NOT applicable**

No type picker in this flow. Checkbox used on line 26–38 are row-selection checkboxes, not type checkboxes — these are correctly `getByRole("checkbox")` filtered to not-thead.

**Pattern C — NOT applicable**

No drawer references.

**Pattern E — NOT applicable**

No create/edit submit. The action is "Subscribe" on the bulk bar, not Save/Create on a modal form.

**Pattern F — NOT applicable**

No contact form, no type required.

**Pattern G — NOT applicable**

No delete/confirm flow.

**Pattern H — NOT applicable**

No Trash assertions.

**Pattern TS — MEDIUM RISK**

Line 21: test `"selects 3 contacts and subscribes them"`. The test selects `checkboxes.nth(0)`, `nth(1)`, `nth(2)` — whatever the first 3 contacts in the list are. This is PROD data-dependent. If a prior run's orphan contacts appear at positions 0–2 (e.g. e2e-* contacts from a prior partial cleanup), the test may select stale contacts. However, since this test does not assert on specific contact names — it only asserts on the toast message — the TS pattern is low-severity here. The test does not create data, so no accumulation risk.

**Potential Pattern 9 (NEW DISCOVERY):**

Line 26: `page.getByRole("checkbox").filter({ hasNot: page.locator("thead") })` — this is filtering row-selection checkboxes by excluding those inside `thead`. However, after Sprint 31's multi-type chips shipped, each contact row now has type-checkbox chips in an expanded section if the row is clicked. The row-level selection checkbox is different from the type checkboxes.

The test only checks row-selection checkboxes BEFORE any row is expanded, so the multi-type form checkboxes are not visible yet. The filter `{ hasNot: page.locator("thead") }` may match MORE than intended if Playwright counts any non-thead `<input type="checkbox">` — including hidden form checkboxes pre-rendered in the DOM.

**Risk assessment:** Sprint 31's admin contact list renders type checkboxes only inside the edit modal (dialog), not inline in the list row. So this filter should still reliably target only the row-selection checkboxes. However, Spec should verify the checkbox count before and after the test during execution — if the count seems too high, add `{ visible: true }` to the filter.

**Flag this as a known unknown but not a confirmed new pattern.** Does not need a code change until Spec verifies the checkbox count.

**Summary for contact-bulk-subscribe.spec.ts:**

| Pattern | Hits | Lines |
|---------|------|-------|
| All patterns A–H | N/A | — |
| TS (data-dependent, non-accumulating) | LOW RISK | 26–38 |
| Checkbox filter sanity | Known unknown | 26 |

**This spec is likely the lowest-risk spec in the sprint.** Primary risk is "not enough contacts in DB" (line 31 guards this), which is a PROD-data dependency, not a code pattern.

---

### tests/e2e/contact-bulk-blocked-alert.spec.ts

**Summary:** 4 tests, 227 lines. Tests the Sprint 31 bulk "Remove type" action — the Add type button, Remove type button, the blocked-row Alert when contacts in team_members are selected, and the Alert's dismissal. This file was written RED against pre-Sprint-31 main. If Sprint 31 shipped correctly, all 4 tests should now be GREEN — but they need verification with `.env.local` loaded (per `feedback_skip_is_not_pass`).

**Pattern A — NOT applicable**

No email locator.

**Pattern B — filter-side combobox (KEEP — not a failure)**

Line 85: `page.getByRole("combobox", { name: /filter|type/i }).first()` — this is the LIST FILTER dropdown (for filtering displayed contacts by type), NOT the contact form's type field. Per Pattern B's definition, filter dropdowns stay as comboboxes. This line is correct. No change needed.

Line 169: `page.getByRole("combobox", { name: /team/i })` — team filter dropdown. Also a list filter, also stays as combobox. Correct.

**Pattern C — NOT applicable**

No drawer references. Tests use `"dialog"` role or alert assertions.

**Pattern E — NOT applicable**

No create/edit modal submit. The bulk actions trigger from the bulk-action bar, not from a form.

**Pattern F — NOT applicable**

No contact form. Bulk action bar doesn't require type checked first.

**Pattern G — NOT applicable**

No ConfirmDialog delete in this spec. The Alert dismiss button is `{ name: /dismiss|close|×/i }` (line 148) — this is not a ConfirmDialog, it's an inline Alert dismiss button. No change needed.

**Pattern H — NOT applicable**

No Trash assertions.

**Pattern TS — PROD-data-dependent**

These tests depend on PROD having enough contacts with specific properties (team_members, player types). The tests correctly guard with `count < 1` / `count < 2` runtime checks and use `test.skip()` or annotation notes when conditions aren't met. No static names are created; tests are read-only except for the bulk Remove action.

**Pattern PR #317 alert variant change — POTENTIAL FAILURE (NEW DISCOVERY)**

The issue #331 body notes: "Sprint 31 alert variant changed in PR #317". Per the daily note, Sprint 31 polish round (PR #317) changed the blocked-row Alert variant from `destructive` to `warning`. Pixel also added a leading warning triangle SVG and `aria-live="polite"` wrapper.

Check the alert locators in this spec:

- Line 133–136: `page.getByRole("alert").filter({ hasText: /blocked|team|could not|skipped/i }).or(page.getByTestId("bulk-blocked-alert"))` — uses `getByRole("alert")` which finds elements with `role="alert"`. After PR #317, the Alert wrapper has `aria-live="polite"` added. However, `role="alert"` was preserved. The locator should still work.
- Line 214: Same pattern for test 4.

**The `aria-live="polite"` addition in PR #317 could affect `getByRole("alert")` matching.** In ARIA, `aria-live="polite"` on its own does NOT confer `role="alert"`. If the PR #317 change moved from a `role="alert"` element to a `role="status"` or plain `div` with `aria-live="polite"`, then `getByRole("alert")` would miss it.

This is a SUSPECTED PATTERN (call it Pattern P — PR #317 alert variant change). Needs verification by reading `contact-list.tsx` post-PR #317. **Flag as a known unknown that Spec must verify during execution.** If `getByRole("alert")` no longer matches the blocked-row alert, the fix is to use `getByTestId("bulk-blocked-alert")` (which is already the `.or()` fallback at lines 134–136 and 214).

**Recommendation:** Spec should try `getByTestId("bulk-blocked-alert")` as the PRIMARY locator (not the `.or()` fallback) and demote `getByRole("alert")` to secondary. This is a surgical change if the role changed.

**Summary for contact-bulk-blocked-alert.spec.ts:**

| Pattern | Hits | Lines |
|---------|------|-------|
| A–H (standard) | N/A | — |
| B (filter combobox) | KEEP AS-IS | 85, 169 |
| Pattern P (PR #317 alert variant) | SUSPECTED — verify `contact-list.tsx` | 133–136, 214 |
| TS | PROD-data-dependent, non-accumulating | N/A |

---

### tests/e2e/contact-type-removal-guard.spec.ts

**Summary:** 3 tests, 221 lines. Tests the Sprint 31 guard that prevents removing a type when the contact has dependencies (team_members, sponsor_contacts). All 3 tests are data-conditional — they run the guard assertion only if the matching PROD data exists, otherwise annotate and continue.

**Pattern A — NOT applicable**

No email locator.

**Pattern B — filter-side combobox (KEEP)**

Line 33: `page.getByRole("combobox", { name: /filter|type/i }).first()` — list filter. Correct.
Line 170: `page.getByRole("combobox", { name: /filter|type/i }).first()` — list filter. Correct.

**Pattern C — NOT applicable**

No drawer references. "Sprint 31: centered modal" comments are correct (lines 43, 44).

**Pattern E — PARTIAL RISK**

Lines 59, 141, 199: `page.getByRole("button", { name: /save/i }).click()` — these are EDIT-flow saves (the test opens an existing contact, modifies it, then saves). The button label for edit-flow is "Save" — so `/save/i` is correct for these lines. **No Pattern E failure expected here.** The `/save/i` regex works for edit-flow.

**Pattern F — GUARD TEST, NOT A FAILURE**

These tests intentionally check a type before saving (lines 55–57: check Donor if not checked; line 140: check Other). The tests correctly manage type state before submitting. Pattern F does not apply.

**Pattern G — PARTIAL: inline guard error, not ConfirmDialog**

The "inline error" at lines 63–65 uses `getByRole("alert").filter({ hasText: /team|remove/i })` — this is the type-guard inline error, not the ConfirmDialog. No `/confirm|yes/i` button here. Pattern G does not apply.

However, the same PR #317 concern (Pattern P) applies: if `getByRole("alert")` was affected by the `aria-live` change, the `inlineError` locator at lines 63–65, 146–148, and 203–206 may need to fall back to `getByTestId("type-guard-error")`. The `.or()` fallback at those lines already includes `getByTestId("type-guard-error")`. **Spec should verify that `getByRole("alert")` still matches for the type-guard error specifically** (this may be a different component from the bulk-blocked-alert).

**Pattern H — NOT applicable**

No Trash assertions.

**Pattern TS — NOT applicable**

No data creation. Tests are read-only on PROD data.

**Summary for contact-type-removal-guard.spec.ts:**

| Pattern | Hits | Lines |
|---------|------|-------|
| A–H (standard) | N/A | — |
| E | DOES NOT APPLY — edit-flow only | 59, 141, 199 |
| B (filter combobox) | KEEP AS-IS | 33, 170 |
| Pattern P (alert role) | SUSPECTED — verify | 63–65, 146–148, 203–206 |
| TS | N/A — read-only | — |

---

### tests/e2e/team-create-edit.spec.ts

**Summary:** 5 tests, 114 lines. Tests the Sprint 32 team modal: New Team opens a centered dialog (not drawer), no Team Name input, captain picker present, team list shows captain name as identity, edit also opens a centered modal.

**Pattern A — NOT applicable**

No email locator.

**Pattern B — NOT applicable**

No type picker. Teams don't have type checkboxes.

**Pattern C — APPLIES (describe block naming)**

Line 27: `test.describe("Sprint 32 — Admin team create/edit (centered modal, captain identity)", ...)` — this naming is already correct ("centered modal"). No change needed.

File header comment at lines 2–13 says "not a side drawer" and "centered modal" — already aligned. Pattern C does not require a fix here.

**Pattern E — NOT applicable**

No Create/Save buttons in this spec. Tests check modal presence, verify no team_name input, check captain picker visibility, check table headers, check modal re-opens on Edit. No form submission at all.

**Pattern F — NOT applicable**

No form submission.

**Pattern G — NOT applicable**

No delete/confirm flow.

**Pattern H — NOT applicable**

No Trash assertions.

**Pattern TS — APPLIES (TEST_CAPTAIN_EMAIL)**

Line 25: `const TEST_CAPTAIN_EMAIL = \`e2e-captain-s32-${Date.now()}@example.com\`` — per-run timestamp present. However, this email is declared but **never used** in any test. No test actually creates a team or captain; they all operate on existing PROD data (read-only). The `TEST_CAPTAIN_EMAIL` is dead code in this file.

**Risk:** Low. Since no test creates a team, there is no PROD data accumulation. The `TEST_CAPTAIN_EMAIL` dead variable should be removed to avoid confusion, but it is not a correctness issue.

**Sprint 32 contract check — POTENTIAL FAILURE:**

Line 94: `const editButtons = page.getByRole("button", { name: /^edit$/i })` — this assumes the team list has explicit "Edit" buttons per row. Sprint 32 may have shipped with a different edit trigger (row click → modal, or an icon button with aria-label "Edit"). Spec must verify whether `/^edit$/i` matches the current production edit trigger. If the edit trigger is a row-click (like the contacts list), this locator finds nothing and the test skips gracefully (line 98: `if (count === 0) { test.skip(...) }`). If edit was shipped as an icon-button with a different label, the test would false-skip rather than fail.

This is not a new Pattern but a Sprint 32 feature assumption that needs verification. Flag for Spec.

**Summary for team-create-edit.spec.ts:**

| Pattern | Hits | Lines |
|---------|------|-------|
| A–H (standard) | N/A | — |
| C | Already correct | — |
| TS | Dead variable `TEST_CAPTAIN_EMAIL` — remove | 25 |
| Edit trigger assumption | VERIFY: `/^edit$/i` matches production | 94 |

---

### tests/e2e/team-delete-type-to-confirm.spec.ts

**Summary:** 1 test, 82 lines. Finds the first team with a Delete button, opens the type-to-confirm dialog, verifies the confirm button is disabled until the exact team name is typed, deletes, and verifies in Trash.

**Pattern A — NOT applicable**

No email locator.

**Pattern B — NOT applicable**

No type picker.

**Pattern C — NOT applicable**

No drawer references.

**Pattern E — NOT applicable**

No Create/Save form submit.

**Pattern F — NOT applicable**

No contact type required.

**Pattern G — CRITICAL HIT**

Line 53: `const deleteButton = page.getByRole("button", { name: /^delete$/i }).last()` — this uses `/^delete$/i` and `.last()` to target the confirm-dialog's Delete button. This is consistent with Pattern G's fix (exact "Delete") already applied. The `.last()` disambiguates from the row-level Delete trigger.

However: line 47 triggers the delete by clicking `firstRow.getByRole("button", { name: /delete/i })` (without exact). If there are multiple buttons labeled "Delete" in the row (e.g., the row-delete trigger plus a header "Delete" action), this could misfire. In practice, the row Delete trigger is the only "Delete" button scoped to `firstRow`, so this should be fine.

**The key risk is line 53 with `.last()`:** If the type-to-confirm dialog's Delete button appears as the LAST "Delete" button in the entire page DOM, `.last()` works. But if any "Delete" button appears after it in DOM order (e.g., in the contact-list behind the dialog), `.last()` could be fragile. More robust: scope to `page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true })`.

**Pattern H — CRITICAL HIT**

Lines 37–44: The test reads the team name from `firstRow.locator("td").first()`. After Sprint 32, the team identity is the **captain's full name** (no `team_name` column). The `teamNameCell` at line 39 should contain the captain's name.

Line 72: `await expect(page.getByText(teamName, { exact: true })).not.toBeVisible(...)` — verifies the team row is gone after delete.

Line 80: `await expect(page.getByText(teamName)).toBeVisible(...)` — verifies the team appears in Trash.

Pattern H says "Trash column is `full_name`, not email" — for teams, the Trash column would be captain full name (or the team identity). If `teamName` was read from `td.first()` and that cell contains the captain name (per Sprint 32), then `getByText(teamName)` in Trash should work. **This is likely correct as-is** — the test reads the display value from the list and expects to find it in Trash.

**HOWEVER:** Line 39 reads `td.first()` which assumes the FIRST cell contains the team identity. After Sprint 32 dropped `team_name`, the first column in the team list should be the captain name. Spec must verify column order in the current `/admin/teams` table.

**Pattern TS — LOW RISK**

No data created by the test itself. The test operates on the first existing team in PROD, deletes it, and checks Trash. This is a **destructive operation on PROD data** — it permanently soft-deletes a real team. Each test run removes a team from the active list.

This is by design (per the note that specs write to PROD), but worth flagging explicitly: if run repeatedly, this spec will deplete the teams list. After a few runs, `if (rowCount === 0)` will skip. Recommend adding a team-creation step as a prerequisite, or using a dedicated seed team.

**Summary for team-delete-type-to-confirm.spec.ts:**

| Pattern | Hits | Lines |
|---------|------|-------|
| G (confirm button scoping) | MEDIUM — `.last()` is fragile; scope to dialog | 53 |
| H (Trash display value) | VERIFY column order is captain name | 39, 80 |
| TS (destructive on PROD) | KNOWN RISK — depletes teams list | N/A |

---

### tests/e2e/score-create-edit.spec.ts

**Summary:** 5 tests, 119 lines. Tests Sprint 32 score modal: Add Score opens a centered dialog, no freeform team_name input, team combobox present, score list shows no team_name column header, score with null team shows non-blank fallback.

**Pattern A — NOT applicable**

No email locator.

**Pattern B — APPLIES (filter-side vs form-side combobox)**

Line 57–62: `(await page.getByRole("combobox").count()) > 0 ? page.getByRole("combobox").first() : page.getByLabel(/^team$/i)` — this is the FORM-SIDE team dropdown inside the Add Score modal. This is a combobox SELECT element, not a type-picker checkbox. Pattern B says "filter dropdowns stay" as comboboxes, and form-side type pickers → checkboxes. A team SELECT dropdown is not a type picker — it remains a combobox. **No change needed.**

**Pattern C — NOT applicable**

File header and describe block already says "centered modal, not a side drawer" — correct throughout.

**Pattern E — NOT applicable**

No Create/Save form submission. All tests are read-only or open-and-inspect. No test saves a score.

**Pattern F — NOT applicable**

No type required.

**Pattern G — NOT applicable**

No delete/confirm flow.

**Pattern H — NOT applicable**

No Trash assertions.

**Pattern TS — NOT applicable**

No data creation. Tests are read-only (open modal, inspect DOM, close).

**Sprint 32 contract verification needed:**

Line 58: `page.getByRole("combobox").first()` — if the Add Score modal has multiple comboboxes (e.g., a year selector or status selector in addition to the team dropdown), `.first()` may not target the team dropdown. Spec should verify the combobox count and use a labeled selector if there are multiple.

Line 100: `expect(headerTexts.some((h) => h.match(/^team name$/i))).toBe(false)` — this is a negative assertion. If Sprint 32 never shipped the team dropdown, this test will pass vacuously (there was never a "Team Name" column). The test is only meaningful as a regression guard after Sprint 32 is confirmed shipped. Spec should also add a positive assertion that a "Team" column header or captain-based column exists.

**Summary for score-create-edit.spec.ts:**

| Pattern | Hits | Lines |
|---------|------|-------|
| A–H (standard) | N/A | — |
| B (form combobox) | KEEP AS-IS | 57–62, 74 |
| Sprint 32 combobox count | VERIFY: `.first()` targets team dropdown | 58 |
| Vacuous negative assertion | LOW PRIORITY — add positive assertion | 100 |

---

## Pattern 9 Determination

After reading all 7 files, no 9th pattern meeting the bar of "needs a named fix across multiple files" was found. The discoveries are:

- **Pattern P (PR #317 alert variant):** A suspected issue in `contact-bulk-blocked-alert.spec.ts` and possibly `contact-type-removal-guard.spec.ts` if the shadcn Alert's ARIA role changed from `role="alert"` to `aria-live="polite"` in PR #317. Spec must verify by reading `contact-list.tsx` before editing these specs. Not promoted to a numbered pattern because it may be a non-issue (the `.or(getByTestId(...))` fallback already exists).

These are documented per-spec above. No code-wide renames or sweeps required beyond the per-spec changes enumerated.

---

## Phase Structure

### Phase 0 — Forge-direct: dotenv config fix

**File:** `playwright.config.ts`
**Change:** Add a dotenv loader at the top so that `.env.local` is loaded before spec env-var guards run.

Per `feedback_skip_is_not_pass`, the root cause of Sprint 34's "skipped cleanly" anti-pattern was that `process.env.E2E_ADMIN_EMAIL` was unset in the spec agents' environment because `playwright.config.ts` had no dotenv loader. The `baseTest.skip()` guards fired at file-load time, before Playwright could inject the vars. Every subsequent verification that reported "no failures (skipped)" was a false pass.

**Fix:**

```typescript
// playwright.config.ts — add at top, before defineConfig
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
```

This ships FIRST. It is the highest-leverage fix in the sprint: every agent that runs specs after Phase 0 merges gets the env vars loaded automatically, eliminating the entire class of skip-as-pass errors without requiring `--env-file` flags or shell gymnastics.

**Files touched:** `playwright.config.ts` only.
**Effort:** S (≤3 files, ≤30 minutes).
**Commit:** `fix(e2e): load .env.local in playwright.config.ts to prevent skip-as-pass`

Forge commits and pushes this directly on branch `compass/sprint-35-plan` alongside the plan, or as a standalone commit on a branch that targets main. Forge opens the PR as scottdavenport.

---

### Phase 1 — Two parallel Spec batches in isolated worktrees

Per `feedback_isolate_agent_worktrees`: parallel agents on the same repo contaminate each other's branches via the shared working tree. Each Spec batch MUST run in its own git worktree of the coach project repo. Forge bakes the `git worktree add` setup into each Spec prompt.

Per `feedback_builders_open_their_own_prs`: after `git push`, each Spec agent runs `gh pr create` (`unset GH_TOKEN` first per `feedback_builder_pr_create_auth`). Forge does not pick up the PR-open step.

#### Phase 1 / Batch 1 — Contact cluster (4 specs)

**Specs:**
1. `tests/e2e/contact-multi-type.spec.ts`
2. `tests/e2e/contact-bulk-subscribe.spec.ts`
3. `tests/e2e/contact-bulk-blocked-alert.spec.ts`
4. `tests/e2e/contact-type-removal-guard.spec.ts`

**Files to modify:**
- `tests/e2e/contact-multi-type.spec.ts`
- `tests/e2e/contact-bulk-subscribe.spec.ts` (potentially no changes needed — verify first)
- `tests/e2e/contact-bulk-blocked-alert.spec.ts`
- `tests/e2e/contact-type-removal-guard.spec.ts`

**Supporting file to READ (do not modify without explicit reason):**
- `src/app/admin/contacts/contact-list.tsx` — verify the Alert role after PR #317 (Pattern P)

**Primary patterns to apply:**
- contact-multi-type.spec.ts: Pattern E (create → "Create" exact; edit → "Save" exact) + Pattern G (confirm helper)
- contact-bulk-blocked-alert.spec.ts: Pattern P verification (getByRole("alert") vs getByTestId)
- contact-type-removal-guard.spec.ts: Pattern P verification (getByRole("alert") for type-guard error)
- contact-bulk-subscribe.spec.ts: likely no changes; verify checkbox filter count only

**Branch name:** `spec/sprint-35-contact-cluster`
**PR title:** `fix(e2e): Sprint 35 contact-cluster spec refresh (multi-type, bulk, guard)`

#### Phase 1 / Batch 2 — Team/Score cluster (3 specs)

**Specs:**
1. `tests/e2e/team-create-edit.spec.ts`
2. `tests/e2e/team-delete-type-to-confirm.spec.ts`
3. `tests/e2e/score-create-edit.spec.ts`

**Files to modify:**
- `tests/e2e/team-create-edit.spec.ts`
- `tests/e2e/team-delete-type-to-confirm.spec.ts`
- `tests/e2e/score-create-edit.spec.ts`

**Supporting files to READ (do not modify without explicit reason):**
- `src/app/admin/teams/page.tsx` or team list component — verify edit trigger label and column order
- `src/app/admin/scores/page.tsx` or score list component — verify combobox count in Add Score modal

**Primary patterns to apply:**
- team-create-edit.spec.ts: Remove dead `TEST_CAPTAIN_EMAIL` variable; verify edit trigger locator
- team-delete-type-to-confirm.spec.ts: Pattern G (scope confirm button to dialog, not `.last()`); verify column order for Pattern H
- score-create-edit.spec.ts: Verify combobox count; optionally add positive assertion to team-column test

**Branch name:** `spec/sprint-35-team-score-cluster`
**PR title:** `fix(e2e): Sprint 35 team/score-cluster spec refresh (team-create-edit, team-delete, score)`

---

### Phase 1 dependency map

```
Phase 0 (Forge-direct, serial first):
  - playwright.config.ts dotenv fix
  - Commit and merge to main BEFORE Phase 1 launches
  - File: playwright.config.ts only

Phase 1 (parallel, AFTER Phase 0 merges):
  Batch 1:                          Batch 2:
  spec/sprint-35-contact-cluster    spec/sprint-35-team-score-cluster
  Files: 4 contact e2e specs        Files: 3 team/score e2e specs
  No file overlap with Batch 2      No file overlap with Batch 1
  → Can run fully parallel
```

**No file overlap between Batch 1 and Batch 2.** All 7 spec files are distinct. Parallel execution is safe.

**Contact zone:** `playwright.config.ts` is touched only by Phase 0 (Forge-direct) and merged before Phase 1 starts. Phase 1 agents are instructed to pull from fresh main after Phase 0 merge.

---

## Acceptance Criteria

All acceptance criteria are written as verifiable test outcomes per Compass standards.

### Global (all specs)

1. `playwright.config.ts` loads `.env.local` before spec env-var guards run, so `process.env.E2E_ADMIN_EMAIL` is available at file-load time without any `--env-file` flag.
2. Running `npm run test:e2e -- --project=chromium tests/e2e/<spec-file>.spec.ts` with `.env.local` populated returns `X passed` in the output, where X ≥ the number of non-data-conditional tests. Per `feedback_skip_is_not_pass`: "X skipped cleanly" is NOT an accepted verification gate. The output must show `passed` lines.

### contact-multi-type.spec.ts (11 tests)

3. Test "checks Player + Sponsor, saves, list shows both type chips": create-flow submit uses `{ name: "Create", exact: true }` and modal dismisses after click.
4. Test "Save button is disabled with no types checked, enabled after first type checked": `getByRole("button", { name: "Create", exact: true })` is correctly targeted (not `/save/i`) and the disabled/enabled assertions resolve without timeout.
5. Test "uncheck Player, re-check Player — Handicap and Shirt Size restore from DB": first create uses `"Create"` exact; edit-pass save uses `"Save"` exact; contact round-trips correctly.
6. `softDeleteContact()` helper: cleanup deletes contacts without silent failures — `getByRole("button", { name: "Delete", exact: true })` matches the ConfirmDialog confirm button and the contact disappears from the list.
7. All 11 tests report `passed` or `skipped with skip reason noted` (not silently skipped due to timeout); minimum 8 non-conditional tests pass.

### contact-bulk-subscribe.spec.ts (1 test)

8. Test "selects 3 contacts and subscribes them": with ≥3 contacts in PROD, selects checkboxes and subscribes; toast matching `/subscribed|updated/i` appears within 5 seconds. Test reports `1 passed` or `1 skipped` with the "Not enough contacts" reason explicitly surfaced (not a silent skip).

### contact-bulk-blocked-alert.spec.ts (4 tests)

9. Test "bulk Remove Player button exists in Sprint 31 bulk-action bar": after selecting a contact, `getByRole("button", { name: /remove type/i })` is visible within 3 seconds. Reports `passed`.
10. Test "bulk Add type button exists in Sprint 31 bulk-action bar": `getByRole("button", { name: /add type/i })` is visible. Reports `passed`.
11. Test "bulk Remove Player: blocked contacts surface inline Alert": if blocked contacts exist in PROD, the Alert locator resolves (via `getByTestId("bulk-blocked-alert")` primary or `getByRole("alert")` confirmed match); Alert is dismissible. If no blocked contacts exist, test annotates rather than hard-failing.
12. Test "bulk Remove with blocked rows: Alert lists blocked contact name + reason": Alert text matches `/team/i`; dismiss closes it. If team filter is not available, test fails fast with an explicit assertion rather than silently returning.

### contact-type-removal-guard.spec.ts (3 tests)

13. All three tests open the edit modal (centered dialog confirmed visible within 5 seconds) on at least one attempt.
14. Guard-fire tests: if a contacted filtered contact is on a team, `inlineError` locator resolves (via `getByTestId("type-guard-error")` or confirmed `getByRole("alert")` match) and `errorText` matches `/team/i`.
15. All 3 tests report `passed` or annotated `info` (valid non-fire path), not silent skip or timeout.

### team-create-edit.spec.ts (5 tests)

16. Test "Add Team opens a centered modal, not a side drawer": dialog is visible and its center X is within 200px of viewport center.
17. Test "Add Team modal does NOT have a Team Name text input": `getByLabel(/^team name$/i)` is not visible.
18. Test "Add Team modal has captain picker as primary identity field": captain picker input is visible.
19. Test "Team list row shows captain full name as team identity": no "Team Name" header; "Captain" or equivalent header is present.
20. Test "Edit team opens a centered modal (not drawer)": if edit buttons exist, clicking the first opens a centered dialog. Dead `TEST_CAPTAIN_EMAIL` variable removed from file.

### team-delete-type-to-confirm.spec.ts (1 test)

21. If teams exist in PROD: delete button opens dialog; confirm button inside `page.getByRole("dialog")` with `{ name: "Delete", exact: true }` starts disabled; enabled only after exact team name typed; clicking deletes the team; team name appears in `/admin/trash` Teams tab.
22. If no teams exist: test skips with explicit "No teams in DB" message surfaced in output — not a silent skip.

### score-create-edit.spec.ts (5 tests)

23. Test "Add Score opens a centered modal": dialog is visible and centered.
24. Test "Add Score modal has a team dropdown, NOT a freeform team name text input": no `getByLabel(/^team name$/i)` visible; combobox present.
25. Test "Team dropdown lists captain names": combobox opens and options are non-empty.
26. Test "Score list row shows captain name as team identity, no team_name column": no "Team Name" header in scores table.
27. Test "Score with no team shows fallback string (not blank)": score table renders without crashing; first row is visible if rows exist.

---

## Risk Notes / Known Unknowns

### 1. Pattern P — PR #317 alert role change

Sprint 31 polish round PR #317 changed the blocked-row Alert variant from `destructive` to `warning` and added `aria-live="polite"`. If the Alert component's root element changed from `role="alert"` to just `aria-live="polite"` without `role`, then `getByRole("alert")` will stop matching.

**Spec Batch 1 MUST:** read `src/app/admin/contacts/contact-list.tsx` and verify the Alert element's ARIA role BEFORE editing `contact-bulk-blocked-alert.spec.ts` and `contact-type-removal-guard.spec.ts`. If `role="alert"` is gone, promote `getByTestId("bulk-blocked-alert")` / `getByTestId("type-guard-error")` to primary locator (not `.or()` fallback). If role is preserved, the existing locators work.

### 2. Phase 1 may escalate to Bolt

Per `feedback_test_refresh_can_surface_prod_bugs`: "Test-only" spec refresh sprints regularly surface production-code regressions. Sprint 34 found the modal DialogFooter issue mid-sprint and had to spawn Bolt. Budget for Bolt escalation if:

- The team edit trigger (`/^edit$/i`) doesn't match the current production UI — the production code may need a label or data-testid added.
- The score modal has multiple comboboxes without accessible labels, requiring a production-code fix to add a `<label>` or `aria-label`.
- The `contact-bulk-blocked-alert` Alert is not reachable via any Playwright locator — requires Bolt to add `data-testid="bulk-blocked-alert"` to the component.

Forge should monitor Spec verification runs and escalate to Bolt if Spec reports production-side locator failures that can't be resolved in the spec file alone.

### 3. PROD writes and orphan contact cleanup

Specs write to PROD (no staging by design — per `memory/projects/craven.md`). `contact-multi-type.spec.ts` creates up to 11 contacts per run (one per test, using `e2e-*@example.com` addresses with timestamps). After the sprint, Forge runs orphan cleanup via service-key REST DELETE:

```
DELETE /rest/v1/contacts?email=like.e2e-*@example.com
```

Per `feedback_use_service_key_for_data_ops`: Forge executes this directly, not handed to Scott.

`team-delete-type-to-confirm.spec.ts` deletes a real team per run (destructive). Monitor team count in PROD; if depleted, a seed team is needed.

### 4. No migrations in this sprint

All changes are spec-file and `playwright.config.ts` changes only. No schema changes. No `apply_migration` calls. The `apply_migration` MCP read-only blocker (seen in Sprint 32/33/34) is irrelevant.

### 5. `feedback_skip_is_not_pass` enforcement in Spec prompts

Forge MUST include explicit language in each Spec prompt: "Verification gate is `X passed` in output, not `X skipped cleanly`. If tests skip, report the skip reason explicitly. Do not present skipped tests as passing."

### 6. Spec agent worktree isolation

Each Spec batch must use its own git worktree of the craven-cancer-classic repo. From Sprint 34 retro: Spec1 didn't rebase before final push, and would have silently reverted Spec2's changes without the worktree isolation.

Command to bake into Spec prompts:

```bash
cd /Users/openclaw/github/craven-cancer-classic
git worktree add /tmp/craven-sprint-35-batch1 -b spec/sprint-35-contact-cluster
git worktree add /tmp/craven-sprint-35-batch2 -b spec/sprint-35-team-score-cluster
```

Each Spec agent works exclusively in its own `/tmp/craven-sprint-35-batchN/` worktree.

---

## Files Created / Modified

| File | Change type | Sprint phase |
|------|-------------|--------------|
| `playwright.config.ts` | Modified — add dotenv loader | Phase 0 (Forge-direct) |
| `tests/e2e/contact-multi-type.spec.ts` | Modified — Pattern E + G | Phase 1 Batch 1 |
| `tests/e2e/contact-bulk-subscribe.spec.ts` | Likely no change — verify only | Phase 1 Batch 1 |
| `tests/e2e/contact-bulk-blocked-alert.spec.ts` | Modified — Pattern P resolution | Phase 1 Batch 1 |
| `tests/e2e/contact-type-removal-guard.spec.ts` | Modified — Pattern P resolution | Phase 1 Batch 1 |
| `tests/e2e/team-create-edit.spec.ts` | Modified — dead variable removal | Phase 1 Batch 2 |
| `tests/e2e/team-delete-type-to-confirm.spec.ts` | Modified — Pattern G confirm scope | Phase 1 Batch 2 |
| `tests/e2e/score-create-edit.spec.ts` | Modified — combobox label fix if needed | Phase 1 Batch 2 |
| `plans/sprint-35-e2e-refresh-round-2.md` | Created | Plan PR |

---

## Technical Appendix

### Exact replacement patterns per Pattern

**Pattern A** (email locator — already applied in these 7 specs, no changes needed)

```typescript
// WRONG (Sprint 34 already fixed in contact-create-edit.spec.ts):
// await page.getByLabel(/email/i).fill(TEST_EMAIL);
// CORRECT (already used in contact-multi-type.spec.ts line 47):
await page.getByRole("textbox", { name: "Email" }).fill(opts.email);
```

**Pattern E** (create vs save)

```typescript
// WRONG — times out on "New contact" create-flow:
await page.getByRole("button", { name: /save/i }).click();

// CORRECT — create flow (New contact modal):
await page.getByRole("button", { name: "Create", exact: true }).click();

// CORRECT — edit flow (re-opened existing contact):
await page.getByRole("button", { name: "Save", exact: true }).click();
```

**Pattern G** (ConfirmDialog confirm button)

```typescript
// WRONG — matches nothing; ConfirmDialog uses confirmLabel="Delete":
const confirmBtn = page.getByRole("button", { name: /confirm|yes/i });

// CORRECT — scoped to dialog, exact match:
const confirmBtn = page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true });
// or if there's ambiguity within the dialog:
const confirmBtn = page.getByRole("button", { name: "Delete", exact: true }).last();
```

**Pattern P** (PR #317 alert variant — verify before applying)

```typescript
// CURRENT (in contact-bulk-blocked-alert.spec.ts):
const blockedAlert = page
  .getByRole("alert")
  .filter({ hasText: /blocked|team|could not|skipped/i })
  .or(page.getByTestId("bulk-blocked-alert"));

// IF role="alert" was removed in PR #317, promote testid to primary:
const blockedAlert = page.getByTestId("bulk-blocked-alert")
  .or(page.getByRole("alert").filter({ hasText: /blocked|team|could not|skipped/i }));
```

### dotenv config snippet

```typescript
// playwright.config.ts — add these 3 lines at the top, before defineConfig:
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// The rest of the file is unchanged.
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({ ... });
```

`dotenv` is already a transitive dependency via `next`; no new package install needed. Verify with `ls node_modules/dotenv` in the craven repo before committing.

### Per-run timestamp pattern (already used in multi-type, ensure consistent)

```typescript
// At file top:
const TIMESTAMP = Date.now();

// Email:
const email = `e2e-<suffix>-${TIMESTAMP}@example.com`;

// Row scoping (PREFERRED over getByText(fullName) in strict mode):
const testRow = page.getByRole("row", { name: new RegExp(email) });
```

### Worktree setup commands for Spec prompts

```bash
# Batch 1 worktree:
cd /Users/openclaw/github/craven-cancer-classic
git fetch origin main
git worktree add /tmp/craven-sprint-35-batch1 -b spec/sprint-35-contact-cluster origin/main

# Batch 2 worktree:
git worktree add /tmp/craven-sprint-35-batch2 -b spec/sprint-35-team-score-cluster origin/main
```

Each Spec agent: all file reads and edits happen under `/tmp/craven-sprint-35-batchN/`. Do not cd to the main repo working tree.

### Auth protocol for Spec agents

```bash
# Before git push:
unset GH_TOKEN
git push -u origin <branch-name>

# After push — builder opens their own PR:
gh pr create --title "<title>" --body "..."
```

Per `feedback_builder_pr_create_auth` and `feedback_builders_open_their_own_prs`. Do NOT stop at push and expect Forge to open the PR.

---

## Guiding Rules Cited

- `feedback_pattern_enumeration_in_plan` — Per-spec pattern map completed before any builder spawns; iterative mid-execution discovery prevented.
- `feedback_skip_is_not_pass` — "Skipped cleanly" is never a verification gate; `passed` lines in output are required.
- `feedback_isolate_agent_worktrees` — Both Spec batches run in distinct git worktrees; no shared working tree contamination.
- `feedback_builders_open_their_own_prs` — Each Spec agent runs `gh pr create` after `git push`; Forge does not pick up the PR-open step.
- `feedback_test_refresh_can_surface_prod_bugs` — Bolt escalation budgeted if production-side locator failures surface.
- `feedback_plain_english_readouts` — Lead section frames the user/admin experience impact; technical detail in appendix.
- `feedback_plan_pr_exhaustive_consumer_grep` — All 7 spec files read in full before plan written; no consumers enumerated iteratively post-plan-PR-open.
- `feedback_builder_pr_create_auth` — `unset GH_TOKEN` before `git push` and `gh pr create` in all Spec prompts.

---

## Effort Estimates

| Task | Estimate | Owner |
|------|----------|-------|
| Phase 0: dotenv fix | S (~30 min) | Forge-direct |
| Phase 1 Batch 1: 4 contact specs | M (~2h including Pattern P verification) | Spec |
| Phase 1 Batch 2: 3 team/score specs | M (~1.5h including edit-trigger verification) | Spec |
| Watchdog review × 2 PRs | S–M (~1h total) | Watchdog |
| Orphan contact cleanup | S (~10 min) | Forge-direct |
| **Total estimated wall-clock** | **~4–5h** (per Sprint 34 budget: expect overrun if Pattern P or Bolt escalation fires) | — |

---

*Cite `feedback_test_refresh_can_surface_prod_bugs`: Sprint 34 overran its 1.5–2h estimate by 75–100% due to E/F/G/H pattern discovery + Bolt escalation. Sprint 35 front-loaded all pattern discovery in this plan. If Pattern P does NOT require a production code change, estimate holds. If Bolt escalation is needed for any spec (edit trigger label, combobox aria-label, Alert testid), add 1–1.5h.*
