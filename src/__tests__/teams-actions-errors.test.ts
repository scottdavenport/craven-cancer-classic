/**
 * S9-5: Admin teams actions — error path and edge case coverage.
 *
 * Complements admin-teams-actions.test.ts (which covers happy paths).
 * Covers:
 * - createTeam: team_members insert fails → returns error
 * - createTeam: teams update (captain_contact_id) fails → returns error
 * - updateTeamMembers: delete fails → returns error (no insert attempted)
 * - updateTeamMembers: insert fails → returns error
 * - updateTeamMembers: teams captain update fails → returns error
 * - updateTeamMembers: no captain in members list → skips captain_contact_id update
 * - getTeams: throws when unauthenticated
 * - getTeams: returns empty list when no teams found
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

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

import * as serverModule from "@/lib/supabase/server";
import {
  createTeam,
  updateTeamMembers,
  getTeams,
} from "@/app/admin/teams/actions";

function setClient(client: unknown) {
  vi.mocked(serverModule.createClient).mockResolvedValue(
    client as Awaited<ReturnType<typeof serverModule.createClient>>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
});

// ---------------------------------------------------------------------------
// createTeam — error paths
// ---------------------------------------------------------------------------

describe("createTeam — error paths", () => {
  it("returns error when team_members insert fails after successful RPC", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: { message: "FK violation" } });
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
    const mockRpc = vi.fn().mockResolvedValue({ data: { team_id: "new-team" }, error: null });

    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members") return { insert: mockInsert };
      if (table === "teams") return { update: mockUpdate };
      return {};
    });

    setClient({ from: mockFrom, rpc: mockRpc });

    const result = await createTeam({
      // team_name omitted — Sprint 32 contract drop
      session: "morning",
      captain_contact_id: "cap-uuid",
      player_contact_ids: [],
    });

    expect(result).toMatchObject({ error: "FK violation" });
  });

  it("returns error when teams.update (captain_contact_id) fails", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: { message: "update failed" } });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
    const mockRpc = vi.fn().mockResolvedValue({ data: { team_id: "new-team" }, error: null });

    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members") return { insert: mockInsert };
      if (table === "teams") return { update: mockUpdate };
      return {};
    });

    setClient({ from: mockFrom, rpc: mockRpc });

    const result = await createTeam({
      // team_name omitted — Sprint 32 contract drop
      session: "afternoon",
      captain_contact_id: "cap-uuid",
      player_contact_ids: ["p1"],
    });

    expect(result).toMatchObject({ error: "update failed" });
  });
});

// ---------------------------------------------------------------------------
// updateTeamMembers — error paths
// ---------------------------------------------------------------------------

describe("updateTeamMembers — error paths", () => {
  it("returns error and does not call insert when delete fails", async () => {
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: { message: "delete failed" } });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members") return { delete: mockDelete, insert: mockInsert };
      return {};
    });

    setClient({ from: mockFrom });

    const result = await updateTeamMembers("team-uuid", [
      { contact_id: "c1", role: "captain", slot: 1 },
    ]);

    expect(result).toMatchObject({ error: "delete failed" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns error when insert fails after successful delete", async () => {
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });
    const mockInsert = vi.fn().mockResolvedValue({ error: { message: "insert conflict" } });

    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members") return { delete: mockDelete, insert: mockInsert };
      return {};
    });

    setClient({ from: mockFrom });

    const result = await updateTeamMembers("team-uuid", [
      { contact_id: "c1", role: "player", slot: 2 },
    ]);

    expect(result).toMatchObject({ error: "insert conflict" });
  });

  it("returns error when teams captain_contact_id update fails", async () => {
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: { message: "captain update failed" } });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members") return { delete: mockDelete, insert: mockInsert };
      if (table === "teams") return { update: mockUpdate };
      return {};
    });

    setClient({ from: mockFrom });

    const result = await updateTeamMembers("team-uuid", [
      { contact_id: "c1", role: "captain", slot: 1 },
    ]);

    expect(result).toMatchObject({ error: "captain update failed" });
  });

  it("does NOT update captain_contact_id when no captain in members list", async () => {
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn();

    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members") return { delete: mockDelete, insert: mockInsert };
      if (table === "teams") return { update: mockUpdate };
      return {};
    });

    setClient({ from: mockFrom });

    // Only players, no captain — so teams.update should NOT be called
    const result = await updateTeamMembers("team-uuid", [
      { contact_id: "p1", role: "player", slot: 2 },
      { contact_id: "p2", role: "player", slot: 3 },
    ]);

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getTeams — edge cases
// ---------------------------------------------------------------------------

describe("getTeams — edge cases", () => {
  it("throws Unauthenticated when no user session", async () => {
    setClient({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn(),
    });

    await expect(getTeams()).rejects.toThrow("Unauthenticated");
  });

  it("throws Unauthorized when profile query fails", async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    setClient({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-uuid" } } }),
      },
      from: vi.fn().mockReturnValue({ select: mockSelect }),
    });

    await expect(getTeams()).rejects.toThrow("Unauthorized");
  });

  it("returns empty list when no teams exist for the year", async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEqTeams = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelectTeams = vi.fn().mockReturnValue({ eq: mockEqTeams });

    const mockProfileSingle = vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null });
    const mockProfileEq = vi.fn().mockReturnValue({ single: mockProfileSingle });
    const mockProfileSelect = vi.fn().mockReturnValue({ eq: mockProfileEq });

    setClient({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-uuid" } } }),
      },
      from: vi.fn((table: string) => {
        if (table === "profiles") return { select: mockProfileSelect };
        if (table === "teams" || table === "teams_active") return { select: mockSelectTeams };
        return {};
      }),
    });

    const result = await getTeams(2026);
    expect(result).toEqual([]);
  });

  it("throws when teams DB query fails", async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: { message: "teams error" } });
    const mockEqTeams = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelectTeams = vi.fn().mockReturnValue({ eq: mockEqTeams });

    const mockProfileSingle = vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null });
    const mockProfileEq = vi.fn().mockReturnValue({ single: mockProfileSingle });
    const mockProfileSelect = vi.fn().mockReturnValue({ eq: mockProfileEq });

    setClient({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-uuid" } } }),
      },
      from: vi.fn((table: string) => {
        if (table === "profiles") return { select: mockProfileSelect };
        if (table === "teams" || table === "teams_active") return { select: mockSelectTeams };
        return {};
      }),
    });

    await expect(getTeams(2026)).rejects.toThrow("teams error");
  });
});

// ---------------------------------------------------------------------------
// Sprint 32 (#282): Server action errors must NOT reference team_name
// RED until Flux updates createTeam to remove team_name from TeamInput
// ---------------------------------------------------------------------------

describe("Sprint 32 — server action errors do not reference team_name", () => {
  it("createTeam error from RPC does not mention team_name in the error object", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "session full" },
    });
    const mockFrom = vi.fn().mockReturnValue({});

    setClient({ from: mockFrom, rpc: mockRpc });

    const result = await createTeam({
      // team_name omitted — Sprint 32 contract drop
      session: "morning",
      captain_contact_id: "cap-uuid",
      player_contact_ids: [],
    });

    expect(result).toMatchObject({ error: "session full" });
    // The error string must not reference team_name as a DB column
    if (typeof (result as { error: string }).error === "string") {
      expect((result as { error: string }).error).not.toMatch(/team_name/i);
    }
  });

  it("createTeam does not pass team_name to the RPC (Sprint 32 RED)", async () => {
    // RED: current code passes p_team_name. After Flux lands, this assertion holds.
    const capturedArgs: Record<string, unknown>[] = [];
    const mockRpc = vi.fn().mockImplementation((_fn: string, args: unknown) => {
      capturedArgs.push(args as Record<string, unknown>);
      return Promise.resolve({ data: { team_id: "team-xyz" }, error: null });
    });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
    const mockFrom = vi.fn((table: string) => {
      if (table === "team_members") return { insert: mockInsert };
      if (table === "teams") return { update: mockUpdate };
      return {};
    });

    setClient({ from: mockFrom, rpc: mockRpc });

    await createTeam({
      // team_name omitted — Sprint 32 contract drop
      session: "morning",
      captain_contact_id: "cap-uuid",
      player_contact_ids: [],
    });

    expect(capturedArgs.length).toBeGreaterThan(0);
    // p_team_name must NOT be in the RPC args
    for (const args of capturedArgs) {
      expect(args).not.toHaveProperty("p_team_name");
    }
  });
});
