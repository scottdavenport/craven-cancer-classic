# Sprint 37 — Plan: #137 contact-form.tsx Component Coverage

**Issue:** #137 — Component tests for contact-form.tsx (coverage 5% → target 60%+)
**Priority:** P3-low | **Type:** chore | **Size:** M
**Author:** Compass 🧭 | **Date:** 2026-05-01

---

## 1. Pre-flight Research

### 1.1 File size confirmation

`contact-form.tsx` is **626 lines** (issue body said ~400; the file has drifted — confirmed by `wc -l`).

### 1.2 Pre-flight greps (verbatim output)

**`grep -n "onBlur\|validate" src/app/admin/contacts/contact-form.tsx | head -40`**

```
157:  function validateEmail(val: string): boolean {
166:  function validatePhone(val: string): boolean {
180:    validatePhone(phone);
183:  function validateZip(val: string): boolean {
192:  function validateIdentity() {
201:  function validateHandicap(val: string): boolean {
218:    const emailOk = validateEmail(email);
219:    const phoneOk = validatePhone(phone);
220:    const zipOk = validateZip(zip);
221:    const identityOk = validateIdentity();
222:    const handicapOk = isPlayer ? validateHandicap(handicap) : true;
286:              onBlur={validateIdentity}
296:              onBlur={validateIdentity}
306:              onBlur={validateIdentity}
328:            onBlur={(e) => validateEmail(e.target.value)}
343:            onBlur={handlePhoneBlur}
391:                  onBlur={(e) => validateHandicap(e.target.value)}
599:              onBlur={(e) => validateZip(e.target.value)}
```

**`grep -nE "(z\.string\(\)|\.regex|\.email|\.refine)" src/app/admin/contacts/contact-form.tsx`**

```
81:  const [email, setEmail] = useState(initial?.email ?? "");
330:            aria-invalid={!!errors.email}
332:          {errors.email && (
333:            <p className="text-xs text-destructive">{errors.email}</p>
```

Note: Zero Zod schema hits. `contact-form.tsx` uses **plain functions** (`isValidEmail`, `isValidPhone`, `isValidZip`) from `src/lib/contacts/contact-utils.ts`, not a Zod schema. Validation is imperative — no schema to import or mock.

**`grep -rn "ContactInput" src/ | head -20`**

```
src/app/admin/contacts/contact-modal.tsx:16:import type { ContactInput } from "./actions";
src/app/admin/contacts/contact-modal.tsx:57:  async function handleSubmit(input: ContactInput) {
src/app/admin/contacts/contact-form.tsx:28:import type { ContactInput } from "./actions";
src/app/admin/contacts/contact-form.tsx:41:  onSubmit: (input: ContactInput) => Promise<void>;
src/app/admin/contacts/contact-form.tsx:229:    const input: ContactInput = {
src/app/admin/contacts/actions.ts:185:export type ContactInput = {
src/app/admin/contacts/actions.ts:208:  input: ContactInput
src/app/admin/contacts/actions.ts:253:  input: Partial<ContactInput>
src/app/admin/contacts/actions.ts:258:  let normalizedInput: Partial<ContactInput> & { full_name?: string } = { ...input };
src/__tests__/contacts-actions.test.ts:464:/** Minimal valid ContactInput for create tests. */
src/__tests__/contacts-actions.test.ts:1135:// Fails until Flux adds `types` column + ContactInput.types + show_on_wall
src/__tests__/contacts-actions.test.ts:1139: * Sprint 31 ContactInput — extends the existing shape with multi-type fields.
src/__tests__/contacts-actions.test.ts:1143:type S31ContactInput = any;
src/__tests__/contacts-actions.test.ts:1160:    const input: S31ContactInput = {
src/__tests__/contacts-actions.test.ts:1199:    const input: S31ContactInput = {
src/__tests__/contacts-actions.test.ts:1247:    } as S31ContactInput);
src/__tests__/contacts-actions.test.ts:1275:    const input: S31ContactInput = {
src/__tests__/contacts-actions.test.ts:1318:    const input: S31ContactInput = {
src/__tests__/contacts-actions.test.ts:1354:    const result = await updateContact("donor-uuid", { show_on_wall: false } as S31ContactInput);
src/__tests__/contacts-actions.test.ts:1422:    await getContacts({ type: "volunteer" as S31ContactInput })
```

