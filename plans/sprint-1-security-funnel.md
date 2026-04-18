# Sprint 1: Security + Funnel Foundation

**Target:** End of April 2026
**Status:** Awaiting Scott approval before any builder spawns

---

## Sprint Goal

Close the one live privilege-escalation vulnerability, unblock image rendering on /sponsors and /gallery, and replace the three dead-end CTA pages with real content that lets visitors register, sponsor, and donate.

---

## Out of Scope (Deferred)

These are real issues — they stay tracked, not forgotten.

**Security (Sprint 2):**
- P0: Sponsorship checkout trusts client-supplied `price_cents` — `api/checkout/route.ts:209`. Deferred because Stripe is not live; no real money at risk today. Must be fixed before live keys are set.
- P0: Stripe webhook silently swallows DB errors on payment update — `webhooks/stripe/route.ts:54-93`. Same dependency on live Stripe.
- P1: Open redirect in `auth/callback/route.ts:13` — `next` param unvalidated.
- P1: No MIME validation on photo upload — stored XSS risk.
- P1: No Stripe webhook idempotency — no `stripe_events` table, no unique index on payment IDs.
- No CSP headers, no rate limiting on /api/checkout or /api/upload-photo.

**Data integrity (Sprint 2):**
- `sponsorship_items.sold_count` never incremented by webhook — "Sold Out" gating broken.
- Session-cap race on team registration (count-then-insert, no transaction guard).
- Money stored as `numeric(10,2)`, mixed with cents in app code (3 conversion sites).
- Missing indexes: `(year, session)` on teams, `(status, year)` on photos.
- Missing `updated_at` triggers on 5 tables.
- 16 bare `catch {}` blocks swallowing errors.

**Infrastructure (Sprint 2+):**
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000` must be overridden in Vercel env vars.
- No `error.tsx` in any route segment.
- No `revalidate` on leaderboard, no pagination on gallery.
- Teal + purple brand redesign (purple accent `#8B5CF6` not yet applied anywhere).
- Committee invite flow + admin/viewer role management.
- Admin CRUD test coverage (currently ~2 behavioral tests of 22 total).

---

## Issues

---

### Issue 1 — [Security] Fix RLS admin self-promotion

**Specialist:** Flux (migration) + Spec (regression test, TDD first)
**Effort:** S
**Labels:** `bug`, `P0-critical`, `size:S`

**Problem:** `supabase/migrations/20260414000001_initial_schema.sql:22` — the profiles UPDATE policy has `USING (auth.uid() = auth_user_id)` but no `WITH CHECK`. Any authenticated user can `UPDATE profiles SET role = 'admin' WHERE auth_user_id = auth.uid()` and self-promote. This is exploitable today.

**Acceptance criteria:**
- A new migration adds `WITH CHECK (role = (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()))` to the profiles UPDATE policy, preventing role changes via the policy. (Alternatively: drop the UPDATE policy entirely and rely on the admin-only `is_admin()` policy for all profile mutations — builder chooses cleanest approach.)
- `supabase db diff` confirms no unintended policy changes.
- Spec writes a failing test first that POSTs a role-escalation attempt as a non-admin user and asserts it is rejected. Test must pass after migration is applied against the local Supabase stack.
- Watchdog confirms the migration is the only changed file in the PR (no accidental schema drift).

**Files affected:**
- `supabase/migrations/20260416000001_fix_rls_self_promotion.sql` (new)
- `src/__tests__/rls-self-promotion.test.ts` (new, Spec writes first)

**Parallelism:** Can start immediately. No file overlap with other issues.

---

### Issue 2 — Fix `next.config.ts` for Supabase Storage images

**Specialist:** Flux
**Effort:** S
**Labels:** `bug`, `P1-high`, `size:S`

**Problem:** `next.config.ts` is empty. `next/image` refuses to render images from external hostnames without an `images.remotePatterns` entry. /sponsors and /gallery both use `<Image src={sponsor.logo_url}>` and `<Image src={photo.url}>` pointing at Supabase Storage. On production these render as broken images.

**Acceptance criteria:**
- `next.config.ts` adds a `remotePatterns` entry for `*.supabase.co` (and the specific project hostname `kybfsxjruczbiokucyft.supabase.co`).
- After deploy to Vercel staging: /sponsors page renders sponsor logos (or the text fallback if no logos exist in DB — either is correct, the point is no `<Image>` error in console).
- After deploy to Vercel staging: /gallery page renders photos (or empty state — no `<Image>` hostname error).
- `tsc --noEmit` passes.

**Files affected:**
- `next.config.ts` (modify)

**Parallelism:** Can start immediately. No file overlap with other issues.

---

### Issue 3 — Register page: event date from `event_settings`, email capture

