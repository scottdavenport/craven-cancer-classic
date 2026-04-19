# Design Spec: Sprint 6 Visual Overhaul — Craven Cancer Classic

**Status:** Proposed — awaiting Scott approval before Bolt executes
**Specialist:** Pixel
**Scope:** Typography, color extension, component polish, page-level patterns, motion, mobile

---

## 0. Sprint 6 Scope (Phased Rollout)

Scott's decision: phase the overhaul. Sprint 6 ships **foundation + homepage only** to validate
the direction before applying the system site-wide.

**In scope for Sprint 6:**
- Typography swap (Geist → Fraunces + Inter)
- All component polish (Button, Card, Input, Label)
- Global tokens (color extensions, elevation, radius, spacing, motion)
- Homepage hero + overline + stats + feature grid + motion + mobile sticky CTA bar
- `globals.css` and `layout.tsx` updates

**Deferred to Sprint 7:**
- /donate page overhaul
- /sponsorships page overhaul
- /gallery page overhaul
- /leaderboard page overhaul
- /sponsors page (if we build the sponsor wall)

**Indefinitely deferred:**
- /admin/* styling (internal-facing, low visual priority)
- Sponsor wall component spec (part of Sprint 7 /sponsors page if Scott approves it then)

---

## 1. Aesthetic Direction

The target mood is **warm memorial gravitas** — the visual weight of a tribute, not the flash of a corporate golf scramble. References: Banyan Hills Foundation (www.banyanhillsfoundation.org), Memorial Sloan Kettering donor pages, Augusta National's understated restraint. The overhaul keeps the existing dark navy hero and teal/purple CTA system intact and injects warmth through serif typography, generous white space, subtle texture, and editorial section rhythm. The result should feel like a well-printed event program: unhurried, trustworthy, community-made. Nothing should shout. Every element earns its place.

---

## 2. Typography System

### Font Pairing Decision

The current install has Playfair Display (display/heading) and Geist Sans (body). Geist is the problem — it reads as a tech product, not a community memorial event. Replace both with **Fraunces** (display) + **Inter** (body).

| Role | Font | Source | Why |
|---|---|---|---|
| Display / Headings | Fraunces | Google Fonts, `next/font` | Variable serif with optical sizing; handles small sizes better than Playfair; warm memorial gravitas with the variable `opsz` axis tightening automatically at display sizes |
| Body / UI | Inter | Google Fonts, `next/font` | Clean, legible sans used by every top nonprofit Scout referenced (charity:water, Livestrong, Pelotonia, St. Jude); serif+sans is the proven nonprofit pattern; keeps body readable at 13–17px for older audience |
| Mono (admin only) | Geist Mono | Already installed | Keep for tables, code, leaderboard scores |

**Why this pairing:**
- Fraunces is a variable font with optical size axis (`opsz` 9–144) — it self-tightens at display sizes without over-compression. Weight range 400–900 gives full flexibility from body-weight accents to bold hero headlines.
- Inter at body sizes uses normal letter-spacing; no override needed. It pairs with Fraunces by contrast (serif display / sans body) — the pattern every major nonprofit uses.
- Fraunces replaces Playfair Display entirely. Drop Playfair from `layout.tsx`.

### Type Scale

All sizes in rem (1rem = 16px browser default). Line heights in unitless ratios.

| Token | Font | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|---|
| `text-display` | Fraunces | 4.5rem (72px) | 700 | 1.0 | -0.02em | Hero h1 only |
| `text-display-sm` | Fraunces | 3rem (48px) | 700 | 1.05 | -0.015em | Hero h1 on mobile |
| `text-h1` | Fraunces | 2.25rem (36px) | 600 | 1.15 | -0.01em | Page-level headings |
| `text-h2` | Fraunces | 1.75rem (28px) | 600 | 1.2 | -0.008em | Section headings |
| `text-h3` | Fraunces | 1.25rem (20px) | 500 | 1.3 | 0 | Card titles, feature headings |
| `text-overline` | Inter | 0.6875rem (11px) | 600 | 1.5 | 0.25em | Section eyebrow labels (ALL CAPS) |
| `text-body-lg` | Inter | 1.0625rem (17px) | 400 | 1.7 | 0 | Hero subhead, mission paragraphs |
| `text-body` | Inter | 0.9375rem (15px) | 400 | 1.65 | 0 | Default body copy |
| `text-body-sm` | Inter | 0.8125rem (13px) | 400 | 1.6 | 0 | Card descriptions, captions |
| `text-ui` | Inter | 0.875rem (14px) | 500 | 1.4 | 0.01em | Button labels, nav links |
| `text-caption` | Inter | 0.75rem (12px) | 400 | 1.5 | 0.02em | Photo captions, fine print |
| `text-stat` | Fraunces | 3rem (48px) | 700 | 1.0 | -0.02em | Impact stat numbers ($450K+) |

### Usage Rules

- **Fraunces** for h1–h3, stat numbers, and the italic "Classic" wordmark flourish. Never use for body copy or UI labels. Letter-spacing on display sizes: -0.01em to -0.02em (optical sizing tightens automatically via `opsz` axis — do not over-compress).
- **Inter** for all body text, button labels, nav items, form labels, captions. Normal letter-spacing at body sizes; no override needed.
- **Italic treatment:** Use Fraunces italic sparingly — the "Classic" wordmark in the hero, and pull-quotes on the about/mission page if added. Do not italicize body copy.
- **Overline labels** (e.g., "Annual Charity Golf Tournament", "Our Mission", "Get Involved"): Inter, 11px, uppercase, letter-spacing 0.25em, color `text-primary` (teal).
- **Number rendering:** Use `font-variant-numeric: tabular-nums; font-variant-numeric: lining-nums;` on the leaderboard table and score cells. For impact stats, use `oldstyle-nums` for editorial warmth.

### Implementation Notes (Typography)

1. In `src/app/layout.tsx`: replace Geist Sans and Playfair Display imports with `Fraunces` and `Inter` from `next/font/google`. Example:

```ts
import { Fraunces, Inter } from 'next/font/google'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  axes: ['opsz'],            // optical size axis (9–144)
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})
```

Apply both `className` variables to the `<html>` element: `className={`${fraunces.variable} ${inter.variable}`}`.

2. In `src/app/globals.css` `@theme inline`: confirm `--font-display: var(--font-display)` and `--font-sans: var(--font-sans)` are set (they'll resolve from the CSS variables above). Remove any Playfair or Lora/Geist-sans references.
3. In `@layer base`: add `body { font-variant-numeric: oldstyle-nums; }` and override with `font-variant-numeric: tabular-nums lining-nums` on `.tabular-nums` utility applied to score/leaderboard tables.
4. Remove Geist Sans and Playfair Display imports from `layout.tsx`. Geist Mono stays (used by `--font-mono`).
5. Set `--radius: 0.375rem` (from current `0.5rem`) — see Spacing section for rationale.

---

## 3. Color Palette Extensions

Brand colors are locked. The following extends to neutrals, states, and surface layers.

### Supporting Neutrals

| Token Name | Hex | Use |
|---|---|---|
| `--neutral-50` | `#F7F8F9` | Alternate section background (instead of hard white) |
| `--neutral-100` | `#EEF0F2` | Subtle dividers, input fills |
| `--neutral-200` | `#DAE3E8` | (Already `--border`) — keep |
| `--neutral-400` | `#8BA0AB` | Placeholder text, disabled labels |
| `--neutral-600` | `#5F7A87` | (Already `--muted-foreground`) — keep |
| `--neutral-900` | `#1A2E3A` | (Already `--foreground` / navy) — keep |

These extend the existing token set; none replace current tokens. Use them via new CSS custom properties in `:root`.

### State Colors

| State | Token | Light Hex | Dark Hex | Use |
|---|---|---|---|---|
| Success | `--success` | `#2E7D5E` | `#4CAF87` | Registration confirmed, payment success |
| Success muted | `--success-muted` | `#E8F5EF` | `#1A3D2E` | Success badge background |
| Warning | `--warning` | `#B45309` | `#F5A623` | Waitlist, deadline approaching |
| Warning muted | `--warning-muted` | `#FEF3C7` | `#3D2A00` | Warning badge background |
| Error | `--destructive` | `#C53030` | `#FC8181` | (Already exists) — keep |

### Surface Levels (Light Mode)

| Level | Token | Hex | Use |
|---|---|---|---|
| Base | `--background` | `#FAFBFC` | Page background (already set) |
| Surface | `--card` | `#FFFFFF` | Cards, modals, form panels |
| Surface raised | `--surface-raised` | `#FFFFFF` | Cards with `box-shadow` elevation (see Elevation) |
| Surface subtle | `--neutral-50` | `#F7F8F9` | Alternate sections (Mission, Get Involved) — warmer than `#F1F4F6` |
| Surface inset | `--muted` | `#F1F4F6` | Card footers, table row highlights |

### Purple Usage Policy

Purple is a **reserved emotional anchor** — not a general accent color.

Permitted uses only:
- **Donate CTA** and **Become a Sponsor CTA** — locked from Sprint 2. These two button variants stay purple per Option B. Do not change.
- **Future tribute/memorial sections** — in-memoriam blocks and honoree callouts, if/when those sections are built. Purple signals "this honors someone" and should carry that weight exclusively.

Do not propose purple for any other surface: focus rings (the existing purple focus ring in the codebase stays as-is — do not remove it, but do not replicate the treatment elsewhere), section backgrounds, icon accents, overlines, badges, or decorative elements.

### Implementation Notes (Color)

Add `--neutral-50`, `--neutral-100`, `--neutral-400`, `--success`, `--success-muted`, `--warning`, `--warning-muted`, `--surface-raised` to `:root` in `globals.css`. Add corresponding `@theme inline` entries. Do not remove existing tokens.

Replace the hardcoded `bg-[#F1F4F6]` in the "Get Involved" section of `page.tsx` with `bg-neutral-50` (via token) — it is 2 shades warmer and reads less clinical.

---

## 4. Spacing, Elevation, and Border Radius

### Spacing Scale

Use a strict 4px base grid. Tailwind's default spacing scale is already 4px-based. No custom scale is needed — enforce discipline at the page level.

Key spacing values and their intended use:

| Step | px | Tailwind | Use |
|---|---|---|---|
| 1 | 4px | `p-1` | Icon gap, tight inline |
| 2 | 8px | `p-2` | Button inner vertical, badge padding |
| 3 | 12px | `p-3` | Card sm padding |
| 4 | 16px | `p-4` | Card default padding |
| 6 | 24px | `p-6` | Card comfortable padding |
| 8 | 32px | `p-8` | Section inner horizontal |
| 12 | 48px | `py-12` | Component vertical gap |
| 16 | 64px | `py-16` | Section vertical rhythm (mobile) |
| 20 | 80px | `py-20` | Section vertical rhythm (tablet) |
| 24 | 96px | `py-24` | Section vertical rhythm (desktop) |
| 32 | 128px | `py-32` | Hero vertical padding (desktop) |

Sections currently use `py-24 sm:py-32` — correct. Do not change.

### Elevation (Shadow Scale)

| Token | Value | Use |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(26,46,58,0.06)` | Input focus ring underlay, subtle chip |
| `--shadow-sm` | `0 2px 6px rgba(26,46,58,0.08), 0 1px 2px rgba(26,46,58,0.04)` | Default card rest state |
| `--shadow-md` | `0 4px 16px rgba(26,46,58,0.10), 0 2px 4px rgba(26,46,58,0.06)` | Card hover, dropdown |
| `--shadow-lg` | `0 12px 32px rgba(26,46,58,0.12), 0 4px 8px rgba(26,46,58,0.06)` | Modal, sheet |

The shadow base color is `#1A2E3A` (navy), not black. This gives shadows the brand's blue-green cast and avoids the generic gray-black shadow that reads as "stock shadcn."

### Border Radius

| Token | Value | Use |
|---|---|---|
| `--radius` | `0.375rem` (6px) | Base — change from current 0.5rem |
| `--radius-sm` | `calc(var(--radius) * 0.6)` = 3.6px | Input, badge |
| `--radius-md` | `calc(var(--radius) * 0.8)` = 4.8px | Button sm |
| `--radius-lg` | `var(--radius)` = 6px | Card default, Button default |
| `--radius-xl` | `calc(var(--radius) * 1.4)` = 8.4px | Card xl |
| `--radius-2xl` | `calc(var(--radius) * 1.8)` = 10.8px | Modal |

Rationale: reducing from 8px to 6px base removes the "bubbly app" feel. Cards at 6px read more like printed materials. CTAs in the hero continue to use `rounded-none` (correct — already implemented).

### Implementation Notes (Spacing / Elevation / Radius)

1. In `globals.css` `:root`, change `--radius: 0.5rem` to `--radius: 0.375rem`.
2. Add shadow tokens as CSS custom properties; expose via `@theme inline` as `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`.
3. In `card.tsx`, add default `shadow-sm` class and `hover:shadow-md transition-shadow duration-200` to the Card base class.

---

## 5. Component Style Updates

### Button

Current state: basic shadcn CVA, `rounded-lg`, no shadow, 200ms `transition-all`. The default button reads too generic.

Changes:

- **Default (teal CTA):** Add `shadow-xs` at rest. On hover: `shadow-sm` + `translate-y-[-1px]`. This subtle lift distinguishes from links without being garish.
- **Hero CTAs** (`rounded-none`): Keep exact current implementation — already correct per brand.
- **Outline variant:** Add `border-1.5` (1.5px border). Change hover from `bg-muted` to `bg-brand-muted/60` when the outline is a teal variant — gives warmer hover fill.
- **Purple CTAs:** Add `shadow-xs` at rest. Hover: `shadow-sm` + `translate-y-[-1px]`. Identical treatment to default.
- **Size lg:** Increase to `h-11` (44px touch target), `px-6`, `text-[0.9375rem]` (15px Inter). Current `h-9` is undersized for a primary CTA.
- **Transition:** Change from `transition-all` to `transition-[background-color,box-shadow,transform]` — limits repaints.

Implementation Notes: Edit `src/components/ui/button.tsx` CVA. All size/variant changes are additive. Do not break existing `size: default` or `size: xs` behavior.

### Card

Current state: `ring-1 ring-foreground/10`, no shadow, `rounded-xl` (too round for 6px base).

Changes:

- Replace `ring-1 ring-foreground/10` with `shadow-sm border border-border/60`. The ring approach renders crisply but lacks depth; shadow-with-border gives the layered look editorial sites use.
- On hover (when card is inside an `<a>` or has an `onClick`): `hover:shadow-md hover:-translate-y-0.5 transition-[box-shadow,transform] duration-200`.
- `CardTitle`: Change from `font-heading` to `font-display text-h3` (Fraunces — card titles deserve the serif display treatment since they label content sections).
- `CardFooter`: Change `bg-muted/50` to `bg-neutral-50` — warmer, matches the updated neutral.

Implementation Notes: Edit `src/components/ui/card.tsx`. The `rounded-xl` class on Card — with the new `--radius: 0.375rem` base, `rounded-xl` computes to `--radius-xl` = 8.4px. That's acceptable; do not change the class name.

### Input

Current state: default shadcn, neutral border, no warm treatment.

Changes:

- Rest border: `border-neutral-200` (same as `--border`, no change needed).
- Focus: ring stays purple (`--ring: #6B5DB8` already set). Add `shadow-xs` on focus to give slight depth.
- Placeholder: color `text-neutral-400` (`#8BA0AB`) — warmer than the current gray.
- Font: Inter at 15px (`text-body`) — inherits from body, no explicit override needed after font swap.
- Height: `h-10` (40px) — matches the 4px grid, same as current.

Implementation Notes: Minor token changes only. Input inherits font from `body` after the Geist→Inter swap.

### Label

Current state: default `text-sm font-medium`.

Changes:

- Size: `text-[0.8125rem]` (13px) — slightly smaller than body, reads as label not heading.
- Weight: Keep `font-medium` (500).
- Color: `text-foreground/80` — slightly softer than full foreground; distinguishes from h3 headings.

Implementation Notes: Edit `src/components/ui/label.tsx` base className.

---

## 6. Hero + Page-Level Patterns

### Homepage Hero

Current state is mostly correct. Targeted adjustments only:

- **Logo treatment:** Remove `opacity-60` from the hero logo. At 60% it disappears. At 85% it reads as intentional watermark without competing with the headline.
- **Overline ("Annual Charity Golf Tournament"):** Change from `text-xs font-semibold uppercase tracking-[0.3em]` + Geist → Inter, 11px, uppercase, `tracking-[0.25em]`, `text-[#8BB5C9]`.
- **h1:** Keep `font-display text-5xl font-bold sm:text-7xl`. With Fraunces loaded as `--font-display` this is correct. No change.
- **"Classic" italic span:** Already correct (`italic font-normal text-[#8BB5C9]`). Keep.
- **Divider line:** Already correct (`via-[#5B8FA8]`). Keep.
- **Hero subhead:** Change `text-white/60` to `text-white/70` — 10% more legible without losing the recessive tone.
- **Memorial line ("Honoring..."):** Keep `text-white/35`. Do not change — intentionally recessive.
- **CTA gap:** Already `gap-4`. Keep.
- **Hero image overlay:** Current `bg-[#1A2E3A]/80`. Consider `bg-[#1A2E3A]/75` to let slightly more green through from the fairway — but only if the hero photo Scott swaps in has enough green. Default to keep current.

### Section Rhythm

Apply this consistent pattern across all public pages:

- **Overline:** Inter, `text-overline`, `text-primary`, uppercase, `tracking-[0.25em]`, `mb-3`
- **Section heading:** Fraunces, `text-h2` (28px), `font-semibold`, `text-foreground`, `mt-0 mb-6`
- **Section body:** Inter, `text-body-lg` (17px), `text-muted-foreground`, `max-w-xl mx-auto`, `leading-relaxed`
- **Section vertical spacing:** `py-20 sm:py-28` (slightly tighter than current `py-24 sm:py-32` for interior sections; hero keeps full padding)

### Impact Stats Block

Current state: bare numbers, no visual weight.

Changes:

- Add a thin teal rule (`w-12 h-0.5 bg-primary mx-auto mb-4`) above each stat value.
- Stat number: Fraunces, `text-stat` (48px), `font-bold`, `text-foreground`. Already correct.
- Stat label: Inter, 11px, uppercase, `tracking-[0.2em]`, `text-muted-foreground`.
- Add a subtle background to this section: `bg-neutral-50` instead of `bg-white` — barely perceptible, but breaks up the pure white flow.
- Consider adding a single text line below the stats: *"September 18–19, 2026 · New Bern Golf & Country Club"* in Inter italic, 13px, `text-muted-foreground/60`.

### Mission / Feature Grid

Current state: `gap-px bg-border` grid with `bg-white p-10` cells. This is a sharp editorial technique — keep it.

Changes:

- Add `group-hover:text-primary transition-colors duration-150` to the `h3` inside each cell. On hover, the heading shifts teal — a subtle affordance.
- Add a `w-8 h-0.5 bg-primary mb-4 transition-all duration-200 group-hover:w-12` rule above each h3. A growing teal rule on hover adds life without full motion.

### Donate CTA Section

Change `bg-[#F1F4F6]` to `bg-neutral-50` (warmer, less clinical). Keep all other structure. No change to CTAs.

### Implementation Notes (Page Patterns)

Bolt should update `page.tsx` for stat section background and overline typography. Feature grid group-hover is a 2-line Tailwind change per cell. Sponsor wall is deferred to Sprint 7 — see Appendix B.

---

## 7. Motion Guidelines

Five principles, minimal implementation:

**1. Translate, don't scale.**
CTAs lift `translate-y-[-1px]` on hover. Cards lift `translate-y-[-2px]` on hover when interactive. Never use `scale()` on buttons or cards — it breaks layout flow and reads as toy.

**2. Shadow tells the story.**
When something lifts (button, card), the shadow deepens simultaneously. `shadow-sm → shadow-md` paired with `translate-y-[-2px]` creates the physical lift metaphor. This is the site's primary motion language.

**3. Duration by element mass.**
Small (button, badge): 150ms. Medium (card): 200ms. Large (modal/sheet): 280ms. Page transitions: 0ms (no crossfade — instant navigation feels faster on content sites).

**4. Easing is always ease-out.**
`cubic-bezier(0.16, 1, 0.3, 1)` for lift animations (fast lift, slow settle). Standard `ease-out` for color/opacity fades. Never `linear` for user-visible transitions.

**5. No entrance animations on page load.**
Do not animate content in on scroll or page arrival. The target audience is older community members. Motion should respond to interaction, not play unsolicited. Exception: a single subtle fade-in on the hero text (`opacity: 0 → 1, 400ms ease-out, 100ms delay`) is acceptable if Scott requests it — but not default.

**Easing tokens to add to `globals.css`:**

```css
:root {
  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
}
```

**Implementation Notes (Motion):** All animation is via Tailwind `transition-*` utilities. No JS animation libraries. `tw-animate-css` is already installed — use it only for the dialog/sheet entrance (already standard shadcn behavior). Do not add Framer Motion.

---

## 8. Mobile Breakpoint Considerations

### Breakpoints in Use

- `sm`: 640px — grid collapses, font sizes scale down
- `md`: 768px — nav condenses
- `lg`: 1024px — full desktop layout

### Key Mobile Moves

**Navigation (mobile):**
- Current nav: unknown — check `(public)/layout.tsx`. If a hamburger sheet is present, it should open full-screen (`inset-0`, `z-50`) with the CTA buttons stacked vertically in the sheet, full width.
- Sticky top nav on mobile: `sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/60`. This keeps the "Donate" and "Register" buttons accessible while scrolling.

**Hero typography:**
- `h1`: `text-4xl` (36px) on mobile → `text-5xl` on sm → `text-7xl` on lg.
- The current `text-5xl sm:text-7xl` misses a mobile step — change to `text-4xl sm:text-5xl lg:text-7xl`.
- Overline: stays 11px on all breakpoints (already small enough).
- CTA buttons: stack vertically on mobile (`flex-col sm:flex-row`). Current `flex-wrap` works but `flex-col` is cleaner on very small screens.

**Sticky CTA bar (mobile only):**
A persistent bottom bar on mobile (`fixed bottom-0 inset-x-0 sm:hidden z-30 bg-background border-t border-border/60 px-4 py-3`) with two equal-width buttons: "Register" (teal) and "Donate" (purple). This removes the need for users to scroll back to the hero CTAs.

- Height: 64px total (button `h-11`, 8px padding top/bottom)
- Body padding on mobile: add `pb-16 sm:pb-0` to the root layout body when the sticky bar is active — prevents content from hiding behind the bar
- The bar hides on `sm:` and up — it is mobile-only

**Stats block:**
- Mobile: single column stack, `gap-10`. Current `sm:grid-cols-3` is correct — add `gap-10` for single-column spacing.

**Feature grid:**
- Mobile: single column. Current `sm:grid-cols-2` is correct.
- The `gap-px bg-border` technique works on mobile — cell borders create natural separation.

**Cards:**
- Full width on mobile, min-width 280px on desktop grid.

**Sponsor wall:**
- 2-column grid on mobile, 4-column on desktop.

**Implementation Notes (Mobile):**
Priority changes: (1) hero h1 responsive scale, (2) sticky bottom CTA bar, (3) nav sticky + backdrop blur. The sticky CTA bar is the highest-impact mobile change — it dramatically improves conversion for mobile visitors who don't scroll back up.

---

## Appendix A: Tailwind Class Cheat Sheet for Bolt

These are the new utility patterns Sprint 6 introduces. Use consistently.

| Pattern | Classes |
|---|---|
| Section overline | `font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-primary` |
| Section heading | `font-display text-3xl sm:text-[1.75rem] font-semibold text-foreground` |
| Body paragraph | `font-sans text-[0.9375rem] leading-[1.65] text-muted-foreground` |
| Stat number | `font-display text-5xl font-bold text-foreground` |
| CTA teal (hero) | `rounded-none bg-brand px-8 text-[0.8125rem] uppercase tracking-wider text-white hover:bg-brand-dark shadow-xs hover:shadow-sm hover:-translate-y-px transition-[background-color,box-shadow,transform] duration-150` |
| CTA purple (hero) | `rounded-none bg-purple px-8 text-[0.8125rem] uppercase tracking-wider text-purple-foreground hover:bg-purple-hover shadow-xs hover:shadow-sm hover:-translate-y-px transition-[background-color,box-shadow,transform] duration-150` |
| Card default | `shadow-sm border border-border/60 hover:shadow-md hover:-translate-y-0.5 transition-[box-shadow,transform] duration-200` |
| Tabular scores | `font-mono tabular-nums lining-nums` |

---

## Appendix B: Deferred to Sprint 7

### Sponsor Wall (Sprint 7, /sponsors page)

When implemented, use a grid of sponsor logo cells with:

- White card, `shadow-sm`, `border border-border/60`, `rounded-lg`, `p-6`
- Logos in grayscale at rest (`filter: grayscale(1) opacity(0.6)`), full color on hover
- Tier labels (Gold, Silver, Bronze) in Inter overline style
- 2-column grid on mobile, 4-column on desktop

Not in Sprint 6 scope. Scott approves scope before Sprint 7 begins.

---

## Acceptance Criteria

- [ ] Body font is Inter (not Geist Sans) across all public pages — verify in browser DevTools computed styles
- [ ] Heading/display font is Fraunces (not Playfair Display or Geist Sans) — verify h1, h2, h3, stat number computed styles
- [ ] `--radius` is `0.375rem` in `:root`
- [ ] Shadow tokens (`--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`) exist in `:root` and `@theme inline`
- [ ] Neutral tokens (`--neutral-50`, `--neutral-100`, `--neutral-400`) and state tokens (`--success`, `--success-muted`, `--warning`, `--warning-muted`) added to `:root`
- [ ] Card component has `shadow-sm border border-border/60` (not `ring-1`)
- [ ] Button `size: lg` is `h-11 px-6 text-[0.9375rem]`
- [ ] Sticky bottom CTA bar visible on mobile (< 640px), hidden on sm+
- [ ] Hero h1 breakpoints: `text-4xl sm:text-5xl lg:text-7xl`
- [ ] Impact stats section background is `bg-neutral-50` (not `bg-white`)
- [ ] Get Involved section background is `bg-neutral-50` (not `bg-[#F1F4F6]`)
- [ ] Feature grid h3 has `group-hover:text-primary transition-colors duration-150`
- [ ] Logo in hero at `opacity-85` (not `opacity-60`)
- [ ] `tsc` clean, no new lint warnings
- [ ] All existing Playwright + Vitest tests pass
- [ ] Mobile sticky bar does not obscure content — body has `pb-16 sm:pb-0`
