# Sprint 22 — Sponsors Page Redesign (Marquee Direction)

**Status:** Planning — awaiting Scott + Forge approval before Spec/Bolt spawn.
**Design reference:** `design-explorations/sponsors-redesign-2026-04-25/direction-marquee/`
**Target:** Replace the current `/sponsors` page with the approved Marquee direction.

---

## Goals

Replace the `/sponsors` page with the Marquee design: dark-teal masthead with stat row, populated-tier sections (no empty tiers), consolidated Open Sponsorships chip block, and bottom individual-donor CTA repointed to `/donate`.

Add `lifetime_raised_cents` column to `event_settings` and surface it as the third masthead stat. Admin edits it at `/admin/event`.

## Non-Goals

- `/sponsorships` page layout is untouched. Chips link to `/sponsorships` root; deep-link anchors (`/sponsorships#category-slug`) are a follow-up sprint.
- Fraunces font removal from the project is out of scope (other pages may still use it).
- No changes to Stripe payment flow, registration, leaderboard, or any admin page except `/admin/event`.
- No changes to the `sponsors` or `sponsorship_items` tables.

---

## PR Structure

Two PRs, merged in sequence.

**PR A — Schema + Admin** (Flux)
- Migration: add `lifetime_raised_cents` to `event_settings`
- Admin form: add the new field to `/admin/event`
- No changes to the public `/sponsors` page
- If PR B is delayed, the masthead gracefully omits stat 3 when the column is null

**PR B — Sponsors Page Redesign** (Bolt)
- Full replacement of the public `/sponsors` page consuming all four locked decisions
- Depends on PR A being merged and deployed (Supabase prod migration applied)

Rationale: the migration ships and verifies in isolation. If PR B has any issue, the live site isn't broken — stat 3 just renders nothing until the UI lands.

---

## Schema Change

### Prod verification (2026-04-25)

Queried prod via `mcp__supabase-craven__execute_sql`. Current `event_settings` columns:

```
id                    uuid        NOT NULL  gen_random_uuid()
name                  text        NOT NULL  'Craven Cancer Classic'
description           text        NULL
morning_slots         integer     NOT NULL  0
afternoon_slots       integer     NOT NULL  0
morning_cap           integer     NOT NULL  36
afternoon_cap         integer     NOT NULL  36
registration_open     boolean     NOT NULL  false
year                  integer     NOT NULL  EXTRACT(year FROM now())
hero_image_url        text        NULL
updated_at            timestamptz NOT NULL  now()
registration_fee_cents bigint     NOT NULL  70000
tournament_start_date  date       NULL
tournament_end_date    date       NULL
venue_name            text        NULL
```

`lifetime_raised_cents` does NOT exist. Migration is required.

### Migration SQL

Filename: `20260425000001_event_settings_lifetime_raised.sql`

```sql
-- Add lifetime_raised_cents to event_settings
-- Tracks cumulative dollars raised since the tournament's founding (2010).
-- Nullable; UI omits the stat gracefully when null.
-- Admin sets this manually via /admin/event.

ALTER TABLE public.event_settings
  ADD COLUMN lifetime_raised_cents bigint NULL;

COMMENT ON COLUMN public.event_settings.lifetime_raised_cents IS
  'Cumulative amount raised across all years, in cents. Null = not yet set. Displayed as the third masthead stat on /sponsors.';
```

No ON CONFLICT, no views, no functions reference this column. Safe to add.

---

## Admin Form Update

**Files touched by PR A:**

| File | Change |
|---|---|
| `supabase/migrations/20260425000001_event_settings_lifetime_raised.sql` | CREATE (new migration) |
| `src/types/database.ts` | Regenerate after migration applies, OR manually add `lifetime_raised_cents: number \| null` to the `event_settings` Row/Update/Insert types |
| `src/app/admin/event/actions.ts` | Parse + upsert `lifetime_raised_cents` from FormData |
| `src/app/admin/event/event-settings-form.tsx` | Add field to the "Tournament Details" card |

### actions.ts change

In `updateEventSettings`, add after the existing fee parsing:

```ts
const lifetimeRaisedRaw = formData.get("lifetime_raised_cents") as string;
const lifetimeRaisedDollars = lifetimeRaisedRaw ? parseFloat(lifetimeRaisedRaw) : null;
if (lifetimeRaisedDollars !== null && (isNaN(lifetimeRaisedDollars) || lifetimeRaisedDollars < 0)) {
  return { error: "Invalid lifetime raised amount" };
}
```

