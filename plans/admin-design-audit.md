# Admin Design Audit — 2026-04-20

---

## Executive Summary

1. **File upload inputs are raw native `<input type="file">` on two routes** — `sponsor-form.tsx:207` (logo) and `import-client.tsx:116` (the hidden input powering the drop-zone). The sponsor file input is completely un-styled and renders as browser-native chrome. The import drop-zone wraps the hidden input in a styled div but exposes no persistent filename/format-constraint chips after file selection (file-selected state is there but uses only filename + size, misses filetype chip and max-size chip).

2. **Sponsor-form spacing is the tightest and most inconsistent in the admin** — it mixes `space-y-2`, `h-8` selects, `size="sm"` buttons, and `gap-3 pt-6` for the Active toggle, producing a noticeably denser and slightly misaligned visual rhythm compared to every other drawer form that uses `space-y-1.5` / `space-y-3` and full-height inputs.

3. **Page-heading `font-sans` vs `font-display` inconsistency** — `AdminPageHeading` renders `h1` with `font-sans text-2xl`, while dashboard stat cards use `font-display text-2xl`. Section headers inside forms use `text-xs font-semibold uppercase tracking-widest text-muted-foreground` (contact-form) or `CardTitle` with `font-sans text-base` (event, settings). There is no single authoritative heading style applied consistently across the admin.

4. **Native `<select>` still present in sponsor-list** (`sponsor-list.tsx:186`) — violates the No-Native-Browser-UI rule (MEMORY.md entry). Also uses hardcoded `bg-teal-600` for the status filter radio buttons (`sponsor-list.tsx:216`) instead of `bg-primary` / `var(--brand)`. Same file also uses `accent-teal-600` in sponsor-form (:187) instead of `accent-brand`.

5. **Empty states and loading states are inconsistent across routes** — contacts has a rich empty state with heading + body + CTA link (contact-list:592-615), scores has bare text "No scores yet" with no padding or centering class (score-manager:173), and trash uses a minimal `<p>` (`trash-tabs:60-64`). The `ScoreManager` also uses `window.location.reload()` as its success callback which causes a full page flash on every drawer save — unrelated to design but worth noting alongside the UX pass.

---

## Tokens & Shared Components

### Drawer width scale
Currently: contact-drawer=480px, team-drawer=520px, sponsor-drawer=480px, sponsorship-drawer=480px, score-drawer=480px.

Team drawer at 520px is correct — it contains 4 ContactTypeahead pickers that each expand with inline create-contact forms. Sponsor drawer at 480px is **tight** when the logo upload, ContactTypeaheadMulti, and 2-column grid all need to coexist. Recommend:

| Drawer | Current | Proposed | Reason |
|---|---|---|---|
| contact-drawer | 480px | 480px | Adequate — 5 sections scroll fine |
| team-drawer | 520px | 520px | Correct — 4 typeaheads need space |
| sponsor-drawer | 480px | **540px** | Logo upload + multi-contact picker + 2-col grid truncate |
| sponsorship-drawer | 480px | 480px | 5 fields, no overflow |
| score-drawer | 480px | 480px | 3 fields, lightweight |

All drawer `sm:max-w-[Xpx]` values live inside their respective `SheetContent` className — a single token change per drawer.

### Form field spacing scale
- Correct pattern (used in contact-form, score-form, team-form): `space-y-1.5` between label/input, `space-y-3` between fields in a section, `space-y-6` between sections.
- Problem pattern (used in sponsor-form, sponsorship-form, invite-form): `space-y-2` between label/input, `space-y-4` between fields — creates a noticeably tighter and slightly off rhythm.
- **Recommendation**: standardize all admin forms to `space-y-1.5` (label→input) / `space-y-4` (field→field) / `space-y-6` (section→section). The `space-y-2` vs `space-y-1.5` is the perceptible inconsistency.

