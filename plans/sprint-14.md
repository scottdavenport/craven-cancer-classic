# Sprint 14 — Drawer Migration (UAT-BUNDLE-B)

**Sprint goal:** Migrate the 4 remaining admin CRUD pages from inline-form + modal-Dialog edit patterns to the canonical right-side Sheet drawer established in Sprint 10 for `/admin/contacts`.

**GitHub issue:** #148 (P1-high, size:L). Chronically deferred from Sprint 12. Ship it.

**Baseline:** `main` at `44241b3` (post S13 hotfix). 531 tests passing. tsc clean.

---

## The pattern (from `/admin/contacts` — S10-3)

Reference: `src/app/admin/contacts/contact-drawer.tsx` + `contact-form.tsx` + `contact-list.tsx`.

Shape:
1. `<{entity}-drawer>` component wraps `<Sheet>` on the right side (~480px wide). Controlled by `open` / `onOpenChange` props. Renders `<{entity}-form>` inside SheetContent.
2. `<{entity}-form>` is the shared form — accepts `defaultValues` (edit mode) or none (create mode), an `onSubmit` callback, and optional `onDelete` for the footer.
3. `<{entity}-list>` no longer renders any inline or modal form. It:
   - Tracks `drawerState: { mode: "create" | "edit", target?: T } | null`
   - Row click → sets `{ mode: "edit", target: row }`
   - "New X" button → sets `{ mode: "create" }`
   - Delete button in the drawer footer (uses `ConfirmDialog` from `src/components/ui/confirm-dialog.tsx`, shipped in S13)
4. On save: call the server action, show `sonner` toast, close drawer, refetch (router.refresh() or parent-managed list state).

## Pages (one PR each, parallel)

### S14-A: `/admin/sponsors` (Bolt)
**Current state:** `src/app/admin/sponsors/sponsor-list.tsx` contains an inline `SponsorForm` component (rendered conditionally) and the table. Mixed concerns.

**Target state:**
- New: `src/app/admin/sponsors/sponsor-drawer.tsx`
- New: `src/app/admin/sponsors/sponsor-form.tsx` (extracted from sponsor-list.tsx)
- Modified: `src/app/admin/sponsors/sponsor-list.tsx` (list + drawer state only)
- Delete button moves from row actions to drawer footer
- sonner toast on save

### S14-B: `/admin/sponsorships` (Bolt)
**Current state:** `src/app/admin/sponsorships/sponsorship-manager.tsx` contains `ItemForm` inline + table.

**Target state:**
- New: `src/app/admin/sponsorships/sponsorship-drawer.tsx`
- New: `src/app/admin/sponsorships/sponsorship-form.tsx` (extracted `ItemForm`)
- Modified: `src/app/admin/sponsorships/sponsorship-manager.tsx`
- Delete in drawer footer
- sonner toast on save

### S14-C: `/admin/teams` (Bolt)
**Current state:** `src/app/admin/teams/team-form.tsx` is already extracted and heavily tested. `team-list.tsx` currently opens the form in a modal `Dialog`. We'll keep the form component as-is, replace the Dialog wrapper with a Sheet drawer.

**Target state:**
- New: `src/app/admin/teams/team-drawer.tsx` (wraps existing `team-form.tsx`)
- Modified: `src/app/admin/teams/team-list.tsx` (Dialog → Sheet)
- Delete action on rows moves to drawer footer (the DeleteTeamDialog that motivated S10-5 — still uses its `ConfirmDialog`, just triggered from the drawer footer)
- sonner toast on save

### S14-D: `/admin/scores` (Bolt)
**Current state:** `src/app/admin/scores/score-manager.tsx` has an inline `<form>` for adding scores.

**Target state:**
- New: `src/app/admin/scores/score-drawer.tsx`
- New: `src/app/admin/scores/score-form.tsx`
- Modified: `src/app/admin/scores/score-manager.tsx`
- Delete in drawer footer
- sonner toast on save

### Not in scope
- `/admin/settings` invite-form — modal flow by design (not a CRUD edit); keep as-is
- `/admin/photos` photo-moderation — not a row-edit pattern; keep as-is
- `/admin/contacts` — already migrated (canonical reference)

## Parallelism

Four disjoint folders. Four Bolt builders run in parallel. Zero file overlap between them (no collisions).

## Tests

Each PR adds drawer-flow tests matching the `contact-drawer` test pattern:
- Click row → drawer opens with edit defaults populated
- "New X" button → drawer opens in create mode
- Fill form → submit → server action called → drawer closes → toast
- Delete from footer → ConfirmDialog → action called → drawer closes
- Cancel → drawer closes without action call

~4-5 behavioral tests per PR, ~16-20 new tests total.

Existing tests that exercised the inline forms will need updating (Bolt fixes inline per BUILD-WORKFLOW's refactor-test-update exception).

## Delivery order

4 PRs in parallel, each closing part of #148. Last PR merged uses "Closes #148"; earlier ones use "Part of #148".

## Risks

- **Team drawer is the riskiest** — team-form.tsx has 20 tests (S11-3 inline contact creation) plus the S11-3/S12-A refactor state. Wrapping it in a drawer must not break those tests. Bolt should run the team-form tests first and often.
- **Scores** is the least documented of the four — lightweight form, verify fields + types before extraction.
- **Sponsors + Sponsorships** have the S13 Select sites — make sure the `items` props survive the form extraction.
- **sonner is already wired** in the admin layout — verify the import path matches what `contact-drawer` uses.

## Acceptance

- [ ] Four PRs merged, #148 closed
- [ ] Zero inline edit forms in the 4 migrated admin pages (grep check: no `<form` inside list/manager components outside of the drawer context)
- [ ] Drawer pattern identical to `contact-drawer` across all 4 pages
- [ ] Full test suite ≥ 531 + ~16-20 = ~547-551 passing, zero failing
- [ ] tsc clean, build passes
