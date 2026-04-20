/**
 * S16-A — AdminSidebar grouping, rename, and logo tests (RED phase)
 *
 * Tests for PR A acceptance criteria:
 *   #157 — Real CCC logo in sidebar header (no plain text fallback)
 *   #160 — Sidebar grouped into 5 named sections
 *   #162 — Rename "Contacts & Email" → "Contacts"
 *
 * These tests are written BEFORE implementation (TDD red phase).
 * They will fail against the current flat "Management" group sidebar.
 * Bolt's task is to make them pass without modifying this file.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// jsdom polyfill — SidebarProvider uses window.matchMedia via use-mobile hook
// ---------------------------------------------------------------------------

// matchMedia is not implemented in jsdom; set it up once via module-level init
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ---------------------------------------------------------------------------
// Mock next/navigation — usePathname returns a stable value
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

// ---------------------------------------------------------------------------
// Mock @/app/auth/actions — signOut is a server action, not needed in tests
// ---------------------------------------------------------------------------

vi.mock("@/app/auth/actions", () => ({
  signOut: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock lucide-react icons so rendering stays lightweight
// ---------------------------------------------------------------------------

vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>();
  return {
    ...actual,
    LayoutDashboard: () => null,
    Calendar: () => null,
    Award: () => null,
    Users: () => null,
    ShoppingBag: () => null,
    Camera: () => null,
    Trophy: () => null,
    Mail: () => null,
    Settings: () => null,
    LogOut: () => null,
    ExternalLink: () => null,
    Trash2: () => null,
    PanelLeftIcon: () => null,
  };
});

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the SidebarGroup element (div[data-sidebar="group"]) that contains
 * the given group label text. Throws if not found.
 */
function getGroupByLabel(labelText: string): HTMLElement {
  // SidebarGroupLabel renders as a div with data-sidebar="group-label"
  const allGroupLabels = document.querySelectorAll('[data-sidebar="group-label"]');
  for (const labelEl of allGroupLabels) {
    if (labelEl.textContent?.trim() === labelText) {
      // Walk up to the enclosing SidebarGroup (div[data-sidebar="group"])
      const group = labelEl.closest('[data-sidebar="group"]') as HTMLElement | null;
      if (group) return group;
    }
  }
  throw new Error(`Could not find sidebar group with label "${labelText}"`);
}

/**
 * Returns true if a menu item with the given text exists inside the group.
 * Checks both textContent of the item and explicit span text.
 */
