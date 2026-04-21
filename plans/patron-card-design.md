# Design Spec: Patron Cards (No-Logo Variant) — GH #224

## 1. Aesthetic Direction

**"Engraved Donor Wall."** Each card is a typographic plaque — left-anchored composition with a teal vertical rule as the accent spine, a decorative initial or fleuron scaled to tier weight, and Fraunces set at extreme optical sizes to read like hand-lettered dedication text, not a fallback state.

---

## 2. Per-Tier Spec

### Champion (≈144px tall — matches adjacent logo card height)

**Composition:** Asymmetric. Left-justified throughout. 4px teal left border (matching logo card). Large italic drop-initial occupies the left ~40px, baseline-aligned to the name. Name runs beside it at 28px/opsz 144. Subline below name: event year "Est. 2010" in Fraunces small-caps 11px/opsz 9.

```
┌────────────────────────────────────────────────────┐
│ ▌ S  Scottie Davenport                             │
│ ▌    Est. 2010 · Champion Patron                   │
│ ▌                                        ❦        │
└────────────────────────────────────────────────────┘
```

- **Card:** `bg-cream grain-overlay rounded-lg border border-border/60 border-l-4 border-l-brand p-6` — matches logo Champion exactly
- **Drop initial:** Fraunces italic, 80px, `opsz` 144, `wght` 300, color `--brand`, `aria-hidden="true"`, floated left with `mr-3 mt-1 leading-none`
- **Name:** Fraunces roman, 28px/1.1 line-height, `opsz` 144, `wght` 500, color `--foreground`
- **Subline:** `"Est. 2010 · Champion Patron"` — Fraunces italic small-caps, 11px, `opsz` 9, `wght` 400, `font-variant: small-caps`, color `--muted-foreground`
- **Fleuron:** `❦` character, `aria-hidden="true"`, absolute bottom-right `p-4`, Fraunces roman 16px, `opsz` 9, color `--brand-muted` (decorative only)
- **Hover (linked):** `shadow-md` + drop-initial shifts to `--brand-dark`, transition 150ms ease-out

**Font-variation-settings:**
- Drop initial: `'opsz' 144` (Fraunces only exposes `opsz` — weight is via `font-weight: 300`)
- Name: `'opsz' 144`
- Subline: `'opsz' 9`

---

### Eagle (≈112px tall)

**Composition:** Left-justified. No drop-initial. Name in Fraunces roman 20px/opsz 72. Teal fleuron `❧` precedes the name inline as an ornamental bullet, same line, `aria-hidden`. No subline. Thin double-rule header: two 1px horizontal rules 2px apart spanning card width minus padding, above the name.

```
┌────────────────────────────────────────────────────┐
│ ═══════════════════════════════════════════════    │
│ ❧  Mike Evans                                      │
└────────────────────────────────────────────────────┘
```

- **Card:** `bg-cream grain-overlay rounded-md border border-border/60 p-5` — NO left border (distinguishes from Champion, honors the double-rule treatment above)
- **Double rule:** Two `<div>` elements, each `h-px bg-brand-muted`, second one `mt-0.5`, container `mb-4`
- **Ornamental bullet `❧`:** Fraunces roman 14px, `opsz` 9, color `--brand`, `mr-2`, `aria-hidden="true"`
- **Name:** Fraunces roman, 20px/1.15 line-height, `opsz` 72, `wght` 400, color `--foreground`
- **Hover (linked):** `shadow-sm`, ornamental bullet shifts to `--brand-dark`, transition 150ms

**Font-variation-settings:**
- Ornament: `'opsz' 9`
- Name: `'opsz' 72`

---

### Standard (≈96px tall)

**Composition:** Left-justified. Name in Fraunces roman 16px/opsz 36. A single teal rule (1px, 24px wide) left-anchored above the name, matching the current ornamental rule but taller and left-pinned instead of centered. No subline, no ornament character.

```
┌────────────────────────────────────────────────────┐
│ ▬                                                  │
│ Jane Memorial Fund                                 │
└────────────────────────────────────────────────────┘
```

- **Card:** `bg-cream rounded-md border border-border/60 p-5` (no grain on Standard — reserved for Champion/Eagle weight)
- **Rule:** `<div class="h-px w-6 bg-brand mb-3" aria-hidden="true" />`
- **Name:** Fraunces roman, 16px/1.25 line-height, `opsz` 36, `wght` 400, color `--foreground`
- **Hover (linked):** `shadow-xs`, rule expands to `w-10` via `transition-[width] duration-200`, color deepens to `--brand-dark`

**Font-variation-settings:**
- Name: `'opsz' 36`

---

### Compact (≈80px tall)

**Composition:** Left-justified. Name in Fraunces roman 13px/opsz 9, set as a label. A 1px border-left `border-l-2 border-brand/40` provides the only accent — minimal, newspaper-index feel.

