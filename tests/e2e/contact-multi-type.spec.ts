/**
 * Sprint 31 (RED): Contact multi-type E2E tests
 *
 * Tests the new multi-type form: 5 checkboxes, conditional sections,
 * save-disabled discipline, type-uncheck value preservation.
 *
 * Requires: E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD in env
 * Skipped automatically when credentials are not configured.
 *
 * FAILING on unmodified main because:
 * - The form has a single Type dropdown, not 5 checkboxes
 * - 'volunteer' is not a valid type at all
 * - show_on_wall / recognition_name fields do not exist
 * - shirt_size / handicap are not in the form
 * - Save button is never disabled in the current form
 * - The edit UI is a centered modal (Dialog), not a side drawer
 */

import { test as baseTest, expect, type Page } from "@playwright/test";

baseTest.skip(
  !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
  "Skipped: set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E tests"
);

import { test } from "./fixtures/admin-auth";

const TIMESTAMP = Date.now();

// ---------------------------------------------------------------------------
// Helpers — use Page type from Playwright directly
// ---------------------------------------------------------------------------
async function openAddContactModal(page: Page) {
  await page.goto("/admin/contacts");
  await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();
  await page.getByRole("button", { name: /new contact/i }).click();
  // Sprint 31: centered modal (Dialog), not side drawer (Sheet)
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
}

async function fillBasicFields(
  page: Page,
  opts: { firstName: string; lastName: string; email: string }
) {
  await page.getByLabel(/first name/i).fill(opts.firstName);
  await page.getByLabel(/last name/i).fill(opts.lastName);
  await page.getByRole("textbox", { name: "Email" }).fill(opts.email);
}

