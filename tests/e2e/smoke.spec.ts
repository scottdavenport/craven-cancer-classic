import { test, expect } from "@playwright/test";

test("homepage loads with correct title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Craven Cancer Classic/);
});

test("homepage displays hero section", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Craven Cancer");
  await expect(page.getByRole("link", { name: "Register Your Team" }).first()).toBeVisible();
});

test("about page loads", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator("h1")).toContainText("How This Started");
  await expect(page.getByText("Scott Davenport Sr.", { exact: true })).toBeVisible();
});

test("navigation links are visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Register" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Sponsors" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Donate" }).first()).toBeVisible();
});
