# Admin Portal UAT — 2026-05

> **Purpose:** Walk every admin surface end-to-end, verify it does what it claims, document findings as a single source of truth.
> **Started:** 2026-05-03
> **Status:** Phase 0 (inventory) complete. Phase 1 (walk-through) in progress.
> **Format:** Inventory snapshot first, then per-surface deep dive. Findings recorded inline as Scott walks each screen.
> **Sprint formulation:** Deferred. Findings carry severity + proposed fix scope. Inline sprint references (e.g., "S40", "S41") are provisional placeholders only — actual sprint bundling happens during post-UAT triage when we can see the full finding set and cluster by file/specialist/risk. Don't take inline sprint numbers as commitments.

---

## Phase 0 — Inventory snapshot (Forge initial pass)

### Sidebar navigation structure (top to bottom — the order Scott will see)

| Group | Item | Route |
|---|---|---|
| **Overview** | Dashboard | `/admin` |
| **People** | Contacts | `/admin/contacts` |
| | Registrations (Teams) | `/admin/teams` |
| **Revenue** | Sponsors | `/admin/sponsors` |
| | Sponsorships | `/admin/sponsorships` |
| **Event Day** | Photos | `/admin/photos` |
| | Scores | `/admin/scores` |
| **Setup** | Event | `/admin/event` |
| | Settings | `/admin/settings` |
| | Trash | `/admin/trash` |

10 admin surfaces total. Plus 1 sub-route: `/admin/contacts/import` (CSV importer).

### Cross-cutting infrastructure

**Auth gate:** Every admin server action calls `requireAdmin()` from `@/lib/supabase/admin`. Role check is two-tier — `admin` (full read/write) and `viewer` (read-only). Both check via Postgres RLS functions `is_admin()` / `is_admin_or_viewer()`.

**Database:** 14 tables in `public` schema, all RLS-enabled. Active-only views (`contacts_active`, `teams_active`, `sponsors_active`, `sponsorship_items_active`, `photos_active`) are the soft-delete-aware reads — admin lists query views, mutations target base tables. Stripe events go to `stripe_events`. Email log to `email_log`.

**Soft-delete invariant:** No hard-delete UI for contacts/teams/sponsors/sponsorship_items/photos. Trash is forever-archive. Restoration via `/admin/trash`. (Project profile invariant.)

**Edge functions:** **NONE.** ⚠ The project profile lists `stripe-webhook` as the active Supabase edge function — that's stale. The Stripe webhook is actually a Next.js API route at `src/app/api/webhooks/stripe/route.ts`. The `supabase/functions/` directory does not exist locally; the deploy workflow gracefully skips. **Profile update needed at end of UAT.**

**API routes touched by admin:** `/api/invite` (Settings → invite-form POST), `/api/contacts` (CSV importer? — verify), `/api/upload-photo` (public upload path used by Photos moderation queue). Other API routes (`/api/checkout`, `/api/invite/accept`, `/api/webhooks/stripe`) are public-facing.

**RLS policy pattern (verified via pg_policies query 2026-05-03):**
- Internal tables (contacts, teams, team_members, sponsor_contacts, scores, photos, profiles, invitations, email_log): `is_admin()` for ALL, `is_admin_or_viewer()` for SELECT
- Public-readable tables (event_settings, sponsors, sponsorship_items): SELECT `true` (anyone), ALL `is_admin()`
- Public INSERT allowed: photos (anyone uploads), sponsorship_purchases (anyone buys), teams (anyone registers)
- Special: scores SELECT `true`, photos approved-only SELECT `true`

### E2E coverage matrix (15 specs, 4 surfaces covered)

| Surface | E2E coverage | Spec files |
|---|---|---|
| Contacts | ✅ Comprehensive (8 specs) | contact-create-edit, contact-multi-type, contact-soft-delete-restore, contact-bulk-delete, contact-bulk-subscribe, contact-bulk-blocked-alert, contact-type-removal-guard, unique-email-after-softdelete |
| Teams | ✅ Good (3 specs) | team-create-edit, team-delete-type-to-confirm, team-deleted-member-placeholder |
| Scores | 🟡 Light (1 spec) | score-create-edit |
| Trash | 🟡 Indirect | covered via contact-soft-delete-restore |
| **Sponsors** | ❌ **NONE** | — |
| **Sponsorships** | ❌ **NONE** | — |
| **Photos** | ❌ **NONE** | — |
| **Event settings** | ❌ **NONE** | — |
| **Dashboard** | ❌ NONE | — |
| **Settings (invitations)** | ❌ NONE | — |
| **Contacts CSV import** | ❌ NONE | — |

**Architectural finding:** 6 of 10 admin surfaces have zero E2E coverage. Worth a series of test-coverage sprints after UAT identifies critical bugs.

---

## Per-surface deep dive

### 1. Dashboard — `/admin`

**Files:**
- Route: `src/app/admin/page.tsx`
- Server actions: `src/app/admin/dashboard-actions.ts` (1 fn — `getDashboardStats`)

**What it does:**
6 stat cards linking to deeper screens — Registrations (teams count for current year), Sponsors (active count), Revenue (total `amount_paid_cents`), Pending Photos, Contacts (total active), Scores (current year).

**Tables read:** `teams_active`, `sponsors_active`, `photos`, `contacts_active`, `scores`

**Workflows to UAT:**
- W1.1 Page loads without error
- W1.2 All 6 stat values are present (no NaN, no "—")
- W1.3 Each card click navigates to the correct deeper screen
- W1.4 Numbers reconcile against actual DB counts (e.g., Contacts card shows 913 to match `contacts_active` row count today)
- W1.5 Revenue formats as USD with no decimals
- W1.6 Year filtering — Registrations + Scores are current-year-only; verify what "current year" means (server clock vs event year)

**E2E coverage:** ❌ None. Worth a smoke test at minimum.

**UAT status:** Pending walk-through.

**Findings:**

- ✅ **W1.1 page loads cleanly** — no errors, no spinners stuck, all 6 cards render
- ✅ **W1.2 stat values render** — Registrations 1, Sponsors 11, Revenue $0, Pending Photos 0, Contacts 717, Scores 0
- ✅ **W1.5 Revenue formats as USD with no decimals** (`$0`)
- ✅ **F1 Sponsor count reconciliation verified.** Dashboard says 11 active sponsors; base `sponsors` table has 15 rows. SQL confirmed: 11 not-in-Trash + 4 soft-deleted. Math checks out. Scott confirmed the 4 in Trash are intentional (cleaned test data). Cross-check during W10.1 — Trash → Sponsors tab should show those 4 rows.
- 🔴 **F2 Revenue card under-counts.** P1. Dashboard Revenue card sums ONLY `sponsors.amount_paid_cents` — which is only the manually-logged check/cash payments. It misses two whole categories of real revenue:
  - **Stripe sponsor payments** → webhook writes to `sponsorship_purchases.amount_paid_cents`, never updates parent `sponsors.amount_paid_cents`. Confirmed at `src/app/api/webhooks/stripe/route.ts:184-191`.
  - **Team registration Stripe payments** → webhook writes to `teams.amount_paid_cents` at `route.ts:131-139`, but Dashboard query at `src/app/admin/dashboard-actions.ts` never reads `teams` for revenue.

  **Scott's intent (confirmed):** Revenue should be a single number aggregating ALL collected revenue regardless of source — Stripe + check + cash. Stripe auto-flows; check/cash gets manually logged.

  **Fix path — Option A (webhook updates parent + dashboard reads teams):**
  - **A.1** — `src/app/api/webhooks/stripe/route.ts` `type === "sponsorship"` branch: in addition to updating `sponsorship_purchases`, sum-update parent `sponsors.amount_paid_cents` (cumulative if multiple purchases against the same sponsor). Treat the sponsor row as canonical "total this sponsor paid" across all purchase channels.
  - **A.2** — `src/app/admin/dashboard-actions.ts`: extend `getDashboardStats` to also sum `teams_active.amount_paid_cents` for current year and add to the Revenue total.
  - **Test plan:** TDD-RED simulating a sponsorship purchase webhook event then asserting `sponsors.amount_paid_cents` is set; e2e against the dashboard with seed data covering all 3 payment surfaces.

  **Sprint candidate:** S40 or S41 (after UAT findings triage). Material to admin decision-making — under-counted revenue = wrong calls.
