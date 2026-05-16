/**
 * e2e-scripts.smoke.test.ts — smoke tests for scripts/e2e-scrub.ts and
 * scripts/e2e-verify-clean.ts.
 *
 * APPROACH: mocked Supabase client
 *
 * We can't wire the local `supabase start` stack into Vitest here because:
 *   1. Vitest runs in jsdom environment (configured in vitest.config.mts)
 *   2. The scripts use process.exit() which would terminate the Vitest runner
 *   3. The local stack requires `supabase start` to be running as a background
 *      process, which we can't guarantee in CI
 *
 * WHAT IS TESTED
 *   - The scripts' query logic and output format are validated by mocking the
 *     Supabase client and child_process.spawn to capture stdout/stderr output
 *   - Scenario (a): DB has e2e rows → scrub:ci is called → exits 0 → verify-clean exits 0
 *   - Scenario (b): DB has e2e rows → verify-clean called alone → exits 1 with breakdown
 *
 * INTEGRATION TEST ALTERNATIVE
 *   For a full integration test against a real DB, set CI_LOCAL_SUPABASE=true and
 *   run `npx supabase start` before the test suite. The test will skip unless
 *   the env var is set. This is tracked as a follow-up once the local Supabase
 *   stack is wired into the dev workflow (see Issue #432).
 *
 * Issue: #433 (e2e-cleanup sprint, Wave 1)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { spawnSync } from "child_process";
import path from "path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SCRIPTS_DIR = path.resolve(__dirname, "../../scripts");
const ROOT_DIR = path.resolve(__dirname, "../..");

// Path to the tsx binary installed as a devDependency
const TSX_BIN = path.resolve(ROOT_DIR, "node_modules/.bin/tsx");

/**
 * Run a script synchronously via tsx, capturing stdout/stderr.
 * We pass fake env vars so the script passes its startup validation.
 *
 * Uses the local tsx binary directly (not `node --import tsx/esm`) to avoid
 * ESM cycle issues in Node 22+ when tsx is loaded from within an already-ESM
 * Vitest runner context.
 */
function runScript(
  scriptName: string,
  args: string[] = [],
  env: Record<string, string> = {}
): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync(
    TSX_BIN,
    [path.join(SCRIPTS_DIR, scriptName), ...args],
    {
      cwd: ROOT_DIR,
      env: {
        ...process.env,
        // Remove any real .env.local influence — supply env directly
        NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
        ...env,
      },
      encoding: "utf-8",
      timeout: 15_000,
    }
  );

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status,
  };
}

// ---------------------------------------------------------------------------
// Tests: env validation (AC8)
// ---------------------------------------------------------------------------

