/**
 * S3-2: getApprovedPhotos() must use .range() for pagination (24 photos per page).
 *
 * Tests assert the Supabase query chain calls `.range(offset, offset + 23)`.
 * The tests fail today because the implementation fetches all rows with no .range().
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock next/headers (required by server createClient)
// ---------------------------------------------------------------------------
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Supabase mock — spy on .range() call
// ---------------------------------------------------------------------------
const mockRange = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
const mockOrder2 = vi.fn(() => ({ range: mockRange }));
const mockOrder1 = vi.fn(() => ({ order: mockOrder2 }));
const mockEq = vi.fn(() => ({ order: mockOrder1 }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));
const mockCreateClient = vi.fn().mockResolvedValue({ from: mockFrom });

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockRange.mockResolvedValue({ data: [], error: null, count: 0 });
  mockOrder2.mockReturnValue({ range: mockRange });
  mockOrder1.mockReturnValue({ order: mockOrder2 });
  mockEq.mockReturnValue({ order: mockOrder1 });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
  mockCreateClient.mockResolvedValue({ from: mockFrom });
});

describe("S3-2 gallery pagination", () => {
  describe("getApprovedPhotos() query shape", () => {
    it("calls .range(0, 23) on the first page (default/no page param)", async () => {
      // Import the page module — it exports getApprovedPhotos indirectly via default render.
      // We trigger the page render to exercise the data fetch.
      // Since the page is an async server component, we call it directly.
      const mod = await import("@/app/(public)/gallery/page");
      await mod.default();

      expect(mockRange).toHaveBeenCalled();
      const [start, end] = mockRange.mock.calls[0];
      expect(start).toBe(0);
      expect(end).toBe(23);
    });

    it("fetches only 24 photos per call (range end - start + 1 = 24)", async () => {
      const mod = await import("@/app/(public)/gallery/page");
      await mod.default();

      const [start, end] = mockRange.mock.calls[0];
      expect(end - start + 1).toBe(24);
    });
  });
});
