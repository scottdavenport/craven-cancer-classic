# Admin Table Unification — Design (2026-05)

> Cross-surface UX standardization for the 5 admin list surfaces. Outcome of brainstorming session 2026-05-06 with Scott. All decisions are locked unless explicitly marked **Open**.

**Surfaces in scope:** `/admin/contacts`, `/admin/teams`, `/admin/sponsors`, `/admin/sponsorships`, `/admin/photos`.
**Surfaces out of scope today:** `/admin/scores` (codebase-only UAT; revisit at GolfGenius timing), `/admin/trash` (sui-generis tab structure; inherit cross-cutting CSS only), `/admin/event` + `/admin/settings` (single-form pages, not list surfaces).

**Provenance.**
- UAT findings: `plans/admin-uat-2026-05.md` (10-surface walk, 2026-04-18 → 2026-05-04). Cross-surface axis index appended at the bottom of that file.
- Brainstorming session: 2026-05-06. Visual mockups archived in `.superpowers/brainstorm/` (gitignored — re-mockup on demand for Pixel during sprint planning).

---

## Why this exists

UAT walked all 10 admin surfaces and surfaced a consistent pattern: **every list table behaves differently from every other list table.** Scott called this out 2026-05-06: "every table had a different user experience." This document standardizes that across 9 UX axes so admins build one mental model that holds across all surfaces.

The unification is also a vehicle for shipping 4 adjacent P0/P1 fixes that touch the same files.

---

## What changes for the admin (plain English)

- **One row pattern everywhere.** At rest, rows show only data — no checkboxes, no buttons. Hover a row to reveal the per-row checkbox + edit (pencil) + delete (trash) + any surface-specific button (e.g. "Mark paid" on Teams). Photos is the exception — its moderation buttons (Approve / Reject / Delete) stay always-visible because moderation IS the primary task.
- **One filter pattern everywhere.** Status sits as tabs above each list with inline counts ("All 375 / Subscribed 312 / Unsubscribed 63"). Below the tabs: full-width search at the top, then secondary filter dropdowns with always-visible labels, then active-filter chips with a "Clear all filters" link. No more search buried mid-row, no more dropdown labels disappearing on selection.
- **One edit pattern everywhere.** All edits open in a centered modal — no more drawer (Sponsors). Modals use banded sections (Identity / Contact / Roles / etc.) with the destructive button (Delete) separated bottom-left from Cancel + Save (bottom-right).
- **One delete-confirm pattern everywhere.** Delete dialogs name the linked records that'll be affected and predict the aftermath ("4 sponsors are linked to this package: A, B, C, and 1 more. They'll show '(no package)' until you reassign them."). Plain-text "are you sure?" goes away.
- **Contacts multi-type form gets a real redesign.** The 5 invisible checkboxes go away. Each role (Player / Sponsor / Donor / Volunteer / Other) becomes a card with a toggle. Selected cards expand inline to show role-specific fields (Handicap + Shirt for Player, Tribute + Recognition for Donor, etc.). Unselected cards stay collapsed but visible — no layout shift on toggle.

---

## Locked decisions

