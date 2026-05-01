# Sprint 36 — Playwright E2E CI Workflow (#322)

**Date:** 2026-05-01
**Author:** Compass
**Status:** Plan (pending Forge review + PR open as scottdavenport)
**Closes:** #322

---

## § 1 — Plain-English Readout

Right now, the only way to verify the 7 admin-gated Playwright flows are still passing is for Scott to run `npm run test:e2e` locally — which means loading `.env.local`, spinning up a dev server, waiting ~2 minutes, and reading terminal output. It happens intermittently, not automatically.

After this sprint:

- **Watchdog runs E2E in CI as part of every PR review.** During review, Watchdog triggers the workflow against the PR branch, waits for the run to finish, reads the artifact or run URL, and includes the pass/fail result in the APPROVED / CHANGES_REQUESTED verdict. Scott gets E2E feedback built into the review decision, with zero local setup.
- **Any regression in the 7 admin-gated admin flows (contact create/edit, soft-delete-restore, bulk subscribe, bulk delete, team delete, deleted-member placeholder, unique-email-after-softdelete) surfaces in CI** before merge rather than in production.
- **Playwright HTML reports are auto-uploaded** as build artifacts and live for 7 days. Watchdog links to the artifact in its verdict. If a run fails, Scott can inspect the trace without re-running locally.

Scott still needs to populate 4 GitHub Actions secrets once (below). After that, every CI trigger is automatic.

---

## § 2 — Sprint Scope

Files added:

- `.github/workflows/e2e.yml` — new GitHub Actions workflow (Flux)
- `plans/sprint-36-playwright-ci.md` — this plan file

Files modified:

- `playwright.config.ts` — branch `webServer.command` on `process.env.CI`: `npm run start` in CI, `npm run dev` locally (Spec)

Files NOT touched:

- `tests/e2e/**` — all 16 spec files are out of scope
- `src/**` — no production code changes
- `deploy-production.yml` — untouched

Forge-repo file modified (separate PR in `~/github/forge`):

- The Watchdog specialist card or protocol doc — amend to include the new CI E2E review step

---

## § 3 — Per-PR Breakdown

### PR 1 — Flux: `.github/workflows/e2e.yml`

**Assignee:** Flux
**Branch:** `flux/sprint-36-e2e-workflow`
**Worktree:** `git worktree add /tmp/craven-sprint-36-flux flux/sprint-36-e2e-workflow`

**Task:** Create `.github/workflows/e2e.yml` with the following exact content:

