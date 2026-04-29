/**
 * S10-6 (RED): Trash server actions — contract tests
 *
 * All Supabase interactions are mocked. These tests will FAIL until Bolt
 * creates src/app/admin/trash/actions.ts.
 *
 * Covers:
 * - getTrashContacts: raw contacts table, deleted_at IS NOT NULL, order by deleted_at DESC
 * - getTrashTeams: same pattern for teams table
 * - getTrashSponsors: same pattern for sponsors table
 * - getTrashSponsorshipItems: same pattern for sponsorship_items table
 * - getTrashPhotos: same pattern for photos table
 * - restoreContact: calls restore helper (update deleted_at/deleted_by null), handles 23505
 * - restoreTeam: happy path
 * - restoreSponsor: happy path
 * - restoreSponsorshipItem: happy path
 * - restorePhoto: happy path
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoist mocks before any imports
// ---------------------------------------------------------------------------
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ role: "admin" }),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import * as serverModule from "@/lib/supabase/server";
import * as adminModule from "@/lib/supabase/admin";
import {
  getTrashContacts,
  getTrashTeams,
  getTrashSponsors,
  getTrashSponsorshipItems,
  getTrashPhotos,
  restoreContact,
  restoreTeam,
  restoreSponsor,
  restoreSponsorshipItem,
  restorePhoto,
} from "@/app/admin/trash/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setClient(client: unknown) {
  vi.mocked(serverModule.createClient).mockResolvedValue(
    client as Awaited<ReturnType<typeof serverModule.createClient>>
  );
}

/**
 * Build a chainable query mock that supports:
 *   supabase.from(table).select('*').not(...).order(...)
 * The terminal `.order()` resolves with the given result.
 */
function makeTrashQueryChain(result: {
  data: unknown[] | null;
  error: null | { message: string; code?: string };
}) {
  const mockOrder = vi.fn().mockResolvedValue(result);
  const mockNot = vi.fn().mockReturnValue({ order: mockOrder });
  const mockSelect = vi.fn().mockReturnValue({ not: mockNot });
  return { select: mockSelect, _mockNot: mockNot, _mockOrder: mockOrder };
}

/**
 * Build a mock for restore: supabase.from(table).update({...}).eq("id", id)
 */
function makeRestoreChain(result: {
  error: null | { message: string; code?: string };
}) {
  const mockEq = vi.fn().mockResolvedValue(result);
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  return { update: mockUpdate, _mockEq: mockEq };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
  // Default requireAdmin to passing
  vi.mocked(adminModule.requireAdmin).mockResolvedValue(
    { role: "admin" } as ReturnType<typeof adminModule.requireAdmin> extends Promise<infer T> ? T : never
  );
});

// ---------------------------------------------------------------------------
// getTrashContacts
// ---------------------------------------------------------------------------

describe("getTrashContacts", () => {
  it("happy path — returns 3 soft-deleted contacts, queries raw contacts table with correct filters", async () => {
    const deleted = [
      { id: "c1", full_name: "Alice", deleted_at: "2026-04-18T10:00:00Z" },
      { id: "c2", full_name: "Bob", deleted_at: "2026-04-17T09:00:00Z" },
      { id: "c3", full_name: "Carol", deleted_at: "2026-04-16T08:00:00Z" },
    ];

    const chain = makeTrashQueryChain({ data: deleted, error: null });
    const mockFrom = vi.fn().mockReturnValue(chain);
    setClient({ from: mockFrom });

    const result = await getTrashContacts();

    // Must query the RAW contacts table, not contacts_active
    expect(mockFrom).toHaveBeenCalledWith("contacts");
    expect(mockFrom).not.toHaveBeenCalledWith("contacts_active");

    // Must filter for non-null deleted_at
    expect(chain._mockNot).toHaveBeenCalledWith("deleted_at", "is", null);

    // Must order newest-first
    expect(chain._mockOrder).toHaveBeenCalledWith("deleted_at", { ascending: false });

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ id: "c1", full_name: "Alice" });
  });

  it("empty trash — returns []", async () => {
    const chain = makeTrashQueryChain({ data: [], error: null });
    setClient({ from: vi.fn().mockReturnValue(chain) });

    const result = await getTrashContacts();
    expect(result).toEqual([]);
  });

  it("unauthorized — requireAdmin throws, propagates", async () => {
    vi.mocked(adminModule.requireAdmin).mockRejectedValue(new Error("Unauthorized"));
    setClient({ from: vi.fn() });

    await expect(getTrashContacts()).rejects.toThrow("Unauthorized");
  });

  it("DB error — throws with error message", async () => {
    const chain = makeTrashQueryChain({ data: null, error: { message: "DB failure" } });
    setClient({ from: vi.fn().mockReturnValue(chain) });

    await expect(getTrashContacts()).rejects.toThrow("DB failure");
  });
});

