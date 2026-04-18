# Sprint 5 — Catalog Consolidation + Money Standardization

**Sprint goal:** Merge `sponsor_tiers` into `sponsorship_items` (preserving UUIDs, adding `benefits`/`sort_order`, seeding 8 known levels), rename every money column to carry the `_cents` suffix and change type to `bigint`, and update every code path that produces or consumes those values so no dollar/cents conversion exists at rest — only at the UI display layer.

**Target dates:** ~1 week

**Baseline:** 197 tests passing, tsc clean, main at `b8a336a`. No production data yet (Stripe test-mode only).

**Scott's locked decisions (all open questions resolved):**
1. Column naming: rename with `_cents` suffix (`price → price_cents`, `amount_paid → amount_paid_cents`)
2. Admin form UX: dollars in form, server converts to cents
3. `register_team` RPC update: inline in the payments migration (atomic rename + `CREATE OR REPLACE FUNCTION`)

---

## Research findings (verified before writing this plan)

### Schema inventory — money columns

Verified by reading migrations in order. Every `numeric` money column originates in `20260414000001_initial_schema.sql`. No subsequent migration alters a money column type (verified: `20260415000001`, `20260416000001`, `20260416000002`, `20260418000001`, `20260419000001`, `20260419000003`, `20260419000005`, `20260419000006`, `20260419000007`, `20260420000001` — none touch money types).

| Table | Column | Current type | Current unit | Standard? |
|---|---|---|---|---|
| `sponsor_tiers` | `price` | `numeric(10,2)` | dollars | ELIMINATED — table dropped in S5-0 |
| `sponsors` | `amount_paid` | `numeric(10,2)` | dollars | NO — needs bigint cents + rename |
| `sponsorship_items` | `price` | `numeric(10,2)` | dollars | NO — needs bigint cents + rename (S5-0 consolidation + S5-0 rename) |
| `sponsorship_purchases` | `amount_paid` | `numeric(10,2)` | dollars | NO — needs bigint cents + rename |
| `teams` | `amount_paid` | `numeric(10,2)` | dollars | NO — needs bigint cents + rename |
| `event_settings` | `registration_fee_cents` | `bigint` | cents | ALREADY CORRECT (added Sprint 2, `20260416000002_add_registration_fee.sql` line 6) |
| `scores` | — | — | — | No money column exists in scores |

**Source citations (all from `20260414000001_initial_schema.sql`):**
- `sponsor_tiers.price numeric(10,2)` — line 92
- `sponsor_tiers.sort_order int` — line 92; `sponsor_tiers.benefits jsonb` — line 93; `sponsor_tiers.max_available int` — line 94
- `sponsors.amount_paid numeric(10,2)` — line 124
- `sponsorship_items.price numeric(10,2)` — line 218; `tier_id uuid references sponsor_tiers` — line 215; no `benefits` or `sort_order` columns exist
- `sponsorship_purchases.amount_paid numeric(10,2)` — line 252
- `teams.amount_paid numeric(10,2)` — line 157

**Atlas's catalog overlap finding:** `sponsor_tiers` (lines 88-97) and `sponsorship_items` (lines 213-224) model the same concept. `sponsorship_items` is the richer table (has `year`, `sold_count` with auto-increment trigger from `20260419000003`, `max_quantity`, `description`). `sponsor_tiers` has `benefits jsonb` and `sort_order int` that `sponsorship_items` lacks — S5-0 adds both. `sponsors.tier_id` FK currently references `sponsor_tiers`; S5-0 retargets it to `sponsorship_items`.

**5 money columns need migration (4 after S5-0 drops sponsor_tiers.price). 1 is already correct. 0 money columns in scores.**

### Code inventory — dollar/cents conversion paths

**Webhook route** (`src/app/api/webhooks/stripe/route.ts`):
- Line 136: `amount_paid: (session.amount_total ?? 0) / 100` — teams update
- Line 177: `amount_paid: (session.amount_total ?? 0) / 100` — sponsorship_purchases update
- Both divide Stripe's integer cents by 100 before writing to DB. After migration, these must write cents directly: `amount_paid_cents: session.amount_total ?? 0`

**Checkout route** (`src/app/api/checkout/route.ts`):
- Line 183: `const unit_amount = Math.round(sponsorshipItem.price * 100)` — converts dollar `price` to cents for Stripe. After migration, `price_cents` is already cents: `const unit_amount = sponsorshipItem.price_cents`
- Line 195: `amount_paid: 0` — initial insert, unchanged (0 is 0 in either unit)

