# Sprint 29 — contact-form base-ui Select `items` prop (#178)

**Status:** Planning — awaiting Forge approval before Bolt spawns.
**Driver:** Issue #178 — Pre-existing `<Select>` sites in contact-form.tsx don't pass the `items` prop. Per memory `feedback_base_ui_select_items.md`, base-ui `<SelectValue>` renders `String(value)` by default (NOT the matching `<SelectItem>` children text). Currently the Type select trigger displays "sponsor" (lowercase value) instead of "Sponsor" (label).

## Scope

Add `items` prop to both `<Select>` components in `src/app/admin/contacts/contact-form.tsx`:

1. **Type select** (lines 276-286, currently visibly buggy) — values are `"player" / "sponsor" / "donor" / "other"`, labels are `"Player" / "Sponsor" / "Donor" / "Other"`. After selection, trigger shows lowercase value instead of capitalized label.
2. **Year First Seen** (lines 290-304, accidentally fine but defensive) — values are `String(year)`, labels are the same number. Adding `items` doesn't fix any visible bug today but locks in the memory rule across all contact-form Selects.

## Non-Goals

- Don't audit other `<Select>` sites elsewhere in the codebase (out of scope per `feedback_surgical_changes.md`)
- Don't refactor the wrapping shadcn `<Select>` component itself
- Don't change the underlying value enums (still `"player"` / `"sponsor"` / etc — those are the DB enum values)

## Files

| File | Action |
|---|---|
| `src/app/admin/contacts/contact-form.tsx` | MODIFY — add `items` prop to both `<Select>` (Type + Year) |
| `src/__tests__/contact-form-polish.test.tsx` (or the right test file — Bolt verifies via grep) | MODIFY OR EXTEND — add 2 cases asserting trigger displays the human label after selection (not the raw value) |
| `plans/sprint-29-contact-form-select-items.md` | CREATE (this file, ships with PR) |

## Implementation pattern (per memory)

```tsx
<Select
  value={type}
  onValueChange={(v) => setType(v as ContactInput["type"])}
  items={{ player: "Player", sponsor: "Sponsor", donor: "Donor", other: "Other" }}
>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="player">Player</SelectItem>
    <SelectItem value="sponsor">Sponsor</SelectItem>
    <SelectItem value="donor">Donor</SelectItem>
    <SelectItem value="other">Other</SelectItem>
  </SelectContent>
</Select>
```

`<SelectItem>` children stay as-is (used for the dropdown list); `items` is only consulted by `<SelectValue>` for the trigger render.

For Year First Seen — `items` is a Record<string, string> built from `YEAR_OPTIONS`:
```tsx
items={Object.fromEntries(YEAR_OPTIONS.map((y) => [String(y), String(y)]))}
```

## Acceptance Criteria

1. Type select trigger displays the capitalized label ("Player" / "Sponsor" / "Donor" / "Other") after selection — NOT the lowercase enum value
2. Year First Seen trigger displays the year (no functional change vs today, but `items` is now present as defensive consistency)
3. The dropdown list (the open `<SelectContent>`) is unchanged — labels still match what's there today
4. `<SelectItem value="...">{label}</SelectItem>` children are preserved on both Selects (`items` is additive, not a replacement)
5. No regression in any other test suite — full vitest still green
6. The matching test file asserts the trigger label, not just the value (regression guard against `<SelectValue>` rendering `String(value)`)

## Test Plan (Bolt writes inline)

For each of the 2 selects:
1. Render the contact-form
2. Open the select dropdown
3. Click an option whose label differs from its value (e.g. "Sponsor" with value="sponsor")
4. Assert the trigger now shows "Sponsor" (the label), not "sponsor" (the value)

Use the test file path Bolt confirms via grep — likely `src/__tests__/contact-form-polish.test.tsx` per the Sprint 28 backlog audit, but Bolt verifies.

## Watchdog Gate

Standard QA + the `feedback_pr_body_verification_must_be_real.md` rule:

PR body MUST include verbatim output of:
- `git grep "items={" src/app/admin/contacts/contact-form.tsx` → 2 hits (one per Select)
- `git grep "<Select " src/app/admin/contacts/contact-form.tsx` → 2 hits (the 2 Selects, both should have `items` per the diff)

Watchdog re-runs to verify.

No Aria gate (no new copy — labels are existing strings).

## Effort Estimate

| Work | Owner | Size | Estimate |
|---|---|---|---|
| Plan write | Forge | XS | 0 (this file) |
| Implementation + tests | Bolt | XS | ~30min |
| Watchdog review | Watchdog | XS | ~10min |
| Verify prod (admin auth needed — likely Scott smoke) | Forge/Scott | XS | ~5min |

**Total wall-clock:** ~45min.

## Risks

- **Test file path may not exist where memory predicts.** Bolt grep-verifies before assuming. If the only existing test is `contact-form-polish.test.tsx` and it doesn't exercise the selects, Bolt extends it (preferred) or creates a new focused test file (only if necessary).
- **None substantive.** Surgical, single-file production change with a memory-locked pattern.
