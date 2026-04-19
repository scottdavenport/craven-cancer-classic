# Sprint 9 — Unified Contacts Roster + Team Builder + CSV Import

**Sprint goal:** Evolve `contacts` into the canonical people table (unified roster/marketing), introduce the `team_members` join table, import 375-row mailing list, rework the admin team-building UI, and extend public captain registration to collect teammate info.

**Target dates:** ~2 weeks (10 issues, ~38h estimated builder time)

**Baseline:** 205/205 tests green, tsc clean, main at post-Sprint 8. No active worktrees.

**Locked decisions (from Scott interview 2026-04-18):**
- Path A — `contacts` is the canonical people table; no parallel "roster" table
- Fixed 4-person teams (1 captain + 3 players) via new `team_members` join table
- `teams.captain_*` text columns deprecate this sprint (stop writing them); drop deferred to Sprint 10+
- CSV import is one-off (375 rows, mailing list); no recurring import support
- No email sending from app; marketing export only (respects `marketing_consent`)
- No admin-generated payment link, no Stripe provider switch, no team copy-over wizard — all Sprint 10+

---

## Research findings (verified before writing this plan)

### contacts — current schema

**`supabase/migrations/20260414000001_initial_schema.sql`** lines 338–357:

```sql
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,           -- ← currently NOT NULL; must become nullable
  phone text,
  type text not null default 'other' check (type in ('player', 'sponsor', 'donor', 'other')),
  year_first_seen int not null default extract(year from now()),
  notes text,
  created_at timestamptz not null default now()
);
```

Indexes: `idx_contacts_email on contacts(email)` (line 436), `idx_contacts_type on contacts(type)` (line 437).

**Missing columns** (all new in S9-0): `first_name`, `last_name`, `salutation`, `address1`, `address2`, `city`, `state`, `zip`, `company`, `marketing_consent`, `source`.

**`src/types/database.ts`** lines 37–68: `contacts` Row has `email: string` (NOT NULL in types). Must be manually changed to `email: string | null` after migration.

### teams — current schema

**`supabase/migrations/20260414000001_initial_schema.sql`** lines 148–171:

```sql
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  team_name text not null,
  captain_name text not null,    -- deprecate: stop writing, keep column
  captain_email text not null,   -- deprecate: stop writing, keep column
  captain_phone text,            -- deprecate: stop writing, keep column
  session text not null check (session in ('morning', 'afternoon')),
  payment_status text not null default 'pending' check (...),
  stripe_payment_id text,
  amount_paid_cents bigint not null default 0,  -- renamed in 20260421000002_payments_cents.sql
  notes text,
  year int not null default extract(year from now()),
  created_at timestamptz not null default now()
);
```

**`supabase/migrations/20260421000002_payments_cents.sql`** line 23: renamed `amount_paid` → `amount_paid_cents`, typed as `bigint`.

**New column needed:** `captain_contact_id uuid` FK → `contacts(id)`, nullable. Required for new teams built via admin UI; null for legacy rows.

### register_team RPC

**`supabase/migrations/20260421000002_payments_cents.sql`** lines 35–135 (full recreation):
- Signature: `register_team(p_session, p_team_name, p_captain_name, p_captain_email, p_captain_phone?)`
- Still writes `captain_name`, `captain_email`, `captain_phone` to `teams` — this sprint we will continue writing these (public registration flow still uses them for Stripe and webhook contact upsert). The deprecation is "stop writing in admin-built flows" only.
- RPC must be updated in S9-0 to also insert into `team_members` for the captain (slot 1, role 'captain') when called from public registration. This requires creating/finding the contact and linking via `captain_contact_id`.

### captain_* readers — full blast radius

All files that read `captain_name / captain_email / captain_phone` from `teams`:

| File | Lines | Impact |
|---|---|---|
| `src/types/database.ts` | 522–553 | types — manual edit needed for new columns |
| `src/app/admin/registrations/actions.ts` | 41–43 | writes captain_* on manual create — deprecate in S9-5 (admin builder) |
| `src/app/admin/registrations/registration-list.tsx` | 56–57, 111–113, 215–229, 325–327 | reads captain_* for display, search, CSV export — keep reading during transition |
| `src/app/(public)/register/registration-form.tsx` | 76–78, 173–188 | sends captain_* to /api/checkout — keep intact |
| `src/app/api/checkout/route.ts` | 26–35, 40, 68–70, 129 | passes to register_team RPC — keep intact |
| `src/app/api/webhooks/stripe/route.ts` | 148–157 | reads captain_* to upsert contact on payment — keep for now, update to use team_members in S9-6 |
| `src/__tests__/` (4 files) | multiple | test fixtures — update in S9-8 |

