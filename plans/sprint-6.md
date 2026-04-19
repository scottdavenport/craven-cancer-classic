# Sprint 6 — Visual Foundation + Homepage Overhaul

**Sprint goal:** Replace Geist/Playfair with Fraunces + Inter, extend the global design token set, polish Button/Card/Input/Label components, and apply the full homepage visual refresh — validating the new design direction before Sprint 7 ripples it to other public pages.

**Target dates:** ~1 week

**Baseline:** 197 tests passing, tsc clean, main at post-spec-commit. No DB changes in this sprint — do not regenerate types.

**Locked decisions:**
- Fonts: Fraunces (display) + Inter (body). Geist Mono stays for leaderboard/admin tables.
- Purple: reserved for Donate + Become a Sponsor CTAs only. No new purple surfaces.
- Photography: curated Unsplash hero photo stays; real photos post-tournament.
- Phased rollout: Sprint 6 = foundation + homepage only. Other public pages defer to Sprint 7.

---

## Research findings (verified before writing this plan)

### Font state — what actually exists

**`src/app/layout.tsx`** (lines 2–3, 6–20, 45):
- Imports: `Geist`, `Geist_Mono` from `next/font/google` (line 2); `Playfair_Display` from `next/font/google` (line 3)
- `geistSans` → CSS variable `--font-geist-sans` (lines 6–9)
- `geistMono` → CSS variable `--font-geist-mono` (lines 11–14)
- `playfair` → CSS variable `--font-playfair` (lines 16–20)
- `<html>` applies all three variables: `${geistSans.variable} ${geistMono.variable} ${playfair.variable}` (line 45)
- **Lora is not installed.** Spec correctly assumed Playfair was installed — it is.

**`src/app/globals.css`** `@theme inline` (lines 10–13):
- `--font-sans: var(--font-sans)` — self-referential; this resolves to nothing until a CSS variable named `--font-sans` is set on `<html>`. After the font swap, Bolt must add `--font-sans: var(--font-inter)` to `<html>` className injection or define it in `:root`.
- `--font-mono: var(--font-geist-mono)` — correct, keep.
- `--font-heading: var(--font-playfair)` — must change to `var(--font-display)` (Fraunces).
- `--font-display: var(--font-playfair)` — must change to `var(--font-display)` (Fraunces variable output).

**Critical gap found:** The `@theme inline` block has `--font-sans: var(--font-sans)` (line 10) — this is a circular no-op. Currently body text resolves to system sans because `--font-geist-sans` is injected on `<html>` and Tailwind's `font-sans` fallback chain picks it up implicitly. After the swap, Bolt must wire `--font-sans: var(--font-inter)` in the `@theme inline` block (where `--font-inter` is the CSS variable name assigned to the Inter font instance in `layout.tsx`). If not corrected, body text will fall back to system sans despite Inter being loaded.

**No Lora references anywhere in `src/`.** No cleanup needed for Lora.

### Current token state — what's missing

**`src/app/globals.css` `:root`** (lines 60–125):
- `--radius: 0.5rem` (line 114) — must change to `0.375rem`
- Missing: `--neutral-50`, `--neutral-100`, `--neutral-400`
- Missing: `--success`, `--success-muted`, `--warning`, `--warning-muted`
- Missing: `--surface-raised`
- Missing: `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- Missing: `--ease-spring`, `--ease-out`
- `--neutral-200` (`#DAE3E8`) already exists as `--border` (line 97) — no new token needed, spec confirms keep.
- `--neutral-600` (`#5F7A87`) already exists as `--muted-foreground` (line 91) — keep.
- `--neutral-900` (`#1A2E3A`) already exists as `--foreground` (line 75) — keep.
- `--destructive: #C53030` already exists (line 98) — keep.

**`@theme inline` block** (lines 7–58):
- Has `--radius-sm` through `--radius-4xl` already (lines 51–58) — keep.
- Missing `@theme inline` entries for: `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--neutral-50`, `--neutral-100`, `--neutral-400`, `--success`, `--success-muted`, `--warning`, `--warning-muted`.

### Component current state

