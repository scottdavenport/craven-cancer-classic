# Sponsors Registry + Contact Linking + Scrape Import

## Context

Scott asked to scrape the legacy site `cravencancerclassic.org` for current sponsors and populate the admin sponsors list. During scoping, the ask expanded:

1. Sponsors should persist as a registry (not disappear when year rolls over).
2. Each sponsor needs an active/inactive state independent of soft-delete.
3. Sponsor contacts should be proper relationships to the unified `contacts` table (the model S9 established for teams), not denormalized text fields.

Current state (verified via schema probe):
- `sponsors` has denormalized `contact_name/email/phone` text columns, no status field, `tier_id` NOT NULL, year-scoped.
- `/admin/sponsors` `getSponsors()` filters by current year only.
- No `sponsor_contacts` join table.
- `contacts.type` enum already includes `'sponsor'` (S9 unified roster).
- `team_members` is the reference pattern (team_id CASCADE, contact_id RESTRICT, role CHECK, unique(team_id, contact_id)).
- 1 sponsor in prod (ThinkCode, Scott Davenport as denorm contact).

**Scrape result:** 14 sponsor rows from cravencancerclassic.org homepage:
- Champion ($5k): Carolina East Health, Fuel Market, 2 unnamed
- Eagle ($2.5k): Sports Connection, Chick-fil-A, BSH, SMDonation (unnamed), 1 unnamed screenshot
- Morning Biscuit (no matching tier): TIC
- Shot of the Day (no matching tier): Tony Tresie, Richard & Cathy, 2 unnamed

## Decisions locked (Forge + Scott, 2026-04-20)

1. **Year model:** all-time registry with year filter. Keep `sponsors.year`, default `/admin/sponsors` list to current year with filter UI.
2. **Contact model:** join-table only. Drop denorm `contact_*` fields. Backfill existing denorm data into contacts + sponsor_contacts during migration.
3. **Status shape:** two-state `is_active: boolean DEFAULT true`. Combined with year, covers current/historic/paused.
4. **Scope:** full end-state this session — 3 serial PRs.

## Silent defaults (no further decision needed; call out if you want changed)

- New tiers added for scrape mapping: **Morning Biscuit Sponsor** and **Shot of the Day**. Inserted with `active=false`, `price_cents=0`, `year=2026` (Scott sets prices via admin UI later).
- Scraped sponsor rows default: `year=2026`, `is_active=true`, `payment_status='pending'`, `amount_paid_cents=0`, `display_order` by tier then name.
- Unnamed scraped sponsors: name = `"(Champion Sponsor #N — rename)"` / `"(Eagle Sponsor #N — rename)"` etc. Logo URL from Squarespace CDN.
- `sponsor_contacts.role` CHECK values: `'primary' | 'billing' | 'other'`, default `'primary'`.
- Sponsor-delete cascade: sponsor_contacts rows cascade (mirrors team_members → teams pattern).
- Contact-delete restriction: RESTRICT (blocks deleting a contact still linked to a sponsor; admin must unlink first).
- Backfill dedup: if a contact with same email already exists, link to it; otherwise create new contact with `source='migration_from_sponsor_denorm'`.
- Scraped sponsors get NO contact links (no contact data scraped). Scott links via UI after import.

---

## PR A — Schema migration + backfill (Flux)

**Branch:** `s18-a-sponsor-registry-schema`
**Closes:** none yet — tracks against a new issue Forge files ("sponsor registry: status + contact join")

### Files

New migration: `supabase/migrations/YYYYMMDDHHMMSS_sponsor_registry_and_contacts.sql`

Content:
1. `ALTER TABLE public.sponsors ADD COLUMN is_active boolean NOT NULL DEFAULT true;`
2. Create `public.sponsor_contacts` table — mirror `team_members` exactly (see reference below):
   - id, sponsor_id (FK CASCADE), contact_id (FK RESTRICT), role (CHECK primary/billing/other, default primary), created_at
   - UNIQUE (sponsor_id, contact_id)
   - Indexes on both FKs
   - RLS: admin ALL, viewer SELECT
