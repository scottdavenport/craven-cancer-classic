/**
 * RED tests for Sprint 21 · Issue #235 — Public-site rhythm/spacing/typography sweep
 *
 * These tests describe the TARGET state after Bolt's GREEN PR.
 * They FAIL against current main because:
 *   - Home hero + content sections still use py-14 sm:py-20 (item 1)
 *   - Home h2 elements use text-3xl sm:text-[1.75rem] (shrinks on larger vp) (item 2)
 *   - about/page.tsx has h-px w-12 bg-primary/40 accent rules (item 4)
 *   - about/page.tsx and donate/page.tsx have dead flex gap-4 on single-child divs (item 6)
 *   - registration-form.tsx uses border-2 on session tiles (item 7)
 *   - sponsorship-grid.tsx adds hover:-translate-y-0.5 that duplicates Card's own class (item 8)
 *
 * Item 3 (eyebrow tracking) is already resolved by #233 — encoded here as a hygiene guard.
 *
 * Plan: plans/sprint-21-235-rhythm-sweep.md
 * Pipeline: Spec RED → Bolt GREEN → Watchdog → Forge merge
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { execSync } from "child_process";
import path from "path";

// ---------------------------------------------------------------------------
// Module-level mocks — must be hoisted before any page imports
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

vi.mock("@/lib/event-settings", () => ({
  getPublicEventSettings: vi.fn().mockResolvedValue({
    tournament_start_date: "2026-09-12",
    tournament_end_date: "2026-09-12",
    venue_name: "New Bern Golf & Country Club",
    year: 2026,
  }),
  formatTournamentDate: vi.fn().mockReturnValue("September 12, 2026"),
}));

vi.mock("@/components/public/prospect-capture-form", () => ({
  ProspectCaptureForm: () => (
    <div data-testid="prospect-capture-form-stub" />
  ),
}));

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
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  } as unknown as Awaited<ReturnType<typeof serverModule.createClient>>);
}

/** Walk a container's elements and return the first `<section>` whose className
 *  contains the search string. */
function findSection(container: HTMLElement, classFragment: string): Element | null {
  return Array.from(container.querySelectorAll("section")).find((el) =>
    el.className.includes(classFragment)
  ) ?? null;
}

// ---------------------------------------------------------------------------
// Repo root (for grep-style source tests)
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, "../../../../");

function grepSource(pattern: string, dir: string): string {
  try {
    return execSync(
      `grep -rn --include="*.tsx" --include="*.ts" --exclude-dir="__tests__" ${JSON.stringify(pattern)} "${REPO_ROOT}/${dir}"`,
      { encoding: "utf8" }
    );
  } catch {
    // grep exits 1 when no matches — that's the passing state for our "must be empty" tests
    return "";
  }
}

// ===========================================================================
// Item 1 — Home hero + content padding: py-14 sm:py-20 → py-20/py-16 targets
// ===========================================================================

describe("Item 1 — Home hero padding (#235)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    buildSupabaseMock();
  });

  it("home hero section does NOT use py-14 sm:py-20 (must be py-20 sm:py-28)", async () => {
    const { default: HomePage } = await import("../page");
    const jsx = await HomePage({});
    const { container } = render(jsx as React.ReactElement);
    // The hero is the first section and has grain-overlay + bg-[#1A2E3A]
    const hero = Array.from(container.querySelectorAll("section")).find((el) =>
      el.className.includes("grain-overlay")
    );
    expect(hero).toBeDefined();
    expect(hero!.className).not.toContain("py-14");
    expect(hero!.className).not.toContain("sm:py-20");
  });

  it("home hero section has py-20 sm:py-28", async () => {
    const { default: HomePage } = await import("../page");
    const jsx = await HomePage({});
    const { container } = render(jsx as React.ReactElement);
    const hero = Array.from(container.querySelectorAll("section")).find((el) =>
      el.className.includes("grain-overlay")
    );
    expect(hero).toBeDefined();
    expect(hero!.className).toContain("py-20");
    expect(hero!.className).toContain("sm:py-28");
  });

  it("home content sections do NOT use py-14 (impact stats section)", async () => {
    const { default: HomePage } = await import("../page");
    const jsx = await HomePage({});
    const { container } = render(jsx as React.ReactElement);
    // Impact stats section has bg-neutral-50
    const statsSection = findSection(container, "bg-neutral-50");
    expect(statsSection).toBeDefined();
    expect(statsSection!.className).not.toContain("py-14");
  });

  it("home content sections do NOT use py-14 (mission/cream section)", async () => {
    const { default: HomePage } = await import("../page");
    const jsx = await HomePage({});
    const { container } = render(jsx as React.ReactElement);
    // Mission section has bg-cream
    const missionSection = findSection(container, "bg-cream");
    expect(missionSection).toBeDefined();
    expect(missionSection!.className).not.toContain("py-14");
  });

  it("home content sections do NOT use py-14 (donate CTA / white section)", async () => {
    const { default: HomePage } = await import("../page");
    const jsx = await HomePage({});
    const { container } = render(jsx as React.ReactElement);
    // Donate CTA section has bg-white
    const ctaSection = findSection(container, "bg-white");
    expect(ctaSection).toBeDefined();
    expect(ctaSection!.className).not.toContain("py-14");
  });

  it("source hygiene: py-14 sm:py-20 does not appear in home page.tsx", () => {
    const result = grepSource("py-14 sm:py-20", "src/app/(public)/page.tsx");
    expect(result.trim()).toBe("");
  });
});

