# Sprint 31 — Contacts Can Be More Than One Thing

> Approved by Scott 2026-04-29. Forge wrote this plan; the brainstorm transcript that produced it lives in `~/.claude/plans/this-is-a-golf-valiant-glacier.md`. The body that follows is the plain-English specification — Compass breaks it into issues, Spec writes failing tests first, Flux handles schema + backend, Bolt handles frontend, Watchdog reviews each PR.

## What this sprint actually does

Right now a contact is one thing — Lacie is *either* a Player *or* a Sponsor *or* a Donor *or* Other. Real life isn't that tidy. Lacie plays in the tournament *and* her business sponsors a tee sign. We can't capture that today, and the contacts page sometimes lies because of it.

This sprint fixes two things at once:

1. **A contact can be marked as multiple types at the same time.** Player + Sponsor. Sponsor + Donor. Whatever's true.
2. **The edit form moves out of the side drawer and into a centered window.** Side drawers don't fit laptop and tablet workflows — those platforms expect a centered window when you open a record to edit. The size of the drawer (480px or wider) wasn't the problem; the pattern itself was. The new edit window is roughly 800px wide and lives in the middle of the screen where you can focus on it.

Everything else (catalog cleanup, team naming, donor history) is its own work, called out at the bottom.

---

## What you'll experience after this ships

### Browsing the contacts list
Each row shows one or more colored chips for what that contact is — Player (teal), Sponsor (purple), Donor (green), Other (gray) — always in that order. Filter by "Player" and you see every player, including people who are also sponsors. Search and the rest of the list works the same as today.

### Editing a contact
Click any row → a centered window opens (used to slide in from the right). Up top: the basics you already have — name, email, phone, address. Then a row of four checkboxes: **Player / Sponsor / Donor / Other**. Check whichever apply.

When you check **Player**, a small section appears with two new fields:
- **Handicap** — their current golf handicap
- **Shirt size** — pick from S, M, L, XL, 2XL, 3XL

When you check **Donor**, a section appears with two new fields:
- **Show name publicly** — toggle for anonymous-by-default donors
- **Recognition name** — what to print on a tribute wall, e.g. "The Smith Family" instead of "John Smith". If left blank, we use their full name.

**Sponsor** and **Other** are just checkboxes — no extra fields. (Sponsor data lives on the sponsorship itself, not on the contact.)

### A safety net you didn't have before
You can't accidentally remove someone's Player type if they're still on a team. The system blocks it and tells you why:

> *"Lacie is on Team Mulligans. Remove her from the team first, then change her type."*

Same for sponsors who are linked to a sponsorship. No more silent breaks.

### Bulk actions
Today: select rows, set their type to one value. After: three actions instead of one.
- **Set types** — overwrite their types with the choice you make
- **Add a type** — e.g. select 50 people who bought balloons last year, click *Add type → Donor*
- **Remove a type** — runs the same safety check, tells you which ones it had to skip and why

500-row cap per bulk action stays.

### Importing CSVs
The CSV importer keeps doing what it does — guessing types from the GOLFER column. After import you can edit any contact and add more types by hand. Nothing about the import flow changes for you.

---

## Decisions you and I locked in this conversation

| What | Decision |
|---|---|
| Contacts can hold multiple types | ✅ |
| Edit window | Centered, ~800px wide |
| Player fields on the contact | Handicap, shirt size |
| Sponsor fields on the contact | None (data lives on the sponsorship) |
| Donor fields on the contact | Anonymous toggle, recognition name |
| Other fields on the contact | None |
| Removing a type that's in use | Blocked with a clear message |
| List display | Stacked chips per contact |
| Bulk update | Set / Add / Remove |
| Pattern rule going forward | Centered window is the standard for admin CRUD edits. Side drawer is retired. Other admin forms (sponsors, teams, registrations) migrate to the new pattern as they're next touched in regular work — no sweeping refactor. |

---

## Three small open questions for the build

These don't block plan approval — Compass can park them on tickets — but I want to flag them so they don't get decided silently:

1. **Shirt size** — dropdown of S / M / L / XL / 2XL / 3XL? (I recommend yes — makes ordering shirts in bulk easier later.)
2. **Handicap** — integer 0–54 (the USGA range), and blank is allowed. Sound right?
3. **Recognition name when blank** — fall back to the contact's full name. Sound right?

---

## How we'll know it actually works after merge

Plain-English checklist someone could run on a Saturday:

1. Find a contact who's both a player and a sponsor. Confirm both chips show on the list.
2. Open the edit window. Confirm it's centered and comfortable on your laptop.
3. Check Player and Donor. The two new sections appear inline.
4. Pick someone you know is on a team. Try to uncheck Player. Confirm the error message names the team and the change is blocked.
5. Filter the list by Player. Confirm multi-type contacts still show up.
6. Bulk-add Donor to three test rows. Confirm they all update.
7. Re-import a known CSV. Confirm it still works.

---

## What's NOT in this sprint (and why)

