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

async function createTestContact(
  page: import("@playwright/test").Page,
  idx: number,
  seedTag: string
) {
  await page.getByRole("button", { name: /new contact/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel(/first name/i).fill(`BulkDel${idx}`);
  await page.getByLabel(/last name/i).fill(seedTag);
  await page.getByRole("textbox", { name: "Email" }).fill(`bulk-del-${idx}-${Date.now()}@example.com`);
  // Pattern F: D12 role-cards — at least one type toggled on before Save is enabled
  await page.getByRole("switch", { name: /toggle player role/i }).check();
  await page.getByRole("button", { name: /create|save/i }).click();
  // #410-A: extend 5_000→10_000ms — create-contact dialog close can exceed 5s under
  // parallel chromium load (6 workers × 10 repeats competing for the same server).
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });
}

test.describe("Bulk delete contacts", () => {
  test("creates 3 contacts, bulk-deletes them, verifies in Trash", async ({ adminPage: page }) => {
    // #410-A: generate SEED_TAG inside the test to ensure each repeat-each run gets a
    // unique seed — module-level Math.random() is called once per worker, so repeat-each
    // runs within the same worker share the same seed and contaminate each other's rows.
    const SEED_TAG = `bulk-del-${Math.random().toString(36).slice(2, 10)}`;

    await page.goto("/admin/contacts");
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();

    // ---- Create 3 test contacts ----
    for (let i = 1; i <= 3; i++) {
      await createTestContact(page, i, SEED_TAG);
    }

    // Verify they appear in the list (filter by last name = SEED_TAG)
    await expect(page.getByText(`BulkDel1 ${SEED_TAG}`)).toBeVisible({ timeout: 5_000 });

    // ---- Select all 3 ----
    // Select checkboxes for rows containing the SEED_TAG last name
    const rows = page.locator("tr, [role=row]").filter({ hasText: SEED_TAG });
    const rowCount = await rows.count();

    // webkit #402-A: move mouse to corner before loop to deactivate any active RowActions
    // hover state. RowActions transitions to pointer-events-auto on hover — if a row is
    // still hovered from a previous action, its RowActions <div> can intercept the checkbox
    // click even with force:true (force bypasses Playwright actionability, not OS hit-tests).
    await page.mouse.move(0, 0);
    for (let i = 0; i < rowCount; i++) {
      // Scope to [data-slot="checkbox"] to avoid the duplicate RowActions <input[type=checkbox]>
      // webkit #402-A: waitFor({state:'visible'}) makes the actionability window deterministic
      // before webkit's pointer-event dispatch. force:true stays as defense-in-depth.
      // 200ms settle gap allows webkit's opacity transition to drain between iterations.
      const checkbox = rows.nth(i).locator("[data-slot='checkbox']");
      await checkbox.waitFor({ state: 'visible' });
      await checkbox.click({ force: true });
      await page.waitForTimeout(200);
    }

    // ---- Click Delete in bulk action bar ----
    // webkit #402-A: wait for the bulk-action bar "Delete" button to appear — it only renders
    // when selected.size > 0. This gates the bulk-delete click on the checkboxes having
    // actually registered. If checkboxes weren't checked (pointer-events race), this will
    // timeout rather than silently click a RowActions delete button.
    // #410-A: extend 5_000→10_000ms — checkbox registration can lag under load; give the
    // React state update more time to propagate before asserting the bulk-action bar appears.
    const bulkDeleteBtn = page.getByRole("button", { name: "Delete", exact: true });
    await bulkDeleteBtn.waitFor({ state: 'visible', timeout: 10_000 });
    // #410-A: toBeEnabled guard before click — bulk action "Delete" button can be visible
    // but still processing the React state update (selected.size) when chromium clicks it.
    await expect(bulkDeleteBtn).toBeEnabled();
    await bulkDeleteBtn.click({ force: true });

    // Confirm dialog
    // webkit #402-A: scope both the dialog wait and confirmBtn to the bulk-delete dialog
    // by its distinctive title, so stale contact-edit dialogs from prior incomplete runs
    // do not cause getByRole("dialog") to resolve to the wrong element.
    // #410-A: extend 3_000→5_000ms — bulk-delete confirmation dialog can be slow to
    // appear under parallel chromium load when the checkbox selection is close to the
    // registration boundary.
    const bulkDeleteDialog = page.getByRole("dialog").filter({ hasText: /soft-delete/i });
    // #410-A: extend 5_000→8_000ms — dialog open via button click can lag under parallel
    // chromium load when the bulk-action bar state stabilizes slowly.
    await expect(bulkDeleteDialog).toBeVisible({ timeout: 8_000 });
    const confirmBtn = bulkDeleteDialog.getByRole("button", { name: /delete/i });
    await expect(confirmBtn).toBeVisible({ timeout: 3_000 });
    // webkit: button resolves + is visible but click stalls at "performing click action";
    // toBeEnabled guard + force:true bypasses the webkit pointer-events timing race
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click({ force: true });

    // Wait for the confirm dialog to close first — signals handleBulkDelete started.
    // The dialog closes synchronously (setDeleteDialogOpen(false)) before the async
    // bulkDeleteContacts call resolves. We then wait for the contacts to disappear,
    // which happens after the async call + setContacts filter completes.
    // webkit #402-A: extend to 15_000ms — webkit's dialog close animation +
    // server-action round-trip can exceed 5_000ms on slower runs.
    await expect(bulkDeleteDialog).not.toBeVisible({ timeout: 15_000 });

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
