# Sprint 11 — Registration & Teams Consolidation

**Sprint goal:** Merge the vestigial `/admin/registrations` into `/admin/teams`, drop the deprecated `teams.captain_*` text columns, add inline contact creation in the team builder, and fix the sidebar prefix-match bug surfaced during UAT.

**Target:** ~1 week, 4 issues, ~16h estimated builder time.

**Baseline:** `main` at commit `15946c5` (post Sprint 10 + auth-fix PR). 469 tests passing. `tsc` clean. Zero unrelated work pending.

---

## Locked decisions (Scott 2026-04-19 via UAT)

- **Route consolidation direction:** delete `/admin/registrations` directory entirely. Keep canonical URL at `/admin/teams`. Rename sidebar "Teams" → "Registrations" (admin mental model says "registrations").
- **Deprecated columns:** drop `teams.captain_name`, `teams.captain_email`, `teams.captain_phone`. Data is duplicated in `contacts` via `team_members → captain_contact_id` — nothing is lost.
- **Stripe webhook captain lookup:** replace raw-column reads with join through `team_members → contacts` (was reading `teams.captain_email` to send confirmation emails).
- **Register team RPC:** keep `p_captain_*` parameters for backwards-compat with frontend callers, but stop writing them into `teams`. RPC continues to use them for the `contacts` upsert.
- **Inline contact creation:** add "+ Create new contact" option inside the captain/player search picker when search returns no matches. Nested mini-form captures first/last/email/phone, creates the contact, auto-selects it into the team slot.
- **Sidebar prefix bug:** one-line fix (`pathname === item.href || pathname.startsWith(item.href + "/")`). Bundle with route rename PR.

### TDD calls
- **S11-1 Sidebar + route merge:** skip Spec RED phase upfront. Pure file-deletion + rename. Bolt direct. Watchdog verifies no orphan references.
- **S11-2 Drop captain columns:** Spec RED phase required. Migration + RPC signature change + webhook refactor is the highest-risk work in the sprint.
- **S11-3 Inline contact creation:** Spec RED phase for the new action / flow. Bolt implements UI.

---

## Research findings (verified on main @ 15946c5)

### Current `/admin/registrations` scope (to delete)
- `src/app/admin/registrations/page.tsx` — server component, fetches getTeams
- `src/app/admin/registrations/registration-list.tsx` — renders list, reads legacy `captain_name`/`captain_email`/`captain_phone` text columns
- `src/app/admin/registrations/actions.ts` — only `getTeams()` remains (was 2 exports; `deleteTeam` moved to `/admin/teams/actions.ts` in S10-5)
- The `registrations/actions.ts:getTeams` queries raw `teams` table (not `teams_active` view) — shows soft-deleted teams, real bug. Deletion fixes it incidentally.

### Deprecated-column callers (to rewire)
- `src/app/api/checkout/route.ts:116,158,191` — public `/register` form passes captain info to `register_team` RPC AND uses same values for contacts upsert
- `src/app/api/webhooks/stripe/route.ts:148,155` — reads `teams.captain_name/email/phone` to upsert contact post-payment
- `src/app/admin/teams/actions.ts:150-152` — passes empty strings to RPC for admin-built teams (already vestigial)
- `src/types/database.ts` — auto-generated, regenerates after migration

### Public registration form (unchanged by this sprint)
- `src/app/(public)/register/registration-form.tsx` — HTML form collects captain_name/email/phone, posts to `/api/checkout` which calls `register_team` RPC. Form itself doesn't change; the RPC semantics underneath do.

### Current `register_team` RPC
- `supabase/migrations/20260419000006_register_team_rpc.sql` — takes `p_session`, `p_team_name`, `p_captain_name`, `p_captain_email`, `p_captain_phone`. Inserts a teams row populating `captain_name/email/phone` columns directly.

### Sidebar bug (UAT-17)
- `src/components/admin/admin-sidebar.tsx:60-64` — `pathname.startsWith(item.href)` matches `/admin/sponsorships` against `/admin/sponsors` prefix. One-line fix established during UAT.

### Contact form reusable
- `src/app/admin/contacts/contact-form.tsx` — already supports being rendered inside other contexts (onSubmit prop, cancel prop). Can be embedded in a nested mini-drawer for S11-3 inline-create flow.

