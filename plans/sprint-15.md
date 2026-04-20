# Sprint 15 — Sponsor Bundle (#149–#154)

Six P2 sponsor-and-package issues, bundled into three parallel PRs with disjoint file surfaces.

## Issues in scope

| # | Title | Size |
|---|---|---|
| #149 | Sort + search on /admin/sponsors list | S |
| #150 | Sponsor phone + email normalize/validate | S |
| #151 | Sponsor ↔ package cascade safety | M |
| #152 | Optimistic/refetch UI on delete for sponsors + sponsorships | S |
| #153 | Sponsor logo upload UI | M |
| #154 | Active sponsor count per package | S |

## Post-S14 file map (verified)

```
src/app/admin/sponsors/
  actions.ts              (121 lines — has uploadSponsorLogo already)
  page.tsx
  sponsor-drawer.tsx
  sponsor-form.tsx        (has items={...} on Select — preserve)
  sponsor-list.tsx        (uses startTransition refetch pattern)

src/app/admin/sponsorships/
  actions.ts              (has soft-delete via softDelete())
  page.tsx
  sponsorship-drawer.tsx
  sponsorship-form.tsx
  sponsorship-manager.tsx (uses window.location.reload() — replace with refetch)

src/lib/contacts/contact-utils.ts  (normalizePhone, isValidPhone, formatPhoneForDisplay, normalizeEmail, isValidEmail — reuse directly)
```

## PR bundling — three disjoint surfaces

### PR A — Sponsor list UX (#149 + #152 sponsors side) [+ addresses #151 layer 2]
**Files:**
- `src/app/admin/sponsors/sponsor-list.tsx` — search input, sortable `TableHead`s, sort state, pending-first default, `(deleted package)` placeholder for rows whose `tier_id` isn't in the active `sponsorshipItems` list, wire refetch-on-delete through drawer.
- `src/app/admin/sponsors/sponsor-drawer.tsx` — verify `onSuccess` fires on delete path (inspect only; edit if broken).
- `src/app/admin/sponsors/__tests__/sponsor-list.test.tsx` — new.

**Branch:** `s15-a-sponsor-list-ux`
**PR body closes:** `Closes #149, #152`. Body note: "Addresses #151 layer 2 (placeholder render); PR C closes #151."

**Acceptance criteria:**
- [ ] Search input above table, narrows rows in real time (case-insensitive) on: `name`, `contact_name`, `website`, tier name.
- [ ] Clickable column headers: Name, Tier, Contact, Website, Status, Amount. Click toggles asc/desc.
- [ ] Active sort column shows arrow (↑ or ↓).
- [ ] Default sort: `payment_status` pending → paid → comped, then name A→Z within each bucket.
- [ ] Row whose `tier_id` is not in the `sponsorshipItems` list renders `(deleted package)` in italic + muted (matches existing `text-muted-foreground/50`).
- [ ] After successful delete from drawer, the row disappears without page reload.

---

### PR B — Sponsor form hardening (#150 + #153)
**Files:**
- `src/app/admin/sponsors/sponsor-form.tsx` — logo file input + thumbnail preview; phone blur-format; inline error state for invalid phone/email; preserve existing `items={...}` map on `Sponsorship level` Select.
- `src/app/admin/sponsors/actions.ts` — `createSponsor` / `updateSponsor` call `normalizePhone`, `normalizeEmail`, guard via `isValidPhone`, `isValidEmail`; return `{error}` on invalid. `uploadSponsorLogo` gets: 5MB cap check (server), SVG sanitize (strip `<script>` tags server-side before upload), old-file cleanup on replace.
- `src/app/admin/sponsors/__tests__/sponsor-form.test.tsx` — new.
- `src/app/admin/sponsors/__tests__/actions.test.ts` — new.

**Branch:** `s15-b-sponsor-form-hardening`
**PR body closes:** `Closes #150, #153`.

**Acceptance criteria:**
- [ ] Invalid email (e.g. `not-an-email`) → inline error `Invalid email format`, save blocked.
- [ ] Invalid phone (e.g. `123`) → inline error `Invalid phone number`, save blocked.
- [ ] Valid phone saved as E.164 (e.g. `+15551234567`); reloading the row shows national format (`(555) 123-4567`).
- [ ] Valid email saved lowercased + trimmed.
- [ ] Empty phone / empty email allowed (validators return true for empty per contact-utils contract).
- [ ] File input accepts `image/png, image/jpeg, image/webp, image/svg+xml`.
- [ ] File >5MB → inline error `File too large (max 5MB)`, upload blocked.
- [ ] SVG containing `<script>` → script tag stripped server-side before Supabase Storage upload.
- [ ] Re-upload: old file deleted from `logos` bucket before new one uploaded.
- [ ] Logo optional — sponsor saves without one.
- [ ] Thumbnail preview appears as soon as file is selected (pre-upload).

**Preserve — must not regress:**
- `sponsor-form.tsx` Select for "Sponsorship level" has `items={Object.fromEntries(sponsorshipItems.map(item => [item.id, \`${item.name} — $...\`]))}` — that `items` prop MUST survive. (S13 hotfix + S14 near-miss pattern.)