- 🟡 **F3 Year filter inconsistency on Dashboard cards.** P3 today, P1 the moment multi-year sponsor data exists. Currently:

  | Card | Year filter? | Source |
  |---|---|---|
  | Registrations | ✅ current year | `teams_active.year = currentYear` |
  | Sponsors | ❌ all-time | `sponsors_active` (no `.eq("year", ...)`) |
  | Revenue | ❌ all-time | sums across all years |
  | Pending Photos | ❌ all-time | photos queue is year-agnostic by design — keep |
  | Contacts | ❌ all-time | contacts are person-level, year-agnostic — keep |
  | Scores | ✅ current year | `scores.year = currentYear` |

  Dormant today because all 15 sponsors in DB are `year = 2026`. The bug becomes visible the moment 2027 sponsors are added while 2026 sponsors are still marked `is_active = true` (likely for tribute-wall / past-sponsor public display).

  **Fix path:** Add `.eq("year", currentYear)` to Dashboard Sponsors card query AND apply year filter consistently across the unified Revenue calculation in F2.

  **Bundle with F2.** Both touch `src/app/admin/dashboard-actions.ts`. Single sprint covers both.

  **Combined sprint scope (S40 candidate):**
  - **A.1** — webhook sums sponsorship_purchases into parent `sponsors.amount_paid_cents`
  - **A.2** — dashboard Revenue card sums `sponsors_active + sponsorship_purchases (paid) + teams_active (paid)`, all year-filtered to current year
  - **A.3** — dashboard Sponsors card adds `.eq("year", currentYear)` filter
  - Test plan: TDD-RED for the webhook update; e2e Playwright covering dashboard with seed data across all 3 payment surfaces and 2 year cohorts.
- ✅ **F4 Sidebar Setup group visibility — verified non-issue.** Screenshot showed Setup label at bottom with items cut off. Scott confirmed sidebar scrolls cleanly to reveal Event / Settings / Trash. No bug.
- ✅ **W1.3 all 6 cards navigate to correct deeper screens.** Verified by Scott click-through.

**UAT status: COMPLETE.** 6 of 6 W-numbered workflows checked. 4 findings logged: F1 (verified), F2 (P1 bug → S40), F3 (P3 now / P1 later → S40), F4 (verified non-issue). Surface ready for triage; F2+F3 bundled as single S40 sprint candidate.

---

### Critical findings discovered before formal walk-through

- 🔴 **F5 E2E test data polluting PROD contacts table.** **P0.** Resolved 2026-05-03.
  - Discovered when Scott opened `/admin/contacts` and saw a list dominated by names like `UniqueFirst Repl<hex>`, `Handicap Boundary`, `PaperSpan RoundReg`, etc.
  - Root cause: e2e tests run against PROD (per craven invariant — "no staging — intentional") and never clean up after themselves. S33 retro flagged this but no cleanup was automated.
  - Quantified: 537 e2e-pattern rows (342 active + 195 in Trash) of 913 total = **48% of the table was test garbage.** Plus 1 missed-by-first-regex (`bulk-del-*` lowercase pattern).
  - Cascade rows: zero — no team_members, no sponsor_contacts, no teams.captain_contact_id linked. Safe hard-delete.
  - Action taken: Forge composed `DELETE FROM contacts WHERE <e2e-patterns>`. Scott executed in Supabase Studio (MCP write-mode disabled for project — defense-in-depth on PROD). Verified post-state: contacts_total 913 → 376; contacts_active 717 → 375; contacts_in_trash 196 → 1 (1 leftover from a different naming pattern, follow-up small DELETE).
  - Side effect: the previously-flagged "18 contacts with empty `types[]`" finding is RESOLVED — all 18 were e2e. Real data has zero empty-types.
  - Cross-reference: see Sprint 33 daily note 2026-04 "specs write to PROD (no staging by design); orphan contacts may need a cleanup SQL after."

- 🔴 **F6 Prevent recurrence — Playwright global teardown.** **P0.** Sprint candidate.
  - Without prevention, the next CI run re-pollutes the contacts table.
  - Implementation: add `tests/e2e/global-teardown.ts` that runs after the suite, deletes any contact whose email or full_name matches the e2e patterns. Wire via `playwright.config.ts` `globalTeardown:` option.
  - **Pre-implementation work:** grep all `tests/e2e/*.spec.ts` to enumerate every test-data naming convention currently in use. The first cleanup regex missed the lowercase `bulk-del-*` pattern. Teardown must catch every convention or it's worthless.
  - Auth: teardown needs the test admin's service role to permit DELETE under RLS. Should already have it (test admin must be in `is_admin()` group to create rows in the first place).
  - Test plan: TDD-RED — write a teardown spec that creates 5 e2e contacts then asserts they're gone after teardown runs.
  - Sprint candidate: **S40 alongside F2/F3 dashboard fixes** OR its own tiny S40-prep sprint. ~1-2 hours Spec.

- 🟡 **F7 (Q1) Profiles table has 1 e2e-pattern match.** P3 to-investigate.
  - One of the 2 `profiles` rows matches test-pattern detection (`@example.com` / Test/E2E/Spec name).
  - Likely the test admin user used by Playwright auth fixture. Probably load-bearing — DO NOT delete blindly.
  - Action: confirm identity during W9 walk-through (Settings — invitations).

- 🟡 **F8 (Q2) Two sponsor rows in Trash with placeholder name `(Shot of the Day — rename)`.** P3 to-investigate.
  - Suggests a sponsor-rename flow that soft-deletes the old row and creates a new one with the new name (rather than UPDATE-in-place). That's a workflow worth understanding — silent data fragmentation if it's a real pattern. Two more legitimate-looking sponsors in Trash too: "Richard & Cathy", "Tony Tresie."
  - Action: address during W4 walk-through (Sponsors).

---

### 2. Contacts — `/admin/contacts`

**Files:**
- Route: `src/app/admin/contacts/page.tsx`
- Components: `contact-list.tsx`, `contact-form.tsx`, `contact-modal.tsx`
- Server actions: `src/app/admin/contacts/actions.ts` (11 fns)
- Sub-route: `/admin/contacts/import` → `import/page.tsx` + `import/import-client.tsx` + `import-actions.ts` (2 fns: previewImport, commitImport)

**Server actions (11 + 2):**
- Read: `getContacts`, `exportContactsCSV`, `getTeamsForFilter`
- Single-row write: `createContact`, `updateContact`, `deleteContact`
- Bulk: `bulkUpdateContacts`, `bulkDeleteContacts`, `bulkSetContactTypes`, `bulkAddContactType`, `bulkRemoveContactType`
- Import: `previewImport`, `commitImport`

**Tables:** `contacts_active`, `contacts`, `team_members`, `teams`, `sponsor_contacts`

**Forms / dialogs:**
- ContactForm (centered modal, ~800px) — Sprint 31 multi-type contact editor (Player/Sponsor/Donor/Volunteer/Other checkboxes; type-gated fields for Handicap, Shirt Size, Tribute toggle, Recognition Name)
- ContactModal — wrapper around ContactForm
- Bulk action bar with Set/Add/Remove type Selects
- Inline blocked-row Alert when bulk type-removal hits team-member or sponsor-link safety rules
- 500-contact bulk-action cap (renders "Select 500 or fewer..." banner over-cap)

**Workflows to UAT:**
- W2.1 List loads with stacked-chip rendering per contact (Player teal, Sponsor purple, Donor green, Volunteer amber, Other gray, in canonical order)
- W2.2 Filters: Type filter, Consent filter (Subscribed/Unsubscribed/All), Team filter, Captains-only toggle
- W2.3 Search across name/email/phone
- W2.4 Single-row create via modal — all 5 type checkboxes work, type-gated fields appear, save disabled until ≥1 type checked
- W2.5 Single-row edit via row click — modal opens prefilled, fields editable, save persists
- W2.6 Single-row delete (soft-delete; goes to Trash, not gone)
- W2.7 Bulk: select rows → bulk bar appears → Set / Add / Remove type → server action runs → blocked-row Alert renders for safety-blocked rows
- W2.8 Bulk delete (soft)
- W2.9 Bulk subscribe / unsubscribe
- W2.10 CSV export (filtered or all)
- W2.11 Sprint 38 fix verification: type bad handicap → blur → uncheck Player → submit re-enables
- W2.12 Captain-only filter shows only contacts who are captains in `team_members`
- W2.13 Team filter shows only contacts in selected team
- W2.14 Pagination / scroll behavior at 913 rows
- W2.15 The Sprint 39 race-condition fix is invisible to admins but worth confirming team-filter → checkbox interactions feel snappy