```yaml
name: E2E

on:
  workflow_dispatch:
  push:
    branches: [main]

jobs:
  playwright:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      - run: npm run test:e2e
        env:
          CI: true
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          E2E_ADMIN_EMAIL: ${{ secrets.E2E_ADMIN_EMAIL }}
          E2E_ADMIN_PASSWORD: ${{ secrets.E2E_ADMIN_PASSWORD }}
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

**Design decisions baked in:**
- `workflow_dispatch` + `push: branches: [main]` — no `pull_request` trigger (Scott's D2)
- `CI: true` is passed explicitly so `playwright.config.ts`'s `process.env.CI` branch activates (picks up `npm run start` after Spec's PR 2 lands)
- `chromium` only via `--with-deps chromium` — Firefox/WebKit are not installed in CI; the `playwright.config.ts` `projects` array runs all 3 browsers locally but CI scopes to chromium for speed
- Artifact upload uses `if: always()` so the report uploads even on failure

**Note:** `playwright.config.ts` branches `webServer.command` on `process.env.CI`. The workflow sets `CI: true` in the `test:e2e` step. `npm run build` runs BEFORE `npm run test:e2e`; the built app is served by `npm run start` in CI. Build step also needs the Supabase env vars for `NEXT_PUBLIC_*` substitution.

**Builder discipline:**
- `git fetch origin && git checkout main && git pull && git checkout -b flux/sprint-36-e2e-workflow` (fresh from main)
- `git worktree add /tmp/craven-sprint-36-flux flux/sprint-36-e2e-workflow` (isolated worktree)
- All edits happen inside `/tmp/craven-sprint-36-flux/`
- `unset GH_TOKEN` before BOTH `git push` AND `gh pr create`
- Builder opens own PR — do NOT stop at push

**Acceptance criteria:**
- `ls .github/workflows/` shows `e2e.yml` and `deploy-production.yml` (no others added)
- File content matches the yaml above byte-for-byte (no extra triggers, no `pull_request:` block)
- `gh workflow list --repo scottdavenport/craven-cancer-classic` shows "E2E" with status "active"
- `gh workflow run e2e.yml --repo scottdavenport/craven-cancer-classic` dispatches successfully (after secrets are populated)
- PR body contains actual `cat .github/workflows/e2e.yml` output as verification, not a paraphrase

**Effort:** S (1 new file, ~45 min including worktree setup + PR cycle)

---

### PR 2 — Spec: `playwright.config.ts` webServer branch

**Assignee:** Spec
**Branch:** `spec/sprint-36-playwright-config`
**Worktree:** `git worktree add /tmp/craven-sprint-36-spec spec/sprint-36-playwright-config`

**Task:** Modify `playwright.config.ts` to branch `webServer.command` on `process.env.CI`.

**Current state (line 32–36):**
```typescript
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
```

**Required state:**
```typescript
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
```

That is the only change. `reuseExistingServer: !process.env.CI` is already correct — leave it.

The `projects` array currently includes chromium, firefox, and webkit (lines 18–31). Leave this unchanged. CI installs only chromium via `--with-deps chromium`; Playwright will skip the firefox/webkit projects if those browsers are not installed. This is acceptable behavior — CI runs chromium-only, local runs all three.

**No new imports needed.** `process.env.CI` is already read at lines 10, 11, 12, 35 — the config already branches on it.

**Builder discipline:** same as PR 1 (fresh from main, isolated worktree, `unset GH_TOKEN` before push + pr create, builder opens own PR).

**Acceptance criteria:**
- `grep -n "webServer" playwright.config.ts` shows `command: process.env.CI ? "npm run start" : "npm run dev"`
- `grep -c "process.env.CI" playwright.config.ts` returns 5 (was 4; the webServer command line adds 1 new reference)
- Running `CI=true npm run test:e2e -- --list` locally does NOT start `npm run dev` (it attempts `npm run start`, which may fail if no build exists — but it proves the branch activates correctly)
- No other lines in `playwright.config.ts` are changed — diff shows exactly 1 line modified

**Effort:** S (1 file, 1 line change, ~30 min including worktree setup + PR cycle)

---

### PR 3 — Forge-direct: Watchdog protocol amendment (forge repo)

**Assignee:** Forge-direct (no builder spawn; Forge edits forge repo directly)
**Repo:** `~/github/forge`
**Branch:** `forge/sprint-36-watchdog-e2e-step`

**Task:** Amend the Watchdog protocol in the forge repo to add the CI E2E review step.

**File to modify:** The Watchdog specialist's CLAUDE.md or system prompt file. Locate it via:
```bash
find /Users/openclaw/github/forge -name "*.md" | xargs grep -l -i "watchdog" | head -5
```

**Amendment to add — new numbered step in Watchdog's PR review checklist:**

```
### E2E CI Check (when craven-cancer-classic PR is under review)

After reading the PR diff and before rendering verdict:

1. Run: `gh workflow run e2e.yml --ref <pr-branch> --repo scottdavenport/craven-cancer-classic`
2. Wait ~3 minutes, then check: `gh run list --repo scottdavenport/craven-cancer-classic --workflow=e2e.yml --limit=1`
3. Get the run ID from the output and check: `gh run view <run-id> --repo scottdavenport/craven-cancer-classic`
4. If run is still in_progress, wait and poll: `gh run watch <run-id> --repo scottdavenport/craven-cancer-classic`
5. Include in verdict: "E2E: PASSED (run #<id>, artifact: <artifact-url>)" or "E2E: FAILED — see run #<id>"
6. If secrets are not yet populated, note: "E2E: SKIPPED — GH secrets not yet configured by Scott" and do not block approval on E2E alone.
```

**Acceptance criteria:**
- The Watchdog protocol file contains the 6-step E2E check above
- `gh pr create` opens a PR in the forge repo from `forge/sprint-36-watchdog-e2e-step` into `main`
- PR title: `feat(watchdog): add Craven E2E CI check step to PR review protocol`

**Effort:** S (~30 min)

---

### Dependency map

```
PR 1 (Flux — e2e.yml) and PR 2 (Spec — playwright.config.ts) share no files.
They CAN run in parallel.

