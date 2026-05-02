# Sprint 38 — Fix #350: Handicap stale-error after Player unchecked

**Status:** Plan (awaiting execution)
**Issue:** [#350](https://github.com/scottdavenport/craven-cancer-classic/issues/350)
**Branch:** `fix/s38-handicap-stale-error` (off `main`)

---

## § 1 Plain-English Readout

When an admin opens the Add/Edit Contact form, checks "Player", types a bad handicap value (like "abc"), tabs away to trigger the inline error, then unchecks "Player" — the submit button stays permanently disabled. The handicap field is hidden at this point, the error message is invisible, and no visible action remains to clear it. The admin is stuck. The only escape is to close the modal and reopen it, losing any other data already entered.

This is a UX dead-end. The fix is one line: clear the handicap error from state when the Player type is unchecked, so the submit gate reflects only visible-field validity.

---

## § 2 Background / Why Now

Spec surfaced this bug during the Sprint 37 contact-form coverage build while implementing Risk 3 analysis (see `plans/sprint-37-contact-form-coverage.md §6`). The root cause was confirmed in code and documented in #350. Sprint 37 closed 2026-05-01 with all 2 PRs first-pass APPROVED; #350 was filed as a P2 follow-up. Sprint 38 is the follow-up sprint.

Root cause (from #350): `toggleType` (line 151–155 in `contact-form.tsx`) calls `setTypes(...)` but never calls `setFieldError("handicap", null)` when the "player" type is removed. So `errors.handicap` survives the hidden-field transition, `hasErrors` stays `true`, and `onValidityChange({ canSubmit: false })` keeps the submit button disabled.

`setFieldError` is a stable closure — safe to call inside a `setTypes` updater per Spec's analysis in #350.

---

## § 3 Specialist Gates

**Bolt only.** No Aria gate (no new user-facing strings). No Pixel gate (no design surface). No Spec gate per CLAUDE.md Spec Trigger Rules: bug fix touching 1–2 files; builder writes the regression test inline.

---

## § 4 Acceptance Criteria

Each criterion is a verifiable state in the running app or test suite. Bolt runs the grep commands exactly as written and pastes actual output in the PR body.

### AC-1 — `toggleType` calls `setFieldError` on player-uncheck

```bash
grep -n "setFieldError" src/app/admin/contacts/contact-form.tsx
```

Expected: at least 2 matches — the existing calls from `validateEmail`/`validatePhone`/`validateZip`/`validateHandicap`, **plus one new match inside `toggleType`** containing `"handicap"` and `null`.

### AC-2 — Regression test T26 exists and is named exactly

```bash
grep -n "T26:" src/__tests__/contact-form.test.tsx
```

Expected: exactly 1 match. The test name must be:

```
T26: when Player is unchecked after an invalid handicap was blurred, canSubmit becomes true
```

### AC-3 — T26 lives in describe block "ContactForm — type toggling"

```bash
grep -n 'describe.*type toggling' src/__tests__/contact-form.test.tsx
```

Expected: exactly 1 match.

### AC-4 — Header docstring updated (cosmetic tag-along)

The header docstring at lines 1–25 of `src/__tests__/contact-form.test.tsx` currently reads:

```
25 tests across 7 describe blocks
```

After this PR it must read:

```
26 tests across 7 describe blocks
```

```bash
grep -n "26 tests across 7 describe blocks" src/__tests__/contact-form.test.tsx
```

Expected: exactly 1 match.

### AC-5 — Full test suite passes with no skips

```bash
npx vitest run src/__tests__/contact-form.test.tsx 2>&1 | tail -5
```

Expected output includes `26 passed` and zero `skipped`. Per `feedback_skip_is_not_pass`: "passed" lines are required. "No failures" is not sufficient.

### AC-6 — No regressions in the full suite

```bash
npx vitest run 2>&1 | tail -10
```

Expected: all previously passing tests still pass. Zero new failures.

---

## § 5 Files Touched

| File | Change |
|---|---|
| `src/app/admin/contacts/contact-form.tsx` | Expand `toggleType` per Spec's exact proposal in #350 |
| `src/__tests__/contact-form.test.tsx` | Add T26 in new describe block; update header docstring count |

**Total: 2 files.** Per CLAUDE.md: bug fix touching 1–2 files — no Spec spawn required, builder writes regression test inline.

---

## § 6 Risks and Open Questions

**R1 — `setFieldError` inside `setTypes` updater.**
Spec confirmed this is safe: `setFieldError` itself calls `setErrors(prev => ...)`, which enqueues a second state update — React batches both within the same event. No closure-staleness risk.

**R2 — Other type-specific fields.**
Only "player" has a type-gated field with its own validation (`handicap`). Donor and Hole Sponsor types have no gated fields with inline errors. No other `setFieldError` calls are needed in `toggleType`.

**R3 — Describe-block count.**
The Sprint 37 PR body and the header docstring both stated "7 describe blocks" but only 6 were created. Adding the new "type toggling" describe block brings the actual count to 7. The docstring update in AC-4 corrects the test count (25 → 26); the describe-block count (7) becomes accurate for the first time.

**Open questions:** None. Root cause is confirmed, fix is exact, test reproducer is specified.

---

## § 7 Test Plan (Inline Regression Test)

**Location:** `src/__tests__/contact-form.test.tsx` — new describe block at the end of the file, after the existing "ContactModal — Cancel resets unsaved form state" block.

**Describe block name:** `ContactForm — type toggling`

**Test T26 design:**

```
it("T26: when Player is unchecked after an invalid handicap was blurred, canSubmit becomes true")
```

Reproducer sequence (matches #350 exactly):

1. Render `<ContactForm onSubmit={noop} />` with no `initial` prop (defaults: no types checked).
2. Check the "Player" checkbox — `fireEvent.click(screen.getByLabelText(/player/i))`.
3. Type `"abc"` into the handicap field — `await userEvent.type(screen.getByLabelText(/handicap/i), "abc")`.
4. Blur the handicap field — `fireEvent.blur(screen.getByLabelText(/handicap/i))`.
5. Assert the handicap error is visible: `expect(screen.getByText(/invalid handicap/i)).toBeInTheDocument()`. *(Confirms pre-condition: error is set.)*
6. Uncheck "Player" — `fireEvent.click(screen.getByLabelText(/player/i))`.
7. Assert handicap error is no longer in the document: `expect(screen.queryByText(/invalid handicap/i)).not.toBeInTheDocument()`. *(Confirms fix: error cleared.)*

Note: The test asserts on the visible error message rather than on `canSubmit` directly, because the test file has no `onValidityChange` spy wired through a controlling wrapper. The visible-error assertion is sufficient — if `errors.handicap` was not cleared, the error message would re-appear once the field is re-shown. This pattern is consistent with T1–T6 in the existing blur-validation block.

**beforeEach:** `vi.clearAllMocks()` — consistent with all other describe blocks.
