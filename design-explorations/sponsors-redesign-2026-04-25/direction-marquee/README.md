# Direction — Marquee

Calibrated to the two references Scott picked: **US Open Tennis Partners** and **TCS NYC Marathon Partners**. Modern athletic-event premium. Confident sans-serif typography, saturated brand teal masthead, white logo cards in disciplined grids, generous whitespace, zero ornament.

**Updated 2026-04-25 after Scott review (round 1):**
- Dropped sponsor name labels under logos — the logo IS the identity, no double-labeling.
- Replaced invented tier framing ("Premier Tier · Champion Partners") with the real category names from `sponsorship_items` ("Champion", "Eagle", "Thursday Night", "Morning Biscuit Sponsor", etc.). No "Tier" wording, no "Partners" suffix — the categories speak for themselves.

**Updated 2026-04-25 after Scott review (round 2):**
- Empty categories are no longer rendered as their own per-tier sections. Instead, the page renders only the **populated** tiers (Champion, Eagle, Thursday Night, Morning Biscuit Sponsor) followed by a single **"Open Sponsorships"** block at the bottom.
- Reason: with current data that's 4 populated tiers + 6 empty active categories. Inline empty-tier callouts at every level would have made the page read as a 10-section sales catalog. The combined block keeps the partner sections focused on celebration and consolidates the sales pitch into one block.
- Source of truth for the open list: `sponsorship_items` where `deleted_at IS NULL` AND no rows in `sponsors` reference the tier_id. Today: Golf Gift ($2,500), Celebration Lunch ($2,000), Golf Carts ($1,000), Bloody Mary ($1,000), Wall Sponsor ($700), Shot of the Day ($500). Sorted by price descending.

**Updated 2026-04-25 after Scott review (round 3):**
- The Open Sponsorships block is now **promotional, not transactional.** Replaced the row-list-with-price-per-row pattern with a **chip grid** — one chip per open category showing name + "From $X". Chips are clickable and route to `/sponsorships` rather than completing purchase inline. A single primary CTA ("Browse all sponsorships →") sits below the chips.
- Reason: most categories have unlimited or multi-slot inventory (only Bloody Mary has `max_quantity: 1`; everything else is `null` = unlimited). The original 6-row list with one price per row implied "6 slots remaining" which misrepresented inventory. The chip grid communicates breadth + price tiering without pretending to be a purchase flow.
- The "From $X" framing handles the multi-slot case correctly — each row reads as "starting price for this category" rather than "single-slot price."
- Purchase action moves entirely to `/sponsorships`. That page will need its own polish work (out of scope for this iteration) — chips currently link to the page root; deep-linking to `/sponsorships#category-slug` is a follow-up if/when /sponsorships gains anchor support.

## What changed from the 2026-04-24 explorations

Everything. The Atrium / Almanac / Field House directions were vintage-vocabulary (italics, browns, sage greens, Roman numerals, engraved effects). All three rejected as "dated and cheap." This direction throws all of that out and builds from scratch on the modern-athletic playbook the references actually use:

- **No serif italic display.** Manrope ExtraBold (800) at large scale carries the page. Same single typeface family from hero to footer — no display/body split.
- **No browns, sage greens, brass, oxblood.** Single saturated brand color (`--brand-darker: #244A5B` for masthead, existing `--brand: #5797A6` for accents). White cards on white/cream ground.
- **No Roman numerals, no "MMXXVI" stamps, no "edition" framing.** Just "2026" everywhere, in tracked Manrope caps.
- **No decorative borders, double rules, diamonds, corner ornaments, engraved shadows.** A 1px border on cards and a 2px brand-teal accent that animates in on hover. That's it.
- **No "tribute / memorial / register" framing.** Section headers are functional ("Champion Partners · 4 · 2026 Season"). The page recognizes partners; it doesn't elegize them.

## Aesthetic moves

**Masthead** — solid dark-teal panel (`--brand-darker`, deeper than the existing `--brand`) with subtle radial-gradient depth. The headline "2026 Partners" is set in Manrope 800 at clamp(3.5rem, 11vw, 8rem) — uppercase, letter-spacing-tight, very confident. Below the body copy: a row of three stat cells (partners count, years running, raised to date). This is the move every modern athletic-event page makes — proof of scale, presented with restraint.

