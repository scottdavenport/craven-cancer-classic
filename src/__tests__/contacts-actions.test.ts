/**
 * S9-5 + S10-2: Admin contacts server actions — contract tests
 *
 * Covers:
 * - getContacts: basic filters, team_id filter, captain_only filter, error paths
 * - exportContactsCSV: always uses marketing_consent=true gate, header columns
 * - getTeamsForFilter: returns id+team_name list
 * - createContact (S10-2 RED): happy path, validation errors, duplicate email, unauthorized
 * - updateContact (S10-2 RED): happy path partial update, normalization, duplicate email, unauthorized
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
import * as adminModule from "@/lib/supabase/admin";
import {
  getContacts,
  exportContactsCSV,
  getTeamsForFilter,
  createContact,
  updateContact,
  deleteContact,
  bulkUpdateContacts,
  bulkDeleteContacts,
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
      if (table === "contacts" || table === "contacts_active") return mockContactsChain;
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
      if (table === "contacts" || table === "contacts_active") return mockContactsChain;
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
      if (table === "contacts" || table === "contacts_active") return mockContactsChain;
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

// ---------------------------------------------------------------------------
// S10-2 (RED): createContact
// ---------------------------------------------------------------------------

/** Minimal valid ContactInput for create tests. */
function makeValidInput(overrides: Record<string, unknown> = {}) {
  return {
    salutation: null,
    first_name: "Jane",
    last_name: "Smith",
    company: null,
    email: "jane@example.com",
    phone: null,
    type: "player" as const,
    address1: null,
    address2: null,
    city: null,
    state: null,
    zip: null,
    marketing_consent: false,
    notes: null,
    year_first_seen: 2026,
    ...overrides,
  };
}

/** Build a mock Supabase insert chain for the contacts table. */
function makeInsertChain(result: { data: unknown[] | null; error: null | { message: string; code?: string } }) {
  const chain: Record<string, unknown> = {};
  chain.then = (resolve: (v: typeof result) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  chain.select = vi.fn().mockReturnValue(chain);
  return {
    insert: vi.fn().mockReturnValue(chain),
  };
}

/** Build a mock Supabase update chain for the contacts table. */
function makeUpdateChain(result: { data: unknown[] | null; error: null | { message: string; code?: string } }) {
  const eqResult: Record<string, unknown> = {};
  eqResult.then = (resolve: (v: typeof result) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return {
    update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(eqResult) }),
  };
}

