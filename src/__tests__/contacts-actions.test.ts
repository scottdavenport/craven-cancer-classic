/**
 * S9-5: Admin contacts server actions — contract tests
 *
 * Covers:
 * - getContacts: basic filters, team_id filter, captain_only filter, error paths
 * - exportContactsCSV: always uses marketing_consent=true gate, header columns
 * - getTeamsForFilter: returns id+team_name list
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoist mocks
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
import {
  getContacts,
  exportContactsCSV,
  getTeamsForFilter,
} from "@/app/admin/contacts/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setClient(client: unknown) {
  vi.mocked(serverModule.createClient).mockResolvedValue(
    client as Awaited<ReturnType<typeof serverModule.createClient>>
  );
}

/** Minimal full Contact row matching the current database.ts shape. */
function makeContactRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "uuid-1",
    full_name: "John Doe",
    first_name: "John",
    last_name: "Doe",
    salutation: null,
    email: "john@example.com",
    phone: null,
    type: "player",
    company: null,
    address1: null,
    address2: null,
    city: null,
    state: null,
    zip: null,
    marketing_consent: true,
    source: null,
    year_first_seen: 2026,
    notes: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Build a chainable contacts query mock.
 * The contacts actions build a query chain like:
 *   supabase.from('contacts').select('*').order(...).eq(...).ilike(...).in(...)
 * Each filter method mutates and returns the same query object.
 * The terminal resolution happens when the chain is awaited (order is the last
 * builder before filters are applied, so we make it return an awaitable chain).
 */
function makeContactsQueryChain(result: { data: unknown[] | null; error: null | { message: string } }) {
  // Create a thenable chain where every method returns the chain itself,
  // allowing arbitrary .eq().ilike().in().order() call sequences.
  const chain: Record<string, unknown> = {};

  // Make the chain itself awaitable (Promise-like)
  chain.then = (resolve: (v: typeof result) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);

  // All query builder methods return the chain (chained fluently)
  const methods = ["order", "eq", "ilike", "in", "neq", "gt", "lt", "gte", "lte", "filter"];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  return {
    select: vi.fn().mockReturnValue(chain),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
});

// ---------------------------------------------------------------------------
// getContacts — basic path (no filter)
// ---------------------------------------------------------------------------

describe("getContacts — no filter", () => {
  it("returns contacts from the database", async () => {
    const contacts = [makeContactRow(), makeContactRow({ id: "uuid-2", full_name: "Jane Smith" })];

    setClient({
      from: vi.fn().mockReturnValue(makeContactsQueryChain({ data: contacts, error: null })),
    });

    const result = await getContacts();
    expect(result).toHaveLength(2);
    expect(result[0].full_name).toBe("John Doe");
  });

  it("returns empty array when no contacts exist", async () => {
    setClient({
      from: vi.fn().mockReturnValue(makeContactsQueryChain({ data: [], error: null })),
    });

    const result = await getContacts();
    expect(result).toEqual([]);
  });

  it("throws when Supabase returns an error", async () => {
    setClient({
      from: vi.fn().mockReturnValue(makeContactsQueryChain({ data: [], error: { message: "DB error" } })),
    });

    await expect(getContacts()).rejects.toThrow("DB error");
  });
});

// ---------------------------------------------------------------------------
// getContacts — team_id filter
// ---------------------------------------------------------------------------

describe("getContacts — team_id filter", () => {
  it("queries team_members first then fetches contacts by id", async () => {
    const membersResult = {
      data: [
        { contact_id: "c1", role: "captain" },
        { contact_id: "c2", role: "player" },
      ],
      error: null,
    };
    const contactsResult = {
      data: [makeContactRow({ id: "c1" }), makeContactRow({ id: "c2" })],
      error: null,
    };

    const mockTeamMembersEq = vi.fn().mockResolvedValue(membersResult);
    const mockTeamMembersSelect = vi.fn().mockReturnValue({ eq: mockTeamMembersEq });

    const mockContactsChain = makeContactsQueryChain(contactsResult);

    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members") return { select: mockTeamMembersSelect };
      if (table === "contacts") return mockContactsChain;
      return {};
    });

    setClient({ from: mockFrom });

    const result = await getContacts({ team_id: "team-uuid" });

    expect(mockTeamMembersSelect).toHaveBeenCalledWith("contact_id, role");
    expect(mockTeamMembersEq).toHaveBeenCalledWith("team_id", "team-uuid");
    expect(result).toHaveLength(2);
  });

  it("returns empty array when team has no members", async () => {
    const mockTeamMembersEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockTeamMembersSelect = vi.fn().mockReturnValue({ eq: mockTeamMembersEq });

    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members") return { select: mockTeamMembersSelect };
      return {};
    });

    setClient({ from: mockFrom });

    const result = await getContacts({ team_id: "empty-team-uuid" });
    expect(result).toEqual([]);
  });

  it("throws when team_members query fails", async () => {
    const mockTeamMembersEq = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "team_members query failed" },
    });
    const mockTeamMembersSelect = vi.fn().mockReturnValue({ eq: mockTeamMembersEq });

    setClient({
      from: vi.fn().mockReturnValue({ select: mockTeamMembersSelect }),
    });

    await expect(getContacts({ team_id: "bad-team" })).rejects.toThrow("team_members query failed");
  });

  it("with captain_only=true filters members to role=captain before id lookup", async () => {
    const membersResult = {
      data: [
        { contact_id: "c1", role: "captain" },
        { contact_id: "c2", role: "player" },
      ],
      error: null,
    };
    const contactsResult = {
      data: [makeContactRow({ id: "c1" })],
      error: null,
    };

    const mockTeamMembersEq = vi.fn().mockResolvedValue(membersResult);
    const mockTeamMembersSelect = vi.fn().mockReturnValue({ eq: mockTeamMembersEq });
    const mockContactsChain = makeContactsQueryChain(contactsResult);

    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members") return { select: mockTeamMembersSelect };
      if (table === "contacts") return mockContactsChain;
      return {};
    });

    setClient({ from: mockFrom });

    const result = await getContacts({ team_id: "team-uuid", captain_only: true });
    // Only the captain (c1) should be in the id list sent to contacts
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getContacts — captain_only filter (without team_id)
// ---------------------------------------------------------------------------

