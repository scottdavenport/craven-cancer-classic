/**
 * Sprint 21 · Issue #231 — Design P0 Bundle — RED tests
 *
 * All tests are RED against current main. Bolt makes them GREEN.
 *
 * A. Phantom Tailwind classes (text-h2 / text-h3) removed from src/
 * B. Raw Tailwind red (bg-red-50 / text-red-700) replaced with destructive token
 * C. Session picker a11y (role="radiogroup", role="radio", aria-pressed, focus-visible)
 * D. CardTitle polymorphism (as prop: div default, h2/h3/h4 opt-in)
 *    + RegistrationForm uses CardTitle as="h3" for form-section headings
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { execSync } from "child_process";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// A. Phantom Tailwind classes
// ---------------------------------------------------------------------------

describe("A. Phantom Tailwind classes", () => {
  it("no phantom text-h2 or text-h3 classes remain in src/", () => {
    const repoRoot = resolve(__dirname, "../../");
    const result = execSync(
      'grep -rn "text-h[23]" src/ --include="*.tsx" --include="*.ts" --exclude-dir="__tests__" || true',
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();
    expect(result).toBe("");
  });
});

// ---------------------------------------------------------------------------
// B. Destructive token adoption — error banners in public forms
// ---------------------------------------------------------------------------

// Stub fetch so forms don't hit the network
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("B. Destructive token — RegistrationForm error banner", () => {
  const defaultProps = {
    morningCap: 36,
    afternoonCap: 36,
    morningCount: 10,
    afternoonCount: 5,
    registrationFeeCents: 70000,
  };

  async function renderFormWithError() {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    const { container } = render(<RegistrationForm {...defaultProps} />);

    // Trigger an error state by simulating a failed fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Server error" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    // Submit the form to trigger the error path
    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    // Wait for the error to appear
    await new Promise((r) => setTimeout(r, 50));
    return container;
  }

  it("error banner uses bg-destructive/10 class (not bg-red-50)", async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    const { container } = render(<RegistrationForm {...defaultProps} />);

    // The error div is always mounted (conditional on error state); we need to
    // force the error to display. Simulate a failed submit.
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Test error" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    fireEvent.submit(container.querySelector("form")!);
    await new Promise((r) => setTimeout(r, 50));

    // Find the error element
    const errorEl = container.querySelector('[role="alert"]') ??
      Array.from(container.querySelectorAll("div, p")).find(
        (el) => el.textContent?.includes("Test error") || el.textContent?.includes("error")
      );

    if (errorEl) {
      expect(errorEl.className).toContain("bg-destructive");
      expect(errorEl.className).toContain("text-destructive");
      expect(errorEl.className).not.toContain("bg-red-50");
      expect(errorEl.className).not.toContain("text-red-700");
    } else {
      // Error not yet rendered — check source directly
      const repoRoot = resolve(__dirname, "../../");
      const result = execSync(
        'grep -n "bg-red-50\\|text-red-700" src/app/\\(public\\)/register/registration-form.tsx || true',
        { cwd: repoRoot, encoding: "utf-8" }
      ).trim();
      expect(result).toBe("");
    }
  });
});

describe("B. Destructive token — source-level: no bg-red-50 / text-red-700 in public forms", () => {
  it("registration-form.tsx has no bg-red-50 or text-red-700", () => {
    const repoRoot = resolve(__dirname, "../../");
    const result = execSync(
      'grep -n "bg-red-50\\|text-red-700" src/app/\\(public\\)/register/registration-form.tsx || true',
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();
    expect(result).toBe("");
  });

  it("seeking-team-form.tsx has no bg-red-50 or text-red-700", () => {
    const repoRoot = resolve(__dirname, "../../");
    const result = execSync(
      'grep -n "bg-red-50\\|text-red-700" src/app/\\(public\\)/register/seeking-team-form.tsx || true',
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();
    expect(result).toBe("");
  });

  it("prospect-capture-form.tsx has no bg-red-50 or text-red-700", () => {
    const repoRoot = resolve(__dirname, "../../");
    const result = execSync(
      'grep -n "bg-red-50\\|text-red-700" src/components/public/prospect-capture-form.tsx || true',
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();
    expect(result).toBe("");
  });

  it("error banners in public forms use bg-destructive token", () => {
    const repoRoot = resolve(__dirname, "../../");
    // Each of the 3 files should mention bg-destructive
    const regForm = execSync(
      'grep -c "bg-destructive" src/app/\\(public\\)/register/registration-form.tsx || echo "0"',
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();
    expect(parseInt(regForm)).toBeGreaterThan(0);

    const seekingForm = execSync(
      'grep -c "bg-destructive" src/app/\\(public\\)/register/seeking-team-form.tsx || echo "0"',
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();
    expect(parseInt(seekingForm)).toBeGreaterThan(0);

    const prospectForm = execSync(
      'grep -c "bg-destructive" src/components/public/prospect-capture-form.tsx || echo "0"',
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();
    expect(parseInt(prospectForm)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// C. Session picker a11y
// ---------------------------------------------------------------------------

describe("C. Session picker a11y — RegistrationForm", () => {
  const defaultProps = {
    morningCap: 36,
    afternoonCap: 36,
    morningCount: 10,
    afternoonCount: 5,
    registrationFeeCents: 70000,
  };

  it("session tile container has role='radiogroup'", async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    render(<RegistrationForm {...defaultProps} />);
    const radiogroup = screen.getByRole("radiogroup");
    expect(radiogroup).toBeInTheDocument();
  });

  it("radiogroup has an accessible label", async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    render(<RegistrationForm {...defaultProps} />);
    const radiogroup = screen.getByRole("radiogroup");
    // Must have aria-label or aria-labelledby
    const label = radiogroup.getAttribute("aria-label") ??
      radiogroup.getAttribute("aria-labelledby");
    expect(label).toBeTruthy();
  });

  it("Morning tile has role='radio'", async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    render(<RegistrationForm {...defaultProps} />);
    const radios = screen.getAllByRole("radio");
    const morningRadio = radios.find((el) =>
      el.textContent?.toLowerCase().includes("morning")
    );
    expect(morningRadio).toBeDefined();
  });

  it("Afternoon tile has role='radio'", async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    render(<RegistrationForm {...defaultProps} />);
    const radios = screen.getAllByRole("radio");
    const afternoonRadio = radios.find((el) =>
      el.textContent?.toLowerCase().includes("afternoon")
    );
    expect(afternoonRadio).toBeDefined();
  });

  it("Morning tile has aria-pressed='true' when morning is selected (default)", async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    render(<RegistrationForm {...defaultProps} />);
    const radios = screen.getAllByRole("radio");
    const morningRadio = radios.find((el) =>
      el.textContent?.toLowerCase().includes("morning")
    )!;
    expect(morningRadio.getAttribute("aria-pressed")).toBe("true");
  });

  it("Afternoon tile has aria-pressed='false' when morning is selected (default)", async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    render(<RegistrationForm {...defaultProps} />);
    const radios = screen.getAllByRole("radio");
    const afternoonRadio = radios.find((el) =>
      el.textContent?.toLowerCase().includes("afternoon")
    )!;
    expect(afternoonRadio.getAttribute("aria-pressed")).toBe("false");
  });

  it("aria-pressed toggles when Afternoon tile is clicked", async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    render(<RegistrationForm {...defaultProps} />);
    const radios = screen.getAllByRole("radio");
    const morningRadio = radios.find((el) =>
      el.textContent?.toLowerCase().includes("morning")
    )!;
    const afternoonRadio = radios.find((el) =>
      el.textContent?.toLowerCase().includes("afternoon")
    )!;

    // Click afternoon
    fireEvent.click(afternoonRadio);

    expect(afternoonRadio.getAttribute("aria-pressed")).toBe("true");
    expect(morningRadio.getAttribute("aria-pressed")).toBe("false");
  });

  it("each session tile has focus-visible ring classes", async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    render(<RegistrationForm {...defaultProps} />);
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBeGreaterThanOrEqual(2);

    for (const radio of radios) {
      expect(radio.className).toContain("focus-visible:ring-2");
    }
  });
});

// ---------------------------------------------------------------------------
// D. CardTitle polymorphism
// ---------------------------------------------------------------------------

describe("D. CardTitle polymorphism — unit tests", () => {
  it("renders as div by default (no as prop)", async () => {
    const { CardTitle } = await import("@/components/ui/card");
    const { container } = render(<CardTitle>Hello</CardTitle>);
    const el = container.firstElementChild!;
    expect(el.tagName).toBe("DIV");
  });

  it("renders as h2 when as='h2' is passed", async () => {
    const { CardTitle } = await import("@/components/ui/card");
    // Cast to any: `as` prop doesn't exist yet on main — Bolt adds it.
    const CardTitleAny = CardTitle as React.ComponentType<Record<string, unknown>>;
    const { container } = render(<CardTitleAny as="h2">Hello</CardTitleAny>);
    const el = container.firstElementChild!;
    expect(el.tagName).toBe("H2");
  });

  it("renders as h3 when as='h3' is passed", async () => {
    const { CardTitle } = await import("@/components/ui/card");
    const CardTitleAny = CardTitle as React.ComponentType<Record<string, unknown>>;
    const { container } = render(<CardTitleAny as="h3">Hello</CardTitleAny>);
    const el = container.firstElementChild!;
    expect(el.tagName).toBe("H3");
  });

  it("renders as h4 when as='h4' is passed", async () => {
    const { CardTitle } = await import("@/components/ui/card");
    const CardTitleAny = CardTitle as React.ComponentType<Record<string, unknown>>;
    const { container } = render(<CardTitleAny as="h4">Hello</CardTitleAny>);
    const el = container.firstElementChild!;
    expect(el.tagName).toBe("H4");
  });

  it("preserves className and children when as prop is set", async () => {
    const { CardTitle } = await import("@/components/ui/card");
    const CardTitleAny = CardTitle as React.ComponentType<Record<string, unknown>>;
    const { container } = render(
      <CardTitleAny as="h3" className="my-custom-class">
        Section Title
      </CardTitleAny>
    );
    const el = container.firstElementChild!;
    expect(el.tagName).toBe("H3");
    expect(el.className).toContain("my-custom-class");
    expect(el.textContent).toBe("Section Title");
  });
});

describe("D. CardTitle polymorphism — RegistrationForm integration", () => {
  const defaultProps = {
    morningCap: 36,
    afternoonCap: 36,
    morningCount: 10,
    afternoonCount: 5,
    registrationFeeCents: 70000,
  };

  it("form section headings render as h3 elements (not divs)", async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    render(<RegistrationForm {...defaultProps} />);

    // These card titles must all be h3 elements after Bolt's fix
    const expectedH3s = [
      "Preferred Session",
      "Team Information",
      "Player 2",
      "Player 3",
      "Player 4",
    ];

    for (const text of expectedH3s) {
      const heading = screen.getByRole("heading", { level: 3, name: text });
      expect(heading).toBeInTheDocument();
    }
  });

  it("'Preferred Session' is an h3, not a div", async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    const { container } = render(<RegistrationForm {...defaultProps} />);
    const h3s = Array.from(container.querySelectorAll("h3"));
    const selectSession = h3s.find((el) => el.textContent === "Preferred Session");
    expect(selectSession).toBeDefined();
  });

  it("'Team Information' is an h3, not a div", async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    const { container } = render(<RegistrationForm {...defaultProps} />);
    const h3s = Array.from(container.querySelectorAll("h3"));
    const teamInfo = h3s.find((el) => el.textContent === "Team Information");
    expect(teamInfo).toBeDefined();
  });

  it("Player 2, 3, 4 card titles are h3 elements", async () => {
    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    const { container } = render(<RegistrationForm {...defaultProps} />);
    const h3s = Array.from(container.querySelectorAll("h3")).map(
      (el) => el.textContent
    );
    expect(h3s).toContain("Player 2");
    expect(h3s).toContain("Player 3");
    expect(h3s).toContain("Player 4");
  });

  it("'Seeking a Team?' heading is h2 (already native h2 — must not regress)", () => {
    // The "Seeking a Team?" heading lives in register/page.tsx as a raw <h2>,
    // not a CardTitle. page.tsx is a Server Component so we inspect the source.
    const repoRoot = resolve(__dirname, "../../");
    const { readFileSync } = require("fs");
    const source = readFileSync(
      resolve(repoRoot, "src/app/(public)/register/page.tsx"),
      "utf-8"
    );
    // Find the block containing "Seeking a Team?" and check it's inside an h2
    const idx = source.indexOf("Seeking a Team?");
    expect(idx).toBeGreaterThan(-1);
    // Grab up to 200 chars before the text to find the opening tag
    const before = source.slice(Math.max(0, idx - 200), idx);
    // The nearest opening tag before "Seeking a Team?" must be <h2
    const lastOpenTag = before.match(/<(h\d|div|span|CardTitle)[^>]*>\s*$/)?.[1];
    // If the tag isn't on the immediately preceding line, search a wider window
    const h2Match = before.match(/<h2[^>]*>/g);
    expect(h2Match).not.toBeNull();
  });
});