Add to the `updates` object:

```ts
lifetime_raised_cents: lifetimeRaisedDollars !== null
  ? Math.round(lifetimeRaisedDollars * 100)
  : null,
```

### event-settings-form.tsx change

Add a new field inside the "Tournament Details" card, below the description textarea:

```tsx
<div className="space-y-1.5">
  <Label htmlFor="lifetime_raised_cents">Lifetime Raised (USD)</Label>
  <Input
    id="lifetime_raised_cents"
    name="lifetime_raised_cents"
    type="number"
    step="0.01"
    min="0"
    defaultValue={
      settings?.lifetime_raised_cents != null
        ? (settings.lifetime_raised_cents / 100).toFixed(2)
        : ""
    }
    placeholder="580000.00"
    aria-describedby="lifetime-raised-hint"
  />
  <p id="lifetime-raised-hint" className="mt-1 font-sans text-[0.75rem] text-muted-foreground">
    Cumulative amount raised since 2010. Displayed on the public sponsors page. Leave blank to hide the stat.
  </p>
</div>
```

---

## Token Addition

**File:** `src/app/globals.css`

Current tokens confirmed by code read. `--brand-darker` does NOT exist. Add it to `:root` after `--brand-dark`:

```css
--brand-darker: #244A5B;
```

Also add to `@theme inline` block:

```css
--color-brand-darker: var(--brand-darker);
```

No dark-mode override needed — `--brand-darker` is used for the masthead and Open Sponsorships block which are always dark-on-dark teal (explicit background color, not a semantic theme token).

---

## Component Breakdown (PR B)

### Tier-size mapping logic

Hardcoded pure function, lives in the page or a shared util. Extract it so Spec can unit-test it independently.

```ts
// src/lib/sponsors-utils.ts  (NEW)
export type TierSize = "champion" | "eagle" | "standard" | "compact";

export function getTierSize(sortOrder: number, sponsorCount: number): TierSize {
  let base: TierSize;
  if (sortOrder === 1) base = "champion";
  else if (sortOrder === 2) base = "eagle";
  else base = "standard";

  // Compact override: any tier with >6 sponsors regardless of base bucket
  if (sponsorCount > 6) return "compact";
  return base;
}
```

### Lifetime-raised formatting utility

