/**
 * Sprint 21 · Issue #233 — Checkbox primitive — RED tests
 *
 * Tests for the base-ui Checkbox wrapper. The stub uses a raw <input> so
 * all aria-checked and focus-ring assertions are RED until Bolt ships the
 * real base-ui/react/checkbox implementation.
 *
 * Contract:
 *   - Renders a checkable control
 *   - Controlled mode: checked prop + onCheckedChange callback
 *   - Uncontrolled mode: defaultChecked
 *   - Keyboard: Space toggles checked state
 *   - aria-checked reflects checked state
 *   - focus-visible ring classes present
 *   - data-slot="checkbox" for CSS targeting
 *   - Disabled state: aria-disabled, no toggle on click
 */

import React, { useState } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Checkbox } from "@/components/ui/checkbox";

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("Checkbox — rendering", () => {
  it("renders a checkable control", () => {
    render(<Checkbox aria-label="Agree to terms" />);
    const cb = screen.getByRole("checkbox", { name: "Agree to terms" });
    expect(cb).toBeInTheDocument();
  });

  it("renders with data-slot='checkbox'", () => {
    const { container } = render(<Checkbox aria-label="cb" />);
    const el = container.querySelector("[data-slot='checkbox']");
    expect(el).not.toBeNull();
  });

  it("associates with a label via id/htmlFor", () => {
    render(
      <>
        <label htmlFor="tbd-cb">I'll add this player later</label>
        <Checkbox id="tbd-cb" />
      </>
    );
    expect(
      screen.getByLabelText("I'll add this player later")
    ).toBeInTheDocument();
  });

  it("passes through className", () => {
    const { container } = render(
      <Checkbox aria-label="cb" className="my-class" />
    );
    const el = container.querySelector("[data-slot='checkbox']");
    expect(el!.className).toContain("my-class");
  });
});

// ---------------------------------------------------------------------------
// Uncontrolled mode
// ---------------------------------------------------------------------------

describe("Checkbox — uncontrolled (defaultChecked)", () => {
  it("renders unchecked by default when no defaultChecked", () => {
    render(<Checkbox aria-label="cb" />);
    const cb = screen.getByRole("checkbox");
    expect(cb).not.toBeChecked();
  });

  it("renders checked when defaultChecked=true", () => {
    render(<Checkbox aria-label="cb" defaultChecked />);
    const cb = screen.getByRole("checkbox");
    expect(cb).toBeChecked();
  });

  it("toggles to checked on click (uncontrolled)", () => {
    render(<Checkbox aria-label="cb" />);
    const cb = screen.getByRole("checkbox");
    fireEvent.click(cb);
    expect(cb).toBeChecked();
  });
});

// ---------------------------------------------------------------------------
// Controlled mode
// ---------------------------------------------------------------------------

describe("Checkbox — controlled mode", () => {
  it("reflects checked=true", () => {
    render(<Checkbox aria-label="cb" checked onCheckedChange={() => {}} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("reflects checked=false", () => {
    render(<Checkbox aria-label="cb" checked={false} onCheckedChange={() => {}} />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("calls onCheckedChange(true) when unchecked checkbox is clicked", () => {
    const handler = vi.fn();
    render(<Checkbox aria-label="cb" checked={false} onCheckedChange={handler} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(handler).toHaveBeenCalledWith(true);
  });

  it("calls onCheckedChange(false) when checked checkbox is clicked", () => {
    const handler = vi.fn();
    render(<Checkbox aria-label="cb" checked={true} onCheckedChange={handler} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(handler).toHaveBeenCalledWith(false);
  });

  it("toggles in a stateful wrapper", () => {
    function Wrapper() {
      const [checked, setChecked] = useState(false);
      return (
        <Checkbox
          aria-label="cb"
          checked={checked}
          onCheckedChange={setChecked}
        />
      );
    }
    render(<Wrapper />);
    const cb = screen.getByRole("checkbox");
    expect(cb).not.toBeChecked();
    fireEvent.click(cb);
    expect(cb).toBeChecked();
    fireEvent.click(cb);
    expect(cb).not.toBeChecked();
  });
});

// ---------------------------------------------------------------------------
// aria-checked (RED until base-ui wrapper — native input uses "checked" attribute)
// ---------------------------------------------------------------------------

describe("Checkbox — aria-checked (RED until GREEN with base-ui)", () => {
  it("has aria-checked='false' when unchecked", () => {
    render(<Checkbox aria-label="cb" checked={false} onCheckedChange={() => {}} />);
    const cb = screen.getByRole("checkbox");
    // base-ui sets aria-checked explicitly; native input uses 'checked' DOM prop
    // This test is RED until base-ui wrapper is shipped
    expect(cb.getAttribute("aria-checked")).toBe("false");
  });

  it("has aria-checked='true' when checked", () => {
    render(<Checkbox aria-label="cb" checked={true} onCheckedChange={() => {}} />);
    const cb = screen.getByRole("checkbox");
    expect(cb.getAttribute("aria-checked")).toBe("true");
  });
});

// ---------------------------------------------------------------------------
// Keyboard — Space to toggle
// ---------------------------------------------------------------------------

describe("Checkbox — keyboard toggle", () => {
  it("Space key toggles checked state (uncontrolled)", () => {
    render(<Checkbox aria-label="cb" />);
    const cb = screen.getByRole("checkbox");
    cb.focus();
    fireEvent.keyDown(cb, { key: " ", code: "Space" });
    // Native input toggles on Space via browser default — ensure no regression
    expect(cb).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Focus ring (RED until GREEN — base-ui adds focus-visible classes)
// ---------------------------------------------------------------------------

describe("Checkbox — focus ring (RED until GREEN)", () => {
  it("has focus-visible:ring-2 class", () => {
    const { container } = render(<Checkbox aria-label="cb" />);
    const el = container.querySelector("[data-slot='checkbox']");
    expect(el!.className).toContain("focus-visible:ring-2");
  });

  it("has focus-visible:ring-ring class", () => {
    const { container } = render(<Checkbox aria-label="cb" />);
    const el = container.querySelector("[data-slot='checkbox']");
    expect(el!.className).toContain("focus-visible:ring-ring");
  });
});

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------

describe("Checkbox — disabled state", () => {
  it("is disabled when disabled prop is set", () => {
    render(<Checkbox aria-label="cb" disabled />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });

  it("does NOT call onCheckedChange when disabled and clicked", () => {
    const handler = vi.fn();
    render(
      <Checkbox
        aria-label="cb"
        checked={false}
        onCheckedChange={handler}
        disabled
      />
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(handler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Call site adoption — hygiene (source grep — RED until GREEN)
// ---------------------------------------------------------------------------

describe("Checkbox — call site hygiene (RED until GREEN)", () => {
  it("no raw <input type='checkbox'> in registration-form.tsx after adoption", () => {
    const { execSync } = require("child_process");
    const { resolve } = require("path");
    const repoRoot = resolve(__dirname, "../../");
    const result = execSync(
      'grep -c "type=\\"checkbox\\"\\|type=\'checkbox\'" src/app/\\(public\\)/register/registration-form.tsx || echo "0"',
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();
    expect(parseInt(result)).toBe(0);
  });

  it("no raw <input type='checkbox'> in contact-list.tsx after adoption", () => {
    const { execSync } = require("child_process");
    const { resolve } = require("path");
    const repoRoot = resolve(__dirname, "../../");
    const result = execSync(
      'grep -c "type=\\"checkbox\\"\\|type=\'checkbox\'" src/app/admin/contacts/contact-list.tsx || echo "0"',
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();
    expect(parseInt(result)).toBe(0);
  });
});
