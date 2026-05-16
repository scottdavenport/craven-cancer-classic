# Craven Cancer Classic — Lessons Learned

Codebase-specific patterns, rules, and gotchas. Read this before every task in this repo.

These were re-homed from Forge auto-memory on 2026-05-01 because the lessons are craven-specific and don't apply to coach or other projects. Each rule cites its originating sprint.

---

## Rule: Admin Server Actions Need requireAdmin

Every server action created under `src/app/admin/**` must call `await requireAdmin()` (imported from `@/lib/supabase/admin`) as its very first statement, before `createClient()` or any DB query.

**Why:** Middleware at `src/lib/supabase/middleware.ts` only checks authentication (logged-in vs. logged-out). It does NOT check admin role. Role enforcement lives per-action in `requireAdmin()`, which verifies `profile.role === "admin"` and redirects unauthenticated/non-admin callers to login. An action without `requireAdmin()` leaks data (counts, rows, aggregates) to any authenticated user who calls it directly.

**How to apply:**
- When adding a new server action in `src/app/admin/**`, include `await requireAdmin()` as the first statement. Grep existing admin actions (`grep -rn 'requireAdmin' src/app/admin/`) to confirm the pattern.
- Code review must verify `requireAdmin()` is present and positioned first on any new admin action.
- This rule applies to read-only actions too. The S16 `getDashboardStats` near-miss was a read-only counts action that leaked revenue + contact counts before the fix.

**Reference:** Sprint 16 PR #190 near-miss. Watchdog REQUEST_CHANGES caught it, one-cycle fix via PR commit `66d74c8`.

---

## Rule: No native browser UI in the app

Never use `window.confirm()`, `window.alert()`, `window.prompt()`, or native HTML `<select>` elements in production code. Always use styled components (shadcn Dialog, shadcn Select, or equivalent).

**Why:** Craven is positioned as a high-end product. Native browser dialogs and selects look cheap, break visual cohesion, and signal "prototype." Even for "small" confirmations like delete-this-sponsor, use a proper modal. Flagged during UAT on 2026-04-19 when reviewing `/admin/sponsors`.

**How to apply:**
- **Confirmations** (delete, destructive actions) → shadcn `<Dialog>` with custom styled buttons. Pattern: S10-5 DeleteTeamDialog.
- **Dropdowns / selects** → shadcn `<Select>`.
- **Multi-select** → shadcn `<DropdownMenu>` with checkbox items.
- **Alerts / notifications** → sonner `toast` (already wired in admin layout).
- **Prompts** → inline form or modal, never `prompt()`.

**Audit scope:** any `confirm(`, `alert(`, `prompt(`, or raw `<select>` in `src/` is a violation. Grep for these on every sprint review.

---

## Rule: Centered modal is the standard for admin CRUD edits

Centered modal — shadcn `<Dialog>` with `sm:max-w-[800px]` as the default width — is the standard pattern for admin CRUD create/edit experiences. Side drawers (shadcn `<Sheet>`) are retired. Inline forms remain banned.

**Why:** Side drawers don't fit the platforms admins actually use — laptops and tablets — where the expected pattern when opening a record to edit is a centered window in the middle of the screen. The drawer's right-side panel competes with the list behind it. Scott confirmed 2026-04-29 (during contacts multi-type planning) that the drawer pattern itself is the problem, not the size — widening doesn't fix the platform-fit issue. Earlier (2026-04-19) the drawer was canonized as a step up from inline forms; the new policy supersedes that.

**How to apply:**
- New admin CRUD edit forms: build as centered modal from day one. Default width `sm:max-w-[800px]`. Mobile: full-screen.
- Existing drawer-based admin forms: migrate to modal the next time the form is touched in regular work. Surgical, not a sweep.
- Reference implementation: `src/app/admin/contacts/contact-modal.tsx` + `contact-form.tsx`.
- Two-column rows for short fields (e.g. salutation/first/last on one row; city/state/zip on one row) when modal width allows.
- Modals are custom shadcn Dialog — never `window.confirm` / `alert` / `prompt`.

**Pages to migrate when next touched:**
- `/admin/sponsors` (was inline)
- `/admin/sponsorships`
- `/admin/scores`
- `/admin/teams` (already partially on modal — confirm and bring fully on)

---

## Rule: base-ui Select needs items prop for label resolution

When porting or adding any `<Select>` (shadcn wrapping `@base-ui/react/select`), the trigger's displayed label is NOT derived from `<SelectItem>` children. Without explicit configuration, `<SelectValue>` renders `String(value)` — broken for UUIDs and ugly for lowercase enums.

