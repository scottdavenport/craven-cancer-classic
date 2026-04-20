// Runs in UTC; explicit timeZone: 'UTC' in helper is required for consistent output across runner timezones.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatTournamentDate } from "@/lib/event-settings";

// ---------------------------------------------------------------------------
// Module-level mocks for updateEventSettings tests
// ---------------------------------------------------------------------------

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
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
import { updateEventSettings } from "@/app/admin/event/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setClient(client: unknown) {
  vi.mocked(serverModule.createClient).mockResolvedValue(
    client as Awaited<ReturnType<typeof serverModule.createClient>>
  );
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

/** Returns a valid base FormData that passes all current validations. */
function validFormData(overrides: Record<string, string> = {}): FormData {
  return makeFormData({
    name: "Craven Cancer Classic",
    description: "A great tournament",
    registration_fee: "700",
    morning_cap: "36",
    afternoon_cap: "36",
    tournament_start_date: "2026-09-18",
    tournament_end_date: "2026-09-19",
    venue_name: "New Bern Golf & Country Club",
    ...overrides,
  });
}

/** Builds a mock Supabase client whose .from() chain simulates "existing row" found + update success. */
function makeUpdateClient(opts: { updateError?: string | null } = {}) {
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: opts.updateError ? { message: opts.updateError } : null }),
  });
  const mockSingleForExisting = vi.fn().mockResolvedValue({ data: { id: "existing-id" } });
  const mockSingleForSelect = vi.fn().mockReturnValue({ single: mockSingleForExisting });
  const mockSelectChain = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingleForExisting }) });

  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelectChain,
    update: mockUpdate,
    insert: vi.fn(),
  });

  return { client: { from: mockFrom }, mockUpdate, mockFrom };
}

/** Builds a mock Supabase client that simulates "no existing row" (insert path). */
function makeInsertClient() {
  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  const mockSingleForExisting = vi.fn().mockResolvedValue({ data: null });
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingleForExisting }) }),
    update: vi.fn(),
    insert: mockInsert,
  });
  return { client: { from: mockFrom }, mockInsert, mockFrom };
}

describe("formatTournamentDate", () => {
  it('returns "Date TBD" when start is null', () => {
    expect(formatTournamentDate(null, null)).toBe("Date TBD");
  });

  it("formats a single date with no end date", () => {
    expect(formatTournamentDate("2026-09-18", null)).toBe("September 18, 2026");
  });

  it("formats as single day when start and end are the same date", () => {
    expect(formatTournamentDate("2026-09-18", "2026-09-18")).toBe(
      "September 18, 2026"
    );
  });

  it("formats same-month range with en-dash", () => {
    expect(formatTournamentDate("2026-09-18", "2026-09-19")).toBe(
      "September 18–19, 2026"
    );
  });

  it("formats cross-month range with spaced en-dash", () => {
    expect(formatTournamentDate("2026-08-31", "2026-09-01")).toBe(
      "August 31 – September 1, 2026"
    );
  });

  it('returns "Date TBD" for invalid date strings without crashing', () => {
    expect(formatTournamentDate("invalid", "bad")).toBe("Date TBD");
  });
});

// ---------------------------------------------------------------------------
// updateEventSettings — validation (RED: these fail until Bolt implements #155)
// ---------------------------------------------------------------------------

