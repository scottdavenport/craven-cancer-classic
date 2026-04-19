import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventSettingsForm } from "@/app/admin/event/event-settings-form";

vi.mock("@/app/admin/event/actions", () => ({
  updateEventSettings: vi.fn(),
}));

const mockSettings = {
  id: "uuid",
  name: "Craven Cancer Classic",
  date: "2026-09-18",
  location: "New Bern Golf & Country Club",
  description: "Test description",
  morning_slots: 0,
  afternoon_slots: 0,
  morning_cap: 36,
  afternoon_cap: 36,
  registration_open: false,
  registration_fee_cents: 70000,
  year: 2026,
  hero_image_url: null,
  updated_at: "2026-01-01T00:00:00Z",
  tournament_start_date: null,
  tournament_end_date: null,
  venue_name: null,
};

describe("EventSettingsForm", () => {
  it("renders form fields with existing settings", () => {
    render(<EventSettingsForm settings={mockSettings} />);
    expect(screen.getByLabelText(/tournament name/i)).toHaveValue(
      "Craven Cancer Classic"
    );
    expect(screen.getByLabelText(/morning slot cap/i)).toHaveValue(36);
    expect(screen.getByLabelText(/afternoon slot cap/i)).toHaveValue(36);
  });

  it("renders form with null settings using defaults", () => {
    render(<EventSettingsForm settings={null} />);
    expect(screen.getByLabelText(/tournament name/i)).toHaveValue(
      "Craven Cancer Classic"
    );
  });

  it("does not render legacy date or location inputs", () => {
    render(<EventSettingsForm settings={mockSettings} />);
    expect(screen.queryByLabelText(/^location$/i)).toBeNull();
    expect(screen.queryByLabelText(/^tournament date$/i)).toBeNull();
  });

  it("renders save button", () => {
    render(<EventSettingsForm settings={mockSettings} />);
    const saveButtons = screen.getAllByText(/save settings/i);
    expect(saveButtons.length).toBeGreaterThan(0);
  });

  it("renders registration toggle", () => {
    render(<EventSettingsForm settings={mockSettings} />);
    expect(screen.getAllByText(/registration open/i).length).toBeGreaterThan(0);
  });

  it("renders the registration fee input populated with dollars from cents", () => {
    render(<EventSettingsForm settings={mockSettings} />);
    const feeInput = screen.getByLabelText(/registration fee/i) as HTMLInputElement;
    expect(feeInput).toBeInTheDocument();
    expect(feeInput.value).toBe("700.00");
  });

  it("renders registration fee input with default 700.00 when settings is null", () => {
    render(<EventSettingsForm settings={null} />);
    const feeInput = screen.getByLabelText(/registration fee/i) as HTMLInputElement;
    expect(feeInput.value).toBe("700.00");
  });
});
