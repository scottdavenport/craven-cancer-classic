# Sprint 30 — admin Select `items` prop sweep (contact-list + team-form)

**Status:** Planning — awaiting Forge approval before Bolt spawns.
**Driver:** Sprint 29 (PR #261) closed `#178` for contact-form. Watchdog's review flagged that `contact-list.tsx` and `team-form.tsx` likely have the same latent bug pattern. Forge verified — confirmed 5 latent bugs across the 2 files. Worst case: contact-list Team filter renders UUIDs in the trigger when a team is selected.

This is the continuation/completion of the Sprint 13 hotfix #177 work. Hotfix #177 shipped the memory rule but didn't sweep all sites; Sprint 29 covered contact-form; Sprint 30 covers the remaining two named files.

## Scope

Add `items` prop to 5 `<Select>` instances:

**`src/app/admin/contacts/contact-list.tsx`** — 4 Selects:
1. Type filter (line 394) — value/label pairs all lowercase/capitalized divergence
2. Year filter (line 408) — only the "All Years" option is buggy (year items already match)
3. Consent filter (line 432) — value/label divergence
4. Team filter (line 444) — **UUIDs in trigger** — worst case, P1

**`src/app/admin/teams/team-form.tsx`** — 1 Select:
5. Session (line 140) — value/label divergence ("morning" vs "Morning")

## Non-Goals

- Don't audit other Select sites in the codebase (out of scope per `feedback_surgical_changes.md` — only the 2 named files from Watchdog's flag)
- Don't refactor the wrapping shadcn `<Select>` component
- Don't change the underlying value enums (still `"player"` / `"sponsor"` / etc — DB enum values)
- Don't change filter logic, server actions, or anything beyond the `<Select>` markup

## Implementation pattern (per memory `feedback_base_ui_select_items.md`)

Static items (Type / Consent / Session):
```tsx
<Select
  value={typeFilter}
  onValueChange={...}
  items={{ all: "All Types", player: "Player", sponsor: "Sponsor", donor: "Donor", other: "Other" }}
>
  ...existing children...
</Select>
```

Dynamic items (Year / Team):
```tsx
// Year
items={{
  all: "All Years",
  ...Object.fromEntries(availableYears.map((y) => [String(y), String(y)])),
}}

// Team
items={{
  all: "All Teams",
  ...Object.fromEntries(teams.map((t) => [t.id, t.team_name])),
}}
```

`<SelectItem>` children stay as-is (used for the dropdown list).

## Files

| File | Action |
|---|---|
| `src/app/admin/contacts/contact-list.tsx` | MODIFY — add `items` to 4 Selects |
| `src/app/admin/teams/team-form.tsx` | MODIFY — add `items` to 1 Select |
| `src/app/admin/contacts/__tests__/contact-list.test.tsx` (or wherever) | MODIFY OR CREATE — regression tests asserting trigger displays label after selection |
| `src/app/admin/teams/__tests__/team-form.test.tsx` (or wherever) | MODIFY OR CREATE — regression test for Session select |
| `plans/sprint-30-admin-select-items-sweep.md` | CREATE (this file, ships with PR) |

Bolt grep-verifies the test file paths before assuming.

## Acceptance Criteria

1. `contact-list.tsx` Type filter trigger displays label ("Player" not "player") after selection — no `String(value)` rendering
2. `contact-list.tsx` Year filter trigger displays "All Years" when `value="all"` (not the literal `"all"`)
3. `contact-list.tsx` Consent filter trigger displays label ("Subscribed only" not "subscribed")
4. `contact-list.tsx` Team filter trigger displays the team name (e.g. "Davenport Family") not the UUID — **load-bearing fix**
5. `team-form.tsx` Session select trigger displays "Morning" / "Afternoon" not "morning" / "afternoon"
6. All `<SelectItem>` children preserved across all 5 sites (additive change)
7. No regression in any other test suite — full vitest still green
8. Filter logic, captain toggle, search input, server actions all unchanged

## Test Plan (Bolt writes inline)

For each of the 5 selects, add a regression test:
1. Render the parent component with appropriate fixtures (use existing test patterns in the file)
2. Open the select dropdown
3. Click an option whose label differs from value
4. Assert trigger displays the label, not the value
5. Special for Team filter: assert trigger displays the team name (string), not a UUID-shaped string

If the existing test files don't render contact-list / team-form (because they're large client components with complex setup), create focused new test files for the regression coverage. Don't expand existing tests beyond what's needed.

## Watchdog Gate

Standard QA + the `feedback_pr_body_verification_must_be_real.md` rule:

PR body MUST include verbatim grep output:
- `git grep "items={" src/app/admin/contacts/contact-list.tsx` → 4 hits (one per Select)
- `git grep "items={" src/app/admin/teams/team-form.tsx` → 1 hit
- `git grep "<Select " src/app/admin/contacts/contact-list.tsx src/app/admin/teams/team-form.tsx` → 5 hits, each one in the diff should have an `items` prop

Watchdog re-runs to verify.

No Aria gate (no new copy — labels are existing strings).

## PR Structure

Single Bolt PR. Plan + 2 production files + tests in one commit. Watchdog reviews. Forge merges. Vercel auto-deploys.

## Effort Estimate

| Work | Owner | Size | Estimate |
|---|---|---|---|
| Plan write | Forge | XS | 0 (this file) |
| Implementation + tests | Bolt | S-M | ~1h |
| Watchdog review | Watchdog | XS | ~15min |
| Verify prod (admin auth — Scott smokes) | Forge/Scott | XS | ~5min |

**Total wall-clock:** ~1.25h.

## Risks

- **Team filter dynamic items** — `teams` is a prop/state value. The `items` object must reference whatever the parent component holds (likely a useState or fetched array). Bolt verifies the closure/scope works correctly.
- **Year filter availableYears** — same dynamic pattern. Bolt verifies the closure.
- **Test infrastructure for large client components** — contact-list.tsx is a large file with many filters and table rendering. If existing tests don't already mount it, mocking Supabase + teams data might be heavier than expected. If pre-flight reveals this, surface to Forge before going deep — could split tests into smaller component-level coverage.
- **No issue auto-close** — there's no GitHub issue tracking these specific 5 sites (the work originates from Watchdog's PR #261 review comment). Bolt's PR body should reference Watchdog's note + the original Sprint 13 hotfix #177 + the now-closed Sprint 29 issue #178 for context.
