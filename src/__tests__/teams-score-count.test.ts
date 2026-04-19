/**
 * S10-8: getScoreCount coverage
 *
 * getScoreCount was added in S10-5 (teams soft-delete) but has no existing tests.
 * Coverage gap: lines 244–254 in src/app/admin/teams/actions.ts.
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
import { getScoreCount } from "@/app/admin/teams/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setClient(client: unknown) {
  vi.mocked(serverModule.createClient).mockResolvedValue(
    client as Awaited<ReturnType<typeof serverModule.createClient>>
  );
}

/**
 * Build a mock for:
 *   supabase.from("scores").select("id", { count: "exact", head: true }).eq("team_id", id)
 */
function makeScoreQueryChain(result: {
  count: number | null;
  error: null | { message: string };
}) {
  const mockEq = vi.fn().mockResolvedValue(result);
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  return { select: mockSelect, _mockEq: mockEq };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
  vi.mocked(adminModule.requireAdmin).mockResolvedValue(
    { role: "admin" } as ReturnType<typeof adminModule.requireAdmin> extends Promise<infer T>
      ? T
      : never
  );
});

// ---------------------------------------------------------------------------
// getScoreCount
// ---------------------------------------------------------------------------

describe("getScoreCount", () => {
  describe("happy path", () => {
    it("returns the count when scores exist for a team", async () => {
      const chain = makeScoreQueryChain({ count: 18, error: null });
      setClient({ from: vi.fn().mockReturnValue(chain) });

      const result = await getScoreCount("team-uuid");

      expect(result).toBe(18);
      expect(chain._mockEq).toHaveBeenCalledWith("team_id", "team-uuid");
    });

    it("returns 0 when count is null (no rows)", async () => {
      const chain = makeScoreQueryChain({ count: null, error: null });
      setClient({ from: vi.fn().mockReturnValue(chain) });

      const result = await getScoreCount("team-uuid");

      expect(result).toBe(0);
    });

    it("queries the scores table", async () => {
      const chain = makeScoreQueryChain({ count: 5, error: null });
      const mockFrom = vi.fn().mockReturnValue(chain);
      setClient({ from: mockFrom });

      await getScoreCount("team-uuid");

      expect(mockFrom).toHaveBeenCalledWith("scores");
    });
  });

  describe("error path", () => {
    it("returns 0 when DB query errors (graceful fallback — covers line 253)", async () => {
      const chain = makeScoreQueryChain({ count: null, error: { message: "query failed" } });
      setClient({ from: vi.fn().mockReturnValue(chain) });

      const result = await getScoreCount("team-uuid");

      expect(result).toBe(0);
    });
  });

  describe("authorization", () => {
    it("propagates error when requireAdmin throws", async () => {
      vi.mocked(adminModule.requireAdmin).mockRejectedValue(new Error("Unauthorized"));
      setClient({ from: vi.fn() });

      await expect(getScoreCount("team-uuid")).rejects.toThrow("Unauthorized");
    });
  });
});