| # | Decision | Provenance |
|---|---|---|
| D1 | **Scope** = all 5 list surfaces (Contacts, Teams, Sponsors, Sponsorships, Photos). | This brainstorm. |
| D2 | **Edit-mode** = centered modal. Drop drawer (Sponsors migrates). | This brainstorm + Scott prior message. |
| D3 | **Hover-only row controls + dedicated buttons.** Drop whole-row click. | UAT F-T4 + F-T5 (already locked). |
| D4a | **Pencil-icon row edit** (Sponsorships F-N6 model). | This brainstorm. |
| D4b | **Filter-aware empty state** (Photos F-P1 model). | This brainstorm. |
| D4c | **Delete-confirm lists linked records + predicts aftermath** (Sponsorships F-N23 model). | This brainstorm. |
| D4d | **Modal footer: destructive button separated** (Sponsors F-S19 / Sponsorships F-N22 model). | This brainstorm. |
| D5 | **Status tabs everywhere** with inline counts (Photos F-P1/F-P2/F-P3 model). | This brainstorm. |
| D6 | **Unified filter-bar pattern**: status tabs above → full-width search → labeled secondary filter dropdowns → active-filter chips → Clear-all link. Resolves all 8 sub-findings of UAT F9. | This brainstorm. |
| D7 | **Photos exempt** from hover-only rule. Moderation buttons (Approve / Reject / Delete) always visible. | This brainstorm. |
| D8 | **Row pattern composition**: hover reveals `[✓ checkbox] [pencil] [trash] [+ surface-special labeled button]`. Surface-specials are inline labeled buttons next to the icons (Teams "Mark paid" only when payment status = Pending). | This brainstorm. |
| D9 | **Year columns**: wire year filter on Sponsorships items + Photos. Drop year column + year filter from Contacts list (per F10 + F9.c already locked). Schema columns stay on Sponsorships items + Photos. | This brainstorm. |
| D10 | **Sort defaults**: `sort_order ASC, price_cents DESC` on both Sponsors and Sponsorships (Sponsors keeps current; Sponsorships adopts). | This brainstorm. |
| D11 | **Modal IA = banded sections everywhere.** Even short forms get section headers (Teams: Roster / Payment). Contacts banding cascades to Teams, Sponsors, Sponsorships, Scores. | This brainstorm. |
| D12 | **Contacts multi-type form** = role cards always visible (Option B). Each role is a card with a toggle; selected cards expand inline to show role-specific fields; unselected cards stay collapsed but visible. No layout shift. | This brainstorm. |
| D13 | **No pagination.** Scroll-everywhere on every list. Re-evaluate if any surface crosses ~1000 rows. | This brainstorm. |
| D14 | **CSV export everywhere**, skip CSV import expansion. Every list gets a "Download CSV" button respecting active filters. Existing imports (Contacts, Scores) untouched. | This brainstorm. |
| D15a | **Bundle F-S21 P0** drawer→modal data-corruption fix (sponsor edit silently unlinks contacts). Same file as the migration. | This brainstorm. |
| D15b | **Bundle F-T9 P1** inline contact-create stub fix. `contact-typeahead.tsx` `defaultTypes` prop, cascades to Teams + Sponsors. | This brainstorm. |
| D15c | **Bundle F-T8 P1** Mark Paid payment-method capture. Once Mark Paid becomes a modal (per D8 row pattern), the field add is a small extra. | This brainstorm. |
| D15d | **Bundle F-S5/F-N9 P2** sidebar overlap CSS fix. Single CSS fix cascades to every admin surface. | This brainstorm. |

---

## Per-axis design

### Axis 1 — Edit mode

**Rule.** Every edit opens in a centered shadcn `Dialog` modal. No drawers, no sheets, no inline forms.

| Surface | Today | Target |
|---|---|---|
| Contacts | Modal (post-Sprint 31) | No change |
| Teams | Modal (post-Sprint 32) | No change |
| Sponsors | **Drawer** (`sponsor-drawer.tsx`) | **Migrate to modal** (F-S21 fix lands here) |
| Sponsorships | Modal | No change |
| Photos | Inline status actions only (no edit form) | No change |

**Files Bolt touches.** `src/app/admin/sponsors/sponsor-drawer.tsx` → rename / replace with `sponsor-modal.tsx`. Likely keep `sponsor-form.tsx` mostly intact; F-S21 fix is `key={sponsor?.id}` on `<SponsorForm>` to remount on sponsor change (per UAT line 389).

---

### Axis 2 — Edit affordance (how do you open the modal?)

**Rule.** Hover-revealed pencil icon in the rightmost cell of every row. No whole-row click. No always-visible Edit buttons.

| Surface | Today | Target |
|---|---|---|
| Contacts | Whole-row click (cursor:pointer + hover bg) | Pencil icon on hover |
| Teams | Always-visible Edit + Mark Paid buttons | Pencil icon on hover; Mark paid as labeled button on hover (when unpaid) |
| Sponsors | Whole-row click, no icon | Pencil icon on hover |
| Sponsorships | Pencil icon (visible always today) | Pencil icon on hover |
| Photos | N/A — moderation actions, not edit | Approve / Reject / Delete always visible (D7 exempt) |

**Files Bolt touches.** `contact-list.tsx`, `team-list.tsx`, `sponsor-list.tsx`, `sponsorship-manager.tsx`. Each gets the same hover-reveal pattern. Photos `photo-moderation.tsx` unchanged.

---

### Axis 3 — Hover row controls

**Rule.** At rest: data only, no chrome. On hover: row tints, controls fade in.

```
Hover reveals (left to right): [✓ row checkbox] [✏️ Edit pencil] [🗑️ Delete trash] [+ surface-special labeled button]
```

Surface-specials:
- **Teams:** "Mark paid" labeled button (visible only when `payment_status = 'pending'`).
- **Contacts / Sponsors / Sponsorships:** none today.
- **Photos:** N/A — D7 exempt, primary actions stay always-visible.

**Files Bolt touches.** Same list components as Axis 2. Likely a shared `<RowActions>` component in `src/components/admin/`.

