# Sprint 26 — Quick Wins: window.location.reload → router.refresh + sonner toasts

**Status:** Planning — awaiting Forge approval before Bolt spawns.
**Driver:** Two open issues with the same root cause + same fix:
- **#212** `chore: score-manager window.location.reload → router.refresh`
- **#139** `Swap window.location.reload to sonner toasts in team-list.tsx`

Single PR satisfies both — same swap pattern, two files.

## Scope

Replace `window.location.reload()` with `router.refresh()` (Next 16 App Router pattern) + add sonner toast for user feedback in two locations:

1. **`src/app/admin/scores/score-manager.tsx:51`** — after the clear-year action. One occurrence.
2. **`src/app/admin/teams/team-list.tsx:300,305`** — after team invite actions. Two occurrences.

## Why this matters

`window.location.reload()` is a hard navigation: full document reload, loses client state (scroll position, form drafts, modal open state), causes white-flash. `router.refresh()` triggers Next's RSC re-fetch in place — server data updates, no flash, no state loss. Sonner toast adds explicit success feedback so the user knows the action took.

## Non-Goals

- Don't audit other `window.location.reload()` sites in the codebase (out of scope per `feedback_surgical_changes.md` — these two issues are the named scope)
- Don't refactor the surrounding action handlers
- Don't change the actions themselves (server-side logic stays)
- Don't touch tests for these files unless directly affected

## Files

| File | Action | Notes |
|---|---|---|
| `src/app/admin/scores/score-manager.tsx` | MODIFY | Replace `window.location.reload()` at line 51 with `router.refresh()` + `toast.success("Year cleared")` (or context-appropriate message). Add `import { useRouter } from "next/navigation"` and `import { toast } from "sonner"` if not present. |
| `src/app/admin/teams/team-list.tsx` | MODIFY | Replace `window.location.reload()` at lines 300 + 305 with `router.refresh()` + sonner toast for each invite action. Same imports. |
| `src/app/admin/scores/__tests__/score-manager.test.tsx` | MODIFY OR CREATE | Test: after clear-year action, `router.refresh` is called (mock), `window.location.reload` is NOT called, toast.success is called with the right message |
| `src/app/admin/teams/__tests__/team-list.test.tsx` | MODIFY OR CREATE | Same pattern for both invite actions |

## Acceptance Criteria

1. `window.location.reload()` does NOT appear in `score-manager.tsx` anywhere
2. `window.location.reload()` does NOT appear in `team-list.tsx` anywhere
3. `router.refresh()` is called after the clear-year action in `score-manager.tsx`
4. `router.refresh()` is called after each of the 2 team invite actions in `team-list.tsx`
5. A sonner `toast.success(...)` is called with a context-appropriate message after each of the 3 actions (clear-year, invite #1, invite #2)
6. Toast messages are short, direct, no jargon — Aria-quality but no formal Aria gate (see below)
7. `useRouter` from `next/navigation` is imported in both files
8. `toast` from `sonner` is imported in both files
9. Tests cover the regression: assert `window.location.reload` is NOT called for any of the 3 actions

## Test Plan

Bolt writes inline (no separate Spec RED phase — surgical 2-file change touching well-defined functions). Cover:
- Mock `useRouter` and `sonner.toast` per existing test patterns in the codebase (find another admin test file that mocks these)
- For each action: simulate the click, assert `router.refresh` called once + `toast.success` called once with the expected message + `window.location.reload` NOT called (use `vi.spyOn(window.location, 'reload')` or similar)

Verify against `~/github/forge/memory/feedback_no_user_type_long_strings.md` if any test inputs require typing — use `fireEvent.change` for >50char strings.

## Watchdog Gate

Standard QA + the new `~/github/forge/memory/feedback_pr_body_verification_must_be_real.md` rule — Bolt's PR body must include actual `grep` output proving:
- 0 hits for `window.location.reload` in score-manager.tsx + team-list.tsx
- N hits for `router.refresh` (the new calls)
- N hits for `toast.success` (the new calls)

Watchdog re-runs the exact greps to verify. No "approximately" or "I think" — actual command output.

No Aria gate (toast strings are short, conventional, and don't reference program areas — Aria's lock list doesn't apply).

## Sonner toast copy (locked)

| Action | Toast message |
|---|---|
| `score-manager` clear-year | `"Year cleared"` |
| `team-list` invite-success #1 | (Bolt picks based on what the action does — verify by reading the action handler) |
| `team-list` invite-success #2 | (Bolt picks based on what the action does — verify by reading the action handler) |

For team-list: read the existing button labels / action handlers to write context-appropriate toasts. Examples: `"Invite sent"`, `"Team member added"`, `"Invitation resent"`. Keep under 5 words. Avoid emoji.

## PR Structure

Single Bolt PR. Plan + implementation + tests in one commit (or split as Bolt prefers). Watchdog reviews. Forge merges. Vercel auto-deploys.

## Effort Estimate

| Work | Owner | Size | Estimate |
|---|---|---|---|
| Plan write | Forge | XS | 0 (this file) |
| Implementation + tests | Bolt | S | ~45min |
| Watchdog review | Watchdog | XS | ~15min |
| Verify prod | Forge | XS | ~5min |

**Total wall-clock:** ~1h.

## Risks

- **Tests for these admin pages may not exist yet.** Bolt creates them if needed, following the existing admin test patterns.
- **Toast import path** — codebase may use a wrapper around sonner (e.g. `@/lib/toast`) instead of importing directly from `sonner`. Bolt verifies by grepping existing toast usage in `src/app/admin/`.
- **`useRouter` availability** — these are client components (use of `window.location` confirms it). `useRouter` from `next/navigation` is the right import for App Router client components.
