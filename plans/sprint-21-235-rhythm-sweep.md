# Sprint 21 · Issue #235 — Public-site rhythm sweep

**Type:** Design chore (pure CSS class normalization — zero behavior change, zero copy change)
**Branch:** `sprint-21/235-rhythm-sweep`
**Pipeline:** Spec RED → Bolt GREEN → Watchdog → Forge merge

---

## Scope — 8 mechanical normalizations

### Item 1 — Hero padding (home)
**Problem:** `src/app/(public)/page.tsx` uses `py-14 sm:py-20` on all four sections (hero + three content sections). Other pages use `py-20 sm:py-28` on heroes and `py-16 sm:py-24` on content. Home reads visually shorter.
**Fix:** Normalize home hero to `py-20 sm:py-28`. Normalize home content sections to `py-16 sm:py-24`.
**Files:** `src/app/(public)/page.tsx` — four section elements.
**Grepped current state (confirmed):** line 44, 156, 179, 233 all have `py-14 sm:py-20`.

### Item 2 — H2 responsive scale bug (home)
**Problem:** `text-3xl sm:text-[1.75rem]` shrinks on larger viewports (1.875rem → 1.75rem).
**Fix:** Normalize to `text-[1.75rem]` (single value, no responsive shrink).
**Files:** `src/app/(public)/page.tsx` — lines 182, 236.

### Item 3 — Eyebrow tracking (hygiene guard)
**Status: ALREADY RESOLVED by #233.** `grep -rn "tracking-\[0\.3em\]" src/app/(public)/` returns empty. Test encodes this as a hygiene invariant going forward.

### Item 4 — Section accent rule drift (about page)
**Problem:** `about/page.tsx` uses `h-px w-12 bg-primary/40` (1px muted, 4 instances). All other pages use `h-0.5 w-12 bg-primary` (2px saturated).
**Fix:** Replace all four `h-px w-12 bg-primary/40` with `h-0.5 w-12 bg-primary` in `about/page.tsx`.
**Files:** `src/app/(public)/about/page.tsx` — lines 36, 46, 73, 115.
**Leaderboard:** Already `h-0.5 w-12 bg-primary` (line 131) — no change needed.
**Donate:** Already `h-0.5 w-12 bg-primary` — no change needed.
**Sponsorships:** Uses `SectionEyebrow` component — no inline accent divs — no change needed.

### Item 5 — Eyebrow color consistency
**Out of scope.** #233's `SectionEyebrow` component handles this via tone prop.

### Item 6 — Dead-flex cleanup (about + donate)
**Problem:** `flex gap-4` on containers whose sole child is a single `<div>`. Dead utility — flex and gap have no effect with one child.
- `about/page.tsx` line 96: `flex gap-4 border-l-2 border-primary/30 pl-5`
- `donate/page.tsx` line 90: `flex gap-4 border-l-[3px] border-primary/40 pl-5`
**Fix:** Remove `flex gap-4` from both. Retain border and padding classes.

### Item 7 — Session tile border weight (registration-form)
**Problem:** `registration-form.tsx` lines 144, 163 use `border-2` (2px). Inputs use 1px; buttons use `border-[1.5px]`. Spec says normalize to 1px with background-fill for selected state.
**Fix:** Replace `border-2` with `border` on both session tiles. Selected state: `border-primary bg-primary/5` (background fill provides visual emphasis). Unselected: `border-border hover:border-primary/30`.

### Item 8 — Double-hover animation (sponsorship cards)
**Problem:** `Card` component base class includes `hover:-translate-y-0.5`. `sponsorship-grid.tsx` line 35 also adds `hover:-translate-y-0.5` to the `className` prop passed to `Card`. This causes the class to appear twice.
**Fix:** Remove `hover:shadow-md hover:-translate-y-0.5` from `sponsorship-grid.tsx` line 35. The `Card` component already handles the hover. Retain the conditional `selectedId === item.id ? "ring-2 ring-primary" : ""` logic.

---

## Files Changed by Bolt

| File | Changes |
|---|---|
| `src/app/(public)/page.tsx` | Items 1 + 2: padding normalization + H2 scale fix |
| `src/app/(public)/about/page.tsx` | Items 4 + 6: accent rule + dead-flex |
| `src/app/(public)/donate/page.tsx` | Item 6: dead-flex |
| `src/app/(public)/register/registration-form.tsx` | Item 7: border-2 → border |
| `src/app/(public)/sponsorships/sponsorship-grid.tsx` | Item 8: remove duplicate hover |

---

## Test File

`src/app/(public)/__tests__/rhythm-sweep-235.test.tsx`

### Coverage
- Grep/source hygiene: items 2, 3, 4, 6 (class strings absent from source)
- Rendered assertions: items 1, 7, 8

---

## Acceptance Criteria
- All RED tests fail against current main
- All RED tests pass after Bolt's GREEN PR
- No behavior change, no copy change, no new components
- `npx tsc --noEmit` passes before and after

---

## Visual Risk
- **Item 1 (home hero padding)** is a real visible shift — hero gets taller on home page. Flag for Vercel preview spot-check before merge.

---

## Items Already Resolved by Prior PRs
- **Item 3 (eyebrow tracking):** Fully resolved by #233. Test encoded as hygiene guard only.
- **Leaderboard accent (partial item 4):** Already `h-0.5 w-12 bg-primary` — no change needed.