```
┌────────────────────────────────────────────────────┐
│ | Friend of the Classic                             │
└────────────────────────────────────────────────────┘
```

- **Card:** `bg-cream rounded-md border border-border/60 p-3 min-h-[5rem]`
- **Left accent:** `border-l-2 border-brand/40 pl-3` on the inner text wrapper
- **Name:** Fraunces roman, 13px/1.3 line-height, `opsz` 9, `wght` 400, color `--foreground`
- **Hover (linked):** `shadow-xs`, left border opacity lifts to `border-brand/80`, transition 150ms

**Font-variation-settings:**
- Name: `'opsz' 9`

---

## 3. Composition Strategy

| Tier | Anchor | Ornament | Subline | Visual Weight |
|------|--------|----------|---------|---------------|
| Champion | Left + left border | 80px drop-initial + fleuron | Est. year · tier label | Highest — matches logo card |
| Eagle | Left, double-rule header | Inline `❧` bullet | None | High |
| Standard | Left, short teal rule | None | None | Medium |
| Compact | Left, thin border-left | None | None | Minimal |

Composition simplifies top-to-bottom: ornamental density drops each tier. Drop-initial is Champion-exclusive. Every tier is left-anchored — no centered composition anywhere.

---

## 4. Typography Details

| Tier | Element | Font | Size | `opsz` | `wght` | Style |
|------|---------|------|------|--------|--------|-------|
| Champion | Drop initial | Fraunces | 80px | 144 | 300 | italic |
| Champion | Name | Fraunces | 28px | 144 | 500 | roman |
| Champion | Subline | Fraunces | 11px | 9 | 400 | italic + small-caps |
| Champion | Fleuron | Fraunces | 16px | 9 | 400 | roman |
| Eagle | Ornament `❧` | Fraunces | 14px | 9 | 400 | roman |
| Eagle | Name | Fraunces | 20px | 72 | 400 | roman |
| Standard | Name | Fraunces | 16px | 36 | 400 | roman |
| Compact | Name | Fraunces | 13px | 9 | 400 | roman |

**Small caps** (Champion subline): applied via `font-variant: small-caps` inline style alongside `fontVariationSettings`.

**Old-style numerals**: `body` already sets `font-variant-numeric: oldstyle-nums` globally — year "2010" will render with old-style figures automatically in Fraunces.

**Fraunces axes confirmed available:** `opsz` only (per `layout.tsx` `axes: ["opsz"]`). Weight via standard `font-weight`. No `soft` or `wonk` axes loaded — do not spec them.

---

## 5. Card Background / Border / Ornament

| Property | Logo Card | Patron Card |
|----------|-----------|-------------|
| Background | Champion: `bg-cream`; Eagle/Standard/Compact: `bg-white` | All tiers: `bg-cream` (warmer, commemorative) |
| Border radius | Champion: `rounded-lg`; rest: `rounded-md` | Same as logo card per tier |
| Border | `border border-border/60` | Same |
| Left border | Champion only: `border-l-4 border-l-brand` | Champion: retain. Eagle: dropped (double-rule substitutes). Standard/Compact: dropped. |
| Grain | Champion: yes (`grain-overlay`) | Champion + Eagle: yes. Standard/Compact: no. |

**Eagle no-left-border rationale:** The double-rule horizontal header performs the tier-marking function. Adding both would be redundant. Eagle logo cards have no left border — patron Eagle matches.

---

## 6. Mobile Behavior at 390px

Cards render inside a CSS grid controlled by the parent sponsor grid. These specs govern within-card behavior only.

| Tier | Mobile treatment |
|------|-----------------|
| Champion | Drop-initial reduces to 56px. Name reduces to 22px. Subline remains 11px. Card min-height drops to 120px. Padding: `p-4`. |
| Eagle | Double rule full width. Name 18px. Ornament 13px. Padding `p-4`. |
| Standard | Name 15px. Rule 24px wide (unchanged). Padding `p-4`. |
| Compact | No changes — already minimal. |

**Implementation:** Use Tailwind responsive prefix on size classes. Example Champion name: `text-[22px] sm:text-[28px]`. Drop initial: `text-[56px] sm:text-[80px]`.

---

## 7. Accessibility

