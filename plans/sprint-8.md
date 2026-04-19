# Sprint 8 — Warmer Editorial + Logo + Event Metadata CMS

**Sprint goal:** Refine the design system with current-trend moves Scott approved (warmer fonts, layered radius, cream neutrals, grain atmosphere, asymmetric hero, motion), integrate the real brand logo, and make the hero's date+venue editable via the admin CMS.

**Approved direction (Scott 2026-04-19):**
- Font body: Inter → **Manrope** (Fraunces display stays)
- Radius: flat 6px → **layered scale** (cards 12px, buttons 8px, pills full, inputs 6px)
- Section rhythm tightened: `py-20 sm:py-28` → `py-14 sm:py-20`
- Neutrals: pure white alt sections → **cream `#F9F4EC`** on alternating surfaces
- Atmosphere: **grain overlay** at ~3% opacity on hero + cream sections
- Hero: centered → **asymmetric** (headline left-aligned, date/venue as sidecar element)
- Motion: **page-load stagger reveal** on hero elements (400ms total, 100ms between)
- Hero copy: include date + venue high-scan, **dynamic from `event_settings`**
- Brand token: `#5B8FA8` → `#5797a6` (matches logo primary teal exactly)
- Logo: real SVG at `public/brand/ccc-logo-full.svg` replaces text-based wordmark in hero + nav

---

## S8-0 Event metadata migration + admin CMS

**Specialist:** Flux. **Effort:** medium.

**Files:**
- `supabase/migrations/20260422000001_event_metadata.sql` (new)
- `src/app/admin/event/event-settings-form.tsx` (extend — add date + venue fields)
- `src/app/admin/event/actions.ts` (extend — accept new fields)
- `src/types/database.ts` (manual edit — add new columns to `event_settings` Row/Insert/Update — do NOT regen)

**Migration:**
```sql
ALTER TABLE public.event_settings
  ADD COLUMN tournament_start_date date,
  ADD COLUMN tournament_end_date date,
  ADD COLUMN venue_name text;
```

Columns are nullable; hero has display fallback ("Date TBD · Venue TBD") if values absent.

**Admin form:**
- Two native `<input type="date">` pickers for start + end dates
- Text input for venue name
- Group under a "Tournament details" fieldset alongside existing event_settings fields
- Preserve all existing form behavior (registration_fee_cents, caps, etc.)

**Acceptance:**
- Migration applies clean on production (auto-deploy via push trigger)
- Admin can set/update dates + venue via `/admin/event`
- `npx tsc --noEmit` clean, 198/198 tests pass
- No RLS or security concerns (column additions only)

---

## S8-1 Global design amendments

**Specialist:** Bolt. **Effort:** small.

**Files:**
- `src/app/layout.tsx` (swap Inter → Manrope)
- `src/app/globals.css` (brand token shift, radius scale, cream neutral, grain/noise SVG data-URL as CSS custom property)
- `src/components/ui/button.tsx` (layered radius — `size=lg` uses rounded-md, pills rounded-full variant if present)
- `src/components/ui/card.tsx` (bump card base radius to `rounded-xl` = 12px via new `--radius-xl` token)
- `src/components/ui/input.tsx` (confirm 6px radius)

**Token updates in `globals.css`:**
```css
:root {
  --brand: #5797a6;           /* was #5B8FA8 — matches logo */
  --cream: #F9F4EC;
  --radius: 0.375rem;         /* unchanged base (6px) */
  --radius-lg: 0.625rem;      /* buttons default = 10px (was 6px) */
  --radius-xl: 0.75rem;       /* cards = 12px */
  --radius-2xl: 1rem;
  --radius-full: 9999px;
  /* Noise for grain overlay */
  --noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.03 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}

.bg-cream { background-color: var(--cream); }
.grain-overlay::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--noise);
  pointer-events: none;
  mix-blend-mode: multiply;
  opacity: 0.5;
}
```

**Section rhythm tighten:**
- Global: `py-20 sm:py-28` instances in homepage sections → `py-14 sm:py-20`

**Acceptance:**
- `npx tsc --noEmit` clean, 198/198 tests pass
- Homepage, donate, sponsorships, sponsors, gallery, leaderboard, admin pages all inherit Manrope correctly (check computed style in DevTools)
- Card component visually rounder, button radius slightly rounder
- Grain CSS variable available for selective use in S8-2

---

## S8-2 Homepage hero refresh

**Specialist:** Bolt. **Effort:** medium. **Depends on S8-0 + S8-1 merged.**

**Files:**
- `src/app/(public)/page.tsx` (asymmetric hero layout, logo, dynamic date/venue, motion)
- `src/app/(public)/layout.tsx` (if nav logo integration lives there)
- `src/components/public/navbar.tsx` (logo integration)

**Hero treatment:**
- Logo: render `/brand/ccc-logo-full.svg` at a generous size above the headline
- Headline: left-aligned at lg+ breakpoints (was centered). Mobile stays centered.
- Date/venue: rendered as **sidecar** element — vertical rule + stacked metadata beside the headline on desktop, below on mobile. Pulls from `event_settings`:
  ```tsx
  const settings = await getEventSettings();
  const dateRange = formatDateRange(settings.tournament_start_date, settings.tournament_end_date);
  const venue = settings.venue_name ?? "Venue TBD";
  ```
  `formatDateRange` produces "September 18–19, 2026" style output (handle same-day, cross-month, cross-year edge cases).
- Fallback: if dates null → "Date TBD". If venue null → "Venue TBD".

**Asymmetric layout:**
- Desktop: `grid-cols-3` — headline spans cols 1-2, sidecar in col 3
- Mobile: stacked vertically, everything centered

**Motion (page-load stagger):**
- Overline: `opacity-0 animate-[fadeUp_400ms_ease-out_forwards]`
- Headline: same, `100ms` delay
- Sidecar: same, `200ms` delay
- Subhead: same, `300ms` delay
- CTAs: same, `400ms` delay

**Grain overlay:**
- Hero container: add `grain-overlay` class (defined in S8-1)

**Nav integration:**
- Replace text wordmark with `ccc-logo-full.svg` scaled to `h-8` (32px); on scroll-sticky state shrink to `h-6` (24px) — or keep at `h-8` always if simpler

**Acceptance:**
- Homepage renders logo at top + asymmetric hero + dynamic date/venue from DB + grain overlay + motion stagger
- Date range format correct ("September 18–19, 2026" for same month; "December 30, 2026 – January 2, 2027" for cross-month)
- Fallback text renders when columns null
- Screenshot desktop + mobile `/tmp/pr-s8-2-{desktop,mobile}.png`
- `npx tsc --noEmit` clean, 198/198 pass

---

## Execution order

```
Phase 1 (parallel):
  S8-0 Flux  → feat/s8-0-event-metadata
  S8-1 Bolt  → feat/s8-1-design-amendments
  
Phase 2 (serial after both):
  S8-2 Bolt → feat/s8-2-homepage-refresh
```

## Risks
1. **Manrope vs Inter spacing** — might slightly change text metrics. Eyeball carefully.
2. **Grain overlay performance** — mix-blend-mode can cause paint cost. Monitor on mobile.
3. **Asymmetric hero on md breakpoint** — between mobile stacked and desktop 3-col, there's an awkward middle. Pick a single md treatment (lean toward stacked through md, 3-col at lg+).
4. **Date format edge cases** — cross-year tournaments should never happen for this event, but handle defensively.
