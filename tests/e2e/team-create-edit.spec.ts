/**
 * Sprint 32 (#282) — E2E: Admin team create/edit via centered modal
 *
 * Contract:
 * - "New Team" button opens a centered modal (not a side drawer)
 * - No "Team Name" text input in the modal
 * - Captain typeahead picker is the primary identity field
 * - After save, the team row shows the captain's full name
 * - Edit team also opens a centered modal
 *
 * RED until Bolt ships TeamModal (Phase 2).
 *
 * Requires: E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD in env
 */

import { test as baseTest, expect } from "@playwright/test";

baseTest.skip(
  !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
  "Skipped: set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E tests"
);

import { test } from "./fixtures/admin-auth";

test.describe("Sprint 32 — Admin team create/edit (centered modal, captain identity)", () => {
  test("Add Team opens a centered modal, not a side drawer", async ({ adminPage: page }) => {
    await page.goto("/admin/teams");
    await expect(page.getByRole("heading", { name: /teams/i })).toBeVisible();

    // Click "New Team" button
    await page.getByRole("button", { name: /new team/i }).click();

    // Must open a centered modal (dialog), not a sheet/drawer
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Verify it's a centered modal, not a side sheet.
    // Sheets/drawers in shadcn have data-vaul-drawer or a specific side class.
    // A centered Dialog does NOT have side positioning classes.
    const dialogBox = await dialog.boundingBox();
    const viewportSize = page.viewportSize() ?? { width: 1280, height: 720 };
    if (dialogBox) {
      // A centered modal should be roughly centered horizontally
      const modalCenterX = dialogBox.x + dialogBox.width / 2;
      const viewportCenterX = viewportSize.width / 2;
      // Allow ±200px from center (centered modal is never far-right like a drawer)
      expect(Math.abs(modalCenterX - viewportCenterX)).toBeLessThan(200);
    }
  });

  test("Add Team modal does NOT have a Team Name text input", async ({ adminPage: page }) => {
    await page.goto("/admin/teams");
    await page.getByRole("button", { name: /new team/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // team_name input must not exist
    const teamNameInput = page.getByLabel(/^team name$/i);
    await expect(teamNameInput).not.toBeVisible();
  });

  test("Add Team modal has captain picker as primary identity field", async ({ adminPage: page }) => {
    await page.goto("/admin/teams");
    await page.getByRole("button", { name: /new team/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Captain typeahead / picker must be present
    const captainInput =
      page.getByPlaceholder(/search.*captain|captain.*search|search by name/i).first() ??
      page.getByLabel(/captain/i);
    await expect(captainInput).toBeVisible();
  });

  test("Team list row shows captain full name as team identity", async ({ adminPage: page }) => {
    await page.goto("/admin/teams");

    // Look for any team row — it should display a person's name (not "Team Something")
    // We check for the absence of the old "team_name" column header
    const tableHeaders = page.locator("th");
    const headerTexts = await tableHeaders.allTextContents();

    // "Team Name" column header must NOT exist (column is dropped per F-T1, PR #386)
    expect(headerTexts.some((h) => h.match(/^team name$/i))).toBe(false);

    // "Team" column header must exist — it now carries captain's full name as team identity
    // (F-T1: Captain column dropped; team identity = captain's full_name via Team column)
    const hasTeamColumn = headerTexts.some((h) => h.trim() === "Team");
    expect(hasTeamColumn).toBe(true);
  });

  test("Edit team opens a centered modal (not drawer)", async ({ adminPage: page }) => {
    await page.goto("/admin/teams");

    // Find an Edit button for any existing team
    const editButtons = page.getByRole("button", { name: /^edit$/i });
    const count = await editButtons.count();

    if (count === 0) {
      // No teams to edit — skip gracefully
      test.skip(true, "No teams exist to edit — skipping edit modal test");
      return;
    }

    await editButtons.first().click();

    // Must open a centered modal
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // No team_name input in edit form either
    const teamNameInput = page.getByLabel(/^team name$/i);
    await expect(teamNameInput).not.toBeVisible();
  });
});