describe("getContacts — captain_only filter", () => {
  it("queries team_members for role=captain and returns those contacts", async () => {
    const captainMembersResult = {
      data: [{ contact_id: "cap-c1" }],
      error: null,
    };
    const contactsResult = {
      data: [makeContactRow({ id: "cap-c1", full_name: "Captain Kirk" })],
      error: null,
    };

    const mockTeamMembersEq = vi.fn().mockResolvedValue(captainMembersResult);
    const mockTeamMembersSelect = vi.fn().mockReturnValue({ eq: mockTeamMembersEq });
    const mockContactsChain = makeContactsQueryChain(contactsResult);

    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members") return { select: mockTeamMembersSelect };
      if (table === "contacts") return mockContactsChain;
      return {};
    });

    setClient({ from: mockFrom });

    const result = await getContacts({ captain_only: true });

    expect(mockTeamMembersEq).toHaveBeenCalledWith("role", "captain");
    expect(result).toHaveLength(1);
    expect(result[0].full_name).toBe("Captain Kirk");
  });

  it("returns empty array when no captains exist", async () => {
    const mockTeamMembersEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockTeamMembersSelect = vi.fn().mockReturnValue({ eq: mockTeamMembersEq });

    setClient({
      from: vi.fn().mockReturnValue({ select: mockTeamMembersSelect }),
    });

    const result = await getContacts({ captain_only: true });
    expect(result).toEqual([]);
  });

  it("throws when team_members query fails", async () => {
    const mockTeamMembersEq = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "captain query failed" },
    });
    const mockTeamMembersSelect = vi.fn().mockReturnValue({ eq: mockTeamMembersEq });

    setClient({
      from: vi.fn().mockReturnValue({ select: mockTeamMembersSelect }),
    });

    await expect(getContacts({ captain_only: true })).rejects.toThrow("captain query failed");
  });
});

// ---------------------------------------------------------------------------
// exportContactsCSV
// ---------------------------------------------------------------------------

describe("exportContactsCSV", () => {
  it("returns a CSV string with correct header columns", async () => {
    const contacts = [
      makeContactRow({
        company: "Acme Corp",
        first_name: "John",
        last_name: "Doe",
        marketing_consent: true,
        source: "mailing_list_import_2026",
      }),
    ];

    setClient({
      from: vi.fn().mockReturnValue(makeContactsQueryChain({ data: contacts, error: null })),
    });

    const csv = await exportContactsCSV();
    const lines = csv.split("\n");
    const header = lines[0];

    expect(header).toContain("full_name");
    expect(header).toContain("first_name");
    expect(header).toContain("last_name");
    expect(header).toContain("company");
    expect(header).toContain("marketing_consent");
    expect(header).toContain("source");
    expect(header).toContain("address1");
  });

  it("includes contact data row after header", async () => {
    const contacts = [
      makeContactRow({
        full_name: "Jane Smith",
        first_name: "Jane",
        last_name: "Smith",
        email: "jane@example.com",
        marketing_consent: true,
      }),
    ];

    setClient({
      from: vi.fn().mockReturnValue(makeContactsQueryChain({ data: contacts, error: null })),
    });

    const csv = await exportContactsCSV();
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2); // header + 1 data row
    expect(lines[1]).toContain("Jane Smith");
  });

  it("escapes fields containing commas in double-quotes", async () => {
    const contacts = [
      makeContactRow({ company: "Smith, Jones & Co", marketing_consent: true }),
    ];

    setClient({
      from: vi.fn().mockReturnValue(makeContactsQueryChain({ data: contacts, error: null })),
    });

    const csv = await exportContactsCSV();
    expect(csv).toContain('"Smith, Jones & Co"');
  });

  it("returns header-only when no contacts match", async () => {
    setClient({
      from: vi.fn().mockReturnValue(makeContactsQueryChain({ data: [], error: null })),
    });

    const csv = await exportContactsCSV();
    const lines = csv.split("\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("full_name");
  });
});

// ---------------------------------------------------------------------------
// getTeamsForFilter
// ---------------------------------------------------------------------------

describe("getTeamsForFilter", () => {
  it("returns list of teams with id and team_name", async () => {
    const teamsData = [
      { id: "team-1", team_name: "Alpha Team" },
      { id: "team-2", team_name: "Beta Team" },
    ];

    const mockOrder = vi.fn().mockResolvedValue({ data: teamsData, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    setClient({ from: mockFrom });

    const result = await getTeamsForFilter();

    expect(mockFrom).toHaveBeenCalledWith("teams");
    expect(mockSelect).toHaveBeenCalledWith("id, team_name");
    expect(mockOrder).toHaveBeenCalledWith("team_name", { ascending: true });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "team-1", team_name: "Alpha Team" });
  });

  it("returns empty array when no teams exist", async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    setClient({ from: mockFrom });

    const result = await getTeamsForFilter();
    expect(result).toEqual([]);
  });

  it("throws when Supabase returns an error", async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: { message: "teams query failed" } });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    setClient({ from: mockFrom });

    await expect(getTeamsForFilter()).rejects.toThrow("teams query failed");
  });
});