These are real, you've raised them, and they're on the books. They're separate so each one stays small enough to review and ship cleanly.

- **Sprint A.1 — Team naming refactor.** Teams don't really have names; use the captain's. Touches the team filter, receipts, emails, and the registration flow. Different blast radius from contacts work, so it gets its own plan and PR.
- **Sprint B — Catalog cleanup.** Balloons, yard signs, and corporate sponsorships are all jumbled into one table today. Sprint B sorts them into three buckets (sponsorships, tributes, supporter items), keeps the public /sponsors page only showing real sponsors, and gives you a separate Tributes admin tab. This touches Stripe checkout and the public site, so it's a bigger surface area — better as its own sprint.
- **Donor history.** A future need. Today "Donor" is just a label — there's no donations table yet. Adding one is a separate decision; until then, the Donor checkbox + recognition name are useful on their own.
- **Migrating sponsors / teams / registrations to the centered-window pattern.** They sit in side drawers today for the same platform-fit reason contacts is being moved. We won't sweep them in this sprint — they get migrated the next time each one is touched in regular work. The pattern rule is updated now so the next builder who opens those files knows what to do.

---

## How the work gets built (so you know who's involved)

- **Compass** turns this plan into tickets with clear acceptance criteria.
- **Spec** writes failing tests first (per our TDD rule).
- **Flux** handles the database change + the type-system regeneration.
- **Bolt** builds the modal, the form, the list display, and the bulk actions.
- **Watchdog** reviews every PR and compares the live preview against the design before approving.

Single PR per builder, in order: tests first → database → backend logic → frontend. Watchdog reviews each separately so nothing gets bundled.

---

## Technical appendix

*This part is for Compass and the builders. You don't need to read it — it's here for the record so the implementation matches the conversation we had.*

### Pre-flight findings (run 2026-04-29 by Forge via Supabase MCP)

| Check | Finding |
|---|---|
| `contacts.type` distribution (active rows) | 164 donor / 138 player / 74 sponsor / 1 other = 377 total |
| `contacts_active` view definition | Explicitly lists every column **including** `type` (NOT `SELECT *`). Must be `DROP VIEW` → drop column → recreated with the new shape |
| Public views referencing `contacts` | Only `contacts_active` |
| Public functions referencing `contacts.type` | None |
| RLS policies referencing `type` on contacts/team_members/sponsor_contacts/teams/sponsors/sponsorship_items | None |
| User-defined triggers on `contacts` | None |
| Constraints on `contacts` | `contacts_pkey`, `contacts_deleted_by_fkey`, `contacts_type_check` (CHECK on `type`). `contacts_type_check` drops with the column. New CHECK on `types` array replaces it |
| Existing indexes on `contacts` | `contacts_pkey`, `contacts_email_unique_when_present`, `idx_contacts_marketing`, `idx_contacts_not_deleted`, `idx_contacts_source`, `idx_contacts_type` (drop this one) |
| Join membership reality | Of 138 `type=player` contacts, only **1** is in `team_members`. Of 74 `type=sponsor` contacts, only **1** is in `sponsor_contacts` (same contact, in both — labeled `player`). Type-removal guard rarely triggers in current data; one mislabeled contact will need manual cleanup post-migration |

The migration is straightforward — no hidden dependencies, no triggers, no policies. Backfill is safe (`UPDATE contacts SET types = ARRAY[type]`).

### Pre-flight (was done — leaving the original requirement here for reference)
Per `feedback_verify_against_prod_not_source`, query the live Craven database via the service key (`~/.openclaw/secrets/supabase-craven-service-key`, ref `kybfsxjruczbiokucyft`) before writing the migration:
- Distribution of current `contacts.type` values. ✅
- Every view, function, policy, or trigger that references `contacts.type`. ✅
- Any RLS policy referencing `type`. ✅
- Any constraint named like `contacts_type_check` that would conflict with the new shape. ✅

### Schema migration
File: `supabase/migrations/<timestamp>_contacts_multi_type.sql` in `~/github/craven-cancer-classic`.
1. `ALTER TABLE contacts ADD COLUMN types text[] NOT NULL DEFAULT ARRAY['other'];`
2. Backfill: `UPDATE contacts SET types = ARRAY[type] WHERE type IS NOT NULL;`
3. CHECK constraint: `types <@ ARRAY['player','sponsor','donor','other']::text[] AND array_length(types, 1) >= 1`.
4. Add `handicap smallint` (CHECK 0–54 if non-null), `shirt_size text` (CHECK S/M/L/XL/2XL/3XL if non-null), `anonymous_default boolean NOT NULL DEFAULT false`, `recognition_name text`.
5. Drop dependent views, then `ALTER TABLE contacts DROP COLUMN type;`, then recreate `contacts_active` with explicit columns (no `SELECT *`).
6. `CREATE INDEX idx_contacts_types ON contacts USING GIN (types) WHERE deleted_at IS NULL;`
7. `DROP INDEX IF EXISTS idx_contacts_type;`
8. Regen TypeScript types via Supabase MCP.

