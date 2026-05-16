/**
 * Lint guard: marker-convention compliance for all e2e specs.
 *
 * Runs FIRST (alphabetically, via leading `_`) to fail fast before any
 * browser-based specs execute. Uses Node fs — no browser needed.
 *
 * Three conventions every spec must follow:
 *   1. Declare `const SEED_TAG = ` at module scope (column 0).
 *   2. Call both `test.afterAll(` and `cleanupTestData(` somewhere in the file.
 *   3. Every e2e-*@example.com string must interpolate ${SEED_TAG}, ${RUN_ID},
 *      ${seedTag}, or ${runId} — no hardcoded addresses.
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
 * Check 3: every string literal that contains `e2e-` and `@example.com` must
 * include a template interpolation of SEED_TAG, RUN_ID, seedTag, or runId.
 *
 * Strategy: find all backtick template literals and single/double-quoted strings
 * that contain both markers; reject any that lack the interpolation pattern.
 */
function checkEmailInterpolation(src: string, label: string): string[] {
  const violations: string[] = [];

  // Match backtick template literals that contain e2e- and @example.com.
  // Use [^\n`] to prevent crossing line or template boundaries.
  // These are the correct form — they may or may not have the required interpolation.
  const templateRe = /`[^\n`]*e2e-[^\n`]*@example\.com[^\n`]*`/g;
  let m: RegExpExecArray | null;

  while ((m = templateRe.exec(src)) !== null) {
    const literal = m[0];
    const hasInterp =
      /\$\{SEED_TAG\}/.test(literal) ||
      /\$\{RUN_ID\}/.test(literal) ||
      /\$\{seedTag\}/.test(literal) ||
      /\$\{runId\}/.test(literal);
    if (!hasInterp) {
      violations.push(
        `${label}: template literal missing SEED_TAG/RUN_ID interpolation: ${literal.slice(0, 80)}`
      );
    }
  }

  // Match single or double-quoted string literals that contain e2e- and @example.com.
  // Use [^\n'"'] to prevent crossing line boundaries (quoted strings never span lines).
  // These are ALWAYS violations because quoted strings cannot have interpolation.
  const quotedRe = /['"][^\n'"]*e2e-[^\n'"]*@example\.com[^\n'"]*['"]/g;
  while ((m = quotedRe.exec(src)) !== null) {
    violations.push(
      `${label}: hardcoded (non-template) e2e email literal: ${m[0].slice(0, 80)}`
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

test("every fixture email matching e2e-*@example.com uses a SEED_TAG or RUN_ID interpolation", () => {
  const files = getRealSpecFiles();
  expect(files.length).toBeGreaterThan(0);

  const violations: string[] = [];
  for (const filePath of files) {
    const src = fs.readFileSync(filePath, "utf8");
    const label = path.basename(filePath);
    violations.push(...checkEmailInterpolation(src, label));
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

  // Check 3 should fail: hardcoded e2e email.
  const emailViolations = checkEmailInterpolation(src, label);
  expect(emailViolations.length).toBeGreaterThan(0);
});