```ts
// src/lib/sponsors-utils.ts  (same file)
export function formatLifetimeRaised(cents: number | null): string | null {
  if (cents === null || cents === 0) return null;
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M+`;
  if (dollars >= 1_000) return `$${Math.round(dollars / 1_000)}K+`;
  return `$${dollars.toLocaleString()}`;
}
```

### Files created / modified / deleted

| File | Action | PR |
|---|---|---|
| `supabase/migrations/20260425000001_event_settings_lifetime_raised.sql` | CREATE | A |
| `src/types/database.ts` | MODIFY (add column to type) | A |
| `src/app/admin/event/actions.ts` | MODIFY | A |
| `src/app/admin/event/event-settings-form.tsx` | MODIFY | A |
| `src/app/globals.css` | MODIFY (add `--brand-darker` token) | B |
| `src/lib/sponsors-utils.ts` | CREATE (tier-size + format utils) | B |
| `src/components/public/sponsors-masthead.tsx` | CREATE | B |
| `src/components/public/open-sponsorships-block.tsx` | CREATE | B |
| `src/components/public/sponsor-card.tsx` | REPLACE (full rewrite, same filename) | B |
| `src/app/(public)/sponsors/page.tsx` | REPLACE (full rewrite, same filename) | B |

### SponsorsMasthead component

`src/components/public/sponsors-masthead.tsx` — Server component, receives props, no client state.

Props:
```ts
interface SponsorsMastheadProps {
  year: number;
  partnerCount: number;
  lifetimeRaisedCents: number | null;
}
```

Renders:
- Eyebrow: "Our Partners" (small caps, teal, with a 28px horizontal rule before it)
- H1: `{year} Partners` — Manrope 800, `clamp(3.5rem, 11vw, 8rem)`, uppercase, tight tracking
- Body copy: "The organizations and individuals who make the Craven Cancer Classic possible. Their support funds transportation, lodging, and treatment for patients in our community." — max 44ch, `rgba(255,255,255,0.82)`
- Stat row (3 cells):
  - `{partnerCount}` / "2026 Partners"
  - `{year - 2010}` / "Years Running"
  - `{formatLifetimeRaised(lifetimeRaisedCents)}` / "Raised to Date" — omit the entire stat cell if `formatLifetimeRaised` returns null
- Background: `var(--brand-darker)` with two radial-gradient overlays (teal highlights, per preview CSS)
- Entrance: `fadeUp` CSS animation — already defined in `globals.css`

### SponsorCard component (rewrite)

`src/components/public/sponsor-card.tsx` — full rewrite of current file. Drops: tier strips, gold diamonds, double rules, Fraunces opsz patron dance, cream background, grain overlay.

New card structure:
- `<CardWrapper>` (keep the existing `<a>` vs `<div>` wrapper logic based on `sponsor.website`)
- White background, `1px solid var(--border)` border
- Hover: `translateY(-2px)` + `box-shadow`, plus a 2px `var(--brand)` accent line that `scaleX(0 → 1)` on hover via `::after` pseudo-element
- Logo region: fixed aspect-ratio div keyed by `data-tier`, `object-contain` at `82%/72%` bounds
  - `data-tier="champion"` → `aspect-ratio: 16/11`, padding 2rem
  - `data-tier="eagle"` → `aspect-ratio: 4/3`, padding 1.5rem
  - `data-tier="standard"` → `aspect-ratio: 4/3`, padding 1.125rem 1rem
  - `data-tier="compact"` → `aspect-ratio: 3/2`, padding 0.875rem 0.75rem
- Patron fallback (`logo_url IS NULL`): render `<span>` with `font-weight: 800`, centered, `letter-spacing: -0.025em`, `line-height: 1`, responsive `font-size` by tier:
  - champion: `clamp(2rem, 4.5vw, 2.75rem)`
  - eagle: `1.875rem`
  - standard/compact: `1.25rem`
- No sponsor name label under the logo (dropped per round-1 design review)

New `TierSize` type export: `"champion" | "eagle" | "standard" | "compact"` (unchanged, imported from `src/lib/sponsors-utils.ts`).

### OpenSponsorshipsBlock component

`src/components/public/open-sponsorships-block.tsx` — Server component.

Props:
```ts
interface OpenSponsorshipsBlockProps {
  items: Array<{ id: string; name: string; price_cents: number }>;
}
```

Renders:
- Full-width gradient card: `background: linear-gradient(135deg, var(--brand-darker) 0%, var(--brand-dark) 100%)`
- Decorative radial overlay (top-right, teal, per preview CSS)
- Intro heading: "There's still room to back the {year} tournament." — Manrope 800, 1.875rem, white
- Intro body copy: "{N} categories are still open, with multiple slots available in most. From premier packages to high-visibility add-ons, every level puts your organization in front of every player and family on the course."
  - **Aria to refine** — this is the placeholder copy from the preview. Aria must approve final wording before merge.
- Chip grid: one chip per item, `name` + `"From $X"` (price_cents / 100, no cents if round dollar)
  - Each chip `href="/sponsorships"` — no deep link yet
- Primary CTA: `"Browse all sponsorships →"` — white button, `href="/sponsorships"`, hover turns teal

### sponsors/page.tsx (rewrite)

`src/app/(public)/sponsors/page.tsx` — full replacement.

Data fetching changes:
1. Fetch `event_settings` for current year (add `lifetime_raised_cents` to the select)
2. Fetch `sponsorship_items` where `deleted_at IS NULL` and `active = true`, ordered by `sort_order`
3. Fetch `sponsors` where `year = currentYear` AND `is_active = true` AND `deleted_at IS NULL`, ordered by `display_order`
4. Compute:
   - `populatedTiers` — items that have >= 1 active sponsor
   - `openItems` — items that have 0 active sponsors
   - For each populated tier: `getTierSize(tier.sort_order, sponsors.length)`

Render order:
1. `<SponsorsMasthead>` (outside `<main>`)
2. `<main>` — `max-width: 80rem`, centered, horizontal padding
3. For each populated tier: tier section with header (`tier-name` + count badge) + `partner-grid` of `<SponsorCard>` components
4. If `openItems.length > 0`: `<OpenSponsorshipsBlock items={openItems} />`
5. Bottom CTA section (see below)

### Bottom CTA

Inline in `page.tsx` (no extracted component — it's a single location). Changes vs current:
- `href` changes from `/sponsorships` to `/donate`
- Eyebrow: "Give to the Mission"
- Heading: "Make it possible for someone fighting right now."
- Body: existing copy is fine as a starting point — **Aria to approve final wording** with the individual-donor framing (emphasize "give as an individual", not a business sponsorship)
- Button label: "Donate →" (Aria to confirm)
- Background: `var(--brand-darker)` (currently `#1A2E3A` — update to the token)

