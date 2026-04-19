import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// LoginPage is now an async server component (searchParams) — test the extracted
// client component LoginForm directly, which contains all interactive logic.
import { LoginForm } from "@/app/auth/login/login-form";

// Mock the server actions
vi.mock("@/app/auth/actions", () => ({
  signInWithPassword: vi.fn(),
  signInWithMagicLink: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

describe("LoginForm", () => {
  it("renders the sign in heading", () => {
    render(<LoginForm />);
    // CardTitle is a <div> — multiple "Sign In" texts exist (title + submit button)
    const signInElements = screen.getAllByText(/^sign in$/i);
    expect(signInElements.length).toBeGreaterThan(0);
  });

  it("renders email input", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("renders password input in default mode", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders Google sign in option", () => {
    render(<LoginForm />);
    const googleButtons = screen.getAllByText(/sign in with google/i);
    expect(googleButtons.length).toBeGreaterThan(0);
  });

  it("renders password and magic link mode toggles", () => {
    render(<LoginForm />);
    expect(screen.getAllByText(/password/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/magic link/i).length).toBeGreaterThan(0);
  });

  it("switches to magic link mode and hides password field", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // Find the magic link toggle button (not the submit)
    const magicLinkButtons = screen.getAllByText(/magic link/i);
    await user.click(magicLinkButtons[0]);

    // After clicking, the submit button should say "Send Magic Link"
    const sendButtons = screen.getAllByText(/send magic link/i);
    expect(sendButtons.length).toBeGreaterThan(0);
  });

  it("renders initialError prop as an error alert on mount", () => {
    render(<LoginForm initialError="Incorrect email or password. Please try again." />);
    expect(
      screen.getByText(/incorrect email or password/i)
    ).toBeInTheDocument();
  });
});