3. `INSERT INTO public.sponsorship_items` — Morning Biscuit Sponsor (active=false, price=0), Shot of the Day (active=false, price=0), both year=2026, sort_order placed after existing low tiers.
4. Backfill block (PL/pgSQL DO):
   - For each sponsors row with non-null contact_name/email/phone:
     - If `contacts` row exists with matching email (non-null) → use that contact_id
     - Else INSERT new contact (type='sponsor', source='migration_from_sponsor_denorm')
     - INSERT sponsor_contacts row (role='primary')

### Reference pattern (from `20260423000001_unified_contacts_schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS public.sponsor_contacts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id  uuid        NOT NULL REFERENCES public.sponsors(id)  ON DELETE CASCADE,
  contact_id  uuid        NOT NULL REFERENCES public.contacts(id)  ON DELETE RESTRICT,
  role        text        NOT NULL CHECK (role IN ('primary', 'billing', 'other')) DEFAULT 'primary',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sponsor_id, contact_id)
);
ALTER TABLE public.sponsor_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage sponsor_contacts"
  ON public.sponsor_contacts FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Viewers can select sponsor_contacts"
  ON public.sponsor_contacts FOR SELECT
  USING (public.is_admin_or_viewer());
CREATE INDEX idx_sponsor_contacts_sponsor_id ON public.sponsor_contacts(sponsor_id);
CREATE INDEX idx_sponsor_contacts_contact_id ON public.sponsor_contacts(contact_id);
```

### Acceptance

- [ ] `sponsors.is_active` column exists, defaults true, all existing rows = true
- [ ] `sponsor_contacts` table created with RLS + indexes + constraints
- [ ] 2 new tiers exist in `sponsorship_items` (Morning Biscuit, Shot of the Day), both `active=false`
- [ ] Existing sponsor with denorm contact data has a `sponsor_contacts` row linking to a contact (either pre-existing by email match or newly created)
- [ ] Migration rollback-safe if needed (document manual revert steps in migration header comment)

### TDD (Spec)

- Tests in `src/__tests__/sponsor-registry-migration.test.ts`:
  - `sponsor_contacts` row exists for the pre-migration ThinkCode sponsor after running the backfill against a fresh DB
  - Backfill creates a contact of type='sponsor' if no email match
  - Backfill reuses existing contact if email matches

---

## PR B — UI: contact picker + year/status filter (Bolt)

**Branch:** `s18-b-sponsor-ui`
**Depends on:** PR A merged (schema must exist)

### Files modified

- `src/app/admin/sponsors/actions.ts`
  - `getSponsors(year?, is_active?)` — accept optional year + status filters, drop the hard-coded current-year filter
  - New: `getSponsorContacts(sponsorId)` — returns contact rows linked to a sponsor
  - New: `linkSponsorContact(sponsorId, contactId, role)` — INSERT sponsor_contacts
  - New: `unlinkSponsorContact(sponsorId, contactId)` — DELETE sponsor_contacts
  - `createSponsor` — NO LONGER writes contact_name/email/phone; accepts optional `contact_ids: string[]` to link via sponsor_contacts
  - `updateSponsor` — same
  - Add `is_active` to insert/update payloads

- `src/app/admin/sponsors/sponsor-form.tsx`
  - Remove contact_name / contact_email / contact_phone `<Input>` + validation code
  - Add `<ContactTypeahead>` (reuse from `src/app/admin/teams/` — S9 team builder) for multi-select contact picker
  - Add inline "+ Add new contact" button (reuses existing `createContact` action, then links)
  - Add `is_active` segmented toggle (Active / Inactive) — follow Active toggle patterns from `sponsorship-form.tsx` (which has `active: true/false`)
  - Preserve `items={...}` on Sponsorship level Select (S14/S15 retro — don't regress)

- `src/app/admin/sponsors/sponsor-list.tsx`
  - Add year filter dropdown (distinct years from sponsors data, default current year)
  - Add status filter (All / Active / Inactive, default All)
  - Show "Inactive" badge on row when `is_active=false`
  - Existing search/sort from S15 preserved
  - Don't break `onSuccess={refetch}` wiring from S15

- `src/app/admin/sponsors/page.tsx`
  - Pass year from URL search params or default
  - Pass contacts list to SponsorList / drawer (for the typeahead)

- `src/app/admin/sponsors/sponsor-drawer.tsx`
  - Update props/plumbing for new form shape

### Existing utilities to reuse (verified in S9)

- `ContactTypeahead` — `src/app/admin/teams/` (check exact path during build; pattern includes 200ms debounce + cross-picker exclusion + pill chips)
- `createContact` action — `src/app/admin/contacts/actions.ts`
- `getContacts` or similar query — check S9 files

### Acceptance

- [ ] Year filter shows on /admin/sponsors, default = current year, changing it refetches
- [ ] Status filter shows All/Active/Inactive
- [ ] Sponsor drawer has a contact picker using ContactTypeahead; multi-select with pill chips
- [ ] "+ Add new contact" inline works (creates contact, auto-links)
- [ ] Sponsor row shows "Inactive" badge when applicable
- [ ] Search + sort still work (S15 regression guards stay green)
- [ ] Select `items` prop intact on Sponsorship level Select

### TDD (Spec)

Extend `src/__tests__/sponsor-list.test.tsx` + `sponsor-form.test.tsx`:
- Year filter narrows rows
- Status filter narrows rows
- Contact picker links/unlinks via sponsor_contacts
- Inactive badge rendering
- All existing S15 assertions still pass

---

## PR C — Drop denorm columns + scrape import (Flux + Forge)

**Branch:** `s18-c-sponsor-denorm-drop-and-import`
**Depends on:** PR B merged (UI no longer reads denorm)

### Files

New migration: `supabase/migrations/YYYYMMDDHHMMSS_sponsor_denorm_drop_and_seed.sql`

Content:
1. **Dependency audit first** (per `feedback_migration_dependency_audit`): grep views/functions/policies for `contact_name`, `contact_email`, `contact_phone` on sponsors. The `sponsors_active` view uses `SELECT *` — must DROP + CREATE OR REPLACE with explicit columns OR let it reform naturally (but `SELECT *` pins columns at view creation, so DROP first).
2. `DROP VIEW public.sponsors_active;`
3. `ALTER TABLE public.sponsors DROP COLUMN contact_name, DROP COLUMN contact_email, DROP COLUMN contact_phone;`
4. `CREATE OR REPLACE VIEW public.sponsors_active AS SELECT * FROM public.sponsors WHERE deleted_at IS NULL;`
5. Seed 14 scraped sponsors via INSERT:
   - Map tier_id by tier name (Champion → Champion tier id, Eagle → Eagle tier id, Morning Biscuit → new tier id, Shot of Day → new tier id)
   - Use the scraped Squarespace CDN logo URLs
   - is_active=true, year=2026, payment_status='pending', amount_paid_cents=0
   - For known names: "Carolina East Health", "Fuel Market", etc.
   - For unnamed: "(Champion Sponsor — rename)" etc.
   - No sponsor_contacts rows (Scott adds via UI after import)

### Seed data (verbatim from scrape)

| # | tier | name | logo_url (Squarespace CDN) |
|---|---|---|---|
| 1 | Champion | Carolina East Health | `.../carolinaeast-feature.jpeg` |
| 2 | Champion | Fuel Market | `.../Fuel-Market-Metallic-Oval-logo.jpg` |
| 3 | Champion | (Champion Sponsor — rename) | `.../CCC+Personal+Oct+20+2022+%283%29.png` |
| 4 | Champion | (Champion Sponsor — rename) | `.../CCC+Personal-4.png` |
| 5 | Eagle | Sports Connection | `.../sportsconnection.png` |
| 6 | Eagle | Chick-fil-A | `.../Chick-fil-A+White+Script...jpg` |
| 7 | Eagle | BSH | `.../BSH_logo.jpg` |
| 8 | Eagle | (Eagle Sponsor — rename, was SMDonation) | `.../SMDonation.png` |
| 9 | Eagle | (Eagle Sponsor — rename, was Screenshot) | `.../Screenshot+2025-08-19...png` |
| 10 | Morning Biscuit | TIC | `.../TIC_Logo_PNG.png` |
| 11 | Shot of the Day | Tony Tresie | `.../TonyTresie.png` |
| 12 | Shot of the Day | Richard & Cathy | `.../RichardCathy.png` |
| 13 | Shot of the Day | (Shot of Day Sponsor — rename) | `.../CCC+Personal+Oct+20+2022.png` |
| 14 | Shot of the Day | (Shot of Day Sponsor — rename) | `.../CCC+Personal+Oct+20+2022+%281%29.png` |

### Acceptance

- [ ] Dependency audit confirms no views/functions/policies reference dropped columns (except `sponsors_active` view which gets recreated)
- [ ] Denorm columns dropped from sponsors table
- [ ] `sponsors_active` view recreated (bare SELECT * WHERE deleted_at IS NULL)
- [ ] 14 seed rows exist in production sponsors table, year=2026, is_active=true
- [ ] 2 new tiers active in admin-visible catalog (but still inactive for public purchase — Scott flips to active when ready)
- [ ] /admin/sponsors shows 15 rows total (14 imported + 1 existing ThinkCode)
- [ ] Logo URLs resolve (Squarespace CDN)

### Verification end-to-end (after all 3 PRs merged)

1. `/admin/sponsors` loads 15 rows (14 scraped + ThinkCode), year filter default 2026
2. Change year filter to 2022 → 0 rows (no historic sponsors yet)
3. Status filter "Inactive" → 0 rows initially
4. Edit Carolina East Health → drawer opens → "Contacts" picker empty (expected; Scott adds later)
5. Toggle sponsor to Inactive → row disappears from "Active" filter, appears in "Inactive"
6. Delete a contact linked to an existing sponsor → should be blocked (RESTRICT) with a clear error
7. Hard-delete a sponsor → its sponsor_contacts rows cascade-delete
8. Public /sponsors page still renders correctly (consumers of `sponsors_active` view untouched by column drop)

## Retro carryovers applied

- Plan commit verified on origin before any plan-delete (S17 hotfix lesson)
- One `Closes #N` per line in PR bodies (S15 retro)
- `requireAdmin()` first call in every new admin server action (S16 retro — linkSponsorContact / unlinkSponsorContact / getSponsorContacts)
- No `user.type()` with long strings in new tests; use `fireEvent.change` (S17 hotfix retro)
- Preserve `items={...}` prop on all existing `<Select>` in sponsor-form.tsx (S14/S15 retro)
- Dependency audit before DROP COLUMN (S11 retro — `teams_active` view failure)
- Vercel-preview verified after PR B + PR C deploys before declaring ship complete (S15 hotfix retro — local build ≠ Vercel runtime)
- No new npm deps that pull jsdom/puppeteer/C-bindings (S15 hotfix lesson — see `feedback_vercel_dep_risk.md`)

## Out of scope

- Stripe integration for these imported sponsors (they're marked payment_status='pending' with 0 amount — Scott manually tracks)
- Automatic Supabase Storage upload of scraped logos (Squarespace CDN URLs stored directly per Scott's ask — "import as is")
- Public /sponsors page redesign (existing consumer of `sponsors_active` stays functional through column drop)
- Sponsor history aggregation / multi-year reporting (future enhancement if needed)

## Critical files for reviewers

- `supabase/migrations/20260423000001_unified_contacts_schema.sql` — `team_members` reference pattern
- `supabase/migrations/20260419191227_soft_delete_foundation.sql` — `sponsors_active` view DDL to recreate
- `src/app/admin/teams/` — `ContactTypeahead` source for PR B
- `src/app/admin/sponsors/sponsor-form.tsx` — form shape to modify
- `src/app/admin/sponsors/sponsor-list.tsx` — filter UI to add
- `src/app/admin/sponsors/actions.ts` — action signatures to update
