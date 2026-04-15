import { test, expect } from "@playwright/test";

test("homepage loads with correct title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Craven Cancer Classic/);
});

test("homepage displays hero section", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Craven Cancer Classic");
  await expect(page.getByText("Register Your Team")).toBeVisible();
});

test("about page loads", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator("h1")).toContainText("About Our Cause");
  await expect(page.getByText("Scott Davenport Sr.", { exact: true })).toBeVisible();
});

test("navigation links are visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Register" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Sponsors" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Donate" }).first()).toBeVisible();
});
