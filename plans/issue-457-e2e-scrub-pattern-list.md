# Issue #457 — Widen e2e-scrub Path B to a pattern list (not just BulkDel)

_Structural fix surfaced 2026-05-17 during hygiene check: 17 e2e-leaked NULL-email rows (E2EFirst/E2ELast, E2ERestore, Preserve Player, UniqueFirst Orig) silently slipped past the existing Path B because it was hardcoded to `BulkDel%` / `bulk-del-%`. One-off hard-delete already done; this issue is the structural fix so the next leaked name pattern gets caught instead of accumulating._

---

## Plain-English Readout

**Who is impacted:** Future contributors writing or auditing e2e specs that create NULL-email contacts. Today, a spec that leaks rows with names like `Preserve Player` or `E2ERestore` will accumulate in prod silently until someone (Scott) does a manual hygiene query. After this fix, the scrub + verify-clean pair catches them automatically.

**What changes from their perspective:** `npm run e2e:scrub` interactive summary now shows per-pattern counts under Path B — `Path B (BulkDel): 0`, `Path B (E2E): 0`, etc. — making it obvious which spec is leaking. `npm run e2e:verify-clean` flags the same patterns. Adding a newly-discovered leak pattern is a one-line addition to a constant.

**What doesn't change:** Path A (`@example.com` email rows) — untouched. The FK-safe delete cascade (scores → team_members → teams → contacts), the chunked `.in()` pagination, the retry helper, the service-role client, the interactive `--yes` flag, the CI mode — all preserved verbatim.

---

## Aria Upfront-Gate

**No new user-facing strings.** Scrub script summary text (console output) is dev-tooling, not product copy. Aria countersign not required.

---

## Design Pattern + Key Choice

### Pattern: pattern-list-driven Path B

Path B currently hardcodes a single `{first_name, last_name}` pair via three module-level constants. We replace it with a `ReadonlyArray<{label, first_name, last_name?}>` constant. Count + fetch + delete steps iterate the list, summing matches into a single contact-ID set, which the existing FK-safe delete cascade consumes unchanged.

`last_name` is optional because some patterns (e.g., `E2E%`) match on first_name alone — there's no useful last_name constraint we can add without false-positive risk on real users named "E2E…" (none exist in prod, but the principle of narrowness matters for forward compatibility).

### Key choice: shared module vs duplicated arrays

The four pattern-related constants (Path A email pattern, Path B first/last/label) currently live separately in `scripts/e2e-scrub.ts` and `scripts/e2e-verify-clean.ts` — duplicated by convention, kept in lockstep by reviewer discipline. With a single-pair pattern, drift was cheap to catch (three lines, easy diff). With a list that grows over time, drift becomes likely: someone adds a new pattern to scrub, forgets verify-clean, and CI keeps passing because verify-clean doesn't know what it's missing.

**Decision: extract a shared module** `scripts/lib/e2e-markers.ts` exporting:
- `CONTACT_EMAIL_PATTERN` (Path A — moved from the two scripts; no semantic change)
- `NULL_EMAIL_NAME_PATTERNS` (Path B — the new list)

Both scripts `import` the symbols. Single source of truth; adding a new leak pattern is one edit to one file; verify-clean automatically picks it up.

**Alternative (rejected):** Duplicate the list in both scripts. Simpler diff, no new file, but reintroduces drift risk for the *exact* operation (adding a pattern) that this issue says will recur. Issue body's "AC4 — `verify-clean` is updated in lockstep" supports either approach, but shared module makes the lockstep mechanical instead of relying on reviewer attention.

Scope cost of the shared module: ~30 LOC new file, ~6 LOC removed from each of the two scripts, two `import` lines added. Bounded and reversible.

---

## The Change

Three files touched. Listed in the order Flux should edit.

### File 1 (new) — `scripts/lib/e2e-markers.ts`

```ts
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
```

### File 2 — `scripts/e2e-scrub.ts`

