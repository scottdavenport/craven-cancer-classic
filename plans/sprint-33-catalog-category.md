# Sprint 33 — Catalog Category Split (Sponsorship / Tribute / Supporter)

**Date:** 2026-05-01
**Author:** Forge (with Scott via 7-question brainstorm)
**Status:** Plan PR (pending review)

---

## What changes for users

Today, every item on the public buy page (`/sponsorships`) is a "sponsorship" — a logo tier where a buyer gets recognition on the sponsor wall. That conflates three different products:

1. **Sponsorships** — logo tiers (Champion $5K, Eagle $2.5K, Bloody Mary Bar, Golf Carts, etc.). The buyer wants public brand recognition.
2. **Tributes** — Balloons ($20 each). The buyer is honoring a loved one who battled cancer. The buyer's name doesn't matter publicly; the **honoree's** name does.
3. **Supporters** — Tee Sign + Yard Sign ($100 each). The buyer wants their name on a physical sign at the tournament. No website recognition needed.

This sprint adds a `category` to the catalog so the public site, admin tools, and Stripe receipt flow can treat each product correctly.

### Public site (`/sponsorships` buy page)

The buy page becomes three stacked sections:

```
SPONSORSHIPS              ← logo tiers, top of page
[Champion $5K] [Eagle $2.5K] [Golf Gift $2.5K] ...

TRIBUTES — Honor a warrior  ← middle, with explanatory copy
[Balloons $20]
  → buy form has an extra "In honor of" field

Recently honored
- John Davenport
- Mary Smith
- ...

SUPPORTERS                 ← bottom, smaller items
[Tee Sign $100] [Yard Sign $100]
```

The Tribute section's "Recently honored" list reads from `sponsorship_purchases.tribute_recipient` — public, opt-in by purchase, no contact info exposed.

### Public site (`/sponsors` recognition marquee)

The existing sponsor wall stays unchanged in shape. Internally it now filters to `category='sponsorship'` so tribute and supporter purchases don't accidentally appear there. Functionally identical until the migration runs (every existing item is sponsorship-class until backfilled).

### Admin (`/admin/sponsorships`)

Adds a category filter chip on both the catalog list and the purchases panel. Default = "All." Admins can filter to see just tribute purchases (and the recipient name) or just supporter purchases.

When admins create a new catalog item, the form has a category dropdown. When viewing a tribute purchase, the recipient name is visible.

### Stripe checkout & receipt

Tribute purchases collect the recipient name on the buy form, persist it via `/api/checkout`, and the Stripe webhook stamps it on the `sponsorship_purchases` row. The Stripe receipt email gets a "in honor of <recipient>" line for tribute purchases (Aria copy in Phase 4).

### What does NOT change

- Sponsor recognition flow (Sprint 22 marquee design) — unchanged.
- Stripe payment flow shape — same line item, same metadata pattern, just one optional new field.
- Soft-delete / Trash policy — unchanged.
- Existing 13 sponsorship items — same names, same prices, same `benefits` jsonb. Just a new `category` value attached.

---

## Why now

Six items were added to the catalog over the last few weeks (Balloons, Tee Sign, Yard Sign, etc.) that don't fit the "sponsorship" framing. They appear on the public sponsor wall as if they're tier purchases, which dilutes the brand for actual tier sponsors and confuses buyers. The Sept 2026 event is ~5 months out — this needs to be clean before live keys flip and marketing pushes traffic.

---

## Phasing (Sprint 31/32 shape)

The migration is **purely additive** — `ADD COLUMN category` and `ADD COLUMN tribute_recipient`, no DROPs. Old code that ignores the new columns continues to work. No Vercel-red window.

**Phase 1 — Schema + tests (parallel):**
- Spec writes failing tests pinning the new contract: category enum, per-row backfill, tribute_recipient on purchases, public section split, admin filter, Stripe receipt copy.
- Flux applies the migration, drops & recreates `sponsorship_items_active` to include `category`, regenerates types.

**Phase 2 — Server + admin + checkout (parallel):**
- Flux: server actions accept category filter; checkout `/api/checkout` accepts optional `tribute_recipient`; Stripe webhook persists it.
- Bolt: admin catalog list + purchases panel filter dropdown.
- Bolt: tribute buy form (extends sponsorship-grid with conditional "In honor of" field on tribute items).

