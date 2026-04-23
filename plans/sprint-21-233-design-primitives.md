# Sprint 21 · Issue #233 — Design Primitives Extraction

## Summary
Extract 5 shared design primitives from duplicated inline markup across public pages and admin. Zero behavior change, zero copy change. RED phase: stub components + failing tests. GREEN phase: Bolt ships real implementations and migrates call sites.

## Status: RED (Spec)

---

## Primitive 1: `<SectionEyebrow>`

### Signature
```ts
type EyebrowTone = "light" | "primary" | "brand";
interface SectionEyebrowProps {
  tone?: EyebrowTone;           // default: "primary"
  className?: string;
  children: React.ReactNode;
}
```

### Standardized styling
`font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] mb-3`

Color class per tone:
- `light` → `text-brand-light`
- `primary` → `text-primary`
- `brand` → `text-brand`

### Call sites (grep: `text-\[0\.6875rem\]` or `text-xs.*tracking-\[0\.3em\]`)
| File | Notes |
|---|---|
| `src/app/(public)/page.tsx` | Lines 65, 141, 148, 184, 241 (5 eyebrows, mix of light/primary) |
| `src/app/(public)/about/page.tsx` | Line 16 — `text-xs tracking-[0.3em]` variant → normalize to `tracking-[0.25em]` |
| `src/app/(public)/donate/page.tsx` | Lines 23, 60, 131, 147 (4 eyebrows, all `brand-light`) |
| `src/app/(public)/register/page.tsx` | Line 62 — `text-xs tracking-[0.3em]` variant → normalize |
| `src/app/(public)/register/success/page.tsx` | Line 13 — `text-xs tracking-[0.3em]` variant → normalize |
| `src/app/(public)/sponsorships/page.tsx` | Lines 35, 53, 71 (3 eyebrows) |
| `src/app/(public)/sponsors/page.tsx` | Line 72 — `text-brand` tone |
| `src/app/(public)/leaderboard/page.tsx` | Lines 38, 131 (header + ScoreTable flightLabel) |
| `src/app/(public)/gallery/page.tsx` | Line 59 — `brand-light` tone |

**Visual normalization:** `tracking-[0.3em]` variants (about, register, success pages) unify to `tracking-[0.25em]`. Flag for Bolt to verify no visible regression on those pages.

### File path
`src/components/public/section-eyebrow.tsx`

---

## Primitive 2: `<InfoCallout>`

### Signature
```ts
interface InfoCalloutProps {
  children: React.ReactNode;
  className?: string;
}
```

### Standardized styling
`rounded-xl border border-border/60 bg-neutral-50 p-5 shadow-xs`

Reference: `donate/page.tsx:106` — `rounded-lg border border-border/60 bg-neutral-50 p-5 shadow-xs`. Use `rounded-xl` per brand spec (12px radius).

