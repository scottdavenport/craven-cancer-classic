/**
 * SponsorForm — validation, logo upload, Select items regression guard,
 * contact picker, is_active toggle.
 *
 * S15-B tests: phone/email inline validation, logo upload, Select items guard.
 * S18-B tests (RED): contact picker, is_active toggle, contact_* inputs REMOVED.
 *   These new describe blocks FAIL until Bolt implements PR B changes:
 *   - Remove contact_name / contact_email / contact_phone inputs from SponsorForm
 *   - Add ContactTypeahead multi-select contact picker (contact_ids)
 *   - Add is_active toggle
 *
 * NOTE on S15 validation tests:
 *   The tests in "SponsorForm — validation" that query by /contact email/i and
 *   /contact phone/i labels will break when PR B removes those inputs.
 *   The S18-B "contact_* inputs REMOVED" block below asserts their absence —
 *   that is the forward-regression guard. The S15 tests are kept as-is here
 *   so they can be evaluated during the GREEN phase when Bolt decides which
 *   validation (if any) remains for the contact picker.
 *
 * Issues: #150, #153, #199
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SponsorForm } from "@/app/admin/sponsors/sponsor-form";
import type { SponsorshipItemOption } from "@/app/admin/sponsors/sponsor-form";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const sponsorshipItems: SponsorshipItemOption[] = [
  { id: "tier-gold", name: "Gold", price_cents: 500000, year: 2026 },
  { id: "tier-silver", name: "Silver", price_cents: 250000, year: 2026 },
];

function makeProps(overrides: Partial<Parameters<typeof SponsorForm>[0]> = {}) {
  return {
    sponsorshipItems,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    loading: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset URL.createObjectURL mock between tests
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:mock-preview-url"),
    revokeObjectURL: vi.fn(),
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("SponsorForm — validation", () => {
  it("invalid email renders inline error and does NOT call submit handler", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SponsorForm {...makeProps({ onSubmit })} />);

    const emailInput = screen.getByLabelText(/contact email/i);
    await user.clear(emailInput);
    await user.type(emailInput, "not-an-email");

    await user.click(screen.getByRole("button", { name: /create/i }));

    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("invalid phone renders inline error and does NOT call submit handler", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SponsorForm {...makeProps({ onSubmit })} />);

    const phoneInput = screen.getByLabelText(/contact phone/i);
    await user.clear(phoneInput);
    await user.type(phoneInput, "123");

    await user.click(screen.getByRole("button", { name: /create/i }));

    expect(screen.getByText(/invalid phone/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("valid email AND valid phone calls submit handler exactly once", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SponsorForm {...makeProps({ onSubmit })} />);

    const nameInput = screen.getByLabelText(/sponsor name/i);
    await user.type(nameInput, "Acme Corp");

    const emailInput = screen.getByLabelText(/contact email/i);
    await user.clear(emailInput);
    await user.type(emailInput, "jane@example.com");

    const phoneInput = screen.getByLabelText(/contact phone/i);
    await user.clear(phoneInput);
    await user.type(phoneInput, "2025551234");

    await user.click(screen.getByRole("button", { name: /create/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/invalid email/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/invalid phone/i)).not.toBeInTheDocument();
  });

  it("empty email AND empty phone calls submit handler (both optional)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SponsorForm {...makeProps({ onSubmit })} />);

    // Fill required sponsor name, leave email + phone empty
    const nameInput = screen.getByLabelText(/sponsor name/i);
    await user.type(nameInput, "Empty Contact Corp");

    const emailInput = screen.getByLabelText(/contact email/i);
    await user.clear(emailInput);

    const phoneInput = screen.getByLabelText(/contact phone/i);
    await user.clear(phoneInput);

    await user.click(screen.getByRole("button", { name: /create/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("phone blur with valid input reformats to national display format", async () => {
    const user = userEvent.setup();
    render(<SponsorForm {...makeProps()} />);

    const phoneInput = screen.getByLabelText(/contact phone/i);
    await user.type(phoneInput, "5551234567");
    await user.tab(); // trigger blur

    // National format: "(555) 123-4567"
    expect((phoneInput as HTMLInputElement).value).toBe("(555) 123-4567");
  });
});

// ---------------------------------------------------------------------------
// Logo upload
// ---------------------------------------------------------------------------

describe("SponsorForm — logo upload", () => {
  it("file input accepts .png, .jpg, .jpeg, .webp, .svg", () => {
    render(<SponsorForm {...makeProps()} />);

    const fileInput = screen
      .getAllByRole("button", { hidden: true })
      .find((el) => el.getAttribute("type") === "file") as HTMLInputElement | undefined
      ?? (document.querySelector('input[type="file"]') as HTMLInputElement);

    expect(fileInput).toBeTruthy();
    const accept = fileInput!.getAttribute("accept") ?? "";
    // Must include all five mime types or extensions
    expect(accept).toMatch(/image\/png/);
    expect(accept).toMatch(/image\/jpeg/);
    expect(accept).toMatch(/image\/webp/);
    expect(accept).toMatch(/image\/svg\+xml|\.svg/);
  });

  it("selecting a file >5MB renders inline error and does NOT call submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SponsorForm {...makeProps({ onSubmit })} />);

    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], "big.png", {
      type: "image/png",
    });

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    await user.upload(fileInput, bigFile);

    expect(screen.getByText(/file too large|max 5mb/i)).toBeInTheDocument();

    // Also verify submit is blocked when the oversized file is selected
    const nameInput = screen.getByLabelText(/sponsor name/i);
    await user.type(nameInput, "Big File Corp");
    await user.click(screen.getByRole("button", { name: /create/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("selecting a valid file renders a thumbnail preview", async () => {
    const user = userEvent.setup();
    render(<SponsorForm {...makeProps()} />);

    const validFile = new File(["fake-png-content"], "logo.png", {
      type: "image/png",
    });

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    await user.upload(fileInput, validFile);

    // A preview image should appear
    const previewImg = document.querySelector("img") as HTMLImageElement | null;
    expect(previewImg).toBeTruthy();
    // src should be a blob URL or data URL (non-empty)
    expect(previewImg!.src).toBeTruthy();
    expect(previewImg!.src.length).toBeGreaterThan(0);
  });

  it("logo is optional — form submits without a file selected", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SponsorForm {...makeProps({ onSubmit })} />);

    const nameInput = screen.getByLabelText(/sponsor name/i);
    await user.type(nameInput, "No Logo Corp");

    await user.click(screen.getByRole("button", { name: /create/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Select items prop regression guard (S13 hotfix / S14 near-miss)
// ---------------------------------------------------------------------------

describe("SponsorForm — Select items prop regression guard", () => {
  it("Sponsorship level Select displays 'Name — $Price' label for pre-selected tier, not raw UUID", () => {
    render(
      <SponsorForm
        {...makeProps({
          defaultValues: { tier_id: "tier-gold" },
        })}
      />
    );

    // The Select trigger must display the formatted label, not the UUID
    // "Gold — $5,000" for tier-gold (500000 cents)
    const trigger = screen.getByRole("combobox", { name: /sponsorship level/i });
    expect(trigger).toBeTruthy();
    // The displayed text must match "Name — $Price" pattern, not a raw UUID
    expect(trigger.textContent).toMatch(/Gold\s*—\s*\$5,000/);
    expect(trigger.textContent).not.toContain("tier-gold");
  });
});

// ---------------------------------------------------------------------------
// S18-B (RED): SponsorForm — contact_* inputs REMOVED (#199)
// ---------------------------------------------------------------------------
// These tests FAIL (asserting absence) until Bolt removes the denorm inputs.
// Once PR B lands these become the regression guard — they must stay GREEN.
// Deprecated assertion: "createSponsor writes contact_name to DB"
// Inverted to: "SponsorForm renders NO input with label /contact name/i"
// ---------------------------------------------------------------------------

describe("SponsorForm — contact_* text inputs REMOVED (#199)", () => {
  it("no input with label /contact name/i", () => {
    render(<SponsorForm {...makeProps()} />);
    // After PR B, the denorm Contact Name input is removed
    expect(screen.queryByLabelText(/contact name/i)).not.toBeInTheDocument();
  });

  it("no input with label /contact email/i", () => {
    render(<SponsorForm {...makeProps()} />);
    // After PR B, the denorm Contact Email input is removed
    expect(screen.queryByLabelText(/contact email/i)).not.toBeInTheDocument();
  });

  it("no input with label /contact phone/i", () => {
    render(<SponsorForm {...makeProps()} />);
    // After PR B, the denorm Contact Phone input is removed
    expect(screen.queryByLabelText(/contact phone/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// S18-B (RED): SponsorForm — contact picker (#199)
// ---------------------------------------------------------------------------
// These tests FAIL until Bolt adds ContactTypeahead (or equivalent) to SponsorForm.
// Tests pin behavior, not the exact component implementation.
// ---------------------------------------------------------------------------

describe("SponsorForm — contact picker (#199)", () => {
  it("renders a control that lets admin pick contacts by name (placeholder or label present)", () => {
    render(<SponsorForm {...makeProps()} />);
    // Some element that enables contact selection must exist —
    // either a labeled input, combobox, or element with placeholder mentioning contacts/search.
    const picker =
      screen.queryByRole("combobox", { name: /contact/i }) ??
      screen.queryByPlaceholderText(/contact|search/i) ??
      screen.queryByLabelText(/contact/i);
    expect(picker).toBeInTheDocument();
  });

  it("with no contacts pre-selected, picker shows empty/placeholder state (no pills rendered)", () => {
    render(<SponsorForm {...makeProps()} />);
    // No pill chips should be visible when contact_ids is empty/undefined
    // Pill chips are typically buttons or spans with a remove/x affordance next to a contact name
    // We assert no "Remove" or "×" buttons exist in the contact area at initial render
    const removeBtns = screen
      .queryAllByRole("button")
      .filter((btn) =>
        /remove|×|✕|close/i.test(btn.textContent ?? "") ||
        btn.getAttribute("aria-label")?.match(/remove|dismiss/i)
      );
    // At most the form-level Cancel button exists — no contact pill removal buttons
    expect(removeBtns.length).toBe(0);
  });

  it("with contacts in defaultValues.contact_ids, picker shows pre-selected contacts", () => {
    // Pass contact_ids as a pre-populated value so picker shows pill chips
    render(
      <SponsorForm
        {...makeProps({
          defaultValues: {
            // @ts-expect-error — contact_ids not yet in Sponsor type (added in PR B)
            contact_ids: ["contact-uuid-1"],
          },
          contacts: [
            { id: "contact-uuid-1", full_name: "Jane Doe", email: "jane@example.com" },
          ],
        })}
      />
    );
    // The pre-selected contact's name should appear in the form
    expect(screen.getByText(/jane doe/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// S18-B (RED): SponsorForm — is_active toggle (#199)
// ---------------------------------------------------------------------------
// These tests FAIL until Bolt adds an is_active toggle to SponsorForm.
// ---------------------------------------------------------------------------

describe("SponsorForm — is_active toggle (#199)", () => {
  it("renders an is_active toggle (switch, checkbox, or segmented control)", () => {
    render(<SponsorForm {...makeProps()} />);
    // Bolt can use a Switch, Checkbox, or segmented control — we pin on role or label
    const toggle =
      screen.queryByRole("switch", { name: /active|status/i }) ??
      screen.queryByRole("checkbox", { name: /active|status/i }) ??
      screen.queryByLabelText(/is.?active|active/i);
    expect(toggle).toBeInTheDocument();
  });

  it("toggle defaults to active/checked state when no defaultValues provided", () => {
    render(<SponsorForm {...makeProps()} />);
    const toggle =
      (screen.queryByRole("switch", { name: /active|status/i }) as HTMLInputElement | null) ??
      (screen.queryByRole("checkbox", { name: /active|status/i }) as HTMLInputElement | null) ??
      (screen.queryByLabelText(/is.?active|active/i) as HTMLInputElement | null);

    expect(toggle).toBeInTheDocument();
    // Default state must represent "active" — either aria-checked or checked
    const isChecked =
      toggle!.getAttribute("aria-checked") === "true" ||
      (toggle as HTMLInputElement).checked === true ||
      toggle!.getAttribute("data-state") === "checked";
    expect(isChecked).toBe(true);
  });

  it("toggling to inactive updates form state; FormData on submit includes is_active=false", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SponsorForm {...makeProps({ onSubmit })} />);

    const toggle =
      screen.queryByRole("switch", { name: /active|status/i }) ??
      screen.queryByRole("checkbox", { name: /active|status/i }) ??
      screen.queryByLabelText(/is.?active|active/i);

    expect(toggle).toBeInTheDocument();
    await user.click(toggle!);

    // Submit and inspect the FormData is_active value
    const nameInput = screen.getByLabelText(/sponsor name/i);
    fireEvent.change(nameInput, { target: { value: "Toggle Test Corp" } });
    await user.click(screen.getByRole("button", { name: /create|save/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submittedData = onSubmit.mock.calls[0][0] as FormData;
    const isActiveValue = submittedData.get("is_active");
    // After toggling off: is_active should be "false" (string from FormData)
    expect(isActiveValue).toBe("false");
  });
});

// ---------------------------------------------------------------------------
// S18-B: SponsorForm — preserve S15 regressions
// ---------------------------------------------------------------------------

describe("SponsorForm — preserve S15 regressions", () => {
  it("Sponsorship level Select still has items prop (S14/S15 retro guard)", () => {
    // The Select for tier_id must have items prop — verified by label still resolving
    // to a combobox with proper display text (not raw UUID)
    render(
      <SponsorForm
        {...makeProps({
          defaultValues: { tier_id: "tier-silver" },
        })}
      />
    );
    const trigger = screen.getByRole("combobox", { name: /sponsorship level/i });
    expect(trigger.textContent).toMatch(/Silver/);
    expect(trigger.textContent).not.toContain("tier-silver");
  });

  it("logo upload flow unchanged — file input still present", () => {
    render(<SponsorForm {...makeProps()} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).toBeInTheDocument();
  });
});
