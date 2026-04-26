# Sprint 25 — /sponsors Sprint 22 follow-ups

**Status:** Planning — awaiting Forge approval before Bolt spawns.
**Driver:** Closing the two leftover items Watchdog flagged (non-blocking) on Sprint 22 PR #253:
> 1. Open Sponsorships block missing the outer `<h2>Open Sponsorships</h2>` + "{N} Categories · {year} Season" count badge wrapper that the design preview specified
> 2. Bottom CTA uses inline `style={{ backgroundColor: "var(--brand-darker)" }}` — could be a `bg-brand-darker` Tailwind class for consistency with `bg-brand-dark` already working at `(public)/page.tsx:118`

## Scope

Two surgical fixes to the public `/sponsors` page (Sprint 22 deliverable, currently live at `https://craven-cancer-classic.vercel.app/sponsors`).

### Fix 1 — Add Open Sponsorships section header

Match the populated-tier-header pattern (border-top, flex with title left + count right) so the Open Sponsorships block has visual rhythm parity with the Champion/Eagle/Thursday Night/Morning Biscuit Sponsor sections above it.

**Design preview reference:** `design-explorations/sponsors-redesign-2026-04-25/direction-marquee/index.html` — the outer `<section class="tier-section">` wrapping the `<div class="open-sponsorships-block">` with `<h2 class="tier-name">Open Sponsorships</h2>` + `<div class="tier-count"><strong>6</strong> Categories · 2026 Season</div>`.

Architecture: header lives in `src/app/(public)/sponsors/page.tsx` (NOT inside the OpenSponsorshipsBlock component), matching how populated tier headers are rendered inline in the page. Keeps the OpenSponsorshipsBlock component focused on its single responsibility (the gradient panel + chip grid + CTA).

### Fix 2 — Bottom CTA Tailwind class consistency

Swap inline `style={{ backgroundColor: "var(--brand-darker)" }}` → `className="bg-brand-darker"` on the bottom CTA `<section>`. Tailwind class works (verified by Watchdog vs `bg-brand-dark` already used at `(public)/page.tsx:118` with identical `--color-*` registration pattern from Sprint 22 globals.css).

**Surgical scope:** ONLY the bottom CTA. The masthead also uses inline-style for the dark-teal background but Watchdog didn't flag it — leave alone per `feedback_surgical_changes.md`.

## Non-Goals

- Don't touch the OpenSponsorshipsBlock component internals (gradient, chips, CTA all stay)
- Don't refactor the masthead inline-style (out of scope per Watchdog non-blocker)
- Don't touch `/sponsorships` (Sprint 23/24 territory)
- Don't touch admin pages
- No new copy — "Open Sponsorships" + "{N} Categories · {year} Season" are both locked via the design preview README from Sprint 22

## Files

| File | Action | Notes |
|---|---|---|
| `src/app/(public)/sponsors/page.tsx` | MODIFY | Two changes: (1) add tier-header section wrapping `<OpenSponsorshipsBlock>` with H2 + count badge — only renders when `openItems.length > 0`; (2) swap bottom CTA inline-style for Tailwind class |
| `src/app/(public)/sponsors/__tests__/sponsors-page.test.tsx` | MODIFY | Add: when openItems.length > 0, header renders with text "Open Sponsorships" + "{N} Categories · {year} Season". When openItems.length === 0, header does NOT render (the OpenSponsorshipsBlock returns null in that case, so the wrapping section should also not render) |

No new components. No new tests files. No schema changes.

## Acceptance Criteria

All criteria are verifiable on the live `/sponsors` page after deploy.

### Open Sponsorships section header
1. When at least 1 open sponsorship category exists, a section header renders directly above the gradient teal Open Sponsorships block
2. Header structure mirrors populated tier headers: border-top, flex-baseline, title left + count right
3. H2 reads exactly "Open Sponsorships"
4. Count reads exactly `{N} Categories · {year} Season` where N is the count of open items (e.g. "6 Categories · 2026 Season")
5. When `openItems.length === 0`, neither the header NOR the OpenSponsorshipsBlock renders (regression: ensure the wrapping section is conditional, not always rendered)
6. Header H2 uses Manrope 800 (no `font-display` class)
7. Visual rhythm parity with populated tier headers (same border-top, same baseline alignment, same H2 scale)

### Bottom CTA class consistency
8. Bottom CTA `<section>` uses `bg-brand-darker` Tailwind class instead of inline `style={{ backgroundColor: "var(--brand-darker)" }}`
9. Visual rendering on prod is identical (same dark-teal `#244A5B` background)
10. No regression: button still links to `/donate`, copy unchanged

## Test Plan

Bolt writes inline (no separate Spec RED phase — surgical 2-file change, regression-style test additions):

1. Add to `sponsors-page.test.tsx`:
   - Header renders with "Open Sponsorships" text when openItems > 0
   - Count badge renders with "{N} Categories · {year} Season" format
   - Header is absent when openItems === 0 (mock no open items)
   - Header is NOT inside the OpenSponsorshipsBlock component (architecture check — query for both elements separately)

2. No test for bg-brand-darker class swap (testing Tailwind utility presence is implementation-detail; visual unchanged so regression is moot)

## Watchdog Gate

Standard QA + design-adherence diff:
- tsc clean
- All tests pass
- Build clean
- Vercel preview: visually verify the new header has rhythm parity with the populated tier headers above it
- DOM grep on Vercel preview confirms `<h2>Open Sponsorships</h2>` is present + `bg-brand-darker` class is on bottom CTA
- Surgical-changes audit: no other files touched, no formatting changes, masthead inline-style untouched

No Aria gate (no new copy beyond what's already locked in the design preview README from Sprint 22).

## PR Structure

Single Bolt PR. Plan file + implementation + test additions in one commit. Watchdog reviews, Forge merges, Vercel auto-deploys.

## Effort Estimate

| Work | Owner | Size | Estimate |
|---|---|---|---|
| Plan write | Forge | XS | 0 (this file) |
| Implementation + tests | Bolt | S | ~30min |
| Watchdog review | Watchdog | XS | ~15min |
| Verify prod | Forge | XS | ~5min |

**Total wall-clock:** ~50min.

## Risks

- **None substantive.** Both fixes are well-scoped, well-understood, and have prior art (the populated tier-header pattern + the existing `bg-brand-dark` Tailwind class usage at `(public)/page.tsx:118`).
- **Mild risk:** if the OpenSponsorshipsBlock component renders its own internal "Help us close out the {year} season" intro headline that visually looks like a header, the new outer header could feel redundant. Verify on Vercel preview that the visual hierarchy reads cleanly: outer H2 (section identity) → inner intro headline (sales pitch).
