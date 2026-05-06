# Copy Spec: Admin Table Unification — Phase 1 Shared Primitives
**Owner:** Aria
**Status:** Aria-approved — ready-to-ship
**Pairs with:** `plans/2026-05-admin-table-unification-design.md` (PR #369) / `plans/2026-05-admin-table-unification-sprint.md` (PR #370)
**Scope:** Phase 1 shared-primitive strings only. Phase 2 (Sponsors modal section headers, delete-confirm body) and Phase 3 (per-surface modal sections, role-card titles, filter placeholders) have their own Aria gates and are explicitly out of scope here.

---

## 1. Voice + Tone

Admin copy leans efficient — admins are power users, not donors. They know the data model.

- Sentence case on everything. "Clear filters" not "Clear Filters." "Edit" not "Edit Record."
- State the condition plainly. "No contacts match your filters" beats "No results found."
- CTAs are verbs. "Clear filters." "Add contact." No leading plus signs, no trailing exclamation marks.
- Possessive for teams uses the captain's full name: "Scott Davenport's team." That's the team's identity per the craven invariant — not a stylistic choice.

---

## 2. Locked Strings by Surface

All strings below are locked for Phase 1. Bolt ships these verbatim per `feedback_design_preview_strings_locked.md`.

### 2a. Contacts

| Location | State | String | Intent |
|---|---|---|---|
| Empty state — filter active | "No contacts match your filters" | Title | Tell the admin the cause: filters, not absence of data |
| Empty state — filter active | "Clear filters" | CTA button label | Single action to recover |
| Empty state — no data | "No contacts yet" | Title | Confirm the surface is empty, not broken |
| Empty state — no data | "Add contact" | CTA button label | Direct action to populate |
| Row action — pencil button | `aria-label="Edit [First Last]"` | e.g. `aria-label="Edit Lynne Davenport"` | Unique screen-reader label per row |
| Row action — trash button | `aria-label="Delete [First Last]"` | e.g. `aria-label="Delete Lynne Davenport"` | Unique screen-reader label per row |
| Row checkbox | `aria-label="Select [First Last]"` | e.g. `aria-label="Select Lynne Davenport"` | Unique screen-reader label per row |
| Header checkbox | `aria-label="Select all"` | Static | Select / deselect all visible rows |

**Name interpolation rule — Contacts:** Use `contact.full_name`. If structured name fields are present (`first_name` + `last_name`), prefer the joined form. If neither is populated, fall back to `full_name`. If `full_name` is also null or empty, use `aria-label="Edit contact"` / `aria-label="Delete contact"` / `aria-label="Select contact"` as the graceful fallback.

---

### 2b. Teams

Team identity = captain's full name. The possessive form ("Scott Davenport's team") is the canonical team label per craven invariant `feedback_craven_team_display_rule.md`.

| Location | State | String | Intent |
|---|---|---|---|
| Empty state — filter active | "No teams match your filters" | Title | Cause is active filters, not data absence |
| Empty state — filter active | "Clear filters" | CTA button label | Single recovery action |
| Empty state — no data | "No teams yet" | Title | Confirms empty surface |
| Empty state — no data | "Add team" | CTA button label | Direct action |
| Row action — pencil button | `aria-label="Edit [Captain Full Name]'s team"` | e.g. `aria-label="Edit Scott Davenport's team"` | Possessive form — team identity is the captain |
| Row action — trash button | `aria-label="Delete [Captain Full Name]'s team"` | e.g. `aria-label="Delete Scott Davenport's team"` | Same possessive form |
| Row checkbox | `aria-label="Select [Captain Full Name]'s team"` | e.g. `aria-label="Select Scott Davenport's team"` | Same possessive form |
| Header checkbox | `aria-label="Select all"` | Static | Select / deselect all visible rows |

**Fallback — no captain:** If the team has no captain assigned, use `aria-label="Edit team"` / `aria-label="Delete team"` / `aria-label="Select team"`. Do not interpolate `(no captain)` into an aria-label — it is a visual placeholder only.

---

### 2c. Sponsors

| Location | State | String | Intent |
|---|---|---|---|
| Empty state — filter active | "No sponsors match your filters" | Title | Cause is active filters |
| Empty state — filter active | "Clear filters" | CTA button label | Single recovery action |
| Empty state — no data | "No sponsors yet" | Title | Empty surface confirmed |
| Empty state — no data | "Add sponsor" | CTA button label | Direct action |
| Row action — pencil button | `aria-label="Edit [Sponsor Name]"` | e.g. `aria-label="Edit Carolina East Health"` | Organization name, not a person name |
| Row action — trash button | `aria-label="Delete [Sponsor Name]"` | e.g. `aria-label="Delete Carolina East Health"` | Same |
| Row checkbox | `aria-label="Select [Sponsor Name]"` | e.g. `aria-label="Select Carolina East Health"` | Same |
| Header checkbox | `aria-label="Select all"` | Static | Select / deselect all visible rows |

**Fallback — no name:** `aria-label="Edit sponsor"` / `aria-label="Delete sponsor"` / `aria-label="Select sponsor"`.

---

### 2d. Sponsorships

"Sponsorship package" is the full entity name. In empty-state titles, use the shorter "sponsorship packages" — the full phrase reads naturally at sentence scale; the singular is load-bearing in CTA copy.

| Location | State | String | Intent |
|---|---|---|---|
| Empty state — filter active | "No sponsorship packages match your filters" | Title | Cause is active filters |
| Empty state — filter active | "Clear filters" | CTA button label | Single recovery action |
| Empty state — no data | "No sponsorship packages yet" | Title | Empty surface confirmed |
| Empty state — no data | "Add sponsorship package" | CTA button label | Direct action — full entity name for clarity |
| Row action — pencil button | `aria-label="Edit [Item Name]"` | e.g. `aria-label="Edit Champion package"` | Package name as listed |
| Row action — trash button | `aria-label="Delete [Item Name]"` | e.g. `aria-label="Delete Champion package"` | Same |
| Row checkbox | `aria-label="Select [Item Name]"` | e.g. `aria-label="Select Champion package"` | Same |
| Header checkbox | `aria-label="Select all"` | Static | Select / deselect all visible rows |

**Fallback — no item name:** `aria-label="Edit sponsorship package"` / `aria-label="Delete sponsorship package"` / `aria-label="Select sponsorship package"`.

---

### 2e. Photos

Photos is exempt from hover-only row controls (design D7). Moderation buttons (Approve / Reject / Delete) are always visible. The aria-label pattern still applies to those always-visible buttons.

| Location | State | String | Intent |
|---|---|---|---|
| Empty state — filter active | "No photos match your filters" | Title | Cause is active filters (status + year combined) |
| Empty state — filter active | "Clear filters" | CTA button label | Single recovery action |
| Empty state — no data | "No photos yet" | Title | Empty surface confirmed |
| Empty state — no data | "Add photo" | CTA button label | Direct action — though upload flow may differ; lock label here, wire in Phase 3 |
| Moderation button — approve | `aria-label="Approve photo from [Submitter Name]"` | e.g. `aria-label="Approve photo from Allan Haseley"` | Identifies which photo is being acted on |
| Moderation button — reject | `aria-label="Reject photo from [Submitter Name]"` | e.g. `aria-label="Reject photo from Allan Haseley"` | Same |
| Moderation button — delete | `aria-label="Delete photo from [Submitter Name]"` | e.g. `aria-label="Delete photo from Allan Haseley"` | Same |
| Row checkbox (if present) | `aria-label="Select photo from [Submitter Name]"` | e.g. `aria-label="Select photo from Allan Haseley"` | Consistent with moderation-button pattern |
| Header checkbox | `aria-label="Select all"` | Static | Select / deselect all visible rows |

**Fallback — no submitter name:** `aria-label="Approve photo"` / `aria-label="Reject photo"` / `aria-label="Delete photo"`.

---

## 3. Empty-State Copy Per Surface

Two variants per surface. Both are data-responsive: copy reflects the actual condition (filter active vs. data truly absent), per `feedback_coaching_copy_data_responsive.md`.

| Surface | Condition | Title | CTA |
|---|---|---|---|
| Contacts | Filter active | "No contacts match your filters" | "Clear filters" |
| Contacts | No data | "No contacts yet" | "Add contact" |
| Teams | Filter active | "No teams match your filters" | "Clear filters" |
| Teams | No data | "No teams yet" | "Add team" |
| Sponsors | Filter active | "No sponsors match your filters" | "Clear filters" |
| Sponsors | No data | "No sponsors yet" | "Add sponsor" |
| Sponsorships | Filter active | "No sponsorship packages match your filters" | "Clear filters" |
| Sponsorships | No data | "No sponsorship packages yet" | "Add sponsorship package" |
| Photos | Filter active | "No photos match your filters" | "Clear filters" |
| Photos | No data | "No photos yet" | "Add photo" |

**`<AdminEmptyState>` props that map to these strings:**

The component accepts `title`, `body` (optional), and `action` (optional). For Phase 1, `body` is not used in any of these states — the title is sufficient. `filterActive` prop (new in Phase 1 AC) drives which variant renders. Bolt maps:

- `filterActive={true}` → title = "No [entity] match your filters", action = "Clear filters" button
- `filterActive={false}` (or omitted on no-data path) → title = "No [entity] yet", action = "Add [entity]" button

---

## 4. PR-1C Inline-Create Titles (F-T9 Fix)

These are the form panel titles shown when an admin types a new name into a contact typeahead field and chooses to create a new contact inline. The title derives from `defaultTypes`.

| `defaultTypes` value | Inline-create panel title | Surface where triggered | Intent |
|---|---|---|---|
| `['player']` | "New Player" | Teams — Captain field, Player 2/3/4 fields | Make clear the contact being created will be typed as a player |
| `['sponsor']` | "New Sponsor Contact" | Sponsors — sponsor contacts field | Distinguish the contact from the sponsor organization itself |
| `[]` or omitted | "New Contact" | Any typeahead without a defaultTypes prop | Generic fallback; no type assumption |

**Voice check:** "New Player" and "New Contact" are consistent in register — two-word noun phrases, title case, no punctuation. "New Sponsor Contact" is three words but necessary: "New Sponsor" alone would be ambiguous with the organization record. The phrase is clear enough at grade 8.

**Consistency with the contact-create modal flow:** The existing "New Contact" button label in `contact-list.tsx` (line 471) uses that exact phrase. These inline-create titles are consistent with that established pattern. No drift.

---

## 5. "Clear filters" + "Add [entity]" — Exact Form and Reasoning

### "Clear filters"

Locked as: **"Clear filters"** (lowercase 'f').

Rejected alternatives:
- "Reset filters" — "reset" implies state destruction or a form submission. "Clear" implies a reversible removal of active constraints. Admin users will not wonder if "reset" touches their data.
- "Show all" — hides the mechanism. The admin knows they have filters active; telling them what the system will do (show all) rather than what they're doing (clearing filters) is less accurate.

The filter-bar link form (always-visible at the end of active filter chips) uses the same label: "Clear filters." Consistent across both surfaces — the empty-state CTA and the filter-bar link are the same action.

### "Add [entity]"

Locked as: **"Add [entity]"** — no leading plus sign, no "New" prefix in the CTA button.

Rejected alternatives:
- "+ Add [entity]" — the plus sign is redundant with the button affordance and adds noise in screen-reader announcements ("plus Add contact").
- "New [entity]" — "New" is reserved for inline-create panel titles (§4 above) where Bolt needs to distinguish from the typeahead's existing-record suggestion list. In the empty-state CTA, "Add" is the right verb because the admin is adding to the surface, not creating a new type of thing. The distinction is worth holding.

---

## 6. Edge Cases

### Long names in aria-labels

**Rule:** No truncation in aria-labels. Screen readers do not have a viewport; truncation in a visual label is meaningless and harmful in an accessibility attribute. Interpolate the full name.

Example: `aria-label="Select Lynne Davenport - Century 21 Zaytoun Raines"` is correct if that is the contact's full_name. The screen reader will read it in full. This is the correct behavior.

If the full_name field contains content that is not a person's name (a company name, a legacy import artifact), that is a data quality issue, not a copy issue. The aria-label reflects what the record says.

### Teams — possessive vs. bare captain name

**Confirmed possessive.** "Select Scott Davenport's team" is the locked form.

Rationale: the row represents a team, not a person. If the aria-label says "Edit Scott Davenport," a screen-reader user reasonably infers they are editing Scott Davenport's contact record — not his team. The possessive removes that ambiguity. This is consistent with how the visual UI will identify the team (captain's name as the team's display name per the craven invariant).

### Photos — always-visible moderation buttons

Confirmed: aria-labels apply consistently to the Approve / Reject / Delete moderation buttons that are always visible on the Photos surface (D7 design exemption). The hover-only rule does not apply to Photos, but the aria-label convention does. The "photo from [Submitter Name]" pattern identifies which photo each button acts on. This is the same problem solved by "Edit [item name]" on row-action buttons elsewhere — Photos just has a different button set and different item-identifier format.

### Empty state — Photos combined Year x Status filter

When both a year filter and a status filter are active and no photos match, the empty state renders: "No photos match your filters" / "Clear filters." The single string covers the combined-filter case — there is no need for a compound string ("No 2024 Pending photos match your filters"). The active-filter chips already enumerate what's active; the empty-state title names the consequence.

---

## 7. Out of Scope

The following strings are NOT covered by this spec. They require their own Aria gate before the corresponding phase's PRs open.

- **Phase 2:** Sponsors modal section headers (Identity / Linked contacts / Logo / Notes), delete-confirm body template, status tab labels (Active / Inactive / All), "Deleted sponsor" fallback display string.
- **Phase 3 — Contacts:** Role-card titles, modal section headers (Identity / Contact / Roles / Address / Notes), inline validation message, salutation options, filter placeholders, status tab labels (Subscribed / Unsubscribed).
- **Phase 3 — Teams:** Modal section headers (Roster / Payment), mark-paid button label, payment method options, delete-confirm body template, filter placeholders, status tab labels (Pending / Paid).
- **Phase 3 — Sponsorships:** Modal section headers (Item / Inventory), filter placeholder.
- **Phase 3 — Photos:** No new strings beyond Phase 1 coverage.
- **All phases:** "Download CSV" button label — already countersigned in the sprint plan; ships verbatim from that source. No re-gate needed per `feedback_builder_pr_create_auth.md` reuse-citation allowance.
- **Status tab universal labels:** "All" as a tab label — used on every surface. Covered here as implicit (it is a filter state, not a string that varies by surface). Bolt may ship "All" without a separate Aria gate.

---

## Countersignature

All strings in sections 2, 3, 4, and 5 above are approved. States enumerated: happy path (populated list), filter-active empty, no-data empty. Loading and offline states are not introduced by Phase 1 shared primitives — those are inherited from the surrounding page shell and are not new strings.

**Aria-approved. Phase 1 PRs (PR-1A, PR-1B, PR-1C) may proceed to Bolt.**
