/**
 * S9-3a: Admin teams server actions — contract tests
 *
 * All Supabase interactions are mocked. These tests verify:
 * - getTeams: returns open_slots = 4 - member_count
 * - searchContacts: calls ilike on full_name and email
 * - createTeam: rejects >3 players, calls register_team RPC, inserts team_members correctly
 * - updateTeamMembers: deletes old roster, inserts new, updates captain_contact_id
 * - markTeamPaid: updates payment_status + amount_paid_cents
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
// Top-level imports after vi.mock declarations
// ---------------------------------------------------------------------------
import * as serverModule from "@/lib/supabase/server";
import {
  getTeams,
  searchContacts,
  createTeam,
  updateTeamMembers,
  markTeamPaid,
} from "@/app/admin/teams/actions";

// ---------------------------------------------------------------------------
// Mock Supabase client builder
// ---------------------------------------------------------------------------
type MockClient = ReturnType<typeof makeClient>;

function makeClient(overrides: {
  profileRole?: string;
  teamsOrderResult?: { data: unknown[]; error: null | { message: string } };
  contactsLimitResult?: { data: unknown[]; error: null | { message: string } };
  teamMembersDeleteEqResult?: { error: null | { message: string } };
  teamMembersInsertResult?: { error: null | { message: string } };
  teamsUpdateEqResult?: { error: null | { message: string } };
  rpcResult?: { data: unknown; error: null | { message: string } };
} = {}) {
  const {
    profileRole = "admin",
    teamsOrderResult = { data: [], error: null },
    contactsLimitResult = { data: [], error: null },
    teamMembersDeleteEqResult = { error: null },
    teamMembersInsertResult = { error: null },
    teamsUpdateEqResult = { error: null },
    rpcResult = { data: { team_id: "new-team-uuid" }, error: null },
  } = overrides;

  const mockRpc = vi.fn().mockResolvedValue(rpcResult);

  const mockFrom = vi.fn((table: string) => {
    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: profileRole }, error: null }),
      };
    }

    if (table === "teams") {
      const teamsUpdateEq = vi.fn().mockResolvedValue(teamsUpdateEqResult);
      const teamsUpdate = vi.fn().mockReturnValue({ eq: teamsUpdateEq });
      const teamsOrder = vi.fn().mockResolvedValue(teamsOrderResult);
      const teamsEq = vi.fn().mockReturnValue({ order: teamsOrder });
      const teamsSelect = vi.fn().mockReturnValue({ eq: teamsEq });
      return { select: teamsSelect, update: teamsUpdate };
    }

    if (table === "contacts") {
      const contactsLimit = vi.fn().mockResolvedValue(contactsLimitResult);
      const contactsOr = vi.fn().mockReturnValue({ limit: contactsLimit });
      const contactsSelect = vi.fn().mockReturnValue({ or: contactsOr });
      return { select: contactsSelect };
    }

    if (table === "team_members") {
      const teamMembersEq = vi.fn().mockResolvedValue(teamMembersDeleteEqResult);
      const teamMembersDelete = vi.fn().mockReturnValue({ eq: teamMembersEq });
      const teamMembersInsert = vi.fn().mockResolvedValue(teamMembersInsertResult);
      return { delete: teamMembersDelete, insert: teamMembersInsert };
    }

    return {};
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-uuid" } } }),
    },
    from: mockFrom,
    rpc: mockRpc,
  };
}

function setClient(client: MockClient) {
  vi.mocked(serverModule.createClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getTeams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
  });

  it("returns open_slots = 4 - member_count", async () => {
    const teamsData = [
      {
        id: "team-1",
        team_name: "Eagles",
        year: 2026,
        captain_contact_id: "cap-uuid",
        payment_status: "pending",
        amount_paid_cents: 0,
        session: "morning",
        created_at: "2026-01-01",
        team_members: [
          { contact_id: "c1", role: "captain", slot: 1, contacts: { id: "c1", full_name: "Alice" } },
          { contact_id: "c2", role: "player", slot: 2, contacts: { id: "c2", full_name: "Bob" } },
        ],
      },
    ];

    setClient(makeClient({ teamsOrderResult: { data: teamsData, error: null } }));

    const result = await getTeams(2026);

    expect(result).toHaveLength(1);
    expect(result[0].member_count).toBe(2);
    expect(result[0].open_slots).toBe(2);
    expect(result[0].open_slots).toBe(4 - result[0].member_count);
  });

  it("returns open_slots = 4 when team has no members", async () => {
    const teamsData = [
      {
        id: "team-2",
        team_name: "Falcons",
        year: 2026,
        captain_contact_id: null,
        payment_status: "pending",
        amount_paid_cents: 0,
        session: "afternoon",
        created_at: "2026-01-02",
        team_members: [],
      },
    ];

    setClient(makeClient({ teamsOrderResult: { data: teamsData, error: null } }));

    const result = await getTeams(2026);

    expect(result[0].open_slots).toBe(4);
    expect(result[0].member_count).toBe(0);
  });

  it("throws when user is not admin or viewer", async () => {
    setClient(makeClient({ profileRole: "guest" }));

    await expect(getTeams()).rejects.toThrow("Unauthorized");
  });
});

describe("searchContacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
  });

  it("returns contacts matching ilike query and enforces 20-result limit", async () => {
    const contactsData = [
      { id: "c1", full_name: "John Smith", email: "john@example.com", company: "ACME" },
      { id: "c2", full_name: "Jane Smith", email: "jane@example.com", company: null },
    ];

    const mockLimit = vi.fn().mockResolvedValue({ data: contactsData, error: null });
    const mockOr = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    vi.mocked(serverModule.createClient).mockResolvedValue(
      { from: mockFrom } as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );

    const result = await searchContacts("Smith");

    expect(result).toHaveLength(2);
    expect(result[0].full_name).toBe("John Smith");
    expect(result[1].full_name).toBe("Jane Smith");
    expect(mockLimit).toHaveBeenCalledWith(20);
  });

  it("passes ilike pattern covering both full_name and email", async () => {
    // Spy on the or() call to verify pattern
    const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockOr = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    vi.mocked(serverModule.createClient).mockResolvedValue(
      { from: mockFrom } as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );

    await searchContacts("Smith");

    expect(mockOr).toHaveBeenCalledWith(
      expect.stringContaining("full_name.ilike.%Smith%")
    );
    expect(mockOr).toHaveBeenCalledWith(
      expect.stringContaining("email.ilike.%Smith%")
    );
    expect(mockLimit).toHaveBeenCalledWith(20);
  });
});

describe("createTeam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
  });

  it("returns error when more than 3 players are passed", async () => {
    // No client needed — validation fires before any DB call
    setClient(makeClient());

    const result = await createTeam({
      team_name: "Over Team",
      session: "morning",
      captain_contact_id: "cap-uuid",
      player_contact_ids: ["p1", "p2", "p3", "p4"],
    });

    expect(result).toMatchObject({ error: expect.stringContaining("Too many players") });
  });

  it("calls register_team RPC with correct args", async () => {
    const client = makeClient();
    setClient(client);

    const result = await createTeam({
      team_name: "Alpha Team",
      session: "morning",
      captain_contact_id: "cap-uuid",
      player_contact_ids: ["p1", "p2"],
    });

    expect(client.rpc).toHaveBeenCalledWith(
      "register_team",
      expect.objectContaining({
        p_session: "morning",
        p_team_name: "Alpha Team",
      })
    );
    expect(result).toMatchObject({ team_id: "new-team-uuid" });
  });

  it("inserts team_members: slot 1 = captain, slots 2+ = players in order", async () => {
    // Use explicit spies so we can capture the insert call
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
    const mockRpc = vi.fn().mockResolvedValue({ data: { team_id: "new-team-uuid" }, error: null });
    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members") return { insert: mockInsert };
      if (table === "teams") return { update: mockUpdate };
      return {};
    });

    vi.mocked(serverModule.createClient).mockResolvedValue(
      { from: mockFrom, rpc: mockRpc } as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );

    await createTeam({
      team_name: "Alpha Team",
      session: "morning",
      captain_contact_id: "cap-uuid",
      player_contact_ids: ["p1", "p2"],
    });

    expect(mockInsert).toHaveBeenCalledWith([
      { team_id: "new-team-uuid", contact_id: "cap-uuid", role: "captain", slot: 1 },
      { team_id: "new-team-uuid", contact_id: "p1", role: "player", slot: 2 },
      { team_id: "new-team-uuid", contact_id: "p2", role: "player", slot: 3 },
    ]);
  });

  it("returns error if RPC fails", async () => {
    const client = makeClient({
      rpcResult: { data: null, error: { message: "session full" } },
    });
    setClient(client);

    const result = await createTeam({
      team_name: "Full Team",
      session: "morning",
      captain_contact_id: "cap-uuid",
      player_contact_ids: [],
    });

    expect(result).toMatchObject({ error: "session full" });
  });
});

describe("updateTeamMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
  });

  it("deletes existing roster and inserts new members", async () => {
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members") return { delete: mockDelete, insert: mockInsert };
      if (table === "teams") return { update: mockUpdate };
      return {};
    });

    vi.mocked(serverModule.createClient).mockResolvedValue(
      { from: mockFrom } as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );

    const members = [
      { contact_id: "new-cap", role: "captain" as const, slot: 1 },
      { contact_id: "p1", role: "player" as const, slot: 2 },
    ];

    const result = await updateTeamMembers("team-uuid", members);

    expect(mockDelete).toHaveBeenCalled();
    expect(mockDeleteEq).toHaveBeenCalledWith("team_id", "team-uuid");
    expect(mockInsert).toHaveBeenCalledWith([
      { team_id: "team-uuid", contact_id: "new-cap", role: "captain", slot: 1 },
      { team_id: "team-uuid", contact_id: "p1", role: "player", slot: 2 },
    ]);

    expect(result).toEqual({ ok: true });
  });

  it("updates captain_contact_id when roster has a captain", async () => {
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members") return { delete: mockDelete, insert: mockInsert };
      if (table === "teams") return { update: mockUpdate };
      return {};
    });

    vi.mocked(serverModule.createClient).mockResolvedValue(
      { from: mockFrom } as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );

    await updateTeamMembers("team-uuid", [
      { contact_id: "new-cap", role: "captain", slot: 1 },
    ]);

    expect(mockUpdate).toHaveBeenCalledWith({ captain_contact_id: "new-cap" });
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "team-uuid");
  });
});

describe("markTeamPaid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
  });

  it("updates payment_status and amount_paid_cents", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

    vi.mocked(serverModule.createClient).mockResolvedValue(
      { from: mockFrom } as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );

    const result = await markTeamPaid("team-uuid", 70000);

    expect(mockFrom).toHaveBeenCalledWith("teams");
    expect(mockUpdate).toHaveBeenCalledWith({
      payment_status: "paid",
      amount_paid_cents: 70000,
    });
    expect(mockEq).toHaveBeenCalledWith("id", "team-uuid");
    expect(result).toEqual({ ok: true });
  });

  it("returns error if update fails", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: { message: "DB error" } });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

    vi.mocked(serverModule.createClient).mockResolvedValue(
      { from: mockFrom } as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );

    const result = await markTeamPaid("team-uuid", 70000);

    expect(result).toMatchObject({ error: "DB error" });
  });
});