**Admin sponsorships actions** (`src/app/admin/sponsorships/actions.ts`):
- Line 42: `price: parseFloat(formData.get("price") as string)` — create item, parses dollar string from form
- Line 63: `price: parseFloat(formData.get("price") as string)` — update item
- After migration: `price_cents: Math.round(parseFloat(formData.get("price") as string) * 100) || 0`

**Admin sponsors actions** (`src/app/admin/sponsors/actions.ts`):
- Line 10: `getSponsorTiers()` — reads `sponsor_tiers` table. Eliminated in S5-3 (table dropped by S5-0).
- Line 45: `amount_paid: parseFloat(formData.get("amount_paid") as string) || 0` — create
- Line 70: `amount_paid: parseFloat(formData.get("amount_paid") as string) || 0` — update
- After migration: `amount_paid_cents: Math.round(parseFloat(...) * 100) || 0`

**Admin registrations actions** (`src/app/admin/registrations/actions.ts`):
- Line 46: `amount_paid: parseFloat(formData.get("amount_paid") as string) || 0` — manual team create
- After migration: same pattern as above

**Public sponsors page** (`src/app/(public)/sponsors/page.tsx`):
- Lines 16-20: queries `sponsor_tiers` for grouping display. After S5-0, this table is gone. S5-4 rewrites query to use `sponsorship_items`.

**Public sponsorships grid** (`src/app/(public)/sponsorships/sponsorship-grid.tsx`):
- Line 39: `${item.price.toLocaleString()}` — displays dollar value directly
- Line 111: `price_cents: Math.round(item.price * 100)` — dead request-body field; after migration disappears
- Line 143: `${item.price.toLocaleString()}` — second display
- After migration: both displays become `${(item.price_cents / 100).toLocaleString()}`

**Admin sponsor list UI** (`src/app/admin/sponsors/sponsor-list.tsx`):
- Lines 117-135: tier-summary card block iterates `tiers` array from `sponsor_tiers` — delete entirely in S5-4
- Lines 274-287: `tier_id` selector reading `sponsor_tiers` for `<option>` labels — delete in S5-4; replace with `sponsorship_items` selector
- Line 128: `${tier.price.toLocaleString()}` — inside deleted tier-summary block
- Line 214: `${sponsor.amount_paid.toLocaleString()}` — stays, rename to `amount_paid_cents / 100`
- Line 284: `${tier.name} (${tier.price.toLocaleString()})` — inside deleted tier_id selector

**Admin sponsorships manager UI** (`src/app/admin/sponsorships/sponsorship-manager.tsx`):
- Line 42: `sum + p.amount_paid` — total revenue sum (math unit-agnostic; display caller divides)
- Line 193: `${item.price.toLocaleString()}` — item price display
- Line 271: `${p.amount_paid.toLocaleString()}` — purchase amount display
- Line 317: `defaultValue={defaultValues?.price}` — form default
- After migration: display lines divide by 100; form default divides by 100

**Admin registrations list UI** (`src/app/admin/registrations/registration-list.tsx`):
- Line 40: `sum + t.amount_paid` — revenue sum
- Line 94: `t.amount_paid.toString()` — CSV export column
- Line 329: `${team.amount_paid.toLocaleString()}` — table display
- After migration: CSV export writes `(t.amount_paid_cents / 100).toFixed(2)`; display divides by 100

**Public sponsorships page** (`src/app/(public)/sponsorships/page.tsx`):
- Line 22: `.order("price", { ascending: false })` — sort order works on cents too (rename to `price_cents`)

**Admin sponsorships actions** (`src/app/admin/sponsorships/actions.ts`):
- Line 15: `.order("price", { ascending: false })` — rename to `price_cents`

**TypeScript types** (`src/types/database.ts`):
- `sponsor_tiers` block — delete entirely (table dropped in S5-0)
- `sponsorship_items.Row.price: number` — lines 442, 454, 466 → rename to `price_cents`, add `benefits: Json`, `sort_order: number`
- `sponsors.Row.amount_paid: number` — lines 377, 393, 409 → `amount_paid_cents`
- `sponsorship_purchases.Row.amount_paid: number` — lines 483, 496, 509 → `amount_paid_cents`
- `teams.Row.amount_paid: number` — lines 551, 565, 579 → `amount_paid_cents`
- `database.ts` Functions block for `register_team` RPC: update `amount_paid` → `amount_paid_cents` in the RPC's return type
- After migration: Do NOT regen from local DB (per `feedback_types_never_regen_parallel.md`) — edit `database.ts` manually.

### Seed inventory

**`supabase/seed.sql` lines 16-24:** Seeds `sponsor_tiers` with 8 levels today. After S5-0, this block is rewritten to insert into `sponsorship_items`. The level names in seed.sql differ slightly from the canonical names Scott provided (e.g. "Golf Cart Sponsor" vs "Golf Carts", "Bloody Mary Sponsor" vs "Bloody Mary") — use Scott's canonical names from the seeding table below.

