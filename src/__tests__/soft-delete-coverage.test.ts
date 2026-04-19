/**
 * S10-8: soft-delete.ts coverage sweep
 *
 * Complements the integration coverage already provided by contacts-soft-delete-integration.test.ts.
 * Fills gaps for:
 * - restore(): error path (line 38 — uncovered)
 * - restore(): happy path direct call
 * - bulkSoftDelete(): unauthenticated (no user) path
 * - bulkSoftDelete(): count null fallback (returns ids.length when count is null)
 * - bulkSoftDelete(): DB error path
 * - softDelete(): DB error path
 */

import { describe, it, expect, vi } from "vitest";
import {
  softDelete,
  restore,
  bulkSoftDelete,
} from "@/lib/supabase/soft-delete";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEqChain(result: { error: null | { message: string } }) {
  const mockEq = vi.fn().mockResolvedValue(result);
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  return { update: mockUpdate, _mockEq: mockEq };
}

function makeInChain(result: { error: null | { message: string }; count: number | null }) {
  const mockIn = vi.fn().mockResolvedValue(result);
  const mockUpdate = vi.fn().mockReturnValue({ in: mockIn });
  return { update: mockUpdate, _mockIn: mockIn };
}

function makeSupabase(overrides: Record<string, unknown>): SupabaseClient {
  return overrides as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// restore() — error path (previously uncovered)
// ---------------------------------------------------------------------------

describe("restore", () => {
  it("happy path — returns { ok: true } when DB update succeeds", async () => {
    const chain = makeEqChain({ error: null });
    const supabase = makeSupabase({ from: vi.fn().mockReturnValue(chain) });

    const result = await restore(supabase, "contacts", "some-uuid");

    expect(result).toEqual({ ok: true });
    expect(chain.update).toHaveBeenCalledWith({ deleted_at: null, deleted_by: null });
    expect(chain._mockEq).toHaveBeenCalledWith("id", "some-uuid");
  });

  it("error path — returns { error: message } when DB update fails (covers line 38)", async () => {
    const chain = makeEqChain({ error: { message: "update failed" } });
    const supabase = makeSupabase({ from: vi.fn().mockReturnValue(chain) });

    const result = await restore(supabase, "teams", "team-uuid");

    expect(result).toEqual({ error: "update failed" });
  });

  it("passes the correct table to supabase.from()", async () => {
    const chain = makeEqChain({ error: null });
    const mockFrom = vi.fn().mockReturnValue(chain);
    const supabase = makeSupabase({ from: mockFrom });

    await restore(supabase, "sponsors", "uuid");

    expect(mockFrom).toHaveBeenCalledWith("sponsors");
  });
});

// ---------------------------------------------------------------------------
// softDelete() — DB error path
// ---------------------------------------------------------------------------

describe("softDelete — DB error path", () => {
  it("returns { error: message } when DB update fails", async () => {
    const chain = makeEqChain({ error: { message: "constraint violation" } });
    const supabase = makeSupabase({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "admin-id" } },
        }),
      },
      from: vi.fn().mockReturnValue(chain),
    });

    const result = await softDelete(supabase, "contacts", "uuid");

    expect(result).toEqual({ error: "constraint violation" });
  });

  it("returns { error: 'Unauthenticated' } when no user present", async () => {
    const supabase = makeSupabase({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn(),
    });

    const result = await softDelete(supabase, "contacts", "uuid");

    expect(result).toEqual({ error: "Unauthenticated" });
  });
});

// ---------------------------------------------------------------------------
// bulkSoftDelete()
// ---------------------------------------------------------------------------

describe("bulkSoftDelete", () => {
  it("returns { deleted: 0 } for empty ids array (early exit)", async () => {
    const supabase = makeSupabase({ from: vi.fn(), auth: { getUser: vi.fn() } });

    const result = await bulkSoftDelete(supabase, "contacts", []);

    expect(result).toEqual({ deleted: 0 });
  });

  it("returns error for ids array larger than 500", async () => {
    const ids = Array.from({ length: 501 }, (_, i) => `id-${i}`);
    const supabase = makeSupabase({ from: vi.fn(), auth: { getUser: vi.fn() } });

    const result = await bulkSoftDelete(supabase, "contacts", ids);

    expect(result).toEqual({ error: "Too many items — cap is 500 per call" });
  });

  it("unauthenticated — returns { error: 'Unauthenticated' } when no user", async () => {
    const supabase = makeSupabase({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn(),
    });

    const result = await bulkSoftDelete(supabase, "contacts", ["id-1", "id-2"]);

    expect(result).toEqual({ error: "Unauthenticated" });
  });

  it("happy path — returns { deleted: count } when count is non-null", async () => {
    const chain = makeInChain({ error: null, count: 3 });
    const supabase = makeSupabase({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-id" } } }),
      },
      from: vi.fn().mockReturnValue(chain),
    });

    const result = await bulkSoftDelete(supabase, "contacts", ["a", "b", "c"]);

    expect(result).toEqual({ deleted: 3 });
  });

  it("count null fallback — returns { deleted: ids.length } when count is null", async () => {
    const chain = makeInChain({ error: null, count: null });
    const supabase = makeSupabase({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-id" } } }),
      },
      from: vi.fn().mockReturnValue(chain),
    });

    const result = await bulkSoftDelete(supabase, "photos", ["x", "y"]);

    expect(result).toEqual({ deleted: 2 });
  });

  it("DB error — returns { error: message }", async () => {
    const chain = makeInChain({ error: { message: "bulk update failed" }, count: null });
    const supabase = makeSupabase({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-id" } } }),
      },
      from: vi.fn().mockReturnValue(chain),
    });

    const result = await bulkSoftDelete(supabase, "teams", ["id-1"]);

    expect(result).toEqual({ error: "bulk update failed" });
  });
});
