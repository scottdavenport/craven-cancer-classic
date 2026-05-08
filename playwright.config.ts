import * as dotenv from "dotenv";
import * as path from "path";
import { defineConfig, devices } from "@playwright/test";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["line"], ["html"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        // Disable CSS transitions app-wide (prefers-reduced-motion: reduce).
        // Eliminates modal/opacity transition races that force:true cannot fix.
        contextOptions: { reducedMotion: "reduce" },
        // Extra headroom for webkit's slower JS engine on click/hover actions.
        // Default: 0 (unbounded up to test timeout). Was effectively ~5 s in CI.
        actionTimeout: 15_000,
      },
      // webkit is ~50% slower than chromium in CI; give each test 50% more time.
      // Default: 30_000. Chromium stays at the global default.
      timeout: 45_000,
      // Async expect matchers (toBeVisible, toHaveText, etc.) get extra headroom.
      // Default: 5_000. Chromium stays at the global default.
      expect: { timeout: 10_000 },
    },
  ],
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
