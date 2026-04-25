# Direction 3 — The Field House

## Concept

The vintage collegiate sporting program redux. Think Princeton vs Yale 1948, Wimbledon Championships 1952, the inaugural Masters Tournament 1934. Wool-blanket warmth, varsity-letter typography for tier names, deep heritage palette (cream + a single oxblood), generous use of decorative rules and small ornaments. Energetic without being cheerful. The aesthetic of a program someone would save in a desk drawer and pull out in twenty years to remember the year they sponsored a Champion table.

This is the warmest of the three directions and the only one that uses a deeply-saturated heritage color (oxblood `#5C2A2F`) as a structural element rather than an accent. The masthead is a heritage block. The tier headers are heritage "letterman blocks." The card frames are heritage-bordered. The result is a page that has clear collegiate-sporting energy but never lapses into golf-cliché territory — there are no fairway gradients, no club-and-tee dingbats, no scorecard table tropes.

## Mood References

1. **Princeton vs Yale football program covers (1920s–50s)** (deep colors, wool-felt blocks, varsity-letter typography for team names, restrained ornament — the program as artifact)
2. **Wimbledon Championships official programs (1948–1965)** (cream covers, deep purple accent, ornamental rules, tracked small caps for player categories — restraint with character)
3. **The Masters Tournament inaugural program 1934** (engraved-style display type, sparing decorative ornaments, center-aligned hierarchy — the founding-era voice)

## How It Solves the Four Problems

### 1. Logo normalization across wildly different aspect ratios

