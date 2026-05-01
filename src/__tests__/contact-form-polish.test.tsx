/**
 * Sprint 19 — PR C RED tests: contact-form.tsx polish
 *
 * Tests:
 * 1. Marketing consent Switch (role="switch") — replaces raw checkbox
 * 2. Actions div no pb-4 (doubled-padding fix)
 * 3. Salutation max-w-[120px]
 *
 * Sprint 29 — #178 base-ui Select items prop:
 * 4. Type select trigger displays capitalized label ("Sponsor" not "sponsor")
 * 5. Year First Seen trigger displays year string label
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
              types: ["player"],
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
    it("submit button is NOT rendered inside ContactForm (moved to DialogFooter)", () => {
      render(<ContactForm onSubmit={noop} onCancel={noop} />);

      // #325 fix: Save/Create/Cancel buttons relocated to ContactModal's DialogFooter.
      // ContactForm renders no submit button — the pb-4 doubled-padding constraint
      // is moot now that the actions div is entirely removed.
      const saveBtn = document.querySelector('button[type="submit"]');
      expect(saveBtn).toBeNull();
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

  // Sprint 29 — #178: base-ui Select items prop
  // Regression guard: Year First Seen trigger must show year label, not raw value.
  // Sprint 31: "Type select trigger displays 'Sponsor'" RETIRED — the single-type Select
  // dropdown was replaced with 5 multi-type checkboxes in Sprint 31 PR #268. No Type
  // select trigger exists to assert on.
  describe("Select items prop — Year First Seen trigger (#178)", () => {
    it("Year First Seen trigger displays the year string when year_first_seen=2024", () => {
      const { container } = render(
        <ContactForm
          initial={
            {
              id: "c-3",
              full_name: "Jane Player",
              first_name: "Jane",
              last_name: "Player",
              salutation: null,
              email: null,
              phone: null,
              types: ["player"],
              company: null,
              address1: null,
              address2: null,
              city: null,
              state: null,
              zip: null,
              marketing_consent: false,
              source: null,
              year_first_seen: 2024,
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

      // Year First Seen is in the Classification section and is always the last SelectTrigger
      // in the form (after any type-specific selects like Shirt Size). Using the last trigger
      // is more durable than a fixed index now that the former Type select at index 0 is gone.
      const triggers = container.querySelectorAll('[data-slot="select-trigger"]');
      expect(triggers.length).toBeGreaterThanOrEqual(1);
      const yearTrigger = triggers[triggers.length - 1];

      // With items prop: SelectValue renders the year label string "2024".
      expect(yearTrigger.textContent).toContain("2024");
    });
  });
});
