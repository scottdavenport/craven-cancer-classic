# Design — sponsorship_purchases.sponsor_id FK + delete-confirm template wiring

**Issue:** [#380](https://github.com/scottdavenport/craven-cancer-classic/issues/380) — admin-table-unification follow-up
**Owner:** Forge orchestrator (Scott)
**Status:** approved 2026-05-09
**Provenance:**
- PR #379 (Phase 2: Sponsors drawer→modal — shipped C2 zero-linked variant only)
- PR #378 (Phase 2 Aria gate — `plans/design/admin-table-unification/strings.md` §C1/§C2/§D)
- Sprint plan `plans/2026-05-admin-table-unification-sprint.md` §3 Phase 2

---

## Goal

Add the `sponsor_id` foreign-key column to `sponsorship_purchases` and wire the Sponsors delete-confirm modal to render the correct Aria-locked copy variant (C2 zero-linked / C1 singular / C1 plural) based on the count of linked purchase records.

PR #379 shipped only the zero-linked variant (`buildDeleteDescription` returns C2 unconditionally — `sponsor-modal.tsx:154-158`). The other two variants are blocked by the missing `sponsor_id` schema column. This spec ships the unblock.

## Non-goals (explicit, deferred to follow-up issues)

The issue body lists items beyond the scope locked here. Each is intentionally deferred:

1. **Purchase-display surface rendering "Deleted sponsor" fallback.** Aria spec §D locks the fallback string for "any UI cell / field displaying a deleted sponsor's name." No current admin or public surface joins `sponsorship_purchases` → `sponsors` to display a sponsor name on a purchase row. Adding such a surface is a separate design decision (which surface, what columns, what join shape).
2. **Creation-path wiring (checkout + Stripe webhook populating `sponsor_id`).** `src/app/api/checkout/route.ts` and `src/app/api/webhooks/stripe/route.ts` write purchases without any sponsor linkage today; `purchaser_name` and `company_name` remain free-text. Wiring an automatic match (by email or normalized company name) introduces a real risk surface (false positives, idempotency, data quality) that warrants its own design pass.
3. **Year-scoped count.** The delete-confirm count covers all years (the soft-delete impact is permanent across the data lifetime). No filter applied.

## Architecture

Three artifacts land in one PR:

1. **Migration** — `supabase/migrations/<YYYYMMDDHHMMSS>_sponsorship_purchases_sponsor_id.sql`
2. **Server action** — `getSponsorPurchaseCount(sponsorId)` in `src/app/admin/sponsors/actions.ts`
3. **Modal wiring** — `src/app/admin/sponsors/sponsor-modal.tsx` `handleDeleteClick` + `buildDeleteDescription`

### 1. Migration

```sql
-- Phase 2 follow-up: link sponsorship_purchases to sponsors so the delete-confirm
-- can warn about linked records. ON DELETE SET NULL is defensive — sponsors uses
-- soft-delete, so this only fires on rare hard-delete (admin Trash → permanent).

ALTER TABLE sponsorship_purchases
  ADD COLUMN sponsor_id UUID NULL REFERENCES sponsors(id) ON DELETE SET NULL;

CREATE INDEX idx_sponsorship_purchases_sponsor_id
  ON sponsorship_purchases(sponsor_id) WHERE sponsor_id IS NOT NULL;
```

**Backfill:** none. `sponsorship_purchases` is empty at time of writing (verified `SELECT COUNT(*) = 0` against the `craven` Supabase project, 2026-05-09). The migration adds a nullable column on an empty table — no data hazard.

**FK constraint name:** `sponsorship_purchases_sponsor_id_fkey` (Postgres default; matches the existing `sponsorship_purchases_item_id_fkey` pattern at `database.ts:552`).

**Index rationale:** partial index excluding NULL rows because the count query filters on a specific `sponsor_id` UUID — no scenario reads NULL `sponsor_id`. Smaller, cheaper, faster.

**ON DELETE behavior:** `SET NULL` only fires on hard delete. Sponsors uses soft-delete (`deleted_at`/`deleted_by` — `database.ts:394-395`); the typical "delete a sponsor" path leaves the row in place with `deleted_at` set. The "Deleted sponsor" fallback (Aria §D) renders when a UI joining via `sponsors_active` (the soft-delete-aware view at `actions.ts:77`) returns NULL. The FK's ON DELETE SET NULL is defensive insurance for the rare hard-delete path (admin Trash → purge); it does not drive the typical fallback rendering.

### 2. Server action

New export in `src/app/admin/sponsors/actions.ts`:

```ts
export async function getSponsorPurchaseCount(sponsorId: string): Promise<number> {
  await requireAdmin();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("sponsorship_purchases")
    .select("*", { count: "exact", head: true })
    .eq("sponsor_id", sponsorId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
```

**Why count-only, not row-fetch:** the Aria-locked copy at `strings.md:312` (Phase 2 §C3) explicitly chose count-only for the Sponsors delete-confirm: "for Sponsors, the linked entity is `sponsorship_purchases` — these are purchase transactions, not named entities with meaningful display names. Listing purchase IDs or line items is noise to the admin; the count is what matters." The issue body's older proposal (`getSponsorPurchasesForSponsor` returning rows + names list) is superseded by that gate.

**No year filter, no payment_status filter.** Soft-delete impact is permanent across the data lifetime; the warning should reflect total linked records.

**Auth gate:** `requireAdmin()` — consistent with every other action in the file (e.g., `deleteSponsor` at `actions.ts:295-300`).

### 3. Modal wiring

`src/app/admin/sponsors/sponsor-modal.tsx`. Three changes:

**a) Add count state** (alongside existing `loading`, `confirmOpen`):