// ===========================================================================
// Item 2 — H2 responsive scale bug: text-3xl sm:text-[1.75rem]
// ===========================================================================

describe("Item 2 — H2 responsive scale bug (#235)", () => {
  it("source hygiene: text-3xl sm:text-[1.75rem] not present in home page.tsx", () => {
    const result = grepSource("text-3xl sm:text-\\[1\\.75rem\\]", "src/app/(public)/page.tsx");
    expect(result.trim()).toBe("");
  });

  it("source hygiene: text-3xl sm:text-[1.75rem] not present anywhere in src/app/(public)/", () => {
    const result = grepSource("text-3xl sm:text-\\[1\\.75rem\\]", "src/app/(public)/");
    expect(result.trim()).toBe("");
  });
});

// ===========================================================================
// Item 3 — Eyebrow tracking hygiene guard (already resolved by #233)
// ===========================================================================

describe("Item 3 — Eyebrow tracking hygiene guard (#233 invariant)", () => {
  it("tracking-[0.3em] does not appear in any public page file (resolved by #233)", () => {
    const result = grepSource("tracking-\\[0\\.3em\\]", "src/app/(public)/");
    expect(result.trim()).toBe("");
  });
});

// ===========================================================================
// Item 4 — Section accent rule drift: h-px w-12 bg-primary/40 → h-0.5 w-12 bg-primary
// ===========================================================================

describe("Item 4 — Section accent rule drift (#235)", () => {
  it("source hygiene: h-px w-12 bg-primary/40 not present in about/page.tsx", () => {
    const result = grepSource("h-px w-12 bg-primary/40", "src/app/(public)/about/page.tsx");
    expect(result.trim()).toBe("");
  });

  it("source hygiene: h-px w-12 bg-primary/40 not present in any public page", () => {
    const result = grepSource("h-px w-12 bg-primary/40", "src/app/(public)/");
    expect(result.trim()).toBe("");
  });

  it("about page renders accent rules with h-0.5 w-12 bg-primary (not 1px muted)", async () => {
    vi.resetModules();
    const { default: AboutPage } = await import("../about/page");
    const { container } = render(<AboutPage />);
    // Accent divs: h-0.5 w-12 bg-primary — should be present
    const accentDivs = Array.from(container.querySelectorAll("div")).filter(
      (el) => el.className.includes("h-0.5") && el.className.includes("w-12") && el.className.includes("bg-primary")
    );
    // There are multiple sections in about page with accent divs — expect at least 2
    expect(accentDivs.length).toBeGreaterThanOrEqual(2);
  });

  it("about page does not render any accent div with h-px and bg-primary/40", async () => {
    vi.resetModules();
    const { default: AboutPage } = await import("../about/page");
    const { container } = render(<AboutPage />);
    const badAccentDivs = Array.from(container.querySelectorAll("div")).filter(
      (el) => el.className.includes("h-px") && el.className.includes("bg-primary/40")
    );
    expect(badAccentDivs).toHaveLength(0);
  });
});

// ===========================================================================
// Item 6 — Dead-flex cleanup: flex gap-4 on single-child containers
// ===========================================================================

describe("Item 6 — Dead-flex cleanup (#235)", () => {
  it("source hygiene: 'flex gap-4 border-l-2' not in about/page.tsx (single-child dead flex)", () => {
    // The full pattern is: flex gap-4 border-l-2 border-primary/30 pl-5
    const result = grepSource("flex gap-4 border-l", "src/app/(public)/about/page.tsx");
    expect(result.trim()).toBe("");
  });

  it("source hygiene: 'flex gap-4 border-l' not in donate/page.tsx (single-child dead flex)", () => {
    const result = grepSource("flex gap-4 border-l", "src/app/(public)/donate/page.tsx");
    expect(result.trim()).toBe("");
  });
});

