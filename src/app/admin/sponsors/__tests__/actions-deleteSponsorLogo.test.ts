/**
 * RED unit tests for deleteSponsorLogo — #217
 *
 * Target behaviour after Bolt fix:
 *   deleteSponsorLogo(oldLogoUrl) parses the filename from the URL,
 *   calls supabase.storage.from("logos").remove([filename]), and returns
 *   { success: true } or { error: string }.
 *
 * These tests FAIL against current main because:
 *   - deleteSponsorLogo is not exported from actions.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module-level mocks — hoisted before imports
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
import * as adminModule from "@/lib/supabase/admin";
// deleteSponsorLogo does not exist in actions.ts yet — import will fail until Bolt adds it.
// Using a dynamic cast so TypeScript doesn't block the import; the test itself will fail RED.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import * as actionsModule from "../actions";
const { deleteSponsorLogo } = actionsModule as unknown as {
  deleteSponsorLogo: (url: string) => Promise<{ success: true } | { error: string }>;
};

// ---------------------------------------------------------------------------
// Mock builder — storage chain
//
// Captures calls to supabase.storage.from(bucket).remove(paths)
// ---------------------------------------------------------------------------

interface StorageRemoveCall {
  bucket: string;
  paths: string[];
}

function makeStorageMock(removeResult: { error: { message: string } | null } = { error: null }) {
  const removeCalls: StorageRemoveCall[] = [];

  const fromMock = vi.fn((bucket: string) => ({
    remove: vi.fn(async (paths: string[]) => {
      removeCalls.push({ bucket, paths });
      return removeResult;
    }),
    // Other storage methods the action might call — not used in remove path
    upload: vi.fn(),
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: "" } })),
  }));

  return { fromMock, removeCalls };
}

function setClient(storageMock: ReturnType<typeof makeStorageMock>) {
  vi.mocked(serverModule.createClient).mockResolvedValue({
    from: vi.fn(),
    storage: { from: storageMock.fromMock },
  } as unknown as Awaited<ReturnType<typeof serverModule.createClient>>);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("deleteSponsorLogo (#217)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore requireAdmin to default passing mock
    vi.mocked(adminModule.requireAdmin).mockResolvedValue({ role: "admin" } as never);
  });

  // -------------------------------------------------------------------------
  // Test A: Filename parsed from URL and storage.remove called
  // FAILS on current main — function does not exist
  // -------------------------------------------------------------------------
  it("parses filename from URL and calls storage.remove with that filename", async () => {
    const { fromMock, removeCalls } = makeStorageMock();
    setClient({ fromMock, removeCalls });

    await deleteSponsorLogo(
      "https://kybfsxjruczbiokucyft.supabase.co/storage/v1/object/public/logos/abc-123.png"
    );

    expect(fromMock).toHaveBeenCalledWith("logos");
    expect(removeCalls).toHaveLength(1);
    expect(removeCalls[0].paths).toEqual(["abc-123.png"]);
  });

  // -------------------------------------------------------------------------
  // Test B: Returns { success: true } on success
  // FAILS on current main — function does not exist
  // -------------------------------------------------------------------------
  it("returns { success: true } when storage.remove succeeds", async () => {
    const mock = makeStorageMock({ error: null });
    setClient(mock);

    const result = await deleteSponsorLogo(
      "https://example.supabase.co/storage/v1/object/public/logos/my-file.svg"
    );

    expect(result).toEqual({ success: true });
  });

  // -------------------------------------------------------------------------
  // Test C: Returns { error: string } on storage failure
  // FAILS on current main — function does not exist
  // -------------------------------------------------------------------------
  it("returns { error: message } when storage.remove returns an error", async () => {
    const mock = makeStorageMock({ error: { message: "Object not found" } });
    setClient(mock);

    const result = await deleteSponsorLogo(
      "https://example.supabase.co/storage/v1/object/public/logos/missing-file.png"
    );

    expect(result).toEqual({ error: "Object not found" });
  });

  // -------------------------------------------------------------------------
  // Test D: requireAdmin called — auth guard regression check
  // FAILS on current main — function does not exist
  // -------------------------------------------------------------------------
  it("calls requireAdmin before doing any storage work", async () => {
    const mock = makeStorageMock();
    setClient(mock);

    await deleteSponsorLogo(
      "https://example.supabase.co/storage/v1/object/public/logos/file.png"
    );

    expect(vi.mocked(adminModule.requireAdmin)).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Test E: requireAdmin thrown — action propagates the throw
  // FAILS on current main — function does not exist
  // -------------------------------------------------------------------------
  it("re-throws when requireAdmin throws (auth guard is enforced)", async () => {
    vi.mocked(adminModule.requireAdmin).mockRejectedValue(new Error("Unauthorized"));

    await expect(
      deleteSponsorLogo(
        "https://example.supabase.co/storage/v1/object/public/logos/file.png"
      )
    ).rejects.toThrow("Unauthorized");
  });
});
