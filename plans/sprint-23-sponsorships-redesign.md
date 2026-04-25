# Sprint 23 — Sponsorships Page Redesign (Marketplace Direction)

**Status:** Planning — awaiting Scott + Forge approval before Spec/Bolt spawn.
**Design reference:** `design-explorations/sponsorships-redesign-2026-04-25/direction-marketplace/`
**Target:** Replace the current `/sponsorships` page with the approved Marketplace direction.

---

## Goals

Replace `/sponsorships` with the Marketplace design: dark-teal masthead with inline stat, flat equal-weight product card grid (all 10 packages), anchor IDs per card, tax-deductible pill on every card, inventory pill on Bloody Mary, and a reassurance strip below the grid. Update `/sponsors` Open Sponsorships chips to deep-link into the page via `#<slug>` anchors. Align PurchaseForm visual treatment with the new card aesthetic.

## Non-Goals

- Stripe webhook changes or payment-flow logic changes of any kind
- Redesign of the post-select purchase interaction flow (inline form stays; only visual treatment changes)
- Registration page, leaderboard, admin sponsorship_items CRUD — untouched
- Removing `--purple` tokens from `globals.css` (purple is used on `/donate`, `/` homepage, `button.tsx`, `contact-list.tsx` — out of scope; do NOT delete)
- The "Coming Soon — Other ways to give" placeholder section — hidden in v1, not shipped
- Any changes to the `sponsors` or `sponsorship_items` tables or their data
- `src/types/database.ts` — no schema changes required; `lifetime_raised_cents` was added in Sprint 22 PR A (#251), already typed

---

## PR Structure

Single PR. No migration this sprint — `lifetime_raised_cents` is already in `event_settings` and populated at $500K in prod (50000000 cents). No PR A needed.

**PR B — Sponsorships Page Redesign** (Bolt)
- Full replacement of `/sponsorships` page and `SponsorshipGrid` component
- New `SponsorshipCard` extracted component
- New `src/lib/sponsorship-utils.ts` pure utils
- Small edit to `open-sponsorships-block.tsx` for deep-link hrefs
- `globals.css` token addition (`--tax-green`)
- PurchaseForm visual cleanup (brand-teal, no purple)

**Spec runs in parallel with Bolt (RED phase first)**
- Spec writes failing tests before Bolt writes implementation
- Spec touches only `__tests__/` files — zero overlap with Bolt's component files

---

## Already Built (Sprint 22)

- `src/lib/sponsors-utils.ts` — `formatLifetimeRaised(cents: number | null): string | null` is live and tested. Reuse directly. Do NOT recreate.
- `src/components/public/open-sponsorships-block.tsx` — live component with chip grid. Small edit only (update hrefs).
- `event_settings.lifetime_raised_cents` column — exists in prod, value = 50000000 ($500K+).
- `--brand-darker: #244A5B` token — in `globals.css` `:root` and `@theme inline`.
- `src/components/public/__tests__/open-sponsorships-block.test.tsx` — exists, covers chip hrefs as `/sponsorships`. Spec MODIFIES this file to add the deep-link anchor assertions.

---

## Codebase Verification Summary

Completed before writing this plan:

- **Purple scope:** `bg-purple` / `bg-purple-hover` appear in `sponsorship-grid.tsx` (2 buttons: Select + Proceed to Payment), `button.tsx` (variant), `(public)/page.tsx` (homepage CTAs), `donate/page.tsx` (CTA + section), `admin/contacts/contact-list.tsx` (badge). **Only `sponsorship-grid.tsx` is in scope for this sprint.** Do not touch the others.
- **Fraunces (`font-display`) scope:** Present in `sponsorships/page.tsx` (h1, h2) and `sponsorship-grid.tsx` (price `<p>`, card `<h3>`, PurchaseForm `<h3>`). All three are in scope. Fraunces is also used across many other pages — removal is file-scoped to these two files only.
- **`--tax-green` token:** Does NOT exist in `globals.css`. Must be added.
- **`__tests__` directory:** `src/app/(public)/sponsorships/__tests__/` does NOT exist. Spec creates it.
- **`open-sponsorships-block.test.tsx`:** Exists at `src/components/public/__tests__/`. Chip hrefs are currently asserted as `/sponsorships` — Spec adds new assertions for `#<slug>` deep-link format.

---

## Component Breakdown

### `src/app/(public)/sponsorships/page.tsx` — REFACTOR

Replace masthead JSX entirely. Add `event_settings` fetch to pull `lifetime_raised_cents`. Pass formatted value to inline stat in masthead. Standardize program-language copy. Add `<ReassuranceStrip>` below the grid (inline JSX — no extraction needed; single location).

**Data fetching changes:**
1. Existing fetch: `sponsorship_items` where `year=currentYear`, `active=true`, `deleted_at IS NULL`, ordered by `price_cents DESC` — keep as-is.
2. New fetch: `event_settings` for `year=currentYear`, select `lifetime_raised_cents`. Use `formatLifetimeRaised` from `src/lib/sponsors-utils.ts` to format. If null, omit the inline stat sentence gracefully.

**Masthead structure (from design preview):**
- Background: `var(--brand-darker)` with two radial-gradient overlays (matches `/sponsors` masthead pattern)
- Eyebrow: "Support the Tournament" — same 28px teal rule + small-caps pattern as `/sponsors`
- H1: "Sponsorship Opportunities" — Manrope 800, `clamp(2.5rem, 7vw, 4.5rem)`, no `font-display`
- Body: "Every sponsorship funds transportation, lodging, and medical equipment for cancer patients in active treatment — people in our own community facing the hardest days of their lives." (standardized program language)
- Inline stat (conditional): `<strong>$500K+</strong> raised since 2010` — only renders when `formatLifetimeRaised(lifetime_raised_cents)` returns non-null

**Section header (above grid):**
- Eyebrow: "2026 Sponsorship Packages"
- H2: "Pick your level" — Manrope 800, `clamp(1.75rem, 3.5vw, 2.5rem)`, no `font-display`
- Intro: "Each package supports the tournament directly. Cards are listed by level — choose what fits, then we'll handle the details at checkout."

**Reassurance strip (below grid, inline JSX):**
```
Selected sponsors appear on our [2026 Partners page]. A tax receipt is emailed after checkout.
```
- "2026 Partners page" links to `/sponsors`
- Background: `var(--surface-soft)` (soft gray, `#f7f8f9`)
- Centered text, 0.875rem, `var(--muted-foreground)`

**Remove:**
- The existing "Our Mission" `<section>` block with hardcoded `$450,000` and wrong program language
- All `font-display` classes in this file
- The hardcoded `bg-[#1A2E3A]` masthead background (replace with CSS var)

### `src/app/(public)/sponsorships/sponsorship-grid.tsx` — MAJOR REWRITE

This is a client component (`"use client"`) due to `useState` for `selectedId`. Keep that boundary — the grid and PurchaseForm stay client-side.

**Sort order:** Items arrive from the server already ordered by `price_cents DESC`. The grid renders them in that order. Add `sort_order ASC` as tiebreaker in the page's server fetch (update the `.order()` call to add a secondary sort).

**Card markup:** Replace the existing `<Card>` / `<CardContent>` pattern with the `<SponsorshipCard>` component (see below). The grid itself is a `<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">`.

**Sold-out handling:** Keep existing logic (`item.max_quantity !== null && item.sold_count >= item.max_quantity`). Apply `opacity-[0.55]` and `pointer-events-none` on the card wrapper when sold out. CTA renders "Sold Out" label.

**Remove entirely:**
- The availability progress bar (the `h-0.5 bg-border/40` bar with `bg-primary` fill) — the Marketplace design uses the simple inventory pill (Bloody Mary only) instead
- All `font-display` classes
- `bg-purple` and `bg-purple-hover` from both the Select button and the Proceed to Payment button

**PurchaseForm visual cleanup:**
- Container: `rounded-lg border border-border/60 bg-white shadow-sm p-6` (white surface, not `bg-neutral-50`)
- H3: `font-sans font-semibold text-xl` (not `font-display`)
- "Proceed to Payment" button: `bg-brand-darker text-white hover:bg-brand text-sm uppercase tracking-wider` (brand-teal, not purple)
- Cancel button: stays as-is (`variant="ghost"`)
- All other form fields (inputs, labels) — untouched

### `src/components/public/sponsorship-card.tsx` — CREATE NEW

Extract the card as a pure presentational component for testability. Server component — no client state.

**Props:**
```ts
interface SponsorshipCardProps {
  item: SponsorshipItem;
  isSelected: boolean;
  onSelect: () => void;  // passed as prop from the client grid
}
```

Wait — this component needs `onClick` which means the card itself can't be a server component if it wraps the button. **Resolution:** Keep `SponsorshipCard` as a client component (it receives `onSelect` callback). It's still extracted for testability.

**Card structure (per design preview):**
```
<div id="<slug>" data-sold-out={soldOut} data-testid="sponsorship-card-<id>">
  {/* Inventory pill — Bloody Mary only */}
  {item.max_quantity === 1 && !soldOut && (
    <div class="product-inventory">1 of 1 available</div>
  )}
  {/* Price */}
  <p class="product-price">${price}</p>
  {/* Name */}
  <h3 class="product-name">{item.name}</h3>
  {/* One-line summary */}
  {item.description && <p class="product-summary">{item.description}</p>}
  {/* Tax pill */}
  <div class="product-tax">Tax-deductible · receipt provided</div>
  {/* CTA */}
  <button class="product-cta" disabled={soldOut} onClick={onSelect}>
    {soldOut ? "Sold Out" : isSelected ? "Selected" : "Select package →"}
  </button>
</div>
```

**Inventory pill logic:** Show only when `item.max_quantity === 1` and not sold out. This matches the current prod data where only Bloody Mary has `max_quantity=1`. The pill text is "1 of 1 available" (not dynamic — it's a signal, not a live counter; the design locked this as "1 of 1 available").

**Slug generation:** Each card's `id` attribute is `slugifyItemName(item.name)` imported from `src/lib/sponsorship-utils.ts`.

**Typography:** All Manrope. No `font-display`.

**CTA button:** `background: var(--brand-darker)`, `color: #fff`, `hover: background: var(--brand)`. Not purple.

**Hover:** `translateY(-1px)` on the card wrapper + 2px `var(--brand)` accent line scales in at bottom via `::after` (matches the Sprint 22 `SponsorCard` hover pattern on `/sponsors`).

### `src/lib/sponsorship-utils.ts` — CREATE NEW

Pure functions. No imports beyond TypeScript. Fully unit-testable.

```ts
/**
 * sponsorship-utils.ts — Sprint 23
 *
 * Pure utility functions for the /sponsorships Marketplace redesign.
 * No side effects, no imports — safe to unit-test in isolation.
 */

/**
 * Converts a sponsorship package name to a URL-safe anchor slug.
 * Rules: lowercase, spaces to hyphens, strip non-alphanumeric non-hyphens.
 *
 * Examples:
 *   "Champion"            → "champion"
 *   "Golf Gift"           → "golf-gift"
 *   "Bloody Mary Bar"     → "bloody-mary-bar"
 *   "Morning Biscuit Sponsor" → "morning-biscuit-sponsor"
 *   "Shot of the Day"     → "shot-of-the-day"
 */
export function slugifyItemName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
```

Note: DB names verified against prod 2026-04-25. The 10 active items + their slugs are locked in the Anchor ID Reference table below. DB has been renamed to "Bloody Mary Bar" (was "Bloody Mary") to match the design preview's intent.

### `src/components/public/open-sponsorships-block.tsx` — SMALL EDIT

One change only: update each chip's `href` from `"/sponsorships"` to `` `/sponsorships#${slugifyItemName(item.name)}` ``.

Import `slugifyItemName` from `src/lib/sponsorship-utils.ts`.

The "Browse all sponsorships →" CTA href stays as `/sponsorships` (no anchor — scroll to top).

**No other changes to this file.**

### `src/app/globals.css` — MODIFY (add `--tax-green` token)

`--brand-darker` already exists from Sprint 22. Add only the new tax-green token:

In `:root` block, after `--brand-muted`:
```css
--tax-green: #2F6B50;
```

In `@theme inline` block, after `--color-brand-muted`:
```css
--color-tax-green: var(--tax-green);
```

Follow the exact same pattern used for `--brand-darker` in Sprint 22 (consistent with how Watchdog will diff it).

---

## Anchor ID Reference

| Package Name (DB) | Slug (locked) |
|---|---|
| Champion | `champion` |
| Eagle | `eagle` |
| Golf Gift | `golf-gift` |
| Celebration Lunch | `celebration-lunch` |
| Bloody Mary Bar | `bloody-mary-bar` |
| Golf Carts | `golf-carts` |
| Wall Sponsor | `wall-sponsor` |
| Thursday Night | `thursday-night` |
| Morning Biscuit Sponsor | `morning-biscuit-sponsor` |
| Shot of the Day | `shot-of-the-day` |

**Action for Bolt:** Forge already verified DB names against prod (2026-04-25). The 10 names + slugs above are authoritative — Bolt derives slug from `sponsorship_items.name` via the `slugifyItemName` util and renders the DB name verbatim on each card. No additional verification needed.

---

## Acceptance Criteria

All criteria are verifiable by loading the live `/sponsorships` page after deploy.

### Masthead
1. Background is `var(--brand-darker)` (`#244A5B`) with two radial-gradient overlays — no hardcoded `#1A2E3A`
2. H1 reads "Sponsorship Opportunities" in Manrope 800 (no `font-display` class in DOM)
3. Body copy reads: "Every sponsorship funds transportation, lodging, and medical equipment for cancer patients in active treatment..."
4. Inline stat renders `$500K+` (or current formatted value from `event_settings.lifetime_raised_cents`) followed by "raised since 2010"
5. When `lifetime_raised_cents` is null in the database, the inline stat sentence is absent from the DOM entirely

### Section header
6. Eyebrow reads "2026 Sponsorship Packages"
7. H2 reads "Pick your level" in Manrope 800 (no `font-display` class)

### Product grid
8. All 10 active non-deleted `sponsorship_items` for current year render as cards
9. Cards render in price-descending order; equal-price items sorted by `sort_order` ascending
10. Each card has `id="<slug>"` matching `slugifyItemName(item.name)`
11. Each card displays "Tax-deductible · receipt provided" as a tax pill element
12. Bloody Mary card displays the inventory pill ("1 of 1 available") — no other card does
13. Sold-out cards render with reduced opacity (`~0.55`) and a non-clickable / "Sold Out" CTA
14. Non-sold-out cards render a "Select package →" CTA button

### Typography — no Fraunces
15. No element on the `/sponsorships` page has `font-display` in its class list (inspect any card, the masthead, the section header, the PurchaseForm)

### Color — no purple
16. No element on the `/sponsorships` page has `bg-purple` or `bg-purple-hover` in its class list (DOM grep: `document.querySelectorAll('.bg-purple, .bg-purple-hover').length === 0`)
17. Select package button background is `var(--brand-darker)` teal (visually)
18. "Proceed to Payment" button in PurchaseForm is brand-teal, not purple

### Reassurance strip
19. Strip renders below the product grid
20. Strip text includes "A tax receipt is emailed after checkout."
21. Strip contains a link to `/sponsors` with visible text referencing the 2026 Partners page

### Open Sponsorships chips (on `/sponsors`)
22. Each chip on the Open Sponsorships block links to `/sponsorships#<slug>` (e.g. `/sponsorships#champion`, `/sponsorships#eagle`)
23. Navigating to `/sponsorships#bloody-mary-bar` scrolls the Bloody Mary Bar card into view

### PurchaseForm
24. PurchaseForm container has a white background (not `bg-neutral-50`)
25. "Proceed to Payment" button does not have `bg-purple` or `bg-purple-hover` class

---

## Test Coverage (Spec — RED phase first)

Spec writes failing tests before Bolt writes a line of implementation. TDD is the standard workflow.

### Unit tests — `src/lib/__tests__/sponsorship-utils.test.ts` (CREATE NEW)

`slugifyItemName`:
1. `"Champion"` → `"champion"`
2. `"Golf Gift"` → `"golf-gift"`
3. `"Bloody Mary Bar"` → `"bloody-mary-bar"`
4. `"Celebration Lunch"` → `"celebration-lunch"`
5. `"Morning Biscuit Sponsor"` → `"morning-biscuit-sponsor"`
6. `"Shot of the Day"` → `"shot-of-the-day"`
7. `"Wall Sponsor"` → `"wall-sponsor"`
8. `"Golf Carts"` → `"golf-carts"`
9. `"Thursday Night"` → `"thursday-night"`
10. Multi-space handling: `"Foo  Bar"` → `"foo-bar"` (collapses multiple spaces)
11. Special char stripping: `"Foo & Bar"` → `"foo-bar"` (ampersand removed, spaces become hyphens)

### Component tests — `src/components/public/__tests__/sponsorship-card.test.tsx` (CREATE NEW)

12. Card renders with `id="<slug>"` matching `slugifyItemName(item.name)`
13. `data-testid="sponsorship-card-<id>"` attribute is present
14. Tax pill renders with text "Tax-deductible · receipt provided"
15. Inventory pill ("1 of 1 available") renders when `max_quantity === 1` and not sold out
16. Inventory pill is absent when `max_quantity` is null
17. Inventory pill is absent when item is sold out (even if `max_quantity === 1`)
18. CTA button renders "Select package →" text when not selected and not sold out
19. CTA button renders "Sold Out" when `soldOut === true`
20. CTA button has no `bg-purple` class
21. No element in the card has `font-display` class

### Integration tests — `src/app/(public)/sponsorships/__tests__/sponsorships-page.test.tsx` (CREATE NEW)

Mock Supabase; use vitest. New directory — Spec creates it.

22. Renders all 10 active non-deleted items (mock 10 items)
23. Masthead stat renders `$500K+` when `lifetime_raised_cents = 50000000` in `event_settings` mock
24. Masthead stat is absent from DOM when `lifetime_raised_cents` is null in mock
25. Body copy contains "transportation, lodging, and medical equipment for cancer patients in active treatment"
26. Reassurance strip renders with "A tax receipt is emailed after checkout."
27. Reassurance strip contains a link to `/sponsors`
28. No element has `bg-purple` or `bg-purple-hover` class anywhere on the page
29. No element has `font-display` class anywhere on the page
30. Bloody Mary card (mock item with `max_quantity=1`) shows inventory pill; no other card does
31. Cards render in price-descending order (first card has highest price in mock)

### Modified component tests — `src/components/public/__tests__/open-sponsorships-block.test.tsx` (MODIFY)

Add new assertions to the EXISTING test file (do not rewrite passing tests):

32. Each chip's `href` matches `/sponsorships#<slug>` pattern (e.g. for item name "Champion Sponsor" → `href="/sponsorships#champion-sponsor"`)
33. "Browse all sponsorships →" CTA href remains `/sponsorships` (no anchor)

Note: The existing test at line ~103 asserts `href="/sponsorships"` for chips — this test will now FAIL (RED) when Spec adds it, because the component still links to `/sponsorships`. Bolt's GREEN PR updates the href, making it pass. Spec should add the NEW assertion (with `#slug`) and leave the old `/sponsorships` chip assertion in place so the RED state is clearly the new behavior expectation. Alternatively, Spec can modify the existing chip href test to assert the new format — either approach is valid, document which in the test.

Coverage target: 50%+ for all new/modified files. Unit tests for `sponsorship-utils.ts` will hit 100%. Page integration tests and card component tests are load-bearing.

---

## Files Created / Modified Summary

| File | Action | Owner |
|---|---|---|
| `src/app/globals.css` | MODIFY (add `--tax-green` token) | Bolt |
| `src/lib/sponsorship-utils.ts` | CREATE (`slugifyItemName`) | Bolt |
| `src/components/public/sponsorship-card.tsx` | CREATE (extracted card component) | Bolt |
| `src/app/(public)/sponsorships/page.tsx` | REFACTOR (new masthead, event_settings fetch, reassurance strip, program language) | Bolt |
| `src/app/(public)/sponsorships/sponsorship-grid.tsx` | MAJOR REWRITE (Marketplace cards, no purple, no Fraunces, PurchaseForm visual cleanup) | Bolt |
| `src/components/public/open-sponsorships-block.tsx` | SMALL EDIT (chip hrefs → `/sponsorships#<slug>`) | Bolt |
| `src/lib/__tests__/sponsorship-utils.test.ts` | CREATE | Spec |
| `src/components/public/__tests__/sponsorship-card.test.tsx` | CREATE | Spec |
| `src/app/(public)/sponsorships/__tests__/sponsorships-page.test.tsx` | CREATE (new directory) | Spec |
| `src/components/public/__tests__/open-sponsorships-block.test.tsx` | MODIFY (add deep-link anchor assertions) | Spec |

**File conflict zones:** None. Spec's `__tests__/` files have zero overlap with Bolt's component files. All good for parallelism.

---

## Dependency Map

```
Phase 1 (parallel — no file overlap):
  Spec  → writes RED tests in: __tests__/sponsorship-utils.test.ts,
          __tests__/sponsorship-card.test.tsx,
          sponsorships/__tests__/sponsorships-page.test.tsx,
          __tests__/open-sponsorships-block.test.tsx (modify)
  Aria  → reviews and approves all copy (see Aria gate below)

Phase 2 (serial — Spec RED must merge before Bolt GREEN starts):
  Bolt  → writes GREEN implementation in all non-test files above
          Consumes: Spec's RED tests (all passing = done)
          Consumes: Aria's copy approval

Phase 3 (serial — after Bolt PR created):
  Watchdog → full QA gate + design-adherence diff
  Aria     → final merge-gate copy sign-off (can run in parallel with Watchdog)

Phase 4 (serial — after Watchdog APPROVED + Aria signed off):
  Forge → merges PR → Vercel auto-deploys → verify checklist
```

No migration. No PR A. Single PR (Bolt's GREEN work), preceded by Spec's RED PR.

---

## Execution Order

1. Forge spawns Spec (RED phase — starts immediately, no dependencies)
2. Forge spawns Aria (copy review — starts immediately, in parallel with Spec)
3. Spec RED PR merges
4. Aria delivers copy approval (must be in hand before Bolt starts — Aria approves copy, Bolt implements it)
5. Forge spawns Bolt (GREEN phase: full page implementation + PurchaseForm cleanup + open-sponsorships-block chip href update)
6. Watchdog reviews Bolt's PR (design-adherence diff required)
7. Aria provides final merge-gate copy sign-off on the actual implemented copy
8. PR merges → Vercel auto-deploys
9. Forge verifies live `/sponsorships` page per checklist

---

## Effort Estimates

| Work | Owner | Size | Estimate |
|---|---|---|---|
| RED tests (4 files) | Spec | M | ~2h |
| Copy review + approval | Aria | S | ~1h |
| Sponsorships page redesign (GREEN) | Bolt | M | ~3.5h |
| Watchdog review + design-adherence diff | Watchdog | S | ~0.5h |

**Total estimated builder time:** ~7h across parallel tracks. Wall-clock with parallelism: ~5h.

---

## Aria Copy Gate

Aria must review and approve before Bolt starts (copy approval unblocks implementation). Aria must also sign off as a merge gate before the PR merges.

**Copy items requiring Aria approval:**

1. Masthead eyebrow: "Support the Tournament"
2. Masthead body: "Every sponsorship funds transportation, lodging, and medical equipment for cancer patients in active treatment — people in our own community facing the hardest days of their lives."
3. Masthead inline stat phrasing: `<strong>$500K+</strong> raised since 2010`
4. Section eyebrow: "2026 Sponsorship Packages"
5. Section headline: "Pick your level"
6. Section intro: "Each package supports the tournament directly. Cards are listed by level — choose what fits, then we'll handle the details at checkout."
7. Tax pill (universal): "Tax-deductible · receipt provided"
8. Reassurance strip: "Selected sponsors appear on our [2026 Partners page]. A tax receipt is emailed after checkout."
9. CTA label: "Select package →"
10. One-line summaries for all 10 cards (10 strings). The 4 cards with empty `benefits` arrays in prod (Golf Carts, Thursday Night, Morning Biscuit Sponsor, Shot of the Day) have plausible placeholder copy from the design preview — **Aria must verify against actual sponsor packages or confirm with Scott before approving.** Do not ship unverified copy for these 4.

---

## Watchdog Gate

Full QA per Sprint 22 pattern PLUS the design-adherence diff pass.

**Watchdog must:**
1. Run `tsc --noEmit` — zero errors
2. Run `vitest run` — all tests pass (including Spec's RED tests now GREEN)
3. Pull the Vercel preview URL from the PR
4. Open `design-explorations/sponsorships-redesign-2026-04-25/direction-marketplace/index.html` in browser
5. Load the Vercel preview `/sponsorships` in another tab
6. Visual diff section by section:
   - Masthead: background color, headline, body, inline stat
   - Section header: eyebrow, H2, intro text
   - Card grid: 3-up layout, card structure (price → name → summary → tax pill → CTA), inventory pill on Bloody Mary
   - Card hover state: accent line, lift
   - Reassurance strip: present, correct text, `/sponsors` link
7. DOM assertions (browser console):
   - `document.querySelectorAll('.bg-purple, .bg-purple-hover').length` → 0
   - `document.querySelectorAll('.font-display').length` → 0
   - `document.querySelectorAll('[id]')` includes all 10 slugs

**Structural omissions are request-changes-level (not non-blockers):**
- Missing reassurance strip
- Missing tax pills on any card
- Purple present anywhere on the page
- Fraunces (`font-display`) present anywhere on the page
- Inventory pill missing from Bloody Mary / present on any other card

---

## Deploy + Verify Checklist

Work is NOT done at merge. After Vercel auto-deploys from main:

- [ ] Load `https://craven-cancer-classic.vercel.app/sponsorships`
- [ ] Masthead background is dark teal (`#244A5B`) — not `#1A2E3A`
- [ ] Inline stat shows `$500K+` (pulled live from `event_settings`, not hardcoded `$450,000`)
- [ ] All 10 cards render
- [ ] Cards in price-descending order (Champion $5,000 first)
- [ ] Bloody Mary card shows inventory pill ("1 of 1 available")
- [ ] Tax pill present on every card ("Tax-deductible · receipt provided")
- [ ] Reassurance strip below grid — text includes "A tax receipt is emailed after checkout."
- [ ] Reassurance strip "2026 Partners page" link goes to `/sponsors`
- [ ] No purple anywhere — visual scan + `document.querySelectorAll('.bg-purple').length === 0` in console
- [ ] No Fraunces — `document.querySelectorAll('.font-display').length === 0` in console
- [ ] Anchor IDs work: navigate to `/sponsorships#bloody-mary-bar` — correct card scrolls into view
- [ ] Navigate to `/sponsorships#champion` — Champion card scrolls into view
- [ ] Click "Select package →" on any card — PurchaseForm appears with brand-teal "Proceed to Payment" button (not purple)
- [ ] Mobile (390px): cards go 1-up, masthead headline wraps acceptably
- [ ] Load `/sponsors` — Open Sponsorships chips now link to `/sponsorships#<slug>` (verify hover URL in browser)
- [ ] Click a chip from `/sponsors` — lands on `/sponsorships` with correct card in view

---

## Risks and Open Questions

### Risk 1 — Resolved (DB names verified + renamed 2026-04-25)
DB has been renamed from "Bloody Mary" to "Bloody Mary Bar" via service key (Forge, before plan PR opened). Slug = `bloody-mary-bar`. All 10 anchor slugs in the table above are authoritative. No verification work for Bolt.

### Risk 2 — 4 unverified one-line summaries (BLOCKS SHIP)
Golf Carts, Thursday Night, Morning Biscuit Sponsor, and Shot of the Day have empty `benefits` arrays in prod. The design preview has plausible placeholder copy. This copy is **unverified** — Aria must confirm it's accurate or get Scott to provide the correct benefit language before the PR can merge.

**Process gate:** Aria flags any of the 4 she cannot verify. If Scott input is needed, that input must arrive before Watchdog approval. Bolt implements placeholder copy; Aria and Scott approve or correct it before merge.

### Risk 3 — Inline PurchaseForm visual cleanup has no dedicated design spec
The form visual treatment ("white surface, Manrope, brand-teal CTAs, no purple") is described in prose but not shown in the design preview HTML. Bolt follows the card aesthetic as close guidance. Watchdog's design-adherence pass should flag if the form feels visually inconsistent with the card grid. If it does, that's a request-changes item.

### Risk 4 — Orphan card in last row (3+3+3+1)
The 10th card renders alone in the last desktop row. This is intentional per Scott's "shopping list" framing and matches the design README explicitly. If it looks bad in the live deploy, the next iteration could consider a 2-up mobile + 2-up tablet + 4-up desktop (5+5) or similar — do not preemptively fix this sprint.

### Risk 5 — Tax-green second accent color
`#2F6B50` introduces a second accent hue (green) alongside brand teal. If Scott finds it visually noisy, the fallback is a neutral gray pill or plain text. The design README flagged this as a risk. Watchdog should note it in the review.

### Q1 — `SponsorshipCard` client component boundary
The extracted `SponsorshipCard` receives an `onSelect` callback (needed to set `selectedId` state in the parent grid). This makes it a client component. This is fine — it was already a client component implicitly (inside `SponsorshipGrid` which is `"use client"`). Bolt should add `"use client"` to `sponsorship-card.tsx` or verify the parent boundary covers it without the directive. Either approach is valid; be explicit.

### Q2 — Sort order tiebreaker
The current fetch only orders by `price_cents DESC`. Multiple packages share the same price (e.g. Eagle and Golf Gift are both $2,500). Add `sort_order ASC` as a secondary sort in the `.order()` chain on the Supabase query. Confirm `sponsorship_items` has a `sort_order` column (it does — used in Sprint 22's sponsor tier logic).

---

## Process Rules (Baked In)

- TDD: Spec writes failing tests first. Bolt does not start GREEN work until Spec's RED PR is merged.
- Builders work from fresh worktrees of `~/github/craven-cancer-classic`, branched from main.
- `unset GH_TOKEN` before `gh pr create` — PR must open as scottdavenport, not forge-watchdog.
- Surgical changes only: every changed line traces to a task in this plan. No adjacent refactors, no formatting fixups, no deleting pre-existing dead code outside scope.
- No `font-display`, no Fraunces, no italics, no decorative ornaments — modern, not heritage.
- Watchdog design-adherence diff is mandatory, not optional. Load both the preview HTML and the Vercel preview side-by-side.
- Aria copy gate: required before Bolt starts AND as a merge gate.
