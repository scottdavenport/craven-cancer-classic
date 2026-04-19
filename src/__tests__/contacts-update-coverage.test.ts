/**
 * S10-8: updateContact coverage sweep
 *
 * Complements contacts-actions.test.ts (which covers happy path, email normalization,
 * duplicate email, and unauthorized).
 *
 * Fills branch gaps for updateContact:
 * - ZIP validation in update returns error (line 259 uncovered)
 * - name change path: fetches existing + re-derives full_name (lines 265–283 uncovered)
 * - name change path: fetch error propagates (line 270 uncovered)
 * - name change path: all-blank merged state returns error (line 280 uncovered)
 * - generic DB error (non-23505) returns { error: message } (line 293 uncovered)
 * - phone validation in update returns error
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
import { updateContact } from "@/app/admin/contacts/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setClient(client: unknown) {
  vi.mocked(serverModule.createClient).mockResolvedValue(
    client as Awaited<ReturnType<typeof serverModule.createClient>>
  );
}

/** Build a chainable update mock: from().update().eq() */
function makeUpdateChain(result: {
  error: null | { message: string; code?: string };
}) {
  const mockEq = vi.fn().mockResolvedValue(result);
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  return { update: mockUpdate, _mockEq: mockEq };
}

/** Build a chainable .select().eq().single() fetch mock */
function makeFetchSingleChain(result: {
  data: Record<string, unknown> | null;
  error: null | { message: string };
}) {
  const mockSingle = vi.fn().mockResolvedValue(result);
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  return { select: mockSelect, _mockEq: mockEq, _mockSingle: mockSingle };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
});

// ---------------------------------------------------------------------------
// ZIP validation in update (line 259)
// ---------------------------------------------------------------------------

describe("updateContact — ZIP validation", () => {
  it("returns error when ZIP does not match US format (covers line 259)", async () => {
    // The update chain is never reached for a ZIP validation error
    setClient({ from: vi.fn() });

    const result = await updateContact("contact-uuid", { zip: "BADZIP" });

    expect(result).toMatchObject({
      error: expect.stringMatching(/ZIP must be 5 digits/i),
    });
  });

  it("accepts valid 5-digit ZIP without error", async () => {
    const chain = makeUpdateChain({ error: null });
    setClient({ from: vi.fn().mockReturnValue(chain) });

    const result = await updateContact("contact-uuid", { zip: "28562" });

    expect(result).toEqual({ ok: true });
  });

  it("accepts valid ZIP+4 without error", async () => {
    const chain = makeUpdateChain({ error: null });
    setClient({ from: vi.fn().mockReturnValue(chain) });

    const result = await updateContact("contact-uuid", { zip: "28562-1234" });

    expect(result).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// Phone validation in update
// ---------------------------------------------------------------------------

describe("updateContact — phone validation", () => {
  it("returns error when phone is invalid", async () => {
    setClient({ from: vi.fn() });

    const result = await updateContact("contact-uuid", { phone: "garbage" });

    expect(result).toMatchObject({ error: expect.stringMatching(/phone/i) });
  });
});

// ---------------------------------------------------------------------------
// Name change path — fetch + re-derive full_name (lines 265–283)
// ---------------------------------------------------------------------------

describe("updateContact — name change path", () => {
  it("fetches existing names, merges, re-derives full_name when first_name is updated (covers lines 265–283)", async () => {
    const fetchChain = makeFetchSingleChain({
      data: { first_name: "OldFirst", last_name: "Smith", company: null },
      error: null,
    });
    const updateChain = makeUpdateChain({ error: null });

    // from() is called twice: once for the fetch (.select), once for the update
    const mockFrom = vi.fn()
      .mockReturnValueOnce(fetchChain)  // fetch existing
      .mockReturnValueOnce(updateChain); // update

    setClient({ from: mockFrom });

    const result = await updateContact("contact-uuid", { first_name: "NewFirst" });

    expect(result).toEqual({ ok: true });
    // full_name should be re-derived from merged state: "NewFirst Smith"
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ full_name: "NewFirst Smith" })
    );
  });

  it("uses existing last_name when only first_name is changed", async () => {
    const fetchChain = makeFetchSingleChain({
      data: { first_name: "Alice", last_name: "Brown", company: "Acme" },
      error: null,
    });
    const updateChain = makeUpdateChain({ error: null });
    const mockFrom = vi.fn()
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain);

    setClient({ from: mockFrom });

    await updateContact("contact-uuid", { first_name: "Alicia" });

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ full_name: "Alicia Brown" })
    );
  });

  it("fetch error — returns { error: fetchError.message } (covers line 270)", async () => {
    const fetchChain = makeFetchSingleChain({
      data: null,
      error: { message: "row not found" },
    });

    // Only one from() call — the fetch itself fails
    setClient({ from: vi.fn().mockReturnValue(fetchChain) });

    const result = await updateContact("contact-uuid", { last_name: "Newname" });

    expect(result).toMatchObject({ error: "row not found" });
  });

  it("all-blank merged state — returns presence error (covers line 280)", async () => {
    // The existing contact has first="Old", last=null, company=null
    // The update clears first_name to empty string — merged result is all blank
    const fetchChain = makeFetchSingleChain({
      data: { first_name: "Old", last_name: null, company: null },
      error: null,
    });

    setClient({ from: vi.fn().mockReturnValue(fetchChain) });

    const result = await updateContact("contact-uuid", { first_name: "" });

    expect(result).toMatchObject({
      error: expect.stringMatching(/first\/last name or a company/i),
    });
  });
});

// ---------------------------------------------------------------------------
// Generic DB error (non-23505) in final update (line 293)
// ---------------------------------------------------------------------------

describe("updateContact — generic DB error", () => {
  it("returns { error: message } for non-unique-constraint DB error (covers line 293)", async () => {
    const updateChain = makeUpdateChain({ error: { message: "write failed" } });
    setClient({ from: vi.fn().mockReturnValue(updateChain) });

    const result = await updateContact("contact-uuid", { type: "donor" });

    expect(result).toMatchObject({ error: "write failed" });
  });
});