**`src/components/ui/button.tsx`** (lines 6–41):
- Base CVA: uses `transition-all` (line 7) — must change to `transition-[background-color,box-shadow,transform]`
- `size: lg` is currently `h-9 gap-1.5 px-2.5` (line 27) — must become `h-11 px-6 text-[0.9375rem]`
- No shadow tokens applied anywhere — add `shadow-xs` at rest to `default` and `secondary` variants
- No `translate-y-[-1px]` hover lift — add to `default` variant hover
- Uses `@base-ui/react/button` not shadcn — the CVA class string is additive; changes are safe

**`src/components/ui/card.tsx`** (lines 5–21):
- Base class: `ring-1 ring-foreground/10` (line 15) — replace with `shadow-sm border border-border/60`
- No hover lift or transition — add `hover:shadow-md hover:-translate-y-0.5 transition-[box-shadow,transform] duration-200` (applies when card is interactive, Bolt should scope to `group-hover` or direct hover)
- `CardTitle` (line 42): `font-heading text-base` — change to `font-display text-[1.25rem]` (Fraunces at text-h3)
- `CardFooter` (line 87): `bg-muted/50` — change to `bg-neutral-50`

**`src/components/ui/input.tsx`** (line 12):
- `placeholder:text-muted-foreground` — change to `placeholder:text-neutral-400`
- Add `focus-visible:shadow-xs` (alongside existing `focus-visible:ring-3`)
- Height is `h-8` — spec says keep `h-10`; this is a discrepancy. Spec wins: change `h-8` to `h-10`.

**`src/components/ui/label.tsx`** (line 12):
- `text-sm font-medium` — change to `text-[0.8125rem] font-medium text-foreground/80`

### Homepage current state — `src/app/(public)/page.tsx`

- **Hero logo** (line 43): `opacity-60` — change to `opacity-85`
- **Overline** (line 47): `text-xs font-semibold uppercase tracking-[0.3em] text-[#8BB5C9]` — change tracking to `tracking-[0.25em]` and font class to `font-sans text-[0.6875rem]`
- **h1** (line 51): `text-5xl font-bold sm:text-7xl` — add mobile step: `text-4xl sm:text-5xl lg:text-7xl`
- **Hero subhead** (line 59): `text-white/60` — change to `text-white/70`
- **Hero CTA wrapper** (line 69): `flex-wrap` — already supports multiple lines; spec recommends `flex-col sm:flex-row` for cleaner mobile stacking
- **Stats section** (line 90): `bg-white` — change to `bg-neutral-50`; add teal rule above each stat value; change stat label classes
- **Overlines in Mission + Get Involved sections** (lines 114, 169): `text-xs font-semibold uppercase tracking-[0.3em]` — standardize to `font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em]`
- **Feature grid cells** (line 154): `bg-white p-10 group` — add `group-hover:text-primary` to h3; add growing teal rule above h3
- **Donate CTA section** (line 167): `bg-[#F1F4F6]` — change to `bg-neutral-50`

### Navbar current state — `src/components/public/navbar.tsx`

- Already has `sticky top-0 z-50 bg-white/95 backdrop-blur` (line 22) — spec's sticky + backdrop-blur requirement is already met for desktop.
- Mobile nav (lines 77–97): renders as an inline dropdown below the header, not a sheet. No `border-b border-border/60` on nav itself (spec asks for this). Mobile menu uses `bg-white` — acceptable, no change needed.
- Spec asks for sticky + backdrop-blur on mobile specifically: the `sticky top-0` already applies on all breakpoints. Border-b is missing — add `border-b border-border/60` to the `<header>` element.

### Public layout — `src/app/(public)/layout.tsx`

- Lines 9–16: `<Navbar />` + `<main className="flex-1">` + `<Footer />`. No body padding.
- Sticky bottom CTA bar (S6-3) will be injected here as a new component, and `pb-16 sm:pb-0` added to `<main>` or a wrapping div to prevent content from hiding behind the bar.

### TSC / cascading breakage risk

Removing `geistSans` from `layout.tsx` and its variable from the `<html>` className will not break tsc — it's a string template. The only tsc risk is in `globals.css` `@theme inline`: if `--font-sans: var(--font-sans)` stays self-referential after the swap, no tsc error will fire (CSS, not TS), but body text will render system sans at runtime. Bolt must correct this. No other import-level tsc risk from font removal.

No Playfair import is used outside `layout.tsx` and `globals.css`. Removing it is clean.

---

## Scope

### Group A — Foundation (serial, merges first)

---

#### Issue S6-0: Design token foundation + font swap + component polish

