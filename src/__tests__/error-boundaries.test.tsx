/**
 * S3-11: error.tsx per route segment.
 *
 * Tests assert that all 3 error boundary files exist and export a component
 * with the correct signature. Files do not exist today — tests fail with
 * module-not-found until Bolt creates them.
 *
 * Strategy: import the module, render the default export with RTL, assert:
 *   - "use client" directive (checked via source text)
 *   - accepts { error, reset } props
 *   - renders a user-visible error message
 *   - renders a "Try again" button
 *   - calls console.error(error) in useEffect
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { readFileSync } from "fs";
import { resolve } from "path";

const APP_ROOT = resolve(__dirname, "../../src/app");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeErrorProps() {
  const error = Object.assign(new Error("test error"), { digest: "abc123" });
  const reset = vi.fn();
  return { error, reset };
}

async function importErrorComponent(relativePath: string) {
  // Dynamic import — fails with module-not-found if file doesn't exist
  return import(`@/app/${relativePath}`);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("S3-11 error.tsx boundaries", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  const boundaries = [
    { name: "root app/error.tsx", importPath: "error", filePath: "error.tsx" },
    {
      name: "public app/(public)/error.tsx",
      importPath: "(public)/error",
      filePath: "(public)/error.tsx",
    },
    {
      name: "admin app/admin/error.tsx",
      importPath: "admin/error",
      filePath: "admin/error.tsx",
    },
  ] as const;

  for (const boundary of boundaries) {
    describe(boundary.name, () => {
      it("has 'use client' directive at the top of the file", () => {
        const fullPath = resolve(APP_ROOT, boundary.filePath);
        const content = readFileSync(fullPath, "utf-8");
        expect(content.trimStart()).toMatch(/^"use client"/);
      });

      it("exports a default component that renders a user-visible error message", async () => {
        const mod = await importErrorComponent(boundary.importPath);
        const ErrorComponent = mod.default;
        const { error, reset } = makeErrorProps();

        await act(async () => {
          render(<ErrorComponent error={error} reset={reset} />);
        });

        // Must render some user-readable error indication
        const heading = screen.queryByRole("heading");
        const textContent = document.body.textContent ?? "";
        const hasErrorText =
          (heading !== null) || textContent.toLowerCase().includes("wrong") ||
          textContent.toLowerCase().includes("error");
        expect(hasErrorText).toBe(true);
      });

      it("renders a 'Try again' button that calls reset()", async () => {
        const mod = await importErrorComponent(boundary.importPath);
        const ErrorComponent = mod.default;
        const { error, reset } = makeErrorProps();

        await act(async () => {
          render(<ErrorComponent error={error} reset={reset} />);
        });

        const button = screen.getByRole("button", { name: /try again/i });
        expect(button).toBeDefined();
        button.click();
        expect(reset).toHaveBeenCalledTimes(1);
      });

      it("calls console.error(error) in useEffect", async () => {
        const mod = await importErrorComponent(boundary.importPath);
        const ErrorComponent = mod.default;
        const { error, reset } = makeErrorProps();

        await act(async () => {
          render(<ErrorComponent error={error} reset={reset} />);
        });

        expect(console.error).toHaveBeenCalledWith(error);
      });
    });
  }
});
