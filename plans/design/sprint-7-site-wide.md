# Design Spec: Sprint 7 — Site-Wide Design System Application

**Status:** Proposed — awaiting Scott approval before Bolt executes
**Specialist:** Pixel
**Scope:** Every remaining public page, auth pages, error pages, and all admin pages
**Extends:** `plans/design/sprint-6-visual-overhaul.md` — read it first. Sprint 7 applies the established
system; it does not redefine tokens, motion rules, or component bases.

---

## Guiding Principles for Sprint 7

**Public pages:** Apply the Sprint 6 "warm memorial gravitas" aesthetic fully. Every public page
uses the established section-rhythm pattern (overline → h2 → body → content). Editorial weight
from Fraunces. Generous whitespace. No shortcuts.

**Admin pages:** "Quiet, dense, professional." Think Linear or Stripe dashboard — not the charity
memorial aesthetic. Use design tokens (neutrals, state colors, elevation, fonts) but favor Inter
for most admin headings. Data density is a feature. Sprint 6 component polish (Card, Input, Label,
Button) applies automatically. The goal is an internal tool that feels considered, not decorated.

**Shared constraint:** All color via tokens. No hardcoded hex values in any page. Replace
`bg-[#F1F4F6]` with `bg-neutral-50`, `bg-gray-50` with `bg-muted`, etc.

---

## Part 1 — Public Pages

---

### Page: `/donate`

**File:** `src/app/(public)/donate/page.tsx`

**Page goal:** Convert visitors to one-time donors via the Carolina East Foundation link.
**Key user actions:** Read the mission impact → click "Donate via Carolina East Foundation".

#### Layout Composition

Four vertical sections with the Sprint 6 section-rhythm pattern applied throughout:

1. **Dark hero** — identical structure to homepage hero mini-variant (navy `bg-[#1A2E3A]`, centered, overline + h1 + divider + subhead).
2. **Impact stats strip** — 3-column stat grid on `bg-neutral-50`. Currently uses `bg-white` — replace.
3. **Mission + CTA body** — full-width editorial text column, `max-w-2xl mx-auto`, `py-20 sm:py-28`.
4. **In Loving Memory** — memorial section. This section is the emotional center of the page. Purple background treatment (`bg-purple/5 border-y border-purple/20`) elevates it from a plain text section to a tribute block. Purple is reserved for memorial content per Sprint 6 policy — this is its permitted use.
5. **Stay in Touch** — email capture on `bg-neutral-50`, `py-20 sm:py-28`.

#### Component Choices

- `ProspectCaptureForm` — already correct. No changes.
- `LinkButton` — upgrade to Sprint 6 purple CTA pattern: `rounded-none bg-purple px-8 text-[0.8125rem] uppercase tracking-wider text-purple-foreground hover:bg-purple-hover shadow-xs hover:shadow-sm hover:-translate-y-px transition-[background-color,box-shadow,transform] duration-150`.
- The "Where Your Gift Goes" bordered list items — upgrade border from `border-primary/30` to `border-primary/40` and increase left-border weight to `border-l-[3px]` for more visual presence.
- The designation callout box — change from `bg-muted/50` to `bg-neutral-50 border border-border/60 shadow-xs` (Sprint 6 Card treatment without full Card component overhead).

#### Copy Treatment

- Section overlines: "Make a Difference", "Your Impact", "Where Your Gift Goes", "In Loving Memory", "Stay Connected" — all in Sprint 6 overline style: Inter, 11px, uppercase, `tracking-[0.25em]`, `text-primary`, `mb-3`.
- h1 "Donate" — Fraunces, `text-4xl sm:text-5xl`, `font-bold`, `text-white`.
- h2 headings — Fraunces, `text-h2` (28px), `font-semibold`, `text-foreground`.
- The names "Scott Davenport Sr.", "Brian Fisher", and "John Aylward" — already bolded; add Fraunces italic wrapping to the names themselves. This is a permitted italic use (tribute context).
- Add an overline label "In Loving Memory" above the h2 in that section.

#### Page-Specific Moves

- Impact stats section: add the Sprint 6 teal rule (`w-12 h-0.5 bg-primary mx-auto mb-4`) above each stat value. Use `bg-neutral-50` not `bg-white`.
- "In Loving Memory" section: change `bg-[#F1F4F6]` to `bg-purple/5 border-y border-purple/20`. The purple wash is subtle (5% opacity) but signals emotional weight without the memorial section blending into adjacent `bg-neutral-50` sections.
- Hero subhead: change `text-white/60` to `text-white/70` (Sprint 6 standard).
- Overline "Make a Difference": apply Sprint 6 overline pattern. Currently uses `text-xs text-[#8BB5C9]` — correct color, wrong size class. Change to explicit `text-[0.6875rem]` and add `mb-3`.

#### Implementation Notes

- File: `src/app/(public)/donate/page.tsx`
- Replace `bg-[#F1F4F6]` (line 125) with `bg-purple/5 border-y border-purple/20` on the In Loving Memory section wrapper.
- Replace `bg-white` (line 39) on stats section with `bg-neutral-50`.
- Apply Sprint 6 overline class pattern to all `<p>` overline elements (currently raw `text-xs`).
- Add teal rule dividers to each stat card.
- The `ProspectCaptureForm` section wrapper: change to `bg-neutral-50 border-t border-border/60`.

---

### Page: `/sponsorships`

**Files:** `src/app/(public)/sponsorships/page.tsx`, `src/app/(public)/sponsorships/sponsorship-grid.tsx`

**Page goal:** Convert business prospects into sponsorship purchasers via the Stripe checkout flow.
**Key user actions:** Browse catalog → select package → submit purchase form → redirect to Stripe.

#### Layout Composition

