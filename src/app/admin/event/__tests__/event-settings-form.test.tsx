import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { EventSettingsForm } from "../event-settings-form";
import type { EventSettings } from "@/types/database";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// updateEventSettings is a server action — mock it so the component renders
// in a jsdom environment without a Next.js server context.
vi.mock("../actions", () => ({
  updateEventSettings: vi.fn().mockResolvedValue({ success: true }),
  getEventSettings: vi.fn().mockResolvedValue(null),
}));

// useUnsavedChanges triggers beforeunload listeners — no-op in tests.
vi.mock("@/hooks/use-unsaved-changes", () => ({
  useUnsavedChanges: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSettings(overrides: Partial<EventSettings> = {}): EventSettings {
  return {
    id: "test-id",
    name: "Craven Cancer Classic",
    description: null,
    morning_slots: 0,
    afternoon_slots: 0,
    morning_cap: 36,
    afternoon_cap: 36,
    registration_open: false,
    year: 2026,
    hero_image_url: null,
    updated_at: "2026-01-01T00:00:00Z",
    registration_fee_cents: 70000,
    tournament_start_date: null,
    tournament_end_date: null,
    venue_name: null,
    lifetime_raised_cents: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EventSettingsForm — lifetime_raised_cents field", () => {
  it("renders the Lifetime Raised (USD) label and input", () => {
    render(<EventSettingsForm settings={makeSettings()} />);

    expect(
      screen.getByLabelText("Lifetime Raised (USD)")
    ).toBeInTheDocument();

    const input = screen.getByRole("spinbutton", { name: /lifetime raised/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("name", "lifetime_raised_cents");
    expect(input).toHaveAttribute("type", "number");
  });

  it("pre-populates input with lifetime_raised_cents / 100 formatted to 2 decimals when non-null", () => {
    const settings = makeSettings({ lifetime_raised_cents: 58000000 });
    render(<EventSettingsForm settings={settings} />);

    const input = screen.getByRole("spinbutton", { name: /lifetime raised/i });
    expect((input as HTMLInputElement).defaultValue).toBe("580000.00");
  });

  it("input is empty when settings.lifetime_raised_cents is null", () => {
    const settings = makeSettings({ lifetime_raised_cents: null });
    render(<EventSettingsForm settings={settings} />);

    const input = screen.getByRole("spinbutton", { name: /lifetime raised/i });
    expect((input as HTMLInputElement).defaultValue).toBe("");
  });
});