---

## Issues

### S11-1: Route merge + sidebar rename + prefix-bug fix (M — 3h, Bolt)

**Combines GitHub issues:** #143 (Merge Registrations into Teams), #146 (Sidebar prefix-match bug)

**Files to delete:**
- `src/app/admin/registrations/page.tsx`
- `src/app/admin/registrations/actions.ts`
- `src/app/admin/registrations/registration-list.tsx`
- (Remove the empty `src/app/admin/registrations/` directory)

**Files to modify:**
- `src/components/admin/admin-sidebar.tsx`:
  - Remove the old "Registrations" menuItem pointing at `/admin/registrations`
  - Rename the existing "Teams" menuItem to **"Registrations"** (label only; `href` stays `/admin/teams`)
  - Fix `isActive` logic — replace `pathname.startsWith(item.href)` with `pathname === item.href || pathname.startsWith(item.href + "/")`
- `src/app/admin/page.tsx` line 82 — update the `<LinkButton href="/admin/registrations">` to `/admin/teams`

**Test updates:**
- `src/__tests__/auth-callback.test.ts` — references to `/admin/registrations` become `/admin/teams`
- `src/__tests__/middleware-redirect.test.ts` — same

**Acceptance:**
- [ ] `GET /admin/registrations` returns 404
- [ ] Sidebar shows single "Registrations" entry at `/admin/teams`
- [ ] Active state highlights correctly — no two items active simultaneously on any admin route
- [ ] `tsc` clean, `npm test` passing, `npm run build` succeeds
- [ ] Grep `src/` for `admin/registrations` → zero results (except auth-callback test which gets its next-param value updated)

**Owner:** Bolt

---

### S11-2: Drop deprecated teams.captain_* columns (M — 7h, Spec + Bolt)

**GitHub issue:** #144