**Key insight:** The Stripe webhook (`route.ts` line 148) reads `captain_name + captain_email + captain_phone` to auto-create a contact on payment. After this sprint, the RPC will also write to `team_members`, so the webhook upsert becomes redundant but not harmful. It stays intact this sprint to avoid breaking the payment flow.

### Admin contacts page — current state

**`src/app/admin/contacts/page.tsx`** — server component, calls `getContacts()`, renders `<ContactList />`. No filters are passed from URL params.

**`src/app/admin/contacts/actions.ts`** — `getContacts(filter?)` supports `type` + `year` filters, server-side. `exportContactsCSV` currently exports: name, email, type, year_first_seen, notes, created_at. Must be extended with new columns and `marketing_consent` gate.

**`src/app/admin/contacts/contact-list.tsx`** — client component with type + year dropdowns (client-side filter over fully-fetched contacts). Current filters: type, year_first_seen. Missing: company text search, marketing_consent toggle, team membership, captain-only toggle.

### Admin registrations page — current state

**`src/app/admin/registrations/page.tsx`** — lists teams. `createTeamManually` in actions.ts writes captain_* and inserts up to 4 `players` rows (old table). The new admin team builder in S9-5 will be a **new page** at `/admin/teams` rather than extending registrations — this avoids breaking the existing `players`-based flow while the transition is in progress.

### Public registration — current state

**`src/app/(public)/register/registration-form.tsx`** — "use client", sends `{team_name, captain_name, captain_email, captain_phone, session, players[]}` to `/api/checkout`. Current player section captures name + email + phone + handicap for each of 4 players. The S9-7 rework changes the 3 non-captain sections to be optional teammate slots with a TBD checkbox and adds a "Seeking a team" path.

### CSV — verified

- **Path:** `/Users/openclaw/Desktop/CCC Master Contact List.csv`
- **Row count:** 376 rows total = 1 header + 375 data rows. Matches Scott's description.
- **Headers (11 columns, last is unnamed):** `GOLFER, SALUTATION, FIRST NAME, LAST NAME, COMPANY, ADDRESS, ADDRESS2, CITY, STATE, ZIP, [unnamed]`
- **Categorization breakdown:** GOLFER=Yes: 138 (player), GOLFER=No + COMPANY: 73 (sponsor), GOLFER=No + no COMPANY: 164 (donor), GOLFER blank: 1
- **Edge case — 1 row:** Jim Hamilton — blank GOLFER, COMPANY is "(Holly town hall)" (not a real company), email in the unnamed 11th column (`jah3216@gmail.com`). Import parser must handle: (a) blank GOLFER → default type='other', (b) email in 11th column if present, (c) COMPANY values in parentheses that are really informal notes, not companies.
- **Dedupe key:** `first_name + last_name + zip` (case-insensitive) per Scott's decision. The single blank-GOLFER row has all three, so it will participate in dedupe.

---

## Deferred (explicit non-scope)

- Email sending from app (all marketing external — Mailchimp or similar)
- Campaign / send-log tracking table
- 2026→2027 team copy-over wizard
- PDF mailing labels (CSV export only)
- GDPR-level consent audit log
- Admin-generated payment link (Sprint 10)
- Stripe payment provider research / switch (Sprint 10)
- `teams.captain_*` column drop (future migration)
- `players` table drop / migration (future sprint after team_members fully replaces it)
- Recurring CSV re-import support

---

## Issue breakdown

### Phase 1 — Serial foundation (must merge before anything else)

---

#### S9-0: Schema migration — evolve contacts, create team_members, add captain_contact_id

**Specialists:** Flux (migration) + Sentinel (RLS review)
**Effort:** Medium
**Labels:** `feature`, `P0-critical`, `size:M`
**Estimated time:** 3.5h

This is the unblocking dependency for all other S9 issues. It must merge and deploy to staging before Phase 2 begins.

**Files to create/modify:**
1. `supabase/migrations/20260423000001_contacts_roster_team_members.sql` (new)
2. `src/types/database.ts` (manual edit — add new columns to contacts Row/Insert/Update; add team_members table; add captain_contact_id to teams)

**Migration — full content:**

