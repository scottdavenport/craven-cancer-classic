# Issue #444 — Bulk-delete spec: replace UI-create setup with service-role seed

_Follow-on to the e2e-cleanup milestone (closed 2026-05-16). #444 was carried forward as a post-sprint focused fix once the pollution-load hypothesis from AC1 was disproved by Watchdog's clean-DB run on PR #446._

---

## Plain-English Readout

**Who is impacted:** Nobody in production — this is a test-only change. CI reliability for the contacts area improves: the `contact-bulk-delete` spec stops eating its entire 30s test-level timeout on setup, so the actual bulk-delete + Trash flow has room to complete consistently.

**What changes from their perspective:** Flaky red CI runs on `tests/e2e/contact-bulk-delete.spec.ts` go away. Per-test wall-time on this spec drops from ~28s to ~8s.

**What doesn't change:** Production code in `src/app/admin/contacts/contact-list.tsx` and `actions.ts` is untouched. The spec still verifies the same end-state (3 contacts selected → bulk-delete → moved to Trash). The afterAll cleanup path (`cleanupTestData(SEED_TAG)`) is unchanged.

---

## Aria Upfront-Gate

**No new strings.** This is a test-only change. No labels, CTAs, errors, empty/loading/success states, microcopy, or visible date/number/units formats are added or modified. Aria countersign not required.

---

## Root Cause (already investigated — confidence: high)

Diagnosed against chromium trace from CI run 25951341530:

- Network trace contains **6 paired POSTs** to `/admin/contacts` over ~14 seconds: 3 × (`createContact` action + `getContacts` refetch). The refetch fires because `ContactModal` passes `onSuccess={refetch}` and `refetch()` in `contact-list.tsx:192` calls `getContacts` inside a `startTransition`.
- Per-create wall time end-to-end: ~6-7 seconds (form open + 5 field fills + Save click + dialog-close await + RSC refetch round-trip).
- Total setup cost: ~21 seconds. Test budget: **30s** (chromium default, `playwright.config.ts:15`).
- **The bulk-delete server action never fires in the trace.** The trace ends at ~03:16:53 when the 3rd create's refetch completes — exactly at the 30s test-timeout boundary.
- Failure messages observed in CI (`expect(confirmBtn).toBeVisible` at L112 returning "Received: undefined"; `expect(BulkDel1).not.toBeVisible` at L127 polling 14×/16×/17×) are Playwright reporting **where the test was waiting when the global timeout cancelled mid-poll** — not real DOM/state bugs in the bulk-delete flow.
- webkit gets a 45s budget (`playwright.config.ts:40`) but is ~50% slower per the same config's comment, so it sits at the same edge — hence the L110 dialog-not-found on webkit.

The issue body's three candidate causes — UI latency, React state propagation, wait-margin — are all wrong. The bulk-delete code path is fine; the test never reaches it.

---

## The Fix

Swap the UI-create helper for a service-role insert. `serviceRoleClient` is already exported from `tests/e2e/fixtures/cleanup-helper.ts:44`. Pattern in use by `tests/e2e/team-delete-type-to-confirm.spec.ts:158` (fixture creation via REST + `registerOrphan`).

### File: `tests/e2e/contact-bulk-delete.spec.ts`

**Remove:** the `createTestContact` helper (lines 29-45). It's only used in this spec.

**Add:** a `seedTestContacts(runId)` helper that batch-inserts 3 rows via service-role:

```ts
async function seedTestContacts(runId: string) {
  const rows = [1, 2, 3].map((i) => ({
    first_name: `BulkDel${i}`,
    last_name: runId,
    full_name: `BulkDel${i} ${runId}`,
    email: `e2e-${SEED_TAG}-${runId}-bulk-del-${i}@example.com`,
    types: ['player'],
    year_first_seen: new Date().getFullYear(),
    marketing_consent: false,
  }));
  const { error } = await serviceRoleClient.from('contacts').insert(rows);
  if (error) throw new Error(`seedTestContacts: ${error.message}`);
}
```

**Schema-required field notes:**
- `full_name: string` — schema-required (no default). The UI displays `displayName ?? full_name`; `displayName` is derived in `contact-list.tsx` from `first_name + last_name`, so `getByText('BulkDel1 <runId>')` resolves against the derived display name. We set `full_name` redundantly to satisfy the schema; it's never seen by the test assertions.
- `year_first_seen: number` — schema-required. Use `new Date().getFullYear()`.
- `email` — must match the `e2e-${SEED_TAG}%@example.com` glob so `cleanupTestData(SEED_TAG)` in `afterAll` still hard-deletes these rows. The pattern is enforced by `cleanup-helper.ts:100-102`.
- `types: ['player']` — matches what the previous UI flow set via the Player toggle.
- No `registerOrphan` call needed — cleanup matches by email pattern, not by registered IDs.

**Test body change:** Call `await seedTestContacts(RUN_ID)` BEFORE `await page.goto('/admin/contacts')`. The page load's server-side `getContacts()` will then include the seeded rows.

**Keep unchanged:**
- The mouse-to-corner + 200ms-gap checkbox loop (L74-84) — still needed for the webkit RowActions hover race documented at L70-73.
- The bulk-Delete button wait + `toBeEnabled` guard + force-click (L93-98).
- The dialog filter, confirm-button wait, and force-click (L107-116).
- The dialog-close wait (L124) and row-disappear waits (L127-129).
- The Trash navigation and verification (L132-141).
- `afterAll(() => cleanupTestData(SEED_TAG))` (L25-27).

