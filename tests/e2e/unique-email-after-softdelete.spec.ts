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
import { cleanupTestData } from "./fixtures/cleanup-helper";

const SEED_TAG = crypto.randomUUID().slice(0, 8);
const TS = Date.now();
const SHARED_EMAIL = `e2e-${SEED_TAG}-unique@example.com`;
const ORIG_LAST = `Orig${TS}`;
const REPL_LAST = `Repl${TS}`;

test.afterAll(async () => {
  await cleanupTestData(SEED_TAG);
});

test.describe("Partial unique index — email reuse after soft-delete", () => {
  test(
    "allows re-creating a contact with same email after soft-delete, conflicts on restore",
    async ({ adminPage: page }) => {
      // ---- Step 1: Create first contact ----
      await page.goto("/admin/contacts");
      await page.getByRole("button", { name: /new contact/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByLabel(/first name/i).fill("UniqueFirst");
      await page.getByLabel(/last name/i).fill(ORIG_LAST);
      await page.getByRole("textbox", { name: "Email" }).fill(SHARED_EMAIL);
      // Pattern F: D12 role-cards — at least one type toggled on before Save is enabled
      await page.getByRole("switch", { name: /toggle player role/i }).check();
      await page.getByRole("button", { name: /create|save/i }).click();
      // webkit: modal-close transition slower than chromium; extend timeout
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(`UniqueFirst ${ORIG_LAST}`)).toBeVisible();

      // ---- Step 2: Soft-delete the first contact ----
      // D12: row click does NOT open modal — edit via RowActions pencil button.
      // RowActions cluster is opacity-0 until hover; force:true bypasses visibility constraint.
      const origRow = page.getByRole("row").filter({ hasText: SHARED_EMAIL });
      // webkit: hover stalls at stability wait; force:true bypasses
      await origRow.hover({ force: true });
      await origRow.getByRole("button", { name: /^Edit/i }).click({ force: true });
      await expect(page.getByRole("dialog")).toBeVisible();
      // webkit: modal button stalls at "performing click action"; force:true bypasses
      await page.getByRole("button", { name: /delete/i }).click({ force: true });

      // ConfirmDialog always opens — click the exact "Delete" confirm button (not "Delete contact")
      const origConfirmBtn = page.getByRole("button", { name: "Delete", exact: true });
      if (await origConfirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await origConfirmBtn.click({ force: true });
      }

      // Wait for deletion to complete (async server action) and dialogs to close
      await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 });
      await expect(page.getByText(`UniqueFirst ${ORIG_LAST}`)).not.toBeVisible({ timeout: 5_000 });

      // ---- Step 3: Create second contact with SAME email — should succeed ----
      await page.getByRole("button", { name: /new contact/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByLabel(/first name/i).fill("UniqueFirst");
      await page.getByLabel(/last name/i).fill(REPL_LAST);
      await page.getByRole("textbox", { name: "Email" }).fill(SHARED_EMAIL);
      // Pattern F: D12 role-cards — at least one type toggled on before Save is enabled
      await page.getByRole("switch", { name: /toggle player role/i }).check();
      await page.getByRole("button", { name: /create|save/i }).click();

      // Should succeed — no duplicate error
      // webkit: modal-close transition slower than chromium; extend timeout
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(`UniqueFirst ${REPL_LAST}`)).toBeVisible({ timeout: 5_000 });

      // ---- Step 4: Try to restore the original contact → should conflict ----
      await page.goto("/admin/trash");
      const contactsTab = page.getByRole("tab", { name: /contacts/i });
      if (await contactsTab.isVisible()) {
        await contactsTab.click();
      }

      // Find the original contact in Trash
      const originalRow = page.locator(`tr, li, [data-testid="trash-row"]`).filter({
        hasText: `UniqueFirst ${ORIG_LAST}`,
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
      // D12: row click does NOT open modal — edit via RowActions pencil button.
      const replRow = page.getByRole("row").filter({ hasText: SHARED_EMAIL });
      // webkit: hover stalls at stability wait; force:true bypasses
      await replRow.hover({ force: true });
      await replRow.getByRole("button", { name: /^Edit/i }).click({ force: true });
      await expect(page.getByRole("dialog")).toBeVisible();
      // webkit: modal button stalls at "performing click action"; force:true bypasses
      await page.getByRole("button", { name: /delete/i }).click({ force: true });
      const replConfirmBtn = page.getByRole("button", { name: "Delete", exact: true });
      if (await replConfirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await replConfirmBtn.click({ force: true });
      }
    }
  );
});