**Imports** (top of file, after existing `import readline from "readline"`):
```ts
import { CONTACT_EMAIL_PATTERN, NULL_EMAIL_NAME_PATTERNS } from "./lib/e2e-markers";
```

**Remove** the three module-level pattern constants currently at ~lines 166-168:
```ts
const CONTACT_EMAIL_PATTERN = "%@example.com";
const BULKDEL_FIRST_NAME_PATTERN = "BulkDel%";
const BULKDEL_LAST_NAME_PATTERN = "bulk-del-%";
```
(The first now comes from the import; the last two are replaced by the list.)

**Replace `CombinedCounts`** interface to track per-pattern counts under Path B:
```ts
interface CombinedCounts {
  pathA: TableCounts;
  pathB: Record<string, number>; // label → count
}
```

**Replace `countBulkDelRows`** with `countNullEmailPatternRows`:
```ts
async function countNullEmailPatternRows(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const pattern of NULL_EMAIL_NAME_PATTERNS) {
    let q = supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .is("email", null)
      .like("first_name", pattern.first_name);
    if (pattern.last_name) q = q.like("last_name", pattern.last_name);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await withRetry(
      () => q,
      `count contacts (path B / ${pattern.label})`
    );
    if (result.error) {
      throw new Error(
        `e2e-scrub: count contacts (path B / ${pattern.label}) permanently failed. ` +
          `host=${new URL(SUPABASE_URL!).host}. ` +
          `Last error: ${result.error.name ?? "Error"}: ${result.error.message}`
      );
    }
    counts[pattern.label] = result.count ?? 0;
  }
  return counts;
}
```

**Update `countAllRows`** to consume the new return type:
```ts
async function countAllRows(): Promise<CombinedCounts> {
  const pathA = await countEmailPatternRows();
  const pathB = await countNullEmailPatternRows();
  return { pathA, pathB };
}
```

**Update `printSummary`** to emit per-pattern lines under Path B:
```ts
function printSummary(counts: CombinedCounts, label: string): number {
  const pathATotal =
    counts.pathA.contacts +
    counts.pathA.teams +
    counts.pathA.team_members +
    counts.pathA.scores;
  const pathBTotal = Object.values(counts.pathB).reduce((a, b) => a + b, 0);
  const total = pathATotal + pathBTotal;

  console.log(`\n${label}`);
  console.log(`  Path A — @example.com email pattern:`);
  console.log(`    contacts     → ${counts.pathA.contacts}`);
  console.log(`    teams        → ${counts.pathA.teams} (via captain_contact_id)`);
  console.log(`    team_members → ${counts.pathA.team_members} (via contact_id)`);
  console.log(`    scores       → ${counts.pathA.scores} (via team_id)`);
  console.log(`  Path B — NULL-email name patterns:`);
  for (const pattern of NULL_EMAIL_NAME_PATTERNS) {
    console.log(`    ${pattern.label.padEnd(12)} → ${counts.pathB[pattern.label] ?? 0}`);
  }
  console.log(`  ─────────────────────────────`);
  console.log(`  total          → ${total}`);
  return total;
}
```

**Replace `fetchAllBulkDelContactIds`** with `fetchAllNullEmailPatternIds` (merges all patterns into one ID list, deduped via Set):
```ts
async function fetchAllNullEmailPatternIds(): Promise<string[]> {
  const merged = new Set<string>();
  for (const pattern of NULL_EMAIL_NAME_PATTERNS) {
    let from = 0;
    const PAGE = 500;
    while (true) {
      let q = supabase
        .from("contacts")
        .select("id")
        .is("email", null)
        .like("first_name", pattern.first_name);
      if (pattern.last_name) q = q.like("last_name", pattern.last_name);
      const { data, error } = await withRetry(
        () => q.range(from, from + PAGE - 1),
        `fetch contact IDs (path B / ${pattern.label}) page ${from}`
      );
      if (error) {
        throw new Error(
          `e2e-scrub: fetch contact IDs (path B / ${pattern.label}) page ${from} ` +
            `permanently failed after 3 attempts. ` +
            `host=${new URL(SUPABASE_URL!).host}, page_start=${from}, page_size=${PAGE}. ` +
            `Last error: ${error.name ?? "Error"}: ${error.message}`
        );
      }
      for (const r of (data ?? []) as Array<{ id: string }>) merged.add(r.id);
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }
  }
  return Array.from(merged);
}
```

