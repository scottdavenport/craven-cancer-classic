import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DonatePage from "@/app/(public)/donate/page";

// prospect-capture-form uses fetch — stub it so the component renders without network
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("DonatePage", () => {
  it("renders the external donate CTA with the correct href", () => {
    render(<DonatePage />);
    const link = screen.getByRole("link", {
      name: /donate via carolina east foundation/i,
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      "href",
      "https://www.carolinaeasthealth.com/foundation/donate-now/"
    );
  });

  it("renders all three In Loving Memory names", () => {
    render(<DonatePage />);
    // getAllByText handles cases where the name appears in both running prose and strong tags
    expect(screen.getAllByText("Scott Davenport Sr.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Brian Fisher").length).toBeGreaterThan(0);
    expect(screen.getAllByText("John Aylward").length).toBeGreaterThan(0);
  });

  it("renders the Stay in Touch form with name and email fields", () => {
    render(<DonatePage />);
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it("renders the impact stats", () => {
    render(<DonatePage />);
    expect(screen.getAllByText("$450K+").length).toBeGreaterThan(0);
    expect(screen.getAllByText("15+").length).toBeGreaterThan(0);
    expect(screen.getAllByText("72").length).toBeGreaterThan(0);
  });

  it("includes the designation note for Craven Cancer Classic Golf Tournament", () => {
    render(<DonatePage />);
    expect(
      screen.getAllByText("Craven Cancer Classic Golf Tournament").length
    ).toBeGreaterThan(0);
  });
});
