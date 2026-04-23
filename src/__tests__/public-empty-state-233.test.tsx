/**
 * Sprint 21 · Issue #233 — PublicEmptyState primitive — RED tests
 *
 * Parallel to AdminEmptyState tests. Public-context styling.
 * All assertions on CSS classes are RED until Bolt ships the real implementation.
 *
 * Contract:
 *   - Renders title as heading
 *   - Renders optional body text
 *   - Renders optional action slot
 *   - Container: py-16 text-center
 *   - Title: font-display text-xl font-semibold text-foreground
 *   - Body: mt-3 font-sans text-[0.9375rem] leading-[1.8] text-muted-foreground
 *   - Separate from AdminEmptyState (different styling, different audience)
 */

import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PublicEmptyState } from "@/components/public/public-empty-state";

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Happy path — title
// ---------------------------------------------------------------------------

describe("PublicEmptyState — title", () => {
  it("renders the title text", () => {
    render(<PublicEmptyState title="Sponsorship Packages Coming Soon" />);
    expect(
      screen.getByText("Sponsorship Packages Coming Soon")
    ).toBeInTheDocument();
  });

  it("title is rendered as a heading element (h1–h3)", () => {
    const { container } = render(
      <PublicEmptyState title="Scores Coming Soon" />
    );
    const headings = container.querySelectorAll("h1, h2, h3");
    expect(headings.length).toBeGreaterThan(0);
    const matching = Array.from(headings).find(
      (h) => h.textContent === "Scores Coming Soon"
    );
    expect(matching).toBeDefined();
  });

  it("title heading applies font-display", () => {
    const { container } = render(<PublicEmptyState title="Nothing Here" />);
    const headings = container.querySelectorAll("h1, h2, h3");
    const titleEl = Array.from(headings).find(
      (h) => h.textContent === "Nothing Here"
    );
    expect(titleEl!.className).toContain("font-display");
  });

  it("title heading applies text-xl", () => {
    const { container } = render(<PublicEmptyState title="Nothing Here" />);
    const headings = container.querySelectorAll("h1, h2, h3");
    const titleEl = Array.from(headings).find(
      (h) => h.textContent === "Nothing Here"
    );
    expect(titleEl!.className).toContain("text-xl");
  });

  it("title heading applies font-semibold", () => {
    const { container } = render(<PublicEmptyState title="Nothing Here" />);
    const headings = container.querySelectorAll("h1, h2, h3");
    const titleEl = Array.from(headings).find(
      (h) => h.textContent === "Nothing Here"
    );
    expect(titleEl!.className).toContain("font-semibold");
  });

  it("title heading applies text-foreground", () => {
    const { container } = render(<PublicEmptyState title="Nothing Here" />);
    const headings = container.querySelectorAll("h1, h2, h3");
    const titleEl = Array.from(headings).find(
      (h) => h.textContent === "Nothing Here"
    );
    expect(titleEl!.className).toContain("text-foreground");
  });
});

// ---------------------------------------------------------------------------
// Body — optional
// ---------------------------------------------------------------------------

describe("PublicEmptyState — body (optional)", () => {
  it("renders body text when provided", () => {
    render(
      <PublicEmptyState
        title="Scores Coming Soon"
        body="Scores will be posted after the tournament."
      />
    );
    expect(
      screen.getByText("Scores will be posted after the tournament.")
    ).toBeInTheDocument();
  });

  it("does NOT render body element when body is omitted", () => {
    render(<PublicEmptyState title="Nothing" />);
    expect(screen.queryByText("Scores will be posted")).toBeNull();
  });

  it("body applies mt-3 class", () => {
    const { container } = render(
      <PublicEmptyState title="T" body="Body text here" />
    );
    const bodyEl = screen.getByText("Body text here");
    expect(bodyEl.className).toContain("mt-3");
  });

  it("body applies text-muted-foreground class", () => {
    render(<PublicEmptyState title="T" body="Body text here" />);
    const bodyEl = screen.getByText("Body text here");
    expect(bodyEl.className).toContain("text-muted-foreground");
  });

  it("body applies font-sans class", () => {
    render(<PublicEmptyState title="T" body="Body text here" />);
    const bodyEl = screen.getByText("Body text here");
    expect(bodyEl.className).toContain("font-sans");
  });
});

// ---------------------------------------------------------------------------
// Action slot — optional
// ---------------------------------------------------------------------------

describe("PublicEmptyState — action slot (optional)", () => {
  it("renders action slot when provided", () => {
    render(
      <PublicEmptyState
        title="Coming Soon"
        action={<button>Get Notified</button>}
      />
    );
    expect(
      screen.getByRole("button", { name: "Get Notified" })
    ).toBeInTheDocument();
  });

  it("does not render action area when action is omitted", () => {
    render(<PublicEmptyState title="Coming Soon" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders ProspectCaptureForm-shaped action slot (simulated)", () => {
    const FakeForm = () => <form aria-label="prospect-form"><input /></form>;
    render(
      <PublicEmptyState
        title="Packages Coming Soon"
        body="Leave your email."
        action={<FakeForm />}
      />
    );
    expect(screen.getByRole("form", { name: "prospect-form" })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Container styling (RED until GREEN)
// ---------------------------------------------------------------------------

describe("PublicEmptyState — container styling (RED until GREEN)", () => {
  it("container applies py-16", () => {
    const { container } = render(<PublicEmptyState title="T" />);
    expect(container.firstElementChild!.className).toContain("py-16");
  });

  it("container applies text-center", () => {
    const { container } = render(<PublicEmptyState title="T" />);
    expect(container.firstElementChild!.className).toContain("text-center");
  });
});

// ---------------------------------------------------------------------------
// Separation from AdminEmptyState
// ---------------------------------------------------------------------------

describe("PublicEmptyState — separate from AdminEmptyState", () => {
  it("does NOT render an inbox icon by default (admin-style behavior)", () => {
    const { container } = render(<PublicEmptyState title="Nothing here" />);
    // AdminEmptyState renders data-testid="empty-state-icon"; public version should not
    expect(container.querySelector('[data-testid="empty-state-icon"]')).toBeNull();
    expect(container.querySelector('[data-testid="empty-state-inbox-default"]')).toBeNull();
  });

  it("has a distinct test ID from AdminEmptyState", () => {
    const { container } = render(<PublicEmptyState title="T" />);
    expect(container.querySelector('[data-testid="public-empty-state"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="empty-state-icon"]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Call site adoption (source grep — RED until GREEN)
// ---------------------------------------------------------------------------

describe("PublicEmptyState — call site adoption (RED until GREEN)", () => {
  it("sponsorships/page.tsx imports PublicEmptyState after adoption", () => {
    const { execSync } = require("child_process");
    const { resolve } = require("path");
    const repoRoot = resolve(__dirname, "../../");
    const result = execSync(
      'grep -c "PublicEmptyState" src/app/\\(public\\)/sponsorships/page.tsx || echo "0"',
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();
    expect(parseInt(result)).toBeGreaterThan(0);
  });

  it("leaderboard/page.tsx imports PublicEmptyState after adoption", () => {
    const { execSync } = require("child_process");
    const { resolve } = require("path");
    const repoRoot = resolve(__dirname, "../../");
    const result = execSync(
      'grep -c "PublicEmptyState" src/app/\\(public\\)/leaderboard/page.tsx || echo "0"',
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();
    expect(parseInt(result)).toBeGreaterThan(0);
  });
});