1. **Dark hero** — navy header, Sprint 6 overline pattern applied.
2. **Mission context paragraph** — centered `max-w-2xl`, body-lg sizing. Currently unstyled beyond `text-[15px]`. Apply Sprint 6 body paragraph class.
3. **Sponsorship catalog grid** — `sm:grid-cols-2 lg:grid-cols-3`, `gap-6`. Cards expand to selected state. Sold-out overlay treatment needed (see below).
4. **Purchase form** — inline below grid when a package is selected. Currently `bg-primary/5 border-primary/20` — replace with `bg-neutral-50 border border-border/60 shadow-sm` (warmer, less branded).
5. **Empty state** — when no items: centered card with `ProspectCaptureForm`. Already correct structure; apply Sprint 6 Card shadow treatment.

#### Component Choices

- Sponsorship `Card`: apply Sprint 6 Card base (`shadow-sm border border-border/60`). Remove `hover:ring-2 hover:ring-primary/30` — replace with Sprint 6 hover pattern `hover:shadow-md hover:-translate-y-0.5 transition-[box-shadow,transform] duration-200`.
- Selected state: keep `ring-2 ring-primary` — this is a selection indicator, not a hover ring.
- Sold-out badge: upgrade from raw `bg-muted text-muted-foreground` to a proper Badge: `bg-neutral-100 text-neutral-600 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-sm`. Position stays `absolute right-3 top-3`.
- Sold-out card: keep `opacity-60` but also add `pointer-events-none` to the Select button to prevent interaction.
- Price display (`$X,XXX`): Fraunces `text-3xl font-bold` — already correct. Add `text-foreground` explicitly.
- Package name (`h3`): Sprint 6 h3 — `font-display text-[1.25rem] font-[500]`.
- Availability counter (`X of Y available`): Inter, 12px, `text-muted-foreground/70`. Add a thin `bg-border/40` progress bar beneath it: `w-full h-0.5 bg-border/40 rounded-full` with an inner `bg-primary` fill at `sold_count/max_quantity * 100%` width.

#### Copy Treatment

- Overline "Support the Tournament" → apply Sprint 6 overline pattern.
- Mission paragraph: wrap in Sprint 6 section-rhythm container. Add an overline "Our Mission" above it.
- Section heading above the grid: add `<p>` overline "2026 Sponsorship Packages" + `<h2>` "Support the Classic" in Fraunces h2.

#### Page-Specific Moves

- Availability progress bar on each card is a net-new micro-element. It communicates urgency without aggressive copy.
- The `PurchaseForm` panel: change its container from `rounded-lg border border-primary/20 bg-primary/5 p-6` to `rounded-lg border border-border/60 bg-neutral-50 shadow-sm p-6`. The teal-washed form background is visually noisy; neutral is cleaner.
- Error state inside PurchaseForm: change `bg-red-50 text-red-700` to `bg-destructive/10 text-destructive` (token-based).
- After purchase redirect, success comes from Stripe — no in-page success state needed.

#### Implementation Notes

- File: `src/app/(public)/sponsorships/sponsorship-grid.tsx` — all card and form changes.
- File: `src/app/(public)/sponsorships/page.tsx` — overline, section headings, mission paragraph upgrade.
- Availability progress bar is a pure CSS/JSX addition inside the card map loop. No new component file needed.
- The `bg-primary/5` purchase form wrapper (line 136 in `sponsorship-grid.tsx`) — replace with `bg-neutral-50 border border-border/60 shadow-sm`.

---

### Page: `/gallery`

**Files:** `src/app/(public)/gallery/page.tsx`, `src/app/(public)/gallery/gallery-grid.tsx`

**Page goal:** Let community members browse tournament memories and contribute their own photos.
**Key user actions:** Browse photos by year → paginate → upload a photo.

#### Layout Composition

1. **Dark hero** — navy, centered, overline "Memories" + h1 "Photo Gallery" + divider. Already correct structure; apply Sprint 6 overline class pattern.
2. **Gallery content section** — `py-16 sm:py-24`, `max-w-6xl mx-auto`. Masonry columns via CSS `columns` — already implemented.
3. **Upload CTA** — inline top bar above grid: photo count left, "Upload Photo" button right.
4. **Upload form** — Card with `shadow-sm`, shown inline on toggle.
5. **Pagination bar** — `border-t border-border pt-8`, prev/next links.

#### Component Choices

- Year group headings (`h2`): currently `font-display text-2xl font-semibold`. Upgrade to Sprint 6 section-rhythm: add an overline above each year in the format `<p class="[overline]">Tournament Year</p>` + `<h2>[year]</h2>`. This gives year groups proper editorial weight.
- Photo caption overlay: currently `bg-gradient-to-t from-black/60`. Keep. Add `font-sans text-[0.8125rem]` to caption text.
- Upload button: `variant="outline" size="sm"` — keep variant; add Sprint 6 outline hover treatment: `hover:border-primary/40 hover:text-primary transition-colors duration-150`.
- Success feedback (`bg-green-50 text-green-700`): change to `bg-success-muted text-success` (token-based, from Sprint 6 state colors).
- Error feedback (`bg-red-50 text-red-700`): change to `bg-destructive/10 text-destructive`.
- Photo count label: Inter, 13px, `text-muted-foreground`. Currently correct; verify font inherits Inter after Sprint 6 swap.
- Pagination links: current `buttonVariants({ variant: "outline", size: "sm" })` — already correct. No changes.
- Empty state: add Sprint 6 section-rhythm: Fraunces h2 "No Photos Yet", Inter body "Be the first to share a moment." Currently correct structure; verify font classes.

#### Copy Treatment

- Overline "Memories" → apply Sprint 6 overline pattern (currently `text-xs text-[#8BB5C9]` — wrong size class).
- Upload form heading "Share a Photo" → `font-display text-h3` (Fraunces 20px).
- Upload form body copy → Inter, 15px, `text-muted-foreground`.

