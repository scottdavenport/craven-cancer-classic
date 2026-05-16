/**
 * Flow 1: Contact create + edit via centered modal
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
import { cleanupTestData } from "./fixtures/cleanup-helper";

const SEED_TAG = crypto.randomUUID().slice(0, 8);
const TEST_EMAIL = `e2e-${SEED_TAG}-contact-create@example.com`;

test.afterAll(async () => {
  await cleanupTestData(SEED_TAG);
});

test.describe("Contact create/edit via modal", () => {
  test("creates a new contact, edits it, then soft-deletes it", async ({ adminPage: page }) => {
    // ---- Navigate to contacts ----
    await page.goto("/admin/contacts");
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();

    // ---- Open new contact modal ----
    await page.getByRole("button", { name: /new contact/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // ---- Fill in the form ----
    await page.getByLabel(/first name/i).fill("E2EFirst");
    await page.getByLabel(/last name/i).fill("E2ELast");
    await page.getByRole("textbox", { name: "Email" }).fill(TEST_EMAIL);

    // Set type to donor (D12: role-card Switch toggle)
    await page.getByRole("switch", { name: /toggle donor role/i }).check();

    // ---- Save ----
    await page.getByRole("button", { name: "Create", exact: true }).click();

    // Drawer should close and toast should appear
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/contact created|saved/i)).toBeVisible({ timeout: 5_000 });

    // New contact visible in list — locate by unique email since name may collide with prior runs
    const newRow = page.getByRole("row", { name: new RegExp(TEST_EMAIL) });
    await expect(newRow).toBeVisible();

    // ---- Edit the contact ----
    // D12: row click does NOT open modal — edit via RowActions pencil button.
    // RowActions cluster is opacity-0 until hover; force:true bypasses visibility constraint.
    await newRow.hover();
    await newRow.getByRole("button", { name: /^Edit/i }).click({ force: true });
    await expect(page.getByRole("dialog")).toBeVisible();

    // Verify values pre-filled
    await expect(page.getByLabel(/first name/i)).toHaveValue("E2EFirst");
    await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue(TEST_EMAIL);

    // Change type from donor to sponsor (D12: role-card Switch toggles)
    await page.getByRole("switch", { name: /toggle donor role/i }).uncheck();
    await page.getByRole("switch", { name: /toggle sponsor role/i }).check();

    await page.getByRole("button", { name: "Save", exact: true }).click();
    // webkit: modal close animation + form submission takes longer than chromium;
    // 5_000 was too tight and left the dialog open, blocking the subsequent hover.
    // 10_000 accommodates webkit's slower close path.
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/saved|updated/i)).toBeVisible({ timeout: 5_000 });

    // ---- Cleanup: soft-delete the test contact ----
    // Scope to the specific row by TEST_EMAIL so leftover contacts from prior runs don't confuse the locator
    const testRow = page.getByRole("row", { name: new RegExp(TEST_EMAIL) });
    // D12: row click does NOT open modal — edit via RowActions pencil button
    await testRow.hover();
    await testRow.getByRole("button", { name: /^Edit/i }).click({ force: true });
    await expect(page.getByRole("dialog")).toBeVisible();
    // webkit: button inside modal may stall at "performing click action"; force:true bypasses
    await page.getByRole("button", { name: /delete/i }).click({ force: true });

    // Confirm the delete — ConfirmDialog renders confirmLabel="Delete" (exact text, not "Delete contact")
    const confirmBtn = page.getByRole("button", { name: "Delete", exact: true });
    await expect(confirmBtn).toBeVisible({ timeout: 3_000 });
    await confirmBtn.click({ force: true });

    // Verify this specific row is gone (scoped by unique email, not the shared name)
    await expect(testRow).not.toBeVisible({ timeout: 5_000 });
  });
});