**Why:** Radix Select maps the selected value to the matching `<Select.Item>`'s `ItemText` children. base-ui does not. Verified by reading `@base-ui/react/select/value/SelectValue.js` — its fallback chain calls `resolveSelectedLabel(value, items, itemToStringLabel)`, which falls through to `stringifyAsLabel(value)` (= `String(value)`) when neither `items` nor `itemToStringLabel` is provided.

**How to apply:** every `<Select>` with a value whose display form differs from its literal value needs ONE of:

1. `items` on `<Select.Root>` (a `Record<value, label>` or array of `{value, label}`):
   ```tsx
   <Select
     value={x}
     onValueChange={setX}
     items={{ pending: "Pending", paid: "Paid", comped: "Comped" }}
   >
     <SelectTrigger><SelectValue /></SelectTrigger>
     <SelectContent>
       <SelectItem value="pending">Pending</SelectItem>
       ...
     </SelectContent>
   </Select>
   ```
2. `itemToStringLabel` function on `<Select.Root>`
3. `children` render function on `<Select.Value>`: `<SelectValue>{(v) => labelFor(v)}</SelectValue>`

Keep `<SelectItem>` children as-is — base-ui uses those for the dropdown list; `items` is only consulted for the trigger.

**When this matters most:** the value is a UUID, boolean-as-string, or any code that is not itself a human-readable label. When value and label happen to match (`<SelectItem value="Player">Player</SelectItem>`), the trigger renders correctly by accident.

**Reference:** Sprint 13 PR #176 shipped 5 new `<Select>` sites; all reviewers assumed Radix-style behavior. Scott caught the sponsor-list tier trigger displaying a UUID in live testing. Hotfix #177 added `items` to all 5 sites. Pre-existing sites (team-form session, contact-list filters, contact-form type) have the same pattern but with readable-enough values; separate P2 issue #178.

---

## Rule: Never user.type with long strings

Never use `await user.type(input, "x".repeat(N))` or similar character-by-character typing in tests where N is larger than about 50 characters.

**Why:** `user-event v14`'s `.type()` dispatches a full `keydown` / `keypress` / `input` / `keyup` event cycle per character, each going through React's synthetic event system and rerendering the component. On a 2001-character string this easily blows past the 5-second vitest default timeout under modest CPU contention. You'll see "fortunate passes" in isolation and deterministic failures in the full suite when many vitest workers run in parallel. This pattern broke two S17 tests on 2026-04-20, required hotfix PR #193, and masked as a "flaky test" instead of what it really was — a performance time bomb.

**How to apply:**
- For **boundary / length tests** (name too long, description over 2000 chars) use `fireEvent.change(input, { target: { value: "x".repeat(N) } })` — sets the value in one synchronous step. Follow with `fireEvent.blur(input)` to trigger the blur-time validator React's controlled input listens for.
- For **date input tests** (`user.type(dateInput, "2026-09-18")`) prefer `fireEvent.change(dateInput, { target: { value: "2026-09-18" } })` — sets the full ISO string atomically.
- Reserve `user.type` for tests where you specifically want to assert per-keystroke behavior: intermediate validation states, debounced-search timing, autocomplete-on-typing.
- **Code review check:** grep new tests for `user.type\(.*repeat\(.*\)` or `user.type\(.*".{50,}"\)`. Any match is a performance red flag.

Tests written this way are faster (under 1 second vs. several seconds), deterministic across CPU load, and assert the same React events (change + blur) that controlled form validators actually listen for.

---

## Rule: Program-language precision

When Craven copy references what donations or sponsorships fund, the canonical program list is **transportation, lodging, and medical equipment for cancer patients in active treatment.** This list lives on the donate page and is the source of truth.

**Why:** The placeholder copy on Sprint 22 sponsors-redesign PR #253 used "treatment" as a catch-all ("transportation, lodging, and treatment") which conflates the medical act with the logistical support that Carolina East Health Foundation actually funds. The Craven Cancer Classic doesn't pay for treatment — it pays for the things that surround treatment so patients can show up and not bankrupt themselves doing it. Saying "treatment" misrepresents both what the money does and the foundation relationship.

**How to apply:**
- Any Craven copy referencing program areas (donate CTAs, sponsor CTAs, masthead body, mission narrative, social copy) should pull from the donate-page program list, not paraphrase from memory.
- Acceptable phrasing: "transportation, lodging, and medical equipment", "transportation to treatment, lodging during extended care, medical equipment", or sub-selections of those three.
- "for cancer patients in active treatment" is the right qualifier when context allows — it specifies who, without claiming Craven funds the medical care.
- Copy review: flag if any copy implies Craven funds treatment itself.

