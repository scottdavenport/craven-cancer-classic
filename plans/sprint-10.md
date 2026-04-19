# Sprint 10 — Soft-Delete Foundation + Admin CRUD Parity

**Sprint goal:** Establish soft-delete as the app-wide deletion pattern for user-facing entities. Build Contacts full CRUD and Teams delete on that foundation, plus a global Trash view for restore.

**Target:** ~2 weeks, 9 issues, ~32h estimated builder time.

**Baseline:** post-Sprint 9, 205+ tests green, tsc clean. csv-parser extraction PR ships first as its own small PR before this sprint opens.

---

## Locked architectural decisions (Scott 2026-04-19)

### Soft-delete in, for these tables
- `contacts`, `teams`, `sponsors`, `sponsorships`, `photos`

### Soft-delete out — these stay as-is
- `email_log` — append-only audit trail, never deletable
- `stripe_events` — regulatory audit trail, never deletable
- `invitations` — short lifecycle (accepted/expired), hard-delete on expiry is fine
- `scores` — historical tournament record; admin edits/corrects but does not delete

### Pattern
- New columns on each soft-deletable table: `deleted_at timestamptz NULL`, `deleted_by uuid NULL REFERENCES auth.users(id)`
- Unique indexes rewritten as partial: `WHERE deleted_at IS NULL` added to every unique constraint on soft-deletable tables
- Views: `contacts_active`, `teams_active`, `sponsors_active`, `sponsorships_active`, `photos_active` — `SELECT * FROM <table> WHERE deleted_at IS NULL`. App code queries views for default lists; queries raw table only from Trash page.
- RLS stays simple: admin sees all rows regardless of `deleted_at`; the view filter is the common-path guard. Belt-and-suspenders (view filter) since admin-only access means RLS doesn't have to enforce hide-deleted.

### Cascade semantics
- **Contact soft-deleted:** leave `team_members` rows untouched (pointing to the now-hidden contact). Team UI that joins through `contacts_active` will see a hidden slot. **Team roster display must handle "member row exists, contact hidden"** by rendering the slot as `(deleted contact)` placeholder — history preserved, roster shape preserved.
- **Team soft-deleted:** leave `team_members` rows untouched. Team vanishes from `teams_active`, members rows dangle pointing to a hidden team. Scores.team_id is `ON DELETE SET NULL` at the hard-delete layer — we won't touch scores on soft-delete (team_id stays populated, just points to a hidden team, scores still show in scores list).
- **Restore:** un-set `deleted_at` on the single row. Because team_members rows were never touched, restoring a team or contact restores the full membership tree automatically.

