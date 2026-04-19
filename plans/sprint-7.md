# Sprint 7 — Site-Wide Design System Application

**Sprint goal:** Apply the Sprint 6 design system to every remaining public page, auth flow, error boundaries, and all admin pages — no page left behind.

**Target dates:** ~1.5 weeks (volume sprint, ~13 PRs)

**Baseline:** `fcd91ae`, 197/197 tests green, tsc clean. No DB changes this sprint — do not regenerate types.

**Design spec:** `plans/design/sprint-7-site-wide.md` (approved, committed to main).

**Locked decisions:**
- Medal emojis removed from leaderboard. Replaced with styled Fraunces position numbers + teal left-border accents.
- Admin dashboard stats remain hardcoded `0`. No data-wiring.
- Login refactor to server wrapper + client `LoginForm` is approved.
- All color via tokens. No new hardcoded hex values.

---

## Research findings (verified before writing this plan)

### File paths — confirmed

All paths in the design spec were verified against the actual repo tree. No surprises on public pages or auth. Two important admin findings:

**Admin directory contains 2 extra pages not in Sprint 7 scope:**
- `src/app/admin/photos/` — exists with `page.tsx` and `photo-moderation.tsx`
- `src/app/admin/contacts/` — directory exists, no `page.tsx` (empty, no route)

These are out of scope for Sprint 7. Do not include them in any builder prompt.

**`src/app/admin/contacts/` has no `page.tsx`** — the nav entry exists in `admin-sidebar.tsx` (line 39: `{ label: "Contacts & Email", href: "/admin/contacts", icon: Mail }`) but the route doesn't render. Out of scope; do not create the page in this sprint.

### Login page is currently `"use client"` (line 1)

`src/app/auth/login/page.tsx` is a full client component (`"use client"` at line 1, `export default function LoginPage()`). It does not currently accept `searchParams`. The S7-10 refactor creates a server wrapper at `page.tsx` (receives `searchParams`, parses error param, passes `initialError` prop) and extracts `src/app/auth/login/login-form.tsx` as the client component.

### Medal emojis — confirmed at lines 119–123

`src/app/(public)/leaderboard/page.tsx` lines 119, 121, 123: `<span className="text-lg">🥇</span>`, `🥈`, `🥉`. These are the exact targets for removal in S7-4.

### Admin sidebar — no active border treatment yet

`src/components/admin/admin-sidebar.tsx`: `SidebarMenuButton` at line 62 has `isActive` prop wired but no `border-l-2 border-primary` class applied (confirmed via grep). Header (line 48) uses `border-b border-sidebar-border` but the wordmark at line 51 is plain `CCC Admin` text with no split treatment.

### Admin layout header — `py-2`, no right-side label

`src/app/admin/layout.tsx` line 15: `border-b border-border/40 px-4 py-2`. Needs `py-3` + right-side label. Confirmed via grep.

### Admin headings — all currently `text-2xl font-bold`

Confirmed across all admin `page.tsx` files:
- `src/app/admin/page.tsx` line 12: `text-2xl font-bold text-foreground`
- `src/app/admin/scores/page.tsx` line 14: `text-2xl font-bold text-foreground`
- `src/app/admin/registrations/page.tsx` line 14: `text-2xl font-bold text-foreground`
(Pattern is consistent across all admin pages — all need the heading block treatment.)

### Admin component files — hardcoded colors confirmed

`bg-red-50 text-red-700` present in:
- `src/app/admin/scores/score-manager.tsx` line 107 (error), line 112 (`bg-green-50`)
- `src/app/admin/registrations/registration-list.tsx` line 111 (error)
- `src/app/admin/sponsors/sponsor-list.tsx` line 110 (error)
- `src/app/admin/sponsorships/sponsorship-manager.tsx` line 99 (error)

### Public pages — hardcoded colors confirmed

- `src/app/(public)/donate/page.tsx` line 125: `bg-[#F1F4F6]` (In Loving Memory section — needs `bg-purple/5 border-y border-purple/20`)
- `src/app/(public)/sponsors/page.tsx` line 120: `bg-[#F1F4F6]` (CTA section — needs `bg-neutral-50 border-t border-border/60`)
- `src/app/auth/login/page.tsx` line 69: `bg-gray-50` (needs `bg-neutral-50`), lines 79/84: `bg-red-50`/`bg-green-50`

### Error pages — currently bare

`src/app/error.tsx`, `src/app/(public)/error.tsx`, `src/app/admin/error.tsx` are all confirmed to exist. Grep returned no matches for `bg-red`, `bg-green`, Fraunces classes, or overline treatment — confirming they are currently unstyled.

### `link-button.tsx` — confirmed exists

`src/components/ui/link-button.tsx` exports `LinkButton` with `buttonVariants` and `VariantProps`. Safe to use in S7-6 quick-action row.

### `sponsorships` page — two-file structure confirmed

`src/app/(public)/sponsorships/page.tsx` + `src/app/(public)/sponsorships/sponsorship-grid.tsx`. Same pattern for gallery: `gallery/page.tsx` + `gallery/gallery-grid.tsx`.

---

## Scope — Issues

### Phase 1: Shared Foundation (serial — merges first)

---

#### S7-0: Admin chrome — sidebar polish + layout header

**Specialist:** Bolt
**Effort:** Small
**Labels:** `feature`, `P1-high`, `size:S`
**Depends on:** Sprint 6 merged to main (already done at `fcd91ae`)

**Why first:** Every admin page PR (S7-6 through S7-9) runs inside the admin layout and sidebar. The chrome must be finalized before admin page screenshots mean anything in Watchdog review.

**Files to touch:**
1. `src/components/admin/admin-sidebar.tsx` — wordmark split, active border, nav item colors
2. `src/app/admin/layout.tsx` — header `py-2` → `py-3`, right-side label

**Exact changes:**

