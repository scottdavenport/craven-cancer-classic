/**
 * S16-B — AdminDashboardPage component tests
 *
 * Covers:
 * - Renders 6 stat cards with real data from getDashboardStats mock
 * - Revenue card formats cents as "$12,345" (dollars, no cents, thousands separator)
 * - Each card is a clickable <a> link pointing to the correct admin page
 * - Regression guards: no hardcoded zero values, no "Teams" card, no removed LinkButton shortcuts
 *
 * RED phase — AdminDashboardPage does not yet fetch real data, does not render
 * Contacts/Scores cards, and cards are not wrapped in Link elements.
 * All tests should FAIL until Bolt implements PR B.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mock getDashboardStats — hoisted so it is available before module imports
// ---------------------------------------------------------------------------

const { mockGetDashboardStats } = vi.hoisted(() => ({
  mockGetDashboardStats: vi.fn(),
}));

vi.mock("@/app/admin/dashboard-actions", () => ({
  getDashboardStats: mockGetDashboardStats,
}));

// Mock next/navigation (needed by Link internals in test env)
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), prefetch: vi.fn() })),
  usePathname: vi.fn(() => "/admin"),
}));

// ---------------------------------------------------------------------------
// Default stats fixture
// ---------------------------------------------------------------------------

const DEFAULT_STATS = {
  registrations: 7,
  sponsors: 12,
  revenue_cents: 1234500,
  pending_photos: 3,
  contacts: 376,
  scores: 24,
};

// ---------------------------------------------------------------------------
// Helper: render the async server component
//
// AdminDashboardPage is (post-refactor) an async server component that calls
// getDashboardStats() at the top of the function body. In jsdom we call it
// directly and await the returned JSX, then render the result.
// This matches the pattern used in src/__tests__/home-page-code-guard.test.tsx.
// ---------------------------------------------------------------------------

async function renderDashboard(stats = DEFAULT_STATS) {
  mockGetDashboardStats.mockResolvedValue(stats);
  // Dynamic import so module-level vi.mock hoisting applies correctly
  const { default: AdminDashboardPage } = await import("@/app/admin/page");
  // Await the async component to get the JSX tree
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsx = await (AdminDashboardPage as unknown as () => Promise<React.ReactElement>)();
  return render(jsx);
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// Tests — stat cards render real data
// ---------------------------------------------------------------------------

describe("AdminDashboardPage — renders stat cards from real data", () => {
  it('renders a card labeled "Registrations" showing the value "7"', async () => {
    await renderDashboard();

    expect(screen.getByText("Registrations")).toBeInTheDocument();
    // The value "7" must appear in the document (inside the Registrations card)
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it('renders a card labeled "Sponsors" showing the value "12"', async () => {
    await renderDashboard();

    expect(screen.getByText("Sponsors")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it('renders a card labeled "Revenue" showing the value "$12,345" (locked format)', async () => {
    await renderDashboard();

    expect(screen.getByText("Revenue")).toBeInTheDocument();
    // Locked decision: toLocaleString("en-US", { style:"currency", currency:"USD", maximumFractionDigits:0 })
    // 1234500 cents / 100 = $12,345 — EXACT string required
    expect(screen.getByText("$12,345")).toBeInTheDocument();
  });

  it('renders a card labeled "Pending Photos" showing the value "3"', async () => {
    await renderDashboard();

    expect(screen.getByText("Pending Photos")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it('renders a card labeled "Contacts" showing the value "376"', async () => {
    await renderDashboard();

    expect(screen.getByText("Contacts")).toBeInTheDocument();
    expect(screen.getByText("376")).toBeInTheDocument();
  });

  it('renders a card labeled "Scores" showing the value "24"', async () => {
    await renderDashboard();

    expect(screen.getByText("Scores")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests — cards are clickable links
// ---------------------------------------------------------------------------

describe("AdminDashboardPage — cards are clickable links", () => {
  it('Registrations card is an <a> with href="/admin/teams"', async () => {
    const { container } = await renderDashboard();

    // Next.js Link renders as <a> in jsdom
    const links = container.querySelectorAll('a[href="/admin/teams"]');
    expect(links.length).toBeGreaterThanOrEqual(1);

    // The link must contain (or be near) the Registrations label
    const registrationsCard = Array.from(links).find((el) =>
      el.textContent?.includes("Registrations")
    );
    expect(registrationsCard).toBeDefined();
  });

  it('Sponsors card is an <a> with href="/admin/sponsors"', async () => {
    const { container } = await renderDashboard();

    const links = container.querySelectorAll('a[href="/admin/sponsors"]');
    expect(links.length).toBeGreaterThanOrEqual(1);

    const sponsorsCard = Array.from(links).find((el) =>
      el.textContent?.includes("Sponsors")
    );
    expect(sponsorsCard).toBeDefined();
  });

  it('Revenue card is an <a> with href="/admin/sponsorships"', async () => {
    const { container } = await renderDashboard();

    const links = container.querySelectorAll('a[href="/admin/sponsorships"]');
    expect(links.length).toBeGreaterThanOrEqual(1);

    const revenueCard = Array.from(links).find((el) =>
      el.textContent?.includes("Revenue")
    );
    expect(revenueCard).toBeDefined();
  });

  it('Pending Photos card is an <a> with href="/admin/photos"', async () => {
    const { container } = await renderDashboard();

    const links = container.querySelectorAll('a[href="/admin/photos"]');
    expect(links.length).toBeGreaterThanOrEqual(1);

    const photosCard = Array.from(links).find((el) =>
      el.textContent?.includes("Pending Photos")
    );
    expect(photosCard).toBeDefined();
  });

  it('Contacts card is an <a> with href="/admin/contacts"', async () => {
    const { container } = await renderDashboard();

    const links = container.querySelectorAll('a[href="/admin/contacts"]');
    expect(links.length).toBeGreaterThanOrEqual(1);

    const contactsCard = Array.from(links).find((el) =>
      el.textContent?.includes("Contacts")
    );
    expect(contactsCard).toBeDefined();
  });

  it('Scores card is an <a> with href="/admin/scores"', async () => {
    const { container } = await renderDashboard();

    const links = container.querySelectorAll('a[href="/admin/scores"]');
    expect(links.length).toBeGreaterThanOrEqual(1);

    const scoresCard = Array.from(links).find((el) =>
      el.textContent?.includes("Scores")
    );
    expect(scoresCard).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — regression guards
// ---------------------------------------------------------------------------

describe("AdminDashboardPage — regression guards", () => {
  it('no card renders the literal string "$0" when stats return non-zero values', async () => {
    const { container } = await renderDashboard();

    // $0 must not appear anywhere — hardcoded zero revenue is gone
    expect(container.textContent).not.toContain("$0");
  });

  it('no card renders the standalone literal "0" when all stats are non-zero', async () => {
    await renderDashboard();

    // Query all elements — none of the stat value elements should render bare "0"
    // We check by getting all text nodes that are exactly "0"
    const allText = screen.queryAllByText("0");
    // There should be zero elements whose SOLE text content is the digit "0"
    const bareZeros = allText.filter(
      (el) => el.textContent?.trim() === "0"
    );
    expect(bareZeros).toHaveLength(0);
  });

  it('the text "Teams" does NOT appear as a card title (consolidation guard)', async () => {
    await renderDashboard();

    // "Teams" must not be a card label — Registrations covers this
    // (Teams may appear in href values or aria labels but not as a visible card title)
    const headings = screen
      .queryAllByRole("heading")
      .concat(
        // CardTitle renders as various elements — also check for text match
        Array.from(document.querySelectorAll("[class*='CardTitle'], [class*='card-title']"))
      );

    const teamsTitleFound = headings.some(
      (el) => el.textContent?.trim() === "Teams"
    );
    expect(teamsTitleFound).toBe(false);

    // Also assert via queryByText with exact match
    const exactTeams = screen.queryByText("Teams", { exact: true });
    expect(exactTeams).toBeNull();
  });

  it('the text "Manage Registrations" does NOT appear (LinkButton shortcut removed)', async () => {
    await renderDashboard();

    expect(screen.queryByText("Manage Registrations")).toBeNull();
  });

  it('the text "Upload Scores" does NOT appear (LinkButton shortcut removed)', async () => {
    await renderDashboard();

    expect(screen.queryByText("Upload Scores")).toBeNull();
  });
});