**Idempotency:** `sponsorship_items` has no unique constraint on `(name, year)`. S5-0 migration must add one (`UNIQUE (name, year)`) to support `ON CONFLICT (name, year) DO NOTHING` in `seed.sql`. Alternatively, use explicit UUIDs with `ON CONFLICT (id) DO NOTHING`. Recommendation: add the unique constraint — it's the right guard regardless.

### Test fixture inventory

**`checkout-sponsorship.test.ts`:**
- Line 75: `price: 1000.0` — fixture uses dollar value. After migration: `price_cents: 100000`
- Line 125: `price: 99.99` — same. After migration: `price_cents: 9999`
- `unit_amount` assertions (lines 121, 142, 291, 308, 331) stay at cent values — those are Stripe-side and already correct. The math that produces them (`price * 100`) will be replaced by direct `price_cents`.

**`webhook-db-errors.test.ts`:**
- Lines 92, 106, 287, 306, 324, 342: `amount_total: 70000` / `50000` / `5000` — these are Stripe `session.amount_total` fixtures, already in cents. They stay as-is. The test doesn't assert on the `amount_paid` value written to DB, so no fixture value needs to change here — but the `route.ts` code that writes `amount_paid` will change to write cents, and the test implicitly covers it.

**`database-types.test.ts`:**
- Line 62: `amount_paid: 0` → `amount_paid_cents: 0` (table is `teams`)

---

## Scope

### S5-0: Catalog consolidation + seed (Flux, Sentinel review)

---

#### Issue S5-0: Merge sponsor_tiers into sponsorship_items + seed 8 levels

**Specialist:** Flux
**Effort:** medium
**Labels:** `feature`, `P1-high`, `size:M`

**Context:** `sponsor_tiers` and `sponsorship_items` model the same concept with overlapping columns (`name`, `price`, `active`). `sponsorship_items` is the richer table and is the one Stripe checkout reads at `src/app/api/checkout/route.ts:163-183`. `sponsor_tiers` has no admin CRUD and is never read by Stripe. `sponsorship_items.tier_id → sponsor_tiers` is dead weight. Atlas recommended Option A: merge. Scott approved.

This migration also renames `sponsorship_items.price → price_cents` and converts to bigint cents, so S5-1 (the original catalog migration) is fully absorbed here.

**Schema change (one migration file):**
```sql
-- supabase/migrations/20260421000001_catalog_consolidation.sql

-- 1. Extend sponsorship_items to match sponsor_tiers shape
ALTER TABLE public.sponsorship_items
  ADD COLUMN benefits jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.sponsorship_items
  ADD COLUMN sort_order int NOT NULL DEFAULT 0;

-- 2. Add unique constraint to support idempotent seed
ALTER TABLE public.sponsorship_items
  ADD CONSTRAINT sponsorship_items_name_year_unique UNIQUE (name, year);

-- 3. Copy sponsor_tiers rows into sponsorship_items (preserve UUIDs for FK integrity)
INSERT INTO public.sponsorship_items (id, name, price, benefits, sort_order, active, year, max_quantity)
  SELECT id, name, price, benefits, sort_order, active, 2026, max_available
  FROM public.sponsor_tiers
  ON CONFLICT (id) DO NOTHING;

-- 4. Retarget sponsors.tier_id FK from sponsor_tiers to sponsorship_items
ALTER TABLE public.sponsors
  DROP CONSTRAINT sponsors_tier_id_fkey;
ALTER TABLE public.sponsors
  ADD CONSTRAINT sponsors_item_id_fkey
    FOREIGN KEY (tier_id) REFERENCES public.sponsorship_items(id) ON DELETE RESTRICT;

-- 5. Drop dead tier_id column from sponsorship_items
ALTER TABLE public.sponsorship_items DROP COLUMN tier_id;

-- 6. Drop the merged table (RLS policies and indexes cascade)
DROP TABLE public.sponsor_tiers;

-- 7. Rename price → price_cents and convert to bigint cents
ALTER TABLE public.sponsorship_items
  RENAME COLUMN price TO price_cents;
ALTER TABLE public.sponsorship_items
  ALTER COLUMN price_cents TYPE bigint USING ROUND(price_cents * 100)::bigint;
```

**Seed rewrite (`supabase/seed.sql` lines 15-24):**

