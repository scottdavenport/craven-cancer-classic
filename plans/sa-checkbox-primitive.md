# Sprint α — Fix Checkbox Primitive (F17 + F18 + W2.12)

_Closes UAT findings F17 · F18 · W2.12 from `plans/admin-uat-2026-05.md` (PR #357)_

---

## Plain-English Readout

**Who is impacted:** Admin users working in the Contacts, Teams, Sponsors, and Sponsorships pages.

**What changes from their perspective:** Checkboxes will look like checkboxes. A checked box will show a filled teal background with a white check icon. An indeterminate box (header "Select all" when only some rows are selected) will show a teal background with a white dash icon. An unchecked box shows white background with a grey border. Users can navigate checkboxes by keyboard and see a visible teal focus ring.

**What doesn't change:** No label copy, layout, or consumer behavior changes. The four surfaces (TYPES section in the contact form, per-row selection, header select-all, and the Captains-only filter) continue to work identically — they just become visually meaningful.

**Root cause:** The current `src/components/ui/checkbox.tsx` is a 64-line custom primitive that renders `<button role="checkbox">` with no conditional class for checked/unchecked state. The `aria-checked` attribute is correct but there is zero visual differentiation — every checkbox looks identical regardless of state.

---

## Aria Upfront-Gate

**No new strings.** This sprint adds no labels, CTAs, errors, empty/loading states, microcopy, or visible date/number/units formats. Existing labels ("Select all visible contacts", "Captains only", type labels, per-row sr-only names) are unchanged. Aria countersign not required for this sprint.

---

## Design Decisions (Locked)

### 1. Checked-state visual treatment
- **Checked:** filled background `bg-brand` (`#5797a6`), `text-white` check icon (Lucide `<Check size={10} strokeWidth={3} />`), border retained (`border-brand`).
- **Unchecked:** `bg-background`, `border-border` (grey `#DAE3E8`), no icon.
- **Rationale:** `--color-brand` is the exact teal used across buttons, sidebar ring, and charts. Using `primary` would be ambiguous across dark/light tokens (light `primary` = `#5797a6`, dark `primary` = `#8BB5C9`). `brand` is a fixed-intent token and stays teal in both modes. No other form primitive (Switch, Radio) exists in the codebase to pattern-match; the Switch from shadcn is not present.

### 2. Indeterminate state — REQUIRED
- `someVisibleSelected` is already computed at `contact-list.tsx:281` but is NOT passed to the header checkbox today. The header only receives `checked={allVisibleSelected}`.
- Indeterminate (partial selection) is a real user state — selecting 3 of 10 rows currently shows an unchecked header, which is misleading.
- **Decision:** Add `indeterminate?: boolean` to `CheckboxProps`. When `indeterminate={true}`, render `<Minus size={10} strokeWidth={3} />` on `bg-brand`. The header in `contact-list.tsx:817-821` is NOT modified in this sprint — adding `indeterminate` wiring to the consumer is a separate ticket. The primitive must support it so it can be wired in the follow-on.
- **`aria-checked` mapping:** `false` → unchecked, `true` → checked, `"mixed"` → indeterminate.

### 3. Focus-visible ring
- Current: `focus-visible:ring-2 focus-visible:ring-ring` where `--ring` is `#6B5DB8` (the accent-scale token, purple).
- **This is a deliberate divergence from the existing form-primitive convention.** Every other form primitive in the codebase — Input, Select, Textarea, Switch, Button, Badge — uses `ring-ring/50`. This PR does NOT fix those; it diverges for checkbox specifically because the selection cascade across 5 surfaces makes the purple ring most visually wrong here (a focused, checked row has a teal fill but a purple ring, which reads as broken).
- **Decision:** Replace `ring-ring` with `focus-visible:ring-brand` and set `focus-visible:ring-offset-2` (was `ring-offset-1`). The brand-teal token (`--color-brand: #5797a6`) matches `--sidebar-ring` used in brand-teal focus contexts elsewhere. The other primitives share the same `--ring` misalignment; that is a separate audit and migration if Scott decides the accent-scale ring should not be used on any form element.

### 4. Indicator icon source
- `lucide-react` is already installed (confirmed via usage in the codebase). Use `<Check>` (checked) and `<Minus>` (indeterminate) from `lucide-react`. Both at `size={10} strokeWidth={3}` to stay crisp at 16×16px.

### 5. Tap-target size
- Current rendered size: `h-4 w-4` = 16×16px. WCAG 2.5.8 recommends 24×24 minimum; iOS HIG recommends 44×44.
- The checkbox cells in `contact-list.tsx` are wrapped in `<td className="px-4 py-3 w-10">` — the cell padding provides hit-area at row level, making `<44px` acceptable in that context.
- The TYPES section in `contact-form.tsx` uses `<div className="flex items-center gap-2">` with a `<Label>` next to it — the label is the primary tap target.
- **Decision:** Keep `h-4 w-4` to avoid reflow. Add `touch-target` padding via `p-0.5 -m-0.5` on the button wrapper to expand hit-area by 4px all sides without changing layout box. Net tap target: 24×24px. If 44px is needed in a future audit, that is a separate ticket.

---

## Acceptance Criteria

Each criterion is written as a test name (co-located at `src/components/ui/checkbox.test.tsx`).

### Rendering
- `renders a checkable control with role="checkbox"`
- `renders with data-slot="checkbox"`
- `passes through className prop to the root element`
- `associates with an external label via id/htmlFor`

### Unchecked visual state
- `unchecked checkbox has bg-background class`
- `unchecked checkbox has border-border class`
- `unchecked checkbox does NOT render a Check icon`

### Checked visual state
- `checked checkbox has bg-brand class`
- `checked checkbox has border-brand class`
- `checked checkbox renders a Check icon (lucide data-lucide="check")`
- `checked checkbox icon has text-white class`

### Indeterminate visual state
- `indeterminate checkbox has bg-brand class`
- `indeterminate checkbox renders a Minus icon (lucide data-lucide="minus")`
- `indeterminate checkbox has aria-checked="mixed"`
- `indeterminate checkbox does NOT render a Check icon`

### aria-checked
- `unchecked checkbox has aria-checked="false"`
- `checked checkbox has aria-checked="true"`
- `indeterminate checkbox has aria-checked="mixed"`

### Focus ring
- `checkbox root has focus-visible:ring-2 class`
- `checkbox root has focus-visible:ring-brand class`
- `checkbox root has focus-visible:ring-offset-2 class`

### Callback + controlled
- `onCheckedChange(true) fires when unchecked checkbox is clicked`
- `onCheckedChange(false) fires when checked checkbox is clicked`
- `onCheckedChange does NOT fire when indeterminate checkbox is disabled and clicked`
- `controlled checkbox reflects checked=true`
- `controlled checkbox reflects checked=false`

### Disabled
- `disabled checkbox has aria-disabled="true"`
- `disabled checkbox has opacity-50 class`
- `disabled checkbox has cursor-not-allowed class`
- `onCheckedChange does NOT fire when disabled checkbox is clicked`

### Uncontrolled
- `renders unchecked by default when no defaultChecked prop`
- `renders checked when defaultChecked=true`
- `toggles to checked on click (uncontrolled)`

---

## HARD-GATEs

<!-- HARD-GATE: Bolt must run the following grep BEFORE opening the PR and paste the verbatim output in the PR body. -->

**Pre-flight grep 1 — import count (expected: 4)**
```
grep -rn "from '@/components/ui/checkbox'\|from \"@/components/ui/checkbox\"" src/ | wc -l
```
Expected output: `4` (contact-list.tsx, contact-form.tsx, registration-form.tsx, src/__tests__/checkbox-233.test.tsx). If the count is higher, a new consumer was added and must be verified for visual correctness.

**Pre-flight grep 2 — raw input[type=checkbox] count**
```
grep -rn 'type="checkbox"\|type='"'"'checkbox'"'"'' src/ | grep -v "node_modules\|.test.\|checkbox-233"
```
Expected output: **1 line** — `src/app/admin/contacts/import/import-client.tsx:269`.

Disposition: this surface is **out of scope for Sprint α and already correctly styled**. The checkbox at line 269 is a raw `<input type="checkbox">` inside the CSV import modal (a per-row "select this row to import" control). It already carries `className="... text-brand focus:ring-brand ..."` — the correct brand-teal tokens. Bolt must NOT modify this file. If the count is `0` or `>1`, a surface was added or removed unexpectedly and must be investigated before the PR opens.

**Pre-flight grep 3 — existing test file untouched**
```
git diff --name-only HEAD | grep "checkbox-233"
```
Expected output: empty (Bolt must NOT modify `src/__tests__/checkbox-233.test.tsx`).

**Pre-flight grep 4 — only 2 files changed**
```
git diff --name-only HEAD
```
Expected output contains exactly:
- `src/components/ui/checkbox.tsx`
- `src/components/ui/checkbox.test.tsx`

No other files. If any consumer file appears, the PR is out of scope.

<!-- END HARD-GATE -->

---

## Files to Create / Modify

| File | Action | Notes |
|---|---|---|
| `src/components/ui/checkbox.tsx` | **Rewrite** | Full replacement per spec below |
| `src/components/ui/checkbox.test.tsx` | **Create** | Co-located test; replaces the role of `src/__tests__/checkbox-233.test.tsx` for new visual assertions |

**Files explicitly NOT in scope:**
- `src/app/admin/contacts/contact-list.tsx` — consumer, read-only
- `src/app/admin/contacts/contact-form.tsx` — consumer, read-only
- `src/app/(public)/register/registration-form.tsx` — consumer, read-only
- `src/__tests__/checkbox-233.test.tsx` — existing test, must stay untouched and still pass

---

## Implementation Spec

### `src/components/ui/checkbox.tsx` — complete rewrite

Replace the current 64-line file with the following contract. Bolt implements the actual JSX; this spec locks the interface and class logic.

**Imports required:**
- `React` from `"react"`
- `cn` from `"@/lib/utils"`
- `Check`, `Minus` from `"lucide-react"`

**Props interface additions (extend existing `CheckboxProps`):**
```typescript
indeterminate?: boolean;
// aria-checked will now accept boolean | "mixed"
```

**`aria-checked` logic:**
```typescript
const ariaChecked: boolean | "mixed" = indeterminate ? "mixed" : checked;
```

**Root element class logic (all states use the same `h-4 w-4 rounded border` base):**
```
base:         "relative inline-flex items-center justify-center h-4 w-4 shrink-0
               rounded border cursor-pointer p-0.5 -m-0.5
               transition-colors duration-100
               focus-visible:outline-none focus-visible:ring-2
               focus-visible:ring-brand focus-visible:ring-offset-2"

unchecked:    "bg-background border-border"
checked:      "bg-brand border-brand"
indeterminate:"bg-brand border-brand"
disabled:     "cursor-not-allowed opacity-50"
```

**Icon rendering logic:**
```
if (indeterminate) → render <Minus size={10} strokeWidth={3} className="text-white pointer-events-none" />
else if (checked)  → render <Check  size={10} strokeWidth={3} className="text-white pointer-events-none" />
else               → render nothing
```

**`handleClick` guard:**
```typescript
// indeterminate click: treat as "select all" (checked=true next)
// This matches common select-all UX: indeterminate → checked → unchecked
const next = indeterminate ? true : !checked;
```

**Dark mode:** `bg-background` and `border-border` use CSS custom props that already adapt. `bg-brand` is `--color-brand` which is `#5797a6` in both modes (not a theme-switching token). No dark-mode conditional needed.

---

## Test File Spec

### `src/components/ui/checkbox.test.tsx` — new file

Test runner: Vitest. Import from `@testing-library/react`. Follow the pattern established in `src/__tests__/checkbox-233.test.tsx` (render + screen + fireEvent + cleanup afterEach).

**All test names map 1:1 to the acceptance criteria above.** Group into `describe` blocks by state: rendering / unchecked / checked / indeterminate / aria-checked / focus-ring / callbacks / disabled / uncontrolled.

**Key assertion pattern for visual classes (not computed styles — class presence only):**
```typescript
const el = container.querySelector("[data-slot='checkbox']");
expect(el!.className).toContain("bg-brand");
```

**Icon presence assertion pattern:**
```typescript
const icon = container.querySelector("[data-lucide='check']");
expect(icon).not.toBeNull();
```

**Note:** The existing `src/__tests__/checkbox-233.test.tsx` tests focus-ring via `focus-visible:ring-ring`. After this rewrite the class changes to `focus-visible:ring-brand`. Bolt must verify that `checkbox-233.test.tsx` tests for `focus-visible:ring-2` (line 180) and `focus-visible:ring-ring` (line 186) still pass. The `ring-ring` test references a class that will be REMOVED. If it fails, Bolt must NOT modify the test — instead surface the conflict to Forge as a blocker. Forge will assess whether to retire `checkbox-233.test.tsx` separately. Do not silently comment out, skip, or delete that file.

---

## Dependencies

**Blocks:** #359 — "Wire indeterminate state to contacts select-all header (Sprint α follow-on)". That issue tracks wiring `indeterminate={!allVisibleSelected && someVisibleSelected}` on the header checkbox in `contact-list.tsx:817-821` where `someVisibleSelected` is already computed at line 281.

**Blocked by:** None. This is the root fix.

**Parallelism:** This sprint is a single issue touching two files. No parallelism needed.

---

## Effort Estimate

**S** — 2 files (1 rewrite + 1 new test). Builder time: ~2h including test authoring.

---

## Design Preview

See `plans/design/sprint-a-checkbox-states.html` — inline-styled HTML showing all 5 states side-by-side: unchecked / checked / indeterminate / focus-visible / disabled.
