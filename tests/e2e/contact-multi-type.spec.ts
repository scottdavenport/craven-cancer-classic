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
 * - The edit UI is a side drawer, not a centered modal
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
  await page.getByLabel(/email/i).fill(opts.email);
}

async function softDeleteContact(page: Page, fullName: string) {
  const row = page.getByRole("row").filter({ hasText: fullName });
  if (await row.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await row.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });
    const deleteBtn = page.getByRole("button", { name: /delete/i });
    if (await deleteBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await deleteBtn.click();
      const confirmBtn = page.getByRole("button", { name: /confirm|yes/i });
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
    await openAddContactModal(page);
    await fillBasicFields(page, {
      firstName: "Multi",
      lastName: "TypeTest",
      email: `e2e-multi-type-${TIMESTAMP}@example.com`,
    });

    // Sprint 31: checkboxes instead of dropdown
    await page.getByRole("checkbox", { name: /^player$/i }).check();
    await page.getByRole("checkbox", { name: /^sponsor$/i }).check();

    // Save button must be enabled (≥1 type checked)
    await expect(page.getByRole("button", { name: /save/i })).toBeEnabled();
    await page.getByRole("button", { name: /save/i }).click();

    // Modal closes
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // Both chips visible on the contact row
    const contactRow = page.getByRole("row").filter({ hasText: "Multi TypeTest" });
    await expect(contactRow.getByText(/player/i)).toBeVisible();
    await expect(contactRow.getByText(/sponsor/i)).toBeVisible();

    await softDeleteContact(page, "Multi TypeTest");
  });

  // ---------------------------------------------------------------------------
  // Test 2: Volunteer alone — Shirt Size appears, Handicap does NOT
  // ---------------------------------------------------------------------------

  test("checks Volunteer only — Shirt Size section visible, Handicap section NOT visible", async ({ adminPage: page }) => {
    await openAddContactModal(page);
    await fillBasicFields(page, {
      firstName: "Val",
      lastName: "VolunteerTest",
      email: `e2e-volunteer-${TIMESTAMP}@example.com`,
    });

    // Check Volunteer only (not Player)
    await page.getByRole("checkbox", { name: /^volunteer$/i }).check();

    // Sprint 31 contract: Shirt Size section appears when Volunteer OR Player is checked
    await expect(page.getByLabel(/shirt size/i)).toBeVisible();

    // Handicap is Player-ONLY — must NOT be visible when only Volunteer is checked
    await expect(page.getByLabel(/handicap/i)).not.toBeVisible();

    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    await softDeleteContact(page, "Val VolunteerTest");
  });

  // ---------------------------------------------------------------------------
  // Test 3: Player + Volunteer — ONE Shirt Size field (not duplicated)
  // ---------------------------------------------------------------------------

  test("Player + Volunteer checked — only one Shirt Size field is rendered", async ({ adminPage: page }) => {
    await openAddContactModal(page);
    await fillBasicFields(page, {
      firstName: "PVol",
      lastName: "SharedShirt",
      email: `e2e-player-vol-${TIMESTAMP}@example.com`,
    });

    await page.getByRole("checkbox", { name: /^player$/i }).check();
    await page.getByRole("checkbox", { name: /^volunteer$/i }).check();

    // Both Player and Volunteer are checked — Shirt Size is shared.
    // There must be exactly ONE shirt size field (not two).
    const shirtSizeFields = page.getByLabel(/shirt size/i);
    await expect(shirtSizeFields).toHaveCount(1);

    // Handicap IS visible because Player is checked
    await expect(page.getByLabel(/handicap/i)).toBeVisible();

    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    await softDeleteContact(page, "PVol SharedShirt");
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

    await page.getByRole("checkbox", { name: /^donor$/i }).check();

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

    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    await softDeleteContact(page, "Don DonorWall");
  });

  // ---------------------------------------------------------------------------
  // Test 5: Recognition name blank + show_on_wall true → empty string acceptable
  // ---------------------------------------------------------------------------

  test("recognition_name blank, show_on_wall true — saves with empty recognition_name", async ({ adminPage: page }) => {
    await openAddContactModal(page);
    await fillBasicFields(page, {
      firstName: "Blank",
      lastName: "RecogTest",
      email: `e2e-blank-recog-${TIMESTAMP}@example.com`,
    });

    await page.getByRole("checkbox", { name: /^donor$/i }).check();

    // Leave recognition_name blank, keep show_on_wall toggled ON (default)
    const wallToggle = page
      .getByRole("switch", { name: /show name on tribute wall/i })
      .or(page.getByRole("checkbox", { name: /show name on tribute wall/i }));
    await expect(wallToggle).toBeChecked();

    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // Contact appears in list (save succeeded)
    await expect(page.getByText("Blank RecogTest")).toBeVisible();

    // Re-open and verify recognition_name is empty string
    await page.getByText("Blank RecogTest").click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });

    const recognitionNameField = page
      .getByLabel(/recognition name/i)
      .or(page.getByPlaceholder(/recognition name/i));
    const val = await recognitionNameField.inputValue();
    expect(val).toBe("");

    await page.keyboard.press("Escape");
    await softDeleteContact(page, "Blank RecogTest");
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

    // No type selected yet — Save must be disabled
    await expect(page.getByRole("button", { name: /save/i })).toBeDisabled();

    // Check one type
    await page.getByRole("checkbox", { name: /^player$/i }).check();

    // Now Save must be enabled
    await expect(page.getByRole("button", { name: /save/i })).toBeEnabled();

    // Uncheck it — Save must go back to disabled
    await page.getByRole("checkbox", { name: /^player$/i }).uncheck();
    await expect(page.getByRole("button", { name: /save/i })).toBeDisabled();

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

    await page.getByRole("checkbox", { name: /^player$/i }).check();

    // Fill handicap
    await page.getByLabel(/handicap/i).fill("12");

    // Fill shirt size
    const shirtSizeSelect = page
      .getByRole("combobox", { name: /shirt size/i })
      .or(page.getByTestId("shirt-size-select"));
    await shirtSizeSelect.click();
    await page.getByRole("option", { name: /^L$/i }).click();

    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // Re-open and uncheck Player
    await page.getByText(PRESERVE_FULL).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });

    await page.getByRole("checkbox", { name: /^player$/i }).uncheck();
    await expect(page.getByLabel(/handicap/i)).not.toBeVisible();

    // Check another type so Save is enabled
    await page.getByRole("checkbox", { name: /^donor$/i }).check();
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // Re-open and re-check Player — values must restore
    await page.getByText(PRESERVE_FULL).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });

    await page.getByRole("checkbox", { name: /^player$/i }).check();

    // Handicap must show 12
    await expect(page.getByLabel(/handicap/i)).toHaveValue("12");

    // Shirt Size must show L
    const shirtSizeValue = page
      .getByTestId("shirt-size-select")
      .or(page.getByRole("combobox", { name: /shirt size/i }));
    const shirtText = await shirtSizeValue.textContent();
    expect(shirtText).toMatch(/^L$/i);

    await page.keyboard.press("Escape");
    await softDeleteContact(page, PRESERVE_FULL);
  });

  // ---------------------------------------------------------------------------
  // Test 8: Volunteer round-trip
  // ---------------------------------------------------------------------------

  test("save with types: ['volunteer'] — round-trips through the modal", async ({ adminPage: page }) => {
    const VOL_FULL = "VolRound Trip";

    await openAddContactModal(page);
    await fillBasicFields(page, {
      firstName: "VolRound",
      lastName: "Trip",
      email: `e2e-vol-rt-${TIMESTAMP}@example.com`,
    });

    await page.getByRole("checkbox", { name: /^volunteer$/i }).check();
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // Contact appears in list
    await expect(page.getByText(VOL_FULL)).toBeVisible();

    // Verify chip shows volunteer in the list
    const contactRow = page.getByRole("row").filter({ hasText: VOL_FULL });
    const volunteerChip = contactRow.getByText(/volunteer/i);
    await expect(volunteerChip).toBeVisible();

    // Amendment #12: Volunteer chip color = amber (design-token or raw Tailwind).
    // Pin the contract so a builder can't ship `bg-pink-100` and pass.
    const chipClassName = await volunteerChip.evaluate((el) => el.className);
    expect(chipClassName).toMatch(/amber/i);

    // Re-open and verify Volunteer checkbox is still checked
    await contactRow.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });
    await expect(page.getByRole("checkbox", { name: /^volunteer$/i })).toBeChecked();

    await page.keyboard.press("Escape");
    await softDeleteContact(page, VOL_FULL);
  });

  // ---------------------------------------------------------------------------
  // Test 9: Player + Sponsor round-trip
  // ---------------------------------------------------------------------------

  test("save with types: ['player', 'sponsor'] — round-trips through the modal", async ({ adminPage: page }) => {
    const PS_FULL = "PlayerSpon Roundtrip";

    await openAddContactModal(page);
    await fillBasicFields(page, {
      firstName: "PlayerSpon",
      lastName: "Roundtrip",
      email: `e2e-ps-rt-${TIMESTAMP}@example.com`,
    });

    await page.getByRole("checkbox", { name: /^player$/i }).check();
    await page.getByRole("checkbox", { name: /^sponsor$/i }).check();

    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    await expect(page.getByText(PS_FULL)).toBeVisible();

    // Re-open and verify both checkboxes are checked
    await page.getByText(PS_FULL).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });

    await expect(page.getByRole("checkbox", { name: /^player$/i })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: /^sponsor$/i })).toBeChecked();

    await page.keyboard.press("Escape");
    await softDeleteContact(page, PS_FULL);
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

    await page.getByRole("checkbox", { name: /^player$/i }).check();
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
    const HC_FULL = "Handicap Boundary";

    await openAddContactModal(page);
    await fillBasicFields(page, {
      firstName: "Handicap",
      lastName: "Boundary",
      email: `e2e-handicap-${TIMESTAMP}@example.com`,
    });

    await page.getByRole("checkbox", { name: /^player$/i }).check();
    const handicapInput = page.getByRole("spinbutton", { name: /handicap/i });

    // Lower bound: 0 must save cleanly.
    await handicapInput.fill("0");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(HC_FULL)).toBeVisible();

    // Re-open and update through the range.
    await page.getByText(HC_FULL).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });

    // Upper bound: 54 must save cleanly.
    await handicapInput.fill("54");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // Out-of-range upper: 55 must surface a validation error and NOT save.
    await page.getByText(HC_FULL).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });
    await handicapInput.fill("55");
    await page.getByRole("button", { name: /save/i }).click();
    // Either client-side validation prevents close, or server rejects + dialog stays.
    // Contract: dialog should still be open OR an error message references 0–54.
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 2_000 });

    // Out-of-range lower: -1 must also be rejected.
    await handicapInput.fill("-1");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 2_000 });

    // Blank handicap must be acceptable (clear back to blank, save with 0 instead to close).
    await handicapInput.fill("");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    await softDeleteContact(page, HC_FULL);
  });
});