### Other decisions folded from Q&A
| # | Decision | Notes |
|---|---|---|
| Q1 | Paid-team delete: type-to-confirm + Stripe refund warning | Not hard-blocked |
| Q2 | Scores on team delete: soft warning, allow | "Scores will remain, disconnected from the team record" |
| Q3 | Bulk consent: two buttons "Subscribe" / "Unsubscribe" | Not toggle |
| Q4 | Toast library: `sonner` | Added in S10-2 |
| Q5 | "Go to team" from blocked dialog: `?edit=<id>` deep-link | BUT this UX largely goes away for contacts with soft-delete. Retained for edge cases — see S10-3 |
| Q6 | Pagination: not in S10 | 376 rows renders fine. Virtualize if list grows past ~2k |
| Q7 | Fix broken team/captain filter on contacts list | Folded into S10-1. Currently filters only apply to CSV export (contact-list.tsx:259). Make them scope the list too. |
| Q8 | Shared `deriveFullName` location | `src/lib/contacts/contact-utils.ts` — pure, no "use server". csv-parser.ts and new contact-form both import from here. |
| Q9 | Bulk selection across filter changes | Keep selection, show counter: "3 selected (1 not in current view)" |
| Q10 | `deleteTeam` duplication | Move canonical to `teams/actions.ts`, soft-delete semantics. Registrations imports from there. Update `registration-list.tsx` import path. |
| Q11a | Required fields | Only `type` + derived `full_name`. Block save if first, last, AND company all empty. |
| Q11b | Email | Regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` + trim + lowercase, client AND server |
| Q11c | Phone | E.164 storage (`+15555551234`) via `libphonenumber-js/min`. Default country US. Normalize on save, format as national on display. 0 existing phones → zero migration risk. |
| Q11d | ZIP | US-only regex `/^\d{5}(-\d{4})?$/`. Rejects international (accepted tradeoff — charity is NC-local). All existing ZIPs validate. |
| Q11e | Year | Default current calendar year on create. Editable via dropdown 2020–(current+1). |
| Q11f | Validation | Client-side for UX (inline errors on blur), server-side for correctness, shared helpers in `contact-utils.ts` |
| Q12 | Delivery ordering | S10-0 foundation blocks everything. Then S10-1/2/5/6 parallel-able. |

---

## Research findings (verified)

### Sidebar (`src/components/admin/admin-sidebar.tsx` lines 32–42)
menuItems: Dashboard, Event, Sponsors, Registrations, Sponsorships, Photos, Scores, Contacts & Email, Settings. **Teams missing entirely.**

### Contact list filter bug (`src/app/admin/contacts/contact-list.tsx` line 259)
Disclaimer text: *"Team and captain filters apply to the CSV export only. The table shows all contacts."* — pre-existing, will fix in S10-1.

### Contacts actions (`src/app/admin/contacts/actions.ts`)
Exports: `getContacts`, `exportContactsCSV`, `getTeamsForFilter`. No create/update/delete.

### Teams actions (`src/app/admin/teams/actions.ts`)
Exports: `getTeams`, `searchContacts`, `createTeam`, `updateTeamMembers`, `markTeamPaid`. No `deleteTeam` (lives in `registrations/actions.ts` — legacy).

### FK references on contacts.id
- `team_members.contact_id` ON DELETE RESTRICT
- `teams.captain_contact_id` ON DELETE SET NULL
(No other references — verified via grep on migrations.)

### FK references on teams.id
- `team_members.team_id` ON DELETE CASCADE
- `scores.team_id` ON DELETE SET NULL

### Existing unique indexes on soft-deletable tables
- `contacts_email_unique_when_present` on `contacts(email) WHERE email IS NOT NULL` — **needs rewrite to add `AND deleted_at IS NULL`**
- Need full audit in S10-0: grep for `UNIQUE` and `CREATE UNIQUE INDEX` across migrations for each soft-deletable table

### Schemas
- `Contact` row: 18 columns (see `src/types/database.ts:37-102`), `full_name NOT NULL`, `type NOT NULL DEFAULT 'other'`, rest nullable
- `scores` (`20260414000001_initial_schema.sql`): `team_id` SET NULL on team delete, `team_name text NOT NULL` (survives)

---

## Issues

### S10-0: Soft-delete foundation (M — 4h, Flux)

**Migration** `YYYYMMDDHHMMSS_soft_delete_foundation.sql`:

```sql
-- Add deleted_at / deleted_by to each target table
ALTER TABLE public.contacts       ADD COLUMN deleted_at timestamptz NULL;
ALTER TABLE public.contacts       ADD COLUMN deleted_by uuid NULL REFERENCES auth.users(id);
ALTER TABLE public.teams          ADD COLUMN deleted_at timestamptz NULL;
ALTER TABLE public.teams          ADD COLUMN deleted_by uuid NULL REFERENCES auth.users(id);
ALTER TABLE public.sponsors       ADD COLUMN deleted_at timestamptz NULL;
ALTER TABLE public.sponsors       ADD COLUMN deleted_by uuid NULL REFERENCES auth.users(id);
ALTER TABLE public.sponsorships   ADD COLUMN deleted_at timestamptz NULL;
ALTER TABLE public.sponsorships   ADD COLUMN deleted_by uuid NULL REFERENCES auth.users(id);
ALTER TABLE public.photos         ADD COLUMN deleted_at timestamptz NULL;
ALTER TABLE public.photos         ADD COLUMN deleted_by uuid NULL REFERENCES auth.users(id);

