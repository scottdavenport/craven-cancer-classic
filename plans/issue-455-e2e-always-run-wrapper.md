# Issue #455 — Restructure e2e.yml with always-run wrapper

_Structural fix for the design conflict between #451 (paths-filtered trigger) and #452 (required-check gating). Surfaced during PR #454 when the gate locked itself out and Scott had to admin-bypass-rebase to land it._

---

## Plain-English Readout

**Who is impacted:** Anyone opening a PR. Today, docs/plans-only PRs can't merge because the required `playwright (chromium)` / `playwright (webkit)` checks never appear (paths filter skips the workflow entirely). After this fix, both checks always appear on every PR — auto-green in ~30s for irrelevant paths, full ~6-8min run for relevant paths.

**What changes from their perspective:** Their PR's check rollup always shows the two playwright checks. They no longer need admin help to merge a docs PR.

**What doesn't change:** The actual playwright test suite, the matrix browsers, the artifact upload, the scrub/verify-clean safety net. None of those touch this issue's scope.

---

## Aria Upfront-Gate

**No new strings** in the app. CI workflow restructure only. Aria countersign not required.

---

## The Design Pattern

The root cause of #454's lockout: when a workflow's `on:` block has a `paths:` filter, the workflow simply doesn't fire for non-matching paths — no jobs, no checks, no status. GitHub's branch protection then treats the required check as "expected, pending forever" and refuses to merge. This is a well-known GitHub Actions footgun.

The fix is the **always-run wrapper pattern**: drop the top-level `paths:` filter, fire the workflow on every PR, and use a first-step path detection inside the job that gates subsequent steps via `if:` conditions. When paths don't match, the job exits success in ~30s without running the heavy steps. When they do, the full suite runs as today. Critically: the job (and therefore the matrix-named checks) **always exists and always reports**, so branch protection's contract is honored.

Implementation choice: **inline `git diff` against base ref** rather than `dorny/paths-filter@v3`. Reasons:
- No third-party action dependency to maintain or audit.
- Pattern is ~10 lines of bash, trivially auditable.
- `dorny/paths-filter` adds an `actions/checkout` requirement anyway, so the "complexity savings" are illusory.
- If we ever want to migrate, the bash is a clear contract we can swap out.

---

## The Change

File: `.github/workflows/e2e.yml`.

### Change 1 — Drop the `paths:` filter from the `on: pull_request:` block

Currently (lines 7-18):
```yaml
  pull_request:
    # Run e2e on PRs touching test/prod code per #451.
    paths:
      - 'tests/e2e/**'
      - 'playwright.config.ts'
      - 'src/app/**'
      - 'src/components/**'
      - 'src/lib/**'
      - 'src/types/database.ts'
      - 'package.json'
      - 'package-lock.json'
      - '.github/workflows/e2e.yml'
```

Becomes:
```yaml
  pull_request:
    # Fires on every PR; per-job path filter inside the playwright job decides
    # whether to run the heavy suite or auto-pass. See #455 for the rationale.
```

### Change 2 — Add `fetch-depth: 0` to the checkout step

Current: `- uses: actions/checkout@v4` (default depth 1).
New: needs full history for `git diff` against the PR base.

```yaml
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
```

### Change 3 — Insert the path-detection step at the top of `steps:` (after checkout)

```yaml
      - name: Detect e2e-relevant changes
        id: changes
        shell: bash
        run: |
          # Push and manual dispatch always run the full suite.
          if [ "${{ github.event_name }}" != "pull_request" ]; then
            echo "should-run=true" >> "$GITHUB_OUTPUT"
            echo "trigger=${{ github.event_name }} — running full suite"
            exit 0
          fi
          # PR: diff against base to see if any e2e-relevant file changed.
          BASE_SHA="${{ github.event.pull_request.base.sha }}"
          CHANGED=$(git diff --name-only "$BASE_SHA"...HEAD)
          if printf '%s\n' "$CHANGED" | grep -qE '^(tests/e2e/|playwright\.config\.ts$|src/app/|src/components/|src/lib/|src/types/database\.ts$|package(-lock)?\.json$|\.github/workflows/e2e\.yml$)'; then
            echo "should-run=true" >> "$GITHUB_OUTPUT"
            echo "paths filter: relevant changes detected — running playwright"
          else
            echo "should-run=false" >> "$GITHUB_OUTPUT"
            echo "paths filter: no relevant changes — playwright skipped (job exits success)"
          fi
```

**Path pattern parity check** — the regex matches the same files as #451's `paths:` filter:
- `tests/e2e/` (dir prefix) ↔ `tests/e2e/**`
- `playwright.config.ts` (exact) ↔ `playwright.config.ts`
- `src/app/`, `src/components/`, `src/lib/` (dir prefixes) ↔ `src/app/**` etc.
- `src/types/database.ts` (exact) ↔ same
- `package.json` and `package-lock.json` (exact, alternation) ↔ both listed
- `.github/workflows/e2e.yml` (exact) ↔ same

### Change 4 — Gate every subsequent step on `should-run`

Add `if: steps.changes.outputs.should-run == 'true'` to:
- `actions/setup-node@v4`
- `npm ci`
- `npx playwright install --with-deps ...`
- `npm run build`
- `npm run test:e2e -- --project=...`

The artifact upload, scrub, and verify-clean steps currently use `if: always()`. Change those to `if: always() && steps.changes.outputs.should-run == 'true'` — they should only fire if the suite actually ran. If should-run is false, there's no playwright-report to upload and no test pollution to scrub.

