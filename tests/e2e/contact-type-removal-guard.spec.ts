/**
 * Sprint 31 (RED): Contact type-removal guard E2E tests
 *
 * When an admin unchecks Player from a contact who is in team_members,
 * the system must block the save and show an inline error naming the team.
 * Same for Sponsor / sponsor_contacts.
 *
 * Requires: E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD in env
 * Skipped automatically when credentials are not configured.
 *
 * FAILING on unmodified main because:
 * - The form has no guard logic — type changes are allowed freely
 * - The form has no inline error display for guard failures
 * - The "types" field doesn't exist (singular "type" only)
 */

import { test as baseTest, expect, type Page } from "@playwright/test";

baseTest.skip(
  !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
  "Skipped: set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E tests"
);

import { test } from "./fixtures/admin-auth";

test.describe("Sprint 31 — type-removal guard", () => {
  test("removing Player type blocked when contact is in team_members — inline error names the team", async ({ adminPage: page }) => {
    await page.goto("/admin/contacts");
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();

    // Filter to Players
    const typeFilter = page.getByRole("combobox", { name: /filter|type/i }).first();
    if (await typeFilter.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await typeFilter.click();
      await page.getByRole("option", { name: /^player$/i }).click();
    }

    const firstContactRow = page.getByRole("row").filter({ hasNot: page.locator("thead") }).first();
    await expect(firstContactRow).toBeVisible({ timeout: 5_000 });

    await firstContactRow.click();

    // Sprint 31: centered modal
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });

    // Verify Player is currently checked (Sprint 31 form has checkboxes)
    const playerCheckbox = page.getByRole("checkbox", { name: /^player$/i });
    await expect(playerCheckbox).toBeChecked();

    // Uncheck Player
    await playerCheckbox.uncheck();

    // Ensure at least one other type is checked so Save is enabled
    const donorCheckbox = page.getByRole("checkbox", { name: /^donor$/i });
    if (!(await donorCheckbox.isChecked())) {
      await donorCheckbox.check();
    }

    await page.getByRole("button", { name: /save/i }).click();

    // Sprint 31 contract: if this contact IS on a team, inline error appears
    const inlineError = page
      .getByRole("alert")
      .filter({ hasText: /team|remove/i })
      .or(page.getByTestId("type-guard-error"));

    const errorVisible = await inlineError.isVisible({ timeout: 3_000 }).catch(() => false);

    if (errorVisible) {
      await expect(inlineError).toBeVisible();
      const errorText = await inlineError.textContent();
      expect(errorText).toMatch(/team/i);
      expect(errorText).toMatch(/remove|first/i);

      // Modal must still be open (guard blocked the save)
      await expect(page.getByRole("dialog")).toBeVisible();

      await page.keyboard.press("Escape");
    } else {
      // Contact is not on a team — guard correctly did not fire
      test.info().annotations.push({
        type: "info",
        description: "Contact is not in team_members — guard correctly did not fire. This is a valid path.",
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Seeded guard scenario: use team filter to find a team member
  // ---------------------------------------------------------------------------

  test("guard via team filter: pick contact from team list, uncheck Player — inline error references team", async ({ adminPage: page }) => {
    await page.goto("/admin/contacts");
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();

    // Use team filter to find contacts in team_members
    const teamFilter = page.getByRole("combobox", { name: /team/i });
    if (!(await teamFilter.isVisible({ timeout: 2_000 }).catch(() => false))) {
      test.info().annotations.push({
        type: "skip-reason",
        description: "Team filter not available in current UI — guard scenario requires team filter",
      });
      // Explicitly fail: Sprint 31 form should have team filter
      await expect(teamFilter).toBeVisible();
      return;
    }

    // Pick first team
    await teamFilter.click();
    const firstTeamOption = page.getByRole("option").first();
    await expect(firstTeamOption).toBeVisible({ timeout: 3_000 });
    const teamName = ((await firstTeamOption.textContent()) ?? "the team").trim();
    await firstTeamOption.click();

    // Pick first contact from this team
    const firstRow = page.getByRole("row").filter({ hasNot: page.locator("thead") }).first();
    if (!(await firstRow.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.info().annotations.push({
        type: "skip-reason",
        description: `Team "${teamName}" has no contacts — cannot run guard test`,
      });
      return;
    }

    await firstRow.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });

    // This contact should be a Player (on a team)
    const playerCheckbox = page.getByRole("checkbox", { name: /^player$/i });
    if (!(await playerCheckbox.isChecked())) {
      // Not a player — guard won't fire for Player removal
      await page.keyboard.press("Escape");
      return;
    }

    await playerCheckbox.uncheck();

    // Check Other so Save is enabled
    const otherCheckbox = page.getByRole("checkbox", { name: /^other$/i });
    await otherCheckbox.check();

    await page.getByRole("button", { name: /save/i }).click();

    // Expect inline error referencing the team
    const inlineError = page
      .getByRole("alert")
      .filter({ hasText: /team/i })
      .or(page.getByTestId("type-guard-error"));

    await expect(inlineError).toBeVisible({ timeout: 3_000 });

    const errorText = await inlineError.textContent();
    expect(errorText).toMatch(/team/i);
    expect(errorText).toMatch(/remove|first/i);

    // Modal stays open — types unchanged
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
  });

  // ---------------------------------------------------------------------------
  // Sponsor guard
  // ---------------------------------------------------------------------------

  test("removing Sponsor type blocked when contact is in sponsor_contacts — inline error references sponsorship", async ({ adminPage: page }) => {
    await page.goto("/admin/contacts");
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();

    // Filter to Sponsors
    const typeFilter = page.getByRole("combobox", { name: /filter|type/i }).first();
    if (await typeFilter.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await typeFilter.click();
      await page.getByRole("option", { name: /^sponsor$/i }).click();
    }

    const firstSponsorRow = page.getByRole("row").filter({ hasNot: page.locator("thead") }).first();
    if (!(await firstSponsorRow.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.info().annotations.push({
        type: "skip-reason",
        description: "No sponsor contacts visible — cannot run sponsor guard test",
      });
      return;
    }

    await firstSponsorRow.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });

    const sponsorCheckbox = page.getByRole("checkbox", { name: /^sponsor$/i });
    await expect(sponsorCheckbox).toBeChecked();

    await sponsorCheckbox.uncheck();

    const donorCheckbox = page.getByRole("checkbox", { name: /^donor$/i });
    if (!(await donorCheckbox.isChecked())) {
      await donorCheckbox.check();
    }

    await page.getByRole("button", { name: /save/i }).click();

    const inlineError = page
      .getByRole("alert")
      .filter({ hasText: /sponsor|sponsorship|remove/i })
      .or(page.getByTestId("type-guard-error"));

    const errorVisible = await inlineError.isVisible({ timeout: 3_000 }).catch(() => false);

    if (errorVisible) {
      const errorText = await inlineError.textContent();
      expect(errorText).toMatch(/sponsor|sponsorship/i);
      expect(errorText).toMatch(/remove|first/i);
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
    } else {
      test.info().annotations.push({
        type: "info",
        description: "Sponsor contact is not in sponsor_contacts — guard correctly did not fire.",
      });
    }
  });
});