- `sponsor.name` text node is always the primary readable content — never replaced by decorative elements.
- Drop-initial monogram `<span aria-hidden="true">` wraps the first letter; the full name is in a sibling element visible to screen readers. Do NOT use CSS `::first-letter` — it cannot be `aria-hidden`.
- Fleuron `❦`, ornament `❧`, double-rule divs: all `aria-hidden="true"`.
- If `sponsor.website` present, the wrapping `<a>` has implicit accessible name from `sponsor.name` — no additional `aria-label` needed.
- Color contrast: `--foreground` (#1A2E3A) on `--cream` (#F9F4EC) = 11.6:1 — passes AAA.
- Drop-initial `--brand` (#5797a6) on `--cream` (#F9F4EC) = 3.1:1 — decorative only (`aria-hidden`), not required to pass contrast.

---

## 8. Implementation Notes for Bolt

### Variable font application
Tailwind does not expose `fontVariationSettings` as a utility. Apply via inline `style`:

```tsx
// Champion drop initial
<span
  aria-hidden="true"
  style={{
    fontVariationSettings: "'opsz' 144",
    fontWeight: 300,
  }}
  className="font-display italic text-[80px] sm:text-[80px] leading-none text-brand float-left mr-3 mt-1"
>
  {sponsor.name.split(' ')[0][0].toUpperCase()}
</span>

// Champion name
<span
  style={{ fontVariationSettings: "'opsz' 144", fontWeight: 500 }}
  className="font-display text-[28px] leading-tight text-foreground"
>
  {sponsor.name}
</span>

// Champion subline
<span
  style={{
    fontVariationSettings: "'opsz' 9",
    fontVariant: 'small-caps',
  }}
  className="font-display italic text-[11px] text-muted-foreground"
>
  Est. 2010 · Champion Patron
</span>
```

### Drop-cap monogram extraction
```ts
const initial = sponsor.name.split(' ')[0]?.[0]?.toUpperCase() ?? '';
```
Edge case: empty name → `''` → render nothing. Guard with `{initial && <span aria-hidden="true">{initial}</span>}`.

### Patron card structure (Champion example)
```tsx
const patternChampion = (
  <div className="relative">
    <span aria-hidden="true" style={dropInitialStyle} className="...float-left...">{initial}</span>
    <div>
      <span style={nameStyle} className="font-display block">{sponsor.name}</span>
      <span aria-hidden="true" style={sublineStyle} className="font-display italic block mt-1">
        Est. 2010 · Champion Patron
      </span>
    </div>
    <span aria-hidden="true" style={fleuronStyle} className="absolute bottom-0 right-0 p-4 font-display">❦</span>
  </div>
);
```

### Double-rule (Eagle)
```tsx
<div aria-hidden="true" className="mb-4">
  <div className="h-px bg-brand-muted" />
  <div className="h-px bg-brand-muted mt-0.5" />
</div>
```

### "Est. 2010" value
This is a hardcoded brand string — not from DB. The tournament has run since 2010. No prop needed.

### Clearing float (Champion)
Wrap the Champion patron content in `<div className="overflow-hidden">` (clearfix pattern) to contain the floated drop-initial.

---

## 9. Acceptance Criteria

Mapped to GH #224 and additions:

| # | Criterion | Verifiable in simulator |
|---|-----------|------------------------|
| AC-1 | Champion patron card is ≥ 140px tall alongside a Champion logo card | Visual diff at sm breakpoint |
| AC-2 | Drop-initial renders in Fraunces italic at ~80px, color `--brand` | Inspector: fontVariationSettings `'opsz' 144` present |
| AC-3 | Drop-initial span has `aria-hidden="true"` | Accessibility tree: initial not announced |
| AC-4 | Full `sponsor.name` is readable by screen reader (VoiceOver announces it) | VoiceOver sweep on /sponsors |
| AC-5 | Eagle card has double horizontal rule, no left border | Visual check |
| AC-6 | Standard card has a left-anchored 1px × 24px teal rule above name | Visual check |
| AC-7 | Standard rule expands to 40px on hover | Hover state in simulator |
| AC-8 | Compact card has `border-l-2 border-brand/40` inner wrapper | Inspector |
| AC-9 | All tiers use `bg-cream` (not `bg-white`) | Inspector: computed background |
| AC-10 | No card reads as "waiting for logo upload" — ornamental elements render immediately | QA pass on /sponsors with patron-only test data |
| AC-11 | `sponsor-card-text-{id}` testIDs present on all patron card roots | `getByTestId` in component test |
| AC-12 | Fleuron `❦` and `❧` have `aria-hidden="true"` | Accessibility tree |
| AC-13 | Mobile 390px: Champion card min-height ≥ 120px, name ≥ 22px | Resized simulator |
| AC-14 | Hover shadow transitions in 150ms (champion/eagle: `shadow-md`/`shadow-sm`, standard/compact: `shadow-xs`) | DevTools animation timing |
| AC-15 | `font-variant-numeric: oldstyle-nums` renders old-style figures in year "2010" (inherited from body) | Visual check at Champion tier |

---

## TestIDs

All patron card roots retain the existing testID convention — no changes:
- `sponsor-card-text-{sponsor.id}` — root element (already in codebase, unchanged)

Internal decorative elements do not need testIDs (aria-hidden, not interactive).
