/**
 * S15-C — /admin/sponsorships actions tests
 *
 * Covers:
 * - getSponsorshipItems: enriched rows include active_sponsor_count
 * - getSponsorshipItems: count reflects only sponsors_active (soft-deleted excluded)
 * - getSponsorshipItems: zero count for package with no linked sponsors
 * - getSponsorshipItems: correct count for package with multiple linked sponsors
 * - getLinkedSponsorNames: returns ordered sponsor names for a tier
 * - getLinkedSponsorNames: returns empty array for tier with no linked sponsors
 * - getLinkedSponsorNames: excludes soft-deleted sponsors (queries sponsors_active)
 *
 * Sprint 33 additions:
 * - getSponsorshipItems: optional category filter param filters to matching items only
 * - getSponsorshipPurchases: optional category filter param joins to item category
 * - getSponsorshipPurchases: tribute purchases include tribute_recipient in returned rows
 *
 * RED phase — these tests reference getSponsorshipItems returning active_sponsor_count
 * and a new getLinkedSponsorNames export that does not yet exist. All tests should fail.
 * Sprint 33 RED additions fail because the optional category param does not exist yet.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ role: "admin" }),
}));

vi.mock("@/lib/supabase/soft-delete", () => ({
  softDelete: vi.fn().mockResolvedValue({ ok: true }),
}));

import * as serverModule from "@/lib/supabase/server";
import {
  getSponsorshipItems,
  getLinkedSponsorNames,
  getSponsorshipPurchases,
} from "@/app/admin/sponsorships/actions";

type MockClient = {
  from: ReturnType<typeof vi.fn>;
};

function setClient(client: MockClient) {
  vi.mocked(serverModule.createClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
  );
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const YEAR = new Date().getFullYear();

type SponsorshipCategory = "sponsorship" | "tribute" | "supporter";

/** Minimal sponsorship_items_active row shape (fields beyond these are nullable/optional) */
function makeTierRow(
  id: string,
  name: string,
  category: SponsorshipCategory = "sponsorship"
) {
  return {
    id,
    name,
    description: null,
    price_cents: 50000,
    max_quantity: 10,
    sold_count: 0,
    active: true,
    benefits: [],
    created_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
    sort_order: 0,
    year: YEAR,
    category,
  };
}

function makePurchaseRow(itemId: string, purchaserName: string, tributeRecipient: string | null = null) {
  return {
    id: `purchase-${itemId}`,
    item_id: itemId,
    purchaser_name: purchaserName,
    purchaser_email: `${purchaserName.toLowerCase().replace(/\s/g, "")}@example.com`,
    purchaser_phone: null,
    company_name: null,
    payment_status: "paid",
    amount_paid_cents: 2000,
    stripe_payment_id: "pi_test",
    year: YEAR,
    created_at: new Date().toISOString(),
    tribute_recipient: tributeRecipient,
  };
}

function makeSponsorRow(tierId: string, name: string) {
  return { tier_id: tierId, name };
}

// ---------------------------------------------------------------------------
// Helpers to build chainable Supabase mock
// ---------------------------------------------------------------------------

/**
 * Builds a mock client where:
 * - `sponsorship_items_active` resolves with `tierRows`
 * - `sponsors_active` resolves with `sponsorRows`
 */
function buildItemsClient(
  tierRows: ReturnType<typeof makeTierRow>[],
  sponsorRows: ReturnType<typeof makeSponsorRow>[]
) {
  // sponsorship_items_active chain: .select('*').eq('year', year).order(...)
  const itemsOrder = vi.fn().mockResolvedValue({ data: tierRows, error: null });
  const itemsEq = vi.fn().mockReturnValue({ order: itemsOrder });
  const itemsSelect = vi.fn().mockReturnValue({ eq: itemsEq });

  // sponsors_active chain: .select('tier_id').eq('year', year)
  const sponsorsEq = vi.fn().mockResolvedValue({ data: sponsorRows, error: null });
  const sponsorsSelect = vi.fn().mockReturnValue({ eq: sponsorsEq });

  const mockFrom = vi.fn((table: string) => {
    if (table === "sponsorship_items_active") return { select: itemsSelect };
    if (table === "sponsors_active") return { select: sponsorsSelect };
    return {};
  });

  return { from: mockFrom } as MockClient;
}