describe("createContact (S10-2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
    // Reset requireAdmin to default passing state
    vi.mocked(adminModule.requireAdmin).mockResolvedValue({ role: "admin" } as ReturnType<typeof adminModule.requireAdmin> extends Promise<infer T> ? T : never);
  });

  describe("happy path", () => {
    it("returns { id } on successful create with valid input", async () => {
      const newRow = [{ id: "new-contact-uuid" }];
      setClient({
        from: vi.fn().mockReturnValue(makeInsertChain({ data: newRow, error: null })),
      });

      const result = await createContact(makeValidInput());

      expect(result).toMatchObject({ id: "new-contact-uuid" });
    });

    it("derives full_name from first + last before inserting", async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: "uuid-1" }], error: null }),
      });
      setClient({ from: vi.fn().mockReturnValue({ insert: mockInsert }) });

      await createContact(makeValidInput({ first_name: "John", last_name: "Doe", company: null }));

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ full_name: "John Doe" }),
        ])
      );
    });

    it("stores email lowercased and trimmed", async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: "uuid-1" }], error: null }),
      });
      setClient({ from: vi.fn().mockReturnValue({ insert: mockInsert }) });

      await createContact(makeValidInput({ email: "  JANE@EXAMPLE.COM  " }));

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ email: "jane@example.com" }),
        ])
      );
    });

    it("stores phone in E.164 format when a valid US number is provided", async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: "uuid-1" }], error: null }),
      });
      setClient({ from: vi.fn().mockReturnValue({ insert: mockInsert }) });

      // (202) 555-1234 — real DC-area number that passes isValidPhoneNumber
      await createContact(makeValidInput({ phone: "(202) 555-1234" }));

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ phone: "+12025551234" }),
        ])
      );
    });
  });

  describe("validation errors", () => {
    it("returns error when first, last, AND company are all null/empty", async () => {
      setClient({ from: vi.fn() });

      const result = await createContact(
        makeValidInput({ first_name: null, last_name: null, company: null })
      );

      expect(result).toMatchObject({ error: "Contact needs a first/last name or a company" });
    });

    it("returns error when first, last, AND company are all empty strings", async () => {
      setClient({ from: vi.fn() });

      const result = await createContact(
        makeValidInput({ first_name: "", last_name: "", company: "" })
      );

      expect(result).toMatchObject({ error: "Contact needs a first/last name or a company" });
    });

    it("returns error when email format is invalid", async () => {
      setClient({ from: vi.fn() });

      const result = await createContact(makeValidInput({ email: "not-an-email" }));

      expect(result).toMatchObject({ error: "Invalid email format" });
    });

    it("returns error when phone is unparseable garbage", async () => {
      setClient({ from: vi.fn() });

      const result = await createContact(makeValidInput({ phone: "garbage" }));

      expect(result).toMatchObject({ error: "Invalid phone number" });
    });

    it("returns error when ZIP does not match US format", async () => {
      setClient({ from: vi.fn() });

      const result = await createContact(makeValidInput({ zip: "ABCDE" }));

      expect(result).toMatchObject({ error: expect.stringMatching(/ZIP must be 5 digits/) });
    });
  });

  describe("duplicate email (Postgres 23505)", () => {
    it("returns user-friendly error when unique constraint fires on email", async () => {
      setClient({
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "duplicate key", code: "23505" },
            }),
          }),
        }),
      });

      const result = await createContact(makeValidInput({ email: "dupe@example.com" }));

      expect(result).toMatchObject({ error: "Email already in use by another contact" });
    });
  });

  describe("authorization", () => {
    it("propagates error when requireAdmin throws (non-admin user)", async () => {
      vi.mocked(adminModule.requireAdmin).mockRejectedValue(new Error("Unauthorized"));
      setClient({ from: vi.fn() });

      await expect(createContact(makeValidInput())).rejects.toThrow("Unauthorized");
    });
  });
});

// ---------------------------------------------------------------------------
// S10-2 (RED): updateContact
// ---------------------------------------------------------------------------

describe("updateContact (S10-2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
    vi.mocked(adminModule.requireAdmin).mockResolvedValue({ role: "admin" } as ReturnType<typeof adminModule.requireAdmin> extends Promise<infer T> ? T : never);
  });

  describe("happy path", () => {
    it("returns { ok: true } on successful partial update", async () => {
      setClient({
        from: vi.fn().mockReturnValue(makeUpdateChain({ data: null, error: null })),
      });

      const result = await updateContact("contact-uuid", { type: "sponsor" });

      expect(result).toEqual({ ok: true });
    });

    it("normalizes email to lowercase on update", async () => {
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      setClient({ from: vi.fn().mockReturnValue({ update: mockUpdate }) });

      await updateContact("contact-uuid", { email: "NEW@EXAMPLE.COM" });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ email: "new@example.com" })
      );
    });
  });

  describe("duplicate email (Postgres 23505)", () => {
    it("returns user-friendly error when unique constraint fires on email update", async () => {
      setClient({
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "duplicate key", code: "23505" },
            }),
          }),
        }),
      });

      const result = await updateContact("contact-uuid", { email: "taken@example.com" });

      expect(result).toMatchObject({ error: "Email already in use by another contact" });
    });
  });

  describe("authorization", () => {
    it("propagates error when requireAdmin throws (non-admin user)", async () => {
      vi.mocked(adminModule.requireAdmin).mockRejectedValue(new Error("Unauthorized"));
      setClient({ from: vi.fn() });

      await expect(updateContact("contact-uuid", { type: "donor" })).rejects.toThrow("Unauthorized");
    });
  });
});

// ---------------------------------------------------------------------------
// S10-3 (RED): deleteContact
// ---------------------------------------------------------------------------

/**
 * Build a mock Supabase client for softDelete-style calls.
 *
 * softDelete does:
 *   1. supabase.auth.getUser()
 *   2. supabase.from(table).update({ deleted_at, deleted_by }).eq("id", id)
 */
