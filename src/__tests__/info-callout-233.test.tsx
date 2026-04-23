/**
 * Sprint 21 · Issue #233 — InfoCallout primitive — RED tests
 *
 * All assertions targeting standardized radius/shadow/border/bg are RED until
 * Bolt ships the real implementation.
 *
 * Contract:
 *   - Renders children
 *   - Applies: rounded-xl border border-border/60 bg-neutral-50 p-5 shadow-xs
 *   - Passes through className
 */

import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { InfoCallout } from "@/components/public/info-callout";

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Rendering — happy path
// ---------------------------------------------------------------------------

describe("InfoCallout — rendering", () => {
  it("renders children", () => {
    render(<InfoCallout>Donation info here</InfoCallout>);
    expect(screen.getByText("Donation info here")).toBeInTheDocument();
  });

  it("renders complex React node children", () => {
    render(
      <InfoCallout>
        <p>Primary text</p>
        <strong>Bold detail</strong>
      </InfoCallout>
    );
    expect(screen.getByText("Primary text")).toBeInTheDocument();
    expect(screen.getByText("Bold detail")).toBeInTheDocument();
  });

  it("renders a single wrapper element", () => {
    const { container } = render(<InfoCallout>Content</InfoCallout>);
    expect(container.firstElementChild).not.toBeNull();
  });

  it("passes through className", () => {
    const { container } = render(
      <InfoCallout className="mt-8">Content</InfoCallout>
    );
    expect(container.firstElementChild!.className).toContain("mt-8");
  });
});

// ---------------------------------------------------------------------------
// Standardized styling (RED until GREEN)
// ---------------------------------------------------------------------------

describe("InfoCallout — standardized styling (RED until GREEN)", () => {
  it("applies rounded-xl (brand spec 12px radius)", () => {
    const { container } = render(<InfoCallout>Content</InfoCallout>);
    expect(container.firstElementChild!.className).toContain("rounded-xl");
  });

  it("does NOT apply rounded-lg (must use rounded-xl per brand spec)", () => {
    const { container } = render(<InfoCallout>Content</InfoCallout>);
    // rounded-lg was the pre-primitive value on donate/page.tsx — must normalize
    expect(container.firstElementChild!.className).not.toMatch(/\brounded-lg\b/);
  });

  it("applies border", () => {
    const { container } = render(<InfoCallout>Content</InfoCallout>);
    expect(container.firstElementChild!.className).toContain("border");
  });

  it("applies border-border/60", () => {
    const { container } = render(<InfoCallout>Content</InfoCallout>);
    expect(container.firstElementChild!.className).toContain("border-border/60");
  });

  it("applies bg-neutral-50", () => {
    const { container } = render(<InfoCallout>Content</InfoCallout>);
    expect(container.firstElementChild!.className).toContain("bg-neutral-50");
  });

  it("applies p-5", () => {
    const { container } = render(<InfoCallout>Content</InfoCallout>);
    expect(container.firstElementChild!.className).toContain("p-5");
  });

  it("applies shadow-xs", () => {
    const { container } = render(<InfoCallout>Content</InfoCallout>);
    expect(container.firstElementChild!.className).toContain("shadow-xs");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("InfoCallout — edge cases", () => {
  it("renders with no className prop", () => {
    const { container } = render(<InfoCallout>Content</InfoCallout>);
    expect(container.firstElementChild).not.toBeNull();
  });

  it("renders with empty children string", () => {
    const { container } = render(<InfoCallout>{""}</InfoCallout>);
    expect(container.firstElementChild).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Call site adoption (source grep — RED until GREEN)
// ---------------------------------------------------------------------------

describe("InfoCallout — call site adoption (RED until GREEN)", () => {
  it("donate/page.tsx imports InfoCallout after adoption", () => {
    const { execSync } = require("child_process");
    const { resolve } = require("path");
    const repoRoot = resolve(__dirname, "../../");
    const result = execSync(
      'grep -c "InfoCallout" src/app/\\(public\\)/donate/page.tsx || echo "0"',
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();
    expect(parseInt(result)).toBeGreaterThan(0);
  });

  it("leaderboard/page.tsx imports InfoCallout after adoption", () => {
    const { execSync } = require("child_process");
    const { resolve } = require("path");
    const repoRoot = resolve(__dirname, "../../");
    const result = execSync(
      'grep -c "InfoCallout" src/app/\\(public\\)/leaderboard/page.tsx || echo "0"',
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();
    expect(parseInt(result)).toBeGreaterThan(0);
  });
});
