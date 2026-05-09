# Restore type-to-confirm guard for paid-team delete

**Issue:** [#393](https://github.com/scottdavenport/craven-cancer-classic/issues/393)
**Regression source:** PR #386 (admin table unification — Teams Phase 3)
**Original implementation:** PR #129 (Sprint 10 — `feat(s10-5): teams soft-delete + paid-team type-to-confirm`)
**Spec date:** 2026-05-08

## Problem

PR #386 silently removed the type-to-confirm safety guard that prevented accidental deletion of paid teams. Pre-#386, the delete-confirm dialog rendered an input that the admin had to type-match against the team's identity string before the destructive button unlocked. Post-#386, all teams (paid and pending) get the same plain `Cancel` / `Move to Trash` confirm.

PR #392 closed #393 incidentally via a `Closes #393` footer, but PR #392 only rewrote the e2e test to match the regressed shipped behavior. The source-side restoration that #393 actually scopes was never done. Issue #393 has been reopened (2026-05-08) with a clarifying comment.

Verification: `grep -r "requiresTypeConfirm\|type-to-confirm\|typeToConfirm" --include="*.ts" --include="*.tsx"` returns only `tests/e2e/team-delete-type-to-confirm.spec.ts` — no app code implements the guard.

## Why this matters

Paid teams represent real money and registration commitments. Accidental deletion (mis-click, autocomplete, bulk action) is recoverable from Trash but creates support friction and admin distrust. The type-to-confirm pattern is a deliberate guard added in S10 specifically because soft-delete-recoverability is not sufficient UX for paid records.

## Scope

In:
- Source restoration of the type-to-confirm gate inside `DeleteConfirmDialog` in `src/app/admin/teams/team-modal.tsx`.
- Aria sign-off on one new microcopy string (helper label).
- Unit assertions in `src/__tests__/teams-modal.test.tsx` covering paid-vs-pending behavior.
- E2E revert of `tests/e2e/team-delete-type-to-confirm.spec.ts` to assert the gate (was rewritten in PR #392 to assert plain confirm).

Out:
- No changes to `DeleteConfirmDialog`'s consumers (`TeamModal`, `TeamList` interactions).
- No changes to `deleteTeam` server action, score-count fetch, or soft-delete plumbing.
- No type-to-confirm pattern extraction into a reusable component (single consumer; extract later if needed).
- No paid-team visual badge, callout, or title prefix — helper label only.

## Architecture

Production source changes are confined to one file. Gate logic lives inline in `DeleteConfirmDialog` — no new abstractions.

Files touched:
- `src/app/admin/teams/team-modal.tsx` — extend `DeleteConfirmDialog` with gate logic and conditional input.
- `src/__tests__/teams-modal.test.tsx` — add three assertions for paid-vs-pending behavior.
- `tests/e2e/team-delete-type-to-confirm.spec.ts` — revert to original assertions, adapted to current dialog markup.

No new files. No new types. No new server actions.

## Data flow

Inside `DeleteConfirmDialog` (`team-modal.tsx`):

```tsx
const isPaid = team.payment_status === "paid" && team.amount_paid_cents > 0;
const expectedConfirm = team.captain_display_name;

// Defense-in-depth: don't render an unwinnable gate if data is malformed.
const hasUsableConfirm = expectedConfirm.trim().length > 0;
const requiresTypeConfirm = isPaid && hasUsableConfirm;

const [confirmText, setConfirmText] = useState("");
const matches = confirmText === expectedConfirm; // strict exact-match (case + whitespace)
const deleteEnabled = !requiresTypeConfirm || matches;
```

Existing `useEffect` open/close cleanup adds `setConfirmText("")` on close.

Existing destructive button `disabled` extends from `pending || scoreCount === null` to `pending || scoreCount === null || !deleteEnabled`.

**Source-of-truth choice:** `team.captain_display_name` (always non-null on the team row, matches the value already shown in the dialog title, robust to deleted captain contacts). Original S10 implementation used `team.team_name`, which no longer exists on `TeamWithMembers` after the captain-identity refactor.

**Match strictness:** strict equality. Case-sensitive, whitespace-sensitive. Highest friction = highest safety.

**Pending teams:** `requiresTypeConfirm` is `false`, no input renders, behavior unchanged.

**Edge case — paid team with empty `captain_display_name`:** schema marks it always-set, but if `expectedConfirm.trim() === ""` we fall back to NOT requiring the gate (don't render an unwinnable input) and emit `console.warn("[DeleteConfirmDialog] paid team has empty captain_display_name; gate skipped", { teamId: team.id })`. This protects against bad data without locking the admin out.

## UI structure

Additions live between the body `<p>` and the existing `error` block in `DeleteConfirmDialog`:

```tsx
<p className="text-sm text-muted-foreground">{bodyText}</p>

{requiresTypeConfirm && (
  <div className="space-y-2">
    <label htmlFor="delete-confirm-input" className="text-sm">
      Type the captain's full name to confirm: <span className="font-medium">{expectedConfirm}</span>
    </label>
    <Input
      id="delete-confirm-input"
      value={confirmText}
      onChange={(e) => setConfirmText(e.target.value)}
      placeholder={expectedConfirm}
      autoComplete="off"
      data-testid="delete-confirm-input"
    />
  </div>
)}

{error && <p className="text-xs text-destructive">{error}</p>}
```

No title change for paid teams. No callout. No badge. No mismatch error text — the button-disabled state IS the mismatch signal.

## Microcopy (Aria sign-off required)

One new locked string:

| Slot | Draft string |
|------|---|
| Helper label prefix | `Type the captain's full name to confirm:` |

The placeholder echoes the captain name (no separate microcopy).

Build sequence pauses for Aria approval before the final string lands.

## Testing

### Unit (Bolt task — added in source PR)

File: `src/__tests__/teams-modal.test.tsx` (existing) or new sibling.

Three assertions:
1. Paid team renders input + helper label; destructive button disabled at mount.
2. Match enables button; mismatch keeps it disabled.
3. Pending team renders no input; destructive button enabled (subject to existing `scoreCount` load gate).

No mocking of `deleteTeam` itself — already covered by `src/__tests__/admin-teams-actions.test.ts`.

### E2E (Spec task — revert per issue scope)

File: `tests/e2e/team-delete-type-to-confirm.spec.ts`

Spec rewrote this in PR #392 (commit `9f386de`) to assert plain-confirm behavior. Revert to original assertions:

- **Pending team** → opens delete dialog → no `[data-testid="delete-confirm-input"]` rendered → "Move to Trash" button enabled → clicks → soft-deleted.
- **Paid team** → opens delete dialog → input rendered with helper label → "Move to Trash" button **disabled** → type wrong string → still disabled → type exact `captain_display_name` → enabled → click → soft-deleted.

Spec should pull the pre-PR #392 spec from git (`git show 9f386de^:tests/e2e/team-delete-type-to-confirm.spec.ts`) and adapt to current dialog markup — testid `delete-confirm-input`, gate string is `captain_display_name` (original used `team_name`).

### Verification gate before merge

Per LESSONS-LEARNED Rule 2 (verification-evidence rule from 2026-05-08):

- Bolt must paste in PR body:
  - `npx tsc --noEmit; echo "exit=$?"` output (full output, not summary).
  - `npx vitest run src/__tests__/teams-modal.test.tsx; echo "exit=$?"` output.
- Spec must paste in PR body:
  - `npx playwright test tests/e2e/team-delete-type-to-confirm.spec.ts --project=chromium; echo "exit=$?"` output.

## Acceptance criteria

- [ ] Paid team delete-confirm shows type-to-confirm input + helper label.
- [ ] Pending team delete-confirm shows no input (plain confirm path unchanged).
- [ ] Destructive button disabled until input matches `captain_display_name` exactly (case + whitespace).
- [ ] Edge case: paid team with empty `captain_display_name` falls back to plain confirm (no unwinnable gate).
- [ ] Unit tests cover paid + pending paths.
- [ ] E2E tests cover paid + pending paths with the gate enforced.
- [ ] Aria sign-off on the helper label string before merge.
- [ ] tsc passes (exit 0, evidence in PR body).

## Non-goals

- Pattern extraction into a reusable `<TypeToConfirmGate>` component. Single consumer today; revisit when a second emerges.
- Visual differentiation between paid and pending dialogs beyond the input itself.
- First-name-only confirm or other lower-friction match modes.
- Mismatch error text or character-by-character feedback.

## Provenance

- Original implementation: PR #129 (Sprint 10), commit `61c19e5`.
- Regression: PR #386 (Teams Phase 3, admin table unification), commit `94edd26`.
- Misleading auto-close: PR #392, commit `9f386de` (`Closes #393` footer on test rewrite).
- UAT line item: `plans/admin-uat-2026-05.md` line 243 (W3.5).
- Reopened: 2026-05-08, with clarifying comment on the issue.
