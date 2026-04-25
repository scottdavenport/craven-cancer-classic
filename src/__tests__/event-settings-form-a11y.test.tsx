// RED: EventSettingsForm a11y — #236
// Fails until Bolt adds aria-live region, aria-describedby wiring, and responsive grids.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventSettingsForm } from "@/app/admin/event/event-settings-form";
import type { EventSettings } from "@/types/database";

// Mock server action
vi.mock("@/app/admin/event/actions", () => ({
  updateEventSettings: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const baseSettings: EventSettings = {
  id: "settings-1",
  name: "Craven Cancer Classic",
  description: "Annual golf tournament",
  registration_open: false,
  registration_fee_cents: 70000,
  morning_cap: 36,
  morning_slots: 36,
  afternoon_cap: 36,
  afternoon_slots: 36,
  tournament_start_date: "2026-09-18",
  tournament_end_date: "2026-09-19",
  venue_name: "New Bern Golf & Country Club",
  hero_image_url: null,
  year: 2026,
  updated_at: "2026-01-01T00:00:00.000Z",
  lifetime_raised_cents: null,
};

function triggerValidationErrors() {
  // Click submit without changing anything — the name field should still be
  // valid with baseSettings, so we need to force an error by clearing name first
  const nameInput = screen.getByLabelText(/tournament name/i) as HTMLInputElement;
  fireEvent.change(nameInput, { target: { value: "" } });
  // Blur to trigger per-field error
  fireEvent.blur(nameInput);
}

function submitForm() {
  const submitBtn = screen.getByRole("button", { name: /save settings/i });
  fireEvent.click(submitBtn);
}

describe("EventSettingsForm — aria-live error summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an aria-live region in the DOM at all times", () => {
    render(<EventSettingsForm settings={baseSettings} />);
    // Must be present even before errors appear
    const liveRegion = document.querySelector('[role="alert"][aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it("aria-live region is empty when there are no validation errors", () => {
    render(<EventSettingsForm settings={baseSettings} />);
    const liveRegion = document.querySelector('[role="alert"][aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion!.textContent?.trim()).toBe("");
  });

  it("aria-live region shows error message(s) after form submitted with empty name", () => {
    render(<EventSettingsForm settings={baseSettings} />);

    // Clear name and submit to trigger validation
    const nameInput = screen.getByLabelText(/tournament name/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "" } });
    submitForm();

    const liveRegion = document.querySelector('[role="alert"][aria-live="polite"]');
    expect(liveRegion!.textContent?.trim()).not.toBe("");
  });

  it("aria-live region error content includes the name field error text", () => {
    render(<EventSettingsForm settings={baseSettings} />);

    const nameInput = screen.getByLabelText(/tournament name/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "" } });
    submitForm();

    const liveRegion = document.querySelector('[role="alert"][aria-live="polite"]');
    expect(liveRegion!.textContent).toMatch(/name|required/i);
  });
});

describe("EventSettingsForm — aria-describedby wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("name input has aria-describedby pointing to its error element", () => {
    render(<EventSettingsForm settings={baseSettings} />);
    const nameInput = screen.getByLabelText(/tournament name/i);
    const describedBy = nameInput.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    // The referenced element must exist in the DOM
    const errorEl = document.getElementById(describedBy!);
    expect(errorEl).toBeInTheDocument();
  });

  it("registration fee input has aria-describedby pointing to its error element", () => {
    render(<EventSettingsForm settings={baseSettings} />);
    const feeInput = screen.getByLabelText(/registration fee/i);
    const describedBy = feeInput.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const errorEl = document.getElementById(describedBy!);
    expect(errorEl).toBeInTheDocument();
  });
});

describe("EventSettingsForm — responsive grid classes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("date grid uses grid-cols-1 sm:grid-cols-2 (mobile stacking)", () => {
    const { container } = render(<EventSettingsForm settings={baseSettings} />);
    // Find grids that contain date inputs
    const startInput = screen.getByLabelText(/start date/i);
    const dateGrid = startInput.closest(".grid");
    expect(dateGrid).toBeInTheDocument();
    // Must have mobile-first single-column, sm breakpoint two-column
    expect(dateGrid!.className).toContain("grid-cols-1");
    expect(dateGrid!.className).toContain("sm:grid-cols-2");
    // Must NOT use bare grid-cols-2 (non-responsive)
    expect(dateGrid!.className).not.toMatch(/(?<!\S)grid-cols-2(?!\S)/);
    // avoid false positives on sm:grid-cols-2 being matched
    expect(dateGrid!.className).not.toMatch(/^grid-cols-2$/);
  });

  it("session cap grid uses grid-cols-1 sm:grid-cols-2 (mobile stacking)", () => {
    render(<EventSettingsForm settings={baseSettings} />);
    const morningInput = screen.getByLabelText(/morning slot cap/i);
    const capGrid = morningInput.closest(".grid");
    expect(capGrid).toBeInTheDocument();
    expect(capGrid!.className).toContain("grid-cols-1");
    expect(capGrid!.className).toContain("sm:grid-cols-2");
    expect(capGrid!.className).not.toMatch(/(?<!\S)grid-cols-2(?!\S)/);
  });
});
