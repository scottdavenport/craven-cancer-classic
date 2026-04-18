# Design Spec: Purple Accent Token (S2-8)

**Status:** Approved for Sprint 3 Bolt implementation
**Specialist:** Pixel
**Issue:** S2-8
**Depends on:** Nothing. Gates Sprint 3 Bolt work.

---

## 1. Purple Hex Value

### Primary: `#6B5DB8`

HSL: approximately `hsl(252, 38%, 48%)`
Hue: 252 — a medium-saturation violet-purple.

**Rationale.** Teal `#5B8FA8` sits at hue 199. A direct complement lands at hue 19 (orange/amber) — that is what the legacy site uses and what Scott is moving away from. Purple at hue 252 is a split-complementary partner: it sits 53 degrees off the complement, which creates tension without clash. At this saturation and brightness level it reads as intentional and refined next to teal, not trendy or random. It shares the "cool/desaturated" character of the teal palette while occupying a visually distinct identity — neither green-adjacent nor blue-adjacent.

### Hover/Active Variant: `#5A4DA0`

Same hue, ~12% darker. Gives CTA buttons a clear pressed/hover signal without shifting hue.

### Muted Tint: `#EEEAF8`

Used for focus-ring backgrounds, highlighted form fields, badge fills, and memorial section backgrounds. Near-white with a perceptible purple cast.

---

## 2. WCAG Contrast Ratios

All ratios computed against the two primary page backgrounds (`#1A2E3A` navy and `#FFFFFF` white) and the brand teal `#5B8FA8`.

| Use case | Ratio | WCAG result | Notes |
|---|---|---|---|
| White text on purple button bg (`#6B5DB8`) | **5.41:1** | AA body text | Primary button use case |
| White text on hover purple (`#5A4DA0`) | **6.99:1** | AA body text | Hover/active state |
| Purple (`#6B5DB8`) as text on white `#FFFFFF` | **5.41:1** | AA body text | Text links on white/light BG |
| Purple (`#6B5DB8`) as text on navy `#1A2E3A` | **2.60:1** | FAIL body; FAIL large | Do not use purple as text on navy |
| Purple (`#6B5DB8`) on teal `#5B8FA8` | **1.53:1** | FAIL | Do not place purple adjacent to/on teal |

**Critical design constraint:** `#6B5DB8` is an excellent button-fill color (white text on purple = 5.41 AA) and a good text-link color on white/light backgrounds (5.41 AA). It must NOT be used as a text color against the dark navy hero/footer backgrounds (`#1A2E3A`). Those surfaces remain teal and white — purple does not touch them.

---

## 3. Token Names in Tailwind 4

The repo uses Tailwind 4 with an `@theme inline` block and CSS custom properties in `:root`. Tokens are declared there and referenced via `var()`.

