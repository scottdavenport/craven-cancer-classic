# Sprint 21 · Issue #230 — Registration Flow Copy

**Status:** RED (tests written, Bolt ships GREEN)
**Branch:** sprint-21/230-registration-copy
**Locked by:** Aria (2026-04-22 Forge session)

---

## Locked Copy Package

All strings below are verbatim. No paraphrasing, no punctuation drift.

---

### 1. Session picker — `src/app/(public)/register/registration-form.tsx`

| Element | OLD | NEW |
|---|---|---|
| CardTitle (h3) | "Select Session" | **"Preferred Session"** |
| NEW helper line | _(none)_ | **"The committee balances morning and afternoon groups. Your final session will be confirmed by email."** |

- Helper line placement: inside `<CardContent>`, after the `<div role="radiogroup">` grid, before the closing `</CardContent>`.

---

### 2. Registration success page — `src/app/(public)/register/success/page.tsx`

| Element | OLD | NEW |
|---|---|---|
| `metadata.title` | "Registration Confirmed" | **"You're In — Craven Cancer Classic"** |
| `<h1>` | "You're Registered!" | **"You're In."** |
| Body paragraph 1 | "Thank you for registering for the Craven Cancer Classic!" | **"Your spot in the 2026 Craven Cancer Classic is reserved."** |
| Body paragraph 2 | "You will receive a confirmation email with your team details. We look forward to seeing you on the course." | **"Check your inbox — a confirmation with your team details is on its way. Your session will be confirmed once the committee balances groups. We'll see you in September."** |

---

### 3. Registration closed card — `src/app/(public)/register/page.tsx`

| Element | OLD | NEW |
|---|---|---|
| `<h2>` | "Registration is Currently Closed" | **"Registration Opens Soon"** |
| Body paragraph | "Registration for the [year] tournament is not yet open. Leave your name and email below and we'll notify you as soon as spots are available." | **"Spots for the [year] Craven Cancer Classic aren't available yet. Add your name below and you'll hear from us the moment they are."** |

- `[year]` is interpolated from `eventSettings?.tournament_start_date` → `getFullYear()` with fallback `new Date().getFullYear()`. Keep this pattern; do not hardcode.

---

### 4. CTA consolidation — site-wide "Register Your Team"

| File | Line (approx) | OLD | NEW |
|---|---|---|---|
| `src/app/(public)/page.tsx` | ~266 | "Register to Play" | **"Register Your Team"** |
| `src/app/(public)/about/page.tsx` | ~146 | "Register to Play" | **"Register Your Team"** |

Note: `src/app/(public)/page.tsx` line ~119 already says "Register Your Team" — do not touch.

---

### 5. Registration submit button — `src/app/(public)/register/registration-form.tsx`

| State | OLD | NEW |
|---|---|---|
| Idle | "Proceed to Payment" | **"Continue to Payment"** |

The loading state ("Processing...") is unchanged.

---

### 6. Seeking-team form submit — `src/app/(public)/register/seeking-team-form.tsx`

| State | OLD | NEW |
|---|---|---|
| Idle | "Submit" | **"Add Me to the List"** |
| Loading | "Submitting..." | **"Adding you..."** |

---

## Acceptance Criteria

1. All 6 copy areas ship verbatim — no drift on punctuation, casing, or em-dashes.
2. Year in registration-closed body remains dynamically interpolated (not hardcoded).
3. `metadata.title` on success page exports the new string.
4. "Register to Play" is eliminated from `src/app/(public)/` (excluding `__tests__/`).
5. No other copy in these files is changed (error fallbacks, loading states not listed above, nav, etc.).
6. All RED tests in `src/__tests__/registration-copy-230.test.tsx` pass GREEN.

---

## Test File

`src/__tests__/registration-copy-230.test.tsx`

RED against main. GREEN after Bolt's PR.