#### Page-Specific Moves

- Year group overline: "Tournament Year" above each `{year} Tournament` h2 heading. The overline text is the literal string "Tournament Year" — it provides context without repeating the year number twice.
- Photo card hover: add `transition-transform duration-200 hover:scale-[1.01]` to the image `<div>` — subtle zoom-in on hover. Exception to "no scale" rule only because photos are content thumbnails, not interactive controls. Scale on media tiles is correct; scale on buttons/cards is not.
- Upload form file input: `Input type="file"` inherits Sprint 6 Input token styles. Add explicit `text-[0.8125rem] text-muted-foreground` to the helper text "Max 10MB. JPG, PNG, or WebP."

#### Implementation Notes

- File: `src/app/(public)/gallery/page.tsx` — overline class upgrade.
- File: `src/app/(public)/gallery/gallery-grid.tsx` — all component polish: year group overlines, success/error token colors, upload form headings.
- No structural changes. Pure class/token substitution + overline additions.

---

### Page: `/leaderboard`

**File:** `src/app/(public)/leaderboard/page.tsx`

**Page goal:** Display current tournament standings, post-event.
**Key user actions:** Read rankings → compare team scores.

#### Layout Composition

1. **Dark hero** — navy, overline "Results" + h1 "Leaderboard" + divider. Currently correct structure.
2. **Score tables section** — `py-16 sm:py-24`, `max-w-4xl mx-auto`. Morning / Afternoon / Overall subsections separated by `space-y-12`.
3. **Empty state** — centered with Trophy icon and editorial text.

#### Component Choices

- `ScoreTable` — the primary component. Elevate its visual treatment:
  - Table wrapper: change `overflow-hidden rounded-lg border border-border` to `overflow-hidden rounded-lg border border-border/60 shadow-sm` (Sprint 6 shadow).
  - `<thead>` row: change `bg-muted/50` to `bg-neutral-50`. Column headers: Inter, `text-[0.6875rem]` (11px), `font-semibold`, `uppercase`, `tracking-[0.18em]`, `text-muted-foreground`. This is the Sprint 6 overline treatment adapted for table column headers.
  - `<tbody>` rows: alternating row treatment — remove `bg-primary/5` for top-3 rows (it reads as highlight but looks like a selection state). Replace with a left-border accent: add `border-l-2 border-primary` to the `<tr>` for positions 1–3, `border-l-2 border-transparent` for all others. This is more editorial than a background fill.
  - Position cell: remove medal emojis (per design standards — no emojis as icons). Replace with styled position numbers:
    - Position 1: `text-[#C9A84C]` (warm gold, hand-picked for legibility), `font-display font-bold text-base`
    - Position 2: `text-neutral-400 font-display font-bold text-base`
    - Position 3: `text-[#A87D50]` (warm bronze), `font-display font-bold text-base`
    - Positions 4+: `text-muted-foreground font-sans text-sm`
  - Team name: Inter, 15px, `font-medium text-foreground`.
  - Score cell: `font-mono tabular-nums lining-nums text-lg font-bold text-foreground text-right`. Already partially correct; add `tabular-nums lining-nums` via Tailwind utility classes.
- Section title (`h2 "Morning Session"`): add overline above each section ("Morning Flight", "Afternoon Flight" as overlines, keep h2 as the label).
- Empty state: replace `Trophy` Lucide icon with a clean placeholder (Lucide Trophy icon stays — it is not being used as a decorative emoji). Apply Sprint 6 typography to the empty state text.

#### Copy Treatment

- Session section headings: add overline above each `<h2>` e.g. "Morning Flight" overline above "Morning Session" h2.
- `revalidate = 300` is already set (ISR every 5 minutes) — add an update cadence note below the page title. Inter, 12px, `text-muted-foreground/60`: "Scores update every 5 minutes."

#### Page-Specific Moves

- Remove medal emoji (lines 119–125 in current file) — use styled position numbers instead. This is a hard requirement per design standards.
- Add `tabular-nums` class to score cells. Already uses `font-mono` — add `tabular-nums lining-nums` explicitly for CSS `font-variant-numeric` control.
- The Sprint 6 spec already calls for `font-variant-numeric: tabular-nums lining-nums` on `.tabular-nums` in `globals.css` — verify that token is applied and reference it here.

#### Implementation Notes

- File: `src/app/(public)/leaderboard/page.tsx` — all changes are in-file (no separate component file).
- Medal emoji removal is a breaking visual change — confirm with Scott before executing if there's any hesitation. Default: remove and use styled numbers.
- Add `text-[0.75rem] text-muted-foreground/60` update-cadence note directly below the hero section, inside the content `<div>`.

---

### Page: `/sponsors`

**File:** `src/app/(public)/sponsors/page.tsx`

**Page goal:** Thank confirmed sponsors publicly and direct prospects to the sponsorship catalog.
**Key user actions:** Browse sponsor logos → click "View Sponsorship Packages" CTA.

#### Layout Composition

1. **Dark hero** — navy, overline "Thank You" + h1 "Our Sponsors" + divider + subhead. Already correct structure.
2. **Sponsor tiers section** — `py-20 sm:py-28`, `max-w-5xl mx-auto`. Per-tier sub-sections stacked vertically.
3. **Become a Sponsor CTA** — `bg-neutral-50 border-t border-border/60`, centered, `py-20`. Currently `bg-[#F1F4F6]` — replace with token.
4. **Empty / coming soon state** — centered `text-muted-foreground`. Already minimal — keep.

#### Component Choices