-- Rewrite unique indexes to include deleted_at IS NULL
DROP INDEX IF EXISTS public.contacts_email_unique_when_present;
CREATE UNIQUE INDEX contacts_email_unique_when_present
  ON public.contacts (email)
  WHERE email IS NOT NULL AND deleted_at IS NULL;
-- (repeat for any other unique indexes found in audit)

-- Indexes for common "not deleted" filters
CREATE INDEX idx_contacts_not_deleted     ON public.contacts     (id) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_not_deleted        ON public.teams        (id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sponsors_not_deleted     ON public.sponsors     (id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sponsorships_not_deleted ON public.sponsorships (id) WHERE deleted_at IS NULL;
CREATE INDEX idx_photos_not_deleted       ON public.photos       (id) WHERE deleted_at IS NULL;

-- Views for default queries
CREATE VIEW public.contacts_active     AS SELECT * FROM public.contacts     WHERE deleted_at IS NULL;
CREATE VIEW public.teams_active        AS SELECT * FROM public.teams        WHERE deleted_at IS NULL;
CREATE VIEW public.sponsors_active     AS SELECT * FROM public.sponsors     WHERE deleted_at IS NULL;
CREATE VIEW public.sponsorships_active AS SELECT * FROM public.sponsorships WHERE deleted_at IS NULL;
CREATE VIEW public.photos_active       AS SELECT * FROM public.photos       WHERE deleted_at IS NULL;

-- Grant SELECT on views to same roles as underlying tables
-- (verify each view inherits RLS from underlying table; if not, add equivalent policies)
```

**TS helper** `src/lib/supabase/soft-delete.ts`:
```ts
export async function softDelete(
  supabase: SupabaseClient,
  table: "contacts" | "teams" | "sponsors" | "sponsorships" | "photos",
  id: string
): Promise<{ ok: true } | { error: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthenticated" };
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", id);
  return error ? { error: error.message } : { ok: true };
}

export async function restore(
  supabase: SupabaseClient,
  table: "contacts" | "teams" | "sponsors" | "sponsorships" | "photos",
  id: string
): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", id);
  return error ? { error: error.message } : { ok: true };
}
```

**Types update:**
- Regenerate `src/types/database.ts` from Supabase after migration — adds `deleted_at`, `deleted_by`, and the five `*_active` views
- App code that currently queries `contacts`/`teams`/etc. for default lists must switch to the `_active` views — grep and verify

**Acceptance:**
- Migration applies cleanly to staging DB
- `tsc` clean after types regen
- All existing queries pointed at `_active` views where they're showing "non-deleted" data (grep audit checklist in PR description)
- Unique index test: insert row, soft-delete, insert row with same email — second insert succeeds (proves partial index works)

---

### S10-1: Teams sidebar link + fix broken contacts filter (S — 1h, Bolt)

**Sidebar:** Add Teams to `admin-sidebar.tsx` menuItems between Registrations and Sponsorships. Icon: `UsersRound` (lucide). Active state via `pathname.startsWith("/admin/teams")`.

**Filter fix:** `contact-list.tsx` currently applies team/captain filter only in CSV export. Fix: pass `team_id` / `captain_only` through to `getContacts` server action (already supported — see actions.ts:23-80), re-fetch list on filter change. Remove the disclaimer text at line 259.

Re-fetching means making the list client component more dynamic — either call server action on filter change (simplest), or make the page a Server Component with searchParams and navigate on filter change. Simpler = first approach.

**Acceptance:**
- Teams link in sidebar, highlights on `/admin/teams*`
- Selecting a team filter on `/admin/contacts` narrows the table (not just export)
- Disclaimer text at line 259 removed

---

### S10-2: Contacts create/edit via side drawer (M — 5h, Flux + Bolt)

**New dependencies:** `pnpm add sonner libphonenumber-js`

**Shared helper first:** create `src/lib/contacts/contact-utils.ts`:
```ts
import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js/min";

export function deriveFullName(
  first: string | null, last: string | null, company: string | null
): string {
  const parts = [first, last].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return company ?? "";
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string | null): string | null {
  const trimmed = (raw ?? "").trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function isValidEmail(raw: string | null): boolean {
  if (!raw || !raw.trim()) return true; // nullable field
  return EMAIL_REGEX.test(raw.trim());
}

export function normalizePhone(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = parsePhoneNumber(raw.trim(), "US");
    return parsed?.number ?? null; // E.164 format
  } catch { return null; }
}

export function formatPhoneForDisplay(stored: string | null): string {
  if (!stored) return "";
  try {
    return parsePhoneNumber(stored).formatNational();
  } catch { return stored; }
}

export function isValidPhone(raw: string | null): boolean {
  if (!raw || !raw.trim()) return true; // nullable
  return isValidPhoneNumber(raw.trim(), "US");
}

export const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;

export function isValidZip(raw: string | null): boolean {
  if (!raw || !raw.trim()) return true; // nullable
  return US_ZIP_REGEX.test(raw.trim());
}
```

Update `csv-parser.ts` to import `deriveFullName` from here (remove duplicate).

**Server actions** in `contacts/actions.ts`:
```ts
type ContactInput = {
  salutation: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  type: "player" | "sponsor" | "donor" | "other";
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  marketing_consent: boolean;
  notes: string | null;
  year_first_seen: number;
};

createContact(input: ContactInput): Promise<{ id: string } | { error: string }>
updateContact(id: string, input: Partial<ContactInput>): Promise<{ ok: true } | { error: string }>
```

Both actions:
- `requireAdmin()`
- Derive `full_name` via `deriveFullName` helper
- Normalize email via `normalizeEmail` (lowercase + trim + null if empty)
- Validate email via `isValidEmail` — if fail, return `{ error: "Invalid email format" }`
- Normalize phone via `normalizePhone` (E.164 or null)
- Validate phone via `isValidPhone` — if fail, return `{ error: "Invalid phone number" }`
- Validate ZIP via `isValidZip` — if fail, return `{ error: "ZIP must be 5 digits or 5+4 (e.g. 28562 or 28562-1234)" }`
- Validate presence: if first, last, AND company are all empty/null, return `{ error: "Contact needs a first/last name or a company" }` (prevents empty-shell records, aligns with `full_name NOT NULL` schema constraint)
- Catch Postgres error code `23505` on email unique index → return `{ error: "Email already in use by another contact" }`

**UI (Bolt):**
- `contact-drawer.tsx` — shadcn `Sheet` (right side, width 480px)
- `contact-form.tsx` — shared form used in both create and edit modes
- Sections: Identity (salutation, first, last, company) · Contact (email, phone) · Classification (type dropdown, marketing_consent checkbox, year) · Address · Notes
- Default `year_first_seen` = current calendar year on create
- Save button in drawer header; Cancel closes without save; Delete button in drawer footer (wires to S10-3)
- On save: close drawer, re-fetch list via server action, `sonner.toast.success`
- Row click on contact-list opens drawer in edit mode; "New Contact" button opens drawer in create mode

**Toast setup (happens here, reused everywhere):**
- `pnpm add sonner`
- `<Toaster />` in `src/app/admin/layout.tsx`
- Import `toast` from `sonner` in any client component

**Testing (Spec, S10-8):**
- `createContact` happy path + duplicate email + invalid email + requireAdmin
- `updateContact` happy path + duplicate email + partial update
- `deriveFullName` parity across csv-parser and contact-form (regression)

---

### S10-3: Contacts soft-delete (S — 2h, Flux + Bolt)

Delete is much simpler now — no FK-block dialog needed. Contact with team_members rows can be soft-deleted; the team roster shows the slot as `(deleted contact)`.

**Server action:**
```ts
deleteContact(id: string): Promise<{ ok: true } | { error: string }>
// calls softDelete(supabase, "contacts", id)
```

**UX:**
- Delete button in drawer footer (red outline)
- Single confirm dialog: *"Soft-delete {full_name}? They'll be moved to Trash and hidden from default views. You can restore from Admin → Trash."*
- On confirm: call `deleteContact`, close drawer, refresh list, `sonner.toast.success("Deleted — restore from Trash")`
- Team roster UI (team-list.tsx): when a `team_members` row references a soft-deleted contact (joined via `contacts_active` returns null for that contact_id), render the slot as `<span class="text-muted-foreground italic">(deleted contact)</span>`

**No pre-flight reference check, no navigation to team, no `?edit=<id>` deep-link needed for contacts.** The deep-link pattern from Q5 is deferred — no consumer in this sprint.

**Testing:**
- `deleteContact` sets `deleted_at` + `deleted_by`
- Soft-deleted contact disappears from `contacts_active` (thus from default list queries)
- Team that had deleted contact renders placeholder, not a crash
- Second contact with same email can be created after first is soft-deleted (proves unique index partial works end-to-end)

---

### S10-4: Contacts multi-select + bulk actions (M — 4h, Flux + Bolt)

**Selection:**
- Checkbox column + header select-all
- Shift-click range, cmd-click toggle
- Selection persists across filter changes. Counter: *"12 selected (3 not in current view)"* — the "not in view" count updates as filters change.

**Bulk action bar** (appears when >0 selected):
> **{n} selected** · [Change Type ▾] [Subscribe] [Unsubscribe] [Delete] [Clear]

**Server actions:**
```ts
bulkUpdateContacts(ids: string[], update: { type?: ContactType; marketing_consent?: boolean }): Promise<{ updated: number } | { error: string }>
bulkDeleteContacts(ids: string[]): Promise<{ deleted: number } | { error: string }>
```
- Cap: 500 ids per call (defensive — prevents accidental 10k-row operations). Return `{ error: "Too many contacts selected — select 500 or fewer" }` if exceeded.
- `bulkDeleteContacts` uses `softDelete` helper in a loop, or a single update: `update({deleted_at, deleted_by}).in('id', ids)`.
- No reference-blocking needed (soft-delete).

**UX post-action:**
- `sonner.toast.success("Deleted 12 contacts")` / `"Updated 12 contacts"` / `"Subscribed 12 contacts"` / `"Unsubscribed 12 contacts"`
- Selection cleared after action completes

**Testing:**
- Bulk update with mixed types — only targeted rows change
- Bulk delete — all rows get `deleted_at`
- Cap at 501 ids returns error
- requireAdmin enforced

---

### S10-5: Teams soft-delete + paid-team confirm (S — 3h, Flux + Bolt)

**Move canonical `deleteTeam` to `teams/actions.ts`.** Update `registration-list.tsx` to import from new path. Old action in `registrations/actions.ts` becomes a thin re-export for now (or removed if not referenced elsewhere — verify).

**Server action:**
```ts
deleteTeam(team_id: string): Promise<{ ok: true } | { error: string }>
// Pre-check: fetch team, note payment_status + amount_paid_cents + score count
// Soft-delete team (team_members rows preserved)
```

**UX:**
- Delete button in team-list Actions column
- Confirm dialog shows: team name, captain, member count, payment status
- **Unpaid + no scores:** single confirm ("Soft-delete team — restore from Trash")
- **Has scores:** confirm with notice *"This team has {n} score(s). They'll remain on the scores page but disconnected from the team record."*
- **Paid (amount_paid_cents > 0):** type-to-confirm + warning *"This team paid ${amount}. Deleting will not refund — handle the refund in Stripe manually if needed."* (applies whether or not scores exist)
- On confirm: `softDelete(supabase, "teams", id)`, refresh list, toast

**Cascade check:** verify `scores.team_id` behavior after team soft-delete. Since we're not hard-deleting, `ON DELETE SET NULL` never fires — scores keep their team_id pointing to the (now soft-deleted) team. `scores` page queries should continue to use raw `scores` table (not a view) since team_id is informational; scores display relies on `scores.team_name` text column which never drifts.

**Testing:**
- Soft-delete unpaid team — `teams_active` excludes, `team_members` rows intact
- Soft-delete paid team requires type-to-confirm
- Scores still appear on scores page after team soft-delete

---

### S10-6: Global Trash admin page (M — 5h, Flux + Bolt)

New route: `/admin/trash`. Sidebar entry between Settings and (end). Icon: `Trash2`.

**UI:**
- Tabs: Contacts · Teams · Sponsors · Sponsorships · Photos
- Table per tab with columns: Name/Identifier, Deleted At, Deleted By (email lookup from auth.users), Restore button
- Actions: Restore (single), Bulk restore (multi-select)
- No hard-delete from Trash in this sprint — deferred. Trash is one-way until we add "Empty trash" later. *This is intentional to reduce blast radius of the initial release.*

**Server actions** in `src/app/admin/trash/actions.ts`:
```ts
getTrashContacts(): Promise<Contact[]>       // raw table + WHERE deleted_at IS NOT NULL
getTrashTeams(): Promise<TeamWithMembers[]>  // same
getTrashSponsors(): Promise<Sponsor[]>
getTrashSponsorships(): Promise<Sponsorship[]>
getTrashPhotos(): Promise<Photo[]>
restoreContact(id: string): Promise<{ ok: true } | { error: string }>
restoreTeam(id: string): Promise<{ ok: true } | { error: string }>
// etc.
```

- All require `requireAdmin()`
- Use the shared `restore` helper from `src/lib/supabase/soft-delete.ts`

**Restore edge case — deleted unique-key collision:**
If Jim was soft-deleted with email `jah@x.com`, then a new contact was created with the same email (partial index allowed it), restoring Jim now creates two active rows with the same email → violates the unique-when-not-deleted partial index → restore fails with FK error.

Handle: on restore, pre-check if the restore would violate a unique constraint; if yes, return `{ error: "Cannot restore — a contact with email 'jah@x.com' already exists. Resolve the conflict first." }` with optional "View conflicting contact" link.

**Testing:**
- Trash tabs show only soft-deleted rows
- Restore single + bulk works
- Restore-with-collision returns error cleanly (doesn't crash)
- `getTrash*` requires admin

---

### S10-7: Migrate sponsor/sponsorship/photo deletes to soft-delete (S — 2h, Flux)

Existing delete actions:
- `admin/sponsors/actions.ts:deleteSponsor`
- `admin/sponsorships/actions.ts:deleteSponsorshipItem`
- `admin/photos/actions.ts:deletePhoto`

Replace each with `softDelete(supabase, "<table>", id)`. No UI changes needed — existing Delete buttons now trigger soft-delete under the hood. Rows disappear from lists (queries moved to `_active` views in S10-0), appear in Trash for restore.

**Verify:** each delete action's caller expects `{ ok: true }` or `{ error }` shape. Match signatures.

**Testing:**
- Each action now produces `deleted_at` timestamp
- Deleted rows appear in corresponding Trash tab
- Existing sponsor/sponsorship/photo tests still pass (behavior-equivalent from UI perspective)

---

### S10-8: Spec sweep + E2E (M — 5h, Spec)

- Unit/integration tests for all new actions (real staging DB, not mocks — per memory rule `feedback_testing`)
- Coverage delta: ≥50% on new files
- Maestro E2E flows:
  1. **Create/edit contact** — new contact → edit → verify in list
  2. **Soft-delete + restore contact** — delete → Trash → restore → back in list
  3. **Bulk subscribe** — select 3 contacts → Subscribe → verify marketing_consent true
  4. **Bulk delete** — select 3 contacts → Delete → Trash shows 3 → restore all
  5. **Team delete with scores** — confirm dialog shows score count, deletes, scores page still shows scores
  6. **Paid team delete type-to-confirm** — cannot delete without typing team name exactly
  7. **Deleted contact on team** — team shows `(deleted contact)` placeholder after member soft-deleted
  8. **Unique email after soft-delete** — delete Jim with email `x@y.com` → create new contact with `x@y.com` → succeeds
  9. **Restore with conflict** — restore Jim when email `x@y.com` is reused → shows clear error

---

## Delivery order

1. **csv-parser extraction PR** (already written, uncommitted — separate PR, ships before sprint opens)
2. **S10-0 foundation** — blocks everything. Must merge first.
3. After S10-0 merges:
   - **S10-1 sidebar+filter** (Bolt, trivial)
   - **S10-2 contacts create/edit** (Flux+Bolt)
   - **S10-5 teams delete** (Flux+Bolt) — parallel with S10-2
   - **S10-6 Trash page** (Flux+Bolt) — parallel with S10-2 (shared code minimal)
   - **S10-7 migrate other deletes** (Flux) — parallel, small
4. After S10-2 merges:
   - **S10-3 contacts soft-delete** (Flux+Bolt)
   - **S10-4 bulk actions** (Flux+Bolt) — parallel with S10-3
5. **S10-8 Spec sweep** (Spec) — after all builders merge

**Parallelism:** 3–4 builders can work concurrently in the middle phase. Serial bottlenecks: S10-0 first, S10-8 last.

---

## Risks

- **Unique index audit miss.** If any unique constraint on soft-deletable tables is missed in S10-0, soft-delete + re-create will fail. Mitigation: PR description includes grep output for `UNIQUE` and `CREATE UNIQUE INDEX` across all migrations for each table.
- **View vs table query drift.** App code may query raw table somewhere expecting no deleted rows. Mitigation: S10-0 PR grep audit + S10-8 Spec test coverage.
- **Restore-conflict UX.** User tries to restore, gets blocked by unique collision, gets frustrated. Mitigation: clear error copy + "View conflict" link to the blocking row.
- **Team roster placeholder shape.** `(deleted contact)` slot may confuse captain viewing their roster. Mitigation: only admin sees Trash and deleted-member placeholders; public team pages should filter out or hide the slot entirely (verify in S10-3).
- **Cascade on soft-deleted team.** team_members rows referencing a soft-deleted team pile up. Not harmful but not tidy. Mitigation: acceptable for now; global hard-delete-from-trash in a later sprint handles final cleanup.
- **Migration apply on prod.** Adding nullable columns + partial indexes is non-blocking on small tables. 376 contacts + ~12 teams = zero-downtime safe. Document in PR.

---

## Out of scope (deferred)

- **Empty Trash / hard-delete from Trash** — add in a later sprint once we're confident in restore flows
- **Soft-delete for `invitations` / `scores`** — explicitly rejected for architectural reasons above
- **Activity log / full audit trail** — `deleted_by` + `deleted_at` is a mini-audit; full audit log is separate
- **Contact merge tool** — for CSV import duplicates that slip past the email check
- **Soft-delete TTL / auto-purge** — e.g., "purge Trash rows older than 1 year"
- **Per-entity restore permissions beyond admin** — viewers should never see Trash
- **`?edit=<id>` deep-link pattern** — no consumer this sprint; revisit when we actually need it