async function softDeleteContact(page: Page, fullName: string) {
  const row = page.getByRole("row").filter({ hasText: fullName });
  if (await row.isVisible({ timeout: 2_000 }).catch(() => false)) {
    // D12: row click does NOT open modal — edit via RowActions pencil button
    await row.hover();
    await row.getByRole("button", { name: /^Edit/i }).click({ force: true });
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });
    const deleteBtn = page.getByRole("button", { name: /delete/i });
    if (await deleteBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await deleteBtn.click();
      const confirmBtn = page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true });
      if (await confirmBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await confirmBtn.click();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Test 1: Multi-type select — Player + Sponsor chips show on list
// ---------------------------------------------------------------------------

test.describe("Sprint 31 — multi-type form (Contact create/edit)", () => {
  test("checks Player + Sponsor, saves, list shows both type chips", async ({ adminPage: page }) => {
    const multiTypeEmail = `e2e-multi-type-${TIMESTAMP}@example.com`;
    await openAddContactModal(page);
    await fillBasicFields(page, {
      firstName: "Multi",
      lastName: "TypeTest",
      email: multiTypeEmail,
    });

    // D12: role-cards with Switch toggles instead of checkboxes
    await page.getByRole("switch", { name: /toggle player role/i }).check();
    await page.getByRole("switch", { name: /toggle sponsor role/i }).check();

    // Create button must be enabled (≥1 type checked)
    await expect(page.getByRole("button", { name: "Create", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Create", exact: true }).click();

    // Modal closes
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // Scope to the email-based row to avoid strict-mode collision with prior-run orphans
    const contactRow = page.getByRole("row").filter({ hasText: multiTypeEmail });
    await expect(contactRow.getByText(/player/i)).toBeVisible();
    await expect(contactRow.getByText(/sponsor/i)).toBeVisible();

    await softDeleteContact(page, multiTypeEmail);
  });

  // ---------------------------------------------------------------------------
  // Test 2: Volunteer alone — Shirt Size appears, Handicap does NOT
  // ---------------------------------------------------------------------------

  test("checks Volunteer only — Shirt Size section visible, Handicap section NOT visible", async ({ adminPage: page }) => {
    const volunteerEmail = `e2e-volunteer-${TIMESTAMP}@example.com`;
    await openAddContactModal(page);
    await fillBasicFields(page, {
      firstName: "Val",
      lastName: "VolunteerTest",
      email: volunteerEmail,
    });

    // Check Volunteer only (not Player)
    await page.getByRole("switch", { name: /toggle volunteer role/i }).check();

    // Sprint 31 contract: Shirt Size section appears when Volunteer OR Player is checked
    await expect(page.getByLabel(/shirt size/i)).toBeVisible();

    // Handicap is Player-ONLY — must NOT be visible when only Volunteer is checked.
    // Scope to dialog to avoid strict-mode collision with "Select Handicap Boundary" row checkbox.
    await expect(page.getByRole("dialog").getByRole("spinbutton", { name: /handicap/i })).not.toBeVisible();

    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    await softDeleteContact(page, volunteerEmail);
  });

  // ---------------------------------------------------------------------------
  // Test 3: Player + Volunteer — ONE Shirt Size field (not duplicated)
  // ---------------------------------------------------------------------------

  test("Player + Volunteer checked — only one Shirt Size field is rendered", async ({ adminPage: page }) => {
    const playerVolEmail = `e2e-player-vol-${TIMESTAMP}@example.com`;
    await openAddContactModal(page);
    await fillBasicFields(page, {
      firstName: "PVol",
      lastName: "SharedShirt",
      email: playerVolEmail,
    });

    await page.getByRole("switch", { name: /toggle player role/i }).check();
    await page.getByRole("switch", { name: /toggle volunteer role/i }).check();

    // Both Player and Volunteer are checked — Shirt Size is shared.
    // There must be exactly ONE shirt size field (not two).
    const shirtSizeFields = page.getByLabel(/shirt size/i);
    await expect(shirtSizeFields).toHaveCount(1);

    // Handicap IS visible because Player is checked — scope to dialog
    await expect(page.getByRole("dialog").getByRole("spinbutton", { name: /handicap/i })).toBeVisible();

    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    await softDeleteContact(page, playerVolEmail);
  });

  // ---------------------------------------------------------------------------
  // Test 4: Donor section — show_on_wall default ON, recognition_name visible
  // ---------------------------------------------------------------------------

  test("Donor checked — show-on-wall toggle is ON by default, recognition name visible", async ({ adminPage: page }) => {
    await openAddContactModal(page);
    await fillBasicFields(page, {
      firstName: "Don",
      lastName: "DonorWall",
      email: `e2e-donor-${TIMESTAMP}@example.com`,
    });

    await page.getByRole("switch", { name: /toggle donor role/i }).check();

    // show_on_wall toggle — must be checked/ON by default
    const wallToggle = page
      .getByRole("switch", { name: /show name on tribute wall/i })
      .or(page.getByRole("checkbox", { name: /show name on tribute wall/i }));
    await expect(wallToggle).toBeVisible();
    await expect(wallToggle).toBeChecked();

    // Uncheck it
    await wallToggle.uncheck();
    await expect(wallToggle).not.toBeChecked();

    // Recognition name field is ALWAYS visible in Donor section
    const recognitionNameField = page
      .getByLabel(/recognition name/i)
      .or(page.getByPlaceholder(/recognition name/i));
    await expect(recognitionNameField).toBeVisible();

    await recognitionNameField.fill("The DonorWall Family");

    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    await softDeleteContact(page, "Don DonorWall");
  });

  // ---------------------------------------------------------------------------
  // Test 5: Recognition name blank + show_on_wall true → empty string acceptable
  // ---------------------------------------------------------------------------

  test("recognition_name blank, show_on_wall true — saves with empty recognition_name", async ({ adminPage: page }) => {
    const blankRecogEmail = `e2e-blank-recog-${TIMESTAMP}@example.com`;
    await openAddContactModal(page);
    await fillBasicFields(page, {
      firstName: "Blank",
      lastName: "RecogTest",
      email: blankRecogEmail,
    });

    await page.getByRole("switch", { name: /toggle donor role/i }).check();

    // Leave recognition_name blank, keep show_on_wall toggled ON (default)
    const wallToggle = page
      .getByRole("switch", { name: /show name on tribute wall/i })
      .or(page.getByRole("checkbox", { name: /show name on tribute wall/i }));
    await expect(wallToggle).toBeChecked();

    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // Scope to email-based row to avoid strict-mode collision with prior-run orphans
    const blankRecogRow = page.getByRole("row").filter({ hasText: blankRecogEmail });
    await expect(blankRecogRow).toBeVisible();

    // Re-open and verify recognition_name is empty string
    // D12: row click does NOT open modal — edit via RowActions pencil button
    await blankRecogRow.hover();
    await blankRecogRow.getByRole("button", { name: /^Edit/i }).click({ force: true });
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });

    const recognitionNameField = page
      .getByLabel(/recognition name/i)
      .or(page.getByPlaceholder(/recognition name/i));
    const val = await recognitionNameField.inputValue();
    expect(val).toBe("");

    await page.keyboard.press("Escape");
    await softDeleteContact(page, blankRecogEmail);
  });

  // ---------------------------------------------------------------------------
  // Test 6: Save-disabled discipline
  // ---------------------------------------------------------------------------

  test("Save button is disabled with no types checked, enabled after first type checked", async ({ adminPage: page }) => {
    await openAddContactModal(page);
    await fillBasicFields(page, {
      firstName: "Savegate",
      lastName: "Test",
      email: `e2e-savegate-${TIMESTAMP}@example.com`,
    });

    // No type selected yet — Create must be disabled
    await expect(page.getByRole("button", { name: "Create", exact: true })).toBeDisabled();

    // Toggle one type on
    await page.getByRole("switch", { name: /toggle player role/i }).check();

    // Now Create must be enabled
    await expect(page.getByRole("button", { name: "Create", exact: true })).toBeEnabled();

    // Toggle it off — Create must go back to disabled
    await page.getByRole("switch", { name: /toggle player role/i }).uncheck();
    await expect(page.getByRole("button", { name: "Create", exact: true })).toBeDisabled();

    // Close without saving
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3_000 });
  });

  // ---------------------------------------------------------------------------
  // Test 7: Type-uncheck value preservation (UI round-trip)
  // ---------------------------------------------------------------------------

  test("uncheck Player, re-check Player — Handicap and Shirt Size restore from DB", async ({ adminPage: page }) => {
    const PRESERVE_FULL = "Preserve Player";

    // Create contact with Player type, handicap=12, shirt_size=L
    await openAddContactModal(page);
    await fillBasicFields(page, {
      firstName: "Preserve",
      lastName: "Player",
      email: `e2e-preserve-${TIMESTAMP}@example.com`,
    });

    await page.getByRole("switch", { name: /toggle player role/i }).check();

    // Fill handicap — scope to dialog to avoid strict-mode collision with
    // row-selection checkboxes labeled "Select Handicap Boundary" in the list
    await page.getByRole("dialog").getByRole("spinbutton", { name: /handicap/i }).fill("12");

    // Fill shirt size
    const shirtSizeSelect = page
      .getByRole("combobox", { name: /shirt size/i })
      .or(page.getByTestId("shirt-size-select"));
    await shirtSizeSelect.click();
    await page.getByRole("option", { name: /^L$/i }).click();

    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // Scope re-opens to the timestamped email row to avoid strict-mode collisions
    // from prior runs leaving "Preserve Player" contacts in the list.
    const preserveEmail = `e2e-preserve-${TIMESTAMP}@example.com`;
    const preserveRow = page.getByRole("row").filter({ hasText: preserveEmail });

    // Re-open and uncheck Player
    // D12: row click does NOT open modal — edit via RowActions pencil button
    await preserveRow.hover();
    await preserveRow.getByRole("button", { name: /^Edit/i }).click({ force: true });
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });

    await page.getByRole("switch", { name: /toggle player role/i }).uncheck();
    await expect(page.getByRole("dialog").getByRole("spinbutton", { name: /handicap/i })).not.toBeVisible();

    // Toggle another type on so Save is enabled
    await page.getByRole("switch", { name: /toggle donor role/i }).check();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // Re-open and re-check Player — values must restore
    await preserveRow.hover();
    await preserveRow.getByRole("button", { name: /^Edit/i }).click({ force: true });
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });

    await page.getByRole("switch", { name: /toggle player role/i }).check();

    // Handicap must show 12 — scope to dialog to avoid collision with row checkboxes
    await expect(page.getByRole("dialog").getByRole("spinbutton", { name: /handicap/i })).toHaveValue("12");

    // Shirt Size must show L
    const shirtSizeValue = page
      .getByTestId("shirt-size-select")
      .or(page.getByRole("combobox", { name: /shirt size/i }));
    const shirtText = (await shirtSizeValue.textContent())?.trim();
    // textContent includes the chevron icon glyph; trim and match on leading "L"
    expect(shirtText).toMatch(/^L/i);

    await page.keyboard.press("Escape");
    // Clean up using the email-scoped row to avoid strict-mode collision with
    // any prior-run "Preserve Player" orphans
    await softDeleteContact(page, preserveEmail);
  });

  // ---------------------------------------------------------------------------
  // Test 8: Volunteer round-trip
  // ---------------------------------------------------------------------------

  test("save with types: ['volunteer'] — round-trips through the modal", async ({ adminPage: page }) => {
    const volEmail = `e2e-vol-rt-${TIMESTAMP}@example.com`;

    await openAddContactModal(page);
    await fillBasicFields(page, {
      firstName: "VolRound",
      lastName: "Trip",
      email: volEmail,
    });

    await page.getByRole("switch", { name: /toggle volunteer role/i }).check();
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // Scope to email-based row to avoid strict-mode collision with prior-run orphans
    const contactRow = page.getByRole("row").filter({ hasText: volEmail });
    await expect(contactRow).toBeVisible();

    // Verify chip shows volunteer in the list
    const volunteerChip = contactRow.getByText(/volunteer/i);
    await expect(volunteerChip).toBeVisible();

    // Amendment #12: Volunteer chip uses the amber/warning design token.
    // Pin the contract so a builder can't ship `bg-pink-100` and pass.
    // Project convention (per feedback_bolt_no_inline_dups): use the canonical
    // `bg-warning-muted text-warning` design token; raw Tailwind `bg-amber-*`
    // is a fallback only when no token exists.
    const chipClassName = await volunteerChip.evaluate((el) => el.className);
    expect(chipClassName).toMatch(/warning|amber/i);

    // Re-open and verify Volunteer switch is still on
    // D12: row click does NOT open modal — edit via RowActions pencil button
    await contactRow.hover();
    await contactRow.getByRole("button", { name: /^Edit/i }).click({ force: true });
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });
    await expect(page.getByRole("switch", { name: /toggle volunteer role/i })).toBeChecked();

    await page.keyboard.press("Escape");
    await softDeleteContact(page, volEmail);
  });

  // ---------------------------------------------------------------------------
  // Test 9: Player + Sponsor round-trip
  // ---------------------------------------------------------------------------

  test("save with types: ['player', 'sponsor'] — round-trips through the modal", async ({ adminPage: page }) => {
    const psEmail = `e2e-ps-rt-${TIMESTAMP}@example.com`;

    await openAddContactModal(page);
    await fillBasicFields(page, {
      firstName: "PlayerSpon",
      lastName: "Roundtrip",
      email: psEmail,
    });

    await page.getByRole("switch", { name: /toggle player role/i }).check();
    await page.getByRole("switch", { name: /toggle sponsor role/i }).check();

    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // Scope to email-based row to avoid strict-mode collision with prior-run orphans
    const psRow = page.getByRole("row").filter({ hasText: psEmail });
    await expect(psRow).toBeVisible();

    // Re-open and verify both switches are on
    // D12: row click does NOT open modal — edit via RowActions pencil button
    await psRow.hover();
    await psRow.getByRole("button", { name: /^Edit/i }).click({ force: true });
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });

    await expect(page.getByRole("switch", { name: /toggle player role/i })).toBeChecked();
    await expect(page.getByRole("switch", { name: /toggle sponsor role/i })).toBeChecked();

    await page.keyboard.press("Escape");
    await softDeleteContact(page, psEmail);
  });

  // ---------------------------------------------------------------------------
  // Test 10: Shirt Size dropdown vocabulary (amendment #1)
  // ---------------------------------------------------------------------------

  test("Shirt Size dropdown contains exactly S, M, L, XL, 2XL, 3XL — XS / XXL / 4XL not present", async ({
    adminPage: page,
  }) => {
    await openAddContactModal(page);
    await fillBasicFields(page, {
      firstName: "ShirtVocab",
      lastName: "Test",
      email: `e2e-shirt-vocab-${TIMESTAMP}@example.com`,
    });

    await page.getByRole("switch", { name: /toggle player role/i }).check();
    const shirtSelect = page.getByRole("combobox", { name: /shirt size/i });
    await shirtSelect.click();

    // Each of the 6 valid sizes must be a selectable option.
    for (const size of ["S", "M", "L", "XL", "2XL", "3XL"]) {
      await expect(
        page.getByRole("option", { name: new RegExp(`^${size}$`, "i") })
      ).toBeVisible();
    }

    // Common-but-wrong sizes must NOT be in the list.
    for (const bad of ["XS", "XXL", "4XL"]) {
      await expect(
        page.getByRole("option", { name: new RegExp(`^${bad}$`, "i") })
      ).not.toBeVisible();
    }

    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
  });

  // ---------------------------------------------------------------------------
  // Test 11: Handicap range boundaries (amendment #2)
  // ---------------------------------------------------------------------------

  test("Handicap accepts 0, 54, blank — rejects 55 and -1", async ({ adminPage: page }) => {
    const hcEmail = `e2e-handicap-${TIMESTAMP}@example.com`;
    // Use dialog-scoped spinbutton to avoid collision with row checkboxes labeled
    // "Select Handicap Boundary" from prior-run orphan contacts in the list.
    const dialogHandicapInput = page.getByRole("dialog").getByRole("spinbutton", { name: /handicap/i });

    await openAddContactModal(page);
    await fillBasicFields(page, {
      firstName: "Handicap",
      lastName: "Boundary",
      email: hcEmail,
    });

    await page.getByRole("switch", { name: /toggle player role/i }).check();

    // Lower bound: 0 must save cleanly.
    await dialogHandicapInput.fill("0");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // Scope to email-based row to avoid strict-mode collision with prior-run orphans
    const hcRow = page.getByRole("row").filter({ hasText: hcEmail });
    await expect(hcRow).toBeVisible();

    // Re-open and update through the range.
    // D12: row click does NOT open modal — edit via RowActions pencil button
    await hcRow.hover();
    await hcRow.getByRole("button", { name: /^Edit/i }).click({ force: true });
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });

    // Upper bound: 54 must save cleanly.
    await dialogHandicapInput.fill("54");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // Out-of-range upper: 55 must surface a validation error and NOT save.
    await hcRow.hover();
    await hcRow.getByRole("button", { name: /^Edit/i }).click({ force: true });
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });
    await dialogHandicapInput.fill("55");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    // Either client-side validation prevents close, or server rejects + dialog stays.
    // Contract: dialog should still be open OR an error message references 0–54.
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 2_000 });

    // Out-of-range lower: -1 must also be rejected.
    await dialogHandicapInput.fill("-1");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 2_000 });

    // Blank handicap must be acceptable (clear back to blank, save with 0 instead to close).
    await dialogHandicapInput.fill("");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    await softDeleteContact(page, hcEmail);
  });
});
