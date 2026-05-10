# S38 — Admin Hardening
**Milestone:** S38 — Admin Hardening (GitHub milestone #2)
**Target date:** 2026-05-16
**Plan written:** 2026-05-10
**Specialist:** Compass

---

## Plain-English Readout

S38 closes five defensive gaps that crept in during feature velocity sprints. Two issues
are security-flavored (view invoker rights, admin gating on CSV export) and three are
test-quality debt (hydration mismatch, a loose substring assertion, stale testids). None
add features or change public-facing behavior — the sprint is purely about closing
windows an auditor or a future builder would flag.

The five issues are independent of each other and can be worked in parallel by separate
builders, with the single constraint that #389 (migration) must not share a builder
session with any other migration or view-touching work to avoid rebase collisions. All
five are S or M effort; total calendar risk is low. The milestone is achievable in one
working week with one builder.

---

## Per-Issue Spec Enrichment

### Issue #389 — Add `security_invoker=true` to all `*_active` views

**Aria upfront-gate:** No user-facing strings. This sprint adds no labels, CTAs, errors,
empty/loading states, microcopy, or visible date/number/units formats. If the
implementation surfaces any new string, the builder must pause and request an Aria spawn
before shipping.

**Acceptance criteria** (each writable as a test name):

- `migration file exists at supabase/migrations/20260510000001_security_invoker_active_views.sql`
- `migration SQL contains WITH (security_invoker=true) for teams_active`
- `migration SQL contains WITH (security_invoker=true) for contacts_active`
- `migration SQL contains WITH (security_invoker=true) for sponsors_active`
- `migration SQL contains WITH (security_invoker=true) for photos_active`
- `migration SQL contains WITH (security_invoker=true) for sponsorship_items_active`
- `grep -c "security_invoker=true" migration file returns 5`
- `migration uses CREATE OR REPLACE VIEW … WITH (security_invoker=true) not a raw ALTER`
- `Supabase advisor security check returns no missing security_invoker warnings after migration`
- `Watchdog APPROVED before merge (sentinel-required)`

**Files to create/modify:**

- CREATE: `supabase/migrations/20260510000001_security_invoker_active_views.sql`

**Effort estimate:** S (1 file)

**Implementation notes for builder:**
Each view must be fully redefined — use `CREATE OR REPLACE VIEW public.<name> WITH
(security_invoker=true) AS SELECT * FROM public.<base_table> WHERE deleted_at IS NULL;`
(or the explicit column list for `contacts_active`, which does not use SELECT *). Pull
the current column list for `contacts_active` from the most recent migration that
recreated it (`20260429000001_contacts_multi_type.sql`) rather than assuming SELECT *.
The `teams_active` definition must include the three payment columns added in
`20260507000001_recreate_teams_active_view_with_payment_columns.sql`.

---

### Issue #405 — Standardize `requireAdmin()` gating on `exportTeamsCSV`

**Decision (locked):** Tighten `exportTeamsCSV` to admin-only. All sibling exports
(`exportSponsorsCSV`, `exportPhotosCSV`, `exportSponsorshipsCSV`) call `requireAdmin()`
at the top of the function body. The absence in `exportTeamsCSV` is an omission, not an
intentional viewer-allowed pattern — no product requirement documents viewer-only CSV
access for teams.

Note: `exportPhotosCSV` also omits `requireAdmin()` (it delegates to `getPhotos` which
does not gate). Both must be fixed in the same PR to avoid a half-repaired state. Grep
output confirms `exportPhotosCSV` at `src/app/admin/photos/actions.ts:47` has no
`requireAdmin()` call before its data fetch.

**Aria upfront-gate:** No user-facing strings. This sprint adds no labels, CTAs, errors,
empty/loading states, microcopy, or visible date/number/units formats. If the
implementation surfaces any new string, the builder must pause and request an Aria spawn
before shipping.

**Acceptance criteria** (each writable as a test name):

- `exportTeamsCSV first awaited call is requireAdmin() before getTeams()`
- `exportPhotosCSV first awaited call is requireAdmin() before getPhotos()`
- `grep -n "requireAdmin" src/app/admin/teams/actions.ts includes a line number ≤ 291`
- `grep -n "requireAdmin" src/app/admin/photos/actions.ts includes a line number ≤ 48`
- `calling exportTeamsCSV without an admin session throws AuthorizationError (or equivalent requireAdmin rejection)`
- `calling exportPhotosCSV without an admin session throws AuthorizationError (or equivalent requireAdmin rejection)`
- `Watchdog APPROVED before merge (sentinel-required)`

**Files to create/modify:**

- MODIFY: `src/app/admin/teams/actions.ts` (add `await requireAdmin()` as first line of `exportTeamsCSV` body, before `const teams = await getTeams(year)`)
- MODIFY: `src/app/admin/photos/actions.ts` (add `await requireAdmin()` as first line of `exportPhotosCSV` body, before `const photos = await getPhotos(undefined, year)`)

**Effort estimate:** S (2 files, ~1 line change each)

---

### Issue #356 — Fix hydration mismatch on relative timestamps in contacts list

**Fix approach:** Replace the server-side `relativeTime()` call at
`contact-list.tsx:1000` with a client-side-only render. The `relativeTime()` helper at
line 120-136 uses `Date.now()` which produces different values on server vs. client,
causing React hydration mismatch. The fix: render a static placeholder (the raw ISO date
formatted as a short locale date via `new Date(contact.created_at).toLocaleDateString()`)
on first render, then switch to the relative format via `useEffect` + `useState`. This
keeps the "Added" column populated on first paint (no blank flash) while matching what
React hydrates.

Concretely: extract a `RelativeTime` client component that accepts `dateStr: string`,
initializes state to `toLocaleDateString()`, and sets relative format in a `useEffect`.
Replace the bare `{relativeTime(contact.created_at)}` call at line 1000 with
`<RelativeTime dateStr={contact.created_at} />`. The helper function at lines 120-136
stays — it is called only inside the client component's effect.

**Aria upfront-gate:** No new user-facing strings. The display format changes from
always-relative (server-rendered, mismatched) to locale-date-on-mount then relative (no
string content change — same relative format, same locale). No new copy introduced.

**Acceptance criteria** (each writable as a test name):

- `contact-list.tsx renders without console hydration-mismatch warning in development mode`
- `Added column renders a non-empty string on first server render (not blank)`
- `Added column value after client hydration matches Intl.RelativeTimeFormat output for a contact created_at timestamp`
- `RelativeTime component initializes with toLocaleDateString() before useEffect fires`
- `RelativeTime component file is marked "use client" or is consumed within a client boundary`
- `relativeTime() helper function at contact-list.tsx:120 is not called in server render path`

**Files to create/modify:**

- MODIFY: `src/app/admin/contacts/contact-list.tsx` (replace inline `relativeTime()` call at line 1000 with `<RelativeTime dateStr={contact.created_at} />` component; add `RelativeTime` client component function in same file using `useState` + `useEffect`)

**Effort estimate:** S (1 file, ~15 line addition)

---

### Issue #377 — Tighten `bg-brand` checkbox assertion (substring match via hover class)

**Context:** `checkbox.test.tsx:78-82` asserts `el!.className.toContain("bg-brand")`.
The actual class string on the checked element is
`"… bg-brand bg-primary border-brand hover:bg-brand-dark …"` (confirmed from
`checkbox.tsx:71`). `toContain("bg-brand")` passes because `hover:bg-brand-dark`
contains the substring `bg-brand` — meaning the test would pass even if `bg-brand` were
removed from the active state classes, as long as the hover class remains. The fix is to
assert on `bg-primary` (which is the semantic token, not a hover variant) using an exact
class-list membership check via a regex word-boundary match.

**Aria upfront-gate:** No user-facing strings. This change modifies only a test file.

**Acceptance criteria** (each writable as a test name):

- `checked checkbox assertion uses /\bbg-primary\b/ regex or classList.contains("bg-primary") not toContain("bg-brand")`
- `indeterminate checkbox assertion uses /\bbg-primary\b/ regex or classList.contains("bg-primary") not toContain("bg-brand")`
- `test still fails if bg-primary is removed from checkbox.tsx active state class string`
- `test still passes with current checkbox.tsx implementation`
- `grep -n "toContain(\"bg-brand\")" src/components/ui/checkbox.test.tsx returns 0 results`

**Files to create/modify:**

- MODIFY: `src/components/ui/checkbox.test.tsx` (replace `toContain("bg-brand")` at lines 81 and 111 with regex or classList assertion targeting `bg-primary`)

**Effort estimate:** S (1 file, 2-line change)

---

### Issue #381 — Remove stale "sponsor-drawer" testids from 2 test files

**Context:** The component was renamed from `SponsorDrawer` to `SponsorModal`. Five
locations still reference the old testid `"sponsor-drawer"`:

- `src/app/admin/sponsors/__tests__/sponsor-list.test.tsx:48` — mock renders `<div data-testid="sponsor-drawer" …>`
- `src/app/admin/sponsors/__tests__/sponsor-list.test.tsx:323` — `screen.queryByTestId("sponsor-drawer")`
- `src/__tests__/admin-destructive-copy-234.test.tsx:8` — (import or describe string referencing old name — confirmed describe block at line 270 still uses "SponsorDrawer" in string)
- `src/__tests__/admin-destructive-copy-234.test.tsx:267` — (renderDrawer helper name — confirmed at line 271, function is named `renderDrawer` and renders `SponsorModal`)
- `src/__tests__/admin-destructive-copy-234.test.tsx` — `renderDrawer` helper at line 271

Cosmetic only — no functional change, no source component change. Update testid strings
and helper names to match the current `SponsorModal` naming. The `renderDrawer` helper
in admin-destructive-copy-234 can stay as `renderModal` or `renderSponsorModal`.

**Aria upfront-gate:** No user-facing strings. This change modifies only test files.

**Acceptance criteria** (each writable as a test name):

- `grep -rn "sponsor-drawer" src/ returns 0 results after the change`
- `grep -rn "renderDrawer" src/__tests__/admin-destructive-copy-234.test.tsx returns 0 results after the change`
- `vitest run src/app/admin/sponsors/__tests__/sponsor-list.test.tsx exits 0 (no new failures)`
- `vitest run src/__tests__/admin-destructive-copy-234.test.tsx exits 0 (no new failures)`

**Files to create/modify:**

- MODIFY: `src/app/admin/sponsors/__tests__/sponsor-list.test.tsx` (update `data-testid="sponsor-drawer"` at line 48 and `queryByTestId("sponsor-drawer")` at line 323)
- MODIFY: `src/__tests__/admin-destructive-copy-234.test.tsx` (rename `renderDrawer` to `renderSponsorModal` at all call sites; update any describe/it strings that reference "SponsorDrawer" as a component name)

**Effort estimate:** S (2 files, ~6 line changes)

---

## Dependency + Parallelism Map

| Issue | Files touched |
|-------|--------------|
| #389  | `supabase/migrations/20260510000001_security_invoker_active_views.sql` (CREATE) |
| #405  | `src/app/admin/teams/actions.ts`, `src/app/admin/photos/actions.ts` |
| #356  | `src/app/admin/contacts/contact-list.tsx` |
| #377  | `src/components/ui/checkbox.test.tsx` |
| #381  | `src/app/admin/sponsors/__tests__/sponsor-list.test.tsx`, `src/__tests__/admin-destructive-copy-234.test.tsx` |

**Overlap analysis:** Zero file overlap across all five issues. All five are parallel-safe.

---

## Execution Order

All five can run in parallel. Recommended grouping by risk:

**Wave 1 (parallel, low risk — test-only changes):**
- #377 — checkbox assertion tighten (1 file, 2 lines)
- #381 — stale testid cleanup (2 files, ~6 lines)

**Wave 2 (parallel, minor source changes):**
- #356 — hydration fix in contacts list (1 file, ~15 lines)
- #405 — add requireAdmin to 2 export functions (2 files, ~2 lines)

**Wave 3 (migration — must land on its own PR, sentinel review required):**
- #389 — security_invoker migration (1 new SQL file)

Rationale for sequencing #389 last: migration PRs need Watchdog sentinel review and must
be applied clean to prod. Letting the code-only issues merge first reduces rebase noise
if the migration PR needs revision.

If one builder is doing all five sequentially: #377 → #381 → #356 → #405 → #389.

---

## Total Builder Time Estimate

| Issue | Estimate | Builder hours |
|-------|----------|--------------|
| #389  | S        | 1.0h         |
| #405  | S        | 0.5h         |
| #356  | S        | 1.5h         |
| #377  | S        | 0.5h         |
| #381  | S        | 0.5h         |
| **Total** | —    | **4.0h**     |

**Confidence band:** 3.5h–5.5h. The hydration fix (#356) is the most likely to expand
if the builder discovers the `RelativeTime` component needs to be extracted to a separate
file for Next.js App Router "use client" boundary compliance (add ~0.5h). The migration
(#389) could expand if `contacts_active` column list has drifted from what migrations
show (add ~0.5h for a pre-flight grep pass).

---

## Target Date Recommendation

**Recommended milestone target: 2026-05-16 (one week from plan date)**

Reasoning:
- Total builder work is ~4h — one builder can finish in a single focused session.
- Two issues (#389, #405) require Watchdog sentinel review — allow 24h turnaround buffer.
- All five issues are independent; no rebase risk between them.
- No design or copy dependencies (all Aria gates are no-strings attestations).
- Event date is September 2026 — no external deadline pressure, but closing security
  debt before summer feature velocity picks up is the right call.
