# Direction — Marketplace

Calibrated to Scott's "list of products + shopping cart" framing, the Met membership page (referenced as "closest"), and the Marquee design system shipped on `/sponsors` (Sprint 22, 2026-04-25).

## What Scott picked / explicitly said

**Resonated about Met membership page:**
- The restrained / quiet visual register
- The clear price + tax-deduction note

**Wanted differently from Met:**
- More visual brand presence (Craven teal)

**In Scott's own words:**
> "It was too busy as well, there was a lot going on. One thing I like about our current version is simplicity, it's like a list of products and a shopping cart type experience I'm going for. There are other things besides sponsorships we will add here later that are smaller donation opportunities."

## What I dropped vs the earlier scope

- **Champion full-width headliner** — Scott explicitly re-locked to "drop headliner — all cards flat + equal weight" once the shopping-list framing was clear. Champion is now just the first card in a uniform grid (sorted by price descending so it leads naturally).
- **Met-style benefit-list format** (bold-name + description bullets) — Scott did NOT pick this when given the option; called it "busy." Replaced with one-line summary per card.
- **Sponsor logos / social proof on tier cards** — too busy for this register. Reassurance strip below the grid mentions sponsors appear on `/sponsors`.
- **Tier cascade visual hierarchy** (champion-larger, eagle-medium, etc. like `/sponsors`) — flat shopping-list contradicts cascade. All cards equal weight.

## Aesthetic moves

**Masthead** — same `--brand-darker: #244A5B` panel as `/sponsors`, but shorter (4.5–6rem vertical padding vs `/sponsors`' 6–8rem). Headline scales smaller (`clamp(2.5rem, 7vw, 4.5rem)` vs `/sponsors`' `clamp(3.5rem, 11vw, 8rem)`). One inline stat ("$500K+ raised since 2010") instead of a 3-cell stat row — `/sponsors` masthead is the recognition page that earns the heroic stat row; this is a sales page that gets to the point. Same eyebrow + 28px brand-teal rule pattern for visual continuity.

**Section header** — "2026 Sponsorship Packages" eyebrow + "Pick your level" Manrope 800 headline + a one-sentence intro that explains the mechanic ("choose what fits, then we'll handle the details at checkout"). Direct, unfussy.

**Product card** — universal pattern, equal weight across all 10 packages:
1. Inventory badge (Bloody Mary only, "1 of 1 available" in brand-muted teal pill)
2. Price as the visual lead — Manrope 800, 2rem
3. Package name — Manrope 700, 1.0625rem
4. One-line summary — Manrope 400, 0.875rem, muted gray
5. Tax-deductible note — small green pill ("Tax-deductible portion confirmed at checkout")
6. Brand-teal CTA button — "Select package →" full-width-of-card

White surface, 1px gray border, hover lifts 1px + scales in a 2px brand-teal accent line at the bottom (same hover language as the `/sponsors` cards).

**Grid** — 1-up mobile, 2-up tablet, 3-up desktop. No tier-size variation. 10 packages = 4 rows on desktop (3+3+3+1) — yes, the last row has an orphan, but in shopping-list context it reads as "and one more thing" rather than as a layout failure.

**Reassurance strip** — soft gray strip below the grid: "Selected sponsors appear on our [2026 Partners page]. Final tax-deductible portions are confirmed at checkout based on benefits received." Two jobs: cross-link to `/sponsors` so buyers see the recognition payoff, and qualify the tax claim honestly.

**"Coming Soon — Other ways to give" section** — placeholder block with a dashed border and softer cream background. Frames the future scope (meal sponsorships, in-memory gifts, direct donations) so the page is structurally ready for those additions without rebuilding. Includes a "have an idea? let us know" mailto for now.

## Palette + typography

Same tokens as Marquee:
- `--brand: #5797A6` (teal accent)
- `--brand-darker: #244A5B` (masthead bg + CTA bg)
- `--brand-muted: #E8F0F4` (inventory pill bg)
- White cards on white page, soft gray section dividers, soft gray reassurance strip
- One new token: `--tax-green: #2F6B50` for the tax-deductible pill (small accent of a different hue to set "this is the trust signal" apart from brand teal)
- Manrope only — no Fraunces, no serifs anywhere

## Anchor IDs

Each card has an `id` matching a slugified version of the package name:
- `#champion`, `#eagle`, `#golf-gift`, `#celebration-lunch`, `#bloody-mary`, `#golf-carts`, `#wall-sponsor`, `#thursday-night`, `#morning-biscuit`, `#shot-of-the-day`

`/sponsors` Open Sponsorships chips currently link to `/sponsorships` root. Production implementation should switch them to `/sponsorships#<slug>` so chips deep-link to the specific package. Slug derivation: lowercase the `sponsorship_items.name`, replace spaces with hyphens.

## What this design solves vs. the current shipped page

