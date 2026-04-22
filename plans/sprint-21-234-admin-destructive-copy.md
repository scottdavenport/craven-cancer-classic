# Sprint 21 · Issue #234 — Admin Destructive-Action Copy Consistency

**Status:** RED (tests written, source unchanged — Bolt ships GREEN)

## Rationale

Admin copy had two problems:
1. Factual error: "cannot be undone" on actions that actually go to Trash
2. Verb inconsistency: "Delete" vs "Clear" for an operation that is reversible via import

Aria's voice platform: admin copy is a tool, not a ceremony. No hedge-stacking.

---

## Area 1 — Sponsor delete (sponsor-drawer.tsx)

**Problem:** Says "cannot be undone" but sponsor actually goes to Trash.

| Location | Current | New |
|---|---|---|
| Line 179 — `ConfirmDialog description` | `"This sponsor will be removed. This action cannot be undone."` | `"This sponsor will be moved to Trash. You can restore from Admin → Trash."` |
| Line 127 — `toast.success` | `"Sponsor deleted"` | `"Sponsor moved to Trash"` |

---

## Area 2 — Score-manager verb consistency (score-manager.tsx)

**Problem:** Title says "Delete ALL" for an action called "Clear All" in the button. Description misleadingly says "permanently removed" for scores (no Trash; this one truly is permanent, but the verb should match).

| Location | Current | New |
|---|---|---|
| Line 227 — `ConfirmDialog title` | `"Delete ALL scores for this year?"` | `` `Clear all scores for ${new Date().getFullYear()}?` `` |
| Line 228 — `ConfirmDialog description` | `"This cannot be undone. All scores for the current year will be permanently removed."` | `` `This permanently removes every score for ${new Date().getFullYear()}. It cannot be undone.` `` |

**Implementation note:** `new Date().getFullYear()` is already used elsewhere in this file. Use the same expression in the JSX — no new variable needed unless one already exists.

---

## Area 3 — Sponsorship-manager cascade warning (sponsorship-manager.tsx)

**Problem:** `buildCascadeDescription` shows `(deleted package)` (should be `(no package)`) and appends "Continue?" (dialog already has Cancel/Delete buttons).

| Location | Current | New |
|---|---|---|
| Lines 115–117 — `buildCascadeDescription` both branches | `'(deleted package)'` | `'(no package)'` |
| Lines 115–117 — trailing text | `'. Continue?'` (appended to both branches) | Remove — dialog buttons replace it |

**Exact new strings:**
- Branch with overflow: `` `${count} sponsors are linked to this package: ${nameList}, … and ${remaining} more. They'll show '(no package)' until you reassign them.` ``
- Branch without overflow: `` `${count} sponsors are linked to this package: ${nameList}. They'll show '(no package)' until you reassign them.` ``

---

## Area 4 — Sponsorship-manager single delete (sponsorship-manager.tsx)

**Problem:** Generic "cannot be undone" — doesn't clarify why (no linked sponsors) or what happens.

| Location | Current | New |
|---|---|---|
| Line 330 — inline `<p>` in Dialog | `"This action cannot be undone. The package will be permanently removed."` | `"This package has no linked sponsors. It will be permanently deleted — this cannot be undone."` |

---

## Area 5 — Photo moderation permanent delete (photo-moderation.tsx)

**Problem:** Title says "Permanently delete" AND description says "permanently removed" — "permanently" appears twice.

| Location | Current | New |
|---|---|---|
| Line 203 — `ConfirmDialog title` | `"Permanently delete this photo?"` | `"Delete this photo?"` |
| Line 204 — `ConfirmDialog description` | `"This action cannot be undone. The photo will be removed permanently."` | `"This permanently removes the photo — it cannot be restored from Trash."` |

---

## Area 6 — Reference pattern guard (contact-drawer.tsx:111)

**DO NOT CHANGE.** The reference text is the gold standard for Trash flows:

```
"They'll be moved to Trash and hidden from default views. You can restore from Admin → Trash later."
```

A guard test pins this string so it cannot drift undetected.

---

## Test file

`src/__tests__/admin-destructive-copy-234.test.tsx`

All tests are RED against current main. They pass after Bolt's GREEN PR.
