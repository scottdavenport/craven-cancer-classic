/**
 * Sprint 21 · Issue #233 — SectionEyebrow primitive — RED tests
 *
 * All assertions targeting tone-based color classes and standardized tracking
 * are RED until Bolt ships the real implementation.
 *
 * Contract:
 *   - Renders children
 *   - Applies base classes: font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] mb-3
 *   - Applies tone color class: light→text-brand-light, primary→text-primary, brand→text-brand
 *   - Default tone is "primary"
 *   - Passes through className
 */

import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SectionEyebrow } from "@/components/public/section-eyebrow";
import type { EyebrowTone } from "@/components/public/section-eyebrow";

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Rendering — happy path
// ---------------------------------------------------------------------------

describe("SectionEyebrow — rendering", () => {
  it("renders children as text", () => {
    render(<SectionEyebrow>Our Mission</SectionEyebrow>);
    expect(screen.getByText("Our Mission")).toBeInTheDocument();
  });

  it("renders a single element", () => {
    const { container } = render(<SectionEyebrow>Label</SectionEyebrow>);
    expect(container.firstElementChild).not.toBeNull();
  });

  it("passes through className", () => {
    const { container } = render(
      <SectionEyebrow className="my-custom-class">Label</SectionEyebrow>
    );
    expect(container.firstElementChild!.className).toContain("my-custom-class");
  });

  it("renders React node children (JSX)", () => {
    render(
      <SectionEyebrow>
        <span>Nested</span>
      </SectionEyebrow>
    );
    expect(screen.getByText("Nested")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Base classes — all tones share these
// ---------------------------------------------------------------------------

describe("SectionEyebrow — base classes (RED until GREEN)", () => {
  it("applies font-sans", () => {
    const { container } = render(<SectionEyebrow>Label</SectionEyebrow>);
    expect(container.firstElementChild!.className).toContain("font-sans");
  });

  it("applies text-[0.6875rem]", () => {
    const { container } = render(<SectionEyebrow>Label</SectionEyebrow>);
    expect(container.firstElementChild!.className).toContain("text-[0.6875rem]");
  });

  it("applies font-semibold", () => {
    const { container } = render(<SectionEyebrow>Label</SectionEyebrow>);
    expect(container.firstElementChild!.className).toContain("font-semibold");
  });

  it("applies uppercase", () => {
    const { container } = render(<SectionEyebrow>Label</SectionEyebrow>);
    expect(container.firstElementChild!.className).toContain("uppercase");
  });

  it("applies tracking-[0.25em] (standardized — not 0.3em)", () => {
    const { container } = render(<SectionEyebrow>Label</SectionEyebrow>);
    expect(container.firstElementChild!.className).toContain("tracking-[0.25em]");
  });

  it("does NOT apply tracking-[0.3em] (non-standard variant must be retired)", () => {
    const { container } = render(<SectionEyebrow>Label</SectionEyebrow>);
    expect(container.firstElementChild!.className).not.toContain("tracking-[0.3em]");
  });

  it("applies mb-3", () => {
    const { container } = render(<SectionEyebrow>Label</SectionEyebrow>);
    expect(container.firstElementChild!.className).toContain("mb-3");
  });
});

// ---------------------------------------------------------------------------
// Tone — color class mapping
// ---------------------------------------------------------------------------

describe("SectionEyebrow — tone prop (RED until GREEN)", () => {
  it("default tone (no prop) applies text-primary", () => {
    const { container } = render(<SectionEyebrow>Label</SectionEyebrow>);
    expect(container.firstElementChild!.className).toContain("text-primary");
  });

  it("tone='primary' applies text-primary", () => {
    const { container } = render(
      <SectionEyebrow tone="primary">Label</SectionEyebrow>
    );
    expect(container.firstElementChild!.className).toContain("text-primary");
  });

  it("tone='light' applies text-brand-light", () => {
    const { container } = render(
      <SectionEyebrow tone="light">Label</SectionEyebrow>
    );
    expect(container.firstElementChild!.className).toContain("text-brand-light");
  });

  it("tone='brand' applies text-brand", () => {
    const { container } = render(
      <SectionEyebrow tone="brand">Label</SectionEyebrow>
    );
    expect(container.firstElementChild!.className).toContain("text-brand");
  });

  it("tone='light' does NOT apply text-primary", () => {
    const { container } = render(
      <SectionEyebrow tone="light">Label</SectionEyebrow>
    );
    expect(container.firstElementChild!.className).not.toContain("text-primary");
  });

  it("tone='brand' does NOT apply text-brand-light", () => {
    const { container } = render(
      <SectionEyebrow tone="brand">Label</SectionEyebrow>
    );
    expect(container.firstElementChild!.className).not.toContain("text-brand-light");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("SectionEyebrow — edge cases", () => {
  it("renders with empty string children", () => {
    const { container } = render(<SectionEyebrow>{""}</SectionEyebrow>);
    expect(container.firstElementChild).not.toBeNull();
  });

  it("all EyebrowTone values compile without TypeScript error (type coverage)", () => {
    const tones: EyebrowTone[] = ["light", "primary", "brand"];
    for (const tone of tones) {
      const { container } = render(
        <SectionEyebrow tone={tone}>Label</SectionEyebrow>
      );
      expect(container.firstElementChild).not.toBeNull();
      cleanup();
    }
  });
});

// ---------------------------------------------------------------------------
// Hygiene — eyebrow classes must not live in call sites after GREEN
// ---------------------------------------------------------------------------

describe("SectionEyebrow — hygiene (source grep — RED until GREEN)", () => {
  it("text-[0.6875rem] only appears in section-eyebrow.tsx after adoption", () => {
    // After Bolt's GREEN pass, call sites must not contain the raw eyebrow class.
    // This grep checks the PUBLIC pages only (not the component file itself).
    // RED: will fail because call sites still have the raw class.
    const { execSync } = require("child_process");
    const { resolve } = require("path");
    const repoRoot = resolve(__dirname, "../../");

    const result = execSync(
      [
        "grep -rn",
        '"text-\\[0\\.6875rem\\]"',
        "src/app/\\(public\\)/",
        '--include="*.tsx"',
        "|| true",
      ].join(" "),
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();

    expect(result).toBe("");
  });

  it("tracking-[0.3em] no longer appears on public pages after adoption", () => {
    const { execSync } = require("child_process");
    const { resolve } = require("path");
    const repoRoot = resolve(__dirname, "../../");

    const result = execSync(
      [
        "grep -rn",
        '"tracking-\\[0\\.3em\\]"',
        "src/app/\\(public\\)/",
        '--include="*.tsx"',
        "|| true",
      ].join(" "),
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();

    expect(result).toBe("");
  });
});
