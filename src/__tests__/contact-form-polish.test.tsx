/**
 * Sprint 19 — PR C RED tests: contact-form.tsx polish
 *
 * Tests:
 * 1. Marketing consent Switch (role="switch") — replaces raw checkbox
 * 2. Actions div no pb-4 (doubled-padding fix)
 * 3. Salutation max-w-[120px]
 *
 * All tests are RED: they describe behaviour that PR C must implement.
 * They will fail against main at 846a6f4.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContactForm } from "@/app/admin/contacts/contact-form";

// ContactForm calls no server actions on render — no mock needed.

const noop = async () => {};

describe("ContactForm — sprint-19 PR-C polish", () => {
  describe("marketing consent Switch", () => {
    it("renders role='switch' for marketing consent (not a raw checkbox)", () => {
      render(<ContactForm onSubmit={noop} onCancel={noop} />);

      // PR C: raw <input type="checkbox"> replaced by <Switch> (role="switch")
      const switchEl = screen.getByRole("switch");
      expect(switchEl).toBeInTheDocument();
    });

    it("aria-checked toggles when the switch is clicked", () => {
      render(
        <ContactForm
          initial={
            {
              // minimal initial shape that satisfies ContactForm typing
              id: "c-1",
              full_name: "Jane",
              first_name: "Jane",
              last_name: null,
              salutation: null,
              email: null,
              phone: null,
              type: "player",
              company: null,
              address1: null,
              address2: null,
              city: null,
              state: null,
              zip: null,
              marketing_consent: false,
              source: null,
              year_first_seen: 2026,
              notes: null,
              created_at: new Date().toISOString(),
              deleted_at: null,
              deleted_by: null,
            } as import("@/types/database").Contact
          }
          onSubmit={noop}
          onCancel={noop}
        />
      );

      const switchEl = screen.getByRole("switch");
      // Initially unchecked
      expect(switchEl).toHaveAttribute("aria-checked", "false");

      // Click to toggle
      fireEvent.click(switchEl);
      expect(switchEl).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("actions div padding", () => {
    it("actions div does NOT have pb-4 class", () => {
      const { container } = render(<ContactForm onSubmit={noop} onCancel={noop} />);

      // Find the element that contains the Save / Cancel buttons
      const saveBtn = screen.getByRole("button", { name: /save/i });
      const actionsDiv = saveBtn.parentElement;
      expect(actionsDiv).toBeTruthy();

      // PR C fix: pb-4 was a doubled-padding workaround — it must be removed
      expect(actionsDiv!.className).not.toContain("pb-4");
    });
  });

  describe("salutation field width", () => {
    it("salutation input or its wrapper has max-w-[120px]", () => {
      const { container } = render(<ContactForm onSubmit={noop} onCancel={noop} />);

      const salutationInput = container.querySelector("#cf-salutation");
      expect(salutationInput).toBeTruthy();

      // PR C: salutation should not consume the full 50% grid column —
      // either the input itself or a wrapper div carries max-w-[120px]
      const inputHasClass = salutationInput!.className.includes("max-w-[120px]");
      const parentHasClass =
        salutationInput!.parentElement?.className.includes("max-w-[120px]") ?? false;

      expect(inputHasClass || parentHasClass).toBe(true);
    });
  });
});