**Specialist:** Bolt
**Effort:** M
**Labels:** `feature`, `P1-high`, `size:M`

**Problem:** Registration page already reads `event_settings` for date/location and conditionally shows the form or a "closed" state — this part is built correctly. The gaps are: (1) when registration is closed, there is no email capture so visitors leave with no way to be notified; (2) the `$700` price is hardcoded in the public page and should be editable from the admin panel; (3) there is no visual indication of remaining session spots to create urgency.

**Acceptance criteria:**
- Migration adds `registration_fee_cents bigint not null default 70000` to `event_settings`. Cents, not dollars — aligns with Stripe.
- Admin event settings form exposes "Registration Fee (USD)" as a dollar input; admin action converts to/from cents on save. Existing admin page patterns reused (same validation conventions, same submit flow).
- Public Register page header reads `registration_fee_cents` from `event_settings` and renders as `$X` (e.g. `$700`). No hardcoded price anywhere in the public page.
- When `registration_open = false`: page shows a "Notify Me" email capture form (name + email). Submission writes to the `contacts` table with `type = 'prospect'`. Success state shown inline — no page reload.
- When `registration_open = true`: session selectors show remaining spots (e.g. "Morning — 12 spots left") or "FULL" badge when `count >= cap`.
- `tsc --noEmit` passes. No new bare `catch {}`.

**Files affected:**
- `supabase/migrations/20260416000002_add_registration_fee.sql` (new)
- `src/app/admin/event-settings/event-settings-form.tsx` (modify)
- `src/app/admin/event-settings/actions.ts` (modify — dollar↔cents conversion on save)
- `src/app/(public)/register/page.tsx` (modify)
- `src/app/(public)/register/registration-form.tsx` (modify)
- Possibly a new `notify-form.tsx` client component in the same directory

**Parallelism:** Can start immediately. No file overlap with Issues 1, 2, 4.

---

### Issue 4 — Sponsorships page: tier pricing preview + email capture when no items

**Specialist:** Bolt
**Effort:** M
**Labels:** `feature`, `P1-high`, `size:M`

**Problem:** When no `sponsorship_items` exist for the current year, the page shows "Sponsorship packages coming soon" with no way to capture interest. Even when items exist, the SponsorshipGrid (not read in detail) likely dumps a raw grid with no narrative — no reason why someone should sponsor. Visitors land from the homepage CTA and bounce.

**Acceptance criteria:**
- When `items.length === 0`: show a "Get Notified" email capture (name + email + company optional). Submission writes to `contacts` with `type = 'sponsor_prospect'`. Success state inline.
- When `items.length > 0`: each tier card shows the price prominently, benefit list (from `item.description` or a default), and a clear "Become a Sponsor" CTA button that initiates checkout.
- Page includes a brief paragraph above the grid explaining what sponsorship funds (connects to the mission — cancer patients, transportation, equipment).
- `tsc --noEmit` passes. No new bare `catch {}`.

**Files affected:**
- `src/app/(public)/sponsorships/page.tsx` (modify)
- `src/app/(public)/sponsorships/sponsorship-grid.tsx` (modify)
- Possibly a shared `prospect-capture-form.tsx` component (can be shared with Issue 3 if Bolt chooses)

**Parallelism:** Can start immediately. No file overlap with Issues 1, 2, 3. Note: if Bolt shares a `prospect-capture-form.tsx` component between Issues 3 and 4, they become serial (3 first, 4 second). Builder decides — if parallelism is preferred, inline the form in each page.

---

### Issue 5 — Donate page: replace stub with real content

**Specialist:** Bolt
**Effort:** S
**Labels:** `feature`, `P2-medium`, `size:S`

**Problem:** /donate is a near-empty stub — a Heart icon, two sentences, and an external link to carolinaeasthealth.com. It has no story, no impact context, and no email capture for non-checkout donors. It's the third homepage CTA destination and it dead-ends visitors.

**Acceptance criteria:**
- Page includes: a brief mission statement paragraph (2-3 sentences about where the money goes — transportation, lodging, equipment for cancer patients in treatment), the $450K+ / 15 years / 72 teams stats in a compact format, the "In Loving Memory" names (Scott Davenport Sr., Brian Fisher, John Aylward) as a human touch.
- The external donate link to carolinaeasthealth.com remains — it's correct. Add a note that when donating, designate to "Craven Cancer Classic Golf Tournament" (this text is already in the current page — keep it).
- Email capture below the CTA: "Stay in Touch" — name + email. Writes to `contacts` with `type = 'donor_prospect'`. Success state inline.
- `tsc --noEmit` passes.

**Files affected:**
- `src/app/(public)/donate/page.tsx` (modify)

**Parallelism:** Can start immediately. No file overlap with any other issue.

---

