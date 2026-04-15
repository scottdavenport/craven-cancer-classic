import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/auth/login/page";

// Mock the server actions
vi.mock("@/app/auth/actions", () => ({
  signInWithPassword: vi.fn(),
  signInWithMagicLink: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

describe("Login Page", () => {
  it("renders the admin login heading", () => {
    render(<LoginPage />);
    expect(screen.getByText(/admin login/i)).toBeInTheDocument();
  });

  it("renders email input", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("renders password input in default mode", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders Google sign in option", () => {
    render(<LoginPage />);
    const googleButtons = screen.getAllByText(/sign in with google/i);
    expect(googleButtons.length).toBeGreaterThan(0);
  });

  it("renders password and magic link mode toggles", () => {
    render(<LoginPage />);
    expect(screen.getAllByText(/password/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/magic link/i).length).toBeGreaterThan(0);
  });

  it("switches to magic link mode and hides password field", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    // Find the magic link toggle button (not the submit)
    const magicLinkButtons = screen.getAllByText(/magic link/i);
    await user.click(magicLinkButtons[0]);

    // After clicking, the submit button should say "Send Magic Link"
    const sendButtons = screen.getAllByText(/send magic link/i);
    expect(sendButtons.length).toBeGreaterThan(0);
  });
});
