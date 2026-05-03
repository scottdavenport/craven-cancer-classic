/**
 * Sprint α — Checkbox primitive visual + behavior tests
 * Closes UAT findings F17 · F18 · W2.12
 *
 * Co-located at src/components/ui/checkbox.test.tsx
 * Runner: Vitest + @testing-library/react
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Checkbox } from "./checkbox";

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("Checkbox — rendering", () => {
  it("renders a checkable control with role='checkbox'", () => {
    render(<Checkbox aria-label="test" />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("renders with data-slot='checkbox'", () => {
    const { container } = render(<Checkbox aria-label="test" />);
    const el = container.querySelector("[data-slot='checkbox']");
    expect(el).not.toBeNull();
  });

  it("passes through className prop to the root element", () => {
    const { container } = render(<Checkbox aria-label="test" className="extra-class" />);
    const el = container.querySelector("[data-slot='checkbox']");
    expect(el!.className).toContain("extra-class");
  });

  it("associates with an external label via id/htmlFor", () => {
    render(
      <>
        <label htmlFor="my-cb">Select all</label>
        <Checkbox id="my-cb" />
      </>
    );
    expect(screen.getByLabelText("Select all")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Unchecked visual state
// ---------------------------------------------------------------------------

describe("Checkbox — unchecked visual state", () => {
  it("unchecked checkbox has bg-background class", () => {
    const { container } = render(<Checkbox aria-label="test" checked={false} onCheckedChange={() => {}} />);
    const el = container.querySelector("[data-slot='checkbox']");
    expect(el!.className).toContain("bg-background");
  });

  it("unchecked checkbox has border-border class", () => {
    const { container } = render(<Checkbox aria-label="test" checked={false} onCheckedChange={() => {}} />);
    const el = container.querySelector("[data-slot='checkbox']");
    expect(el!.className).toContain("border-border");
  });

  it("unchecked checkbox does NOT render a Check icon", () => {
    const { container } = render(<Checkbox aria-label="test" checked={false} onCheckedChange={() => {}} />);
    const icon = container.querySelector("svg.lucide-check");
    expect(icon).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Checked visual state
// ---------------------------------------------------------------------------

describe("Checkbox — checked visual state", () => {
  it("checked checkbox has bg-brand class", () => {
    const { container } = render(<Checkbox aria-label="test" checked onCheckedChange={() => {}} />);
    const el = container.querySelector("[data-slot='checkbox']");
    expect(el!.className).toContain("bg-brand");
  });

  it("checked checkbox has border-brand class", () => {
    const { container } = render(<Checkbox aria-label="test" checked onCheckedChange={() => {}} />);
    const el = container.querySelector("[data-slot='checkbox']");
    expect(el!.className).toContain("border-brand");
  });

  it("checked checkbox renders a Check icon (lucide lucide-check class)", () => {
    const { container } = render(<Checkbox aria-label="test" checked onCheckedChange={() => {}} />);
    const icon = container.querySelector("svg.lucide-check");
    expect(icon).not.toBeNull();
  });

  it("checked checkbox icon has text-white class", () => {
    const { container } = render(<Checkbox aria-label="test" checked onCheckedChange={() => {}} />);
    const icon = container.querySelector("svg.lucide-check");
    expect(icon!.getAttribute("class")).toContain("text-white");
  });
});

// ---------------------------------------------------------------------------
// Indeterminate visual state
// ---------------------------------------------------------------------------

describe("Checkbox — indeterminate visual state", () => {
  it("indeterminate checkbox has bg-brand class", () => {
    const { container } = render(<Checkbox aria-label="test" indeterminate onCheckedChange={() => {}} />);
    const el = container.querySelector("[data-slot='checkbox']");
    expect(el!.className).toContain("bg-brand");
  });

  it("indeterminate checkbox renders a Minus icon (lucide lucide-minus class)", () => {
    const { container } = render(<Checkbox aria-label="test" indeterminate onCheckedChange={() => {}} />);
    const icon = container.querySelector("svg.lucide-minus");
    expect(icon).not.toBeNull();
  });

  it("indeterminate checkbox has aria-checked='mixed'", () => {
    render(<Checkbox aria-label="test" indeterminate onCheckedChange={() => {}} />);
    const cb = screen.getByRole("checkbox");
    expect(cb.getAttribute("aria-checked")).toBe("mixed");
  });

  it("indeterminate checkbox does NOT render a Check icon", () => {
    const { container } = render(<Checkbox aria-label="test" indeterminate onCheckedChange={() => {}} />);
    const icon = container.querySelector("svg.lucide-check");
    expect(icon).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// aria-checked
// ---------------------------------------------------------------------------

describe("Checkbox — aria-checked", () => {
  it("unchecked checkbox has aria-checked='false'", () => {
    render(<Checkbox aria-label="test" checked={false} onCheckedChange={() => {}} />);
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("false");
  });

  it("checked checkbox has aria-checked='true'", () => {
    render(<Checkbox aria-label="test" checked onCheckedChange={() => {}} />);
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("true");
  });

  it("indeterminate checkbox has aria-checked='mixed'", () => {
    render(<Checkbox aria-label="test" indeterminate onCheckedChange={() => {}} />);
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("mixed");
  });
});

// ---------------------------------------------------------------------------
// Focus ring
// ---------------------------------------------------------------------------

describe("Checkbox — focus ring", () => {
  it("checkbox root has focus-visible:ring-2 class", () => {
    const { container } = render(<Checkbox aria-label="test" />);
    const el = container.querySelector("[data-slot='checkbox']");
    expect(el!.className).toContain("focus-visible:ring-2");
  });

  it("checkbox root has focus-visible:ring-brand class", () => {
    const { container } = render(<Checkbox aria-label="test" />);
    const el = container.querySelector("[data-slot='checkbox']");
    expect(el!.className).toContain("focus-visible:ring-brand");
  });

  it("checkbox root has focus-visible:ring-offset-2 class", () => {
    const { container } = render(<Checkbox aria-label="test" />);
    const el = container.querySelector("[data-slot='checkbox']");
    expect(el!.className).toContain("focus-visible:ring-offset-2");
  });
});

// ---------------------------------------------------------------------------
// Callback + controlled
// ---------------------------------------------------------------------------

describe("Checkbox — callback and controlled", () => {
  it("onCheckedChange(true) fires when unchecked checkbox is clicked", () => {
    const handler = vi.fn();
    render(<Checkbox aria-label="test" checked={false} onCheckedChange={handler} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(handler).toHaveBeenCalledWith(true);
  });

  it("onCheckedChange(false) fires when checked checkbox is clicked", () => {
    const handler = vi.fn();
    render(<Checkbox aria-label="test" checked onCheckedChange={handler} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(handler).toHaveBeenCalledWith(false);
  });

  it("onCheckedChange does NOT fire when indeterminate checkbox is disabled and clicked", () => {
    const handler = vi.fn();
    render(<Checkbox aria-label="test" indeterminate disabled onCheckedChange={handler} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("controlled checkbox reflects checked=true", () => {
    render(<Checkbox aria-label="test" checked onCheckedChange={() => {}} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("controlled checkbox reflects checked=false", () => {
    render(<Checkbox aria-label="test" checked={false} onCheckedChange={() => {}} />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
});

// ---------------------------------------------------------------------------
// Disabled
// ---------------------------------------------------------------------------

describe("Checkbox — disabled", () => {
  it("disabled checkbox has aria-disabled='true'", () => {
    render(<Checkbox aria-label="test" disabled />);
    expect(screen.getByRole("checkbox").getAttribute("aria-disabled")).toBe("true");
  });

  it("disabled checkbox has opacity-50 class", () => {
    const { container } = render(<Checkbox aria-label="test" disabled />);
    const el = container.querySelector("[data-slot='checkbox']");
    expect(el!.className).toContain("opacity-50");
  });

  it("disabled checkbox has cursor-not-allowed class", () => {
    const { container } = render(<Checkbox aria-label="test" disabled />);
    const el = container.querySelector("[data-slot='checkbox']");
    expect(el!.className).toContain("cursor-not-allowed");
  });

  it("onCheckedChange does NOT fire when disabled checkbox is clicked", () => {
    const handler = vi.fn();
    render(<Checkbox aria-label="test" disabled checked={false} onCheckedChange={handler} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(handler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Uncontrolled
// ---------------------------------------------------------------------------

describe("Checkbox — uncontrolled", () => {
  it("renders unchecked by default when no defaultChecked prop", () => {
    render(<Checkbox aria-label="test" />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("renders checked when defaultChecked=true", () => {
    render(<Checkbox aria-label="test" defaultChecked />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("toggles to checked on click (uncontrolled)", () => {
    render(<Checkbox aria-label="test" />);
    const cb = screen.getByRole("checkbox");
    expect(cb).not.toBeChecked();
    fireEvent.click(cb);
    expect(cb).toBeChecked();
  });
});
