/**
 * S3-10: Bare catches meta-test.
 *
 * Asserts that `catch {` (empty catch binding) appears only in the 2 allowlisted
 * locations in src/app/auth/login/page.tsx (lines 44 and 59, both intentional
 * redirect-throw swallowers with explanatory comments).
 *
 * The test fails today because 15 other source files contain bare catches
 * without logging. After S3-10 (Bolt + Flux add console.error calls),
 * only the 2 allowlisted catches remain.
 *
 * Implementation note: reads source files as text — does NOT import them.
 * This avoids RSC / missing-dependency issues and makes the assertion fast.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, join } from "path";
import { readdirSync, statSync } from "fs";

const SRC_ROOT = resolve(__dirname, "../../src");

// Files that are ALLOWED to contain bare `catch {` — intentional silent catches
// with explanatory comments for Next.js redirect() throws.
const ALLOWLISTED_FILES = [
  "app/auth/login/page.tsx",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively collect all .ts/.tsx files under a directory, excluding __tests__ */
function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      results.push(...collectSourceFiles(fullPath));
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Returns paths (relative to src/) of files containing bare `catch {` */
function filesWithBareCatch(): string[] {
  const files = collectSourceFiles(SRC_ROOT);
  const offenders: string[] = [];

  for (const filePath of files) {
    const content = readFileSync(filePath, "utf-8");
    // Match `catch {` — bare catch with no binding variable
    if (/catch\s*\{/.test(content)) {
      const relPath = filePath.replace(SRC_ROOT + "/", "");
      offenders.push(relPath);
    }
  }
  return offenders;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("S3-10 bare catches in source files", () => {
  it("only the 2 allowlisted files in login/page.tsx contain bare catch {", () => {
    const offenders = filesWithBareCatch();
    const nonAllowlisted = offenders.filter(
      (f) => !ALLOWLISTED_FILES.some((allowed) => f.includes(allowed))
    );

    expect(nonAllowlisted).toEqual([]);
  });

  it("login/page.tsx still contains its 2 intentional bare catches", () => {
    const loginPath = join(SRC_ROOT, "app/auth/login/page.tsx");
    const content = readFileSync(loginPath, "utf-8");
    const matches = [...content.matchAll(/catch\s*\{/g)];
    expect(matches).toHaveLength(2);
  });
});
