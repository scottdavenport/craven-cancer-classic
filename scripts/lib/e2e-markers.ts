/**
 * e2e-markers.ts — shared marker patterns for e2e-scrub.ts + e2e-verify-clean.ts.
 *
 * SINGLE SOURCE OF TRUTH for what "test pollution" looks like in prod data.
 * Both the scrub (delete) and verify-clean (assert) scripts import from here so
 * they stay in lockstep automatically. Adding a newly-discovered leak pattern
 * is a one-line append to NULL_EMAIL_NAME_PATTERNS.
 */

// Path A — any @example.com address. Production has 0 real @example.com contacts
// (verified 2026-05-16 by direct DB query — domain is RFC 2606 reserved and
// used exclusively as a test fixture domain in this project).
export const CONTACT_EMAIL_PATTERN = "%@example.com";

/**
 * Path B — NULL-email rows with test-fixture name patterns. These escape Path A
 * because the spec fixtures that create them omit the email field.
 *
 * To add a new pattern: append one entry. The `label` shows up in summary
 * output ("Path B (NewLabel): N") so leaks are diagnosable by spec.
 *
 * `last_name` is optional; omit when first_name alone is sufficiently narrow.
 * Use SQL LIKE/ILIKE syntax (`%` wildcard).
 */
export const NULL_EMAIL_NAME_PATTERNS: ReadonlyArray<{
  label: string;
  first_name: string;
  last_name?: string;
}> = [
  // contact-bulk-delete.spec.ts — blocked-alert fixture, names from BulkDel{N} / bulk-del-{ts}
  { label: "BulkDel",     first_name: "BulkDel%",    last_name: "bulk-del-%" },
  // contact-create-edit.spec.ts + contact-soft-delete-restore.spec.ts — E2EFirst/E2ELast and E2ERestore Restore{ts}
  { label: "E2E",         first_name: "E2E%" },
  // soft-delete preservation spec — "Preserve Player" fixture
  { label: "Preserve",    first_name: "Preserve",    last_name: "Player" },
  // unique-email-after-softdelete.spec.ts — UniqueFirst Orig{ts}
  { label: "UniqueFirst", first_name: "UniqueFirst", last_name: "Orig%" },
];