---

### PR C — Package cascade + counts (#151 layer 1 + #154 + #152 sponsorships side)
**Files:**
- `src/app/admin/sponsorships/sponsorship-manager.tsx` — new "Sponsors" column between Sold and Max; pre-delete cascade dialog when linked sponsors exist; replace `window.location.reload()` on success with `startTransition(refetch())`; wire refetch through drawer.
- `src/app/admin/sponsorships/actions.ts` — extend `getSponsorshipItems()` to include `active_sponsor_count: number` per row (join against `sponsors_active`); add `getLinkedSponsorNames(tierId: string)` for pre-delete dialog.
- `src/app/admin/sponsorships/__tests__/sponsorship-manager.test.tsx` — new.
- `src/app/admin/sponsorships/__tests__/actions.test.ts` — new (or extend if exists).

**Branch:** `s15-c-package-cascade-counts`
**PR body closes:** `Closes #151, #154, #152`.

**Acceptance criteria:**
- [ ] New "Sponsors" column renders between Sold and Max on the Packages table.
- [ ] Count shows only active (non-soft-deleted) sponsors per tier.
- [ ] Packages with zero linked sponsors render `0` (not hidden).
- [ ] Clicking delete on a package WITH linked sponsors: dialog shows `N sponsors are linked to this package: Name A, Name B, Name C. They'll show '(deleted package)' until you reassign them. Continue?` — up to first 3 names + `… and N more` if >3.
- [ ] Clicking delete on a package WITHOUT linked sponsors: normal delete confirm (no sponsor warning).
- [ ] Delete success → package row disappears without full page reload.
- [ ] Create/update also trigger refetch (no more `window.location.reload()`).

**Implementation hint for active_sponsor_count:**
- Option: post-process in `getSponsorshipItems()` by fetching `sponsors_active` once and counting per tier_id. Avoid N+1 queries. Example pattern:
  ```ts
  const [{ data: items }, { data: sponsors }] = await Promise.all([
    supabase.from("sponsorship_items_active").select("*")...,
    supabase.from("sponsors_active").select("tier_id").eq("year", currentYear),
  ]);
  const countByTier = new Map<string, number>();
  sponsors?.forEach(s => s.tier_id && countByTier.set(s.tier_id, (countByTier.get(s.tier_id) ?? 0) + 1));
  return items.map(item => ({ ...item, active_sponsor_count: countByTier.get(item.id) ?? 0 }));
  ```

---

## Parallelism & merge order

| Phase | A | B | C |
|---|---|---|---|
| Spec RED | parallel | parallel | parallel |
| Bolt GREEN | parallel | parallel | parallel |
| Forge PR | parallel | parallel | parallel |
| Watchdog | parallel | parallel | parallel |
| Merge | any order | any order | any order |

File surfaces are disjoint: A touches sponsors/sponsor-list + drawer; B touches sponsors/sponsor-form + actions; C touches sponsorships/* only. Zero overlap → zero rebase cycles expected.

## TDD — Spec writes RED first

Spec creates each branch and commits failing tests keyed to the acceptance criteria above. Builders then make them pass.

**Test quality rules (from BUILD-WORKFLOW):**
- Every test asserts behavior (return value, state change, side effect) — no smoke tests.
- Don't mock the thing you're testing.
- Pin `now` / UTC if any test touches dates.
- Seam test: PR C needs one seam test that spans `getSponsorshipItems` → `sponsorship-manager` render — verifies a sponsor linked via `sponsors_active` actually surfaces in the Sponsors column.

## Retro carryover from S14

- **Every builder prompt** lists the value→label `items` map that must survive extraction. Concrete > abstract.
- **Every Watchdog prompt** greps for `items={` on each `<Select` site in changed files and flags any regression.

## Verification steps (end of sprint)

1. `npx tsc --noEmit` on main — zero errors.
2. `npm test` — all tests green. Expect ≈555 → 580+ (new tests from all 3 PRs).
3. Staging auto-deploy: `gh run list --workflow deploy.yml --limit 1`.
4. Hit `/admin/sponsors` on staging — verify search, sort, delete, refetch, placeholder.
5. Hit `/admin/sponsorships` on staging — verify sponsor count column, pre-delete dialog, refetch.
6. Hit sponsor drawer on staging — upload logo (PNG, JPG, SVG-with-script), verify sanitization + preview + public-URL storage.
7. Promote to production via `gh workflow run deploy-production.yml --ref main`.

## Out of scope for Sprint 15

- Drag-and-drop logo upload zone (S15 scope is file input + preview only).
- Crop/resize UI for logos.
- WebP multi-size variants.
- Logo alt text field (follow-up).
- Click-through from Sponsors count → filtered sponsor list (UX nice-to-have, not in #154 acceptance).
- Re-adding client-side tier validation on sponsor form (followup from S13).

## Post-sprint retro template

Fill during sprint close:
- What went well
- What went wrong
- Proposed changes to docs/prompts
- Apply changes before next sprint
