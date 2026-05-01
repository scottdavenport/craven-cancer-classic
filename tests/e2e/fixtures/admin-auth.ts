/**
 * Admin authentication fixture for Playwright E2E tests.
 *
 * Required env vars (add to .env.local):
 *   E2E_ADMIN_EMAIL=<admin email>
 *   E2E_ADMIN_PASSWORD=<admin password>
 *
 * Usage:
 *   import { test, expect } from "./fixtures/admin-auth";
 *   // page is already authenticated as admin
 */

import { test as baseTest, expect, type Page } from "@playwright/test";

export { expect };

async function loginAsAdmin(page: Page) {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set in .env.local to run admin E2E tests"
    );
  }

  await page.goto("/auth/login");

  // Fill in email/password form
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  // Disambiguate from the "Sign in with Google" OAuth button — match the
  // form submit button by exact text.
  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  // Wait for redirect to admin area
  await page.waitForURL(/\/admin/, { timeout: 10_000 });
}

type AdminFixtures = {
  adminPage: Page;
};

export const test = baseTest.extend<AdminFixtures>({
  adminPage: async ({ page }, use) => {
    await loginAsAdmin(page);
    await use(page);
  },
});
