# Sprint 16 — Sidebar Branding + Dashboard Redesign (#157, #158, #159, #160, #162, #164)

Six P2/P3 issues covering sidebar structure, sidebar branding, and dashboard data + clickability. Bundled into two PRs with fully disjoint file surfaces.

Main HEAD at plan time: `81a94a4`

---

## Decisions locked (Forge + Scott, 2026-04-20)

1. **Logo mark extraction — Bolt first.** The full SVG has 6 paths: 4 emblem (3 teal swoops `#9fbfc7` / `#05a5c0` / `#5797a6` + center "C" with golf-ball detail) + 2 wordmark. No gradients, no clipping masks, no cross-path refs. Mechanical extraction: drop paths 5-6, crop viewBox from `0 0 2637 942` to approximately `0 0 942 942` (square, covers the emblem). If visual QA fails at 16px (favicon) or 32px, escalate to Pixel as a follow-up pass — do not block PR A merge on visual tuning.

2. **Revenue card display format — `$12,345`** (dollars rounded, thousands separator, no cents). `amount_paid_cents` summed from `sponsors_active`, divided by 100, formatted as `toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })`. Spec asserts this exact format.

3. **Bottom `LinkButton` shortcuts removed in PR B.** The existing `Manage Registrations` / `Upload Scores` buttons below the stat grid are superseded by clickable cards. Remove them cleanly.

4. **Teams and Registrations are the same concept** (S11 rename). Do NOT add both cards. The existing Registrations card stays (now with real count from `teams_active` filtered by current year); #164's "Teams card" is not added as a duplicate.

5. **Current-year filter on teams count** — `teams.year` column exists and is indexed (confirmed via migration grep). Apply `eq("year", currentYear)`.

6. **Favicon swap — Bolt picks between `src/app/icon.svg` (static) or `src/app/icon.tsx` (dynamic route)** based on what the Next.js App Router setup uses elsewhere. Prefer static `icon.svg` unless there's a reason to generate dynamically.

---

## Issues in scope

| # | Title | Priority | Size |
|---|---|---|---|
| #157 | Real CCC logo in admin sidebar + wordmark-free mark variant | P2 | S |
| #158 | Dashboard — make stat cards clickable (navigate to page) | P2 | S |
| #159 | Dashboard — add Contacts count card | P2 | S |
| #160 | Sidebar — add logical grouping with section headers | P2 | S |
| #162 | Rename sidebar 'Contacts & Email' → 'Contacts' | P3 | S |
| #164 | Dashboard — expand to comprehensive overview (Teams, Contacts, Scores cards) | P2 | M |

---

## Post-S15 file map (verified)

### Admin sidebar — `src/components/admin/admin-sidebar.tsx` (110 lines)
- Single `SidebarGroup` with label "Management" containing all 10 menu items as a flat list.
- Header: `<Link>` wrapping `<span>CCC</span><span>Admin</span>` — text only, no logo.
- `pathname.startsWith(item.href + "/")` active-link logic — covered by existing test.
- Current menu items: Dashboard, Event, Sponsors, Registrations, Sponsorships, Photos, Scores, "Contacts & Email", Settings, Trash.
- Sidebar primitives (`SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuItem`) already support multiple groups — the current menu just doesn't use them.

### Admin dashboard — `src/app/admin/page.tsx` (91 lines)
- Four `Card` components rendering literal `0` / `$0` values. Zero data fetching. No server actions. No queries.
- Existing cards: Registrations (Users icon), Sponsors (Award icon), Revenue (DollarSign icon), Pending Photos (Camera icon).
- Grid: `grid gap-4 sm:grid-cols-2 lg:grid-cols-4`.
- Below grid: two `LinkButton` shortcuts to teams + scores.

### Logo assets
- `public/brand/ccc-logo-full.svg` — exists.
- `public/brand/ccc-logo-mark.svg` — does NOT exist. Must be created by extracting the first 4 paths (3 teal arc swoops + center emblem) from the full logo and cropping the viewBox to remove the wordmark.
- `public/logo.png` — legacy, do not touch.
- `src/app/favicon.ico` — exists as a static file. #157 calls for favicon update using the mark variant.