### Issue 6 — Past-event photo ingestion: storage setup + hero + gallery seed

**Specialist:** Flux (storage migration + seed script) + Bolt (hero section on homepage)
**Effort:** M
**Labels:** `feature`, `P1-high`, `size:M`

**BLOCKING DEPENDENCY ON SCOTT:** Scott confirmed photos will arrive within the week of 2026-04-18. Do not begin until Scott hands over the folder/archive.

**Problem:** The site looks brand new for a 15-year event. /gallery is empty. The homepage hero has no photography. No photos = no emotional resonance = harder to convert sponsors and registrations.

**Acceptance criteria:**
- Storage bucket `photos` has a folder structure of `{year}/` (e.g. `2024/`, `2023/`). Flux documents the naming convention in a comment in the seed script.
- A seed/upload script (TypeScript, run manually with `npx tsx`) accepts a local directory of photos and inserts them into `photos` table with `status = 'approved'`, `year`, and correct `storage_path`. Builder writes this as a one-time utility — not a production route.
- /gallery shows at least one past-year photo grid (e.g. "2024 Tournament"). Empty-state renders correctly if no photos for current year yet.
- Homepage hero section includes one featured past-event photo as a background or inset image. Photo is served via `next/image` (requires Issue 2 to be merged first — this issue depends on #2).
- `tsc --noEmit` passes.

**Files affected:**
- `scripts/seed-photos.ts` (new)
- `src/app/(public)/gallery/page.tsx` (modify — add year grouping)
- `src/app/(public)/gallery/gallery-grid.tsx` (modify — year group display)
- `src/app/(public)/page.tsx` (modify — hero photo)

**Parallelism:** Blocked on Scott providing photos. Also depends on Issue 2 (next.config.ts) being merged before homepage hero photo will render correctly in production. Can be developed in parallel with Issue 2, but staging verification requires Issue 2 to land first.

---

## Execution Order

```
Phase 1 (all parallel — zero file overlap):
  Issue 1  [Security/Flux+Spec]  — migrations + RLS test
  Issue 2  [Config/Flux]         — next.config.ts
  Issue 3  [Bolt]                — Register page
  Issue 4  [Bolt]                — Sponsorships page (serial after #3 if shared component)
  Issue 5  [Bolt]                — Donate page

Phase 2 (after Issue 2 merges AND Scott provides photos):
  Issue 6  [Flux+Bolt]           — Photo ingestion + hero
```

**Watchdog review is required on every PR before merge. No exceptions.**

Recommended merge order to minimize risk:
1. Issue 1 (security fix — ship it first, standalone migration)
2. Issue 2 (config fix — unblocks image rendering)
3. Issues 3, 4, 5 (can merge in any order, no shared files unless Bolt shares a component)
4. Issue 6 (after 2 is merged and photos are available)

**Conflict zones:**
- Issues 3 and 4 may share a `prospect-capture-form.tsx` component if Bolt extracts one. If so: merge Issue 3 first, Issue 4 picks up the component from main. Bolt decides at build time.
- Issue 6 touches `page.tsx` (homepage) — no other issue touches that file.

---

## Definition of Done

For each issue:
- PR opened against `main` by builder
- Watchdog review submitted and approved (not just "looks good" comment — formal GitHub review approval from forge-watchdog)
- CI passes (tsc, vitest, Playwright smoke)
- PR merged by Forge
- Staging deploy confirmed green (auto-deploys on merge to main via deploy.yml)
- Scott sanity-checks on Vercel staging URL and gives a thumbs up

Sprint is complete when all 6 issues meet the above criteria AND Scott has reviewed staging.

---

## Risks

1. **Scott photo availability (Issue 6).** This is the only external dependency in the sprint. If photos aren't ready, Issue 6 slips to Sprint 2 — the rest of the sprint is unblocked.

2. **Shared component conflict (Issues 3 + 4).** If Bolt builds Issues 3 and 4 in parallel and both extract a `prospect-capture-form.tsx`, there will be a merge conflict. Mitigation: assign both to the same builder, or run them serial (3 then 4).

3. **`registration_fee_cents` migration in Issue 3.** Scott confirmed the fee should be admin-editable, so Issue 3 includes a small migration + admin form change. Flux/Bolt should run `supabase db diff` before opening the PR to confirm only this one column is added.

4. **Staging Supabase data.** Issues 3 and 4 require `contacts` table writes and `sponsorship_items` reads. If staging Supabase has no seed data, acceptance criteria for "items.length > 0" path can't be verified without seeding. Note this during Watchdog review.

5. **RLS migration on production.** Issue 1 is a security migration that affects the live `profiles` UPDATE policy. It must be tested against local Supabase stack before staging deploy. Flux should run `supabase db diff` and confirm no unintended policy drift before opening the PR.