Replace the `sponsor_tiers` block with:
```sql
-- Sponsorship levels (canonical names from Scott, year = 2026)
insert into public.sponsorship_items (name, price_cents, sort_order, benefits, active, year) values
  ('Champion Sponsor',    500000, 1, '["Premier signage at event", "Recognition on website", "4 complimentary teams"]'::jsonb, true, 2026),
  ('Eagle Sponsor',       250000, 2, '["Prominent signage at event", "Recognition on website", "2 complimentary teams"]'::jsonb, true, 2026),
  ('Golf Gift Sponsor',   250000, 3, '["Logo on golf gifts", "Recognition on website"]'::jsonb, true, 2026),
  ('Celebration Lunch',   200000, 4, '["Signage at lunch", "Recognition on website"]'::jsonb, true, 2026),
  ('Golf Carts',          100000, 5, '["Logo on golf carts", "Recognition on website"]'::jsonb, true, 2026),
  ('Bloody Mary',         100000, 6, '["Signage at Bloody Mary bar", "Recognition on website"]'::jsonb, true, 2026),
  ('Thursday Night',       70000, 7, '["Signage at Thursday night event", "Recognition on website"]'::jsonb, true, 2026),
  ('Wall Sponsor',         70000, 8, '["Name on sponsor wall", "Recognition on website"]'::jsonb, true, 2026)
on conflict (name, year) do nothing;
```

**Files to create/modify:**
- `supabase/migrations/20260421000001_catalog_consolidation.sql` — new
- `supabase/seed.sql` — rewrite lines 15-24 (sponsor_tiers block → sponsorship_items block)
- `src/types/database.ts` — manual edits:
  - Delete entire `sponsor_tiers` Row/Insert/Update block
  - Add `benefits: Json` and `sort_order: number` to `sponsorship_items` Row/Insert/Update
  - Rename `price: number` → `price_cents: number` in `sponsorship_items` Row/Insert/Update
  - Remove `tier_id` from `sponsorship_items` Row/Insert/Update

**Acceptance criteria:**
- Migration runs clean against staging DB
- `supabase/seed.sql` targets `sponsorship_items` — no reference to `sponsor_tiers` remains
- All 8 seed levels present in `sponsorship_items` with correct `price_cents` values (e.g. Champion = 500000)
- `src/types/database.ts` has no `sponsor_tiers` block; `sponsorship_items` has `price_cents`, `benefits`, `sort_order`
- `tsc` clean after type edit
- All 197 existing tests still pass

**Dependencies:** None. First issue in the sprint.

**Sentinel review required:** Schema change drops a table and retargets a FK — Sentinel verifies RLS on `sponsorship_items` covers both public read and admin write after the merge, and that the `sponsors_item_id_fkey` constraint is correctly enforced.

---

### S5-1: Payments money migration (Flux, Sentinel review)

---

#### Issue S5-1: Rename amount_paid columns + recreate register_team RPC

**Specialist:** Flux
**Effort:** small
**Labels:** `feature`, `P1-high`, `size:S`

**Context:** Renames the three `amount_paid` columns on `sponsors`, `sponsorship_purchases`, and `teams` from `numeric(10,2)` dollars to `bigint` cents. Bundles the `register_team` RPC recreation inline so the rename and its dependent function are atomic. `sponsor_tiers.price` is eliminated by S5-0 and does not appear here.

**Schema change:**
```sql
-- supabase/migrations/20260421000002_money_cents_payments.sql
ALTER TABLE public.sponsors
  RENAME COLUMN amount_paid TO amount_paid_cents;
ALTER TABLE public.sponsors
  ALTER COLUMN amount_paid_cents TYPE bigint USING ROUND(amount_paid_cents * 100)::bigint;

ALTER TABLE public.sponsorship_purchases
  RENAME COLUMN amount_paid TO amount_paid_cents;
ALTER TABLE public.sponsorship_purchases
  ALTER COLUMN amount_paid_cents TYPE bigint USING ROUND(amount_paid_cents * 100)::bigint;

ALTER TABLE public.teams
  RENAME COLUMN amount_paid TO amount_paid_cents;
ALTER TABLE public.teams
  ALTER COLUMN amount_paid_cents TYPE bigint USING ROUND(amount_paid_cents * 100)::bigint;

-- Recreate register_team RPC with updated column name (atomic with rename above)
CREATE OR REPLACE FUNCTION public.register_team(...)
  -- full function body, INSERT uses amount_paid_cents: 0
```

Flux must read `20260419000006_register_team_rpc.sql` to get the full function signature and body, then reproduce it with `amount_paid_cents` in the INSERT.

**Files to create/modify:**
- `supabase/migrations/20260421000002_money_cents_payments.sql` — new
- `src/types/database.ts` — rename `amount_paid` → `amount_paid_cents` in `sponsors`, `sponsorship_purchases`, `teams` Row/Insert/Update blocks (9 field occurrences across 3 tables). Also update the Functions block for `register_team` return type if `amount_paid` appears there. Edit manually, do NOT regen.