**Specialist:** Bolt
**Effort:** medium
**Labels:** `feature`, `P1-high`, `size:M`

This issue is the unblocking dependency for all homepage work. It must merge to main before S6-1 through S6-4 begin so homepage builders inherit correct token values.

**Files to touch:**
1. `src/app/layout.tsx` — replace Geist Sans + Playfair with Fraunces + Inter; keep Geist Mono; update `<html>` className
2. `src/app/globals.css` — fix `@theme inline` font wiring; add neutral/state/elevation/shadow/easing tokens; change `--radius` to `0.375rem`; add `font-variant-numeric` to `@layer base`
3. `src/components/ui/button.tsx` — size:lg, transition, shadow-xs, hover lift
4. `src/components/ui/card.tsx` — ring → shadow+border, CardTitle font, CardFooter bg, hover lift
5. `src/components/ui/input.tsx` — h-8 → h-10, placeholder color, focus shadow-xs
6. `src/components/ui/label.tsx` — text size + color

**Exact changes:**

`src/app/layout.tsx`:
- Lines 2–3: replace `Geist` + `Playfair_Display` imports with `Fraunces` + `Inter`
- Lines 6–20: replace `geistSans` and `playfair` font instances with `fraunces` (variable `--font-display`, axes `['opsz']`, weights 400–900, styles normal + italic) and `inter` (variable `--font-inter`, weights 400/500/600/700)
- Line 45: update `<html>` className to `${fraunces.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`

`src/app/globals.css`:
- Line 10: change `--font-sans: var(--font-sans)` to `--font-sans: var(--font-inter)`
- Line 12: change `--font-heading: var(--font-playfair)` to `--font-heading: var(--font-display)`
- Line 13: change `--font-display: var(--font-playfair)` to `--font-display: var(--font-display)`
- Add to `@theme inline`: `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--color-neutral-50`, `--color-neutral-100`, `--color-neutral-400`, `--color-success`, `--color-success-muted`, `--color-warning`, `--color-warning-muted`
- Line 114: change `--radius: 0.5rem` to `--radius: 0.375rem`
- Add to `:root`: `--neutral-50: #F7F8F9`, `--neutral-100: #EEF0F2`, `--neutral-400: #8BA0AB`, `--success: #2E7D5E`, `--success-muted: #E8F5EF`, `--warning: #B45309`, `--warning-muted: #FEF3C7`, `--surface-raised: #FFFFFF`, `--shadow-xs: 0 1px 2px rgba(26,46,58,0.06)`, `--shadow-sm: 0 2px 6px rgba(26,46,58,0.08), 0 1px 2px rgba(26,46,58,0.04)`, `--shadow-md: 0 4px 16px rgba(26,46,58,0.10), 0 2px 4px rgba(26,46,58,0.06)`, `--shadow-lg: 0 12px 32px rgba(26,46,58,0.12), 0 4px 8px rgba(26,46,58,0.06)`, `--ease-spring: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-out: cubic-bezier(0.0, 0.0, 0.2, 1)`
- Add dark mode equivalents for `--success`, `--success-muted`, `--warning`, `--warning-muted` to `.dark` block per spec §3
- Add to `@layer base`: `body { font-variant-numeric: oldstyle-nums; }` and `.tabular-nums { font-variant-numeric: tabular-nums lining-nums; }`

`src/components/ui/button.tsx`:
- Line 7: change `transition-all` to `transition-[background-color,box-shadow,transform]`
- Line 11 (`default` variant): add `shadow-xs hover:shadow-sm hover:-translate-y-px`
- Line 27 (`size: lg`): replace `h-9 gap-1.5 px-2.5 ...` with `h-11 px-6 text-[0.9375rem] gap-1.5`

`src/components/ui/card.tsx`:
- Line 15: replace `ring-1 ring-foreground/10` with `shadow-[var(--shadow-sm)] border border-border/60 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-[box-shadow,transform] duration-200`
- Line 42: change `font-heading text-base` to `font-display text-[1.25rem]`
- Line 87: change `bg-muted/50` to `bg-neutral-50`

`src/components/ui/input.tsx`:
- Line 12: change `h-8` to `h-10`, `placeholder:text-muted-foreground` to `placeholder:text-neutral-400`, add `focus-visible:shadow-[var(--shadow-xs)]`