```sql
-- S9-0: Evolve contacts into unified roster/marketing table.
-- Create team_members join table. Add captain_contact_id to teams.

-- ── contacts: make email nullable ─────────────────────────────────────────────
-- Drop existing unique index on email (was used for upsert-on-conflict).
DROP INDEX IF EXISTS public.idx_contacts_email;

-- Relax NOT NULL constraint on email.
ALTER TABLE public.contacts
  ALTER COLUMN email DROP NOT NULL;

-- Add new columns to contacts.
ALTER TABLE public.contacts
  ADD COLUMN first_name   text,
  ADD COLUMN last_name    text,
  ADD COLUMN salutation   text,
  ADD COLUMN address1     text,
  ADD COLUMN address2     text,
  ADD COLUMN city         text,
  ADD COLUMN state        text,
  ADD COLUMN zip          text,
  ADD COLUMN company      text,
  ADD COLUMN marketing_consent boolean not null default true,
  ADD COLUMN source       text;

-- Recreate index allowing NULLs (partial index covers non-null emails for lookups).
CREATE INDEX idx_contacts_email ON public.contacts (email) WHERE email IS NOT NULL;
CREATE INDEX idx_contacts_source ON public.contacts (source);
CREATE INDEX idx_contacts_marketing ON public.contacts (marketing_consent);

-- ── teams: add captain_contact_id ─────────────────────────────────────────────
ALTER TABLE public.teams
  ADD COLUMN captain_contact_id uuid
    REFERENCES public.contacts(id)
    ON DELETE SET NULL;

CREATE INDEX idx_teams_captain_contact ON public.teams (captain_contact_id);

-- ── team_members join table ───────────────────────────────────────────────────
CREATE TABLE public.team_members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null REFERENCES public.teams(id) ON DELETE CASCADE,
  contact_id  uuid not null REFERENCES public.contacts(id) ON DELETE RESTRICT,
  role        text not null CHECK (role IN ('captain', 'player')),
  slot        int  not null CHECK (slot BETWEEN 1 AND 4),
  created_at  timestamptz not null default now(),
  UNIQUE (team_id, slot),
  UNIQUE (team_id, contact_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage team_members"
  ON public.team_members FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Team members viewable by admins"
  ON public.team_members FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX idx_team_members_team_id   ON public.team_members (team_id);
CREATE INDEX idx_team_members_contact_id ON public.team_members (contact_id);
```

**`src/types/database.ts` — manual edits (do NOT run supabase gen types):**

`contacts` Row: add `first_name: string | null`, `last_name: string | null`, `salutation: string | null`, `address1: string | null`, `address2: string | null`, `city: string | null`, `state: string | null`, `zip: string | null`, `company: string | null`, `marketing_consent: boolean`, `source: string | null`. Change `email: string` → `email: string | null`.

`contacts` Insert/Update: mirror Row with all new fields optional (append `?`).

`teams` Row: add `captain_contact_id: string | null`.
`teams` Insert/Update: add `captain_contact_id?: string | null`.

Add new `team_members` table entry (Row, Insert, Update, Relationships) after `teams`.

**Acceptance criteria:**
- `supabase db push` applies migration with no errors on staging
- `contacts` table has all new columns; `email` is nullable in `\d public.contacts`
- `team_members` table exists with correct constraints: `UNIQUE(team_id, slot)`, `UNIQUE(team_id, contact_id)`, slot check 1–4, role check
- Can insert a contact with `email = null` from psql
- RLS: anon user cannot SELECT from `team_members` (returns 0 rows, no 500)
- Admin user can SELECT from `team_members` (returns rows)
- `npx tsc --noEmit` clean, 205 existing tests still pass

---

### Phase 2 — Parallel (all depend on S9-0 merged; no Phase 2 issues share files with each other)

---

#### S9-1: Admin contacts list — enhanced filters + export + address display

**Specialist:** Bolt
**Effort:** Medium
**Labels:** `feature`, `P1-high`, `size:M`
**Depends on:** S9-0 merged
**Estimated time:** 3.5h

**Files to create/modify:**
1. `src/app/admin/contacts/contact-list.tsx` — add new filters; update table columns
2. `src/app/admin/contacts/actions.ts` — extend `getContacts` filter params; update `exportContactsCSV`
3. `src/app/admin/contacts/page.tsx` — pass teams list for team filter dropdown; convert to async data fetch for teams

**Exact changes:**

`actions.ts`:
- Extend `ContactFilter` interface: add `company?: string` (text contains), `marketing_consent?: boolean`, `team_id?: string`, `captain_only?: boolean`
- In `getContacts`: add `.ilike('company', \`%${filter.company}%\`)` when company set; `.eq('marketing_consent', filter.marketing_consent)` when set; when `team_id` set, join through `team_members` (`contacts.id in (select contact_id from team_members where team_id = ?)`); when `captain_only` set, `contacts.id in (select contact_id from team_members where role = 'captain')`
- Add `getTeamsForFilter(): Promise<{id: string, team_name: string}[]>` — returns all teams for current year ordered by team_name, used by the dropdown in the UI
- Update `exportContactsCSV`: add new columns to header and row map — `first_name, last_name, salutation, company, address1, city, state, zip, marketing_consent, source`; filter to `marketing_consent = true` contacts only (or pass flag, default true for export)