describe("updateEventSettings — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminModule.requireAdmin).mockResolvedValue({ role: "admin" } as Awaited<ReturnType<typeof adminModule.requireAdmin>>);
  });

  // ── requireAdmin ──────────────────────────────────────────────────────────

  it("requireAdmin throws → returns { error: 'Unauthorized' }, Supabase update not called", async () => {
    vi.mocked(adminModule.requireAdmin).mockRejectedValue(new Error("Not authorized"));
    const { client, mockFrom } = makeUpdateClient();
    setClient(client);

    const result = await updateEventSettings(validFormData());

    expect((result as { error: string }).error).toBe("Unauthorized");
    // Supabase should not have been touched at all — from() never called for update
    const updateCalls = (mockFrom.mock.results ?? []).flatMap(() => []);
    // Simpler assertion: the action returned before reaching createClient
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // ── Fee validation ────────────────────────────────────────────────────────

  it("negative fee → returns { error }, Supabase update not called", async () => {
    const { client, mockUpdate } = makeUpdateClient();
    setClient(client);

    const result = await updateEventSettings(validFormData({ registration_fee: "-10" }));

    expect((result as { error: string }).error).toMatch(/fee|invalid/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("non-numeric fee ('abc') → returns { error }, Supabase update not called", async () => {
    const { client, mockUpdate } = makeUpdateClient();
    setClient(client);

    const result = await updateEventSettings(validFormData({ registration_fee: "abc" }));

    expect((result as { error: string }).error).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // ── Cap validation ────────────────────────────────────────────────────────

  it("morning_cap = 0 → returns { error }, Supabase update not called", async () => {
    const { client, mockUpdate } = makeUpdateClient();
    setClient(client);

    const result = await updateEventSettings(validFormData({ morning_cap: "0" }));

    expect((result as { error: string }).error).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("afternoon_cap = -5 → returns { error }, Supabase update not called", async () => {
    const { client, mockUpdate } = makeUpdateClient();
    setClient(client);

    const result = await updateEventSettings(validFormData({ afternoon_cap: "-5" }));

    expect((result as { error: string }).error).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // ── Date range validation ─────────────────────────────────────────────────

  it("end date before start date → returns { error: /end date.*on or after/i }, not written", async () => {
    const { client, mockUpdate } = makeUpdateClient();
    setClient(client);

    const result = await updateEventSettings(
      validFormData({ tournament_start_date: "2026-09-18", tournament_end_date: "2026-09-17" })
    );

    expect((result as { error: string }).error).toMatch(/end date.*on or after/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("both dates null → passes validation, Supabase write is called", async () => {
    const { client, mockUpdate } = makeUpdateClient();
    setClient(client);

    // FormData with empty strings for dates (converts to null in action)
    const fd = validFormData({ tournament_start_date: "", tournament_end_date: "" });
    const result = await updateEventSettings(fd);

    expect((result as { error?: string }).error).toBeUndefined();
    expect((result as { success?: boolean }).success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("start date set, end date null → passes validation, Supabase write is called", async () => {
    const { client, mockUpdate } = makeUpdateClient();
    setClient(client);

    const fd = validFormData({ tournament_start_date: "2026-09-17", tournament_end_date: "" });
    const result = await updateEventSettings(fd);

    expect((result as { error?: string }).error).toBeUndefined();
    expect((result as { success?: boolean }).success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  // ── Name validation ───────────────────────────────────────────────────────

  it("empty name → returns { error }, Supabase update not called", async () => {
    const { client, mockUpdate } = makeUpdateClient();
    setClient(client);

    const result = await updateEventSettings(validFormData({ name: "" }));

    expect((result as { error: string }).error).toMatch(/name/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("name = 101 chars → returns { error }, Supabase update not called", async () => {
    const { client, mockUpdate } = makeUpdateClient();
    setClient(client);

    const result = await updateEventSettings(validFormData({ name: "x".repeat(101) }));

    expect((result as { error: string }).error).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // ── Description validation ────────────────────────────────────────────────

  it("description = 2001 chars → returns { error }, Supabase update not called", async () => {
    const { client, mockUpdate } = makeUpdateClient();
    setClient(client);

    const result = await updateEventSettings(validFormData({ description: "x".repeat(2001) }));

    expect((result as { error: string }).error).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // ── Happy path regression guard ───────────────────────────────────────────

  it("happy path (all valid inputs, existing row) → calls Supabase update, returns { success: true }", async () => {
    const { client, mockUpdate } = makeUpdateClient();
    setClient(client);

    const result = await updateEventSettings(validFormData());

    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});
