/**
 * AdminPageHeading — tests for Sprint 19 PR A font-heading swap
 *
 * Source: src/components/admin/admin-page-heading.tsx (EXISTING, modified)
 *
 * Change: h1 class swaps font-sans → font-heading (Fraunces via CSS var).
 * Subtitle <p> retains font-sans.
 *
 * Tests 1–2 verify existing behavior still works after the swap.
 * Tests 3–4 are the NEW assertions that drive the PR A change.
 *
 * These tests PARTIALLY FAIL in RED phase:
 * - Tests 1–2 PASS (current code satisfies them)
 * - Tests 3–4 FAIL (h1 currently has font-sans, not font-heading)
 *
 * Notes for Bolt:
 * - Change line 15 of admin-page-heading.tsx: font-sans → font-heading on the h1
 * - Do NOT change the <p> description element — it stays font-sans
 * - Do not change any other props or behavior
 *
 * Issue: #208 (Sprint 19 / PR A)
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";

describe("AdminPageHeading", () => {
  // ---------------------------------------------------------------------------
  // Existing behavior — must continue to pass after font-heading swap
  // ---------------------------------------------------------------------------
  describe("existing behavior", () => {
    it("renders the title as an <h1> with the provided text", () => {
      render(<AdminPageHeading title="Sponsors" />);
      expect(
        screen.getByRole("heading", { level: 1, name: "Sponsors" })
      ).toBeInTheDocument();
    });

    it("renders description as a <p> when provided", () => {
      render(
        <AdminPageHeading
          title="Contacts"
          description="Manage your contact database."
        />
      );
      const desc = screen.getByText("Manage your contact database.");
      expect(desc.tagName).toBe("P");
    });

    it("does not render a description element when description prop is omitted", () => {
      render(<AdminPageHeading title="Scores" />);
      // Only the h1 heading — no supplementary paragraph
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
      // No description paragraph in the DOM
      expect(document.querySelectorAll("p")).toHaveLength(0);
    });

    it("renders children in the right-side slot when provided", () => {
      render(
        <AdminPageHeading title="Photos">
          <button>Upload</button>
        </AdminPageHeading>
      );
      expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // NEW — font-heading swap (these FAIL in RED phase, pass after Bolt's change)
  // ---------------------------------------------------------------------------
  describe("font-heading class on h1 (Sprint 19 change)", () => {
    it("h1 has font-heading class (Fraunces — NOT font-sans)", () => {
      render(<AdminPageHeading title="Dashboard" />);
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1.className).toMatch(/font-heading/);
      expect(h1.className).not.toMatch(/font-sans/);
    });

    it("description <p> retains font-sans class after the h1 swap", () => {
      render(
        <AdminPageHeading
          title="Event Settings"
          description="Configure the current tournament event."
        />
      );
      const desc = screen.getByText("Configure the current tournament event.");
      expect(desc.className).toMatch(/font-sans/);
    });
  });
});