function groupContainsItem(groupEl: HTMLElement, itemText: string): boolean {
  const menuItems = groupEl.querySelectorAll('[data-sidebar="menu-item"]');
  for (const item of menuItems) {
    // Check spans (the label is inside a <span> within SidebarMenuButton)
    const spans = item.querySelectorAll("span");
    for (const span of spans) {
      if (span.textContent?.trim() === itemText) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Shared render — each test gets a fresh render via beforeEach
// (testing-library auto-cleanup runs afterEach, so DOM is clean each time)
// ---------------------------------------------------------------------------

beforeEach(() => {
  render(
    <SidebarProvider>
      <AdminSidebar />
    </SidebarProvider>
  );
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AdminSidebar — grouping (#160)", () => {
  it("renders 5 group label headings: Overview, People, Revenue, Event Day, Setup", () => {
    const groupLabels = document.querySelectorAll('[data-sidebar="group-label"]');
    const labelTexts = Array.from(groupLabels).map((el) => el.textContent?.trim());
    expect(labelTexts).toContain("Overview");
    expect(labelTexts).toContain("People");
    expect(labelTexts).toContain("Revenue");
    expect(labelTexts).toContain("Event Day");
    expect(labelTexts).toContain("Setup");
    expect(groupLabels).toHaveLength(5);
  });

  it('"Dashboard" appears under the "Overview" group label', () => {
    const overviewGroup = getGroupByLabel("Overview");
    expect(groupContainsItem(overviewGroup, "Dashboard")).toBe(true);
  });

  it('"Contacts" appears under the "People" group label', () => {
    const peopleGroup = getGroupByLabel("People");
    expect(groupContainsItem(peopleGroup, "Contacts")).toBe(true);
  });

  it('"Registrations" appears under the "People" group label', () => {
    const peopleGroup = getGroupByLabel("People");
    expect(groupContainsItem(peopleGroup, "Registrations")).toBe(true);
  });

  it('"Sponsors" appears under the "Revenue" group label', () => {
    const revenueGroup = getGroupByLabel("Revenue");
    expect(groupContainsItem(revenueGroup, "Sponsors")).toBe(true);
  });

  it('"Sponsorships" appears under the "Revenue" group label', () => {
    const revenueGroup = getGroupByLabel("Revenue");
    expect(groupContainsItem(revenueGroup, "Sponsorships")).toBe(true);
  });

  it('"Photos" appears under the "Event Day" group label', () => {
    const eventDayGroup = getGroupByLabel("Event Day");
    expect(groupContainsItem(eventDayGroup, "Photos")).toBe(true);
  });

  it('"Scores" appears under the "Event Day" group label', () => {
    const eventDayGroup = getGroupByLabel("Event Day");
    expect(groupContainsItem(eventDayGroup, "Scores")).toBe(true);
  });

  it('"Event" appears under the "Setup" group label', () => {
    const setupGroup = getGroupByLabel("Setup");
    expect(groupContainsItem(setupGroup, "Event")).toBe(true);
  });

  it('"Settings" appears under the "Setup" group label', () => {
    const setupGroup = getGroupByLabel("Setup");
    expect(groupContainsItem(setupGroup, "Settings")).toBe(true);
  });

  it('"Trash" appears under the "Setup" group label', () => {
    const setupGroup = getGroupByLabel("Setup");
    expect(groupContainsItem(setupGroup, "Trash")).toBe(true);
  });
});

describe("AdminSidebar — label rename (#162)", () => {
  it('the text "Contacts & Email" does NOT appear anywhere in the rendered sidebar', () => {
    const fullText = document.body.textContent ?? "";
    expect(fullText).not.toContain("Contacts & Email");
  });

  it('"Contacts" appears as a menu item label (not just a group label)', () => {
    // Confirm at least one menu-item span reads exactly "Contacts"
    const menuItems = document.querySelectorAll('[data-sidebar="menu-item"]');
    const found = Array.from(menuItems).some((item) => {
      const spans = item.querySelectorAll("span");
      return Array.from(spans).some((s) => s.textContent?.trim() === "Contacts");
    });
    expect(found).toBe(true);
  });
});

describe("AdminSidebar — legacy group removed (#160)", () => {
  it('the text "Management" does NOT appear anywhere in the rendered sidebar', () => {
    const fullText = document.body.textContent ?? "";
    expect(fullText).not.toContain("Management");
  });
});

describe("AdminSidebar — logo (#157)", () => {
  it("sidebar header renders an image (img or svg) — no plain text CCC Admin fallback", () => {
    // The current implementation renders <span>CCC</span><span>Admin</span>.
    // After the fix, the header must contain an <img alt="CCC"> or an <svg>,
    // and must NOT be purely the text "CCC Admin".

    const header = document.querySelector('[data-sidebar="header"]') as HTMLElement | null;
    expect(header).not.toBeNull();

    const img = header!.querySelector('img[alt="CCC"], img[src*="ccc-logo"]');
    const svg = header!.querySelector("svg");

    // One of these must exist — the logo must be a graphic element, not raw text
    const hasLogoElement = img !== null || svg !== null;
    expect(hasLogoElement).toBe(true);

    // The plain text fallback must be absent. The two sibling spans "CCC" + "Admin"
    // were the pre-logo implementation. After the fix, those spans should not exist
    // as the sole content of the header link.
    const spanTexts = Array.from(header!.querySelectorAll("span")).map(
      (s) => s.textContent?.trim()
    );
    // If no logo element exists AND the spans are exactly ["CCC", "Admin"] → plain text fallback
    // (This assertion only matters if the hasLogoElement assertion above passes — belt-and-suspenders)
    const isPlainTextFallback =
      !hasLogoElement &&
      spanTexts.includes("CCC") &&
      spanTexts.includes("Admin");
    expect(isPlainTextFallback).toBe(false);
  });
});