/**
 * Builds a mock client for getLinkedSponsorNames where:
 * - `sponsors_active` resolves with `sponsorRows` filtered by tier_id
 */
function buildLinkedNamesClient(
  sponsorRows: Array<{ name: string; display_order?: number | null }>
) {
  // sponsors_active chain: .select('name').eq('tier_id', tierId).order(...)
  const namesOrder = vi.fn().mockResolvedValue({ data: sponsorRows, error: null });
  const namesEqTier = vi.fn().mockReturnValue({ order: namesOrder });
  const namesSelect = vi.fn().mockReturnValue({ eq: namesEqTier });

  const mockFrom = vi.fn((table: string) => {
    if (table === "sponsors_active") return { select: namesSelect };
    return {};
  });

  return { from: mockFrom } as MockClient;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
});

// ---------------------------------------------------------------------------
// getSponsorshipItems — enriched rows
// ---------------------------------------------------------------------------

describe("getSponsorshipItems", () => {
  it("returned rows include active_sponsor_count as a number on every item", async () => {
    const tiers = [makeTierRow("tier-gold", "Gold"), makeTierRow("tier-silver", "Silver")];
    const sponsors = [
      makeSponsorRow("tier-gold", "Acme Corp"),
      makeSponsorRow("tier-silver", "Beta LLC"),
    ];

    setClient(buildItemsClient(tiers, sponsors));

    const result = await getSponsorshipItems();

    expect(result).toHaveLength(2);
    result.forEach((item) => {
      expect(typeof (item as unknown as { active_sponsor_count: number }).active_sponsor_count).toBe("number");
    });
  });

  it("active_sponsor_count reflects only sponsors from sponsors_active view (soft-deleted excluded)", async () => {
    // We seed two sponsors for tier-gold in sponsors_active; one sponsor that was
    // soft-deleted would NOT appear in sponsors_active at all (view filters deleted_at IS NULL).
    // So the count must be exactly 2 — the deleted one is absent from the mock data.
    const tiers = [makeTierRow("tier-gold", "Gold")];
    const sponsorsInActiveView = [
      makeSponsorRow("tier-gold", "Acme Corp"),
      makeSponsorRow("tier-gold", "Beta LLC"),
      // the third sponsor with deleted_at set is intentionally absent from this view
    ];

    setClient(buildItemsClient(tiers, sponsorsInActiveView));

    const result = await getSponsorshipItems();
    const gold = result.find((r) => r.id === "tier-gold")!;

    expect((gold as unknown as { active_sponsor_count: number }).active_sponsor_count).toBe(2);
  });

  it("a package with zero linked sponsors has active_sponsor_count of 0", async () => {
    const tiers = [makeTierRow("tier-bronze", "Bronze")];
    const sponsors: ReturnType<typeof makeSponsorRow>[] = []; // no sponsors at all

    setClient(buildItemsClient(tiers, sponsors));

    const result = await getSponsorshipItems();
    const bronze = result.find((r) => r.id === "tier-bronze")!;

    expect((bronze as unknown as { active_sponsor_count: number }).active_sponsor_count).toBe(0);
  });

  it("a package with three linked sponsors has active_sponsor_count of 3", async () => {
    const tiers = [makeTierRow("tier-platinum", "Platinum")];
    const sponsors = [
      makeSponsorRow("tier-platinum", "Acme Corp"),
      makeSponsorRow("tier-platinum", "Beta LLC"),
      makeSponsorRow("tier-platinum", "Gamma Inc"),
    ];

    setClient(buildItemsClient(tiers, sponsors));

    const result = await getSponsorshipItems();
    const platinum = result.find((r) => r.id === "tier-platinum")!;

    expect((platinum as unknown as { active_sponsor_count: number }).active_sponsor_count).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// getLinkedSponsorNames
// ---------------------------------------------------------------------------

describe("getLinkedSponsorNames", () => {
  it("returns an array of sponsor names ordered by name ascending", async () => {
    // Bolt: order sponsors by name ASC (alphabetical) or display_order — document your choice.
    // We test with name ordering since display_order may be null.
    const sponsorRows = [
      { name: "Acme Corp" },
      { name: "Beta LLC" },
      { name: "Gamma Inc" },
    ];

    setClient(buildLinkedNamesClient(sponsorRows));

    const result = await getLinkedSponsorNames("tier-gold");

    expect(result).toEqual(["Acme Corp", "Beta LLC", "Gamma Inc"]);
  });

  it("returns empty array for a tier_id with no linked sponsors", async () => {
    setClient(buildLinkedNamesClient([]));

    const result = await getLinkedSponsorNames("tier-empty");

    expect(result).toEqual([]);
  });

  it("excludes soft-deleted sponsors by querying sponsors_active not sponsors", async () => {
    // sponsors_active view already excludes soft-deleted rows.
    // The mock only returns active sponsors — verify count is 1, not 2.
    const sponsorRows = [{ name: "Active Corp" }];
    // (soft-deleted "Ghost Inc" is absent from the view — not in sponsorRows)

    const client = buildLinkedNamesClient(sponsorRows);

    // Capture which table was queried
    const originalFrom = client.from as (table: string) => unknown;
    const queriedTables: string[] = [];
    client.from = vi.fn((table: string) => {
      queriedTables.push(table);
      return originalFrom(table);
    });

    setClient(client);

    const result = await getLinkedSponsorNames("tier-gold");

    expect(result).toEqual(["Active Corp"]);
    // Must have queried sponsors_active, not sponsors
    expect(queriedTables).toContain("sponsors_active");
    expect(queriedTables).not.toContain("sponsors");
  });
});

// ---------------------------------------------------------------------------
// Sprint 33 RED — getSponsorshipItems optional category filter
// ---------------------------------------------------------------------------

describe("getSponsorshipItems — optional category filter (Sprint 33 RED)", () => {
  function buildCategoryFilterClient(
    tierRows: ReturnType<typeof makeTierRow>[]
  ) {
    // getSponsorshipItems({ category: 'tribute' }) must add .eq('category', 'tribute')
    // to the items query chain. The mock must handle that extra .eq() call.
    // Chain: .select('*').eq('year', year).eq('category', category).order(...)
    const itemsOrder = vi.fn().mockResolvedValue({ data: tierRows, error: null });
    const itemsEqCategory = vi.fn().mockReturnValue({ order: itemsOrder });
    const itemsEqYear = vi.fn().mockReturnValue({
      order: itemsOrder,
      eq: itemsEqCategory,
    });
    const itemsSelect = vi.fn().mockReturnValue({ eq: itemsEqYear });

    // sponsors_active chain
    const sponsorsEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const sponsorsSelect = vi.fn().mockReturnValue({ eq: sponsorsEq });

    const mockFrom = vi.fn((table: string) => {
      if (table === "sponsorship_items_active") return { select: itemsSelect };
      if (table === "sponsors_active") return { select: sponsorsSelect };
      return {};
    });

    return { from: mockFrom } as MockClient;
  }

  // Use a typed alias that accepts the new optional category param.
  // Sprint 33 RED: getSponsorshipItems does not yet accept this argument.
  // The cast via unknown lets us call it with the future API shape.
  type GetSponsorshipItemsWithFilter = (opts?: { category?: SponsorshipCategory }) => Promise<unknown[]>;
  const getSponsorshipItemsFiltered = getSponsorshipItems as unknown as GetSponsorshipItemsWithFilter;

  it("returns only tribute-category items when category='tribute' is passed", async () => {
    const tierRows = [makeTierRow("item-balloons", "Balloons", "tribute")];
    setClient(buildCategoryFilterClient(tierRows));

    const result = await getSponsorshipItemsFiltered({ category: "tribute" });

    expect(result).toHaveLength(1);
    expect((result[0] as { name: string }).name).toBe("Balloons");
  });

  it("returns only sponsorship-category items when category='sponsorship' is passed", async () => {
    const tierRows = [
      makeTierRow("item-champion", "Champion", "sponsorship"),
      makeTierRow("item-eagle", "Eagle", "sponsorship"),
    ];
    setClient(buildCategoryFilterClient(tierRows));

    const result = await getSponsorshipItemsFiltered({ category: "sponsorship" });

    expect(result).toHaveLength(2);
    result.forEach((item) => {
      expect((item as { category: string }).category).toBe("sponsorship");
    });
  });

  it("returns only supporter-category items when category='supporter' is passed", async () => {
    const tierRows = [
      makeTierRow("item-tee-sign", "Tee Sign", "supporter"),
      makeTierRow("item-yard-sign", "Yard Sign", "supporter"),
    ];
    setClient(buildCategoryFilterClient(tierRows));

    const result = await getSponsorshipItemsFiltered({ category: "supporter" });

    expect(result).toHaveLength(2);
    result.forEach((item) => {
      expect((item as { category: string }).category).toBe("supporter");
    });
  });

  it("returns all items when no category filter is passed (backward compatible)", async () => {
    const tierRows = [
      makeTierRow("item-champion", "Champion", "sponsorship"),
      makeTierRow("item-balloons", "Balloons", "tribute"),
      makeTierRow("item-tee-sign", "Tee Sign", "supporter"),
    ];
    setClient(buildCategoryFilterClient(tierRows));

    // No category argument — old behavior preserved
    const result = await getSponsorshipItemsFiltered();

    expect(result).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Sprint 33 RED — getSponsorshipPurchases optional category filter
// ---------------------------------------------------------------------------

describe("getSponsorshipPurchases — optional category filter (Sprint 33 RED)", () => {
  function buildPurchasesClient(
    purchaseRows: ReturnType<typeof makePurchaseRow>[]
  ) {
    // getSponsorshipPurchases({ category: 'tribute' }) must join to sponsorship_items
    // and filter by category. Current implementation does a flat select on
    // sponsorship_purchases with no join — this will need a JOIN or inner select.
    //
    // Mock: simple chain that returns filtered rows (simulating DB-side filtering).
    const purchasesOrder = vi.fn().mockResolvedValue({ data: purchaseRows, error: null });
    const purchasesEqYear = vi.fn().mockReturnValue({ order: purchasesOrder });
    const purchasesEqCategory = vi.fn().mockReturnValue({ order: purchasesOrder });
    const purchasesSelectChain = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: purchasesOrder,
        eq: purchasesEqCategory,
      }),
    });

    const mockFrom = vi.fn((table: string) => {
      if (table === "sponsorship_purchases") {
        return { select: purchasesSelectChain };
      }
      return {};
    });

    return { from: mockFrom } as MockClient;
  }

  // Sprint 33 RED: getSponsorshipPurchases does not yet accept category argument.
  type GetPurchasesWithFilter = (opts?: { category?: SponsorshipCategory }) => Promise<unknown[] | null>;
  const getSponsorshipPurchasesFiltered = getSponsorshipPurchases as unknown as GetPurchasesWithFilter;

  it("returns tribute purchases with tribute_recipient populated", async () => {
    const purchaseRows = [
      makePurchaseRow("item-balloons", "Jane Doe", "John Davenport"),
    ];
    setClient(buildPurchasesClient(purchaseRows));

    const result = await getSponsorshipPurchasesFiltered({ category: "tribute" });

    expect(result).toHaveLength(1);
    expect((result![0] as { tribute_recipient: string }).tribute_recipient).toBe(
      "John Davenport"
    );
  });

  it("returns only purchases for the specified category when category filter is passed", async () => {
    const tributePurchases = [
      makePurchaseRow("item-balloons", "Jane Doe", "John Davenport"),
    ];
    setClient(buildPurchasesClient(tributePurchases));

    const result = await getSponsorshipPurchasesFiltered({ category: "tribute" });

    // Should only return the tribute purchase (Balloons)
    expect(result).toHaveLength(1);
    // Balloons is item_id
    expect((result![0] as { item_id: string }).item_id).toBe("item-balloons");
  });

  it("returns all purchases when no category filter is passed (backward compatible)", async () => {
    const allPurchases = [
      makePurchaseRow("item-champion", "Acme Corp", null),
      makePurchaseRow("item-balloons", "Jane Doe", "John Davenport"),
      makePurchaseRow("item-tee-sign", "Bob Smith", null),
    ];
    setClient(buildPurchasesClient(allPurchases));

    const result = await getSponsorshipPurchasesFiltered();

    expect(result).toHaveLength(3);
  });

  it("tribute_recipient is null on non-tribute purchases", async () => {
    const sponsorshipPurchases = [
      makePurchaseRow("item-champion", "Acme Corp", null),
    ];
    setClient(buildPurchasesClient(sponsorshipPurchases));

    const result = await getSponsorshipPurchasesFiltered({ category: "sponsorship" });

    expect(result).toHaveLength(1);
    expect(
      (result![0] as { tribute_recipient: string | null }).tribute_recipient
    ).toBeNull();
  });
});