`src/components/ui/label.tsx`:
- Line 12: change `text-sm` to `text-[0.8125rem]`, add `text-foreground/80`

**Acceptance criteria:**
- In browser DevTools on any page: `document.body` computed `font-family` starts with `Inter` (not `Geist` or system sans)
- `document.querySelector('h1')` computed `font-family` starts with `Fraunces`
- `:root` computed `--radius` = `0.375rem`
- `:root` computed `--shadow-sm` exists and is non-empty
- `:root` computed `--neutral-50` = `#F7F8F9`
- `:root` computed `--success` exists
- Card component in DevTools has `border` class and `shadow` class; no `ring-1`
- Button `size="lg"` has computed height 44px (`h-11`)
- Input has computed height 40px (`h-10`)
- `tsc` clean, 197 existing tests still pass
- No layout shift visible on font load (verify via browser Network tab — fonts load with `display: swap`)

**Estimated time:** 3.5h

---

### Group B — Homepage (serial after S6-0; S6-1 through S6-4 can run parallel if file surfaces don't overlap — see Execution Order)

---

#### Issue S6-1: Homepage hero refresh

**Specialist:** Bolt
**Effort:** small
**Labels:** `feature`, `P1-high`, `size:S`
**Depends on:** S6-0 merged

**Files to touch:**
1. `src/app/(public)/page.tsx` — hero section only (lines 15–87)

**Exact changes in `src/app/(public)/page.tsx`:**
- Line 43: change `opacity-60` to `opacity-85`
- Line 47: change `text-xs font-semibold uppercase tracking-[0.3em] text-[#8BB5C9]` to `font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-[#8BB5C9]`
- Line 51: change `text-5xl font-bold sm:text-7xl` to `text-4xl font-bold sm:text-5xl lg:text-7xl`
- Line 59: change `text-white/60` to `text-white/70`
- Line 69: change `flex-wrap` to `flex-col sm:flex-row` (keep `items-center justify-center gap-4`)

**Acceptance criteria:**
- Hero logo renders at 85% opacity (not 60% — visible as intentional watermark)
- Overline text is 11px Inter (not Geist) — verify computed styles in DevTools
- On mobile viewport (375px): h1 renders at 36px (text-4xl)
- On tablet viewport (640px): h1 renders at 48px (text-5xl)
- On desktop viewport (1024px): h1 renders at 72px (lg:text-7xl)
- Hero subhead is white/70 opacity (slightly more legible than prior white/60)
- CTA buttons stack vertically on mobile, horizontal on sm+
- Playwright screenshot of `/` at 375px width matches expected hero layout

**Estimated time:** 1.5h

---

#### Issue S6-2: Stats section + feature grid + Donate CTA section

**Specialist:** Bolt
**Effort:** small
**Labels:** `feature`, `P1-high`, `size:S`
**Depends on:** S6-0 merged

**Files to touch:**
1. `src/app/(public)/page.tsx` — stats section (lines 89–109), mission/feature grid (lines 111–163), Donate CTA section (lines 166–199)

**Exact changes in `src/app/(public)/page.tsx`:**

Stats section (lines 89–109):
- Line 90: change `bg-white` to `bg-neutral-50`
- Line 98: inside each stat `<div>`, add a teal rule before the stat value: `<div className="w-12 h-0.5 bg-primary mx-auto mb-4" />`
- Line 102: change `text-xs uppercase tracking-widest` to `font-sans text-[0.6875rem] uppercase tracking-[0.2em]`
- After the stats grid closing tag: add the event info line `<p className="mt-10 text-center font-sans italic text-[0.8125rem] text-muted-foreground/60">September 18–19, 2026 · New Bern Golf &amp; Country Club</p>`

Mission section overlines (line 114):
- Change `text-xs font-semibold uppercase tracking-[0.3em]` to `font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em]`

Feature grid cells (line 154–162):
- `<div key={item.title} className="bg-white p-10 group">`:
  - Add `<div className="w-8 h-0.5 bg-primary mb-4 transition-all duration-200 group-hover:w-12" />` before the `<h3>`
  - `<h3>` (line 155): add `group-hover:text-primary transition-colors duration-150` to className

Donate CTA section (line 167):
- Change `bg-[#F1F4F6]` to `bg-neutral-50`

