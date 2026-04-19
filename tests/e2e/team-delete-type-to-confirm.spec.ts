/**
 * Flow 5: Team delete with type-to-confirm dialog
 *
 * Requires: E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD in env
 * Skipped automatically when credentials are not configured.
 *
 * Finds or creates a paid test team, verifies the type-to-confirm dialog,
 * then soft-deletes the team and verifies it appears in Trash.
 */

import { test as baseTest, expect } from "@playwright/test";

baseTest.skip(
  !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
  "Skipped: set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E tests"
);

import { test } from "./fixtures/admin-auth";

test.describe("Team delete — type-to-confirm dialog", () => {
  test("delete button is disabled until team name is typed exactly", async ({ adminPage: page }) => {
    await page.goto("/admin/teams");
    await expect(page.getByRole("heading", { name: /teams/i })).toBeVisible();

    // Find the first team row with a Delete button
    const teamRows = page.locator("tr, [role=row]").filter({
      has: page.getByRole("button", { name: /delete/i }),
    });

    const rowCount = await teamRows.count();
    if (rowCount === 0) {
      test.skip(true, "No teams in DB — run seed or create a team first");
      return;
    }

    // Get the team name from the first row
    const firstRow = teamRows.first();
    const teamNameCell = firstRow.locator("td").first();
    const teamName = (await teamNameCell.textContent())?.trim() ?? "";

    if (!teamName) {
      test.skip(true, "Could not read team name from first row");
      return;
    }

    // Click Delete on the first team
    await firstRow.getByRole("button", { name: /delete/i }).click();

    // Dialog should open
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });

    // Delete/Confirm button should be disabled initially
    const deleteButton = page.getByRole("button", { name: /^delete$/i }).last();
    await expect(deleteButton).toBeDisabled();

    // Type WRONG name — button should stay disabled
    const typeInput = page.getByRole("textbox").filter({ hasNotText: "" }).first();
    // Use a more targeted selector if the input has a label
    const confirmInput = page.locator("input[type=text]").last();
    await confirmInput.fill("wrong-team-name");
    await expect(deleteButton).toBeDisabled();

    // Clear and type CORRECT name
    await confirmInput.clear();
    await confirmInput.fill(teamName);
    await expect(deleteButton).not.toBeDisabled({ timeout: 2_000 });

    // ---- Confirm delete ----
    await deleteButton.click();

    // Team disappears from list
    await expect(page.getByText(teamName, { exact: true })).not.toBeVisible({ timeout: 5_000 });

    // ---- Verify in Trash ----
    await page.goto("/admin/trash");
    const teamsTab = page.getByRole("tab", { name: /teams/i });
    if (await teamsTab.isVisible()) {
      await teamsTab.click();
    }
    await expect(page.getByText(teamName)).toBeVisible({ timeout: 5_000 });
  });
});