---

### Axis 4 — Filter bar

**Rule.** Vertical structure, top-to-bottom:
1. **Status tabs** — primary status axis as tabs with inline counts. ("All 375 / Subscribed 312 / Unsubscribed 63")
2. **Full-width search** — single input, unified across name + email + phone + company (or surface-specific equivalent).
3. **Secondary filter dropdowns** — uppercase label always visible above each `<SelectTrigger>`. Boolean toggles last (Captains-only, etc.).
4. **Active-filter chips** — compact summary of what's narrowing the list, click X to remove individually.
5. **Clear-all filters link** — visible only when ≥1 filter is active.

**Per-surface filter inventory (post-unification):**

- **Contacts:** Status tabs (Subscribed / Unsubscribed / All). Search (name/email/phone/company). Filters: Type (Player/Sponsor/Donor/Volunteer/Other), Team. Toggle: Captains only. Year filter dropped (D9).
- **Teams:** Status tabs (Pending / Paid / All). Search (captain name). Filters: Session (Morning/Afternoon).
- **Sponsors:** Status tabs (Active / Inactive / All). Search (name + tier + website). Filters: Year (kept — actively used), Tier.
- **Sponsorships:** Status tabs (Active / Inactive / All). Search (item name). Filter: Year (NEW — D9 wires this).
- **Photos:** Status tabs (Pending / Approved / Rejected / All). Filter: Year (NEW — D9 wires this).

**Files Bolt touches.** Each surface's list component. Likely a shared `<FilterBar>` component + `<StatusTabs>` + `<ActiveFilterChips>` in `src/components/admin/`.

---

### Axis 5 — Empty state

**Rule.** Filter-aware. The empty-state copy depends on the cause.

```
If a filter is active and no rows match:
  "No <entity> match your filters" + [Clear filters] CTA

If no filter is active and the underlying set is empty:
  "No <entity> yet" + [Add <entity>] CTA
```

**Files Bolt touches.** `src/components/admin/admin-empty-state.tsx`. Cascades to every list.

---

### Axis 6 — Status display

**Rule.** Status is always tabs (D5). Every surface with a status axis uses `<StatusTabs>` above the search input. Replaces today's mix of toggle (Sponsors), dropdown filter (Sponsorships), badge-only (Teams), and dropdown (Contacts).

**Per-surface status states:**
- Contacts: Subscribed / Unsubscribed / All
- Teams: Pending / Paid / All (drop unused `failed` styling per UAT line 305 cleanup)
- Sponsors: Active / Inactive / All
- Sponsorships: Active / Inactive / All
- Photos: Pending / Approved / Rejected / All (no change — Photos is the donor)

**Files Bolt touches.** New `<StatusTabs>` component. List actions get a `status` filter param if not already present.

---

### Axis 7 — Modal IA

**Rule.** Every edit modal uses banded sections. Even short forms get section headers. Contacts banding pattern is the donor.

**Per-surface section layout (illustrative, Pixel + Bolt finalize):**

- **Contacts:** Identity / Contact / Roles (D12 role-cards) / Address / Notes
- **Teams:** Roster (Session, Captain, Players 2-4) / Payment (Status, Amount paid)
- **Sponsors:** Identity (Name, Tier) / Linked contacts / Logo / Notes
- **Sponsorships:** Item (Name, Description, Price, Year) / Inventory (Max quantity, Active toggle)

**Files Bolt touches.** Each surface's `*-form.tsx`. Pixel produces a shared `<ModalSection>` component (header + body container) that all forms wrap their fields in.

---

### Axis 8 — Modal footer

**Rule.** `[Delete] ←─────────→ [Cancel] [Save]`. Destructive button bottom-left, action group bottom-right. `justify-between` flex. Footer has solid `bg-background` to fully occlude scroll content.

**Files Bolt touches.** Each surface's `*-modal.tsx`. Replaces shadcn default `DialogFooter sm:justify-end` with explicit two-side flex.

---

### Axis 9 — Delete confirmation

**Rule.** Delete dialogs name the linked records that'll be affected and predict the aftermath state.

**Template (Sponsorships F-N23 model, generalized):**
> "**N** [related records] are linked to this [entity]: [list of names]. They'll show '[fallback display]' until you reassign them."