- Tier heading (`h2`): currently `font-display text-xl font-semibold text-center`. Elevate to Sprint 6 section-rhythm:
  - Add overline above each tier heading. Overline text = tier name (e.g., "Champion Sponsor" → overline "Sponsorship Level" + h2 "Champion"). Actually: keep h2 as the tier name but add the Sprint 6 teal rule below it instead of the plain `bg-primary/30` rule. Change `h-px w-12 bg-primary/30` to `h-0.5 w-12 bg-primary`.
- Sponsor logo cards: currently raw `<div className="group">`. Wrap each in a box:
  - With logo: `block rounded-lg border border-border/60 bg-white shadow-xs p-4 transition-[box-shadow,transform] duration-200 hover:shadow-sm hover:-translate-y-0.5`.
  - Without logo (text fallback): `flex h-20 items-center rounded-lg border border-border/60 bg-white px-6 shadow-xs text-sm font-medium text-muted-foreground transition-[box-shadow,colors,transform] duration-200 hover:shadow-sm hover:-translate-y-0.5 hover:text-foreground`.
  - Logo image: change `transition-opacity hover:opacity-80` → use `filter: grayscale(0.4) opacity(0.8)` at rest, `filter: grayscale(0) opacity(1)` on hover. Apply via CSS classes `grayscale-[40%] opacity-80 hover:grayscale-0 hover:opacity-100 transition-[filter,opacity] duration-200`. This is the Appendix B sponsor wall treatment from Sprint 6, now that sponsors are live.
- CTA section: `bg-neutral-50 border-t border-border/60` replaces `bg-[#F1F4F6]`. h2 uses Fraunces h2. Button uses existing `bg-primary` CTA pattern.
- "Sponsorship opportunities available" placeholder: add a subtle ProspectCaptureForm if tier has no sponsors (for empty tier sections only). Actually, keep the existing plain text — adding a form per tier would be excessive. Keep `text-sm text-muted-foreground`.

#### Page-Specific Moves

- Logo card wrapping is the biggest lift here. Currently logos float in `flex-wrap` without cards — adding card chrome gives the sponsor wall the visual weight it deserves.
- Grayscale-to-color logo treatment from Sprint 6 Appendix B: implement now. The logos are live, so this is the right moment.
- The tier grid layout: keep `flex flex-wrap items-center justify-center gap-8` but add `gap-6` refinement. The flex wrap gives organic sizing by logo width — this is correct for sponsor walls.

#### Implementation Notes

- File: `src/app/(public)/sponsors/page.tsx` — all changes in-file.
- Replace `bg-[#F1F4F6]` (line 121) with `bg-neutral-50 border-t border-border/60`.
- Logo card wrapper addition is additive — wrap existing `<a>` elements with a styled `<div>`.
- Grayscale classes: Tailwind v3 supports `grayscale` and `grayscale-0` utilities. Verify `grayscale-[40%]` is in the Tailwind config safelist or use the arbitrary `[filter:grayscale(0.4)_opacity(0.8)]` syntax if needed.

---

## Part 2 — Auth + Error Pages

---

### Page: `/auth/login`

**File:** `src/app/auth/login/page.tsx`

**Page goal:** Authenticate admin users via password, magic link, or Google OAuth.
**Key user actions:** Sign in → land on admin dashboard.

#### Layout Composition

Full-screen centered layout. The outer wrapper `min-h-screen` + `flex items-center justify-center` is correct. Change `bg-gray-50` to `bg-neutral-50` (token-based).

Single Card, `max-w-md w-full`. Centered header: wordmark/logo, then title + description.

Internal card structure:
1. Google OAuth button (primary, full-width, at top)
2. Or separator
3. Mode selector tabs (Password / Magic Link)
4. Form fields (email, conditional password)
5. Submit button

#### Component Choices

- Card: apply Sprint 6 shadow: `shadow-md border border-border/60`. The login card sits alone on screen — it earns `shadow-md` (modal-level elevation).
- `CardTitle` "Admin Login": Fraunces, `text-h2` (28px), `font-semibold`. Currently plain `text-2xl font-bold` — Fraunces is the right font for the page's only heading.
- `CardDescription`: Inter, 15px, `text-muted-foreground`. Keep.
- Google button: `variant="outline"` is correct. Add a small Google wordmark or icon placeholder — currently no icon. Add a `w-4 h-4` SVG Google "G" logo inline before the button label. This is a brand standard for Google OAuth buttons and improves trust signal.
- Mode selector (Password / Magic Link buttons): current `variant={mode === X ? "default" : "ghost"}` works but reads as navigational tabs, not buttons. Replace with a segmented control: a `flex rounded-md border border-border/60 p-0.5 bg-neutral-100` container, with each option as a `<button>` with `rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-150`. Active state: `bg-white shadow-xs text-foreground`. Inactive: `text-muted-foreground hover:text-foreground`.
- Error alert: change `bg-red-50 text-red-700` to `bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-3 text-sm`.
- Success alert: change `bg-green-50 text-green-700` to `bg-success-muted text-success border border-success/20 rounded-md p-3 text-sm`.
- Submit button: `w-full size="lg"` — apply Sprint 6 size lg (`h-11 px-6`). Add loading spinner: replace "Signing in..." text with a `animate-spin` SVG circle icon + "Signing in..." inline.

#### Copy Treatment

- Add a wordmark above the Card: `<p className="font-display text-lg font-semibold text-foreground text-center mb-6">Craven Cancer Classic</p>`. This orients the user — currently the login page has no brand anchoring.
- `CardTitle` → "Sign In" (shorter; "Admin Login" is redundant once the wordmark is present and `CardDescription` handles context).
- `CardDescription` → "Tournament administration" (tighter).

#### Auth Error States

Currently there is no dedicated error page for auth callbacks. Error states live inline in the login page. Add explicit error state rendering:

