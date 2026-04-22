# Sprint 21 · #236 — Admin Design Slips + Trash Table Refactor

**Phase:** RED (tests written, failing against current main)  
**Builder:** Bolt  
**Issue:** #236

---

## Scope

Seven design-only regressions and refactors. No copy changes. No new data model changes.

---

## Issue 1 — Token bypass: `OpenSlotsBadge`

**File:** `src/app/admin/teams/team-list.tsx:48-55`  
**Problem:** Badge uses raw `bg-amber-100 text-amber-700` instead of token classes.  
**Fix:** Replace with `bg-warning-muted text-warning` (same tokens used in photo-moderation).  
**Test:** `src/__tests__/team-list-badge.test.tsx`

---

## Issue 2 — Event-settings form a11y

**File:** `src/app/admin/event/event-settings-form.tsx`  
**Problems:**
- No form-level error summary
- No `aria-live` region
- `grid grid-cols-2 gap-4` on lines ~139 and ~227 — not mobile-responsive

**Fixes:**
- Add `<div role="alert" aria-live="polite">` above submit button; render aggregated error messages when `hasAnyError()` is true
- Each input gets `aria-describedby={`${fieldId}-error`}` pointing to per-field error `<p>`
- Change both grids to `grid grid-cols-1 sm:grid-cols-2 gap-4`

**Test:** `src/__tests__/event-settings-form-a11y.test.tsx`

---

## Issue 3 — Trash table extraction

**File:** `src/app/admin/trash/trash-tabs.tsx`  
**Problem:** 5 near-identical tab-panel functions each duplicate the same 4-column Restore table.  
**Fix:** Extract a generic `<TrashTable<T>>` component accepting `rows`, `columns`, `onRestore`. All 5 tabs use it.  
**Test:** `src/__tests__/trash-table-extraction.test.tsx`

---

## Issue 4 — Trash table Deleted-By resolution

**File:** `src/app/admin/trash/trash-tabs.tsx`  
**Problem:** `deleted_by` UUID displayed truncated with `font-mono text-xs` — not human-readable.

**Decision: Option A** — resolve `deleted_by` to `profiles.full_name` via join or secondary lookup in the server action query. Name is displayed directly; falls back to truncated UUID if name unavailable.

Rationale: More useful for admins than a tooltip (admins shouldn't need to know UUIDs at all). Aligns with how contacts/members display names throughout the admin.

**Test:** `src/__tests__/trash-table-extraction.test.tsx` (included in issue 3 test file — "Deleted By" column shows name, not raw UUID)

---

## Issue 5 — `CardTitle size="sm"` variant

**File:** `src/components/ui/card.tsx` and `src/app/admin/settings/invite-form.tsx:67`  
**Problem:** `invite-form.tsx` overrides `CardTitle` with `className="font-sans text-base font-semibold"` — raw CSS override instead of a design token.

**Decision: Option B** — ship `<CardTitle size?: "default" | "sm">` prop on the existing `CardTitle` component. `size="sm"` applies `font-sans text-base font-semibold` via the component's token. Compatible with existing `as?` polymorphism added in #231.

Rationale: Cleaner API, reusable across all admin cards that need a compact section header. `invite-form.tsx` switches to `<CardTitle size="sm">` with no className override.

**Test:** `src/__tests__/card-title-size.test.tsx`

---

## Issue 6 — Unsaved-changes warning

**File:** `src/app/admin/event/event-settings-form.tsx`  
**Problem:** No `beforeunload` guard — admin navigating away loses changes silently.  
**Fix:** Minimal `useUnsavedChanges(isDirty: boolean)` hook that attaches a `beforeunload` listener when `isDirty` is true. Hook lives in `src/hooks/use-unsaved-changes.ts`. Form tracks dirty state via `onChange`.

**Test:** `src/__tests__/use-unsaved-changes.test.ts` — unit test on the hook (not the form). Tests that the `beforeunload` event fires `preventDefault()` / `returnValue` when dirty, and does NOT fire when clean.

---

## Issue 7 — Dead file deletion: `src/components/ui/file-upload.tsx`

**File:** `src/components/ui/file-upload.tsx`  
**Decision:** DELETE. File is unused — gallery uses raw `<Input type="file">`. Wiring it in is out of scope for this sprint. Future unification is a separate issue.

**Test:** `src/__tests__/file-upload-deleted.test.ts` — hygiene test asserting `fs.existsSync` returns false for this path.

---

## Acceptance Criteria (Bolt GREEN)

- [ ] All 7 RED test files pass
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] No existing passing tests broken
- [ ] `CardTitle size="sm"` documented in component JSDoc

---

## Out of Scope

- Copy changes
- Any source changes outside issues 1–7
- Any other issue
