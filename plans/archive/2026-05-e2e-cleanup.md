# Sprint Plan: e2e-cleanup

**Status:** active
**Milestone:** [e2e-cleanup](https://github.com/scottdavenport/craven-cancer-classic/milestone/4)
**Target:** close when all six issues are merged and `npm run e2e:verify-clean` exits 0 against prod
**Plan authored:** 2026-05-15 by Compass
**Design spec:** `docs/superpowers/specs/2026-05-15-e2e-test-data-cleanup-design.md` (commit `ea5b7d1`)

---

## Plain-English readout

Right now, Playwright runs against the live production Supabase DB and leaves behind `e2e-*` rows in several tables. Only 6 of 15 specs try to clean up; the rest just leave rows sitting there. This sprint fixes that permanently.

The plan: every spec gets a `SEED_TAG` marker (a per-test UUID fragment) stamped into every row it inserts. An `afterAll` hook calls a centralized helper that deletes all rows bearing that tag, in the right FK order, using the service-role key to bypass RLS. A standalone scrub script runs as a CI post-step with `if: always()` so even crashed runs get cleaned. A verify-clean gate queries all tracked tables and fails the build if anything leaked. A lint spec runs first in the suite and blocks future specs that forget the marker discipline.

Sprint closes when a CI run shows scrub deleting 0 rows (per-test cleanup handled everything) and verify-clean exits 0.

---

## No user-facing strings attestation

**No user-facing strings.** This sprint adds no labels, CTAs, errors, empty/loading states, microcopy, or visible date/number/units formats. All work is backend/infra/test-tooling. No Aria gate needed.

---

## Issues

| # | Title | Specialist | Wave | Size | Labels |
|---|-------|-----------|------|------|--------|
| [#431](https://github.com/scottdavenport/craven-cancer-classic/issues/431) | Audit: query prod DB for existing e2e pollution | Flux | 0 | S | tech-debt, p1 |
| [#432](https://github.com/scottdavenport/craven-cancer-classic/issues/432) | Build cleanup-helper.ts | Flux | 1 | M | tech-debt, p1 |
| [#433](https://github.com/scottdavenport/craven-cancer-classic/issues/433) | Build e2e-scrub.ts + e2e-verify-clean.ts scripts | Flux | 1 | M | tech-debt, p1 |
| [#434](https://github.com/scottdavenport/craven-cancer-classic/issues/434) | Migrate all 15 e2e specs to cleanupTestData | Spec | 2 | L | tech-debt, p1 |
| [#435](https://github.com/scottdavenport/craven-cancer-classic/issues/435) | Wire CI safety-net post-steps | Flux | 2 | S | tech-debt, p1 |
| [#436](https://github.com/scottdavenport/craven-cancer-classic/issues/436) | Add lint spec, run one-time scrub, verify sprint goal | Forge | 3 | M | tech-debt, p1 |

---

## Dependency map

```
#431 (Wave 0 — Audit)
  └── blocks everything
       │
       ├── #432 (Wave 1 — cleanup-helper)     [parallel]
       │     └── blocks #434 (spec migration)
       │
       └── #433 (Wave 1 — scrub + verify scripts)   [parallel with #432]
             └── blocks #435 (CI wiring)
             └── blocks #436 (one-time scrub)

#434 (Wave 2 — spec migration)    [parallel with #435]
  └── blocks #436 (lint + final verify)

#435 (Wave 2 — CI safety-net)     [parallel with #434]
  └── blocks #436 (lint + final verify)

#436 (Wave 3 — lint + scrub + verify)
  └── closes sprint
```

**File-level conflict zones** (files touched by more than one issue — these pairs must run serial, not parallel):

| File | Issues that touch it | Serial constraint |
|------|---------------------|------------------|
| `.env.local.example` | #432 (B) and #435 (E) | B first, E checks/no-ops |
| `.github/workflows/e2e.yml` | #435 (E) only | no conflict |
| `package.json` | #433 (C) only | no conflict |
| `tests/e2e/*.spec.ts` (all 15) | #434 (D) only | no conflict |

No two parallel issues in the same wave touch the same file. Waves are safe to run in parallel.

---

## Execution order

### Wave 0 (serial, blocks all)
1. **#431** — Flux queries prod, posts per-table counts + FK order + column-marker mapping as an issue comment. No PR. Done when the comment is posted and Scott has approved the tracked-tables list.

### Wave 1 (parallel — start both after #431 closes)
2a. **#432** — Flux builds `cleanup-helper.ts` + Vitest unit test + `.env.local.example` update. PR on `e2e-cleanup/cleanup-helper`.
2b. **#433** — Flux builds `e2e-scrub.ts` + `e2e-verify-clean.ts` + smoke test + `package.json` wiring. PR on `e2e-cleanup/scrub-verify-scripts`.

### Wave 2 (parallel — start both after their respective Wave 1 PRs merge)
3a. **#434** — Spec migrates all 15 specs in 3 sequential PRs on `e2e-cleanup/spec-migration`. Starts after #432 merges. PRs grouped by spec family:
    - PR 1: contacts (7 specs: contact-bulk-blocked-alert, contact-bulk-delete, contact-bulk-subscribe, contact-create-edit, contact-multi-type, contact-soft-delete-restore, contact-type-removal-guard)
    - PR 2: teams + scores (5 specs: score-create-edit, team-create-edit, team-delete-type-to-confirm, team-deleted-member-placeholder, unique-email-after-softdelete)
    - PR 3: register-flow + smoke + leaderboard (3 specs)
3b. **#435** — Flux adds CI post-steps + configures GitHub Actions secret. PR on `e2e-cleanup/ci-safety-net`. Starts after #433 merges.

### Wave 3 (serial, closes sprint — start after both #434 and #435 are merged)
4. **#436** — Forge directly:
   - Opens PR `e2e-cleanup/lint-and-final-verify` with `_lint-marker-convention.spec.ts`
   - Runs one-time prod scrub (`npm run e2e:scrub`) before merging, captures pre/post verify-clean output in PR description
   - Merges after Watchdog APPROVED + CI green
   - Final CI run must show scrub step at 0 rows + verify-clean exit 0

---

## Total builder time estimate

| Issue | Estimate | Notes |
|-------|----------|-------|
| #431 | ~1h | DB queries + comment writing |
| #432 | ~3h | helper impl + unit test |
| #433 | ~3h | two scripts + smoke test + package.json |
| #434 | ~4h | 15 files, 3 PRs; L but bounded |
| #435 | ~1h | YAML edits + secret config |
| #436 | ~2h | lint spec + meta-test + scrub run + verification |
| **Total** | **~14h** | Across 3 waves; critical path is ~8h serial |

Critical path: #431 (1h) → #432 (3h) → #434 (4h) → #436 (2h) = 10h serial minimum.

---

## Sprint success criteria (from design spec)

All of these must hold before closing the milestone:

1. `npm run e2e:verify-clean` exits 0 against prod (no `e2e-*` rows in any tracked table)
2. CI run of the final PR shows scrub step deleting 0 rows
3. CI run of the final PR shows verify-clean step passing
4. All 15 specs have `test.afterAll(cleanupTestData(SEED_TAG))` and use helper-provided seedTag
5. `_lint-marker-convention.spec.ts` passes against the current spec set
6. `e2e:scrub:ci` post-step runs even when tests fail (verified by intentionally failing one spec in a throwaway commit before merge)

---

## Files created/modified by this sprint

```
CREATE  tests/e2e/fixtures/cleanup-helper.ts          (#432)
CREATE  tests/unit/cleanup-helper.test.ts              (#432)
CREATE  scripts/e2e-scrub.ts                           (#433)
CREATE  scripts/e2e-verify-clean.ts                    (#433)
CREATE  tests/unit/e2e-scripts.smoke.test.ts           (#433)
CREATE  tests/e2e/_lint-marker-convention.spec.ts      (#436)
CREATE  tests/e2e/fixtures/_lint-violation.fixture.ts  (#436)
MODIFY  .env.local.example                             (#432, #435)
MODIFY  package.json                                   (#433)
MODIFY  .github/workflows/e2e.yml                      (#435)
MODIFY  tests/e2e/contact-bulk-blocked-alert.spec.ts   (#434)
MODIFY  tests/e2e/contact-bulk-delete.spec.ts          (#434)
MODIFY  tests/e2e/contact-bulk-subscribe.spec.ts       (#434)
MODIFY  tests/e2e/contact-create-edit.spec.ts          (#434)
MODIFY  tests/e2e/contact-multi-type.spec.ts           (#434)
MODIFY  tests/e2e/contact-soft-delete-restore.spec.ts  (#434)
MODIFY  tests/e2e/contact-type-removal-guard.spec.ts   (#434)
MODIFY  tests/e2e/leaderboard.spec.ts                  (#434)
MODIFY  tests/e2e/register-flow.spec.ts                (#434)
MODIFY  tests/e2e/score-create-edit.spec.ts            (#434)
MODIFY  tests/e2e/smoke.spec.ts                        (#434)
MODIFY  tests/e2e/team-create-edit.spec.ts             (#434)
MODIFY  tests/e2e/team-delete-type-to-confirm.spec.ts  (#434)
MODIFY  tests/e2e/team-deleted-member-placeholder.spec.ts (#434)
MODIFY  tests/e2e/unique-email-after-softdelete.spec.ts (#434)
```
