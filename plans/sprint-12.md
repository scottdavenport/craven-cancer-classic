# Sprint 12 — Chore Batch (post-S11 follow-ups)

**Sprint goal:** Clean up the 5 follow-up items surfaced by the S11-4 sweep. All P3-low, all small, all post-merge quality work. Two parallel tracks on disjoint file surfaces.

**Baseline:** `main` at commit `304eeb9` (post Sprint 11). 516 tests passing. tsc clean. CSV import live-run completed.

---

## Issues

### Track A — Bolt (single PR)

**#169 TeamForm anyInlineOpen race** (latent bug, not user-reachable today)

Current state: `anyInlineOpen` is a shared boolean across 4 `ContactTypeahead` instances. If two inline forms opened simultaneously, the first cancel would set `anyInlineOpen = false` while the second is still open → Save/Cancel buttons misbehave.

Fix: replace the boolean with a `Set<string>` of open slot IDs (one per picker). Each picker adds/removes its own ID on open/close. `anyInlineOpen` derived = set is non-empty.

Files: `src/app/admin/teams/team-form.tsx` only.

Tests: existing S11-3 tests (20) must continue to pass — this is a refactor that preserves external behavior. No new tests required.

### Track B — Spec (single batched PR)

**#170 TeamForm submit paths — zero coverage**
Add tests for `TeamForm.handleSubmit` create path, edit path (`updateTeamMembers`), validation errors (missing name/captain), `isEdit` locked-name render branch.

File to create: `src/__tests__/team-form-submit.test.tsx`
Scope: ~6-8 tests.

**#171 AdminSidebar active-link logic — zero coverage**
Unit test with mocked `usePathname` → assert active-state for exact match and subroute match.

File to create: `src/__tests__/admin-sidebar-active-link.test.tsx`
Scope: ~3-4 tests.

**#172 Dead mockSelectResult in webhook-db-errors.test.ts**
Delete lines 196-201 (the captain_* mockSelectResult assignment that isn't consumed post-S11-2).

**#173 Webhook non-fatal branches untested**
Add 2 tests to existing webhook test file covering:
- Line 111: `release_stripe_event_lock` RPC failure → logged, continues, 200
- Line 210: `stripe_events.processed_at` stamp failure → logged, continues, 200

---

## Delivery order

Both tracks disjoint files, run fully parallel.

**Track A (Bolt):** #169 only — refactor, no new tests.
**Track B (Spec):** #170 + #171 + #172 + #173 bundled into one coverage-and-cleanup PR.

No Sentinel needed — no auth/security changes. Watchdog reviews each PR.

---

## Acceptance

- [ ] Both PRs merged
- [ ] Full suite ≥ 516 + ~14 new tests = ~530 passing
- [ ] `rg "mockSelectResult" src/__tests__/webhook-db-errors.test.ts` → zero hits (or only the non-captain cases)
- [ ] tsc clean, build passes
- [ ] All 5 GH issues (#169-#173) closed

---

## Out of scope

- UAT-BUNDLE-A (UI consistency pass) — deferred
- UAT-BUNDLE-B (team-list drawer migration) — deferred
- Sidebar grouping (UAT-1) + logo (UAT-2) — Sprint 15