---

## Acceptance Criteria

All criteria are verifiable by loading the live `/sponsors` page after deploy.

### Masthead
1. The masthead background uses `#244A5B` (brand-darker) with the two radial-gradient overlays
2. H1 reads "{current year} Partners" in Manrope 800 uppercase
3. Stat 1 shows the count of active non-deleted sponsors for current year
4. Stat 2 shows `{current year} - 2010` = "16" for 2026
5. Stat 3 shows the formatted `lifetime_raised_cents` value (e.g. "$580K+") when the column is non-null
6. Stat 3 is absent from the DOM when `lifetime_raised_cents` IS NULL in the database

### Tier sections
7. Only tiers with >= 1 active non-deleted sponsor render as tier sections (no empty-tier sections)
8. With current data: exactly 4 tier sections render (Champion × 4, Eagle × 5, Thursday Night × 1, Morning Biscuit × 1)
9. The Champion section renders a 2-column grid (desktop)
10. The Eagle section renders a 3-column grid (desktop)
11. Thursday Night and Morning Biscuit render 4-column grids (1 card each, left-aligned)
12. If any tier acquires >6 sponsors, its grid switches to 6-column compact layout
13. Tier section headers show the `sponsorship_items.name` value exactly (no "Tier" suffix, no "Partners" suffix)
14. Tier section headers show a count badge: `"{N} · {year} Season"`

### Sponsor cards
15. All active sponsors with `logo_url` render `<img>` inside the card logo region
16. Mike Evans (champion, `logo_url IS NULL`) renders a centered `<span>` with his name in Manrope 800, no `<img>` element
17. Sponsor cards with a `website` value render as `<a href="{website}" target="_blank" rel="noopener noreferrer">`
18. Sponsor cards without a `website` render as a non-interactive `<div>`
19. Card hover: `translateY(-2px)` lift and teal accent line visible at bottom of card

### Open Sponsorships block
20. The Open Sponsorships block renders after the last populated tier section
21. The block contains exactly 6 chips (Golf Gift, Celebration Lunch, Golf Carts, Bloody Mary, Wall Sponsor, Shot of the Day) — matching current prod data
22. Each chip shows the tier name and "From $X" where X is `price_cents / 100` formatted as whole dollars
23. All chips link to `/sponsorships`
24. The "Browse all sponsorships →" CTA links to `/sponsorships`
25. Tiers with `deleted_at IS NOT NULL` (the 3 soft-deleted rows) do NOT appear as chips

### Bottom CTA
26. The bottom CTA button links to `/donate` (not `/sponsorships`)
27. The button label is "Donate →" (or Aria-approved variant)

### Admin
28. `/admin/event` renders a "Lifetime Raised (USD)" numeric input field
29. Saving a value persists to `event_settings.lifetime_raised_cents` and reflects on `/sponsors` after reload
30. Saving an empty value sets `lifetime_raised_cents` to null (stat 3 disappears from `/sponsors`)

---

## Test Coverage (Spec — RED phase first)

Spec writes failing tests before Bolt writes a line of implementation.

### Unit tests — `src/lib/__tests__/sponsors-utils.test.ts` (NEW)

`getTierSize`:
1. `sort_order=1, count=1` → `"champion"`
2. `sort_order=2, count=1` → `"eagle"`
3. `sort_order=3, count=1` → `"standard"`
4. `sort_order=99, count=1` → `"standard"` (any sort_order > 2)
5. `sort_order=1, count=7` → `"compact"` (compact override >6)
6. `sort_order=2, count=7` → `"compact"`
7. `sort_order=1, count=6` → `"champion"` (boundary: exactly 6 is NOT compact)

`formatLifetimeRaised`:
8. `null` → `null`
9. `0` → `null`
10. `58000000` ($580,000) → `"$580K+"`
11. `1500000000` ($15,000,000) → `"$15.0M+"`
12. `50000` ($500) → `"$500"`

### Component tests — `src/components/public/__tests__/sponsor-card.test.tsx` (NEW)

13. Renders `<img>` when `logo_url` is set
14. Renders patron name `<span>` when `logo_url` is null
15. Renders as `<a>` with correct href when `website` is set
16. Renders as `<div>` when `website` is null
17. `data-testid="sponsor-card-{id}"` is present
18. `data-testid="patron-name"` present when logo_url is null
19. `data-testid="patron-name"` absent when logo_url is set

