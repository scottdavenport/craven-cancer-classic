/**
 * #191 — AdminSidebar responsive logo (RED phase)
 *
 * When the sidebar is expanded, the full logo (`ccc-logo-full.svg`) is shown.
 * When the sidebar is collapsed, the mark variant (`ccc-logo-mark.svg`) is shown.
 *
 * Written BEFORE implementation. These tests MUST fail until Bolt updates
 * admin-sidebar.tsx to consume `useSidebar().state` and switch the Image src.
 * Do not modify this file.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ---------------------------------------------------------------------------
// jsdom polyfill — SidebarProvider uses window.matchMedia via use-mobile hook
// ---------------------------------------------------------------------------

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
// Mock next/image — pass src prop through verbatim so assertions are simple
// ---------------------------------------------------------------------------

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string; width?: number; height?: number; priority?: boolean }) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

// ---------------------------------------------------------------------------
// Mock @/app/auth/actions
// ---------------------------------------------------------------------------

vi.mock("@/app/auth/actions", () => ({
  signOut: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock lucide-react icons (keep render lightweight)
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
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup();
});

describe("AdminSidebar — responsive logo (#191)", () => {
  describe("expanded state (defaultOpen={true})", () => {
    beforeEach(() => {
      render(
        <SidebarProvider defaultOpen={true}>
          <AdminSidebar />
        </SidebarProvider>
      );
    });

    it('shows the full logo (ccc-logo-full.svg) when sidebar is expanded', () => {
      const img = document.querySelector('[data-sidebar="header"] img') as HTMLImageElement | null;
      expect(img).not.toBeNull();
      expect(img!.getAttribute("src")).toMatch(/ccc-logo-full/);
    });

    it('logo has alt="CCC" when expanded', () => {
      const img = document.querySelector('[data-sidebar="header"] img') as HTMLImageElement | null;
      expect(img).not.toBeNull();
      expect(img!.getAttribute("alt")).toBe("CCC");
    });

    it('does NOT show the mark logo (ccc-logo-mark.svg) when expanded', () => {
      const img = document.querySelector('[data-sidebar="header"] img') as HTMLImageElement | null;
      expect(img).not.toBeNull();
      expect(img!.getAttribute("src")).not.toMatch(/ccc-logo-mark/);
    });
  });

  describe("collapsed state (defaultOpen={false})", () => {
    beforeEach(() => {
      render(
        <SidebarProvider defaultOpen={false}>
          <AdminSidebar />
        </SidebarProvider>
      );
    });

    it('shows the mark logo (ccc-logo-mark.svg) when sidebar is collapsed', () => {
      const img = document.querySelector('[data-sidebar="header"] img') as HTMLImageElement | null;
      expect(img).not.toBeNull();
      expect(img!.getAttribute("src")).toMatch(/ccc-logo-mark/);
    });

    it('logo has alt="CCC" when collapsed', () => {
      const img = document.querySelector('[data-sidebar="header"] img') as HTMLImageElement | null;
      expect(img).not.toBeNull();
      expect(img!.getAttribute("alt")).toBe("CCC");
    });

    it('does NOT show the full logo (ccc-logo-full.svg) when collapsed', () => {
      const img = document.querySelector('[data-sidebar="header"] img') as HTMLImageElement | null;
      expect(img).not.toBeNull();
      expect(img!.getAttribute("src")).not.toMatch(/ccc-logo-full/);
    });
  });
});