### Shared `FileUploadField` component (new)
Both file upload sites need a single shared component. Spec:
- Styled drop-zone (already exists in import-client's UploadStep — extract it)
- Selected-file pill: filename (truncated), filetype chip, size chip, remove button
- Error state: red border + inline error
- Accepts: `accept`, `maxSizeMB`, `name` (for FormData), `onChange`, `value` (controlled File | null), `label`, `helpText` props

### Shared empty-state pattern
Propose a shared `<AdminEmptyState>` that accepts `title`, `body`, `action?`. Current contact-list empty state (:592-615) is the best reference — replicate it everywhere.

### Section heading typography
All form section headings (`h3` inside forms) should use: `text-xs font-semibold uppercase tracking-widest text-muted-foreground` — consistent with contact-form. Some forms (sponsor-form, sponsorship-form) use `CardTitle` inside drawers which is semantically mismatched.

---

## Per-Route Findings

---

### 1. `/admin` — Dashboard (`page.tsx`)

**Page spacing**: `AdminPageHeading` `mb-8` + card grid `gap-4` is correct and well-proportioned. No issues.

**Forms**: None.

**Typography**: Stat values use `font-display text-2xl font-bold` — this is correct, Fraunces for numeric display values is on-brand. The stat sub-labels use `font-sans text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground/80` — consistent with the badge/label system.

**Page heading inconsistency** (`page.tsx:70`, `admin-page-heading.tsx:15`): `AdminPageHeading` uses `font-sans` for `h1`. The dashboard page title "Dashboard" should arguably use `font-heading` (Fraunces) for a premium feel, consistent with how the brand uses display type. Low-priority aesthetic call. **P2**.

**State handling**: No empty state needed — stat cards always have values (0 is a valid state and displays correctly).

**Mobile**: 1-col → 2-col → 3-col grid is fine. Cards are 44px+ touch targets.

---

### 2. `/admin/contacts` — Contact List + Drawer

**Page spacing**: Filter row (`contact-list.tsx:391`) wraps correctly. Action bar spacing `justify-between` is fine.

**Filter bar (contact-list.tsx:391-467)**: 5 select filters + 1 text input + 1 checkbox do not fit on one row at typical admin widths. They wrap but produce a ragged layout. The filters have inconsistent widths: 160px, 140px, 180px, 175px, 175px. Standardize to `w-40` (160px) across all selects for visual alignment. **P2**.

**Bulk action bar (contact-list.tsx:488-550)**: `px-4 py-2.5` feels compact relative to the outer list rhythm. `py-3` would give better breathing room. **P2**.

**Forms (contact-form.tsx)**:
- Spacing is well-structured: `space-y-6` sections, `space-y-3` within sections, `space-y-1.5` label/input. This is the reference pattern.
- Actions div at :390: `flex gap-2 pt-2 pb-4` — the `pb-4` is a workaround for overflow. Since the form is inside a `flex-1 overflow-y-auto` div in the drawer, the bottom padding on the inner form is unnecessary and causes a doubled bottom gap. Remove `pb-4`, rely on drawer's `py-4` (:83). **P2**.
- The marketing consent checkbox (`contact-form.tsx:304-312`) uses a raw `<input type="checkbox">` inline, not the `Switch` component. Inconsistent with event-settings-form which uses `<Switch>`. For a toggle of this semantic weight, Switch is more polished. **P2**.
- The Salutation field takes up half a column at `col-span-2 sm:col-span-1` but leaves the other half empty (:182-191) via a `col-span-2 sm:col-span-1` blank div. Wasteful layout — salutation should be `col-span-1` (≈80px wide via `w-24`), not a full half-column. **P2**.
- Address city/state/zip grid (`contact-form.tsx:338-373`): at `<sm`, state is `col-span-1` and zip is `col-span-2`. At `sm+`, state and zip each become `col-span-1` within a 3-column grid. However, the State input (`maxLength={2}`) renders at full column width — it should be constrained to `max-w-[72px]` to avoid a 2-character field spanning a 33% column. **P2**.

**Drawer (contact-drawer.tsx)**:
- Width 480px. Appropriate for content.
- Close button is hidden (`showCloseButton={false}`). The X is removed but there is no explicit keyboard dismissal hint. Fine for now since clicking the overlay closes it.
- Footer delete button has correct styling. **No issues**.

**Empty/loading states**: Rich empty state at :592-615 is the gold standard. Loading uses opacity transition. **Good**.

**Mobile**: Table overflows — there is no `overflow-x-auto` wrapper around the `<table>`. The outer div at :553 has `overflow-hidden` which clips instead of scrolls. **P1 — contacts table clips on mobile without horizontal scroll.**

---

### 3. `/admin/contacts/import` — CSV Import (3-step)

**Page spacing**: `AdminPageHeading` with back-link is well-structured.

**Upload step (import-client.tsx:61-199)**:
- Drop-zone is styled well. Has drag state. Has selected-file preview with name + size.
- **Missing**: file type chip (e.g. `CSV` badge), max-size info. These should appear as constraint chips below the drag instruction text. Currently only "Accepts .csv files only" in plain text. **P2**.
- Icon at :125-136 is an inline SVG upload icon — should use Lucide `UploadCloud` or `FileUp` per project icon convention. **P2**.
- File-selected preview icon at :151-162 is another inline SVG document icon — should use Lucide `FileText`. **P2**.
- Remove button at :172-186 is a plain `<button>` with SVG X — should use the `Button` component with `variant="ghost" size="icon-sm"` + Lucide `X`. **P2**.

**File input**: `import-client.tsx:114-123` — the `<input type="file">` is `className="hidden"` and triggered by the styled div click. This pattern is acceptable and already styled. The raw input never renders visibly. **Not a bug — this is a correctly hidden input powering a custom zone.**

**Preview step (import-client.tsx:207-368)**:
- Summary bar at :229-248: `px-5 py-4` is slightly generous for a summary strip. `px-4 py-3` would match the rest of the admin. **P3**.
- Table has `overflow-x-auto` at :250. Good for mobile.
- Select triggers inside the table use `h-7 w-[110px]` (:319) — correct, compact but functional at this density.
- The "Start over" button label should be "Start Over" (title case). **P3**.

**Success step (import-client.tsx:374-413)**:
- The "View contacts" CTA at :404-410 is a raw `<a>` tag with hardcoded Tailwind classes — should be `<Link>` from next/link + `buttonVariants({ variant: "default" })` for consistency. **P2**.

**Mobile**: Full-page layout. Drop-zone + summary bar constrained to `max-w-xl`. The preview table can be wide with many columns — `overflow-x-auto` handles it. Acceptable.

---

### 4. `/admin/teams` — Team List + Drawer

**Page spacing**: Correct. `AdminPageHeading` + `TeamList`.

**Forms (team-form.tsx)**:
- `space-y-5` root form spacing — consistent enough with contact-form's `space-y-6` but slightly tighter. P3 — not critical.
- Session select at :138-149 uses `w-[200px]` fixed width — should be `w-full` for drawer consistency. **P2**.
- ContactTypeahead components (captain, player 2-4) each have their own `space-y-5` spacing in the form. The gap between typeahead fields feels uniform but the label styling depends on the ContactTypeahead component's internal rendering — not audited here.
- Actions are hidden while inline create forms are open (:193-203). This is correct behavior.
- **Missing**: No error boundary / loading skeleton when the drawer opens in "edit" mode with data fetch pending. Empty team name in the title (`Edit Team: ` with empty string) is visible if team_name is blank. **P2**.

**Drawer (team-drawer.tsx)**:
- Width 520px. Justified by the 4-typeahead layout.
- `overflow-hidden p-0` correct pattern.
- Footer delete button follows the same pattern. **No issues**.

**Team list (team-list.tsx)**: Not read in full — out of scope details. The page renders a list of teams. The teams table follows the same pattern as contact-list.

**Mobile**: Confirm team-list table has `overflow-x-auto` wrapper (not verified — follow-up P2).

---

### 5. `/admin/sponsors` — Sponsor List + Drawer

**Page spacing**: Correct heading. Filter row renders well.

**Filter bar (sponsor-list.tsx:176-225)**:

- **P1: Native `<select>` at :186** — `<select name="year" ...>` is a native browser select, violating the MEMORY.md `[No Native Browser UI]` rule. Must be replaced with the `Select` component from `@/components/ui/select`.

- **P1: Hardcoded `bg-teal-600` at :216** — the status-filter radio group uses `bg-teal-600 text-white` for the active state instead of `bg-primary text-primary-foreground`. Both `--primary` and `--brand` resolve to `#5797a6` (brand teal) via CSS variables. Hardcoded Tailwind color class bypasses the token system and breaks dark mode.

**Forms (sponsor-form.tsx)**:

- **P0: Raw `<input type="file">` at :204-209** — completely unstyled native file picker. No drop-zone, no selected-filename display, no filetype chip, no size constraint chip. This is the "test label" Scott is referring to — it renders the browser's default `Choose File` button with no design. Must be replaced with the `FileUploadField` shared component described above.

- **P1: Spacing inconsistency** — root form uses `space-y-4` (:96), field groups use `space-y-2` (:98, 111, 136, 154, 168). Other forms use `space-y-6` / `space-y-3` / `space-y-1.5`. Feels noticeably denser — especially visible when comparing the sponsor drawer (480px, tight) to the contact drawer (480px, comfortable).

- **P1: `h-8` on SelectTriggers** (`:124`, `:144`) makes the tier and payment-status selects shorter than the adjacent text inputs (which default to `h-9` or `h-10`). Mixed input heights in the same 2-column grid create a visually bumpy row alignment.

- **P2: `accent-teal-600` at :187** — the Active checkbox uses hardcoded `accent-teal-600` instead of `accent-brand`. Replace.

- **P2: `is_active` checkbox at :180-192** — a raw checkbox styled with `role="switch"` and `aria-checked`. This should be the `<Switch>` component (already imported in event-settings-form) for semantic and visual consistency.

- **P2: Logo preview at :215-219** — `className="mt-2 h-16 w-auto object-contain"` shows the preview but with no border, no background, no caption. Add `rounded-md border border-border/60 bg-neutral-50 p-1` to frame the preview.

- **P2: Button sizes** — form uses `size="sm"` for submit/cancel (:225-237) while other forms use default size. Should match the pattern.

- **P2: `Contacts` label/field at :194-200** — no description text explaining what linking contacts does. A `<p className="text-xs text-muted-foreground">` helper would reduce confusion.

**Empty state (sponsor-list.tsx:271-274)**: Bare "No sponsors yet. Click "New Sponsor" to get started." inside a `TableCell`. Should follow the rich empty-state pattern. **P2**.

**Mobile**: sponsor-list table has `overflow-hidden` wrapping — may clip on narrow screens. Verify needs `overflow-x-auto`. **P2**.

---

### 6. `/admin/sponsorships` — Sponsorship Manager

**Page spacing**: Stats cards + packages card + purchases card rhythm is clean. `space-y-6` between sections is correct.

**Forms (sponsorship-form.tsx)**:
- `space-y-4` root, `space-y-2` fields — same tighter pattern as sponsor-form. Should be `space-y-6` / `space-y-1.5`. **P2**.
- Description textarea uses `rows={2}` (:83) — very short for a description field inside a 480px drawer. `rows={3}` minimum. **P2**.
- "Max Quantity (blank = unlimited)" label (:87) is verbose for a label element. Better as label "Max Quantity" with helper text `<p class="text-xs text-muted-foreground">Leave blank for unlimited</p>` below the input. **P2**.

**Drawer (sponsorship-drawer.tsx)**:
- Width 480px. Fine for this form.

**Cascade delete dialog (sponsorship-manager.tsx:365-411)**: `DialogContent` uses `showCloseButton={false}` but no explicit close X replacement. The Escape key still dismisses (base-ui default). Fine.

**Empty state (sponsorship-manager.tsx:173-180)**: "No sponsorship packages yet" is bare text. Follow rich empty-state pattern. **P2**.

**Loading state**: `isPending` applied via `style={{ opacity: isPending ? 0.6 : 1 }}` on the root div (:120). Acceptable but the opacity shift is abrupt — prefer `transition-opacity duration-150` inline style or Tailwind class. **P3**.

---

### 7. `/admin/scores` — Score Manager

**Page spacing**: `space-y-6` actions + CSV panel + table. Fine.

**CSV import panel (score-manager.tsx:121-152)**:
- Drop-zone styling `border-2 border-dashed ... p-8 text-center` exists but the content inside is just text + a textarea, not a real drag-drop zone. The dashed border implies "drop here" but there is no drag-drop handler on this element. **P2 — misleading affordance**. Remove the dashed border; render it as a plain card panel instead, since it's paste-CSV not file-drop.
- Textarea `rows={8}` (:129) inside a dashed-border box with text above and buttons below feels cramped in the vertical rhythm. The panel should use a `Card` component. **P2**.

**Forms (score-form.tsx)**:
- `space-y-5` root is correct. `space-y-1.5` fields is correct.
- Actions `flex gap-2 pt-2 pb-4` at :121 — same double-padding issue as contact-form. Remove `pb-4`. **P2**.

**Drawer (score-drawer.tsx)**:
- Width 480px. Fine for 3 fields.

**Empty state (score-manager.tsx:168-175)**:
```
<TableCell colSpan={5} className="text-center text-muted-foreground">
  No scores yet
</TableCell>
```
No vertical padding, no heading, no sub-copy. Scores are a high-use page on event day. Should be `py-12` with a brief instruction. **P2**.

**Loading state**: Uses `window.location.reload()` for post-save refresh (:49). Technically outside design scope but causes visible page flash. Score Manager should use `useRouter().refresh()` instead. Flag for builder follow-up. **Out of scope**.

---

### 8. `/admin/event` — Event Settings

**Page spacing**: `max-w-2xl` constraint at page level is correct.

**Forms (event-settings-form.tsx)**:
- Three `Card` groups: Tournament Details, Dates & Venue, Registration. Card-based sections are a good pattern for a long settings form.
- `space-y-4` inside `CardContent fieldset` — should be `space-y-5` for slightly more breathing room inside cards. **P3**.
- `space-y-2` for label/input pairs — should be `space-y-1.5`. **P2**.
- **Date inputs at :140-165** — native `<input type="date">` renders browser-native date pickers. These are acceptable for an admin-only settings form (not a public-facing form), so no `[No Native Browser UI]` violation here. However, the two date fields sit in a `grid grid-cols-2 gap-4` with no visual connector between "Start" and "End" — consider a dash separator between them. **P3**.
- **Registration Open switch** at :191-200 — `Switch` component correctly used here. Pattern is: label + helper text left, Switch right, `justify-between` — matches the brand's `drawer edit pattern`.
- Registration fee helper text at :222-224: `mt-1 font-sans text-[0.75rem]` — should be `mt-1 text-xs text-muted-foreground` for consistency with other helper text patterns. **P3**.
- Save button at :251: `size="lg"` — oversized relative to the admin's other primary buttons (most use default or `size="sm"`). Replace with `size="default"`. **P2**.

**Section headings**: `CardTitle` inside `CardHeader` renders `font-heading` (from the Card component's default). This is correct for card-level section headings. Consistent throughout.

**Mobile**: `max-w-2xl` + single column cards are fine on mobile.

---

### 9. `/admin/photos` — Photo Moderation

**Page spacing**: `space-y-6` with tab bar + grid. Fine.

**Tab bar (photo-moderation.tsx:87-113)**:
- Active tab uses `border-b-2 border-primary text-foreground`. The pattern is consistent with trash-tabs. However the tab bar div has `border-b border-border` — the active tab's `border-b-2 border-primary` overlaps the bottom border correctly (standard tab underline pattern). Fine.
- Count badges at :100-109 use `rounded-full px-1.5 py-0.5 text-[0.625rem]` — slightly smaller than the `text-[0.6875rem]` used elsewhere. Standardize to `0.6875rem`. **P3**.

**Photo card (photo-moderation.tsx:128-199)**:
- `CardContent className="pt-3"` (:147) — the action buttons at the bottom have `mt-3 flex gap-2` (:162). Combined `pt-3 + mt-3` = 24px from image bottom to button group. Fine.
- Delete button is a ghost icon-only button at `:188-195` — it has no label and no tooltip. Add `title="Delete photo"`. **P2**.
- Uploader info at :153-159 has two separate `<p>` tags both using `font-sans text-[0.75rem] text-muted-foreground` — but `font-sans` is redundant since it's the CSS default for body text. Minor. **P3**.
- Photo caption truncation: `line-clamp-2` at :149 is correct.

**Empty state (photo-moderation.tsx:115-123)**:
- `py-16 flex flex-col items-center gap-2` — Pending tab has helpful sub-copy (:120-123). Good.
- Missing empty state `h3` heading — just uses a bare `<p>`. Should match contact-list empty state pattern with an `h3` at minimum. **P2**.

**Mobile**: `sm:grid-cols-2 lg:grid-cols-3` grid is correct. Cards fill 100% width on mobile.

---

### 10. `/admin/settings` — Invite Form

**Page spacing**: `max-w-2xl` constraint. Single card. Fine.

**Form (invite-form.tsx)**:
- `space-y-4` root form, `space-y-2` label/input — should match admin standard: `space-y-5` / `space-y-1.5`. **P2**.
- `Button size="sm"` for Send Invite (:117) — consistent with other form CTAs. Fine.
- Success banner: `rounded-md bg-success-muted p-3 text-sm text-success border border-success/20` (:83-85) — correct use of tokens.
- Error banner: same pattern. Consistent. Fine.

**Missing**: No member list. `AdminSettingsPage` only renders `InviteForm` with no list of current admin users. If the intent is to eventually show current members, the empty state for that section is not present. **P2 / out of scope for design — feature gap**.

---

### 11. `/admin/trash` — Soft-Delete Recovery

**Page spacing**: Tab bar + table panels. `mb-6` between tab bar and content.

**Tab bar (trash-tabs.tsx:310-332)**:
- `-mb-px` on active tab to overlap container border — correct standard tab implementation.
- Badge style for counts: `rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground` — uses `text-xs` (0.75rem) vs photos tabs' `0.625rem`. Inconsistent across the two tab implementations. **P2**.

**Tables (trash-tabs.tsx)**:
- All 5 tab tables (Contacts, Teams, Sponsors, SponsorshipItems, Photos) have identical structure. Good.
- `formatDeletedAt` at :42-52 — shows "Xm ago", "Xh ago", "Xd ago". No "Unknown" protection for malformed dates is done via the early return on `isNaN`. Fine.
- `truncateUuid` at :54-57 for `deleted_by` column — shows first 8 chars of UUID. Marginally useful. A real admin username would be better, but that's a data/feature concern.
- Empty state (`EmptyState` at :59-65): `py-10 text-center text-sm text-muted-foreground`. No heading, no icon, minimal. Should have `py-12` and a heading "Nothing in Trash". **P3**.

**Mobile**: Tables have no explicit `overflow-x-auto` wrapper. Trash tables have 4 columns including a UUID column and an actions column — they will overflow on mobile. **P2**.

---

## Prioritized Fix List

| Sev | Route | Issue | Proposed Fix | Effort | Shared? |
|---|---|---|---|---|---|
| P0 | `/admin/sponsors` | Raw `<input type="file">` for logo — browser native, unstyled | Replace with `FileUploadField` shared component | M | Yes — reuse in import |
| P1 | `/admin/sponsors` | Native `<select>` for year filter (`sponsor-list.tsx:186`) | Replace with `Select` component | S | No |
| P1 | `/admin/sponsors` | Hardcoded `bg-teal-600` active state (`sponsor-list.tsx:216`) | Replace with `bg-primary text-primary-foreground` | S | No |
| P1 | `/admin/sponsors` | `h-8` SelectTriggers misalign with `h-9`/`h-10` inputs (`sponsor-form.tsx:124,144`) | Remove `h-8` override, use default height | S | No |
| P1 | `/admin/contacts` | Table clips on mobile — `overflow-hidden` instead of `overflow-x-auto` (`contact-list.tsx:554`) | Change to `overflow-x-auto` | S | Yes — check all tables |
| P1 | `/admin/sponsors` | Dense form spacing (`space-y-2`/`space-y-4`) vs admin standard (`space-y-1.5`/`space-y-6`) (`sponsor-form.tsx:96-237`) | Align spacing to admin standard | S | Yes — sponsorship-form, invite-form |
| P2 | `/admin/sponsors` | `accent-teal-600` hardcoded on Active checkbox (`sponsor-form.tsx:187`) | Replace with `accent-brand` | XS | No |
| P2 | `/admin/sponsors` | Raw checkbox for is_active — should be `<Switch>` (`sponsor-form.tsx:180-192`) | Replace with `Switch` component | S | No |
| P2 | `/admin/sponsors` | Logo preview has no frame (`sponsor-form.tsx:215-219`) | Add `rounded-md border border-border/60 bg-neutral-50 p-1` | XS | No |
| P2 | `/admin/contacts` | Contact form action buttons double-padding `pb-4` (`contact-form.tsx:390`) | Remove `pb-4` from actions div | XS | Yes — score-form same issue |
| P2 | `/admin/contacts` | Marketing consent uses raw checkbox, not `<Switch>` (`contact-form.tsx:304-312`) | Replace with `Switch` | S | No |
| P2 | `/admin/contacts` | Salutation takes full 50% column, wastes space (`contact-form.tsx:182-191`) | Constrain to `max-w-[120px]` | S | No |
| P2 | `/admin/contacts/import` | Inline SVG icons in upload step — should use Lucide | Replace `svg` blocks with `UploadCloud`, `FileText`, `X` from lucide-react | S | No |
| P2 | `/admin/contacts/import` | Success CTA uses raw `<a>` with hardcoded classes (`import-client.tsx:404-410`) | Replace with `<Link>` + `buttonVariants()` | XS | No |
| P2 | `/admin/event` | Save button is `size="lg"`, out of place (`event-settings-form.tsx:251`) | Change to `size="default"` | XS | No |
| P2 | `/admin/event` | `space-y-2` for label/input pairs — should be `space-y-1.5` throughout form | Global replace in file | XS | No |
| P2 | `/admin/sponsorships` | Description textarea `rows={2}` too short (`sponsorship-form.tsx:83`) | Change to `rows={3}` | XS | No |
| P2 | `/admin/sponsorships` | `space-y-4`/`space-y-2` form spacing — align to standard | See shared fix note above | S | Yes |
| P2 | `/admin/scores` | CSV import panel uses dashed-border drop affordance with no drag handler | Replace dashed border with plain `Card` container | S | No |
| P2 | `/admin/photos` | Delete button has no accessible label/tooltip (`photo-moderation.tsx:188-195`) | Add `title="Delete photo"` | XS | No |
| P2 | `/admin/photos` | Empty state uses bare `<p>` — no heading | Add `<h3>` heading ("No photos") | XS | Yes — scores, trash |
| P2 | `/admin/trash` | All 5 tables lack `overflow-x-auto` wrapper | Wrap each Table in `overflow-x-auto` div | S | Yes — sponsors table too |
| P3 | All routes | Tab count badge font-size inconsistency (0.75rem vs 0.625rem) | Standardize to `text-[0.6875rem]` | XS | Yes |
| P3 | `/admin` | Page `h1` uses `font-sans` not `font-heading` | Change to `font-heading` in AdminPageHeading | XS | Yes — all admin pages |
| P3 | `/admin/scores` | Empty state in table has no padding | Add `py-12` to the empty-state cell | XS | No |

---

## Out of Scope / Follow-ups

- **`window.location.reload()` in score-manager** — should be `useRouter().refresh()`. Builder concern, not design.
- **Admin member list missing from settings** — feature gap, not design.
- **Full a11y audit** (focus management in drawers, ARIA live regions for bulk actions, color contrast ratios) — separate a11y sprint.
- **Responsive test in simulator** — Watchdog should verify drawer usability at 390px viewport width as part of any PR touching drawers.
- **ContactTypeahead component audit** — the inline create-contact form inside typeaheads (used in team-form and sponsor-form) was not audited for spacing. Recommend a follow-up pass if Scott reports issues with the team-building flow specifically.
- **Fraunces opsz axis** — page heading in AdminPageHeading could use `font-variation-settings: 'opsz' 144` for the large display size. Minor typographic refinement, not a blocking issue.
