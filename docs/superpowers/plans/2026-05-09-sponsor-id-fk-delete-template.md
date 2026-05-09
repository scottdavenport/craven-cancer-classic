# sponsorship_purchases.sponsor_id FK + delete-confirm template — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add nullable `sponsor_id` FK to `sponsorship_purchases`, expose a count-only server action, and wire the Sponsors delete-confirm modal to render the correct Aria-locked copy variant (C2 zero-linked / C1 singular / C1 plural) based on linked-purchase count.

**Architecture:** Three artifacts in one PR — a 5-line DDL migration (column + partial index), a count-only server action `getSponsorPurchaseCount`, and modal wiring that fetches the count on Move-to-Trash click and selects the correct Aria string. Sponsors uses soft-delete (`deleted_at`); the FK's `ON DELETE SET NULL` is defensive insurance for the rare hard-delete path.

**Tech Stack:** Postgres 17 (Supabase), Next.js 16 (App Router) with React 19 Server Actions, TypeScript, Vitest + Testing Library, soft-delete via `lib/supabase/soft-delete`.

**Spec:** `docs/superpowers/specs/2026-05-09-sponsor-id-fk-delete-template-design.md` (commit `ffead6d`)
**Issue:** [#380](https://github.com/scottdavenport/craven-cancer-classic/issues/380)

---

## File Map

**Create:**
- `supabase/migrations/20260509000001_sponsorship_purchases_sponsor_id.sql` — DDL: ADD COLUMN + partial index
- `src/__tests__/sponsorship-purchases-sponsor-id-migration.test.ts` — file-content regex assertions
- `src/app/admin/sponsors/__tests__/actions-getSponsorPurchaseCount.test.ts` — server-action contract test
- `src/__tests__/sponsor-modal.test.tsx` — delete-confirm copy + loading + error tests

**Modify:**
- `src/app/admin/sponsors/actions.ts` — add `getSponsorPurchaseCount` export at end of file (after `deleteSponsor` block, before SVG sanitization section ~line 303)
- `src/app/admin/sponsors/sponsor-modal.tsx` — replace `handleDeleteClick` (lines 129-134) and `buildDeleteDescription` (lines 154-158); add `purchaseCount` state and the new action import (lines 15-22)
- `src/types/database.ts` — regenerate after migration applies (Bolt: do not hand-edit; run `npx supabase gen types` against the branch DB or accept the existing types if the build infrastructure handles regeneration on PR open)

---

## Task 1: Migration test (RED) → migration file (GREEN)

**Files:**
- Create: `src/__tests__/sponsorship-purchases-sponsor-id-migration.test.ts`
- Create: `supabase/migrations/20260509000001_sponsorship_purchases_sponsor_id.sql`

**Pattern reference:** `src/__tests__/sponsorship-items-category-migration.test.ts` — file-content regex assertions, no DB connection.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/sponsorship-purchases-sponsor-id-migration.test.ts`:

```ts
/**
 * Migration test — supabase/migrations/20260509000001_sponsorship_purchases_sponsor_id.sql
 *
 * Pins the contract for issue #380: add sponsor_id FK to sponsorship_purchases
 * with ON DELETE SET NULL and a partial index excluding NULLs.
 *
 * Strategy: read the migration SQL file and assert the expected DDL is present.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260509000001_sponsorship_purchases_sponsor_id.sql"
);

let migrationSql = "";

beforeAll(() => {
  try {
    migrationSql = fs.readFileSync(MIGRATION_PATH, "utf-8");
  } catch {
    migrationSql = "";
  }
});

describe("Migration 20260509000001 — sponsorship_purchases.sponsor_id FK", () => {
  it("migration file exists at the expected path", () => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
  });

  describe("sponsor_id column", () => {
    it("adds sponsor_id column as nullable UUID", () => {
      // ALTER TABLE sponsorship_purchases ADD COLUMN sponsor_id UUID
      // (no NOT NULL — must be nullable so ON DELETE SET NULL works)
      expect(migrationSql).toMatch(
        /ALTER TABLE\s+sponsorship_purchases\s+ADD COLUMN\s+sponsor_id\s+UUID/i
      );
    });

    it("does NOT declare sponsor_id as NOT NULL", () => {
      const sponsorIdLine = migrationSql
        .split("\n")
        .find((line) => /ADD COLUMN\s+sponsor_id/i.test(line));
      expect(sponsorIdLine).toBeDefined();
      expect(sponsorIdLine).not.toMatch(/NOT NULL/i);
    });

    it("references sponsors(id) with ON DELETE SET NULL", () => {
      expect(migrationSql).toMatch(
        /REFERENCES\s+sponsors\s*\(\s*id\s*\)\s+ON DELETE\s+SET NULL/i
      );
    });
  });

  describe("partial index", () => {
    it("creates idx_sponsorship_purchases_sponsor_id index", () => {
      expect(migrationSql).toMatch(
        /CREATE INDEX\s+idx_sponsorship_purchases_sponsor_id\s+ON\s+sponsorship_purchases\s*\(\s*sponsor_id\s*\)/i
      );
    });

    it("index has WHERE sponsor_id IS NOT NULL predicate (partial index)", () => {
      expect(migrationSql).toMatch(/WHERE\s+sponsor_id\s+IS NOT NULL/i);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/sponsorship-purchases-sponsor-id-migration.test.ts`
Expected: FAIL — all assertions fail because `migrationSql` is empty (file does not exist).

- [ ] **Step 3: Write the migration file**

Create `supabase/migrations/20260509000001_sponsorship_purchases_sponsor_id.sql`:

```sql
-- Issue #380: link sponsorship_purchases to sponsors so the delete-confirm
-- can warn about linked records. ON DELETE SET NULL is defensive — sponsors
-- uses soft-delete, so this only fires on rare hard-delete (admin Trash → purge).
-- Backfill is a no-op: sponsorship_purchases is empty at migration write time.

ALTER TABLE sponsorship_purchases
  ADD COLUMN sponsor_id UUID NULL REFERENCES sponsors(id) ON DELETE SET NULL;

CREATE INDEX idx_sponsorship_purchases_sponsor_id
  ON sponsorship_purchases(sponsor_id) WHERE sponsor_id IS NOT NULL;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/sponsorship-purchases-sponsor-id-migration.test.ts`
Expected: PASS — all 5 assertions green.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260509000001_sponsorship_purchases_sponsor_id.sql \
        src/__tests__/sponsorship-purchases-sponsor-id-migration.test.ts
git commit -m "feat(#380): add sponsorship_purchases.sponsor_id FK migration

- ADD COLUMN sponsor_id UUID NULL REFERENCES sponsors(id) ON DELETE SET NULL
- Partial index on sponsor_id WHERE sponsor_id IS NOT NULL
- File-content test pins the DDL contract"
```

---

## Task 2: Server action `getSponsorPurchaseCount` (RED → GREEN)

**Files:**
- Create: `src/app/admin/sponsors/__tests__/actions-getSponsorPurchaseCount.test.ts`
- Modify: `src/app/admin/sponsors/actions.ts` — add export after the `deleteSponsor` function (~line 301), before the SVG sanitization section

**Pattern reference:** `src/app/admin/sponsors/__tests__/actions-getSponsors.test.ts` — Supabase client mock with chainable proxy.

- [ ] **Step 1: Write the failing test**

Create `src/app/admin/sponsors/__tests__/actions-getSponsorPurchaseCount.test.ts`:

```ts
/**
 * Issue #380: server action contract test for getSponsorPurchaseCount.
 *
 * RED state: getSponsorPurchaseCount is not exported from actions.ts yet.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ role: "admin" }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import * as serverModule from "@/lib/supabase/server";
import * as adminModule from "@/lib/supabase/admin";
import { getSponsorPurchaseCount } from "../actions";

interface ChainCall {
  method: string;
  args: unknown[];
}

function makeCountClient(count: number, error: { message: string } | null = null) {
  const calls: ChainCall[] = [];
  const fromMock = vi.fn((table: string) => {
    calls.push({ method: "from", args: [table] });
    return {
      select: vi.fn((columns: string, opts?: unknown) => {
        calls.push({ method: "select", args: [columns, opts] });
        return {
          eq: vi.fn((col: string, val: unknown) => {
            calls.push({ method: "eq", args: [col, val] });
            return Promise.resolve({ count, error });
          }),
        };
      }),
    };
  });
  return { client: { from: fromMock }, calls };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSponsorPurchaseCount — issue #380", () => {
  it("returns 0 when no purchases reference the sponsor", async () => {
    const { client } = makeCountClient(0);
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );
    const result = await getSponsorPurchaseCount("sponsor-uuid-1");
    expect(result).toBe(0);
  });

  it("returns the exact count when purchases reference the sponsor", async () => {
    const { client } = makeCountClient(7);
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );
    const result = await getSponsorPurchaseCount("sponsor-uuid-1");
    expect(result).toBe(7);
  });

  it("queries the sponsorship_purchases table filtered by sponsor_id", async () => {
    const { client, calls } = makeCountClient(3);
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );
    await getSponsorPurchaseCount("sponsor-uuid-42");

    expect(calls.find((c) => c.method === "from" && c.args[0] === "sponsorship_purchases")).toBeDefined();
    expect(
      calls.find(
        (c) => c.method === "eq" && c.args[0] === "sponsor_id" && c.args[1] === "sponsor-uuid-42"
      )
    ).toBeDefined();
  });

  it("uses head:true and count:'exact' (no row payload)", async () => {
    const { client, calls } = makeCountClient(0);
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );
    await getSponsorPurchaseCount("sponsor-uuid-1");

    const selectCall = calls.find((c) => c.method === "select");
    expect(selectCall).toBeDefined();
    const opts = selectCall?.args[1] as { count?: string; head?: boolean } | undefined;
    expect(opts?.count).toBe("exact");
    expect(opts?.head).toBe(true);
  });

  it("calls requireAdmin (admin-gated)", async () => {
    const { client } = makeCountClient(0);
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );
    await getSponsorPurchaseCount("sponsor-uuid-1");
    expect(adminModule.requireAdmin).toHaveBeenCalled();
  });

  it("throws when the query returns an error", async () => {
    const { client } = makeCountClient(0, { message: "boom" });
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );
    await expect(getSponsorPurchaseCount("sponsor-uuid-1")).rejects.toThrow("boom");
  });

  it("returns 0 when supabase returns count=null with no error", async () => {
    const { client } = makeCountClient(null as unknown as number);
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );
    const result = await getSponsorPurchaseCount("sponsor-uuid-1");
    expect(result).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/admin/sponsors/__tests__/actions-getSponsorPurchaseCount.test.ts`
Expected: FAIL — `getSponsorPurchaseCount` is not exported from `../actions`.

- [ ] **Step 3: Add the action implementation**

Open `src/app/admin/sponsors/actions.ts`. After the `deleteSponsor` function block (which ends around line 301), and before the `// SVG sanitization for logo upload` section header (~line 303), insert:

```ts
// ---------------------------------------------------------------------------
// getSponsorPurchaseCount — issue #380
// Count-only fetch for the Sponsors delete-confirm modal. All years.
// ---------------------------------------------------------------------------

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

Note: `requireAdmin`, `createClient`, and the supabase client are already imported at the top of the file (verified — `actions.ts:1-10`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/admin/sponsors/__tests__/actions-getSponsorPurchaseCount.test.ts`
Expected: PASS — all 7 assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/sponsors/actions.ts \
        src/app/admin/sponsors/__tests__/actions-getSponsorPurchaseCount.test.ts
git commit -m "feat(#380): add getSponsorPurchaseCount server action

- Count-only query (no row fetch) — Aria copy is count-only per Phase 2 §C3
- All years, no payment_status filter
- Admin-gated via requireAdmin"
```

---

## Task 3: Modal — count state + async handleDeleteClick (RED → GREEN)

**Files:**
- Create: `src/__tests__/sponsor-modal.test.tsx`
- Modify: `src/app/admin/sponsors/sponsor-modal.tsx`

**Pattern reference:** `src/__tests__/sponsor-list.test.tsx` for vitest + Testing Library + actions-mock setup.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/sponsor-modal.test.tsx`:

```tsx
/**
 * Issue #380: SponsorModal delete-confirm — count fetch + Aria copy branches.
 *
 * RED state: SponsorModal does not yet call getSponsorPurchaseCount on delete-click;
 * buildDeleteDescription always returns the C2 zero-linked variant.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SponsorModal } from "@/app/admin/sponsors/sponsor-modal";
import type { Sponsor } from "@/types/database";
import type { SponsorshipItemOption } from "@/app/admin/sponsors/sponsor-form";

vi.mock("@/app/admin/sponsors/actions", () => ({
  createSponsor: vi.fn(),
  updateSponsor: vi.fn(),
  deleteSponsor: vi.fn(async () => ({ ok: true })),
  uploadSponsorLogo: vi.fn(async () => ({ url: "" })),
  deleteSponsorLogo: vi.fn(),
  getSponsorContacts: vi.fn(async () => []),
  getSponsorPurchaseCount: vi.fn(async () => 0),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { getSponsorPurchaseCount, deleteSponsor } from "@/app/admin/sponsors/actions";

const mockGetSponsorPurchaseCount = vi.mocked(getSponsorPurchaseCount);
const mockDeleteSponsor = vi.mocked(deleteSponsor);

const sponsorshipItems: SponsorshipItemOption[] = [
  { id: "tier-gold", name: "Gold", price_cents: 500000, year: 2026 },
];

function makeSponsor(overrides: Partial<Sponsor> = {}): Sponsor {
  return {
    id: "sponsor-uuid-1",
    name: "Carolina East Health",
    tier_id: "tier-gold",
    website: "https://example.com",
    logo_url: null,
    payment_status: "pending",
    amount_paid_cents: 500000,
    stripe_payment_id: null,
    display_order: 1,
    is_active: true,
    year: 2026,
    created_at: "2026-01-01T00:00:00.000Z",
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

function renderModal(sponsor: Sponsor) {
  return render(
    <SponsorModal
      open={true}
      onOpenChange={vi.fn()}
      mode="edit"
      sponsor={sponsor}
      sponsorshipItems={sponsorshipItems}
      onSuccess={vi.fn()}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SponsorModal — delete-confirm count fetch (#380)", () => {
  it("calls getSponsorPurchaseCount with the sponsor id when Move to Trash is clicked", async () => {
    mockGetSponsorPurchaseCount.mockResolvedValueOnce(0);
    const user = userEvent.setup();
    renderModal(makeSponsor({ id: "sponsor-uuid-1" }));

    // The Move to Trash button in the edit-modal footer (not the confirm dialog)
    const trashButton = await screen.findByRole("button", { name: /move to trash/i });
    await user.click(trashButton);

    await waitFor(() => {
      expect(mockGetSponsorPurchaseCount).toHaveBeenCalledWith("sponsor-uuid-1");
    });
  });

  it("disables the Move to Trash button while the count fetch is pending", async () => {
    let resolveCount: (n: number) => void = () => {};
    mockGetSponsorPurchaseCount.mockReturnValueOnce(
      new Promise<number>((resolve) => {
        resolveCount = resolve;
      })
    );
    const user = userEvent.setup();
    renderModal(makeSponsor());

    const trashButton = await screen.findByRole("button", { name: /move to trash/i });
    await user.click(trashButton);

    // While the promise is pending, the button must be disabled
    await waitFor(() => {
      expect(trashButton).toBeDisabled();
    });

    // Resolve the count, then assert the dialog opens
    resolveCount(0);
    await waitFor(() => {
      // The confirm dialog renders a SECOND "Move to Trash" button
      const buttons = screen.getAllByRole("button", { name: /move to trash/i });
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("opens the confirm dialog after the count resolves", async () => {
    mockGetSponsorPurchaseCount.mockResolvedValueOnce(0);
    const user = userEvent.setup();
    renderModal(makeSponsor({ name: "Carolina East Health" }));

    const trashButton = await screen.findByRole("button", { name: /move to trash/i });
    await user.click(trashButton);

    // Confirm dialog title appears
    await waitFor(() => {
      expect(screen.getByText(/Delete Carolina East Health\?/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/sponsor-modal.test.tsx`
Expected: FAIL — `getSponsorPurchaseCount` is not called by the modal yet (the test asserting `toHaveBeenCalledWith` fails).

- [ ] **Step 3: Wire the async handleDeleteClick**

Open `src/app/admin/sponsors/sponsor-modal.tsx`.

**Update the actions import block (lines 15-22)** to include the new action:

```tsx
import {
  createSponsor,
  updateSponsor,
  deleteSponsor,
  uploadSponsorLogo,
  getSponsorContacts,
  deleteSponsorLogo,
  getSponsorPurchaseCount,
} from "./actions";
```

**Add the count state** alongside the existing `loading`, `confirmOpen`, `initialContacts`, `contactsLoaded` state (around line 43-46). Insert after `setContactsLoaded`:

```tsx
const [purchaseCount, setPurchaseCount] = useState<number>(0);
```

**Replace `handleDeleteClick`** (currently lines 129-134) with:

```tsx
async function handleDeleteClick() {
  if (!sponsor) return;
  setLoading(true);
  try {
    const count = await getSponsorPurchaseCount(sponsor.id);
    setPurchaseCount(count);
  } catch (err) {
    console.warn(
      "[SponsorModal] getSponsorPurchaseCount failed; falling back to zero-linked copy:",
      err
    );
    setPurchaseCount(0);
  } finally {
    setLoading(false);
    setConfirmOpen(true);
  }
}
```

Leave `buildDeleteDescription` (lines 154-158) unchanged in this task — it still always returns C2. Task 4 branches it.

- [ ] **Step 4: Run test to verify the fetch+disable+open assertions pass**

Run: `npx vitest run src/__tests__/sponsor-modal.test.tsx -t "delete-confirm count fetch"`
Expected: PASS — all 3 tests in this describe block green.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/sponsors/sponsor-modal.tsx \
        src/__tests__/sponsor-modal.test.tsx
git commit -m "feat(#380): wire SponsorModal to fetch purchase count on delete-click

- handleDeleteClick now async — fetches count, then opens confirm dialog
- Trash button disabled during fetch (existing loading state)
- buildDeleteDescription branching deferred to next commit"
```

---

## Task 4: Modal — buildDeleteDescription branches (RED → GREEN)

**Files:**
- Modify: `src/__tests__/sponsor-modal.test.tsx` (add 3 describe blocks)
- Modify: `src/app/admin/sponsors/sponsor-modal.tsx` (replace `buildDeleteDescription`)

- [ ] **Step 1: Write the failing tests**

Append the following describe block to `src/__tests__/sponsor-modal.test.tsx` (after the existing `describe("SponsorModal — delete-confirm count fetch (#380)", ...)` block):

```tsx
describe("SponsorModal — delete-confirm Aria copy branches (#380)", () => {
  it("renders the C2 zero-linked copy when count is 0", async () => {
    mockGetSponsorPurchaseCount.mockResolvedValueOnce(0);
    const user = userEvent.setup();
    renderModal(makeSponsor({ name: "Carolina East Health" }));

    const trashButton = await screen.findByRole("button", { name: /move to trash/i });
    await user.click(trashButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Moving Carolina East Health to Trash removes it from the active list\. You can restore it from Admin → Trash\./
        )
      ).toBeInTheDocument();
    });
  });

  it("renders the C1 singular copy when count is 1", async () => {
    mockGetSponsorPurchaseCount.mockResolvedValueOnce(1);
    const user = userEvent.setup();
    renderModal(makeSponsor({ name: "Carolina East Health" }));

    const trashButton = await screen.findByRole("button", { name: /move to trash/i });
    await user.click(trashButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          /1 sponsorship purchase references this sponsor\. Moving Carolina East Health to Trash keeps that record intact — it'll display "Deleted sponsor" where the name appeared\./
        )
      ).toBeInTheDocument();
    });
  });

  it("renders the C1 plural copy when count is 2", async () => {
    mockGetSponsorPurchaseCount.mockResolvedValueOnce(2);
    const user = userEvent.setup();
    renderModal(makeSponsor({ name: "Carolina East Health" }));

    const trashButton = await screen.findByRole("button", { name: /move to trash/i });
    await user.click(trashButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          /2 sponsorship purchases reference this sponsor\. Moving Carolina East Health to Trash keeps those records intact — they'll display "Deleted sponsor" where the name appeared\./
        )
      ).toBeInTheDocument();
    });
  });

  it("renders the C1 plural copy with the actual count when count is 7", async () => {
    mockGetSponsorPurchaseCount.mockResolvedValueOnce(7);
    const user = userEvent.setup();
    renderModal(makeSponsor({ name: "Carolina East Health" }));

    const trashButton = await screen.findByRole("button", { name: /move to trash/i });
    await user.click(trashButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          /7 sponsorship purchases reference this sponsor\. Moving Carolina East Health to Trash keeps those records intact — they'll display "Deleted sponsor" where the name appeared\./
        )
      ).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify the new branch tests fail**

Run: `npx vitest run src/__tests__/sponsor-modal.test.tsx -t "Aria copy branches"`
Expected: FAIL — `buildDeleteDescription` always returns C2; the singular and plural assertions fail because the rendered text is the C2 copy regardless of count.

- [ ] **Step 3: Branch buildDeleteDescription by count**

Open `src/app/admin/sponsors/sponsor-modal.tsx`. Replace `buildDeleteDescription` (currently lines 154-158, including the stale comment) with:

```tsx
function buildDeleteDescription(): string {
  const name = sponsor?.name ?? "this sponsor";
  if (purchaseCount === 0) {
    // Aria §C2 — zero linked records
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

Also remove the stale comment block from the (now-rewritten) `handleDeleteClick` if any traces remain — verify lines 129-132 in the post-Task-3 state contain only the new async handler with no `// sponsorship_purchases.sponsor_id FK not yet in schema` comment.

- [ ] **Step 4: Run tests to verify all branches pass**

Run: `npx vitest run src/__tests__/sponsor-modal.test.tsx`
Expected: PASS — both describe blocks (count fetch + Aria copy branches) green. 7 tests total so far.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/sponsors/sponsor-modal.tsx \
        src/__tests__/sponsor-modal.test.tsx
git commit -m "feat(#380): branch buildDeleteDescription by purchase count

Aria-locked copy:
- count=0  → C2 zero-linked (unchanged)
- count=1  → C1 singular ('1 sponsorship purchase references…')
- count>=2 → C1 plural ('[N] sponsorship purchases reference…')

Tests assert verbatim copy per Aria gate (strings.md §C1/§C2)."
```

---

## Task 5: Modal — fetch error fallback (RED → GREEN)

**Files:**
- Modify: `src/__tests__/sponsor-modal.test.tsx` (add 1 describe block)

**Note:** The error fallback was already written in Task 3 Step 3 (the `try/catch/finally` in `handleDeleteClick`). This task adds the test that pins it. If the test passes immediately, the fallback was correctly implemented in Task 3 — that is the expected outcome and is fine; do not mark this task RED-fail-then-GREEN-pass artificially.

- [ ] **Step 1: Write the test**

Append to `src/__tests__/sponsor-modal.test.tsx`:

```tsx
describe("SponsorModal — delete-confirm fetch error fallback (#380)", () => {
  it("falls back to C2 copy and logs a warning when getSponsorPurchaseCount throws", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockGetSponsorPurchaseCount.mockRejectedValueOnce(new Error("network down"));

    const user = userEvent.setup();
    renderModal(makeSponsor({ name: "Carolina East Health" }));

    const trashButton = await screen.findByRole("button", { name: /move to trash/i });
    await user.click(trashButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Moving Carolina East Health to Trash removes it from the active list\. You can restore it from Admin → Trash\./
        )
      ).toBeInTheDocument();
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("getSponsorPurchaseCount failed"),
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
  });

  it("opens the confirm dialog even when the count fetch fails", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockGetSponsorPurchaseCount.mockRejectedValueOnce(new Error("network down"));

    const user = userEvent.setup();
    renderModal(makeSponsor({ name: "Carolina East Health" }));

    const trashButton = await screen.findByRole("button", { name: /move to trash/i });
    await user.click(trashButton);

    await waitFor(() => {
      expect(screen.getByText(/Delete Carolina East Health\?/i)).toBeInTheDocument();
    });

    consoleWarnSpy.mockRestore();
  });

  it("does not call deleteSponsor automatically after a failed count fetch", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockGetSponsorPurchaseCount.mockRejectedValueOnce(new Error("network down"));

    const user = userEvent.setup();
    renderModal(makeSponsor());

    const trashButton = await screen.findByRole("button", { name: /move to trash/i });
    await user.click(trashButton);

    await waitFor(() => {
      expect(screen.getByText(/Delete .* \?/i)).toBeInTheDocument();
    });

    // Admin must explicitly confirm — no automatic delete
    expect(mockDeleteSponsor).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/__tests__/sponsor-modal.test.tsx -t "fetch error fallback"`
Expected: PASS — the try/catch from Task 3 already implements this behavior; these tests pin it.

If FAIL: re-check Task 3 Step 3 — the catch block must call `setPurchaseCount(0)` AND `setConfirmOpen(true)` (in `finally`). The `console.warn` message must contain the literal string `"getSponsorPurchaseCount failed"`.

- [ ] **Step 3: Run the full modal test file**

Run: `npx vitest run src/__tests__/sponsor-modal.test.tsx`
Expected: PASS — all describe blocks green (count fetch + Aria branches + fetch error). 10 tests total.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/sponsor-modal.test.tsx
git commit -m "test(#380): pin fetch-error fallback (C2 copy + console.warn)

When getSponsorPurchaseCount throws, the modal still opens the confirm
dialog with C2 zero-linked copy and logs a warning. The admin can still
cancel — soft-delete is reversible from Trash if they proceed in error."
```

---

## Task 6: Final verification

**Files:** none modified. This task is a gate.

- [ ] **Step 1: Run the full test suite**

Run: `npm test -- --run`
Expected: PASS — all tests green, including the new migration test, action test, and modal test. No regressions.

- [ ] **Step 2: Run the type checker**

Run: `npx tsc --noEmit`
Expected: 0 errors.

If errors: most likely a missing import in `sponsor-modal.tsx` (verify `getSponsorPurchaseCount` is in the `./actions` import) or a stale type reference. Resolve before proceeding.

- [ ] **Step 3: Run the linter**

Run: `npm run lint`
Expected: 0 errors. Warnings tolerated only if they pre-existed on `main`.

- [ ] **Step 4: Verify the database.ts types — branch DB regeneration**

After PR opens and the Supabase preview branch applies the migration, the `Database` type should regenerate to include `sponsor_id` on `sponsorship_purchases.Row` / `Insert` / `Update` and a new entry in `Relationships`. If the project's CI/CD does not auto-regenerate `database.ts`:

```bash
npx supabase gen types typescript --project-id <branch-project-ref> > src/types/database.ts
```

Then re-run `npx tsc --noEmit` to ensure no consumers are broken.

If the regeneration is gated on a separate post-merge step (project-specific CI), note this in the PR body but do not block the PR on it.

- [ ] **Step 5: Manual sanity check (optional, only if dev server is local)**

```bash
npm run dev
```

Navigate to `/admin/sponsors`, open a sponsor in edit mode, click Move to Trash, observe the confirm dialog. With 0 purchases linked (current state — table is empty), the C2 copy should render. (To test C1 variants pre-merge, manually `INSERT INTO sponsorship_purchases (...) VALUES (..., sponsor_id=<id>)` against the branch DB and reopen.)

- [ ] **Step 6: Open PR**

Push the branch and open a PR. The PR body should:

- Reference issue #380.
- Cite the spec commit (`ffead6d`) and the Aria Phase 2 gate (`strings.md` §C1/§C2/§D, PR #378).
- List the three artifacts (migration / action / modal wiring) and the test counts (5 migration + 7 action + 10 modal = 22 new tests).
- Call out the explicit non-goals (purchase-display fallback rendering, creation-path wiring) so reviewers don't flag them as gaps.

After PR open: Sentinel reviews the migration, branch e2e runs against the preview DB, Watchdog stage-2 reviews after Sentinel + e2e green.

---

## Summary

| Task | Files | Tests added |
|---|---|---|
| 1 | migration .sql + migration.test.ts | 5 |
| 2 | actions.ts + actions-getSponsorPurchaseCount.test.ts | 7 |
| 3 | sponsor-modal.tsx + sponsor-modal.test.tsx (new) | 3 |
| 4 | sponsor-modal.tsx + sponsor-modal.test.tsx | 4 |
| 5 | sponsor-modal.test.tsx | 3 |
| 6 | (verification gate) | — |

**Total:** 22 new tests, ~50 lines of production code, 1 migration, 1 PR.