Canonical import path: `import type { ContactInput } from "@/app/admin/contacts/actions"`.

**`grep -n "normalize\|E164\|E\.164\|toE164" src/app/admin/contacts/contact-form.tsx`**

```
25:  normalizePhone,
176:    const normalized = normalizePhone(phone);
177:    if (normalized) {
178:      setPhone(formatPhoneForDisplay(normalized));
```

**`grep -rn "normalize\|E164\|E\.164\|toE164" src/lib/`**

```
src/lib/contacts/contact-utils.ts:15:export function normalizeEmail(raw: string | null): string | null {
src/lib/contacts/contact-utils.ts:25:export function normalizePhone(raw: string | null): string | null {
```

Phone normalization chain: `normalizePhone` (in `contact-utils.ts`) calls `libphonenumber-js/min` `parsePhoneNumber` and returns the E.164 string (e.g. `+19195550100`). On blur, the form calls `normalizePhone(phone)` and if truthy, calls `setPhone(formatPhoneForDisplay(normalized))`, which formats for display as `(919) 555-0100`. The field value in state is always the display format, not E.164. The E.164 value lives only in the `ContactInput.phone` sent to `onSubmit` — wait, correction: `contact-form.tsx` line 234 passes `nullify(phone)` (the display-formatted value) to `ContactInput.phone`. The E.164 normalization happens in `createContact`/`updateContact` in `actions.ts`. The form's blur behavior is: display reformat only (not E.164). The test must verify: after blur on `(919) 555-0100`, the displayed value is `(919) 555-0100` (normalized national format from libphonenumber).

**Existing test files touching contact-form (clobber check):**

```
src/__tests__/contact-form-polish.test.tsx — Sprint 19 PR-C polish only (197 lines)
```

Only one file. New file `src/__tests__/contact-form.test.tsx` has no name collision.

---

## 2. Scope

### In scope
- New file: `src/__tests__/contact-form.test.tsx`
- Tests covering the six behavior ACs: blur validation (email/phone/ZIP), identity validation, submit gate, submit spy assertion, phone display normalization on blur, Cancel behavior

### Out of scope
- No changes to `src/app/admin/contacts/contact-form.tsx`
- No changes to any other source file
- No Aria gate required — this PR contains zero copy changes (confirmed: test-only PR, no strings added or modified)
- No refactors to `contact-form-polish.test.tsx` (different file, different surface, no clobber)

---

## 3. Architecture Notes

**No mocks needed for server actions.** `ContactForm` receives `onSubmit` as a prop (type `(input: ContactInput) => Promise<void>`). Tests inject a `vi.fn()` spy. No `createContact`/`updateContact` module mock required.

**Render setup.** `ContactForm` is a client component with no router dependency and no `useSession`. Plain `render(<ContactForm onSubmit={spy} />)` works. The existing polish test confirms this pattern.

**Cancel behavior.** Cancel is NOT in `contact-form.tsx`. The Cancel button lives in `contact-modal.tsx` and calls `onOpenChange(false)`. The form itself has no reset logic or cancel handler. The AC "Reset via Cancel" must be tested via `ContactModal`, not `ContactForm` in isolation. The plan addresses this below.

**`types[]` gate.** `canSubmit` (via `onValidityChange`) is false when `types.length === 0`. The submit button is in `ContactModal`, not the form. To test submit-blocked behavior directly against `ContactForm`, the test triggers form submission (`fireEvent.submit(form)`) with zero types checked and asserts `onSubmit` was not called.

---

## 4. Test Plan — Assertion-by-Assertion

### 4.1 File header and shared setup

```
src/__tests__/contact-form.test.tsx
```

Imports:
- `import { describe, it, expect, vi, beforeEach } from "vitest"`
- `import { render, screen, fireEvent, waitFor } from "@testing-library/react"`
- `import userEvent from "@testing-library/user-event"`
- `import { ContactForm } from "@/app/admin/contacts/contact-form"`
- `import type { ContactInput } from "@/app/admin/contacts/actions"`
- `import { ContactModal } from "@/app/admin/contacts/contact-modal"` (Cancel suite only)

