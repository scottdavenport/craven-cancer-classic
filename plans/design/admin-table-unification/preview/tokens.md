# Phase 1 Tokens — Admin Table Unification

> Cross-component token decisions for `<RowActions>`, `<StatusTabs>`, `<FilterBar>`, `<ModalSection>`, role-cards form, and the Checkbox primitive override (PR-1B). Every token below is sourced from `src/app/globals.css` (Tailwind v4 inline `@theme` block) — no new tokens introduced.

Reference docs:
- Design source of truth: [`plans/2026-05-admin-table-unification-design.md`](../../../2026-05-admin-table-unification-design.md) (PR #369)
- Sprint plan: [`plans/2026-05-admin-table-unification-sprint.md`](../../../2026-05-admin-table-unification-sprint.md) §3 Phase 1 (PR #370)
- Tokens: [`src/app/globals.css`](../../../../src/app/globals.css)

---

## Color

All tokens map 1:1 to CSS variables defined in `globals.css` and exposed as Tailwind utilities via the `@theme inline` block (lines 7–74).

| Application | Token | Hex (light) | Tailwind class |
|---|---|---|---|
| Primary action / brand fill | `--primary` | `#5797a6` | `bg-primary` `text-primary` |
| Brand teal — hover / accent | `--brand-dark` | `#3A6B83` | `bg-brand-dark` `text-brand-dark` |
| Brand teal — chip background, selected card wash | `--brand-muted` | `#E8F0F4` | `bg-brand-muted` |
| Section header text, chip text, active tab text | `--brand-darker` | `#244A5B` | `text-brand-darker` |
| Foreground (body text, primary card title) | `--foreground` | `#1A2E3A` | `text-foreground` |
| Muted body text, inactive tab labels, filter labels | `--muted-foreground` | `#5F7A87` | `text-muted-foreground` |
| Subtle row tint background | `--muted` | `#F1F4F6` | `bg-muted` |
| Footer band, hover ghost button | `--muted` (60% opacity) | `#F1F4F6 / 60%` | `bg-muted/60` |
| Card surface, dropdown trigger background | `--card` `--background` | `#FFFFFF` `#FAFBFC` | `bg-card` `bg-background` |
| Border (1.5px standard) | `--border` | `#DAE3E8` | `border-border` |
| Checkbox border (unchecked, 2px) | `slate-400` | `#94A3B8` | `border-slate-400` |
| Destructive button bg | `--destructive` (10%) | `rgba(197,48,48,0.10)` | `bg-destructive/10` |
| Destructive button text | `--destructive` | `#C53030` | `text-destructive` |
| Success status badge | `--success` `--success-muted` | `#2E7D5E` `#E8F5EF` | `bg-success-muted text-success` |
| Warning status badge / F19 message | `--warning` `--warning-muted` | `#B45309` `#FEF3C7` | `bg-warning-muted text-warning` |
| Pill badge bg (count badge inactive) | `--neutral-100` | `#EEF0F2` | `bg-neutral-100` |
| Toggle switch bg (off) | `--neutral-100` | `#EEF0F2` | `bg-neutral-100` |
| Toggle switch bg (on) | `--primary` | `#5797a6` | `bg-primary` |
| Focus ring (checkbox + dropdown) | `--brand` (25% opacity) | `rgba(87,151,166,0.25)` | `ring-brand/25` |

Dark-mode equivalents resolve automatically via `globals.css` `.dark` block (lines 172–213). All previews assume light mode — admin chrome is light-mode only today.

---

## Typography

Two-family stack already in use across the project. No new families introduced.

| Application | Family | Size | Weight | Letter-spacing | Tailwind class |
|---|---|---|---|---|---|
| Modal title (DialogTitle) | Fraunces (display) | 17px | 500 | -0.005em | `font-display text-[17px] font-medium tracking-[-0.005em]` |
| Section preview-title (page H1) | Fraunces | 28px | 400 | -0.01em | `font-display text-[28px] tracking-[-0.01em]` |
| Section header label (ModalSection) | Manrope | 11px | 700 | 0.10em uppercase | `text-[11px] font-bold uppercase tracking-[0.10em]` |
| Filter label (above dropdown) | Manrope | 11px | 600 | 0.08em uppercase | `text-[11px] font-semibold uppercase tracking-[0.08em]` |
| Status tab label (inactive) | Manrope | 13.5px | 500 | normal | `text-[13.5px] font-medium` |
| Status tab label (active) | Manrope | 13.5px | 600 | normal | `text-[13.5px] font-semibold` |
| Status tab count badge | Manrope | 11px | 600 | tabular-nums | `text-[11px] font-semibold tabular-nums` |
| Filter chip text (key) | Manrope | 12.5px | 600 | 0.02em | `text-[12.5px] font-semibold` |
| Filter chip text (value) | Manrope | 12.5px | 500 | normal | `text-[12.5px] font-medium` |
| Body field input text | Manrope | 13.5px | 400 | normal | `text-[13.5px]` |
| Body field label | Manrope | 11px | 600 | normal | `text-[11px] font-semibold text-muted-foreground` |
| Role card name | Manrope | 14px | 600 | normal | `text-sm font-semibold` |
| Role card summary | Manrope | 12px | 500 | normal | `text-xs font-medium text-muted-foreground` |
| Button (default size) | Manrope | 14px | 500 | normal | `text-sm font-medium` (existing Button) |
| Clear-all link | Manrope | 12.5px | 600 | normal | `text-[12.5px] font-semibold` |
| Page eyebrow | Manrope | 11px | 600 | 0.12em uppercase | `text-[11px] font-semibold uppercase tracking-[0.12em]` |

Body uses `font-variant-numeric: oldstyle-nums` globally (per `globals.css:222`). Tabular nums override (`.tabular-nums`) is applied per-element where digit alignment matters (count badges, money/handicap fields).

---

## Spacing

Vertical rhythm anchored on a 4px grid. All spacing maps to standard Tailwind v4 utility scale.

| Application | Value | Tailwind class |
|---|---|---|
| Per-row checkbox column width | 40px | `w-10` |
| Row actions inter-control gap | 4px | `gap-1` |
| Row actions surface-special left margin | 4px | `ml-1` |
| Row actions icon button size | 28 × 28px | `size-7` |
| Row actions icon glyph size | 16px | `size-4` |
| Row hover horizontal padding (cell) | 16px | `px-4` |
| Row vertical padding | 12px | `py-3` |
| Status tab vertical padding | 10px | `py-2.5` |
| Status tab horizontal padding | 14px | `px-3.5` |
| Status tab label-to-count gap | 8px | `gap-2` |
| Status tab count badge dimensions | min-w 22px · h 18px · px 6px | `min-w-[22px] h-[18px] px-1.5` |
| Filter bar container padding | 16px | `p-4` |
| Filter bar inter-section gap | 14px | `gap-3.5` |
| Filter bar secondary row gap | 12px | `gap-3` |
| Filter dropdown trigger height | 36px | `h-9` |
| Filter chip height | 26px | `h-[26px]` |
| Filter chip padding | 0/4px right · 10px left | `pl-2.5 pr-1` |
| Filter chip close button | 18 × 18px | `size-[18px]` |
| Filter toggle switch | 32 × 18px | n/a (via Switch primitive) |
| Modal section top padding | 16px | `pt-4` |
| Modal section header bottom padding | 8px | `pb-2` |
| Modal section body top padding | 12px | `pt-3` |
| Modal section body bottom padding | 12px | `pb-3` |
| Modal section inter-gap | 8px | `mt-2` |
| Dialog content padding | 16px (top/bottom) · 20px (sides) | `py-4 px-5` |
| Dialog footer padding | 12px (top/bottom) · 20px (sides) | `py-3 px-5` |
| Role card padding | 12px (vertical) · 14px (horizontal) | `py-3 px-3.5` |
| Role card head gap | 10px | `gap-2.5` |
| Role card icon container | 28 × 28px | `size-7` |
| Role card expanded fields padding-left | 38px | `pl-[38px]` |
| Role card inter-card gap | 8px | `mt-2` |
| Checkbox sm | 16 × 16px | `size-4` |
| Checkbox md | 20 × 20px | `size-5` |
| Checkbox border (all states) | 2px | `border-2` |

---

## Radius

Mapped to existing `--radius-*` tokens (defined `globals.css:67–74`).

| Token | Value | Tailwind class | Used by |
|---|---|---|---|
| `--radius-sm` | 4px | `rounded-sm` | (sparingly — checkbox uses literal value) |
| `--radius-md` | 5px | `rounded-md` (≈ `rounded-[var(--radius-md)]`) | Icon buttons, badges, role-card icon container |
| `--radius-lg` | 10px | `rounded-lg` | Filter dropdown trigger, Input, Role card |
| `--radius-xl` | 12px | `rounded-xl` | Dialog content, Surface frames |
| Full pill | 999px | `rounded-full` | Count badges, chips, toggle switches |
| Checkbox sm | 3px | `rounded-[3px]` | Per-row checkbox |
| Checkbox md | 4px | `rounded-[4px]` | Form-field checkbox |

Brand convention from `craven` profile (the Pixel brief lines): **inputs 6 / buttons 10 / cards 12** maps cleanly: inputs use `--radius-md` / `--radius-lg`; buttons use `--radius-lg`; cards use `--radius-xl`. Rounded-pill stays for badges.

---

## Elevation (shadows)

| Application | Token | Tailwind class |
|---|---|---|
| Default button (resting) | `--shadow-xs` | `shadow-[var(--shadow-xs)]` |
| Default button (hover) | `--shadow-sm` | `shadow-[var(--shadow-sm)]` |
| Surface frame (page section) | `--shadow-xs` | `shadow-[var(--shadow-xs)]` |
| Dialog popup | `--shadow-lg` | `shadow-[var(--shadow-lg)]` |
| Toggle thumb | `--shadow-xs` | (inline on Switch primitive) |

All shadow tokens use navy-rgba (defined `globals.css:156–159`) — never grey/black. Maintains the warm-cool feel of the Craven palette.

---

## Motion

Two easing curves available globally (`globals.css:162–163`). Phase 1 uses both.

| Application | Duration | Easing | Tailwind class |
|---|---|---|---|
| Row hover-tint reveal | 100ms | ease-out | `transition-colors duration-100 ease-out` |
| Row actions opacity fade-in | 150ms | ease-out | `opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-out` |
| Row actions opacity fade-out | 150ms | ease-out | (same — symmetric) |
| Status tab color shift | 100ms | ease-out | `transition-colors duration-100 ease-out` |
| Filter dropdown trigger hover | 100ms | ease-out | `transition-colors duration-100 ease-out` |
| Filter chip close hover | 100ms | ease-out | `transition-colors duration-100 ease-out` |
| Toggle thumb position | 150ms | ease-spring | `transition-[left] duration-150 ease-[var(--ease-spring)]` |
| Role card border + bg | 150ms | ease-out | `transition-[border-color,background-color,opacity] duration-150 ease-out` |
| Role card expand/collapse | 200ms | ease-out | `transition-all duration-200 ease-out` |
| Checkbox state change | 100ms | ease-out | `transition-colors duration-100 ease-out` |
| Dialog enter | 100ms | (default base-ui) | `data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95` (existing) |
| Dialog exit | 100ms | (default base-ui) | `data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95` (existing) |
| Default button press | 100ms | (default) | `active:translate-y-px` (existing Button utility) |

No motion uses `useNativeDriver` — this is web. All transitions are CSS-driven via Tailwind's transition utilities; React Server Components remain unaffected.

---

## Iconography

Project uses `lucide-react` everywhere (cited in `package.json`; verified in `src/components/ui/checkbox.tsx:5` and `src/components/ui/dialog.tsx:7`). Phase 1 uses these specific icons:

| Component | Icon | Tailwind size |
|---|---|---|
| `<RowActions>` edit | `Pencil` | `size-4` (16px) |
| `<RowActions>` delete | `Trash2` | `size-4` (16px) |
| `<FilterBar>` search | `Search` | `size-4` (16px) |
| `<FilterBar>` dropdown chevron | `ChevronDown` | `size-3.5` (14px) |
| `<FilterBar>` chip close | `X` | `size-2.5` (10px) |
| Checkbox check | `Check` | `size-2.5` (sm) / `size-3` (md) |
| Checkbox indeterminate | `Minus` | `size-2.5` (sm) / `size-3` (md) |
| Dialog close | `XIcon` | `size-4` (existing in Dialog primitive) |
| Role card · Player | `Goal` | `size-4` |
| Role card · Sponsor | `Briefcase` | `size-4` |
| Role card · Donor | `Heart` | `size-4` |
| Role card · Volunteer | `Users` | `size-4` |
| Role card · Other | `HelpCircle` | `size-4` |

Stroke width: 2 (lucide default) for general icons; 3 for the in-checkbox `Check`/`Minus` glyphs (visibility on tiny render).

---

## Accessibility floor

Per Pixel a11y baseline + the project's existing aria pattern:
- All icon-only buttons carry `aria-label` (e.g. "Edit Lynne Davenport") — string-locked by Aria.
- Checkboxes use `role="checkbox" aria-checked={boolean|"mixed"}` — already correct in the existing primitive.
- Toggle switches use `role="switch" aria-checked={boolean}`.
- Status tabs use `role="tablist"` + `role="tab"` + `aria-selected`.
- Filter dropdowns use shadcn `<Select>` (built on `@base-ui/react/select`) — aria semantics inherited.
- Hover affordances also fire on `focus-within` (keyboard nav) — `<RowActions>` reveals on tab focus to any child button.
- Touch targets ≥ 44pt: row hit-area is 44pt+ vertically (12px padding + 13.5px text + 12px padding = 37.5px content area in a 44pt+ row). Icon buttons are 28pt visually but live inside a row, so the row is the effective hit target.
- WCAG AA contrast verified for body (`foreground` on `card` = 13:1), muted body (`muted-foreground` on `card` = 4.7:1), brand-darker on brand-muted (8.2:1). All pass.

---

## Cascade summary

What this Phase 1 spec means downstream:

- **Phase 2 (Sponsors)** uses every primitive above. No new tokens.
- **Phase 3 (Contacts/Teams/Sponsorships/Photos)** uses every primitive above plus role-cards on Contacts. No new tokens.
- **Phase 4 (Universal CSV button)** uses existing Button + lucide `Download` icon (`size-4`). No new tokens.

If any Phase 2/3 PR introduces a new token or deviates from the values here, that PR must update this file in lockstep — the design preview is the visual contract Watchdog diffs against per `feedback_watchdog_design_adherence_diff.md`.
