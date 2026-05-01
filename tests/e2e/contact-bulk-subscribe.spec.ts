/**
 * Flow 3: Bulk subscribe contacts
 *
 * Requires: E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD in env
 * Skipped automatically when credentials are not configured.
 *
 * NOTE: This flow depends on having at least 3 contacts visible in the list.
 * The test selects the first 3 visible contacts via checkboxes.
 */

import { test as baseTest, expect } from "@playwright/test";

baseTest.skip(
  !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
  "Skipped: set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E tests"
);

import { test } from "./fixtures/admin-auth";

test.describe("Bulk subscribe contacts", () => {
  test("selects 3 contacts and subscribes them", async ({ adminPage: page }) => {
    await page.goto("/admin/contacts");
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();

    // Find contact row checkboxes — scope to tbody to exclude the select-all header checkbox.
    // The hasNot filter does not exclude the thead checkbox (checkboxes don't contain thead
    // as descendants). Scoping to tbody locator is the correct pattern.
    const checkboxes = page.locator("tbody").getByRole("checkbox");

    // Need at least 3 contacts for this test
    const count = await checkboxes.count();
    if (count < 3) {
      test.skip(true, "Not enough contacts in DB to run bulk subscribe test (need 3+)");
      return;
    }

    // Select first 3 contacts
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await checkboxes.nth(2).check();

    // Bulk action bar should appear — use first() to avoid strict-mode violation on duplicate spans
    await expect(page.getByText(/3 selected/i).first()).toBeVisible({ timeout: 3_000 });

    // Click Subscribe
    await page.getByRole("button", { name: /^subscribe$/i }).click();

    // Toast should appear confirming the action — scope to sonner toast container to avoid
    // strict-mode violation from "Subscribed" status chips already visible in the contact list.
    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: /subscribed|updated/i })
    ).toBeVisible({ timeout: 5_000 });
  });
});