`src/components/admin/admin-sidebar.tsx`:
- Line 51 (plain `CCC Admin` text): replace with split wordmark: `<span className="font-display text-base font-semibold text-foreground">CCC</span><span className="font-sans text-base font-medium text-muted-foreground ml-1">Admin</span>`
- `SidebarMenuButton` at line 62: add `className` with active variant: when `isActive` is true, append `border-l-2 border-primary`; when false, `border-l-2 border-transparent`. This requires switching from the `isActive` prop only to also controlling the className. Use: `className={cn("transition-colors duration-150", isActive ? "border-l-2 border-primary text-foreground" : "border-l-2 border-transparent text-muted-foreground hover:text-foreground")}` — import `cn` from `@/lib/utils`.
- Footer "Sign Out" button: confirm it already has `text-destructive hover:text-destructive`. If not, add.
- Sidebar `<Sidebar>` component: add `className="bg-neutral-50"` if `--sidebar-background` token isn't set (verify computed background in browser before adding).

`src/app/admin/layout.tsx`:
- Line 15: change `py-2` to `py-3`
- After `<SidebarTrigger />` in the header div: add `<div className="ml-auto font-sans text-xs text-muted-foreground/60">Craven Cancer Classic Admin</div>`

**Acceptance criteria:**
- Admin sidebar wordmark shows "CCC" in Fraunces semibold + "Admin" in Inter medium, separated visually
- Active nav item has a teal left border (`border-l-2 border-primary`); inactive items are `text-muted-foreground`
- Header bar is `py-3` (slightly taller than before); "Craven Cancer Classic Admin" label appears right-aligned in the header
- No visual regressions on admin page layout — sidebar + main content area still lay out correctly
- tsc clean, 197 tests pass

**Estimated time:** 2h

---

### Phase 2: Public Pages (parallel after Phase 1 — no file overlap between issues)

All five public page issues touch entirely separate files. They can all run simultaneously once S7-0 is merged.

---

#### S7-1: `/donate` overhaul

**Specialist:** Bolt
**Effort:** Small
**Labels:** `feature`, `P1-high`, `size:S`
**Depends on:** S7-0 merged (Sprint 6 design tokens must be present)

**Files to touch:**
1. `src/app/(public)/donate/page.tsx` — all changes in-file

**Exact changes:**

- Line 21 (hero section): hero is `bg-[#1A2E3A]` — this is correct (navy), keep. Change hero subhead from `text-white/60` to `text-white/70`.
- Line 39 (stats section wrapper): change `bg-white` to `bg-neutral-50`.
- Inside each stat card: add teal rule `<div className="w-12 h-0.5 bg-primary mx-auto mb-4" />` above the stat value.
- All `<p>` overline elements: change from raw `text-xs` to Sprint 6 overline pattern — `font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-[#8BB5C9] mb-3`.
- Line 125 ("In Loving Memory" section wrapper): change `bg-[#F1F4F6]` to `bg-purple/5 border-y border-purple/20`. The existing `border-y border-border` on this element must be replaced entirely.
- "Where Your Gift Goes" list items: change `border-l` to `border-l-[3px]`; change `border-primary/30` to `border-primary/40`.
- Designation callout box: change from `bg-muted/50` to `bg-neutral-50 border border-border/60 shadow-xs`.
- `ProspectCaptureForm` section wrapper: change to `bg-neutral-50 border-t border-border/60`.
- Names "Scott Davenport Sr.", "Brian Fisher", "John Aylward": wrap each in `<span className="font-display italic">`.
- `LinkButton` for the donate CTA: apply Sprint 6 purple CTA pattern — `rounded-none bg-purple px-8 text-[0.8125rem] uppercase tracking-wider text-purple-foreground hover:bg-purple-hover shadow-xs hover:shadow-sm hover:-translate-y-px transition-[background-color,box-shadow,transform] duration-150`.

**Acceptance criteria:**
- Stats section is `bg-neutral-50` (warm off-white, not pure white)
- Teal rule (12px wide, 2px) above each stat number
- "In Loving Memory" section has a purple wash background (`bg-purple/5`) with `border-y border-purple/20` — visually distinct from adjacent `bg-neutral-50` sections
- All overlines: 11px, uppercase, 0.25em tracking
- Tribute names render in Fraunces italic
- No hardcoded hex values remain in the file (except `#1A2E3A` on the hero and `#8BB5C9` on overline text-color — these two are approved per Sprint 6)
- Playwright screenshots at 375px and 1280px — no layout regressions
- tsc clean, 197 tests pass

**Estimated time:** 2h

---

#### S7-2: `/sponsorships` overhaul

**Specialist:** Bolt
**Effort:** Small–Medium
**Labels:** `feature`, `P1-high`, `size:S`
**Depends on:** S7-0 merged

**Files to touch:**
1. `src/app/(public)/sponsorships/page.tsx` — overline + section headings + mission paragraph
2. `src/app/(public)/sponsorships/sponsorship-grid.tsx` — card shadow, sold-out badge, availability bar, purchase form tokens

**Exact changes:**

`src/app/(public)/sponsorships/page.tsx`:
- Hero section: apply Sprint 6 overline pattern to "Support the Tournament" overline.
- Mission paragraph: wrap in Sprint 6 section-rhythm container. Add overline "Our Mission" above it.
- Section heading above grid: add `<p className="[overline classes]">2026 Sponsorship Packages</p>` + `<h2 className="font-display text-h2 font-semibold text-foreground">Support the Classic</h2>`.

