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

## Pattern Reference (10 patterns total)

8 established in Sprint 34. **2 new patterns added 2026-05-01** after Watchdog's plan-PR review surfaced production-side mismatches (T and X). Pattern P (alert variant from PR #317) was verified non-issue and removed from the action list.

| ID | Pattern | Canonical fix |
|----|---------|---------------|
| A | `getByLabel(/email/i)` → `getByRole("textbox", { name: "Email" })` | Sprint 31's marketing-consent switch added a second "Email" label; role+name avoids the collision |
| B | `getByRole("combobox", { name: /type/i })` → `getByRole("checkbox", { name: /^player$/i })` etc. | Sprint 31 replaced the type dropdown with multi-type checkboxes on the form side; filter dropdowns remain comboboxes |
| C | Stale "drawer" naming in describe blocks / comments | Replace "drawer" → "modal" or "centered modal" throughout |
| E | `/save/i` → `{ name: "Create", exact: true }` in create flow; `{ name: "Save", exact: true }` in edit flow | Modal renders "Create" on new contact, "Save" on edit; regex `/save/i` never matches "Create" |
| F | Submit attempt with no type checked → button disabled, test times out | Sprint 31 #268: at least one type checkbox must be checked before Save/Create is enabled; any test that doesn't `.check()` a type before clicking submit will time out |
| G | `getByRole("button", { name: /confirm|yes/i })` → `getByRole("button", { name: "Delete", exact: true })` | ConfirmDialog renders `confirmLabel="Delete"`; `/confirm|yes/i` matches nothing; also must disambiguate from the edit-modal "Delete contact" trigger (scope within confirm dialog) |
| H | `getByText(TEST_EMAIL)` in Trash → `getByText(FULL_NAME)` | Trash column is `full_name`, not email; assertions on email text always fail |
| TS | Static names → per-run timestamps | Static test names accumulate in PROD across runs; strict-mode locators collide on the second run; use `Date.now()` suffix in email AND derive `FULL_NAME` from the name constants |
| **T** | `getByRole("alert")` → sonner toast locator | Server-action errors (type-removal guard, generic create/update failures) surface via `toast.error()` from sonner. Sonner toasts have NO `role="alert"`. Use `page.getByText(<expected error text>)` scoped to `[data-sonner-toast]` or the visible toast region. Confirmed at `contact-modal.tsx:48-49,63-64`. |
| **X** | Team list header text drift vs cell content | Header text "Team Name" drifted vs cells rendering `captain_display_name`. Sprint 32 closeout miss across **2 sites** (verified `grep -rn '"Team Name"' src/`): `team-list.tsx:342` (admin teams list) AND `trash-tabs.tsx:162` (trash teams tab). **Production-code fix required** — rename "Team Name" → "Team" in BOTH files. This is a Bolt task in Phase 0b, NOT a spec-only change. |

