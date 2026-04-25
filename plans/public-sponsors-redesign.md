# Design Spec: Public Sponsors Page Redesign

**File:** `src/app/(public)/sponsors/page.tsx`
**Branch context:** main @ 402ba3e
**Date:** 2026-04-20

---

## 1. Current State Critique

### Header (page.tsx:38–51)
Solid `bg-[#1A2E3A]` block with no photo, no grain overlay, no texture. Every other interior page (sponsorships, formerly gallery) uses the same `bg-[#1A2E3A] px-4 py-20 sm:py-28` treatment — the header is copy-paste boilerplate. The homepage hero uses `grain-overlay` + a background photo with a dark overlay (`bg-[#1A2E3A]/80`). The sponsors header is a stripped-down version with none of that texture. It reads like a placeholder. The `.grain-overlay` utility exists in globals.css and is unused here.

The overline reads "Thank You" (page.tsx:40) and the h1 reads "Our Sponsors." Both are flat statements. No warmth. No acknowledgment of what these organizations actually did — funded cancer care for real people. The copy undersells the emotional weight of the page.

### Tier Structure (page.tsx:56–122)
All tiers use the identical composition: centered h2 in `font-display text-xl`, a 12px wide teal rule (`w-12 bg-primary`), then a `grid-cols-2 sm:gap-6 lg:grid-cols-4`. Champion (top donor tier) and Shot of the Day (bottom tier) render identically except for the tier title. This is the single biggest visual problem. Hierarchy is real — there's a meaningful donation-value spread across tiers — and the layout communicates none of it.

The `mb-16` gap between tiers (page.tsx:62) is generous in amount but has no visual anchor. A reader scanning the page can't feel the tier boundaries; they blend into one homogeneous grid.

### Logo Card (page.tsx:74–96)
`bg-white shadow-xs` + `[filter:grayscale(1)_opacity(0.6)]` hover-to-color. Technically competent, aesthetically generic — this is the default SaaS sponsor wall treatment. The grayscale approach reads as "we are being tasteful" but on a charity page it reads more as "muted." The hover color reveal works, but it only activates on desktop hover; on mobile every logo is permanently dimmed to 60% opacity. Sponsors who paid to be featured are rendered at reduced visibility on the device most likely to be used at the event.

The card interior uses `font-sans text-[0.75rem]` for the sponsor name (page.tsx:89) and `font-sans text-[0.6875rem] italic` for the tier label (page.tsx:92). Small, low-contrast, and redundant — the tier label is already communicated by the section header directly above.

### Text-Fallback Card (page.tsx:97–111)
`bg-neutral-50 shadow-xs` box with sponsor name in `font-sans text-sm font-medium`. This is the treatment for the 3 sponsors with no logo. It's fine as emergency fallback, but it looks like a loading-skeleton ghost. On a page that is supposed to honor these organizations, the nameless boxes feel like admin data entry artifacts that leaked to production.

### CTA Section (page.tsx:133–151)
`bg-neutral-50 border-t` with h2 "Become a Sponsor" and a single `LinkButton`. The copy is functional ("Join these organizations in supporting cancer patients") but framing sponsorship as "joining" a list rather than as an act of impact is a missed opportunity. The button links to `/sponsorships` which is correct, but the surrounding composition (centered text + one button on a light grey stripe) is the lowest-effort CTA pattern in the codebase.

### Query Bugs (page.tsx:23–27)
- Missing `.is("deleted_at", null)` — deleted sponsors show on the public page.
- Missing `.eq("is_active", true)` — inactive sponsors show on the public page.
Both bugs confirmed in the current query; Sprint 20 fixed these on the admin side but not here.

### Image Config Bug (next.config.ts:5–21)
`images.squarespace-cdn.com` absent from `remotePatterns`. 5 of 15 active sponsors have Squarespace CDN logo URLs that Next Image will block with a 400. Logs show these as broken images; users see missing image boxes.

---

## 2. Design Direction: Editorial / Commemorative

**One direction. Not a menu.**

The Craven Cancer Classic has been running for 15+ years, raised $450K, and is held in memory of specific named people. This isn't a SaaS conference sponsor wall — it's a record of community generosity. The page should feel like a program booklet for a charity event, not a startup marketing page.

**Visual language:** Editorial warmth. Cream background with grain (already used on the homepage mission section). Fraunces for all display text, including sponsor names. Teal rule as structural divider. No grayscale logos — sponsors are honored, not grayed out. Tier hierarchy through scale and layout density, not color coding.