`contact-list.tsx`:
- Replace client-side filter state with URL search params (use `useRouter` / `useSearchParams`) so filters survive refresh
- Add filter controls: Company text input (debounced 300ms), Marketing Consent select (All / Subscribed / Unsubscribed), Team select (dropdown from teams list), Captain Only checkbox
- Update table columns: add Company column between Type and Year; show `first_name + last_name` alongside `full_name` in Name cell if first/last present; show marketing consent indicator (checkmark / dash); truncate company at 24ch with title tooltip
- "Export CSV" button: passes current filters to `exportContactsCSV` (only consented contacts)
- "Import" button: link to `/admin/contacts/import` (new page from S9-2)

`page.tsx`:
- Fetch teams for the filter dropdown alongside contacts: `const [contacts, teams] = await Promise.all([getContacts(), getTeamsForFilter()])`
- Pass `teams` prop to `<ContactList />`

**Acceptance criteria:**
- Filter by Type=player → only player contacts shown
- Filter by Marketing Consent=Unsubscribed → only contacts where `marketing_consent=false` shown
- Company text input "Smith" → only contacts where company contains "Smith" (case-insensitive)
- Team dropdown selected → only contacts who are members of that team shown
- Captain Only checkbox → only contacts with role='captain' in any team shown
- Export CSV: downloaded file contains only `marketing_consent=true` contacts; file has new columns (first_name, last_name, company, address1, city, state, zip, source)
- "Import" button links to `/admin/contacts/import`
- `npx tsc --noEmit` clean, 205 tests still pass

---

#### S9-2a: CSV import — server action + parse logic

**Specialist:** Flux
**Effort:** Medium
**Labels:** `feature`, `P1-high`, `size:M`
**Depends on:** S9-0 merged
**Estimated time:** 3.5h

**Files to create/modify:**
1. `src/app/admin/contacts/import/actions.ts` (new)

**Parse logic:**

CSV columns (by position, 11 total — last unnamed): `GOLFER, SALUTATION, FIRST NAME, LAST NAME, COMPANY, ADDRESS, ADDRESS2, CITY, STATE, ZIP, [email overflow]`

Auto-categorization:
- `GOLFER=Yes` (case-insensitive) → `type='player'`
- `GOLFER=No` + `COMPANY` non-empty → `type='sponsor'`
- `GOLFER=No` + `COMPANY` empty → `type='donor'`
- `GOLFER` blank → `type='other'` (1 known edge case: Jim Hamilton)

Edge case handling:
- Unnamed 11th column: if it contains a valid email pattern (`@`), use as `email`
- `full_name` derivation: `trim(FIRST_NAME || ' ' || LAST_NAME)`; if both empty, use `COMPANY` as `full_name`; if all three empty, skip row
- `marketing_consent: true` for all rows (historic opt-in implied)
- `source: 'mailing_list_import_2026'`

Dedupe strategy: match on `lower(trim(first_name)) + lower(trim(last_name)) + trim(zip)`. If all three are non-empty and a contact exists with the same triple, mark row as skip. If dedupe key has empty fields, attempt match on `lower(trim(full_name)) + trim(zip)`.

Server actions to implement:

`parseCSV(csvText: string): Promise<ParsedRow[]>` — parses raw CSV text, applies categorization, returns array of rows with computed fields + `status: 'import' | 'duplicate' | 'skip'` and `duplicateReason?: string`. Does NOT write to DB.

`previewImport(csvText: string): Promise<ImportPreview>` — calls `parseCSV`, queries existing contacts to identify duplicates (single batch query: `select first_name, last_name, zip from contacts where ...`), returns `{ rows: ParsedRow[], importCount: number, duplicateCount: number, skipCount: number }`.

`commitImport(rows: CommitRow[]): Promise<ImportResult>` — receives admin-reviewed rows (type may have been overridden), inserts all non-skipped rows in a single `supabase.from('contacts').insert([...])` call, returns `{ imported: number, skipped: number, errors: string[] }`. Requires `requireAdmin()`. Validates no row exceeds `full_name` being empty before insert.

`ParsedRow` type:
```ts
interface ParsedRow {
  rowIndex: number          // 0-based CSV row
  full_name: string
  first_name: string | null
  last_name: string | null
  salutation: string | null
  company: string | null
  address1: string | null
  address2: string | null
  city: string | null
  state: string | null
  zip: string | null
  email: string | null
  type: 'player' | 'sponsor' | 'donor' | 'other'
  status: 'import' | 'duplicate' | 'skip'
  duplicateReason?: string
  marketing_consent: true
  source: 'mailing_list_import_2026'
}
```

