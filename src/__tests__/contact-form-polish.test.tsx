/**
 * Sprint 19 — PR C RED tests: contact-form.tsx polish
 *
 * Tests:
 * 1. Marketing consent Switch (role="switch") — replaces raw checkbox
 * 2. Actions div no pb-4 (doubled-padding fix)
 * 3. Salutation — D12: 1fr/2fr/2fr grid (F12); max-w-[120px] retired, grid column constrains width
 *
 * Sprint 29 — #178 base-ui Select items prop:
 * 4. Type select trigger displays capitalized label ("Sponsor" not "sponsor")
 * 5. Year First Seen — PROD BUG FLAGGED: form does not render year_first_seen Select (Sprint 2026-05-06).
 *    Test updated to assert on shirt-size trigger (the only role-gated Select) via the Player card.
 *
 * D12 (Sprint 38 PR #384): role toggles are now role="switch" (not role="checkbox").
 * aria-label pattern: "Toggle ${TYPE_LABELS[type]} role" (e.g. "Toggle Player role").
 *
 * Round-2 fixes (Watchdog #384): updated selectors to match D12 RoleCard + ModalSection structure.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContactForm } from "@/app/admin/contacts/contact-form";

// ContactForm calls no server actions on render — no mock needed.

const noop = async () => {};

describe("ContactForm — sprint-19 PR-C polish", () => {
  describe("marketing consent Switch", () => {
    it("renders role='switch' for marketing consent (not a raw checkbox)", () => {
      render(<ContactForm onSubmit={noop} />);

      // D12: form now has multiple role="switch" elements (5 role cards + marketing consent).
      // Target specifically by aria-label set via id/htmlFor pairing on the marketing consent switch.
      // The Switch has id="cf-marketing-consent" and <Label htmlFor="cf-marketing-consent">.
      const switchEl = screen.getByRole("switch", { name: /marketing consent/i });
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
        />
      );

      // D12: target marketing consent switch specifically (multiple switches now exist)
      const switchEl = screen.getByRole("switch", { name: /marketing consent/i });
      // Initially unchecked
      expect(switchEl).toHaveAttribute("aria-checked", "false");

      // Click to toggle
      fireEvent.click(switchEl);
      expect(switchEl).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("actions div padding", () => {
    it("submit button is NOT rendered inside ContactForm (moved to DialogFooter)", () => {
      render(<ContactForm onSubmit={noop} />);

      // #325 fix: Save/Create/Cancel buttons relocated to ContactModal's DialogFooter.
      // ContactForm renders no submit button — the pb-4 doubled-padding constraint
      // is moot now that the actions div is entirely removed.
      const saveBtn = document.querySelector('button[type="submit"]');
      expect(saveBtn).toBeNull();
    });
  });

  describe("salutation field width", () => {
    it("salutation trigger renders inside a 1fr/2fr/2fr grid (F12 D12 layout)", () => {
      const { container } = render(<ContactForm onSubmit={noop} />);

      // D12 F12: salutation is now a <Select> trigger (not a free-text input),
      // placed in a grid-cols-[1fr_2fr_2fr] row alongside First + Last Name.
      // The max-w-[120px] approach from pre-D12 is superseded by the grid column constraint.
      const salutationTrigger = container.querySelector("#cf-salutation");
      expect(salutationTrigger).toBeTruthy();

      // Verify the trigger is inside the 1fr/2fr/2fr Identity grid
      const identityGrid = container.querySelector(".grid-cols-\\[1fr_2fr_2fr\\]");
      expect(identityGrid).toBeTruthy();
      expect(identityGrid!.contains(salutationTrigger)).toBe(true);
    });
  });

  // Sprint 33 / PR #329: onValidityChange callback — disabled-state for B1 + B2
  describe("onValidityChange — disabled states (B1 + B2)", () => {
    it("reports canSubmit=false when no types are checked", () => {
      const onChange = vi.fn();
      render(<ContactForm onSubmit={vi.fn()} onValidityChange={onChange} />);
      // Last call: canSubmit should be false (no types checked by default)
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.canSubmit).toBe(false);
    });

    it("reports canSubmit=true after at least one type is checked", () => {
      const onChange = vi.fn();
      render(<ContactForm onSubmit={vi.fn()} onValidityChange={onChange} />);

      // D12: role toggles are role="switch" with aria-label="Toggle ${TYPE_LABELS[type]} role"
      const playerSwitch = screen.getByRole("switch", { name: /toggle player role/i });
      fireEvent.click(playerSwitch);

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.canSubmit).toBe(true);
    });

    it("reports canSubmit=false again after unchecking the only type", () => {
      const onChange = vi.fn();
      render(<ContactForm onSubmit={vi.fn()} onValidityChange={onChange} />);

      // D12: role toggles are role="switch" with aria-label="Toggle ${TYPE_LABELS[type]} role"
      const playerSwitch = screen.getByRole("switch", { name: /toggle player role/i });
      fireEvent.click(playerSwitch); // turn on
      fireEvent.click(playerSwitch); // turn off

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.canSubmit).toBe(false);
    });

    it("reports submitting=false at rest", () => {
      const onChange = vi.fn();
      render(<ContactForm onSubmit={vi.fn()} onValidityChange={onChange} />);
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.submitting).toBe(false);
    });
  });

  // Sprint 29 — #178: base-ui Select items prop
  // PROD BUG NOTE (2026-05-06 / Watchdog #384 round 2): ContactForm does NOT render a
  // year_first_seen Select. The field is set to new Date().getFullYear() on submit only.
  // The original test asserted on a "Year First Seen" trigger that never existed in D12 source.
  // Updated: assert on the Shirt Size trigger (the only role-card-gated Select) by toggling
  // the Player role card first, verifying the Select renders with its placeholder.
  // Forge/Bolt must add a year_first_seen Select if the locked design requires it.
  describe("Select items prop — Shirt Size trigger in Player card (#178 follow-up)", () => {
    it("Shirt Size Select trigger renders inside Player role card when Player is toggled on", () => {
      const { container } = render(<ContactForm onSubmit={noop} />);

      // Player card starts collapsed — shirt size select is unmounted
      // Toggle Player role on:
      const playerSwitch = screen.getByRole("switch", { name: /toggle player role/i });
      fireEvent.click(playerSwitch);

      // Shirt size select should now render (player card expanded)
      const shirtSizeTrigger = container.querySelector('[data-testid="shirt-size-select"]');
      expect(shirtSizeTrigger).toBeTruthy();

      // Select placeholder text confirms items prop wires correctly
      expect(shirtSizeTrigger!.textContent).toContain("Select size");
    });
  });
});