**Header:** Switch from flat `bg-[#1A2E3A]` to `bg-cream grain-overlay` with `--foreground` (#1A2E3A) text. This anchors the page to the homepage's cream/grain aesthetic. The overline becomes "In Gratitude" — more ceremonial than "Thank You." The h1 stays "Our Sponsors." A thin horizontal rule in `--brand` (#5797a6) below the subhead acts as the opening ornament. No dark hero box on this page — the homepage hero already established that register; the sponsors page should land softer.

**Tier hierarchy — four distinct treatments:**

Champion (4 sponsors, top tier):
- Full-width featured layout. Two columns of large cards on desktop, single column on mobile.
- Card: cream background, `border border-border` at `rounded-lg`, no shadow. A thin teal left-border accent (`border-l-4 border-brand`). Logo rendered at full color, `height: 96px`. Sponsor name in `font-display text-base font-semibold` below the logo. No tier label — Champion cards stand alone.
- Section header uses `font-display text-3xl` with a long full-width `h-px bg-brand` rule spanning the full container width, not the 48px stub.

Eagle (5 sponsors):
- 3-column grid on desktop, 2-column on mobile.
- Card: white background, `border border-border/60 rounded-md`. Logo full color at `height: 72px`. Sponsor name in `font-display text-sm`.
- Section header uses `font-display text-2xl` with a 64px teal rule.

Morning Biscuit (1 sponsor):
- Centered single card at a medium fixed width (~320px on desktop).
- Same card treatment as Eagle. Centering gives it dignity without over-inflating it visually.
- Section header uses `font-display text-xl` with a 40px teal rule.

Shot of the Day (multiple sponsors, lowest tier):
- Compact horizontal row layout. 4-5 per row on desktop, 2 per row on mobile.
- Cards are shorter — `min-h-[5rem]` instead of the current `min-h-[7rem]`. Logo at `height: 48px`.
- Sponsor name in `font-sans text-xs`. Cards still have the border/rounded treatment but no left-accent.
- Section header uses `font-display text-lg` with a 32px teal rule.

**Text-fallback card (null logo_url):**
Replace `bg-neutral-50` with `bg-cream`. The sponsor name gets `font-display text-base font-semibold text-foreground`. No tier italic label inside the card — it's already communicated by the section. Add a thin ornamental horizontal rule in brand-muted above the name (`w-8 h-px bg-brand-muted mx-auto mb-3`). This reads as a name plate rather than a broken card.

**Tier dividers:**
Replace `mb-16` between tiers with a full-bleed structural separator: a `border-t border-border/40 pt-16 mt-0` pattern. The divider makes the tier boundary explicit and the vertical rhythm consistent.

**CTA Section:**
Switch background to `bg-[#1A2E3A] grain-overlay` (dark + grain, matching the sponsorships page header). White text. The h2 becomes two lines via a line break: "Make It Possible / For Someone Fighting Right Now." The supporting copy leads with the human outcome, not the organization benefit. Button remains the same component, styled `bg-brand text-white hover:bg-brand-dark`.

---

## 3. Component Inventory

| File | Change | Type |
|---|---|---|
| `src/app/(public)/sponsors/page.tsx` | Full redesign — header, tier loop, CTA, query fixes | Modify |
| `src/components/public/sponsor-card.tsx` | New component — handles logo/text variants, tier size prop | New |
| `next.config.ts` | Add `images.squarespace-cdn.com` to remotePatterns | Bug fix |

### `<SponsorCard>` Component API

```typescript
type TierSize = "champion" | "eagle" | "standard" | "compact";

interface SponsorCardProps {
  sponsor: {
    id: string;
    name: string;
    logo_url: string | null;
    website: string | null;
  };
  tierSize: TierSize;
  testID?: string;
}
```

`tierSize` drives:
- Logo container height: `champion` → 96px, `eagle` → 72px, `standard` → 56px, `compact` → 48px
- Card min-height, padding, name font size, and left-border accent (champion only)
- Logo is always full color — no grayscale filter

The component handles both logo and text-fallback variants internally. If `logo_url` is null, render the name-plate treatment (cream bg, ornamental rule, Fraunces name). If `logo_url` is present but `website` is null, render as a non-interactive `div` instead of `<a>`.

### Tier-to-size mapping in page.tsx

The page needs a `TIER_SIZE_MAP` that maps tier `sort_order` to `TierSize`:

```typescript
const TIER_SIZE_MAP: Record<number, TierSize> = {
  1: "champion",  // sort_order 1 = Champion
  2: "eagle",     // sort_order 2 = Eagle
  3: "standard",  // sort_order 3 = Morning Biscuit
  4: "compact",   // sort_order 4 = Shot of the Day
};
```

Fallback to `"standard"` for any unknown sort_order.

### Tier-to-grid mapping

```typescript
const TIER_GRID_MAP: Record<TierSize, string> = {
  champion:  "grid grid-cols-1 gap-6 sm:grid-cols-2",
  eagle:     "grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3",
  standard:  "flex justify-center",   // single card, centered
  compact:   "grid grid-cols-2 gap-3 sm:grid-cols-4",
};
```

---

## 4. Tier-Specific Treatments (Full Spec)

### Champion Section Header
```
font-display text-3xl font-semibold text-foreground
Below: w-full h-px bg-border/60 (full-width rule)
Above name: overline "Champion Sponsor" in
  font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-primary
```

### Eagle Section Header
```
font-display text-2xl font-semibold text-foreground
Below: w-16 h-px bg-brand mx-auto
```

### Morning Biscuit + Shot of the Day Section Headers
```
font-display text-xl / text-lg font-semibold text-foreground
Below: w-10 / w-8 h-px bg-brand mx-auto
```

---

## 5. Mobile Behavior (390px)

- Champion: 1-column. Full-width cards. Left-border accent stays visible.
- Eagle: 2-column grid. Logo at 64px height (slightly reduced from 72px desktop). Card names truncate with ellipsis if needed.
- Morning Biscuit: Full-width centered card. Max-width drops to 100% on mobile.
- Shot of the Day: 2-column grid. Compact treatment works at this density.
- Tier section headers: all centered on mobile. Full-width rule on Champion section becomes `w-full` (already is).
- CTA section: stacks vertically. Button goes full-width `w-full sm:w-auto`.
- Grayscale removal: all logos are full color at all breakpoints. No mobile penalty.

---

## 6. Prioritized Fix List

| # | Severity | Item | File | Effort | Shared? |
|---|---|---|---|---|---|
| 1 | P0 Bug | Add `images.squarespace-cdn.com` to `remotePatterns` — 5 logos currently broken | `next.config.ts` | 5 min | No |
| 2 | P0 Bug | Add `.is("deleted_at", null)` and `.eq("is_active", true)` to sponsors query | `sponsors/page.tsx:23–27` | 5 min | No |
| 3 | P1 Visual | Remove grayscale filter — logos are permanently dimmed on mobile | `sponsors/page.tsx:86` | 10 min | No |
| 4 | P1 Visual | Tier hierarchy — Champion/Eagle/compact layouts replacing uniform 4-col grid | `sponsors/page.tsx` + new `sponsor-card.tsx` | 2–3 hr | `sponsor-card.tsx` |
| 5 | P2 Visual | Header: switch from flat dark block to cream+grain, update copy to "In Gratitude" | `sponsors/page.tsx:38–51` | 30 min | No |
| 6 | P2 Visual | Text-fallback name-plate treatment (cream bg, Fraunces, ornamental rule) | `sponsor-card.tsx` | 30 min | No |
| 7 | P2 Visual | CTA: dark+grain background, copy rewrite with human-outcome lead | `sponsors/page.tsx:133–151` | 30 min | No |

Items 1 and 2 are strict bugs and should ship immediately in a standalone PR regardless of the visual redesign.
Items 3–7 are the visual redesign sprint.

---

## TestIDs

| Element | testID |
|---|---|
| Sponsors page container | `sponsors-page` |
| Page header section | `sponsors-header` |
| Tier section (per tier) | `tier-section-{tier.id}` |
| Tier heading | `tier-heading-{tier.id}` |
| Sponsor card (logo variant) | `sponsor-card-logo-{sponsor.id}` |
| Sponsor card (text variant) | `sponsor-card-text-{sponsor.id}` |
| Sponsor logo image | `sponsor-logo-{sponsor.id}` |
| CTA section | `sponsors-cta` |
| CTA button | `sponsors-cta-button` |

---

## Acceptance Criteria

1. No broken image boxes — all 15 active sponsors with logo URLs render their logo without Next Image errors in browser console.
2. Deleted sponsors (`deleted_at IS NOT NULL`) do not appear on the page.
3. Inactive sponsors (`is_active = false`) do not appear on the page.
4. Champion-tier cards are visually larger than Eagle-tier cards. Eagle-tier cards are visually larger than Shot of the Day cards.
5. All sponsor logos render at full color — no grayscale filter at any breakpoint.
6. Text-fallback cards (null logo_url) use `bg-cream` and `font-display` for the sponsor name, not `bg-neutral-50` and `font-sans`.
7. Page header uses `bg-cream grain-overlay` with `--foreground` text, not `bg-[#1A2E3A]`.
8. CTA section uses `bg-[#1A2E3A] grain-overlay` with white text.
9. At 390px viewport width, no tier section overflows horizontally.
10. `data-testid` attributes present on all elements listed in the TestIDs table above.