**Phase 3 — Public sections + tribute wall:**
- Bolt: `/sponsorships` page restructured into three stacked sections; section intro copy is placeholder for Phase 4.
- Bolt: "Recently honored" list rendered below the Tributes section (server-side query, top 20 by `created_at` DESC).

**Phase 4 — Aria copy pass:**
- Section intro copy (Sponsorships / Tributes / Supporters).
- Tribute buy form: "In honor of" field label + helper text.
- Stripe receipt: "in honor of <recipient>" line for tribute purchases.
- Empty-state copy for "Recently honored" when no tribute purchases exist yet.

**Estimate:** 7-9 PRs, ~1-1.5 days. Same shape as Sprint 31 (9 PRs) and Sprint 32 (10 PRs).

---

## Risk + verification

**Stripe live integration is the riskiest surface.** Sprint 32 didn't touch Stripe; this sprint does. Mitigations:

- The change is **additive only** — `tribute_recipient` is an optional string passed through `/api/checkout` body. Sponsorship checkout flow is unchanged when the field is absent.
- Existing checkout tests stay green (verified via the Phase 1 test suite).
- New regression tests cover: tribute purchase persists `tribute_recipient`; sponsorship purchase ignores any client-supplied `tribute_recipient`; webhook stamps the value on the row.
- Stripe is still in **test mode** for Craven (per project profile — live-key flip blocked on nonprofit pricing). So worst case during sprint = test purchases break, not real money.

**Vercel deploy:** no red window expected because the migration is additive. Old code paths keep working until the new code paths replace them progressively.

**Production verification (post-merge):** smoke-check `/sponsorships` (returns 200, three sections render), `/admin/sponsorships` (auth redirect), simulated tribute purchase via Stripe test mode end-to-end (buyer flow → Stripe → webhook → DB row with tribute_recipient → admin sees it in purchases panel).

---

## Decisions locked (7 questions, 2026-05-01)

| # | Question | Decision |
|---|---|---|
| 1 | Category enum values | `sponsorship` / `tribute` / `supporter` |
| 2 | Backfill rule | Explicit per-row mapping in migration: Balloons→tribute, Tee/Yard Sign→supporter, all others→sponsorship |
| 3 | Per-category fulfillment fields | Tribute-only: add `tribute_recipient text` on `sponsorship_purchases`. Sponsorship uses existing `benefits` jsonb on catalog. Supporter uses purchaser_name (physical sign). |
| 4 | Admin Tributes navigation | Filter chip on existing `/admin/sponsorships` catalog + purchases panel. No new admin tab. |
| 5 | Public buy surface | Three stacked sections on `/sponsorships` (Sponsorships → Tributes → Supporters). No new routes. |
| 6 | Public recognition | `/sponsors` filters to category=sponsorship only. Tribute wall = inline "Recently honored" list below the Tributes section on `/sponsorships`. Supporters = no website listing. |
| 7 | Phasing | Sprint 31/32-shape: Phase 1 tests+migration → Phase 2 server+admin+checkout (parallel) → Phase 3 public → Phase 4 Aria copy. |

---

## Resume + acceptance

- **Plan PR opens** under this commit.
- **Watchdog approval** required before merge (per `require-watchdog-approval.sh` hook).
- **Compass** files Phase 1-4 issues after plan merges, with phase + dependency labels.
- **Acceptance** = end-to-end tribute purchase smoke-test on prod returns 200, the row carries `tribute_recipient`, the recipient appears on the public "Recently honored" list, and the Stripe receipt line is correct.

---

# Technical Appendix

## Schema migration

`supabase/migrations/20260501000001_sponsorship_items_category.sql`:

```sql
-- 1. Enum type
CREATE TYPE sponsorship_category AS ENUM ('sponsorship', 'tribute', 'supporter');

-- 2. Add column with non-null default
ALTER TABLE sponsorship_items
  ADD COLUMN category sponsorship_category NOT NULL DEFAULT 'sponsorship';

-- 3. Explicit per-row backfill (locked Q2)
UPDATE sponsorship_items SET category = 'tribute'   WHERE name = 'Balloons';
UPDATE sponsorship_items SET category = 'supporter' WHERE name IN ('Tee Sign', 'Yard Sign');

-- 4. Index for filter queries
CREATE INDEX idx_sponsorship_items_category ON sponsorship_items(category);

-- 5. Tribute recipient on purchases
ALTER TABLE sponsorship_purchases
  ADD COLUMN tribute_recipient text;

-- 6. Drop + recreate sponsorship_items_active to include category
--    (existing view is explicit columns, NOT SELECT *, so it does not auto-adapt)
DROP VIEW sponsorship_items_active;
CREATE VIEW sponsorship_items_active AS
  SELECT id, name, description, price_cents, max_quantity, sold_count, active,
         year, created_at, benefits, sort_order, deleted_at, deleted_by, category
  FROM sponsorship_items
  WHERE deleted_at IS NULL;
```

### Pre-flight against prod (run 2026-05-01 via supabase-craven MCP)

- `sponsorship_items` row count: 16 (13 active, 3 soft-deleted). 0 sold.
- `sponsorship_items_active` view: explicit columns (`id, name, description, price_cents, max_quantity, sold_count, active, year, created_at, benefits, sort_order, deleted_at, deleted_by`). **Must be dropped and recreated** to include `category`.
- Functions referencing `sponsorship_items`: `increment_sold_count` (operates on `sold_count`, unaffected by `category`).
- RLS policies: `Sponsorship items are viewable by everyone` (USING `true`), `Admins can manage sponsorship items` (USING+WITH CHECK `is_admin()`). Not column-bound; unaffected.
- `sponsorship_purchases` row count: 0. New `tribute_recipient` column ships nullable, no backfill needed.

### Backfill mapping (16 items)

| Name | Category | Price | Notes |
|---|---|---|---|
| Champion | sponsorship | $5,000 | top tier |
| Eagle | sponsorship | $2,500 | |
| Golf Gift | sponsorship | $2,500 | |
| Celebration Lunch | sponsorship | $2,000 | |
| Bloody Mary Bar | sponsorship | $1,000 | max_quantity=1 |
| Bloody Mary Sponsor | sponsorship | $1,000 | soft-deleted |
| Golf Cart Sponsor | sponsorship | $1,000 | soft-deleted |
| Golf Carts | sponsorship | $1,000 | |
| Thursday Night | sponsorship | $700 | |
| Thursday Night Sponsor | sponsorship | $700 | soft-deleted |
| Wall Sponsor | sponsorship | $700 | |
| Morning Biscuit Sponsor | sponsorship | $500 | |
| Shot of the Day | sponsorship | $500 | |
| **Tee Sign** | **supporter** | **$100** | physical sign, name on it |
| **Yard Sign** | **supporter** | **$100** | physical sign, name on it |
| **Balloons** | **tribute** | **$20** | balloon + warrior name |

## TypeScript types

Regenerate `src/types/database.ts` via `mcp__supabase-craven__generate_typescript_types` if MCP write is available. Sprint 32 fallback (hand-edit) acceptable if MCP is read-only.

Surface points (~10): `Database['public']['Tables']['sponsorship_items']['Row' | 'Insert' | 'Update']`, `['Tables']['sponsorship_purchases']['Row' | 'Insert' | 'Update']`, `['Views']['sponsorship_items_active']['Row']`, `['Enums']['sponsorship_category']`.

## Code surface map

**Server actions:**
- `src/app/admin/sponsorships/actions.ts` — `getSponsorshipItems({ category? })` filter param. `getSponsorshipPurchases({ category? })` filter via JOIN. `createSponsorshipItem` accepts category. `updateSponsorshipItem` accepts category.
- `src/app/(public)/sponsorships/page.tsx` — page query splits into three category-filtered queries (or single query, partition client-side). Pass each category's items to the section component.
- `src/app/(public)/sponsors/page.tsx` — sponsorship-page query gains `.eq('category', 'sponsorship')` on the catalog read.