function makeSoftDeleteClient(overrides: {
  user?: { id: string } | null;
  updateError?: { message: string } | null;
  fromSpy?: ReturnType<typeof vi.fn>;
}) {
  const user = overrides.user !== undefined ? overrides.user : { id: "admin-user-uuid" };

  const eqResult: Record<string, unknown> = {};
  eqResult.then = (
    resolve: (v: { error: typeof overrides.updateError }) => unknown,
    reject: (e: unknown) => unknown
  ) => Promise.resolve({ error: overrides.updateError ?? null }).then(resolve, reject);

  const mockEq = vi.fn().mockReturnValue(eqResult);
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

  const fromSpy = overrides.fromSpy ?? vi.fn().mockReturnValue({ update: mockUpdate });

  return {
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
      from: fromSpy,
    },
    mockUpdate,
    mockEq,
  };
}

describe("deleteContact (S10-3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
    vi.mocked(adminModule.requireAdmin).mockResolvedValue(
      { role: "admin" } as ReturnType<typeof adminModule.requireAdmin> extends Promise<infer T> ? T : never
    );
  });

  describe("happy path", () => {
    it("returns { ok: true } when soft-delete succeeds", async () => {
      const { client } = makeSoftDeleteClient({});
      setClient(client);

      const result = await deleteContact("contact-uuid-1");

      expect(result).toEqual({ ok: true });
    });

    it("calls update on contacts table with deleted_at ISO string and deleted_by = auth user id", async () => {
      const { client, mockUpdate, mockEq } = makeSoftDeleteClient({
        user: { id: "admin-user-uuid" },
      });
      setClient(client);

      await deleteContact("contact-uuid-1");

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_by: "admin-user-uuid",
          deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        })
      );
      // deleted_at must be a parseable ISO timestamp
      const payload = mockUpdate.mock.calls[0][0] as { deleted_at: string };
      expect(() => new Date(payload.deleted_at)).not.toThrow();
      expect(isNaN(new Date(payload.deleted_at).getTime())).toBe(false);

      expect(mockEq).toHaveBeenCalledWith("id", "contact-uuid-1");
    });

    it("does NOT touch the team_members table", async () => {
      const fromSpy = vi.fn((table: string) => {
        if (table === "contacts") {
          const eqResult: Record<string, unknown> = {};
          eqResult.then = (resolve: (v: { error: null }) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve({ error: null }).then(resolve, reject);
          return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(eqResult) }) };
        }
        return {};
      });

      setClient({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-user-uuid" } }, error: null }),
        },
        from: fromSpy,
      });

      await deleteContact("contact-uuid-1");

      const calledTables = (fromSpy.mock.calls as [string][]).map(([t]) => t);
      expect(calledTables).not.toContain("team_members");
    });
  });

  describe("unauthenticated", () => {
    it("returns { error } matching /unauthenticated/i when auth.getUser returns no user", async () => {
      const { client } = makeSoftDeleteClient({ user: null });
      setClient(client);

      const result = await deleteContact("contact-uuid-1");

      expect(result).toMatchObject({ error: expect.stringMatching(/unauthenticated/i) });
    });
  });

  describe("non-admin", () => {
    it("propagates error when requireAdmin throws", async () => {
      vi.mocked(adminModule.requireAdmin).mockRejectedValue(new Error("Unauthorized"));
      const { client } = makeSoftDeleteClient({});
      setClient(client);

      await expect(deleteContact("contact-uuid-1")).rejects.toThrow("Unauthorized");
    });
  });

  describe("DB error", () => {
    it("returns { error: message } when supabase update fails", async () => {
      const { client } = makeSoftDeleteClient({
        updateError: { message: "db write failed" },
      });
      setClient(client);

      const result = await deleteContact("contact-uuid-1");

      expect(result).toMatchObject({ error: "db write failed" });
    });
  });
});

// ---------------------------------------------------------------------------
// S10-4 (RED): bulkUpdateContacts
// ---------------------------------------------------------------------------

/**
 * Build a mock Supabase client for bulkUpdateContacts.
 *
 * bulkUpdateContacts does:
 *   supabase.from("contacts").update(update).in("id", ids)
 *
 * The chain: from() → { update() → { in() → Promise<{error}> } }
 */