Shared helper:

```ts
function buildInitial(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "test-id",
    full_name: "Jane Smith",
    first_name: "Jane",
    last_name: "Smith",
    salutation: null,
    email: null,
    phone: null,
    types: ["player"] as string[],
    company: null,
    address1: null,
    address2: null,
    city: null,
    state: null,
    zip: null,
    marketing_consent: false,
    source: null,
    year_first_seen: 2026,
    notes: null,
    created_at: new Date().toISOString(),
    deleted_at: null,
    handicap: null,
    shirt_size: null,
    show_on_wall: true,
    recognition_name: null,
    ...overrides,
  };
}
```

---

### 4.2 AC: Blur validation — email inline error appears

**Describe block:** `ContactForm — blur validation`

**Test 1:** `"shows 'Invalid email format' error below the email field when an invalid email is blurred"`
- Render `<ContactForm onSubmit={vi.fn()} />`
- `await userEvent.type(screen.getByLabelText(/email/i), "notanemail")`
- `fireEvent.blur(screen.getByLabelText(/email/i))`
- `expect(screen.getByText("Invalid email format")).toBeInTheDocument()`

**Test 2:** `"clears the email error when a valid email is blurred after an invalid one"`
- Render form
- Type `"bad"`, blur → error appears
- Clear field, type `"jane@example.com"`, blur
- `expect(screen.queryByText("Invalid email format")).not.toBeInTheDocument()`

**Test 3:** `"shows 'Invalid phone number' error below the phone field when an invalid phone is blurred"`
- Type `"123"` into phone field, blur
- `expect(screen.getByText("Invalid phone number")).toBeInTheDocument()`

**Test 4:** `"clears the phone error when a valid phone is blurred"`
- Type `"123"`, blur → error
- Clear, type `"(919) 555-0100"`, blur
- `expect(screen.queryByText("Invalid phone number")).not.toBeInTheDocument()`

**Test 5:** `"shows ZIP error 'ZIP must be 5 digits...' when a non-ZIP value is blurred"`
- Type `"1234"` into ZIP field (label: "ZIP"), blur
- `expect(screen.getByText(/ZIP must be 5 digits/)).toBeInTheDocument()`

**Test 6:** `"clears the ZIP error when a valid ZIP is blurred"`
- Type `"1234"`, blur → error
- Clear, type `"28562"`, blur
- `expect(screen.queryByText(/ZIP must be 5 digits/)).not.toBeInTheDocument()`

---

### 4.3 AC: Identity validation — all-blank rejection matrix

**Describe block:** `ContactForm — identity validation`

Identity rule: `validateIdentity()` fires when first name, last name, or company loses focus. Error shows when ALL three are blank. Error message: `"Provide a first/last name or company name"`.

**Identity blank matrix — 4 permutations to test:**

| First | Last | Company | Expect error? |
|-------|------|---------|---------------|
| blank | blank | blank | YES |
| "Jane" | blank | blank | NO |
| blank | "Smith" | blank | NO |
| blank | blank | "Acme Corp" | NO |

**Test 7:** `"shows identity error when all three identity fields are blank and first name loses focus"`
- Render form (no `initial`, all fields empty)
- `fireEvent.blur(screen.getByLabelText(/first name/i))`
- `expect(screen.getByText("Provide a first/last name or company name")).toBeInTheDocument()`

**Test 8:** `"shows identity error when all three identity fields are blank and last name loses focus"`
- Render fresh form
- `fireEvent.blur(screen.getByLabelText(/last name/i))`
- `expect(screen.getByText("Provide a first/last name or company name")).toBeInTheDocument()`

**Test 9:** `"shows identity error when all three identity fields are blank and company loses focus"`
- Render fresh form
- `fireEvent.blur(screen.getByLabelText(/company/i))`
- `expect(screen.getByText("Provide a first/last name or company name")).toBeInTheDocument()`