**Checkout / Stripe:**
- `src/app/api/checkout/route.ts` — `handleSponsorshipCheckout` accepts optional `tribute_recipient` in body, persists to `sponsorship_purchases` row at insert. Stripe metadata gets `tribute_recipient` so the webhook can confirm. **Validation:** if `item.category='tribute'` and `tribute_recipient` is blank/missing, return 400 "tribute purchases require an honoree name." If `item.category!='tribute'` and `tribute_recipient` is supplied, ignore it (do not persist) — defensive against client-side mis-shapes.
- **Stripe line item description carries the tribute recipient on the receipt.** For tribute purchases, build the line item `name` as `"<item.name> — in honor of <tribute_recipient>"` (e.g., `"Balloons — in honor of John Davenport"`). This shows up on the Stripe-generated receipt email without requiring a custom Resend template. Sponsorship + supporter purchases use the existing `item.name` only.
- `supabase/functions/stripe-webhook/index.ts` — already advisory-locked + idempotent; tribute_recipient is set at purchase insert (pre-Stripe), so webhook need only verify (not re-set). Confirm logic still works.

**Admin UI:**
- `src/app/admin/sponsorships/sponsorship-manager.tsx` — add CategoryFilter component (custom Select, not native — per `feedback_no_system_ui`). Filter applies to both list and purchases panel.
- `src/app/admin/sponsorships/sponsorship-form.tsx` — category dropdown when creating/editing.
- `src/app/admin/sponsorships/sponsorship-drawer.tsx` — **migrate to centered modal** per `feedback_drawer_edit_pattern` (this is the next-touch trigger for this admin form).

**Public UI:**
- `src/app/(public)/sponsorships/sponsorship-grid.tsx` — split into `SponsorshipSection`, `TributeSection`, `SupporterSection` components (three sections, shared grid primitive).
- `src/app/(public)/sponsorships/tribute-section.tsx` — new. Includes buy form with "In honor of" field. Field is **required** for tribute purchases (form-level validation + server-level validation both — see Checkout/Stripe section above).
- `src/app/(public)/sponsorships/recently-honored.tsx` — new. Server-side query for top 20 tribute_recipient values, ordered by created_at DESC.

**Tests (Phase 1, Spec):**
- `src/__tests__/sponsorship-items-category-migration.test.ts` — schema + backfill assertions.
- `src/__tests__/checkout-tribute.test.ts` — `/api/checkout` accepts tribute_recipient, persists on purchase row, Stripe metadata includes it.
- `src/__tests__/stripe-webhook-tribute.test.ts` — webhook idempotent re: tribute_recipient.
- `src/__tests__/admin-sponsorships-category-filter.test.tsx` — admin filter chip behavior.
- `src/app/(public)/sponsorships/__tests__/sections.test.tsx` — three sections render, each with the right items.
- `src/app/(public)/sponsorships/__tests__/recently-honored.test.tsx` — server query + render shape.
- `src/app/(public)/sponsors/__tests__/sponsors-page.test.tsx` — assertion update: filter to category=sponsorship only.

## Auth / hooks

- Plan PR + builder PRs authored by `scottdavenport` (`unset GH_TOKEN` per `feedback_builder_pr_create_auth`).
- Reviews by `forge-watchdog` (`export GH_TOKEN=$(cat ~/.openclaw/secrets/forge-watchdog-github-token)` inside reviewer prompt only).
- `require-watchdog-approval.sh` enforces APPROVED before merge.
- `block-admin-merge.sh` enforces no `--admin` bypass.

## Out of scope (explicit)

- Stripe nonprofit pricing — separate, Scott's outreach.
- Stripe live-key flip — blocked on nonprofit pricing.
- Donor anchor table (`donations`) — future need; today donor is just a contact type.
- Public `/tributes` standalone page — Q6 picked the inline-on-/sponsorships pattern; revisit only if tribute volume justifies a dedicated page.
- Tribute message field (per-purchase note like "Mom — we miss you every day") — not in this sprint; can be added later as `tribute_message text` if Scott wants more emotional space on the tribute wall.
- `Bloody Mary Sponsor`, `Golf Cart Sponsor`, `Thursday Night Sponsor` (3 soft-deleted items) — backfilled to `sponsorship` category by name match in the migration UPDATE; they remain soft-deleted, so no admin or public surface change.

## Amendments

_(append-only audit trail; live spec above is rewritten in-place per Sprint 31 convention)_

- _(none yet)_