**Acceptance criteria:**
- `parseCSV` with the actual CSV file: returns 375 rows total; 138 with type='player', 73 type='sponsor', 164 type='donor', 1 type='other'
- Jim Hamilton row: type='other', email='jah3216@gmail.com' (from 11th column), status='import' (no duplicate on first run)
- `previewImport` run twice in sequence: second run reports 375 duplicates, 0 import
- `commitImport` with all 375 import rows inserts exactly 375 contacts; subsequent `previewImport` returns 375 duplicates
- Admin-level auth enforced: calling without admin session returns 401/throws
- `npx tsc --noEmit` clean

---

#### S9-2b: CSV import — preview UI page

**Specialist:** Bolt
**Effort:** Medium
**Labels:** `feature`, `P1-high`, `size:M`
**Depends on:** S9-0 merged, S9-2a merged (needs action types)
**Estimated time:** 3.5h

Note: S9-2b must be serial after S9-2a because the UI imports and calls the server actions. In practice S9-2a will be small enough that Flux can finish first; Bolt can begin on skeleton while S9-2a is in review.

**Files to create/modify:**
1. `src/app/admin/contacts/import/page.tsx` (new)
2. `src/app/admin/contacts/import/import-preview.tsx` (new client component)

**Page flow:**

Step 1 — Upload: page shows a file input (`accept=".csv"`). On select, reads file as text (FileReader), calls `previewImport(csvText)`. Shows loading state.

Step 2 — Preview: renders `<ImportPreview rows={preview.rows} counts={...} onCommit={...} />`.

Preview table columns: Row #, Name, Type (editable dropdown: player/sponsor/donor/other), Company, Email, City/State, Status badge (Import / Duplicate / Skip). Duplicate rows are visually de-emphasized (muted row). Admin can change Type for any row. Can toggle individual rows between Import / Skip.

Summary bar above table: "375 rows — 138 import, 73 duplicate, 164 other" (updates as admin edits).

Step 3 — Commit: "Import X contacts" button (disabled if 0 to import). Calls `commitImport(editedRows)`. Shows result: "Imported 375 contacts. 0 skipped." with link back to `/admin/contacts`.

Plain-language labels throughout. No UUID display. Progress indicator during commit (can take a second for 375 rows).

**Acceptance criteria:**
- Navigate to `/admin/contacts/import` as admin: page renders with file input
- Upload the CCC CSV: preview table renders with 375 rows in under 3s
- Status badge "Duplicate" shown on rows that already exist in contacts
- Changing Type dropdown on a row updates the type in the commit payload
- Toggling a row to Skip removes it from import count
- "Import X contacts" button commits; redirects to `/admin/contacts` with success toast
- Uploading a non-CSV file: shows plain-language error, no crash
- `npx tsc --noEmit` clean

---

#### S9-3a: Admin team builder — backend actions

**Specialist:** Flux
**Effort:** Medium
**Labels:** `feature`, `P1-high`, `size:M`
**Depends on:** S9-0 merged
**Estimated time:** 3h

**Files to create/modify:**
1. `src/app/admin/teams/actions.ts` (new)

Server actions to implement:

`getTeams(year?: number): Promise<TeamWithMembers[]>` — selects teams with `team_members` joined to `contacts` for current year. Returns each team annotated with: `members: {contact_id, full_name, role, slot}[]`, `member_count: number`, `open_slots: number` (4 - count).

`searchContacts(query: string): Promise<ContactSearchResult[]>` — typeahead for contact picker. Searches `full_name ilike %query%` OR `email ilike %query%`. Returns max 20 results: `{id, full_name, email, company}[]`. Requires admin.

`buildTeam(payload: BuildTeamPayload): Promise<{teamId: string} | {error: string}>` — creates or updates a team's roster. Payload:
```ts
interface BuildTeamPayload {
  teamId?: string            // if provided, update existing; if absent, error (team must exist before building)
  captainContactId: string   // contact to set as captain
  playerContactIds: (string | null)[]  // up to 3 slots; null = open slot
}
```
Logic:
1. `requireAdmin()`
2. Validate: captainContactId must be a valid contact UUID; each non-null playerContactId must be valid
3. Upsert `team_members` for captain (slot=1, role='captain'), players (slots 2–4, role='player')
4. Update `teams.captain_contact_id = captainContactId`
5. Delete any existing `team_members` rows for this team NOT in the new payload (handles swaps)
6. All in a transaction via RPC or sequential with error rollback note

