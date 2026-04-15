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
    expect(screen.getByLabelText(/team name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/captain name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/captain email/i)).toBeInTheDocument();
  });

  it("renders player sections", () => {
    render(<RegistrationForm {...defaultProps} />);
    expect(screen.getAllByText(/Player \d/i).length).toBeGreaterThanOrEqual(4);
  });

  it("shows $700 price", () => {
    render(<RegistrationForm {...defaultProps} />);
    expect(screen.getAllByText("$700").length).toBeGreaterThan(0);
  });

  it("shows session as full when cap is reached", () => {
    render(
      <RegistrationForm
        morningCap={36}
        afternoonCap={36}
        morningCount={36}
        afternoonCount={5}
      />
    );
    expect(screen.getAllByText("Full").length).toBeGreaterThan(0);
  });
});
