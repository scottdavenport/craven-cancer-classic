# Sprint 19 — Admin UI Polish (Comprehensive Pass)

**Sprint goal:** Close every P0/P1/P2/P3 finding from the 2026-04-20 admin design audit across all 11 admin routes. Deliver a shared `FileUploadField` and `AdminEmptyState` component, standardize heading typography to Fraunces, and harden tokens/spacing/overflow throughout.

**Baseline:** `main` at `846a6f4`. 697+ tests passing. tsc clean. No active sprint.

---

## Scope Summary

All 25 findings from `plans/admin-design-audit.md` are in scope.

**Severity breakdown covered:**
- P0 (1): Raw file input on sponsor-form → FileUploadField
- P1 (5): Native select year filter, bg-teal-600 token, h-8 height mismatch, contact table overflow-hidden, sponsor form spacing
- P2 (17): accent-teal-600, is_active checkbox→Switch, logo preview frame, contact form pb-4, marketing consent switch, salutation max-w, import SVG icons, import success CTA, event save button size, event label spacing, sponsorship textarea rows, sponsorship form spacing, score CSV panel dashed border, photo delete title, photo empty state h3, trash table overflow, tab badge font
- P3 (4): AdminPageHeading font-sans→font-heading, score empty state padding, sponsorship loading opacity transition, import summary padding + "Start over" casing, team-form session select width, event date grid P3s

**Scott's 4 locked decisions (verbatim):**
1. File upload UX = click-only (no drag-drop). Styled button, filename chip after select, clear button. Keep it simple.
2. Sponsor logo visibility = thumbnail in BOTH the `/admin/sponsors` list table AND the sponsor edit drawer frame.
3. Admin page headings = switch to Fraunces (`font-heading`) on ALL admin `h1`s via `AdminPageHeading`.
4. Scope = every P0 + P1 + P2 + P3 finding in the audit.

---

## Architecture Notes

### FileUploadField component

**File:** `src/components/ui/file-upload.tsx` (new)

**Props:**
```ts
interface FileUploadFieldProps {
  label: string;
  accept?: string;            // e.g. "image/*", ".csv"
  maxSizeMB?: number;         // client-side size guard, default none
  name?: string;              // for uncontrolled FormData use
  value?: File | null;        // controlled
  onChange: (file: File | null) => void;
  helpText?: string;
  error?: string;
  disabled?: boolean;
}
```

**Visual states:**
1. **Empty:** Styled `<button type="button">` with an upload icon (Lucide `UploadCloud`), label text, and helpText below. Hidden `<input type="file" className="sr-only">` triggered on button click. Click-only — no drag-drop handlers.
2. **File selected:** Filename chip showing truncated name + filetype badge + clear button (`X` icon, `Button variant="ghost" size="icon-sm"`). No re-open on chip click — clear first, then re-select.
3. **Error:** Red border on the trigger button + `<p className="text-xs text-destructive mt-1">` inline error below.