`markTeamPaid(teamId: string): Promise<{success: boolean} | {error: string}>` — sets `teams.payment_status = 'paid'` and `amount_paid_cents = registration_fee_cents` from `event_settings`. Requires admin.

`createTeamForBuilder(payload: {team_name: string, session: 'morning'|'afternoon', notes?: string}): Promise<{id: string} | {error: string}>` — inserts a bare `teams` row (no captain_* text fields written — stop writing them here). Returns the new team id. Admin then calls `buildTeam` to assign captain + players.

`removeTeamMember(teamId: string, slot: number): Promise<void>` — deletes the `team_members` row for that slot. Requires admin.

**Acceptance criteria:**
- `getTeams()` returns teams with member_count and open_slots derived from team_members (not players table)
- `searchContacts('Smith')` returns contacts whose full_name contains "Smith"
- `buildTeam` with captainContactId + 2 playerContactIds: inserts 3 team_members rows; team has open_slots=1
- `buildTeam` called again with different captain: previous captain row removed, new captain row inserted
- `markTeamPaid` sets payment_status='paid' and amount_paid_cents to event fee
- No `captain_name / captain_email / captain_phone` written by any action in this file
- `npx tsc --noEmit` clean

---

#### S9-3b: Admin team builder — UI page `/admin/teams`

**Specialist:** Bolt
**Effort:** Medium
**Labels:** `feature`, `P1-high`, `size:M`
**Depends on:** S9-0 merged, S9-3a merged
**Estimated time:** 4h

**Files to create/modify:**
1. `src/app/admin/teams/page.tsx` (new)
2. `src/app/admin/teams/team-builder.tsx` (new client component)
3. `src/app/admin/layout.tsx` — add "Teams" nav link if not present

**Page layout:**

Header: "Teams · 2026" with "New Team" button (opens inline form).

**Team list:** Table with columns — Team Name, Captain (full_name or "—"), Members (e.g., "3/4"), Payment Status badge, Open Slots indicator (e.g., "1 open"), Actions (Edit, Mark Paid).

**"New Team" form (inline or modal):** Team Name input, Session select (Morning/Afternoon), Notes textarea. Submit calls `createTeamForBuilder`. After creation, automatically opens the team's Edit panel.

**Edit team panel (inline expand or slide-over):**

Slot assignment UI (plain-language labels, not "slot 1/2/3/4"):
- Captain — typeahead search input → `searchContacts(query)` → dropdown of results → select to assign
- Player 2 — same typeahead pattern; "Leave open" toggle
- Player 3 — same; "Leave open" toggle
- Player 4 — same; "Leave open" toggle

Non-technical admin constraints:
- Typeahead shows full_name + company (if present) in results
- No UUID display anywhere
- "Mark Paid" button — confirm dialog ("Mark [Team Name] as paid?") → calls `markTeamPaid`
- Inline success/error states using existing state tokens (success-muted / destructive)
- Each slot shows current assignee name; "Remove" X button calls `removeTeamMember`

**Acceptance criteria:**
- `/admin/teams` loads and lists all teams for current year with member count (from team_members, not players)
- "New Team" → creates team → Edit panel opens automatically
- Typeahead in captain slot: type "Smith" → dropdown shows matching contacts within 500ms
- Assign captain → team row shows captain name; member count increments
- "Leave open" toggle on Player 3 → that slot shows "Open" in team list
- "Mark Paid" → payment status badge changes to "Paid"
- Remove a member → slot shows "Open"; member count decrements
- No page reload needed for any action (optimistic or server action revalidation)
- Admin nav has "Teams" link
- `npx tsc --noEmit` clean, 205 tests still pass

---

#### S9-4a: Public registration rework — server action

**Specialist:** Flux
**Effort:** Small
**Labels:** `feature`, `P1-high`, `size:S`
**Depends on:** S9-0 merged
**Estimated time:** 2h

**Files to create/modify:**
1. `src/app/api/checkout/route.ts` — extend `handleRegistrationCheckout` to accept teammates
2. `src/app/api/webhooks/stripe/route.ts` — update contact upsert to use first_name/last_name if provided

**Changes to `checkout/route.ts`:**

Extend request body type to accept teammates:
```ts
teammates?: {
  full_name: string
  email?: string
  phone?: string
  tbd: boolean     // if true, don't create contact, leave slot open
}[]
```