**Tier section headers** — left-aligned title block (`tier-eyebrow` in brand teal small caps + `tier-name` in Manrope 800 at 3.25rem) with right-aligned count ("4 · 2026 Season"). 1px top border separator between tier sections. This is exactly the US Open / NYRR pattern — no decoration, just clear typographic hierarchy.

**Partner cards** — universal card structure: white logo region on top with logo `object-contain` at 82% × 72% inner-bound, then a soft-gray meta strip below with sponsor name in Manrope 700 + sub-line in Manrope 600 tracked caps. 1px gray border. Hover: subtle lift + shadow, plus a 2px brand-teal accent line that scales in along the bottom. No tier-strip headers, no ornament.

**Tier cascade** — same card DNA scales by aspect ratio + grid density:

| Tier | Grid (desktop) | Logo aspect | Padding | Name size |
|---|---|---|---|---|
| Champion | 2-up | 16:11 | 2rem | 1rem / 700 |
| Eagle | 3-up | 4:3 | 1.5rem | 0.8125rem / 700 |
| Standard | 4-up | 4:3 | 1.125rem | 0.75rem / 700 |
| Compact | 6-up | 3:2 | 0.875rem | 0.6875rem / 700 |

The whole grid stays within the same 80rem max-width container, so all tiers visually align to the same outer rhythm. Compact looks like the natural smallest version, not an afterthought.

**Mike Evans treatment** — same card structure as everyone else. Logo region holds his name set in Manrope 800 at clamp(2rem, 4.5vw, 2.75rem) — uppercase weight-driven typography, the same display family used in the masthead and tier headers. Looks like a billboard, reads as deliberate, sits at equal weight to Carolina East next to it. The meta strip below shows the same name in tracked caps with sub-line "Champion Patron · 2026" instead of "Champion · 2026."

This is the strongest Mike Evans solution of any direction so far: the typographic system is the same (Manrope 800), so a typeset name looks like an intentional display moment, not a fallback. No italic, no serif flourish, no "without insignia" qualifier.

**Open Sponsorships block** — single full-width gradient card (brand-darker → brand-dark) at the bottom of the page, after the last populated tier section. Three stacked elements: an intro pair (title + body), a wrapping chip grid (one chip per open category showing name + "From $X"), and a single white primary CTA ("Browse all sponsorships →"). Chips are translucent white-on-teal pills with a subtle border; on hover they brighten and lift 1px. Whole block is promotional, not transactional — every link routes to `/sponsorships`, where the actual purchase flow lives. The chip pattern correctly handles multi-slot inventory (most categories accept multiple sponsors), where a row-list with one price would have implied single-slot scarcity.

**Bottom CTA** — soft-gray section with the existing mission copy ("Make it possible for someone fighting right now"), Manrope 800 headline, dark-teal button. Echoes the masthead structurally but in a quieter register.

## Solving the four problems

1. **Logo normalization** — every card has a fixed-aspect logo region with consistent inner padding. Logos `object-contain` at 82%×72% bounds. The CARD does the work; the logo is the guest. Logos with white grounds (Carolina East, Chick-fil-A, BSH) sit naturally because the card's logo region is also white. No color manipulation, no cropping.
2. **Mike Evans** — same card frame, typeset name in the logo region using the same typeface family that drives the masthead and tier headers. The system absorbs name-only patrons without flagging them as exceptions.
3. **Tier cascade** — same card DNA at every tier. Aspect ratio flattens (16:11 → 4:3 → 4:3 → 3:2), grid density increases (2-up → 3-up → 4-up → 6-up), type scales down. Compact still has a section header, still has a name strip, still has hover state. There is no point where the design "gives up."
4. **Empty tier** — empty categories are not rendered as their own tier sections at all. Instead, every still-available category surfaces as a chip in a single "Open Sponsorships" block at the bottom of the page (gradient teal panel with intro copy + chip grid + CTA). The chip grid promotes breadth without pretending to be a purchase flow — clicks route to `/sponsorships` for the actual transaction. This keeps the populated partner sections focused on celebration and consolidates the sales pitch into one promotional moment.

## Palette extension

**`--brand-darker: #244A5B`** — a deeper variant of the existing brand-dark, used for the masthead background and the empty-tier callout gradient. Acts as the "presentation surface" — when the page wants to say "look at this," it goes dark-teal. The existing brand-teal `#5797A6` stays as the accent (eyebrows, hover-line, gradient highlights).

