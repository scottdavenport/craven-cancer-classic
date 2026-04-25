# Sprint 24 — /sponsorships modal-purchase + tax-pill cleanup (hotfix)

**Status:** Planning — awaiting Forge approval before Bolt spawns.
**Driver:** Scott live-feedback after Sprint 23 PR #256 shipped:
> "Remove the tax receipt label — it's duplicated everywhere and looks weird. Also when I selected a package it was not obvious that it was added to a cart. We are only allowing you to buy one at a time so it should immediately pop up and be ready to take payment and info."

## Scope

Two surgical fixes to the public `/sponsorships` page just shipped in Sprint 23 (`bce9e9d` → `3fedb88`):

1. **Remove the per-card "Tax-deductible · receipt provided" pill.** The reassurance strip below the grid already says "A tax receipt is emailed after checkout" — that's the single source. Per-card duplication is visually noisy.
2. **Wrap the existing PurchaseForm in a modal.** Click "Select package" → modal opens immediately with the form ready to fill. ESC / overlay-click / Cancel dismisses. Existing form fields, validation, and Stripe checkout submit flow untouched.

## Non-Goals

- Form fields stay as-is (purchaser_name, purchaser_email, purchaser_phone, company_name)
- `/api/checkout` POST + Stripe redirect flow unchanged
- Card design is unchanged except removing the tax pill
- `/sponsors` page untouched
- Admin pages untouched
- Do NOT migrate to Stripe Checkout's hosted form (Scott explicitly chose "modal-wrap the existing form" over "skip form, go to Stripe directly")

## Modal primitive

Use shadcn `<Dialog>` from `@/components/ui/dialog` if it exists (verify by reading the file). If not, use base-ui's Dialog primitive — Craven already uses base-ui for Select per memory `feedback_base_ui_select_items.md`. Bolt picks based on what's actually in the codebase; document the choice in the PR.

Dialog requirements (per common purchase-modal pattern):
- Open derives from existing `selectedId !== null` state in `SponsorshipGrid`
- Close handler clears `selectedId` (re-uses existing `onCancel` flow)
- ESC closes
- Overlay click closes
- Focus trap inside the dialog (any modern Dialog primitive handles this)
- ARIA-labelled by the dialog title (package name)

## Files

| File | Action | Notes |
|---|---|---|
| `src/components/public/sponsorship-card.tsx` | MODIFY | Remove `<div class="product-tax">...</div>` block + the inline-style construction for it. Keep everything else intact. |
| `src/app/(public)/sponsorships/sponsorship-grid.tsx` | MODIFY | Wrap `<PurchaseForm>` render in `<Dialog>`. Move the dialog header (package name + price) above the form fields. Keep the `selectedId` state machine. |
| `src/components/public/__tests__/sponsorship-card.test.tsx` | MODIFY | Remove tax-pill text assertion; add regression test asserting `Tax-deductible` substring is ABSENT from rendered card |
| `src/app/(public)/sponsorships/__tests__/sponsorships-page.test.tsx` | MODIFY | Remove any tax-pill assertion at page level (Sprint 23 added some); add regression that no card contains "Tax-deductible" text |
| `src/app/globals.css` | CONDITIONAL | If `--tax-green` token is no longer referenced anywhere after the pill is removed, drop it (this IS in scope per surgical-changes — the token's existence was a Sprint 23 ADD that this sprint UN-DOES). Grep before removing. |

No new files. No new tests files. No new components.

## Acceptance Criteria

All criteria are verifiable on the live `/sponsorships` page after deploy.

### Tax pill removal
1. No "Tax-deductible · receipt provided" text appears on any individual card (DOM grep on prod returns 0 matches in card markup)
2. The reassurance strip below the grid still reads exactly: "A tax receipt is emailed after checkout."
3. The reassurance strip's `/sponsors` cross-link is unchanged

### Modal purchase flow
4. Click "Select package" CTA on any non-sold-out card → modal opens immediately, no scroll
5. Modal header shows the selected package name + price
6. Modal body shows the existing PurchaseForm with fields (Your Name, Company / Organization, Email, Phone) + "Proceed to Payment" button
7. ESC closes the modal
8. Overlay (backdrop) click closes the modal
9. Existing "Cancel" button inside the form closes the modal
10. Submitting the form still POSTs to `/api/checkout` and redirects to Stripe (zero behavior change vs Sprint 23)
11. After modal closes via any dismiss method, `selectedId` is reset (reopening the same card or any card opens a fresh modal)
12. Sold-out cards: "Sold Out" CTA does NOT open a modal (button is disabled / non-interactive per existing logic)
13. Modal is focus-trapped (tab cycles within modal contents, doesn't escape to underlying page)
14. Modal has `aria-labelledby` referencing the header (or equivalent ARIA pattern)

### Mobile (390px)
15. Dialog renders full-screen or near-full-screen at narrow widths (typical Dialog primitive behavior)
16. Form fields stack vertically (already the case in existing PurchaseForm)

## Test Plan

Bolt writes inline (no separate Spec RED phase — this is a 2-file production change with regression-style updates to existing tests). Adds:

1. Update `sponsorship-card.test.tsx` — remove the existing "tax pill text" assertion; add: `expect(screen.queryByText(/Tax-deductible/i)).not.toBeInTheDocument()`
2. Update `sponsorships-page.test.tsx` — remove any page-level tax-pill assertion; add: `expect(container.querySelectorAll('[class*="product-tax"]').length).toBe(0)` (or equivalent absence check)
3. Add to `sponsorship-grid.test.tsx` (CREATE if doesn't exist, otherwise extend):
   - Click "Select package" on a card → assert dialog/modal renders with PurchaseForm inside
   - ESC keypress → assert dialog dismisses
   - Cancel button click → assert dialog dismisses
   - Sold-out card click does NOT open dialog

## Watchdog Gate

Standard QA + design-adherence:
- tsc clean
- All tests pass (existing 1344+ + new dialog tests; tax-pill assertions removed cleanly)
- Build clean
- Vercel preview: visually verify modal behavior at desktop + 390px
- DOM grep on Vercel preview: zero "Tax-deductible" in card markup, one "tax receipt is emailed" in reassurance strip
- Per `feedback_watchdog_design_adherence_diff.md`: visually compare card grid before/after — only diff should be missing tax pill, no other unintended changes

No Aria gate (zero new copy — modal reuses existing form labels and button text; the only "new" text is the modal header which is just the package name + price, both already in DB).

## PR Structure

Single Bolt PR. Plan file + implementation + test updates in one commit (or two: plan first, then impl — Bolt's call). Watchdog reviews. Forge merges. Vercel auto-deploys.

## Effort Estimate

| Work | Owner | Size | Estimate |
|---|---|---|---|
| Plan write + commit | Forge | XS | 0 (this file) |
| Implementation + test updates | Bolt | S | ~1.5h |
| Watchdog review | Watchdog | XS | ~20min |
| Verify prod | Forge | XS | ~5min |

**Total wall-clock:** ~2h.

## Risks

- **Dialog primitive choice.** If shadcn `<Dialog>` isn't in `src/components/ui/dialog.tsx`, Bolt falls back to base-ui's Dialog. Either is fine. Worst case the choice is wrong and Watchdog requests a swap — small fix.
- **`--tax-green` token deletion.** If grepping shows the token is still referenced somewhere unexpected (it shouldn't be — only added in Sprint 23 for this pill), leave it. No harm in keeping a defined-but-unused CSS variable.
- **Existing test file paths assume vitest mocking pattern from Sprint 22/23.** Reuse the established mocking convention; don't introduce a new pattern.