### Database views confirmed in migrations
- `sponsors_active` — exists (soft-delete foundation migration).
- `teams_active` — exists (soft-delete foundation + teams_captain_columns migration).
- `contacts_active` — exists (soft-delete foundation migration, `WHERE deleted_at IS NULL`).
- No `scores_active` view — scores table has no `deleted_at` column. Dashboard action queries `scores` directly, filtered by year.

### Revenue field
- `sponsors.amount_paid_cents` (integer) — use `SUM(amount_paid_cents)` from `sponsors_active` for revenue aggregate.
- Photos pending: `photos.status = 'pending'`.

### Existing tests
- `src/__tests__/admin-sidebar-active-link.test.tsx` — covers active-link logic. Must stay green after grouping restructure.

---

## PR bundling — two disjoint file surfaces

### PR A — Sidebar branding + structure
**Closes:** `#157`, `#160`, `#162`

**Branch:** `s16-a-sidebar-branding-structure`

**Files:**
- `src/components/admin/admin-sidebar.tsx` — restructure flat list into 5 named groups; swap text header for logo; rename "Contacts & Email" → "Contacts".
- `public/brand/ccc-logo-mark.svg` — NEW file, mark-only variant extracted from full logo.
- `src/__tests__/admin-sidebar-active-link.test.tsx` — existing tests; may need fixture updates for new group structure (no structural change to test, only fixture data reflecting new groups).
- `src/__tests__/admin-sidebar-grouping.test.tsx` — NEW file.

