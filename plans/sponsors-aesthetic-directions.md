# Sponsor Page: Two Aesthetic Directions

_Pixel design spec — 2026-04-20. Replaces shipped editorial-magazine direction._

---

## What we're replacing

Current `SponsorCard` ships two visually incompatible sub-components:

- **Logo variant** — flat white/cream bordered rectangle, logo floating in empty space.
  Tier differentiation is only height. No character.
- **Patron variant** — dropcap initial + Fraunces display name + "Est. 2010 · Champion Patron."
  Editorial magazine energy. Rich typography, but nothing that says _golf tournament_.

**The core problem:** both need a single visual frame — same borders, same ornaments, same page grammar — where a corporate logo and a patron name feel like they belong in the same program booklet.

---

## Direction A — Trophy Plate

**Concept:** Every sponsor is an engraved award plaque. The card _is_ the plate — dark ground, light letterforms cut into it, a ruled border that feels stamped from a die. The logo becomes the "seal" of the organization; the patron name becomes the engraved dedicatee. Think the donor wall inside a hospital atrium or the name plaques on a club's perpetual trophy.

### Mood References
1. **Augusta National Masters perpetual trophy base** — plain dark bronze with engraved serifs, no ornament beyond the ruled frame. Museum piece by restraint.
2. **US Open Championship trophy donor inscriptions** — tight columns of names, double hairline rule, year + category stamped in small-caps below each name. Visual rhythm from repetition, not decoration.
3. **Tiffany & Co. sports award plaques 1930–1960** — dark oxidized silver ground, chased border, name centered with tracked small-caps. Photographed in Sports Illustrated trophy room editorials.

### Champion Tier — Visual Spec (both variants)

```
┌─────────────────────────────────────────────────────┐  ← outer rule (1.5px #1A2E3A)
│                                                     │
│  ══════════════════════════════════════════════════ │  ← double hairline (1px gap)
│                                                     │
│           ✦  CHAMPION  ✦                            │  ← tier ribbon: tracked caps,
│                                                     │    brand teal on dark ground
│  ┌──────────────────────────────────────────────┐   │
│  │                                              │   │
│  │   [LOGO]  ← object-contain, max-h-20         │   │  ← LOGO VARIANT
│  │   logo tinted to cream/white on dark bg      │   │
│  │   (CSS mix-blend-mode: screen or filter:     │   │
│  │   brightness invert on dark card)            │   │
│  │                                              │   │
│  │   — — — — — — — — — — — — — — — — — — — — — │   │  ← thin rule divider
│  │   CAROLINA EAST MEDICAL                      │   │  ← name: Manrope 11px
│  │   tracked +0.15em, cream/70                  │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ══════════════════════════════════════════════════ │
│                                                     │
└─────────────────────────────────────────────────────┘

PATRON VARIANT — identical frame, logo region replaced with engraved name:

│  ┌──────────────────────────────────────────────┐   │
│  │                                              │   │
│  │       MIKE EVANS                             │   │  ← Fraunces opsz 144
│  │       opsz 144 / wght 300 / italic           │   │    light weight, cream
│  │       cream, centered, text-[32px]           │   │
│  │                                              │   │
│  │   — — — — — — — — — — — — — — — — — — — — — │   │
│  │   EST. 2010  ·  CHAMPION PATRON              │   │  ← Manrope 10px tracked
│  └──────────────────────────────────────────────┘   │
```

