// RED: CardTitle size="sm" variant + InviteForm integration — #236
// Fails until Bolt:
//   1. Adds size?: "default" | "sm" prop to CardTitle (card.tsx)
//   2. invite-form.tsx uses <CardTitle size="sm"> instead of raw className override
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardTitle } from "@/components/ui/card";
import { InviteForm } from "@/app/admin/settings/invite-form";

// Mock fetch for InviteForm (it calls /api/invite)
global.fetch = vi.fn().mockResolvedValue(
  new Response(JSON.stringify({ success: true }), { status: 200 })
);

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Issue 5 — CardTitle size="sm" variant
// ---------------------------------------------------------------------------

describe("CardTitle — size prop", () => {
  it('size="default" renders with full display type scale (text-[1.25rem] or equivalent)', () => {
    const { container } = render(<CardTitle>Default Title</CardTitle>);
    const el = container.querySelector("[data-slot='card-title']");
    expect(el).toBeInTheDocument();
    // Default size should NOT apply font-sans override
    // The design token is font-display at 1.25rem
    expect(el!.className).not.toContain("font-sans");
  });

  it('size="sm" renders with smaller type scale (font-sans text-base font-semibold)', () => {
    // Simulate what card title looks like inside a size="sm" card context
    // OR when CardTitle itself accepts size="sm"
    // After Bolt's change: <CardTitle size="sm"> should apply the compact style
    // Cast required until Bolt adds the size prop to the CardTitle component type
    const { container } = render(
      <CardTitle {...({ size: "sm" } as Record<string, unknown>)}>Invite Admin</CardTitle>
    );
    const el = container.querySelector("[data-slot='card-title']");
    expect(el).toBeInTheDocument();
    // size="sm" must apply the compact style classes
    expect(el!.className).toContain("font-sans");
    expect(el!.className).toContain("text-base");
    expect(el!.className).toContain("font-semibold");
  });

  it('size="sm" does not render the display font scale (no font-display at large size)', () => {
    const { container } = render(
      <CardTitle {...({ size: "sm" } as Record<string, unknown>)}>Small Title</CardTitle>
    );
    const el = container.querySelector("[data-slot='card-title']");
    // Should not have the 1.25rem class that default uses
    expect(el!.className).not.toContain("text-[1.25rem]");
  });
});

// ---------------------------------------------------------------------------
// Issue 5 — InviteForm integration: no raw className override on CardTitle
// ---------------------------------------------------------------------------

describe("InviteForm — CardTitle uses size='sm' variant", () => {
  it("renders the 'Invite Admin' section header", () => {
    render(<InviteForm />);
    expect(screen.getByText("Invite Admin")).toBeInTheDocument();
  });

  it("CardTitle for 'Invite Admin' does NOT have raw className override (font-sans text-base font-semibold inline)", () => {
    const { container } = render(<InviteForm />);
    const cardTitle = container.querySelector("[data-slot='card-title']");
    expect(cardTitle).toBeInTheDocument();

    // The className must NOT contain the three raw override tokens concatenated together
    // If Bolt correctly uses size="sm", the classes come from the component token, not
    // from a raw className prop. We detect the old anti-pattern by checking that the
    // className was not directly set with all three in sequence on the element.
    // The old pattern: className="font-sans text-base font-semibold"
    // After fix: size="sm" applies via component internals, NO className prop on CardTitle usage
    const rawOverridePattern = /font-sans.*text-base.*font-semibold|text-base.*font-semibold.*font-sans/;

    // We can't inspect JSX props directly, but we can check the rendered className
    // doesn't look like a one-off manual concatenation by verifying the size attr
    expect(cardTitle!.getAttribute("data-size")).toBe("sm");
  });

  it("CardTitle has data-size='sm' attribute (set by CardTitle component when size='sm' prop)", () => {
    // After Bolt adds size="sm" to CardTitle in invite-form and card.tsx adds data-size on the element,
    // the rendered element must carry data-size="sm".
    const { container } = render(<InviteForm />);
    const cardTitle = container.querySelector("[data-slot='card-title']");
    expect(cardTitle).toBeInTheDocument();
    expect(cardTitle!.getAttribute("data-size")).toBe("sm");
  });
});