**Test 10:** `"clears identity error when first name has a value and loses focus"`
- Render fresh form, blur first name → error appears
- `await userEvent.type(screen.getByLabelText(/first name/i), "Jane")`
- `fireEvent.blur(screen.getByLabelText(/first name/i))`
- `expect(screen.queryByText("Provide a first/last name or company name")).not.toBeInTheDocument()`

**Test 11:** `"clears identity error when only company is filled and company loses focus"`
- Render fresh form, blur company → error appears
- `await userEvent.type(screen.getByLabelText(/company/i), "Acme")`
- `fireEvent.blur(screen.getByLabelText(/company/i))`
- `expect(screen.queryByText("Provide a first/last name or company name")).not.toBeInTheDocument()`

---

### 4.4 AC: Submit blocked when fields are invalid

**Describe block:** `ContactForm — submit gate`

The form element has `id="contact-form"`. Tests trigger `fireEvent.submit(document.getElementById("contact-form"))`.

**Test 12:** `"does not call onSubmit when identity is all-blank at submit time"`
- Render `<ContactForm onSubmit={spy} />` (no `initial`, all fields empty, no types checked)
- `fireEvent.submit(screen.getByRole("form")...)` — or query by id
- `expect(spy).not.toHaveBeenCalled()`

**Test 13:** `"does not call onSubmit when email is invalid at submit time"`
- Render with `initial={buildInitial({ email: "notanemail" })}`
- Trigger submit
- `expect(spy).not.toHaveBeenCalled()`