// ===========================================================================
// Item 7 — Session tile border weight: border-2 → border (1px)
// ===========================================================================

describe("Item 7 — Session tile border weight (#235)", () => {
  it("source hygiene: border-2 not present on session tile buttons in registration-form.tsx", () => {
    // The session tile buttons (role=radio) use border-2 p-4 — must be gone
    const result = grepSource("border-2 p-4", "src/app/(public)/register/registration-form.tsx");
    expect(result.trim()).toBe("");
  });

  it("source hygiene: no border-2 in registration-form.tsx at all", () => {
    const result = grepSource("border-2", "src/app/(public)/register/registration-form.tsx");
    expect(result.trim()).toBe("");
  });

  it("rendered session tiles use border (1px) not border-2 (2px)", async () => {
    vi.resetModules();
    // RegistrationForm is a 'use client' component — import directly
    const { RegistrationForm } = await import("../register/registration-form");

    // Provide minimal required props
    const { container } = render(
      <RegistrationForm
        morningCap={10}
        afternoonCap={10}
        morningCount={0}
        afternoonCount={0}
        registrationFeeCents={70000}
      />
    );

    // Session picker buttons have role="radio"
    const radioButtons = container.querySelectorAll('[role="radio"]');
    expect(radioButtons.length).toBeGreaterThan(0);

    radioButtons.forEach((btn) => {
      // Must NOT contain border-2
      expect(btn.className).not.toContain("border-2");
      // Should contain bare "border" class (1px)
      // Use a word-boundary check: "border " or "border\n" but not "border-2" or "border-l"
      const hasBorder = /\bborder\b/.test(btn.className);
      expect(hasBorder).toBe(true);
    });
  });
});

// ===========================================================================
// Item 8 — Double-hover animation on sponsorship cards
// ===========================================================================

describe("Item 8 — Sponsorship card hover not duplicated (#235)", () => {
  it("source hygiene: sponsorship-grid.tsx does not add hover:-translate-y-0.5 to Card className", () => {
    // The Card component already has hover:-translate-y-0.5 in its base styles.
    // Adding it again in the className prop causes duplication.
    const result = grepSource(
      "hover:-translate-y-0\\.5",
      "src/app/(public)/sponsorships/sponsorship-grid.tsx"
    );
    expect(result.trim()).toBe("");
  });

  it("sponsorship grid renders Card without inline hover:-translate-y-0.5 on the card element", async () => {
    vi.resetModules();

    const STUB_ITEMS = [
      {
        id: "item-1",
        name: "Gold Sponsor",
        description: "Top tier sponsorship",
        price_cents: 500000,
        max_quantity: 5,
        sold_count: 1,
        active: true,
        year: 2026,
        deleted_at: null,
        deleted_by: null,
        created_at: "2026-01-01T00:00:00Z",
        benefits: null,
        sort_order: 1,
      },
    ];

    // SponsorshipGrid is 'use client' — import directly
    const { SponsorshipGrid } = await import("../sponsorships/sponsorship-grid");
    const { container } = render(<SponsorshipGrid items={STUB_ITEMS} />);

    // The outermost card wrapper should not have hover:-translate-y-0.5 duplicated inline.
    // The Card component renders it via its base class, but that's inside the component —
    // what we verify is that sponsorship-grid does NOT pass it as an extra class on the Card wrapper.
    // In practice: the rendered card element className should contain hover:-translate-y-0.5
    // AT MOST ONCE (from Card's own base, not additionally from sponsorship-grid).
    const cardEl = container.querySelector('[class*="rounded-xl"]');
    if (cardEl) {
      const classes = cardEl.className;
      const occurrences = (classes.match(/hover:-translate-y-0\.5/g) ?? []).length;
      expect(occurrences).toBeLessThanOrEqual(1);
    }
    // If no rounded-xl card found, the structure may have changed — check any hover-translate el
    const hoverEls = Array.from(container.querySelectorAll("*")).filter((el) =>
      el.className && el.className.includes("hover:-translate-y-0.5")
    );
    // Each element should appear with the class at most once (className is a string, not a list)
    hoverEls.forEach((el) => {
      const occurrences = (el.className.match(/hover:-translate-y-0\.5/g) ?? []).length;
      expect(occurrences).toBe(1);
    });
  });
});