**Per-surface examples:**
- **Sponsors delete:** "3 sponsorship purchases reference this sponsor. Deleting moves the sponsor to Trash; the purchase records keep their sponsor_id but display 'Deleted sponsor'."
- **Sponsorships items delete:** "4 sponsors are linked to this package: Carolina East Health, Fuel Market, Lynne Davenport, ... and 1 more. They'll show '(no package)' until you reassign them."
- **Contacts delete:** Existing soft-delete-to-Trash pattern + Sprint 31 type-removal guard. Add linked-record names if contact is on any team.
- **Teams delete:** Existing type-to-confirm gate (paid teams only); add linked-records detail (members count + captain + payment state) into the dialog body.
- **Photos delete:** Hard-delete + storage cleanup; no linked records (photos are leaf nodes).

**Files Bolt touches.** Each surface's `*-list.tsx` `<ConfirmDialog>` invocation; server actions need to fetch linked-record names where not already done.

---

## Per-surface action map

What changes per surface, in summary.

### Contacts (`/admin/contacts`)
1. Replace status filter dropdown with status tabs (Subscribed / Unsubscribed / All).
2. Filter bar redesign (Axis 4): search-first, labeled dropdowns, active-filter chips, Clear-all.
3. Drop Year column + Year filter (per F10 + F9.c already locked).
4. Hover-only row controls (Axis 3): pencil + trash + checkbox.
5. Drop whole-row click affordance.
6. Modal footer separates Delete to bottom-left.
7. Multi-type form redesign per D12 (role cards always visible).
8. Inline message under Roles section when types.length === 0 (F19 fix).
9. Salutation = `<Select>` not free-text (F15).
10. Form field grouping per F12 spec (Salutation+First+Last on one row, Email+Phone, etc.).
11. Fix shadcn Checkbox primitive visibility for **row-selection checkboxes** (F17/F18 — single-file fix to `src/components/ui/checkbox.tsx`). Type-selection checkboxes go away entirely — D12 replaces them with role cards.
12. CSV export button (filter-aware) — already exists.

### Teams (`/admin/teams`)
1. Add status tabs (Pending / Paid / All).
2. Add search input (captain name).
3. Hover-only row controls.
4. "Mark paid" becomes a labeled button on hover (only when unpaid) AND becomes a modal flow (F-T7).
5. Mark paid modal captures payment method (F-T8 P1 bundle).
6. Drop dead `failed` PaymentStatusBadge class (UAT line 305 cleanup).
7. Modal IA: banded sections (Roster / Payment).
8. Modal footer separates Delete to bottom-left.
9. Delete-confirm dialog adds linked-record names.
10. CSV export button (NEW per D14).

