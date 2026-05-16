/**
 * Lint guard: marker-convention compliance for all e2e specs.
 *
 * Runs FIRST (alphabetically, via leading `_`) to fail fast before any
 * browser-based specs execute. Uses Node fs — no browser needed.
 *
 * Three conventions every spec must follow:
 *   1. Declare `const SEED_TAG = ` at module scope (column 0).
 *   2. Call both `test.afterAll(` and `cleanupTestData(` somewhere in the file.
 *   3. Every @example.com string literal must start with `e2e-${...}` interpolation.
 *      This is stricter than the original check (which only matched strings already
 *      starting with e2e-). It catches accidental non-prefixed fixture emails like
 *      `bulk-del-${idx}-${Date.now()}@example.com` that slip the naming convention.
 *
 * A 4th meta-test loads `fixtures/_lint-violation.fixture.ts` and asserts that
 * ALL THREE checks correctly detect its intentional violations.
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const E2E_DIR = path.join(__dirname);
const VIOLATION_FIXTURE = path.join(
  __dirname,
  "fixtures",
  "_lint-violation.fixture.ts"
);

/** Return the sorted list of real spec files to lint (excludes this file and the violation fixture). */
function getRealSpecFiles(): string[] {
  return fs
    .readdirSync(E2E_DIR)
    .filter(
      (name) =>
        name.endsWith(".spec.ts") &&
        name !== "_lint-marker-convention.spec.ts"
    )
    .sort()
    .map((name) => path.join(E2E_DIR, name));
}

// ---------------------------------------------------------------------------
// Check functions — each returns a list of violation strings (empty = pass).
// ---------------------------------------------------------------------------

/**
 * Check 1: file must declare `const SEED_TAG = ` at column 0 (module scope).
 * Regex: line starts with `const SEED_TAG = ` (no leading whitespace).
 */
function checkSeedTagDeclaration(src: string, label: string): string[] {
  const violations: string[] = [];
  if (!/^const SEED_TAG = /m.test(src)) {
    violations.push(
      `${label}: missing module-scope \`const SEED_TAG = \` declaration`
    );
  }
  return violations;
}

/**
 * Check 2: file must contain both `test.afterAll(` and `cleanupTestData(`.
 */
function checkAfterAllCleanup(src: string, label: string): string[] {
  const violations: string[] = [];
  if (!src.includes("test.afterAll(")) {
    violations.push(`${label}: missing \`test.afterAll(\` call`);
  }
  if (!src.includes("cleanupTestData(")) {
    violations.push(`${label}: missing \`cleanupTestData(\` call`);
  }
  return violations;
}

/**
 * Check 3: every string literal that contains `@example.com` must start with
 * `e2e-${...}` template interpolation (i.e., `e2e-${someVar}...`).
 *
 * This catches both:
 *   - Strings that had no e2e- prefix at all (e.g. `bulk-del-${idx}-${Date.now()}@example.com`)
 *   - Strings with a hardcoded e2e- prefix but no interpolation (e.g. `e2e-bad@example.com`)
 *   - Any quoted (non-template) string containing @example.com
 *
 * Only strings that open with `e2e-${` (immediately after the backtick) pass.
 *
 * Strategy: find all backtick template literals and single/double-quoted strings
 * that contain @example.com; reject any that don't match the required prefix pattern.
 */
function checkEmailConvention(src: string, label: string): string[] {
  const violations: string[] = [];

  // Match backtick template literals that contain @example.com.
  // Use [^\n`] to prevent crossing line or template boundaries.
  const templateRe = /`[^\n`]*@example\.com[^\n`]*`/g;
  let m: RegExpExecArray | null;

  while ((m = templateRe.exec(src)) !== null) {
    const literal = m[0];
    // Must start with `e2e-${...} — the interpolation must appear as the first
    // thing after the backtick (no literal characters before the e2e- prefix).
    const startsWithE2eInterp = /^`e2e-\$\{[^}]+\}/.test(literal);
    if (!startsWithE2eInterp) {
      violations.push(
        `${label}: @example.com literal does not start with e2e-\${...} interpolation: ${literal.slice(0, 80)}`
      );
    }
  }

  // Match single or double-quoted string literals that contain @example.com.
  // These are ALWAYS violations — quoted strings cannot have the required interpolation.
  const quotedRe = /['"][^\n'"]*@example\.com[^\n'"]*['"]/g;
  while ((m = quotedRe.exec(src)) !== null) {
    violations.push(
      `${label}: hardcoded (non-template) @example.com email literal: ${m[0].slice(0, 80)}`
    );
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Tests 1-3: real spec files
// ---------------------------------------------------------------------------

test("every e2e spec defines a module-scoped SEED_TAG", () => {
  const files = getRealSpecFiles();
  expect(files.length).toBeGreaterThan(0);

  const violations: string[] = [];
  for (const filePath of files) {
    const src = fs.readFileSync(filePath, "utf8");
    const label = path.basename(filePath);
    violations.push(...checkSeedTagDeclaration(src, label));
  }

  expect(violations).toEqual([]);
});

test("every e2e spec calls cleanupTestData in afterAll", () => {
  const files = getRealSpecFiles();
  expect(files.length).toBeGreaterThan(0);

  const violations: string[] = [];
  for (const filePath of files) {
    const src = fs.readFileSync(filePath, "utf8");
    const label = path.basename(filePath);
    violations.push(...checkAfterAllCleanup(src, label));
  }

  expect(violations).toEqual([]);
});

test("every fixture @example.com email must start with e2e-${...} interpolation", () => {
  const files = getRealSpecFiles();
  expect(files.length).toBeGreaterThan(0);

  const violations: string[] = [];
  for (const filePath of files) {
    const src = fs.readFileSync(filePath, "utf8");
    const label = path.basename(filePath);
    violations.push(...checkEmailConvention(src, label));
  }

  expect(violations).toEqual([]);
});

// ---------------------------------------------------------------------------
// Test 4: meta-test — lint correctly detects violations in the fixture
// ---------------------------------------------------------------------------

test("meta-test: lint catches known violations in _lint-violation.fixture.ts", () => {
  const src = fs.readFileSync(VIOLATION_FIXTURE, "utf8");
  const label = path.basename(VIOLATION_FIXTURE);

  // Check 1 should fail: no SEED_TAG declaration.
  const seedTagViolations = checkSeedTagDeclaration(src, label);
  expect(seedTagViolations.length).toBeGreaterThan(0);

  // Check 2 should fail: no afterAll or cleanupTestData.
  const afterAllViolations = checkAfterAllCleanup(src, label);
  expect(afterAllViolations.length).toBeGreaterThan(0);

  // Check 3 should fail: hardcoded e2e email AND a bulk-del-style email without e2e- prefix.
  const emailViolations = checkEmailConvention(src, label);
  expect(emailViolations.length).toBeGreaterThan(0);
});