`src/app/(public)/sponsorships/sponsorship-grid.tsx`:
- Sponsorship Card: change to `shadow-sm border border-border/60`. Replace `hover:ring-2 hover:ring-primary/30` with `hover:shadow-md hover:-translate-y-0.5 transition-[box-shadow,transform] duration-200`. Keep `ring-2 ring-primary` on selected state.
- Sold-out badge: replace `bg-muted text-muted-foreground` with `bg-neutral-100 text-neutral-600 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-sm`.
- Sold-out card Select button: add `pointer-events-none` in addition to existing `opacity-60`.
- Package name `h3`: add `font-display text-[1.25rem] font-[500]`.
- Availability counter: add a thin progress bar below it — `<div className="mt-1 w-full h-0.5 bg-border/40 rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${(sold_count / max_quantity) * 100}%` }} /></div>`.
- Purchase form container (line 136 in `sponsorship-grid.tsx`): change `rounded-lg border border-primary/20 bg-primary/5 p-6` to `rounded-lg border border-border/60 bg-neutral-50 shadow-sm p-6`.
- Error state inside PurchaseForm: change `bg-red-50 text-red-700` to `bg-destructive/10 text-destructive`.

**Acceptance criteria:**
- Sponsorship cards use shadow lift on hover instead of ring
- Selected card still shows `ring-2 ring-primary` selection indicator
- Sold-out badge is token-based (neutral-100/neutral-600, small-caps)
- Sold-out card's Select button cannot be clicked (`pointer-events-none`)
- Availability progress bar present for all items with `max_quantity` > 0
- Purchase form wrapper is warm neutral (`bg-neutral-50`), not teal-tinted
- Section headings + overlines above the grid are present
- Playwright screenshots at 375px and 1280px — no regressions
- tsc clean, 197 tests pass

**Estimated time:** 2.5h

---

#### S7-3: `/gallery` overhaul

**Specialist:** Bolt
**Effort:** Small
**Labels:** `feature`, `P1-high`, `size:S`
**Depends on:** S7-0 merged

**Files to touch:**
1. `src/app/(public)/gallery/page.tsx` — overline class upgrade only
2. `src/app/(public)/gallery/gallery-grid.tsx` — year group overlines, token feedback colors, upload form headings, photo hover

**Exact changes:**

`src/app/(public)/gallery/page.tsx`:
- Hero overline "Memories": change from `text-xs text-[#8BB5C9]` (wrong size class) to `font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-[#8BB5C9] mb-3`.

`src/app/(public)/gallery/gallery-grid.tsx`:
- Year group headings: above each `<h2>{year}</h2>`, add `<p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-[#8BB5C9] mb-3">Tournament Year</p>`.
- Success feedback: change `bg-green-50 text-green-700` to `bg-success-muted text-success`.
- Error feedback: change `bg-red-50 text-red-700` to `bg-destructive/10 text-destructive`.
- Upload form heading "Share a Photo": change to `font-display text-h3` (Fraunces 20px).
- Upload form body copy: apply `font-sans text-[0.9375rem] text-muted-foreground`.
- Upload form helper text "Max 10MB. JPG, PNG, or WebP.": add `text-[0.8125rem] text-muted-foreground`.
- Photo card image `<div>`: add `transition-transform duration-200 hover:scale-[1.01]` for subtle thumbnail zoom. (Exception to no-scale rule — media tile thumbnails, not interactive controls.)

**Acceptance criteria:**
- Hero overline "Memories" is 11px (not 12px `text-xs`) — verify computed font-size in DevTools
- Every year group heading has a "Tournament Year" overline in the standard pattern above it
- Upload success banner is `bg-success-muted text-success` (no raw green)
- Upload error banner is `bg-destructive/10 text-destructive` (no raw red)
- Upload form heading "Share a Photo" renders in Fraunces
- Photo thumbnails have a subtle scale-up on hover
- Playwright screenshots at 375px and 1280px
- tsc clean, 197 tests pass

**Estimated time:** 2h

---

#### S7-4: `/leaderboard` overhaul (emoji removal)

**Specialist:** Bolt
**Effort:** Small
**Labels:** `feature`, `P1-high`, `size:S`
**Depends on:** S7-0 merged

**Files to touch:**
1. `src/app/(public)/leaderboard/page.tsx` — all changes in-file

**Exact changes:**

- Lines 119–123 (medal emojis): remove all three `<span className="text-lg">🥇</span>`, `🥈`, `🥉`. Replace with styled position numbers:
  - Position 1: `<span className="font-display font-bold text-base text-[#C9A84C]">1</span>`
  - Position 2: `<span className="font-display font-bold text-base text-neutral-400">2</span>`
  - Position 3: `<span className="font-display font-bold text-base text-[#A87D50]">3</span>`
  - Positions 4+: `<span className="font-sans text-sm text-muted-foreground">{position}</span>`
- `ScoreTable` component (or inline table if single-file):
  - Table wrapper: add `shadow-sm` to `overflow-hidden rounded-lg border border-border` → `border-border/60 shadow-sm`.
  - `<thead>` row: change `bg-muted/50` to `bg-neutral-50`. Column headers: `text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground`.
  - `<tbody>` rows for positions 1–3: add `border-l-2 border-primary` to the `<tr>`. All other rows: `border-l-2 border-transparent`.
  - Remove `bg-primary/5` from top-3 row background if present.
  - Score cells: add `tabular-nums lining-nums` (Tailwind `.tabular-nums` class, which sets `font-variant-numeric: tabular-nums lining-nums` per Sprint 6 `globals.css` `@layer base`).
  - Team name: `font-sans text-[0.9375rem] font-medium text-foreground`.
- Section headings (`h2 "Morning Session"` etc.): add overline above each — e.g., `<p className="[overline classes]">Morning Flight</p>` above the `<h2>Morning Session</h2>`.
- Below hero section, above content: add `<p className="text-center font-sans text-[0.75rem] text-muted-foreground/60">Scores update every 5 minutes.</p>`.
- Overline "Results": upgrade from raw `text-xs` to Sprint 6 overline pattern.

**Acceptance criteria:**
- Zero medal emojis visible anywhere on `/leaderboard`
- Position 1 number renders in warm gold (`#C9A84C`), position 2 in `text-neutral-400`, position 3 in warm bronze (`#A87D50`) — all in Fraunces bold
- Top-3 rows have teal left border, no background fill
- Table column headers are 11px uppercase tracked Inter
- Score cells are `tabular-nums` — numbers align vertically when side by side
- "Scores update every 5 minutes." note is present below the hero
- Playwright screenshots at 375px and 1280px — leaderboard renders without emoji
- tsc clean, 197 tests pass

**Estimated time:** 2h

---

#### S7-5: `/sponsors` overhaul (logo wall)

**Specialist:** Bolt
**Effort:** Small
**Labels:** `feature`, `P1-high`, `size:S`
**Depends on:** S7-0 merged

**Files to touch:**
1. `src/app/(public)/sponsors/page.tsx` — all changes in-file

**Exact changes:**

- Line 120 (CTA section wrapper): change `bg-[#F1F4F6]` to `bg-neutral-50 border-t border-border/60`.
- Tier heading teal rule: change `h-px w-12 bg-primary/30` to `h-0.5 w-12 bg-primary`.
- Sponsor logo cards: wrap existing `<a>` elements with a styled container:
  - With logo: `block rounded-lg border border-border/60 bg-white shadow-xs p-4 transition-[box-shadow,transform] duration-200 hover:shadow-sm hover:-translate-y-0.5`
  - Without logo (text fallback): `flex h-20 items-center rounded-lg border border-border/60 bg-white px-6 shadow-xs text-sm font-medium text-muted-foreground transition-[box-shadow,colors,transform] duration-200 hover:shadow-sm hover:-translate-y-0.5 hover:text-foreground`
- Logo images: add grayscale treatment from Sprint 6 Appendix B — `grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-[filter,opacity] duration-200`. Tailwind `grayscale` class applies `filter: grayscale(1)` — adjust to `[filter:grayscale(0.4)_opacity(0.8)]` arbitrary syntax if partial grayscale is needed. If Tailwind v3's `grayscale` only supports 0/100%, use the arbitrary class.
- CTA section `<h2>`: confirm it uses Fraunces h2 (`font-display text-h2 font-semibold`). Apply if not.
- Hero overline "Thank You": upgrade to Sprint 6 overline pattern if currently `text-xs`.

**Acceptance criteria:**
- Each sponsor logo is wrapped in a card box with `shadow-xs border border-border/60 bg-white`
- Card lifts `hover:shadow-sm hover:-translate-y-0.5` on hover
- Sponsor logos render with a desaturated/faded treatment at rest; full color on hover
- CTA section uses `bg-neutral-50` not `bg-[#F1F4F6]` — no hardcoded hex
- Teal rule under tier headings is full `bg-primary` opacity (not `bg-primary/30`)
- Playwright screenshots at 375px and 1280px
- tsc clean, 197 tests pass

**Estimated time:** 2h

---

### Phase 3: Admin Pages (parallel after S7-0 merges)

S7-6 through S7-9, S7-12, and S7-13 can all run in parallel — they touch entirely separate files. The shared admin chrome (S7-0) is the only dependency.

---

#### S7-6: `/admin` dashboard landing

**Specialist:** Bolt
**Effort:** Small
**Labels:** `feature`, `P2-medium`, `size:S`
**Depends on:** S7-0 merged

**Files to touch:**
1. `src/app/admin/page.tsx` — heading block, stat card polish, quick actions

**Exact changes:**

- Lines 11–13 (page title block): replace plain `<h1 className="text-2xl font-bold text-foreground">Dashboard</h1>` with the global admin heading block pattern:
  ```tsx
  <div className="border-b border-border/60 pb-6 mb-8">
    <h1 className="font-sans text-2xl font-semibold text-foreground">Dashboard</h1>
    <p className="mt-1 font-sans text-sm text-muted-foreground">Tournament overview and quick navigation.</p>
  </div>
  ```
- Stat cards: add `shadow-sm` to each Card (the 4-stat grid). Confirm `border border-border/60` is also present.
- Stat value `<p className="text-2xl font-bold">0</p>`: change to `<p className="font-display text-2xl font-bold text-foreground">0</p>` (Fraunces on the number).
- Stat sublabel (`text-xs text-muted-foreground`): change to `font-sans text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground/80`.
- `CardHeader`: add `space-y-0` explicitly to prevent gap issues in flex-row layout.
- After the stat grid, add a quick-actions row:
  ```tsx
  <div className="mt-6 flex flex-wrap gap-3">
    <LinkButton href="/admin/registrations" variant="outline" size="sm">Manage Registrations</LinkButton>
    <LinkButton href="/admin/scores" variant="outline" size="sm">Upload Scores</LinkButton>
  </div>
  ```
  Import `LinkButton` from `@/components/ui/link-button`.

**Acceptance criteria:**
- Page heading uses `border-b border-border/60 pb-6 mb-8` separator block
- Stat values render in Fraunces bold (not Inter)
- Stat sublabels are 11px uppercase tracked (`text-[0.6875rem] uppercase tracking-[0.1em]`)
- Stat cards have `shadow-sm`
- Two quick-action buttons present: "Manage Registrations" and "Upload Scores" — both link to correct routes
- Stats remain hardcoded `0` — no data fetching added
- tsc clean, 197 tests pass

**Estimated time:** 1.5h

---

#### S7-7: `/admin/scores` + `/admin/registrations` (table pages)

**Specialist:** Bolt
**Effort:** Medium
**Labels:** `feature`, `P1-high`, `size:M`
**Depends on:** S7-0 merged

Bundled because both pages share the admin table pattern — applying it once with consistent decisions avoids drift between the two PRs.

**Files to touch:**
1. `src/app/admin/scores/page.tsx` — heading block
2. `src/app/admin/scores/score-manager.tsx` — upload zone, table treatment, feedback token colors
3. `src/app/admin/registrations/page.tsx` — heading block, action bar
4. `src/app/admin/registrations/registration-list.tsx` — table treatment, status badges, feedback token colors

**Exact changes:**

Both `page.tsx` files: apply global admin heading block pattern (see S7-6 for exact TSX). Descriptions:
- Scores: "Import CSV scores and manage the leaderboard data."
- Registrations: "Review team registrations, export CSV, manually add entries."

`src/app/admin/registrations/page.tsx`: add action bar below heading block:
```tsx
<div className="flex items-center justify-between mb-6">
  <p className="font-sans text-[0.8125rem] text-muted-foreground">{count} registrations</p>
  <div className="flex gap-2">
    {/* Export CSV and Add Team buttons already exist in registration-list.tsx — verify and move here if currently embedded */}
  </div>
</div>
```
(Read `registration-list.tsx` before executing — action bar placement depends on current component structure.)

`src/app/admin/scores/score-manager.tsx` (312 lines):
- CSV upload zone: change to `border-2 border-dashed border-border/60 rounded-lg p-8 text-center bg-neutral-50 hover:border-primary/40 hover:bg-primary/5 transition-colors duration-150`.
- Error feedback (line 107): change `bg-red-50 text-red-700` to `bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-3 text-sm`.
- Success feedback (line 112): change `bg-green-50 text-green-700` to `bg-success-muted text-success border border-success/20 rounded-md p-3 text-sm`.
- Score table wrapper: add `shadow-sm` + change `border-border` to `border-border/60`.
- `<thead>`: change `bg-muted/50` to `bg-neutral-50`. Column headers: `text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground`.
- Score cells: add `font-mono tabular-nums lining-nums`.
- Delete action buttons: `variant="ghost" size="sm"` with `text-destructive hover:text-destructive hover:bg-destructive/10`.

`src/app/admin/registrations/registration-list.tsx` (353 lines):
- Error feedback (line 111): change `bg-red-50 text-red-700` to `bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-3 text-sm`.
- Table wrapper: add `shadow-sm`, `border-border/60`.
- `<thead>`: `bg-neutral-50`, column headers 11px uppercase tracked.
- Date column cells: add `font-mono text-[0.8125rem] text-muted-foreground`.
- Payment status badges: `rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold`. Colors:
  - paid: `bg-success-muted text-success`
  - pending: `bg-warning-muted text-warning`
  - failed: `bg-destructive/10 text-destructive`
- Session badges (AM/PM): `bg-neutral-100 text-neutral-600 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] px-2 py-0.5 rounded-sm`.

**Acceptance criteria:**
- Both admin pages use heading block pattern with `border-b border-border/60 pb-6 mb-8`
- CSV upload zone in scores has dashed border + neutral background + teal hover state
- Error/success feedback in scores uses `bg-destructive/10`/`bg-success-muted` (no raw red/green)
- Score table: `thead bg-neutral-50`, column headers 11px uppercase, score cells `font-mono tabular-nums`
- Registration table: payment status badges use token colors; session badges use `bg-neutral-100`
- Date cells render in mono for tabular alignment
- Existing CSV export flow still works (Watchdog must verify)
- tsc clean, 197 tests pass

**Estimated time:** 3h

---

#### S7-8: `/admin/sponsors` + `/admin/sponsorships` (CRUD pages)

**Specialist:** Bolt
**Effort:** Medium
**Labels:** `feature`, `P1-high`, `size:M`
**Depends on:** S7-0 merged

Bundled because both are CRUD list pages — shared form Card pattern + table treatment.

**Files to touch:**
1. `src/app/admin/sponsors/page.tsx` — heading block
2. `src/app/admin/sponsors/sponsor-list.tsx` — table, logo thumbnail, form Card, feedback tokens
3. `src/app/admin/sponsorships/page.tsx` — heading block
4. `src/app/admin/sponsorships/sponsorship-manager.tsx` — table, sold count color, Switch toggle, form Card, feedback tokens

**Exact changes:**

Both `page.tsx` files: apply global admin heading block pattern. Descriptions:
- Sponsors: "Manage confirmed sponsors — add, edit, assign to tiers."
- Sponsorships: "Manage sponsorship packages — pricing, availability, active status."

`src/app/admin/sponsors/sponsor-list.tsx` (340 lines):
- Error feedback (line 110): change `bg-red-50 text-red-700` to `bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-3 text-sm`.
- Add Sponsor form: wrap in `Card` with `shadow-sm border border-border/60 p-6`. `CardTitle` "Add Sponsor" in Inter semibold 16px.
- `tier_id` Select field: use shadcn `Select` component (already exists at `src/components/ui/select.tsx`). Label "Sponsorship Tier".
- Sponsor table wrapper: `shadow-sm border border-border/60`.
- `<thead>`: `bg-neutral-50`, column headers 11px uppercase tracked.
- Logo column: `<Image>` thumbnail 40×20 object-contain, wrapped in `rounded border border-border/60 p-1 bg-white`. Dash if no logo.
- Website column: `text-xs font-mono text-muted-foreground/70`.
- Action buttons: "Edit" `variant="ghost" size="sm"`, "Delete" `variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10"`.

`src/app/admin/sponsorships/sponsorship-manager.tsx` (362 lines):
- Error feedback (line 99): change `bg-red-50 text-red-700` to `bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-3 text-sm`.
- Add/Edit form: `Card` with `shadow-sm border border-border/60 p-6 max-w-2xl`. `CardTitle` Inter semibold 16px.
- Items table wrapper: `shadow-sm border border-border/60`.
- `<thead>`: `bg-neutral-50`, column headers 11px uppercase tracked.
- Numeric columns (Price, Max Qty, Sold): `font-mono tabular-nums lining-nums text-right`.
- Price display: `(price_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })`.
- "Sold" count: if `sold_count >= max_quantity`, render in `text-warning font-semibold`; otherwise `text-foreground`.
- Active toggle: use shadcn `Switch` from `src/components/ui/switch.tsx`. Label "Active" in Inter 13px, `flex items-center gap-2`.

**Acceptance criteria:**
- Both admin pages use heading block pattern
- Sponsor form wrapped in Card with `shadow-sm`
- Sponsor table has logo thumbnails with card chrome; website URLs in mono
- Sponsorships table: sold count turns amber (`text-warning`) when sold out
- Active toggle uses shadcn Switch component
- Numeric columns right-aligned, `font-mono tabular-nums`
- Error feedback uses `bg-destructive/10` (no raw red)
- Existing CRUD flows (add/edit/delete) still function — Watchdog must click through
- tsc clean, 197 tests pass

**Estimated time:** 3h

---

#### S7-9: `/admin/event` + `/admin/settings` (form pages)

**Specialist:** Bolt
**Effort:** Small
**Labels:** `feature`, `P2-medium`, `size:S`
**Depends on:** S7-0 merged

Bundled because both are `max-w-2xl` form pages — shared form fieldset/Card pattern.

**Files to touch:**
1. `src/app/admin/event/page.tsx` — heading block
2. `src/app/admin/event/event-settings-form.tsx` — fieldset grouping, feedback tokens
3. `src/app/admin/settings/page.tsx` — heading block
4. `src/app/admin/settings/invite-form.tsx` — Card wrapping, feedback tokens

**Exact changes:**

Both `page.tsx` files: apply global admin heading block pattern. Descriptions:
- Event: "Configure tournament dates, registration settings, and capacity."
- Settings: "Manage admin user access and invitations."

`src/app/admin/event/event-settings-form.tsx`:
- Wrap field groups in `<fieldset>` with `<legend className="font-sans text-[0.75rem] uppercase tracking-[0.15em] text-muted-foreground/70 mb-4">`. Groups: "Event Details" (dates, location), "Registration" (fee, cap, open/close dates).
- `registration_fee_cents` field: add `<p className="mt-1 font-sans text-[0.75rem] text-muted-foreground">Enter in cents (e.g., 15000 for $150.00).</p>` below the input.
- Submit button: `variant="default" size="lg"` (`h-11 px-6`). Label "Save Settings".
- Success feedback: change `bg-green-*` to `bg-success-muted text-success border border-success/20 rounded-md p-3 text-sm`.
- Error feedback: change `bg-red-*` to `bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-3 text-sm`.

`src/app/admin/settings/invite-form.tsx`:
- Wrap form in `Card` with `shadow-sm border border-border/60 p-6`.
- Add `CardTitle` "Invite Admin" in Inter semibold 16px.
- Add `CardDescription` "Invited users will receive an email with a sign-in link." Inter 13px `text-muted-foreground`.
- Submit button: `variant="default" size="sm"`. Label "Send Invite".
- Success/error feedback: same token-based pattern as event form.

**Acceptance criteria:**
- Both admin pages use heading block pattern
- Event settings form has fieldset groupings ("Event Details", "Registration") with legend labels
- `registration_fee_cents` field has helper text below it
- Invite form is wrapped in a Card with header/description
- All success/error feedback uses token colors (no raw `bg-green-*` or `bg-red-*`)
- Existing form submit + save flows still work
- tsc clean, 197 tests pass

**Estimated time:** 2h

---

#### S7-12: `/admin/photos` — styling pass

**Specialist:** Bolt
**Effort:** Small
**Labels:** `feature`, `P2-medium`, `size:S`
**Depends on:** S7-0 merged
**Can run parallel with:** S7-6, S7-7, S7-8, S7-9, S7-13

**Files to touch:**
1. `src/app/admin/photos/page.tsx` — modify (existing file)

**Spec reference:** Follow the admin-page patterns established in Phase 3 (see S7-7 and S7-9 for exact TSX). Apply: admin heading block, admin table pattern for the photo list (if present), and state color badges for approval status using design tokens.

**Exact changes:**
- Apply global admin heading block pattern (see S7-6 for exact TSX). Description: "Review and moderate submitted photos."
- If a photo list table is rendered: apply `shadow-sm border border-border/60`, `thead bg-neutral-50`, column headers 11px uppercase tracked.
- Approval status badges: use token colors — `approved`: `bg-success-muted text-success`; `pending`: `bg-warning-muted text-warning`; `rejected`: `bg-destructive/10 text-destructive`. All `rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold`.
- Replace any raw `bg-red-*` / `bg-green-*` feedback colors with token equivalents.

**Acceptance criteria:**
- Admin heading block applied (`border-b border-border/60 pb-6 mb-8`)
- If photo list present: table uses `thead bg-neutral-50` + column headers 11px uppercase tracked
- Approval status badges use token colors (no raw red/green)
- No new hardcoded hex values
- tsc clean, 197/197 tests pass

**Estimated time:** 1.5h

---

#### S7-13: `/admin/contacts` — NEW page

**Specialist:** Bolt
**Effort:** Medium
**Labels:** `feature`, `P1-high`, `size:M`
**Depends on:** S7-0 merged
**Can run parallel with:** S7-6, S7-7, S7-8, S7-9, S7-12

**Context:** `src/app/admin/contacts/` directory exists but has no `page.tsx` — the sidebar already links to `/admin/contacts` (see `src/components/admin/admin-sidebar.tsx` line 39) but the route currently 404s. This issue builds the missing target.

**Files to create (all new):**
1. `src/app/admin/contacts/page.tsx` — server component
2. `src/app/admin/contacts/actions.ts` — `getContacts`, `exportContactsCSV`
3. `src/app/admin/contacts/contact-list.tsx` — client component with type + year filters

**Spec reference:** Follow the admin-page patterns established in Phase 3 (see S7-7 for table pattern, S7-6 for heading block, S7-8 for action bar + export button). No new design patterns needed — cite existing admin pages like `/admin/registrations` for structural reference.

**Exact changes:**

`src/app/admin/contacts/page.tsx` (server component):
- Apply global admin heading block pattern. Description: "Review form submissions and contact inquiries."
- Render `<ContactList />` client component below heading block.

`src/app/admin/contacts/actions.ts`:
- `getContacts(filters?: { type?: string; year?: number })` — query contacts from Supabase, return typed array. Read existing `actions.ts` files (e.g. `src/app/admin/registrations/actions.ts`) for the established pattern.
- `exportContactsCSV()` — server action that returns CSV string of all contacts. Follow the CSV export pattern in registrations.

`src/app/admin/contacts/contact-list.tsx` (client component):
- Type filter: dropdown/select for contact type — "All", "Player", "Sponsor", "Donor", "Other".
- Year filter: dropdown/select for submission year.
- Admin table pattern: `shadow-sm border border-border/60`, `thead bg-neutral-50`, column headers 11px uppercase tracked.
- Type badges: `player` = `bg-teal-50 text-teal-700`; `sponsor` = `bg-purple-muted text-purple`; `donor` = `bg-success-muted text-success`; `other` = `bg-neutral-100 text-neutral-600`. All `rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold`.
- CSV export button in action bar above table: `variant="outline" size="sm"`. Label "Export CSV".
- Empty state: centered illustration placeholder, "No contacts yet." heading, "Contact form submissions will appear here." subtext with CTA if applicable.

**Acceptance criteria:**
- `/admin/contacts` renders without 404
- Contact list displays with type + year filter controls
- CSV export button triggers download
- Type badges: player=teal, sponsor=purple-muted, donor=success-muted, other=neutral
- Admin table pattern applied (`thead bg-neutral-50`, column headers 11px uppercase)
- Empty state renders when no contacts
- No new hardcoded hex values
- tsc clean, 197/197 tests pass

**Estimated time:** 3.5h

---

### Phase 4: Auth + Error Pages (parallel, independent)

S7-10 and S7-11 touch entirely different files and can run simultaneously with Phase 3. They are also independent of each other.

---

#### S7-10: `/auth/login` refactor + structural split

**Specialist:** Bolt
**Effort:** Medium
**Labels:** `feature`, `P1-high`, `size:M`
**Depends on:** S7-0 merged (Sprint 6 tokens)

**Files to touch:**
1. `src/app/auth/login/page.tsx` — refactor to server wrapper; remove `"use client"`; add `searchParams` handling
2. `src/app/auth/login/login-form.tsx` — new file; extracted client component; all existing logic moves here

**Exact changes:**

`src/app/auth/login/page.tsx` (refactor, currently 100% client):
- Remove `"use client"` directive. This file becomes a server component.
- Add `searchParams` prop: `export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> })`.
- Parse error param:
  ```ts
  const { error } = await searchParams;
  const errorMessages: Record<string, string> = {
    'password-mismatch': 'Incorrect email or password. Please try again.',
    'magic-link-failed': "We couldn't send the magic link. Please try again or use a password.",
    'callback-error': 'Authentication failed. Please return to the login page and try again.',
  };
  const initialError = error ? (errorMessages[error] ?? 'An unexpected error occurred.') : undefined;
  ```
- Render: `<LoginForm initialError={initialError} />` (import from `./login-form`).
- Page background wrapper stays here: `<div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">`.
- Add wordmark above Card: `<p className="font-display text-lg font-semibold text-foreground text-center mb-6">Craven Cancer Classic</p>`.

`src/app/auth/login/login-form.tsx` (new file):
- `"use client"` at top.
- Move all existing logic from `page.tsx`: `handleSubmit`, `handleGoogleSignIn`, form state, mode toggle.
- Accept prop: `initialError?: string`.
- Apply all visual changes:
  - Card: `shadow-md border border-border/60 max-w-md w-full`.
  - `CardTitle` "Sign In": Fraunces `text-h2 font-semibold`.
  - `CardDescription` "Tournament administration": Inter 15px.
  - Page background: `bg-neutral-50` (already handled by page.tsx wrapper — this component renders only the Card).
  - Mode selector: replace `variant={mode === X ? "default" : "ghost"}` buttons with segmented control: `<div className="flex rounded-md border border-border/60 p-0.5 bg-neutral-100">` with `<button className={cn("rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-150", mode === X ? "bg-white shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground")}>`.
  - Google button: `variant="outline"` — add inline SVG Google "G" logo before label (standard Google brand OAuth pattern).
  - Error alert: change `bg-red-50 text-red-700` to `bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-3 text-sm`. If `initialError` prop is set, render it on mount.
  - Success alert: change `bg-green-50 text-green-700` to `bg-success-muted text-success border border-success/20 rounded-md p-3 text-sm`.
  - Submit button: `w-full size="lg"` (`h-11 px-6`).
  - `callback-error` inline error: include `<Link href="/auth/login">Return to login page</Link>` when `initialError` came from `callback-error`.

**Acceptance criteria:**
- `src/app/auth/login/page.tsx` has no `"use client"` directive — it is a server component
- `src/app/auth/login/login-form.tsx` exists as the extracted client component
- Navigating to `/auth/login?error=password-mismatch` renders the "Incorrect email or password" error alert without JS interaction
- Navigating to `/auth/login?error=callback-error` renders the error + "Return to login page" link
- Login page background is `bg-neutral-50` (not `bg-gray-50`)
- Card has `shadow-md`
- "Craven Cancer Classic" wordmark appears above the Card
- Mode selector uses segmented control, not variant-toggled buttons
- Google OAuth button has a Google G logo icon
- Simulator: complete password login flow works end-to-end (Watchdog verifies)
- Simulator: magic link request flow works (Watchdog verifies)
- tsc clean, 197 tests pass

**Estimated time:** 3h

---

#### S7-11: Error page polish (3 boundaries)

**Specialist:** Bolt
**Effort:** Small
**Labels:** `feature`, `P2-medium`, `size:S`
**Depends on:** S7-0 merged (tokens + Button component)

**Files to touch:**
1. `src/app/error.tsx` — root boundary (public treatment)
2. `src/app/(public)/error.tsx` — public boundary (public treatment)
3. `src/app/admin/error.tsx` — admin boundary (admin treatment)

**Note:** All three error files are currently unstyled (confirmed via grep — no Fraunces classes, no overline pattern, no token colors). This is pure additive polish.

**Exact changes:**

`src/app/error.tsx` + `src/app/(public)/error.tsx` (identical treatment):
```tsx
"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-24 text-center">
      <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-[#8BB5C9] mb-3">
        Something Went Wrong
      </p>
      <h2 className="font-display text-h2 font-semibold text-foreground mb-4">
        We hit an unexpected error
      </h2>
      <p className="font-sans text-[0.9375rem] text-muted-foreground max-w-sm mb-8">
        Please try again. If the problem persists, contact the organizers.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <Button
          onClick={reset}
          className="rounded-none bg-primary px-8 text-[0.8125rem] uppercase tracking-wider text-primary-foreground hover:bg-primary/90 shadow-xs hover:shadow-sm hover:-translate-y-px transition-[background-color,box-shadow,transform] duration-150"
          size="lg"
        >
          Try Again
        </Button>
        <Link href="/" className="font-sans text-[0.875rem] text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors duration-150">
          Return to Homepage
        </Link>
      </div>
    </section>
  );
}
```
- No `error.digest` exposed (security — public-facing).

`src/app/admin/error.tsx`:
```tsx
"use client";
import { Button } from "@/components/ui/button";

export default function AdminErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="font-sans text-[1.25rem] font-semibold text-foreground">Something went wrong</h2>
      <p className="font-sans text-[0.875rem] text-muted-foreground">An unexpected error occurred.</p>
      {error.digest && (
        <code className="font-mono text-xs text-muted-foreground/60">{error.digest}</code>
      )}
      <Button variant="default" size="sm" onClick={reset}>
        Try Again
      </Button>
    </div>
  );
}
```
- Shows `error.digest` if present (internal admin context — safe).
- No Fraunces — Inter only.
- Raw `<button onClick={reset}>` replaced with `<Button>` component.

**Acceptance criteria:**
- `/` and public routes: error boundary shows Fraunces h2 "We hit an unexpected error", overline "Something Went Wrong", teal "Try Again" Button, and "Return to Homepage" link
- No `error.digest` visible on public error pages
- Admin routes: error boundary shows Inter h2, `error.digest` in mono if present, Button component (not raw `<button>`)
- Both "Try Again" buttons actually trigger `reset()` — verify in browser by forcing an error
- tsc clean, 197 tests pass

**Estimated time:** 1.5h

---

## Execution Order

```
Phase 1 — serial (must merge first):
  S7-0  Admin chrome
        Files: src/components/admin/admin-sidebar.tsx, src/app/admin/layout.tsx

Phase 2 — parallel (all after S7-0, no file overlap between issues):
  S7-1  /donate            — src/app/(public)/donate/page.tsx
  S7-2  /sponsorships      — src/app/(public)/sponsorships/page.tsx, sponsorship-grid.tsx
  S7-3  /gallery           — src/app/(public)/gallery/page.tsx, gallery-grid.tsx
  S7-4  /leaderboard       — src/app/(public)/leaderboard/page.tsx
  S7-5  /sponsors          — src/app/(public)/sponsors/page.tsx

Phase 3 — parallel (all after S7-0, no file overlap between issues):
  S7-6  Admin dashboard    — src/app/admin/page.tsx
  S7-7  Scores + Registrations  — src/app/admin/scores/*, src/app/admin/registrations/*
  S7-8  Sponsors + Sponsorships — src/app/admin/sponsors/*, src/app/admin/sponsorships/*
  S7-9  Event + Settings   — src/app/admin/event/*, src/app/admin/settings/*
  S7-12 Photos styling     — src/app/admin/photos/page.tsx
  S7-13 Contacts new page  — src/app/admin/contacts/page.tsx (new), actions.ts (new), contact-list.tsx (new)

Phase 4 — parallel (independent of Phase 3, can run concurrently):
  S7-10 Login refactor     — src/app/auth/login/page.tsx (modified), login-form.tsx (new)
  S7-11 Error pages        — src/app/error.tsx, src/app/(public)/error.tsx, src/app/admin/error.tsx
```

**File overlap analysis — zero conflicts between parallel issues:**
- Phase 2 issues each own distinct file trees under `(public)/`
- Phase 3 issues each own distinct admin subdirectories
- S7-10 and S7-11 touch no shared files
- S7-10 auth files are independent of all admin and public page files
- Potential Watchdog queue: 12 PRs after S7-0 — recommend batching Phase 2 (5 PRs) then Phase 3+4 (7 PRs). Do not open all 12 simultaneously.

**Recommended Bolt session schedule:**
- Session 1: S7-0 alone (serial)
- Session 2 (after S7-0 merges): S7-1, S7-2, S7-3 in parallel (3 Bolt spawns)
- Session 3 (after Session 2 PRs reviewed): S7-4, S7-5, S7-6 in parallel (3 Bolt spawns)
- Session 4 (after Session 3): S7-7, S7-8, S7-9, S7-10, S7-11 in parallel — maximum 5. Or break into two batches if Watchdog review queue is long.

---

## Risks

1. **Login refactor changes auth flow** — Watchdog must verify simulator login still works after the server wrapper + `LoginForm` split. Both password and magic link flows. This is the highest-risk PR in the sprint.

2. **Admin table changes could regress CRUD flows** — S7-7 and S7-8 touch large component files (310–360 lines each). CSS changes shouldn't break logic, but Watchdog must click through: CSV export on scores, add/edit/delete on sponsors and sponsorships, registration creation.

3. **Visual review load** — 10+ PRs means heavy Watchdog screenshot work. Playwright screenshots at desktop + mobile for each. Plan for an overnight Watchdog sweep if all PRs land the same day.

4. **Grayscale partial opacity on sponsor logos** — Tailwind v3 `grayscale` is 0 or 100%. If 40% grayscale is needed, use arbitrary class `[filter:grayscale(0.4)_opacity(0.8)]`. Bolt must verify this renders correctly in the simulator; fall back to `grayscale opacity-80` (full greyscale, 80% opacity) if arbitrary syntax fails.

5. **`tabular-nums lining-nums` dependency on Sprint 6 globals.css** — S7-4 and S7-7 rely on the `.tabular-nums` class defined in Sprint 6 `globals.css` `@layer base`. Confirm Sprint 6 is fully merged (it is, at `fcd91ae`) before executing.

6. **Volume — consider splitting into two sub-sprints** — 13 PRs is ambitious. If Watchdog review turnaround is slow, Phase 3 + Phase 4 can defer to Sprint 7b without leaving any public page unfinished (Phase 2 completes all public pages).

---

## Open questions for Scott

None blocking plan approval. One recommendation to confirm:

**S7-7 + S7-8 bundling:** The plan bundles scores+registrations together and sponsors+sponsorships together based on shared patterns. If Scott prefers 4 separate PRs (smaller, easier to review), split them — zero file overlap risk either way. Recommendation is to keep bundled to avoid near-identical Watchdog reviews for shared patterns.

---

## Total effort estimate

| Issue | Files | Effort | Est. Time |
|---|---|---|---|
| S7-0 Admin chrome | 2 | Small | 2h |
| S7-1 /donate | 1 | Small | 2h |
| S7-2 /sponsorships | 2 | Small–Med | 2.5h |
| S7-3 /gallery | 2 | Small | 2h |
| S7-4 /leaderboard | 1 | Small | 2h |
| S7-5 /sponsors | 1 | Small | 2h |
| S7-6 Admin dashboard | 1 | Small | 1.5h |
| S7-7 Scores + Registrations | 4 | Medium | 3h |
| S7-8 Sponsors + Sponsorships | 4 | Medium | 3h |
| S7-9 Event + Settings | 4 | Small | 2h |
| S7-10 Login refactor | 2 (1 new) | Medium | 3h |
| S7-11 Error pages | 3 | Small | 1.5h |
| **Total** | **27 files** | | **26.5h** |

Sprint is achievable in 4 Bolt sessions over ~3 days with parallel execution. Watchdog review is the rate-limiter — 11 PRs means planning for ~6–8h of review time spread across the sprint.
