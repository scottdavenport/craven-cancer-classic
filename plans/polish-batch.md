# Post-S17 Polish Batch — #186, #188, #191

Three small follow-ups from recent sprint retros. Fully disjoint file surfaces → 3 parallel PRs.

Main HEAD at plan time: `4b04672`

---

## Issues in scope

| # | Title | Priority | Source |
|---|---|---|---|
| #186 | security: add range validation to updateScore | P3 | S15 Sentinel audit |
| #188 | security: content-sniff SVG in uploadSponsorLogo (MIME spoof defense) | P3 | S15 Sentinel on PR #187 |
| #191 | ux: sidebar header — switch to mark-only logo when collapsed | P3 | S16 retro |

---

## File map (verified)

| # | Primary file | Target |
|---|---|---|
| #186 | `src/app/admin/scores/actions.ts:82` (`updateScore`) | Reject NaN/Infinity/negative/>200 on `total_score` |
| #188 | `src/app/admin/sponsors/actions.ts:134` (`sanitizeSvgIfNeeded`) | Dispatch to sanitizer on content sniff, not MIME type |
| #191 | `src/components/admin/admin-sidebar.tsx:79-80` (logo `<Image>`) | Swap `src` based on `useSidebar().state` |

Sidebar primitive `useSidebar()` hook exposes `state: "expanded" \| "collapsed"` — use it.

---

## PR bundling — 3 parallel PRs

### PR A — `#186` updateScore range validation
**Branch:** `polish-186-score-range`
**Closes:** `Closes #186`
**Files:** `src/app/admin/scores/actions.ts`, new `src/__tests__/score-actions-validation.test.ts`

**Acceptance:**
- [ ] `updateScore(id, data)` rejects `total_score` values: NaN, negative, non-finite (Infinity), > 200 (sane upper bound for 18-hole tournament)
- [ ] Returns `{ error: "Invalid total score" }` on invalid input, does NOT call `.update()`
- [ ] Valid values (e.g. 72, 0, 200) pass through unchanged
- [ ] Existing `updateScore` happy-path tests still pass

**Notes:**
- `requireAdmin()` already gates the function — leave it first. Validation runs AFTER `requireAdmin()` but BEFORE `.update()`.
- Return type stays `{ ok: true } | { error: string }` — match existing shape.

---

### PR B — `#188` SVG content sniff (security-relevant)
**Branch:** `polish-188-svg-sniff`
**Closes:** `Closes #188`
**Files:** `src/app/admin/sponsors/actions.ts`, extend `src/__tests__/sponsors-actions.test.ts`

**Acceptance:**
- [ ] `uploadSponsorLogo` detects SVG content by bytes, not just by declared MIME type
- [ ] File with `image/png` MIME but SVG content (starts with `<?xml`, `<svg`, or contains `<svg` in first 1KB) is routed through `sanitizeSvg` before upload
- [ ] Actual PNG content (bytes start with `\x89PNG`) passes through untouched
- [ ] Existing `image/svg+xml` MIME handling still works

**Implementation hint:**
```ts
async function isSvgContent(file: File): Promise<boolean> {
  if (file.type === "image/svg+xml") return true;
  const head = await file.slice(0, 1024).text();
  return /<\?xml|<svg\b/i.test(head);
}

async function sanitizeSvgIfNeeded(file: File): Promise<File> {
  if (!(await isSvgContent(file))) return file;
  const text = await file.text();
  return new File([sanitizeSvg(text)], file.name, { type: "image/svg+xml" });
}
```

Note: if content is SVG but MIME was lying, reconstruct the output File with the correct `image/svg+xml` MIME so downstream (Storage, CDN) can serve it correctly.

**Security review protocol:** Sentinel reviews first. Watchdog reviews after Sentinel approves. Do NOT run them in parallel (per DELEGATION-POLICY).

---

### PR C — `#191` responsive sidebar logo
**Branch:** `polish-191-sidebar-mark`
**Closes:** `Closes #191`
**Files:** `src/components/admin/admin-sidebar.tsx`, extend `src/__tests__/admin-sidebar-grouping.test.tsx` (or create a new sidebar-responsive test file)

