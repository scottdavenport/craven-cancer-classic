/**
 * S15-B (RED): SponsorForm — validation, logo upload, Select items regression guard.
 *
 * These tests FAIL until Bolt implements:
 * - src/app/admin/sponsors/sponsor-form.tsx  (phone/email inline validation,
 *   logo file input + thumbnail preview, phone blur-format)
 *
 * Issues: #150 (phone + email normalize/validate), #153 (sponsor logo upload UI)
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
