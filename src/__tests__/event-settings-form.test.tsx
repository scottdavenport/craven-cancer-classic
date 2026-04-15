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
  year: 2026,
  hero_image_url: null,
  updated_at: "2026-01-01T00:00:00Z",
};

describe("EventSettingsForm", () => {
  it("renders form fields with existing settings", () => {
    render(<EventSettingsForm settings={mockSettings} />);
    expect(screen.getByLabelText(/tournament name/i)).toHaveValue(
      "Craven Cancer Classic"
    );
    expect(screen.getByLabelText(/location/i)).toHaveValue(
      "New Bern Golf & Country Club"
    );
    expect(screen.getByLabelText(/morning slot cap/i)).toHaveValue(36);
    expect(screen.getByLabelText(/afternoon slot cap/i)).toHaveValue(36);
  });

  it("renders form with null settings using defaults", () => {
    render(<EventSettingsForm settings={null} />);
    expect(screen.getByLabelText(/tournament name/i)).toHaveValue(
      "Craven Cancer Classic"
    );
    expect(screen.getByLabelText(/location/i)).toHaveValue(
      "New Bern Golf & Country Club"
    );
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
});