Card properties:
- **Ground:** `--foreground` (`#1A2E3A`) — dark navy. NOT black, not dark grey.
- **Logo treatment:** Next.js `<Image>` wrapped in a container with `mix-blend-mode: screen` or `filter: invert(1) brightness(1.8)` (decide per-logo at data level with a `logo_on_dark` flag or just use screen blend universally).
- **Patron name treatment:** Fraunces `opsz` 144, `wght` 300, italic, `--cream` color, centered. Name is the emblem.
- **Tier ribbon:** Single line, Manrope 10px tracked +0.2em, `--brand` teal, centered above inner frame. Flanked by two SVG diamond glyphs (`◆ CHAMPION ◆`).
- **Double hairline rule:** Two `<div>` elements, 1px height, `--brand-muted` (#E8F0F4), 3px apart. Appears top and bottom of inner frame.
- **Border:** Outer 1.5px solid `--brand-dark` (#3A6B83). Inner 1px solid `--brand-dark/40` forming the logo/name container.
- **Grain:** `grain-overlay` utility applies — the noise on dark ground reads as hammered metal texture.

### Tier Cascade

- **Eagle:** Same dark ground, same double-rule top, no outer frame ring. Logo h-16, patron name at Fraunces opsz 72 wght 400, no italic. Tier line: `EAGLE` in brand teal, tracked.
- **Standard:** `--brand-muted` (#E8F0F4) light ground instead of dark. Single hairline rule top. Logo h-14. Patron name Fraunces opsz 36 wght 400, `--foreground`. Tier line removed or whispered in `--muted-foreground`.
- **Compact:** No tier label. Left border-l-2 `--brand`, `--cream` ground. Patron name Fraunces opsz 9 wght 400. Logo h-12 object-contain. Same DNA, minimal surface.

### Palette Extension Request
**Aged brass: `#B8965A`** — used only for the tier-ribbon text at Champion and Eagle levels. Current `--brand` teal on dark navy reads as a cool color-on-cool-color contrast problem. Warm brass against navy is the classic trophy plaque contrast (think: bronze lettering on dark metal). Used _nowhere else_ in the UI. Request: does Scott approve `--accent-brass: #B8965A`?

### Typography Moves
- **Champion patron name:** `fontVariationSettings: "'opsz' 144"`, `fontWeight: 300`, italic. Fraunces at this setting has extreme optical size — hairline contrast. Reads monumental.
- **Champion tier label:** Manrope 10px, `letterSpacing: '0.18em'`, `textTransform: 'uppercase'`. No font-display here — this is a label, not a headline.
- **Patron sub-line:** `fontVariationSettings: "'opsz' 9"`, `fontVariant: 'small-caps'`. Fraunces opsz 9 collapses to text-weight — matches engraved secondary information feel.
- **Name under logo:** Manrope, tracked, `--cream/60` — intentionally subordinate. The logo _is_ the identity.

### Motion / Interactivity
- **Page-load stagger:** Cards animate in with `fadeUp` (`translateY(8px) → 0, opacity 0 → 1`) at 150ms per card, delay `index * 60ms`. Max stagger 600ms (10 cards+).
- **Hover state:** `box-shadow` lifts to `--shadow-md`, outer border brightens to `--brand` from `--brand-dark` over 120ms. No scale — plaques don't tilt.
- **Tier ribbon hover:** `--accent-brass` (if approved) glows slightly — `filter: brightness(1.15)` on the ribbon text.

### Risk
The dark-ground logo treatment is fragile — logos designed for light backgrounds (white/cream logos, transparent PNGs with dark type) will require either `mix-blend-mode: screen` or per-sponsor CSS class, which adds admin complexity unless we add a `logo_on_dark: boolean` flag to the sponsor table.

---

## Direction B — Tournament Program

**Concept:** Every sponsor occupies a "listing" in a printed golf tournament program — the kind printed on off-white card stock that ushers hand you at the first tee. The page has the typographic density of a program booklet: ruled columns, category headers set in tracked small-caps, sponsor names in a hierarchy of display sizes. This direction stays on a LIGHT ground (cream) and leans into ornamental ruling and print-media typography rather than trophy-metal darkness.

### Mood References
1. **1970s–1990s US Open official program interior pages** — two-column layouts, red/navy accent rules, sponsor listings grouped under bold category headers with decorative rule above. The _program_ as artifact.
2. **R&A Championship Committee official scorecards** — ruled grid with alternating row weights, category column in small-caps bold, participant name column in regular weight. Data-density as aesthetic.
3. **Golf Digest "The Record Book" spreads (1980s)** — full-bleed cream pages, bold serif masthead, sponsors listed under thin ornamental rules, year and tier stamped in the gutter.

### Champion Tier — Visual Spec (both variants)

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│ ════════════════════════════════════════════════  │  ← thick + thin double rule
│  ◆  CHAMPION SPONSOR  ◆                          │  ← tier header: tracked Manrope
│ ────────────────────────────────────────────────  │  ← hairline rule
│                                                  │
│   [LOGO]  ← max-h-24, left-aligned               │  ← LOGO VARIANT
│            object-contain, natural colors        │
│                                                  │
│   CAROLINA EAST MEDICAL CENTER                   │  ← Manrope 11px tracked +0.15em
│   carolinaeast.com  ←  Manrope 10px muted        │
│                                                  │
│ ────────────────────────────────────────────────  │  ← closing hairline
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  ← outer dashed rule (program-book
                                                       column-gutter feel)

PATRON VARIANT — same frame, logo replaced with name at display scale:

│   Mike Evans                                     │  ← Fraunces opsz 72, wght 500
│   ← text-[28px] sm:text-[36px], `--foreground`  │
│   ← NOT italic at this tier, weight does work    │
│                                                  │
│   Est. 2010  ·  Champion Patron                  │  ← Manrope 10px tracked, muted
│ ────────────────────────────────────────────────  │
```

Card properties:
- **Ground:** `--cream` (#F9F4EC) with `grain-overlay`. Light side. Natural logo colors preserved — no inversion, no blend-mode gymnastics.
- **Logo treatment:** `object-contain`, natural colors, left-aligned (not centered) — mirrors how program books place sponsor logos in a column grid, not a centered box.
- **Patron name treatment:** Fraunces `opsz` 72, `wght` 500 (not 300 — heavier weight reads like a nameplate entry, not an editorial dropcap). NOT italic at champion level — italic reserved for sub-lines and Eagles.
- **Tier header strip:** Full-width band at top, `--brand` background, `--primary-foreground` (white) text. Manrope 9px tracked +0.2em uppercase. `◆ CHAMPION SPONSOR ◆` with SVG diamond ornaments.
- **Double rule:** Top border is a 3px `--brand` rule + immediate 1px `--brand-muted` rule 2px below. Classic program book masthead treatment.
- **Card border:** 1px solid `--border` (#DAE3E8) all around. Outer container is a column, not a centered box.
- **Internal dividers:** Thin 1px `--border/60` rules between logo/name and the sub-line. Grid lines, not decorative elements.

### Tier Cascade

- **Eagle:** Same cream ground, same double-rule top, tier strip `--brand-muted` ground with `--brand` text (not full-color — one step down). Logo h-[72px] right-aligned (alternates left/right in the grid — like a program spread). Patron name Fraunces opsz 36 wght 400 italic.
- **Standard:** No tier strip. Single top rule in `--brand/40`. Logo h-14. Patron name Fraunces opsz 36 wght 400, `--foreground`. Compact and denser — this tier is a "column listing."
- **Compact:** Single left-border `border-l-2 --brand/30`. No rule ornaments. Name in Fraunces opsz 9 or Manrope 13px. Logo h-12. The "classifieds listing" at the back of the program.

### Palette Extension Request
**Cream-gold: `#C9A84C`** — used only on the tier diamond ornaments (`◆`) and the Champion tier strip accent. Not for text. Gives the program headers a gilt-print feel that reads "award ceremony" without going ostentatious. Request: does Scott approve `--accent-gold: #C9A84C`?

### Typography Moves
- **Champion patron name:** `fontVariationSettings: "'opsz' 72"`, `fontWeight: 500`. Fraunces at opsz 72 / wght 500 is authoritative and clean. No italic — weight asserts.
- **Tier strip text:** Manrope, 9px, `letterSpacing: '0.2em'`, uppercase. Architectural. No display font in the label.
- **Sub-lines / website / year:** Manrope 10px, `--muted-foreground`, normal weight. Program-book fine print.
- **Eagle patron name:** `fontVariationSettings: "'opsz' 36"`, `fontWeight: 400`, italic. One step below Champion — italic signals secondary status in the program hierarchy.

### Motion / Interactivity
- **Page-load stagger:** Same `fadeUp` pattern as Direction A, 60ms per card, max 600ms total.
- **Hover state:** Tier strip brightens — `--brand-dark` instead of `--brand`. Shadow lifts to `--shadow-sm`. Card border shifts to `--brand/40`. Very subtle — program books don't move.
- **Logo hover:** `filter: brightness(1.05)` — barely perceptible. Patron name color shifts from `--foreground` to `--brand-dark` over 150ms.
- **Page-level:** Consider a faint "diagonal mowing stripe" texture on the page background (not cards) using a 3° rotated repeating-linear-gradient at 2% opacity in `--brand-muted`. Fairway stripes at extreme subtlety.

### Risk
Left-aligned logos break the centered-box convention most sponsor pages use — some logos are tall/narrow and will look orphaned left-aligned in a large card. Requires a minimum logo container height and testing with actual logo assets. The alternating left/right Eagle alignment adds layout complexity and may confuse the grid at certain breakpoints.

---

## Recommendation

**Ship Direction B (Tournament Program).**

Three reasons:

1. **Light ground preserves logos.** All three current sponsors (Carolina East, Fuel Market, Century 21) are logos designed for light backgrounds. Direction A requires per-logo dark treatment that adds a `logo_on_dark` schema field and conditional CSS. Direction B works with existing data, existing assets, today.

2. **The unification problem is solved cleanly.** The tier strip + double-rule frame is the same for logo and patron cards. A corporate logo and "Mike Evans" sit inside an identical ruled column — one is an emblem, one is an engraving, but the container is the same program-book listing. This is more coherent than Direction A's inversion approach.

3. **Lower implementation risk, higher ceiling.** Direction B is buildable by Bolt in one PR without new DB fields or image processing logic. The fairway-stripe page texture and the `--accent-gold` ornaments can be added in a follow-up pass. Direction A's dark-ground logo inversion is the kind of thing that looks great in Figma and breaks in production when someone uploads a logo with a transparent dark element.

Direction A is the bolder visual statement and would be stunning with a full rebrand — but it requires control over every sponsor logo's background treatment. We don't have that control today.

**Palette extension needed for B:** `--accent-gold: #C9A84C` on tier ornaments only. Low risk, high pay-off.

---

_File: `/Users/openclaw/github/craven-cancer-classic/plans/sponsors-aesthetic-directions.md`_