**Acceptance criteria:**
- Migration runs clean
- `src/types/database.ts` has `amount_paid_cents: number` in all three tables; no remaining `amount_paid` in any of those blocks
- `tsc` clean after type edit
- All 197 tests pass
- `register_team` RPC callable — registration checkout smoke test succeeds

**Dependencies:** S5-0 must be merged first (drops `sponsor_tiers`, which `database.ts` edits in S5-0 touch the same file — avoid conflict by running serial).

---

### S5-2: API routes update (Flux)

---

#### Issue S5-2: Update API routes for cents columns

**Specialist:** Flux
**Effort:** medium
**Labels:** `feature`, `P1-high`, `size:M`

**Context:** Two API routes write money values to the DB and must be updated to use the new column names and correct cent values. This is identical to the original S5-3 scope.

**Files to modify:**

`src/app/api/webhooks/stripe/route.ts`:
- Line 136: `amount_paid: (session.amount_total ?? 0) / 100` → `amount_paid_cents: session.amount_total ?? 0`
- Line 177: `amount_paid: (session.amount_total ?? 0) / 100` → `amount_paid_cents: session.amount_total ?? 0`

`src/app/api/checkout/route.ts`:
- Line 164: `.select("id, name, price, active")` → `.select("id, name, price_cents, active")`
- Line 183: `const unit_amount = Math.round(sponsorshipItem.price * 100)` → `const unit_amount = sponsorshipItem.price_cents`
- Line 195: `amount_paid: 0` → `amount_paid_cents: 0`

**Acceptance criteria:**
- `tsc` clean
- All 197 tests pass
- Manually verify in test mode: complete a Stripe test checkout for a sponsorship item; check `sponsorship_purchases.amount_paid_cents` in Supabase dashboard equals Stripe `amount_total` (e.g. $1000 item → `100000` in DB)
- Manually verify: complete a test registration checkout; check `teams.amount_paid_cents` equals registration fee in cents

**Dependencies:** S5-0 AND S5-1 must be merged first (column names change).

---

### S5-3: Admin server actions update (Flux)

---

#### Issue S5-3: Update admin server actions for cents columns

**Specialist:** Flux
**Effort:** medium
**Labels:** `feature`, `P1-high`, `size:M`

**Context:** Three admin server action files write money from form inputs to the DB. Forms accept dollar values; server actions convert to cents. Also removes the obsolete `getSponsorTiers()` / `sponsor_tiers` read in `actions.ts:10` — that table is gone after S5-0.

**Files to modify:**

`src/app/admin/sponsorships/actions.ts`:
- Line 15: `.order("price", ...)` → `.order("price_cents", ...)`
- Line 42: `price: parseFloat(...)` → `price_cents: Math.round(parseFloat(formData.get("price") as string) * 100) || 0`
- Line 63: same update for `updateSponsorshipItem`

`src/app/admin/sponsors/actions.ts`:
- Lines 7-16 (`getSponsorTiers` function): delete entirely — references dropped `sponsor_tiers` table
- Line 45: `amount_paid: parseFloat(...) || 0` → `amount_paid_cents: Math.round(parseFloat(formData.get("amount_paid") as string) * 100) || 0`
- Line 70: same for `updateSponsor`

`src/app/admin/registrations/actions.ts`:
- Line 46: `amount_paid: parseFloat(...) || 0` → `amount_paid_cents: Math.round(parseFloat(formData.get("amount_paid") as string) * 100) || 0`

**Acceptance criteria:**
- `tsc` clean
- All 197 tests pass
- No remaining reference to `sponsor_tiers` in any `actions.ts` file
- Admin: create a sponsorship item at $1000 → verify `price_cents = 100000` in Supabase dashboard
- Admin: manually add a sponsor with amount paid $500 → verify `amount_paid_cents = 50000`
- Admin: manually create a team registration with amount $700 → verify `amount_paid_cents = 70000`

**Dependencies:** S5-0 AND S5-1 must be merged first. No file overlap with S5-2 → can run parallel with S5-2.

---

### S5-4: UI display layer (Bolt)

---

#### Issue S5-4: Update UI display + remove sponsor_tiers references

**Specialist:** Bolt
**Effort:** medium
**Labels:** `feature`, `P1-high`, `size:M`

**Context:** Every place the UI reads a money value and renders it as dollars must now divide by 100 first. The forms that let admins type dollar amounts stay unchanged (server actions in S5-3 handle conversion). Also deletes the tier-summary block and `tier_id` selector from `sponsor-list.tsx` (Atlas recommendation — one place to manage levels going forward: the sponsorship items admin). Rewrites the public `/sponsors/page.tsx` query from `sponsor_tiers` to `sponsorship_items`.