**Test 14:** `"does not call onSubmit when phone is invalid at submit time"`
- Render with `initial={buildInitial({ phone: "123" })}`
- The phone is pre-populated from `initial?.phone`; however, `formatPhoneForDisplay("123")` will return `"123"` (libphonenumber can't parse it) — so the phone field will show `"123"`. Submit → `validatePhone("123")` fails.
- `expect(spy).not.toHaveBeenCalled()`

**Test 15:** `"does not call onSubmit when ZIP is invalid at submit time"`
- Render with `initial={buildInitial({ zip: "1234" })}`
- Trigger submit
- `expect(spy).not.toHaveBeenCalled()`

---

### 4.5 AC: Submit fires onSubmit with correct ContactInput shape (spy assertion)

**Describe block:** `ContactForm — submit with valid data`

Per `feedback_spec_spy_assertions_required`: spy must assert call args, not just that it was called.

**Test 16:** `"calls onSubmit with a ContactInput containing nullified empty strings for optional fields"`
- Build `initial` with `first_name: "Jane"`, `last_name: "Smith"`, `types: ["player"]`, all others blank/null
- Render `<ContactForm initial={initial} onSubmit={spy} />`
- Trigger submit
- `await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))`
- `const arg = spy.mock.calls[0][0] as ContactInput`
- Assert: `arg.first_name === "Jane"`, `arg.last_name === "Smith"`, `arg.email === null`, `arg.phone === null`, `arg.types` deep equals `["player"]`
- Assert: `arg.marketing_consent === false`, `arg.year_first_seen` is a number

**Test 17:** `"calls onSubmit with marketing_consent: true when the switch is toggled on"`
- Render with valid `initial` (first_name + types)
- `fireEvent.click(screen.getByRole("switch"))` (marketing consent switch)
- Trigger submit
- `const arg = spy.mock.calls[0][0] as ContactInput`
- Assert: `arg.marketing_consent === true`

**Test 18:** `"calls onSubmit with state in uppercase regardless of input case"`
- Render with valid `initial`
- `await userEvent.type(screen.getByLabelText(/state/i), "nc")`
- Trigger submit
- `const arg = spy.mock.calls[0][0] as ContactInput`
- Assert: `arg.state === "NC"`

**Test 19:** `"calls onSubmit with handicap as null when the handicap field is blank"`
- Render with `initial={buildInitial({ types: ["player"] })}`
- Player section is visible; leave handicap blank
- Trigger submit
- `const arg = spy.mock.calls[0][0] as ContactInput`
- Assert: `arg.handicap === null`

**Test 20:** `"calls onSubmit with handicap as integer when a valid handicap is entered"`
- Render with `initial={buildInitial({ types: ["player"] })}`
- `await userEvent.type(screen.getByLabelText(/handicap/i), "18")`
- Trigger submit
- `const arg = spy.mock.calls[0][0] as ContactInput`
- Assert: `arg.handicap === 18`

---

### 4.6 AC: Phone E.164 normalization on blur (display format)

**Describe block:** `ContactForm — phone normalization on blur`

The blur behavior normalizes the displayed value to national format via `formatPhoneForDisplay(normalizePhone(phone))`. The E.164 string itself is not in the field — it's the national display format.

**Test 21:** `"reformats a bare 10-digit US phone to national display format on blur"`
- Render form
- `await userEvent.type(screen.getByLabelText(/phone/i), "9195550100")`
- `fireEvent.blur(screen.getByLabelText(/phone/i))`
- `expect(screen.getByLabelText(/phone/i)).toHaveValue("(919) 555-0100")`

**Test 22:** `"leaves the phone field unchanged on blur when the phone is already in valid display format"`
- `await userEvent.type(...)` with `"(919) 555-0100"`
- Blur
- `expect(screen.getByLabelText(/phone/i)).toHaveValue("(919) 555-0100")`

**Test 23:** `"does not reformat an invalid phone string on blur (leaves value as-is and shows error)"`
- Type `"notaphone"`, blur
- `expect(screen.getByLabelText(/phone/i)).toHaveValue("notaphone")` (normalizePhone returns null → setPhone not called)
- `expect(screen.getByText("Invalid phone number")).toBeInTheDocument()`

---

### 4.7 AC: Reset via Cancel

**Important note:** The Cancel button is in `ContactModal`, not `ContactForm`. `ContactForm` has no internal Cancel handler or reset logic. The reset-on-cancel behavior is: `onOpenChange(false)` closes the dialog, and on the next open with a fresh `contact` prop, `ContactForm` receives a new `initial` prop and re-mounts (keyed by the dialog's open/close cycle).

The AC "Reset via Cancel" is therefore a modal-level integration test.

**Describe block:** `ContactModal — Cancel resets unsaved form state`

**Test 24:** `"when Cancel is clicked, the modal closes (onOpenChange called with false)"`
- Render `<ContactModal open={true} mode="create" contact={null} onOpenChange={spy} onSuccess={vi.fn()} />`
- Type into a field to create unsaved state
- `fireEvent.click(screen.getByRole("button", { name: /cancel/i }))`
- `expect(spy).toHaveBeenCalledWith(false)`

**Test 25:** `"when the modal is reopened after Cancel, the form fields are blank (no stale state)"`
- Control `open` state with `useState` wrapper
- Open modal, type `"Jane"` in first name
- Click Cancel → modal closes
- Reopen modal
- `expect(screen.getByLabelText(/first name/i)).toHaveValue("")`

Note: Test 25 requires a controlling wrapper component. The form is keyed by the dialog's open/close state; stale state would surface as a regression here.

---

## 5. Coverage Strategy

The form has 626 lines. The 25 tests above cover:

| Branch / Statement cluster | Tests hitting it |
|---|---|
| `validateEmail` — falsy/truthy/clear | T1, T2, T13, T16 |
| `validatePhone` — falsy/truthy/clear | T3, T4, T14, T21–T23 |
| `handlePhoneBlur` (normalize + validate path) | T21, T22, T23 |
| `validateZip` — falsy/truthy/clear | T5, T6, T15 |
| `validateIdentity` — all-blank, partial fills | T7–T11 |
| `validateHandicap` — blank/valid/invalid | T19, T20, plus T15 via submit |
| `handleSubmit` — full valid path + early returns | T12–T20 |
| `ContactInput` shape building (nullify, state.toUpperCase, handicapValue) | T16–T20 |
| `onValidityChange` / `useEffect` on errors/types | T7–T11, T12 (no-types gate) |
| `toggleType` | T12 (types=[] renders no type checked), T17 |
| Marketing consent switch | T17 |
| Cancel → `onOpenChange(false)` | T24, T25 |

Estimated coverage delta: the existing 5% comes from `contact-form-polish.test.tsx` (197 lines, narrow surface). The 25 new tests exercise the entire validation flow, the submit handler, and the modal Cancel path. Estimated statement coverage post-sprint: **65–72%** on `contact-form.tsx`. Remaining gaps: player-specific section rendering branches (handicap field visibility), donor/volunteer type-specific fields, Select component interactions (year, shirt size). These are optional-field paths and are acceptable misses to stay under 4h scope.

---

## 6. Risk Callout — Potential Production Bugs Surfaced

Per `feedback_test_refresh_can_surface_prod_bugs`: test refresh sprints surface production bugs masked by test rot.

**Risk 1 (Medium): Phone submit value is display-formatted, not E.164.**
`ContactForm` line 234: `phone: nullify(phone)` — `phone` in state is always the national display format `(919) 555-0100`, not E.164. `actions.ts` `createContact` calls `normalizePhone(input.phone)` to get E.164 before insert. This is intentional architecture. However, if `onSubmit` is `updateContact` (edit mode), the server re-normalizes from the display string on every save. This is safe but relies on `libphonenumber-js` being deterministic. **Not a bug, but document explicitly in T16 test comment** so it's visible.

**Risk 2 (Low-Medium): `isValidPhone` is called with the display-formatted value on blur, not the raw digit string.**
`handlePhoneBlur` line 180: `validatePhone(phone)` — `phone` is state at the time of blur, not `e.target.value`. If the user types `9195550100`, the normalization on line 176 calls `normalizePhone` and updates state to `(919) 555-0100` via `setPhone`, then line 180 validates the old (pre-setState) value. React state updates are batched; `phone` at line 180 is still `9195550100` (pre-format). This means `isValidPhone("9195550100")` is called, which returns true — correct. But the sequence is subtle and test T21 must verify the display value after the full blur cycle. **Flag for Spec to confirm via test output, not just pass.**

**Risk 3 (Low): `validateHandicap` is only run at submit when `isPlayer` is true.**
If a user checks Player, enters an invalid handicap, then unchecks Player, the `errors.handicap` error remains in state (no clear on type-toggle). `hasErrors` would be true → `canSubmit` false → submit button stays disabled. The user cannot submit with a stale handicap error. **Flag as potential UX dead-end but do not fix in this PR — file as follow-up issue if confirmed by test output.**

Budget note: per `feedback_test_refresh_can_surface_prod_bugs`, Spec should NOT underbudget if Risk 2 or Risk 3 surface as real failures during the RED→GREEN cycle. Either fix the production code in the same PR (surgical, one-line fix) or open a follow-up P2 issue immediately. Do not leave a suppressed test.

---

## 7. File Changes

**Created:**
- `src/__tests__/contact-form.test.tsx` — 25 tests as specified above

**Not modified:**
- `src/app/admin/contacts/contact-form.tsx` — no changes
- `src/__tests__/contact-form-polish.test.tsx` — not touched
- All other source files — not touched

---

## 8. Effort Estimate

Size: **M** (4–6h for Spec including RED→GREEN cycle and coverage verification)

The 25 tests are fully specified; Spec is not expected to design test logic, only implement from this spec. The unknown is Risk 2/Risk 3 investigation time if they surface failures. Budget 1h buffer.

---

## 9. Execution Checklist for Spec

1. Create worktree from main: `git worktree add ../craven-cancer-classic-s37-spec main` then `git checkout -b s37-contact-form-coverage`
2. Implement `src/__tests__/contact-form.test.tsx` per Section 4 above (all 25 tests, RED first, then make green without changing production code)
3. Run `npx vitest run src/__tests__/contact-form.test.tsx --coverage` — confirm ≥60% statement coverage on `src/app/admin/contacts/contact-form.tsx`
4. Run full test suite `npx vitest run` — confirm zero regressions in existing tests
5. If Risk 2 or Risk 3 confirms a production bug: fix in same PR (surgical) or open follow-up issue before push
6. `unset GH_TOKEN` before `git push -u origin s37-contact-form-coverage`
7. `gh pr create` with title `test(#137): contact-form behavior coverage (5% → 60%+)` referencing Issue #137, body including `Closes #137`
8. Do NOT stop at push — open the PR yourself
