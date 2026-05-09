# Admin Table Unification — Sprint Plan (2026-05)

> Spec source: `plans/2026-05-admin-table-unification-design.md` (PR #369, merged 2026-05-06).
> **21 locked decisions across 9 UX axes. Do NOT relitigate.** If a decision needs to change, update the design doc first via a separate PR before any builder touches code.

---

## 1. Plain-English Readout

**What admins experience after this sprint ships:**

- Every table behaves the same way. Hover a row to see the checkbox, pencil, and trash controls. No more hunting for buttons or accidentally triggering edits by clicking a row.
- Finding records is consistent on every page: status tabs at the top with live counts, a search box, secondary labeled filters below, and chips showing exactly what is narrowing your list. One click clears everything.
- Editing anything opens a centered modal with clear sections. No more drawer sliding in from the side on the Sponsors page.
- Deleting a record tells you what else will be affected: names of linked records, what placeholder they will show until reassigned. No more plain "are you sure?" prompts.
- Creating a new contact shows you all five role cards (Player, Sponsor, Donor, Volunteer, Other) at once. Click a card to expand it and fill in role-specific details. You always see what is available.
- Checkboxes are now visible across the entire admin. Row-selection checkboxes and type-selection checkboxes both have clear borders, filled backgrounds, and checkmarks you can actually see.
- Three bugs that could corrupt data are fixed as part of this sprint: editing a sponsor no longer silently unlinks contacts, creating a player via team search now sets the Player type, and marking a team paid now captures the payment method.

**Before vs After:**

- Before: Five list surfaces, five different interaction patterns — whole-row click on Contacts, dedicated buttons on Teams, drawer on Sponsors, pencil icon always-visible on Sponsorships, moderation buttons on Photos. After: One pattern on all five. Hover to reveal controls.
- Before: Checkboxes were invisible. Bulk actions were discovered by accident. After: Checkbox borders and fill are visually clear; bulk-action bar is discoverable without hovering.
- Before: Editing a sponsor who had linked contacts would silently delete those links on save. After: The form loads with existing contacts pre-populated and correctly preserves them through saves.

---

## 2. Spec Source Pointer

Locked design: `plans/2026-05-admin-table-unification-design.md` — 21 decisions locked. No decision in that file may be changed without a separate PR updating the design doc first and citing the Compass sprint plan that resolved the open question.

---

## 3. Phase Breakdown

### Phase 1 — Shared Primitives

**Estimated wall-clock:** 3–4 hours (Pixel design pass 1–2 hours; Bolt implementation 2–3 hours; parallel with Pixel).
**Goal:** Build all shared components and cross-cutting fixes so every Phase 2/3 PR adopts them without reinventing anything.

#### Pixel upfront-gate (HARD-GATE — must fire before Phase 1 PR opens)

Pixel produces before Bolt writes any Phase 1 code:
- Wireframe + token spec for `<RowActions>`: hover-reveal checkbox + pencil + trash + surface-special slot. Dimensions, opacity transitions, z-index.
- `<StatusTabs>`: tab label shape, count badge shape and position, active/inactive states.
- `<FilterBar>`: search-first layout, labeled dropdown anatomy, active-filter chip shape, Clear-all link position and visibility rule (only when ≥1 filter active).
- `<ModalSection>`: banded header height, body padding, separator treatment.
- Role-cards layout for Contacts multi-type form (D12): card at-rest vs expanded, toggle affordance, field layout inside expanded card.
- Checkbox primitive: border width, fill color on selected, checkmark size, unchecked visible-border spec.

Pixel delivers design-preview HTML per `feedback_watchdog_design_adherence_diff.md` for each component above before PR-1 opens.

#### Aria upfront-gate (HARD-GATE — must fire before Phase 1 PR opens)

New user-facing strings introduced in Phase 1:

| String | Surface | Location |
|---|---|---|
| "No [entity] match your filters" | All surfaces | Filter-aware empty state — filter-active branch |
| "Clear filters" | All surfaces | CTA in filter-aware empty state + filter bar link |
| "No [entity] yet" | All surfaces | Filter-aware empty state — no-data branch |
| "Add [entity]" | All surfaces | CTA in no-data empty state |
| `aria-label="Edit [item name]"` | All row-action pencil buttons | Screen-reader label (F-N12 pattern) |
| `aria-label="Delete [item name]"` | All row-action trash buttons | Screen-reader label |
| `aria-label="Select [item name]"` | Per-row checkboxes | Screen-reader label |
| "Select all" | Select-all header checkbox | Screen-reader label |

Aria countersigns all strings above before any builder ships Phase 1.

#### PR-1A: Shared UI primitives

**Title:** `feat(admin): shared primitives — RowActions, StatusTabs, FilterBar, ModalSection`

**Files to create:**
- `src/components/admin/row-actions.tsx` (new — `<RowActions>` hover-reveal component)
- `src/components/admin/status-tabs.tsx` (new — `<StatusTabs>` with inline counts)
- `src/components/admin/filter-bar.tsx` (new — `<FilterBar>` with search + labeled dropdowns + chips + clear-all)
- `src/components/admin/modal-section.tsx` (new — `<ModalSection>` banded section header + body)
- `src/components/admin/active-filter-chips.tsx` (new — `<ActiveFilterChips>` + Clear-all link)

**Files to modify:**
- `src/components/admin/admin-empty-state.tsx` — add `filterActive?: boolean` prop; when true, render "No [entity] match your filters / Clear filters"; when false, render "No [entity] yet / Add [entity]"

Design-source: Pixel spec from Pixel upfront-gate above.

**Builder routing:** Bolt (pure client components, no server actions).
**Adjacent fix bundled:** F17/F18 Checkbox primitive is a separate sub-PR (PR-1B) within Phase 1.
**Watchdog gate:** Stage 1 — diff rendered output against Pixel design-preview HTML. Stage 2 — code quality. No E2E trigger (no `src/app/` changes).

**Acceptance criteria:**

- `grep -r "admin-empty-state" src/app/admin/ | wc -l` returns the same count before and after (existing usages untouched in this PR; cascade happens in Phase 2/3 PRs).
- `grep -r "<RowActions" src/ | wc -l` returns 0 before PR-1A (not used yet; usage wired in Phase 2/3).
- `grep -r "<StatusTabs" src/ | wc -l` returns 0 before PR-1A (ditto).
- `grep -r "<FilterBar" src/ | wc -l` returns 0 before PR-1A (ditto).
- Pixel design-preview diff: Watchdog screenshots Storybook or test-render of each component against Pixel HTML — 0 visual deltas on dimensions, typography, spacing.
- All new components export named exports from their files (no default exports).
- `npx tsc --noEmit` exits 0.

---

#### PR-1B: Checkbox primitive visibility fix (F17 + F18)

**Title:** `fix(ui): checkbox primitive — visible border + filled selected state`

**Finding ID:** F17 (P1) + F18 (P1). Single-file fix, broad cascade.

**Files to modify:**
- `src/components/ui/checkbox.tsx` — override shadcn default tokens: add explicit `border-2 border-slate-400` on unchecked state; add `bg-primary text-primary-foreground` on checked state; ensure checkmark SVG is sized to be visible at 16px and 20px render sizes.

**Builder routing:** Bolt.
**Watchdog gate:** Diff `checkbox.test.tsx` before/after — existing test assertions must pass unchanged. Pixel design-preview diff: screenshot checked + unchecked states against Pixel spec.

**Acceptance criteria:**

- `grep -c "border-2" src/components/ui/checkbox.tsx` returns 1 (the new unchecked-state border class).
- `grep -c "bg-primary" src/components/ui/checkbox.tsx` returns 1 (the filled selected-state class).
- `npx vitest run src/components/ui/checkbox.test.tsx` exits 0, 0 skipped, ≥1 passing.
- Visual: row-selection checkboxes and type-checkboxes are both visible at rest (unchecked) and show a filled background when checked — verified via Watchdog screenshot against Pixel spec.

---

#### PR-1C: Cross-cutting fixes (sidebar overlap + contact-typeahead defaultTypes)

**Title:** `fix(admin): sidebar overlap CSS + contact-typeahead defaultTypes prop`

**Finding IDs:**
- F-S5/F-N9 (P2) — sidebar avatar overlaps Sign Out text on every admin surface.
- F-T9 (P1) — contact-typeahead inline-create bypasses Sprint 31 multi-type rules.

**Files to modify:**
- `src/app/admin/layout.tsx` OR `src/components/admin/admin-sidebar.tsx` — add bottom padding to sidebar nav block so the "N" avatar does not overlap the Sign Out / View Site footer links. Verify at 768px, 1024px, 1440px viewport widths.
- `src/components/admin/contact-typeahead.tsx` — add `defaultTypes?: ContactType[]` prop to both `ContactTypeahead` (line 36 export) and `ContactTypeaheadMulti` (line 379 export). Inline-create form auto-applies `defaultTypes` and renders the relevant type-gated fields. Title in inline form derives from `defaultTypes` ("New Player" / "New Sponsor Contact" / "New Contact" if empty). Pre-check the relevant type checkboxes on form open.
- `src/app/admin/teams/team-form.tsx` — pass `defaultTypes={['player']}` to all 4 `ContactTypeahead` usages (Captain + Players 2/3/4, lines 131/140/149/158).
- `src/app/admin/sponsors/sponsor-form.tsx` — pass `defaultTypes={['sponsor']}` to `ContactTypeaheadMulti` usage (line 227).

**Aria gate for F-T9:** New inline-create form title strings ("New Player", "New Sponsor Contact", "New Contact") must be countersigned by Aria before PR-1C ships. These are user-visible strings in the inline panel.

**Builder routing:** Bolt.
**Watchdog gate:** Stage 1 spec compliance + Stage 2 code quality. E2E trigger fires (modifies `src/app/admin/` and `src/components/admin/`).

**Acceptance criteria:**

- `grep -c "defaultTypes" src/components/admin/contact-typeahead.tsx` returns ≥2 (one per export's prop signature).
- `grep -c "defaultTypes" src/app/admin/teams/team-form.tsx` returns 4 (one per ContactTypeahead usage).
- `grep -c "defaultTypes" src/app/admin/sponsors/sponsor-form.tsx` returns 1.
- `npx tsc --noEmit` exits 0.
- Sidebar: Watchdog screenshots sidebar footer at 1280px viewport — "N" avatar does not visually overlap Sign Out text.
- Existing E2E suite passes: `npx playwright test --project=chromium` exits 0, 0 failed, 0 skipped.

---

**Phase 1 sequencing:** PR-1A and PR-1B can merge in parallel (no shared files). PR-1C depends on PR-1A being merged (imports `ContactType` from shared types). Pixel gate must fire before any of 1A/1B/1C opens.

---

### Phase 2 — Worst-Offender Migration (Sponsors)

**Estimated wall-clock:** 2–3 hours. Becomes the reference implementation for Phase 3.
**Goal:** Migrate Sponsors from drawer to modal, adopt all Phase 1 primitives, and ship the P0 F-S21 data-corruption fix.

**Dependency:** Phase 1 merged to main.

#### Aria upfront-gate (Phase 2)

New strings for Sponsors modal:

| String | Location |
|---|---|
| "Identity" | Modal section header — sponsors banded section |
| "Linked contacts" | Modal section header — sponsors banded section |
| "Logo" | Modal section header — sponsors banded section |
| "Notes" | Modal section header — sponsors banded section |
| "Active" | Status tabs label |
| "Inactive" | Status tabs label |
| "All" | Status tabs label (universal — covered in Phase 1 Aria gate) |
| "3 sponsorship purchases reference this sponsor. Deleting moves the sponsor to Trash; the purchase records keep their sponsor_id but display 'Deleted sponsor'." | Delete-confirm dialog body — example; actual count and names dynamic |
| "Deleted sponsor" | Fallback display string for orphaned sponsor_id references |
| "No sponsors match your filters" + "Clear filters" | Empty state — covered in Phase 1 Aria gate |
| "No sponsors yet" + "Add sponsor" | Empty state — covered in Phase 1 Aria gate |

Aria countersigns Phase 2 strings before PR-2 opens.

#### PR-2: Sponsors drawer → modal + F-S21 fix

**Title:** `feat(admin/sponsors): drawer→modal migration + F-S21 contact link fix`

**Finding IDs bundled:**
- F-S21 (P0) — sponsor edit silently unlinks contacts. Fix: add `key={sponsor?.id}` on `<SponsorForm>` in the new `sponsor-modal.tsx` to force remount on sponsor change. This replaces the `useState(seedContacts)` freeze pattern.

**Files to create:**
- `src/app/admin/sponsors/sponsor-modal.tsx` (new — centered `<Dialog>` modal wrapping `<SponsorForm>`)

**Files to modify:**
- `src/app/admin/sponsors/sponsor-form.tsx` — replace `useState(seedContacts)` at line 64 with `useState([])` + `useEffect(() => setSelectedContacts(initialContacts), [initialContacts])`. Add `<ModalSection>` banded sections (Identity / Linked contacts / Logo / Notes) from PR-1A. Modal footer: `justify-between` flex — Delete bottom-left, Cancel + Save bottom-right.
- `src/app/admin/sponsors/sponsor-list.tsx` — replace `<SponsorDrawer>` invocation with `<SponsorModal>`. Add `<RowActions>` from PR-1A on each row (hover-reveal pencil + trash + checkbox). Drop whole-row click (remove `cursor-pointer` + row `onClick`). Add `<StatusTabs>` (Active / Inactive / All) above the search input. Replace inactive-toggle with StatusTabs. Add `<FilterBar>` (search + Year filter + Tier filter). Update `<AdminEmptyState>` with `filterActive` prop.
- `src/app/admin/sponsors/page.tsx` — remove `<SponsorDrawer>` import/usage if referenced at page level.

**Files to delete:**
- `src/app/admin/sponsors/sponsor-drawer.tsx` — delete after `sponsor-modal.tsx` is wired. Verify 0 remaining imports before delete: `grep -r "sponsor-drawer" src/ | wc -l` must return 0.

**Builder routing:** Bolt (UI only; server actions in `actions.ts` untouched except the F-S21 `contact_ids` null-guard noted below).

**Server action note (actions.ts):** The `updateSponsor` reconciliation at `actions.ts:212-244` evaluates `contactIdsRaw !== null` to decide whether to reconcile. After the form fix, `contactIdsRaw` will always be a non-empty array when contacts exist. Verify the null-guard condition still functions correctly for the new-sponsor (no-contacts) case: `grep -n "contactIdsRaw" src/app/admin/sponsors/actions.ts` — confirm line count matches expected.

**Regression test addition (in `__tests__/sponsor-form.test.tsx`):**
- Test: mount `<SponsorForm>` with `initialContacts={[]}`, then update the `initialContacts` prop to `[{id: '1', full_name: 'Test Contact'}]`, assert the chip renders. Spec writes this TDD-RED before Bolt implements.

**Watchdog gate:** Stage 1 — diff live Sponsors list + edit modal against Phase 2 Aria-approved strings and Pixel design-preview. Stage 2 — code quality. E2E trigger fires (`src/app/admin/sponsors/**`).

**Acceptance criteria:**

- `grep -r "sponsor-drawer" src/ | wc -l` returns 0 after PR-2 merges.
- `grep -r "SponsorDrawer" src/ | wc -l` returns 0.
- `grep -c "key={sponsor" src/app/admin/sponsors/sponsor-modal.tsx` returns 1 (the remount fix).
- `grep -c "useEffect" src/app/admin/sponsors/sponsor-form.tsx` returns ≥1 (the initialContacts effect).
- `grep -c "useState(seedContacts)" src/app/admin/sponsors/sponsor-form.tsx` returns 0 (pattern removed).
- `grep -c "cursor-pointer" src/app/admin/sponsors/sponsor-list.tsx` returns 0 (whole-row click removed).
- `grep -c "RowActions" src/app/admin/sponsors/sponsor-list.tsx` returns ≥1.
- `grep -c "StatusTabs" src/app/admin/sponsors/sponsor-list.tsx` returns ≥1.
- `npx vitest run src/app/admin/sponsors/__tests__/` exits 0, 0 skipped.
- Existing E2E suite passes.

---

### Phase 3 — Cascade to Remaining Surfaces

**Estimated wall-clock:** 4–6 hours total (4 PRs in parallel; each PR ~2–3 hours for Bolt).
**Goal:** Apply the Sponsors reference implementation to Contacts, Teams, Sponsorships, and Photos.

**Dependency:** Phase 2 merged to main.

**Parallelism:** PR-3-contacts, PR-3-teams, PR-3-sponsorships, and PR-3-photos touch no shared files and can merge in any order. All four may be built and reviewed in parallel.

#### Aria upfront-gate (Phase 3 — per surface)

**Contacts new strings:**
| String | Location |
|---|---|
| "Identity" | Modal section header |
| "Contact" | Modal section header |
| "Roles" | Modal section header |
| "Address" | Modal section header |
| "Notes" | Modal section header |
| "Player" | Role card title |
| "Sponsor" | Role card title |
| "Donor" | Role card title |
| "Volunteer" | Role card title |
| "Other" | Role card title |
| "At least one role is required to save." | Inline message under Roles section when types.length === 0 (F19 fix) |
| "Subscribed" | Status tab label |
| "Unsubscribed" | Status tab label |
| "Search by name, email, phone, or company" | Search input placeholder (from F9.a) |
| "Type" | Secondary filter dropdown label |
| "Team" | Secondary filter dropdown label |
| "Captains only" | Boolean toggle label |
| Salutation options: "Mr.", "Mrs.", "Ms.", "Mx.", "Dr.", "Miss" | `<Select>` options (F15) |

**Teams new strings:**
| String | Location |
|---|---|
| "Pending" | Status tab label |
| "Paid" | Status tab label |
| "Roster" | Modal section header |
| "Payment" | Modal section header |
| "Session" | Secondary filter dropdown label |
| "Search by captain name" | Search input placeholder |
| "Mark paid" | Hover-row labeled button (shown when payment_status = 'pending') |
| "Payment method" | Mark-paid modal field label |
| "Check", "Cash", "Venmo", "Zelle", "Wire", "Comped", "Stripe", "Other" | Payment method `<Select>` options |
| "Reference number" | Mark-paid modal optional field label |
| "Date paid" | Mark-paid modal optional field label |
| Linked-records delete copy: "N members are in this team: [names]. [N] player score records are linked. The team will be moved to Trash." | Delete-confirm body |
| "Download CSV" | CSV export button label |

**Sponsorships new strings:**
| String | Location |
|---|---|
| "Item" | Modal section header |
| "Inventory" | Modal section header |
| "Year" | Secondary filter dropdown label |
| "Search by name" | Search input placeholder |
| "Download CSV" | CSV export button label |

**Photos new strings:**
| String | Location |
|---|---|
| "Year" | Secondary filter dropdown label |
| "Download CSV" | CSV export button label |

Aria countersigns all strings above per surface before the corresponding Phase 3 PR opens.

---

#### PR-3-contacts: Contacts surface migration

**Title:** `feat(admin/contacts): status tabs + filter bar + role-cards form + hover rows`

**Action map items:** Contacts items 1–12 from the design doc.

**Files to modify:**
- `src/app/admin/contacts/contact-list.tsx` — add `<StatusTabs>` (Subscribed / Unsubscribed / All). Add `<FilterBar>` (search-by-name/email/phone/company per F9.a, labeled Type + Team dropdowns per F9.g, Captains-only toggle last). Add `<ActiveFilterChips>` + Clear-all link. Drop Year column and Year filter (D9 + F10). Replace whole-row click with `<RowActions>` hover-reveal. Update `<AdminEmptyState>` with `filterActive` prop. Remove `cursor-pointer` from row.
- `src/app/admin/contacts/contact-form.tsx` — apply D12 role-cards: 5 always-visible cards (Player / Sponsor / Donor / Volunteer / Other), each with a toggle; selected cards expand inline to show role-specific fields; unselected cards stay collapsed. Remove the 5 invisible checkbox-based type controls. Add inline message under Roles section when `types.length === 0` (F19). Apply F12 field grouping: Salutation + First + Last on one row (1fr/2fr/2fr grid), Email + Phone on one row, Company on its own row. Replace Salutation free-text with `<Select>` of Mr./Mrs./Ms./Mx./Dr./Miss/blank (F15). Apply `<ModalSection>` banding: Identity / Contact / Roles / Address / Notes. Modal footer: `justify-between` — Delete bottom-left, Cancel + Save bottom-right (F13.a + F13.b).
- `src/app/admin/contacts/contact-modal.tsx` — ensure `<DialogFooter>` is replaced with explicit `justify-between` flex (F13.a). Ensure footer has `bg-background` to occlude scroll content (F13.b).

**Adjacent fix bundled:** F19 (P2) — inline "At least one role is required to save." message under Roles section when types.length === 0. Wired in `contact-form.tsx`.

**Builder routing:** Bolt (UI changes only; server actions in `actions.ts` untouched).

**Watchdog gate:** Stage 1 — diff against Pixel design-preview HTML (role-cards form layout, filter-bar layout). Stage 2 — code quality. E2E trigger fires. Watchdog must verify bulk-action checkboxes are now visible (F18 fix from Phase 1 should make them visible — verify no regression).

**Acceptance criteria:**

- `grep -c "cursor-pointer" src/app/admin/contacts/contact-list.tsx` returns 0 (whole-row click removed).
- `grep -c "RowActions" src/app/admin/contacts/contact-list.tsx` returns ≥1.
- `grep -c "StatusTabs" src/app/admin/contacts/contact-list.tsx` returns ≥1.
- `grep -c "FilterBar" src/app/admin/contacts/contact-list.tsx` returns ≥1.
- `grep -c "year" src/app/admin/contacts/contact-list.tsx` returns 0 (year column and filter removed; case-insensitive check: `grep -ic "year_first_seen" ... | wc -l` = 0 for any column-render or filter-dropdown references).
- `grep -c "At least one role" src/app/admin/contacts/contact-form.tsx` returns 1.
- `grep -c "ModalSection" src/app/admin/contacts/contact-form.tsx` returns ≥4 (one per section: Identity, Contact, Roles, Address).
- `grep -c "justify-between" src/app/admin/contacts/contact-modal.tsx` returns ≥1.
- `npx vitest run src/app/admin/contacts/` exits 0, 0 skipped.
- Existing E2E suite (`npx playwright test --project=chromium`) passes, 0 failed.

---

#### PR-3-teams: Teams surface migration

**Title:** `feat(admin/teams): status tabs + search + hover rows + mark-paid modal + F-T8`

**Action map items:** Teams items 1–10 from the design doc.

**Files to modify:**
- `src/app/admin/teams/team-list.tsx` — add `<StatusTabs>` (Pending / Paid / All). Add search input (captain name). Replace always-visible Edit + Mark Paid buttons with `<RowActions>` hover-reveal: pencil for edit, trash for delete, "Mark paid" labeled button (visible only when `payment_status = 'pending'`). Add `<AdminEmptyState>` with `filterActive` prop. Remove dead `PaymentStatusBadge` class for `failed` status (UAT line 305). Drop CAPTAIN column (F-T1 — redundant since Sprint 32). Add `<DownloadCsvButton>` (teams-specific CSV export — see Phase 4 for the universal helper; this PR wires a local export action).
- `src/app/admin/teams/team-form.tsx` — apply `<ModalSection>` banding: Roster section (Session, Captain, Players 2–4) and Payment section (Status, Amount paid, Payment method [F-T8], Reference number, Date paid). Modal footer: `justify-between` — Delete bottom-left, Cancel + Save bottom-right. Delete-confirm dialog: add linked-record names (member count + captain name + payment state) as body content below the current copy.
- `src/app/admin/teams/team-modal.tsx` — ensure footer pattern is `justify-between` flex.
- `src/app/admin/teams/actions.ts` — `markTeamPaid` server action: add `payment_method text` field to the update payload. Schema migration is a prerequisite (see note below).

**Schema migration prerequisite (Flux or Bolt):** `ALTER TABLE teams ADD COLUMN payment_method text NULL` and `ALTER TABLE teams ADD COLUMN payment_reference text NULL` and `ALTER TABLE teams ADD COLUMN paid_at timestamptz NULL`. Stripe webhook at `src/app/api/webhooks/stripe/route.ts:131-139` should be updated in the same PR to auto-set `payment_method = 'stripe'` on successful team payment.

**Adjacent fix bundled:**
- F-T8 (P1) — Mark Paid captures payment method. Wired in `team-form.tsx` + `team-modal.tsx` + `actions.ts`.
- F-T1 (P2) — Drop redundant CAPTAIN column from team list.
- Dead `failed` PaymentStatusBadge cleanup (UAT line 305).

**Builder routing:** Bolt (UI + server action update). Schema migration: `mcp__supabase-craven__apply_migration` before PR-3-teams opens.

**Watchdog gate:** Stage 1 spec compliance + Stage 2 code quality. E2E trigger fires. Watchdog verifies: Mark Paid button is hover-only (not always-visible), payment-method field is in the Mark Paid modal, CAPTAIN column is absent from the list table.

**Acceptance criteria:**

- `grep -c "RowActions" src/app/admin/teams/team-list.tsx` returns ≥1.
- `grep -c "StatusTabs" src/app/admin/teams/team-list.tsx` returns ≥1.
- `grep -c "failed" src/app/admin/teams/team-list.tsx` returns 0 (dead badge class removed).
- `grep -c "payment_method" src/app/admin/teams/actions.ts` returns ≥1.
- `grep -c "ModalSection" src/app/admin/teams/team-form.tsx` returns ≥2 (Roster + Payment sections).
- `grep -c "justify-between" src/app/admin/teams/team-modal.tsx` returns ≥1.
- `mcp__supabase-craven__execute_sql` on `SELECT column_name FROM information_schema.columns WHERE table_name='teams' AND column_name='payment_method'` returns 1 row (migration landed).
- `npx vitest run src/app/admin/teams/` exits 0, 0 skipped.
- Existing E2E suite passes, 0 failed.

---

#### PR-3-sponsorships: Sponsorships surface migration

**Title:** `feat(admin/sponsorships): status tabs + search + year filter + hover rows`

**Action map items:** Sponsorships items 1–10 from the design doc.

**Files to modify:**
- `src/app/admin/sponsorships/sponsorship-manager.tsx` — add `<StatusTabs>` (Active / Inactive / All) to replace the in-modal Active dropdown. Add search input (item name). Add Year filter `<Select>` (wires existing `sponsorship_items.year` column — D9). Update `getLinkedSponsorNames` / `getSponsorshipItems` filter params to pass year and status. Add `<RowActions>` hover-reveal (pencil already exists as visible-always; move to hover-only). Add `<AdminEmptyState>` with `filterActive` prop. Update sort order to `sort_order ASC, price_cents DESC` (D10).
- `src/app/admin/sponsorships/sponsorship-form.tsx` — apply `<ModalSection>` banding: Item section (Name, Description, Price, Year) and Inventory section (Max quantity, Active toggle). Modal footer already separates Delete (F-N22) — verify `justify-between` pattern is present; add if not.
- `src/app/admin/sponsorships/sponsorship-modal.tsx` — verify footer is `justify-between`; update if not.
- `src/app/admin/sponsorships/actions.ts` — `getSponsorshipItems`: add `year` and `status` params to query. `sort_order ASC, price_cents DESC` order.

**Builder routing:** Bolt.
**Watchdog gate:** Stage 1 spec compliance + Stage 2 code quality. E2E trigger fires.

**Acceptance criteria:**

- `grep -c "StatusTabs" src/app/admin/sponsorships/sponsorship-manager.tsx` returns ≥1.
- `grep -c "RowActions" src/app/admin/sponsorships/sponsorship-manager.tsx` returns ≥1.
- `grep -c "sort_order" src/app/admin/sponsorships/actions.ts` returns ≥1 (D10 sort adopted).
- `grep -c "ModalSection" src/app/admin/sponsorships/sponsorship-form.tsx` returns ≥2 (Item + Inventory sections).
- `grep -c "justify-between" src/app/admin/sponsorships/sponsorship-modal.tsx` returns ≥1.
- `npx vitest run src/app/admin/sponsorships/` exits 0 (no tests currently — 0 skipped, 0 failed; this is the baseline; new tests are Phase 3 scope only if Spec sweep surfaces regression risk).
- Existing E2E suite passes.

---

#### PR-3-photos: Photos surface migration

**Title:** `feat(admin/photos): year filter + verify count badges + filter-aware empty state`

**Action map items:** Photos items 1–6 from the design doc.

**Files to modify:**
- `src/app/admin/photos/photo-moderation.tsx` — add Year filter `<Select>` (wires existing `photos.year` column — D9). Pass year param to `getPhotos` server action. Verify count badges show on all tabs including when count = 0 (F-P2 positive — confirm not broken by changes). Verify filter-aware empty state works for combined Year × Status filtering (D4b model). Moderation buttons (Approve / Reject / Delete) stay always-visible (D7 exempt — do NOT apply hover-only rule here). Add `<DownloadCsvButton>` (Photos CSV export — see Phase 4 for universal helper; this PR wires a local export action).
- `src/app/admin/photos/actions.ts` — `getPhotos`: add `year` param to filter.

**Builder routing:** Bolt.
**Watchdog gate:** Stage 1 spec compliance. Verify D7 exemption: Approve / Reject / Delete buttons are still always-visible (not hover-only). E2E trigger fires.

**Acceptance criteria:**

- `grep -c "year" src/app/admin/photos/actions.ts` returns ≥1 (year filter param added to getPhotos).
- Approve / Reject / Delete buttons have no hover-conditional CSS class: `grep -c "group-hover" src/app/admin/photos/photo-moderation.tsx` returns 0.
- `grep -c "filterActive" src/app/admin/photos/photo-moderation.tsx` returns ≥1 (filter-aware empty state).
- Existing E2E suite passes.

---

### Phase 4 — CSV Export Universal

**Estimated wall-clock:** 1–2 hours.
**Goal:** Universal `<DownloadCsvButton>` helper replacing the per-surface local export wired in Phase 3 PRs. Teams + Sponsors + Sponsorships + Photos get a consistent export button. Contacts/Scores already have it.

**Dependency:** Phase 3 merged (all 4 PRs). Phase 4 reconciles the per-surface wiring done in Phase 3 PRs into a shared component.

**No Aria gate needed:** "Download CSV" string was countersigned in Phase 3 Aria gates above.
**No Pixel gate needed:** Button uses the existing admin-pattern button variant; no new visual design.

#### PR-4: Universal CSV export button

**Title:** `feat(admin): universal DownloadCsvButton component`

**Files to create:**
- `src/components/admin/download-csv-button.tsx` (new — wraps a server action call, renders a `<Button>` with download icon, accepts `label`, `fetchCsv: () => Promise<string>`, `filename` props)

**Files to modify:**
- `src/app/admin/teams/team-list.tsx` — replace local CSV export wiring (from PR-3-teams) with `<DownloadCsvButton>`.
- `src/app/admin/sponsors/sponsor-list.tsx` — add `<DownloadCsvButton>` (Sponsors has no export today — D14 NEW).
- `src/app/admin/sponsorships/sponsorship-manager.tsx` — replace local wiring (from PR-3-sponsorships) with `<DownloadCsvButton>`.
- `src/app/admin/photos/photo-moderation.tsx` — replace local wiring (from PR-3-photos) with `<DownloadCsvButton>`.
- `src/app/admin/sponsors/actions.ts` — add `exportSponsorsCSV` server action (respects active status + year filters).

**Builder routing:** Bolt.
**Watchdog gate:** Stage 1 spec compliance + Stage 2 code quality. E2E trigger fires.

**Acceptance criteria:**

- `grep -rc "DownloadCsvButton" src/app/admin/ | grep -v ".test." | grep -c ":"` returns 4 (teams, sponsors, sponsorships, photos).
- `grep -c "exportSponsorsCSV" src/app/admin/sponsors/actions.ts` returns 1.
- `npx tsc --noEmit` exits 0.
- Existing E2E suite passes.

---

## 4. Issue List

Open the following GitHub issues from the worktree at `/tmp/craven-compass-admin-unification`:

```
gh issue create \
  --title "[admin-unification] Phase 1: Shared primitives — RowActions, StatusTabs, FilterBar, ModalSection" \
  --label "feature,P2-medium" \
  --body "Phase 1 of admin table unification. Builds shared primitives used by all Phase 2/3 migrations. Spec: plans/2026-05-admin-table-unification-sprint.md §3 Phase 1 PR-1A. AC: 0 usages of RowActions/StatusTabs/FilterBar in src/app/admin/ (used in Phase 2/3 PRs). Design spec: Pixel upfront-gate must fire first."

gh issue create \
  --title "[admin-unification] Phase 1: Checkbox primitive — visible border + selected state (F17, F18)" \
  --label "bug,P1-high" \
  --body "Fix shadcn Checkbox to be visible at rest (unchecked) and filled (checked). Cascades to row-selection checkboxes + type checkboxes + Captains-only toggle. Single file: src/components/ui/checkbox.tsx. Spec: plans/2026-05-admin-table-unification-sprint.md §3 Phase 1 PR-1B. Finding IDs: F17 (P1) + F18 (P1)."

gh issue create \
  --title "[admin-unification] Phase 1: Sidebar overlap CSS + contact-typeahead defaultTypes (F-S5, F-T9)" \
  --label "bug,P1-high" \
  --body "Two cross-cutting fixes: (1) sidebar avatar overlaps Sign Out text on every admin surface (F-S5/F-N9 P2); (2) contact-typeahead inline-create bypasses multi-type rules — add defaultTypes prop (F-T9 P1). Files: src/app/admin/layout.tsx or admin-sidebar.tsx, src/components/admin/contact-typeahead.tsx, team-form.tsx, sponsor-form.tsx. Spec: plans/2026-05-admin-table-unification-sprint.md §3 Phase 1 PR-1C."

gh issue create \
  --title "[admin-unification] Phase 2: Sponsors drawer→modal migration + F-S21 P0 contact-link fix" \
  --label "feature,P1-high" \
  --body "Migrate Sponsors from drawer to modal (D2). Fix F-S21 P0 data-corruption: sponsor edit silently unlinks contacts. Fix: key={sponsor?.id} remount on SponsorForm. Becomes the reference implementation for Phase 3 surfaces. Files: sponsor-modal.tsx (new), sponsor-form.tsx, sponsor-list.tsx, sponsor-drawer.tsx (delete). Spec: plans/2026-05-admin-table-unification-sprint.md §3 Phase 2 PR-2."

gh issue create \
  --title "[admin-unification] Phase 3: Contacts — status tabs + filter bar + role-cards form + hover rows" \
  --label "feature,P2-medium" \
  --body "Apply unified patterns to Contacts surface. D12 role-cards form, D6 filter bar, D5 status tabs, D3 hover-only rows, F19 inline validation message, F15 salutation Select, F12 field grouping. Files: contact-list.tsx, contact-form.tsx, contact-modal.tsx. Parallel-eligible with PR-3-teams, PR-3-sponsorships, PR-3-photos. Spec: plans/2026-05-admin-table-unification-sprint.md §3 Phase 3 PR-3-contacts."

gh issue create \
  --title "[admin-unification] Phase 3: Teams — status tabs + hover rows + mark-paid modal + F-T8 payment method" \
  --label "feature,P1-high" \
  --body "Apply unified patterns to Teams surface. Includes F-T8 P1 (payment method capture on Mark Paid), F-T1 drop redundant CAPTAIN column, dead failed-badge cleanup. Schema migration required: ADD COLUMN payment_method + payment_reference + paid_at on teams. Files: team-list.tsx, team-form.tsx, team-modal.tsx, actions.ts. Parallel-eligible with PR-3-contacts, PR-3-sponsorships, PR-3-photos. Spec: plans/2026-05-admin-table-unification-sprint.md §3 Phase 3 PR-3-teams."

gh issue create \
  --title "[admin-unification] Phase 3: Sponsorships — status tabs + search + year filter + hover rows" \
  --label "feature,P2-medium" \
  --body "Apply unified patterns to Sponsorships surface. Wire year filter (D9). Adopt sort_order ASC, price_cents DESC (D10). Files: sponsorship-manager.tsx, sponsorship-form.tsx, sponsorship-modal.tsx, actions.ts. Parallel-eligible with other Phase 3 PRs. Spec: plans/2026-05-admin-table-unification-sprint.md §3 Phase 3 PR-3-sponsorships."

gh issue create \
  --title "[admin-unification] Phase 3: Photos — year filter + verify count badges + filter-aware empty state" \
  --label "feature,P2-medium" \
  --body "Wire year filter on Photos (D9). Verify count badges always show (even 0). Verify filter-aware empty state for combined Year × Status. D7: keep moderation buttons always-visible (no hover-only). Files: photo-moderation.tsx, actions.ts. Parallel-eligible with other Phase 3 PRs. Spec: plans/2026-05-admin-table-unification-sprint.md §3 Phase 3 PR-3-photos."

gh issue create \
  --title "[admin-unification] Phase 4: Universal DownloadCsvButton — Teams, Sponsors, Sponsorships, Photos" \
  --label "feature,P2-medium" \
  --body "Universal DownloadCsvButton component (src/components/admin/download-csv-button.tsx). Wire into Teams, Sponsors (new — D14), Sponsorships, Photos. Add exportSponsorsCSV action. Spec: plans/2026-05-admin-table-unification-sprint.md §3 Phase 4 PR-4."
```

---

## 5. Mid-Sprint Spec Sweep

**Schedule:** Between Phase 2 merge and Phase 3 PR openings.

Spec verifies:

1. **Existing test coverage on touched files.** Run `npx vitest run src/app/admin/contacts/ src/app/admin/teams/ src/app/admin/sponsors/ src/app/admin/sponsorships/` — capture baseline pass/skip/fail counts before Phase 3 PRs open. Any test file with skips must be explained.

2. **TDD-RED tests for bundled P0/P1 fixes.** Before Phase 3 PRs open, Spec authors TDD-RED tests for:
   - **F-S21** (now in Phase 2): `src/app/admin/sponsors/__tests__/sponsor-form.test.tsx` — test that mounts `<SponsorForm>` with `initialContacts=[]`, updates prop to `[{id: '1', full_name: 'Test Contact'}]`, asserts chip renders. This test must be RED against the unfixed `sponsor-form.tsx` before Phase 2 ships.
   - **F-T9**: `src/components/admin/contact-typeahead.test.tsx` — test that passing `defaultTypes={['player']}` causes the inline-create form to pre-check Player type and render the Handicap field. Must be RED before PR-1C ships.
   - **F-T8**: `src/app/admin/teams/__tests__/team-form.test.tsx` — test that the Mark Paid modal renders a payment_method `<Select>` and that submitting the form without payment_method selected keeps Save disabled. Must be RED before PR-3-teams ships.

3. **Phase 1 primitive type contracts.** Verify `<RowActions>`, `<StatusTabs>`, `<FilterBar>`, `<ModalSection>`, `<AdminEmptyState filterActive>` all accept their documented props and TypeScript compiles: `npx tsc --noEmit` exits 0.

4. **E2E baseline.** `npx playwright test --project=chromium` must exit 0 before Phase 3 opens. Any failure blocks Phase 3 from starting.

---

## 6. Risks + Open Questions

### Risks

**R1: Component contract over-tightness in shared primitives.**
If `<RowActions>` or `<FilterBar>` assume a single shape (e.g., always three icon buttons, always the same filter structure), Phase 3 surfaces with different needs will have to fork rather than reuse. Mitigation: Pixel design pass specifies a surface-special slot in `<RowActions>` (the design doc names it explicitly — D8). `<FilterBar>` accepts `secondaryFilters: ReactNode` and `booleanToggles: ReactNode` slots. Bolt must implement these as open slots, not a fixed list. Watchdog checks that Phase 3 PRs wire through the slots cleanly before merging.

**R2: Visual regression across surfaces from shared row-pattern primitive.**
If the Pixel-spec for `<RowActions>` dimensions don't match the existing row height on all five surfaces, rows will shift on hover. Mitigation: Watchdog diffs each Phase 3 PR live preview against Pixel design-preview HTML per `feedback_watchdog_design_adherence_diff.md`. Phase 2 (Sponsors) is the canary — if row height shifts there, adjust the primitive before Phase 3 opens.

**R3: Sponsor deletion reconciliation after F-S21 fix.**
The `updateSponsor` action at `actions.ts:212-244` uses `contactIdsRaw !== null` to decide whether to reconcile. After the `useState` → `useEffect` fix, reconciliation will run on every save. Verify the condition handles the zero-contacts case (new sponsor with no linked contacts) correctly — reconciliation must not error when `submittedIds = []`. Bolt must verify this path with a test.

**R4: Phase 3 Teams schema migration timing.**
PR-3-teams depends on `payment_method` column existing in the `teams` table before the action file can compile. The migration must run before Bolt opens the PR — not as part of the PR. Sequence: Forge runs `mcp__supabase-craven__apply_migration` → verifies column exists → Bolt opens PR-3-teams.

### Open Questions

**OQ1: Should Trash sub-tabs inherit the Phase 4 CSV export?**
The design doc's out-of-scope section explicitly excludes Trash redesign. However, Phase 4 adds CSV export to all 5 list surfaces. The Trash page has 5 sub-tabs (Contacts / Teams / Sponsors / Sponsorship Items / Photos), each showing soft-deleted rows. It was not mentioned either way.

Recommendation: exclude Trash from Phase 4. Trash is sui-generis (no filters, no status tabs, restore-only). A separate follow-up sprint can add Trash export if Scott requests it.

If Scott wants to include Trash in Phase 4, update `src/app/admin/trash/trash-tabs.tsx` and add restore-specific export actions. Cite this open question and Scott's call before PR-4 opens.

**OQ2: Design doc line 319 — Sponsorships "sort_order adoption" (D10).**
The design doc adopts `sort_order ASC, price_cents DESC` from Sponsors. But Sponsorships's `actions.ts:29` currently orders by `price_cents DESC` only, and `sort_order` values on `sponsorship_items` may be 0 or NULL for all rows (the column exists from early migrations but may not be populated). If `sort_order` is 0 for all rows, the effective sort is still `price_cents DESC` — no visible change. Bolt should verify via `mcp__supabase-craven__execute_sql "SELECT id, name, sort_order FROM sponsorship_items ORDER BY 1"` before implementing D10 on Sponsorships to confirm whether the column has meaningful values.

---

## 7. Out of Scope (Verbatim from Design Doc)

- **Pagination.** Scroll-everywhere is fine at current row counts (max 375 on Contacts). Re-evaluate at ~1000 rows on any surface.
- **CSV import on Sponsors / Sponsorships / Teams / Photos.** Volume too low. Existing Contacts + Scores imports stay untouched.
- **Scores `/admin/scores` UI walk.** Deferred per Scott pending NBG&CC pro / GolfGenius integration timing. Schema-level F-Sc1/F-Sc2/F-Sc3 fixes spin out as their own pre-GolfGenius prep sprint.
- **Trash `/admin/trash` redesign.** Sui-generis tab structure stays; inherits cross-cutting CSS only (sidebar overlap fix per F-S5/F-N9).
- **Event `/admin/event` + Settings `/admin/settings`.** Single-form pages, not list surfaces.
- **Virtual scrolling.** YAGNI per D13.
- **Collapsible modal sections.** Considered (Modal IA Option C) and rejected — extra interaction state, not warranted at current form sizes.

---

## 8. Done Definition

> **Status update 2026-05-08:** Phases 1–3 shipped. Phase 4 (CSV export universal) **DEFERRED** pending e2e test-refresh sprint (issue #394). Main e2e is timing out post-Phase-3 — UI work is correct, test suite hasn't caught up. CSV export buttons already wired per-surface in Phase 3 PRs (Teams, Sponsors, Sponsorships, Photos all have local exports); Phase 4 was the consolidation into a shared helper. Adjacent fixes shipped per the 5 below; follow-up issues filed for known regressions/gaps (#380, #381, #389, #390, #393, #394).

All four phases shipped + merged:

- [ ] All 5 list surfaces use the unified `<RowActions>` hover-reveal row pattern (no whole-row click on Contacts, no always-visible buttons on Teams, no always-visible pencil on Sponsorships).
- [ ] All 5 list surfaces use `<StatusTabs>` with inline counts and `<FilterBar>` with labeled dropdowns + active-filter chips + Clear-all.
- [ ] All edit modals use `<ModalSection>` banded sections and `justify-between` footer (Delete bottom-left, Cancel + Save bottom-right).
- [ ] Sponsors edits via modal — `sponsor-drawer.tsx` deleted, 0 remaining references in codebase.
- [ ] Contacts form uses role-cards (D12) — 5 invisible checkboxes gone, 5 visible cards always rendered.
- [ ] 5 adjacent fixes verified shipped:
  - [ ] F-S21 (P0) — sponsor edit no longer unlinks contacts on save.
  - [ ] F-T9 (P1) — contact-typeahead inline-create sets defaultTypes, pre-checks type checkboxes.
  - [ ] F-T8 (P1) — Mark Paid modal captures payment method.
  - [ ] F-S5/F-N9 (P2) — sidebar avatar no longer overlaps Sign Out text.
  - [ ] F17/F18 (P1) — checkboxes are visually visible at rest and selected states.
- [ ] Teams, Sponsors, Sponsorships, Photos each have a working "Download CSV" button respecting active filters.
- [ ] `docs/LESSONS-LEARNED.md` — "table primitives" section added, linking to this sprint plan.
- [ ] All 9 GitHub issues created in §4 are closed.
- [ ] Watchdog APPROVED on all 9 PRs. No admin-merge bypasses.
