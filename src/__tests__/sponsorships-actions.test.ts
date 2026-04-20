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
 * RED phase — these tests reference getSponsorshipItems returning active_sponsor_count
 * and a new getLinkedSponsorNames export that does not yet exist. All tests should fail.
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
  // @ts-expect-error — getLinkedSponsorNames does not exist yet (RED phase)
  getLinkedSponsorNames,
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

/** Minimal sponsorship_items_active row shape (fields beyond these are nullable/optional) */
function makeTierRow(id: string, name: string) {
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