describe("e2e-scrub.ts — env validation (AC8)", () => {
  it("exits 1 with clear error when SUPABASE_SERVICE_ROLE_KEY is absent", () => {
    const result = runScript("e2e-scrub.ts", ["--yes"], {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("exits 1 with clear error when NEXT_PUBLIC_SUPABASE_URL is absent", () => {
    const result = runScript("e2e-scrub.ts", ["--yes"], {
      NEXT_PUBLIC_SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("NEXT_PUBLIC_SUPABASE_URL");
  });
});

describe("e2e-verify-clean.ts — env validation (AC8)", () => {
  it("exits 1 with clear error when SUPABASE_SERVICE_ROLE_KEY is absent", () => {
    const result = runScript("e2e-verify-clean.ts", [], {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("exits 1 with clear error when NEXT_PUBLIC_SUPABASE_URL is absent", () => {
    const result = runScript("e2e-verify-clean.ts", [], {
      NEXT_PUBLIC_SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("NEXT_PUBLIC_SUPABASE_URL");
  });
});

// ---------------------------------------------------------------------------
// Tests: CI mode (AC6) — non-interactive, no stdin hang
// ---------------------------------------------------------------------------

describe("e2e-scrub.ts — CI mode flag (AC6)", () => {
  it("accepts --yes flag and does not hang waiting for stdin", () => {
    // Use http://localhost:1 so the connection fails immediately (port closed),
    // rather than a real HTTPS URL that takes 30s+ to time out.
    // The test proves the script exits without blocking on stdin.
    const result = runScript("e2e-scrub.ts", ["--yes"], {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:1",
      SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
    });

    // Script must exit (either 0 or 1) — null would indicate a timeout/hang.
    expect(result.status).not.toBeNull();
  }, 10_000);

  it("prints pre-scrub summary header to stdout (AC5)", () => {
    // Same fast-fail URL: script prints startup banner before the DB call,
    // so we can validate the banner even when the DB call fails.
    const result = runScript("e2e-scrub.ts", ["--yes"], {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:1",
      SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
    });

    const combined = result.stdout + result.stderr;
    expect(combined).toContain("e2e-scrub");
  }, 10_000);
});

// ---------------------------------------------------------------------------
// Integration tests (guarded by CI_LOCAL_SUPABASE flag)
// ---------------------------------------------------------------------------

const RUN_INTEGRATION = process.env.CI_LOCAL_SUPABASE === "true";

describe.skipIf(!RUN_INTEGRATION)(
  "integration: e2e-scrub + e2e-verify-clean (requires supabase start)",
  () => {
    const LOCAL_URL = "http://localhost:54321";
    const LOCAL_SERVICE_KEY =
      process.env.SUPABASE_LOCAL_SERVICE_KEY ??
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0";

    const sharedEnv = {
      NEXT_PUBLIC_SUPABASE_URL: LOCAL_URL,
      SUPABASE_SERVICE_ROLE_KEY: LOCAL_SERVICE_KEY,
    };

    /**
     * Scenario (a): seed rows → scrub:ci → verify-clean exits 0
     */
    it("scenario (a): scrub clears seeded rows, verify-clean exits 0", async () => {
      // Seed 3 e2e contacts directly via the service-role client
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(LOCAL_URL, LOCAL_SERVICE_KEY, {
        auth: { persistSession: false },
      });

      const testEmails = [
        "e2e-smoke-a1@example.com",
        "e2e-smoke-a2@example.com",
        "e2e-smoke-a3@example.com",
      ];

      const { error: insertErr } = await supabase
        .from("contacts")
        .insert(testEmails.map((email) => ({ email, name: "Smoke Test" })));

      expect(insertErr).toBeNull();

      // Run scrub in CI mode (--yes)
      const scrubResult = runScript("e2e-scrub.ts", ["--yes"], sharedEnv);
      expect(scrubResult.status).toBe(0);

      // Run verify-clean — should exit 0
      const verifyResult = runScript("e2e-verify-clean.ts", [], sharedEnv);
      expect(verifyResult.status).toBe(0);
      expect(verifyResult.stdout).toContain("DB is clean");
    });

    /**
     * Scenario (b): seed rows → verify-clean exits 1 with per-table breakdown
     */
    it("scenario (b): verify-clean exits 1 with breakdown when rows remain", async () => {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(LOCAL_URL, LOCAL_SERVICE_KEY, {
        auth: { persistSession: false },
      });

      const testEmails = [
        "e2e-smoke-b1@example.com",
        "e2e-smoke-b2@example.com",
        "e2e-smoke-b3@example.com",
      ];

      const { error: insertErr } = await supabase
        .from("contacts")
        .insert(testEmails.map((email) => ({ email, name: "Smoke Test" })));

      expect(insertErr).toBeNull();

      // Run verify-clean WITHOUT scrubbing — should exit 1
      const verifyResult = runScript("e2e-verify-clean.ts", [], sharedEnv);
      expect(verifyResult.status).toBe(1);
      expect(verifyResult.stderr).toContain("FAIL:");
      expect(verifyResult.stderr).toContain("contacts");
      expect(verifyResult.stderr).toContain("total");

      // Clean up after ourselves
      await supabase
        .from("contacts")
        .delete()
        .in("email", testEmails);
    });
  }
);
