# Issue #359 — Wire Indeterminate State to Contacts Select-All Header

_Follows sprint α (PR #360) which shipped the `indeterminate` API on `<Checkbox>`. That primitive is now live; this sprint wires the existing consumer signal to it._

---

## Plain-English Readout

**Who is impacted:** Admins selecting a subset of visible contacts — e.g. filtering to "player" type and checking 3 of 10 rows.

**What changes from their perspective:** The select-all header checkbox now shows a white dash on teal background when some (but not all) visible contacts are selected. Previously it showed an empty unchecked box in that state, which gave no visual feedback that a partial selection was active.

**What doesn't change:** All selection logic, bulk-action flows, and label copy are unchanged. Only the `indeterminate` prop passed to the header checkbox changes.

---

## Aria Upfront-Gate

**No new strings.** This sprint adds no labels, CTAs, errors, empty/loading states, microcopy, or visible date/number/units formats. Aria countersign not required.

---

## Design Decision — Click-on-Indeterminate UX

When the header is in the indeterminate state and the user clicks it:

**Decision: transitions to fully checked (select all visible).**

Rationale: this matches macOS Finder, Gmail, and the affordance the user sees — the dash communicates "there is more to select." The user's intent when clicking a partial-selection header is almost always "add the rest." The existing `handleHeaderCheckbox()` at `contact-list.tsx:284` already implements exactly this: when `allVisibleSelected` is false (which covers both "none selected" and "some selected"), it selects all visible. No handler change is needed. The `<Checkbox>` primitive itself also enforces this convention: its `handleClick` at `checkbox.tsx:45` computes `next = indeterminate ? true : !checked`, so internal clicks from an indeterminate state always emit `true` to `onCheckedChange`. Both layers agree.

---

## Pre-Flight Greps

<!-- HARD-GATE: Builder must run ALL four greps BEFORE opening the PR and paste verbatim output in the PR body. -->

**Grep 1 — `someVisibleSelected` references in `contact-list.tsx` (expected: 1)**
```
grep -n "someVisibleSelected" src/app/admin/contacts/contact-list.tsx
```
Expected: exactly 1 line — the `const someVisibleSelected = ...` declaration at line 281. If a second reference exists, the prop was already wired somewhere and this task is a no-op or a conflict — surface to Forge before proceeding.

**Grep 2 — `indeterminate` references in `contact-list.tsx` (expected: 0 before patch, 1 after)**
```
grep -n "indeterminate" src/app/admin/contacts/contact-list.tsx
```
Expected pre-patch: 0 lines. Expected post-patch: exactly 1 line (the new `indeterminate={...}` prop on the header `<Checkbox>`). If pre-patch count is not 0, stop and surface to Forge.

**Grep 3 — `aria-checked="mixed"` in `src/app/admin/` (expected: 0)**
```
grep -rn 'aria-checked="mixed"' src/app/admin/
```
Expected: 0 lines. The `"mixed"` value is emitted by the `<Checkbox>` primitive at runtime based on the `indeterminate` prop — it must not appear hardcoded in any consumer. If this returns hits, stop and surface.

**Grep 4 — only expected files changed**
```
git diff --name-only HEAD
```
Expected output contains exactly:
- `src/app/admin/contacts/contact-list.tsx`
- `src/__tests__/contact-list.test.tsx`

No other files. The primitive (`src/components/ui/checkbox.tsx`) must NOT appear — this sprint is consumer-only.

<!-- END HARD-GATE -->

---

## Proposed Diff

### `src/app/admin/contacts/contact-list.tsx` — lines 817-821

**Before:**
```tsx
<Checkbox
  aria-label="Select all visible contacts"
  checked={allVisibleSelected}
  onCheckedChange={() => handleHeaderCheckbox()}
/>
```

**After:**
```tsx
<Checkbox
  aria-label="Select all visible contacts"
  checked={allVisibleSelected}
  indeterminate={!allVisibleSelected && someVisibleSelected}
  onCheckedChange={() => handleHeaderCheckbox()}
/>
```

That is the complete change to `contact-list.tsx`. `someVisibleSelected` is already in scope at line 281; no new state, no new import, no handler change.

---

## Acceptance Criteria

Each criterion is written as a test name, co-located in `src/__tests__/contact-list.test.tsx`.

**Group: header checkbox indeterminate state**

- `header checkbox has indeterminate=true when some but not all visible contacts are selected`
  - Render `<ContactList>` with 2 contacts. Simulate selecting exactly 1 row. Query the header checkbox (`aria-label="Select all visible contacts"`). Assert `aria-checked === "mixed"`.

- `header checkbox has indeterminate=false when all visible contacts are selected`
  - Render `<ContactList>` with 2 contacts. Simulate selecting both rows. Assert header checkbox `aria-checked === "true"` (fully checked, not mixed).

- `header checkbox has indeterminate=false when no contacts are selected`
  - Render `<ContactList>` with 2 contacts, select none. Assert header checkbox `aria-checked === "false"`.

- `clicking header checkbox when indeterminate selects all visible contacts`
  - Render `<ContactList>` with 3 contacts. Select 1 row (indeterminate). Click the header checkbox. Assert all 3 rows' checkboxes are now `aria-checked="true"`.

---

## No E2E Changes

`tests/e2e/` contains no references to `"indeterminate"` or `"mixed"` (pre-flight grep 3 above confirms no `aria-checked="mixed"` in the admin directory, and the e2e suite does not test for this attribute). `tests/e2e/contact-bulk-blocked-alert.spec.ts` exercises bulk-action flows but does not query the header checkbox aria state — it is unaffected by this change.

---

## Files to Create / Modify

| File | Action | Notes |
|---|---|---|
| `src/app/admin/contacts/contact-list.tsx` | **Modify** | Add `indeterminate={!allVisibleSelected && someVisibleSelected}` to header `<Checkbox>` at line 817-821. One line added, no other changes. |
| `src/__tests__/contact-list.test.tsx` | **Extend** | Add a new `describe("header checkbox indeterminate state")` block with the 4 test cases above. Existing tests must remain untouched and still pass. |

**Files explicitly NOT in scope:**
- `src/components/ui/checkbox.tsx` — primitive is already correct; read-only
- `src/components/ui/checkbox.test.tsx` — primitive tests; read-only
- Any e2e file — no e2e changes required

---

## Dependencies

**Blocked by:** PR #360 (sprint α — checkbox primitive) — merged at `e6e355d`. Unblocked.

**Blocks:** Nothing downstream.

**Parallelism:** Single issue, single builder.

---

## Effort Estimate

**S** — 2 files, 1-line production change + 4 new test cases. Builder time: ~1.5h.
