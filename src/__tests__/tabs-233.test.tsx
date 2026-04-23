/**
 * Sprint 21 · Issue #233 — Tabs primitive — RED tests
 *
 * Tests for the base-ui Tabs wrapper. The stub has basic state management but
 * keyboard navigation and proper aria-selected wiring are RED until Bolt ships
 * the real @base-ui/react/tabs implementation.
 *
 * Contract:
 *   - TabsList renders with role="tablist"
 *   - TabsTrigger renders with role="tab"
 *   - aria-selected="true" on active tab, "false" on others
 *   - Clicking a tab makes it active
 *   - Keyboard: ArrowRight/ArrowLeft navigate between tabs
 *   - TabsPanel renders with role="tabpanel" and hides inactive panels
 *   - Optional count prop on TabsTrigger renders a count pill
 *   - Count pill styling: active=bg-primary/10 text-primary, inactive=bg-neutral-100 text-muted-foreground
 *   - data-slot attributes for CSS targeting
 */

import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Tabs, TabsList, TabsTrigger, TabsPanel } from "@/components/ui/tabs";

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Basic rendering
// ---------------------------------------------------------------------------

describe("Tabs — basic rendering", () => {
  it("renders tablist", () => {
    render(
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("renders tab triggers with role='tab'", () => {
    render(
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
  });

  it("renders all tab labels", () => {
    render(
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    expect(screen.getByRole("tab", { name: /Contacts/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Teams/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Sponsors/i })).toBeInTheDocument();
  });

  it("renders data-slot='tabs' on root", () => {
    const { container } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    expect(container.querySelector("[data-slot='tabs']")).not.toBeNull();
  });

  it("renders data-slot='tabs-list' on TabsList", () => {
    const { container } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    expect(container.querySelector("[data-slot='tabs-list']")).not.toBeNull();
  });

  it("renders data-slot='tabs-trigger' on TabsTrigger", () => {
    const { container } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    expect(container.querySelector("[data-slot='tabs-trigger']")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// aria-selected — active tab
// ---------------------------------------------------------------------------

describe("Tabs — aria-selected (RED until base-ui)", () => {
  it("active tab (defaultValue) has aria-selected='true'", () => {
    render(
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    const contactsTab = screen.getByRole("tab", { name: /Contacts/i });
    expect(contactsTab.getAttribute("aria-selected")).toBe("true");
  });

  it("inactive tabs have aria-selected='false'", () => {
    render(
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    const teamsTab = screen.getByRole("tab", { name: /Teams/i });
    expect(teamsTab.getAttribute("aria-selected")).toBe("false");
  });

  it("aria-selected updates when a different tab is clicked", () => {
    render(
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    const contactsTab = screen.getByRole("tab", { name: /Contacts/i });
    const teamsTab = screen.getByRole("tab", { name: /Teams/i });

    fireEvent.click(teamsTab);

    expect(teamsTab.getAttribute("aria-selected")).toBe("true");
    expect(contactsTab.getAttribute("aria-selected")).toBe("false");
  });
});

// ---------------------------------------------------------------------------
// Tab panels
// ---------------------------------------------------------------------------

describe("Tabs — TabsPanel", () => {
  it("active panel is visible (renders children)", () => {
    render(
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>
        <TabsPanel value="contacts">Contacts content</TabsPanel>
        <TabsPanel value="teams">Teams content</TabsPanel>
      </Tabs>
    );
    expect(screen.getByText("Contacts content")).toBeInTheDocument();
  });

  it("inactive panel is not rendered", () => {
    render(
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>
        <TabsPanel value="contacts">Contacts content</TabsPanel>
        <TabsPanel value="teams">Teams content</TabsPanel>
      </Tabs>
    );
    expect(screen.queryByText("Teams content")).toBeNull();
  });

  it("clicking a tab shows its panel and hides others", () => {
    render(
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>
        <TabsPanel value="contacts">Contacts content</TabsPanel>
        <TabsPanel value="teams">Teams content</TabsPanel>
      </Tabs>
    );
    fireEvent.click(screen.getByRole("tab", { name: /Teams/i }));
    expect(screen.getByText("Teams content")).toBeInTheDocument();
    expect(screen.queryByText("Contacts content")).toBeNull();
  });

  it("active panel has role='tabpanel'", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsPanel value="a">Panel A</TabsPanel>
      </Tabs>
    );
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("renders data-slot='tabs-panel' on TabsPanel", () => {
    const { container } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsPanel value="a">Panel A</TabsPanel>
      </Tabs>
    );
    expect(container.querySelector("[data-slot='tabs-panel']")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Count pill
// ---------------------------------------------------------------------------

describe("Tabs — count pill", () => {
  it("renders count pill when count prop is provided", () => {
    render(
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts" count={3}>Contacts</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("does NOT render count pill when count prop is omitted", () => {
    render(
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    // No numeric text node from the pill
    expect(screen.queryByText(/^\d+$/)).toBeNull();
  });

  it("count=0 renders '0' pill", () => {
    render(
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts" count={0}>Contacts</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("active tab count pill applies bg-primary/10 class (RED until GREEN)", () => {
    const { container } = render(
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts" count={5}>Contacts</TabsTrigger>
          <TabsTrigger value="teams" count={2}>Teams</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    const pills = container.querySelectorAll("[data-slot='tabs-count']");
    const activePill = Array.from(pills).find(
      (el) => el.textContent === "5"
    );
    expect(activePill!.className).toContain("bg-primary/10");
    expect(activePill!.className).toContain("text-primary");
  });

  it("inactive tab count pill applies bg-neutral-100 class (RED until GREEN)", () => {
    const { container } = render(
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts" count={5}>Contacts</TabsTrigger>
          <TabsTrigger value="teams" count={2}>Teams</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    const pills = container.querySelectorAll("[data-slot='tabs-count']");
    const inactivePill = Array.from(pills).find(
      (el) => el.textContent === "2"
    );
    expect(inactivePill!.className).toContain("bg-neutral-100");
    expect(inactivePill!.className).toContain("text-muted-foreground");
  });

  it("count pill switches styling when tab becomes active", () => {
    const { container } = render(
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts" count={5}>Contacts</TabsTrigger>
          <TabsTrigger value="teams" count={2}>Teams</TabsTrigger>
        </TabsList>
      </Tabs>
    );

    // Click teams to make it active
    fireEvent.click(screen.getByRole("tab", { name: /Teams/i }));

    const pills = container.querySelectorAll("[data-slot='tabs-count']");
    const teamsPill = Array.from(pills).find((el) => el.textContent === "2");
    expect(teamsPill!.className).toContain("bg-primary/10");
    expect(teamsPill!.className).toContain("text-primary");
  });
});

// ---------------------------------------------------------------------------
// Keyboard navigation (RED until base-ui — stub has no keyboard handling)
// ---------------------------------------------------------------------------

describe("Tabs — keyboard navigation (RED until GREEN with base-ui)", () => {
  it("ArrowRight moves focus to next tab", () => {
    render(
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    const contactsTab = screen.getByRole("tab", { name: /Contacts/i });
    const teamsTab = screen.getByRole("tab", { name: /Teams/i });

    contactsTab.focus();
    fireEvent.keyDown(contactsTab, { key: "ArrowRight", code: "ArrowRight" });

    expect(document.activeElement).toBe(teamsTab);
  });

  it("ArrowLeft moves focus to previous tab", () => {
    render(
      <Tabs defaultValue="teams">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    const contactsTab = screen.getByRole("tab", { name: /Contacts/i });
    const teamsTab = screen.getByRole("tab", { name: /Teams/i });

    teamsTab.focus();
    fireEvent.keyDown(teamsTab, { key: "ArrowLeft", code: "ArrowLeft" });

    expect(document.activeElement).toBe(contactsTab);
  });
});

// ---------------------------------------------------------------------------
// Call site adoption — hygiene (source grep — RED until GREEN)
// ---------------------------------------------------------------------------

describe("Tabs — call site hygiene (RED until GREEN)", () => {
  it("trash-tabs.tsx uses Tabs primitive (no bespoke button tab bar)", () => {
    const { execSync } = require("child_process");
    const { resolve } = require("path");
    const repoRoot = resolve(__dirname, "../../");
    const result = execSync(
      'grep -c "from.*components/ui/tabs" src/app/admin/trash/trash-tabs.tsx || echo "0"',
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();
    expect(parseInt(result)).toBeGreaterThan(0);
  });

  it("photo-moderation.tsx uses Tabs primitive (no bespoke button tab bar)", () => {
    const { execSync } = require("child_process");
    const { resolve } = require("path");
    const repoRoot = resolve(__dirname, "../../");
    const result = execSync(
      'grep -c "from.*components/ui/tabs" src/app/admin/photos/photo-moderation.tsx || echo "0"',
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();
    expect(parseInt(result)).toBeGreaterThan(0);
  });
});