**Files to modify:**

`src/app/(public)/sponsorships/sponsorship-grid.tsx`:
- Line 39: `${item.price.toLocaleString()}` → `${(item.price_cents / 100).toLocaleString()}`
- Line 111: `price_cents: Math.round(item.price * 100)` → `price_cents: item.price_cents`
- Line 143: `${item.price.toLocaleString()}` → `${(item.price_cents / 100).toLocaleString()}`

`src/app/(public)/sponsorships/page.tsx`:
- Line 22: `.order("price", ...)` → `.order("price_cents", ...)`

`src/app/(public)/sponsors/page.tsx`:
- Lines 16-20: delete `sponsor_tiers` query. Replace with query against `sponsorship_items` filtered by `active = true, year = currentYear, order("sort_order")`. The grouping display must use `sponsorship_items` rows as tier labels. Bolt must read the full component to understand how tiers are used for grouping sponsors before writing the replacement query.

`src/app/admin/sponsors/sponsor-list.tsx`:
- Lines 117-136 (tier-summary card block): delete entirely — no `sponsor_tiers` table, no tier summary
- Lines 274-287 (`tier_id` selector): replace with a selector reading `sponsorship_items` (Bolt must confirm exact component structure). The selector label changes from `${tier.name} ($${(tier.price_cents / 100).toLocaleString()})` — but now pulling from `sponsorship_items` with `price_cents`
- Line 214: `${sponsor.amount_paid.toLocaleString()}` → `${(sponsor.amount_paid_cents / 100).toLocaleString()}`
- Line 343: `defaultValue={defaultValues?.amount_paid ?? 0}` → `defaultValue={defaultValues ? (defaultValues.amount_paid_cents / 100) : 0}`

`src/app/admin/sponsorships/sponsorship-manager.tsx`:
- Line 42: `sum + p.amount_paid` → `sum + p.amount_paid_cents`
- Line 193: `${item.price.toLocaleString()}` → `${(item.price_cents / 100).toLocaleString()}`
- Line 271: `${p.amount_paid.toLocaleString()}` → `${(p.amount_paid_cents / 100).toLocaleString()}`
- Line 317: `defaultValue={defaultValues?.price}` → `defaultValue={defaultValues ? (defaultValues.price_cents / 100) : undefined}`
- Revenue total display: wherever `totalRevenue` is rendered, ensure it renders as `(totalRevenue / 100).toLocaleString()`

`src/app/admin/registrations/registration-list.tsx`:
- Line 40: `sum + t.amount_paid` → `sum + t.amount_paid_cents`
- Line 94: `t.amount_paid.toString()` → `(t.amount_paid_cents / 100).toFixed(2)`
- Line 329: `${team.amount_paid.toLocaleString()}` → `${(team.amount_paid_cents / 100).toLocaleString()}`
- Revenue total display: divide by 100

**Acceptance criteria:**
- `tsc` clean
- All 197 tests pass
- Public sponsorships page: a $1000 item shows "$1,000" (not "$100000")
- Public sponsors page: renders without error; grouped display uses `sponsorship_items` data
- Admin sponsors list: no tier-summary card section; `tier_id` selector draws from `sponsorship_items`; amount paid shows correct dollar values
- Admin registrations: revenue total matches expected dollar sum; CSV export column shows dollar values with 2 decimal places
- No remaining reference to `sponsor_tiers` in any UI file
- No double-conversion: Bolt must audit after making changes — grep for remaining `* 100` or `/ 100` in any display path that already receives a cents value

**Dependencies:** S5-0 AND S5-1 must be merged first. No file overlap with S5-2 or S5-3 → can run parallel.

---

### S5-5: Test fixtures (Spec)

---

#### Issue S5-5: Update test fixtures for merged schema + cents columns

**Specialist:** Spec
**Effort:** medium
**Labels:** `chore`, `P1-high`, `size:M`

**Context:** Test fixtures that reference `price` on `sponsorship_items` or `amount_paid` on any table must be updated. Any fixture or mock that returned data shaped like `sponsor_tiers` must be removed or rewritten. Spec's job is to make the full suite green, not only change the known lines below.

**Files to modify:**

`src/__tests__/checkout-sponsorship.test.ts`:
- Line 75: `price: 1000.0` → `price_cents: 100000`
- Line 125: `price: 99.99` → `price_cents: 9999`
- Line 83: `price_cents: 1` in tampered request body stays — this is a client-sent field, not DB schema. Confirm the comment on line 120 still holds: the test proves DB value (`price_cents: 100000`) is used, not client `price_cents: 1`.
- Line 164 in checkout route changed `.select("id, name, price, active")` → `.select("id, name, price_cents, active")`. Update the mock's `select` chain to return `price_cents` key. Any mock that returns `{ price: ... }` for `sponsorship_items` needs to return `{ price_cents: ... }`.

