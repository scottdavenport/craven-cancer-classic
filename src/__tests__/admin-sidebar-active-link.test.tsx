/**
 * #171 — AdminSidebar active-link logic coverage
 *
 * S11-1 fixed active detection:
 *   pathname === item.href || pathname.startsWith(item.href + "/")
 *
 * Tests verify exact match, subroute match, and the original bug where
 * "/admin/sponsorships".startsWith("/admin/sponsors/") would have been
 * false but "/admin/sponsorships".startsWith("/admin/sponsors") was true —
 * confirming the fix prevents that false-positive.
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// jsdom polyfill — SidebarProvider uses window.matchMedia via use-mobile hook
// ---------------------------------------------------------------------------

beforeAll(() => {
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
});

// ---------------------------------------------------------------------------
// Mock next/navigation — usePathname returns a configurable value
// ---------------------------------------------------------------------------

const mockUsePathname = vi.fn<() => string>();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
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
  };
});

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

// ---------------------------------------------------------------------------
// Helper — find a sidebar link element by its label text
// ---------------------------------------------------------------------------

function getLinkEl(label: string): HTMLElement {
  // Use exact string to avoid "Sponsors" matching "Sponsorships"
  return screen.getByRole("link", { name: label });
}

/**
 * Returns the SidebarMenuButton element wrapping the link.
 * The button is the element that gets data-active set by the component.
 * The link itself is rendered as the `render` prop child.
 * In this sidebar the Link renders as an <a> inside the button.
 */
function getButtonForLabel(label: string): HTMLElement {
  const link = getLinkEl(label);
  // Walk up to the button ancestor
  const button = link.closest("[data-sidebar='menu-button']") as HTMLElement;
  if (!button) throw new Error(`Could not find menu-button ancestor for "${label}"`);
  return button;
}

function isActive(label: string): boolean {
  const btn = getButtonForLabel(label);
  // SidebarMenuButton sets data-active="" (empty string) when isActive=true,
  // and omits the attribute entirely when isActive=false.
  return btn.hasAttribute("data-active") && btn.getAttribute("data-active") !== "false";
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AdminSidebar — active link detection", () => {
  it("exact match: /admin/teams marks Registrations active, others inactive", () => {
    mockUsePathname.mockReturnValue("/admin/teams");
    render(<SidebarProvider><AdminSidebar /></SidebarProvider>);

    expect(isActive("Registrations")).toBe(true);
    expect(isActive("Dashboard")).toBe(false);
    expect(isActive("Sponsors")).toBe(false);
    expect(isActive("Sponsorships")).toBe(false);
  });

  it("subroute: /admin/teams/abc-123 marks Registrations active", () => {
    mockUsePathname.mockReturnValue("/admin/teams/abc-123");
    render(<SidebarProvider><AdminSidebar /></SidebarProvider>);

    expect(isActive("Registrations")).toBe(true);
    expect(isActive("Dashboard")).toBe(false);
  });

  it("prefix collision fix: /admin/sponsorships marks Sponsorships active, NOT Sponsors", () => {
    // Original bug: startsWith('/admin/sponsors') was true for '/admin/sponsorships'
    // Fix: startsWith('/admin/sponsors/') is false for '/admin/sponsorships'
    mockUsePathname.mockReturnValue("/admin/sponsorships");
    render(<SidebarProvider><AdminSidebar /></SidebarProvider>);

    expect(isActive("Sponsorships")).toBe(true);
    expect(isActive("Sponsors")).toBe(false);
  });

  it("/admin marks Dashboard active, no subroute items active", () => {
    mockUsePathname.mockReturnValue("/admin");
    render(<SidebarProvider><AdminSidebar /></SidebarProvider>);

    expect(isActive("Dashboard")).toBe(true);
    expect(isActive("Registrations")).toBe(false);
    expect(isActive("Sponsorships")).toBe(false);
    expect(isActive("Sponsors")).toBe(false);
  });
});
