# F-S21 — Sponsor edit drawer silently unlinks contacts (P0)

**Source:** UAT Section 4 Sponsors finding F-S21 (PR #364, `plans/admin-uat-2026-05.md`).
**Severity:** P0 — silent data corruption. Any admin who opens an edit drawer for a sponsor with linked contacts and clicks Update on ANY field change will silently DELETE all linked-contact rows in `sponsor_contacts`. Affects 2 sponsors today (Sports Connection → Allan Haseley, Scottie Davenport - Shopmonkey → 1 contact); every future linked sponsor is at risk.
**Anti-pattern:** Same as Sprint 35 #338 — `feedback_no_usestate_from_prop_for_rsc_data` (useState(prop) freezes on first render; async-loaded prop changes don't propagate).

---

## What users see today

Admin opens the edit drawer for Sports Connection. The drawer's Contacts section shows only the search input — no chip, no list entry, nothing visible. The DB has Allan Haseley linked. Admin sees "no contacts linked" when 1 is linked.

Admin types a website (or any other field change), clicks Update. The form submits with `contact_ids=""`. The server's `updateSponsor` reconciliation computes `toRemove = existingIds - submittedIds = [Allan Haseley]` and silently DELETEs the link. Toast says "Sponsor updated" — admin has no idea Allan was unlinked.

## What users see after fix

Admin opens the edit drawer for Sports Connection. The drawer's Contacts section now correctly displays Allan Haseley as a chip in the typeahead. Admin can edit any field, click Update, and Allan stays linked. Adding/removing contacts via the typeahead works as expected.

---

## Root cause

`sponsor-form.tsx:64`:
```tsx
const seedContacts: ContactPickResult[] = initialContacts !== undefined
  ? initialContacts
  : (defaultValues?.contact_ids ?? []).map(...).filter(...);
const [selectedContacts, setSelectedContacts] = useState<ContactPickResult[]>(seedContacts);
```

`useState(seedContacts)` only runs once, on first mount. By the time the parent (`sponsor-drawer.tsx`) async-loads contacts via `getSponsorContacts(sponsor.id).then(setInitialContacts)` (line 50), the form has already mounted with `selectedContacts = []`. Subsequent updates to the `initialContacts` prop have no effect on the form's local state.

Combined with `actions.ts:212-244` reconciliation (which runs whenever `contact_ids !== null` — and empty string is not null), the form silently deletes all existing `sponsor_contacts` rows on every Update.

---

## Fix

**Approach:** gate the form render on `contactsLoaded` in the drawer. The drawer already manages `contactsLoaded` state (line 41, 50, 62, 65) — it's just not used to gate the form render.

Result: the form doesn't mount until contacts are loaded. `useState(seedContacts)` then seeds with the real data. Freeze bug can't trigger because the form is never instantiated with empty contacts.

### Files to change

**`src/app/admin/sponsors/sponsor-drawer.tsx`** — wrap the `<SponsorForm>` render in a `contactsLoaded` gate:

```tsx
{(mode === "create" || contactsLoaded) ? (
  <SponsorForm
    initialContacts={initialContacts}
    /* ... existing props ... */
  />
) : (
  <div className="flex items-center justify-center p-8 text-muted-foreground">
    Loading contacts…
  </div>
)}
```

The create-mode short-circuit ensures the create flow (which doesn't need to fetch existing contacts) renders the form immediately. Only edit-mode waits for the fetch.

### Files NOT to change

- `sponsor-form.tsx` — leave `useState(seedContacts)` alone. The freeze pattern is fine when seedContacts is correct at mount; the bug was the async data arriving AFTER mount.
- `actions.ts` — `updateSponsor` reconciliation logic is correct; the bug was upstream.
- Any other call sites of `<SponsorForm>` — none today; sponsor-drawer is the sole consumer.

### Loading-state copy

The "Loading contacts…" placeholder is filler microcopy. Aria gate not required since:
1. The string is a transient loading state, not a feature string.
2. The duration is sub-second on real usage (Supabase query against a small table).
3. The pattern matches existing loading copy elsewhere in the admin (verify during build).

If Watchdog flags it, escalate to Aria for a one-line copy review.

---

## Tests

### Regression test (new — Spec 🔬 territory if Bolt prefers a Spec hand-off)

`src/app/admin/sponsors/__tests__/sponsor-drawer.test.tsx` (or `sponsor-form.test.tsx` if more natural):

**Test 1 — Edit drawer renders linked contacts after load:**
1. Mock `getSponsorContacts` to return `[{ id: "c1", full_name: "Allan Haseley", email: null, company: null }]`.
2. Render `<SponsorDrawer open mode="edit" sponsor={mockSponsor} ... />`.
3. Wait for the loading state to clear.
4. Assert the contact chip "Allan Haseley" is visible in the form's contacts typeahead.

**Test 2 — Edit-mode shows loading state before contacts arrive:**
1. Mock `getSponsorContacts` to return a promise that resolves after a microtask.
2. Render the drawer in edit mode.
3. Assert "Loading contacts…" is visible BEFORE the promise resolves.
4. Resolve the promise.
5. Assert "Loading contacts…" is gone and the form is rendered.

**Test 3 — Create-mode renders form immediately (no loading state):**
1. Render `<SponsorDrawer open mode="create" sponsor={null} ... />`.
2. Assert the form is rendered immediately, no loading state visible.

**Test 4 — Update on edit-mode preserves existing contact links:** (most critical, asserts the actual P0 fix)
1. Mock `getSponsorContacts` to return `[Allan]`.
2. Mock `updateSponsor` to capture the `formData` it receives.
3. Render edit drawer; wait for load.
4. Trigger any field change (e.g., change name).
5. Submit the form.
6. Assert `updateSponsor` was called with `contact_ids="c1"` (Allan's id) — NOT `""`.

### Existing tests to keep passing

- `__tests__/sponsor-form.test.tsx` — full suite must remain green
- `__tests__/sponsor-drawer.test.tsx` — full suite must remain green
- `__tests__/sponsor-list.test.tsx` — full suite must remain green
- Vitest baseline: 1618 passed / 2 pre-existing failed / 3 skipped (per yesterday's session close)

---

## Out of scope

The other Sponsors UAT findings (F-S1 responsive table, F-S5 sidebar overlap, F-S8 empty-state copy, F-S12 tier_id required guard, F-S20 name trim, F-S23 logo content-type, plus all P3s) are NOT addressed in this PR. They'll be triaged into a separate sprint. This PR is surgical to F-S21 only.

## Acceptance criteria

- [ ] `sponsor-drawer.tsx` gates `<SponsorForm>` render on `contactsLoaded` (or equivalent), with create-mode short-circuit
- [ ] Loading-state placeholder visible while contacts are loading
- [ ] 4 new regression tests pass (Tests 1–4 above)
- [ ] All pre-existing sponsor tests still pass
- [ ] Manual verification on dev server: open Sports Connection edit drawer, see Allan Haseley chip, change name, click Update, re-open, see Allan still linked
- [ ] No client-side console errors / no React act() warnings

## Builder

Bolt 🐛 (UI fix, no backend changes).

## Reviewer

Watchdog 🐕. Standard two-stage. Diff shape: `src/**` only (touches `sponsor-drawer.tsx` + `__tests__/*.test.tsx`). No second-pass specialist required per `/review` routing — Spec 🔬 NOT triggered because the test changes are paired with implementation (the rule applies to test-only PRs); RLS markers absent. Watchdog only.

If Watchdog approves, ask Scott for merge timing per the routing rule (this is `src/**`, not `*.md`-only).
