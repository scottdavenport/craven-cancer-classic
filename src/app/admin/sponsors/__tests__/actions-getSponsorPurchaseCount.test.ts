/**
 * Issue #380: server action contract test for getSponsorPurchaseCount.
 *
 * RED state: getSponsorPurchaseCount is not exported from actions.ts yet.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ role: "admin" }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import * as serverModule from "@/lib/supabase/server";
import * as adminModule from "@/lib/supabase/admin";
import { getSponsorPurchaseCount } from "../actions";

interface ChainCall {
  method: string;
  args: unknown[];
}

function makeCountClient(count: number, error: { message: string } | null = null) {
  const calls: ChainCall[] = [];
  const fromMock = vi.fn((table: string) => {
    calls.push({ method: "from", args: [table] });
    return {
      select: vi.fn((columns: string, opts?: unknown) => {
        calls.push({ method: "select", args: [columns, opts] });
        return {
          eq: vi.fn((col: string, val: unknown) => {
            calls.push({ method: "eq", args: [col, val] });
            return Promise.resolve({ count, error });
          }),
        };
      }),
    };
  });
  return { client: { from: fromMock }, calls };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSponsorPurchaseCount — issue #380", () => {
  it("returns 0 when no purchases reference the sponsor", async () => {
    const { client } = makeCountClient(0);
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );
    const result = await getSponsorPurchaseCount("sponsor-uuid-1");
    expect(result).toBe(0);
  });

  it("returns the exact count when purchases reference the sponsor", async () => {
    const { client } = makeCountClient(7);
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );
    const result = await getSponsorPurchaseCount("sponsor-uuid-1");
    expect(result).toBe(7);
  });

  it("queries the sponsorship_purchases table filtered by sponsor_id", async () => {
    const { client, calls } = makeCountClient(3);
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );
    await getSponsorPurchaseCount("sponsor-uuid-42");

    expect(calls.find((c) => c.method === "from" && c.args[0] === "sponsorship_purchases")).toBeDefined();
    expect(
      calls.find(
        (c) => c.method === "eq" && c.args[0] === "sponsor_id" && c.args[1] === "sponsor-uuid-42"
      )
    ).toBeDefined();
  });

  it("uses head:true and count:'exact' (no row payload)", async () => {
    const { client, calls } = makeCountClient(0);
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );
    await getSponsorPurchaseCount("sponsor-uuid-1");

    const selectCall = calls.find((c) => c.method === "select");
    expect(selectCall).toBeDefined();
    const opts = selectCall?.args[1] as { count?: string; head?: boolean } | undefined;
    expect(opts?.count).toBe("exact");
    expect(opts?.head).toBe(true);
  });

  it("calls requireAdmin (admin-gated)", async () => {
    const { client } = makeCountClient(0);
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );
    await getSponsorPurchaseCount("sponsor-uuid-1");
    expect(adminModule.requireAdmin).toHaveBeenCalled();
  });

  it("throws when the query returns an error", async () => {
    const { client } = makeCountClient(0, { message: "boom" });
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );
    await expect(getSponsorPurchaseCount("sponsor-uuid-1")).rejects.toThrow("boom");
  });

  it("returns 0 when supabase returns count=null with no error", async () => {
    const { client } = makeCountClient(null as unknown as number);
    vi.mocked(serverModule.createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof serverModule.createClient>>
    );
    const result = await getSponsorPurchaseCount("sponsor-uuid-1");
    expect(result).toBe(0);
  });
});