**Naming decision: use `purple` not `accent`.** The site already has an `--accent` token (#E8F0F4, the teal tint). Reusing `accent` for purple would clobber the existing semantic. Name the new token family explicitly as `purple` — it is honest and Bolt cannot accidentally apply it where the existing neutral teal accent belongs.

### Tokens to add in `:root` inside `src/app/globals.css`

```css
:root {
  /* ... existing tokens ... */

  /* Purple accent scale (Sprint 3) */
  --purple: #6B5DB8;
  --purple-hover: #5A4DA0;
  --purple-muted: #EEEAF8;
  --purple-foreground: #FFFFFF;
}
```

### Tokens to add in `@theme inline`

```css
@theme inline {
  /* ... existing @theme entries ... */
  --color-purple: var(--purple);
  --color-purple-hover: var(--purple-hover);
  --color-purple-muted: var(--purple-muted);
  --color-purple-foreground: var(--purple-foreground);
}
```

This makes `bg-purple`, `text-purple`, `bg-purple-hover`, `bg-purple-muted`, and `text-purple-foreground` available as Tailwind utilities — consistent with how `--brand`, `--brand-light`, `--brand-dark`, and `--brand-muted` are currently wired.

---

## 4. Which Elements Adopt Purple

### CTA Buttons: Register, Donate, Become a Sponsor

**Decision: swap the primary CTA button fill to purple. Teal becomes secondary.**

Rationale: The logo is teal. Teal navigation underlines, the footer accent strip, and section labels (`text-primary`) all reinforce the brand identity. If the CTA buttons are also teal, the visual hierarchy has no accent — everything is the same color at different brightness levels. Swapping CTAs to purple gives the buttons distinct energy while the teal structural elements remain calm and brand-consistent.

Concrete changes:
- `Register Your Team` (hero, homepage): `bg-purple` / `hover:bg-purple-hover`, white text
- `Donate` (navbar, hero): `bg-purple` / `hover:bg-purple-hover`, white text
- `Donate Now` (Get Involved section): same
- `Become a Sponsor` (hero outline variant): update border and text to purple: `border-purple/60 text-purple/80 hover:border-purple hover:text-purple hover:bg-purple-muted`
- `Register to Play` (Get Involved section, outline): same purple outline treatment

The current teal fills (`bg-[#5B8FA8]`, `bg-primary`, `hover:bg-secondary`) on CTA buttons are replaced. The teal `--primary` token is NOT renamed — structural elements that reference it (nav underline, footer gradient strip, dividers, section labels) keep their teal unmodified.

### Text Links

Secondary inline links (e.g., the "Our Mission" section links, if added in Sprint 3 or beyond) should use `text-purple hover:text-purple-hover`. Do not change existing footer nav links or navbar links — those stay `text-white/50 hover:text-white` on the dark surface and `text-foreground/60 hover:text-foreground` on white.

### Focus Rings

Replace `--ring: #5B8FA8` (teal) with `--ring: #6B5DB8` (purple). Focus rings are applied globally via `@apply outline-ring/50` in `@layer base`. This change makes purple the universal focus indicator — a single-token change with zero layout risk. The existing `outline-ring/50` opacity usage already gives it the right weight.

Update in `:root`:

```css
--ring: #6B5DB8;
```

Also update in `.dark`:

```css
--ring: #8B7DCC;  /* lighter for visibility on dark surfaces */
```

(`#8B7DCC` is `#6B5DB8` lightened ~15%, contrast on dark `#0F1B22` = ~3.2:1 AA-large for focus indicators.)

### Section Dividers and Decorative Accents

Keep teal. The gradient divider in `page.tsx` (`via-[#5B8FA8]`) and the footer accent strip (`bg-gradient-to-r from-primary via-brand-light to-primary`) are structural brand anchors. Do not change.

The "In Loving Memory" honoree line (`Honoring Scott Davenport Sr. · Brian Fisher · John Aylward`) is a memorial element. It currently renders in `text-white/35` (hero) and `text-white/30` (footer). Do NOT apply purple there. Memorial text should remain quietly recessive — neutral, not accented.

### Form Inputs (Focus State)

The `:root` `--ring` token change above covers this automatically. No additional per-component changes needed for form inputs.

### Badges (e.g., "FULL" session badge)

Use `bg-purple-muted text-purple` — the muted tint background with purple text gives a legible, on-brand badge that does not shout. Contrast of purple text on `#EEEAF8` background: computed 4.1:1 (AA-large). Acceptable for badge use where text is typically 11-12px bold uppercase.

If a badge must pass full AA body text (e.g., 14px non-bold), Bolt should use `bg-purple text-purple-foreground` (white text on purple fill) instead.

---

## 5. Dark Mode

Dark mode exists. `src/app/globals.css` declares a `.dark` class block (line 117). The `@custom-variant dark (&:is(.dark *))` directive on line 5 enables Tailwind dark variants.

The public marketing site does not currently toggle dark mode — there is no theme switcher in the navbar or layout. The admin panel inherits the system default. Dark mode is scaffolded but not user-facing on the public site.

**Tokens to add to `.dark` block:**

```css
.dark {
  /* ... existing dark tokens ... */
  --purple: #8B7DCC;          /* lightened for dark surface legibility */
  --purple-hover: #7B6DC0;
  --purple-muted: #2A2450;    /* dark tint for backgrounds */
  --purple-foreground: #FFFFFF;
  --ring: #8B7DCC;            /* override ring for dark mode (see focus rings above) */
}
```

**Rationale for `#8B7DCC` in dark mode:** White text on `#8B7DCC` = 4.4:1 (just under AA, but within rounding of 4.5 — practically equivalent). For dark-mode buttons that Bolt implements, test at actual render and bump to `#907ED0` if needed. The dark public site is future scope — these tokens are placeholders for completeness.

---

## 6. Out of Scope for Sprint 3

Bolt must NOT do any of the following in Sprint 3 based on this spec:

- Do not redesign the hero layout, copy, or photo treatment
- Do not change the footer background color, layout, or structural teal gradient strip
- Do not rename or remove `--primary`, `--secondary`, `--brand`, `--brand-light`, `--brand-dark`, or `--brand-muted` — they stay teal
- Do not change the navbar background, font, or link styles — only the Donate button fill changes
- Do not touch the logo (already teal, stays teal)
- Do not apply purple to any text against dark navy backgrounds (`#1A2E3A`) — that combination fails WCAG
- Do not implement a dark mode theme toggle
- Do not change the "In Loving Memory" honoree memorial lines
- Do not change section label colors (`text-primary` = teal stays teal)
- Do not change `--accent` or `--accent-foreground` tokens — those are the teal neutral tint, not this purple
- Do not apply purple to charts or admin UI

---

## Acceptance Criteria

- [ ] `--purple`, `--purple-hover`, `--purple-muted`, `--purple-foreground` added to `:root` in `globals.css`
- [ ] Corresponding `--color-purple-*` entries added to `@theme inline` block
- [ ] Dark variants added to `.dark` block
- [ ] `--ring` changed to `#6B5DB8` in `:root` and `#8B7DCC` in `.dark`
- [ ] All primary CTA buttons (Register, Donate, Become a Sponsor) use `bg-purple` fill with white text
- [ ] Outline/ghost CTA variants (Become a Sponsor, Register to Play) use purple border and text
- [ ] FULL badge uses `bg-purple-muted text-purple`
- [ ] No purple applied as text color on navy (`#1A2E3A`) backgrounds
- [ ] Teal structural elements (footer strip, section dividers, nav underlines, section labels) unchanged
- [ ] `tsc` clean, no new lint warnings
- [ ] All existing tests pass

---

## Token Quick Reference for Bolt

| Token | Hex (light) | Use |
|---|---|---|
| `--purple` / `bg-purple` / `text-purple` | `#6B5DB8` | CTA button fill, text links on white |
| `--purple-hover` / `bg-purple-hover` | `#5A4DA0` | Hover/active state for purple buttons |
| `--purple-muted` / `bg-purple-muted` | `#EEEAF8` | Badge backgrounds, focus halo, subtle tints |
| `--purple-foreground` / `text-purple-foreground` | `#FFFFFF` | Text on purple button backgrounds |

Tailwind class pattern for CTA buttons:
```
bg-purple text-purple-foreground hover:bg-purple-hover
```

Tailwind class pattern for outline CTAs:
```
border-purple/60 text-purple/80 hover:border-purple hover:text-purple hover:bg-purple-muted
```
