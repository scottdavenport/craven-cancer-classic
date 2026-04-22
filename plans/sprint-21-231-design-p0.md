# Sprint 21 · Issue #231 — Design P0 Bundle

**Status:** RED tests pending → Bolt GREEN → Watchdog → merge.
**Issue:** https://github.com/scottdavenport/craven-cancer-classic/issues/231

## Scope (one PR, 4 concerns)

### A. Phantom Tailwind classes (3 fixes)
- `src/app/(public)/gallery/gallery-grid.tsx:115` — `text-h3` → `text-lg` (or `text-[1.125rem]`)
- `src/app/(public)/error.tsx:22` — `text-h2` → `text-2xl sm:text-[1.75rem]`
- `src/app/error.tsx:22` — `text-h2` → `text-2xl sm:text-[1.75rem]`

### B. Raw Tailwind red → `destructive` token (3 fixes)
Pattern match: replace `rounded-md bg-red-50 p-3 text-sm text-red-700` with `rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20`
- `src/app/(public)/register/registration-form.tsx:125`
- `src/app/(public)/register/seeking-team-form.tsx:117`
- `src/components/public/prospect-capture-form.tsx:130`

### C. Session picker a11y — `src/app/(public)/register/registration-form.tsx:137-170`
Current: custom Morning/Afternoon `<button>` tiles with no keyboard semantics.
Required:
- Add `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none` to each tile
- Add `aria-pressed={session === "morning"}` (and analogous for afternoon)
- Wrap the two-tile container in `role="radiogroup"` with `aria-label="Preferred session"` (or similar)
- Set `role="radio"` on each button

### D. CardTitle polymorphism — `src/components/ui/card.tsx:36-47`
**API decision (locked by Forge):**
- Keep current default behavior — `CardTitle` renders as `div` by default (no breaking change).
- Add opt-in prop: `as?: "h2" | "h3" | "h4"`. When set, render as that element instead of div.
- Pattern: shadcn/Radix polymorphic primitive, no external `as` polymorphic library (keep it simple — if/else or conditional createElement).

**Usage in this PR:**
- `src/app/(public)/register/registration-form.tsx` — every `CardTitle` inside the form gets `as="h3"` (Select Session, Team Information, Player 2/3/4, plus the "Seeking a Team?" card on the page).

Broader app-wide adoption is out of scope — that's #233.

## Out of scope
- Primitives extraction (SectionEyebrow, InfoCallout, PublicEmptyState) — that's #233.
- Rhythm/consistency sweep — that's #235.
- Any other issue's scope.
