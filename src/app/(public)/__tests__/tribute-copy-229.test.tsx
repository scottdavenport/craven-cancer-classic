/**
 * RED tests for Sprint 21 · Issue #229 — Tribute Copy Rewrite
 *
 * These tests encode the locked copy approved 2026-04-22 (Scott + Aria via Forge session).
 * They FAIL against current main — Bolt makes them green.
 *
 * Pipeline: Spec RED → Bolt GREEN → Watchdog → Forge merge
 * Plan: plans/sprint-21-229-tribute-rewrite.md
 *
 * Surface coverage:
 *   1. Home hero subhead
 *   2. About h1
 *   3. About intro paragraph
 *   4. About In Loving Memory structure + content
 *   5. About pull-quote
 *   6. Donate tribute block
 *   7. Layout metadata description (import test — see tribute-meta-229.test.ts)
 *   8. Footer tagline
 *   9. Anti-regression: "valiantly fought" absent from src/
 *  10. No grief-framing phrases in rendered copy surfaces
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { execSync } from "child_process";
import path from "path";

// ---------------------------------------------------------------------------
// Module mocks — hoisted before any imports of the pages under test
// ---------------------------------------------------------------------------

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// next/image — jsdom cannot resolve Next.js image optimization
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// next/link — jsdom passthrough
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// event-settings — home page depends on this
vi.mock("@/lib/event-settings", () => ({
  getPublicEventSettings: vi.fn().mockResolvedValue({
    tournament_start_date: "2026-09-12",
    tournament_end_date: "2026-09-12",
    venue_name: "New Bern Golf & Country Club",
    year: 2026,
  }),
  formatTournamentDate: vi.fn().mockReturnValue("September 12, 2026"),
}));

// ProspectCaptureForm — donate page dependency; stub out server action
vi.mock("@/components/public/prospect-capture-form", () => ({
  ProspectCaptureForm: () => (
    <div data-testid="prospect-capture-form-stub" />
  ),
}));

// LinkButton — thin passthrough for test purposes
vi.mock("@/components/ui/link-button", () => ({
  LinkButton: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import * as serverModule from "@/lib/supabase/server";

function buildSupabaseMock() {
  vi.mocked(serverModule.createClient).mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  } as unknown as Awaited<ReturnType<typeof serverModule.createClient>>);
}

// ---------------------------------------------------------------------------
// 1. Home hero — new subhead
// ---------------------------------------------------------------------------

describe("Home hero (#229)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    buildSupabaseMock();
  });

  it("renders the locked hero subhead (exact text)", async () => {
    const { default: HomePage } = await import("../page");
    const jsx = await HomePage({});
    render(jsx as React.ReactElement);
    expect(
      screen.getByText(
        "Built in 2010 by the people who loved them. Still going, for the same reason."
      )
    ).toBeInTheDocument();
  });

  it("does NOT render the old subhead 'valiantly fought' in the hero", async () => {
    const { default: HomePage } = await import("../page");
    const jsx = await HomePage({});
    const { container } = render(jsx as React.ReactElement);
    expect(container.innerHTML).not.toContain("valiantly fought");
  });
});

// ---------------------------------------------------------------------------
// 2–5. About page
// ---------------------------------------------------------------------------

describe("About page (#229)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  async function renderAbout() {
    const { default: AboutPage } = await import("../about/page");
    return render(<AboutPage />);
  }

  // 2. h1
  it("renders 'How This Started' as the page h1", async () => {
    await renderAbout();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("How This Started");
  });

  // 3. Intro paragraph
  it("renders the locked intro paragraph (founding names + reason)", async () => {
    await renderAbout();
    expect(
      screen.getByText(/are the reason this tournament exists/i)
    ).toBeInTheDocument();
  });

  it("renders the locked intro paragraph — founding year and care framing", async () => {
    await renderAbout();
    expect(
      screen.getByText(/out of care for other families facing cancer/i)
    ).toBeInTheDocument();
  });

  it("renders all three founders in the intro paragraph", async () => {
    await renderAbout();
    const introText = screen.getByText(/are the reason this tournament exists/i)
      .textContent ?? "";
    expect(introText).toContain("Scott Davenport Sr.");
    expect(introText).toContain("Brian Fisher");
    expect(introText).toContain("John Aylward");
  });

  it("renders the intro — 'founded it in 2010'", async () => {
    await renderAbout();
    expect(
      screen.getByText(/founded it in 2010/i)
    ).toBeInTheDocument();
  });

  // 4a. In Loving Memory — wrapper intro
  it("renders the In Loving Memory wrapper intro — first clause", async () => {
    await renderAbout();
    expect(
      screen.getByText(/The three men this tournament was built to honor/i)
    ).toBeInTheDocument();
  });

  it("renders the In Loving Memory wrapper intro — second clause", async () => {
    await renderAbout();
    expect(
      screen.getByText(/Their families will share their stories here/i)
    ).toBeInTheDocument();
  });

  // 4b. Three h3 honoree blocks
  it("renders exactly 3 h3 elements in the In Loving Memory section", async () => {
    const { container } = await renderAbout();
    const h3s = container.querySelectorAll("h3");
    expect(h3s).toHaveLength(3);
  });

  it("renders h3 'Scott Davenport Sr.'", async () => {
    await renderAbout();
    expect(
      screen.getByRole("heading", { level: 3, name: "Scott Davenport Sr." })
    ).toBeInTheDocument();
  });

  it("renders h3 'Brian Fisher'", async () => {
    await renderAbout();
    expect(
      screen.getByRole("heading", { level: 3, name: "Brian Fisher" })
    ).toBeInTheDocument();
  });

  it("renders h3 'John Aylward'", async () => {
    await renderAbout();
    expect(
      screen.getByRole("heading", { level: 3, name: "John Aylward" })
    ).toBeInTheDocument();
  });

  // 4c. Three italic placeholder paragraphs
  it("renders exactly 3 occurrences of the placeholder 'A tribute from his family — to follow.'", async () => {
    await renderAbout();
    const placeholders = screen.getAllByText("A tribute from his family — to follow.");
    expect(placeholders).toHaveLength(3);
  });

  it("placeholder text is rendered in italic elements", async () => {
    const { container } = await renderAbout();
    // Each placeholder should be wrapped in an italic element (<em> or element with font-italic class)
    const italicEls = container.querySelectorAll("em, i, [class*='italic']");
    const placeholderInItalic = Array.from(italicEls).some((el) =>
      el.textContent?.includes("A tribute from his family — to follow.")
    );
    expect(placeholderInItalic).toBe(true);
  });

  // 4d. Closing line
  it("renders the closing line below the three honoree blocks", async () => {
    await renderAbout();
    expect(
      screen.getByText(
        /Every dollar this tournament raises goes to the community that still carries them/i
      )
    ).toBeInTheDocument();
  });

  // 5. Pull-quote
  it("renders pull-quote — 'Showing up since 2010'", async () => {
    await renderAbout();
    expect(screen.getByText(/Showing up since 2010/i)).toBeInTheDocument();
  });

  it("renders pull-quote — '$450,000+ raised'", async () => {
    await renderAbout();
    expect(screen.getByText(/\$450,000\+ raised/i)).toBeInTheDocument();
  });

  it("renders pull-quote — 'The same reason every time'", async () => {
    await renderAbout();
    expect(screen.getByText(/The same reason every time/i)).toBeInTheDocument();
  });

  // No grief framing on About page
  it("About page rendered HTML does not contain 'valiantly fought'", async () => {
    const { container } = await renderAbout();
    expect(container.innerHTML).not.toContain("valiantly fought");
  });

  it("About page rendered HTML does not contain 'out of grief'", async () => {
    const { container } = await renderAbout();
    expect(container.innerHTML).not.toContain("out of grief");
  });

  it("About page rendered HTML does not contain 'born of loss'", async () => {
    const { container } = await renderAbout();
    expect(container.innerHTML).not.toContain("born of loss");
  });
});

// ---------------------------------------------------------------------------
// 6. Donate page — tribute block
// ---------------------------------------------------------------------------

describe("Donate page tribute block (#229)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    buildSupabaseMock();
  });

  async function renderDonate() {
    const { default: DonatePage } = await import("../donate/page");
    return render(<DonatePage />);
  }

  it("renders the locked donate tribute — honors all three names", async () => {
    await renderDonate();
    expect(
      screen.getByText(/Every dollar here honors Scott Davenport Sr\., Brian Fisher, and John Aylward/i)
    ).toBeInTheDocument();
  });

  it("renders the locked donate tribute — 'the reason this tournament exists'", async () => {
    await renderDonate();
    expect(
      screen.getByText(/the reason this tournament exists/i)
    ).toBeInTheDocument();
  });

  it("renders the locked donate tribute — 'Their families built this in 2010'", async () => {
    await renderDonate();
    expect(
      screen.getByText(/Their families built this in 2010/i)
    ).toBeInTheDocument();
  });

  it("renders the locked donate tribute — 'Every gift keeps it going'", async () => {
    await renderDonate();
    expect(
      screen.getByText(/Every gift keeps it going/i)
    ).toBeInTheDocument();
  });

  it("Donate page rendered HTML does not contain 'valiantly fought'", async () => {
    const { container } = await renderDonate();
    expect(container.innerHTML).not.toContain("valiantly fought");
  });
});

// ---------------------------------------------------------------------------
// 8. Footer tagline
// ---------------------------------------------------------------------------

describe("Footer tagline (#229)", () => {
  it("renders the locked tagline 'Still going, for the same reason.'", async () => {
    vi.resetModules();
    const { Footer } = await import("@/components/public/footer");
    render(<Footer />);
    expect(
      screen.getByText(/Still going, for the same reason\./i)
    ).toBeInTheDocument();
  });

  it("does NOT render 'valiantly fought' in the footer", async () => {
    vi.resetModules();
    const { Footer } = await import("@/components/public/footer");
    const { container } = render(<Footer />);
    expect(container.innerHTML).not.toContain("valiantly fought");
  });
});

// ---------------------------------------------------------------------------
// 9. Anti-regression: "valiantly fought" absent from all of src/
// ---------------------------------------------------------------------------

describe("Source hygiene — 'valiantly fought' removal (#229)", () => {
  it("'valiantly fought' does not appear anywhere in src/", () => {
    const repoRoot = path.resolve(__dirname, "../../../../");
    let grepOutput = "";
    try {
      grepOutput = execSync(`grep -r "valiantly fought" "${repoRoot}/src/"`, {
        encoding: "utf8",
      });
    } catch {
      // grep exits non-zero when no matches — that's the passing state
      grepOutput = "";
    }
    // If grepOutput is non-empty, 'valiantly fought' still exists in src/
    expect(grepOutput.trim()).toBe("");
  });
});

// ---------------------------------------------------------------------------
// 10. No grief-framing on Home and Donate rendered surfaces
// ---------------------------------------------------------------------------

describe("No grief-framing on Home page (#229)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    buildSupabaseMock();
  });

  it("Home page rendered HTML does not contain 'out of grief'", async () => {
    const { default: HomePage } = await import("../page");
    const jsx = await HomePage({});
    const { container } = render(jsx as React.ReactElement);
    expect(container.innerHTML).not.toContain("out of grief");
  });

  it("Home page rendered HTML does not contain 'born of loss'", async () => {
    const { default: HomePage } = await import("../page");
    const jsx = await HomePage({});
    const { container } = render(jsx as React.ReactElement);
    expect(container.innerHTML).not.toContain("born of loss");
  });
});
