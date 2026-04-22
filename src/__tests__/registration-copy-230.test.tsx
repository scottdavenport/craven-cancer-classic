/**
 * Sprint 21 · Issue #230 — Registration flow copy — RED tests
 *
 * All assertions target the NEW locked copy. They FAIL against current main.
 * Bolt makes them GREEN.
 *
 * Areas:
 * 1. Session picker — "Preferred Session" + helper line
 * 2. Success page   — metadata + h1 + body paragraphs
 * 3. Registration closed card — h2 + body paragraph
 * 4. CTA consolidation — "Register Your Team" site-wide (page + about + hygiene)
 * 5. Registration submit button — "Continue to Payment"
 * 6. Seeking-team form submit — "Add Me to the List" / "Adding you..."
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { execSync } from "child_process";
import { resolve } from "path";
import { readFileSync } from "fs";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const repoRoot = resolve(__dirname, "../../");

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Session picker — RegistrationForm
// ---------------------------------------------------------------------------

describe("1. Session picker — RegistrationForm", () => {
  const defaultProps = {
    morningCap: 36,
    afternoonCap: 36,
    morningCount: 10,
    afternoonCount: 5,
    registrationFeeCents: 70000,
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('CardTitle label is "Preferred Session" (not "Select Session")', async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    render(<RegistrationForm {...defaultProps} />);

    // NEW: must find "Preferred Session"
    expect(screen.getByText("Preferred Session")).toBeInTheDocument();
  });

  it('OLD label "Select Session" no longer present in the session picker', async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    render(<RegistrationForm {...defaultProps} />);

    // "Select Session" must be gone
    expect(
      screen.queryByText("Select Session")
    ).not.toBeInTheDocument();
  });

  it('helper line appears after session tiles: "The committee balances morning and afternoon groups..."', async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    render(<RegistrationForm {...defaultProps} />);

    expect(
      screen.getByText(
        "The committee balances morning and afternoon groups. Your final session will be confirmed by email."
      )
    ).toBeInTheDocument();
  });

  it("helper line appears in document after both session tile buttons", async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    const { container } = render(<RegistrationForm {...defaultProps} />);

    const helperText = screen.getByText(
      "The committee balances morning and afternoon groups. Your final session will be confirmed by email."
    );
    const morningBtn = screen.getAllByRole("radio").find((el) =>
      el.textContent?.toLowerCase().includes("morning")
    )!;

    // Helper must appear AFTER morning tile in DOM order
    expect(
      morningBtn.compareDocumentPosition(helperText) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 2. Success page — metadata + h1 + body paragraphs
// ---------------------------------------------------------------------------

describe("2. Success page", () => {
  it('metadata.title is "You\'re In — Craven Cancer Classic"', async () => {
    const mod = await import("@/app/(public)/register/success/page");
    // metadata export from Next.js page
    const metadata = (mod as Record<string, unknown>).metadata as {
      title?: string;
    };
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe("You're In — Craven Cancer Classic");
  });

  it('h1 text is "You\'re In." (exact — no exclamation mark)', async () => {
    const mod = await import("@/app/(public)/register/success/page");
    const Page = (
      mod as { default: React.ComponentType }
    ).default;
    render(<Page />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toBe("You're In.");
  });

  it('OLD h1 "You\'re Registered!" is absent', async () => {
    const mod = await import("@/app/(public)/register/success/page");
    const Page = (
      mod as { default: React.ComponentType }
    ).default;
    render(<Page />);
    expect(
      screen.queryByText(/You're Registered!/i)
    ).not.toBeInTheDocument();
  });

  it('body paragraph 1 is "Your spot in the 2026 Craven Cancer Classic is reserved."', async () => {
    const mod = await import("@/app/(public)/register/success/page");
    const Page = (
      mod as { default: React.ComponentType }
    ).default;
    render(<Page />);
    expect(
      screen.getByText(
        "Your spot in the 2026 Craven Cancer Classic is reserved."
      )
    ).toBeInTheDocument();
  });

  it('body paragraph 2 contains the committee-balancing clause', async () => {
    const mod = await import("@/app/(public)/register/success/page");
    const Page = (
      mod as { default: React.ComponentType }
    ).default;
    render(<Page />);
    // Key OQ-1-resolved substring
    expect(
      screen.getByText(
        /Your session will be confirmed once the committee balances groups/
      )
    ).toBeInTheDocument();
  });

  it('body paragraph 2 contains "We\'ll see you in September"', async () => {
    const mod = await import("@/app/(public)/register/success/page");
    const Page = (
      mod as { default: React.ComponentType }
    ).default;
    render(<Page />);
    expect(
      screen.getByText(/We'll see you in September/)
    ).toBeInTheDocument();
  });

  it('OLD copy "We look forward to seeing you on the course" is absent', async () => {
    const mod = await import("@/app/(public)/register/success/page");
    const Page = (
      mod as { default: React.ComponentType }
    ).default;
    render(<Page />);
    expect(
      screen.queryByText(/We look forward to seeing you on the course/i)
    ).not.toBeInTheDocument();
  });

  it('OLD body paragraph 1 "Thank you for registering" is absent', async () => {
    const mod = await import("@/app/(public)/register/success/page");
    const Page = (
      mod as { default: React.ComponentType }
    ).default;
    render(<Page />);
    expect(
      screen.queryByText(/Thank you for registering/i)
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Registration closed card — register/page.tsx (Server Component — source check)
// ---------------------------------------------------------------------------

describe("3. Registration closed card", () => {
  const registerPageSource = readFileSync(
    resolve(repoRoot, "src/app/(public)/register/page.tsx"),
    "utf-8"
  );

  it('h2 text is "Registration Opens Soon" in source', () => {
    expect(registerPageSource).toContain("Registration Opens Soon");
  });

  it('OLD h2 "Registration is Currently Closed" is absent from source', () => {
    expect(registerPageSource).not.toContain("Registration is Currently Closed");
  });

  it("new body paragraph contains the locked copy", () => {
    expect(registerPageSource).toContain(
      "Craven Cancer Classic aren't available yet"
    );
  });

  it("new body paragraph contains 'Add your name below'", () => {
    expect(registerPageSource).toContain("Add your name below");
  });

  it("new body paragraph contains 'you'll hear from us the moment they are'", () => {
    expect(registerPageSource).toContain(
      "you'll hear from us the moment they are"
    );
  });

  it("OLD body paragraph text is absent from source", () => {
    // Match via substr that avoids HTML entity encoding issues;
    // the old copy uses "notify you as soon as spots are available"
    expect(registerPageSource).not.toContain(
      "notify you as soon as spots are available"
    );
  });

  it("[year] is dynamically interpolated — getFullYear() call exists near the new body text", () => {
    // The pattern: new Date(...).getFullYear() or new Date().getFullYear()
    // must appear in the closed-registration section, not hardcoded "2026"
    const closedIdx = registerPageSource.indexOf("Registration Opens Soon");
    // Find getFullYear within a 600-char window after the heading
    const window = registerPageSource.slice(closedIdx, closedIdx + 600);
    expect(window).toMatch(/getFullYear\(\)/);
  });

  it("year is not hardcoded as '2026' in the closed body text", () => {
    // The only hardcoded "2026" allowed is in strings Aria explicitly locked;
    // in the closed-card body, [year] must be dynamic.
    const closedIdx = registerPageSource.indexOf("Registration Opens Soon");
    const window = registerPageSource.slice(closedIdx, closedIdx + 600);
    // "2026" must not appear as a bare literal in the interpolated body
    expect(window).not.toMatch(/>\s*2026\s*</);
  });
});

// ---------------------------------------------------------------------------
// 4. CTA consolidation — "Register Your Team" site-wide
// ---------------------------------------------------------------------------

describe('4. CTA consolidation — "Register Your Team" site-wide', () => {
  it('home page has "Register Your Team" CTA (bottom section, ~line 266)', () => {
    const source = readFileSync(
      resolve(repoRoot, "src/app/(public)/page.tsx"),
      "utf-8"
    );
    // Count occurrences — both should be "Register Your Team" after Bolt's fix
    const matches = source.match(/Register Your Team/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('"Register to Play" is absent from home page source', () => {
    const source = readFileSync(
      resolve(repoRoot, "src/app/(public)/page.tsx"),
      "utf-8"
    );
    expect(source).not.toContain("Register to Play");
  });

  it('about page has "Register Your Team" CTA', () => {
    const source = readFileSync(
      resolve(repoRoot, "src/app/(public)/about/page.tsx"),
      "utf-8"
    );
    expect(source).toContain("Register Your Team");
  });

  it('"Register to Play" is absent from about page source', () => {
    const source = readFileSync(
      resolve(repoRoot, "src/app/(public)/about/page.tsx"),
      "utf-8"
    );
    expect(source).not.toContain("Register to Play");
  });

  it('hygiene grep: no "Register to Play" anywhere in src/app/(public)/ excluding __tests__', () => {
    const result = execSync(
      'grep -rn "Register to Play" src/app/\\(public\\)/ --include="*.tsx" --include="*.ts" --exclude-dir="__tests__" || true',
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();
    expect(result).toBe("");
  });
});

// ---------------------------------------------------------------------------
// 5. Registration submit button — "Continue to Payment"
// ---------------------------------------------------------------------------

describe("5. Registration submit button", () => {
  const defaultProps = {
    morningCap: 36,
    afternoonCap: 36,
    morningCount: 10,
    afternoonCount: 5,
    registrationFeeCents: 70000,
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('idle submit button text is "Continue to Payment"', async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    render(<RegistrationForm {...defaultProps} />);

    const submitBtn = screen.getByRole("button", {
      name: /continue to payment/i,
    });
    expect(submitBtn).toBeInTheDocument();
  });

  it('OLD text "Proceed to Payment" is absent', async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    render(<RegistrationForm {...defaultProps} />);

    expect(
      screen.queryByText(/Proceed to Payment/i)
    ).not.toBeInTheDocument();
  });

  it('source does not contain "Proceed to Payment"', () => {
    const source = readFileSync(
      resolve(repoRoot, "src/app/(public)/register/registration-form.tsx"),
      "utf-8"
    );
    expect(source).not.toContain("Proceed to Payment");
  });
});

// ---------------------------------------------------------------------------
// 6. Seeking-team form submit button — "Add Me to the List" / "Adding you..."
// ---------------------------------------------------------------------------

describe("6. Seeking-team form submit button", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function renderOpenForm() {
    const { SeekingTeamForm } = await import(
      "@/app/(public)/register/seeking-team-form"
    );
    render(<SeekingTeamForm />);

    // Click "I'm looking for a team" to expand the form
    const expandBtn = screen.getByRole("button", {
      name: /looking for a team/i,
    });
    fireEvent.click(expandBtn);

    return screen;
  }

  it('idle submit button text is "Add Me to the List"', async () => {
    await renderOpenForm();
    expect(
      screen.getByRole("button", { name: /add me to the list/i })
    ).toBeInTheDocument();
  });

  it('OLD idle text "Submit" is absent from the submit button', async () => {
    await renderOpenForm();
    // There may be other buttons (Cancel); specifically check the submit-type button
    const submitBtn = screen.getByRole("button", { name: /add me to the list/i });
    expect(submitBtn).toBeInTheDocument();
    // "Submit" as standalone text should not be on any button in this form
    const allButtons = screen.getAllByRole("button");
    const submitTextBtn = allButtons.find(
      (btn) => btn.textContent?.trim() === "Submit"
    );
    expect(submitTextBtn).toBeUndefined();
  });

  it('loading state text is "Adding you..."', async () => {
    // Mock fetch to hang so we see the loading state
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve(
                  new Response(JSON.stringify({}), { status: 200 })
                ),
              5000
            )
          )
      )
    );

    await renderOpenForm();

    // Fill required fields using fireEvent.change (feedback_no_user_type_long_strings)
    const nameInput = screen.getByLabelText(/your name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(nameInput, { target: { value: "Jane Golfer" } });
    fireEvent.change(emailInput, { target: { value: "jane@example.com" } });

    // Submit
    const form = nameInput.closest("form")!;
    fireEvent.submit(form);

    // Loading state should show "Adding you..."
    await waitFor(() => {
      expect(screen.getByText("Adding you...")).toBeInTheDocument();
    });
  });

  it('OLD loading text "Submitting..." is absent', async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve(
                  new Response(JSON.stringify({}), { status: 200 })
                ),
              5000
            )
          )
      )
    );

    await renderOpenForm();

    const nameInput = screen.getByLabelText(/your name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(nameInput, { target: { value: "Jane Golfer" } });
    fireEvent.change(emailInput, { target: { value: "jane@example.com" } });

    const form = nameInput.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.queryByText("Submitting...")).not.toBeInTheDocument();
    });
  });

  it('source does not contain "Submitting..." in seeking-team-form.tsx', () => {
    const source = readFileSync(
      resolve(repoRoot, "src/app/(public)/register/seeking-team-form.tsx"),
      "utf-8"
    );
    expect(source).not.toContain("Submitting...");
  });

  it('source does not contain standalone "Submit" button label in seeking-team-form.tsx', () => {
    const source = readFileSync(
      resolve(repoRoot, "src/app/(public)/register/seeking-team-form.tsx"),
      "utf-8"
    );
    // "Submit" as button label (not part of "Submitting" or "submittal" etc.)
    expect(source).not.toMatch(/:\s*["']Submit["']/);
  });
});