### Change 5 — Bump `timeout-minutes` (optional, leave as-is)

Current: `timeout-minutes: 20`. Adequate for the full run. Leave unchanged.

---

## What NOT to change

- The matrix (`browser: [chromium, webkit]`) — keep.
- `fail-fast: false` — keep (so one browser's flake doesn't kill the other's signal).
- Env var list on `npm run build` and `npm run test:e2e` — keep.
- The artifact retention period (7 days) — keep.
- The scrub + verify-clean commands — keep (just add the should-run gate).
- Other workflows (`vitest.yml`, `deploy-production.yml`, `triage-on-issue-create.yml`) — out of scope.
- `playwright.config.ts` — out of scope.
- Branch protection settings — already correct; don't touch.

---

## Pre-Flight Greps

<!-- HARD-GATE: Builder must run all four BEFORE making the edit and paste verbatim output in the PR body. -->

**Grep 1 — current `on:` block matches expected pre-state**
```bash
sed -n '/^on:/,/^jobs:/p' .github/workflows/e2e.yml
```
Expected: includes the `pull_request:` block with the 9-line `paths:` list per #451. If different, surface — someone else may have started this work.

**Grep 2 — fetch-depth not already overridden**
```bash
grep -n "fetch-depth" .github/workflows/e2e.yml
```
Expected: 0 hits. If 1+ hit, the checkout step already has a depth setting — preserve it or merge with `fetch-depth: 0`.

**Grep 3 — no existing `steps.changes.outputs` or `should-run` usage**
```bash
grep -nE "should-run|steps\.changes" .github/workflows/e2e.yml
```
Expected: 0 hits. If anything matches, someone has started a parallel implementation.

**Grep 4 — branch protection still has the three required checks**
```bash
gh api repos/scottdavenport/craven-cancer-classic/branches/main/protection/required_status_checks --jq '{contexts, strict}'
```
Expected: `{"contexts":["playwright (chromium)","playwright (webkit)","vitest"],"strict":true}`. If different, STOP — someone changed branch protection and this PR's verification ACs may not apply.

---

## Acceptance Criteria

- [ ] **AC1** — `on: pull_request:` block has NO `paths:` filter. Inline comment explains the per-job path-filter pattern with reference to #455.
- [ ] **AC2** — `actions/checkout@v4` step has `fetch-depth: 0`.
- [ ] **AC3** — Path-detection step (`Detect e2e-relevant changes`) present at the top of `steps:` with the exact regex above. Sets `should-run` output.
- [ ] **AC4** — All heavy steps (setup-node, npm ci, playwright install, build, test:e2e) gated on `steps.changes.outputs.should-run == 'true'`.
- [ ] **AC5** — Post-steps (artifact upload, scrub, verify-clean) gated on `always() && steps.changes.outputs.should-run == 'true'`.
- [ ] **AC6** — Workflow lints clean: `npx js-yaml .github/workflows/e2e.yml > /dev/null` exits 0.
- [ ] **AC7** (live verification — docs-only path) — The PR for this issue itself touches **only** `.github/workflows/e2e.yml` and `plans/issue-455-*.md`. The workflow change is in `.github/workflows/e2e.yml` which IS in the relevant-paths regex — so should-run will be `true` and the full suite will run on this PR. Both `playwright (chromium)` and `playwright (webkit)` must pass green within the 20min timeout.
- [ ] **AC8** (live verification — irrelevant-path simulation) — After this PR merges, the next docs-only PR (touching only `docs/**`, `plans/**`, or `memory/**`) should show both playwright checks green in <60s. If a docs-only PR doesn't organically appear within a day, open a throwaway one (`docs/test-455.md` with one line) to validate, then close without merging. Paste the rollup screenshot or `gh pr checks` output in #455 as a comment.
- [ ] **AC9** — All four pre-flight greps run with expected output, pasted in PR body.

---

## Risk + Rollback

- **Risk:** The path-detection bash has an OR regex that could subtly mis-match (e.g., extension matching `src/lib/foo.ts.bak`). I think it's tight (anchored with `^`, dollar-sign on extension-exact patterns) but a builder should sanity-check by feeding a few simulated `git diff --name-only` outputs through `grep -qE '<regex>'` locally before pushing.
- **Rollback:** revert this PR. The previous state (paths-filtered trigger) leaves the docs-PR-lockout in place, but Scott already knows the workaround (admin bypass). No data loss, no production impact.

---

## PR Shape

- Single PR, single commit (plus the plan commit if Forge convention requires it separately).
- Title: `ci(#455): always-run wrapper for e2e.yml — auto-pass on irrelevant paths, full suite on relevant`
- Body must include:
  - One-paragraph problem statement (lockout from #454, GitHub Actions footgun).
  - One-paragraph fix description (always-run wrapper, inline `git diff`).
  - Verbatim output of the four pre-flight greps.
  - Live rollup confirmation: `gh pr checks <PR#>` showing playwright checks running on this PR (AC7).
  - `Closes #455`.
- Branch: `ci/455-e2e-always-run-wrapper`

---

## Provenance

- Surfaced during PR #454 (closes #452) when the gate locked itself out and Scott admin-bypass-rebased.
- Plan-design gap acknowledged: #452's plan didn't catch this composition conflict. Worth a note in the next factory retro.
