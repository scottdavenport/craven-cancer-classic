/**
 * Flow 4: Bulk delete contacts
 *
 * Requires: E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD + SUPABASE_SERVICE_ROLE_KEY in env
 * Skipped automatically when credentials are not configured.
 *
 * Seeds 3 test contacts via service-role insert (bypasses the slow UI create flow),
 * then bulk-deletes them and verifies they move to Trash. Setup time: <1s vs ~21s
 * for the prior UI-create path, keeping the spec well within its 30s test budget.
 */

import { test as baseTest, expect } from "@playwright/test";

baseTest.skip(
  !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
  "Skipped: set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E tests"
);

import { test } from "./fixtures/admin-auth";
import { cleanupTestData, serviceRoleClient } from "./fixtures/cleanup-helper";

// SEED_TAG is module-scoped so afterAll cleanup matches every row this spec creates,
// across attempts. RUN_ID below is per-test-invocation so Playwright retries don't
// collide with prior-attempt rows still in the DB.
const SEED_TAG = crypto.randomUUID().slice(0, 8);

test.afterAll(async () => {
  await cleanupTestData(SEED_TAG);
});

async function seedTestContacts(runId: string) {
  const rows = [1, 2, 3].map((i) => ({
    first_name: `BulkDel${i}`,
    last_name: runId,
    full_name: `BulkDel${i} ${runId}`,
    email: `e2e-${SEED_TAG}-${runId}-bulk-del-${i}@example.com`,
    types: ['player'],
    year_first_seen: new Date().getFullYear(),
    marketing_consent: false,
  }));
  const { error } = await serviceRoleClient.from('contacts').insert(rows);
  if (error) throw new Error(`seedTestContacts: ${error.message}`);
}

test.describe("Bulk delete contacts", () => {
  test("creates 3 contacts, bulk-deletes them, verifies in Trash", async ({ adminPage: page }) => {
    // RUN_ID is regenerated on every test invocation including Playwright retries —
    // ensures fixture last-name + email are unique per attempt so prior-attempt rows
    // don't collide with current-attempt assertions.
    const RUN_ID = crypto.randomUUID().slice(0, 8);

    // Seed contacts before navigating — page.goto's server-side getContacts() will
    // include the seeded rows in the initial render.
    await seedTestContacts(RUN_ID);

    await page.goto("/admin/contacts");
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();

    // Verify they appear in the list (filter by last name = RUN_ID)
    await expect(page.getByText(`BulkDel1 ${RUN_ID}`)).toBeVisible({ timeout: 5_000 });

    // ---- Select all 3 ----
    // Select checkboxes for rows containing the RUN_ID last name
    const rows = page.locator("tr, [role=row]").filter({ hasText: RUN_ID });
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
    const bulkDeleteBtn = page.getByRole("button", { name: "Delete", exact: true });
    await bulkDeleteBtn.waitFor({ state: 'visible', timeout: 10_000 });
    // toBeEnabled guard before click — bulk action "Delete" button can be visible
    // but still processing the React state update (selected.size) when chromium clicks it.
    await expect(bulkDeleteBtn).toBeEnabled();
    await bulkDeleteBtn.click({ force: true });

    // Confirm dialog
    // webkit #402-A: scope both the dialog wait and confirmBtn to the bulk-delete dialog
    // by its distinctive title, so stale contact-edit dialogs from prior incomplete runs
    // do not cause getByRole("dialog") to resolve to the wrong element.
    const bulkDeleteDialog = page.getByRole("dialog").filter({ hasText: /soft-delete/i });
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
    await expect(page.getByText(`BulkDel1 ${RUN_ID}`)).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`BulkDel2 ${RUN_ID}`)).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(`BulkDel3 ${RUN_ID}`)).not.toBeVisible({ timeout: 5_000 });

    // ---- Navigate to Trash → Contacts tab ----
    await page.goto("/admin/trash");
    const contactsTab = page.getByRole("tab", { name: /contacts/i });
    if (await contactsTab.isVisible()) {
      await contactsTab.click();
    }

    // All 3 contacts present in Trash
    await expect(page.getByText(`BulkDel1 ${RUN_ID}`)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(`BulkDel2 ${RUN_ID}`)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(`BulkDel3 ${RUN_ID}`)).toBeVisible({ timeout: 5_000 });
  });
});