### Sponsors (`/admin/sponsors`)
1. **Migrate from drawer to modal** (D2 + bundles F-S21 P0 fix via `key={sponsor?.id}` remount).
2. Add status tabs (Active / Inactive / All) — replaces today's Inactive toggle.
3. Filter bar restructured around status tabs.
4. Hover-only row controls.
5. Pencil-icon edit affordance per row.
6. Drop whole-row click.
7. Modal IA: banded sections.
8. Modal footer already separates Delete (F-S19) — verify still works after migration.
9. Delete-confirm dialog adds linked-record names (replace plain-text confirm).
10. Year filter retained (it's actively used).
11. Sort: `sort_order ASC, price_cents DESC` retained (D10).
12. CSV export button (NEW per D14).

### Sponsorships (`/admin/sponsorships`)
1. Add status tabs (Active / Inactive / All) — replaces in-modal Active dropdown.
2. Add search input.
3. Add Year filter (D9 — wires existing schema column).
4. Hover-only row controls.
5. Pencil icon already visible — move to hover-reveal.
6. Modal IA: banded sections.
7. Modal footer already separates Delete (F-N22) — preserve.
8. Delete-confirm dialog stays (F-N23 model — nothing to change).
9. Sort: `sort_order ASC, price_cents DESC` (D10 — adopt Sponsors pattern).
10. CSV export button (NEW per D14).

### Photos (`/admin/photos`)
1. Add Year filter (D9 — wires existing schema column).
2. Status tabs already correct — verify count badges show on every tab (not just >0 — see UAT F-Tr1 reference for the inverse pattern; verify Photos shows badge on 0 too).
3. **Exempt from hover-only rule** (D7) — Approve / Reject / Delete stay always-visible.
4. Empty state already filter-aware — keep.
5. Filter-aware empty state: confirm pattern works for combined Year × Status filtering.
6. CSV export button (NEW per D14).

---

## Adjacent fixes bundled in (P0/P1)

These ride along because they touch the same files as the unification work.

| Finding | Severity | Bundle reason | Where it lands |
|---|---|---|---|
| F-S21 | P0 | Drawer→modal migration touches the same `sponsor-form.tsx`. `key={sponsor?.id}` remount fixes the silent unlinking. | Sponsors action map item 1. |
| F-T9 | P1 | `contact-typeahead.tsx` is shared by Teams + Sponsors (both in scope). `defaultTypes` prop fix cascades to both. | Cross-cutting fix to `src/components/admin/contact-typeahead.tsx`. |
| F-T8 | P1 | "Mark paid → modal" (F-T7) is already in Teams action map. Adding payment-method field to that modal is a small extra. | Teams action map item 5. |
| F-S5/F-N9 | P2 | Cross-cutting CSS fix to admin sidebar layout. Single fix cascades to every admin surface — we're touching the admin layer anyway. | Cross-cutting fix to `src/app/admin/layout.tsx` or sidebar component. |

---

## Out of scope (don't bring back)

- **Pagination.** Scroll-everywhere is fine at current row counts (max 375 on Contacts). Re-evaluate at ~1000 rows on any surface.
- **CSV import on Sponsors / Sponsorships / Teams / Photos.** Volume too low. Existing Contacts + Scores imports stay untouched.
- **Scores `/admin/scores` UI walk.** Deferred per Scott pending NBG&CC pro / GolfGenius integration timing. Schema-level F-Sc1/F-Sc2/F-Sc3 fixes spin out as their own pre-GolfGenius prep sprint.
- **Trash `/admin/trash` redesign.** Sui-generis tab structure stays; inherits cross-cutting CSS only (sidebar overlap fix per F-S5/F-N9).
- **Event `/admin/event` + Settings `/admin/settings`.** Single-form pages, not list surfaces.
- **Virtual scrolling.** YAGNI per D13.
- **Collapsible modal sections.** Considered (Modal IA Option C) and rejected — extra interaction state, not warranted at current form sizes.

---

## Sprint planning notes

**This is a Compass-shaped engagement.** ~5 surfaces × ~10 axes = many small surgical PRs that sequence naturally. Suggested phasing for Compass to refine:

1. **Phase 1 — Shared primitives** (single sprint, 1 PR cluster).
   - `<RowActions>` (hover-reveal checkbox + edit + delete + surface-special slot).
   - `<StatusTabs>` (with inline counts).
   - `<FilterBar>` (search + labeled dropdowns + active-filter chips + Clear-all).
   - `<ModalSection>` (banded section header + body).
   - Footer pattern (replace `DialogFooter` defaults).
   - Shadcn `<Checkbox>` primitive override (F17/F18 fix).
   - Filter-aware `<AdminEmptyState>`.
   - Cross-cutting sidebar CSS fix (F-S5/F-N9).
   - `contact-typeahead.tsx` `defaultTypes` prop (F-T9 P1 fix).

2. **Phase 2 — Worst-offender migration** (single sprint, 1 PR).
   - Sponsors drawer→modal migration (D2 + F-S21 P0 fix bundled).
   - Adopts all Phase 1 primitives.
   - Becomes the reference implementation for Phase 3.

3. **Phase 3 — Cascade to remaining surfaces** (1 sprint, 4 PRs in parallel — one per surface).
   - Contacts: filter bar redesign + multi-type role-cards form + status tabs + hover rows + Year column drop + Salutation Select + F12 form layout.
   - Teams: status tabs + search + hover rows + Mark paid modal (with F-T8 payment-method) + banded modal IA + delete-confirm linked records.
   - Sponsorships: status tabs + search + Year filter wire + hover rows + sort_order adoption.
   - Photos: Year filter wire + verify count badges + filter-aware empty state for combined filters.

4. **Phase 4 — CSV export universal** (1 sprint, small).
   - Add `<DownloadCsvButton>` helper and wire into Teams + Sponsors + Sponsorships + Photos lists. Contacts/Scores already have it.

**Aria upfront-gate.** Every UI PR enumerates new strings (status tab labels, empty-state copy, filter labels, delete-confirm copy templates, role-card titles). Aria approves before Bolt ships. Per `feedback_aria_gate_every_ui_pr.md`.

**Pixel upfront-gate.** Every shared primitive (Phase 1) gets a Pixel design pass before Bolt builds. Pixel produces wireframe + token spec for `<RowActions>`, `<StatusTabs>`, `<FilterBar>`, `<ModalSection>`, role-cards form. Bolt implements against the Pixel spec.

**Watchdog upfront-gate.** Every PR diffs live preview against Pixel design preview side-by-side per `feedback_watchdog_design_adherence_diff.md`.

---

## Open questions (none — captured here in case any surface)

All decisions locked as of 2026-05-06. If any surface during sprint execution, update this section + cite the Compass plan that resolved it.
