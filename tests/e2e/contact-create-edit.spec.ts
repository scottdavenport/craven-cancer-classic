/**
 * Flow 1: Contact create + edit via side drawer
 *
 * Requires: E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD in env
 * Skipped automatically when credentials are not configured.
 */

import { test as baseTest, expect } from "@playwright/test";

// Skip entire file when E2E credentials are not configured
baseTest.skip(
  !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
  "Skipped: set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E tests"
);

import { test } from "./fixtures/admin-auth";

const TEST_EMAIL = `e2e-contact-create-${Date.now()}@example.com`;

test.describe("Contact create/edit via drawer", () => {
  test("creates a new contact, edits it, then soft-deletes it", async ({ adminPage: page }) => {
    // ---- Navigate to contacts ----
    await page.goto("/admin/contacts");
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();

    // ---- Open new contact drawer ----
    await page.getByRole("button", { name: /new contact/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // ---- Fill in the form ----
    await page.getByLabel(/first name/i).fill("E2EFirst");
    await page.getByLabel(/last name/i).fill("E2ELast");
    await page.getByLabel(/email/i).fill(TEST_EMAIL);

    // Set type to donor
    await page.getByRole("combobox", { name: /type/i }).click();
    await page.getByRole("option", { name: /donor/i }).click();

    // ---- Save ----
    await page.getByRole("button", { name: /save/i }).click();

    // Drawer should close and toast should appear
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/contact created|saved/i)).toBeVisible({ timeout: 5_000 });

    // New contact visible in list
    await expect(page.getByText("E2EFirst E2ELast")).toBeVisible();

    // ---- Edit the contact ----
    await page.getByText("E2EFirst E2ELast").click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Verify values pre-filled
    await expect(page.getByLabel(/first name/i)).toHaveValue("E2EFirst");
    await expect(page.getByLabel(/email/i)).toHaveValue(TEST_EMAIL);

    // Change type to sponsor
    await page.getByRole("combobox", { name: /type/i }).click();
    await page.getByRole("option", { name: /sponsor/i }).click();

    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/saved|updated/i)).toBeVisible({ timeout: 5_000 });

    // ---- Cleanup: soft-delete the test contact ----
    await page.getByText("E2EFirst E2ELast").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /delete/i }).click();

    // Confirm the delete
    const confirmBtn = page.getByRole("button", { name: /confirm|yes/i });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    await expect(page.getByText("E2EFirst E2ELast")).not.toBeVisible({ timeout: 5_000 });
  });
});
