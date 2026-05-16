/**
 * Sprint 32 (#282) — E2E: Public registration form has no team name input
 *
 * Contract:
 * - /register form does NOT have a "Team Name" text input
 * - Captain inputs (name, email, phone) become team identity
 * - The word "Team Name" does not appear as a label or field on the form
 * - Form still has captain name / email / phone inputs
 *
 * RED until Bolt removes the team_name input from registration-form.tsx (Phase 3).
 */

import { test, expect } from "@playwright/test";
import { cleanupTestData } from "./fixtures/cleanup-helper";

const SEED_TAG = crypto.randomUUID().slice(0, 8);

test.afterAll(async () => {
  await cleanupTestData(SEED_TAG);
});

test.describe("Sprint 32 — Public registration form (no team name field)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test("registration form does NOT have a Team Name label or input", async ({ page }) => {
    // The "Team Name" field must be gone
    const teamNameLabel = page.getByText(/^team name$/i);
    const teamNameInput = page.getByLabel(/^team name$/i);

    await expect(teamNameLabel).not.toBeVisible();
    await expect(teamNameInput).not.toBeVisible();
  });

  test("registration form still has captain name inputs", async ({ page }) => {
    // Captain identity fields must still be present
    const captainNameInput =
      page.getByLabel(/captain.*name|first.*name|your name/i).first();
    await expect(captainNameInput).toBeVisible();
  });

  test("registration form still has captain email input", async ({ page }) => {
    const emailInput = page.getByLabel(/email/i).first();
    await expect(emailInput).toBeVisible();
  });

  test("registration form page renders without error", async ({ page }) => {
    // Basic smoke: form renders, no error boundary shown
    await expect(page.getByRole("main")).toBeVisible();

    // Should not show a generic error / fallback
    const errorBoundary = page.getByText(/something went wrong|unexpected error/i);
    await expect(errorBoundary).not.toBeVisible();
  });

  test("form section header does not mention 'Team Name'", async ({ page }) => {
    // Section headings/labels should not say "Team Name"
    const headings = page.locator("h1, h2, h3, label");
    const allText = await headings.allTextContents();
    const hasTeamNameHeading = allText.some((t) => t.trim().match(/^team name$/i));
    expect(hasTeamNameHeading).toBe(false);
  });
});
