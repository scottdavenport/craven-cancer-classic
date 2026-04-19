/**
 * Flow 2: Contact soft-delete → Trash → Restore
 *
 * Requires: E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD in env
 * Skipped automatically when credentials are not configured.
 */

import { test as baseTest, expect } from "@playwright/test";

baseTest.skip(
  !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
  "Skipped: set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E tests"
);

import { test } from "./fixtures/admin-auth";

const TEST_EMAIL = `e2e-restore-${Date.now()}@example.com`;
const TEST_FULL_NAME = `E2ERestore ${Date.now()}`;

test.describe("Contact soft-delete and restore", () => {
  test("soft-deletes a contact, finds it in Trash, restores it", async ({ adminPage: page }) => {
    // ---- Step 1: Create test contact ----
    await page.goto("/admin/contacts");
    await page.getByRole("button", { name: /new contact/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel(/first name/i).fill("E2ERestore");
    await page.getByLabel(/last name/i).fill(String(Date.now()));
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // ---- Step 2: Delete the contact ----
    // Find by email (more stable than name with timestamp)
    await page.getByText(TEST_EMAIL).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /delete/i }).click();

    // Handle confirmation if present
    const confirmBtn = page.getByRole("button", { name: /confirm|yes/i });
    if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    await expect(page.getByText(TEST_EMAIL)).not.toBeVisible({ timeout: 5_000 });

    // ---- Step 3: Navigate to Trash → Contacts tab ----
    await page.goto("/admin/trash");
    await expect(page.getByRole("heading", { name: /trash/i })).toBeVisible();

    // Click Contacts tab if not already active
    const contactsTab = page.getByRole("tab", { name: /contacts/i });
    if (await contactsTab.isVisible()) {
      await contactsTab.click();
    }

    // Test contact should appear in Trash
    await expect(page.getByText(TEST_EMAIL)).toBeVisible({ timeout: 5_000 });

    // ---- Step 4: Restore the contact ----
    const contactRow = page.locator(`tr, li, [data-testid="trash-row"]`).filter({
      hasText: TEST_EMAIL,
    });
    await contactRow.getByRole("button", { name: /restore/i }).click();

    // Toast confirmation
    await expect(page.getByText(/restored|success/i)).toBeVisible({ timeout: 5_000 });

    // Contact disappears from Trash
    await expect(page.getByText(TEST_EMAIL)).not.toBeVisible({ timeout: 5_000 });

    // ---- Step 5: Verify contact is back in contacts list ----
    await page.goto("/admin/contacts");
    await expect(page.getByText(TEST_EMAIL)).toBeVisible({ timeout: 5_000 });

    // ---- Cleanup: soft-delete again ----
    await page.getByText(TEST_EMAIL).click();
    await page.getByRole("button", { name: /delete/i }).click();
    const cleanup = page.getByRole("button", { name: /confirm|yes/i });
    if (await cleanup.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await cleanup.click();
    }
  });
});
