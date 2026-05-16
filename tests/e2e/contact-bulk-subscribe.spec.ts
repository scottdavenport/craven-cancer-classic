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
import { cleanupTestData } from "./fixtures/cleanup-helper";

const SEED_TAG = crypto.randomUUID().slice(0, 8);

test.afterAll(async () => {
  await cleanupTestData(SEED_TAG);
});

test.describe("Bulk subscribe contacts", () => {
  test("selects 3 contacts and subscribes them", async ({ adminPage: page }) => {
    await page.goto("/admin/contacts");
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();

    // Find contact row Checkbox buttons — scope to [data-slot="checkbox"] to exclude the
    // duplicate RowActions <input type="checkbox"> and the header checkbox.
    const checkboxes = page.locator("tbody [data-slot='checkbox']");

    // Need at least 3 contacts for this test
    const count = await checkboxes.count();
    if (count < 3) {
      test.skip(true, "Not enough contacts in DB to run bulk subscribe test (need 3+)");
      return;
    }

    // Select first 3 contacts
    await checkboxes.nth(0).click();
    await checkboxes.nth(1).click();
    await checkboxes.nth(2).click();

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