**Sub-flow: CSV Import (`/admin/contacts/import`)**
- W2.16 CSV upload → preview shows new vs duplicate rows
- W2.17 Per-row type override + checkbox to include/exclude
- W2.18 Commit → success state with counts

**E2E coverage:** ✅ Comprehensive — 8 specs cover create/edit, multi-type, soft-delete-restore, bulk ops (delete/subscribe/blocked-alert), type-removal guard, unique-email-after-softdelete

**UAT status:** Pending walk-through.

**Findings:**
- _(populated as we walk through)_

---

### 3. Registrations / Teams — `/admin/teams`

**Files:**
- Route: `src/app/admin/teams/page.tsx`
- Components: `team-list.tsx`, `team-form.tsx`, `team-modal.tsx`
- Server actions: `src/app/admin/teams/actions.ts` (7 fns + 1 RPC)

**Server actions (7 + 1 RPC):**
- Read: `getTeams`, `searchContacts`, `getScoreCount`
- Write: `createTeam`, `updateTeamMembers`, `deleteTeam`, `markTeamPaid`
- RPC: `register_team` (4-param: session, captain_name, captain_email, captain_phone — captain params vestigial back-compat per project profile)

**Tables:** `teams_active`, `teams`, `team_members`, `contacts`, `profiles`, `scores`

