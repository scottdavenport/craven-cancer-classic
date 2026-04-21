/**
 * RED unit tests for getSponsors — Sprint 20, Bug 3 (#215)
 *
 * Target behaviour after Bolt fix:
 *   getSponsors query chain must include `.is("deleted_at", null)`
 *   to exclude soft-deleted sponsor rows from admin view.
 *
 * These tests FAIL against current main because actions.ts:39 only applies
 * `.eq("year", year)` and never adds `.is("deleted_at", null)`.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module-level mocks — must be hoisted before imports
// ---------------------------------------------------------------------------

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
import { getSponsors } from "../actions";

// ---------------------------------------------------------------------------
// Mock builder
//
// Captures the full query chain so we can inspect which filter methods
// were called and with what arguments.
// ---------------------------------------------------------------------------

interface ChainCall {
  method: string;
  args: unknown[];
}

function makeQuerySpy() {
  const calls: ChainCall[] = [];

  // Each chained method records itself and returns the proxy
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "calls") return calls;
      // Return a function that records the call and returns the proxy
      return (...args: unknown[]) => {
        calls.push({ method: prop, args });
        // order() needs to return a promise-like for the await
        if (prop === "order") {
          // Accumulate further chains off order() — for the .order(...) at the end
          return new Proxy(
            Object.assign(Promise.resolve({ data: [], error: null }), {}),
            {
              get(target, innerProp: string) {
                if (innerProp === "then" || innerProp === "catch" || innerProp === "finally") {
                  const method = (target as Promise<unknown>)[innerProp as keyof Promise<unknown>];
                  return typeof method === "function" ? (method as (...a: unknown[]) => unknown).bind(target) : method;
                }
                return (...innerArgs: unknown[]) => {
                  calls.push({ method: innerProp, args: innerArgs });
                  return Promise.resolve({ data: [], error: null });
                };
              },
            }
          );
        }
        return proxy;
      };
    },
  };

  const proxy = new Proxy({}, handler);
  return { proxy, calls };
}

function setClient(fromImpl: (table: string) => unknown) {
  vi.mocked(serverModule.createClient).mockResolvedValue({
    from: fromImpl,
  } as unknown as Awaited<ReturnType<typeof serverModule.createClient>>);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getSponsors — soft-delete filter (Bug 3, #215)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes .is('deleted_at', null) in the query chain", async () => {
    const { proxy, calls } = makeQuerySpy();
    setClient(() => proxy);

    await getSponsors({ year: 2026 });

    const isCall = calls.find(
      (c) => c.method === "is" && c.args[0] === "deleted_at" && c.args[1] === null
    );
    expect(isCall).toBeDefined();
  });

  it("applies .is('deleted_at', null) in addition to .eq('year', year)", async () => {
    const { proxy, calls } = makeQuerySpy();
    setClient(() => proxy);

    await getSponsors({ year: 2026 });

    const eqYearCall = calls.find(
      (c) => c.method === "eq" && c.args[0] === "year"
    );
    const isDeletedAtCall = calls.find(
      (c) => c.method === "is" && c.args[0] === "deleted_at" && c.args[1] === null
    );

    expect(eqYearCall).toBeDefined();
    expect(isDeletedAtCall).toBeDefined();
  });

  it("uses the current year when no year option is provided", async () => {
    const { proxy, calls } = makeQuerySpy();
    setClient(() => proxy);

    await getSponsors();

    const eqYearCall = calls.find(
      (c) => c.method === "eq" && c.args[0] === "year"
    );
    expect(eqYearCall).toBeDefined();
    expect(eqYearCall!.args[1]).toBe(new Date().getFullYear());
  });
});