```ts
const [purchaseCount, setPurchaseCount] = useState<number>(0);
```

**b) Convert `handleDeleteClick` to async** (currently `sponsor-modal.tsx:129-134`):

```ts
async function handleDeleteClick() {
  if (!sponsor) return;
  setLoading(true);
  try {
    const count = await getSponsorPurchaseCount(sponsor.id);
    setPurchaseCount(count);
  } catch (err) {
    console.warn("[SponsorModal] getSponsorPurchaseCount failed; falling back to zero-linked copy:", err);
    setPurchaseCount(0);
  } finally {
    setLoading(false);
    setConfirmOpen(true);
  }
}
```

The trash button is already disabled while `loading` is true (existing prop at `sponsor-modal.tsx:196`). The brief disabled-button pause replaces the would-be in-dialog skeleton — no new microcopy needed.

**c) Branch `buildDeleteDescription`** by count (currently always returns C2 — `sponsor-modal.tsx:154-158`):

```ts
function buildDeleteDescription(): string {
  const name = sponsor?.name ?? "this sponsor";
  if (purchaseCount === 0) {
    // Aria §C2: zero linked records
    return `Moving ${name} to Trash removes it from the active list. You can restore it from Admin → Trash.`;
  }
  if (purchaseCount === 1) {
    // Aria §C1 singular
    return `1 sponsorship purchase references this sponsor. Moving ${name} to Trash keeps that record intact — it'll display "Deleted sponsor" where the name appeared.`;
  }
  // Aria §C1 plural (count >= 2)
  return `${purchaseCount} sponsorship purchases reference this sponsor. Moving ${name} to Trash keeps those records intact — they'll display "Deleted sponsor" where the name appeared.`;
}
```

**Update the import block** to add `getSponsorPurchaseCount` to the existing `./actions` import (currently lines 15-22).

**Remove the stale comment** at lines 131-132 + 156 (references the FK as not-yet-shipped).

## Data flow

1. Admin opens Edit modal for a sponsor → clicks "Move to Trash" footer button.
2. `handleDeleteClick` fires → `loading=true` (button disabled) → `getSponsorPurchaseCount(sponsor.id)` query.
3. On resolve: `purchaseCount` set, `loading=false`, `confirmOpen=true` (confirm dialog opens with Aria-correct copy).
4. On reject: `purchaseCount=0` (defensive default), warning logged, dialog still opens with C2 copy. No toast — this is a rare-edge fallback; surfacing a toast would alarm the admin without giving them an action to take.
5. Admin clicks Move to Trash in confirm dialog → existing `handleDeleteConfirmed` flow (unchanged): `deleteSponsor` server action → `softDelete` → toast → close.

## Error handling

| Failure | Behavior | Rationale |
|---|---|---|
| `getSponsorPurchaseCount` throws | Log warning, open dialog with C2 copy, do not toast | Soft-delete is reversible from Trash. Worst-case the admin sees the zero-linked copy when one or more purchases are linked — they can verify in the Recent Purchases admin surface and restore from Trash if needed. Blocking the delete entirely is worse UX. |
| `deleteSponsor` throws | Existing toast.error path (unchanged) | Already handled at `sponsor-modal.tsx:140-143`. |
| Modal closed mid-fetch (escape / click-outside) | Resolve still runs; `setConfirmOpen(true)` opens the confirm dialog without the edit modal underneath | Acceptable: rare edge case (admin would have to escape during a sub-second count query). The confirm dialog is self-contained — Cancel + Move to Trash both function. No fix needed. |

## Testing

### Unit — `src/__tests__/sponsor-modal.test.tsx` (extend existing or add new)

Mock `getSponsorPurchaseCount` and assert the rendered `buildDeleteDescription` text per branch:

1. **Zero linked** (`count=0`): renders C2 — `"Moving Carolina East Health to Trash removes it from the active list. You can restore it from Admin → Trash."`
2. **One linked** (`count=1`): renders C1 singular — starts with `"1 sponsorship purchase references this sponsor."` and contains `"that record intact"` and `"\"Deleted sponsor\""`.
3. **N≥2 linked** (`count=3`): renders C1 plural — starts with `"3 sponsorship purchases reference this sponsor."` and contains `"those records intact"`.
4. **Fetch error**: mock rejection, assert dialog still opens with C2 copy and `console.warn` was called.
5. **Trash button disabled during fetch**: assert `disabled` is true while the promise is pending and false after resolve.

### Migration — new test in `src/__tests__/`

Pattern after `sponsorship-items-category-migration.test.ts`:

1. Column `sponsor_id` exists on `sponsorship_purchases` with type `uuid` and `is_nullable=YES`.
2. FK constraint `sponsorship_purchases_sponsor_id_fkey` references `sponsors(id)` with `delete_rule=SET NULL`.
3. Partial index `idx_sponsorship_purchases_sponsor_id` exists with predicate `sponsor_id IS NOT NULL`.

Query against `information_schema.columns`, `information_schema.referential_constraints`, and `pg_indexes`.

### No e2e

The 5 unit branches cover every state introduced. Adding e2e for an admin-only delete-confirm copy variant is duplicative — the public-facing flow doesn't change, the soft-delete action doesn't change, only the in-dialog string changes per count.

## Sequencing + routing

Single PR. The migration is 5 lines, the server action is ~10 lines, the modal change is ~30 lines. Bundling avoids the migration-without-consumer half-state.

**Routing:**
- Bolt builds the PR (UI is the bulk of the work; the migration is small enough not to warrant a Flux split).
- **Sentinel reviews the migration on PR open** — security/RLS/index correctness pass.
- **Watchdog stage-2** review after Sentinel + branch e2e green.

## Acceptance criteria

1. Migration file `supabase/migrations/<timestamp>_sponsorship_purchases_sponsor_id.sql` present, naming consistent with the YYYYMMDDHHMMSS_six-digit-serial convention (e.g., `20260509000001_...`).
2. Migration applies cleanly against the branch DB (Supabase preview branch) — column + FK + partial index introspectable.
3. `getSponsorPurchaseCount` exported from `src/app/admin/sponsors/actions.ts`, admin-gated via `requireAdmin()`, count-only, no year/status filter.
4. Sponsor delete-confirm renders the correct Aria-locked copy for all three count branches (0 / 1 / N≥2) — verified via unit test.
5. Trash button disables during the count fetch — verified via unit test.
6. Fetch error falls back to C2 copy without blocking delete — verified via unit test.
7. Stale comments at `sponsor-modal.tsx:131-132` and `sponsor-modal.tsx:156` removed.
8. Migration test passes (column type/nullable, FK constraint with delete_rule=SET NULL, partial index with predicate `sponsor_id IS NOT NULL`).
9. Existing tests still pass (sponsor-modal, sponsor-list, sponsors actions).
10. `tsc --noEmit` clean. `npm run lint` clean.

## Open questions

None. All scope decisions are locked in this spec.
