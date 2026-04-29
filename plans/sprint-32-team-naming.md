# Sprint 32 — Team Names Are Captain Names

> Approved by Scott 2026-04-29. Compass breaks this into issues, Spec writes failing tests first, Flux handles schema + server actions, Bolt handles frontend, Watchdog reviews each PR.

## What this sprint actually does

Today, registering a team makes you type a "Team Name" field. Some captains call themselves "Team Mulligans," some leave it blank, and the data ends up inconsistent — half the rows say "Team Davenport" and half say "Steve's Crew." We're cutting through it: the captain IS the team. If you're Steve Davenport's team, the team is "Steve Davenport" — in the admin contacts list, on the public leaderboard, in error messages, on scoring screens, on your Stripe receipt. Same word everywhere.

This sprint also retires two more side drawers (team form, score form) in favor of the centered-modal pattern Sprint 31 established for contacts. Admin UX becomes consistent across the three big tables.

> **Plan amendment 2026-04-29 (after merge, before builders).** Pre-flight against prod corrected the RPC count from 3 to 1. Only `register_team` exists in production with a `p_team_name` parameter. The plan was originally inferred from migration filenames (`20260419000006_register_team_rpc.sql`, `20260424000001_update_register_team_rpc.sql`, `20260421000002_payments_cents.sql`) — those are 3 successive `CREATE OR REPLACE` migrations of the **same** `register_team` function, not 3 separate functions. The corrected scope is captured below; original references kept as audit trail at the bottom of this file.

## What you'll experience after this ships

### Registering a team
The "Team Name" input goes away. You give your captain info (name, email, phone) and your team is immediately known by your name. Same for the three teammate slots — first/last/email each. No "name your team" beat in the flow.

### Looking at the leaderboard
Today: rows show whatever the captain typed in "Team Name." After: rows show the captain's full name in canonical order (last name, first name). Mike Smith's team is "Mike Smith." Same display rule applies to the live tournament scoreboard, the printed program list, and the public sponsor wall.

### Editing teams in admin
Today: side drawer slides in from the right with a "Team Name" field at the top. After: centered window opens (~800px), no team-name field, captain selection (typeahead-style picker for an existing contact) + 3 teammate slots + session selector. The team is named after whoever you pick as captain.

### Editing scores in admin
Today: side drawer with a freeform "Team Name" text input that lets you type any string. After: centered window with a dropdown of every active team listed by captain name (alphabetized by last name). No more typos, no more orphan score rows that don't tie back to a team. If a score truly has no team (none entered today, but the column allows it), it shows as "(no team)."

### Error messages and admin guards
Today: when you try to remove a Player type from someone on a team, you get *"Lacie is on Team Mulligans, please remove from team first."* After: the same guard fires, but the sentence references the captain's name. Aria writes the exact wording during build — the constraint is just that the team identifier in the sentence becomes the captain's full name.

### Receipts
Stripe checkout line items get the same treatment: the team identifier on the receipt is the captain's full name. (No registration confirmation email exists yet — Resend is in the stack notes but not wired up. Whenever it ships, it'll inherit the same display rule by default.)

---

## Decisions locked for Sprint 32

| What | Decision |
|---|---|
| `teams.team_name` column | Drop entirely. Display always derives from the team's captain. |
| `scores.team_name` column | Drop entirely. No production score data exists, so no historical-integrity concern. Display derives from `scores.team_id → teams.captain → contacts`. |
| `scores.team_id` constraint | Stays nullable (matches current shape). Score rows with null `team_id` display as "(no team)" — fallback for genuine orphan entries. |
| Canonical team display | The captain's full name. Just `Steve Davenport` — no "Team," no "'s team," no possessive. |
| Team admin form | Drawer → centered modal (~800px), same shell pattern as contacts. `team-drawer.tsx` retired. |
| Score admin form | Drawer → centered modal (~800px), freeform team-name input replaced with plain dropdown of active teams (captain names, alphabetized by last name). `score-drawer.tsx` retired. |
| Registration form copy | The "Team Name" input is silently removed. No helper line, no restructured section. Captain inputs read as the team identity on their own — there's no existing user base to surprise. |
| RPC signature | `register_team` (single function in prod, not 3) drops its `p_team_name text` parameter. New signature: `register_team(p_session, p_captain_name, p_captain_email, p_captain_phone)`. Captain params stay vestigial back-compat per S11-2 contract. Coordinated UI + RPC deploy in Phase 1. |
| Migration window | Vercel-red Option A — same as Sprint 31. Phase 1 ships the migration, Vercel goes red, Phase 2/3 land in succession, Vercel re-greens at the end. Production keeps serving the previous green deploy. Craven traffic is ~zero outside event prep. |
| Backfill | None. `teams.team_name` and `scores.team_name` are dropped, not transformed. No data is preserved (nothing meaningful to preserve — `teams.team_name` is just text, and `scores.team_name` is empty in prod). |
| Auto-derive logic | None. Display is computed at read time via JOIN. No materialized "captain_name" column on teams or scores. |