**Workflows to UAT:**
- W3.1 List loads with team identity = captain's full name (per `feedback_craven_team_display_rule`; canonical placeholders `(no captain)` / `(no team)`)
- W3.2 Year filter
- W3.3 Create team — captain selection from contact search, member additions
- W3.4 Edit team members — add/remove via contact search
- W3.5 Delete team — soft-delete-to-Trash. Type-to-confirm gated behind paid status (`requiresTypeConfirm = isPaid` at `team-list.tsx:155`). Pending teams get a simple Cancel/Delete confirm; paid teams get the type-the-team-name input (per S35 #336).
- W3.6 Mark team paid (registration fee)
- W3.7 Score count surfaces correctly per team
- W3.8 Deleted member placeholder rendering (per S35 #338 — RSC display data via prop, not useState)
- W3.9 Team identity always derived via `teams.captain_contact_id → contacts` JOIN (no `team_name` column since Sprint 32)

**E2E coverage:** ✅ 3 specs cover create/edit, type-to-confirm delete, deleted-member placeholder

**UAT status:** SUBSTANTIALLY COMPLETE (2026-05-04). 5 of 9 W-numbered workflows verified at runtime; 1 (W3.5) verified by code-inspection of the unpaid-team gating; 1 (W3.7) verified by code-inspection (functional verification deferred — DB has 0 scores today); 1 (W3.8) deferred — untestable today (no soft-deleted team-member exists in DB).

**Findings:**

- ✅ **W3.1 list loads cleanly.** Captain name renders as team identity (`feedback_craven_team_display_rule` invariant holds). Badges correct: MORNING session (gray uppercase), Pending payment (amber), 3 open slots (amber). Members count `1/4`.
- ✅ **W3.4 edit modal verified.** Editable fields: Session dropdown, Captain (with X to clear), Player 2/3/4 search by name/email. Save Team + Cancel + Delete team all present.
- ✅ **W3.5 partial — soft-delete confirm dialog correct on unpaid team.** Helper copy clean: "Members: 1/4 · Captain: Scott Davenport" + "The team will be moved to Trash. You can restore from Admin → Trash later." Type-to-confirm IS wired (`team-list.tsx:155` → `requiresTypeConfirm = isPaid`) but only triggers for paid teams; the only team in DB today is `Pending`, so the type-the-team-name input was correctly NOT shown. Trust e2e spec (`tests/e2e/team-delete-type-to-confirm.spec.ts`) for paid-team coverage.
- ✅ **W3.7 wiring verified by code-inspection.** Score count fetched in delete-confirm dialog only (`team-list.tsx:163-174` via `getScoreCount`). Functional verification deferred (DB has 0 scores).
- ⏸ **W3.8 deleted-member placeholder — untestable today.** Requires a soft-deleted team-member contact who appears in a team's member list. None exist. Re-verify when first deletion-with-team-membership occurs OR rely on e2e spec (`tests/e2e/team-deleted-member-placeholder.spec.ts`) for coverage.

- 🟡 **F-T1 TEAM and CAPTAIN columns are redundant.** P2.
  - Both columns always display the same string since Sprint 32 (team identity = captain name per `feedback_craven_team_display_rule`). Wasted horizontal real estate.
  - **Fix (per Scott — locked):** drop the CAPTAIN column entirely. Optionally repurpose the freed space for captain phone/email — admin's most-frequent need is contacting captain (surfaces during Mark-Paid + Edit flows).
  - **Files touched:** `src/app/admin/teams/team-list.tsx` (column definition).
  - **Bundle hint:** sits with other Teams list-UX work (F-T4, F-T5).

- 🟡 **F-T2 Edit/New Team modal layout inconsistent with Contacts edit.** P2.
  - Teams modal = flat field list, no section bands. Contacts modal (per F12 redesign target) = banded sections (Identity / Contact / Classification / Address / Notes).
  - **Fix:** apply the same Pixel banding pattern to Teams modal — Session + Captain in one band, Players 2-4 in another.
  - **Files touched:** `src/app/admin/teams/team-form.tsx`, `team-modal.tsx`.
  - **Bundle hint:** admin form-consistency sprint with F12/F13/F17/F19 + F-T6/F-T7/F-T8/F-T9.

- 🟡 **F-T3 Edit Team modal footer split is awkward.** P2.
  - Save Team + Cancel sit in one strip (left-aligned, mid-modal); Delete team sits in a separate bottom-right strip outside the form area. Two visually disjoint footers.
  - **Fix:** consolidate to one footer with `justify-between`: `[Delete team] ←─→ [Cancel] [Save Team]`. Same pattern as F13.a (Contacts).
  - **Files touched:** `src/app/admin/teams/team-form.tsx` or `team-modal.tsx`.
  - **Bundle hint:** cross-cutting destructive-button-placement sprint (F13.a + F-T3 + F-T6 same fix family).

- 🔴 **F-T4 Cross-cutting — hover-only row controls.** P2 cross-cutting. **Locked by Scott.**
  - Today: Contacts has always-visible row checkboxes (cluttered); Teams has always-visible Edit + Mark Paid buttons (cluttered). Both wrong per the new pattern.
  - **Locked pattern:** per-row checkboxes + action buttons appear on row hover only, hidden at rest. Single Pixel pattern → cascades across all admin list components.
  - Add **Delete** to the hover-row action set on Teams (today only inside Edit modal — admin can't delete from the row).
  - **Files touched:** `src/app/admin/contacts/contact-list.tsx`, `src/app/admin/teams/team-list.tsx`, future Sponsors/Sponsorships/Photos/Scores list components when they get the same pattern.
  - **Sprint candidate:** standalone cross-cutting list-UX sprint.

- 🔴 **F-T5 Cross-cutting — standardize row click behavior.** P2 cross-cutting. **Locked by Scott.**
  - Contacts = whole-row click opens edit. Teams = dedicated buttons, no row click. Inconsistent.
  - **Locked decision:** dedicated buttons (visible on hover per F-T4). Drop the whole-row click affordance on Contacts.
  - **Bundle hint:** same sprint as F-T4.

- 🟡 **F-T6 Delete confirm — Cancel and Delete buttons are right-clustered adjacent.** P2.
  - Same destructive-separation risk as F13.a (Contacts) / F-T3 (Edit modal). Today: `[Cancel] [Delete]` ~1cm apart, mis-click risk.
  - **Fix:** `justify-between` → `[Delete] ←─→ [Cancel]`.
  - **Files touched:** delete confirm dialog (likely inline in `team-list.tsx` or a `DeleteTeamDialog` component).
  - **Bundle hint:** cross-cutting destructive-placement (F13.a + F-T3 + F-T6 same sprint).

- 🟡 **F-T7 Mark Paid is inline form, should be modal.** P2.
  - Today: clicking Mark Paid replaces the row's actions area with an inline `Amount paid ($) [700] Confirm Cancel` form below the row. Causes layout shift, no focus management, breaks the dialog pattern that Edit + Delete already use.
  - **Fix:** modal centered on screen, focus trap, ESC to dismiss — same pattern as Edit + Delete dialogs.
  - **Files touched:** `src/app/admin/teams/team-list.tsx` (replace `MarkPaidForm` inline with modal-wrapped variant).
  - **Bundle hint:** admin form-consistency sprint with F-T2/F-T8.

- 🔴 **F-T8 Mark Paid lacks payment method capture.** P1.
  - Today: only collects $ amount. Schema doesn't track HOW the team paid (`teams.payment_method` doesn't exist; `teams.payment_status` exists with `paid/pending/failed/comped` but no source attribution).
  - **Foundational for F2 unified revenue source-of-truth.** If `teams.amount_paid_cents` is supposed to aggregate ALL channels per team (per F2 fix path), we need source attribution.
  - **Modal redesign (couples with F-T7):**
    - Amount paid (required, dollars input)
    - Payment method (required Select): Check / Cash / Venmo / Zelle / Wire / Comped / Stripe / Other
    - Reference number (optional, shown when method = Check or Wire)
    - Date paid (optional, default today)
  - **Schema work:** `ALTER TABLE teams ADD COLUMN payment_method text NULL`. Stripe webhook auto-sets `'stripe'`; manual Mark-Paid logger sets the chosen method. Symmetric work on `sponsors.payment_method` per F2 (sponsors webhook + manual log paths share the same gap).
  - **Sprint candidate: S40** — bundles cleanly with F2/F3 dashboard revenue work since both touch the revenue source-of-truth model.

- 🔴 **F-T9 Inline contact-create from Team form is a stub — bypasses Sprint 31 multi-type rules.** P1.
  - **Trigger:** typing a non-matching name in Player 2/3/4 search (or Captain search) reveals an inline "New Contact" form. Today captures only First/Last/Email/Phone (+ Cancel/Create Contact buttons).
  - **Bypass:** no type checkboxes, no type-gated fields. Anyone created via the team flow IS implicitly a Player (literally being added as one) but the form never sets `types: ['player']` and never asks for handicap or shirt size.
  - **Data-quality cascade:**
    - F18 bulk-action gate (no-types-checked invariant) flips them malformed post-create
    - Handicap-driven leaderboard/scoring logic gets NULL handicaps for tournament players
    - Sprint 31 invariant ("≥1 type required to save") silently bypassed via the team-creation backdoor
  - **Fix path (Option B — smart partial, recommended):**
    - Auto-apply `types: ['player']` since team-creation context implies it
    - Show Player-gated fields inline: Handicap (number), Shirt Size (S/M/L/XL/XXL), Recognition Name (whatever S31 wired for Player)
    - Title becomes "New Player" not "New Contact" — Aria gate (type is implicit, copy should reflect)
  - **Audit symmetric flows:** Sponsor → linkSponsorContact backdoor likely exists too. Verify during Section 4 walk and add F-S? finding if confirmed.
  - **Files touched:** wherever the inline NewContact form lives (likely embedded in `src/app/admin/teams/team-form.tsx`); audit `src/app/admin/sponsors/sponsor-drawer.tsx` for the same pattern.
  - **Sprint candidate: S40** (data-integrity cluster — F2/F3/F-T8/F-T9 all share the "single source of truth + don't accept malformed records" theme).

- 💡 **F-T10 (defer) — No year picker UI on Teams page.** P3.
  - Subtitle locks scope to current year ("Build and manage golf teams for the current year"). No control to view past years' rosters.
  - Non-issue today (only 2026 data exists). Becomes useful when annual tournament has 2+ years of historical data — returning teams, donor history.
  - **Action:** revisit in 2027.

---

### Teams surface — UAT status

**SUBSTANTIALLY COMPLETE (2026-05-04).** 7 of 9 W-numbered workflows verified or wiring-verified. W3.7 (score count) and W3.8 (deleted-member placeholder) functional verification deferred until DB state supports it.

**Findings on this surface:** F-T1, F-T2, F-T3, F-T4, F-T5, F-T6, F-T7, F-T8, F-T9, F-T10. **10 distinct findings.** Single highest-leverage cluster: **F-T4 + F-T5 cross-cutting hover-only row controls** (cascades across every admin list surface). Single highest-priority data-integrity finding: **F-T9 inline contact-create stub** (silently produces malformed Player records via team-creation backdoor) — bundle with F2/F3/F-T8 in S40.

---

### 4. Sponsors — `/admin/sponsors`

**Files:**
- Route: `src/app/admin/sponsors/page.tsx`
- Components: `sponsor-list.tsx`, `sponsor-form.tsx`, `sponsor-drawer.tsx`
- Server actions: `src/app/admin/sponsors/actions.ts` (10 fns)

**Server actions (10):**
- Read: `getSponsors`, `getSponsorshipItems`, `getSponsorContacts`
- Contact-link: `linkSponsorContact`, `unlinkSponsorContact`
- Sponsor CRUD: `createSponsor`, `updateSponsor`, `deleteSponsor`
- Logo: `uploadSponsorLogo`, `deleteSponsorLogo`

**Tables:** `sponsors`, `sponsor_contacts`, `sponsorship_items_active`, `logos` (storage)

**Workflows to UAT:**
- W4.1 List loads with sponsor cards (year + active filters)
- W4.2 Create sponsor — name, year, sponsorship item link, logo upload
- W4.3 Edit sponsor — including logo replace
- W4.4 Delete sponsor (soft, moves to Trash)
- W4.5 Open drawer — see linked contacts, link/unlink contacts
- W4.6 Logo upload to Supabase Storage `logos` bucket; logo display works
- W4.7 Logo delete cleans up storage
- W4.8 Drawer dialog onOpenChange behavior (per `feedback_base_ui_dialog_open_prop_useeffect` — Sprint 35 #336 lesson)

**E2E coverage:** ❌ **NONE.** Component-level Vitest tests exist (`__tests__/sponsor-form.test.tsx`, `sponsor-drawer.test.tsx`, `sponsor-list.test.tsx`) but no E2E.

**UAT status:** Pending walk-through.

**Findings:**
- _(populated as we walk through — high-priority area given zero E2E coverage)_

---

(Findings F9 below was logged during W2.1 walk-through of Contacts list filter bar.)

- 🟡 **F9 Contacts filter bar UX issues — multiple sub-findings.** P2.

  Filter bar layout: `[All Types ▾] [All Years ▾] [Search company...] [All Contacts ▾] [All Teams ▾] Captains only`. Verified each sub-issue against source code in `src/app/admin/contacts/contact-list.tsx`.

  - **F9.a Search is company-only, not unified contact search.** `contact-list.tsx:152` declares `companyFilter` state; line 205 filters via `c.company.includes(search)`. Name, email, phone are NOT searched. For a 375-row contact admin list, this is the wrong default — admins want "find Scott" or "find Davenport family," not just "find people at Acme Corp." Fix: rename state to `searchQuery`, expand filter to OR across `full_name | email | phone | company`. Update placeholder to "Search by name, email, phone, or company."

  - **F9.b "All Contacts" dropdown is the consent filter — label is meaningless.** Confirmed via screenshot: options are "All Contacts / Subscribed only / Unsubscribed only." State variable is `consentFilter`. Label "All Contacts" tells you nothing about what dimension it filters. Fix: rename to "Subscription" or "Mailing list status" so the dropdown's purpose is self-evident.

  - **F9.c "All Years" filters on `year_first_seen` — likely vestigial.** Useful only for "find people we first saw in 2024" — narrow-edge admin task. With 99% of current contacts created in 2026, this filter is currently a no-op. Fix candidates: hide entirely, OR move to an "Advanced filters" disclosure, OR rename to "Year first seen" so the niche purpose is clear.

  - **F9.d Search is buried in the middle of the filter row.** Best practice: search-first (leftmost or own row above filters) since it's the highest-frequency control. Burying it between two dropdowns means the eye has to hunt.

  - **F9.e No active-filter chips.** Once 2-3 filters are active, no compact summary shows what's narrowing the list. User has to re-open each dropdown to remember. Fix: render `[Type: Player ✕] [Year: 2026 ✕]` chips below the filter bar.

  - **F9.f No clear-all / reset.** With 6 filter controls, resetting requires 6 individual clicks. Fix: add "Clear filters" link visible only when ≥1 filter is active.

  - **F9.g Filter labels disappear on selection.** Because the placeholder ("All Types") IS the only label, picking "Player" replaces the placeholder entirely — you can no longer see at a glance which dimension the dropdown represents. Fix: add small `<Label>` above each `<SelectTrigger>`.

  - **F9.h Filters and toggle are visually peer-level.** Type, Year, Search, Consent, Team, Captains-only are all visually equal weight. Better hierarchy: Search left-prominent → progressive narrowing filters → boolean toggle last. Group with subtle spacing or borders.

  **Proposed fix sprint (S41 candidate, ~2-3 hours):**
  - Pixel produces a redesign mockup (search-first, labeled dropdowns, active-filter chips, clear-all)
  - Aria gates new copy: dropdown labels (Subscription, Year first seen), search placeholder ("Search by name, email, phone, or company")
  - Bolt implements on `contact-list.tsx`. Surgical to that file.
  - **No backend / RLS changes.** All filter logic is client-side except `team_id` + `captain_only` (which already pass to `getContacts(filter)`).
  - Test plan: 1 e2e spec covering search-by-name, search-by-email, clear-all, active-filter chips. Also doubles as Contacts surface coverage gap fill.

  **Proposed severity:** P2. No functional break, but Contacts is the most-used admin surface — every UAT walk-through, every real admin session passes through this filter bar.

- 🟡 **F10 Years column shows `2026` for every row — vestigial.** P3.
  - All 375 rows display `2026` in the Years column. Caused by `year_first_seen` defaulting to current-year on insert, and the bulk import landing all historical contacts in April-May 2026.
  - Pairs with F9.c — Year filter dropdown is also functionally inert.
  - **Fix (per Scott's pick — Option 1):** Hide the Years column from the list view entirely AND remove the Year filter dropdown from the filter bar. Preserve the `year_first_seen` column in DB for future use (don't drop the schema; just hide the UI). Re-enable when meaningful data exists (e.g., when registration-flow contacts come in tagged with the actual year-of-first-contact).
  - **Files touched:** `contact-list.tsx` (hide column + remove dropdown).
  - **Bundle hint:** sits naturally with F9 (filter bar redesign) — same file, same specialist (Pixel design + Bolt impl).

- 🟡 **F11 Salutation duplicated into `first_name` and `full_name` (85 rows).** P2 — data quality.
  - Per Scott's call: salutation should NOT appear in the contacts list display.
  - **Diagnosis:** display logic is correct (`contact-list.tsx:865-868` builds `first_name + " " + last_name`, no salutation appended). The data is the bug — 85 of 375 rows have the salutation prefix duplicated INTO `first_name` (e.g., `first_name = "Ms. Erica"`) AND into `full_name`. So the renderer correctly outputs `"Ms. Erica Allinen"` from the polluted data.
  - **CSV parser (`csv-parser.ts:182-183`)** reads salutation as a separate field — parser logic is fine. But it does NOT defensively strip salutation prefixes from `first_name` if the source CSV pre-polluted that column. Either the historical import had pre-polluted data (likely — many mailing-list exports concat salutation into first_name) OR a different ingestion path bypassed the parser.
  - **Fix has two parts:**
    - **F11.a Data cleanup (one-shot SQL):**
      ```sql
      UPDATE contacts
      SET first_name = TRIM(REGEXP_REPLACE(first_name, '^(Mr\.|Mrs\.|Ms\.|Dr\.|Miss)\s+', '', 'i'))
      WHERE first_name ~* '^(Mr\.|Mrs\.|Ms\.|Dr\.|Miss)\s+';

      UPDATE contacts
      SET full_name = TRIM(REGEXP_REPLACE(full_name, '^(Mr\.|Mrs\.|Ms\.|Dr\.|Miss)\s+', '', 'i'))
      WHERE full_name ~* '^(Mr\.|Mrs\.|Ms\.|Dr\.|Miss)\s+';
      ```
      Expected: ~85 rows updated on each statement. Salutation field stays populated (not touched) — preserves the data for future formal-letter / mail-merge use cases. Run via Supabase Studio (MCP read-only).
    - **F11.b Parser hardening (defensive — small Bolt fix):** Add a normalization step in `csv-parser.ts` after line 183 that strips known salutation prefixes (Mr./Mrs./Ms./Dr./Miss/Mr/Mrs/Ms/Dr) from `first_name` when present, regardless of whether the salutation column was ALSO populated. Idempotent — protects against future imports with pre-polluted source CSVs.
  - **Severity:** P2. Visual inconsistency in the most-used admin surface; no functional break, but admin scanning the list sees inconsistent name formatting (some rows formal, some not). Fix is small and self-contained.
  - **Resolution status (data half):** ✅ F11.a executed 2026-05-03. Verified: 0 rows still polluted in `first_name`, 0 in `full_name`. Salutation field preserved on 361 rows. Parser hardening (F11.b) still pending.

- ✅ **W2.2 type chips render correctly** with Sprint 31 colors (Player teal / Sponsor purple / Donor green / Volunteer amber / Other gray) in canonical order. Multi-type rows render stacked chips. Zero rows with no chips (post-cleanup).
- ✅ **#356 (relative-timestamp hydration mismatch) NOT reproducing on Contacts list.** Console clean on reload after F11.a cleanup. Watch list for #356 stays open for other surfaces but contacts page does not exhibit it today.

- 💡 **F14 (enhancement) — Google Places autocomplete on address fields.** P3 enhancement, not a bug.
  - Currently address entry in contact form is 5 free-text fields (Address Line 1, Line 2, City, State, Zip) requiring full manual entry + risk of typos and city/zip mismatch.
  - **Cost analysis:** Google Places Autocomplete = ~$2.83 / 1,000 sessions. At craven's scale (~2,000-5,000 sessions/year between admin edits + public registration + sponsor forms), annual cost is ~$6-15. Easily covered by Google Maps Platform $200/mo free credit. Effectively free.
  - **Alternatives considered:** Smarty (US-only, smaller free tier), Mapbox ($0.50/1K, cheaper at scale but less familiar address parsing), USPS Web Tools (free but no autocomplete API). **Google Places wins on DX + cost-at-our-scale.**
  - **Implementation scope (~2-3 hours Bolt):**
    1. Set up Google Cloud project + API key (Scott, ~10 min in console)
    2. Restrict API key to craven domain (security — prevents key abuse)
    3. Add `@googlemaps/js-api-loader` (~30KB gzipped) to bundle
    4. Replace Address Line 1 input with autocomplete-enhanced input
    5. On selection, auto-populate City/State/Zip from `address_components` response
    6. Apply same treatment to public registration form (`src/app/register/...`) and sponsor purchase form for max user value
  - **Files touched:** `src/app/admin/contacts/contact-form.tsx`, `src/app/register/...`, `src/app/sponsors/...` (sponsor purchase form)
  - **Severity:** P3 enhancement. No functional break in current state; quality-of-life upgrade with high user value. Worth doing, no rush.

- 🟡 **F12 Edit modal has poor horizontal space utilization.** P2.
  - Today's layout wastes space:
    - Salutation: tiny input on its own full-width row (~80% empty)
    - Company: full-width row (could share with Phone)
    - Email: full-width row
    - Phone: full-width row (could share with Email)
    - Year First Seen: small dropdown on full-width row (~85% empty; also vestigial per F10)
    - Marketing consent: own row
  - **Fix candidates (Pixel + Bolt redesign of `contact-form.tsx`):**
    - Group Salutation + First Name + Last Name on one row (1fr / 2fr / 2fr grid)
    - Group Email + Phone on one row
    - Group Company + Year First Seen on one row (or remove Year per F10)
    - Marketing consent toggle inline at bottom of CLASSIFICATION
    - Result: form fits in roughly half the vertical scroll currently used
  - **Bundle hint:** same file as F13 (button bar alignment), same Pixel+Bolt cycle. Likely also covers F16 (verify Type chip interactivity) in the same pass.
  - **Severity:** P2. Friction multiplies across every contact edit — admin's most-touched form.
  - **Pattern to copy:** ADDRESS section already has the right pattern — City / State / ZIP on a 3-column grid. The F12 redesign should mirror this in IDENTITY, CONTACT, CLASSIFICATION sections.
  - **Sections that DON'T need redesign:** ADDRESS (City/State/ZIP grid is already correct), NOTES (single full-width textarea is appropriate). Leave these alone.

- 🟡 **F13 Edit modal footer button bar — alignment + overlap.** P2.
  - Source: `src/app/admin/contacts/contact-modal.tsx:95-117`. Uses shadcn `DialogFooter` which defaults to `sm:justify-end` — all three buttons (Delete contact, Cancel, Save) cluster right-aligned, leaving the left half of the footer empty.
  - **F13.a Destructive action conventionally goes FAR LEFT, separated from the primary action group.** Today: `[Delete contact] [Cancel] [Save]` all right-clustered. Convention: `[Delete contact] ←─────────→ [Cancel] [Save]` with `justify-between` separating destructive from action group. Reduces accidental Delete clicks (separated from Save) and matches user expectations from other admin tools.
  - **F13.b Form content visible behind the footer area** (Scott's screenshot showed Address Line 1 peeking through behind the button bar). Either the footer lacks a solid opaque background, OR the scroll region's overflow allows content to render behind the sticky footer area. Either way, footer should fully occlude scroll content underneath.
  - **F13.c Visual button hierarchy is actually correct** — Save (primary teal pill), Cancel (neutral outline), Delete (red destructive outline). Standard pattern. Just needs spatial separation per F13.a.
  - **Fix scope (Pixel + Bolt, ~30 min):**
    - Replace `<DialogFooter className="...">` with explicit flex + `justify-between` (or wrap Delete in a left-aligned div, then Cancel + Save in a right-aligned div)
    - Ensure footer has solid `bg-background` or equivalent token to fully occlude scroll content
    - Verify on a tall form by scrolling — no content should bleed through
  - **Bundle hint:** same file/cycle as F12 (form spacing). Probably 1 PR for both.

- 🟡 **F15 Salutation field is free-text, not a Select dropdown.** P3.
  - Today: open `<input>` with placeholder "Mr., Ms., Dr." Allows admin typos (`Mr` vs `Mr.` vs `mr.`), inconsistent values across rows, and no constraint enforcement.
  - Schema column `salutation text` doesn't constrain values either.
  - **Fix:** Replace with `<Select>` of canonical values: `Mr. / Mrs. / Ms. / Mx. / Dr. / Miss / (blank)`. If admin needs a non-standard salutation, allow but prompt confirmation.
  - **Bonus opportunity:** Once normalized, simplifies any future mail-merge / salutation-aware copy ("Dear Ms. Bailey" vs "Dear M. Bailey").
  - **Severity:** P3. No functional break; data quality risk only. Bundles with F11 (parser hardening) — same data-cleanliness theme.

- 🟡 **F16 Verify TYPES section interactivity in edit modal.** P? — pending verification.
  - The screenshot shows type names (Player / Sponsor / Donor / Volunteer / Other) as plain text labels. Per Sprint 31 spec they should be clickable checkboxes/chips that toggle the contact's `types[]` array (with type-gated fields appearing for Player → Handicap+Shirt, Volunteer → Shirt, Donor → Tribute toggle+Recognition).
  - Need Scott to confirm: are the type labels actually clickable? Do they toggle a checked state? Do type-gated fields appear when a type is checked?
  - **Action:** Verify during W2.4/W2.5 walk-through (next).
  - **Resolution:** ✅ Verified 2026-05-03. Code IS correct (`contact-form.tsx:360-373` renders proper Checkbox + Label pairs that ARE clickable and DO store state correctly). But the visual affordance is broken — see F17 for the actual bug.

- 🔴 **F17 TYPES section visual affordance is broken — selected state invisible.** **P1.**
  - **Symptom:** type names (Player, Sponsor, Donor, Volunteer, Other) appear as plain text labels with no apparent clickability and no visible selected-state indicator. Even when types ARE selected (gated fields appear below), the labels at top look identical to unselected.
  - **Root cause:** The shadcn `<Checkbox>` component IS rendered next to each label (`contact-form.tsx:360-373`) but its visual styling (small, low-contrast border on a white background) makes it effectively invisible at admin's viewing distance/contrast. So the multi-select control is functionally correct but visually inert.
  - **Sprint 31 spec implementation gap.** Plan called for *"A row of five checkboxes: Player / Sponsor / Donor / Volunteer / Other."* Tech shipped (Checkbox components exist), but UX intent failed.
  - **Three design options for fix (Pixel decides, Bolt implements):**
    1. **Pill chips with filled/outline selected states** (recommended) — `[Player ✓]` filled teal vs `[Player ]` outline. Multi-select is implicit. Modern admin pattern. Compresses well horizontally.
    2. **Enhanced checkboxes** — make them larger, add stronger border, add background tint to selected types' rows. Keeps current pattern, just makes it visible.
    3. **Toggle buttons** — depressed/raised state. Less common but unambiguous.
  - **Why P1:** This is the form's central control. Admin can't tell what's selected → they save without realizing they unchecked Player → contact's `types[]` changes silently → cascades into list view, filters, RLS rules. Hidden state is dangerous.
  - **Bundle hint:** Same file/cycle as F12 (form spacing) + F13 (footer alignment) + F15 (salutation Select). Whole edit-form gets a Pixel pass and Bolt PR. Likely **the largest single Contacts UX sprint** to triage.
  - **Severity:** P1. Functionally works but UX is broken in a way that risks silent data corruption (admin un-toggles a type they didn't intend to).

- 🔴 **F18 Row-selection checkboxes are visually invisible — bulk actions effectively undiscoverable.** **P1.**
  - **Symptom:** Scott couldn't see the select-all checkbox in the contacts list header — only noticed it because the cursor changed on hover. Same for per-row checkboxes. He tried clicking but saw no visual indication that anything got selected.
  - **Root cause:** Same as F17 — shadcn `<Checkbox>` component (`contact-list.tsx:818` for select-all + `contact-list.tsx:887` for per-row) renders with low-contrast border that's effectively invisible on the white table background. Checkboxes work functionally (clicking toggles state, cursor:pointer is set) but admin cannot SEE them.
  - **Cascading discoverability problem:** because the checkboxes are invisible, admins can't discover the bulk-action features (Set type / Add type / Remove type / Subscribe / Unsubscribe / Delete). Sprint 31's bulk actions are functionally there but operationally hidden. Same story for Sprint 39's blocked-row Alert flow — invisible from a discoverability standpoint.
  - **Bundle hint:** Same root cause as F17. **Single fix scope:** override shadcn Checkbox theme tokens to add explicit border + filled background on selected state, OR replace with a heavier-weight custom component. ONE change fixes BOTH F17 (TYPES checkboxes) AND F18 (row selection checkboxes) AND any other Checkbox usage in the admin (e.g., Captains-only toggle if it's actually a Checkbox).
  - **Files touched:** `src/components/ui/checkbox.tsx` (the shadcn component itself) — single-file change with broad cascading visual effect across the admin.
  - **Severity:** P1. Bulk operations on contacts (Sprint 31's signature feature) are effectively hidden behind invisible affordances. Admin doesn't know they exist; can't use them.
  - **Verification complete (2026-05-03):**
    - ✅ Selection state propagates correctly — `375 selected` indicator + bulk-action bar both appear after select-all click
    - ✅ Header checkbox CHECKED state IS visible (purple-outlined checkbox visible next to NAME header)
    - 🔴 UNCHECKED state of header checkbox = invisible (the bug)
    - 🔴 Row checkboxes appear invisible even when checked — Scott can't see any checkmarks on individual rows despite all 375 being selected. Per-row Checkbox component styled even more subtly than header (or different size token).
  - **Refined fix scope:**
    - Fix UNCHECKED state visibility: stronger border + light background tint so empty checkboxes are visible at a glance
    - Verify CHECKED state on row-level checkboxes — likely needs same prominence as header (filled background + checkmark)
    - Single change to `src/components/ui/checkbox.tsx`; cascades to all checkbox usages
  - **Bulk-action bar itself is well-designed.** Compact, clean grouping (Set types / Add type / Remove type | Subscribe / Unsubscribe | Delete | Clear). DON'T redesign the bar — only the Checkbox primitive needs work.

- ⏸ **W2.7 / W2.8 / W2.9 bulk action workflows deferred until F18 ships.** Bulk Set/Add/Remove type, bulk soft-delete, and bulk subscribe/unsubscribe are all visible in the bar, but with invisible row checkboxes there's no safe way to target a SUBSET on PROD — only "select-all 375" is reachable, which is too destructive for UAT. Sprint 31 + Sprint 39 functional logic is unverified at admin-UI level until checkboxes become visible. **Resume W2.7-W2.9 in a follow-up UAT pass after F18 fix lands.**

- ✅ **W2.4 single-row create** — works. Modal opens in CREATE mode, fields fillable, save persists, row appears in list, toast confirms.
- ✅ **W2.13 Team filter** — works. Picking a team narrows list to its members.
- ✅ **W2.14 Pagination/scroll** at 375 rows — snappy, no jank.
- ✅ **W2.15 Sprint 39 race-condition feel** — UI keeps up under rapid filter changes; no visible lag/desync.
- 🔴 **W2.12 Captains-only toggle confirms F18 cluster.** Same invisible-affordance issue as F17 + F18. Same root cause: shadcn Checkbox primitive. Same single fix to `src/components/ui/checkbox.tsx` cascades here too. **Cumulative F17/F18 affordance fix scope now confirmed across 3 surfaces:** form TYPES checkboxes (F17), row-selection checkboxes (F18), Captains-only toggle (W2.12). One-file fix, broad impact.
- 🔴 **F9.e (active-filter chips) + F9.f (clear filters) validated in real use.** Scott confirmed both are real pain points: when filters are active, no visual indication tells you which filters are applied — you have to look back at each dropdown. And no one-click reset means clearing 3 active filters takes 3 separate clicks. **Severity reaffirmed: P2.** Both bundle into the F9 filter-bar redesign sprint.

- 🔴 **F19 No feedback when Save is disabled by `noTypesChecked` invariant.** **P2.**
  - **Reproduced during W2.11.** Scott opened a contact with ONLY Player type, typed bad handicap (99), blurred (handicap error appeared), unchecked Player (handicap field disappeared, error cleared). Save remained disabled. He reasonably expected Save to re-enable per Sprint 38 fix. Save stayed disabled with NO visible reason.
  - **Root cause:** `contact-form.tsx:130-134` — `canSubmit` requires BOTH `!hasErrors` AND `!noTypesChecked`. Sprint 38 fix correctly cleared the handicap error. But unchecking Player on a Player-only contact made `types = []`, triggering `noTypesChecked = true`. Both conditions are correct individually; together they create a UX dead-end with no feedback.
  - **Sprint 31 invariant** (per spec: "Save disabled until ≥1 type checkbox is checked") is the underlying business rule. **Save being disabled is correct behavior.** The UX gap is that the admin has no idea WHY.
  - **Fix scope (small, ~30 min Bolt):**
    - When `types.length === 0`, render a visible inline message under the TYPES section: "At least one type is required to save."
    - Optionally also a tooltip/title on the Save button itself explaining the gate
    - Either approach makes the validation discoverable instead of invisible
  - **Distinct from Sprint 38 #350.** That fix was about clearing the handicap error. This is about communicating a different validation gate (no-types-checked).
  - **Severity:** P2. Data integrity is preserved (correct gate); UX is broken (silent block). Admin's mental model breaks: "I unchecked the type, why can't I save?" Admin tries other things (refresh? close+reopen?) → loses unsaved work.
  - **Bundle hint:** F12/F17 contact-form overhaul sprint — same file, same surface, same Pixel pass needed.

- ✅ **W2.6 single-row delete** verified working. UI shows success toast, row disappears from list. DB confirms: `deleted_at` set, `deleted_by` attributed to admin user, row preserved in `contacts` base table (NOT hard-deleted). Soft-delete pattern correct.
- ✅ **W10 restore round-trip** also verified during W2.6 walkthrough. Trash → Restore returned the contact to active state (`deleted_at = null`). Contact then re-deletable cleanly.
- ✅ **W2.11 Sprint 38 fix verified** in narrowest sense — `errors.handicap` IS being cleared when Player is unchecked. The Save-button-stays-disabled symptom Scott observed is a SEPARATE issue (F19, no-types-checked feedback gap), not a regression of #350.
- ✅ **W2.10 CSV export** works. Filtered export respects the active filter set. Button label "Export CSV (subscribed only)" — Scott accepted "subscribed only" semantics as fine for now (could revisit if export-all-regardless-of-subscription becomes a need).
- ⏸ **W2.16-W2.18 CSV import sub-flow walk DEFERRED.** Per Scott — this was a one-time function used for the historical mailing-list import; revisit only if a new bulk-import need arises. Sub-flow exists at `/admin/contacts/import` and is functionally fine per the bulk-import that produced the current 373 historical contacts.

---

### Contacts surface — UAT status

**SUBSTANTIALLY COMPLETE.** 14 of 18 W-numbered workflows verified (W2.1, W2.2, W2.4, W2.5, W2.6, W2.10, W2.11, W2.12, W2.13, W2.14, W2.15 + W10 restore round-trip + 2 partial). Bulk action workflows (W2.7-W2.9) deferred until F18 ships. CSV import sub-flow (W2.16-W2.18) deferred as low-priority.

**Findings on this surface:** F2, F3, F5, F6, F9 (a-h), F10, F11 (a-b), F12, F13, F14, F15, F16, F17, F18, F19. **18 distinct findings.** Single highest-leverage fix: F17/F18 Checkbox primitive (single-file change cascades across the entire admin's checkbox usage).

---

### 5. Sponsorships — `/admin/sponsorships`

**Files:**
- Route: `src/app/admin/sponsorships/page.tsx`
- Components: `sponsorship-manager.tsx`, `sponsorship-form.tsx`, `sponsorship-modal.tsx`
- Server actions: `src/app/admin/sponsorships/actions.ts` (6 fns)

**Server actions (6):**
- Read: `getSponsorshipItems`, `getLinkedSponsorNames`, `getSponsorshipPurchases`
- Write: `createSponsorshipItem`, `updateSponsorshipItem`, `deleteSponsorshipItem`

**Tables:** `sponsorship_items`, `sponsorship_items_active`, `sponsorship_purchases`, `sponsors_active`

**Workflows to UAT:**
- W5.1 List loads — current 16 sponsorship items in DB
- W5.2 Create sponsorship item — name, price (cents canonical), year, category (Sprint 33 catalog split — sponsorship/tribute/supporter)
- W5.3 Edit item — verify price-in-cents math (display vs DB)
- W5.4 Delete item (soft) — must show linked sponsors before allowing delete
- W5.5 Purchases list — Stripe-completed purchases per item; revenue tally
- W5.6 Empty state on a fresh year

**E2E coverage:** ❌ **NONE.**

**UAT status:** Pending walk-through.

**Findings:**
- _(populated as we walk through)_

---

### 6. Photos — `/admin/photos`

**Files:**
- Route: `src/app/admin/photos/page.tsx`
- Component: `photo-moderation.tsx`
- Server actions: `src/app/admin/photos/actions.ts` (3 fns)

**Server actions (3):**
- Read: `getPhotos` (filterable by status pending/approved/rejected)
- Write: `updatePhotoStatus`, `deletePhoto`

**Tables:** `photos_active`, `photos`. Storage: photo images via `/api/upload-photo` route.

**Workflows to UAT:**
- W6.1 Pending queue loads (currently 0 in DB — empty state)
- W6.2 Filter tabs: Pending / Approved / Rejected
- W6.3 Approve photo → moves out of Pending, public can see (RLS: approved status = SELECT true)
- W6.4 Reject photo → moves out of Pending, not public
- W6.5 Delete photo (soft, goes to Trash)
- W6.6 Photo image rendering (Supabase Storage URL)
- W6.7 Public upload flow (separate from admin) → check that uploads land in Pending queue

**E2E coverage:** ❌ **NONE.**

**UAT status:** Pending walk-through.

**Findings:**
- _(populated as we walk through)_

---

### 7. Scores — `/admin/scores`

**Files:**
- Route: `src/app/admin/scores/page.tsx`
- Components: `score-manager.tsx`, `score-form.tsx`, `score-modal.tsx`
- Server actions: `src/app/admin/scores/actions.ts` (7 fns)

**Server actions (7):**
- Read: `getScores`, `getActiveTeamsForDropdown`
- Write: `addScore`, `updateScore`, `deleteScore`, `deleteAllScores`
- Bulk: `importScoresFromCSV`

**Tables:** `scores`, `teams_active`

**Workflows to UAT:**
- W7.1 List loads (currently 0 in DB — empty state)
- W7.2 Add score for a team via dropdown of active teams
- W7.3 Edit score
- W7.4 Delete score
- W7.5 Delete ALL scores (destructive — verify confirmation flow)
- W7.6 CSV import scores
- W7.7 Public leaderboard reflects scores (cross-check with public `/leaderboard` page)

**E2E coverage:** 🟡 1 spec (`score-create-edit`).

**UAT status:** Pending walk-through.

**Findings:**
- _(populated as we walk through)_

---

### 8. Event — `/admin/event`

**Files:**
- Route: `src/app/admin/event/page.tsx`
- Component: `event-settings-form.tsx`
- Server actions: `src/app/admin/event/actions.ts` (2 fns)

**Server actions (2):**
- `getEventSettings`, `updateEventSettings`

**Tables:** `event_settings` (1 row currently)

**Workflows to UAT:**
- W8.1 Form loads with current settings
- W8.2 What fields exist? (event date, location, registration open/close dates, sponsorship cutoff, etc. — confirm during walk-through)
- W8.3 Save persists; reload shows updated values
- W8.4 Public-facing surfaces reflect changes (event date on public homepage, registration cutoff banner, etc.)
- W8.5 Validation on date fields, required fields

**E2E coverage:** ❌ **NONE.** (But component test exists: `event-settings-form.test.tsx`.)

**UAT status:** Pending walk-through.

**Findings:**
- _(populated as we walk through)_

---

### 9. Settings — `/admin/settings`

**Files:**
- Route: `src/app/admin/settings/page.tsx`
- Component: `invite-form.tsx`
- Server actions: NONE (uses `/api/invite` POST)
- API route: `src/app/api/invite/route.ts` (admin-only); `src/app/api/invite/accept/route.ts` (public token-accept)

**Tables:** `invitations`, `profiles`

**Workflows to UAT:**
- W9.1 InviteForm loads — email + role (admin/viewer) inputs
- W9.2 Submit creates invitation row + sends invite email (verify email actually sends via Resend)
- W9.3 Invitation email contains valid `/api/invite/accept?token=...` link
- W9.4 Token-accept flow creates profile, assigns role, signs user in
- W9.5 Token expiry (`expires_at`) and accepted-at handling
- W9.6 List of pending/accepted invitations? (need to verify if there's a UI for this — current invite-form looks like create-only)
- W9.7 No way to revoke invitations or change a user's role from this UI? (verify gap)
- W9.8 Two profiles in DB currently (likely Scott + one other) — verify both accessible/editable

**E2E coverage:** ❌ **NONE.** Sensitive area (auth/RBAC) with zero E2E.

**UAT status:** Pending walk-through. **High-priority area — zero E2E + auth-critical.**

**Findings:**
- _(populated as we walk through)_

---

### 10. Trash — `/admin/trash`

**Files:**
- Route: `src/app/admin/trash/page.tsx`
- Component: `trash-tabs.tsx`
- Server actions: `src/app/admin/trash/actions.ts` (10 fns: 5 get + 5 restore)

**Server actions (10):**
- Read: `getTrashContacts`, `getTrashTeams`, `getTrashSponsors`, `getTrashSponsorshipItems`, `getTrashPhotos`
- Write: `restoreContact`, `restoreTeam`, `restoreSponsor`, `restoreSponsorshipItem`, `restorePhoto`

**Tables:** `contacts`, `teams`, `sponsors`, `sponsorship_items`, `photos`, `profiles` (read-only for `deleted_by_name`)

**Workflows to UAT:**
- W10.1 5 tabs render — Contacts / Teams / Sponsors / Sponsorship Items / Photos
- W10.2 Each tab shows soft-deleted rows with deleted-by-whom + deleted-when
- W10.3 Restore button per row → row returns to its source list (verify via cross-check on the source page)
- W10.4 No hard-delete UI here (per soft-delete invariant)
- W10.5 Sprint 35 #135 — bulk-restore was deferred; confirm this is still single-row only
- W10.6 RLS allows admin to see deleted rows (base table read, not active view)

**E2E coverage:** 🟡 Indirect via `contact-soft-delete-restore` spec.

**UAT status:** Pending walk-through.

**Findings:**
- _(populated as we walk through)_

---

## Cross-cutting concerns to verify during UAT

1. **Sidebar collapse behavior** — `SidebarProvider`, `SidebarTrigger` from shadcn — does it work on mobile? On laptop?
2. **Toaster (Sonner)** — `toast.success()` / `toast.error()` calls in mutations — surface correctly?
3. **Error boundary** — `src/app/admin/error.tsx` exists; what's the fallback UX when a server action throws?
4. **`requireAdmin()` enforcement** — every server action calls it. Verify a viewer-role user gets 401/redirect on write attempts (cross-page consistency).
5. **Soft-delete cascade** — when a contact is soft-deleted, what happens to their team_members rows / sponsor_contacts rows? (Verify in DB.)
6. **Year handling** — current-year filtering uses `new Date().getFullYear()` server-side. Tournament event date is Sept 2026 — does "current year" work consistently?
7. **Hydration mismatch on relative timestamps** (#356 filed 2026-05-03) — watch for "X minutes ago" flicker on Contacts table.
8. **Row checkbox prefetch collision** (#355 filed 2026-05-03) — watch for any list where clicking a row checkbox feels laggy / triggers page navigation.

---

## Pre-existing watch items (carried into UAT)

- **#350 closed** — handicap stale-error fix shipped 2026-05-02. UAT W2.11 verifies.
- **#355 (P3)** — row checkbox triggers Next.js router prefetch, blocks Playwright. Real product UX papercut. Watch for in Contacts/Teams.
- **#356 (P3)** — hydration mismatch on relative timestamps. Watch for in Contacts.
- **500-contact bulk-action cap** — surfaced in S39. Product decision needed for tournaments with 500+ contacts (current craven has 913). Discuss during UAT.
- **#342 blocked** — donor-flow E2E coverage blocked on Stripe nonprofit account.
- **#135 deferred** — bulk restore Trash. Confirm during W10.5.

---

## Phase 1 — UAT walk-through (process)

**Order:** Sidebar nav order (Dashboard → Contacts → Teams → Sponsors → Sponsorships → Photos → Scores → Event → Settings → Trash → Contacts/Import as a side-trip).

**Per surface (~15-30 min depending on complexity):**
1. Forge narrates expected workflow + asks Scott to perform each W-numbered step in his browser
2. Scott reports observed behavior
3. Forge documents in the surface's "Findings" section: ✅ ok / 🟡 warning / 🔴 broken / 💡 idea
4. Findings get severity labels: P0 broken / P1 UX / P2 nice-to-have / P3 cleanup

**Output of Phase 1:** This document, fully populated with findings and severity labels.

**Phase 2 (post-walk-through):** Triage findings into sprints by severity + area.

---

## Inventory acknowledgments / surprises

1. **No edge functions exist** — project profile is stale. The `stripe-webhook` is a Next.js API route, not a Supabase function. Profile update needed.
2. **6 of 10 admin surfaces have zero E2E coverage** — Sponsors, Sponsorships, Photos, Event, Settings, Dashboard. Test-coverage sprints worth scheduling after UAT.
3. **Settings is the most under-tested critical surface** — invitation flow + role assignment, zero E2E, auth-sensitive. UAT W9 is the highest-priority walk-through.
4. **All 14 tables have RLS enabled** — verified via `pg_policies` query. Pattern is `is_admin()` for write, `is_admin_or_viewer()` for internal read, conditional public read where it makes sense.
5. **Active views are well-modeled** — contacts_active, teams_active, sponsors_active, sponsorship_items_active, photos_active. Soft-delete invariant is enforceable at the schema layer.
6. **913 contacts in `contacts` base table; 717 in `contacts_active`; 196 in Trash.** Initial readout said "913 contacts" — that was the soft-delete-included count. Active count is 717.

## Contacts data-quality findings (Phase 0 follow-up — to verify during W2/W10)

Verified via direct `contacts_active` SQL queries on 2026-05-03.

- **Bulk-import history.** All 717 active contacts were created in two batches: 377 in April 2026, 340 in May 2026. Oldest contact `2026-04-19`. Not organic signups (registration not open yet) — historical mailing lists imported.
- **Zero duplicate emails.** 342 rows with email → 342 unique emails normalized (lowercase + trim). The Sprint 31 dedupe (firstname|lastname|zip) is holding.
- **52% have no email** (375 of 717). Likely fine for historical donor/sponsor records, but worth confirming during UAT W2 that the Contacts list handles the no-email case cleanly (no broken Mail icon links, no empty-string vs null inconsistencies).
- **🟡 18 contacts have `types = '{}'` (empty array).** Sprint 31 plan mandated *"Save disabled until ≥1 type checkbox is checked."* These 18 either pre-date Sprint 31 + were not backfilled, OR the CSV importer allows blank types. **Verify during W2.16/W2.17.**
- **🟡 1 contact has non-canonical type order** (`{sponsor, player}` instead of canonical `{player, sponsor}` which 58 other rows have). Sprint 31 mandated Player → Sponsor → Donor → Volunteer → Other ordering. Single outlier — could be a UI bug (`toggleType` adds in click order rather than canonical order?) or imported pre-Sprint-31 data. **Verify during W2.4 / W2.5 — does new add of Player+Sponsor save in canonical order?**
- **No 3+ type combos exist yet.** Verify during W2.4 that creating a Player+Sponsor+Donor contact works (per Sprint 31 design intent).
- **Trash count expected to be 196.** Verify during W10.1.
