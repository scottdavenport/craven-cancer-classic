# Restore type-to-confirm guard for paid-team delete — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the type-to-confirm safety guard on paid-team delete (regressed in PR #386, incorrectly closed by PR #392). Paid teams must require typing the captain's display name before the destructive button unlocks; pending teams keep the plain confirm.

**Architecture:** Single-file source change to `DeleteConfirmDialog` in `src/app/admin/teams/team-modal.tsx`. Gate logic inline (no new abstractions). Strict exact-match against `team.captain_display_name`. Helper-label visual signal only, no badge/callout/title change. Defense-in-depth fallback if `captain_display_name` is empty.

**Tech Stack:** Next.js 16 (project local), React 19, TypeScript, Vitest + Testing Library (unit), Playwright (e2e). Supabase Postgres backend (no schema changes in this plan).

**Spec:** `docs/superpowers/specs/2026-05-08-restore-paid-team-delete-typeconfirm-design.md`
**Issue:** #393 (reopened 2026-05-08)
**Branch:** `fix/393-restore-paid-team-type-to-confirm`

---

## Task 1: Setup branch and capture pre-state baseline

**Files:**
- No edits. Read-only verification.

- [ ] **Step 1: Create the branch from main**

```bash
git checkout main && git pull --ff-only
git checkout -b fix/393-restore-paid-team-type-to-confirm
```

- [ ] **Step 2: Confirm pre-state — gate is missing from source**

Run:
```bash
grep -r "requiresTypeConfirm\|type-to-confirm\|typeToConfirm" --include="*.ts" --include="*.tsx" src/
```

Expected: zero results (all matches should be in `tests/e2e/` only). If any result appears under `src/`, STOP — pre-state assumption is wrong, re-read the spec.

- [ ] **Step 3: Capture tsc baseline**

Run:
```bash
npx tsc --noEmit; echo "exit=$?"
```

Expected: `exit=0`. If non-zero, the working tree already has type errors — flag to Scott before continuing. Do NOT attempt to fix unrelated tsc errors as part of this work.

---

## Task 2: Write failing unit tests for the gate

**Files:**
- Modify: `src/__tests__/teams-modal.test.tsx` (append new `describe` block at end of file, before the closing of the outer describe)

- [ ] **Step 1: Add the four failing tests**

Append a new `describe` block at the end of `src/__tests__/teams-modal.test.tsx`, INSIDE the outer `describe("TeamModal — Sprint 32 (RED phase)")` block (right before its closing `})` on line 232).

```tsx
  describe("DeleteConfirmDialog — paid-team type-to-confirm gate (#393)", () => {
    async function openDeleteDialog(team: TeamWithMembers) {
      const user = userEvent.setup();
      render(<TeamList teams={[team]} defaultFeeDollars={200} />);

      // Open the edit modal first (Phase 3: hover-reveal Edit button)
      await user.click(
        screen.getByRole("button", { name: /edit captain jane's team/i })
      );
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Click "Delete team" in the modal footer to open DeleteConfirmDialog
      await user.click(screen.getByRole("button", { name: /^delete team$/i }));

      // Wait for the destructive "Move to Trash" button to render
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /move to trash/i })
        ).toBeInTheDocument();
      });

      return { user };
    }

    it("paid team renders the type-to-confirm input with helper label", async () => {
      const paidTeam = makeTeam({
        payment_status: "paid",
        amount_paid_cents: 20000,
        paid_at: "2026-04-01T00:00:00Z",
      });

      await openDeleteDialog(paidTeam);

      // Helper label text is present and references the captain name
      expect(
        screen.getByText(/type the captain's full name to confirm/i)
      ).toBeInTheDocument();

      // The gated input is present
      expect(
        screen.getByTestId("delete-confirm-input")
      ).toBeInTheDocument();
    });

    it("paid team: Move to Trash button is disabled until exact-match is typed", async () => {
      const paidTeam = makeTeam({
        payment_status: "paid",
        amount_paid_cents: 20000,
      });

      const { user } = await openDeleteDialog(paidTeam);

      const trashBtn = screen.getByRole("button", { name: /move to trash/i });
      const input = screen.getByTestId("delete-confirm-input") as HTMLInputElement;

      // Wait for getScoreCount mock to resolve so the score-load gate doesn't mask the type-gate
      await waitFor(() => {
        // Bottom-of-button-disabled state is now driven by the type-gate, not score load
        expect(trashBtn).toBeDisabled();
      });

      // Wrong text — still disabled
      await user.type(input, "Wrong Name");
      expect(trashBtn).toBeDisabled();

      // Clear and type exact match
      await user.clear(input);
      await user.type(input, "Captain Jane");

      await waitFor(() => {
        expect(trashBtn).not.toBeDisabled();
      });
    });

    it("paid team: case mismatch keeps the button disabled", async () => {
      const paidTeam = makeTeam({
        payment_status: "paid",
        amount_paid_cents: 20000,
      });

      const { user } = await openDeleteDialog(paidTeam);

      const trashBtn = screen.getByRole("button", { name: /move to trash/i });
      const input = screen.getByTestId("delete-confirm-input") as HTMLInputElement;

      await user.type(input, "captain jane"); // wrong case

      // Strict equality — button stays disabled
      expect(trashBtn).toBeDisabled();
    });

    it("pending team renders no type-to-confirm input", async () => {
      const pendingTeam = makeTeam(); // default payment_status === "pending"

      await openDeleteDialog(pendingTeam);

      expect(
        screen.queryByTestId("delete-confirm-input")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/type the captain's full name/i)
      ).not.toBeInTheDocument();
    });
  });
```