**Update the top-of-file comment block** (L1-8) to describe the new setup approach and explain that we bypass the UI create flow to keep the spec under its 30s budget.

**Prune stale comments:** L20-23 explains SEED_TAG / RUN_ID rationale referencing the UI flow's per-attempt collision risk. Keep the RUN_ID portion (still used as `last_name` for per-retry uniqueness) but drop references to LESSONS-LEARNED Rule 159 / #410-A workarounds that only applied to the UI create path. Comments at L42-44 (10s extend for dialog close) and L91-92, L104-106, L108-109 (extends justified by "parallel chromium load") become irrelevant once setup time collapses — remove them. Comments at L70-73 (mouse-to-corner / RowActions) and L75-83 (checkbox loop guards) stay — those address real webkit/chromium browser races, not the budget issue.

---

## What NOT to change

- `src/app/admin/contacts/contact-list.tsx` — production code is fine. `handleBulkDelete`, the dialog, the optimistic `setContacts` filter all work correctly. The trace evidence is that they never get exercised.
- `src/app/admin/contacts/actions.ts` — `bulkDeleteContacts` is fine.
- `tests/e2e/fixtures/cleanup-helper.ts` — `serviceRoleClient` and `cleanupTestData` are used as-is.
- `playwright.config.ts` — do NOT bump the 30s chromium timeout. The fix is to make the spec fit within budget, not to grant more budget.
- Sibling contact specs (`contact-bulk-subscribe.spec.ts`, `contact-soft-delete-restore.spec.ts`, etc.) — out of scope. If you notice another spec with the same setup-too-slow pattern while reading, file a follow-up issue but do NOT expand this PR.

---

## Pre-Flight Greps

<!-- HARD-GATE: Builder must run all four greps BEFORE opening the PR and paste verbatim output in the PR body. -->

**Grep 1 — current setup helper count (expected: 1)**
```
grep -cn "createTestContact" tests/e2e/contact-bulk-delete.spec.ts
```
Expected: greater than 0 pre-patch (helper exists). Expected post-patch: 0 (helper removed).

**Grep 2 — service-role import isn't already there (expected pre-patch: 0)**
```
grep -n "serviceRoleClient" tests/e2e/contact-bulk-delete.spec.ts
```
Expected pre-patch: 0. Expected post-patch: 1 import line + 1 usage in `seedTestContacts`.

**Grep 3 — cleanup contract not broken (expected: stays 1)**
```
grep -n "cleanupTestData(SEED_TAG)" tests/e2e/contact-bulk-delete.spec.ts
```
Expected pre and post: exactly 1 line (the afterAll call). If you accidentally remove it, afterAll cleanup breaks and prod rows accumulate.

**Grep 4 — sibling specs don't import the dropped helper (expected: 0)**
```
grep -rn "createTestContact" tests/e2e/ | grep -v "contact-bulk-delete.spec.ts"
```
Expected: 0 lines. The helper is local; if any other spec referenced it (it shouldn't), surface to Forge before deleting.

---

## Acceptance Criteria

- [ ] **AC1** — `createTestContact` helper removed. `seedTestContacts` helper using `serviceRoleClient.from('contacts').insert([...])` added.
- [ ] **AC2** — Spec runs locally green on chromium: `npm run test:e2e -- --project=chromium tests/e2e/contact-bulk-delete.spec.ts`.
- [ ] **AC3** — Spec runs locally green on webkit: `npm run test:e2e -- --project=webkit tests/e2e/contact-bulk-delete.spec.ts`.
- [ ] **AC4** — Flake-resistance check: `npm run test:e2e -- --project=chromium tests/e2e/contact-bulk-delete.spec.ts --repeat-each=3 --workers=1` passes 3/3.
- [ ] **AC5** — `cleanupTestData(SEED_TAG)` in afterAll still runs (visible in test output) and matches the seeded rows. Verify by running the spec twice in a row — second run should not see leftover BulkDel{1,2,3} contacts.
- [ ] **AC6** — All four pre-flight greps return the expected counts. Paste output in the PR body.
- [ ] **AC7** (post-merge, not a builder gate) — Forge watches main CI for 5 runs to confirm the original AC3 flake-vs-deterministic check from #444 resolves at 5/5 pass rate.

---

## PR Shape

- Single PR, single commit.
- Title: `fix(#444): seed bulk-delete contacts via service-role (skip slow UI create flow)`
- Body must include:
  - One-paragraph root cause restatement (test-level timeout eaten by UI setup, bulk-delete never fired in failing traces).
  - One-paragraph fix description (service-role batched insert, ~21s → <1s setup).
  - Verbatim output of the four pre-flight greps.
  - Local test results (chromium green, webkit green, --repeat-each=3 results).
  - `Closes #444`.
- Branch: `fix/444-bulk-delete-service-role-seed` (or whatever Forge convention dictates).

---

## Provenance

- Root-cause analysis: Forge session 2026-05-16, traced via downloaded chromium artifact from CI run 25951341530.
- Approach confirmed by Scott in-session before plan file written.
- Related but out-of-scope: #428 (local workers≥6 checkbox-click race) — does not apply in CI workers=1, separate investigation track.