When URL contains `?error=password-mismatch`: render the error alert with copy "Incorrect email or password. Please try again."
When URL contains `?error=magic-link-failed`: "We couldn't send the magic link. Please try again or use a password."
When URL contains `?error=callback-error`: "Authentication failed. Please return to the login page and try again." — include a `<Link href="/auth/login">` button.

These error states should be read from `searchParams` at page level (server component) and passed as a prop to the client component. Currently the login page is `"use client"` — refactor to a server wrapper + client `LoginForm` component, with the server wrapper handling `searchParams` error parsing.

#### Implementation Notes

- File: `src/app/auth/login/page.tsx` — refactor to server wrapper + `LoginForm` client component.
- Create `src/app/auth/login/login-form.tsx` as the extracted client component (receives `initialError?: string` prop).
- Replace all hardcoded color classes (`bg-gray-50`, `bg-red-50`, `bg-green-50`, etc.) with token-based equivalents.
- Google "G" logo: use an inline SVG (the official Google G mark is freely usable per brand guidelines for OAuth buttons). Inline in the component file — no external dependency.

---

### Error Pages

**Files:**
- `src/app/error.tsx` (root layout error boundary)
- `src/app/(public)/error.tsx` (public route error boundary)
- `src/app/admin/error.tsx` (admin error boundary)

All three files are currently identical. Apply the design system to each, with context-appropriate styling.

#### Public Error Page (`src/app/(public)/error.tsx`)

Layout composition: Full-page centered, `min-h-[60vh]`, section with `py-24 px-4`.

```
[overline: "Something Went Wrong"]
[h2: "We hit an unexpected error"]
[body: "Please try again. If the problem persists, contact the organizers."]
[Button: "Try Again" — teal, size lg, rounded-none]
[Link: "Return to Homepage" — ghost/underline, Inter, 14px]
```

- Add the section-rhythm overline above the heading.
- h2 in Fraunces `text-h2`.
- Body in Inter `text-body text-muted-foreground`.
- "Try Again" button: use Sprint 6 teal CTA pattern.
- No error.digest exposed on public pages (security).

#### Root Error Page (`src/app/error.tsx`)

Identical to the public error page. These two can share the same visual treatment — they have the same public-facing context.

#### Admin Error Page (`src/app/admin/error.tsx`)

Layout: fits inside the admin main content area (`min-h-[400px]` is correct — it renders inside the sidebar layout).

```
[h2: "Something went wrong" — Inter, 20px, font-semibold]
[body: "An unexpected error occurred." — Inter, 14px, text-muted-foreground]
[code block if digest present: error.digest in mono, text-muted-foreground/60, text-xs]
[Button: "Try Again" — default variant, size sm]
```

- Admin error page shows `error.digest` if present (internal context — safe).
- No Fraunces — admin heading stays Inter for density.
- Button: standard shadcn `variant="default" size="sm"`. Not rounded-none — that's a public page pattern.

#### Implementation Notes

- Files: all three `error.tsx` files.
- Public errors: add section-rhythm overline, Fraunces h2, teal CTA button, homepage link.
- Admin error: add digest display, keep Inter, apply Sprint 6 component tokens (shadow-xs on any wrapping card if applicable).
- The `button onClick={reset}` raw element: replace with `<Button variant="default" size="sm" onClick={reset}>` to use the Sprint 6 Button component (inherits all Sprint 6 shadow/transition tokens automatically).

---

## Part 3 — Admin Pages

**Aesthetic reference:** Linear, Stripe dashboard, Vercel dashboard. Quiet. Dense. Considered.
**Typography rule for admin:** Inter for all admin headings — Fraunces only where a heading would benefit from editorial weight (e.g., a section h2 on a form page is acceptable). No serif for table column headers, stat labels, or body copy.

---

### Shared Admin Chrome

**Files:** `src/components/admin/admin-sidebar.tsx`, `src/app/admin/layout.tsx`

#### Sidebar Polish

Current state: bare shadcn Sidebar. It works but reads as default.

Changes:

- Sidebar header: add a small teal dot or initialism mark next to "CCC Admin". Current: plain bold text. Change to: `<span className="font-display text-base font-semibold text-foreground">CCC</span><span className="font-sans text-base font-medium text-muted-foreground ml-1">Admin</span>`. The split treatment anchors the brand wordmark without full logo.
- Active nav item: current `isActive` prop controls shadcn's active state. Add a left-border treatment to the active item: `border-l-2 border-primary` on the active `SidebarMenuButton`. This is the standard Linear-style active indicator.
- Nav item typography: Inter 14px `font-medium` for labels. Icon size stays `h-4 w-4`. Add `text-muted-foreground` to inactive items and `text-foreground` to the active item.
- Footer "View Site" and "Sign Out": keep structure. "Sign Out" stays `text-destructive hover:text-destructive`.
- Sidebar background: confirm it uses `--sidebar-background` token. If not explicitly set, add `bg-neutral-50` to the Sidebar component via the `className` prop on `<Sidebar>`.
- Replace Lucide icons with equivalent Lucide icons — they are already Lucide, which is acceptable for admin. Lucide icons are not emojis. No change needed.

#### Admin Layout Header Bar

Current: `<SidebarTrigger />` alone in a `border-b border-border/40 px-4 py-2` bar.