Every varsity card has a "logo cell" with a fixed aspect ratio per tier (4:3 at Champion/Eagle, 3:2 at Standard, 2:1 at Compact) and a generous 88% × 84% inner-bound for the logo. The logo cell has a **white ground** (preserves logo brand colors faithfully — Chick-fil-A's red square, Carolina East's photo, BSH's white-on-white text mark all sit naturally) and a **heritage hairline bottom rule** that visually anchors it to the name cell below.

The card itself is bordered in heritage with **four heritage triangle ornaments at each corner** — these corner ornaments are the "varsity" signature element. They give every card the same physical container: a heritage-trimmed frame with a white logo aperture inside. Wildly-different logos all look like equally-prestigious entries in the same program because the FRAME's character is so consistent.

The slight `transform: translateY(-2px)` on hover with a heritage-tinted shadow lifts the card subtly — it's the only motion in the page beyond the initial fadeUp stagger.

### 2. Missing-logo treatment (Mike Evans)

Mike Evans gets the same varsity card frame, the same corner ornaments, the same name-cell layout. The difference: his logo cell holds a **circular monogram** — "M.E." typeset in Fraunces opsz 96 weight 600, set inside a heritage-bordered double-ring circle. The monogram is exactly 7rem × 7rem at Champion size, large enough to feel like a brand mark, with an inner-ring detail (4px inset, 1px heritage border at 40% opacity) that gives the disc real depth.

This monogram treatment has clear collegiate-sporting precedent — varsity letter sweaters, fraternity coats-of-arms, club flags. It reads as a deliberate "personal mark" rather than a fallback. In the same tier section, Carolina East's photo logo and Mike Evans's M.E. monogram both look like they belong in the same program, because they both sit in the same heritage-bordered frame with the same corner ornaments.

The monogram could be auto-generated at the data layer from the patron's first/last initials, or admin-toggleable per sponsor (some patrons might want a different monogram style, e.g. "Mike" instead of "M.E."). The preview uses initials.

For patrons whose names don't render as clean initials (e.g. "BSH" — which is a sponsor with a logo, not a patron, but illustrative), the monogram pattern would either fall back to a stylized name-only treatment OR the admin would upload an actual logo. Mike Evans is the canonical no-logo patron pattern; other edge cases would be handled at the data layer.

### 3. Tier hierarchy that doesn't drop off a cliff after Eagle

The tier cascade is **letterman block → letterman block → letterman block → heritage rule**. Champion, Eagle, and Standard tiers all get a heritage "letterman block" tier header (heritage rectangle with cream corner notches + tier name in Fraunces caps + count stamp). The block itself scales down — Champion gets the largest (1.5rem padding, 2rem name), Standard gets the smallest (1rem padding, 1.25rem name). The COMPACT tier doesn't get a letterman block because at the bottom of the cascade, it would feel oversized for the small thumbnails — instead it gets a "letterman rule" treatment (3px heritage line + 1px hairline + Fraunces tier name centered below + Manrope stamp). This isn't a stripping of ornament; it's a contextually-appropriate variant.

The varsity card frame persists across all four tiers — same corner ornaments, same heritage border, same logo-cell + name-cell structure. What changes:

- **Logo-cell aspect**: 4:3 → 4:3 → 3:2 → 2:1
- **Name-cell type-size**: 1rem → 0.8125rem → 0.75rem → 0.625rem
- **Diamond ornament**: present on Champion + Eagle name cells, absent on Standard + Compact (these tiers are denser; the ornament would compete)
- **Sub-line ("Champion · 2026")**: present on Champion only

The "Friends of the Tournament" naming for Compact (instead of just "Compact") is a copy nudge that frames the smallest tier as a community-supporter category rather than a leftover bucket. Aria-level copy review needed; this can be tuned.

### 4. Filled-vs-empty tier visual distinction

An empty tier shows a **muted-heritage letterman block** (using the lighter `--heritage-muted: #8D5A5E` instead of full heritage) with " — vacancy example" italicized after the tier name. Below: dashed-border "open position" cards in place of real varsity cards.

The open position card has the **same overall structure** as a varsity card — corner ornaments (in heritage-muted instead of full heritage), white-ish logo cell (50% white opacity over cream), name cell — but the logo cell holds a typeset "Open Position" + package summary ("Eagle Partner · **$2,500**"), and the name cell holds a CTA ("Claim This Slot →") instead of a sponsor name. The dashed border + softer corner ornaments + lighter heritage-muted color signal "available" without screaming "missing."

This gives the page a clear three-state visual vocabulary:
- **Sponsored**: full-heritage letterman block + solid-bordered varsity cards
- **Available**: heritage-muted letterman block + dashed-bordered open-position cards
- **Missing data**: should never happen — the system always renders one or the other

## Tier Cascade Strategy

| Tier | Header treatment | Grid (desktop) | Logo cell | Diamond ornament | Sub-line |
|---|---|---|---|---|---|
| Champion | Full letterman block (large) | 2-up | 4:3 | Yes | Champion · 2026 |
| Eagle | Letterman block (medium) | 3-up | 4:3 | Yes | None |
| Standard | Letterman block (small) | 4-up | 3:2 | No | None |
| Compact | Letterman rule (no block) | 6-up | 2:1 | No | None |

The letterman block scales down 3 steps. The compact tier drops the block but retains the heritage thread via the rule line — the page reads as one continuous program from top to bottom, with the CHAMPION block sitting at the masthead and the FRIENDS rule sitting at the back of the program.

## Empty Tier Treatment

Rendered in the preview as an "empty Eagle" section. The letterman block uses the heritage-muted color (signaling "vacant tier"). Below: two open-position cards with dashed heritage-muted borders, "Open Position" typeset in italic Fraunces, package summary in tracked caps, and a "Claim This Slot →" CTA in the name cell. The cards occupy the same grid slots a real Eagle tier would, so the page rhythm is preserved.

For tiers with multiple vacant slots, the open-position card repeats per vacancy — at Eagle that's 5 cards in a row, at Standard 3-4 in a row, etc. The data layer drives this.

## Palette Extension Proposal

**`--heritage: #5C2A2F`** — deep oxblood. Used for masthead background, letterman blocks, varsity-card borders, corner ornaments, monogram strokes, diamond accents, "open position" italics, and CTA button backgrounds.

**`--heritage-deep: #3F1C20`** — used for heading text shadow, masthead barber-pole stripe accent, hover state for CTA button.

**`--heritage-muted: #8D5A5E`** — used for vacant-tier letterman blocks, open-position card corner ornaments, and dashed-border accents.

This is a **two-color page** in feel — cream + heritage with brand teal NOT appearing on the sponsor cards or tier headers. Brand teal continues to live in the site's nav header and CTAs elsewhere, but the sponsors page deliberately operates as a "season program insert" with its own dominant accent. This is similar to how the Masters program has its own Augusta-yellow palette that doesn't appear elsewhere on the broader Augusta National brand.

If Scott prefers brand-teal continuity, the heritage color could be replaced with `--brand-dark: #3A6B83` (existing token) — but the resulting page would lose its distinctive vintage-program character and would risk reading as "blue everything" with the rest of the site. The recommendation is to commit to heritage as a deliberate sub-palette signal that "the sponsors page is a special section."

## Risks

- **Heritage oxblood is the boldest color move of the three directions.** It's beautiful when balanced but risks "wedding invitation" or "law school admissions brochure" if mishandled. The masthead's heritage ground is the most-load-bearing surface — at full saturation it's intentional, but if it competes with brand teal in the nav above it, may need adjustment. Visual QA on a real page-render with the existing site nav is required before commitment.
- **Auto-monogram for name-only patrons** has edge cases: single-name patrons (e.g. "Cher" or "Madonna" — unlikely here, but pattern matters), patrons with 3+ name parts (would need to pick which initials), patrons with non-Latin characters. The data layer needs a `monogram_override` field OR the admin needs to manually approve the auto-generated monogram per patron at admin time. Mitigation: ship the auto-generation, add admin override as a follow-up.
- **The corner-ornament triangles** require careful pixel rendering. At certain zoom levels or browser configurations, the clip-path triangles can render with subpixel jaggies. Visual QA across Safari/Firefox/Chrome required.
- **The barber-pole / diagonal stripe at the bottom of the masthead and atop the CTA section** is a small ornament with high character cost — it reads as "vintage program" if executed cleanly, "candy cane" if overdone. The current 8px stripe is restrained; should be tested on real device before commitment.
- **"Friends of the Tournament" naming for Compact** is a copy choice that requires Aria sign-off. Alternative names: "Supporting Partners," "Friends," "Community Partners." Avoiding the literal "Compact" word is a feature, not a bug — but the alternative needs to be deliberate.
- **Two-color palette discipline** is harder to enforce in production than at mockup time. As the site adds more sponsor-page features (year filter, search, etc.), there will be pressure to use brand teal for accents. The shipped implementation needs a clear style-guide note: "Sponsors page uses heritage as the primary accent. Brand teal does not appear here."
- **Letterman block on mobile (390px)** can feel cramped if the tier name is long ("Champion Partners" + "Founding Tier · 2026 Season" stamp). The current implementation uses `clamp()` for the name and a smaller stamp at narrow viewports — but this needs verification with real device testing. Mike Evans's Champion mockup at 390px is the worst case (largest letterman + 4 cards stacked vertically below).

## Implementation Cost vs Shipped Design

**Same.** The varsity-card component is structurally similar to the current `SponsorCard` (logo cell + name cell + tier scaling). New pieces:

- `--heritage*` tokens (3 new CSS variables)
- `LettermanBlock` component (heritage rectangle with corner notches + Fraunces caps name + Manrope stamp) — replaces the current `tier-strip` header
- `LettermanRule` component (used at Compact tier only)
- `Monogram` component (renders 2-letter circular monogram for patrons without logos)
- `OpenPositionCard` component (vacancy treatment)

The corner notches on the letterman block use background-image `linear-gradient` tricks (no SVG) — copy-paste from the preview's CSS. The corner ornaments on cards use clip-path triangles — also copy-paste-ready.

Auto-monogram generation: a single utility function `generateMonogram(name) -> "M.E."` that takes the first letter of each space-separated word, uppercase, joined by periods. Trivial.

The masthead heritage ground requires either a tier-specific page-level wrapper or a CSS variable scoped to `[data-page="sponsors"]` — depending on whether the layout currently allows hero-level color overrides. Either approach is small.

One Bolt PR. Estimate: same complexity as the current Tournament Program direction took to build (~3-4h with Spec writing tests in parallel).
