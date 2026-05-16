# Issue #451 — Add `pull_request` trigger to e2e.yml

_Follow-on to #444 / PR #450. The e2e-cleanup sprint gave us scrub + reliable specs; this issue gives us the **guardrail** that prevents re-pollution from a broken-but-merged PR._

---

## Plain-English Readout

**Who is impacted:** Anyone opening a PR that touches an e2e spec, a page component, a server action, or a related production path. They now see playwright check results (chromium + webkit, parallel) on their PR before merge.

**What changes from their perspective:** A new pair of checks appears on PRs: `E2E / playwright (chromium)` and `E2E / playwright (webkit)`. Each takes ~8 minutes. PRs that touch only docs, unrelated configs, or other-system workflows are unaffected — paths filter excludes them.

**What doesn't change:** The post-merge run on `main` still fires. Existing in-progress PRs are unaffected until they push again. This issue does NOT make playwright a *required* check — that's #452.

---

## Aria Upfront-Gate

**No new strings.** CI workflow YAML edit only. Aria countersign not required.

---

## The Change

File: `.github/workflows/e2e.yml`. Replace the existing `on:` block (lines 3-6):

```yaml
on:
  workflow_dispatch:
  push:
    branches: [main]
```

With:

```yaml
on:
  workflow_dispatch:
  push:
    branches: [main]
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

**Paths rationale:**

- `tests/e2e/**` — direct test changes
- `playwright.config.ts` — config affects all specs
- `src/app/**` — pages and server actions exercised by specs
- `src/components/**` — UI components the specs touch
- `src/lib/**` — shared helpers including `supabase/soft-delete.ts` exercised by bulk-delete
- `src/types/database.ts` — schema-type drift would break specs at compile
- `package.json` / `package-lock.json` — dep upgrades affect playwright behavior
- `.github/workflows/e2e.yml` — workflow self-changes need to validate against the workflow itself

**Paths intentionally excluded:**

- `docs/**`, `memory/**`, `plans/**` — content-only, no runtime impact
- `*.md` at root — same
- `.github/workflows/{vitest,deploy-production,triage-on-issue-create}.yml` — unrelated systems
- `scripts/**` — local-only helpers (may revisit if scripts start affecting test setup)

No other changes to the workflow. The `jobs:`, `runs-on:`, `matrix:`, `env:`, and `steps:` blocks stay exactly as they are. Same chromium + webkit matrix, same timeout, same artifact upload.

---

## What NOT to change

- `playwright.config.ts` — out of scope.
- Any spec file — out of scope.
- Other workflow files — out of scope.
- Branch protection settings — that's #452, must come after this lands.
- The `if: always()` artifact upload — keep it.

---

## Pre-Flight Greps

<!-- HARD-GATE: Builder must run all three greps BEFORE opening the PR and paste verbatim output in the PR body. -->

**Grep 1 — confirm e2e.yml `on:` block matches expected pre-state**
```
sed -n '/^on:/,/^jobs:/p' .github/workflows/e2e.yml
```
Expected pre-patch: 5 lines showing `on:`, `workflow_dispatch:`, `push:`, `branches: [main]`, then the blank line + `jobs:` start. If different, surface to Forge before editing — someone else may have already started this work.

**Grep 2 — confirm no `pull_request:` trigger exists in any workflow that overlaps with paths**
```
grep -l "pull_request:" .github/workflows/*.yml
```
Expected: only `triage-on-issue-create.yml` may appear (if it uses pull_request, which it shouldn't given the name) — actually expected: 0 hits. If `e2e.yml` already shows up, this issue is a no-op.

**Grep 3 — verify the workflow file is the only file that needs touching**
```
git ls-files .github/workflows/
```
Expected: 4 files (`deploy-production.yml`, `e2e.yml`, `triage-on-issue-create.yml`, `vitest.yml`). If `e2e-pr.yml` or similar already exists, surface to Forge — someone may have started a parallel implementation.

---

## Acceptance Criteria

- [ ] **AC1** — `.github/workflows/e2e.yml` `on:` block includes `pull_request:` with the paths filter listed above.
- [ ] **AC2** — YAML lints clean: `npx js-yaml .github/workflows/e2e.yml > /dev/null` exits 0 (or equivalent — whatever Forge's standard YAML linter is in this repo).
- [ ] **AC3** — Inline comment present (`# Run e2e on PRs touching test/prod code per #451.`) — future readers can trace the *why*.
- [ ] **AC4** — The PR for this issue itself is opened from a branch that touches `.github/workflows/e2e.yml`, so the new trigger fires on this very PR. Confirm in the PR's check rollup that `E2E / playwright (chromium)` and `E2E / playwright (webkit)` appear. **NOTE: workflow changes are applied per ref at trigger time, so a new workflow added in the PR *will* run on its own PR — this is standard GitHub Actions behavior.** Paste the rollup confirmation as a PR comment.
- [ ] **AC5** — All three pre-flight greps return expected counts, output pasted in PR body.

---

## PR Shape

- Single PR, single commit (plus the plan file commit if Forge convention requires it separately).
- Title: `ci(#451): add pull_request trigger to e2e.yml`
- Body must include:
  - One-paragraph problem statement (post-merge-only e2e leaves PRs unguarded; surfaced in PR #450).
  - The exact paths filter and rationale for inclusion/exclusion.
  - Verbatim output of the three pre-flight greps.
  - AC4's check-rollup confirmation (paste after the PR is open and the workflow has fired).
  - `Closes #451`.
- Branch name: `ci/451-e2e-pull-request-trigger`

---

## Provenance

- Surfaced during PR #450 review when Forge described the check rollup as "Vitest in progress, Vercel green" without flagging that no playwright check existed at all on the PR.
- Sibling: #452 (require playwright as gate), blocked by this issue landing first.