---

## Rule: `{ force: true }` is not a click-race silver bullet (Playwright)

When a Playwright test's `.click()` times out in webkit but passes in chromium, `{ force: true }` only fixes a subset of the underlying causes. Reach for the right tool based on the actual failure mode:

| Symptom | Likely cause | Fix |
|---|---|---|
| `locator.click: Timeout exceeded`, "waiting for element to be visible/enabled/stable" | Hover-reveal opacity transition + actionability check | `{ force: true }` — bypasses Playwright's actionability check |
| `<div>…</div> intercepts pointer events` in the call log | A sibling/parent element is on top of the target at hit-test time | Wait for the obscuring element to settle, OR target a more specific selector inside the cluster |
| Click fires (no error) but next assertion `expect(dialog).toBeVisible()` fails with `element(s) not found` | React state update from the click hasn't committed before the assertion runs (often because the modal/list waits for a `transitionend` event that webkit doesn't fire reliably) | `playwright.config.ts` → `use: { contextOptions: { reducedMotion: "reduce" } }` on the **webkit project only** |

**Why:** Sprint 38 (e2e refresh #394) burned 4 PRs on whack-a-mole `{ force: true }` patches before realizing the third class of failure was unfixable at the test-side. `reducedMotion: "reduce"` disables CSS transitions at the browser level, which removes the `transitionend`-listener race entirely. Set it on the webkit project, NOT chromium — chromium app code (Base-UI Dialog/Sheet via `data-open:animate-in`) relies on the transition firing for state commit; suppressing it on chromium breaks tests that pass without it. PR #401 is the rollback evidence.

**How to apply:**
- New flaky test in webkit only? Read the failure call log carefully. Don't blanket-add `{ force: true }`.
- "Intercepts pointer events" → fix the selector or wait, not `force: true`.
- "Element(s) not found" after a click that succeeded → look at `playwright.config.ts` first; if `reducedMotion` is already set on webkit, the issue is elsewhere (e.g. a missing `await waitFor`).
- Per-project Playwright config edits should always be scoped to the failing browser, not blanketed.

---

## Rule: Verification claims must be backed by exit codes (HARD-BLOCK)

When a builder/specialist (Spec, Bolt, Flux) claims `npx tsc --noEmit passes` or `vitest passes` in a PR body or summary, that claim must be backed by an actual run with exit code 0 captured. Watchdog enforces this as a Stage 1 HARD-BLOCK on review.

**Why:** Sprint 38 PR #400 (e2e config) shipped from Spec with the claim "✅ npx tsc --noEmit passes." The claim was false — actual tsc run was exit 1 with TS2769 errors at `playwright.config.ts:25` (wrong placement of `reducedMotion`). The Vercel build was also failing because Vercel's Next.js build runs tsc post-compile. Watchdog caught both on review and blocked. The fix was a 2-line move that took 5 minutes, but the false claim cost a review cycle and could have shipped a broken main if Watchdog hadn't been thorough.

**How to apply:**
- **Builders:** before writing "tsc passes" in a PR body, capture the exit code: `npx tsc --noEmit; echo "exit=$?"`. Paste the actual evidence.
- **If your worktree doesn't have `node_modules`** (common in worktrees Spec creates), copy your edited file into the main repo, run tsc from there, then revert. Don't claim verification with no node_modules to verify against.
- **Watchdog Stage 1:** when a PR body claims a verification check passed, re-run that check against the PR HEAD before approving. If the claim is false, post the actual exit code + error output verbatim and request changes. Don't soft-pedal it.
- This rule applies symmetrically to vitest, lint, and any other "passes" claim.

---

## Rule: Module-level `Date.now()` seeds break Playwright `--repeat-each` isolation

Never assign a seed, timestamp, or unique-per-run identifier at module scope in a Playwright spec when it's used to namespace test data (e.g. `SEED_TAG = Date.now()` used as a contact-name suffix to keep runs from colliding). Move it inside the test, into closure scope.

**Why:** Module-level bindings evaluate ONCE per Playwright worker process. With `--repeat-each=N` in a single worker, all N invocations of the test share the same seed value. Any test data created with that seed will collide across runs — earlier-run rows are still present when the next run starts, so unique-key constraints fire, "first contact" selectors land on a stale row, and the spec passes 1/10 or 4/10 with non-deterministic failure modes. Discovered in PR #427 (sprint e2e-stability, #410 chromium characterization): `tests/e2e/contact-bulk-delete.spec.ts` and `tests/e2e/contact-soft-delete-restore.spec.ts` both had module-level `SEED_TAG = Date.now()` and both failed under `--repeat-each=10`. Moving the assignment inside the test (closure-local) gave each invocation a fresh value and got both specs to 10/10 at workers=1.

**How to apply:**
- Grep new specs for module-scope `Date.now()`, `crypto.randomUUID()`, or `Math.random()` usage. Any match that gets used inside the test body is a per-worker shared-state hazard.
- The fix is mechanical: move the assignment into the `test(...)` callback so each invocation gets a fresh closure value. Pattern:
  ```ts
  // BAD — module-level, shared across --repeat-each invocations:
  const SEED_TAG = Date.now();
  test("...", async ({ page }) => { /* uses SEED_TAG */ });

  // GOOD — closure-local, fresh per invocation:
  test("...", async ({ page }) => {
    const SEED_TAG = Date.now();
    /* uses SEED_TAG */
  });
  ```
- This rule applies even when a spec "passes in CI" — CI runs at workers=1 with no `--repeat-each`, so the bug is invisible until someone runs the spec locally with `--repeat-each=N` for characterization. Land the fix preemptively whenever the pattern is spotted, not when a flake reproduces.

---

## Rule: Test-side fixes that stall at "improved but not 100%" need source-side investigation

When a Playwright spec's pass rate climbs from baseline-flaky to roughly 3/5 with actionability guards (`waitFor`, `force: true`, hover-deactivation, selector tightening) but won't get to 5/5, the remaining failures are almost always source-side — DOM hit-test interception, a React state race, or a CSS transition the test can't synchronize against. Pile no more test-side workarounds; spawn a source-side investigation.

**Why:** Sprint e2e-stability (PR #422) shipped five layered test-side guards to fix `contact-bulk-delete.spec.ts` webkit flakes — `waitFor({ state: 'visible' })` on the checkbox, `page.mouse.move(0, 0)` to deactivate prior hover state, exact-match `getByRole("button", { name: "Delete" })` for the bulk-action bar, dialog scoping via `filter({ hasText: /soft-delete/i })`, 200ms settle gaps. Local `--repeat-each=5` webkit topped out at ~3/5 green. Diagnosis: webkit's hit-test was letting the RowActions wrapper `<div class="flex items-center justify-end gap-2">` at `contact-list.tsx:1021` intercept clicks meant for the per-row checkbox. `force: true` bypasses Playwright actionability but NOT browser-level pointer-event interception. PR #424 added a single class — `pointer-events-none` — to the wrapper div. CI E2E on PR #424 alone (without #422's test-side guards merged) hit chromium 45/45 + webkit 46/46. The source fix was the whole answer; the test-side guards became defense-in-depth.

**How to apply:**
- **Decision rule:** if four or more test-side mitigations are stacked on a single spec and pass rate is still < 90%, stop layering. Spawn Bolt/Flux to investigate the source.
- **Look for these source-side patterns first:**
  - Wrapper `<div>` around interactive children that does not carry `pointer-events-none` (intercepts clicks, especially in webkit's strict hit-test)
  - Components using `startTransition` around state updates that the test then asserts on (transition not committed before the next tick — see issue #428)
  - CSS transitions that webkit's `transitionend` listener doesn't fire reliably for (see "force: true is not a silver bullet" Rule above — `reducedMotion: "reduce"` on the webkit project is the right knob)
- **Spec's boundary holds:** when the diagnosis lands in `src/`, Spec files a follow-up issue + ships whatever test-side improvement was possible. Spec does not touch source. This is what kept the e2e-stability sprint from sprawling: clear handoff (Spec → file issue → Bolt picks it up next wave).
- **Don't defer the source fix to "next sprint" reflexively** — the default-bundling rule in `DELEGATION-POLICY.md` applies: same-class bug, mechanical fix, ≤30 min total → bundle into the current sprint. The e2e-stability sprint did this for #423 (1 CSS class on contacts) and #425 (same fix on 3 sibling admin lists).

## e2e-cleanup (2026-05-16)

### Shipped
- **PR #437** (Wave 1) — `tests/e2e/fixtures/cleanup-helper.ts` with `serviceRoleClient` + `cleanupTestData(seedTag?)` + `registerOrphan` (Flux)
- **PR #438** (Wave 1) — `scripts/e2e-scrub.ts` + `scripts/e2e-verify-clean.ts` + package.json wiring; discovered Supabase's PostgREST 1000-row pagination limit live against prod (Flux)
- **PR #440** (Wave 2) — `e2e:scrub:ci` + `e2e:verify-clean` as `if: always()` CI post-steps (Flux)
- **PR #441** (Wave 2) — migrated all 15 e2e specs to `cleanupTestData(SEED_TAG)`; included Forge-direct fix for Watchdog-caught Rule 159 regression (SEED_TAG → RUN_ID split for retry isolation)
- **PR #443** (mid-sprint #442) — `withRetry` helper + chunk-size 500→100 fix after Watchdog CI run revealed PostgREST URL-length limit was deterministic, not transient (Flux + Forge-direct chunk fix)
- **PR #446** (Wave 3) — `_lint-marker-convention.spec.ts` + violation fixture (Spec); ran one-time prod scrub; verify-clean exits 0 end-to-end
- **PR #447** (post-Wave-3 hardening) — broadened scrub + lint to `%@example.com` after live SQL surfaced 1,624 `bulk-del-*@example.com` rows that escaped the e2e-* convention (Flux)
- **PR #448** (chore) — restored sprint spec + plan that were lost when local commits weren't pushed before `git reset --hard origin/main`

### Slipped
- **#439** (no-seedTag pagination tightening, p2) — deferred to next milestone; latent bug in dead-code path
- **#444** (contact-bulk-delete dialog timeout regression, p1) — pollution-load hypothesis disproved by CI run on PR #446 (clean DB, still flaky); structural fix needed
- **#445** (race-residual: late-test contact written between snapshot and `.ilike` sweep, 0.03% miss rate, p2) — filed by Watchdog during #443 review

### Lessons
- **Mocked unit tests miss request-shape bugs.** PR #437's `vi.mock` cleanup-helper tests passed cleanly. PR #438's local-prod testing surfaced the 1000-row PostgREST pagination limit. PR #443's CI run surfaced the 500-UUID `.in()` URL-length deterministic failure. Pattern: when a helper's primary risk surface is "interacts with external system X under real-payload sizes," mocked tests have a known coverage gap; live exercise against the real system is load-bearing.
- **Module-level SEED_TAG breaks under Playwright retries (Rule 159 reaffirmed).** Spec's first migration moved `SEED_TAG` to module scope; under retries the same emails recur and prior-attempt rows collide with current-attempt assertions. Resolution: module-level SEED_TAG for `afterAll(cleanupTestData(SEED_TAG))` matching (broad wildcard) + per-test RUN_ID generated inside `test()` callback for fixture identity (regenerated on retry).
- **Marker-by-name convention only catches NEW pollution.** The `e2e-%@example.com` scrub pattern shipped clean but missed 1,624 historical rows with `bulk-del-<idx>-<Date.now()>@example.com` emails predating the convention. Post-hoc broadening to `%@example.com` (with rationale: this project's prod has zero real `@example.com` users) was needed. Lesson: marker convention is necessary but not sufficient — a one-time legacy sweep + broader catch-all in the scrub is the load-bearing complement.
- **Chunk size for `.in()` is request-shape, not transient.** Initial diagnosis of "fetch failed" assumed undici network blip. Watchdog's CI verification proved the failure was deterministic: 500-UUID `.in()` produces a ~18KB URL that PostgREST rejects. The retry helper helped but didn't fix the underlying shape. 100-UUID chunks (~4KB) leave 3× margin on the URL limit observed locally (300-400 ID ceiling).
- **CI safety-net effectiveness is itself testable.** PR #440's `if: always()` post-steps were the load-bearing assertion of the sprint. Watchdog verified they fire in BOTH success and failure paths during its review CI runs. Sprint goal verification was therefore on the script + CI integration, not just on test ACs.
- **`git reset --hard origin/main` after unpushed local commits is a load-bearing footgun.** Forge committed the sprint spec doc + Compass's plan file directly to local main, then did `git reset --hard origin/main` to sync; the local commits were dropped silently. Reflog rescued them, but the discovery point was Gate 6 of `/close-sprint` (the plan file was missing). Process: never commit substantive artifacts directly to local main without pushing first OR opening a PR; use a branch.
- **Override path for Watchdog REQUEST_CHANGES.** PR #441's bulk-delete spec migration was provably correct, but CI red on a separate pre-existing regression (#444). Watchdog's review body explicitly recommended override. A third-pass review with explicit override justification cleared the merge gate. Pattern: Watchdog can issue an override approval when blocking failure is provably unrelated to the diff under review.