**Acceptance:**
- [ ] When `useSidebar().state === "expanded"`, logo src is `/brand/ccc-logo-full.svg`
- [ ] When `useSidebar().state === "collapsed"`, logo src is `/brand/ccc-logo-mark.svg`
- [ ] `alt="CCC"` stays on both variants
- [ ] No layout shift beyond the intended width change

**Implementation hint:**
```tsx
const { state } = useSidebar();
const logoSrc = state === "collapsed" ? "/brand/ccc-logo-mark.svg" : "/brand/ccc-logo-full.svg";
// ... <Image src={logoSrc} ... />
```

`useSidebar` hook is at `src/components/ui/sidebar.tsx:47`. Context wraps `AdminSidebar` via `SidebarProvider` in the admin layout — no additional wiring needed.

---

## Parallelism & merge order

| Phase | PR A (#186) | PR B (#188) | PR C (#191) |
|---|---|---|---|
| Spec RED | parallel | parallel | parallel |
| Bolt GREEN | parallel | parallel | parallel |
| Review | Watchdog | **Sentinel → Watchdog** (serial) | Watchdog |
| Merge | any order | any order | any order |

File surfaces disjoint:
- PR A: `src/app/admin/scores/actions.ts` + new test file
- PR B: `src/app/admin/sponsors/actions.ts` + extends sponsors-actions test
- PR C: `src/components/admin/admin-sidebar.tsx` + extends or creates sidebar test

Zero overlap.

---

## TDD expectations — Spec writes RED first

### PR A — `src/__tests__/score-actions-validation.test.ts` (NEW)

`describe("updateScore — total_score validation")`:
- NaN → `{ error }`, no `.update()` called
- -1 → `{ error }`
- Infinity → `{ error }`
- 201 → `{ error }` (above upper bound)
- 0 → accepted (shotgun start, scratch golfer theoretical)
- 72 → accepted (happy path)
- 200 → accepted (at boundary)
- requireAdmin is called before validation (call-order assertion)

### PR B — extend `src/__tests__/sponsors-actions.test.ts`

New `describe("uploadSponsorLogo — MIME-spoof defense")`:
- File with SVG content + `image/png` MIME → sanitized (script stripped)
- File with SVG content + `application/octet-stream` MIME → sanitized
- File with `<?xml ...?>\n<svg...>` prolog → detected as SVG, sanitized
- Real PNG file (magic bytes `\x89PNG`) with `image/png` MIME → passes through unchanged (no sanitization applied)
- Existing `image/svg+xml` MIME tests continue passing

### PR C — extend `src/__tests__/admin-sidebar-grouping.test.tsx` OR new file

Spec's call: extend the grouping file if easy, otherwise new test file `admin-sidebar-responsive.test.tsx`.

`describe("AdminSidebar — responsive logo")`:
- When `SidebarProvider` state is expanded, `img.src` ends with `/brand/ccc-logo-full.svg`
- When `SidebarProvider` state is collapsed, `img.src` ends with `/brand/ccc-logo-mark.svg`
- `alt="CCC"` present in both states

May require wrapping in `SidebarProvider` in the test render; check the existing grouping test for pattern.

---

## Retro carryovers

- **One `Closes #N` per line** (S15 retro).
- **Preserve `items={...}`** on any `<Select>` (S14/S15 retro). None expected here.
- **`requireAdmin()` stays first** in any admin server action edit (S16 retro). Already true for `updateScore`; just don't regress it.
- **Don't rewrite production copy to satisfy a test matcher** (S17 retro). Use `data-testid` if needed.
- **Verify plan commit is on origin** before deleting post-merge (S17 retro).

---

## Verification steps

1. `npx tsc --noEmit` on main — zero errors.
2. `npx vitest run` — all green. Target: 677 + ~12-15 new tests = ~690.
3. Staging smoke:
   - Upload a score over 200 or negative → toast shows error.
   - Upload an SVG labeled as PNG → sanitization runs, public URL serves sanitized content.
   - Collapse sidebar → mark logo renders; expand → full logo renders.

---

## Out of scope

- No changes to `getScores` or `scoreRanges` data model.
- No changes to other sponsor form fields.
- No changes to sidebar grouping, rename, or favicon.

---

## Post-sprint retro template

Fill after merge:
- What went well
- What went wrong (if anything — these are small)
- Proposed changes
