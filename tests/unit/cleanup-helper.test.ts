/**
 * Unit tests for tests/e2e/fixtures/cleanup-helper.ts
 *
 * Uses vi.mock to stub the Supabase client — avoids requiring a live
 * `supabase start` stack for CI. The mock simulates the exact chainable
 * Supabase JS v2 API (.from().select()/.delete()/.in()/.ilike()/.eq()).
 *
 * To run against a live local stack instead, remove the vi.mock block and
 * set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to the local
 * Supabase values printed by `npx supabase start`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Env setup (must happen before the module import) ──────────────────────────
const MOCK_URL = "http://localhost:54321";
const MOCK_KEY = "mock-service-role-key";

vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", MOCK_URL);
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", MOCK_KEY);

// ── Mock @supabase/supabase-js ────────────────────────────────────────────────
//
// The Supabase JS client uses a fluent builder API. We mock it by returning a
// chain object where each method returns `this`, and the terminal awaitable
// returns { data, error } from a configurable stub.

type MockQueryResult = { data: unknown[] | null; error: { message: string } | null };

// Per-table response map — tests override this before each scenario.
const tableResponses = new Map<string, MockQueryResult>();

function makeChain(response: MockQueryResult) {
  const chain = {
    select: () => chain,
    delete: () => chain,
    ilike: () => chain,
    in: () => chain,
    eq: () => chain,
    // Thenable — allows `await client.from('x').delete().in(...)` to resolve
    then: (resolve: (v: MockQueryResult) => void) => {
      resolve(response);
      return Promise.resolve(response);
    },
  };
  return chain;
}

const mockFrom = vi.fn((table: string) => {
  const response = tableResponses.get(table) ?? { data: [], error: null };
  return makeChain(response);
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// ── Import after mocks + env are wired ───────────────────────────────────────
const { cleanupTestData, registerOrphan } = await import(
  "../e2e/fixtures/cleanup-helper"
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function setTableResponse(
  table: string,
  data: unknown[] | null,
  error: { message: string } | null = null
) {
  tableResponses.set(table, { data, error });
}

function resetTableResponses() {
  tableResponses.clear();
  // Default: contacts returns empty (no e2e rows found)
  setTableResponse("contacts", []);
  setTableResponse("teams", []);
  setTableResponse("team_members", []);
  setTableResponse("scores", []);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("cleanupTestData", () => {
  beforeEach(() => {
    resetTableResponses();
    mockFrom.mockClear();
  });

  afterEach(() => {
    tableResponses.clear();
  });

  it("(a) deletes marker rows and returns per-table counts", async () => {
    // Simulate: 2 e2e contacts, 1 team (captain = contact[0]), 1 score, 1 team_member
    setTableResponse("contacts", [
      { id: "c1", email: "e2e-test-abc@example.com" },
      { id: "c2", email: "e2e-test-def@example.com" },
    ]);
    setTableResponse("teams", [{ id: "t1" }]);
    setTableResponse("scores", [{ id: "s1" }]);
    setTableResponse("team_members", [{ id: "m1" }]);

    const result = await cleanupTestData("test");

    expect(result.deleted.contacts).toBe(2);
    expect(result.deleted.teams).toBe(1);
    expect(result.deleted.scores).toBe(1);
    expect(result.deleted.team_members).toBe(1);
  });

  it("(b) is idempotent — second call returns all-zeros without throwing", async () => {
    // First call — no rows (already deleted or never existed)
    resetTableResponses(); // contacts returns []

    const first = await cleanupTestData("test");
    expect(first.deleted).toEqual({
      scores: 0,
      team_members: 0,
      teams: 0,
      contacts: 0,
    });

    // Second call — same result, no throw
    const second = await cleanupTestData("test");
    expect(second.deleted).toEqual({
      scores: 0,
      team_members: 0,
      teams: 0,
      contacts: 0,
    });
  });

  it("throws with table name on contacts query failure", async () => {
    // Override contacts select to return an error
    tableResponses.set("contacts", {
      data: null,
      error: { message: "connection refused" },
    });

    await expect(cleanupTestData("test")).rejects.toThrow("contacts");
  });

  it("throws with table name on scores delete failure", async () => {
    setTableResponse("contacts", [{ id: "c1" }]);
    setTableResponse("teams", [{ id: "t1" }]);
    // scores delete fails
    tableResponses.set("scores", {
      data: null,
      error: { message: "FK violation" },
    });
    setTableResponse("team_members", []);

    await expect(cleanupTestData("test")).rejects.toThrow("scores");
  });

  it("throws with table name on team_members delete failure", async () => {
    setTableResponse("contacts", [{ id: "c1" }]);
    setTableResponse("teams", []);
    setTableResponse("scores", []);
    tableResponses.set("team_members", {
      data: null,
      error: { message: "permission denied" },
    });

    await expect(cleanupTestData("test")).rejects.toThrow("team_members");
  });

  it("throws with table name on teams delete failure", async () => {
    setTableResponse("contacts", [{ id: "c1" }]);
    tableResponses.set("teams", {
      data: null,
      error: { message: "FK violation" },
    });
    setTableResponse("scores", []);
    setTableResponse("team_members", []);

    await expect(cleanupTestData("test")).rejects.toThrow("teams");
  });
});

describe("registerOrphan", () => {
  beforeEach(() => {
    resetTableResponses();
    mockFrom.mockClear();
  });

  it("(c) registers a row by ID and cleanupTestData deletes it via eq", async () => {
    const seedTag = "orphan-test";
    registerOrphan("contacts", "orphan-id-001", seedTag);

    // contacts select returns empty (no pattern-match rows)
    setTableResponse("contacts", []);

    // The orphan delete will call .eq("id", "orphan-id-001")
    // mockFrom chain returns the default response (data: [], error: null) — no throw
    const result = await cleanupTestData(seedTag);

    // Orphan registry entry was consumed — counts come from the chain mock
    // (data: [] → length 0)
    expect(result.deleted.contacts).toBe(0);

    // Confirm mockFrom was called with "contacts" for the orphan delete
    const contactCalls = mockFrom.mock.calls.filter((c) => c[0] === "contacts");
    expect(contactCalls.length).toBeGreaterThan(0);
  });

  it("second cleanupTestData call after registerOrphan does not re-delete", async () => {
    const seedTag = "orphan-idempotent";
    registerOrphan("teams", "t-orphan-001", seedTag);

    setTableResponse("contacts", []);
    setTableResponse("teams", []);

    // First call — consumes the orphan
    await cleanupTestData(seedTag);
    mockFrom.mockClear();

    // Second call — orphan registry is cleared; mockFrom should not see
    // any unexpected delete targeting the orphan ID
    await cleanupTestData(seedTag);

    // No calls to "teams" since contactIds was empty and no orphans remain
    const teamCalls = mockFrom.mock.calls.filter((c) => c[0] === "teams");
    expect(teamCalls.length).toBe(0);
  });
});
