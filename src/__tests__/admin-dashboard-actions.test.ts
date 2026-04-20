/**
 * S16-B — getDashboardStats server action tests
 *
 * Covers:
 * - Returns an object with all 6 required keys (registrations, sponsors,
 *   revenue_cents, pending_photos, contacts, scores)
 * - Each stat is sourced from the correct table/view with correct filters
 * - Revenue is the SUM of amount_paid_cents from sponsors_active
 * - All 6 queries are issued in parallel (Promise.all pattern)
 * - If any sub-query errors, getDashboardStats throws
 *
 * RED phase — src/app/admin/dashboard-actions.ts does not yet exist.
 * All tests should FAIL until Bolt creates the file.
 *
 * Error behavior contract: getDashboardStats THROWS on any sub-query error.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

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

import * as serverModule from "@/lib/supabase/server";
import * as adminModule from "@/lib/supabase/admin";

import { getDashboardStats } from "@/app/admin/dashboard-actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MockClient = {
  from: ReturnType<typeof vi.fn>;
};

function setClient(client: MockClient) {
  vi.mocked(serverModule.createClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
  );
}

// ---------------------------------------------------------------------------
// Mock builder helpers
// ---------------------------------------------------------------------------

/**
 * Builds a chainable Supabase mock that returns appropriate data for each table.
 *
 * Query shapes Bolt may use:
 * - COUNT: .select("*", { count: "exact", head: true }) → { count: N, error: null }
 *   or: .select("id") → { data: [{ id: ... }, ...], error: null }  (client-side length)
 * - SUM: .select("amount_paid_cents") → { data: [{ amount_paid_cents: N }, ...], error: null }
 *        or an RPC call → { data: [{ sum: N }], error: null }
 *
 * We accommodate both count styles: the mock returns { count: N, data: [...], error: null }
 * so whichever style Bolt uses will get a valid numeric result.
 */
function buildSuccessClient(overrides: {
  registrations?: number;
  sponsors?: number;
  revenue_amount_paid_cents?: number[];
  pending_photos?: number;
  contacts?: number;
  scores?: number;
}) {
  const {
    registrations = 7,
    sponsors = 12,
    revenue_amount_paid_cents = [1234500],
    pending_photos = 3,
    contacts = 376,
    scores = 24,
  } = overrides;

  const CURRENT_YEAR = new Date().getFullYear();

  // teams_active: count query filtered by year
  const teamsHead = vi.fn().mockResolvedValue({
    count: registrations,
    data: Array.from({ length: registrations }, (_, i) => ({ id: `team-${i}` })),
    error: null,
  });
  const teamsEq = vi.fn().mockReturnValue({ head: teamsHead, ...buildTerminal(registrations) });
  const teamsSelect = vi.fn().mockReturnValue({ eq: teamsEq });

  // sponsors_active: count query (no filter) + SUM query for revenue
  // We need to handle two distinct selects on sponsors_active:
  // 1. The count select (no amount_paid_cents field)
  // 2. The revenue select (amount_paid_cents field)
  // Bolt may do them as a single or two separate queries.
  // We return a combined result that works for both.
  const sponsorsRevenueData = revenue_amount_paid_cents.map((amt) => ({
    amount_paid_cents: amt,
  }));
  const sponsorsData = Array.from({ length: sponsors }, (_, i) => ({
    id: `sponsor-${i}`,
    amount_paid_cents: revenue_amount_paid_cents[i] ?? 0,
  }));

  const sponsorsHead = vi.fn().mockResolvedValue({
    count: sponsors,
    data: sponsorsData,
    error: null,
  });
  const sponsorsEq = vi.fn().mockReturnValue({ head: sponsorsHead, ...buildTerminal(sponsors, sponsorsRevenueData) });
  const sponsorsSelect = vi.fn().mockReturnValue({ eq: sponsorsEq, head: sponsorsHead, ...buildTerminal(sponsors, sponsorsRevenueData) });

  // photos: count query where status = 'pending'
  const photosHead = vi.fn().mockResolvedValue({
    count: pending_photos,
    data: Array.from({ length: pending_photos }, (_, i) => ({ id: `photo-${i}` })),
    error: null,
  });
  const photosEq = vi.fn().mockReturnValue({ head: photosHead, ...buildTerminal(pending_photos) });
  const photosSelect = vi.fn().mockReturnValue({ eq: photosEq });

  // contacts_active: count query (no filter)
  const contactsHead = vi.fn().mockResolvedValue({
    count: contacts,
    data: Array.from({ length: contacts }, (_, i) => ({ id: `contact-${i}` })),
    error: null,
  });
  const contactsSelect = vi.fn().mockReturnValue({ head: contactsHead, ...buildTerminal(contacts) });

  // scores: count query filtered by year
  const scoresHead = vi.fn().mockResolvedValue({
    count: scores,
    data: Array.from({ length: scores }, (_, i) => ({ id: `score-${i}` })),
    error: null,
  });
  const scoresEq = vi.fn().mockReturnValue({ head: scoresHead, ...buildTerminal(scores) });
  const scoresSelect = vi.fn().mockReturnValue({ eq: scoresEq, head: scoresHead, ...buildTerminal(scores) });

  const mockFrom = vi.fn((table: string) => {
    if (table === "teams_active") return { select: teamsSelect };
    if (table === "sponsors_active") return { select: sponsorsSelect };
    if (table === "photos") return { select: photosSelect };
    if (table === "contacts_active") return { select: contactsSelect };
    if (table === "scores") return { select: scoresSelect };
    return {};
  });

  return {
    client: { from: mockFrom } as MockClient,
    spies: {
      teamsSelect,
      sponsorsSelect,
      photosSelect,
      contactsSelect,
      scoresSelect,
      mockFrom,
      CURRENT_YEAR,
    },
  };
}

