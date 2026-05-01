/**
 * recently-honored.test.tsx — Sprint 33 RED phase
 *
 * Pins the contract for the RecentlyHonored component:
 * 1. Server query returns top 20 tribute_recipient values ordered by created_at DESC
 * 2. Component renders each recipient name
 * 3. Empty-state renders without errors when no tribute purchases exist
 * 4. Renders at most 20 recipients (top-20 limit)
 * 5. Duplicate recipient names may appear if the same person was honored twice
 *
 * RED reason: RecentlyHonored component does not exist yet.
 * `src/app/(public)/sponsorships/recently-honored.tsx` is a new file
 * that Bolt writes in Phase 3. All tests fail with module-not-found errors.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import * as serverModule from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

type MockPurchase = {
  tribute_recipient: string;
  created_at: string;
};

function makePurchase(recipient: string, createdAt: string): MockPurchase {
  return { tribute_recipient: recipient, created_at: createdAt };
}

// ---------------------------------------------------------------------------
// Supabase mock helpers
// ---------------------------------------------------------------------------

function buildRecentlyHonoredMock(purchases: MockPurchase[]) {
  // Expected query chain:
  // supabase.from('sponsorship_purchases')
  //   .select('tribute_recipient, created_at')
  //   .not('tribute_recipient', 'is', null)
  //   .eq('payment_status', 'paid')
  //   .order('created_at', { ascending: false })
  //   .limit(20)

  const limitMock = vi.fn().mockResolvedValue({ data: purchases, error: null });
  const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
  const eqMock = vi.fn().mockReturnValue({ order: orderMock });
  const notMock = vi.fn().mockReturnValue({ eq: eqMock });
  const selectMock = vi.fn().mockReturnValue({ not: notMock });

  return {
    from: vi.fn((table: string) => {
      if (table === "sponsorship_purchases") {
        return { select: selectMock };
      }
      return {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
    }),
  };
}

function setClient(client: unknown) {
  vi.mocked(serverModule.createClient).mockResolvedValue(
    client as Awaited<ReturnType<typeof serverModule.createClient>>
  );
}

// ---------------------------------------------------------------------------
// Component loader
// ---------------------------------------------------------------------------

// Sprint 33 RED: recently-honored module does not exist yet.
// Use a dynamic string import to avoid tsc module-not-found errors.
// The runtime import will fail with ENOENT until Bolt creates the file.
const RECENTLY_HONORED_MODULE = "@/app/(public)/sponsorships/recently-honored";

async function loadAndRenderRecentlyHonored() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await (import(/* @vite-ignore */ RECENTLY_HONORED_MODULE) as Promise<any>);
  const RecentlyHonored = mod.default || mod.RecentlyHonored;
  if (!RecentlyHonored) {
    throw new Error("RecentlyHonored is not exported from recently-honored.tsx");
  }
  // Handle both sync components and async server components
  let resolvedJsx: React.ReactElement;
  const maybePromise = (RecentlyHonored as () => React.ReactElement | Promise<React.ReactElement>)();
  if (maybePromise instanceof Promise) {
    resolvedJsx = await maybePromise;
  } else {
    resolvedJsx = maybePromise;
  }
  return render(resolvedJsx);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("RecentlyHonored — server component (Sprint 33 RED)", () => {
  describe("module exists", () => {
    it("recently-honored.tsx module exists and exports a component", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await (import(/* @vite-ignore */ RECENTLY_HONORED_MODULE) as Promise<any>);
      const exported = mod.default || mod.RecentlyHonored;
      expect(exported).toBeDefined();
      expect(typeof exported).toBe("function");
    });
  });

  describe("renders tribute recipient names", () => {
    it("renders each tribute recipient name from the query", async () => {
      const purchases = [
        makePurchase("John Davenport", "2026-05-01T10:00:00Z"),
        makePurchase("Mary Smith", "2026-04-30T10:00:00Z"),
        makePurchase("Bob Johnson", "2026-04-29T10:00:00Z"),
      ];

      setClient(buildRecentlyHonoredMock(purchases));

      await loadAndRenderRecentlyHonored();

      expect(screen.getByText("John Davenport")).toBeInTheDocument();
      expect(screen.getByText("Mary Smith")).toBeInTheDocument();
      expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
    });

    it("renders recipients in created_at descending order (most recent first)", async () => {
      const purchases = [
        makePurchase("First Person", "2026-05-01T12:00:00Z"),
        makePurchase("Second Person", "2026-05-01T10:00:00Z"),
        makePurchase("Third Person", "2026-04-30T10:00:00Z"),
      ];

      setClient(buildRecentlyHonoredMock(purchases));

      await loadAndRenderRecentlyHonored();

      const items = screen.getAllByRole("listitem");
      // Most recent first
      expect(items[0]).toHaveTextContent("First Person");
      expect(items[1]).toHaveTextContent("Second Person");
      expect(items[2]).toHaveTextContent("Third Person");
    });
  });

  describe("top-20 limit", () => {
    it("renders at most 20 recipients even if more exist", async () => {
      // Mock returns exactly 20 (DB enforces limit)
      const purchases = Array.from({ length: 20 }, (_, i) =>
        makePurchase(`Recipient ${i + 1}`, `2026-05-01T${String(i).padStart(2, "0")}:00:00Z`)
      );

      setClient(buildRecentlyHonoredMock(purchases));

      await loadAndRenderRecentlyHonored();

      const items = screen.getAllByRole("listitem");
      expect(items).toHaveLength(20);
    });

    it("renders fewer than 20 recipients when fewer purchases exist", async () => {
      const purchases = [
        makePurchase("Only One", "2026-05-01T10:00:00Z"),
      ];

      setClient(buildRecentlyHonoredMock(purchases));

      await loadAndRenderRecentlyHonored();

      expect(screen.getByText("Only One")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("renders without errors when no tribute purchases exist", async () => {
      setClient(buildRecentlyHonoredMock([]));

      // Should not throw
      await expect(loadAndRenderRecentlyHonored()).resolves.toBeDefined();
    });

    it("does not crash and renders an empty-state message when list is empty", async () => {
      setClient(buildRecentlyHonoredMock([]));

      const { container } = await loadAndRenderRecentlyHonored();

      // Either renders an empty-state message or an empty list — no crash
      expect(container).toBeDefined();
      // No recipient items should appear
      const items = screen.queryAllByRole("listitem");
      // Items should be empty OR there should be an empty-state element
      const hasEmptyState = screen.queryByTestId("recently-honored-empty") !== null;
      expect(items.length === 0 || hasEmptyState).toBe(true);
    });
  });

  describe("duplicate recipients", () => {
    it("renders duplicate recipient names when the same person was honored twice", async () => {
      const purchases = [
        makePurchase("John Davenport", "2026-05-01T10:00:00Z"),
        makePurchase("John Davenport", "2026-04-15T10:00:00Z"),
        makePurchase("Mary Smith", "2026-04-01T10:00:00Z"),
      ];

      setClient(buildRecentlyHonoredMock(purchases));

      await loadAndRenderRecentlyHonored();

      // Both "John Davenport" entries should appear (not deduplicated by default)
      const johnEntries = screen.getAllByText("John Davenport");
      expect(johnEntries).toHaveLength(2);
    });
  });

  describe("query contract", () => {
    it("queries sponsorship_purchases for tribute_recipient field", async () => {
      const mockFrom = vi.fn();
      const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const notMock = vi.fn().mockReturnValue({ eq: eqMock });
      const selectMock = vi.fn().mockReturnValue({ not: notMock });

      mockFrom.mockImplementation((table: string) => {
        if (table === "sponsorship_purchases") {
          return { select: selectMock };
        }
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      setClient({ from: mockFrom });

      await loadAndRenderRecentlyHonored();

      expect(mockFrom).toHaveBeenCalledWith("sponsorship_purchases");
      // Verify the select call includes tribute_recipient
      expect(selectMock).toHaveBeenCalledWith(
        expect.stringContaining("tribute_recipient")
      );
    });

    it("orders results by created_at descending", async () => {
      const mockFrom = vi.fn();
      const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const notMock = vi.fn().mockReturnValue({ eq: eqMock });
      const selectMock = vi.fn().mockReturnValue({ not: notMock });

      mockFrom.mockImplementation((table: string) => {
        if (table === "sponsorship_purchases") return { select: selectMock };
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      setClient({ from: mockFrom });

      await loadAndRenderRecentlyHonored();

      expect(orderMock).toHaveBeenCalledWith(
        "created_at",
        expect.objectContaining({ ascending: false })
      );
    });

    it("applies a limit of 20 to the query", async () => {
      const mockFrom = vi.fn();
      const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const notMock = vi.fn().mockReturnValue({ eq: eqMock });
      const selectMock = vi.fn().mockReturnValue({ not: notMock });

      mockFrom.mockImplementation((table: string) => {
        if (table === "sponsorship_purchases") return { select: selectMock };
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      setClient({ from: mockFrom });

      await loadAndRenderRecentlyHonored();

      expect(limitMock).toHaveBeenCalledWith(20);
    });

    it("filters to exclude null tribute_recipient values", async () => {
      const mockFrom = vi.fn();
      const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const notMock = vi.fn().mockReturnValue({ eq: eqMock });
      const selectMock = vi.fn().mockReturnValue({ not: notMock });

      mockFrom.mockImplementation((table: string) => {
        if (table === "sponsorship_purchases") return { select: selectMock };
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      setClient({ from: mockFrom });

      await loadAndRenderRecentlyHonored();

      // Must filter out NULL tribute_recipient values
      expect(notMock).toHaveBeenCalledWith(
        "tribute_recipient",
        "is",
        null
      );
    });

    it("filters to only paid sponsorship_purchases (payment_status = 'paid')", async () => {
      const mockFrom = vi.fn();
      const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const eqSpy = vi.fn().mockReturnValue({ order: orderMock });
      const notMock = vi.fn().mockReturnValue({ eq: eqSpy });
      const selectMock = vi.fn().mockReturnValue({ not: notMock });

      mockFrom.mockImplementation((table: string) => {
        if (table === "sponsorship_purchases") return { select: selectMock };
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      setClient({ from: mockFrom });

      await loadAndRenderRecentlyHonored();

      // Privacy contract: only paid rows must be returned — never pending/abandoned
      expect(eqSpy).toHaveBeenCalledWith("payment_status", "paid");
    });
  });
});