**Implementation note:** The hidden input approach (identical to `import-client.tsx` upload step's existing pattern) keeps the DOM clean and avoids custom drag handlers. A `useRef` on the hidden input + `onClick` on the styled button is the standard pattern.

### AdminEmptyState component

**File:** `src/components/admin/admin-empty-state.tsx` (new)

**Props:**
```ts
interface AdminEmptyStateProps {
  title: string;
  body?: string;
  action?: React.ReactNode;   // CTA button/link, optional
  icon?: React.ElementType;   // Lucide icon, defaults to Inbox
}
```

**Visual spec:** `py-12 flex flex-col items-center gap-3 text-center`. Icon renders at `size-8 text-muted-foreground/50`. Title as `<h3 className="text-sm font-semibold text-foreground">`. Body as `<p className="text-sm text-muted-foreground max-w-[280px]">`. Action rendered below body. Reference: `contact-list.tsx:592-615`.

**Usage sites:** sponsors table, scores table, photos tab, trash tabs (×5), sponsorships packages.

### Fraunces heading swap

`font-heading` is already a live Tailwind v4 token in `@theme inline` (`src/app/globals.css:12`). It resolves to `var(--font-display)` which is Fraunces. No new token or config change needed. The only change is in `src/components/admin/admin-page-heading.tsx:15`: `font-sans` → `font-heading`. All admin pages using `AdminPageHeading` inherit automatically.

### Sponsor drawer width

`src/app/admin/sponsors/sponsor-drawer.tsx` — change `sm:max-w-[480px]` → `sm:max-w-[540px]` on the `SheetContent` className. One line.

### Form spacing standard

Canonical standard (matches contact-form, score-form, team-form):
- Label → input gap: `space-y-1.5`
- Field → field gap: `space-y-4`
- Section → section gap: `space-y-6`

Files to align: `sponsor-form.tsx`, `sponsorship-form.tsx`, `invite-form.tsx`, `event-settings-form.tsx`.

---

## PR Breakdown

---

### PR A — Shared Infrastructure

**Runs first.** PR B and PR C import from PR A's new components. See Execution Order below.

**Files changed:**

| File | Status |
|---|---|
| `src/components/ui/file-upload.tsx` | NEW |
| `src/components/admin/admin-empty-state.tsx` | NEW |
| `src/components/admin/admin-page-heading.tsx` | MODIFIED |
| `tests/components/file-upload.test.tsx` | NEW (Spec RED) |
| `tests/components/admin-empty-state.test.tsx` | NEW (Spec RED) |

**Acceptance criteria:**

- [ ] `FileUploadField` renders a styled click-trigger button with `UploadCloud` icon and label text
- [ ] Clicking the trigger opens the native file picker (hidden `<input type="file">`)
- [ ] After file selection: filename chip visible with truncated name, filetype badge, and `X` clear button; trigger button hidden
- [ ] Clicking `X` clears the file, restores the trigger button
- [ ] `accept` prop is forwarded to the hidden input (verify `.csv` files only accepted on a `.accept=".csv"` instance)
- [ ] `error` prop renders red border on trigger + destructive text below
- [ ] `helpText` renders below the trigger as `text-xs text-muted-foreground`
- [ ] No drag-drop handlers present (grep confirms no `onDrop`, `onDragOver`, `onDragEnter`)
- [ ] `AdminEmptyState` with only `title` renders centered heading + default `Inbox` icon
- [ ] `AdminEmptyState` with `body` and `action` renders all three elements in vertical stack
- [ ] Custom `icon` prop replaces default Inbox icon
- [ ] `AdminPageHeading` `h1` now uses `font-heading` class (renders in Fraunces in browser)
- [ ] `AdminPageHeading` subtitle `<p>` remains `font-sans`
- [ ] All existing `AdminPageHeading` usage sites (dashboard, contacts, teams, sponsors, sponsorships, scores, event, photos, settings, trash) display Fraunces heading — spot-check 3 routes in browser

**What NOT to do:**
- Do not add drag-drop to FileUploadField — click-only per Scott's decision
- Do not change the `description` prop on AdminPageHeading or its subtitle behavior
- Do not touch any route-level files in this PR — only the 3 component files

**Test surface (Spec RED candidates):**
- `FileUploadField`: renders empty state, file-selected state, clears on X click, calls onChange with File object, calls onChange(null) on clear, error state renders, helpText renders
- `AdminEmptyState`: renders title, renders with body, renders with action, renders custom icon, renders default icon when none provided

---

### PR B — Sponsor Focus

**Depends on PR A.** Rebase onto PR A after it merges.

**Files changed:**

| File | Status |
|---|---|
| `src/app/admin/sponsors/sponsor-form.tsx` | MODIFIED |
| `src/app/admin/sponsors/sponsor-list.tsx` | MODIFIED |
| `src/app/admin/sponsors/sponsor-drawer.tsx` | MODIFIED |

**Acceptance criteria:**

- [ ] P0: Logo field uses `FileUploadField` — no native `<input type="file">` visible; styled upload button renders; filename chip appears after file select; clear button works
- [ ] P1: Year filter is a `Select` component (base-ui), not `<select>` — no native browser dropdown chrome on year filter
- [ ] P1: Year filter `Select.Root` has `items` prop mapping years to display labels (e.g. `{ "2024": "2024", "2025": "2025" }`) — per `feedback_base_ui_select_items`
- [ ] P1: Status filter active state uses `bg-primary text-primary-foreground` (no hardcoded `bg-teal-600`)
- [ ] P1: SelectTriggers for Tier and Payment Status have no `h-8` height override — inputs align with adjacent text inputs
- [ ] P1: Form spacing is `space-y-1.5` (label/input) / `space-y-4` (field/field) / `space-y-6` (section/section)
- [ ] P2: `is_active` uses `<Switch>` component, not raw checkbox with `role="switch"`
- [ ] P2: `accent-teal-600` removed; active/checked states use `accent-brand`
- [ ] P2: Logo preview has frame: `rounded-md border border-border/60 bg-neutral-50 p-1`
- [ ] P2: Submit/cancel buttons use default size (not `size="sm"`)
- [ ] P2: Contacts field has helper text explaining what linking contacts does
- [ ] Sponsor drawer width is `sm:max-w-[540px]`
- [ ] Logo thumbnail column visible in sponsor list table (shows `<img>` with `w-8 h-8 object-contain rounded` or similar; null logo shows placeholder)
- [ ] Null/broken logo in list table renders gracefully — no broken img icon, placeholder fills the cell
- [ ] `AdminEmptyState` from PR A replaces the bare "No sponsors yet" text in the table
- [ ] Existing sponsor form submit/edit/delete flows work end-to-end (Watchdog verifies in browser)
- [ ] `items` prop on Tier and Payment Status `Select.Root` maps values to labels correctly

**What NOT to do:**
- Do not touch `team-drawer.tsx`, `contact-form.tsx`, or any file outside the `/admin/sponsors/` folder
- Do not add drag-drop to the FileUploadField usage here
- Do not change the ContactTypeaheadMulti component internals — only the wrapper label/helper text

**Test surface:**
- Existing sponsor form tests: verify they still pass after spacing + Switch refactor
- New: logo thumbnail renders in list when logo_url present; renders placeholder when null
- New: year filter Select renders correct year options

---

### PR C — Cross-Cutting Polish

**Depends on PR A.** Can be written in parallel with PR B, rebased onto PR A after it merges. Has zero file overlap with PR B.

**Files changed:**

| File | Status |
|---|---|
| `src/app/admin/contacts/contact-list.tsx` | MODIFIED |
| `src/app/admin/contacts/contact-form.tsx` | MODIFIED |
| `src/app/admin/contacts/import/import-client.tsx` | MODIFIED |
| `src/app/admin/sponsorships/sponsorship-form.tsx` | MODIFIED |
| `src/app/admin/sponsorships/sponsorship-manager.tsx` | MODIFIED |
| `src/app/admin/scores/score-form.tsx` | MODIFIED |
| `src/app/admin/scores/score-manager.tsx` | MODIFIED |
| `src/app/admin/event/event-settings-form.tsx` | MODIFIED |
| `src/app/admin/settings/invite-form.tsx` | MODIFIED |
| `src/app/admin/photos/photo-moderation.tsx` | MODIFIED |
| `src/app/admin/trash/trash-tabs.tsx` | MODIFIED |

**Acceptance criteria:**

_Contacts:_
- [ ] P1: `contact-list.tsx` table wrapper changed `overflow-hidden` → `overflow-x-auto` — table scrolls horizontally on narrow viewports instead of clipping
- [ ] P2: `contact-form.tsx` actions div — `pb-4` removed; no doubled bottom gap in drawer
- [ ] P2: Marketing consent uses `<Switch>` component, not raw `<input type="checkbox">`
- [ ] P2: Salutation field constrained to `max-w-[120px]` — no longer occupies full 50% column

_Import:_
- [ ] P2: Upload step inline SVGs replaced with Lucide `UploadCloud` (upload icon), `FileText` (file-selected icon), and `X` (remove button via `Button variant="ghost" size="icon-sm"`)
- [ ] P2: Success step "View contacts" CTA uses `<Link>` from `next/link` + `buttonVariants({ variant: "default" })` — no raw `<a>` with hardcoded classes

_Sponsorships:_
- [ ] P2: `sponsorship-form.tsx` spacing aligned to standard (`space-y-1.5` / `space-y-4` / `space-y-6`)
- [ ] P2: Description textarea uses `rows={3}`
- [ ] P2: Max Quantity label is "Max Quantity" with helper text "Leave blank for unlimited" below input
- [ ] P2: `sponsorship-manager.tsx` — `AdminEmptyState` from PR A replaces bare "No sponsorship packages yet" text

_Scores:_
- [ ] P2: `score-form.tsx` actions div — `pb-4` removed
- [ ] P2: `score-manager.tsx` CSV panel — dashed border removed; panel wrapped in `<Card>` component
- [ ] P2: Score table uses `AdminEmptyState` from PR A (replaces bare "No scores yet" cell)

_Event settings:_
- [ ] P2: Save button `size="lg"` → `size="default"`
- [ ] P2: Label/input spacing `space-y-2` → `space-y-1.5` throughout form
- [ ] P3: Date helper text uses `text-xs text-muted-foreground` (not `font-sans text-[0.75rem]`)

_Settings/Invite:_
- [ ] P2: `invite-form.tsx` spacing aligned to standard (`space-y-5` / `space-y-1.5`)

_Photos:_
- [ ] P2: Delete button has `title="Delete photo"` attribute
- [ ] P2: Empty state bare `<p>` gets an `<h3>` heading ("No photos pending")
- [ ] P2: `AdminEmptyState` from PR A applied to pending/approved/rejected tabs where appropriate

_Trash:_
- [ ] P2: All 5 tab tables wrapped in `overflow-x-auto` div — tables scroll on mobile instead of clipping
- [ ] P3: Tab badge font-size standardized to `text-[0.6875rem]` across trash-tabs (was `text-xs` = 0.75rem)
- [ ] P3: Empty state in each tab panel gets heading "Nothing in trash" (or per-type equivalent), `py-12` padding

**What NOT to do:**
- Do not touch any file in `src/app/admin/sponsors/` — that's PR B territory
- Do not touch `team-drawer.tsx`, `team-form.tsx`, `team-list.tsx` — teams out of scope
- Do not rewrite the import drop-zone drag-drop logic — only replace inline SVGs with Lucide icons; the hidden-input / click trigger pattern stays as-is
- Do not add an admin member list to `/admin/settings` — feature gap, out of scope
- Do not touch `contact-typeahead.tsx` internals

**Test surface:**
- Existing contact-form, score-form, sponsorship-form tests: run suite before/after; no regressions
- New: overflow-x-auto — visual verification in browser at 390px viewport (Watchdog)

---

## Execution Order

**Recommendation: Serial A → parallel (B + C).**

Rationale: PR A creates `FileUploadField` and `AdminEmptyState` — both used in B and C. If B and C start before A merges, they must import from files that don't exist yet, causing tsc errors. The rebase cost (one rebase each onto A) is minimal since A touches only 3 component files with zero overlap with B or C. Writing B and C in parallel while A is in review is fine — builders stub the imports and rebase the moment A merges.

**Do not** run all three fully parallel with manual import stubs that get rebased later — the risk of PR A changing late (e.g., prop name change in FileUploadField) means B and C both need fixups.

```
Phase 1: PR A (Shared Infrastructure) — all builders can begin drafting B/C
  └── PR A merges
Phase 2 (parallel): PR B (Sponsor Focus) + PR C (Cross-Cutting Polish)
  └── Both rebase onto PR A before pushing
Phase 3: Watchdog reviews B and C (can review simultaneously)
Phase 4: Merge B, then merge C (or C then B — no overlap)
```

**Estimated builder time:**
- PR A: 3-4h (2 new components + tests)
- PR B: 3-4h (sponsor route, ~7 changes, 1 new column)
- PR C: 4-5h (11 files, mostly small edits)
- Watchdog review: 1-2h per PR (3 PRs = 3-6h)
- Total: ~13-19h across parallel threads

---

## Test Plan

### New component tests (Spec writes RED, builders make green)

**`FileUploadField` — `tests/components/file-upload.test.tsx`:**
- Renders label and upload trigger button
- Hidden input has correct `accept` attribute
- Clicking trigger fires click on hidden input (use `fireEvent.click`)
- After `onChange` fires with File: chip renders with filename, clear button visible, trigger hidden
- Clicking clear button: calls `onChange(null)`, chip hidden, trigger restored
- `error` prop: red border class present on trigger, error text rendered
- `helpText` prop: help text rendered below trigger
- No `onDrop` / `onDragOver` handler on any element (grep assertion or DOM check)
- **Long filename test:** use `fireEvent.change` not `userEvent.type` for any long-string assertions (per `feedback_no_user_type_long_strings`)

**`AdminEmptyState` — `tests/components/admin-empty-state.test.tsx`:**
- Renders title text
- Renders body when provided, absent when not
- Renders action when provided
- Default icon (`Inbox`) renders when no icon prop
- Custom icon renders when provided
- Use `data-testid` if disambiguation needed — never reshape markup to defeat test matcher (per `feedback_prefer_data_testid_over_ui_hacks`)

### Regression tests to preserve

- **Sponsor form Select `items` prop:** The existing `sponsor-form.tsx` Tier and Payment Status selects already use `items` prop (verified at `:117`). PR B must not remove these. Year filter replacement in `sponsor-list.tsx` MUST also include `items` prop — this is the most likely new failure point.
- **`requireAdmin` on server actions:** No new server actions are expected in this sprint (it's a UI-only polish pass). If any file in `src/app/admin/**/actions.ts` is touched, verify `requireAdmin()` is the first call. Per `feedback_admin_action_require_admin`.
- **score-manager `window.location.reload` stays as-is this sprint** — flagged in audit as out-of-scope behavioral. Filed as follow-up issue post-merge.

### Visual regression (manual, Watchdog spot-check post-merge per route)

After each PR merges to main, Watchdog opens the app in browser at 390px and 1280px and checks:

**After PR A:**
- [ ] All admin `h1` headings render in Fraunces (visually distinct from body text)

**After PR B:**
- [ ] `/admin/sponsors` list — logo thumbnail column visible, null logo shows placeholder
- [ ] `/admin/sponsors` new sponsor — FileUploadField renders styled button, file chip appears on select
- [ ] `/admin/sponsors` edit sponsor — logo preview shows framed image, 540px drawer doesn't clip content
- [ ] Year filter — base-ui Select dropdown, no native browser chrome
- [ ] Status filter — teal token, not hardcoded class

**After PR C:**
- [ ] `/admin/contacts` — table scrolls horizontally at 390px viewport
- [ ] `/admin/trash` — all 5 tab tables scroll horizontally at 390px viewport
- [ ] `/admin/contacts/import` — Lucide icons render in upload step; "View contacts" CTA is styled button
- [ ] `/admin/scores` — CSV panel is plain Card, no dashed border
- [ ] `/admin/event` — Save button is default size; label/input spacing is looser
- [ ] `/admin/photos` — delete button has tooltip; empty state has heading

---

## Known Gotchas

1. **`feedback_base_ui_select_items`**: The year filter `Select.Root` in `sponsor-list.tsx` MUST receive an `items` prop (e.g. `{ "2024": "2024", "2025": "2025" }`). Without it, `Select.Value` renders `String(value)` which works but breaks if year values are programmatic. The existing Tier and Payment Status selects in `sponsor-form.tsx` already pass `items` — match that pattern exactly.

2. **`feedback_admin_action_require_admin`**: This sprint is UI-only. If a builder touches any `actions.ts` file for any reason, `requireAdmin()` must be the first line of every exported server action in that file. Do not skip this check even for trivial changes.

3. **`feedback_prefer_data_testid_over_ui_hacks`**: If test matchers collide on FileUploadField or AdminEmptyState (e.g., two elements with "No sponsors" text), add `data-testid` to disambiguate. Do not rewrite copy, add sr-only ghosts, or restructure DOM to defeat a matcher.

4. **`feedback_no_user_type_long_strings`**: Any test asserting on a filename string longer than ~50 chars must use `fireEvent.change`, not `userEvent.type`. Filenames can be long.

5. **`feedback_vercel_dep_risk`**: No new npm dependencies are expected this sprint. If a builder pulls in any package (even transitively via a new import), verify it builds on Vercel preview before merge. Do not assume local build = Vercel build.

6. **Sponsor logo thumbnail — null/broken image handling**: The logo column in the sponsor list must handle three states: (a) `logo_url` is null → show neutral placeholder div or initials, (b) `logo_url` is set but image 404s → `onError` handler swaps to placeholder, (c) image is oversized → `object-contain` + fixed `w-8 h-8` cell constrains it. Builder must handle all three. Use `lazy` loading attribute on the `<img>`.

7. **`AdminEmptyState` in trash tabs**: Trash has 5 tab panels, each with a near-identical empty state. The builder should map over the same `AdminEmptyState` component — do not copy-paste the JSX 5 times.

---

## GitHub Issue — Sprint 19

**Title:** `[Sprint 19] Admin UI Polish — Comprehensive Design Audit Pass`

**Body:**

```
## Goal
Close every P0/P1/P2/P3 finding from the 2026-04-20 admin design audit. 25 findings across 11 admin routes.

## Plan
`plans/sprint-19-admin-polish.md` — read before building.

## Scope decisions (locked)
- File upload UX: click-only styled button + filename chip (no drag-drop)
- Sponsor logo: thumbnail in list table + framed preview in drawer
- Admin headings: Fraunces via `font-heading` on all `h1`s
- All P0/P1/P2/P3 findings in scope

## PRs (3 parallel after PR A ships)
- **PR A — Shared Infrastructure:** FileUploadField, AdminEmptyState, AdminPageHeading font swap
- **PR B — Sponsor Focus:** sponsor-form, sponsor-list, sponsor-drawer (uses PR A components)
- **PR C — Cross-Cutting Polish:** contacts, import, sponsorships, scores, event, settings, photos, trash

## Acceptance
- [ ] All 25 audit findings resolved
- [ ] No native `<select>` or unstyled `<input type="file">` in any admin route
- [ ] All admin `h1`s render in Fraunces
- [ ] All admin tables have overflow-x-auto on mobile
- [ ] Admin forms use standard spacing (space-y-1.5 / space-y-4 / space-y-6)
- [ ] bg-teal-600 / accent-teal-600 hardcoded classes gone — tokens only
- [ ] Test suite ≥ 697 + ~12-15 new tests passing, zero failing
- [ ] tsc clean, build passes
- [ ] Watchdog visual spot-check on all 11 routes at 390px and 1280px
```
