# Issue #452 — Require playwright as a status check on `main` branch protection

_Blocked by #451 (which makes playwright actually run on PRs). Lands immediately after #451 merges and the check names are confirmed._

---

## Plain-English Readout

**Who is impacted:** Anyone trying to merge a PR into `main`. If their PR touched paths in #451's filter and either playwright job (chromium or webkit) is red or missing, the merge button greys out with "Required statuses must pass." If their PR didn't touch those paths, no playwright check fires and nothing blocks them — paths filter behavior unchanged from #451.

**What changes from their perspective:** Merging a broken-e2e PR is no longer possible. Today, you can squash-merge with red checks if you click through the warning. After this lands, GitHub server-side refuses.

**What doesn't change:** Vitest, Vercel, GitGuardian gating behavior. Branch protection's other rules (PR required, etc.) — untouched.

---

## Aria Upfront-Gate

**No new strings** in the app. This issue adds a ~20-line `docs/CI.md` describing what runs on PRs and what gates merges; that content is internal docs (not user-facing), Aria countersign not required.

---

## The Change

### Part 1 — Branch protection settings

Use `gh api` to **enable** `required_status_checks` on `main` (currently NOT enabled — confirmed via API read 2026-05-16) and seed it with three contexts.

**Actual check names (confirmed from PR #453's check rollup, 2026-05-16):**
- `playwright (chromium)`
- `playwright (webkit)`
- `vitest`

The `gh api` `contexts` field uses the bare check name as reported by the Actions API — NOT a `{workflow} / {job}` composite. Workflow name `E2E` is exposed separately as `workflowName` and is not part of the context identifier for branch protection purposes. (An earlier draft of this plan predicted `E2E / playwright (...)` based on the GitHub UI display format — that prediction was wrong; the API-level name is bare.)

**Why three contexts (not just two):** Discovered during plan execution that `required_status_checks` is not currently enabled at all — there are no existing required contexts to preserve. Scott directed including `vitest` in the initial set (it's been running reliably for ages and `docs/CI.md` already lists it as required). Vercel and GitGuardian remain informational only.

**Read current protection state first** (confirms the 404 still holds and nothing changed between plan and execution):
```bash
gh api repos/scottdavenport/craven-cancer-classic/branches/main/protection/required_status_checks --jq .
```
- Expected: `{"message":"Required status checks not enabled","status":"404"}`. If it returns an actual object, STOP — someone else enabled it between plan and execution. Surface to Forge and merge contexts rather than overwriting.

**Then enable via POST** (the documented endpoint for first-time enablement). Use `gh api -X POST` with `--input` for the JSON body so list/bool semantics are unambiguous:

```bash
cat <<'JSON' | gh api -X POST repos/scottdavenport/craven-cancer-classic/branches/main/protection/required_status_checks --input -
{
  "strict": true,
  "contexts": [
    "playwright (chromium)",
    "playwright (webkit)",
    "vitest"
  ]
}
JSON
```

- `strict: true` — requires the branch to be up to date before merge (matches GitHub's standard "require branches to be up to date" toggle).
- If `gh api -X POST` returns 404 on the endpoint URL, fall back to the parent endpoint PATCH form:
  ```bash
  gh api -X PATCH repos/scottdavenport/craven-cancer-classic/branches/main/protection \
    --input <(echo '{"required_status_checks":{"strict":true,"contexts":["playwright (chromium)","playwright (webkit)","vitest"]}}')
  ```

**Critical:** if both attempts fail, STOP and surface to Forge. Do NOT keep retrying — repeated 4xx responses on branch-protection endpoints can lock out merging if the request half-succeeds with a malformed state.

### Part 2 — Document in `docs/CI.md`

Create `docs/CI.md` if absent (likely is — check first). Keep to ~20 lines. Content:

```markdown
# CI

What runs and what gates merges into `main`.

## Triggers

| Workflow | Triggers | Purpose |
|----------|----------|---------|
| `vitest.yml` | PR, push to main | Unit + integration tests |
| `e2e.yml` | PR (filtered paths), push to main, manual dispatch | Playwright chromium + webkit |
| `deploy-production.yml` | push to main | Vercel production deploy |
| `triage-on-issue-create.yml` | issue opened | Auto-label new issues |

The e2e paths filter is in `.github/workflows/e2e.yml`. PRs touching only docs/memory/plans bypass e2e.

## Required for merge into `main`

- `vitest`
- `playwright (chromium)`
- `playwright (webkit)`

Set via branch protection (`gh api repos/.../branches/main/protection`). Vercel and GitGuardian checks run informationally but do not gate merge.

## Failure recovery

- **Vitest red:** investigate locally with `npm run test:unit`, fix in the same PR.
- **Playwright red:** download the report artifact from the failing run, open `playwright-report/index.html`, inspect the failing spec's trace. Fix in the same PR — do not merge around red e2e by reverting required checks.
```

That's the whole file. No more, no less.

---

## What NOT to change

- Other workflow files.
- Anything in the e2e workflow itself (#451's territory).
- Other branch protection rules (PR required, code owners, force-push, etc.) — preserve as-is via the PATCH-don't-PUT pattern.
- Existing required status checks — preserve the current set, add to it.
- `README.md` or other top-level docs — `docs/CI.md` is the home for this content.

---

## Pre-Flight Greps + API Reads

<!-- HARD-GATE: Builder must run all four BEFORE making the API change and paste verbatim output in the PR body. -->

**Read 1 — current required status checks on main**
```bash
gh api repos/scottdavenport/craven-cancer-classic/branches/main/protection/required_status_checks --jq '{contexts, strict}'
```
Paste the full response. Use this as the source of truth for the merged context list. If it 404s, STOP.

**Grep 2 — confirm check names from a real PR**
```bash
# Pick the most recent open or recently-merged PR that touched a path in #451's filter (likely the PR Flux opened for #451 itself, since it touches .github/workflows/e2e.yml).
gh pr checks <PR#> -R scottdavenport/craven-cancer-classic | grep -i playwright
```
Expected: two lines matching `playwright (chromium)` and `playwright (webkit)` (confirmed from PR #453 rollup). If the names differ, use the actual names in the PATCH — do not blindly trust the plan.

**Grep 3 — confirm docs/CI.md doesn't already exist**
```bash
ls docs/CI.md 2>&1 || echo "absent"
```
Expected: `absent`. If the file exists, READ it first and merge content rather than overwrite.

**Grep 4 — confirm no other place documents required checks**
```bash
grep -rn "required.*status\|branch.*protection" docs/ README.md 2>/dev/null
```
Expected: 0 or near-0 hits. If a CONTRIBUTING.md mentions required checks, update it to point to `docs/CI.md` rather than duplicating.

---

## Acceptance Criteria

- [ ] **AC1** — Branch protection `required_status_checks.contexts` is enabled and contains exactly: `playwright (chromium)`, `playwright (webkit)`, `vitest`. `strict: true`.
- [ ] **AC2** — *(Skipped per Scott in-session — verification by absence of bypasses is acceptable. Original AC2: open a deliberately-failing-e2e PR and confirm merge button is disabled.)*
- [ ] **AC3** — `docs/CI.md` exists with the template content above (~20 lines).
- [ ] **AC4** — *(Reframed: no pre-existing required checks to preserve. Confirm via pre-read that `required_status_checks` returns 404 before the POST.)*
- [ ] **AC5** — Verbatim output of pre-read (404), post-read (showing the 3 contexts + strict:true), Grep 2 (check names), Grep 3 (docs/CI.md absent pre) in the PR body.

---

## PR Shape

- Single PR, single commit (plus the plan commit if Forge convention requires it separately).
- Title: `ci(#452): require playwright checks for merging into main`
- Body must include:
  - One-paragraph problem statement and one-paragraph fix description.
  - Verbatim pre/post API responses showing the contexts list change.
  - Verbatim grep output.
  - `Closes #452`.
- Branch: `ci/452-require-playwright-checks`

---

## Operational notes

- **Branch protection changes via `gh api` apply immediately.** There is no "deploy this PR's settings change" step — the PATCH IS the change. The PR itself documents the change after-the-fact via the `docs/CI.md` addition. This is intentional: settings changes don't fit cleanly into a PR-merge workflow, so we PR the doc and apply the setting at PR open time, NOT at merge time.
- **If the API call fails** (auth, 404, conflict), STOP and surface to Forge. Do NOT retry blindly — branch protection misconfigurations can lock the repo.
- The change is **forward-only and reversible**: if it causes problems, run the same PATCH with the playwright contexts removed.

---

## Provenance

- Sibling to #451 (which is the prerequisite).
- Both surfaced during PR #450 review.