No new accent color. The page deliberately runs on **brand teal + neutrals only**. If Scott wants a sharp accent (a tennis-ball-yellow equivalent), it can be added — but the references he picked (US Open, TCS NYC Marathon) both lean heavily on their navy/dark-blue brand color and use accents sparingly. Marquee follows that discipline.

## Risks

- **The masthead is the load-bearing aesthetic moment.** If the dark teal `#244A5B` doesn't read as premium enough on Scott's display, the whole tone shifts. Easy to tune (could go darker to `#1A3848` or lighter to `#2C5970`).
- **Mike Evans's typeset name is large.** At Champion size on mobile (single-column), it should feel monumental. If it competes too hard with the surrounding logo cards, dial down to clamp(1.75rem, 4vw, 2.5rem).
- **The 16:11 Champion logo aspect** is wider than typical sponsor cards. Tested against Lynne Davenport's wide horizontal logo and Carolina East's near-square photo — both render acceptably. May need adjustment if Scott has a champion-tier sponsor with a particularly tall narrow logo (vertical SVG icon, etc.).
- **Stat cells in the masthead** ("11 Partners / 16 Years Running / $580K+ Raised") are placeholder values — the real numbers need to come from somewhere. If the data isn't trivially available, drop the stat row and let the masthead breathe with just the headline + body. The page works either way.
- **"Friends of the Tournament"** as the Compact tier name is a copy nudge. Scott approved this in earlier discussion. If the actual tier name in the DB is "Compact," the section header will read "Compact Partners" instead — fine, but less warm. Either rename the tier in the DB or pass a `display_name` override at the data layer.
- **Chip wrapping at narrow widths.** With 6+ chips, the wrap pattern at iPad-portrait widths (~768px) may produce uneven row distribution (e.g. 5 on row one, 1 orphan on row two). Acceptable today; if the open-category list grows past ~10, revisit the layout.
- **Chip count drives block weight.** As more categories sell out and the chip grid shrinks, the bottom block visual weight drops alongside it. At 1-2 remaining chips the block may feel thin against the masthead and partner grids — at that point either the intro copy bulks up or the block compresses to a more restrained "compact promo" form (which is the version we considered as Option B in the design discussion).
- **`/sponsorships` deep-link anchors don't exist yet.** Chips currently link to the page root. Production work should add `id` anchors per category and update the chip `href` to `/sponsorships#category-slug` so clicks scroll directly to the chosen package on the destination page.

## Implementation cost

**Same as shipped.** The card structure is a direct simplification of the current `SponsorCard` (drop the tier-strip header, drop the double-rule, drop the diamond ornaments, drop the patron-name optical-size dance). The masthead is a new component but it's structurally simple — gradient-overlaid colored panel with text. The empty-tier callout is a new component, but it's a single grid layout with no per-state branching.

New tokens: `--brand-darker` only. No new fonts (Manrope already in use; can drop Fraunces from the project entirely if Scott commits to this direction across the site, since the existing Tournament Program direction is what currently uses Fraunces heavily).

One Bolt PR. Estimate ~3 hours of GREEN work + Spec tests in parallel.

## What to verify before shipping

1. **Masthead color.** Open the preview at full-screen on Scott's M3 Mini. Does `#244A5B` read as "premium dark teal" or as "navy" or as "muddy"? Adjust if needed.
2. **Mike Evans card.** Look at it next to Carolina East. Does it read as equal-prestige? Or does the typeset name feel weaker than the photo logo?
3. **Mobile masthead.** At 390px wide, does the headline "2026 Partners" wrap acceptably? Does the stat row stack cleanly?
4. **Empty-tier callout.** Does the gradient card look like a legitimate tier-occupant or like an ad? It's deliberately commercial — that's the point — but it shouldn't feel pushy.

## How to preview

```
open /Users/openclaw/github/craven-cancer-classic/design-explorations/sponsors-redesign-2026-04-25/direction-marquee/index.html
```

Resize to 390px to verify mobile. Mike Evans is the 4th card in the Champion tier. The "Open Sponsorships" block is the last section before the bottom CTA — verify chip hover lift feels right, the chip grid wraps cleanly at narrow widths, and the white "Browse all sponsorships →" CTA reads as the primary action against the dark teal panel.