- [ ] **Step 2: Run the new tests and verify they FAIL**

Run:
```bash
npx vitest run src/__tests__/teams-modal.test.tsx -t "type-to-confirm" 2>&1 | tail -40; echo "exit=$?"
```

Expected: `exit=1`, with **3 of 4 tests failing**:
- Test 1 (paid renders input + label) — FAILS, `getByTestId("delete-confirm-input")` not found.
- Test 2 (paid: button disabled until exact-match) — FAILS, button enables once score loads regardless of typed text.
- Test 3 (paid: case mismatch keeps disabled) — FAILS, same reason as test 2.
- Test 4 (pending renders no input) — **PASSES even before implementation** (queryByTestId returns null because the input doesn't exist anywhere yet). This test is a regression guard for AFTER implementation — it ensures the gate doesn't accidentally show on pending teams. Counted as RED-stage scaffolding, not a behavior assertion at this point.

If a test fails with an UNEXPECTED error (mock missing, import broken, `Input` import not yet added causing test render to throw, etc.), STOP and diagnose — setup is wrong, not just that the gate isn't implemented.

- [ ] **Step 3: Commit the RED tests**

```bash
git add src/__tests__/teams-modal.test.tsx
git commit -m "$(cat <<'EOF'
test(#393): RED — failing tests for paid-team delete type-to-confirm gate

4 tests:
- paid team renders input + helper label
- paid team: Move to Trash disabled until exact-match
- paid team: case mismatch keeps button disabled
- pending team renders no input (regression guard)

Tests fail because gate logic does not exist in source yet.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Implement the gate logic (turn tests GREEN)

**Files:**
- Modify: `src/app/admin/teams/team-modal.tsx` (extend `DeleteConfirmDialog`, lines 75-160)

- [ ] **Step 1: Add the `Input` import**

The `Input` component is already used elsewhere in the codebase. Add the import to the top of the file alongside the existing imports.

Find this block at the top of `src/app/admin/teams/team-modal.tsx`:

```tsx
import { Button } from "@/components/ui/button";
```

Replace with:

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
```

- [ ] **Step 2: Add gate state and derived values inside `DeleteConfirmDialog`**

Find this block in `src/app/admin/teams/team-modal.tsx` (around line 76-90, inside `DeleteConfirmDialog`):

```tsx
function DeleteConfirmDialog({ team, open, onOpenChange, onDeleted }: DeleteConfirmDialogProps) {
  const [scoreCount, setScoreCount] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captainMember = team.members.find((m) => m.role === "captain");
  const captainName = captainMember?.full_name?.trim() ? captainMember.full_name : null;
```

Replace with:

```tsx
function DeleteConfirmDialog({ team, open, onOpenChange, onDeleted }: DeleteConfirmDialogProps) {
  const [scoreCount, setScoreCount] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const captainMember = team.members.find((m) => m.role === "captain");
  const captainName = captainMember?.full_name?.trim() ? captainMember.full_name : null;

  // #393: type-to-confirm gate for paid teams.
  // Source of truth: captain_display_name (always non-null on team row, matches dialog title).
  const isPaid = team.payment_status === "paid" && team.amount_paid_cents > 0;
  const expectedConfirm = team.captain_display_name;
  const hasUsableConfirm = expectedConfirm.trim().length > 0;
  const requiresTypeConfirm = isPaid && hasUsableConfirm;
  const matches = confirmText === expectedConfirm; // strict exact-match (case + whitespace)
  const deleteEnabled = !requiresTypeConfirm || matches;

  // Defense-in-depth: surface bad data without locking the admin out.
  if (isPaid && !hasUsableConfirm) {
    console.warn(
      "[DeleteConfirmDialog] paid team has empty captain_display_name; gate skipped",
      { teamId: team.id }
    );
  }
```

- [ ] **Step 3: Reset `confirmText` when the dialog closes**

Find this `useEffect` block (around line 97-105):

```tsx
  // Fetch score count when dialog opens
  useEffect(() => {
    if (open && scoreCount === null) {
      getScoreCount(team.id).then(setScoreCount);
    }
    if (!open) {
      setError(null);
      setScoreCount(null);
    }
  }, [open, team.id, scoreCount]);
```

Replace with:

```tsx
  // Fetch score count when dialog opens; reset transient state on close.
  useEffect(() => {
    if (open && scoreCount === null) {
      getScoreCount(team.id).then(setScoreCount);
    }
    if (!open) {
      setError(null);
      setScoreCount(null);
      setConfirmText("");
    }
  }, [open, team.id, scoreCount]);
```

- [ ] **Step 4: Render the gate input + helper label, and extend the destructive button's `disabled` predicate**

Find the JSX return block (around line 131-159):

```tsx
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-destructive">{dialogTitle}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{bodyText}</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={pending || scoreCount === null}
          >
            {pending ? "Moving…" : "Move to Trash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
```

Replace with:

```tsx
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-destructive">{dialogTitle}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{bodyText}</p>
        {requiresTypeConfirm && (
          <div className="space-y-2">
            <label htmlFor="delete-confirm-input" className="text-sm">
              Type the captain's full name to confirm:{" "}
              <span className="font-medium">{expectedConfirm}</span>
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
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={pending || scoreCount === null || !deleteEnabled}
          >
            {pending ? "Moving…" : "Move to Trash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
```

- [ ] **Step 5: Run the unit tests and verify they PASS**

Run:
```bash
npx vitest run src/__tests__/teams-modal.test.tsx -t "type-to-confirm" 2>&1 | tail -20; echo "exit=$?"
```

Expected: `exit=0`, all four `type-to-confirm` tests passing. If any test fails, do NOT relax the test — diagnose the implementation. Common failure modes:
- Test using wrong captain name in `makeTeam()` override — defaults to `"Captain Jane"` which IS the `captain_display_name`. No override needed.
- `getScoreCount` mock resolves to 0; the score-load gate may not have settled before the type-gate assertion runs. Use `waitFor` around the disabled check.

- [ ] **Step 6: Run the FULL teams-modal suite to catch regressions**

Run:
```bash
npx vitest run src/__tests__/teams-modal.test.tsx 2>&1 | tail -10; echo "exit=$?"
```

Expected: `exit=0`, all tests in the file pass (existing + new). If existing tests broke, investigate — but likely root cause is your changes leaked state across tests; the `beforeEach(vi.clearAllMocks)` should isolate them.

- [ ] **Step 7: Run tsc to verify no type errors**

Run:
```bash
npx tsc --noEmit; echo "exit=$?"
```

Expected: `exit=0`. Capture full output (not summary) for the PR body later.

- [ ] **Step 8: Commit GREEN**

```bash
git add src/app/admin/teams/team-modal.tsx
git commit -m "$(cat <<'EOF'
fix(#393): restore type-to-confirm gate for paid-team delete

Regressed in PR #386 (Teams Phase 3) and incorrectly auto-closed by
PR #392's footer. This restores the source-side guard on
DeleteConfirmDialog.

- Gate triggers when payment_status === "paid" && amount_paid_cents > 0
- Source of truth: team.captain_display_name (always non-null on team row)
- Strict exact-match (case + whitespace)
- Helper label only — no badge, callout, or title change
- Defense-in-depth: empty captain_display_name skips gate + console.warn

Pending teams unchanged (no input rendered, plain confirm flow).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Aria sign-off on the helper label string

**Files:**
- Modify: `src/app/admin/teams/team-modal.tsx` (one-line label string change, only if Aria locks a different string)

This is a HUMAN GATE. The destructive-confirm gate exposes one new microcopy string:

> `Type the captain's full name to confirm:`

The current source code uses the draft string verbatim. Aria locks new microcopy per the issue scope ("Aria locks new strings — small Phase 3 §B addendum"). Two paths:

- [ ] **Step 1: Choose a path**

  - **Path A — Spawn Aria via /forge:build addendum.** Use `forge:Aria` agent with the prompt: "Lock the helper label microcopy for the paid-team delete-confirm gate. Single string slot: helper label prefix. Draft: 'Type the captain's full name to confirm:'. Context: Phase 3 §B7 dialog, follows the body text variant 1-4, precedes an input echoing the expected captain name. Audience: admin doing destructive action on paid team. Voice: clear, neutral, low-friction. Return ONE string, no alternatives, plus a one-line rationale."
  - **Path B — Scott approves the draft string verbatim.** Stop here, ask Scott "Approve helper label as drafted: 'Type the captain's full name to confirm:'? (yes / propose alternative)".

- [ ] **Step 2: If Aria/Scott returns a different string, apply it**

If the locked string differs from the draft, find this in `src/app/admin/teams/team-modal.tsx`:

```tsx
            <label htmlFor="delete-confirm-input" className="text-sm">
              Type the captain's full name to confirm:{" "}
              <span className="font-medium">{expectedConfirm}</span>
            </label>
```

Replace `Type the captain's full name to confirm:` with the Aria-locked string. The trailing `{" "}` and the `<span>{expectedConfirm}</span>` MUST stay — those are structure, not microcopy.

If Aria's locked string changes the helper label semantics enough that the unit test regex (`/type the captain's full name to confirm/i`) no longer matches, also update the regex in `src/__tests__/teams-modal.test.tsx` (Task 2 Step 1) to match the new string. Re-run unit tests to confirm GREEN.

- [ ] **Step 3: Commit (only if string changed)**

```bash
git add src/app/admin/teams/team-modal.tsx src/__tests__/teams-modal.test.tsx
git commit -m "$(cat <<'EOF'
copy(#393): lock helper label microcopy per Aria

Aria-locked string for the paid-team delete-confirm gate (Phase 3 §B7
addendum). Replaces the draft string from the implementation commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If Step 1 chose Path B and the draft was approved verbatim, skip the commit.

---

## Task 5: Restore the e2e test (revert PR #392's rewrite, adapted for current markup)

**Files:**
- Modify: `tests/e2e/team-delete-type-to-confirm.spec.ts`

The pre-#392 e2e (commit `9f386de^`) anchored on `team_name` and a "Type the team name" label that no longer exists. We're restoring the SHAPE of those assertions but adapted to: `captain_display_name` as the gate string, `delete-confirm-input` testid, and `Move to Trash` as the destructive button label.

- [ ] **Step 1: Update the file header doc-comment to reflect the gate is back**

Find lines 1-21 of `tests/e2e/team-delete-type-to-confirm.spec.ts`:

```ts
/**
 * E2E: Team delete — confirm dialog (Move to Trash) flow
 *
 * Contract (verified against team-list.tsx + team-modal.tsx, PR #386 + #392):
 * - NO row-level Delete button exists. Row actions = Edit + Mark Paid only.
 * - Delete trigger lives INSIDE the edit modal footer: "Delete team" button.
 * - DeleteConfirmDialog (team-modal.tsx) has NO type-to-confirm input.
 *   Aria Phase 3 §B7 specifies a body-text + "Move to Trash" / "Cancel" dialog only.
 * - The "Move to Trash" button is disabled while scoreCount === null (async load).
 * - Once scoreCount resolves, "Move to Trash" is enabled. Click → soft-delete.
 *
 * Flow under test:
 *   1. Create paid-team fixture via service-key REST (no PROD team destruction)
 *   2. Navigate to /admin/teams
 *   3. Click "Edit" on fixture row → edit modal opens
 *   4. Click "Delete team" in modal footer → DeleteConfirmDialog opens
 *   5. Wait for "Move to Trash" to become enabled (scoreCount loaded)
 *   6. Click "Move to Trash" → team gone from active list
 *   7. Navigate to /admin/trash → verify team appears in Teams tab
 *
 * Requires: E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD in env
 * Fixture cleanup: try/finally ensures fixture is removed if test fails mid-run.
 * Captain emails match e2e-*@example.com pattern for Forge orphan cleanup.
 */
```

Replace with:

```ts
/**
 * E2E: Team delete — type-to-confirm gate for paid teams (#393 restoration)
 *
 * Contract (verified against team-modal.tsx after #393 source restore):
 * - NO row-level Delete button. Row actions = Edit + Mark Paid only.
 * - Delete trigger lives INSIDE the edit modal footer: "Delete team" button.
 * - DeleteConfirmDialog gates on requiresTypeConfirm = isPaid && captain_display_name non-empty.
 * - Paid teams: input [data-testid="delete-confirm-input"] visible; "Move to Trash" disabled until
 *   confirmText === team.captain_display_name (strict exact-match).
 * - Pending teams: no input rendered; "Move to Trash" enabled once scoreCount loads.
 *
 * Flow under test (paid-team path):
 *   1. Create paid-team fixture via service-key REST (no PROD team destruction)
 *   2. Navigate to /admin/teams
 *   3. Click "Edit Captain Name's team" on fixture row → edit modal opens
 *   4. Click "Delete team" in modal footer → DeleteConfirmDialog opens
 *   5. Verify type-to-confirm input is visible
 *   6. Verify "Move to Trash" button starts disabled
 *   7. Type wrong text → button stays disabled
 *   8. Clear and type captain_display_name exactly → button enabled
 *   9. Click "Move to Trash" → team gone from active list
 *  10. Navigate to /admin/trash → verify team appears in Teams tab
 *
 * Requires: E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD in env
 * Fixture cleanup: try/finally ensures fixture is removed if test fails mid-run.
 * Captain emails match e2e-*@example.com pattern for Forge orphan cleanup.
 */
```

- [ ] **Step 2: Update the describe + test names**

Find:

```ts
test.describe("Team delete — confirm dialog (Move to Trash)", () => {
  test(
    "paid-team fixture: delete confirm dialog opens, Move to Trash button works, team moves to Trash",
```

Replace with:

```ts
test.describe("Team delete — type-to-confirm gate (#393)", () => {
  test(
    "paid-team fixture: type-to-confirm input gates Move to Trash until captain_display_name typed exactly",
```

- [ ] **Step 3: Restore the type-to-confirm assertions in the test body**

Find the block in `tests/e2e/team-delete-type-to-confirm.spec.ts` that starts after `await fixtureRow.getByRole("button", { name: \`Edit ${captainDisplayName}'s team\`, exact: true }).click();` and contains the "Move to Trash" button lookup + click. The block to replace looks roughly like:

```ts
        // ---- DeleteConfirmDialog should open ----
        // Anchor on the dialog title per Aria Phase 3 §B7:
        //   "Delete [Captain Full Name]'s team?"
        // Use a fragment of the possessive title to avoid exact-match brittleness.
        const deleteDialog = page.getByRole("dialog").filter({
          has: page.getByText("'s team?", { exact: false }),
        });
        await expect(deleteDialog).toBeVisible({ timeout: 5_000 });

        // ---- Wait for score count to load ----
        // The "Move to Trash" button is disabled while scoreCount === null (shows "Loading…").
        // Wait for the button to become enabled, which signals the async getScoreCount resolved.
        const moveToTrashBtn = deleteDialog.getByRole("button", {
          name: "Move to Trash",
          exact: true,
        });
        await expect(moveToTrashBtn).toBeEnabled({ timeout: 15_000 });

        // ---- Click "Move to Trash" — Aria Phase 3 §B7 locked destructive button label ----
        await moveToTrashBtn.click();
```

Replace with:

```ts
        // ---- DeleteConfirmDialog should open ----
        // Anchor on the dialog title per Aria Phase 3 §B7:
        //   "Delete [Captain Full Name]'s team?"
        // Use a fragment of the possessive title to avoid exact-match brittleness.
        const deleteDialog = page.getByRole("dialog").filter({
          has: page.getByText("'s team?", { exact: false }),
        });
        await expect(deleteDialog).toBeVisible({ timeout: 5_000 });

        // ---- Type-to-confirm input must be visible (paid team = requiresTypeConfirm) ----
        const confirmInput = deleteDialog.getByTestId("delete-confirm-input");
        await expect(confirmInput).toBeVisible({ timeout: 3_000 });

        // ---- "Move to Trash" button starts DISABLED ----
        // Two reasons it could be disabled at this point:
        //   1. scoreCount === null (async load not yet resolved)
        //   2. confirmText doesn't match captain_display_name yet
        // Either way, the user-facing assertion is "starts disabled".
        const moveToTrashBtn = deleteDialog.getByRole("button", {
          name: "Move to Trash",
          exact: true,
        });
        await expect(moveToTrashBtn).toBeDisabled({ timeout: 3_000 });

        // ---- Wait for score count to load — button still disabled (now only by type-gate) ----
        // Confirm the type-gate, not the score-load, is the active disabler from here on.
        // Type a clearly-wrong string and assert button stays disabled even after score load settles.
        await confirmInput.click();
        await confirmInput.fill("wrong-name-that-wont-match");
        await confirmInput.dispatchEvent("input");

        // Give scoreCount up to 15s to resolve. Button must remain disabled because the gate fails.
        await expect(moveToTrashBtn).toBeDisabled({ timeout: 15_000 });

        // ---- Clear and type the EXACT captain_display_name — gate unlocks ----
        // Use triple-click to select all, then pressSequentially so React onChange fires reliably.
        await confirmInput.click({ clickCount: 3 });
        await confirmInput.pressSequentially(captainDisplayName, { delay: 20 });
        await expect(moveToTrashBtn).toBeEnabled({ timeout: 5_000 });

        // ---- Click "Move to Trash" — team should be removed from active list ----
        await moveToTrashBtn.click();
```

- [ ] **Step 4: Run the e2e test against chromium and verify PASS**

Run (requires `E2E_ADMIN_EMAIL` + `E2E_ADMIN_PASSWORD` in env; if missing, the test self-skips per `baseTest.skip(...)`):

```bash
npx playwright test tests/e2e/team-delete-type-to-confirm.spec.ts --project=chromium 2>&1 | tail -30; echo "exit=$?"
```

Expected: `exit=0`, 1 test passing. Common failure modes:
- Fixture creation fails — service-key not readable. Check `~/.openclaw/secrets/supabase-craven-service-key` exists and `SUPABASE_SERVICE_ROLE_KEY` env var is unset (forcing the file path) or set correctly.
- `confirmInput` not found — the gate isn't rendering for the paid fixture. Verify the fixture's `payment_status` is `"paid"` AND `amount_paid_cents > 0` AND `captain_display_name` non-empty. Check the existing fixture-creation block in this file (search for `payment_status: "paid"` in lines ~150-200).
- `pressSequentially` types but match never satisfies — likely the fixture's `captain_display_name` differs from `captainDisplayName` JS variable. Both should be the same source.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/team-delete-type-to-confirm.spec.ts
git commit -m "$(cat <<'EOF'
test(e2e #393): restore type-to-confirm assertions on paid-team delete

Reverts the assertion-shape changes from PR #392 (which rewrote this
spec to match the post-#386 regressed behavior). Now asserts:

- Input [data-testid="delete-confirm-input"] visible on paid-team
  delete dialog
- "Move to Trash" disabled until confirmText matches captain_display_name
- Wrong text keeps button disabled (even after scoreCount resolves)
- Exact-match enables button
- Click → team soft-deleted, appears in Trash

Adapted for current markup: gates on captain_display_name (not
team_name, which was removed in the captain-identity refactor).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: (Optional) Decide on pending-path e2e coverage**

The spec acceptance criteria mention BOTH paid and pending paths in e2e ("E2E tests cover paid + pending paths"). This plan restores ONLY the paid-path test — pending behavior is covered by unit test #4 in Task 2 (`pending team renders no type-to-confirm input`).

**Recommendation: skip the pending-path e2e.** Unit test fully covers the behavior; adding a second e2e fixture (pending team, no payment) doubles auth+navigation overhead and flake surface without adding behavioral coverage that the unit tier doesn't already provide.

If Scott or Watchdog requires the pending-path e2e (literal spec adherence), file as a separate follow-up issue rather than expanding this PR's scope. The follow-up would: create a pending-team fixture, navigate to delete dialog, assert `delete-confirm-input` is NOT present, assert `Move to Trash` enables once `scoreCount` resolves, click and verify soft-delete.

If proceeding without the pending-path e2e, mention this divergence in the PR body's "Test plan" section so Watchdog sees it explicitly.

---

## Task 6: Push branch, capture verification evidence, open PR

**Files:**
- No code edits. Verification + PR.

- [ ] **Step 1: Capture all three verification outputs into a temp file**

Run all three checks in sequence and save full output:

```bash
{
  echo "=== tsc ==="
  npx tsc --noEmit; echo "exit=$?"
  echo
  echo "=== vitest (teams-modal) ==="
  npx vitest run src/__tests__/teams-modal.test.tsx 2>&1; echo "exit=$?"
  echo
  echo "=== playwright (team-delete-type-to-confirm) ==="
  npx playwright test tests/e2e/team-delete-type-to-confirm.spec.ts --project=chromium 2>&1; echo "exit=$?"
} > /tmp/393-verification.log 2>&1
cat /tmp/393-verification.log | tail -60
```

Expected: all three blocks end with `exit=0`. If any non-zero, FIX before opening the PR. Do not paper over with "tsc passes (mostly)" or similar — Watchdog will catch and block (LESSONS-LEARNED Rule 2).

- [ ] **Step 2: Push the branch**

```bash
git push -u origin fix/393-restore-paid-team-type-to-confirm
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create --title "fix(#393): restore type-to-confirm gate for paid-team delete" --body "$(cat <<'EOF'
## Summary

Restores the type-to-confirm safety guard on paid-team delete that was regressed in PR #386 (admin table unification — Teams Phase 3) and incorrectly auto-closed by PR #392's `Closes #393` footer. Issue #393 reopened 2026-05-08.

- Gate triggers when `payment_status === "paid" && amount_paid_cents > 0`
- Source of truth: `team.captain_display_name` (replaces the removed `team_name`)
- Strict exact-match (case + whitespace)
- Helper label only — no badge, callout, or title differentiation
- Defense-in-depth: empty `captain_display_name` skips the gate + `console.warn`
- Pending-team behavior unchanged

## Test plan

- [x] 4 unit tests added in `src/__tests__/teams-modal.test.tsx` (paid renders input, exact-match enables, case mismatch keeps disabled, pending renders no input)
- [x] E2E in `tests/e2e/team-delete-type-to-confirm.spec.ts` restored to assert the gate (paid-team path: input visible, button disabled, wrong text keeps disabled, exact match enables, click soft-deletes)
- [x] Pre-existing `teams-modal.test.tsx` suite passes
- [x] Aria sign-off on the helper label string

## Verification evidence (per LESSONS-LEARNED Rule 2)

\`\`\`
=== tsc ===
<paste full output of npx tsc --noEmit; exit=N from /tmp/393-verification.log>

=== vitest (teams-modal) ===
<paste full output; exit=N>

=== playwright (team-delete-type-to-confirm) ===
<paste full output; exit=N>
\`\`\`

## Spec + plan

- Spec: \`docs/superpowers/specs/2026-05-08-restore-paid-team-delete-typeconfirm-design.md\`
- Plan: \`docs/superpowers/plans/2026-05-08-restore-paid-team-delete-typeconfirm.md\`

Closes #393
EOF
)"
```

After the PR is created, edit the body to paste the actual `/tmp/393-verification.log` contents into the three fenced blocks (replace the `<paste...>` placeholders). Use `gh pr edit <NN> --body-file -` for clean replacement, or via the web UI.

- [ ] **Step 4: Print PR URL**

```bash
gh pr view --json url --jq .url
```

Hand off to Watchdog for review (`/forge:review <NN>`).

---

## Plan complete

After Task 6, the work is in PR review. Do not merge before:
1. Watchdog approves
2. Branch e2e dispatch passes (`gh workflow run e2e.yml --ref fix/393-restore-paid-team-type-to-confirm`)
3. Aria copy is locked (Task 4)

If any task surfaces a blocker not anticipated above (e.g., the unit test rendering hangs because `TeamList` requires a Provider context), STOP and surface to Scott — do NOT improvise around it.