`src/__tests__/database-types.test.ts`:
- Line 62: `amount_paid: 0` → `amount_paid_cents: 0` (table is `teams`)
- Audit all other team/sponsor/sponsorship fixture shapes in this file for old column names.
- Remove any fixture that references `sponsor_tiers` columns.

`src/__tests__/webhook-db-errors.test.ts`:
- The `amount_total` fixtures (lines 92, 106, 287, 306, 324, 342) stay as-is — those are Stripe-side.
- Audit for any `expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ amount_paid: ... }))` → update to `amount_paid_cents`.

`src/__tests__/webhook-idempotency.test.ts`:
- Same audit for `amount_paid` assertions.

Spec must also: grep all test files for `sponsor_tiers`, `amount_paid[^_]`, `\.price[^_]` against `sponsorship_items` mocks, and fix every hit. Treat this as "make all red tests green" not "change only listed lines."

**Acceptance criteria:**
- All tests pass: `npx vitest run` exits 0
- `tsc` clean
- No test mock returns `price` (unqualified) or `amount_paid` (unqualified) for any migrated table
- No test references `sponsor_tiers`
- Test count stays at 197 or higher (no tests deleted)

**Dependencies:** S5-2 AND S5-4 must be merged first (Spec sees final column names in the code it's testing against).

---

## Execution order

```
Phase 1 (serial — database.ts conflict avoidance):
  S5-0 (Flux) — catalog_consolidation.sql, seed.sql, database.ts (sponsor_tiers deleted,
                 sponsorship_items gains price_cents/benefits/sort_order)

Phase 2 (serial after S5-0 merges):
  S5-1 (Flux) — money_cents_payments.sql, database.ts (sponsors/sponsorship_purchases/teams)
  NOTE: S5-1 touches database.ts. Run after S5-0 to avoid conflict.

Phase 3 (parallel — after S5-1 merges, no file overlap between S5-2, S5-3, S5-4):
  S5-2 (Flux) — api/webhooks/stripe/route.ts, api/checkout/route.ts
  S5-3 (Flux) — admin/sponsorships/actions.ts, admin/sponsors/actions.ts, admin/registrations/actions.ts
  S5-4 (Bolt) — (public)/sponsorships/sponsorship-grid.tsx, (public)/sponsorships/page.tsx,
                 (public)/sponsors/page.tsx, admin/sponsors/sponsor-list.tsx,
                 admin/sponsorships/sponsorship-manager.tsx, admin/registrations/registration-list.tsx

  FILE CONFLICT CHECK: S5-2 (api routes) vs S5-3 (actions) vs S5-4 (UI) — zero file overlap. All parallel.

Phase 4 (serial after Phase 3):
  S5-5 (Spec) — __tests__/ only. Waits for all Phase 3 PRs merged so Spec sees final code shape.
```

**Total estimated builder time:** S5-0 (3h) + S5-1 (2h) + S5-2 (2h) + S5-3 (2h) + S5-4 (3h) + S5-5 (3h) = 15h across specialists. Wall-clock with parallel phases: ~8h (phases 1+2 are serial).

---

## Risks and considerations (Atlas's analysis + Compass additions)

### 1. UUID preservation (Atlas — critical)
The S5-0 migration copies `sponsor_tiers` rows into `sponsorship_items` using the original `id` values. `sponsors.tier_id` FK is retargeted to `sponsorship_items(id)`. If the UUIDs don't carry over cleanly, the `sponsors` rows lose their tier references. Mitigation: the migration uses `INSERT INTO sponsorship_items (id, ...) SELECT id, ... FROM sponsor_tiers` — explicit `id` column preserves UUIDs. `ON CONFLICT (id) DO NOTHING` ensures idempotency if S5-0 runs twice (e.g. migration replay).

### 2. benefits jsonb carryover (Atlas)
`sponsor_tiers.benefits jsonb` is populated in seed.sql and by the `INSERT ... SELECT` in S5-0. Flux must verify the column values survive the merge by querying `sponsorship_items` after the migration and spot-checking that Champion Sponsor has `["Premier signage at event", ...]`.

### 3. Public /sponsors/page.tsx query rewrite (Atlas)
The public sponsors page currently groups sponsors by tier using `sponsor_tiers` for the tier label lookup. After S5-0 that table is gone. S5-4 (Bolt) must rewrite the query and grouping logic to use `sponsorship_items`. Bolt must read the full component — the exact grouping structure depends on how sponsors are linked (via `sponsors.tier_id` which is retargeted to `sponsorship_items.id`). The column name `tier_id` on `sponsors` is a naming lie after the merge — it now points to `sponsorship_items`. Bolt should not rename the FK column (that's out of scope for this sprint) but should document the note.

### 4. seed.sql rewrite (Atlas)
`supabase/seed.sql` currently seeds `sponsor_tiers`. After S5-0 that insert fails (table dropped). S5-0 rewrites the seed block. The 8 canonical level names from Scott's approved list differ from the existing seed names — use Scott's names exactly. The `UNIQUE (name, year)` constraint added in the migration enables `ON CONFLICT (name, year) DO NOTHING` for idempotency.

### 5. database.ts conflict zone (Compass)
S5-0 and S5-1 both edit `src/types/database.ts`. Running them serial (S5-1 starts only after S5-0 merges) eliminates this risk entirely. The execution order enforces this.

### 6. Stripe amount_total is already cents — webhook is the easy part
`session.amount_total` from Stripe is already an integer in cents. After migration, the webhook drops the `/ 100`. Risk: a builder who forgets to drop it (double-converts). The S5-2 acceptance criteria explicitly verify via manual test checkout.

### 7. Admin form UX — input stays in dollars, server converts
The admin forms let admins type "$700". After S5-3, the server action converts that dollar string to cents before writing. The display default (S5-4) must divide by 100 so the pre-filled form shows readable dollars. Double-conversion risk: if a builder multiplies in both the action AND the form default, the form would show cents as dollars on re-open. S5-4 acceptance criteria require admin to round-trip: create item at $1000, reopen form, verify it shows $1,000 not $100,000.

### 8. CSV export
`registration-list.tsx` line 94 exports `t.amount_paid.toString()` — currently a dollar float string like `"700.00"`. After migration it must export `(t.amount_paid_cents / 100).toFixed(2)` to preserve the dollar format. Flagged in S5-4 acceptance criteria.

### 9. Revenue total arithmetic
`sponsorship-manager.tsx` line 42 and `registration-list.tsx` line 40 sum `amount_paid` across rows. After migration, the sum is in cents. The display line must divide by 100. If a builder changes the sum but not the display, it renders 100x too large. S5-4 acceptance criteria cover this.

### 10. register_team RPC (highest-risk gap)
The RPC does not read any money column but does insert `amount_paid: 0`. After S5-1 renames the column, the RPC INSERT will fail unless updated. S5-1 bundles a `CREATE OR REPLACE FUNCTION` with `amount_paid_cents: 0` — this is atomic with the rename. Flux must include the full function body from `20260419000006_register_team_rpc.sql`, not a partial ALTER.

---

## Sprint 6 follow-up candidates (from Sprint 4 retro — do not include in S5)

- **PostgREST pool-mode advisory lock verification** — Watchdog non-blocker from S4-2 review. The advisory lock uses session-scoped `pg_advisory_lock`; in PostgREST transaction-mode the session boundary equals a transaction, making it safe. Pool-mode is different. Scott can verify the Supabase project's PostgREST mode in the dashboard. Low urgency until load is a concern.

- **Hono moderate vuln** — transitive dependency. `npm audit` may show it. Not a direct dependency; upgrade path may not exist yet. Monitor.

- **Top-level try/catch around webhook idempotency block** — hardening. Low priority, no correctness impact.

- **`sponsors.tier_id` column rename** — after S5-0, this FK column points to `sponsorship_items` but is still named `tier_id`. Rename to `item_id` in a future migration for naming honesty. Deferred to Sprint 6 to keep S5 focused.

**Recommendation:** Keep S5 focused on money + consolidation. All four go to Sprint 6 backlog.

---

## Notes for builder prompts

- **database.ts:** Do NOT regenerate from local DB. Edit the file manually, adding only the renamed/new fields and deleting the `sponsor_tiers` block. The file is the type authority for the sprint.
- **register_team RPC:** The S5-1 builder must read `20260419000006_register_team_rpc.sql` for the full function body, then reproduce it with `amount_paid_cents` in the INSERT inside `20260421000002_money_cents_payments.sql`.
- **S5-5 Spec:** Pull `origin/main` database.ts after all Phase 3 PRs merge before running the test suite. Do not regen types.
- **Sentinel must review S5-0 PR:** Table drop + FK retarget is high-risk schema change. RLS on `sponsorship_items` must cover both the rows copied from `sponsor_tiers` and the existing items.
- **sponsors.tier_id naming:** After S5-0, `sponsors.tier_id` actually references `sponsorship_items(id)`. Do not rename it in this sprint. Bolt and Flux should add a TODO comment in code that reads this column.