**Pattern P (PR #317 alert variant) — VERIFIED NON-ISSUE.** Watchdog confirmed `contact-list.tsx:753-755` retains `role="alert"` AND adds `aria-live="polite"`. The existing `getByRole("alert")` locators in `contact-bulk-blocked-alert.spec.ts` work as-is. **No surgery needed.** This was the right call to flag in pre-flight; it just resolved cleanly.

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

Verified count via `grep -n 'name: /save/i' tests/e2e/contact-multi-type.spec.ts` = **18 hits** (Compass's initial pass said 16; corrected after Watchdog flag).

| Pattern | Hits | Lines (verified) |
|---------|------|-------|
| E (create → "Create" exact) | 17 create-flow submits | 84, 85, 119, 148, 187, 213, 246, 252, 256, 290, 340, 385, 456, 466, 473, 480, 485 |
| E (edit → "Save" exact) | 1 edit-flow submit | 302 |
| G (confirm button) | 1 — in `softDeleteContact()` | 59 |
| TS (static names in cleanup paths) | LOW RISK if G is fixed | 95, 122, 151, 190, 230, 322, 365, 397 |
| A, B, C, F, H, T, X | N/A | — |

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

**Pattern P (PR #317 alert variant) — VERIFIED NON-ISSUE.**

Watchdog confirmed during plan-PR review: `src/app/admin/contacts/contact-list.tsx:753-755` retains `role="alert"` on the blocked-row Alert wrapper. PR #317 added `aria-live="polite"` alongside the existing `role="alert"`, not in place of it.

Existing locators at lines 133–136 and 214 (`getByRole("alert").filter(...).or(getByTestId("bulk-blocked-alert"))`) work as-is. **No surgery needed in this spec.**

**Summary for contact-bulk-blocked-alert.spec.ts:**

| Pattern | Hits | Lines |
|---------|------|-------|
| A–H, T, X | N/A | — |
| B (filter combobox) | KEEP AS-IS | 85, 169 |
| Pattern P | VERIFIED NON-ISSUE | — |
| TS | PROD-data-dependent, non-accumulating | N/A |

**Likely outcome:** This spec passes today after Phase 0 dotenv fix loads the env vars. Spec verifies + closes; no edits expected.

---

### tests/e2e/contact-type-removal-guard.spec.ts

**Summary:** 3 tests, 221 lines. Tests the Sprint 31 guard that prevents removing a type when the contact has dependencies (team_members, sponsor_contacts). All 3 tests are data-conditional.

**Pattern T — DOMINANT (NEW PATTERN, discovered post-Watchdog-review)**

The spec assumes the type-removal guard error renders inline as a `role="alert"` element. **It doesn't.** Per `src/app/admin/contacts/contact-modal.tsx:48-49,63-64`:

```typescript
if ("error" in result) {
  toast.error(result.error);
  return;
}
```

Server-action errors (including the type-removal guard) surface via **sonner `toast.error()`**, which renders into a sonner Toaster container with NO `role="alert"`. The spec's `inlineError` locator at lines 63–65, 146–148, 203–206 will never find the guard error. Test 1 silently passes the "valid path" branch on every run; tests 2 and 3 hard-fail.

**Fix:** Replace `getByRole("alert")` with a sonner-toast locator. Sonner emits toasts into a `[data-sonner-toaster]` region; individual toasts have `[data-sonner-toast]`. The most resilient locator:

```typescript
const inlineError = page
  .locator('[data-sonner-toast]')
  .filter({ hasText: /team|sponsor|remove/i });
```

Spec MUST verify the actual sonner DOM in dev mode (open the form, trigger the guard, inspect the toast element) before locking the locator. If sonner's testid attribute differs in this project's version, fall back to `page.getByText(<expected error text>).first()`.

**Pattern B — filter-side combobox (KEEP)**

Line 33: `page.getByRole("combobox", { name: /filter|type/i }).first()` — list filter. Correct.
Line 170: `page.getByRole("combobox", { name: /filter|type/i }).first()` — list filter. Correct.

**Pattern E — DOES NOT APPLY**

Lines 59, 141, 199: `page.getByRole("button", { name: /save/i }).click()` — these are EDIT-flow saves; "Save" is correct for edit-flow. `/save/i` regex matches.

**Patterns A, C, F, G, H, X, TS — N/A.**

**Summary for contact-type-removal-guard.spec.ts:**

| Pattern | Hits | Lines |
|---------|------|-------|
| **T (sonner toast — NEW)** | DOMINANT — 3 inline-error locators | 63–65, 146–148, 203–206 |
| B (filter combobox) | KEEP AS-IS | 33, 170 |
| A, C, E, F, G, H, X, TS | N/A | — |

**Risk note:** This spec was previously believed to be partially-passing. After fixing Pattern T, the guard branches will execute end-to-end for the first time. Spec should expect new failures to surface (e.g., the guard error message text may not match `/team|remove/i` exactly — verify the actual server-returned error string from `actions.ts`).

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

**Pattern X — DOMINANT (NEW PATTERN, discovered post-Watchdog-review)**

The spec at line 84 (per Watchdog) reads the team list table headers and asserts no "Team Name" header is present. **This will fail today.** Per `src/app/admin/teams/team-list.tsx:342`:

```typescript
{["Team Name", "Captain", "Members", "Session", "Payment", "Open Slots", "Actions"].map(...)}
```

Sprint 32 dropped the `team_name` column and changed the cell to render `team.captain_display_name` (line 378), but **the header text was never updated**. So today the team list ships:
- Header column 1: "Team Name" (drift)
- Cell column 1: captain's display name (correct)

This is a Sprint 32 closeout miss. Two fix options:
1. **Bolt task in Phase 0b:** rename "Team Name" → "Team" in `team-list.tsx:342`. Spec assertion stays.
2. **Spec-only:** soften the assertion to allow either "Team Name" or "Team" header text.

**Decision: Option 1 (Bolt fix in Phase 0b).** Per `memory/projects/craven.md` data model: "team identity = captain's full name everywhere — admin lists, leaderboard, error messages, Stripe receipts." The header should reflect that. Cleaner contract; the spec correctly enforces the post-Sprint-32 contract.

**Sprint 32 edit-trigger verification:**

Line 94: `page.getByRole("button", { name: /^edit$/i })` — verified at `team-list.tsx:432-434`. Each row renders a Button with text "Edit". `/^edit$/i` matches. **No issue here.**

**Pattern TS — Dead variable**

Line 25: `const TEST_CAPTAIN_EMAIL = \`e2e-captain-s32-${Date.now()}@example.com\`` — declared but never used. Spec should remove. Cosmetic only.

**Patterns A, B, C, E, F, G, H, T — N/A.**

**Summary for team-create-edit.spec.ts:**

| Pattern | Hits | Lines |
|---------|------|-------|
| **X (header rename — Phase 0b Bolt fix)** | 1 production-side fix | `team-list.tsx:342` |
| TS (dead variable) | Cosmetic remove | spec line 25 |
| A–H, T | N/A | — |

---

### tests/e2e/team-delete-type-to-confirm.spec.ts

**Summary:** 1 test, 82 lines. **STRUCTURALLY BROKEN** per Watchdog plan-PR review — the spec assumes a row-level Delete button exists. It doesn't. This is a full restructure, not a Pattern G `.last()` fix.

**The actual delete flow (verified `team-list.tsx` + `team-modal.tsx`):**

1. **Row actions:** Edit button + Mark Paid button (paid teams hide Mark Paid). **NO Delete button** on the row.
2. **Click Edit** → opens `<TeamModal mode="edit">`.
3. **TeamModal** (edit mode) renders a `DialogFooter` with a "Delete team" button.
4. **Click "Delete team"** → opens `<DeleteTeamDialog>`.
5. **`DeleteTeamDialog`** renders type-to-confirm logic gated by `requiresTypeConfirm = isPaid` (`team-list.tsx:154`).
   - **Paid teams:** type-to-confirm input + "Delete team" button (disabled until `confirmText === team.captain_display_name`).
   - **Unpaid teams:** no type-to-confirm; "Delete team" button enabled immediately.
6. **Click "Delete team"** in the confirm dialog → soft-delete + close.

**Spec rewrite required:**

```
[BEFORE — broken]
firstRow.getByRole("button", { name: /delete/i }).click()  // there is no row Delete button
const deleteButton = page.getByRole("button", { name: /^delete$/i }).last()  // fragile

[AFTER — actual flow]
1. Read team identity: firstRow.locator("td").first().innerText() → captainDisplayName
   (verified: column 0 cell = team.captain_display_name)
2. Click Edit on first paid row: 
   firstRow.getByRole("button", { name: "Edit", exact: true }).click()
3. Wait for edit modal: page.getByRole("dialog", { name: /Edit Team:/ })
4. Click "Delete team" in modal footer:
   page.getByRole("dialog").getByRole("button", { name: "Delete team", exact: true }).click()
5. Wait for confirm dialog: page.getByRole("dialog", { name: /Delete team .+\?/ })
6. Verify type-to-confirm input visible + Delete button starts disabled
7. Type captain display name
8. Verify Delete button enabled
9. Click confirm-dialog's Delete button (scoped to dialog)
10. Verify team gone from list + present in Trash
```

**Test selection — paid-team requirement:**

`requiresTypeConfirm = isPaid && amount_paid_cents > 0`. The test must select a **paid team** to exercise the type-to-confirm flow. Spec options:

- **Option A (preferred):** Find first paid team — `firstRow.getByRole("button", { name: "Mark Paid" })` is absent on paid rows, so paid rows can be filtered by absence of Mark Paid. Iterate rows until found; skip with explicit reason if no paid teams in PROD.
- **Option B:** Spec creates a team + uses service-key REST to mark it paid before the test (heavy, requires fixture infra).

**Decision: Option A.** Adds 5–10 lines of row-iteration; no new fixture infra. Spec includes deterministic logging if no paid teams found.

**Pattern X (header text):** The first column header reads "Team Name" today (Phase 0b Bolt fix renames to "Team"). Spec doesn't depend on header text in `td.first()` — it reads cell value, not header. So no spec dependency on Phase 0b. Spec works with either header.

**Pattern H — Trash assertion:** Line 80 `getByText(teamName)` in Trash. The `teamName` value read from the list cell will be the captain display name (per Sprint 32), and the Trash column for teams uses the same display value. This is correct as-is.

**Pattern TS — Destructive on PROD (KNOWN RISK):** Each test run removes a paid team. Per `memory/projects/craven.md` live data: 1 active team in prod as of Sprint 32. If still 1 team, this spec depletes the only team. Recommend Spec creates a paid-team fixture per run via service-key REST (matches `feedback_use_service_key_for_data_ops`). **Add to Spec prompt:** create + mark-paid the fixture team before exercising delete; verify cleanup if spec fails mid-run.

**Patterns A, B, C, E, F, T — N/A.**

**Summary for team-delete-type-to-confirm.spec.ts:**

| Pattern | Hits | Lines |
|---------|------|-------|
| **Structural rewrite** | Full flow change (Edit → Delete team → confirm) | 47–80 (whole test body) |
| G (confirm button) | Scope to confirm dialog, drop `.last()` | rewritten |
| H (Trash display) | Already correct — captain display name | 39, 80 |
| TS (destructive on PROD) | Spec creates paid-team fixture per run | new helper required |

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

## Pattern Discoveries Beyond the Original 8

**Two new patterns surfaced during plan-PR review** (Watchdog catch, 2026-05-01) — both promoted to numbered patterns above:

- **Pattern T (sonner toast vs role="alert"):** Server-action errors render via sonner `toast.error()`, not inline `role="alert"`. Confirmed at `contact-modal.tsx:48-49,63-64`. Affects `contact-type-removal-guard.spec.ts` (3 inline-error locators).
- **Pattern X (team list header text drift):** `team-list.tsx:342` ships `["Team Name", "Captain", ...]` but Sprint 32 dropped the column. Cell renders captain display name. Production-side fix in Phase 0b.

**Pattern P (PR #317 alert variant) — VERIFIED NON-ISSUE.** `contact-list.tsx:753-755` retains `role="alert"`. Pre-flight flag was correct caution; resolved cleanly with no surgery.

---

## Phase Structure

### Phase 0a — Forge-direct: dotenv config fix

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

Forge opens the PR as scottdavenport on a fresh branch off main.

---

### Phase 0b — Bolt: team list header rename (Pattern X) — 2 sites

**Files:**
1. `src/app/admin/teams/team-list.tsx:342` (admin teams list header)
2. `src/app/admin/trash/trash-tabs.tsx:162` (trash teams tab header)

**Change:** Rename "Team Name" → "Team" in both. Cell content unchanged in both (`team.captain_display_name`).

```typescript
// 1. team-list.tsx:342 — BEFORE
{["Team Name", "Captain", "Members", "Session", "Payment", "Open Slots", "Actions"].map(...)}
// AFTER
{["Team", "Captain", "Members", "Session", "Payment", "Open Slots", "Actions"].map(...)}

// 2. trash-tabs.tsx:162 — BEFORE
columns={{ header: "Team Name", renderName: (row) => row.captain_display_name || "(no captain)" }}
// AFTER
columns={{ header: "Team", renderName: (row) => row.captain_display_name || "(no captain)" }}
```

**Pre-flight verified** via `grep -rn '"Team Name"' src/` → exactly 2 hits, both listed above. No other production surface uses the literal string.

**Rationale:** Per `memory/projects/craven.md` data model — "team identity = captain's full name everywhere — admin lists, leaderboard, error messages, Stripe receipts." The header text was a Sprint 32 closeout miss. Spec at `team-create-edit.spec.ts:84` correctly enforces the post-Sprint-32 contract by asserting "Team Name" is NOT present.

**Effort:** XS (2 single-line changes in 2 files). Bolt opens own PR per `feedback_builders_open_their_own_prs`.

**Commit:** `fix(admin): rename "Team Name" header → "Team" in teams list + trash tab (Sprint 32 closeout, #331 Pattern X)`

**Phase 0a + 0b ship in parallel** — different files, no dependency.

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

### Phase dependency map

```
Phase 0 (parallel, serial-before-Phase-1):
  Phase 0a (Forge-direct):           Phase 0b (Bolt):
    playwright.config.ts                team-list.tsx:342 header rename
    dotenv loader                       "Team Name" → "Team"
  Both merge BEFORE Phase 1 launches.
  No file overlap → parallel safe.

Phase 1 (parallel, AFTER Phase 0a + 0b both merge):
  Batch 1:                          Batch 2:
  spec/sprint-35-contact-cluster    spec/sprint-35-team-score-cluster
  Files: 4 contact e2e specs        Files: 3 team/score e2e specs
  No file overlap with Batch 2      No file overlap with Batch 1
  → Can run fully parallel
```

**No file overlap between any phase.** Phase 0a touches `playwright.config.ts`. Phase 0b touches `team-list.tsx`. Phase 1 touches only spec files.

**Phase 1 fresh-from-main requirement:** Phase 1 Spec agents pull from fresh main AFTER both Phase 0 PRs merge. Bake `git fetch origin main && git worktree add ... origin/main` into Spec prompts.

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
14. Guard-fire tests: if a contact is on a team, `inlineError` locator resolves to a sonner toast (`[data-sonner-toast]` filtered by guard error text). `errorText` matches the actual server-returned guard message — verify exact string from `actions.ts` before locking the regex. Pattern T fix applied at lines 63–65, 146–148, 203–206.
15. All 3 tests report `passed` (or annotated `info` for valid non-fire path with explicit reason logged), not silent skip or timeout.

### team-create-edit.spec.ts (5 tests)

16. Test "Add Team opens a centered modal, not a side drawer": dialog is visible and its center X is within 200px of viewport center.
17. Test "Add Team modal does NOT have a Team Name text input": `getByLabel(/^team name$/i)` is not visible.
18. Test "Add Team modal has captain picker as primary identity field": captain picker input is visible.
19. Test "Team list row shows captain full name as team identity": no "Team Name" header; "Captain" or equivalent header is present.
20. Test "Edit team opens a centered modal (not drawer)": if edit buttons exist, clicking the first opens a centered dialog. Dead `TEST_CAPTAIN_EMAIL` variable removed from file.

### team-delete-type-to-confirm.spec.ts (1 test, FULL RESTRUCTURE)

21. **Fixture creation:** Spec creates a fresh paid-team fixture per run via service-key REST (insert via `register_team` RPC, mark paid via UPDATE). Captain captured for type-to-confirm. try/finally cleanup if test fails before delete completes.
22. **Flow:** click row's "Edit" button (NOT "Delete" — no row-level delete exists) → click "Delete team" in modal `DialogFooter` → wait for `DeleteTeamDialog` → verify type-to-confirm input visible → verify confirm button starts disabled → type captain display name → verify confirm button enabled → click confirm-dialog's "Delete team" button (scoped to `page.getByRole("dialog")`) → verify team gone from list → verify team appears in `/admin/trash` Teams tab.
23. Test reports `1 passed` (no silent skip). If fixture creation fails, fail loudly with the REST error, do not skip.

### score-create-edit.spec.ts (5 tests)

24. Test "Add Score opens a centered modal": dialog is visible and centered.
25. Test "Add Score modal has a team dropdown, NOT a freeform team name text input": no `getByLabel(/^team name$/i)` visible; combobox present.
26. Test "Team dropdown lists captain names": combobox opens and options are non-empty.
27. Test "Score list row shows captain name as team identity, no team_name column": no "Team Name" header in scores table.
28. Test "Score with no team shows fallback string (not blank)": score table renders without crashing; first row is visible if rows exist.

---

## Risk Notes / Known Unknowns

### 1. Pattern T (sonner toast locator) — verify in dev mode before locking

Sonner's DOM structure can change across versions; the spec MUST verify the actual `[data-sonner-toast]` element exists in dev mode before committing the locator. Fallback: `page.getByText(<exact server error string>)` scoped to a visible region. Spec Batch 1 owns this discovery.

### 2. Pattern X dependency: Phase 0b must merge before team-create-edit assertions

`team-create-edit.spec.ts` line 84 (per Watchdog) asserts no "Team Name" header is present. **This is RED today** because production still ships "Team Name" at `team-list.tsx:342`. Phase 0b (Bolt) renames it to "Team". Phase 1 Batch 2 must pull fresh main AFTER Phase 0b merges, otherwise the Spec verification will appear to fail incorrectly.

### 3. team-delete-type-to-confirm requires a paid-team fixture

Per `memory/projects/craven.md`: 1 active team in PROD as of Sprint 32. The spec destructively deletes a paid team per run. **Spec MUST create a fresh paid-team fixture per run** via service-key REST per `feedback_use_service_key_for_data_ops`. Fixture pattern:
1. Insert fresh team via `register_team` RPC (4-param signature per `memory/projects/craven.md`)
2. Mark paid via `UPDATE teams SET payment_status = 'paid', amount_paid_cents = X` via service-key REST
3. Run delete flow against fixture team
4. Verify cleanup if mid-run failure (try/finally to remove fixture if test failed before delete completed)

Spec prompt for Batch 2 must explicitly include this fixture pattern; do NOT operate on the only PROD team.

### 4. Phase 1 may escalate to Bolt

Per `feedback_test_refresh_can_surface_prod_bugs`: "Test-only" spec refresh sprints regularly surface production-code regressions. Sprint 34 found the modal DialogFooter issue mid-sprint and had to spawn Bolt. Phase 0b is one Bolt task already; **budget for additional Bolt escalation if:**

- The score modal has multiple comboboxes without accessible labels, requiring a production-code fix to add a `<label>` or `aria-label`.
- The type-removal-guard error message text from `actions.ts` doesn't match the spec's expected pattern — may need a copy update from Aria.
- A new alert/toast component without test-friendly attributes blocks Spec from writing a stable locator.

### 5. PROD writes and orphan contact cleanup

Specs write to PROD (no staging by design — per `memory/projects/craven.md`). `contact-multi-type.spec.ts` creates up to 11 contacts per run (one per test, using `e2e-*@example.com` addresses with timestamps). After the sprint, Forge runs orphan cleanup via service-key REST DELETE:

```
DELETE /rest/v1/contacts?email=like.e2e-*@example.com
```

Per `feedback_use_service_key_for_data_ops`: Forge executes this directly, not handed to Scott.

`team-delete-type-to-confirm.spec.ts` deletes a real team per run (destructive). Monitor team count in PROD; if depleted, a seed team is needed.

### 6. No migrations in this sprint

All changes are spec-file and `playwright.config.ts` changes only. No schema changes. No `apply_migration` calls. The `apply_migration` MCP read-only blocker (seen in Sprint 32/33/34) is irrelevant.

### 7. `feedback_skip_is_not_pass` enforcement in Spec prompts

Forge MUST include explicit language in each Spec prompt: "Verification gate is `X passed` in output, not `X skipped cleanly`. If tests skip, report the skip reason explicitly. Do not present skipped tests as passing."

### 8. Spec agent worktree isolation

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
| `playwright.config.ts` | Modified — add dotenv loader | Phase 0a (Forge-direct) |
| `src/app/admin/teams/team-list.tsx` | Modified — line 342 "Team Name" → "Team" header rename | Phase 0b (Bolt) |
| `src/app/admin/trash/trash-tabs.tsx` | Modified — line 162 "Team Name" → "Team" header rename | Phase 0b (Bolt) |
| `tests/e2e/contact-multi-type.spec.ts` | Modified — Pattern E (18 hits) + G | Phase 1 Batch 1 |
| `tests/e2e/contact-bulk-subscribe.spec.ts` | Verify only — likely no change | Phase 1 Batch 1 |
| `tests/e2e/contact-bulk-blocked-alert.spec.ts` | Verify only — Pattern P resolved as non-issue | Phase 1 Batch 1 |
| `tests/e2e/contact-type-removal-guard.spec.ts` | **Modified — Pattern T (sonner toast locator rewrite)** | Phase 1 Batch 1 |
| `tests/e2e/team-create-edit.spec.ts` | Modified — dead `TEST_CAPTAIN_EMAIL` removal; assertion validates after Phase 0b merge | Phase 1 Batch 2 |
| `tests/e2e/team-delete-type-to-confirm.spec.ts` | **Modified — full restructure (Edit modal → Delete team → confirm dialog) + paid-team fixture** | Phase 1 Batch 2 |
| `tests/e2e/score-create-edit.spec.ts` | Verify only — likely no change | Phase 1 Batch 2 |
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

**Pattern P** (PR #317 alert variant — VERIFIED NON-ISSUE)

`contact-list.tsx:753-755` retains `role="alert"` on the blocked-row Alert. Existing locators in `contact-bulk-blocked-alert.spec.ts` work as-is. **No changes needed.**

**Pattern T** (sonner toast — server-action errors)

```typescript
// WRONG — server-action errors render via toast.error(), not as role="alert":
const inlineError = page.getByRole("alert").filter({ hasText: /team/i });

// CORRECT — sonner toast locator:
const inlineError = page
  .locator('[data-sonner-toast]')
  .filter({ hasText: /team|sponsor|remove/i });

// FALLBACK if sonner attributes differ in this version:
const inlineError = page.getByText(/A team member|cannot remove/i).first();
```

Spec MUST verify the actual sonner DOM structure in dev mode (open form, trigger guard, inspect rendered toast) before committing the locator.

**Pattern X** (team list header text drift — PRODUCTION FIX, Phase 0b — 2 sites)

```typescript
// src/app/admin/teams/team-list.tsx:342 — BEFORE
{["Team Name", "Captain", "Members", "Session", "Payment", "Open Slots", "Actions"].map(...)}
// AFTER
{["Team", "Captain", "Members", "Session", "Payment", "Open Slots", "Actions"].map(...)}

// src/app/admin/trash/trash-tabs.tsx:162 — BEFORE
columns={{ header: "Team Name", renderName: (row) => row.captain_display_name || "(no captain)" }}
// AFTER
columns={{ header: "Team", renderName: (row) => row.captain_display_name || "(no captain)" }}
```

Pre-flight `grep -rn '"Team Name"' src/` → exactly 2 hits. No other surface affected.

Spec assertion at `team-create-edit.spec.ts:84` already enforces no "Team Name" present; correct on Sprint 32 contract.

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
| Phase 0a: dotenv fix | S (~30 min) | Forge-direct |
| Phase 0b: team-list header rename | S (~30 min including Bolt PR cycle) | Bolt |
| Phase 1 Batch 1: 4 contact specs | M (~2.5h including Pattern T verification + sonner locator discovery) | Spec |
| Phase 1 Batch 2: 3 team/score specs | M-L (~2.5h including paid-team fixture work for delete spec) | Spec |
| Watchdog review × 4 PRs | M (~1.5h total — 4 Watchdog cycles + likely 1-2 fixup rounds) | Watchdog |
| Orphan contact cleanup + paid-fixture cleanup | S (~15 min) | Forge-direct |
| **Total estimated wall-clock** | **~6–8h** (Watchdog-revised; Sprint 34 overran by 75–100%, similar variance budgeted here) | — |

---

*Citation: `feedback_test_refresh_can_surface_prod_bugs`. Watchdog's plan-PR review surfaced 2 new patterns (T + X) that require production-code fixes (Phase 0b) AND a structural rewrite of `team-delete-type-to-confirm.spec.ts` with a paid-team fixture. Original Compass estimate of 4–5h assumed all 7 specs were spec-only changes. Revised to 6–8h to reflect Bolt escalation + fixture work + the ~75% Sprint-34 variance baseline.*