### Deferred to Aria during build (sentence-shape copy, not architecture)

These don't block plan approval — Aria writes the exact wording when each surface is touched.

- **Type-removal guard error sentence.** Today: *"Lacie is on Team Mulligans, please remove from team first."* The new sentence references the captain's full name; Aria picks the exact framing (e.g., *"Lacie is on Steve Davenport's team — remove her from the team first, then change her type."*).
- **Trash-tab labels for soft-deleted teams + scores.** How a deleted team appears in the trash list when its captain is also deleted (does the row say "(unknown captain)" or "Steve Davenport (deleted)"?).
- **Stripe checkout line-item label.** Today: probably "Team Mulligans — Morning Foursome." After: "Steve Davenport — Morning Foursome" or similar.
- **Leaderboard team row label.** Whether the row is just "Steve Davenport" or includes session info ("Steve Davenport — Morning").
- **Null-team-id score display fallback.** Score rows with `team_id IS NULL` need a display string. Plan currently says "(no team)" — Aria picks the final wording.

### Deferred to builder judgment (low-stakes implementation calls)

- `scores.team_id` stays nullable. No NOT NULL added. If a real need for orphan-score support disappears later, ALTER COLUMN is cheap.
- Display of soft-deleted teams in scoring views — Bolt picks the JOIN filter (active teams only, or active + deleted with a badge).

---

## How we'll know it actually works after merge

Plain-English checklist someone could run on a Saturday:

