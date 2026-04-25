# Direction 2 — The Almanac

## Concept

The page is a printed annual register from a long-running institution. Sponsors are entries. Tiers are chapters. Each year is an edition. The visual vocabulary borrows from the Lloyd's of London Names register, Burke's Peerage, and mid-century yearbook aesthetics — type-driven, columnar, almost academic. The page does not perform; it RECORDS. Reading it feels like reading the back-matter of a serious institutional publication.

This is the most restrained of the three directions. There are no plaque borders, no varsity ornaments, no decorative graphics. There is type, hairline rules, generous negative space, and a single sage-green accent that runs as a thread through every chapter marker. The character comes from the typographic system — Roman numerals as ordinals, italic Fraunces opsz 144 for the chapter numerals, double-rule chapter markers, and the consistent doubled-name treatment (typeset name + tracked-caps name) on every entry.

## Mood References

1. **Lloyd's of London Names register pages** (consistent column width, tracked small caps for category, names in graceful italic, no decoration beyond hairline rules — the register IS the design)
2. **Burke's Peerage / Burke's Landed Gentry annual editions** (italic display caps for family names, columns ruled with hairlines, repeating typographic rhythm across hundreds of pages — the rhythm is the dignity)
3. **Yale Banner yearbook (mid-century editions)** (academic-record aesthetic, paragraph-style entries, year stamped at the head of each section, italic Roman numerals for sections)

## How It Solves the Four Problems

### 1. Logo normalization across wildly different aspect ratios

Every sponsor entry is a "record" with two stacked cells: a **logo cell** (white ground, fixed aspect per tier — 4:3 at Champion/Eagle, 3:2 at Standard, 2:1 at Compact) and a **name cell** (cream ground, sage top-rule, tracked-caps name). The logo `object-contain`s into the cell at a deliberate 86% × 78% inner-bound — generous padding inside the cell so wildly-different logos all sit at similar optical density.

The crucial move: **every record's logo cell is a clean white aperture against the cream page**. The repeating white-cell rhythm gives the page its grid; the logo within is a guest in that grid. A square photo logo (Carolina East) and a wide horizontal banner (Lynne Davenport) both occupy identical white apertures, with their content centered within. The eye reads the page as a register of equal entries, not a parade of wildly-different cards.

The white logo-cell ground also handles white-on-color logos (Chick-fil-A) gracefully — the colored logo "block" sits naturally on white; the cream page surrounds it without competition.

### 2. Missing-logo treatment (Mike Evans)

Mike Evans gets a record cell **identical in shape and structure** to Carolina East's. Same white logo cell. Same sage top-rule. Same tracked-caps name cell.

The difference is what's in the logo cell: a typeset name in italic Fraunces opsz 96, set centered. "Mike Evans" appears as a printed nameplate — the typesetting itself IS the insignia. Below in the name cell, the same tracked-caps "MIKE EVANS" appears as it does for every other entry, with a sub-line: "Without Insignia · Patron · MMXXVI."

This treatment leans into the register conceit: in a real annual register, an entry without a coat-of-arms or trademark would simply be **typeset more elaborately** — the printed name carries the weight that an emblem would carry for an institution. The sub-line "Without Insignia" is honest and dignified — it acknowledges the difference without apologizing for it. The double-name treatment (typeset display + tracked caps) reinforces that this is a **deliberate** entry mode, not a fallback.

This is the strongest of the three directions on this problem because the doubled-name pattern applies to ALL entries, not just Mike Evans — Carolina East shows logo + tracked-caps name, Mike Evans shows typeset name + tracked-caps name. The TRACKED-CAPS layer is the constant; the upper layer just varies in mode.

### 3. Tier hierarchy that doesn't drop off a cliff after Eagle

Every chapter (tier) has the same three-element header: **Roman numeral · chapter name · entered count**. The numeral is always italic Fraunces opsz 144 in sage. The chapter name is always Fraunces opsz 96 weight 500 in foreground navy, all caps. The entered-count is always Manrope tracked caps in muted-foreground. The double-line rule that connects them is always the same.

What changes across tiers:
- **Grid density** scales: 2-up → 3-up → 4-up → 6-up
- **Logo cell aspect** flattens: 4:3 → 4:3 → 3:2 → 2:1
- **Name-cell type sizes** step down: 0.8125rem → 0.6875rem → 0.625rem → 0.5625rem
- **Sub-line** present at Champion only, absent at Eagle/Standard/Compact

Critically, **every tier still has a chapter header** — the Roman numeral, the chapter name, the rule, the count. There's no tier where the design strips ornament, because there's no ornament to strip. The system was always typographic. Compact entries look like the natural smallest member of the same register, not a row of orphaned thumbnails.

### 4. Filled-vs-empty tier visual distinction

An empty tier shows the **chapter header at 55% opacity** (signaling "this section is open") plus a single full-width "vacancy notice" in place of the record grid:

```
[ VACANT ]   The Eagle Sponsorship is open for the 2026 season at
             $2,500. Includes premium course signage, recognition at
             the awards reception, and a foursome in the tournament
             field.                                     [ Inquire to Enter → ]
```

The vacancy notice is **typeset in the same way as a real chapter introduction would be** — sage tag at left (like a small-caps category label), running text in Fraunces, an outlined Manrope CTA at right. It looks like an entry in the register, not a missing entry. The "VACANT" tag is a small-caps box with sage border + sage-muted background — it's the only place sage is used as a fill color anywhere on the page.

