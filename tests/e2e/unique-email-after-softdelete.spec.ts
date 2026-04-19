/**
 * Flow 7: Partial unique index — re-use email after soft-delete + conflict on restore
 *
 * Requires: E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD in env
 * Skipped automatically when credentials are not configured.
 *
 * Verifies:
 * 1. Creating a contact with email X, soft-deleting it, then creating ANOTHER contact
 *    with the same email X succeeds (partial unique index allows this).
 * 2. Attempting to restore the first contact surfaces a conflict error toast.
 */

import { test as baseTest, expect } from "@playwright/test";

baseTest.skip(
  !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
  "Skipped: set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E tests"
);

import { test } from "./fixtures/admin-auth";

const SHARED_EMAIL = `e2e-unique-${Date.now()}@example.com`;

test.describe("Partial unique index — email reuse after soft-delete", () => {
  test(
    "allows re-creating a contact with same email after soft-delete, conflicts on restore",
    async ({ adminPage: page }) => {
      // ---- Step 1: Create first contact ----
      await page.goto("/admin/contacts");
      await page.getByRole("button", { name: /new contact/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByLabel(/first name/i).fill("UniqueFirst");
      await page.getByLabel(/last name/i).fill("Original");
      await page.getByLabel(/email/i).fill(SHARED_EMAIL);
      await page.getByRole("button", { name: /save/i }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
      await expect(page.getByText("UniqueFirst Original")).toBeVisible();

      // ---- Step 2: Soft-delete the first contact ----
      await page.getByText("UniqueFirst Original").click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: /delete/i }).click();

      const confirmBtn = page.getByRole("button", { name: /confirm|yes/i });
      if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      await expect(page.getByText("UniqueFirst Original")).not.toBeVisible({ timeout: 5_000 });

      // ---- Step 3: Create second contact with SAME email — should succeed ----
      await page.getByRole("button", { name: /new contact/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByLabel(/first name/i).fill("UniqueFirst");
      await page.getByLabel(/last name/i).fill("Replacement");
      await page.getByLabel(/email/i).fill(SHARED_EMAIL);
      await page.getByRole("button", { name: /save/i }).click();

      // Should succeed — no duplicate error
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
      await expect(page.getByText("UniqueFirst Replacement")).toBeVisible({ timeout: 5_000 });

      // ---- Step 4: Try to restore the original contact → should conflict ----
      await page.goto("/admin/trash");
      const contactsTab = page.getByRole("tab", { name: /contacts/i });
      if (await contactsTab.isVisible()) {
        await contactsTab.click();
      }

      // Find the original contact in Trash
      const originalRow = page.locator(`tr, li, [data-testid="trash-row"]`).filter({
        hasText: "UniqueFirst Original",
      });
      await expect(originalRow).toBeVisible({ timeout: 5_000 });

      // Click Restore — should fail with conflict toast
      await originalRow.getByRole("button", { name: /restore/i }).click();

      // Expect an error toast (conflict)
      await expect(
        page.getByText(/already exists|conflict|email already in use/i)
      ).toBeVisible({ timeout: 5_000 });

      // ---- Cleanup: delete the replacement contact ----
      await page.goto("/admin/contacts");
      await page.getByText("UniqueFirst Replacement").click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: /delete/i }).click();
      const cleanup = page.getByRole("button", { name: /confirm|yes/i });
      if (await cleanup.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await cleanup.click();
      }
    }
  );
});