After `register_team` RPC creates the team (writes captain_* text columns as before — keep this intact):
- For each non-TBD teammate (max 3), attempt to find or create a contact: `upsert` on `lower(first_name)+lower(last_name)+zip` if those fields present, else insert new contact with `type='player'`, `source='web_registration_2026'`
- Insert `team_members` rows: captain gets slot=1 (after looking up or creating captain contact), teammates get slots 2–4
- Update `teams.captain_contact_id` to the captain's contact id

Important: keep all existing `captain_name / captain_email / captain_phone` writes to `teams` intact (Stripe webhook still reads them). Only ADD the new team_members writes.

**Changes to `webhooks/stripe/route.ts`:**

Line 152–157: after payment succeeds, the contact upsert currently uses `full_name` + `email`. Update to also populate `first_name` / `last_name` from `team.captain_name` (split on last space) as a best-effort backfill. Keep `onConflict: 'email'` logic unchanged.

**Acceptance criteria:**
- Submit registration with 2 teammates (non-TBD): after Stripe redirect, `team_members` has 3 rows (captain + 2 players)
- Submit with 1 TBD teammate: `team_members` has 2 rows + 1 open slot (open_slots = 2)
- `register_team` RPC still enforces session cap (existing behavior unchanged)
- Stripe checkout URL returned successfully
- `npx tsc --noEmit` clean

---

#### S9-4b: Public registration rework — form UI

**Specialist:** Bolt
**Effort:** Medium
**Labels:** `feature`, `P1-high`, `size:M`
**Depends on:** S9-0 merged
**Estimated time:** 3.5h

**Files to create/modify:**
1. `src/app/(public)/register/registration-form.tsx` — rework teammate sections
2. `src/app/(public)/register/page.tsx` — add "Seeking a team" path

**Changes to `registration-form.tsx`:**

Rework the player section (currently 4 identical player cards including captain):

- Card 1 "Captain" — keep existing captain fields (name, email, phone). Remove handicap field (not needed for team_members model).
- Cards 2–4 "Player 2 / Player 3 / Player 4" — each has:
  - Name (text input)
  - Email (email input)
  - Phone (tel input)
  - "TBD — I'll add this player later" checkbox. When checked: name/email/phone inputs hide (or disable + clear); section shows "Slot reserved — you can add a player later"
- Update submit body to send `teammates: [{full_name, email, phone, tbd}]` (3 entries, one per non-captain slot)
- Keep all existing session picker and team info card unchanged

Add "Seeking a team?" button below the form (visible only when registration is open):
- On click: shows a small inline form (name, email, phone). Submit calls `ProspectCaptureForm` with `contactType="player"`, `notesPrefix="seeking_team"`, `source="seeking_team_2026"`. On submit: creates contact, shows success message "We'll reach out when we find a team for you."

Plain-language labels throughout. No "slot" terminology exposed.

**Acceptance criteria:**
- Register page loads; Player 2/3/4 sections each have TBD checkbox
- Check TBD on Player 3: name/email/phone fields hide; section shows reserved message
- Submit with TBD Player 3 + 4: checkout proceeds; API receives `teammates` with 2 non-TBD + 2 TBD
- "Seeking a team?" button visible when registration open; clicking shows inline form; submitting shows success without leaving page
- Session picker still works (morning/afternoon); cap enforcement unchanged
- `npx tsc --noEmit` clean

---

### Phase 3 — Test updates (after all Phase 2 PRs merged)

---

#### S9-5: Spec — fixtures + tests for new contact schema, team_members, import dedupe, team builder actions

**Specialist:** Spec
**Effort:** Large
**Labels:** `chore`, `P1-high`, `size:L`
**Depends on:** All Phase 2 issues merged
**Estimated time:** 5h

**Files to create/modify:**
1. `src/__tests__/contacts-schema.test.ts` (new)
2. `src/__tests__/import-dedupe.test.ts` (new)
3. `src/__tests__/team-builder-actions.test.ts` (new)
4. `src/__tests__/database-types.test.ts` — update contact fixtures; add team_members shape
5. `src/__tests__/checkout-sponsorship.test.ts` — update captain fixtures; add teammates field
6. `src/__tests__/webhook-db-errors.test.ts` — update captain_name read mock to still work (columns kept); add team_members insert mock
7. `src/__tests__/checkout-session-cap.test.ts` — add teammates field to request body fixture

**New test cases:**

`contacts-schema.test.ts`:
- Contact insert with `email = null` does not throw
- Contact with `marketing_consent = false` excluded from export
- Contact `full_name` remains NOT NULL — insert without full_name throws

`import-dedupe.test.ts`:
- `parseCSV` with known CSV text: correct type assignment for GOLFER=Yes, No+company, No+no-company
- Blank GOLFER row: type='other', email extracted from 11th column
- `previewImport` run twice: second run marks all as duplicate
- `commitImport`: returns correct imported + skipped counts

