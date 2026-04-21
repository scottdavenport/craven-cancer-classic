# Sprint 20 — Sponsor Data Integrity

**Sprint goal:** Fix three prod bugs surfaced in post-Sprint-19 diagnostics — logo uploads silently dropping files, edit drawer wiping contact links, soft-deleted sponsors visible in admin.

**Baseline:** `main` at `a895b5b`. 831 tests passing. tsc clean. No active sprint.

**Issue:** #215

---

## Research findings

**From prod diagnostic queries (2026-04-21):**

- 5 `sponsor_contacts` rows exist correctly linking Mike Evans / Lynne Davenport / Scottie Davenport to their contacts. Contact saves ARE persisting.
- 4 sponsor records have `logo_url: null` despite Scott performing logo uploads via the drawer — the file never reaches storage.
- 3 sponsor records with `deleted_at` set still show up in admin list (Tony Tresie, Richard & Cathy, one rename placeholder). RLS is not filtering for admin.

**Root causes:**

1. **Logo flow disconnect** — `sponsor-form.tsx` handleSubmit puts the File into `formData.set("logo", logoFile)`. Server actions read `formData.get("logo_url")` as a string. `uploadSponsorLogo` server action exists but no caller invokes it. Result: every upload is silently discarded; `logo_url` is persisted as null.

2. **Missing initial-contacts fetch** — `sponsor-drawer.tsx` never calls `getSponsorContacts(sponsor.id)` on open. `Sponsor` type has no `contact_ids` field, so `sponsor-form.tsx`'s derivation `(defaultValues?.contact_ids ?? [])` yields `[]` in edit mode. Form's `selectedContacts` starts empty. Reconciliation in `updateSponsor` diffs submitted=[] against existingIds → all become toRemove.

3. **Missing deleted_at filter** — `getSponsors` (actions.ts:36-39) selects all rows where `year = X`, relying on an RLS policy that turns out to not filter soft-deleted rows for the admin role.

---

## Architecture

### Logo flow (fix 1)
Client-side orchestration in `sponsor-drawer.tsx` `handleSubmit`:

```
1. Inspect formData for a File at key "logo"
2. If present and size > 0:
   a. Build uploadFormData with file + oldLogoUrl (if edit)
   b. await uploadSponsorLogo(uploadFormData)
   c. On error → toast.error, return (don't proceed to create/update)
   d. On success → formData.set("logo_url", result.url)
3. If no file AND mode === "edit" AND sponsor.logo_url exists:
   → formData.set("logo_url", sponsor.logo_url)  // preserve existing
4. formData.delete("logo")  // no longer needed server-side
5. Continue to createSponsor / updateSponsor
```

Why the drawer not the form: the form already produces formData; the drawer already coordinates action calls. Adding the upload step in the drawer's orchestration layer keeps the form purely visual.

### Initial contacts fetch (fix 2)
In `sponsor-drawer.tsx`:

```
- useState for initialContacts + contactsLoaded
- useEffect on (open, mode, sponsor?.id):
  - if open && mode === "edit" && sponsor → setContactsLoaded(false), fetch getSponsorContacts → setInitialContacts(mapped to ContactPickResult shape), setContactsLoaded(true)
  - if !open → reset both
- In JSX: render SponsorForm only when mode === "create" || contactsLoaded. Otherwise render a loading placeholder.
```

`sponsor-form.tsx` receives a new `initialContacts: ContactPickResult[]` prop (replaces the broken `defaultValues?.contact_ids` derivation). Default to `[]` when not provided.

### Soft-delete filter (fix 3)
One-line addition to `getSponsors`:
```ts
.eq("year", year)
.is("deleted_at", null);
```

---

## Tests (RED phase)

All tests live in `src/app/admin/sponsors/__tests__/`:

**Logo flow:**
1. Mock `uploadSponsorLogo` + `updateSponsor`. Render sponsor-drawer in edit mode with a sponsor. Pick a file via the FileUploadField mock. Submit. Assert `uploadSponsorLogo` called with the file; assert `updateSponsor` called with `logo_url` matching the upload return value.
2. Edit mode, no new file picked, existing logo_url present. Submit. Assert `uploadSponsorLogo` NOT called; assert `updateSponsor` called with logo_url === sponsor.logo_url (preserved).
3. `uploadSponsorLogo` returns `{ error }`. Assert `updateSponsor` NOT called; toast.error fired.

**Initial contacts fetch:**
4. Mock `getSponsorContacts` to return 2 linked contacts. Render drawer open in edit mode. Assert fetch called with `sponsor.id`. Assert the picker renders both contact names (via ContactTypeaheadMulti mock).
5. Save without touching the picker. Assert `updateSponsor` called with `contact_ids` containing both original IDs (not empty string, not missing reconciliation).
6. Drawer closed → reopened with a different sponsor → assert fetch re-fires with the new id.

**Soft-delete filter:**
7. Unit test `getSponsors` action (or integration via mock supabase client). Assert the query builder chain includes `.is("deleted_at", null)`. Lightweight.

---

## Execution order
Single PR. Serial within: Spec RED → Bolt GREEN → Watchdog. No parallelism — three fixes tightly coupled in one slice.

## Gotchas
- `feedback_base_ui_select_items` — no new Selects in this PR, but any existing Select sites must retain `items` prop.
- `feedback_admin_action_require_admin` — `uploadSponsorLogo`, `createSponsor`, `updateSponsor`, `getSponsorContacts`, `deleteSponsor` all already have `requireAdmin()` — don't remove.
- `feedback_no_user_type_long_strings` — any new tests use `fireEvent.change` not `userEvent.type` for long strings.
- `feedback_prefer_data_testid_over_ui_hacks` — use data-testid for matcher disambiguation in tests.
- `feedback_vercel_dep_risk` — no new deps expected.
- **Do NOT modify sponsor-list.tsx** — out of scope; logo-list-thumbnail-lightbox already shipped in PR #214.
- **Do NOT** modify `uploadSponsorLogo` server action's signature — existing callers (none yet in prod code) must still work.