1. Go to `/register` as a guest. Confirm there's no "Team Name" field anywhere on the form.
2. Complete a registration with a captain named "Test Captain." Confirm the Stripe receipt line item and the admin team list both read "Test Captain."
3. Open the admin teams page. Confirm the table column reads the captain's full name (no separate "Team Name" column).
4. Click a team row. Confirm a centered modal opens (not a side drawer).
5. Open the admin scores page. Click "Add Score." Confirm a centered modal opens with a team dropdown (not a freeform text input). Confirm the dropdown lists every active team by captain name.
6. Open the public `/leaderboard`. Confirm rows show captain names.
7. In admin, find a contact who's on a team. Try to uncheck their Player type. Confirm the error message names the team via the captain.
8. In admin, try to bulk-remove the Player type from a list of rows including team members. Confirm the inline `<Alert>` (Sprint 31's pattern) still renders blocked rows correctly with the new captain-derived team identifier.
9. Filter the contacts list by team. Confirm the team filter dropdown shows captain names.

---

## What's NOT in this sprint (and why)

- **Sprint B — Catalog cleanup.** Sponsorship-items category split, public `/sponsors` filter, admin Tributes tab. Different blast radius (Stripe checkout + public site). Separate sprint, separate plan.
- **Stripe nonprofit pricing + live-key flip.** Still blocked on Scott's outreach + the nonprofit verification step.
- **Donor anchor table.** `donor` is still a label-only type. Adding a `donations` table is a future need with no current driver.
- **Score scoring-tent on-the-day UX.** No in-person score entry is built yet; we just need the admin form working correctly with the new shape.
- **Team copy-over wizard for returning captains** (Sprint 10 queue, separate ask).
- **Migrating sponsors / registrations to centered-modal pattern.** They sit in side drawers today. Same "migrate as next touched" rule — they get the modal treatment when next touched in regular work, not in this sprint.

---

## How the work gets built (so you know who's involved)

- **Compass** turns this plan into tickets with clear acceptance criteria.
- **Spec** writes failing tests first (per our TDD rule).
- **Flux** handles the database change + the `register_team` RPC signature change + server action updates.
- **Bolt** builds the team modal, the score modal, the team picker dropdown, and updates every display consumer.
- **Aria** writes the new copy for the deferred surfaces (type-removal guard, trash labels, Stripe receipt line item, leaderboard row label, null-team-id fallback string).
- **Watchdog** reviews every PR.

Single PR per builder, in phase order. Watchdog reviews each separately.

### Phasing

**Phase 1 — schema + tests (parallel, both unblocked):**
- Spec: failing unit + e2e tests for team display via captain, score display via team→captain, registration without team-name field, type-removal guard sentence shape, RPC contract changes.
- Flux: pre-flight already done by Forge (see "Pre-flight findings" appendix below) → migration (drop `teams.team_name` + `scores.team_name`, DROP/RECREATE the `teams_active` view, DROP+CREATE OR REPLACE the `register_team` function without `p_team_name`) → types regen.

**Phase 2 — actions + form rewrites (3 parallel, blocked by Phase 1):**
- Flux: `admin/teams/actions.ts` + `admin/scores/actions.ts` + `admin/contacts/actions.ts` (type-removal guard error message captain reference) + `api/checkout/route.ts` (drop `p_team_name` from the single `register_team` RPC call at line 157, drop `team_name` from `teammates` payload + Stripe metadata).
- Bolt: team form rewrite (drawer → modal, drop team-name field, captain typeahead picker).
- Bolt: score form rewrite (drawer → modal, freeform team-name → team dropdown).

**Phase 3 — display consumers (2 parallel, blocked by Phase 2):**
- Bolt: admin display surfaces — `team-list.tsx`, `score-manager.tsx`, `contact-list.tsx` team filter dropdown, `trash-tabs.tsx`.
- Bolt: public display surfaces — `(public)/register/registration-form.tsx` (drop the field), `(public)/leaderboard/page.tsx`.

**Phase 4 — Aria copy pass (after Phase 3):**
- Aria writes the type-removal guard sentence, trash-tab labels, Stripe receipt line item, leaderboard row label, and null-team-id fallback string.
- Bolt or Forge-direct fixup applies the strings.

Estimated 6-8 builder PRs + 1-2 Forge-direct fixups + 1 Aria copy PR. Same shape as Sprint 31. One-day feasible if Compass + Watchdog stay tight.

---

## Technical appendix

*This part is for Compass and the builders. You don't need to read it — it's here for the record so the implementation matches the conversation we had.*

### Pre-flight findings (run 2026-04-29 by Forge via supabase-craven MCP, post-merge)

Per `feedback_verify_against_prod_not_source`, queried the live Craven database (Supabase ref `kybfsxjruczbiokucyft`) before any builder spawn. Findings:

| Check | Finding |
|---|---|
| Views referencing `team_name` | **1** — `public.teams_active` (definition explicitly lists every `teams` column including `team_name`). DROP/RECREATE pattern same as `supabase/migrations/20260424000002_drop_teams_captain_columns.sql`. |
| Views/functions on `scores` | **None.** No views, no functions reference `scores.team_name` or `scores` more broadly. |
| Functions referencing `team_name` | **1** — `public.register_team(p_session text, p_team_name text, p_captain_name text, p_captain_email text, p_captain_phone text)`. The 3 migration files cited in the original plan are successive `CREATE OR REPLACE` versions of this single function — not 3 separate functions. |
| `register_team` body | INSERTs `team_name, session, payment_status, amount_paid_cents, year`. Captain params (`p_captain_name`, `p_captain_email`, `p_captain_phone`) are accepted but **not used in the body** — they are vestigial back-compat per S11-2 contract test (`register-team-rpc-contract.test.ts`). |
| Sprint 32 RPC change | DROP function, then `CREATE OR REPLACE FUNCTION register_team(p_session, p_captain_name, p_captain_email, p_captain_phone)` — drop `p_team_name` only. Body INSERTs `(session, payment_status, amount_paid_cents, year)`. Returns same JSONB shape. Vestigial captain params stay (do not bundle a separate cleanup). |
| RLS policies referencing `team_name` | None |
| Triggers on `teams` or `scores` | None |
| CHECK constraints referencing `team_name` | None |
| Indexes on `team_name` columns | None |
| Active teams (`deleted_at IS NULL`) | 1 |
| Soft-deleted teams | 0 |
| Total scores | 0 (clean slate — no historical-integrity concern, no backfill needed) |
| RPC caller surface | `src/app/api/checkout/route.ts:155-160` — single `supabase.rpc("register_team", { p_session, p_team_name, p_captain_name, p_captain_email, p_captain_phone })` call. Drop `p_team_name: team_name` line. |
| Test contract | `src/__tests__/register-team-rpc-contract.test.ts:144` — `expect(args.p_team_name).toBe("Test Team Alpha")`. Drop this assertion. |

Migration is straightforward: 1 view to recreate, 1 function to recreate, 2 columns to drop, 0 backfill.

### Cross-repo grep (run 2026-04-29)

43 files in `src/` + `supabase/` reference `team_name`. Full enumeration in the next section.

### Schema migration

File: `supabase/migrations/<timestamp>_drop_team_name.sql` in `~/github/craven-cancer-classic`.

`register_team` is the only function that references `team_name`. The body INSERTs `team_name` along with 4 other columns into `teams`. The migration must drop the view (column-pinned), recreate the function without `p_team_name`, then drop the columns, then recreate the view — order matters to avoid "column does not exist" errors mid-transaction.

```sql
-- 1. Drop teams_active view (column-pinned to current shape, recreate after column drop)
DROP VIEW IF EXISTS public.teams_active;

-- 2. Drop and recreate register_team without p_team_name
DROP FUNCTION IF EXISTS public.register_team(text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.register_team(
  p_session       text,
  p_captain_name  text,
  p_captain_email text,
  p_captain_phone text
)
RETURNS jsonb AS $$
DECLARE
  v_cap          int;
  v_count        int;
  v_team_id      uuid;
  v_current_year int;
  v_fee_cents    bigint;
BEGIN
  -- Body identical to current production register_team, EXCEPT:
  --  - p_team_name parameter removed
  --  - INSERT INTO teams (...) drops team_name from columns + values lists
  --  - everything else (advisory lock, cap check, fee read, return shape) preserved
  ...
  INSERT INTO public.teams (
    session,
    payment_status,
    amount_paid_cents,
    year
  ) VALUES (
    p_session,
    'pending',
    0,
    v_current_year
  )
  RETURNING id INTO v_team_id;
  ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop the columns (now safe — no function or view references them)
ALTER TABLE public.teams  DROP COLUMN team_name;
ALTER TABLE public.scores DROP COLUMN team_name;

-- 4. Recreate teams_active view (without team_name)
CREATE OR REPLACE VIEW public.teams_active AS
  SELECT * FROM public.teams WHERE deleted_at IS NULL;
```

Reference for current `register_team` body (Forge confirmed via `pg_proc.prosrc` 2026-04-29): the body uses `p_session` and `p_team_name` only — the 3 captain params (`p_captain_name`, `p_captain_email`, `p_captain_phone`) are accepted but never referenced in the body (they were retained as vestigial back-compat after migration `20260424000002_drop_teams_captain_columns` dropped the columns they used to write to). Sprint 32 leaves them alone — minimal-scope change.

Source migration files (informational — these are successive `CREATE OR REPLACE` of the same function, not 3 separate functions):
- `supabase/migrations/20260419000006_register_team_rpc.sql` (initial CREATE)
- `supabase/migrations/20260421000002_payments_cents.sql` (REPLACE — switched amount_paid → amount_paid_cents)
- `supabase/migrations/20260424000001_update_register_team_rpc.sql` (REPLACE — most recent body shape)

Migration applied via `mcp__supabase-craven__apply_migration` against production (Craven has no staging — see `memory/projects/craven.md`).

### Server actions

| File | Change |
|---|---|
| `src/app/admin/teams/actions.ts` | `TeamInput` drops `team_name` field. `getTeams` JOIN to `contacts` via `captain_contact_id` for display. CRUD ops drop the column. All actions call `await requireAdmin()` per `feedback_admin_action_require_admin`. |
| `src/app/admin/scores/actions.ts` | `ScoreInput` drops `team_name`. `getScores` JOIN to `teams → contacts` for display. Score-form mutations require `team_id` (selected from dropdown). All actions call `requireAdmin()`. |
| `src/app/admin/contacts/actions.ts` | Type-removal guard error message at `updateContact` (current line ~250 area, post-Sprint-31 numbering — verify by grep) — the team identifier in the error string becomes the captain's full name. Aria writes the exact sentence; the constraint is the team-ID lookup goes through `team.captain.full_name` instead of `team.team_name`. |
| `src/app/api/checkout/route.ts` | Drop `team_name` from `teammates` payload shape. Stripe `metadata.team_name` (if set) becomes the captain's full name. Stripe `line_items[0].price_data.product_data.name` becomes the captain's full name. |

### RPC contract changes

| RPC | Param dropped | Callers to update |
|---|---|---|
| `register_team` | `p_team_name text` | `src/app/api/checkout/route.ts:155-160` (single `supabase.rpc` call — drop `p_team_name: team_name` line). Test contract update: `src/__tests__/register-team-rpc-contract.test.ts:144` (drop `expect(args.p_team_name).toBe(...)` assertion). |

> **Original plan referenced 3 RPCs** (`register_team_rpc`, `update_register_team_rpc`, `payments_cents`). Pre-flight 2026-04-29 confirmed those are 3 historical migration files for the same single `register_team` function — not 3 separate functions. Corrected to 1 RPC. Phase 2 Flux scope is correspondingly smaller.

### Frontend

| File | Change |
|---|---|
| `src/app/admin/teams/team-drawer.tsx` | Delete |
| `src/app/admin/teams/team-modal.tsx` | New — shadcn `<Dialog>`, `sm:max-w-[800px]`. Mirrors `contact-modal.tsx` shell. |
| `src/app/admin/teams/team-form.tsx` | Major rewrite — drop team-name input, captain picker becomes the primary identity field (use existing `contact-typeahead.tsx` pattern), 3 teammate slots + session unchanged. |
| `src/app/admin/teams/team-list.tsx` | Remove "Team Name" column. Display column = captain's full name (via JOIN). Filter, sort, delete-confirm dialog all read captain name. |
| `src/app/admin/scores/score-drawer.tsx` | Delete |
| `src/app/admin/scores/score-modal.tsx` | New — shadcn `<Dialog>`, `sm:max-w-[800px]`. Mirrors `team-modal.tsx`. |
| `src/app/admin/scores/score-form.tsx` | Major rewrite — replace freeform team-name text input with shadcn `<Select>` dropdown of active teams (captain names, alphabetized by last name). Use `items` prop on `<Select.Root>` per `feedback_base_ui_select_items`. |
| `src/app/admin/scores/score-manager.tsx` | Display column = team→captain full name. Sort + filter accordingly. |
| `src/app/admin/contacts/contact-list.tsx` | Team filter dropdown shows captain names (was team_name). Existing filter logic keys on `team_id`, just label change. |
| `src/app/admin/trash/trash-tabs.tsx` | Soft-deleted team rows display via captain JOIN. Soft-deleted score rows display via team→captain JOIN. Aria writes empty-state copy if a deleted team has a deleted captain. |
| `src/app/(public)/leaderboard/page.tsx` | Team row label = captain's full name (via JOIN). |
| `src/app/(public)/register/registration-form.tsx` | Drop the "Team Name" input + label. No replacement copy. Form section reflows to captain inputs + 3 teammate slots. |
| `src/types/database.ts` | Auto-regen post-migration. |

### Tests (TDD per memory rule)

Spec writes the failing tests first. Contract changes mean assertions update — per `feedback_forge_collateral_test_changes`, this is contract-level and goes through Spec, not Forge-direct fixup.

**Unit:**
- `team-form-submit.test.tsx` — form posts without `team_name` field; captain selection is required.
- `team-list-badge.test.tsx` — display label = captain full name.
- `team-list-deleted-contact.test.tsx` — soft-deleted captain handling.
- `team-builder-inline-contact-creation.test.tsx` — inline contact creation flow without team-name input.
- `teams-actions-errors.test.ts` — server action errors don't reference `team_name`.
- `admin-teams-actions.test.ts` — CRUD without `team_name`.
- `score-actions-validation.test.ts` — score creation requires `team_id`, no `team_name`.
- `register-team-rpc-contract.test.ts` — RPC signature without `p_team_name`.
- `register-checkout-no-captain-columns.test.ts` — checkout flow without team-name.
- `checkout-teammates.test.ts` — payload shape without `team_name`.
- `checkout-sponsorship.test.ts` — verify still green.
- `checkout-contact-paths.test.ts` — verify still green.
- `checkout-session-cap.test.ts` — verify still green.
- `database-types.test.ts` — generated types no longer include `team_name`.
- `contacts-actions.test.ts` — type-removal guard error sentence references captain (Aria's final sentence applied via fixup).
- `trash-actions.test.ts` — deleted-team display via captain.
- `trash-table-extraction.test.tsx` — verify still green.
- `trash-tabs-polish.test.tsx` — verify still green.
- `admin-destructive-copy-234.test.tsx` — verify still green (delete-confirm copy).
- `contact-list.test.tsx` — fixtures (lines 38, 210) reference `team_name`; update to drop the field.
- `(public)/leaderboard/__tests__/leaderboard-prospect-capture.test.tsx` — type + fixtures (lines 56, 73–74) reference `team_name`; update for captain-derived display.
- `admin/scores/__tests__/score-manager.test.tsx` — fixture (line 96) references `team_name`; update for team→captain JOIN display.
- `admin/teams/__tests__/team-list.test.tsx` — fixture (line 70) references `team_name`; update for captain-derived display.

**E2E:**
- `tests/e2e/team-create-edit.spec.ts` (new or rename existing) — open admin teams, click Add Team, confirm centered modal, fill captain, save, confirm row displays captain name.
- `tests/e2e/score-create-edit.spec.ts` (new or rename existing) — open admin scores, click Add Score, confirm centered modal with team dropdown, save, confirm row displays captain name.
- `tests/e2e/register-flow.spec.ts` (verify or new) — public registration with no team-name input, captain inputs become team identity.
- `tests/e2e/leaderboard.spec.ts` (verify or new) — public leaderboard rows show captain names.

**Test renames:**
- `src/__tests__/teams-drawer.test.tsx` → `src/__tests__/teams-modal.test.tsx`
- `src/__tests__/scores-drawer.test.tsx` → `src/__tests__/scores-modal.test.tsx`

`fireEvent.change` for any string field >50 chars per `feedback_no_user_type_long_strings`.
Coverage target: 50%+ on changed files.

### Files (concrete list)

**Add:**
- `supabase/migrations/<timestamp>_drop_team_name.sql`
- `src/app/admin/teams/team-modal.tsx`
- `src/app/admin/scores/score-modal.tsx`
- `tests/e2e/team-create-edit.spec.ts` (or rename existing)
- `tests/e2e/score-create-edit.spec.ts` (or rename existing)

**Modify:**
- `src/app/admin/teams/team-form.tsx`
- `src/app/admin/teams/team-list.tsx`
- `src/app/admin/teams/actions.ts`
- `src/app/admin/scores/score-form.tsx`
- `src/app/admin/scores/score-manager.tsx`
- `src/app/admin/scores/actions.ts`
- `src/app/admin/contacts/contact-list.tsx`
- `src/app/admin/contacts/actions.ts`
- `src/app/admin/trash/trash-tabs.tsx`
- `src/app/(public)/leaderboard/page.tsx`
- `src/app/(public)/register/registration-form.tsx`
- `src/app/api/checkout/route.ts`
- `src/types/database.ts` (auto-regen)
- 23 test files listed above

**Delete:**
- `src/app/admin/teams/team-drawer.tsx`
- `src/app/admin/scores/score-drawer.tsx`

**Rename:**
- `src/__tests__/teams-drawer.test.tsx` → `src/__tests__/teams-modal.test.tsx`
- `src/__tests__/scores-drawer.test.tsx` → `src/__tests__/scores-modal.test.tsx`

### Pattern conventions baked in (no memory rule changes needed)

- Per `feedback_drawer_edit_pattern`: centered modal is the standard, drawer is retired. This sprint migrates teams + scores. Sponsors and registrations continue to ride on the "next touched" rule.
- Per `feedback_migration_cross_repo_grep`: cross-repo grep done at brainstorm time (43 files). Compass enumerates all 43 in tickets — no implicit out-of-scope assumptions.
- Per `feedback_verify_against_prod_not_source`: Phase 1 pre-flight runs against prod before migration is written.
- Per `feedback_admin_action_require_admin`: every server action touched in this sprint calls `await requireAdmin()` first.
- Per `feedback_base_ui_select_items`: score-form team picker passes `items` prop on `<Select.Root>`.
- Per `feedback_no_user_type_long_strings`: tests use `fireEvent.change` for any string field >50 chars.
- Per `feedback_bolt_no_inline_dups`: Bolt searches for canonical token names (e.g., `bg-warning-muted`) before falling back to raw Tailwind for any new chip color (none expected this sprint, but the rule applies if Bolt adds anything).
- Per `feedback_design_preview_strings_locked`: any strings approved in this plan ship verbatim. Aria's deferred copy gets a separate approval cycle when sentence-shape lands.
