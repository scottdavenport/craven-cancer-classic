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
// Violation 3a: Hardcoded e2e email with no interpolation (quoted string).
// Violation 3b: bulk-del-style email without e2e-${...} prefix (template literal
//               that contains @example.com but doesn't start with `e2e-${`).

const BAD_EMAIL = 'e2e-bad-no-interp@example.com';

// This template literal has @example.com but the prefix is 'bulk-del-', not 'e2e-${'.
// It matches the pre-convention pattern from contact-bulk-delete.spec.ts.
const idx = 1;
const BAD_BULK_DEL_EMAIL = `bulk-del-${idx}-${Date.now()}@example.com`;

export { BAD_EMAIL, BAD_BULK_DEL_EMAIL };
