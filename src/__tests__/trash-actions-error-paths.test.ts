/**
 * S10-8: Trash actions — error path coverage sweep
 *
 * Complements trash-actions.test.ts (which covers happy paths and restoreContact error paths).
 * Fills branch coverage gaps:
 * - restoreTeam: 23505 collision + generic DB error (previously uncovered)
 * - restoreSponsor: 23505 collision + generic DB error (previously uncovered)
 * - restoreSponsorshipItem: 23505 collision + generic DB error (lines 144–150 uncovered)
 * - restorePhoto: 23505 collision + generic DB error (lines 165–171 uncovered)
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
});

// ---------------------------------------------------------------------------
// restoreTeam — error paths
// ---------------------------------------------------------------------------

describe("restoreTeam — error paths", () => {
  it("23505 collision — returns conflict error message", async () => {
    const chain = makeRestoreChain({
      error: {
        message: "duplicate key value violates unique constraint",
        code: "23505",
      },
    });
    setClient({ from: vi.fn().mockReturnValue(chain) });

    const result = await restoreTeam("team-uuid");

    expect(result).toMatchObject({
      error: expect.stringMatching(/already exists|conflict/i),
    });
  });

  it("generic DB error — returns { error: message }", async () => {
    const chain = makeRestoreChain({ error: { message: "connection reset" } });
    setClient({ from: vi.fn().mockReturnValue(chain) });

    const result = await restoreTeam("team-uuid");

    expect(result).toEqual({ error: "connection reset" });
  });
});

// ---------------------------------------------------------------------------
// restoreSponsor — error paths
// ---------------------------------------------------------------------------

describe("restoreSponsor — error paths", () => {
  it("23505 collision — returns conflict error message", async () => {
    const chain = makeRestoreChain({
      error: {
        message: "duplicate key value violates unique constraint",
        code: "23505",
      },
    });
    setClient({ from: vi.fn().mockReturnValue(chain) });

    const result = await restoreSponsor("sponsor-uuid");

    expect(result).toMatchObject({
      error: expect.stringMatching(/already exists|conflict/i),
    });
  });

  it("generic DB error — returns { error: message }", async () => {
    const chain = makeRestoreChain({ error: { message: "timeout" } });
    setClient({ from: vi.fn().mockReturnValue(chain) });

    const result = await restoreSponsor("sponsor-uuid");

    expect(result).toEqual({ error: "timeout" });
  });
});

// ---------------------------------------------------------------------------
// restoreSponsorshipItem — error paths (lines 144–150 previously uncovered)
// ---------------------------------------------------------------------------

describe("restoreSponsorshipItem — error paths", () => {
  it("23505 collision — returns conflict error message (covers lines 144–148)", async () => {
    const chain = makeRestoreChain({
      error: {
        message: "duplicate key value violates unique constraint",
        code: "23505",
      },
    });
    setClient({ from: vi.fn().mockReturnValue(chain) });

    const result = await restoreSponsorshipItem("item-uuid");

    expect(result).toMatchObject({
      error: expect.stringMatching(/already exists|conflict/i),
    });
  });

  it("generic DB error — returns { error: message } (covers line 150)", async () => {
    const chain = makeRestoreChain({ error: { message: "query failed" } });
    setClient({ from: vi.fn().mockReturnValue(chain) });

    const result = await restoreSponsorshipItem("item-uuid");

    expect(result).toEqual({ error: "query failed" });
  });
});

// ---------------------------------------------------------------------------
// restorePhoto — error paths (lines 165–171 previously uncovered)
// ---------------------------------------------------------------------------

describe("restorePhoto — error paths", () => {
  it("23505 collision — returns conflict error message (covers lines 165–169)", async () => {
    const chain = makeRestoreChain({
      error: {
        message: "duplicate key value violates unique constraint",
        code: "23505",
      },
    });
    setClient({ from: vi.fn().mockReturnValue(chain) });

    const result = await restorePhoto("photo-uuid");

    expect(result).toMatchObject({
      error: expect.stringMatching(/already exists|conflict/i),
    });
  });

  it("generic DB error — returns { error: message } (covers line 171)", async () => {
    const chain = makeRestoreChain({ error: { message: "storage unavailable" } });
    setClient({ from: vi.fn().mockReturnValue(chain) });

    const result = await restorePhoto("photo-uuid");

    expect(result).toEqual({ error: "storage unavailable" });
  });
});