### Server actions — `src/app/admin/contacts/actions.ts`
- `ContactInput.types: ContactType[]` (was singular). Add `handicap`, `shirt_size`, `anonymous_default`, `recognition_name`.
- `getContacts` filter compiles to `.contains('types', [filter.type])` (replaces the existing equality at ~line 57 in `actions.ts:36–68`).
- `updateContact` (lines 238–297): when `types` is being set, run removal-guard. If old contains `player` and new does not, query `team_members` for `contact_id`. If rows exist, return `{ error: "<contact_name> is on <team_display_name>. Remove from team first." }`. Same for `sponsor` against `sponsor_contacts`.
- Replace `bulkUpdateContacts` (lines 312–330) with `bulkSetContactTypes`, `bulkAddContactType`, `bulkRemoveContactType`. Add/Remove run the removal-guard per row and return `{ updated, blocked: [{id, reason}] }`. 500-row cap unchanged.
- All actions call `await requireAdmin()` first per `feedback_admin_action_require_admin`.

### Frontend
| File | Change |
|---|---|
| `src/app/admin/contacts/contact-drawer.tsx` | Delete |
| `src/app/admin/contacts/contact-modal.tsx` | New — shadcn `<Dialog>`, `sm:max-w-[800px]`. Mirrors current drawer structure |
| `src/app/admin/contacts/contact-form.tsx` | Major rewrite — multi-select chip group, conditional Player + Donor blocks, two-column rows, server-error display for guard. base-ui `<Select>` with `items` prop per `feedback_base_ui_select_items` |
| `src/app/admin/contacts/contact-list.tsx` | Replace single TypeBadge with array map (reuse `TYPE_BADGE_CLASSES` map at lines 37–52). Update client-side filter from `c.type === filterType` to `c.types.includes(filterType)` (lines 156–168). Replace bulk type dropdown with three buttons |
| Supabase types file | Regen after migration |

### CSV import
- `src/app/admin/contacts/csv-parser.ts` — `deriveSuggestedType(...)` (lines 127–135) returns single-element `ContactType[]`.
- `src/app/admin/contacts/import-actions.ts` — inserts write `types` array.
- Preview UI shows derived type as a single value; admin edits later to add types.

### Files (concrete list)
**Add:**
- `supabase/migrations/<timestamp>_contacts_multi_type.sql`
- `src/app/admin/contacts/contact-modal.tsx`
- `tests/e2e/contact-type-removal-guard.spec.ts`

**Modify:**
- `src/app/admin/contacts/contact-form.tsx`
- `src/app/admin/contacts/contact-list.tsx`
- `src/app/admin/contacts/actions.ts`
- `src/app/admin/contacts/import-actions.ts`
- `src/app/admin/contacts/csv-parser.ts`
- `src/__tests__/contacts-actions.test.ts`
- `src/__tests__/contacts-update-coverage.test.ts`
- `tests/e2e/contact-create-edit.spec.ts`
- `tests/e2e/contact-bulk-subscribe.spec.ts` (verify still green)
- Supabase generated types file

**Delete:**
- `src/app/admin/contacts/contact-drawer.tsx`

**Memory (in `~/github/forge`):**
- Replace `memory/feedback_drawer_edit_pattern.md` with the new pattern rule: *"Centered modal (shadcn `Dialog`, default `sm:max-w-[800px]`) is the standard for admin CRUD edits. Side drawers (`Sheet`) are retired — they don't fit laptop/tablet admin workflows. Existing drawer-based admin forms (sponsors, teams, registrations) migrate to modal as they're next touched in regular work; do not sweep."*

### Reused utilities
- `requireAdmin()` — gate every server action.
- `softDelete` / `bulkSoftDelete` — delete flow unchanged.
- `normalizeEmail` / `normalizePhone` / `deriveFullName` — unchanged.
- `TYPE_BADGE_CLASSES` map at `contact-list.tsx:37–52` — reuse for stacked chips.

### Tests (TDD per memory rule)
**Unit:**
- `contacts-actions.test.ts`: `types[]` round-trip on create + update; bulk Set/Add/Remove happy + blocked paths; type-removal guard returns error when `team_members` row exists; same for `sponsor_contacts`; filter compiles to `contains('types', ...)`.
- `contacts-update-coverage.test.ts`: partial update preserves untouched type-specific columns.

**E2E:**
- `contact-create-edit.spec.ts`: multi-select types; Player section visible iff player checked; Donor section visible iff donor checked; save with `['player','sponsor']` round-trips.
- `contact-type-removal-guard.spec.ts` (new): seed contact + team membership; open modal; uncheck Player; expect inline error referencing team; types unchanged.
- `contact-bulk-subscribe.spec.ts`: verify green after bulk action bar refactor.
- Modal interaction (focus trap, ESC, click-outside) if shadcn Dialog defaults aren't sufficient.

`fireEvent.change` for any string field >50 chars per `feedback_no_user_type_long_strings`.
Coverage target: 50%+ on changed files.
