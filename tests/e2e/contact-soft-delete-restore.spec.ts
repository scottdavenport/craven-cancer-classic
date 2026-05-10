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

test.describe("Contact soft-delete and restore", () => {
  test("soft-deletes a contact, finds it in Trash, restores it", async ({ adminPage: page }) => {
    // #410-C: generate per-test unique identifiers inside the test — module-level Date.now()
    // is computed once per worker, so repeat-each runs within the same worker share the same
    // email and collide (duplicate email on create, or pick up a prior run's contact in Trash).
    const TS = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const TEST_EMAIL = `e2e-restore-${TS}@example.com`;
    const TEST_LAST = `Restore${TS}`;
    const TEST_FULL_NAME = `E2ERestore ${TEST_LAST}`;

    // ---- Step 1: Create test contact ----
    await page.goto("/admin/contacts");
    await page.getByRole("button", { name: /new contact/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel(/first name/i).fill("E2ERestore");
    await page.getByLabel(/last name/i).fill(TEST_LAST);
    await page.getByRole("textbox", { name: "Email" }).fill(TEST_EMAIL);
    // Pattern F: D12 role-cards — at least one type toggled on before Save is enabled
    await page.getByRole("switch", { name: /toggle player role/i }).check();
    await page.getByRole("button", { name: /create|save/i }).click();
    // #410-C: extend 5_000→10_000ms — create-contact dialog close can exceed 5s under
    // parallel chromium load (6 workers × 10 repeats competing for the same server).
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });

    // ---- Step 2: Delete the contact ----
    // Find the row by email, open edit modal via RowActions pencil button.
    // D12: row click does NOT open modal — edit via RowActions pencil button.
    const deleteTargetRow = page.getByRole("row").filter({ hasText: TEST_EMAIL });
    // webkit: hover stalls at stability wait; force:true bypasses.
    // #410-C: hover the row, then use force:true on the Edit button click. The RowActions
    // edit button is pointer-events-none until hover; force:true bypasses the actionability
    // check and dispatches the click even if the CSS transition hasn't fully completed.
    // NOTE: if this still flakes in CI at high concurrency, the root cause is source-side —
    // the RowActions hover-reveal pattern is inherently fragile at high browser load.
    // A follow-up Bolt issue (#410-source-bolt) tracks adding a non-hover edit access path.
    await deleteTargetRow.hover({ force: true });
    await deleteTargetRow.getByRole("button", { name: /^Edit/i }).click({ force: true });
    const editDialog = page.getByRole("dialog");
    await expect(editDialog).toBeVisible({ timeout: 10_000 });
    // #410-C: scope delete button to the open dialog — page.getByRole("button", { name: /delete/i })
    // matches 1000+ RowActions delete buttons on the page (strict mode violation). Scoping to
    // editDialog.getByRole() restricts the search to the modal DOM subtree.
    // webkit: modal button stalls at "performing click action"; force:true bypasses
    await editDialog.getByRole("button", { name: /delete/i }).click({ force: true });

    // Handle confirmation if present
    // ConfirmDialog uses confirmLabel="Delete" — match exactly to avoid "Delete contact"
    const confirmBtn = page.getByRole("button", { name: "Delete", exact: true });
    if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmBtn.click({ force: true });
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

    // Test contact should appear in Trash (Trash shows name, not email)
    await expect(page.getByText(TEST_FULL_NAME)).toBeVisible({ timeout: 5_000 });

    // ---- Step 4: Restore the contact ----
    const contactRow = page.locator(`tr, li, [data-testid="trash-row"]`).filter({
      hasText: TEST_FULL_NAME,
    });
    // #410-C: waitFor({state:'visible'}) makes restore button actionability deterministic
    // before click — guards against the Trash row rendering before the button is interactive.
    await contactRow.getByRole("button", { name: /restore/i }).waitFor({ state: 'visible' });
    await contactRow.getByRole("button", { name: /restore/i }).click();

    // Toast confirmation
    // #410-C: extend timeout 5_000→10_000ms — restore server action + toast render can exceed
    // 5s under parallel chromium load.
    await expect(page.getByText(/restored|success/i)).toBeVisible({ timeout: 10_000 });

    // Contact disappears from Trash
    await expect(page.getByText(TEST_FULL_NAME)).not.toBeVisible({ timeout: 5_000 });

    // ---- Step 5: Verify contact is back in contacts list ----
    await page.goto("/admin/contacts");
    await expect(page.getByText(TEST_EMAIL)).toBeVisible({ timeout: 5_000 });

    // ---- Cleanup: soft-delete again ----
    // D12: row click does NOT open modal — edit via RowActions pencil button
    const cleanupRow = page.getByRole("row").filter({ hasText: TEST_EMAIL });
    // webkit: hover stalls at stability wait; force:true bypasses
    await cleanupRow.hover({ force: true });
    await cleanupRow.getByRole("button", { name: /^Edit/i }).click({ force: true });
    const cleanupDialog = page.getByRole("dialog");
    await expect(cleanupDialog).toBeVisible();
    // #410-C: scope delete button to the open dialog (same strict mode fix as Step 2 above)
    // webkit: modal button stalls at "performing click action"; force:true bypasses
    await cleanupDialog.getByRole("button", { name: /delete/i }).click({ force: true });
    const cleanup = page.getByRole("button", { name: "Delete", exact: true });
    if (await cleanup.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await cleanup.click({ force: true });
    }
  });
});