**RED phase — Spec writes failing tests first for:**
1. Stripe webhook refactor: reads captain email via `team_members` join, NOT from `teams.captain_email`. Test cases:
   - Webhook finds correct contact via `team_members` where `role = 'captain'` + `teams.captain_contact_id` cross-check
   - Webhook upserts contact with correct email
   - Webhook handles team with no captain (defensive — shouldn't happen, but fail gracefully if so)
2. `register_team` RPC signature change: verify new call shape works correctly via contract test against staging DB
3. Regression: public `/register` form still completes payment flow end-to-end (contact created, team_members populated)

**GREEN phase — Bolt implements:**

**Migration file 1:** `YYYYMMDD_update_register_team_rpc.sql`
- Modify `register_team` RPC to stop writing `captain_name/email/phone` into `teams`
- Keep RPC parameter list the same (backwards-compat)
- RPC continues to upsert the contact row using captain params (unchanged)

**Code changes:**
- `src/app/api/webhooks/stripe/route.ts` — replace `teams.captain_name/email/phone` select with join through `team_members` (where `role = 'captain'`) → `contacts` → read email/name/phone from there
- `src/app/admin/teams/actions.ts` — remove the `p_captain_name: ""`, `p_captain_email: ""`, `p_captain_phone: undefined` from RPC call (or leave as empty strings if keeping backwards-compat param list). Decision: leave as empty strings so RPC signature doesn't break.

**Migration file 2:** `YYYYMMDD_drop_teams_captain_columns.sql`
```sql
ALTER TABLE public.teams
  DROP COLUMN captain_name,
  DROP COLUMN captain_email,
  DROP COLUMN captain_phone;
```

**Types regen:** `supabase gen types typescript --project-id kybfsxjruczbiokucyft --schema public > src/types/database.ts`

**Acceptance:**
- [ ] All Spec tests pass
- [ ] Existing tests still pass (post-type-regen, some may need `captain_*` references removed)
- [ ] Migration applies cleanly on prod (single-env deploy per craven setup — auto-deploys on merge)
- [ ] `/api/webhooks/stripe/route.ts` no longer reads `teams.captain_*` columns
- [ ] Public `/register` end-to-end smoke test: fills form → checkout → Stripe test payment → webhook fires → contact created → confirmation email delivered
- [ ] `tsc` clean, `npm run build` succeeds
- [ ] Grep `src/` + migrations for `captain_name|captain_email|captain_phone` — zero results except for RPC parameters (`p_captain_*`)

**Owner:** Spec (tests) + Bolt (impl)

**Risk:** Stripe webhook is a live customer-facing path. If captain lookup breaks, confirmation emails stop working silently. Spec's webhook test MUST run against the real join path before Bolt's impl merges.

---

### S11-3: Inline contact creation in team builder (M — 5h, Spec + Bolt)

**GitHub issue:** #145

**RED phase — Spec writes failing tests for:**
1. New search-result behavior: when `searchContacts` returns empty array, result list shows a "+ Create new contact" CTA
2. Clicking CTA opens nested contact-form (mini drawer or inline expansion)
3. New `createContactInline(input)` action OR reuse existing `createContact` (Spec's call — prefer reuse if semantics match)
4. On create success: new contact appears in search results, auto-selected into the team slot
5. Works for both captain slot and player slot contexts

**GREEN phase — Bolt implements:**

**Files to modify:**
- `src/app/admin/teams/team-form.tsx` (or wherever the contact search picker lives) — add "+ Create new contact" CTA and embed nested contact-form
- `src/app/admin/contacts/contact-form.tsx` — verify it accepts `onSubmit` + `onCancel` props cleanly (already does; confirm no regression)

**No new server action needed:** reuse `createContact` from `admin/contacts/actions.ts`.

**UX:**
- When admin types a search query with zero results → show CTA button inline with results area: `"+ Create 'Jane Smith' as a new contact"`
- Clicking expands a nested mini-drawer (right side) OR inline collapsible panel with a slim version of the contact form (name + email only for v1, full form if time permits)
- On save: close nested view, insert the new contact into the search results, auto-select into the target slot
- Cancel returns to search without creating anything

**Acceptance:**
- [ ] Empty-search state shows "+ Create new contact" CTA
- [ ] CTA click opens inline contact form with name field pre-populated from search query
- [ ] Submit creates contact, auto-selects into team slot
- [ ] Works in both captain search and player search contexts
- [ ] Cancel discards without creating
- [ ] Follows the no-native-UI rule — custom modal/drawer only, no `prompt()`

**Owner:** Spec (tests) + Bolt (impl)

---

### S11-4: Spec sweep (S — 1h, Spec)

After S11-1/2/3 merge:
- Coverage check on changed files — target ≥50% on any new logic
- Regression test: public `/register` end-to-end via Playwright if E2E creds are set (credential-gated flows may still skip)
- Confirm no stray `captain_name` / `captain_email` / `captain_phone` references remain

---

## Delivery order

1. **S11-1** (route merge + sidebar) ships first. Independent, unblocks S11-2 (removes a reader of deprecated columns).
2. **S11-2 Spec RED** phase can start in parallel with S11-1 (tests don't need S11-1 merged).
3. **S11-2 Bolt GREEN** runs after S11-1 merges AND Spec RED tests are in.
4. **S11-3** (inline contact creation) runs in parallel with S11-2 — touches `team-form.tsx`, not webhook/RPC. Disjoint files.
5. **S11-4 Spec sweep** after S11-2 and S11-3 merge.

Two concurrent builder tracks mid-sprint; single-builder at start and end.

---

## Risks

- **Stripe webhook refactor:** live path. If the `team_members → contacts` join returns null for captain, confirmation email silently fails. Spec must test the null-captain edge case.
- **RPC signature change:** keeping params the same (as empty strings) preserves backwards-compat, but if any external caller ever depended on the RPC populating captain columns, that breaks. Mitigation: only caller is our own code — verified via grep.
- **Types regen drift:** after dropping columns, tsc errors may surface in unrelated test fixtures with old `captain_name: "..."` seed data. Grep-fix as part of S11-2 implementation.
- **Public /register form:** uses the captain fields as React form inputs (not DB columns directly). No change to the form. Risk is low.

---

## Out of scope

- Sidebar grouping (UAT-1 → Sprint 15)
- Logo replacement (UAT-2 → Sprint 15)
- Drawer migration for team-list (UAT-BUNDLE-B → Sprint 12)
- UI consistency pass (UAT-BUNDLE-A → Sprint 12)