function makeBulkUpdateClient(overrides: {
  error?: { message: string; code?: string } | null;
} = {}) {
  const inResult: Record<string, unknown> = {};
  inResult.then = (
    resolve: (v: { error: typeof overrides.error; count?: number | null }) => unknown,
    reject: (e: unknown) => unknown
  ) => Promise.resolve({ error: overrides.error ?? null, count: null }).then(resolve, reject);

  const mockIn = vi.fn().mockReturnValue(inResult);
  const mockUpdate = vi.fn().mockReturnValue({ in: mockIn });
  const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

  return { client: { from: mockFrom }, mockFrom, mockUpdate, mockIn };
}

/**
 * Build a mock Supabase client for bulkDeleteContacts.
 *
 * bulkDeleteContacts does a single batched soft-delete:
 *   supabase.auth.getUser()
 *   supabase.from("contacts").update({ deleted_at, deleted_by }, { count: "exact" }).in("id", ids)
 *
 * The chain: from() → { update() → { in() → Promise<{error, count}> } }
 */
function makeBulkDeleteClient(overrides: {
  user?: { id: string } | null;
  error?: { message: string } | null;
  count?: number | null;
  fromSpy?: ReturnType<typeof vi.fn>;
} = {}) {
  const user = overrides.user !== undefined ? overrides.user : { id: "admin-user-uuid" };
  const returnedCount = overrides.count !== undefined ? overrides.count : null;

  const inResult: Record<string, unknown> = {};
  inResult.then = (
    resolve: (v: { error: typeof overrides.error; count: number | null }) => unknown,
    reject: (e: unknown) => unknown
  ) => Promise.resolve({ error: overrides.error ?? null, count: returnedCount }).then(resolve, reject);

  const mockIn = vi.fn().mockReturnValue(inResult);
  const mockUpdate = vi.fn().mockReturnValue({ in: mockIn });

  const fromSpy =
    overrides.fromSpy ??
    vi.fn().mockReturnValue({ update: mockUpdate });

  return {
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
      from: fromSpy,
    },
    mockIn,
    mockUpdate,
    fromSpy,
  };
}

