/**
 * Sprint 19 — PR C RED tests: photo-moderation.tsx polish
 *
 * Tests:
 * 1. Delete button has title="Delete photo" (accessibility tooltip)
 * 2. Empty state (zero pending photos) uses AdminEmptyState (<h3> title)
 *
 * Tests are RED: they describe PR C behaviour, failing against main at 846a6f4.
 *
 * Notes for Bolt:
 * - AdminEmptyState is a new component from PR A (src/components/admin/admin-empty-state.tsx).
 *   It renders an <h3> for the title. The current empty state in photo-moderation is
 *   a bare <p> — this test will fail because <h3> is absent.
 * - The delete button (Trash2 icon) currently has no title attribute — add title="Delete photo".
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mock server actions
// ---------------------------------------------------------------------------
vi.mock("@/app/admin/photos/actions", () => ({
  updatePhotoStatus: vi.fn(),
  deletePhoto: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { PhotoModeration } from "@/app/admin/photos/photo-moderation";
import type { Photo } from "@/types/database";

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: "photo-uuid-1",
    image_url: "https://example.com/photo.jpg",
    caption: "Tournament highlight",
    status: "pending",
    uploaded_by_name: "John Doe",
    uploaded_by_email: "john@example.com",
    year: 2026,
    created_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

describe("PhotoModeration — sprint-19 PR-C polish", () => {
  describe("delete button tooltip", () => {
    it("delete button has title='Delete photo'", () => {
      render(<PhotoModeration photos={[makePhoto()]} />);

      // The delete button is a ghost Button with Trash2 icon — no aria-label currently.
      // PR C: add title="Delete photo" for accessibility.
      const deleteBtn = document.querySelector("button[title='Delete photo']");

      // RED: no title attribute on main; PR C must add it
      expect(deleteBtn).not.toBeNull();
    });
  });

  describe("empty state", () => {
    it("renders AdminEmptyState (<h3> title) when there are no pending photos", () => {
      // Default tab is "pending"; render with no photos at all
      render(<PhotoModeration photos={[]} />);

      // RED: current empty state is a bare <p> "No pending photos"
      // PR C: replaces with AdminEmptyState which renders <h3>
      const h3Els = document.querySelectorAll("h3");
      const hasEmptyStateHeading = Array.from(h3Els).some((h3) =>
        h3.textContent?.match(/no.*photo|photo.*empty|nothing here/i)
      );

      expect(hasEmptyStateHeading).toBe(true);
    });
  });
});