/** Builds a terminal chain node that resolves directly (for `.select(...).eq(...).head()` etc.) */
function buildTerminal(count: number, data?: unknown[]) {
  const resolved = {
    count,
    data: data ?? Array.from({ length: count }, (_, i) => ({ id: `row-${i}` })),
    error: null,
  };
  // Make the object itself thenable so `await from("x").select("*", {count:"exact", head:true})`
  // resolves if Bolt uses it without chaining further
  return {
    then: (resolve: (v: typeof resolved) => void) => resolve(resolved),
    catch: (fn: () => void) => fn,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
});

// ---------------------------------------------------------------------------
// getDashboardStats — returns all 6 stats
// ---------------------------------------------------------------------------

describe("getDashboardStats — returns all 6 stats", () => {
  it("returns an object with all 6 required keys, all numbers", async () => {
    const { client } = buildSuccessClient({});
    setClient(client);

    const result = await getDashboardStats();

    expect(typeof result.registrations).toBe("number");
    expect(typeof result.sponsors).toBe("number");
    expect(typeof result.revenue_cents).toBe("number");
    expect(typeof result.pending_photos).toBe("number");
    expect(typeof result.contacts).toBe("number");
    expect(typeof result.scores).toBe("number");
  });

  it("calls requireAdmin before any DB query (authorization gate)", async () => {
    const { client, spies } = buildSuccessClient({});
    setClient(client);

    await getDashboardStats();

    expect(adminModule.requireAdmin).toHaveBeenCalled();
    const requireAdminOrder = vi.mocked(adminModule.requireAdmin).mock.invocationCallOrder[0];
    const firstFromOrder = spies.mockFrom.mock.invocationCallOrder[0];
    expect(requireAdminOrder).toBeLessThan(firstFromOrder);
  });

  it("registrations comes from teams_active (correct table queried)", async () => {
    const { client, spies } = buildSuccessClient({ registrations: 7 });
    setClient(client);

    const result = await getDashboardStats();

    // Assert teams_active was queried
    expect(spies.mockFrom).toHaveBeenCalledWith("teams_active");
    expect(result.registrations).toBe(7);
  });

  it("registrations query applies current-year filter", async () => {
    const { client, spies } = buildSuccessClient({ registrations: 7 });
    setClient(client);

    await getDashboardStats();

    // teamsSelect must receive an eq filter — Supabase `.eq("year", currentYear)`
    // We verify by checking teamsSelect was called and the subsequent eq chain was called
    expect(spies.teamsSelect).toHaveBeenCalled();
    // The eq call on the chain must have been called with "year" as first arg
    const teamsChain = spies.teamsSelect.mock.results[0]?.value;
    if (teamsChain?.eq) {
      expect(teamsChain.eq).toHaveBeenCalledWith(
        "year",
        expect.any(Number)
      );
    }
  });

  it("sponsors count comes from sponsors_active (correct table queried), mock returns 12", async () => {
    const { client, spies } = buildSuccessClient({ sponsors: 12 });
    setClient(client);

    const result = await getDashboardStats();

    expect(spies.mockFrom).toHaveBeenCalledWith("sponsors_active");
    expect(result.sponsors).toBe(12);
  });

  it("revenue_cents is the SUM of amount_paid_cents from sponsors_active, mock returns 1234500", async () => {
    // Single sponsor with amount_paid_cents = 1234500 → revenue_cents should be 1234500
    const { client } = buildSuccessClient({
      sponsors: 1,
      revenue_amount_paid_cents: [1234500],
    });
    setClient(client);

    const result = await getDashboardStats();

    expect(result.revenue_cents).toBe(1234500);
  });

  it("pending_photos comes from photos table where status = 'pending', mock returns 3", async () => {
    const { client, spies } = buildSuccessClient({ pending_photos: 3 });
    setClient(client);

    const result = await getDashboardStats();

    expect(spies.mockFrom).toHaveBeenCalledWith("photos");
    expect(result.pending_photos).toBe(3);

    // Verify eq filter was applied for status = 'pending'
    const photosChain = spies.photosSelect.mock.results[0]?.value;
    if (photosChain?.eq) {
      expect(photosChain.eq).toHaveBeenCalledWith("status", "pending");
    }
  });

  it("contacts comes from contacts_active (no extra filters), mock returns 376", async () => {
    const { client, spies } = buildSuccessClient({ contacts: 376 });
    setClient(client);

    const result = await getDashboardStats();

    expect(spies.mockFrom).toHaveBeenCalledWith("contacts_active");
    expect(result.contacts).toBe(376);
  });

  it("scores comes from scores table (no _active view), mock returns 24", async () => {
    const { client, spies } = buildSuccessClient({ scores: 24 });
    setClient(client);

    const result = await getDashboardStats();

    // Must query "scores" not "scores_active" (no soft-delete on scores table)
    expect(spies.mockFrom).toHaveBeenCalledWith("scores");
    expect(spies.mockFrom).not.toHaveBeenCalledWith("scores_active");
    expect(result.scores).toBe(24);
  });
});

