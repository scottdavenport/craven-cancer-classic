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
