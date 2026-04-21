/**
 * AdminEmptyState — RED phase tests for Sprint 19 PR A
 *
 * Component will live at: src/components/admin/admin-empty-state.tsx
 *
 * These tests FAIL until Bolt creates the component (module not found).
 * Failure mode expected: "Cannot find module '@/components/admin/admin-empty-state'"
 *
 * Notes for Bolt:
 * - Container: py-12 flex flex-col items-center gap-3 text-center
 * - Icon: renders at size-8 text-muted-foreground/50 — use data-testid="empty-state-icon"
 *   OR detect by role="img" aria-label; prefer data-testid for disambiguation
 * - Default icon is Lucide Inbox — render with data-testid="empty-state-icon"
 * - Custom icon prop replaces Inbox — same data-testid is fine (only one icon renders)
 * - Title: <h3 className="text-sm font-semibold text-foreground">
 * - Body: <p className="text-sm text-muted-foreground max-w-[280px]"> — only when prop provided
 * - action: rendered as-is below body (React.ReactNode)
 * - Use data-testid="empty-state-icon" on the icon wrapper/svg if disambiguation needed
 *
 * Issue: #208 (Sprint 19)
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileText } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";

describe("AdminEmptyState", () => {
  // ---------------------------------------------------------------------------
  // 1. Title
  // ---------------------------------------------------------------------------
  describe("title", () => {
    it("renders title as <h3> with the provided text", () => {
      render(<AdminEmptyState title="No sponsors yet" />);
      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("No sponsors yet");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Body (optional)
  // ---------------------------------------------------------------------------
  describe("body prop", () => {
    it("renders body text as <p> when provided", () => {
      render(
        <AdminEmptyState
          title="No sponsors yet"
          body="Add your first sponsor to get started."
        />
      );
      const bodyEl = screen.getByText("Add your first sponsor to get started.");
      expect(bodyEl.tagName).toBe("P");
    });

    it("does not render a body <p> when body prop is omitted", () => {
      render(<AdminEmptyState title="No sponsors yet" />);
      // No paragraph with body-like muted text should exist
      // We verify by checking nothing matches that class pattern beyond the title
      const paras = document.querySelectorAll("p");
      // If body is absent the only content is the title h3 and the icon
      expect(paras).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Action slot
  // ---------------------------------------------------------------------------
  describe("action prop", () => {
    it("renders the action node when provided", () => {
      render(
        <AdminEmptyState
          title="No sponsors yet"
          action={<button>Add Sponsor</button>}
        />
      );
      expect(
        screen.getByRole("button", { name: "Add Sponsor" })
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 4–5. Icon
  // ---------------------------------------------------------------------------
  describe("icon", () => {
    it("renders the default Inbox icon when no icon prop is supplied", () => {
      render(<AdminEmptyState title="No sponsors yet" />);
      // Default icon should be present via data-testid or svg
      const icon = document.querySelector("[data-testid='empty-state-icon']");
      expect(icon).not.toBeNull();
    });

    it("renders the custom icon and NOT the default Inbox icon when icon prop is provided", () => {
      render(
        <AdminEmptyState
          title="No scores yet"
          icon={FileText}
        />
      );
      // The custom icon should be rendered (Lucide FileText SVG)
      // Assert via data-testid; the icon wrapper is still present
      const icon = document.querySelector("[data-testid='empty-state-icon']");
      expect(icon).not.toBeNull();
      // The Inbox-specific aria-label or test attribute should NOT be present
      // Bolt: add data-testid="empty-state-inbox-default" to the Inbox render path
      // so we can assert its absence here
      expect(
        document.querySelector("[data-testid='empty-state-inbox-default']")
      ).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 6–7. Container classes
  // ---------------------------------------------------------------------------
  describe("container classes", () => {
    it("container has text-center class", () => {
      const { container } = render(<AdminEmptyState title="Nothing here" />);
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toMatch(/text-center/);
    });

    it("container has py-12 class for vertical padding", () => {
      const { container } = render(<AdminEmptyState title="Nothing here" />);
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toMatch(/py-12/);
    });
  });
});
