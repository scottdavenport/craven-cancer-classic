# Sprint 21 · Issue #232 — Error Copy Rewrites

**Status:** RED (Spec) → GREEN (Bolt)
**Locked by:** Aria + Scott (session 2026-04-22/23)

---

## Email Constant

Ship as a shared constant so the eventual swap to a dedicated inbox is a one-file change:

```ts
// src/lib/contact.ts (Bolt chooses location)
export const CONTACT_EMAIL = "scott@thinkcode.ai";
```

Wire as `mailto:` links wherever the email appears inline in rendered copy.

---

## Locked Copy — Ship Verbatim

### Area 1 — Registration form, fetch error fallback
**File:** `src/app/(public)/register/registration-form.tsx:107` (approximately — grep to confirm)

Replace the `"Something went wrong"` default in `data.error || "Something went wrong"` with:

```
"Registration didn't go through. Email scott@thinkcode.ai if this keeps happening."
```

The `{error}` falls back to this string ONLY when the server didn't provide a specific error message. Wire `scott@thinkcode.ai` as a `mailto:` link using `CONTACT_EMAIL`.

---

### Area 2 — Registration form, catch block
**File:** `src/app/(public)/register/registration-form.tsx:116` (approximately)

```
OLD: "Failed to start registration. Please try again."
NEW: "Couldn't reach the registration server. Check your connection and try again."
```

---

### Area 3a — Seeking-team API error
**File:** `src/app/(public)/register/seeking-team-form.tsx:39` (approximately)

```
OLD: "Something went wrong. Please try again."
NEW: "Couldn't save your request. Try again — or email scott@thinkcode.ai."
```

Wire `scott@thinkcode.ai` as a `mailto:` link using `CONTACT_EMAIL`.

---

### Area 3b — Seeking-team network error
**File:** `src/app/(public)/register/seeking-team-form.tsx:46` (approximately)

```
OLD: "Something went wrong. Please try again."
NEW: "Couldn't reach the server. Check your connection and try again."
```

---

### Area 4 — Import error banner
**File:** `src/app/admin/contacts/import/import-client.tsx` (~line 501)

Current markup:
```html
<p class="text-sm font-medium text-destructive">Something went wrong</p>
<p class="text-sm text-destructive/80">{error}</p>
```

**Locked change:** Remove the static `"Something went wrong"` `<p>` entirely. Promote `{error}` to the primary slot (apply the `font-medium` class). The banner retains its icon + destructive color + dismiss affordance.

Result:
```html
<p class="text-sm font-medium text-destructive">{error}</p>
```

---

### Area 5a — Public error boundary
**File:** `src/app/(public)/error.tsx:19-27` (approximately)

```
overline (p.uppercase):  "Error"                     (was "Something Went Wrong")
heading (h2):            "Something stopped working." (was "We hit an unexpected error")
body (p):                "Try again — if it keeps happening, email scott@thinkcode.ai."
```

Wire `scott@thinkcode.ai` as a `mailto:` link using `CONTACT_EMAIL`.

---

### Area 5b — Admin error boundary
**File:** `src/app/admin/error.tsx:18-22` (approximately)

```
heading (h2): "Something stopped working."
body (p):     "Try again — if it keeps happening, email scott@thinkcode.ai."
```

Wire `scott@thinkcode.ai` as a `mailto:` link using `CONTACT_EMAIL`.

**Keep** the existing `error.digest` render if present. Do NOT surface `error.message` — admins are non-technical, Scott can fetch logs if needed.

---

## Hygiene Grep (post-GREEN)

After Bolt's GREEN:

```bash
# Must be empty:
grep -rn "Something went wrong\|We hit an unexpected error\|Please try again\|contact the organizers" src/ --exclude-dir="__tests__"

# Should appear only in shared constant + mailto hrefs, not raw hardcoded in 5+ files:
grep -rn "scott@thinkcode.ai" src/ --exclude-dir="__tests__"
```

---

## Out of Scope

- Translating raw Postgres constraint names to human language (Aria's non-blocker flag — follow-up issue)
- Any other issue