### Component tests — `src/components/public/__tests__/open-sponsorships-block.test.tsx` (NEW)

20. Renders one chip per item in props
21. Each chip shows the item name
22. Each chip shows "From $X" formatted correctly (e.g. $2,500 → "From $2,500")
23. Each chip href is "/sponsorships"
24. "Browse all sponsorships →" CTA is present with href "/sponsorships"
25. Renders no chips when items array is empty

### Integration tests — `src/app/(public)/sponsors/__tests__/sponsors-page.test.tsx` (MODIFY or CREATE)

26. With current mock data: exactly 4 tier sections render (Champion, Eagle, Thursday Night, Morning Biscuit)
27. Tier sections with 0 active sponsors do NOT render as tier sections
28. Open Sponsorships block renders with 6 chips (mock the 6 empty-but-active tiers)
29. Soft-deleted tiers (deleted_at IS NOT NULL) appear neither as tier sections nor as chips
30. Masthead stat 3 renders when `lifetime_raised_cents` is non-null
31. Masthead stat 3 is absent from DOM when `lifetime_raised_cents` is null
32. Bottom CTA button href is "/donate"
33. Champion tier renders `partner-grid--champion` class (2-up grid)
34. Eagle tier renders `partner-grid--eagle` class (3-up grid)
35. Standard tier renders `partner-grid--standard` class (4-up grid)
36. Any tier with >6 sponsors renders `partner-grid--compact` class

### Admin form test — `src/app/admin/event/__tests__/event-settings-form.test.tsx` (MODIFY)

37. Renders "Lifetime Raised (USD)" label and input
38. Input pre-populates with `lifetime_raised_cents / 100` when non-null
39. Input is empty when `lifetime_raised_cents` is null

Coverage target: 50%+ for new files. Unit tests for `sponsors-utils.ts` will hit 100%. Page integration tests and card component tests are the load-bearing coverage.

---

## Dependency Map

```
Phase 1 (PR A — serial internal, Flux):
  Migration file (no file overlap with anything)
  → types/database.ts update
  → actions.ts update
  → event-settings-form.tsx update
  All in one PR, Flux owns it end to end.

Phase 2 (PR B — after PR A merged + migration applied to prod, Bolt):
  globals.css + sponsors-utils.ts + sponsors-masthead.tsx
  + open-sponsorships-block.tsx + sponsor-card.tsx + sponsors/page.tsx
  All in one PR, Bolt owns it end to end.

Spec runs in parallel with Bolt (Phase 2):
  Writes failing tests for all PR B components before Bolt starts GREEN work.
  Spec touches only __tests__/ files — no overlap with Bolt's component files.
```

File conflict zones: none. PR A and PR B touch completely different files. Spec's test files don't overlap with Bolt's component files.

---

## Execution Order

