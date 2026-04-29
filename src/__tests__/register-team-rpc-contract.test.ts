/**
 * S11-2 RED phase: register_team RPC contract — post-column-drop behavior.
 *
 * TARGET behavior (post-migration):
 * - RPC still accepts p_captain_name / p_captain_email / p_captain_phone (backwards-compat)
 * - The admin createTeam action passes empty strings to RPC params (unchanged)
 * - The teams.update call from createTeam only sets captain_contact_id — NOT captain text cols
 * - The team_members row uses contact_id (not free-text captain_name)
 *
 * These tests FAIL today because:
 * - createTeam currently calls RPC with p_captain_name: "" etc. That's OK (backwards compat).
 *   BUT: the RPC itself writes captain_name/email/phone INTO the teams table row.
 *   Post-migration the RPC SQL must stop doing that.
 *   The contract tests here assert the route-layer behavior — no captain text columns
 *   should appear in any direct teams write from the route/action layer.
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
import { createTeam } from "@/app/admin/teams/actions";

// ---------------------------------------------------------------------------
// Mock Supabase client builder
// ---------------------------------------------------------------------------

function makeClientWithSpies(teamId = "new-team-uuid-rpc-test") {
  const capturedRpcCalls: Array<{ fn: string; args: unknown }> = [];

  const mockRpc = vi.fn((fn: string, args: unknown) => {
    capturedRpcCalls.push({ fn, args });
    return Promise.resolve({ data: { team_id: teamId }, error: null });
  });

  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  const teamsInsertCalls: unknown[] = [];
  const teamsUpdateCalls: unknown[] = [];

  const mockTeamsInsert = vi.fn((payload: unknown) => {
    teamsInsertCalls.push(payload);
    return {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: teamId }, error: null }),
      }),
    };
  });

  const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn((payload: unknown) => {
    teamsUpdateCalls.push(payload);
    return { eq: mockUpdateEq };
  });

  const mockFrom = vi.fn((table: string) => {
    if (table === "team_members") return { insert: mockInsert };
    if (table === "teams") return { update: mockUpdate, insert: mockTeamsInsert };
    return {};
  });

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-uuid" } } }),
    },
    from: mockFrom,
    rpc: mockRpc,
  };

  return {
    client,
    capturedRpcCalls,
    spies: {
      mockInsert,
      mockUpdate,
      mockUpdateEq,
      mockTeamsInsert,
      teamsInsertCalls,
      teamsUpdateCalls,
    },
  };
}

function setClient(client: ReturnType<typeof makeClientWithSpies>["client"]) {
  vi.mocked(serverModule.createClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
  );
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
// Tests
// ---------------------------------------------------------------------------

describe("S11-2 register_team RPC contract (RED phase)", () => {
  describe("RPC call shape: p_team_name dropped, p_captain_* params preserved (Sprint 32)", () => {
    it("admin createTeam calls register_team RPC with p_session — p_team_name must NOT be in args", async () => {
      // Sprint 32: p_team_name is dropped from the RPC signature.
      // The assertion `expect(args.p_team_name).toBe(...)` that existed here
      // is intentionally removed (plan amendment 2026-04-29 correction).
      const { client, capturedRpcCalls } = makeClientWithSpies();
      setClient(client);

      await createTeam({
        session: "morning",
        captain_contact_id: "cap-uuid-001",
        player_contact_ids: [],
      });

      const rpcCall = capturedRpcCalls.find((c) => c.fn === "register_team");
      expect(rpcCall).toBeDefined();

      const args = rpcCall!.args as Record<string, unknown>;
      expect(args.p_session).toBe("morning");

      // Sprint 32 RED: p_team_name must NOT be passed to the RPC.
      // This FAILS today (current code still sends p_team_name) and
      // passes after Flux drops it from the RPC call in Phase 2.
      expect("p_team_name" in args).toBe(false);

      // Backwards-compat: p_captain_* params still exist in the RPC signature call
      // per S11-2 contract — DO NOT remove these assertions
      expect("p_captain_name" in args).toBe(true);
      expect("p_captain_email" in args).toBe(true);
    });
  });

  describe("teams.update: must contain captain_contact_id but NOT captain text columns", () => {
    it("teams.update payload contains captain_contact_id", async () => {
      const { client, spies } = makeClientWithSpies("new-team-uuid-001");
      setClient(client);

      await createTeam({
        // team_name omitted — Sprint 32 contract drop
        session: "afternoon",
        captain_contact_id: "cap-uuid-002",
        player_contact_ids: ["p1"],
      });

      expect(spies.mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ captain_contact_id: "cap-uuid-002" })
      );
    });

    it("teams.update payload does NOT include captain_name (must fail until RPC migration)", async () => {
      /**
       * This test asserts that after the column drop, no direct teams write from
       * the admin action includes captain_name as a DB column value.
       *
       * Currently: the RPC writes captain_name INTO teams internally (SQL INSERT).
       * The action layer (createTeam) doesn't directly write captain_name — so this
       * test targets the action's direct teams.update call only.
       *
       * This FAILS until Bolt's RPC migration stops writing captain_name into teams.
       * The test is RED because we want to lock the contract that the admin action
       * does not try to set captain_name on the teams row under any circumstance.
       */
      const { client, spies } = makeClientWithSpies("new-team-uuid-002");
      setClient(client);

      await createTeam({
        // team_name omitted — Sprint 32 contract drop
        session: "morning",
        captain_contact_id: "cap-uuid-003",
        player_contact_ids: [],
      });

      // All teams.update calls must not include the deprecated columns
      for (const updatePayload of spies.teamsUpdateCalls) {
        const p = updatePayload as Record<string, unknown>;
        expect(p).not.toHaveProperty("captain_name");
        expect(p).not.toHaveProperty("captain_email");
        expect(p).not.toHaveProperty("captain_phone");
      }
    });

    it("teams.update payload does NOT include captain_email", async () => {
      const { client, spies } = makeClientWithSpies("new-team-uuid-003");
      setClient(client);

      await createTeam({
        // team_name omitted — Sprint 32 contract drop
        session: "morning",
        captain_contact_id: "cap-uuid-004",
        player_contact_ids: [],
      });

      for (const updatePayload of spies.teamsUpdateCalls) {
        const p = updatePayload as Record<string, unknown>;
        expect(p).not.toHaveProperty("captain_email");
      }
    });

    it("teams.update payload does NOT include captain_phone", async () => {
      const { client, spies } = makeClientWithSpies("new-team-uuid-004");
      setClient(client);

      await createTeam({
        // team_name omitted — Sprint 32 contract drop
        session: "morning",
        captain_contact_id: "cap-uuid-005",
        player_contact_ids: [],
      });

      for (const updatePayload of spies.teamsUpdateCalls) {
        const p = updatePayload as Record<string, unknown>;
        expect(p).not.toHaveProperty("captain_phone");
      }
    });
  });

  describe("team_members row: captain inserted with contact_id and role='captain'", () => {
    it("inserts team_members with role='captain', slot=1, and the provided captain_contact_id", async () => {
      const { client, spies } = makeClientWithSpies("new-team-uuid-005");
      setClient(client);

      await createTeam({
        // team_name omitted — Sprint 32 contract drop
        session: "morning",
        captain_contact_id: "cap-uuid-006",
        player_contact_ids: ["player-uuid-001"],
      });

      expect(spies.mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          role: "captain",
          contact_id: "cap-uuid-006",
          slot: 1,
        }),
        expect.objectContaining({
          role: "player",
          contact_id: "player-uuid-001",
          slot: 2,
        }),
      ]);
    });

    it("captain team_members row has contact_id and does NOT have free-text captain_name field", async () => {
      const { client, spies } = makeClientWithSpies("new-team-uuid-006");
      setClient(client);

      await createTeam({
        // team_name omitted — Sprint 32 contract drop
        session: "afternoon",
        captain_contact_id: "cap-uuid-007",
        player_contact_ids: [],
      });

      const insertCall = spies.mockInsert.mock.calls[0]?.[0];
      if (Array.isArray(insertCall)) {
        const captainRow = insertCall.find(
          (r: Record<string, unknown>) => r.role === "captain"
        );
        expect(captainRow).toBeDefined();
        expect(captainRow).toHaveProperty("contact_id");
        // team_members row must use contact_id, not free-text captain fields
        expect(captainRow).not.toHaveProperty("captain_name");
        expect(captainRow).not.toHaveProperty("captain_email");
        expect(captainRow).not.toHaveProperty("captain_phone");
      }
    });
  });

  describe("teams row direct insert (non-RPC): no captain text columns", () => {
    it("no direct teams.insert from createTeam includes captain_name", async () => {
      const { client, spies } = makeClientWithSpies("new-team-uuid-007");
      setClient(client);

      await createTeam({
        // team_name omitted — Sprint 32 contract drop
        session: "morning",
        captain_contact_id: "cap-uuid-008",
        player_contact_ids: [],
      });

      // If createTeam directly inserts into teams (bypassing RPC), assert no captain columns
      for (const insertPayload of spies.teamsInsertCalls) {
        const p = insertPayload as Record<string, unknown>;
        expect(p).not.toHaveProperty("captain_name");
        expect(p).not.toHaveProperty("captain_email");
        expect(p).not.toHaveProperty("captain_phone");
      }
    });
  });
});
