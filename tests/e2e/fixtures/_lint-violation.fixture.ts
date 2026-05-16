/**
 * @fileoverview Meta-test fixture for _lint-marker-convention.spec.ts.
 *
 * This file INTENTIONALLY violates the marker convention. The lint spec loads it
 * and asserts that all 3 convention checks fail when applied to this content.
 *
 * DO NOT delete — removing this would silently disable the lint's meta-test.
 * DO NOT "fix" the violations — they are the point.
 */

// Violation 1: No `const SEED_TAG = ` declaration anywhere in this file.
// Violation 2: No `cleanupTestData(` call anywhere in this file.
// Violation 3: Hardcoded e2e email with no SEED_TAG/RUN_ID interpolation.

const BAD_EMAIL = 'e2e-bad-no-interp@example.com';

export { BAD_EMAIL };
