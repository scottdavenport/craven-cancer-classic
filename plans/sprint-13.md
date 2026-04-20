# Sprint 13 — UI Consistency Pass (UAT-BUNDLE-A)

**Sprint goal:** Eliminate all native `window.confirm()` / raw `<select>` usage in `src/`. Replace with shadcn Dialog + shadcn Select. Matches the no-native-UI rule (memory: `feedback_no_system_ui`).

**GitHub issue:** #147 (P1-high, size:L) — label rebased from `sprint-12` to `sprint-13`.

**Baseline:** main at `2628d6d` (post Sprint 12). 531 tests passing. tsc clean. CSV import live-run complete.

---

## Audit (verified on main via grep)

### `confirm()` call sites — 6 total, 5 files

| File | Line | Purpose |
|---|---|---|
| `src/app/admin/photos/photo-moderation.tsx` | 69 | Permanently delete photo |
| `src/app/admin/sponsors/sponsor-list.tsx` | 80 | Delete sponsor |
| `src/app/admin/contacts/contact-drawer.tsx` | 42 | Delete contact |
| `src/app/admin/scores/score-manager.tsx` | 82 | Delete single score |
| `src/app/admin/scores/score-manager.tsx` | 88 | (second confirm path — inspect) |
| `src/app/admin/sponsorships/sponsorship-manager.tsx` | 80 | Delete sponsorship package |

### Raw `<select>` elements — 5 total, 4 files

| File | Line | Purpose |
|---|---|---|
| `src/app/admin/sponsors/sponsor-list.tsx` | 265-271 | Sponsor tier dropdown |
| `src/app/admin/sponsors/sponsor-list.tsx` | 318 | (second select — inspect) |
| `src/app/admin/scores/score-manager.tsx` | 173 | Score-related dropdown |
| `src/app/admin/sponsorships/sponsorship-manager.tsx` | 363 | Sponsorship status/field dropdown |
| `src/app/admin/settings/invite-form.tsx` | 104 | Role dropdown (admin/viewer) |

### Tests that mock confirm/alert/prompt

Zero. `rg "window\.confirm|mockConfirm|spyOn.*confirm"` in `src/__tests__` returns only doc-comment references in the team-builder test. Existing tests that exercise delete flows likely short-circuit on the confirm's default-false return and don't cover the accepted path.

---

## Replacement patterns (reference code in repo)

### Confirms → shadcn Dialog

Canonical: `DeleteTeamDialog` inside `src/app/admin/teams/team-list.tsx` (added in S10-5). Pattern:
- Open state managed by parent; trigger button sets `setDeleteTarget(row)`
- Dialog body shows the warning text + consequence
- Dialog footer has Cancel (ghost) + Confirm (destructive variant)
- Confirm invokes the delete action in a `useTransition` and closes on success

Build a small shared `<ConfirmDialog>` if the pattern repeats cleanly, OR repeat inline where subtle per-call-site copy matters. Decide during implementation — don't over-abstract. Three similar blocks > premature abstraction (per CLAUDE.md).

### Selects → shadcn Select

Canonical: `TeamForm` at `src/app/admin/teams/team-form.tsx:484-492` (single-value) and `ContactList` at `src/app/admin/contacts/contact-list.tsx:393-447` (filter selects). Pattern:
- `<Select value={x} onValueChange={(v) => setX(v ?? fallback)}>`
- `<SelectTrigger>` with placeholder
- `<SelectContent>` + `<SelectItem value={...}>Label</SelectItem>`
- ARIA roles from the shadcn primitive — tests should use `getByRole("combobox")` or `userEvent.selectOptions` alternatives

---

## Issues / work split

### S13-1: Replace all 6 `confirm()` with shadcn Dialog (Bolt)

Files:
- `src/app/admin/photos/photo-moderation.tsx` (line 69)
- `src/app/admin/sponsors/sponsor-list.tsx` (line 80)
- `src/app/admin/contacts/contact-drawer.tsx` (line 42)
- `src/app/admin/scores/score-manager.tsx` (lines 82, 88)
- `src/app/admin/sponsorships/sponsorship-manager.tsx` (line 80)

Acceptance:
- [ ] `rg "confirm\(" src/` returns zero hits
- [ ] Each delete flow: click trash → Dialog opens → Cancel closes without deleting → Confirm deletes and closes
- [ ] Any pre-existing test that exercises delete updates to click through the Dialog (Bolt fixes inline as a natural test-with-refactor update, documents in commit)

### S13-2: Replace all 5 raw `<select>` with shadcn Select (Bolt)

Files:
- `src/app/admin/sponsors/sponsor-list.tsx` (lines 265-271, 318)
- `src/app/admin/scores/score-manager.tsx` (line 173)
- `src/app/admin/sponsorships/sponsorship-manager.tsx` (line 363)
- `src/app/admin/settings/invite-form.tsx` (line 104)

Acceptance:
- [ ] `rg "<select" src/` (case-sensitive) returns zero hits for HTML element; only tsx <Select> component refs remain
- [ ] Functional parity: each select controls the same state it did before; onChange behavior preserved
- [ ] Any test referencing `<select>` DOM queries updates to shadcn Select's combobox role

### Bundling

S13-1 and S13-2 share 3 files (sponsor-list, scores, sponsorships). Bundle into one Bolt PR to avoid rebase churn. Files touched: 6 total. Size: medium-large but cleanly scoped.

### Out of scope

- UAT-BUNDLE-B (#148 drawer migration for team-list) — separate sprint
- Photos / scores feature work beyond the mechanical UI swap
- Styling polish beyond matching existing shadcn conventions

---

## Delivery order

Single Bolt PR covering both S13-1 and S13-2. Watchdog reviews, Forge merges.

No Sentinel needed (no auth/security change). No Spec RED phase needed (refactor of visible UI — Bolt updates broken tests inline per the test-with-refactor exception in BUILD-WORKFLOW).

---

## Risks

- **Tests that silently passed** because `confirm()` returns `undefined` in jsdom may start failing once the confirm is explicit (Dialog click required). Bolt catches these during the conversion and updates them to click the new Dialog confirm button.
- **shadcn Select ARIA role** is `combobox`, not `listbox`/`select`. Any test using `getByRole("combobox")` already handles both; any test using `getAllByRole("listbox")` or `input[type=select]` selectors needs updating.
- **Visual regression** — confirm dialogs open as modal overlays; make sure they don't collide with existing open Sheet/Drawer z-indexes in the contact-drawer case.
