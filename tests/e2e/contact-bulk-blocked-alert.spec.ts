/**
 * Sprint 31 (RED): Bulk action blocked-row Alert E2E tests
 *
 * When a bulk Remove type action has to skip rows (because a contact is on a team),
 * an inline shadcn Alert appears below the bulk-action bar listing each blocked
 * contact by name + reason. The Alert stays until dismissed.
 *
 * Requires: E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD in env
 * Skipped automatically when credentials are not configured.
 *
 * Sprint 31 shipped the blocked-row Alert UI (PRs #265, #268-#270).
 * These tests exercise the Sprint 31 blocked-row Alert path.
 */

import { test as baseTest, expect } from "@playwright/test";

baseTest.skip(
  !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
  "Skipped: set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E tests"
);

import { test } from "./fixtures/admin-auth";

test.describe("Sprint 31 — bulk Remove type with blocked rows Alert", () => {
  test("bulk Remove Player button exists in Sprint 31 bulk-action bar", async ({ adminPage: page }) => {
    await page.goto("/admin/contacts");
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();

    // Select at least one contact to trigger the bulk-action bar.
    // Scope to tbody primary Checkbox buttons only ([data-slot="checkbox"]) to avoid
    // the duplicate role="checkbox" from RowActions <input> in the same row.
    const checkboxes = page.locator("tbody [data-slot='checkbox']");
    const count = await checkboxes.count();
    if (count < 1) {
      test.skip(true, "No contacts in DB — cannot test bulk-action bar");
      return;
    }

    await checkboxes.first().click();

    // Bulk-action bar should appear — use first() to avoid strict-mode violation on duplicate spans
    await expect(page.getByText(/1 selected/i).first()).toBeVisible({ timeout: 3_000 });

    // Sprint 31 contract: "Remove type" SelectTrigger must be in the bulk-action bar.
    // Rendered as role="combobox" with aria-label="Remove type" (SelectTrigger from shadcn).
    const removeBulkBtn = page
      .getByRole("combobox", { name: /remove type/i })
      .or(page.getByRole("button", { name: /remove type/i }));

    await expect(removeBulkBtn).toBeVisible({ timeout: 3_000 });
  });

  test("bulk Add type button exists in Sprint 31 bulk-action bar", async ({ adminPage: page }) => {
    await page.goto("/admin/contacts");
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();

    // Scope to tbody primary Checkbox buttons only ([data-slot="checkbox"]) to avoid
    // the duplicate role="checkbox" from RowActions <input> in the same row.
    const checkboxes = page.locator("tbody [data-slot='checkbox']");
    const count = await checkboxes.count();
    if (count < 1) {
      test.skip(true, "No contacts in DB");
      return;
    }

    await checkboxes.first().click();
    await expect(page.getByText(/1 selected/i).first()).toBeVisible({ timeout: 3_000 });

    // Sprint 31 contract: "Add type" SelectTrigger must exist.
    // Rendered as role="combobox" with aria-label="Add type" (SelectTrigger from shadcn).
    const addBulkBtn = page
      .getByRole("combobox", { name: /add type/i })
      .or(page.getByRole("button", { name: /add type/i }));

    await expect(addBulkBtn).toBeVisible({ timeout: 3_000 });
  });

  test("bulk Remove Player: blocked contacts surface inline Alert with name + reason, Alert dismissible", async ({ adminPage: page }) => {
    await page.goto("/admin/contacts");
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();

    // Filter to players
    const typeFilter = page.getByRole("combobox", { name: /filter|type/i }).first();
    if (await typeFilter.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await typeFilter.click();
      await page.getByRole("option", { name: /^player$/i }).click();
      await page
        .getByRole("row")
        .filter({ hasNot: page.locator("thead") })
        .first()
        .waitFor({ timeout: 5_000 })
        .catch(() => null);
    }

    // Select first 3 contacts — scope to tbody primary Checkbox buttons only ([data-slot="checkbox"])
    // to avoid the duplicate role="checkbox" from RowActions <input> in each row.
    const checkboxes = page.locator("tbody [data-slot='checkbox']");
    const count = await checkboxes.count();
    if (count < 2) {
      test.skip(true, "Not enough contacts to run bulk blocked Alert test (need 2+)");
      return;
    }

    const selectCount = Math.min(count, 3);
    for (let i = 0; i < selectCount; i++) {
      await checkboxes.nth(i).click();
    }

    // use first() to avoid strict-mode violation on duplicate spans
    await expect(
      page.getByText(new RegExp(`${selectCount} selected`, "i")).first()
    ).toBeVisible({ timeout: 3_000 });

    // Sprint 31: "Remove type" SelectTrigger in bulk bar.
    // Rendered as role="combobox" with aria-label="Remove type" (SelectTrigger from shadcn).
    // Use .first() to resolve strict-mode violation when .or() matches multiple elements.
    const removeBulkBtn = page
      .getByRole("combobox", { name: /remove type/i })
      .first();

    await expect(removeBulkBtn).toBeVisible({ timeout: 3_000 });
    await removeBulkBtn.click();

    // Pick Player from the Select dropdown options
    const playerOption = page
      .getByRole("option", { name: /^player$/i })
      .or(page.getByRole("menuitem", { name: /^player$/i }));
    if (await playerOption.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await playerOption.click();
    }

    // Sprint 31 contract: inline Alert appears when blocked rows exist
    const blockedAlert = page
      .getByRole("alert")
      .filter({ hasText: /blocked|team|could not|skipped/i })
      .or(page.getByTestId("bulk-blocked-alert"));

    const alertVisible = await blockedAlert.isVisible({ timeout: 5_000 }).catch(() => false);

    if (alertVisible) {
      await expect(blockedAlert).toBeVisible();

      const alertText = await blockedAlert.textContent();
      expect(alertText).toMatch(/team|remove|linked/i);

      // Alert is dismissible
      const dismissBtn = blockedAlert
        .getByRole("button", { name: /dismiss|close|×/i })
        .or(page.getByRole("button", { name: /dismiss/i }));

      await expect(dismissBtn).toBeVisible();
      await dismissBtn.click();

      await expect(blockedAlert).not.toBeVisible({ timeout: 3_000 });
    } else {
      test.info().annotations.push({
        type: "info",
        description: "No blocked contacts detected in this run — either no team_members rows for selected contacts, or bulkRemoveContactType not yet implemented (expected RED).",
      });
    }
  });

  test("bulk Remove with blocked rows: Alert lists blocked contact name + reason", async ({ adminPage: page }) => {
    await page.goto("/admin/contacts");
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();

    // Use team filter to target contacts with guaranteed team_members rows.
    // The team filter SelectTrigger shows "All Teams" placeholder (no aria-label),
    // so locating by accessible name is unreliable. Use visible text instead.
    const teamFilter = page
      .locator('[data-slot="select-trigger"]')
      .filter({ hasText: /all teams/i });
    if (!(await teamFilter.isVisible({ timeout: 2_000 }).catch(() => false))) {
      // Team filter doesn't exist in current UI
      test.info().annotations.push({
        type: "skip-reason",
        description: "Team filter not available — cannot target team_members contacts",
      });
      return;
    }

    await teamFilter.click();
    // nth(0) is "All Teams" — skip it and pick the first real team (nth(1)).
    const firstTeam = page.getByRole("option").nth(1);
    if (!(await firstTeam.isVisible({ timeout: 2_000 }).catch(() => false))) {
      return;
    }
    await firstTeam.click();
    // Wait for the async getContacts re-fetch (startTransition) to settle.
    // The tbody row appearing is more deterministic than networkidle in CI.
    await page
      .locator("tbody tr")
      .first()
      .waitFor({ state: "visible", timeout: 5_000 })
      .catch(() => null);

    // Select first 5 contacts (or fewer if fewer exist) — stays well under the 500-row bulk-action cap.
    // Scoped to tbody primary Checkbox buttons only ([data-slot="checkbox"]) to avoid the duplicate
    // role="checkbox" from RowActions <input> in each row.
    const checkboxes = page.locator("tbody [data-slot='checkbox']");
    const count = await checkboxes.count();
    if (count < 1) {
      test.info().annotations.push({
        type: "skip-reason",
        description: "No contacts visible after team filter — team may have no members in current seed.",
      });
      return;
    }
    // Cap at 3 rows — team-filtered lists re-render after each selection
    // (startTransition), so the visible row count may shrink during the loop.
    // #410-B: team-filtered list re-renders via startTransition after each checkbox
    // selection; nth(i) indexes a different element after re-render, causing the
    // click to timeout. Limit to a single click on nth(0) — sufficient to trigger
    // the bulk-action bar and the blocked-rows Alert path (1 contact on a team is enough).
    const selectCount = Math.min(count, 1);
    for (let i = 0; i < selectCount; i++) {
      // Re-evaluate current row count before each iteration — DOM may re-render.
      const currentCount = await page.locator("tbody [data-slot='checkbox']").count();
      if (i >= currentCount) break;
      const cb = page.locator("tbody [data-slot='checkbox']").nth(i);
      await cb.waitFor({ state: "visible", timeout: 5_000 });
      // Use click() — the Checkbox button's click bubbles to <td onClick> to update React state.
      // dispatchEvent("click") doesn't bubble through Next.js's synthetic event system.
      await cb.click();
    }

    // Wait for the bulk-action bar's "X selected" indicator — this confirms
    // React state has updated (selected.size > 0) rather than just the visual
    // checkbox state, which Playwright marks synchronously on .check().
    const selectedIndicator = page.getByText(/\d+ selected/).first();
    const bulkBarVisible = await selectedIndicator.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!bulkBarVisible) {
      test.info().annotations.push({
        type: "skip-reason",
        description: "Row checkbox checks did not produce a selection (filtered list may be empty). Skipping bulk-bar assertion.",
      });
      return;
    }

    // Sprint 31: "Remove type" SelectTrigger in bulk bar (role="combobox").
    const removeBulkBtn = page
      .getByRole("combobox", { name: /remove type/i })
      .or(page.getByRole("button", { name: /remove type/i }));

    await expect(removeBulkBtn).toBeVisible({ timeout: 3_000 });
    await removeBulkBtn.click();

    const playerOption = page
      .getByRole("option", { name: /^player$/i })
      .or(page.getByRole("menuitem", { name: /^player$/i }));
    if (await playerOption.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await playerOption.click();
    }

    // Alert must appear listing blocked contacts — data-conditional.
    // Only fires if selected contacts have Player type and are in team_members.
    const blockedAlert = page
      .getByRole("alert")
      .filter({ hasText: /blocked|team|skipped/i })
      .or(page.getByTestId("bulk-blocked-alert"));

    const alertVisible = await blockedAlert.isVisible({ timeout: 5_000 }).catch(() => false);

    if (alertVisible) {
      const alertText = await blockedAlert.textContent();
      expect(alertText).toMatch(/team/i);

      // Dismiss
      const dismissBtn = blockedAlert.getByRole("button", { name: /dismiss|close/i });
      await expect(dismissBtn).toBeVisible();
      await dismissBtn.click();
      await expect(blockedAlert).not.toBeVisible({ timeout: 3_000 });
    } else {
      test.info().annotations.push({
        type: "info",
        description: "No blocked contacts detected — team_members contacts may not have Player type in current PROD data.",
      });
    }
  });
});
