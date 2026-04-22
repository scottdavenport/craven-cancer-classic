# Sprint 21 · Issue #229 — Tribute Copy Rewrite

**Status:** Copy locked 2026-04-22 (Scott + Aria via Forge session).
**Pipeline:** Spec RED → Bolt GREEN → Watchdog → Forge merge.
**Issue:** https://github.com/scottdavenport/craven-cancer-classic/issues/229

## Locked copy (ship verbatim)

### 1. Hero subhead — `src/app/(public)/page.tsx:97-99`
> Built in 2010 by the people who loved them. Still going, for the same reason.

### 2. About h1 — `src/app/(public)/about/page.tsx:19`
> How This Started

### 3. About intro paragraph — `src/app/(public)/about/page.tsx:39-45`
> Scott Davenport Sr., Brian Fisher, and John Aylward are the reason this tournament exists. Their wives and a community that loved all three men founded it in 2010 — out of love, and out of care for other families facing cancer.

### 4. About "In Loving Memory" — `src/app/(public)/about/page.tsx:52-68`
**Wrapper intro (before the three blocks):**
> The three men this tournament was built to honor. Their families will share their stories here.

**Three equal honoree blocks (h3 + italic placeholder paragraph):**
- `<h3>Scott Davenport Sr.</h3>` + italic `A tribute from his family — to follow.`
- `<h3>Brian Fisher</h3>` + italic `A tribute from his family — to follow.`
- `<h3>John Aylward</h3>` + italic `A tribute from his family — to follow.`

**Closing line (below all three blocks):**
> Every dollar this tournament raises goes to the community that still carries them.

### 5. About pull-quote — `src/app/(public)/about/page.tsx:131-135`
> Showing up since 2010. $450,000+ raised. The same reason every time.

### 6. Donate tribute block — `src/app/(public)/donate/page.tsx:139-155`
> Every dollar here honors Scott Davenport Sr., Brian Fisher, and John Aylward — the reason this tournament exists. Their families built this in 2010. Every gift keeps it going.

### 7. Meta description — `src/app/layout.tsx:31`
> Charity golf tournament since 2010. Honoring Scott Davenport Sr., Brian Fisher, and John Aylward. For other families facing cancer.

### 8. Footer tagline — `src/components/public/footer.tsx:24-25`
> "Still going, for the same reason."
(Keep the italic + quote-mark styling already in place — just swap the words.)

## Removal requirement
After Bolt's GREEN, **"valiantly fought" must not appear anywhere in `src/`**. Verify with `grep -r "valiantly fought" src/` returning empty.

## Out of scope
- Per-honoree biographical detail (spouse-owned, see forge memory `project_craven_tribute_ownership.md`).
- Visual redesign of the In Loving Memory section beyond accommodating 3 equal h3 + placeholder blocks (Pixel's job in future issues).
- Any other issue's copy (#230, #232, #234 are separate PRs).

## Acceptance
- All 8 strings rendered verbatim on their pages.
- `grep -r "valiantly fought" src/` returns empty.
- No grief framing, no assertion that all three honorees passed in 2010.
- Tests green (Spec's RED → Bolt's GREEN).
- Watchdog approval from forge-watchdog account.