**Update `deleteAllTestRows`** caller site (Path B section, ~lines 530-536):
```ts
  // Path B: NULL-email name-pattern rows
  const nullEmailContactIds = await fetchAllNullEmailPatternIds();
  if (nullEmailContactIds.length > 0) {
    await deleteContactsAndDependents(nullEmailContactIds, "path B");
  } else {
    console.log("  path B: no rows to delete");
  }
```

**Update `main()`** initial log lines to describe path B accurately (~lines 547-548):
```ts
  console.log(`  path A pattern: contacts.email ILIKE '${CONTACT_EMAIL_PATTERN}'`);
  console.log(`  path B patterns: ${NULL_EMAIL_NAME_PATTERNS.length} NULL-email name patterns (see scripts/lib/e2e-markers.ts)`);
```

**Update `main()`** post-scrub remaining count (~lines 576-581):
```ts
  const remaining =
    after.pathA.contacts +
    after.pathA.teams +
    after.pathA.team_members +
    after.pathA.scores +
    Object.values(after.pathB).reduce((a, b) => a + b, 0);
```

### File 3 — `scripts/e2e-verify-clean.ts`

Same pattern as File 2 but for the assert-only flow.

**Imports** (after existing `import path from "path"`):
```ts
import { CONTACT_EMAIL_PATTERN, NULL_EMAIL_NAME_PATTERNS } from "./lib/e2e-markers";
```

**Remove** the three module-level pattern constants at ~lines 142-144.

**Replace `CombinedCounts`** to mirror scrub:
```ts
interface CombinedCounts {
  pathA: TableCounts;
  pathB: Record<string, number>;
}
```

