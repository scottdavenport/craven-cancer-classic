import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventSettingsForm } from "@/app/admin/event/event-settings-form";

vi.mock("@/app/admin/event/actions", () => ({
  updateEventSettings: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import * as actionsModule from "@/app/admin/event/actions";
import { toast } from "sonner";

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

// ---------------------------------------------------------------------------
// EventSettingsForm — pending state + toast (RED: fail until #156 implemented)
// ---------------------------------------------------------------------------

describe("EventSettingsForm — pending state + toast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("save button is disabled and shows 'Saving...' while action is pending", async () => {
    // Return a never-resolving promise to keep the action in-flight
    vi.mocked(actionsModule.updateEventSettings).mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    render(<EventSettingsForm settings={mockSettings} />);

    const saveBtn = screen.getByRole("button", { name: /save settings/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(saveBtn).toBeDisabled();
      expect(saveBtn).toHaveTextContent(/saving\.\.\./i);
    });
  });

  it("toast.success called with 'Event settings saved' on successful save", async () => {
    vi.mocked(actionsModule.updateEventSettings).mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<EventSettingsForm settings={mockSettings} />);

    await user.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Event settings saved");
    });
  });

  it("toast.error called with server error message when action returns { error: 'Some server error' }", async () => {
    vi.mocked(actionsModule.updateEventSettings).mockResolvedValue({ error: "Some server error" });

    const user = userEvent.setup();
    render(<EventSettingsForm settings={mockSettings} />);

    await user.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Some server error");
    });
  });

  it("toast.error falls back to 'Failed to save' when action returns { error: '' }", async () => {
    vi.mocked(actionsModule.updateEventSettings).mockResolvedValue({ error: "" });

    const user = userEvent.setup();
    render(<EventSettingsForm settings={mockSettings} />);

    await user.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to save");
    });
  });

  it("inline banner 'Settings updated successfully' is NOT in DOM after successful save", async () => {
    vi.mocked(actionsModule.updateEventSettings).mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<EventSettingsForm settings={mockSettings} />);

    await user.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });

    expect(screen.queryByText(/settings updated successfully/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// EventSettingsForm — client-side validation (RED: fail until #155 implemented)
// ---------------------------------------------------------------------------

describe("EventSettingsForm — client-side validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: action is a no-op (should not be called in error cases)
    vi.mocked(actionsModule.updateEventSettings).mockResolvedValue({ success: true });
  });

  it("clearing name field and blurring shows inline required error", async () => {
    const user = userEvent.setup();
    render(<EventSettingsForm settings={mockSettings} />);

    const nameInput = screen.getByLabelText(/tournament name/i);
    await user.clear(nameInput);
    await user.tab(); // blur

    await waitFor(() => {
      // Error element should appear. "required" or "is required" are the common phrasings.
      // Avoid matching the label itself ("Tournament Name") — target role="alert" or error text.
      expect(screen.getByText(/is required|name is required|cannot be empty/i)).toBeInTheDocument();
    });
  });

  it("name > 100 chars on blur shows inline length error", async () => {
    const user = userEvent.setup();
    render(<EventSettingsForm settings={mockSettings} />);

    const nameInput = screen.getByLabelText(/tournament name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "x".repeat(101));
    await user.tab();

    await waitFor(() => {
      // Error must mention the 100-char limit or "too long" — not just any element with "name"
      expect(screen.getByText(/100 characters|too long|exceed/i)).toBeInTheDocument();
    });
  });

  it("description > 2000 chars on blur shows inline length error", async () => {
    render(<EventSettingsForm settings={mockSettings} />);

    const descInput = screen.getByLabelText(/description/i);
    fireEvent.change(descInput, { target: { value: "x".repeat(2001) } });
    fireEvent.blur(descInput);

    await waitFor(() => {
      expect(screen.getByText(/2000 characters|too long|exceed/i)).toBeInTheDocument();
    });
  });

  it("fee < 0 on blur shows inline error", async () => {
    const user = userEvent.setup();
    render(<EventSettingsForm settings={mockSettings} />);

    const feeInput = screen.getByLabelText(/registration fee/i);
    await user.clear(feeInput);
    await user.type(feeInput, "-1");
    await user.tab();

    await waitFor(() => {
      // selector:'p' prevents false-positive match on the <label>Registration Fee (USD)</label> element
      expect(screen.getByText(/fee|negative|invalid/i, { selector: "p" })).toBeInTheDocument();
    });
  });

  it("end date before start date on blur shows inline date range error", async () => {
    render(<EventSettingsForm settings={mockSettings} />);

    const startInput = screen.getByLabelText(/start date/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/end date/i) as HTMLInputElement;

    fireEvent.change(startInput, { target: { value: "2026-09-18" } });
    fireEvent.change(endInput, { target: { value: "2026-09-17" } });
    fireEvent.blur(endInput);

    await waitFor(() => {
      expect(screen.getByText(/on or after|date range|end.*before.*start|start.*before.*end/i)).toBeInTheDocument();
    });
  });

  it("client-side errors block submit — updateEventSettings NOT called when inline error present", async () => {
    const user = userEvent.setup();
    render(<EventSettingsForm settings={mockSettings} />);

    // Trigger a client-side error by clearing the fee field and entering a negative value
    const feeInput = screen.getByLabelText(/registration fee/i);
    await user.clear(feeInput);
    await user.type(feeInput, "-1");
    await user.tab();

    // Wait for the inline error to appear (fee-specific error, no label ambiguity)
    // selector:'p' prevents false-positive match on the <label>Registration Fee (USD)</label> element
    await waitFor(() => {
      expect(screen.getByText(/fee|negative|invalid/i, { selector: "p" })).toBeInTheDocument();
    });

    // Now attempt to submit
    await user.click(screen.getByRole("button", { name: /save settings/i }));

    // Action should NOT have been called
    expect(actionsModule.updateEventSettings).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Sprint 19 — PR C polish tests (RED: fail until PR C lands)
// ---------------------------------------------------------------------------

describe("EventSettingsForm — sprint-19 PR-C polish", () => {
  describe("save button size", () => {
    it("Save button uses default size (NOT size='lg'), rendering without h-10/h-11 class", () => {
      render(<EventSettingsForm settings={mockSettings} />);

      // The save button — currently rendered as <Button type="submit" size="lg">
      const saveBtn = screen.getByRole("button", { name: /save settings/i });
      expect(saveBtn).toBeTruthy();

      // RED: current main has size="lg" which adds h-10 or h-11 depending on Button config.
      // PR C: remove size="lg" to use the default size (h-9).
      // We assert the button does NOT have the h-10 class (size="lg" output).
      expect(saveBtn.className).not.toContain("h-10");
      expect(saveBtn.className).not.toContain("h-11");
    });
  });

  describe("label-input spacing", () => {
    it("label/input pairs use space-y-1.5 (not space-y-2)", () => {
      const { container } = render(<EventSettingsForm settings={mockSettings} />);

      // PR C: standardise label/input gap to space-y-1.5.
      // Current main uses space-y-2 inside fieldsets.
      const hasOldSpacing = container.querySelector(".space-y-2 label") !== null;

      // RED: space-y-2 is present on main; PR C replaces with space-y-1.5
      expect(hasOldSpacing).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// EventSettingsForm — #161 legend cleanup (RED: fail until #161 implemented)
// ---------------------------------------------------------------------------

describe("EventSettingsForm — #161 legend cleanup", () => {
  it("no <legend> with text 'Event Details' appears in the DOM", () => {
    render(<EventSettingsForm settings={mockSettings} />);
    const legends = document.querySelectorAll("legend");
    const legendTexts = Array.from(legends).map((l) => l.textContent?.trim());
    expect(legendTexts).not.toContain("Event Details");
  });

  it("no <legend> with text 'Dates & Venue' appears in the DOM", () => {
    render(<EventSettingsForm settings={mockSettings} />);
    const legends = document.querySelectorAll("legend");
    const legendTexts = Array.from(legends).map((l) => l.textContent?.trim());
    // Match both the literal & and the HTML entity variant
    const hasMatch = legendTexts.some((t) => t === "Dates & Venue" || t === "Dates &amp; Venue");
    expect(hasMatch).toBe(false);
  });

  it("no <legend> with text 'Registration' appears in the DOM", () => {
    render(<EventSettingsForm settings={mockSettings} />);
    const legends = document.querySelectorAll("legend");
    const legendTexts = Array.from(legends).map((l) => l.textContent?.trim());
    expect(legendTexts).not.toContain("Registration");
  });
});
