/**
 * Flow 4: Bulk delete contacts
 *
 * Requires: E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD in env
 * Skipped automatically when credentials are not configured.
 *
 * Creates 3 test contacts, bulk-deletes them, verifies they move to Trash.
 */

import { test as baseTest, expect } from "@playwright/test";

baseTest.skip(
  !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
  "Skipped: set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E tests"
);

import { test } from "./fixtures/admin-auth";

const SEED_TAG = `bulk-del-${Date.now()}`;

async function createTestContact(
  page: import("@playwright/test").Page,
  idx: number
) {
  await page.getByRole("button", { name: /new contact/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel(/first name/i).fill(`BulkDel${idx}`);
  await page.getByLabel(/last name/i).fill(SEED_TAG);
  await page.getByRole("textbox", { name: "Email" }).fill(`bulk-del-${idx}-${Date.now()}@example.com`);
  // Pattern F: D12 role-cards — at least one type toggled on before Save is enabled
  await page.getByRole("switch", { name: /toggle player role/i }).check();
  await page.getByRole("button", { name: /create|save/i }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
}

test.describe("Bulk delete contacts", () => {
  test("creates 3 contacts, bulk-deletes them, verifies in Trash", async ({ adminPage: page }) => {
    await page.goto("/admin/contacts");
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();

    // ---- Create 3 test contacts ----
    for (let i = 1; i <= 3; i++) {
      await createTestContact(page, i);
    }

    // Verify they appear in the list (filter by last name = SEED_TAG)
    await expect(page.getByText(`BulkDel1 ${SEED_TAG}`)).toBeVisible({ timeout: 5_000 });

    // ---- Select all 3 ----
    // Select checkboxes for rows containing the SEED_TAG last name
    const rows = page.locator("tr, [role=row]").filter({ hasText: SEED_TAG });
    const rowCount = await rows.count();

    for (let i = 0; i < rowCount; i++) {
      // Scope to [data-slot="checkbox"] to avoid the duplicate RowActions <input[type=checkbox]>
      // webkit: pointer-event completion races on checkbox elements — force:true bypasses
      // the actionability wait that stalls after "performing click action" in webkit
      await rows.nth(i).locator("[data-slot='checkbox']").click({ force: true });
    }

    // ---- Click Delete in bulk action bar ----
    await page.getByRole("button", { name: /delete selected|delete/i }).first().click();

    // Confirm dialog
    const confirmBtn = page.getByRole("button", { name: /confirm|yes|delete/i });
    await expect(confirmBtn).toBeVisible({ timeout: 3_000 });
    // webkit: button resolves + is visible but click stalls at "performing click action";
    // toBeEnabled guard + force:true bypasses the webkit pointer-events timing race
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click({ force: true });

    // Wait for the confirm dialog to close first — signals handleBulkDelete started.
    // The dialog closes synchronously (setDeleteDialogOpen(false)) before the async
    // bulkDeleteContacts call resolves. We then wait for the contacts to disappear,
    // which happens after the async call + setContacts filter completes.
    // Use 15_000ms to accommodate the network round-trip on chromium (PR #392 fix:
    // setContacts optimistic filter still awaits the bulkDeleteContacts promise).
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // Contacts disappear from list
    await expect(page.getByText(`BulkDel1 ${SEED_TAG}`)).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`BulkDel2 ${SEED_TAG}`)).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(`BulkDel3 ${SEED_TAG}`)).not.toBeVisible({ timeout: 5_000 });

    // ---- Navigate to Trash → Contacts tab ----
    await page.goto("/admin/trash");
    const contactsTab = page.getByRole("tab", { name: /contacts/i });
    if (await contactsTab.isVisible()) {
      await contactsTab.click();
    }

    // All 3 contacts present in Trash
    await expect(page.getByText(`BulkDel1 ${SEED_TAG}`)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(`BulkDel2 ${SEED_TAG}`)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(`BulkDel3 ${SEED_TAG}`)).toBeVisible({ timeout: 5_000 });
  });
});
