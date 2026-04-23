/**
 * Sprint 21 · Issue #232 — Error copy rewrites — RED tests
 *
 * All tests FAIL against current main (61c24d1). Bolt makes them GREEN.
 *
 * Area 1 — RegistrationForm API error fallback (data.error || "...")
 * Area 2 — RegistrationForm network catch block
 * Area 3a — SeekingTeamForm API error (res.ok === false)
 * Area 3b — SeekingTeamForm network catch block
 * Area 4 — Import error banner: "Something went wrong" heading removed, {error} promoted
 * Area 5a — Public error boundary: new copy + mailto link
 * Area 5b — Admin error boundary: new copy + mailto link, no error.message exposed
 * Hygiene — old strings absent from src/; email constant centralised
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import { execSync } from "child_process";
import { resolve } from "path";

const REPO_ROOT = resolve(__dirname, "../../");

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const DEFAULT_REG_PROPS = {
  morningCap: 36,
  afternoonCap: 36,
  morningCount: 10,
  afternoonCount: 5,
  registrationFeeCents: 70000,
};

// Suppress console.error noise from expected error states
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Area 1 — RegistrationForm: API error fallback (no server error message)
// ---------------------------------------------------------------------------

describe("Area 1 — RegistrationForm: API error fallback", () => {
  it("shows new fallback copy when server returns ok:false with no error field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}), // no .error field — triggers the fallback string
      })
    );

    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    const { container } = render(<RegistrationForm {...DEFAULT_REG_PROPS} />);

    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => {
      expect(
        screen.queryByText(/Registration didn't go through/i)
      ).not.toBeNull();
    });
  });

  it("fallback copy contains a mailto link for scott@thinkcode.ai", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      })
    );

    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    const { container } = render(<RegistrationForm {...DEFAULT_REG_PROPS} />);

    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => {
      const link = container.querySelector('a[href^="mailto:"]');
      expect(link).not.toBeNull();
      expect(link!.getAttribute("href")).toContain("scott@thinkcode.ai");
    });
  });

  it("does NOT show old 'Something went wrong' fallback string", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      })
    );

    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    const { container } = render(<RegistrationForm {...DEFAULT_REG_PROPS} />);

    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => {
      // Wait for some error to appear first
      expect(container.querySelector('[class*="destructive"]')).not.toBeNull();
    });

    // Old verbatim string must be gone
    expect(screen.queryByText("Something went wrong")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Area 2 — RegistrationForm: network catch block
// ---------------------------------------------------------------------------

describe("Area 2 — RegistrationForm: network catch block", () => {
  it("shows 'Couldn't reach the registration server' when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network failure"))
    );

    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    const { container } = render(<RegistrationForm {...DEFAULT_REG_PROPS} />);

    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => {
      expect(
        screen.queryByText(/Couldn't reach the registration server/i)
      ).not.toBeNull();
    });
  });

  it("catch copy mentions 'connection'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network failure"))
    );

    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    const { container } = render(<RegistrationForm {...DEFAULT_REG_PROPS} />);

    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => {
      expect(screen.queryByText(/connection/i)).not.toBeNull();
    });
  });

  it("does NOT show old 'Failed to start registration' copy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network failure"))
    );

    const { RegistrationForm } = await import(
      "@/app/(public)/register/registration-form"
    );
    const { container } = render(<RegistrationForm {...DEFAULT_REG_PROPS} />);

    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => {
      // Wait for some error to appear
      expect(container.querySelector('[class*="destructive"]')).not.toBeNull();
    });

    expect(
      screen.queryByText(/Failed to start registration/i)
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Area 3a — SeekingTeamForm: API error (res.ok === false)
// ---------------------------------------------------------------------------

describe("Area 3a — SeekingTeamForm: API error", () => {
  async function renderOpenSeekingForm() {
    const { SeekingTeamForm } = await import(
      "@/app/(public)/register/seeking-team-form"
    );
    render(<SeekingTeamForm />);

    // Open the form by clicking the CTA button
    const openBtn = screen.getByRole("button", { name: /looking for a team/i });
    fireEvent.click(openBtn);

    // Verify the form is now visible
    const form = document.querySelector("form[novalidate]");
    expect(form).not.toBeNull();
    return form!;
  }

  it("shows 'Couldn't save your request' when API returns ok:false", async () => {
    // Stub with no .error field so the fallback string fires
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      })
    );

    const form = await renderOpenSeekingForm();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.queryByText(/Couldn't save your request/i)
      ).not.toBeNull();
    });
  });

  it("Area 3a copy contains a mailto link for scott@thinkcode.ai", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      })
    );

    const form = await renderOpenSeekingForm();
    fireEvent.submit(form);

    await waitFor(() => {
      const link = document.querySelector('a[href^="mailto:"]');
      expect(link).not.toBeNull();
      expect(link!.getAttribute("href")).toContain("scott@thinkcode.ai");
    });
  });

  it("does NOT show old 'Something went wrong. Please try again.' for API error (fallback path)", async () => {
    // Stub with no .error so fallback triggers — old fallback was "Something went wrong. Please try again."
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      })
    );

    const form = await renderOpenSeekingForm();
    fireEvent.submit(form);

    await waitFor(() => {
      // Wait for the error alert to appear
      expect(document.querySelector('[role="alert"]')).not.toBeNull();
    });

    // Old string must be gone — new copy is "Couldn't save your request..."
    expect(
      screen.queryByText("Something went wrong. Please try again.")
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Area 3b — SeekingTeamForm: network catch block
// ---------------------------------------------------------------------------

describe("Area 3b — SeekingTeamForm: network catch block", () => {
  async function renderOpenSeekingFormNetworkError() {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network down"))
    );

    const { SeekingTeamForm } = await import(
      "@/app/(public)/register/seeking-team-form"
    );
    render(<SeekingTeamForm />);

    const openBtn = screen.getByRole("button", { name: /looking for a team/i });
    fireEvent.click(openBtn);

    const form = document.querySelector("form[novalidate]");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    // Wait for the error alert to appear
    await waitFor(() => {
      expect(document.querySelector('[role="alert"]')).not.toBeNull();
    });
  }

  it("shows 'Couldn't reach the server' when fetch throws", async () => {
    await renderOpenSeekingFormNetworkError();

    expect(
      screen.queryByText(/Couldn't reach the server/i)
    ).not.toBeNull();
  });

  it("Area 3b copy mentions 'connection'", async () => {
    await renderOpenSeekingFormNetworkError();

    expect(screen.queryByText(/connection/i)).not.toBeNull();
  });

  it("does NOT show old 'Something went wrong. Please try again.' for network error", async () => {
    await renderOpenSeekingFormNetworkError();

    // Old catch block set "Something went wrong. Please try again." — must be replaced
    expect(
      screen.queryByText("Something went wrong. Please try again.")
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Area 4 — Import error banner: "Something went wrong" heading removed
// ---------------------------------------------------------------------------

describe("Area 4 — Import error banner", () => {
  it("does NOT render a static 'Something went wrong' heading in the error banner", async () => {
    const { ImportClient } = await import(
      "@/app/admin/contacts/import/import-client"
    );
    const { container } = render(<ImportClient />);

    // Simulate an error state by reading the source — the component starts
    // without an error; we assert the banner structure via source inspection
    // since we can't easily drive the wizard to an error state in unit tests.
    // The PRIMARY assertion is source-level: the static heading must be gone.
    const result = execSync(
      'grep -n "Something went wrong" src/app/admin/contacts/import/import-client.tsx || true',
      { cwd: REPO_ROOT, encoding: "utf-8" }
    ).trim();
    expect(result).toBe("");
  });

  it("error text in the banner has font-medium class (error promoted to primary slot)", () => {
    // Source-level check: the error paragraph must have font-medium
    const result = execSync(
      'grep -n "font-medium" src/app/admin/contacts/import/import-client.tsx || true',
      { cwd: REPO_ROOT, encoding: "utf-8" }
    ).trim();
    // After Bolt's change: {error} gets font-medium. At least one font-medium in the banner area.
    expect(result).not.toBe("");

    // And {error} should appear within a font-medium element, not beneath a "Something went wrong" heading
    const errorHeadingResult = execSync(
      'grep -n "Something went wrong" src/app/admin/contacts/import/import-client.tsx || true',
      { cwd: REPO_ROOT, encoding: "utf-8" }
    ).trim();
    expect(errorHeadingResult).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Area 5a — Public error boundary
// ---------------------------------------------------------------------------

describe("Area 5a — Public error boundary (src/app/(public)/error.tsx)", () => {
  async function renderPublicError() {
    const mod = await import("@/app/(public)/error");
    const ErrorComponent = mod.default;
    const error = Object.assign(new Error("test error"), { digest: "abc123" });
    const reset = vi.fn();
    await act(async () => {
      render(<ErrorComponent error={error} reset={reset} />);
    });
    return { error, reset };
  }

  it("overline reads 'Error' (not 'Something Went Wrong')", async () => {
    await renderPublicError();

    // The SectionEyebrow with the OLD text "Something Went Wrong" must be gone.
    // New text is "Error".
    expect(screen.queryByText("Something Went Wrong")).toBeNull();
    expect(screen.queryByText("Error")).not.toBeNull();
  });

  it("heading reads 'Something stopped working.'", async () => {
    await renderPublicError();

    const heading = screen.queryByRole("heading", { name: /Something stopped working/i });
    expect(heading).not.toBeNull();
  });

  it("does NOT render old heading 'We hit an unexpected error'", async () => {
    await renderPublicError();

    expect(
      screen.queryByText(/We hit an unexpected error/i)
    ).toBeNull();
  });

  it("body copy reads 'Try again — if it keeps happening, email...'", async () => {
    await renderPublicError();

    expect(
      screen.queryByText(/Try again — if it keeps happening/i)
    ).not.toBeNull();
  });

  it("does NOT render old body 'contact the organizers'", async () => {
    await renderPublicError();

    expect(
      screen.queryByText(/contact the organizers/i)
    ).toBeNull();
  });

  it("renders a mailto link for scott@thinkcode.ai", async () => {
    const { container } = (await (async () => {
      const mod = await import("@/app/(public)/error");
      const ErrorComponent = mod.default;
      const error = Object.assign(new Error("test error"), { digest: "abc123" });
      const reset = vi.fn();
      let result!: ReturnType<typeof render>;
      await act(async () => {
        result = render(<ErrorComponent error={error} reset={reset} />);
      });
      return result;
    })());

    const link = container.querySelector('a[href^="mailto:"]');
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toContain("scott@thinkcode.ai");
  });

  it("does NOT render old 'Please try again' body copy", async () => {
    await renderPublicError();

    expect(
      screen.queryByText(/Please try again\. If the problem persists/i)
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Area 5b — Admin error boundary
// ---------------------------------------------------------------------------

describe("Area 5b — Admin error boundary (src/app/admin/error.tsx)", () => {
  async function renderAdminError() {
    const mod = await import("@/app/admin/error");
    const AdminErrorComponent = mod.default;
    const error = Object.assign(new Error("admin error"), { digest: "xyz789" });
    const reset = vi.fn();
    await act(async () => {
      render(<AdminErrorComponent error={error} reset={reset} />);
    });
    return { error, reset };
  }

  it("heading reads 'Something stopped working.'", async () => {
    await renderAdminError();

    const heading = screen.queryByRole("heading", { name: /Something stopped working/i });
    expect(heading).not.toBeNull();
  });

  it("does NOT render old heading 'Something went wrong' (lowercase)", async () => {
    await renderAdminError();

    // Old copy was "Something went wrong" (sentence case)
    const heading = screen.queryByRole("heading", { name: /Something went wrong/i });
    expect(heading).toBeNull();
  });

  it("body copy reads 'Try again — if it keeps happening, email...'", async () => {
    await renderAdminError();

    expect(
      screen.queryByText(/Try again — if it keeps happening/i)
    ).not.toBeNull();
  });

  it("renders a mailto link for scott@thinkcode.ai", async () => {
    const mod = await import("@/app/admin/error");
    const AdminErrorComponent = mod.default;
    const error = Object.assign(new Error("admin error"), { digest: "xyz789" });
    const reset = vi.fn();
    let container!: HTMLElement;
    await act(async () => {
      const result = render(<AdminErrorComponent error={error} reset={reset} />);
      container = result.container;
    });

    const link = container.querySelector('a[href^="mailto:"]');
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toContain("scott@thinkcode.ai");
  });

  it("does NOT expose error.message to the DOM", async () => {
    const mod = await import("@/app/admin/error");
    const AdminErrorComponent = mod.default;
    const sensitiveMessage = "UNIQUE_SENSITIVE_MSG_12345";
    const error = Object.assign(new Error(sensitiveMessage), { digest: "xyz789" });
    const reset = vi.fn();
    await act(async () => {
      render(<AdminErrorComponent error={error} reset={reset} />);
    });

    expect(document.body.textContent).not.toContain(sensitiveMessage);
  });

  it("DOES render error.digest when present", async () => {
    const mod = await import("@/app/admin/error");
    const AdminErrorComponent = mod.default;
    const error = Object.assign(new Error("admin error"), { digest: "xyz789" });
    const reset = vi.fn();
    await act(async () => {
      render(<AdminErrorComponent error={error} reset={reset} />);
    });

    expect(document.body.textContent).toContain("xyz789");
  });

  it("does NOT render old body 'An unexpected error occurred.'", async () => {
    await renderAdminError();

    expect(
      screen.queryByText(/An unexpected error occurred/i)
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Hygiene — old strings must be absent from src/ after GREEN
// ---------------------------------------------------------------------------

describe("Hygiene — old error strings absent from src/", () => {
  it("no 'Something went wrong' in registration-form.tsx", () => {
    const result = execSync(
      'grep -n "Something went wrong" src/app/\\(public\\)/register/registration-form.tsx || true',
      { cwd: REPO_ROOT, encoding: "utf-8" }
    ).trim();
    expect(result).toBe("");
  });

  it("no 'Please try again' in registration-form.tsx", () => {
    const result = execSync(
      'grep -n "Please try again" src/app/\\(public\\)/register/registration-form.tsx || true',
      { cwd: REPO_ROOT, encoding: "utf-8" }
    ).trim();
    expect(result).toBe("");
  });

  it("no 'Something went wrong' in seeking-team-form.tsx", () => {
    const result = execSync(
      'grep -n "Something went wrong" src/app/\\(public\\)/register/seeking-team-form.tsx || true',
      { cwd: REPO_ROOT, encoding: "utf-8" }
    ).trim();
    expect(result).toBe("");
  });

  it("no 'We hit an unexpected error' in public error.tsx", () => {
    const result = execSync(
      'grep -n "We hit an unexpected error" "src/app/(public)/error.tsx" || true',
      { cwd: REPO_ROOT, encoding: "utf-8" }
    ).trim();
    expect(result).toBe("");
  });

  it("no 'contact the organizers' anywhere in src/", () => {
    const result = execSync(
      'grep -rn "contact the organizers" src/ --exclude-dir="__tests__" || true',
      { cwd: REPO_ROOT, encoding: "utf-8" }
    ).trim();
    expect(result).toBe("");
  });

  it("no 'An unexpected error occurred' in admin error.tsx", () => {
    const result = execSync(
      'grep -n "An unexpected error occurred" src/app/admin/error.tsx || true',
      { cwd: REPO_ROOT, encoding: "utf-8" }
    ).trim();
    expect(result).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Hygiene — email constant centralisation
// ---------------------------------------------------------------------------

describe("Hygiene — CONTACT_EMAIL constant", () => {
  it("a shared contact constant file exports CONTACT_EMAIL", async () => {
    // Bolt may choose src/lib/contact.ts or similar — dynamic import
    // Try common paths; test passes when any one resolves with the export.
    let exported = false;
    const candidates = [
      "@/lib/contact",
      "@/lib/constants",
      "@/lib/config",
    ];

    for (const path of candidates) {
      try {
        const mod = await import(path);
        if (mod.CONTACT_EMAIL === "scott@thinkcode.ai") {
          exported = true;
          break;
        }
      } catch {
        // module not found — try next
      }
    }

    expect(exported).toBe(true);
  });

  it("scott@thinkcode.ai does not appear as a raw string in registration-form.tsx (uses constant)", () => {
    // After GREEN: the email should come from the imported constant, not be
    // hardcoded. Check the source doesn't contain the literal email string
    // (the mailto href is built from the constant, not hardcoded).
    const result = execSync(
      'grep -n "scott@thinkcode.ai" src/app/\\(public\\)/register/registration-form.tsx || true',
      { cwd: REPO_ROOT, encoding: "utf-8" }
    ).trim();
    expect(result).toBe("");
  });

  it("scott@thinkcode.ai does not appear as a raw string in seeking-team-form.tsx (uses constant)", () => {
    const result = execSync(
      'grep -n "scott@thinkcode.ai" src/app/\\(public\\)/register/seeking-team-form.tsx || true',
      { cwd: REPO_ROOT, encoding: "utf-8" }
    ).trim();
    expect(result).toBe("");
  });

  it("scott@thinkcode.ai does not appear as a raw string in public error.tsx (uses constant)", () => {
    const result = execSync(
      'grep -n "scott@thinkcode.ai" "src/app/(public)/error.tsx" || true',
      { cwd: REPO_ROOT, encoding: "utf-8" }
    ).trim();
    expect(result).toBe("");
  });

  it("scott@thinkcode.ai does not appear as a raw string in admin error.tsx (uses constant)", () => {
    const result = execSync(
      'grep -n "scott@thinkcode.ai" src/app/admin/error.tsx || true',
      { cwd: REPO_ROOT, encoding: "utf-8" }
    ).trim();
    expect(result).toBe("");
  });
});
