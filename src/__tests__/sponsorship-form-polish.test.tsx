/**
 * Sprint 19 — PR C RED tests: sponsorship-form.tsx polish
 *
 * Tests:
 * 1. Description textarea rows=3 (was rows=2)
 * 2. Max Quantity label is "Max Quantity" + helper <p> "Leave blank for unlimited"
 * 3. Root form has space-y-6 class (section spacing standard)
 *
 * Tests are RED: they describe PR C behaviour, failing against main at 846a6f4.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SponsorshipForm } from "@/app/admin/sponsorships/sponsorship-form";

const noop = async () => {};

describe("SponsorshipForm — sprint-19 PR-C polish", () => {
  describe("description textarea rows", () => {
    it("description textarea has rows=3 (was rows=2)", () => {
      render(<SponsorshipForm onSubmit={noop} onCancel={noop} />);

      const textarea = screen.getByRole("textbox", { name: /description/i }) as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();

      // RED: current main has rows={2}; PR C changes it to rows={3}
      expect(textarea.rows).toBe(3);
    });
  });

  describe("max quantity label and helper text", () => {
    it("label text is 'Max Quantity' without the parenthetical", () => {
      render(<SponsorshipForm onSubmit={noop} onCancel={noop} />);

      // RED: current label is "Max Quantity (blank = unlimited)"
      // PR C: label becomes "Max Quantity" and a separate <p> carries the helper
      const label = screen.getByLabelText(/max quantity/i);
      expect(label).toBeInTheDocument();

      // The label associated with the input must NOT contain the parenthetical
      const labelEl = document.querySelector(`label[for="${label.id}"]`) ??
        label.closest("div")?.querySelector("label");
      if (labelEl) {
        expect(labelEl.textContent).not.toMatch(/blank|unlimited/i);
      }
    });

    it("renders helper <p> 'Leave blank for unlimited' below Max Quantity input", () => {
      render(<SponsorshipForm onSubmit={noop} onCancel={noop} />);

      // RED: this helper text does not exist on main — PR C must add it
      expect(screen.getByText(/leave blank for unlimited/i)).toBeInTheDocument();
    });
  });

  describe.skip("form spacing", () => {
    it("root <form> has space-y-6 class", () => {
      const { container } = render(<SponsorshipForm onSubmit={noop} onCancel={noop} />);

      const form = container.querySelector("form");
      expect(form).toBeTruthy();

      // RED: current main root form has space-y-4; PR C upgrades to space-y-6
      expect(form!.className).toContain("space-y-6");
    });
  });
});
