# Craven Cancer Classic — Lessons Learned

Codebase-specific patterns, rules, and gotchas. Read this before every task in this repo.

These were re-homed from Forge auto-memory on 2026-05-01 because the lessons are craven-specific and don't apply to coach or other projects. Each rule cites its originating sprint.

---

## Rule: Admin Server Actions Need requireAdmin

Every server action created under `src/app/admin/**` must call `await requireAdmin()` (imported from `@/lib/supabase/admin`) as its very first statement, before `createClient()` or any DB query.

**Why:** Middleware at `src/lib/supabase/middleware.ts` only checks authentication (logged-in vs. logged-out). It does NOT check admin role. Role enforcement lives per-action in `requireAdmin()`, which verifies `profile.role === "admin"` and redirects unauthenticated/non-admin callers to login. An action without `requireAdmin()` leaks data (counts, rows, aggregates) to any authenticated user who calls it directly.

**How to apply:**
- When adding a new server action in `src/app/admin/**`, include `await requireAdmin()` as the first statement. Grep existing admin actions (`grep -rn 'requireAdmin' src/app/admin/`) to confirm the pattern.
- Code review must verify `requireAdmin()` is present and positioned first on any new admin action.
- This rule applies to read-only actions too. The S16 `getDashboardStats` near-miss was a read-only counts action that leaked revenue + contact counts before the fix.

**Reference:** Sprint 16 PR #190 near-miss. Watchdog REQUEST_CHANGES caught it, one-cycle fix via PR commit `66d74c8`.

---

## Rule: No native browser UI in the app

Never use `window.confirm()`, `window.alert()`, `window.prompt()`, or native HTML `<select>` elements in production code. Always use styled components (shadcn Dialog, shadcn Select, or equivalent).

**Why:** Craven is positioned as a high-end product. Native browser dialogs and selects look cheap, break visual cohesion, and signal "prototype." Even for "small" confirmations like delete-this-sponsor, use a proper modal. Flagged during UAT on 2026-04-19 when reviewing `/admin/sponsors`.

**How to apply:**
- **Confirmations** (delete, destructive actions) → shadcn `<Dialog>` with custom styled buttons. Pattern: S10-5 DeleteTeamDialog.
- **Dropdowns / selects** → shadcn `<Select>`.
- **Multi-select** → shadcn `<DropdownMenu>` with checkbox items.
- **Alerts / notifications** → sonner `toast` (already wired in admin layout).
- **Prompts** → inline form or modal, never `prompt()`.

**Audit scope:** any `confirm(`, `alert(`, `prompt(`, or raw `<select>` in `src/` is a violation. Grep for these on every sprint review.

---

## Rule: Centered modal is the standard for admin CRUD edits

Centered modal — shadcn `<Dialog>` with `sm:max-w-[800px]` as the default width — is the standard pattern for admin CRUD create/edit experiences. Side drawers (shadcn `<Sheet>`) are retired. Inline forms remain banned.

**Why:** Side drawers don't fit the platforms admins actually use — laptops and tablets — where the expected pattern when opening a record to edit is a centered window in the middle of the screen. The drawer's right-side panel competes with the list behind it. Scott confirmed 2026-04-29 (during contacts multi-type planning) that the drawer pattern itself is the problem, not the size — widening doesn't fix the platform-fit issue. Earlier (2026-04-19) the drawer was canonized as a step up from inline forms; the new policy supersedes that.

**How to apply:**
- New admin CRUD edit forms: build as centered modal from day one. Default width `sm:max-w-[800px]`. Mobile: full-screen.
- Existing drawer-based admin forms: migrate to modal the next time the form is touched in regular work. Surgical, not a sweep.
- Reference implementation: `src/app/admin/contacts/contact-modal.tsx` + `contact-form.tsx`.
- Two-column rows for short fields (e.g. salutation/first/last on one row; city/state/zip on one row) when modal width allows.
- Modals are custom shadcn Dialog — never `window.confirm` / `alert` / `prompt`.

**Pages to migrate when next touched:**
- `/admin/sponsors` (was inline)
- `/admin/sponsorships`
- `/admin/scores`
- `/admin/teams` (already partially on modal — confirm and bring fully on)

---

## Rule: base-ui Select needs items prop for label resolution

When porting or adding any `<Select>` (shadcn wrapping `@base-ui/react/select`), the trigger's displayed label is NOT derived from `<SelectItem>` children. Without explicit configuration, `<SelectValue>` renders `String(value)` — broken for UUIDs and ugly for lowercase enums.