describe("bulkUpdateContacts (S10-4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
    vi.mocked(adminModule.requireAdmin).mockResolvedValue(
      { role: "admin" } as ReturnType<typeof adminModule.requireAdmin> extends Promise<infer T> ? T : never
    );
  });

  describe("happy path", () => {
    it("returns { updated: 3 } and calls supabase with correct update payload and ids", async () => {
      const { client, mockFrom, mockUpdate, mockIn } = makeBulkUpdateClient();
      setClient(client);

      const ids = ["id-1", "id-2", "id-3"];
      const result = await bulkUpdateContacts(ids, { type: "donor" });

      expect(result).toEqual({ updated: 3 });
      expect(mockFrom).toHaveBeenCalledWith("contacts");
      expect(mockUpdate).toHaveBeenCalledWith({ type: "donor" });
      expect(mockIn).toHaveBeenCalledWith("id", ids);
    });

    it("calls supabase with only marketing_consent when update contains only that field", async () => {
      const { client, mockUpdate } = makeBulkUpdateClient();
      setClient(client);

      await bulkUpdateContacts(["id-1"], { marketing_consent: true });

      expect(mockUpdate).toHaveBeenCalledWith({ marketing_consent: true });
      // Verify type is NOT in the payload
      const payload = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
      expect(payload).not.toHaveProperty("type");
    });
  });

  describe("no-op for empty ids", () => {
    it("returns { updated: 0 } without calling supabase when ids is empty", async () => {
      const { client, mockFrom } = makeBulkUpdateClient();
      setClient(client);

      const result = await bulkUpdateContacts([], { type: "donor" });

      expect(result).toEqual({ updated: 0 });
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe("cap enforcement", () => {
    it("returns { error: /too many/i } and does not call supabase when ids.length > 500", async () => {
      const { client, mockFrom } = makeBulkUpdateClient();
      setClient(client);

      const ids = Array.from({ length: 501 }, (_, i) => `id-${i}`);
      const result = await bulkUpdateContacts(ids, { type: "donor" });

      expect(result).toMatchObject({ error: expect.stringMatching(/too many/i) });
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe("empty update object", () => {
    it("returns { error: /no fields/i } and does not call supabase when update is empty", async () => {
      const { client, mockFrom } = makeBulkUpdateClient();
      setClient(client);

      const result = await bulkUpdateContacts(["id-1", "id-2"], {});

      expect(result).toMatchObject({ error: expect.stringMatching(/no fields/i) });
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe("DB error propagation", () => {
    it("returns { error: message } when supabase returns a DB error", async () => {
      const { client } = makeBulkUpdateClient({ error: { message: "bulk update failed" } });
      setClient(client);

      const result = await bulkUpdateContacts(["id-1"], { type: "other" });

      expect(result).toMatchObject({ error: "bulk update failed" });
    });
  });

  describe("authorization", () => {
    it("propagates error when requireAdmin throws", async () => {
      vi.mocked(adminModule.requireAdmin).mockRejectedValue(new Error("Unauthorized"));
      const { client } = makeBulkUpdateClient();
      setClient(client);

      await expect(bulkUpdateContacts(["id-1"], { type: "donor" })).rejects.toThrow("Unauthorized");
    });
  });
});

// ---------------------------------------------------------------------------
// S10-4 (RED): bulkDeleteContacts
// ---------------------------------------------------------------------------

describe("bulkDeleteContacts (S10-4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
    vi.mocked(adminModule.requireAdmin).mockResolvedValue(
      { role: "admin" } as ReturnType<typeof adminModule.requireAdmin> extends Promise<infer T> ? T : never
    );
  });

  describe("happy path", () => {
    it("returns { deleted: 3 } and calls update with deleted_at/deleted_by via .in('id', ids)", async () => {
      const { client, mockUpdate, mockIn } = makeBulkDeleteClient({ user: { id: "admin-user-uuid" } });
      setClient(client);

      const ids = ["id-1", "id-2", "id-3"];
      const result = await bulkDeleteContacts(ids);

      expect(result).toEqual({ deleted: 3 });

      // Verify the update payload contains deleted_at (ISO string) and deleted_by
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_by: "admin-user-uuid",
          deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        }),
        expect.anything()  // count: "exact" option
      );
      const payload = (mockUpdate.mock.calls[0] as [{ deleted_at: string }])[0];
      expect(isNaN(new Date(payload.deleted_at).getTime())).toBe(false);

      // Verify ids passed through to .in()
      expect(mockIn).toHaveBeenCalledWith("id", ids);
    });
  });

  describe("no-op for empty ids", () => {
    it("returns { deleted: 0 } without calling supabase when ids is empty", async () => {
      const { client, fromSpy } = makeBulkDeleteClient();
      setClient(client);

      const result = await bulkDeleteContacts([]);

      expect(result).toEqual({ deleted: 0 });
      expect(fromSpy).not.toHaveBeenCalled();
    });
  });

  describe("cap enforcement", () => {
    it("returns { error: /too many/i } when ids.length > 500", async () => {
      const { client, fromSpy } = makeBulkDeleteClient();
      setClient(client);

      const ids = Array.from({ length: 501 }, (_, i) => `id-${i}`);
      const result = await bulkDeleteContacts(ids);

      expect(result).toMatchObject({ error: expect.stringMatching(/too many/i) });
      expect(fromSpy).not.toHaveBeenCalled();
    });
  });

  describe("team_members not touched", () => {
    it("never calls from('team_members') during bulk delete", async () => {
      const contactsInResult: Record<string, unknown> = {};
      contactsInResult.then = (resolve: (v: { error: null; count: number }) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve({ error: null, count: 2 }).then(resolve, reject);

      const fromSpy = vi.fn((table: string) => {
        if (table === "contacts") {
          return {
            update: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue(contactsInResult) }),
          };
        }
        // Any call to another table should not happen
        return { update: vi.fn() };
      });

      setClient({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-user-uuid" } }, error: null }),
        },
        from: fromSpy,
      });

      await bulkDeleteContacts(["id-1", "id-2"]);

      const calledTables = (fromSpy.mock.calls as [string][]).map(([t]) => t);
      expect(calledTables).not.toContain("team_members");
    });
  });

  describe("DB error propagation", () => {
    it("returns { error: message } when supabase returns a DB error", async () => {
      const { client } = makeBulkDeleteClient({ error: { message: "bulk delete failed" } });
      setClient(client);

      const result = await bulkDeleteContacts(["id-1", "id-2"]);

      expect(result).toMatchObject({ error: "bulk delete failed" });
    });
  });
});
