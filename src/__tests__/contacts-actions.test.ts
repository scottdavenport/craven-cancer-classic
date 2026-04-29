/**
 * S9-5 + S10-2: Admin contacts server actions — contract tests
 *
 * Covers:
 * - getContacts: basic filters, team_id filter, captain_only filter, error paths
 * - exportContactsCSV: always uses marketing_consent=true gate, header columns
 * - getTeamsForFilter: returns id+team_name list
 * - createContact (S10-2 RED): happy path, validation errors, duplicate email, unauthorized
 * - updateContact (S10-2 RED): happy path partial update, normalization, duplicate email, unauthorized
 *
 * Sprint 31 additions (RED — fail until Flux/Bolt deliver #265 #268 #269 #270):
 * - types[] round-trip (create + update)
 * - volunteer type accepted
 * - getContacts filter uses .contains('types', [type]) not .eq('type', type)
 * - bulkSetContactTypes / bulkAddContactType / bulkRemoveContactType
 * - type-removal guard (team_members, sponsor_contacts, volunteer no-guard)
 * - show_on_wall round-trip
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
  // Sprint 31 — delivered in #265
  bulkSetContactTypes,
  bulkAddContactType,
  bulkRemoveContactType,
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

// ---------------------------------------------------------------------------
// Sprint 31 (RED): types[] round-trip on createContact
// Fails until Flux adds `types` column + ContactInput.types + show_on_wall
// ---------------------------------------------------------------------------

/**
 * Sprint 31 ContactInput — extends the existing shape with multi-type fields.
 * Cast as `any` input to avoid TS errors before the source is updated.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type S31ContactInput = any;

describe("Sprint 31 — createContact types[] round-trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
    vi.mocked(adminModule.requireAdmin).mockResolvedValue({ role: "admin" } as ReturnType<typeof adminModule.requireAdmin> extends Promise<infer T> ? T : never);
  });

  it("saves types: ['volunteer'] and reads back ['volunteer'] (volunteer round-trip)", async () => {
    const insertedRow = { id: "vol-uuid-1" };
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [insertedRow], error: null }),
    });
    setClient({ from: vi.fn().mockReturnValue({ insert: mockInsert }) });

    const input: S31ContactInput = {
      salutation: null,
      first_name: "Val",
      last_name: "Volunteer",
      company: null,
      email: "val@example.com",
      phone: null,
      // Sprint 31: types array replaces single `type`
      types: ["volunteer"],
      address1: null,
      address2: null,
      city: null,
      state: null,
      zip: null,
      marketing_consent: false,
      notes: null,
      year_first_seen: 2026,
    };

    const result = await createContact(input);

    // Must not return an error
    expect(result).not.toHaveProperty("error");
    expect(result).toMatchObject({ id: expect.any(String) });

    // The insert payload must contain types: ['volunteer']
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ types: ["volunteer"] }),
      ])
    );
  });

  it("saves types: ['player', 'sponsor'] and inserts both in the types array", async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ id: "ps-uuid-1" }], error: null }),
    });
    setClient({ from: vi.fn().mockReturnValue({ insert: mockInsert }) });

    const input: S31ContactInput = {
      salutation: null,
      first_name: "Lacie",
      last_name: "Doe",
      company: "Doe Corp",
      email: "lacie@example.com",
      phone: null,
      types: ["player", "sponsor"],
      address1: null,
      address2: null,
      city: null,
      state: null,
      zip: null,
      marketing_consent: false,
      notes: null,
      year_first_seen: 2026,
    };

    const result = await createContact(input);

    expect(result).not.toHaveProperty("error");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ types: ["player", "sponsor"] }),
      ])
    );
  });
});

// ---------------------------------------------------------------------------
// Sprint 31 (RED): types[] round-trip on updateContact
// ---------------------------------------------------------------------------

describe("Sprint 31 — updateContact types[] round-trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
    vi.mocked(adminModule.requireAdmin).mockResolvedValue({ role: "admin" } as ReturnType<typeof adminModule.requireAdmin> extends Promise<infer T> ? T : never);
  });

  it("updates types from ['player'] to ['player', 'volunteer'] and writes both", async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    setClient({ from: vi.fn().mockReturnValue({ update: mockUpdate }) });

    const result = await updateContact("contact-uuid", {
      types: ["player", "volunteer"],
    } as S31ContactInput);

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ types: ["player", "volunteer"] })
    );
  });
});

// ---------------------------------------------------------------------------
// Sprint 31 (RED): show_on_wall round-trip
// Fails until Flux adds show_on_wall column to contacts
// ---------------------------------------------------------------------------

describe("Sprint 31 — show_on_wall round-trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
    vi.mocked(adminModule.requireAdmin).mockResolvedValue({ role: "admin" } as ReturnType<typeof adminModule.requireAdmin> extends Promise<infer T> ? T : never);
  });

  it("creates a contact with show_on_wall: false and inserts that value", async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ id: "donor-uuid-1" }], error: null }),
    });
    setClient({ from: vi.fn().mockReturnValue({ insert: mockInsert }) });

    const input: S31ContactInput = {
      salutation: null,
      first_name: "Don",
      last_name: "Donor",
      company: null,
      email: "don@example.com",
      phone: null,
      types: ["donor"],
      show_on_wall: false,
      recognition_name: "The Donor Family",
      address1: null,
      address2: null,
      city: null,
      state: null,
      zip: null,
      marketing_consent: false,
      notes: null,
      year_first_seen: 2026,
    };

    const result = await createContact(input);

    expect(result).not.toHaveProperty("error");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ show_on_wall: false }),
      ])
    );
  });

  it("creates a contact without specifying show_on_wall and the DB applies the DEFAULT true", async () => {
    // The DB has DEFAULT true on show_on_wall. The server action should NOT
    // explicitly set show_on_wall=undefined/null when it's omitted — it should
    // omit the field entirely so the DB default applies.
    const capturedPayload: Record<string, unknown>[] = [];
    const mockInsert = vi.fn().mockImplementation((payload: Record<string, unknown>[]) => {
      capturedPayload.push(...payload);
      return {
        select: vi.fn().mockResolvedValue({ data: [{ id: "donor-uuid-2" }], error: null }),
      };
    });
    setClient({ from: vi.fn().mockReturnValue({ insert: mockInsert }) });

    const input: S31ContactInput = {
      salutation: null,
      first_name: "Ann",
      last_name: "Other",
      company: null,
      email: "ann@example.com",
      phone: null,
      types: ["donor"],
      // show_on_wall NOT specified — DB default true should apply
      address1: null,
      address2: null,
      city: null,
      state: null,
      zip: null,
      marketing_consent: false,
      notes: null,
      year_first_seen: 2026,
    };

    await createContact(input);

    // The inserted row must not explicitly set show_on_wall to null/false
    // (which would override the DB default). It should either be omitted or true.
    const row = capturedPayload[0] as Record<string, unknown>;
    if ("show_on_wall" in row) {
      // If the action does write it, it must be true (the default)
      expect(row.show_on_wall).toBe(true);
    }
    // If not present at all, DB default applies — also acceptable.
  });

  it("updates show_on_wall to false via updateContact", async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    setClient({ from: vi.fn().mockReturnValue({ update: mockUpdate }) });

    const result = await updateContact("donor-uuid", { show_on_wall: false } as S31ContactInput);

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ show_on_wall: false })
    );
  });
});

// ---------------------------------------------------------------------------
// Sprint 31 (RED): getContacts filter uses .contains('types', [type])
// Fails until Flux updates the getContacts query
// ---------------------------------------------------------------------------

describe("Sprint 31 — getContacts filter uses .contains not .eq", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
    vi.mocked(adminModule.requireAdmin).mockResolvedValue({ role: "admin" } as ReturnType<typeof adminModule.requireAdmin> extends Promise<infer T> ? T : never);
  });

  it("calls .contains('types', ['player']) when filter.type is 'player'", async () => {
    // Build a spy chain that records which methods were called
    const containsSpy = vi.fn().mockReturnThis();
    const eqSpy = vi.fn().mockReturnThis();

    const chain: Record<string, unknown> = {};
    chain.then = (resolve: (v: { data: unknown[]; error: null }) => unknown, _reject: unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve as (v: unknown) => unknown);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.eq = eqSpy.mockReturnValue(chain);
    chain.contains = containsSpy.mockReturnValue(chain);
    chain.ilike = vi.fn().mockReturnValue(chain);
    chain.in = vi.fn().mockReturnValue(chain);

    setClient({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(chain) }),
    });

    await getContacts({ type: "player" as "player" | "sponsor" | "donor" | "other" });

    // Sprint 31 contract: must call .contains('types', ['player']), not .eq('type', 'player')
    expect(containsSpy).toHaveBeenCalledWith("types", ["player"]);
    // Must NOT use the old singular eq('type', ...) for type filtering
    const typeEqCalls = (eqSpy.mock.calls as [string, unknown][]).filter(
      ([col]) => col === "type"
    );
    expect(typeEqCalls).toHaveLength(0);
  });

  it("filter type 'volunteer' uses .contains('types', ['volunteer'])", async () => {
    const containsSpy = vi.fn().mockReturnThis();

    const chain: Record<string, unknown> = {};
    chain.then = (resolve: (v: { data: unknown[]; error: null }) => unknown, _reject: unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve as (v: unknown) => unknown);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.contains = containsSpy.mockReturnValue(chain);
    chain.ilike = vi.fn().mockReturnValue(chain);
    chain.in = vi.fn().mockReturnValue(chain);

    setClient({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(chain) }),
    });

    // 'volunteer' is not yet in ContactFilter.type — cast to any for RED test
    await getContacts({ type: "volunteer" as S31ContactInput });

    expect(containsSpy).toHaveBeenCalledWith("types", ["volunteer"]);
  });
});

// ---------------------------------------------------------------------------
// Sprint 31 (RED): type-removal guard on updateContact
// Fails until Flux adds the guard logic to updateContact
// ---------------------------------------------------------------------------

describe("Sprint 31 — type-removal guard (updateContact)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
    vi.mocked(adminModule.requireAdmin).mockResolvedValue({ role: "admin" } as ReturnType<typeof adminModule.requireAdmin> extends Promise<infer T> ? T : never);
  });

  it("blocks Player removal when contact is in team_members — returns error with team name", async () => {
    // Scenario: contact was a player (types: ['player']); admin tries to set types: ['donor']
    // team_members has a row for this contact_id with team name "Team Mulligans"
    const teamMembersResult = {
      data: [{ contact_id: "c-uuid-1", team: { team_name: "Team Mulligans" } }],
      error: null,
    };

    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members") {
        const eqChain = vi.fn().mockResolvedValue(teamMembersResult);
        return { select: vi.fn().mockReturnValue({ eq: eqChain }) };
      }
      // contacts fetch for current types
      if (table === "contacts") {
        const singleResult = {
          data: { types: ["player"], full_name: "Lacie Doe" },
          error: null,
        };
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(singleResult) }),
          }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      return {};
    });

    setClient({ from: mockFrom });

    const result = await updateContact("c-uuid-1", { types: ["donor"] } as S31ContactInput);

    // Must return an error, not { ok: true }
    expect(result).toHaveProperty("error");
    const errMsg = (result as { error: string }).error;
    // Error must reference the team name
    expect(errMsg).toMatch(/Team Mulligans/i);
    // Error must mention removing from team first
    expect(errMsg).toMatch(/team|remove/i);
  });

  it("blocks Sponsor removal when contact is in sponsor_contacts — returns error referencing sponsorship", async () => {
    const sponsorContactsResult = {
      data: [{ contact_id: "c-uuid-2" }],
      error: null,
    };

    const mockFrom = vi.fn((table: string) => {
      if (table === "sponsor_contacts") {
        const eqChain = vi.fn().mockResolvedValue(sponsorContactsResult);
        return { select: vi.fn().mockReturnValue({ eq: eqChain }) };
      }
      if (table === "contacts") {
        const singleResult = {
          data: { types: ["sponsor"], full_name: "Big Corp Rep" },
          error: null,
        };
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(singleResult) }),
          }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      return {};
    });

    setClient({ from: mockFrom });

    const result = await updateContact("c-uuid-2", { types: ["donor"] } as S31ContactInput);

    expect(result).toHaveProperty("error");
    const errMsg = (result as { error: string }).error;
    expect(errMsg).toMatch(/sponsor|sponsorship|remove/i);
  });

  it("allows Volunteer removal — no join table guard fires", async () => {
    // Contact has types: ['volunteer']; admin removes it to types: ['other']
    // No team_members or sponsor_contacts check should block this.
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    const mockFrom = vi.fn((table: string) => {
      if (table === "contacts") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { types: ["volunteer"], full_name: "Val V" },
                error: null,
              }),
            }),
          }),
          update: mockUpdate,
        };
      }
      // If any guard accidentally queries team_members for volunteer — fail the test
      if (table === "team_members") {
        throw new Error("Guard should NOT query team_members when removing 'volunteer'");
      }
      return {};
    });

    setClient({ from: mockFrom });

    const result = await updateContact("c-uuid-3", { types: ["other"] } as S31ContactInput);

    // Volunteer removal should succeed
    expect(result).toEqual({ ok: true });
  });

  it("allows type change when no guard-relevant types are being removed", async () => {
    // Contact has types: ['donor', 'other']; admin keeps both — no guard needed
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    setClient({
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    });

    const result = await updateContact("c-uuid-4", { types: ["donor", "other"] } as S31ContactInput);

    expect(result).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// Sprint 31 (RED): bulkSetContactTypes
// Fails until Flux adds this action to actions.ts
// ---------------------------------------------------------------------------

describe("Sprint 31 — bulkSetContactTypes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
    vi.mocked(adminModule.requireAdmin).mockResolvedValue({ role: "admin" } as ReturnType<typeof adminModule.requireAdmin> extends Promise<infer T> ? T : never);
  });

  it("overwrites types for all selected contacts and returns { updated, blocked }", async () => {
    const inResult: Record<string, unknown> = {};
    inResult.then = (resolve: (v: { error: null; count: number }) => unknown, _reject: unknown) =>
      Promise.resolve({ error: null, count: 3 }).then(resolve as (v: unknown) => unknown);
    const mockIn = vi.fn().mockReturnValue(inResult);
    const mockUpdate = vi.fn().mockReturnValue({ in: mockIn });
    setClient({ from: vi.fn().mockReturnValue({ update: mockUpdate }) });

    // bulkSetContactTypes doesn't exist yet — this will throw at runtime
    const result = await bulkSetContactTypes(["id-1", "id-2", "id-3"], ["donor"]);

    expect(result).toMatchObject({ updated: 3, blocked: [] });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ types: ["donor"] })
    );
  });

  it("returns { error: /too many/i } when ids.length > 500", async () => {
    setClient({ from: vi.fn() });

    const ids = Array.from({ length: 501 }, (_, i) => `id-${i}`);
    const result = await bulkSetContactTypes(ids, ["player"]);

    expect(result).toMatchObject({ error: expect.stringMatching(/too many/i) });
  });

  it("returns { updated: 0, blocked: [] } when ids is empty", async () => {
    setClient({ from: vi.fn() });

    const result = await bulkSetContactTypes([], ["player"]);

    expect(result).toMatchObject({ updated: 0, blocked: [] });
  });
});

// ---------------------------------------------------------------------------
// Sprint 31 (RED): bulkAddContactType
// Fails until Flux adds this action to actions.ts
// ---------------------------------------------------------------------------

describe("Sprint 31 — bulkAddContactType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
    vi.mocked(adminModule.requireAdmin).mockResolvedValue({ role: "admin" } as ReturnType<typeof adminModule.requireAdmin> extends Promise<infer T> ? T : never);
  });

  it("adds a type to all selected contacts without duplication, returns { updated, blocked }", async () => {
    // The action reads current rows then updates each one individually.
    // We assert the returned shape is { updated: number, blocked: [] }.
    const seedRows = [
      { id: "id-1", types: ["player"] },
      { id: "id-2", types: ["sponsor"] },
    ];
    setClient({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: seedRows, error: null }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });

    const result = await bulkAddContactType(["id-1", "id-2"], "donor");

    // Contract: returns { updated, blocked }
    expect(result).toMatchObject({
      updated: expect.any(Number),
      blocked: expect.any(Array),
    });
    expect((result as { blocked: unknown[] }).blocked).toHaveLength(0);
  });

  it("returns { error: /too many/i } when ids.length > 500", async () => {
    setClient({ from: vi.fn(), rpc: vi.fn() });

    const ids = Array.from({ length: 501 }, (_, i) => `id-${i}`);
    const result = await bulkAddContactType(ids, "donor");

    expect(result).toMatchObject({ error: expect.stringMatching(/too many/i) });
  });
});

// ---------------------------------------------------------------------------
// Sprint 31 (RED): bulkRemoveContactType — happy path + blocked path
// Fails until Flux adds this action to actions.ts
// ---------------------------------------------------------------------------

describe("Sprint 31 — bulkRemoveContactType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
    vi.mocked(adminModule.requireAdmin).mockResolvedValue({ role: "admin" } as ReturnType<typeof adminModule.requireAdmin> extends Promise<infer T> ? T : never);
  });

  it("removes type from unblocked contacts, returns { updated, blocked: [] }", async () => {
    // No contacts are in team_members or sponsor_contacts — removal is clean
    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members" || table === "sponsor_contacts") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      if (table === "contacts") {
        return {
          update: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null, count: 3 }),
          }),
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                { id: "id-1", full_name: "A", types: ["player"] },
                { id: "id-2", full_name: "B", types: ["player"] },
                { id: "id-3", full_name: "C", types: ["player", "donor"] },
              ],
              error: null,
            }),
          }),
        };
      }
      return {};
    });

    setClient({ from: mockFrom });

    const result = await bulkRemoveContactType(["id-1", "id-2", "id-3"], "player");

    expect(result).toMatchObject({
      updated: expect.any(Number),
      blocked: [],
    });
  });

  it("returns blocked contacts when removal is guarded by team_members", async () => {
    // id-1 is in team_members (Player blocked); id-2 and id-3 are clean
    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ contact_id: "id-1", team: { team_name: "Team Eagles" } }],
              error: null,
            }),
          }),
        };
      }
      if (table === "sponsor_contacts") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      if (table === "contacts") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                { id: "id-1", full_name: "Blocked Person", types: ["player"] },
                { id: "id-2", full_name: "Clean A", types: ["player"] },
                { id: "id-3", full_name: "Clean B", types: ["player"] },
              ],
              error: null,
            }),
          }),
          update: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null, count: 2 }),
          }),
        };
      }
      return {};
    });

    setClient({ from: mockFrom });

    const result = await bulkRemoveContactType(["id-1", "id-2", "id-3"], "player");

    // Contract shape: { updated: number, blocked: [{id, reason}] }
    expect(result).toMatchObject({
      updated: expect.any(Number),
      blocked: expect.arrayContaining([
        expect.objectContaining({ id: "id-1", reason: expect.any(String) }),
      ]),
    });
    // 2 unblocked contacts were updated
    expect((result as { updated: number }).updated).toBe(2);
    // Exactly 1 blocked row
    expect((result as { blocked: unknown[] }).blocked).toHaveLength(1);
  });

  it("returns blocked contacts when removal is guarded by sponsor_contacts", async () => {
    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      if (table === "sponsor_contacts") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ contact_id: "id-a" }],
              error: null,
            }),
          }),
        };
      }
      if (table === "contacts") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                { id: "id-a", full_name: "Sponsored Rep", types: ["sponsor"] },
                { id: "id-b", full_name: "Free Agent", types: ["sponsor"] },
              ],
              error: null,
            }),
          }),
          update: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null, count: 1 }),
          }),
        };
      }
      return {};
    });

    setClient({ from: mockFrom });

    const result = await bulkRemoveContactType(["id-a", "id-b"], "sponsor");

    expect(result).toMatchObject({
      updated: 1,
      blocked: expect.arrayContaining([
        expect.objectContaining({ id: "id-a", reason: expect.any(String) }),
      ]),
    });
  });

  it("removes 'volunteer' from contacts without checking any join table", async () => {
    // Volunteer has no guard — removal must succeed without querying team_members
    const teamMembersSpy = vi.fn();

    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members") {
        teamMembersSpy(table);
        // If this is ever called, the test will detect it below
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      if (table === "contacts") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ id: "v-1", full_name: "Vera Vol", types: ["volunteer"] }],
              error: null,
            }),
          }),
          update: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null, count: 1 }),
          }),
        };
      }
      return {};
    });

    setClient({ from: mockFrom });

    const result = await bulkRemoveContactType(["v-1"], "volunteer");

    expect(result).toMatchObject({ updated: 1, blocked: [] });
    // Volunteer guard decision #6 + #7: no join table queried for volunteer
    expect(teamMembersSpy).not.toHaveBeenCalled();
  });

  it("returns { error: /too many/i } when ids.length > 500", async () => {
    setClient({ from: vi.fn() });

    const ids = Array.from({ length: 501 }, (_, i) => `id-${i}`);
    const result = await bulkRemoveContactType(ids, "player");

    expect(result).toMatchObject({ error: expect.stringMatching(/too many/i) });
  });
});