Get Involved overline (line 169):
- Change `text-xs font-semibold uppercase tracking-[0.3em]` to `font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em]`

**Acceptance criteria:**
- Stats section background is warm off-white (`bg-neutral-50`), not pure white — visually perceptible difference
- Teal rule (12px wide, 2px tall) appears above each stat number
- Stat labels render at 11px Inter uppercase with 0.2em tracking
- Feature grid h3 shifts to teal (`text-primary`) on cell hover; teal rule grows from 32px to 48px on hover
- Donate CTA section (`bg-neutral-50`) matches stats section background; no longer stark `#F1F4F6`
- Event info line renders below stats in italic Inter 13px muted
- All overlines across homepage are consistent: 11px, 0.25em tracking (or 0.2em for stat labels per spec)
- Playwright screenshot of `/` desktop view shows visual changes

**Estimated time:** 2h

---

#### Issue S6-3: Mobile sticky CTA bar + nav border + body clearance

**Specialist:** Bolt
**Effort:** small
**Labels:** `feature`, `P1-high`, `size:S`
**Depends on:** S6-0 merged

**Files to touch:**
1. `src/app/(public)/layout.tsx` — add sticky CTA bar component + `pb-16 sm:pb-0` to main
2. `src/components/public/navbar.tsx` — add `border-b border-border/60` to header (line 22)
3. `src/components/public/sticky-cta-bar.tsx` — new file (the mobile bar component)

**Spec for `sticky-cta-bar.tsx`:**
- `"use client"` — needs LinkButton
- `fixed bottom-0 inset-x-0 sm:hidden z-30 bg-background border-t border-border/60 px-4 py-3`
- Two equal-width buttons: Register (teal, `href="/register"`) and Donate (purple, `href="/donate"`)
- Each button: `flex-1 h-11 rounded-none text-[0.8125rem] uppercase tracking-wider`
- Register: `bg-brand text-white hover:bg-brand-dark`; Donate: `bg-purple text-purple-foreground hover:bg-purple-hover`
- Wrapper: `flex gap-3 items-center`

`src/app/(public)/layout.tsx`:
- Import `StickyCTABar`
- Add `<StickyCTABar />` after `<Footer />` (inside the fragment)
- Add `className="flex-1 pb-16 sm:pb-0"` to `<main>`

`src/components/public/navbar.tsx`:
- Line 22: add `border-b border-border/60` to the `<header>` className

**Acceptance criteria:**
- On mobile viewport (< 640px): sticky bottom bar is visible at all scroll positions, showing Register (teal) and Donate (purple) buttons side by side
- Bar height: 64px total (button `h-11` + 12px padding)
- On sm+ viewport (≥ 640px): bar is completely hidden (`sm:hidden`)
- Page content is not obscured by the bar — body has `pb-16` on mobile, verified by scrolling to footer
- Nav header has a bottom border visible on all viewport sizes
- Playwright screenshot at 375px shows bar present; at 768px shows bar absent

**Estimated time:** 2h

---

#### Issue S6-4: Motion tokens + easing CSS vars (baked into S6-0)

**Note:** After reviewing file surfaces, S6-4 as a standalone issue would only touch `globals.css` (easing vars) and `button.tsx`/`card.tsx` (hover lift). Both of those files are already fully covered by S6-0 (the foundation issue). Splitting S6-4 into a separate issue would require S6-0 to hold off on the hover lift changes — which creates coordination complexity with no benefit.

**Decision:** Fold S6-4 motion work into S6-0. The hover lift (`translate-y-[-1px]` on Button, `translate-y-[-0.5px]` on Card) and easing vars (`--ease-spring`, `--ease-out`) are included in the S6-0 spec above. S6-4 is closed before opening.

---

## Execution order

```
Phase 1 — serial:
  S6-0 (Foundation) — must merge to main first
  Files: layout.tsx, globals.css, button.tsx, card.tsx, input.tsx, label.tsx

Phase 2 — parallel (all depend on S6-0; no file overlap between them):
  S6-1 (Hero refresh)    — touches: src/app/(public)/page.tsx [hero section only]
  S6-2 (Stats + Grid)    — touches: src/app/(public)/page.tsx [stats, grid, donate sections]
  S6-3 (Mobile CTA bar)  — touches: src/app/(public)/layout.tsx, navbar.tsx, new sticky-cta-bar.tsx
```