| Current | Marketplace |
|---|---|
| Hardcoded `$450,000` raised stat (out of sync with `event_settings.lifetime_raised_cents`) | Pulls live from `event_settings.lifetime_raised_cents`, single source of truth with `/sponsors` |
| Purple CTA buttons (off-brand) | Brand-teal CTAs (matches `/sponsors` and the rest of the site) |
| Fraunces serif headline + card titles | Manrope 800 throughout (matches `/sponsors` Marquee aesthetic) |
| No anchor IDs — chips on `/sponsors` deep-link nowhere | Anchor IDs per card; chips deep-link to specific packages |
| Cards show price + name + button only | Adds one-line summary + tax-deductible note (per Met signal) |
| `1A2E3A` hardcoded masthead bg | `--brand-darker` token (matches `/sponsors`) |
| No back-link to `/sponsors` recognition page | Reassurance strip cross-links explicitly |
| No structural prep for future smaller-donation items | Includes placeholder section for "Other ways to give" |
| "transportation to treatment, lodging during extended care, and medical equipment" | "transportation, lodging, and medical equipment for cancer patients in active treatment" (matches `feedback_craven_program_language_precision.md`) |
| Last row leaves orphan card with dead space | Same orphan, but in shopping-list context reads naturally; the bottom reassurance strip + future-section absorb the visual weight |

## Locked decisions (Scott)

- **Tax-deductible language → generic.** All 10 cards now read "Tax-deductible · receipt provided." Reassurance strip below the grid: "A tax receipt is emailed after checkout." No per-tier dollar math, no commitment to specific deductible amounts. Honest, low-maintenance, doesn't require legal/accounting input per package.
- **"Coming Soon — Other ways to give" placeholder section → hidden.** Removed from v1 entirely. When smaller donation items (meal sponsorships, in-memory gifts, direct donations) are ready to ship, that's its own sprint and can re-introduce a real "Other ways to give" section then. The page is still structurally future-extensible — adding a new section below the current one is cheap.
- **Bloody Mary → Bloody Mary Bar.** DB renamed from "Bloody Mary" to "Bloody Mary Bar" (more descriptive of what the sponsor gets). Anchor slug: `#bloody-mary-bar`. The preview already used the new name.
- **4 empty-benefits packages (Golf Carts, Thursday Night, Morning Biscuit Sponsor, Shot of the Day) → Aria drafts during copy-gate review, Scott approves at PR review.** Bolt ships with the placeholder one-liners I wrote in the preview; Aria refines + Scott approves in the final PR review. No upfront blocker.

## Remaining open questions for Scott

2. **One-line summaries.** The 6 cards with `benefits` in the DB had data to summarize from. The other 4 (Golf Carts, Thursday Night, Morning Biscuit Sponsor, Shot of the Day) had empty benefits arrays in prod. I wrote plausible summaries; Aria should verify against actual sponsor packages before ship — process gate during implementation, not a Scott decision.

3. **Inline purchase form.** Out of scope for this preview but it currently lives below the grid in the shipped implementation. New design should keep that flow but visually align the form with the new card aesthetic (white surface, brand-teal CTA, Manrope throughout — drop the purple). Compass should bake this into the implementation plan.

## How to preview

```
open /Users/openclaw/github/craven-cancer-classic/design-explorations/sponsorships-redesign-2026-04-25/direction-marketplace/index.html
```

Resize to 390px to verify mobile (cards become single-column). Check the inventory pill on Bloody Mary. Hover any card to see the brand-teal accent line scale in.

## What's NOT in this preview

- The inline purchase form that appears when "Select" is clicked (existing implementation pattern is fine; just needs the visual treatment cleanup — covered in the "open questions" above)
- The future "Other ways to give" individual donation items (placeholder section is shown; actual items are out of scope for this redesign sprint)
- A "tier comparison" view (Scott explicitly didn't want this — too busy)
- Sponsor logos as social proof per card (rejected as too busy for this register)

## Risks

- **Tax-deductible green pill** introduces a second accent color to the page (the green `#2F6B50`). Risk: visual noise. If Scott finds it too much, pull back to a neutral gray pill or drop the visual element entirely (just plain text). Choosing green because trust signals reading as "good/positive" is conventional, but the Marquee discipline so far is teal-only.
- **No tier hierarchy means the cheapest packages get equal visual weight to Champion.** This is what Scott chose ("flat shopping list"), but it may underplay the prestige of the headliner tier. If post-deploy data shows Champion conversion drops vs current page, revisit.
- **Orphan card in the last row.** Pure aesthetic risk. Could pad to a 4-up grid to balance (3+3+3+1 → 4+4+2 or 4+4+1+1) but mobile/tablet reflow makes 3-up the cleanest read.
- **"Coming Soon" placeholder section** could feel like a TODO that never resolves if nothing ships behind it. See open question #4.