Add to the header bar:
- Right side: current page breadcrumb or page title (pass via a context or just leave as-is for Sprint 7 — **do not add a breadcrumb system; it's out of scope**). Simple upgrade: add `<div className="ml-auto text-xs text-muted-foreground/60 font-sans">Craven Cancer Classic Admin</div>` to the right of the trigger, so the bar has visual purpose.
- Height: change `py-2` to `py-3` for a slightly more grounded header.

#### Implementation Notes

- File: `src/components/admin/admin-sidebar.tsx` — wordmark split, active border indicator, nav item colors.
- File: `src/app/admin/layout.tsx` — header bar padding + right-side label addition.

---

### Page: `/admin` (Dashboard)

**File:** `src/app/admin/page.tsx`

**Page goal:** Provide an at-a-glance tournament status summary.
**Key user actions:** Check registration count → check revenue → navigate to detail pages.

#### Layout Composition

Page title + description → 4-stat card grid → (future: recent registrations table — not in Sprint 7 scope).

#### Component Choices

- Page title: Inter, `text-2xl font-semibold text-foreground` (change from `font-bold` — semibold is enough at 24px for admin density).
- Description: Inter, `text-sm text-muted-foreground`. Already correct.
- Stat cards: 4-up grid. Apply Sprint 6 Card `shadow-sm border border-border/60`. Currently uses raw shadcn Card with no shadow.
- Stat value (`<p className="text-2xl font-bold">`): change to `font-display text-2xl font-bold text-foreground` — Fraunces on the big number only. Stat labels stay Inter.
- Stat sublabel (`text-xs text-muted-foreground`): change to `font-sans text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground/80`. This is a mini-overline treatment for the stat description.
- Lucide icons in cards: keep `h-4 w-4 text-muted-foreground`. No change.
- Card `CardHeader`: change `flex-row items-center justify-between pb-2` — add `space-y-0` explicitly to prevent Tailwind gap from affecting flex-row layout.
- All stat values are currently hardcoded `0` — this is a data gap, not a design gap. Note: Sprint 7 does not add data fetching to the dashboard. If Scott wants live counts, that's a separate data sprint.

#### Page-Specific Moves

- Add a `border-b border-border/60 pb-6 mb-8` to the page heading block to visually separate it from the cards. This is the standard admin page heading treatment — apply it here and to all admin pages below.
- Quick actions row: after the stat cards, add a `<div className="mt-6 flex flex-wrap gap-3">` with `<Link href="/admin/registrations">` and `<Link href="/admin/scores">` as `variant="outline" size="sm"` Buttons. Labels: "Manage Registrations", "Upload Scores". These give the dashboard landing page utility beyond read-only stats.

#### Implementation Notes

- File: `src/app/admin/page.tsx`.
- No new files needed.
- Quick-action Links: use `LinkButton` component (`src/components/ui/link-button.tsx`) with `variant="outline" size="sm"`.

---

### Page: `/admin/scores`

**Files:** `src/app/admin/scores/page.tsx`, `src/app/admin/scores/score-manager.tsx`

**Page goal:** Import CSV scores and manage the leaderboard data.
**Key user actions:** Upload CSV → review scores → delete erroneous entries.

#### Layout Composition

Page heading block → CSV upload area → scores table.

#### Component Choices

- Page heading: apply admin heading treatment (Inter semibold, `border-b border-border/60 pb-6 mb-8`).
- `ScoreManager` component (`score-manager.tsx` — not yet read): assume it contains a file input + table. Apply:
  - CSV upload zone: `border-2 border-dashed border-border/60 rounded-lg p-8 text-center bg-neutral-50 hover:border-primary/40 hover:bg-primary/5 transition-colors duration-150`. This is the standard drag-drop target pattern.
  - Score table: apply Sprint 6 table treatment — `overflow-hidden rounded-lg border border-border/60 shadow-sm`, `thead` with `bg-neutral-50`, column headers in Inter 11px small-caps style (`text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground`), score cells `font-mono tabular-nums lining-nums`.
  - Delete actions: `variant="ghost" size="sm"` Button with `text-destructive hover:text-destructive hover:bg-destructive/10`.

#### Implementation Notes

- Files: `src/app/admin/scores/page.tsx` (heading block), `src/app/admin/scores/score-manager.tsx` (all table + upload treatment).
- Read `score-manager.tsx` before executing — Sprint 7 spec does not prescribe internal component structure changes, only visual token upgrades.

---

### Page: `/admin/sponsors`

**Files:** `src/app/admin/sponsors/page.tsx`, `src/app/admin/sponsors/sponsor-list.tsx`

**Page goal:** Manage confirmed sponsors — add, edit, assign to tiers.
**Key user actions:** View current sponsor list → add new sponsor → edit tier assignment.

#### Layout Composition

Page heading block → Add Sponsor form (collapsible) → Sponsor table by tier.

#### Component Choices

- Page heading: admin heading treatment.
- Add Sponsor form: `Card` with `shadow-sm border border-border/60`, `p-6`. Form fields in 2-column grid on sm+. `CardTitle` Inter semibold 16px (not Fraunces — this is a form panel, not an editorial heading).
- `tier_id` Select: use shadcn `Select` component (`src/components/ui/select.tsx`). Options sourced from `sponsorshipItems` prop. Label "Sponsorship Tier". Sprint 6 Input treatment applies to Select via shared token.
- Sponsor table: same admin table treatment as scores. Columns: Name, Tier, Website, Logo, Actions. `font-mono` for URL display in website column (`text-xs font-mono text-muted-foreground/70`).
- Logo column: `<Image>` thumbnail 40×20 object-contain, or a dash if no logo. Wrap in `rounded border border-border/60 p-1 bg-white`.
- Action buttons: "Edit" `variant="ghost" size="sm"`, "Delete" `variant="ghost" size="sm" text-destructive`.

#### Implementation Notes

- Files: `src/app/admin/sponsors/page.tsx`, `src/app/admin/sponsors/sponsor-list.tsx`.
- Read `sponsor-list.tsx` before executing — spec provides visual direction, not internal structure.

---

### Page: `/admin/sponsorships`

**Files:** `src/app/admin/sponsorships/page.tsx`, `src/app/admin/sponsorships/sponsorship-manager.tsx`

**Page goal:** CRUD for sponsorship_items catalog (the 8 seeded packages).
**Key user actions:** View item list → add new item → edit price/quantity → deactivate.

#### Layout Composition

Page heading block → Add/Edit item form → Items table with purchase count.

#### Component Choices

- Items table: apply admin table treatment. Columns: Name, Price, Max Qty, Sold, Available, Active, Actions. Numeric columns (Price, Max Qty, Sold) in `font-mono tabular-nums lining-nums text-right`.
- Price display: format as `$X,XXX` via `(price_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })`. Right-aligned.
- "Sold" count: if `sold_count >= max_quantity`, render in `text-warning` token (amber). Otherwise `text-foreground`.
- Active toggle: use shadcn `Switch` component (`src/components/ui/switch.tsx`). Label "Active" in Inter 13px. Wrap in a `flex items-center gap-2`.
- Add/Edit form: same Card treatment as sponsors form. Fields: Name, Price (in cents or dollars — confirm current implementation), Description, Max Quantity, Sort Order, Year. `max-w-2xl`.

#### Implementation Notes

- Files: `src/app/admin/sponsorships/page.tsx`, `src/app/admin/sponsorships/sponsorship-manager.tsx`.
- Read `sponsorship-manager.tsx` before executing.
- "Sold" count color: `item.sold_count >= item.max_quantity ? 'text-warning font-semibold' : 'text-foreground'`.

---

### Page: `/admin/registrations`

**Files:** `src/app/admin/registrations/page.tsx`, `src/app/admin/registrations/registration-list.tsx`

**Page goal:** Review all team registrations, export CSV, manually add entries.
**Key user actions:** View team list → export CSV → manually create registration.

#### Layout Composition

Page heading block → Action bar (Export CSV button, Add Team button) → Registrations table.

#### Component Choices

- Action bar: `flex items-center justify-between mb-6`. Left: registration count in Inter 13px `text-muted-foreground`. Right: "Export CSV" `variant="outline" size="sm"` + "Add Team" `variant="default" size="sm"`.
- Registrations table: admin table treatment. Columns: Team Name, Session (AM/PM), Players, Email, Registered Date, Payment Status, Actions. Date column: `text-[0.8125rem] font-mono text-muted-foreground` (tabular date format).
- Payment status badge: use inline badge pattern — `rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold`. Colors: paid → `bg-success-muted text-success`, pending → `bg-warning-muted text-warning`, failed → `bg-destructive/10 text-destructive`.
- Session badge: AM/PM — `bg-neutral-100 text-neutral-600 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] px-2 py-0.5 rounded-sm`.
- Add Team: if a create form exists in `registration-list.tsx`, apply the same Card + 2-column grid form treatment.

#### Implementation Notes

- Files: `src/app/admin/registrations/page.tsx`, `src/app/admin/registrations/registration-list.tsx`.
- Read `registration-list.tsx` before executing — it may already contain the form and table structure.

---

### Page: `/admin/event`

**Files:** `src/app/admin/event/page.tsx`, `src/app/admin/event/event-settings-form.tsx`

**Page goal:** Configure tournament settings (registration fee, dates, capacity caps).
**Key user actions:** Update event dates → adjust registration fee → save.

#### Layout Composition

Page heading block → `EventSettingsForm` in `max-w-2xl`. Already correct width constraint.

#### Component Choices

- `EventSettingsForm` (`event-settings-form.tsx`): apply Sprint 6 form grouping:
  - Wrap field groups in `<fieldset>` with a subtle `<legend>` in Inter 12px uppercase `tracking-[0.15em] text-muted-foreground/70`. Groups: "Event Details" (dates, location), "Registration" (fee, cap, open/close). This gives the form logical sections without full Card panels per group.
  - `registration_fee_cents` field: add helper text below the input in Inter 12px `text-muted-foreground`: "Enter in cents (e.g., 15000 for $150.00)."
  - Date inputs: `type="date"` inherits Sprint 6 Input styling. Verify height `h-10`.
  - Submit button: `variant="default" size="lg"` (`h-11 px-6`). Label "Save Settings".
  - Success feedback: `bg-success-muted text-success border border-success/20 rounded-md p-3 text-sm` (token-based; replace any `bg-green-*`).
  - Error feedback: `bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-3 text-sm`.

#### Implementation Notes

- Files: `src/app/admin/event/page.tsx` (heading block), `src/app/admin/event/event-settings-form.tsx` (fieldset grouping, feedback tokens).
- Read `event-settings-form.tsx` before executing to confirm current field structure.

---

### Page: `/admin/settings`

**Files:** `src/app/admin/settings/page.tsx`, `src/app/admin/settings/invite-form.tsx`

**Page goal:** Invite new admin users via email.
**Key user actions:** Enter email → send invite.

#### Layout Composition

Page heading block → `InviteForm` in `max-w-2xl`. Already correct.

#### Component Choices

- `InviteForm`: wrap in a `Card` with `shadow-sm border border-border/60 p-6`. This elevates the form from bare fields to a contained panel.
  - `CardTitle` "Invite Admin" in Inter semibold 16px.
  - `CardDescription` "Invited users will receive an email with a sign-in link." Inter 13px `text-muted-foreground`.
  - Email field: Sprint 6 Input treatment applies automatically.
  - Submit button: `variant="default" size="sm"`. Label "Send Invite".
  - Success/error feedback: token-based (same pattern as event settings).

#### Implementation Notes

- Files: `src/app/admin/settings/page.tsx` (heading block), `src/app/admin/settings/invite-form.tsx` (Card wrapping, token feedback).
- Read `invite-form.tsx` before executing.

---

## Global Admin Heading Pattern

Apply this pattern to every admin page `page.tsx`:

```tsx
<div className="border-b border-border/60 pb-6 mb-8">
  <h1 className="font-sans text-2xl font-semibold text-foreground">[Page Title]</h1>
  <p className="mt-1 font-sans text-sm text-muted-foreground">[Description]</p>
</div>
```

This replaces the current raw `text-2xl font-bold` heading in all 7 admin page files. Apply uniformly.

---

## Acceptance Criteria

### Public Pages
- [ ] `/donate`: stats section is `bg-neutral-50`; "In Loving Memory" section is `bg-purple/5 border-y border-purple/20`; all overlines use Sprint 6 11px uppercase pattern; teal rules above each stat number
- [ ] `/sponsorships`: cards use `shadow-sm border border-border/60` hover pattern (no ring); sold-out badge is token-based; availability progress bar present on items with `max_quantity`; purchase form wrapper is `bg-neutral-50`
- [ ] `/gallery`: year group overlines present above each year heading; success/error feedback is token-based (`bg-success-muted`, `bg-destructive/10`); upload form heading is Fraunces `text-h3`
- [ ] `/leaderboard`: medal emojis removed; position 1–3 rendered in styled numbers with teal left-border accent; column headers in Inter 11px small-caps; score cells have `tabular-nums lining-nums`; update cadence note present
- [ ] `/sponsors`: logos wrapped in card boxes with `shadow-xs border border-border/60`; grayscale logo treatment at rest; CTA section uses `bg-neutral-50` not `bg-[#F1F4F6]`

### Auth + Error Pages
- [ ] `/auth/login`: page background `bg-neutral-50` (not `bg-gray-50`); card has `shadow-md`; page title wordmark above card; mode selector uses segmented control pattern; error/success alerts use token colors; `searchParams` error parsing implemented
- [ ] `error.tsx` (public): Fraunces h2 heading; section-rhythm overline; teal `Button` for "Try Again"; homepage link present; no `error.digest` exposed
- [ ] `error.tsx` (admin): Inter heading; `error.digest` shown if present; `Button` component replaces raw `<button>`; Sprint 6 Button tokens apply

### Admin Pages
- [ ] Admin sidebar: split wordmark treatment; active item has left `border-l-2 border-primary`; inactive nav items `text-muted-foreground`
- [ ] Admin layout header: `py-3`; right-side "Craven Cancer Classic Admin" label present
- [ ] All admin `page.tsx` files: heading block uses `border-b border-border/60 pb-6 mb-8` pattern; `font-sans text-2xl font-semibold` (not `font-bold`)
- [ ] Admin dashboard: stat card values in `font-display`; stat sublabels in 11px uppercase; cards have `shadow-sm`; quick-action link row present
- [ ] Admin tables (scores, sponsors, sponsorships, registrations): `thead bg-neutral-50`, column headers Inter 11px uppercase tracked, numeric cells `font-mono tabular-nums`, `shadow-sm` on table wrapper
- [ ] Admin forms (sponsors, sponsorships, event, settings): `bg-success-muted`/`bg-destructive/10` feedback colors (no raw `bg-green-*` or `bg-red-*`)
- [ ] `/admin/registrations`: payment status badges use Sprint 6 state tokens; session badges use `bg-neutral-100`
- [ ] `tsc` clean, no new lint warnings, all existing Vitest tests pass

---

## Implementation Notes Summary (File Index)

| File | Change Type |
|---|---|
| `src/app/(public)/donate/page.tsx` | Token replacement, overline upgrade, memorial section `bg-purple/5` |
| `src/app/(public)/sponsorships/page.tsx` | Overline/section-rhythm additions |
| `src/app/(public)/sponsorships/sponsorship-grid.tsx` | Card shadow, sold-out badge, availability bar, purchase form tokens |
| `src/app/(public)/gallery/page.tsx` | Overline class upgrade |
| `src/app/(public)/gallery/gallery-grid.tsx` | Year overlines, token feedback colors, upload form headings |
| `src/app/(public)/leaderboard/page.tsx` | Medal emoji removal, styled positions, table column headers, tabular-nums |
| `src/app/(public)/sponsors/page.tsx` | Logo card wrapping, grayscale treatment, CTA section token |
| `src/app/auth/login/page.tsx` | Refactor to server wrapper; extract `login-form.tsx`; token colors; segmented control; wordmark |
| `src/app/auth/login/login-form.tsx` | New file (extracted client component) |
| `src/app/error.tsx` | Fraunces h2, overline, Button component, homepage link |
| `src/app/(public)/error.tsx` | Same as above |
| `src/app/admin/error.tsx` | Button component, digest display, Inter typography |
| `src/components/admin/admin-sidebar.tsx` | Wordmark split, active border, nav item colors |
| `src/app/admin/layout.tsx` | Header `py-3`, right-side label |
| `src/app/admin/page.tsx` | Heading block, `font-display` stat values, stat sublabel overline, quick actions |
| `src/app/admin/scores/page.tsx` | Heading block |
| `src/app/admin/scores/score-manager.tsx` | Upload zone, table treatment |
| `src/app/admin/sponsors/page.tsx` | Heading block |
| `src/app/admin/sponsors/sponsor-list.tsx` | Table treatment, logo thumbnail, form Card |
| `src/app/admin/sponsorships/page.tsx` | Heading block |
| `src/app/admin/sponsorships/sponsorship-manager.tsx` | Table treatment, sold count colors, Switch toggle |
| `src/app/admin/registrations/page.tsx` | Heading block, action bar |
| `src/app/admin/registrations/registration-list.tsx` | Table treatment, status badges |
| `src/app/admin/event/page.tsx` | Heading block |
| `src/app/admin/event/event-settings-form.tsx` | Fieldset grouping, feedback tokens |
| `src/app/admin/settings/page.tsx` | Heading block |
| `src/app/admin/settings/invite-form.tsx` | Card wrapping, feedback tokens |