**Why:** Radix Select maps the selected value to the matching `<Select.Item>`'s `ItemText` children. base-ui does not. Verified by reading `@base-ui/react/select/value/SelectValue.js` — its fallback chain calls `resolveSelectedLabel(value, items, itemToStringLabel)`, which falls through to `stringifyAsLabel(value)` (= `String(value)`) when neither `items` nor `itemToStringLabel` is provided.

**How to apply:** every `<Select>` with a value whose display form differs from its literal value needs ONE of:

1. `items` on `<Select.Root>` (a `Record<value, label>` or array of `{value, label}`):
   ```tsx
   <Select
     value={x}
     onValueChange={setX}
     items={{ pending: "Pending", paid: "Paid", comped: "Comped" }}
   >
     <SelectTrigger><SelectValue /></SelectTrigger>
     <SelectContent>
       <SelectItem value="pending">Pending</SelectItem>
       ...
     </SelectContent>
   </Select>
   ```
2. `itemToStringLabel` function on `<Select.Root>`
3. `children` render function on `<Select.Value>`: `<SelectValue>{(v) => labelFor(v)}</SelectValue>`

Keep `<SelectItem>` children as-is — base-ui uses those for the dropdown list; `items` is only consulted for the trigger.

**When this matters most:** the value is a UUID, boolean-as-string, or any code that is not itself a human-readable label. When value and label happen to match (`<SelectItem value="Player">Player</SelectItem>`), the trigger renders correctly by accident.

**Reference:** Sprint 13 PR #176 shipped 5 new `<Select>` sites; all reviewers assumed Radix-style behavior. Scott caught the sponsor-list tier trigger displaying a UUID in live testing. Hotfix #177 added `items` to all 5 sites. Pre-existing sites (team-form session, contact-list filters, contact-form type) have the same pattern but with readable-enough values; separate P2 issue #178.

---

## Rule: Never user.type with long strings

Never use `await user.type(input, "x".repeat(N))` or similar character-by-character typing in tests where N is larger than about 50 characters.

**Why:** `user-event v14`'s `.type()` dispatches a full `keydown` / `keypress` / `input` / `keyup` event cycle per character, each going through React's synthetic event system and rerendering the component. On a 2001-character string this easily blows past the 5-second vitest default timeout under modest CPU contention. You'll see "fortunate passes" in isolation and deterministic failures in the full suite when many vitest workers run in parallel. This pattern broke two S17 tests on 2026-04-20, required hotfix PR #193, and masked as a "flaky test" instead of what it really was — a performance time bomb.

**How to apply:**
- For **boundary / length tests** (name too long, description over 2000 chars) use `fireEvent.change(input, { target: { value: "x".repeat(N) } })` — sets the value in one synchronous step. Follow with `fireEvent.blur(input)` to trigger the blur-time validator React's controlled input listens for.
- For **date input tests** (`user.type(dateInput, "2026-09-18")`) prefer `fireEvent.change(dateInput, { target: { value: "2026-09-18" } })` — sets the full ISO string atomically.
- Reserve `user.type` for tests where you specifically want to assert per-keystroke behavior: intermediate validation states, debounced-search timing, autocomplete-on-typing.
- **Code review check:** grep new tests for `user.type\(.*repeat\(.*\)` or `user.type\(.*".{50,}"\)`. Any match is a performance red flag.

Tests written this way are faster (under 1 second vs. several seconds), deterministic across CPU load, and assert the same React events (change + blur) that controlled form validators actually listen for.

---

## Rule: Program-language precision

When Craven copy references what donations or sponsorships fund, the canonical program list is **transportation, lodging, and medical equipment for cancer patients in active treatment.** This list lives on the donate page and is the source of truth.

**Why:** The placeholder copy on Sprint 22 sponsors-redesign PR #253 used "treatment" as a catch-all ("transportation, lodging, and treatment") which conflates the medical act with the logistical support that Carolina East Health Foundation actually funds. The Craven Cancer Classic doesn't pay for treatment — it pays for the things that surround treatment so patients can show up and not bankrupt themselves doing it. Saying "treatment" misrepresents both what the money does and the foundation relationship.

**How to apply:**
- Any Craven copy referencing program areas (donate CTAs, sponsor CTAs, masthead body, mission narrative, social copy) should pull from the donate-page program list, not paraphrase from memory.
- Acceptable phrasing: "transportation, lodging, and medical equipment", "transportation to treatment, lodging during extended care, medical equipment", or sub-selections of those three.
- "for cancer patients in active treatment" is the right qualifier when context allows — it specifies who, without claiming Craven funds the medical care.
- Copy review: flag if any copy implies Craven funds treatment itself.