// ---------------------------------------------------------------------------
// getDashboardStats — parallel execution
// ---------------------------------------------------------------------------

describe("getDashboardStats — parallel execution", () => {
  it("issues all queries via Promise.all (from() called for all tables before any resolves)", async () => {
    // Track all .from() calls synchronously — if Bolt uses Promise.all, all from() calls
    // are registered before any await. We verify by recording call order.
    let fromCallCount = 0;
    const fromCallLog: string[] = [];

    // Slow-resolve promises to ensure parallel dispatch is required
    const makeSlowResolve = (value: unknown, delayMs = 10) =>
      new Promise((resolve) => setTimeout(() => resolve(value), delayMs));

    const mockFrom = vi.fn((table: string) => {
      fromCallCount++;
      fromCallLog.push(table);

      // All queries resolve slowly — serial awaits would take 5×10ms = 50ms
      // but Promise.all should complete in ~10ms
      const slowResult = makeSlowResolve({ count: 1, data: [{ id: "x", amount_paid_cents: 100 }], error: null });

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            head: vi.fn().mockReturnValue(slowResult),
            then: (resolve: (v: unknown) => void) => slowResult.then(resolve),
          }),
          head: vi.fn().mockReturnValue(slowResult),
          then: (resolve: (v: unknown) => void) => slowResult.then(resolve),
        }),
      };
    });

    setClient({ from: mockFrom });

    const start = Date.now();
    await getDashboardStats();
    const elapsed = Date.now() - start;

    // All 5 distinct tables must have been queried
    // (teams_active, sponsors_active×1-or-2, photos, contacts_active, scores)
    const uniqueTables = new Set(fromCallLog);
    expect(uniqueTables).toContain("teams_active");
    expect(uniqueTables).toContain("sponsors_active");
    expect(uniqueTables).toContain("photos");
    expect(uniqueTables).toContain("contacts_active");
    expect(uniqueTables).toContain("scores");

    // Parallel execution guard: if all 6 from() calls were made, total should be ≥ 5
    expect(fromCallCount).toBeGreaterThanOrEqual(5);

    // Timing guard (loose): parallel should be much faster than serial (5×10 = 50ms)
    // We use 45ms as the upper bound with some slack for CI variance
    expect(elapsed).toBeLessThan(45);
  });
});

// ---------------------------------------------------------------------------
// getDashboardStats — error handling
// ---------------------------------------------------------------------------

describe("getDashboardStats — error handling", () => {
  it("throws when teams_active query returns an error", async () => {
    const mockFrom = vi.fn((table: string) => {
      if (table === "teams_active") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: null,
              data: null,
              error: { message: "teams_active query failed" },
            }),
          }),
        };
      }
      // Other tables succeed
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 1, data: [], error: null }),
          head: vi.fn().mockResolvedValue({ count: 1, data: [], error: null }),
          then: (resolve: (v: unknown) => void) => resolve({ count: 1, data: [], error: null }),
        }),
      };
    });

    setClient({ from: mockFrom });

    await expect(getDashboardStats()).rejects.toThrow();
  });

  it("throws when sponsors_active query returns an error", async () => {
    const mockFrom = vi.fn((table: string) => {
      if (table === "sponsors_active") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: null,
              data: null,
              error: { message: "sponsors_active query failed" },
            }),
            then: (resolve: (v: unknown) => void) =>
              resolve({ count: null, data: null, error: { message: "sponsors_active query failed" } }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 1, data: [], error: null }),
          head: vi.fn().mockResolvedValue({ count: 1, data: [], error: null }),
          then: (resolve: (v: unknown) => void) => resolve({ count: 1, data: [], error: null }),
        }),
      };
    });

    setClient({ from: mockFrom });

    await expect(getDashboardStats()).rejects.toThrow();
  });
});
