# Sprint 21 · Issue #237 — Leaderboard Prospect Capture

## Goal
Add a `<ProspectCaptureForm>` panel below the "Scores Coming Soon" empty state on the leaderboard page, so visitors between now and September 2026 can leave their name and email to be notified when scores post.

## Location
`src/app/(public)/leaderboard/page.tsx` — lines 48–57 (empty state block)

## Implementation (Bolt)

### 1. Add import
```tsx
import { ProspectCaptureForm } from "@/components/public/prospect-capture-form";
```

### 2. Add panel below the empty state copy
Inside the `scores.length === 0` branch, after the existing Trophy + "Scores Coming Soon" copy, add:

```tsx
{/* Prospect capture panel */}
<div className="mt-10 mx-auto max-w-xl rounded-xl border border-border/60 bg-neutral-50 px-8 py-10 text-left shadow-sm">
  <h2 className="font-display text-xl font-semibold text-foreground">
    Want a ping when the scores post?
  </h2>
  <p className="mt-2 text-sm text-muted-foreground">
    Leave your name and email. We'll send you one note when this year's results are live.
  </p>
  <div className="mt-6">
    <ProspectCaptureForm
      contactType="player"
      notesPrefix="leaderboard prospect — notified when scores post"
      successMessage="We'll let you know the moment scores post."
    />
  </div>
</div>
```

### Why "player" contactType
The leaderboard audience is primarily past/prospective players. The existing ContactType enum is `"player" | "sponsor" | "donor" | "other"`. "player" is the closest match. No new enum values introduced.

## Copy (locked — Aria-reviewed before merge)
- **Panel heading:** "Want a ping when the scores post?"
- **Panel body:** "Leave your name and email. We'll send you one note when this year's results are live."
- **Success message:** "We'll let you know the moment scores post."

## Test Coverage
- File: `src/app/(public)/leaderboard/__tests__/leaderboard-prospect-capture.test.tsx`
- RED (Spec) → GREEN (Bolt) → Watchdog review → Forge merge

### Test cases
1. Empty state renders "Scores Coming Soon" heading (no regression)
2. Empty state renders ProspectCaptureForm panel heading "Want a ping when the scores post?"
3. Empty state renders panel body text
4. Empty state renders name input
5. Empty state renders email input
6. Empty state renders "Get Notified" submit button
7. Scores state does NOT render the prospect capture heading (guard)
8. Scores state does NOT render the ProspectCaptureForm (guard)
9. Form submission: fill name + email, submit, assert success message

## Out of Scope
- Day-of-tournament live score updates
- Email templating for notification sends
- Changes to `ProspectCaptureForm` internals
- Any other issue

## Pipeline
Spec RED → Bolt GREEN → Watchdog → Forge merge (scottdavenport)