1. Forge spawns Spec (RED phase for PR B tests — can start now, doesn't need PR A)
2. Forge spawns Flux (PR A: migration + admin form)
3. PR A merges → Forge applies migration to prod Supabase
4. Forge spawns Bolt (PR B: full page redesign, consumes prod-applied column)
5. Watchdog reviews PR B
6. PR B merges → Vercel auto-deploys
7. Forge verifies live `/sponsors` page

---

## Effort Estimates

| Work | Owner | Size | Estimate |
|---|---|---|---|
| PR A: migration + admin form | Flux | S | ~1.5h |
| PR B: RED tests | Spec | M | ~2h |
| PR B: page redesign (GREEN) | Bolt | M | ~3h |
| PR B: Watchdog review | Watchdog | S | ~0.5h |
| Aria: copy review (CTA + Open Sponsorships block copy) | Aria | S | ~0.5h |

**Total estimated builder time:** ~7.5h across parallel tracks. Wall-clock with parallelism: ~4–5h.

---

## Deploy + Verify Checklist

Work is NOT done at merge. Follow these steps after each PR:

**After PR A merges:**
- [ ] Confirm Vercel preview for PR A deploys cleanly (no type errors from new column)
- [ ] Apply migration to prod Supabase via `mcp__supabase-craven__apply_migration` (or confirm it applied automatically)
- [ ] Query prod: `SELECT lifetime_raised_cents FROM event_settings LIMIT 1` — should return `null` (column exists, not yet set)
- [ ] Load `/admin/event` on prod — confirm "Lifetime Raised" field renders
- [ ] Set a test value (e.g. $580,000) via admin form — confirm it saves
- [ ] Revert test value to null before PR B ships (or leave it — stat 3 will render on /sponsors once PR B deploys)

**After PR B merges:**
- [ ] Vercel auto-deploys from main
- [ ] Load `https://cravencancerclassic.com/sponsors` (or staging equivalent) — confirm masthead renders with dark teal background
- [ ] Confirm 4 tier sections render (Champion, Eagle, Thursday Night, Morning Biscuit)
- [ ] Confirm Mike Evans card renders as typeset name, not broken `<img>`
- [ ] Confirm Open Sponsorships block renders with 6 chips
- [ ] Confirm bottom CTA button points to `/donate`
- [ ] Confirm stat 3 ("Raised to Date") renders if `lifetime_raised_cents` was set in admin
- [ ] Mobile check: load at 390px width — masthead headline wraps acceptably, stat row stacks

---

## Aria Copy Gate

Before PR B can merge, Aria must approve:
1. Open Sponsorships block intro copy (heading + body)
2. Bottom CTA eyebrow, heading, body, and button label

Bolt should use placeholder text matching the preview for initial implementation. Aria reviews in parallel with Watchdog review.

---

## Risks and Open Questions (Scott's call)

### Q1 — Mike Evans cell at champion size
The typeset name treatment reads as "deliberate display moment" in the preview (same Manrope 800 family as the masthead). But next to Carolina East's full-bleed photo and Fuel Market's metallic oval logo, a typeset name may feel lighter. Decision point: is the current size (`clamp(2rem, 4.5vw, 2.75rem)`) correct, or bump to `clamp(2.5rem, 5.5vw, 3.5rem)` for more presence? Bolt uses the preview values; Scott can adjust after first deploy.

### Q2 — `#244A5B` on M3 Mini display
This is the load-bearing aesthetic question per the design README. The masthead only reads "premium dark teal" if the display renders it that way. Fallback range: darker to `#1A3848` or lighter to `#2C5970`. **Scott should open the preview HTML in a browser on his M3 Mini before approving this plan**, then lock the value so Bolt doesn't guess.

### Q3 — Bloody Mary chip: "1 slot only" indicator
`sponsorship_items` sort_order=60 (Bloody Mary) has `max_quantity=1`. The chip currently shows "From $1,000" with no inventory signal. Decision: (a) leave as-is — `/sponsorships` handles inventory enforcement, not the chip, or (b) add "· 1 slot" to the chip price display for that specific item. Recommendation: leave as-is for Sprint 22. The chip is promotional, not transactional; inventory state belongs on the purchase page. Mark as follow-up if Scott disagrees.

### Q4 — `lifetime_raised_cents` initial value
The preview shows "$580K+" but this is placeholder copy. Scott needs to set the real cumulative figure via `/admin/event` after PR A ships. Reminder: this value is manually maintained — the system does not auto-tally it from Stripe records.

### Q5 — `/donate` page existence
The bottom CTA now points to `/donate`. Verify this route exists before PR B ships. If it doesn't, the button will 404.

---

## Files Created / Modified Summary

### PR A
- `supabase/migrations/20260425000001_event_settings_lifetime_raised.sql` — CREATE
- `src/types/database.ts` — MODIFY (add `lifetime_raised_cents: number | null` to event_settings Row/Update/Insert)
- `src/app/admin/event/actions.ts` — MODIFY
- `src/app/admin/event/event-settings-form.tsx` — MODIFY

### PR B
- `src/app/globals.css` — MODIFY (add `--brand-darker` token in `:root` and `@theme inline`)
- `src/lib/sponsors-utils.ts` — CREATE
- `src/components/public/sponsors-masthead.tsx` — CREATE
- `src/components/public/open-sponsorships-block.tsx` — CREATE
- `src/components/public/sponsor-card.tsx` — REPLACE (full rewrite, same path)
- `src/app/(public)/sponsors/page.tsx` — REPLACE (full rewrite, same path)
- `src/lib/__tests__/sponsors-utils.test.ts` — CREATE (Spec)
- `src/components/public/__tests__/sponsor-card.test.tsx` — CREATE (Spec)
- `src/components/public/__tests__/open-sponsorships-block.test.tsx` — CREATE (Spec)
- `src/app/(public)/sponsors/__tests__/sponsors-page.test.tsx` — CREATE or MODIFY (Spec)
- `src/app/admin/event/__tests__/event-settings-form.test.tsx` — CREATE or MODIFY (Spec, for PR A field)