// ---------------------------------------------------------------------------
// getTrashTeams
// ---------------------------------------------------------------------------

describe("getTrashTeams (Sprint 32 — captain-derived display)", () => {
  it("happy path — queries raw teams table, filters deleted_at IS NOT NULL, orders desc", async () => {
    // Sprint 32: deleted team row has no team_name; display = captain JOIN
    const deleted = [
      {
        id: "t1",
        // team_name omitted — Sprint 32 contract drop
        captain_contact_id: "c-deleted",
        deleted_at: "2026-04-18T10:00:00Z",
      },
    ];

    const chain = makeTrashQueryChain({ data: deleted, error: null });
    const mockFrom = vi.fn().mockReturnValue(chain);
    setClient({ from: mockFrom });

    const result = await getTrashTeams();

    expect(mockFrom).toHaveBeenCalledWith("teams");
    expect(mockFrom).not.toHaveBeenCalledWith("teams_active");
    expect(chain._mockNot).toHaveBeenCalledWith("deleted_at", "is", null);
    expect(chain._mockOrder).toHaveBeenCalledWith("deleted_at", { ascending: false });
    expect(result).toHaveLength(1);
    // team_name must not be present in the returned data
    expect((result[0] as Record<string, unknown>).team_name).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getTrashSponsors
// ---------------------------------------------------------------------------

describe("getTrashSponsors", () => {
  it("happy path — queries raw sponsors table, filters deleted_at IS NOT NULL, orders desc", async () => {
    const deleted = [
      { id: "s1", name: "ACME Corp", deleted_at: "2026-04-15T12:00:00Z" },
    ];

    const chain = makeTrashQueryChain({ data: deleted, error: null });
    const mockFrom = vi.fn().mockReturnValue(chain);
    setClient({ from: mockFrom });

    const result = await getTrashSponsors();

    expect(mockFrom).toHaveBeenCalledWith("sponsors");
    expect(mockFrom).not.toHaveBeenCalledWith("sponsors_active");
    expect(chain._mockNot).toHaveBeenCalledWith("deleted_at", "is", null);
    expect(chain._mockOrder).toHaveBeenCalledWith("deleted_at", { ascending: false });
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getTrashSponsorshipItems
// ---------------------------------------------------------------------------

describe("getTrashSponsorshipItems", () => {
  it("happy path — queries raw sponsorship_items table, filters deleted_at IS NOT NULL, orders desc", async () => {
    const deleted = [
      { id: "si1", name: "Gold Package", deleted_at: "2026-04-14T11:00:00Z" },
    ];

    const chain = makeTrashQueryChain({ data: deleted, error: null });
    const mockFrom = vi.fn().mockReturnValue(chain);
    setClient({ from: mockFrom });

    const result = await getTrashSponsorshipItems();

    expect(mockFrom).toHaveBeenCalledWith("sponsorship_items");
    expect(chain._mockNot).toHaveBeenCalledWith("deleted_at", "is", null);
    expect(chain._mockOrder).toHaveBeenCalledWith("deleted_at", { ascending: false });
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getTrashPhotos
// ---------------------------------------------------------------------------

describe("getTrashPhotos", () => {
  it("happy path — queries raw photos table, filters deleted_at IS NOT NULL, orders desc", async () => {
    const deleted = [
      { id: "p1", url: "https://example.com/photo.jpg", deleted_at: "2026-04-13T10:00:00Z" },
    ];

    const chain = makeTrashQueryChain({ data: deleted, error: null });
    const mockFrom = vi.fn().mockReturnValue(chain);
    setClient({ from: mockFrom });

    const result = await getTrashPhotos();

    expect(mockFrom).toHaveBeenCalledWith("photos");
    expect(mockFrom).not.toHaveBeenCalledWith("photos_active");
    expect(chain._mockNot).toHaveBeenCalledWith("deleted_at", "is", null);
    expect(chain._mockOrder).toHaveBeenCalledWith("deleted_at", { ascending: false });
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// restoreContact
// ---------------------------------------------------------------------------

describe("restoreContact", () => {
  it("happy path — returns { ok: true } and calls update with null deleted_at + deleted_by", async () => {
    const chain = makeRestoreChain({ error: null });
    const mockFrom = vi.fn().mockReturnValue(chain);
    setClient({ from: mockFrom });

    const result = await restoreContact("contact-uuid");

    expect(mockFrom).toHaveBeenCalledWith("contacts");
    expect(chain.update).toHaveBeenCalledWith({ deleted_at: null, deleted_by: null });
    expect(chain._mockEq).toHaveBeenCalledWith("id", "contact-uuid");
    expect(result).toEqual({ ok: true });
  });

  it("unauthenticated — returns { error: /unauthenticated/i }", async () => {
    // The restore helper in soft-delete.ts checks auth.getUser() — but for
    // restoreContact specifically, requireAdmin already gates access.
    // This test covers the scenario where the action itself catches an auth
    // error and surfaces it cleanly.
    vi.mocked(adminModule.requireAdmin).mockRejectedValue(new Error("Unauthenticated"));
    setClient({ from: vi.fn() });

    await expect(restoreContact("contact-uuid")).rejects.toThrow(/unauthenticated/i);
  });

  it("non-admin user — requireAdmin throws Unauthorized, propagates", async () => {
    vi.mocked(adminModule.requireAdmin).mockRejectedValue(new Error("Unauthorized"));
    setClient({ from: vi.fn() });

    await expect(restoreContact("contact-uuid")).rejects.toThrow("Unauthorized");
  });

  it("unique-constraint collision (Postgres 23505) — returns { error: /already exists|conflict/i }", async () => {
    const chain = makeRestoreChain({
      error: { message: "duplicate key value violates unique constraint", code: "23505" },
    });
    setClient({ from: vi.fn().mockReturnValue(chain) });

    const result = await restoreContact("contact-uuid");

    expect(result).toMatchObject({
      error: expect.stringMatching(/already exists|conflict|email already in use/i),
    });
  });

  it("generic DB error — returns { error: dbError.message }", async () => {
    const chain = makeRestoreChain({ error: { message: "connection timeout" } });
    setClient({ from: vi.fn().mockReturnValue(chain) });

    const result = await restoreContact("contact-uuid");

    expect(result).toMatchObject({ error: "connection timeout" });
  });
});

// ---------------------------------------------------------------------------
// restoreTeam
// ---------------------------------------------------------------------------

describe("restoreTeam", () => {
  it("happy path — returns { ok: true } and updates teams table with null deleted_at + deleted_by", async () => {
    const chain = makeRestoreChain({ error: null });
    const mockFrom = vi.fn().mockReturnValue(chain);
    setClient({ from: mockFrom });

    const result = await restoreTeam("team-uuid");

    expect(mockFrom).toHaveBeenCalledWith("teams");
    expect(chain.update).toHaveBeenCalledWith({ deleted_at: null, deleted_by: null });
    expect(chain._mockEq).toHaveBeenCalledWith("id", "team-uuid");
    expect(result).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// restoreSponsor
// ---------------------------------------------------------------------------

describe("restoreSponsor", () => {
  it("happy path — returns { ok: true } and updates sponsors table with null deleted_at + deleted_by", async () => {
    const chain = makeRestoreChain({ error: null });
    const mockFrom = vi.fn().mockReturnValue(chain);
    setClient({ from: mockFrom });

    const result = await restoreSponsor("sponsor-uuid");

    expect(mockFrom).toHaveBeenCalledWith("sponsors");
    expect(chain.update).toHaveBeenCalledWith({ deleted_at: null, deleted_by: null });
    expect(chain._mockEq).toHaveBeenCalledWith("id", "sponsor-uuid");
    expect(result).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// restoreSponsorshipItem
// ---------------------------------------------------------------------------

describe("restoreSponsorshipItem", () => {
  it("happy path — returns { ok: true } and updates sponsorship_items table with null deleted_at + deleted_by", async () => {
    const chain = makeRestoreChain({ error: null });
    const mockFrom = vi.fn().mockReturnValue(chain);
    setClient({ from: mockFrom });

    const result = await restoreSponsorshipItem("item-uuid");

    expect(mockFrom).toHaveBeenCalledWith("sponsorship_items");
    expect(chain.update).toHaveBeenCalledWith({ deleted_at: null, deleted_by: null });
    expect(chain._mockEq).toHaveBeenCalledWith("id", "item-uuid");
    expect(result).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// restorePhoto
// ---------------------------------------------------------------------------

describe("restorePhoto", () => {
  it("happy path — returns { ok: true } and updates photos table with null deleted_at + deleted_by", async () => {
    const chain = makeRestoreChain({ error: null });
    const mockFrom = vi.fn().mockReturnValue(chain);
    setClient({ from: mockFrom });

    const result = await restorePhoto("photo-uuid");

    expect(mockFrom).toHaveBeenCalledWith("photos");
    expect(chain.update).toHaveBeenCalledWith({ deleted_at: null, deleted_by: null });
    expect(chain._mockEq).toHaveBeenCalledWith("id", "photo-uuid");
    expect(result).toEqual({ ok: true });
  });
});