**Proposed menu groups (from #160):**
```
Overview
  Dashboard

People
  Contacts
  Registrations

Revenue
  Sponsors
  Sponsorships

Event Day
  Photos
  Scores

Setup
  Event
  Settings
  Trash
```

**Acceptance criteria:**
- [ ] Sidebar renders 5 `SidebarGroupLabel` headings: Overview, People, Revenue, Event Day, Setup.
- [ ] Each menu item appears under its correct group.
- [ ] Visual spacing between groups matches existing "Management" header pattern.
- [ ] Sidebar header shows real CCC logo (full SVG on desktop, mark on mobile/collapsed) — not text.
- [ ] `public/brand/ccc-logo-mark.svg` exists and renders cleanly at 32px, 64px, and 256px.
- [ ] Favicon updated to use the mark variant.
- [ ] Active-link logic unchanged: Dashboard active only when `pathname === "/admin"`; all others active when `pathname === item.href || pathname.startsWith(item.href + "/")`.
- [ ] Menu item previously labeled "Contacts & Email" now labeled "Contacts".
- [ ] Groups use appropriate accessible markup (`aria-label` or semantically correct section headers).
- [ ] All existing `admin-sidebar-active-link` tests pass green.

**Logo mark extraction note (ambiguity):**
Bolt attempts the `ccc-logo-mark.svg` extraction first pass by reading `public/brand/ccc-logo-full.svg` and isolating the first 4 paths (3 teal swoops + center emblem), then adjusting the viewBox to crop the wordmark area. If visual QA on staging shows the mark looks wrong at small sizes, Pixel does a targeted fixup pass before merge. Do not hold PR A for Pixel review unless the mark is visually broken.

**Favicon approach:**
`src/app/favicon.ico` is a static ICO file. To use the mark as favicon: add a `src/app/icon.svg` file (Next.js App Router serves it automatically as `/favicon.ico` alternative and `<link rel="icon">`). Do NOT delete the existing `favicon.ico` — add `icon.svg` alongside it. Next.js will prefer `icon.svg` for modern browsers.

---

### PR B — Dashboard data + clickable cards + expanded layout
**Closes:** `#158`, `#159`, `#164`

**Branch:** `s16-b-dashboard-data-clickable`

**Files:**
- `src/app/admin/page.tsx` — convert to async server component; fetch real counts via `getDashboardStats()`; add Contacts + Scores cards; wrap every card in `<Link>`; hover/focus affordance; remove bottom `LinkButton` shortcuts (superseded by clickable cards).
- `src/app/admin/dashboard-actions.ts` — NEW file. Exports `getDashboardStats()`. No existing `src/app/admin/actions.ts` file exists at the admin root — create as `dashboard-actions.ts` to avoid ambiguity with per-section actions files.
- `src/__tests__/admin-dashboard.test.tsx` — NEW file.
- `src/__tests__/admin-dashboard-actions.test.ts` — NEW file.

**Acceptance criteria:**
- [ ] Dashboard renders 6 cards: Registrations, Sponsors, Revenue, Pending Photos, Contacts, Scores.
- [ ] All stat cards show real data (not hardcoded `0`).
- [ ] Registrations card shows count from `teams_active` filtered by current year.
- [ ] Sponsors card shows count from `sponsors_active`.
- [ ] Revenue card shows sum of `amount_paid_cents` from `sponsors_active`, formatted as dollars (e.g. `$12,345`).
- [ ] Pending Photos card shows count from `photos` where `status = 'pending'`.
- [ ] Contacts card shows count from `contacts_active`.
- [ ] Scores card shows count from `scores` (no soft-delete; scores table has no `deleted_at`).
- [ ] Each card wraps in `<Link href="...">` pointing to its admin page (not `onClick` on div).
  - Registrations → `/admin/teams`
  - Sponsors → `/admin/sponsors`
  - Revenue → `/admin/sponsorships`
  - Pending Photos → `/admin/photos`
  - Contacts → `/admin/contacts`
  - Scores → `/admin/scores`
- [ ] Cards have a hover state (subtle lift or border color shift) indicating clickability.
- [ ] Cards are keyboard accessible: focusable, focus ring visible, Enter activates navigation.
- [ ] Teams card from #164 is NOT added separately — Registrations card already covers the same data (teams and registrations are the same entity post-S11). See "Consolidation note" below.
- [ ] 6-card grid layout works on desktop (1280px) without looking cramped. Grid decision is Bolt's call; fallback: if 6-across looks cramped at 1280px, use `sm:grid-cols-2 lg:grid-cols-3` (2×3). Ping Pixel only if visual QA flags it.

**Consolidation note (#164):**
Issue #164 mentions "Teams — equivalent to Registrations — consolidate if duplicate." Decision: do NOT add a separate Teams card. The existing Registrations card maps to `/admin/teams` and counts from `teams_active`. These are the same thing. Adding a second card would confuse admins.

**getDashboardStats() spec:**
```typescript
// src/app/admin/dashboard-actions.ts
export async function getDashboardStats(): Promise<{
  registrations: number;
  sponsors: number;
  revenue_cents: number;
  pending_photos: number;
  contacts: number;
  scores: number;
}>;
```

Use parallel queries (`Promise.all`) — do not chain awaits. Follow the pattern in `src/app/admin/sponsorships/actions.ts` (`getSponsorshipItems`) for parallel Supabase queries.

**Schema preflight — views used by getDashboardStats:**
| View / Table | Filter | Confirmed |
|---|---|---|
| `teams_active` | year = current year | View exists (migrations confirmed) |
| `sponsors_active` | none (all active sponsors) | View exists |
| `sponsors_active` | SUM(amount_paid_cents) for revenue | Column confirmed (`amount_paid_cents`) |
| `photos` | status = 'pending' | Column confirmed (initial schema) |
| `contacts_active` | none | View exists (soft_delete_foundation migration) |
| `scores` | year = current year | No deleted_at column; direct table query |

No new migrations needed. All views exist. `contacts_active` is resolved — it exists.

---

## Parallelism & merge order

| Phase | PR A | PR B |
|---|---|---|
| Spec RED | parallel | parallel |
| Bolt GREEN | parallel | parallel |
| Watchdog review | parallel | parallel |
| Merge | any order | any order |

File surfaces are fully disjoint:
- PR A touches: `admin-sidebar.tsx`, `public/brand/ccc-logo-mark.svg`, `src/app/icon.svg`, `src/__tests__/admin-sidebar-*.test.tsx`
- PR B touches: `src/app/admin/page.tsx`, `src/app/admin/dashboard-actions.ts`, `src/__tests__/admin-dashboard*.test.{tsx,ts}`

Zero file overlap. Merge in any order. No rebase cycles expected.

---

## TDD expectations — Spec writes RED first

Spec writes failing tests from the acceptance criteria below before any builder writes implementation code. Builders receive the test files and make them pass. Builders do not modify test files.

### PR A test cases — `src/__tests__/admin-sidebar-grouping.test.tsx` (NEW)

- Renders 5 group labels: "Overview", "People", "Revenue", "Event Day", "Setup".
- "Dashboard" appears under the "Overview" group label, not standalone.
- "Contacts" appears under the "People" group label.
- "Registrations" appears under the "People" group label.
- "Sponsors" appears under the "Revenue" group label.
- "Sponsorships" appears under the "Revenue" group label.
- "Photos" appears under the "Event Day" group label.
- "Scores" appears under the "Event Day" group label.
- "Event", "Settings", "Trash" appear under the "Setup" group label.
- The label "Contacts & Email" does NOT appear anywhere in the rendered output.
- The label "Management" does NOT appear anywhere in the rendered output (old single group removed).
- The label "Contacts" (exact, without "& Email") appears exactly once.

`src/__tests__/admin-sidebar-active-link.test.tsx` (EXISTING — update fixtures if needed):
- All existing active-link assertions must pass with the new multi-group structure.
- Spec audits this file and updates fixture group structure if the tests reference the old flat `menuItems` shape. Pure fixture update — no assertion structure changes.

### PR B test cases — `src/__tests__/admin-dashboard.test.tsx` (NEW)

- Renders 6 cards: Registrations, Sponsors, Revenue, Pending Photos, Contacts, Scores.
- Registrations card value matches the mocked return from `getDashboardStats().registrations`.
- Sponsors card value matches `getDashboardStats().sponsors`.
- Revenue card shows dollar-formatted string matching `getDashboardStats().revenue_cents` (e.g., `12345` → `$123.45` or `$12,345` — pick a format and assert it exactly).
- Pending Photos card value matches `getDashboardStats().pending_photos`.
- Contacts card value matches `getDashboardStats().contacts`.
- Scores card value matches `getDashboardStats().scores`.
- Each card contains an `<a>` element (or Next.js `<Link>`) with the correct `href`.
  - Registrations card → `href="/admin/teams"`.
  - Sponsors card → `href="/admin/sponsors"`.
  - Revenue card → `href="/admin/sponsorships"`.
  - Pending Photos card → `href="/admin/photos"`.
  - Contacts card → `href="/admin/contacts"`.
  - Scores card → `href="/admin/scores"`.
- No card renders a hardcoded `0` as its value (regression guard).
- Teams card does NOT appear (consolidation — Registrations covers it).

### PR B test cases — `src/__tests__/admin-dashboard-actions.test.ts` (NEW)

- `getDashboardStats()` returns an object with keys: `registrations`, `sponsors`, `revenue_cents`, `pending_photos`, `contacts`, `scores`.
- `registrations` is the COUNT from `teams_active` (mock Supabase client, assert correct table + filter).
- `sponsors` is the COUNT from `sponsors_active`.
- `revenue_cents` is the SUM of `amount_paid_cents` from `sponsors_active`.
- `pending_photos` is the COUNT from `photos` where `status = 'pending'`.
- `contacts` is the COUNT from `contacts_active`.
- `scores` is the COUNT from `scores`.
- All 6 queries are issued in parallel (mock verifies all 6 Supabase calls are initiated before any await resolves — use Promise.all pattern assertion or check call order).
- If Supabase returns an error on any sub-query, `getDashboardStats()` throws or returns a safe fallback (0 for that field) — assert which behavior and be consistent.

---

## Retro carryovers from S15

### Select `items` prop regression guard
The `items={...}` pattern on `<Select.Root>` (base-ui) must be present for value→label resolution. Neither PR A nor PR B is expected to touch any `<Select>` component. But Watchdog must grep for `<Select` in any changed file and verify `items={` is present on every `Select.Root`. If either PR accidentally removes or modifies a Select, this is a P0 regression.

### One `Closes #N` per line in PR body
GitHub's comma-separated close syntax is unreliable. Use one `Closes #N` per line:
```
Closes #157
Closes #160
Closes #162
```
Not: `Closes #157, #160, #162`.

### `noValidate` rule
If any builder adds `noValidate` to a form element, they must replace every removed browser constraint with equivalent app-level validation. Neither PR A nor PR B touches forms, so this is a caution not an active concern.

---

## Schema preflight checklist

Run before spawning builders. Verify these columns and views exist in migrations.

| Item | Check | Status |
|---|---|---|
| `teams_active` view | `grep "CREATE.*VIEW.*teams_active"` in migrations | Confirmed |
| `sponsors_active` view | `grep "CREATE.*VIEW.*sponsors_active"` in migrations | Confirmed |
| `contacts_active` view | `grep "CREATE.*VIEW.*contacts_active"` in migrations | Confirmed |
| `sponsors.amount_paid_cents` column | `grep "amount_paid_cents"` in migrations | Confirmed |
| `photos.status` column with 'pending' value | `grep "status.*pending.*approved"` in initial schema | Confirmed |
| `scores` table (no soft-delete) | `grep "CREATE TABLE.*scores"` + no `deleted_at` | Confirmed |
| `scores.year` column | exists (initial schema) | Confirmed |
| `teams_active.year` column | teams has `year` field for filter | Verify before PR B spawn |

No new migrations required for Sprint 16.

---

## Out of scope

- Email compose UI — #162 removes "& Email" from the label only. No email functionality was ever wired. The label change signals intent; implementation is a future sprint.
- Social meta tag images using the mark variant (#157 mentions this) — favicon update is in scope, social OG images are not.
- Mobile/collapsed sidebar logo behavior beyond "use the mark variant" — responsive sidebar collapse behavior is an existing shadcn/ui concern; Bolt uses the mark where it fits.
- Dashboard tab layout — if 6 cards look cramped, switch grid columns. Do not add tabs or pagination.
- Click-through filtering — clicking the Revenue card goes to `/admin/sponsorships`, it does NOT pre-filter to a specific payment status.
- Real-time dashboard (polling, websockets) — static server-side fetch on page load is sufficient.
- Drag-and-drop or interactive dashboard rearrangement.
- Dashboard date range pickers — counts are current year, no date selection UI.
- Any Contacts card count scoped to "unlinked" or "linked" — just total active contacts count.

---

## Verification steps (end of sprint)

1. `npx tsc --noEmit` on main — zero type errors.
2. `npm test` — all tests green. Test count expected to rise from ~current baseline by new test files in PR A + PR B.
3. Manually visit `/admin` on staging — verify 6 cards, all show real numbers (not `0`), all cards clickable.
4. Verify hover state on cards is visible (cursor changes, border/shadow shifts).
5. Verify keyboard navigation: Tab to each card, press Enter, confirm navigation.
6. Verify sidebar on staging — 5 group headers render, all items in correct groups, logo appears in header, "Contacts" (not "Contacts & Email") label shown.
7. Verify `public/brand/ccc-logo-mark.svg` loads at `/brand/ccc-logo-mark.svg` — view in browser at 32px, 64px, and 256px.
8. Verify favicon uses mark variant — check browser tab icon.
9. Check Vercel preview deploys for both PR branches before merge.
10. After merge: `gh run list --workflow deploy.yml --limit 1` — verify staging deploy passes.
11. After staging verification: trigger production deploy via `gh workflow run deploy-production.yml --ref main`.

---

## Post-sprint retro template

Fill during sprint close:

- **What went well:**
- **What went wrong:**
- **Proposed changes to docs/prompts:**
- **Apply changes before next sprint:**
