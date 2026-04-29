import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegistrationForm } from "@/app/(public)/register/registration-form";

describe("RegistrationForm", () => {
  const defaultProps = {
    morningCap: 36,
    afternoonCap: 36,
    morningCount: 10,
    afternoonCount: 5,
    registrationFeeCents: 70000,
  };

  it("renders session picker with availability", () => {
    render(<RegistrationForm {...defaultProps} />);
    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByText("Afternoon")).toBeInTheDocument();
    expect(screen.getByText("26 spots remaining")).toBeInTheDocument();
    expect(screen.getByText("31 spots remaining")).toBeInTheDocument();
  });

  it("renders team info fields", () => {
    render(<RegistrationForm {...defaultProps} />);
    // Sprint 32: team-name label removed by design (captain inputs are the team identity).
    // Captain label reads "Your Name (Captain)"
    expect(screen.getByLabelText(/your name \(captain\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your email/i)).toBeInTheDocument();
  });

  it("renders player sections", () => {
    render(<RegistrationForm {...defaultProps} />);
    // Captain + 3 teammate cards — card titles: "Player 2", "Player 3", "Player 4"
    expect(screen.getAllByText(/Player \d/i).length).toBeGreaterThanOrEqual(3);
    // TBD checkboxes present for each teammate slot
    expect(screen.getAllByRole("checkbox").length).toBe(3);
  });

  it("renders the registration fee from props", () => {
    render(<RegistrationForm {...defaultProps} registrationFeeCents={70000} />);
    expect(screen.getAllByText("$700").length).toBeGreaterThan(0);
  });

  it("renders a non-standard fee correctly", () => {
    render(<RegistrationForm {...defaultProps} registrationFeeCents={75050} />);
    expect(screen.getAllByText("$750.50").length).toBeGreaterThan(0);
  });

  it("shows session as full when cap is reached", () => {
    render(
      <RegistrationForm
        morningCap={36}
        afternoonCap={36}
        morningCount={36}
        afternoonCount={5}
        registrationFeeCents={70000}
      />
    );
    expect(screen.getAllByText("Full").length).toBeGreaterThan(0);
  });
});
