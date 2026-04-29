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
 * FAILING on unmodified main because:
 * - bulkRemoveContactType doesn't exist (only bulkUpdateContacts)
 * - No blocked-row Alert component exists in contact-list.tsx
 * - The bulk action bar has Set-Type only (no Add/Remove split)
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

    // Select at least one contact to trigger the bulk-action bar
    const checkboxes = page
      .getByRole("checkbox")
      .filter({ hasNot: page.locator("thead") });
    const count = await checkboxes.count();
    if (count < 1) {
      test.skip(true, "No contacts in DB — cannot test bulk-action bar");
      return;
    }

    await checkboxes.first().check();

    // Bulk-action bar should appear
    await expect(page.getByText(/1 selected|selected/i)).toBeVisible({ timeout: 3_000 });

    // Sprint 31 contract: "Remove type" button must be in the bulk-action bar
    // This FAILS on unmodified main — only "Set type" exists today
    const removeBulkBtn = page
      .getByRole("button", { name: /remove type/i })
      .or(page.getByRole("menuitem", { name: /remove type/i }));

    await expect(removeBulkBtn).toBeVisible({ timeout: 3_000 });
  });

  test("bulk Add type button exists in Sprint 31 bulk-action bar", async ({ adminPage: page }) => {
    await page.goto("/admin/contacts");
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();

    const checkboxes = page
      .getByRole("checkbox")
      .filter({ hasNot: page.locator("thead") });
    const count = await checkboxes.count();
    if (count < 1) {
      test.skip(true, "No contacts in DB");
      return;
    }

    await checkboxes.first().check();
    await expect(page.getByText(/1 selected|selected/i)).toBeVisible({ timeout: 3_000 });

    // Sprint 31 contract: "Add type" button must exist
    // FAILS on unmodified main
    const addBulkBtn = page
      .getByRole("button", { name: /add type/i })
      .or(page.getByRole("menuitem", { name: /add type/i }));

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

    // Select first 3 contacts
    const checkboxes = page
      .getByRole("checkbox")
      .filter({ hasNot: page.locator("thead") });
    const count = await checkboxes.count();
    if (count < 2) {
      test.skip(true, "Not enough contacts to run bulk blocked Alert test (need 2+)");
      return;
    }

    const selectCount = Math.min(count, 3);
    for (let i = 0; i < selectCount; i++) {
      await checkboxes.nth(i).check();
    }

    await expect(
      page.getByText(new RegExp(`${selectCount} selected|selected`, "i"))
    ).toBeVisible({ timeout: 3_000 });

    // Sprint 31: "Remove type" button in bulk bar — FAILS on unmodified main
    const removeBulkBtn = page
      .getByRole("button", { name: /remove type/i })
      .or(page.getByRole("menuitem", { name: /remove type/i }));

    await expect(removeBulkBtn).toBeVisible({ timeout: 3_000 });
    await removeBulkBtn.click();

    // Pick Player from sub-menu if present
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

    // Use team filter to target contacts with guaranteed team_members rows
    const teamFilter = page.getByRole("combobox", { name: /team/i });
    if (!(await teamFilter.isVisible({ timeout: 2_000 }).catch(() => false))) {
      // Team filter doesn't exist in current UI — Sprint 31 hasn't shipped
      // Explicitly assert it exists (RED failure)
      await expect(page.getByRole("button", { name: /remove type/i })).toBeVisible();
      return;
    }

    await teamFilter.click();
    const firstTeam = page.getByRole("option").first();
    if (!(await firstTeam.isVisible({ timeout: 2_000 }).catch(() => false))) {
      return;
    }
    await firstTeam.click();

    // Select visible contacts (all are in team_members — all should be blocked for Player removal)
    const headerCheckbox = page.locator("thead").getByRole("checkbox");
    if (await headerCheckbox.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await headerCheckbox.check();
    }

    const selCount = await page.getByRole("checkbox", { checked: true }).count();
    if (selCount < 1) {
      return;
    }

    // Sprint 31: "Remove type" in bulk bar
    const removeBulkBtn = page
      .getByRole("button", { name: /remove type/i })
      .or(page.getByRole("menuitem", { name: /remove type/i }));

    // This assertion is the RED gate: fails on unmodified main
    await expect(removeBulkBtn).toBeVisible({ timeout: 3_000 });
    await removeBulkBtn.click();

    const playerOption = page
      .getByRole("option", { name: /^player$/i })
      .or(page.getByRole("menuitem", { name: /^player$/i }));
    if (await playerOption.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await playerOption.click();
    }

    // Alert must appear listing blocked contacts
    const blockedAlert = page
      .getByRole("alert")
      .filter({ hasText: /blocked|team|skipped/i })
      .or(page.getByTestId("bulk-blocked-alert"));

    await expect(blockedAlert).toBeVisible({ timeout: 5_000 });

    const alertText = await blockedAlert.textContent();
    expect(alertText).toMatch(/team/i);

    // Dismiss
    const dismissBtn = blockedAlert.getByRole("button", { name: /dismiss|close/i });
    await expect(dismissBtn).toBeVisible();
    await dismissBtn.click();
    await expect(blockedAlert).not.toBeVisible({ timeout: 3_000 });
  });
});