The contrast with a populated chapter: populated chapters have a grid of records, the chapter header at full opacity. Vacant chapters have a single full-width notice, header at 55% opacity. Both look intentional; neither looks broken.

## Tier Cascade Strategy

The cascade is **column density**, not visual ornament reduction. Champion is 2-up wide records; Eagle is 3-up; Standard is 4-up; Compact is 6-up. Every record uses the same DNA — white logo cell + sage top-rule + tracked-caps name cell. The eye reads "more entries per row" as "lower tier" in the way a printed register has more names per page in its supporting categories. There is no Champion plaque vs. Compact thumbnail dichotomy; they are all entries in the same book.

| Tier | Grid (desktop) | Logo cell aspect | Name cell type-size | Sub-line |
|---|---|---|---|---|
| Champion | 2-up | 4:3 | 0.8125rem / 0.2em tracking | Yes (Entered · MMXXVI) |
| Eagle | 3-up | 4:3 | 0.6875rem / 0.16em | No |
| Standard | 4-up | 3:2 | 0.625rem / 0.14em | No |
| Compact | 6-up | 2:1 | 0.5625rem / 0.12em | No |

## Empty Tier Treatment

Rendered in the preview as an "empty Eagle" chapter. The chapter header (Roman II + "Eagle — vacancy example") is at 55% opacity. Below: a single full-width vacancy notice with the package details and a single "Inquire to Enter →" CTA. The notice has a sage double-rule top border that visually echoes the register's interior chapter-divider rules.

For a tier with multiple vacant slots, the notice could repeat (one notice per vacancy) OR a single notice could mention "Five vacancies open" — admin choice at the data layer. The preview shows the single-notice variant.

## Palette Extension Proposal

**`--sage: #738B6E`** — used as the chapter-header rule color (not the chapter-numeral fill, which uses sage too), the record top-rule (the 2px accent at the top of every record), the colophon CTA border, and the vacancy tag border + chapter-numeral fill on vacant tiers.

**`--sage-deep: #4F6549`** — used for the almanac stamp text in the hero, the vacancy body emphasis, and the chapter-stamp on vacant tiers.

**`--sage-muted: #E6ECE2`** — used as the vacancy tag background fill.

Three sage tones, used sparingly. They harmonize with brand teal as a botanical-adjacent neighbor (similar hue family, different temperature) without competing. The page's dominant accent is **type weight and rule rhythm**, not color — sage is the second voice, used like an italic in a dense paragraph.

## Risks

- **Could read too cold or too academic.** The editorial restraint might land as "this is a directory, not a celebration." Mitigation: the hero copy ("makes possible the next round of care, transport, and treatment") softens the institutional tone with mission-relevant warmth. Aria should review.
- **Sage + brand teal needs validation in real usage.** Both are blue-greens with different temperatures. They look harmonious in the preview but real-page integration (with the existing nav header in brand teal) needs eyeballing on a real device. If they clash, sage can shift cooler (toward `#6B8474`) or warmer (toward `#7E9670`) to find balance.
- **The "Without Insignia · Patron" sub-line** is the most editorial-sounding moment in the design. Aria-level scrutiny required. Alternatives if it lands as too archaic: "Patron · MMXXVI" (drop the "Without Insignia" phrasing) or "Honored Patron · MMXXVI." The current copy is an aesthetic flourish that risks being precious.
- **The doubled-name pattern (typeset display + tracked caps) requires careful name-length handling.** Long names like "Lynne Davenport · Century 21 Zaytoun Raines" wrap awkwardly in the tracked-caps cell at small tier sizes. The preview handles it OK at Champion size; at Eagle it would need the typeset display layer simplified (probably no doubled name treatment for non-Mike-Evans entries — the doubled treatment exists to anchor Mike Evans, not to be the default). The shipped implementation should make the typeset name optional and only show it when there's no logo.
- **The double-rule chapter divider is hard to render reliably across browsers.** The current implementation uses a `::after` pseudo-element with a 3px offset — most browsers render this fine, but Safari occasionally subpixel-rounds the offset. Visual QA required.
- **Roman numerals at very large sizes** (3.5rem in italic Fraunces opsz 144) need the variable font loaded — fallback to non-variable Fraunces will render acceptably but lose some character.

## Implementation Cost vs Shipped Design

**Lower than shipped.** This direction is structurally simpler than what's currently in production:

- The `SponsorCard` becomes thinner — no tier strip, no double rule, no diamond ornaments. Just a `<a>` wrapping a logo cell + name cell.
- The chapter-header component is new but trivial — a 3-column grid (numeral / name + rule / stamp).
- The `VacancyNotice` component is new — but it's simpler than the current `EmptyState` because it has a fixed 3-column layout with no per-state branching.
- New `--sage*` tokens added to `globals.css`.
- The `record-logo-cell` white background can use `bg-white`; the `record-name-cell` cream can use the existing `--cream-deep` token (or a slightly darker variant of cream).
- The Roman numeral chapter number can be derived from `tier.sort_order` — `["I","II","III","IV","V","VI"][sort_order - 1]` is sufficient for any practical sponsorship-tier count.

The page-level layout is also simpler — fewer custom backgrounds, no tier-section padding-cliff. One Bolt PR could ship this in less time than the current Tournament Program direction took.