`team-builder-actions.test.ts`:
- `buildTeam` with captain + 2 players: team_members has 3 rows
- `buildTeam` called again with different captain: old captain row replaced
- `markTeamPaid`: payment_status = 'paid', amount_paid_cents set from event_settings fee
- `removeTeamMember`: team_members row deleted for that slot

**Update existing tests:**
- Any fixture that constructs a `contacts` Row: add `marketing_consent: true`, `source: null`, `email: string | null`
- Any fixture that constructs a `teams` Row: add `captain_contact_id: null`
- Checkout tests: update request body to include `teammates: []` (empty array = backward-compatible)

**Coverage target:** new files at 60%+ branch coverage.

**Acceptance criteria:**
- `npm test` → 220+ tests passing (205 existing + 15+ new), 0 failures
- `npx tsc --noEmit` clean
- No test imports `supabase gen types` output — all types manually maintained

---

## Dependency map and parallelism

```
Phase 1 (serial — must complete first):
  S9-0  Flux+Sentinel  supabase/migrations/20260423000001_*.sql + src/types/database.ts

Phase 2 (all depend on S9-0; run parallel if no file overlap):
  S9-1   Bolt          src/app/admin/contacts/{contact-list.tsx, actions.ts, page.tsx}
  S9-2a  Flux          src/app/admin/contacts/import/actions.ts
  S9-2b  Bolt          src/app/admin/contacts/import/{page.tsx, import-preview.tsx}
                       ↑ serial after S9-2a (imports action types)
  S9-3a  Flux          src/app/admin/teams/actions.ts
  S9-3b  Bolt          src/app/admin/teams/{page.tsx, team-builder.tsx} + src/app/admin/layout.tsx
                       ↑ serial after S9-3a
  S9-4a  Flux          src/app/api/checkout/route.ts + src/app/api/webhooks/stripe/route.ts
  S9-4b  Bolt          src/app/(public)/register/registration-form.tsx + register/page.tsx

Phase 2 parallel groupings (after S9-0 merged):
  Parallel batch A: S9-1 (Bolt), S9-2a (Flux), S9-3a (Flux), S9-4a (Flux)
    — no file overlap between these four
  Serial after batch A: S9-2b (Bolt after S9-2a), S9-3b (Bolt after S9-3a)
  Parallel batch B: S9-2b + S9-3b + S9-4b can run together (different file surfaces)
    — S9-4b shares no files with S9-2b or S9-3b

Phase 3 (after all Phase 2 merged):
  S9-5   Spec          src/__tests__/ (multiple files)
```

**File conflict zones:**

| File | Issues touching it | Risk |
|---|---|---|
| `src/app/admin/contacts/actions.ts` | S9-1 only | none |
| `src/app/admin/contacts/import/actions.ts` | S9-2a only | none |
| `src/app/api/checkout/route.ts` | S9-4a only | none |
| `src/app/api/webhooks/stripe/route.ts` | S9-4a only | none |
| `src/app/admin/layout.tsx` | S9-3b only | none |
| `src/types/database.ts` | S9-0 only | none (all others must branch from S9-0 merge) |

No Phase 2 issues share files. Zero merge conflict risk if all branch from S9-0's merge commit.

**Recommended execution order:**
1. Flux + Sentinel: S9-0 (foundation)
2. After S9-0 merged: spawn Flux on S9-2a, S9-3a, S9-4a in parallel; spawn Bolt on S9-1 in parallel
3. After S9-2a merged: spawn Bolt on S9-2b
4. After S9-3a merged: spawn Bolt on S9-3b
5. S9-4b (Bolt) can start immediately after S9-0 — no dependency on S9-4a for the form shape
6. After all Phase 2 merged: spawn Spec on S9-5

---

## Total estimates

| Issue | Specialist | Size | Hours |
|---|---|---|---|
| S9-0 | Flux + Sentinel | M | 3.5h |
| S9-1 | Bolt | M | 3.5h |
| S9-2a | Flux | M | 3.5h |
| S9-2b | Bolt | M | 3.5h |
| S9-3a | Flux | M | 3h |
| S9-3b | Bolt | M | 4h |
| S9-4a | Flux | S | 2h |
| S9-4b | Bolt | M | 3.5h |
| S9-5 | Spec | L | 5h |
| **Total** | | | **~32h** |

10 issues. Largest critical path: S9-0 (3.5h) → S9-3a (3h) → S9-3b (4h) = ~10.5h elapsed. Parallelism compresses wall-clock to approximately 14–16h of builder activity.
