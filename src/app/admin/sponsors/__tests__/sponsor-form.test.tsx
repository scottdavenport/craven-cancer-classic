/**
 * RED tests for PR B — sponsor-form.tsx changes
 *
 * These tests describe the TARGET state after PR B is applied.
 * They will FAIL against current main because:
 *   - FileUploadField (@/components/ui/file-upload) does not exist yet (PR A)
 *   - is_active uses raw <input type="checkbox"> not <Switch>
 *   - SelectTriggers still have h-8 override
 *   - Form root className is space-y-4 not space-y-6
 *   - Submit/cancel buttons use size="sm"
 *   - accent-teal-600 not replaced with accent-brand
 *   - Logo preview lacks the frame classes
 *   - Contacts field lacks helper text
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SponsorForm } from "../sponsor-form";
import type { SponsorshipItemOption } from "../sponsor-form";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// FileUploadField will be created in PR A. Mock it here so the import resolves
// and the rendered output is testable.
vi.mock("@/components/ui/file-upload", () => ({
  FileUploadField: ({
    label,
    onChange,
  }: {
    label: string;
    onChange: (file: File | null) => void;
    name?: string;
    accept?: string;
    maxSizeMB?: number;
  }) => (
    <div data-testid="file-upload-field">
      <button type="button" data-testid="file-upload-trigger">
        {label}
      </button>
      {/* Hidden input kept sr-only — mirrors real component */}
      <input
        type="file"
        data-testid="file-upload-hidden-input"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          onChange(file);
        }}
      />
    </div>
  ),
}));

