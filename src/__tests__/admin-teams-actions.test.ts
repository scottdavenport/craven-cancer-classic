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
  deleteTeam,
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

    // Accept both "teams" (write target) and "teams_active" (view read target).
    // getTeams SELECTs from teams_active (soft-delete filter); mutations UPDATE teams.
    if (table === "teams" || table === "teams_active") {
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
        // team_name omitted — Sprint 32 contract drop
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
        // team_name omitted — Sprint 32 contract drop
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
      // team_name omitted — Sprint 32 contract drop
      session: "morning",
      captain_contact_id: "cap-uuid",
      player_contact_ids: ["p1", "p2", "p3", "p4"],
    });

    expect(result).toMatchObject({ error: expect.stringContaining("Too many players") });
  });

  it("calls register_team RPC with p_session but NOT p_team_name (Sprint 32 RED)", async () => {
    // RED: current code passes p_team_name to the RPC. After Flux drops it (Phase 1/2),
    // this assertion becomes the new contract.
    const client = makeClient();
    setClient(client);

    const result = await createTeam({
      // team_name omitted — Sprint 32 contract drop
      session: "morning",
      captain_contact_id: "cap-uuid",
      player_contact_ids: ["p1", "p2"],
    });

    expect(client.rpc).toHaveBeenCalledWith(
      "register_team",
      expect.objectContaining({
        p_session: "morning",
      })
    );
    // Sprint 32: p_team_name must NOT be in the RPC call
    const rpcArg = (client.rpc as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(rpcArg).not.toHaveProperty("p_team_name");
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
      // team_name omitted — Sprint 32 contract drop
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
      // team_name omitted — Sprint 32 contract drop
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

    // F-T8 P1: markTeamPaid now accepts payment_method, payment_reference, paid_at
    const result = await markTeamPaid("team-uuid", {
      amount_cents: 70000,
      payment_method: "check",
      payment_reference: "1234",
      paid_at: "2026-01-15T00:00:00.000Z",
    });

    expect(mockFrom).toHaveBeenCalledWith("teams");
    // Assert full payload sent by new impl (per feedback_spec_spy_assertions_required)
    expect(mockUpdate).toHaveBeenCalledWith({
      payment_status: "paid",
      amount_paid_cents: 70000,
      payment_method: "check",
      payment_reference: "1234",
      paid_at: "2026-01-15T00:00:00.000Z",
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

    const result = await markTeamPaid("team-uuid", { amount_cents: 70000, payment_method: "check" });

    expect(result).toMatchObject({ error: "DB error" });
  });
});

// ---------------------------------------------------------------------------
// S10-5: deleteTeam (soft-delete — RED phase)
// ---------------------------------------------------------------------------
// These tests will FAIL until Bolt implements deleteTeam in teams/actions.ts
// using softDelete(supabase, "teams", id). The current file has no deleteTeam.
// ---------------------------------------------------------------------------

describe("deleteTeam", () => {
  const AUTH_USER_ID = "auth-user-uuid";

  // Build a client where:
  //   auth.getUser()              → user with id = AUTH_USER_ID (or null when overridden)
  //   from("teams").update().eq() → success (or error when overridden)
  //   from("team_members").delete() — tracked so we can assert it's NOT called
  //   from("scores").delete()       — tracked so we can assert it's NOT called
  function makeDeleteClient(overrides: {
    userResult?: { data: { user: { id: string } | null } };
    teamsUpdateEqResult?: { error: null | { message: string } };
  } = {}) {
    const {
      userResult = { data: { user: { id: AUTH_USER_ID } } },
      teamsUpdateEqResult = { error: null },
    } = overrides;

    const teamMembersDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const teamMembersDelete = vi.fn().mockReturnValue({ eq: teamMembersDeleteEq });

    const scoresDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const scoresDelete = vi.fn().mockReturnValue({ eq: scoresDeleteEq });

    const teamsUpdateEq = vi.fn().mockResolvedValue(teamsUpdateEqResult);
    const teamsUpdate = vi.fn().mockReturnValue({ eq: teamsUpdateEq });

    const mockFrom = vi.fn((table: string) => {
      if (table === "teams") return { update: teamsUpdate };
      if (table === "team_members") return { delete: teamMembersDelete };
      if (table === "scores") return { delete: scoresDelete };
      return {};
    });

    return {
      client: {
        auth: {
          getUser: vi.fn().mockResolvedValue(userResult),
        },
        from: mockFrom,
      },
      spies: {
        teamsUpdate,
        teamsUpdateEq,
        teamMembersDelete,
        scoresDelete,
      },
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
  });

  it("happy path: calls update on teams with deleted_at and deleted_by, returns { ok: true }", async () => {
    const { client } = makeDeleteClient();
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );

    const result = await deleteTeam("team-uuid-1");

    expect(result).toEqual({ ok: true });
  });

  it("sets deleted_at to a valid ISO timestamp in the update payload", async () => {
    const { client, spies } = makeDeleteClient();
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );

    await deleteTeam("team-uuid-1");

    expect(spies.teamsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) })
    );

    // The string must parse as a valid Date
    const callArg = spies.teamsUpdate.mock.calls[0][0] as { deleted_at: string };
    expect(new Date(callArg.deleted_at).toString()).not.toBe("Invalid Date");
  });

  it("sets deleted_by to the authenticated user's id in the update payload", async () => {
    const { client, spies } = makeDeleteClient();
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );

    await deleteTeam("team-uuid-1");

    expect(spies.teamsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_by: AUTH_USER_ID })
    );
  });

  it("does not call delete on team_members (history preserved)", async () => {
    const { client, spies } = makeDeleteClient();
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );

    await deleteTeam("team-uuid-1");

    expect(spies.teamMembersDelete).not.toHaveBeenCalled();
  });

  it("does not call delete on scores (historical record stays intact)", async () => {
    const { client, spies } = makeDeleteClient();
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );

    await deleteTeam("team-uuid-1");

    expect(spies.scoresDelete).not.toHaveBeenCalled();
  });

  it("returns { error: /unauthenticated/i } when auth.getUser returns no user", async () => {
    const { client } = makeDeleteClient({
      userResult: { data: { user: null } },
    });
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );

    const result = await deleteTeam("team-uuid-1");

    expect(result).toMatchObject({ error: expect.stringMatching(/unauthenticated/i) });
  });

  it("propagates error when requireAdmin throws (non-admin user)", async () => {
    const { requireAdmin } = await import("@/lib/supabase/admin");
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("Unauthorized"));

    const { client } = makeDeleteClient();
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );

    await expect(deleteTeam("team-uuid-1")).rejects.toThrow("Unauthorized");
  });

  it("returns { error: string } when the Supabase update fails", async () => {
    const { client } = makeDeleteClient({
      teamsUpdateEqResult: { error: { message: "database connection lost" } },
    });
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );

    const result = await deleteTeam("team-uuid-1");

    expect(result).toEqual({ error: "database connection lost" });
  });
});
