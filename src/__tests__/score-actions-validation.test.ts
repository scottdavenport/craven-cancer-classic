/**
 * polish-186 (RED): updateScore — total_score range validation.
 *
 * These tests FAIL until Bolt implements:
 * - updateScore: reject NaN, negative, non-finite (Infinity), and > 200 values
 *   with { error: "Invalid total score" }, without calling Supabase .update().
 *
 * Issue: #186 (security: add range validation to updateScore)
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
import { updateScore } from "@/app/admin/scores/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUpdateChain(overrides: { error?: unknown } = {}) {
  const mockEq = vi.fn().mockResolvedValue({ error: overrides.error ?? null });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  const client = {
    from: vi.fn().mockReturnValue({ update: mockUpdate }),
  };
  vi.mocked(serverModule.createClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
  );
  return { mockUpdate, mockEq, client };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
});

// ---------------------------------------------------------------------------
// updateScore — total_score range validation
// ---------------------------------------------------------------------------

describe("updateScore — total_score range validation", () => {
  // ---- invalid inputs: should return { error } and NOT call .update() ----

  it("total_score = NaN → returns { error } matching /invalid|range/i, Supabase .update() NOT called", async () => {
    const { mockUpdate } = makeUpdateChain();

    const result = await updateScore("score-id-1", {
      team_name: "Team A",
      total_score: NaN,
      session: "morning",
    });

    expect((result as { error: string }).error).toMatch(/invalid|range/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("total_score = -1 → returns { error }, no Supabase update", async () => {
    const { mockUpdate } = makeUpdateChain();

    const result = await updateScore("score-id-1", {
      team_name: "Team A",
      total_score: -1,
      session: "morning",
    });

    expect((result as { error: string }).error).toMatch(/invalid|range/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("total_score = -0.5 → returns { error }, no Supabase update (non-integer negative also invalid)", async () => {
    const { mockUpdate } = makeUpdateChain();

    const result = await updateScore("score-id-1", {
      team_name: "Team A",
      total_score: -0.5,
      session: "morning",
    });

    expect((result as { error: string }).error).toMatch(/invalid|range/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("total_score = Infinity → returns { error }, no Supabase update", async () => {
    const { mockUpdate } = makeUpdateChain();

    const result = await updateScore("score-id-1", {
      team_name: "Team A",
      total_score: Infinity,
      session: "afternoon",
    });

    expect((result as { error: string }).error).toMatch(/invalid|range/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("total_score = 201 → returns { error }, no Supabase update (above 200 upper bound)", async () => {
    const { mockUpdate } = makeUpdateChain();

    const result = await updateScore("score-id-1", {
      team_name: "Team A",
      total_score: 201,
      session: null,
    });

    expect((result as { error: string }).error).toMatch(/invalid|range/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // ---- valid inputs: should call Supabase .update() ----

  it("total_score = 0 → Supabase .update() is called (scratch hypothetical allowed)", async () => {
    const { mockUpdate } = makeUpdateChain();

    const result = await updateScore("score-id-1", {
      team_name: "Team A",
      total_score: 0,
      session: "morning",
    });

    expect((result as { error: string }).error).toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("total_score = 72 → Supabase .update() is called (happy path)", async () => {
    const { mockUpdate } = makeUpdateChain();

    const result = await updateScore("score-id-1", {
      team_name: "Team A",
      total_score: 72,
      session: "afternoon",
    });

    expect((result as { error: string }).error).toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("total_score = 200 → Supabase .update() is called (at upper bound boundary)", async () => {
    const { mockUpdate } = makeUpdateChain();

    const result = await updateScore("score-id-1", {
      team_name: "Team A",
      total_score: 200,
      session: null,
    });

    expect((result as { error: string }).error).toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  // ---- call-order: requireAdmin must fire before .update() ----

  it("requireAdmin is called BEFORE Supabase .update() on a valid happy-path call", async () => {
    const { mockUpdate } = makeUpdateChain();

    await updateScore("score-id-1", {
      team_name: "Team A",
      total_score: 72,
      session: "morning",
    });

    const requireAdminOrder =
      vi.mocked(adminModule.requireAdmin).mock.invocationCallOrder[0];
    const updateOrder = mockUpdate.mock.invocationCallOrder[0];

    expect(requireAdminOrder).toBeLessThan(updateOrder);
  });
});