PR 3 (Forge-direct — forge repo) touches a different repo entirely.
It can run at any time, parallel to PR 1 and PR 2.

Merge order:
  Phase 1 (parallel): PR 1, PR 2, PR 3
  No serial dependency between any of the three.

Conflict zones: NONE. Zero file overlap across all three PRs.
```

---

## § 4 — Pre-Flight Evidence

All commands run against the craven repo at `/Users/openclaw/github/craven-cancer-classic` on 2026-05-01.

### `ls .github/workflows/`

```
deploy-production.yml
```

Confirms: `e2e.yml` does NOT exist. PR 1 creates it fresh.

### `grep -n "webServer" playwright.config.ts`

```
32:  webServer: {
33:    command: "npm run dev",
34:    url: "http://localhost:3000",
35:    reuseExistingServer: !process.env.CI,
```

Confirms: `webServer.command` is hardcoded `"npm run dev"` today. PR 2 branches it.

### `grep -rn "process.env.CI" playwright.config.ts`

```
playwright.config.ts:10:  forbidOnly: !!process.env.CI,
playwright.config.ts:11:  retries: process.env.CI ? 2 : 0,
playwright.config.ts:12:  workers: process.env.CI ? 1 : undefined,
playwright.config.ts:35:    reuseExistingServer: !process.env.CI,
```

4 existing CI branches — the config already adapts to `process.env.CI`. PR 2 adds a 5th (the webServer command). No new pattern; consistent with existing usage.

### `cat package.json | jq '.scripts | keys'`

```
['dev', 'build', 'start', 'lint', 'test', 'test:run', 'test:e2e', 'test:e2e:ui', 'seed:photos']
```

Confirms: `start`, `build`, and `test:e2e` all exist. The CI workflow's `npm run build`, `npm run start` (via webServer), and `npm run test:e2e` calls are all valid.

### `gh secret list --repo scottdavenport/craven-cancer-classic`

```
SUPABASE_ACCESS_TOKEN	2026-04-18T22:10:57Z
SUPABASE_PROJECT_REF	2026-04-18T22:10:03Z
```

**Gap confirmed.** The 4 secrets the workflow requires are NOT yet present:

| Secret | Status |
|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | MISSING — Scott must add |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | MISSING — Scott must add |
| `E2E_ADMIN_EMAIL` | MISSING — Scott must add |
| `E2E_ADMIN_PASSWORD` | MISSING — Scott must add |

`SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` are used by `deploy-production.yml` — not by the E2E workflow.

Scott adds secrets after PRs merge. Ordering: ship workflow → Scott adds secrets → Scott or Watchdog triggers first run.

### Stripe check: `grep -rn "stripe" tests/e2e/`

No output — zero hits. None of the 16 E2E spec files reference Stripe. The 7 admin-gated flows are contact and team CRUD only; no live Stripe calls in CI.

---

## § 5 — Test Plan

How we verify the CI workflow is working (no unit test scope — this is infra verification):

1. **PR 1 and PR 2 merge to main.**
2. **Scott populates the 4 secrets** in `Settings → Secrets and variables → Actions → New repository secret` with the same values from his `.env.local`.
3. **First manual trigger:** Scott or Watchdog runs:
   ```bash
   gh workflow run e2e.yml --repo scottdavenport/craven-cancer-classic
   ```
4. **Monitor the run:**
   ```bash
   gh run list --repo scottdavenport/craven-cancer-classic --workflow=e2e.yml --limit=1
   gh run watch <run-id> --repo scottdavenport/craven-cancer-classic
   ```
5. **Pass criteria:**
   - Run completes with conclusion `success`
   - `playwright-report` artifact appears in the run's artifacts list with 7-day retention
   - All tests that pass locally also pass in CI (data-conditional tests may skip — that is acceptable; `skipped` with an explicit skip reason is not a failure)
6. **Push-trigger baseline:** After the manual trigger passes, push any trivial commit to main (e.g., a whitespace change in a comment). Confirm the `push: branches: [main]` trigger fires automatically and the run completes green.

**First-run failure path:** If the workflow fails because secrets are missing, the run will error at the `npm run test:e2e` step with an auth error (Supabase will return 401). This is expected before Scott adds secrets. It is NOT a bug in the workflow file. Ordering matters: secrets first, then trigger.

---

## § 6 — Watchdog Protocol Amendment

The existing `require-watchdog-approval.sh` hook is the structural merge gate — no GitHub required-status-check is added at the repo level. Instead, Watchdog's review process is amended to include E2E verification.

**File to amend:** Watchdog's system prompt or checklist file in the forge repo. Locate path via `find /Users/openclaw/github/forge -name "*.md" | xargs grep -l -i "watchdog" | head -5`.

**New step added to Watchdog's craven-specific review protocol:**

When reviewing a craven-cancer-classic PR:

1. After reading the PR diff:
   ```bash
   gh workflow run e2e.yml --ref <pr-branch> --repo scottdavenport/craven-cancer-classic
   ```
2. Wait ~3 minutes, then poll:
   ```bash
   gh run list --repo scottdavenport/craven-cancer-classic --workflow=e2e.yml --limit=1
   gh run watch <run-id> --repo scottdavenport/craven-cancer-classic
   ```
3. On completion, get the artifact URL:
   ```bash
   gh run view <run-id> --repo scottdavenport/craven-cancer-classic --json artifacts
   ```
4. Include in verdict body:
   - Pass: `E2E: PASSED (run #<id>) — artifact: <artifact-url>`
   - Fail: `E2E: FAILED — see run #<id> for trace. REQUEST_CHANGES pending E2E fix.`
   - Secrets missing (first sprint only): `E2E: SKIPPED — GH secrets not yet configured. Do not block approval on E2E alone for this PR.`

**Forge-direct PR diff outline:**

The diff adds ~25 lines to the Watchdog protocol file. No existing checklist items are removed or reordered. The E2E check step is inserted as a new numbered section ("E2E CI Check") after the existing diff-review steps and before the verdict section.

**Forge opens the PR in the forge repo** using `unset GH_TOKEN && gh pr create` per standard auth protocol.

---

## § 7 — Risks + Open Questions

### 7a. CI minute cost estimate

Playwright install + build + test run in CI:
- `npm ci`: ~60s (cached after first run via `cache: npm`)
- `npx playwright install --with-deps chromium`: ~30s (chromium only, not all browsers)
- `npm run build`: ~60–90s
- `npm run test:e2e` (16 specs, chromium only, `workers: 1` in CI): ~90–120s for the 7 admin-gated flows + smoke + register; data-conditional tests skip fast

**Estimated wall-clock per run: ~4–5 minutes.**

Triggers: `workflow_dispatch` (manual) + `push: branches: [main]`. Main merges are ~2–4/week during active build sprints. Idle periods: 0 runs.

**Estimated monthly CI minutes: 10–25 runs × 5 min = 50–125 min/month.**

GitHub Actions free tier: 2,000 min/month on ubuntu-latest. This sprint's workflow consumes well under 10% of the free allotment even at peak velocity.

### 7b. Test data cleanup in CI

`feedback_isolate_agent_worktrees` and the Sprint 35 fixture cleanup pattern apply here: test fixtures use `try/finally` in `tests/e2e/fixtures/admin-auth.ts` and per-spec teardown to clean up PROD data after each run.

This sprint does NOT modify `tests/e2e/**` — cleanup discipline is already in the existing fixtures. If a CI run fails mid-spec and leaves orphan data (e2e-*@example.com contacts, test teams), Forge runs cleanup via service-key REST per `feedback_use_service_key_for_data_ops`:

```sql
DELETE FROM contacts WHERE email LIKE 'e2e-%@example.com';
```

CI failure cleanup is Scott's signal to run that cleanup command if orphan data accumulates.

### 7c. Stripe check — result: no Stripe in E2E

Pre-flight grep (`grep -rn "stripe" tests/e2e/`) returned zero hits. None of the 16 spec files reference Stripe. CI E2E does not touch the Stripe API. This risk is closed.

### 7d. First-run lag — secrets required before E2E passes

Until Scott populates the 4 missing secrets (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`), any workflow trigger will fail at the auth step. This is expected and not a workflow bug.

**Ordering:**
1. PR 1 (e2e.yml) + PR 2 (playwright.config.ts) merge
2. Scott adds 4 secrets to `Settings → Secrets and variables → Actions`
3. Scott or Watchdog triggers first `workflow_dispatch` run
4. Watchdog reads the run result and includes it in the next PR review

### 7e. Firefox/WebKit in CI

`playwright.config.ts` defines projects for chromium, firefox, and webkit. The workflow installs only `--with-deps chromium`. Playwright will skip firefox/webkit projects if those browsers are absent. This is correct behavior — CI is chromium-only for speed and cost. If we later want multi-browser CI, add `npx playwright install --with-deps` (no browser arg = all browsers) and extend the workflow.

### 7f. `npm run start` requires a prior `npm run build`

The workflow runs `npm run build` before `npm run test:e2e`. The `webServer` in `playwright.config.ts` (after PR 2) runs `npm run start` in CI, which serves the prebuilt output. If the build step fails (e.g., TypeScript error introduced by a PR), the E2E step will also fail because there's no built output to serve. This is correct cascade behavior — build failures should block E2E.

---

## Files Created / Modified

| File | Repo | Change | PR |
|------|------|--------|----|
| `.github/workflows/e2e.yml` | craven-cancer-classic | Created | PR 1 (Flux) |
| `playwright.config.ts` | craven-cancer-classic | Modified — 1 line: webServer.command branch on CI | PR 2 (Spec) |
| `plans/sprint-36-playwright-ci.md` | craven-cancer-classic | Created | Plan PR (Compass) |
| Watchdog protocol file | forge | Modified — add E2E CI check step | PR 3 (Forge-direct) |

---

## Dependency Map

```
Phase 1 (all parallel — zero file overlap):
  PR 1: .github/workflows/e2e.yml          (Flux)
  PR 2: playwright.config.ts               (Spec)
  PR 3: forge repo watchdog protocol        (Forge-direct)

No serial dependencies. Any PR can merge in any order.
Scott populates secrets AFTER PR 1 + PR 2 merge (manual step, out of build scope).
First verified CI run: AFTER secrets populated.
```

---

## Effort Estimates

| Task | Estimate | Owner |
|------|----------|-------|
| PR 1: e2e.yml workflow file | S (~45 min) | Flux |
| PR 2: playwright.config.ts 1-line change | S (~30 min) | Spec |
| PR 3: Watchdog protocol amendment (forge repo) | S (~30 min) | Forge-direct |
| Watchdog review × 2 craven PRs | S (~30 min total) | Watchdog |
| First-run verification (post-secrets) | S (~15 min) | Forge/Scott |
| **Total estimated wall-clock** | **~2.5–3h** | — |

---

## Builder Discipline Baked In (all PRs)

- **Fresh from main:** `git fetch origin && git checkout main && git pull && git checkout -b <branch>`
- **Isolated worktree:** `git worktree add /tmp/craven-sprint-36-<short> <branch>` per `feedback_isolate_agent_worktrees`
- **Auth:** `unset GH_TOKEN` before BOTH `git push` AND `gh pr create` per `feedback_builder_pr_create_auth`
- **Builder opens own PR:** after push, run `gh pr create` — do NOT stop at push per `feedback_builders_open_their_own_prs`
- **PR body verification:** any grep counts must be actual command output per `feedback_pr_body_verification_must_be_real`
- **Surgical changes:** every changed line traces to this task per `feedback_surgical_changes`

---

## Guiding Rules Cited

- `feedback_plain_english_readouts` — § 1 leads with user/Watchdog experience change; technical detail in appendix sections
- `feedback_plan_pr_exhaustive_consumer_grep` — all pre-flight commands run and output pasted before plan written
- `feedback_isolate_agent_worktrees` — parallel builders use distinct worktrees
- `feedback_builders_open_their_own_prs` — each builder runs `gh pr create` after push
- `feedback_builder_pr_create_auth` — `unset GH_TOKEN` before push and pr create
- `feedback_pr_body_verification_must_be_real` — grep output in PR body = actual command output
- `feedback_surgical_changes` — every line traces to the task
- `memory/projects/craven.md` — no staging by design; prod-with-workflow_dispatch confirmed
