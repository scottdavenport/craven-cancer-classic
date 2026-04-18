import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// prospect-capture-form uses fetch — stub it so components render without network
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Closed-state: ProspectCaptureForm with contactType="player"
// ---------------------------------------------------------------------------
import { ProspectCaptureForm } from "@/components/public/prospect-capture-form";

describe("Register page closed state — ProspectCaptureForm with player type", () => {
  it("renders name and email fields", () => {
    render(
      <ProspectCaptureForm
        contactType="player"
        notesPrefix="player prospect — notified when registration opens"
        successMessage="You're on the list. We'll email you when registration opens."
      />
    );
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it("renders a Get Notified submit button", () => {
    render(<ProspectCaptureForm contactType="player" />);
    expect(
      screen.getByRole("button", { name: /get notified/i })
    ).toBeInTheDocument();
  });

  it("does not show company field (player registration doesn't need it)", () => {
    render(<ProspectCaptureForm contactType="player" />);
    expect(
      screen.queryByLabelText(/company \/ organization/i)
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Open-state: RegistrationForm renders fee from registrationFeeCents prop
// ---------------------------------------------------------------------------
import { RegistrationForm } from "@/app/(public)/register/registration-form";

describe("Register page open state — RegistrationForm fee display", () => {
  const baseProps = {
    morningCap: 36,
    afternoonCap: 36,
    morningCount: 0,
    afternoonCount: 0,
  };

  it("renders $700 when fee is 70000 cents", () => {
    render(<RegistrationForm {...baseProps} registrationFeeCents={70000} />);
    expect(screen.getAllByText("$700").length).toBeGreaterThan(0);
  });

  it("renders $750.50 when fee is 75050 cents", () => {
    render(<RegistrationForm {...baseProps} registrationFeeCents={75050} />);
    expect(screen.getAllByText("$750.50").length).toBeGreaterThan(0);
  });

  it("renders $800 when fee is 80000 cents (no decimals for whole dollars)", () => {
    render(<RegistrationForm {...baseProps} registrationFeeCents={80000} />);
    expect(screen.getAllByText("$800").length).toBeGreaterThan(0);
  });

  it("shows remaining spots for morning and afternoon sessions", () => {
    render(
      <RegistrationForm
        morningCap={36}
        afternoonCap={36}
        morningCount={10}
        afternoonCount={20}
        registrationFeeCents={70000}
      />
    );
    expect(screen.getByText("26 spots remaining")).toBeInTheDocument();
    expect(screen.getByText("16 spots remaining")).toBeInTheDocument();
  });

  it("shows Full badge when a session is at capacity", () => {
    render(
      <RegistrationForm
        morningCap={36}
        afternoonCap={36}
        morningCount={36}
        afternoonCount={0}
        registrationFeeCents={70000}
      />
    );
    expect(screen.getAllByText("Full").length).toBeGreaterThan(0);
  });
});