**Replace `countBulkDelRows`** with `countNullEmailPatternRows` (same shape as scrub's version, with `e2e-verify-clean` in error messages):
```ts
async function countNullEmailPatternRows(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const pattern of NULL_EMAIL_NAME_PATTERNS) {
    let q = supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .is("email", null)
      .like("first_name", pattern.first_name);
    if (pattern.last_name) q = q.like("last_name", pattern.last_name);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await withRetry(
      () => q,
      `count contacts (path B / ${pattern.label})`
    );
    if (result.error) {
      throw new Error(
        `e2e-verify-clean: count contacts (path B / ${pattern.label}) permanently failed. ` +
          `host=${new URL(SUPABASE_URL!).host}. ` +
          `Last error: ${result.error.name ?? "Error"}: ${result.error.message}`
      );
    }
    counts[pattern.label] = result.count ?? 0;
  }
  return counts;
}
```

**Update `main()`** to consume the new shape — initial log, total computation, and the per-path breakdown error block:
```ts
  console.log(`  path A pattern: contacts.email ILIKE '${CONTACT_EMAIL_PATTERN}'`);
  console.log(`  path B patterns: ${NULL_EMAIL_NAME_PATTERNS.length} NULL-email name patterns (see scripts/lib/e2e-markers.ts)`);

  const pathA = await countEmailPatternRows();
  const pathB = await countNullEmailPatternRows();
  const counts: CombinedCounts = { pathA, pathB };

  const pathBTotal = Object.values(counts.pathB).reduce((a, b) => a + b, 0);
  const total =
    counts.pathA.contacts +
    counts.pathA.teams +
    counts.pathA.team_members +
    counts.pathA.scores +
    pathBTotal;

  // ... if total === 0 block unchanged ...

  // Per-path breakdown (replace the existing Path B error lines):
  console.error(`  Path B — NULL-email name patterns:`);
  for (const pattern of NULL_EMAIL_NAME_PATTERNS) {
    console.error(`    ${pattern.label.padEnd(12)} → ${counts.pathB[pattern.label] ?? 0}`);
  }
```

---

## What NOT to change

- **Path A logic** — `countEmailPatternRows`, `fetchAllContactIdsByEmail`, the four joined-count queries. Untouched.
- **FK-safe delete cascade** — `deleteContactsAndDependents`, `fetchAllTeamIds`. The Path B fetch produces the same shape of `string[]` it always did; the cascade consumes it unchanged.
- **Retry helper** (`withRetry`) — copy-pasted between both scripts today. Out of scope to deduplicate; one shared concern at a time.
- **Env loading** — `loadEnvFile` duplicated by convention; not deduplicating in this PR.
- **Chunk size** (`CHUNK = 100`), page size (`PAGE = 500`) — preserved.
- **Interactive vs `--yes` mode** — preserved.
- **The 17 already-deleted rows** — out of scope (one-off was done 2026-05-17).
- **Spec fixes** — out of scope. This is the scrub-side widening. Spec-side fixes to stop the leaks at source are issue #458 (separate, sequenced after this).
- **`is_test` BOOLEAN column on `contacts`** — explicitly out of scope per issue body.
- **`scripts/seed-photos.ts`** — unrelated.

---

## Pre-Flight Greps

<!-- HARD-GATE: Builder must run all four BEFORE making the edit and paste verbatim output in the PR body. -->

**Grep 1 — confirm the constants Flux is replacing match the expected pre-state**
```bash
grep -n "CONTACT_EMAIL_PATTERN\|BULKDEL_FIRST_NAME_PATTERN\|BULKDEL_LAST_NAME_PATTERN" scripts/e2e-scrub.ts scripts/e2e-verify-clean.ts
```
Expected: 6 hits per script — 3 declarations (lines ~166-168 in scrub, ~142-144 in verify-clean) and 3 uses each. If counts differ, surface — someone has started a parallel implementation or the file has drifted.

**Grep 2 — confirm `scripts/lib/` does not exist yet**
```bash
ls scripts/lib/ 2>&1
```
Expected: `ls: scripts/lib/: No such file or directory`. If the directory exists, list its contents and STOP — possible parallel work or a forgotten branch.

**Grep 3 — confirm the BulkDel pattern names appear nowhere else in the repo**
```bash
grep -rn "BULKDEL_FIRST_NAME_PATTERN\|BULKDEL_LAST_NAME_PATTERN\|countBulkDelRows\|fetchAllBulkDelContactIds" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json"
```
Expected: hits only in `scripts/e2e-scrub.ts` and `scripts/e2e-verify-clean.ts`. If anything matches in `tests/`, `src/`, or `package.json`, surface — there's a coupling we didn't expect.

**Grep 4 — confirm `npm run e2e:verify-clean` script entry is wired**
```bash
grep -n "e2e:verify-clean\|e2e:scrub" package.json
```
Expected: both `e2e:scrub` and `e2e:scrub:ci` and `e2e:verify-clean` entries exist. If `e2e:verify-clean` is missing, this PR also needs a `package.json` script entry add — surface and confirm before adding.

---

## Acceptance Criteria

- [ ] **AC1** — `scripts/lib/e2e-markers.ts` exists, exports `CONTACT_EMAIL_PATTERN` and `NULL_EMAIL_NAME_PATTERNS`. List has at least the 4 patterns (BulkDel, E2E, Preserve, UniqueFirst) with inline comments naming the originating spec for each.
- [ ] **AC2** — `scripts/e2e-scrub.ts`: no remaining references to `BULKDEL_FIRST_NAME_PATTERN`, `BULKDEL_LAST_NAME_PATTERN`, `countBulkDelRows`, `fetchAllBulkDelContactIds`. Imports from `./lib/e2e-markers`. `printSummary` emits per-pattern lines under Path B.
- [ ] **AC3** — `scripts/e2e-verify-clean.ts`: same cleanup as AC2. Per-pattern breakdown in the error path. Imports from `./lib/e2e-markers`.
- [ ] **AC4** — Adding a new pattern is a one-line append to `NULL_EMAIL_NAME_PATTERNS` in `e2e-markers.ts`. No edits needed in the two scripts. (Verify by mental simulation; describe in PR body.)
- [ ] **AC5** — `npm run e2e:scrub:ci` against prod from CI reports `0 rows to delete` (Path A totals + per-pattern Path B totals all zero, since the manual scrub on 2026-05-17 already cleaned the 17 known rows). Paste the summary block in PR body.
- [ ] **AC6** — `npm run e2e:verify-clean` against prod exits 0 and prints `DB is clean`. Paste output in PR body.
- [ ] **AC7** — `npm run build` succeeds. `npx tsc --noEmit` clean.
- [ ] **AC8** — All four pre-flight greps run with expected output, pasted verbatim in PR body.

---

## Risk + Rollback

- **Risk: pattern over-matching real users.** `E2E%` is broad; if a real contact ever exists with first_name starting `E2E` and NULL email, they'd be deleted by Path B. Mitigation: NULL email is the gate — real users almost always have an email captured at signup. Production hygiene query 2026-05-16 confirmed no NULL-email real users exist. Long-term, the `is_test` column proposal (explicitly out of scope here) is the proper fix.
- **Risk: Set dedup hides a counting bug.** `fetchAllNullEmailPatternIds` merges via Set, so if two patterns overlap (e.g., a hypothetical `E2E%` plus `E2ERestore%`), the merged delete count would be less than the per-pattern summary total. The current 4 patterns don't overlap, but a future addition could. Mitigation: AC documents the per-pattern summary as the diagnostic surface; the merged delete count is what actually gets deleted. The discrepancy (if it ever happens) is loud, not silent.
- **Rollback:** revert the PR. The previous state leaves the 4 new patterns uncovered, but the one-off scrub already cleaned the known accumulation. No data loss, no production impact. Subsequent leaks would re-accumulate silently until re-fixed.

---

## PR Shape

- Single PR, single commit (plus the plan commit if Forge convention requires it separately — Scott to decide based on repo norms).
- **Title:** `ci(#457): widen Path B in e2e-scrub to a pattern list (E2E, Preserve, UniqueFirst + BulkDel)`
- **Branch:** `ci/457-e2e-scrub-pattern-list`
- **Body must include:**
  - One-paragraph problem statement (17 leaked rows, hardcoded BulkDel pattern, manual hygiene caught it).
  - One-paragraph fix description (shared module, pattern list, per-pattern diagnostic summary).
  - Verbatim output of the four pre-flight greps.
  - Verbatim output of `npm run e2e:scrub:ci` showing 0 rows across all patterns (AC5).
  - Verbatim output of `npm run e2e:verify-clean` showing `DB is clean` (AC6).
  - `Closes #457`.

---

## Routing

- **Builder:** Flux 🔄 — owns Supabase tooling + CI scripts. This is service-role script work using `@supabase/supabase-js` patterns Flux already knows.
- **Reviewer:** Watchdog 🐕 (stage-2) — AC-by-AC pass, code quality, parity check between the two scripts. No Sentinel needed: no RLS / auth / migration touched.
- **Isolation:** worktree under `~/github/forge/.worktrees/craven/issue-457` per Forge builder convention.

---

## Provenance

- Surfaced 2026-05-17 during manual hygiene check (`scripts/e2e-scrub.ts` Path B silently missed 17 rows).
- One-off hard-delete already executed via throwaway `tsx` script.
- Sibling: issue #458 (audit suspect specs and fix leaks at source) — sequenced after this PR.
- Yesterday's daily note (2026-05-18-craven.md) "What's next session" listed this as p1.