### Call sites
| File | Notes |
|---|---|
| `src/app/(public)/donate/page.tsx:106` | Canonical pattern — donate designation box |
| `src/app/(public)/register/page.tsx:85` | Registration-closed card (outer container) — **see gotcha below** |
| `src/app/(public)/register/page.tsx:100` | Notify-me card container |
| `src/app/(public)/leaderboard/page.tsx:59` | Prospect-capture wrapper box (added by #237) |

**Gotcha — register/page.tsx:** The registration-closed card at line 85 was reshaped by #230. The `bg-muted` + `text-center` layout may not cleanly accept InfoCallout. Bolt: adopt where it fits; if the post-#230 closed-card structure resists (e.g., nested heading+body that doesn't match InfoCallout's single-content-slot shape), skip it and document as "opted out."

### File path
`src/components/public/info-callout.tsx`

---

## Primitive 3: `<PublicEmptyState>`

### Signature (parallel to AdminEmptyState)
```ts
interface PublicEmptyStateProps {
  title: string;
  body?: string;
  action?: React.ReactNode;
}
```

### Styling
Public-context version — lighter, content-first. No icon by default (unlike admin which defaults to Inbox icon).
`py-16 text-center` container. Title: `font-display text-xl font-semibold text-foreground`. Body: `mt-3 font-sans text-[0.9375rem] leading-[1.8] text-muted-foreground`.

### Call sites
| File | Range | Notes |
|---|---|---|
| `src/app/(public)/sponsorships/page.tsx:83-100` | Empty sponsorships state (heading + body + ProspectCaptureForm action) | |
| `src/app/(public)/leaderboard/page.tsx:50-57` | "Scores Coming Soon" heading+body — **keep ProspectCaptureForm panel below** | Do NOT consume the prospect form into the primitive — it's the action slot |
| `src/app/(public)/sponsors/page.tsx:128-130` | `tiers.length === 0` fallback — short text | May be too brief for the full primitive; Bolt can inline-skip if shape doesn't fit |

**Gotcha — register/page.tsx:** Post-#230 registration-closed card has its own heading+body+ProspectCaptureForm shape. If it maps cleanly to PublicEmptyState, adopt it. If the `space-y-6` + two-card structure resists, leave it alone and document.

**Keep separate from AdminEmptyState** — different visual audiences, different styling. Do not merge.

### File path
`src/components/public/public-empty-state.tsx`

---

## Primitive 4: `<Checkbox>`

### Pattern
Thin wrapper around `@base-ui/react/checkbox`. Match Switch/Select wrapping pattern: export named `Checkbox`, forward props, add `data-slot="checkbox"`.

### Signature
```ts
// wraps Checkbox.Root from @base-ui/react/checkbox
// supports: checked, defaultChecked, onCheckedChange, disabled, required, id, name, value, className
```

### Styling
`h-4 w-4 cursor-pointer rounded border-border accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`

### Call sites
| File | Lines | Notes |
|---|---|---|
| `src/app/(public)/register/registration-form.tsx` | 228–234 | Raw `<input type="checkbox">` — replace with `<Checkbox>` |
| `src/app/admin/contacts/contact-list.tsx` | 460, 568, 635 | 3 raw checkboxes — replace with `<Checkbox>` |

### File path
`src/components/ui/checkbox.tsx`

---

## Primitive 5: `<Tabs>` / `<Tab>`

### Pattern
Thin wrapper around `@base-ui/react/tabs`. Match Select/Switch wrapping approach. Export `Tabs` (root), `TabsList`, `TabsTrigger`, `TabsPanel`.

### Count pill
PhotoModeration uses a count pill on the active tab with `bg-primary/10 text-primary` vs `bg-neutral-100 text-muted-foreground` on inactive. The primitive should support an optional `count` prop on `TabsTrigger`.

### Call sites
| File | Lines | Notes |
|---|---|---|
| `src/app/admin/trash/trash-tabs.tsx` | 271–292 | Bespoke `<button>` tab bar — replace with `<TabsList>` + `<TabsTrigger>` |
| `src/app/admin/photos/photo-moderation.tsx` | 88–113 | Different bespoke implementation with count pill — normalize to primitive |

### File path
`src/components/ui/tabs.tsx`

---

## Implementation Order (for Bolt)

1. SectionEyebrow — most call sites, normalize tracking variance
2. InfoCallout — straightforward, few call sites
3. PublicEmptyState — check register/page shape before adopting
4. Checkbox — base-ui wrapper, replace 4 raw inputs
5. Tabs — replace 2 bespoke tab bars, count pill support

---

## Hygiene Rules (locked in tests)

- `text-[0.6875rem]` must only appear in `SectionEyebrow.tsx` across `src/` after GREEN
- `text-xs.*tracking-\[0\.3em\]` must be gone from all public pages after GREEN
- `<input type="checkbox"` must not appear in `src/` outside `Checkbox.tsx` after GREEN
- Bespoke `<button>` tab-bar pattern in `trash-tabs.tsx` and `photo-moderation.tsx` must be replaced by the primitive

---

## Gotchas Summary

| Issue | Risk | Resolution |
|---|---|---|
| `tracking-[0.3em]` normalization | Visual pixel drift on about/register/success pages | Flag for visual spot-check after GREEN |
| register/page.tsx closed-card post-#230 | InfoCallout/PublicEmptyState may fight new structure | Adopt if shape fits; document opt-out if not |
| leaderboard prospect-capture form (#237) | Must not be consumed into PublicEmptyState | ProspectCaptureForm goes in the action slot |
| base-ui Checkbox API | May differ from HTML `<input>` in controlled mode | Check base-ui docs; match Switch pattern |
| tabs count pill | PhotoModeration has active/inactive pill colors | Support optional `count` prop on TabsTrigger |