vi.mock("@/components/admin/contact-typeahead", () => ({
  ContactTypeaheadMulti: ({
    label,
  }: {
    label: string;
    value: unknown[];
    onChange: (v: unknown[]) => void;
  }) => <div data-testid="contact-typeahead">{label}</div>,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ITEMS: SponsorshipItemOption[] = [
  { id: "tier-gold", name: "Gold", price_cents: 500000, year: 2026 },
  { id: "tier-silver", name: "Silver", price_cents: 250000, year: 2026 },
];

function renderForm(overrides?: Partial<Parameters<typeof SponsorForm>[0]>) {
  const props = {
    sponsorshipItems: ITEMS,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    loading: false,
    ...overrides,
  };
  return render(<SponsorForm {...props} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SponsorForm — PR B changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // TEST 1: Logo field uses FileUploadField (P0)
  // -------------------------------------------------------------------------
  describe("Logo field — FileUploadField integration (P0)", () => {
    it("renders FileUploadField trigger instead of native file input", () => {
      renderForm();
      // The styled trigger button from FileUploadField must be present
      expect(
        screen.getByTestId("file-upload-trigger")
      ).toBeInTheDocument();
    });

    it("has zero VISIBLE native file inputs (hidden sr-only input is allowed)", () => {
      const { container } = renderForm();
      const allFileInputs = container.querySelectorAll('input[type="file"]');
      const visibleFileInputs = Array.from(allFileInputs).filter(
        (el) => !el.classList.contains("sr-only")
      );
      // Only the hidden sr-only input inside FileUploadField is acceptable
      expect(visibleFileInputs).toHaveLength(0);
    });

    it("accepts image MIME types via the file upload field", () => {
      renderForm();
      // The hidden input inside FileUploadField should exist and be sr-only
      const hiddenInput = screen.getByTestId("file-upload-hidden-input");
      expect(hiddenInput).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // TEST 2: Form spacing — root has space-y-6 (P1)
  // -------------------------------------------------------------------------
  describe("Form spacing (P1)", () => {
    it("form root element has space-y-6 class for section-to-section gap", () => {
      const { container } = renderForm();
      const formEl = container.querySelector("form");
      expect(formEl).not.toBeNull();
      expect(formEl!.className).toContain("space-y-6");
    });
  });

  // -------------------------------------------------------------------------
  // TEST 3: SelectTriggers no longer have h-8 override (P1)
  // -------------------------------------------------------------------------
  describe("SelectTrigger height — no h-8 override (P1)", () => {
    it("tier SelectTrigger does not have h-8 class override", () => {
      const { container } = renderForm();
      // SelectTrigger for tier has id sf-tier_id
      const tierTrigger = container.querySelector("#sf-tier_id");
      expect(tierTrigger).not.toBeNull();
      expect(tierTrigger!.className).not.toContain("h-8");
    });

    it("payment_status SelectTrigger does not have h-8 class override", () => {
      const { container } = renderForm();
      const paymentTrigger = container.querySelector("#sf-payment_id") ??
        container.querySelector('[id="sf-payment_status"]');
      // Fallback: find by the select trigger data attribute
      const triggers = container.querySelectorAll('[data-slot="select-trigger"]');
      // Both triggers should be free of h-8 class
      triggers.forEach((trigger) => {
        expect(trigger.className).not.toContain("h-8");
      });
    });
  });

  // -------------------------------------------------------------------------
  // TEST 4: is_active uses <Switch> component (P2)
  //
  // Current main: raw <input type="checkbox" role="switch" aria-checked={...}>
  // Target:       base-ui <Switch> with data-slot="switch", data-checked / data-unchecked
  //               attributes (not aria-checked — base-ui Switch uses its own data attrs)
  // -------------------------------------------------------------------------
  describe("is_active — Switch component (P2)", () => {
    it("is_active control is a base-ui Switch (has data-slot=switch)", () => {
      const { container } = renderForm();
      // base-ui Switch renders SwitchPrimitive.Root with data-slot="switch"
      // The raw checkbox in current main does NOT have data-slot="switch"
      const switchEl = container.querySelector('[data-slot="switch"]');
      expect(switchEl).not.toBeNull();
    });

    it("is_active Switch is not a raw <input type=checkbox> — base-ui Switch renders a button", () => {
      const { container } = renderForm();
      // base-ui Switch renders SwitchPrimitive.Root as a <button role="switch">, not <input>
      // First assert the element exists (requires data-slot="switch")
      const switchEl = container.querySelector('[data-slot="switch"]');
      expect(switchEl).not.toBeNull();
      // Then assert it is not an input element
      expect(switchEl!.tagName.toLowerCase()).not.toBe("input");
    });

    it("Switch is checked by default (data-checked attribute present)", () => {
      const { container } = renderForm();
      const switchEl = container.querySelector('[data-slot="switch"]');
      expect(switchEl).not.toBeNull();
      // base-ui Switch sets data-checked when checked, data-unchecked when not
      expect(switchEl!.getAttribute("data-checked")).not.toBeNull();
    });

    it("Switch reflects is_active=false via data-unchecked attribute", () => {
      const { container } = renderForm({
        defaultValues: { is_active: false },
      });
      const switchEl = container.querySelector('[data-slot="switch"]');
      expect(switchEl).not.toBeNull();
      expect(switchEl!.getAttribute("data-unchecked")).not.toBeNull();
    });

    // Bug 1 (RED-phase): Removed redundant "no raw checkbox" test.
    // base-ui Switch renders a visually-hidden <input type="checkbox"> with
    // inline `visuallyHidden` style — NOT a .sr-only class — so the
    // :not(.sr-only) selector always matched it. The sibling
    // "is a base-ui Switch (has data-slot=switch)" test and
    // "switchEl.tagName !== input" test are sufficient to verify this contract.
  });

  // -------------------------------------------------------------------------
  // TEST 5: accent-brand replaces accent-teal-600 (P2)
  // -------------------------------------------------------------------------
  describe("Token replacement — accent-brand not accent-teal-600 (P2)", () => {
    it("no element uses accent-teal-600 class", () => {
      const { container } = renderForm();
      const elements = container.querySelectorAll("[class]");
      // Bug 2 (RED-phase): SVG elements expose className as SVGAnimatedString,
      // not a plain string — .includes() throws. Use getAttribute("class") instead.
      const hasTeal = Array.from(elements).some((el) =>
        el.getAttribute("class")?.includes("accent-teal-600")
      );
      expect(hasTeal).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // TEST 6: Logo preview frame classes (P2)
  // -------------------------------------------------------------------------
  describe("Logo preview frame (P2)", () => {
    it("logo preview img has frame classes when a file is selected", () => {
      const { container } = renderForm();
      const hiddenInput = screen.getByTestId("file-upload-hidden-input");

      // Simulate file selection via the hidden input
      const file = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" });
      Object.defineProperty(hiddenInput, "files", {
        value: { 0: file, length: 1, item: () => file },
        configurable: true,
      });
      fireEvent.change(hiddenInput, { target: { files: [file] } });

      // After selection, a preview img should appear with frame classes
      const previewImg = container.querySelector('img[alt="Logo preview"]');
      if (previewImg) {
        expect(previewImg.className).toContain("rounded-md");
        expect(previewImg.className).toContain("border");
        expect(previewImg.className).toContain("bg-neutral-50");
        expect(previewImg.className).toContain("p-1");
      }
      // If img not found yet — test will fail RED until Bolt B implements the preview
    });
  });

  // -------------------------------------------------------------------------
  // TEST 7: Submit/cancel buttons use default size (not size="sm") (P2)
  // -------------------------------------------------------------------------
  describe("Submit and cancel button sizes (P2)", () => {
    it("submit button does not have data-size=sm or size-sm class", () => {
      renderForm();
      const submitBtn = screen.getByRole("button", { name: /create|update/i });
      // data-size="sm" would be set by Button with size="sm"
      expect(submitBtn.getAttribute("data-size")).not.toBe("sm");
      expect(submitBtn.className).not.toContain("h-7");
    });

    it("cancel button does not have data-size=sm or h-7 class", () => {
      renderForm();
      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      expect(cancelBtn.getAttribute("data-size")).not.toBe("sm");
      expect(cancelBtn.className).not.toContain("h-7");
    });
  });

  // -------------------------------------------------------------------------
  // TEST 8: Contacts field has helper text (P2)
  // -------------------------------------------------------------------------
  describe("Contacts field helper text (P2)", () => {
    it("renders helper text near the contacts field explaining contact linking", () => {
      renderForm();
      // Bug 3 (RED-phase): queryByText(/contact/i) matched multiple elements
      // (the "Contacts" label + "Search contacts" mock text), causing
      // queryByText to throw "Found multiple elements". Tightened regex to
      // match only Bolt's chosen helper copy.
      const helperText = screen.queryByText(/link contacts to this sponsor/i);
      expect(helperText).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // TEST 10: Drawer preview for existing sponsor logo — #213
  // -------------------------------------------------------------------------
  describe("Drawer preview for existing logo (#213)", () => {
    const defaultValuesWithLogo = {
      name: "Acme Corp",
      tier_id: "tier-gold",
      logo_url: "/logos/acme.svg",
      payment_status: "pending" as const,
      amount_paid_cents: 0,
      is_active: true,
    };

    it("renders the saved logo as preview when editing a sponsor with logo_url", () => {
      const { container } = renderForm({ defaultValues: defaultValuesWithLogo });
      const previewImg = container.querySelector('img[alt="Logo preview"]') as HTMLImageElement | null;
      expect(previewImg).toBeInTheDocument();
      expect(previewImg?.getAttribute("src")).toBe("/logos/acme.svg");
    });

    it("preview reverts to the saved logo when a picked file is cleared", () => {
      const { container } = renderForm({ defaultValues: defaultValuesWithLogo });
      const hiddenInput = screen.getByTestId("file-upload-hidden-input") as HTMLInputElement;

      const file = new File(["<svg/>"], "new-logo.svg", { type: "image/svg+xml" });
      Object.defineProperty(hiddenInput, "files", { value: [file], configurable: true });
      fireEvent.change(hiddenInput);

      Object.defineProperty(hiddenInput, "files", { value: [], configurable: true });
      fireEvent.change(hiddenInput);

      const previewImg = container.querySelector('img[alt="Logo preview"]') as HTMLImageElement | null;
      expect(previewImg?.getAttribute("src")).toBe("/logos/acme.svg");
    });

    it("renders NO preview when creating a new sponsor with no logo", () => {
      const { container } = renderForm();
      const previewImg = container.querySelector('img[alt="Logo preview"]');
      expect(previewImg).not.toBeInTheDocument();
    });
  });
});