**File overlap analysis:**
- S6-1 and S6-2 both touch `src/app/(public)/page.tsx` — they edit different line ranges but the same file. **These must run serial** (S6-1 then S6-2, or combined into one Bolt task if Scott prefers). Recommend combining S6-1 and S6-2 into a single Bolt session to avoid a merge conflict on `page.tsx`.
- S6-3 touches `layout.tsx` (public layout, not root layout) and creates a new file — zero overlap with S6-1/S6-2.
- After S6-0 merges: S6-3 can run in parallel with the combined S6-1+S6-2 task. No file conflict.

**Revised execution:**
```
Phase 1 (serial):   S6-0
Phase 2 (parallel): S6-1+S6-2 (combined, one Bolt session on page.tsx) || S6-3 (separate Bolt session)
```

**Conflict zone:** `src/app/(public)/page.tsx` — touched by both S6-1 and S6-2. Resolved by combining them.

---

## Spec / TDD considerations

This sprint is predominantly visual. Vitest has no meaningful surface on CSS token values, font loading, or Tailwind class composition. Spec should write:

1. **Snapshot / DOM assertion:** Sticky CTA bar renders inside the DOM on the public layout and has `sm:hidden` in its className — verifiable with a React Testing Library render test of `PublicLayout`.
2. **No Spec sprint sweep required** — no new hooks, services, contexts, or edge functions are added. Spec trigger rules are not met for this sprint.

Watchdog visual review is the primary quality gate. Playwright screenshots of `/` (homepage) in:
- Light mode, desktop (1280px)
- Light mode, mobile (375px)
- Dark mode, desktop (1280px)
- Dark mode, mobile (375px)

Watchdog should verify font rendering (Fraunces/Inter visible), sticky bar behavior, hero h1 breakpoints, and that purple remains confined to Donate + Become a Sponsor CTAs.

---

## Risks

1. **`--font-sans` circular reference** (high risk, known): `globals.css` line 10 has `--font-sans: var(--font-sans)` — self-referential and currently a no-op. Bolt must change this to `--font-sans: var(--font-inter)` after Inter is loaded as `--font-inter`. If overlooked, body text silently falls back to system sans at runtime. Bolt must verify in browser DevTools before marking S6-0 done.

2. **Font CLS (cumulative layout shift)**: Both fonts use `display: 'swap'`. On first load, text will briefly render in fallback fonts before swapping to Fraunces/Inter. This is acceptable per spec. Bolt should not attempt to suppress it with `display: 'block'` — that trades CLS for invisible text, which is worse for perceived performance on older hardware.

3. **Dark mode font rendering**: Fraunces at heavy weights (700+) on dark backgrounds can appear bolder than intended due to subpixel rendering differences. Watchdog must verify hero h1 and stat numbers in dark mode screenshots.

4. **Existing tests relying on class names**: 197 tests currently pass. If any test asserts specific class strings on Button, Card, Input, or Label (e.g., `toHaveClass('ring-1')`, `toHaveClass('h-9')`), those will break. Bolt must run the test suite after S6-0 changes and fix any failures before pushing.

5. **Mobile sticky bar z-index collision**: The bar uses `z-30`. The navbar uses `z-50`. No collision expected, but Watchdog should verify that mobile nav dropdown (which renders below the `<header>`) does not appear behind the sticky bar.

6. **`page.tsx` merge conflict**: S6-1 and S6-2 are combined to eliminate this risk. If for any reason they run separately, S6-2 must rebase on S6-1 before merging.

7. **No DB changes, no type regen**: This sprint touches zero Supabase tables, migrations, or edge functions. Builders must not run `supabase gen types` — doing so in parallel with any open migration PR causes type conflicts. This note is a reminder only; there is no migration risk in Sprint 6.

---

## Total effort estimate

| Issue | Specialist | Effort | Est. Time |
|---|---|---|---|
| S6-0 Foundation | Bolt | Medium | 3.5h |
| S6-1+S6-2 Hero + Stats (combined) | Bolt | Small+Small | 3h |
| S6-3 Mobile sticky bar + nav | Bolt | Small | 2h |
| **Total** | | | **8.5h** |

Sprint is achievable in 2 builder sessions: S6-0 solo (3.5h), then S6-1+S6-2 and S6-3 parallel (3h peak, 2h if S6-3 runs after).
