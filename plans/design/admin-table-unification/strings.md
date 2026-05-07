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

---

## Phase 2 — Sponsors-specific strings

**Owner:** Aria
**Status:** Aria-approved — ready-to-ship
**Pairs with:** `plans/2026-05-admin-table-unification-design.md` (PR #369) § Axis 7, Axis 6, Axis 9
**Scope:** PR-2 (Sponsors drawer → modal). Does not modify Phase 1 sections above.

---

### A. Modal section headers

Per design doc D11 + Axis 7 — banded sections everywhere, even short forms. Sponsors modal has four sections.

| Location | String | Intent |
|---|---|---|
| `<ModalSection>` header — Name + Tier fields | "Identity" | Groups the two record-identification fields; matches Contacts modal convention (donor pattern) |
| `<ModalSection>` header — sponsor-contacts typeahead | "Linked contacts" | Names what the section contains: contacts linked to this sponsor organization. "Linked" is load-bearing — it distinguishes these from the contacts index, which holds all contacts. "Contacts" alone would be ambiguous. |
| `<ModalSection>` header — logo upload + preview | "Logo" | Single word, sufficient. No need for "Logo upload" — the section contains only the logo field; the label adds nothing. Consistent register with "Identity" and "Notes." |
| `<ModalSection>` header — notes textarea | "Notes" | Single word. Consistent with Phase 3 planning for all modal notes sections. |

**Voice note — why "Linked contacts" not "Contacts":** The Sponsors form contains a `ContactTypeaheadMulti` with `defaultTypes={['sponsor']}`. The section names what the admin is managing: a linking relationship between this sponsor org and its representative contacts. "Contacts" alone would collide mentally with the Contacts list surface. "Linked contacts" is two words and earns both of them.

---

### B. Status tabs

Per design doc D5 + Axis 6 — status tabs replace the current `is_active` toggle on the Sponsors list. The "All" tab label is pre-approved in Phase 1 (§7 Out of Scope note) and ships without re-gate.

| Location | State | String | Intent |
|---|---|---|---|
| `<StatusTabs>` — Sponsors list | Active sponsors visible | "Active" | Filters to `is_active = true` rows. Sentence case. Single word. |
| `<StatusTabs>` — Sponsors list | Inactive sponsors visible | "Inactive" | Filters to `is_active = false` rows. Sentence case. Single word. |
| `<StatusTabs>` — Sponsors list | All sponsors visible | "All" | Pre-approved Phase 1. Cited here for completeness. |

**Tab count format:** Each tab label renders with an inline count: "Active 12", "Inactive 3", "All 15". The count format is a Phase 1 primitive (design doc Axis 6 example: "All 375 / Subscribed 312 / Unsubscribed 63"). The count rendering is Bolt's wiring concern; the tab label strings are the Aria gate concern. Both are now locked.

---

### C. Delete-confirm dialog

Per design doc D4c + Axis 9 — delete dialogs name linked records and predict the aftermath. The Sponsors delete-confirm replaces the current plain-text `"This sponsor will be moved to Trash. You can restore from Admin → Trash."` in `sponsor-drawer.tsx`.

The soft-delete invariant applies: the action moves the record to Trash, it does not destroy it. Copy never says "deleted" for the action — it says "moves to Trash."

#### C1. Sponsor has N linked sponsorship_purchases (N ≥ 2)

**Dialog title:** `"Delete [Sponsor Name]?"`
(Interpolate `sponsor.name`. This is the existing pattern from `sponsor-drawer.tsx` line 188 — locked as-is.)

**Dialog body (plural — N ≥ 2):**
```
[N] sponsorship purchases reference this sponsor. Moving [Sponsor Name] to Trash keeps those records intact — they'll display "Deleted sponsor" where the name appeared.
```

Example rendered: "3 sponsorship purchases reference this sponsor. Moving Carolina East Health to Trash keeps those records intact — they'll display 'Deleted sponsor' where the name appeared."

**Dialog body (singular — N = 1):**
```
1 sponsorship purchase references this sponsor. Moving [Sponsor Name] to Trash keeps that record intact — it'll display "Deleted sponsor" where the name appeared.
```

Note: "references" (not "reference") for singular. "that record" / "it'll" for singular. The grammar changes are not optional — Bolt must use the correct plural/singular form based on the fetched count.

**Destructive button label:** "Move to Trash"
(Sentence case. Matches the soft-delete invariant. The existing drawer used "Delete" — that is superseded by this gate. The new modal ships "Move to Trash.")

**Cancel button label:** "Cancel"

#### C2. Sponsor has 0 linked sponsorship_purchases

When the fetch returns 0 linked records, the dialog body simplifies — no cascade to name, no aftermath to predict.

**Dialog body (zero linked records):**
```
Moving [Sponsor Name] to Trash removes it from the active list. You can restore it from Admin → Trash.
```

Example rendered: "Moving Carolina East Health to Trash removes it from the active list. You can restore it from Admin → Trash."

**Destructive button label:** "Move to Trash"
**Cancel button label:** "Cancel"

#### C3. Names-or-count decision (addressed explicitly)

The sprint plan cited the F-N23 "names + count" pattern (Sponsorships delete-confirm lists names up to N, then "+1 more"). For Sponsors, the linked entity is `sponsorship_purchases` — these are purchase transactions, not named entities with meaningful display names. Listing purchase IDs or line items is noise to the admin; the count is what matters. Phase 2 uses count-only for the Sponsors delete-confirm.

Phase 3 Sponsorships delete-confirm (where the linked entities ARE named sponsors) uses the names + count pattern. That gate is Phase 3's scope.

#### C4. Implementation note for Bolt

The delete-confirm requires a prefetch of `sponsorship_purchases` count by `sponsor_id` before the dialog renders. The server action at `actions.ts` currently calls `softDelete` without fetching linked records. Bolt must add a count-fetch step (SELECT COUNT(*) WHERE sponsor_id = $id) either in a new server action or as a prop passed from `sponsor-list.tsx` when the trash icon is clicked.

---

### D. Fallback display string

When a `sponsorship_purchases` row has a `sponsor_id` that references a soft-deleted sponsor, the UI must display a fallback in place of the sponsor name.

| Location | String | Intent |
|---|---|---|
| Any UI cell / field displaying a deleted sponsor's name | "Deleted sponsor" | Names the condition plainly — the record existed, was moved to Trash, and is no longer active. Italic rendering is Bolt's choice (styling is not copy). |

**Tone note:** "Deleted sponsor" uses "deleted" as an adjective describing the record's state from the user's perspective (it was deleted from the active list), not the soft-delete action itself. The action says "moves to Trash." The fallback label describes what the admin sees: a sponsor that has been deleted. These are consistent under the soft-delete invariant — they describe different moments.

**No alternatives:** "Unknown sponsor," "Removed sponsor," "(sponsor not found)" — all rejected. "Unknown" implies a data error, not a deliberate deletion. "Removed" is vaguer than "deleted." "(sponsor not found)" suggests a bug, which is alarming and incorrect.

---

### E. Out of scope — explicit

The following strings are NOT covered by this Phase 2 gate. They require their own Aria gate before the corresponding phase's PRs open.

- **Phase 3 — Contacts:** Role-card titles, modal section headers (Identity / Contact / Roles / Address / Notes), inline validation message, salutation options, filter placeholders, status tab labels (Subscribed / Unsubscribed), delete-confirm linked-record template.
- **Phase 3 — Teams:** Modal section headers (Roster / Payment), mark-paid button label, payment method options, delete-confirm body template, filter placeholders, status tab labels (Pending / Paid).
- **Phase 3 — Sponsorships:** Modal section headers (Item / Inventory), delete-confirm body template (names + count pattern — Phase 3 scope), filter placeholder.
- **Phase 3 — Photos:** No new strings beyond Phase 1 coverage.
- **Phase 4 — CSV export:** "Download CSV" button label already countersigned in the sprint plan; ships verbatim from that source.

---

### Phase 2 — State enumeration

States enumerated per HARD-GATE requirement:

- **Happy path (list populated, sponsor edited):** Modal section headers A1–A4, status tabs B1–B2, form save flow. All strings locked above.
- **Empty state (no data / filter active):** Covered in Phase 1 (§2c + §3). Not re-gated here — citation: Phase 1 Aria-approved PR #372.
- **Loading:** The existing "Loading contacts…" string in `sponsor-drawer.tsx` (line 163) moves to `sponsor-modal.tsx` verbatim. No new string. Not re-gated.
- **Error / degraded:** Toast messages "Sponsor created" / "Sponsor updated" / "Sponsor moved to Trash" are existing strings in `sponsor-drawer.tsx` lines 115–116, 133. These carry over verbatim to the new modal. Not re-gated. File-upload error "File too large (max 5MB)" is an existing string in `sponsor-form.tsx` line 88 — carries over verbatim. Inline validation "Sponsor name is required" (`sponsor-form.tsx` line 103) — carries over verbatim.
- **Delete-confirm (0 linked records):** C2 above.
- **Delete-confirm (1 linked record):** C1 singular above.
- **Delete-confirm (N ≥ 2 linked records):** C1 plural above.
- **Offline:** No offline-specific copy introduced by Phase 2. Network errors surface via existing toast infrastructure — not new strings.
- **Partial (contacts load fails):** The fail-open comment at `sponsor-drawer.tsx` line 65 describes the pattern ("fail-open — show form with empty contacts rather than stuck on loading"). No user-visible string needed for this path — the form renders with empty contacts silently. No new string.
- **Fallback (orphaned reference):** D above.

---

### Phase 2 — Countersignature

All strings in sections A, B, C, and D above are approved. Every state enumerated. Every string has an explicit intent.

**Aria-approved. PR-2 (Sponsors drawer → modal) may proceed to Bolt.**

---

## Phase 3 — Per-surface cascade strings

**Owner:** Aria
**Status:** Aria-approved — ready-to-ship
**Pairs with:** `plans/2026-05-admin-table-unification-design.md` (PR #369) / `plans/2026-05-admin-table-unification-sprint.md` (PR #370) §3 Phase 3 lines 235–422
**Scope:** PR-3-contacts, PR-3-teams, PR-3-sponsorships, PR-3-photos. Does not modify Phase 1 or Phase 2 sections above.
**Provenance:** Phase 1 PR #372 (shared primitives) + Phase 2 PR #378 (Sponsors modal) are the tone + format reference.

---

### A. Contacts (PR-3-contacts)

#### A1. Modal section headers

Per design doc D11 — banded `<ModalSection>` applied to the Contacts modal. Five sections.

| Location | String | Intent |
|---|---|---|
| `<ModalSection>` header — Salutation + First + Last + Company fields | "Identity" | Groups the record-identification fields. Consistent with Sponsors modal "Identity" (Phase 2). One word, sufficient. |
| `<ModalSection>` header — Email + Phone fields | "Contact" | Names the means of reaching this person. Single word. Does not collide with the Contacts surface name because it appears inside the modal, not as a nav label. |
| `<ModalSection>` header — Role-card toggles | "Roles" | Names what the admin is managing: this person's roles in the tournament. Plural because a contact may have more than one. |
| `<ModalSection>` header — Address fields | "Address" | Single word. No ambiguity. |
| `<ModalSection>` header — Notes textarea | "Notes" | Single word. Consistent with Sponsors modal "Notes" (Phase 2). |

**Voice note — why "Contact" not "Contact info" or "Contact details":** The section header is a label, not a sentence. "Contact" names the category. "Contact info" adds a word that the layout already communicates — these are contact fields. One word wins.

---

#### A2. Role card titles

Per design doc D12 — role-cards replace the checkbox-based type controls. Five cards, always visible, each with a toggle. Selected cards expand inline.

| Location | String | Intent |
|---|---|---|
| Role card — player type | "Player" | Names the role. Noun-singular, sentence case. Consistent with existing `TYPE_LABELS` in `contact-form.tsx` line 56–61. |
| Role card — sponsor type | "Sponsor" | Names the role. |
| Role card — donor type | "Donor" | Names the role. |
| Role card — volunteer type | "Volunteer" | Names the role. |
| Role card — other type | "Other" | Names the catch-all role. |

**Consistency note:** These five strings already exist in `contact-form.tsx` `TYPE_LABELS` (lines 56–61). Bolt is not introducing new strings — Bolt is applying them to the new card component shape. The labels are locked here for completeness and to formally countersign the card-based rendering.

---

#### A3. Inline validation message (F19)

Per sprint plan F19 (P2) — shown under the Roles section when `types.length === 0` and the admin attempts to save.

| Location | State | String | Intent |
|---|---|---|---|
| `contact-form.tsx` — below Roles `<ModalSection>` | Roles section, zero types selected, save attempted | "At least one role is required to save." | Tells the admin the exact condition preventing save — no role selected. Full sentence, ends with period. No exclamation. Grade 8. |

**Why a full sentence here:** This is an inline error message, not a label. Error messages are sentences. The period is load-bearing — it signals finality (the form will not save until resolved). Consistent with existing inline error patterns in `contact-form.tsx` (e.g., "Provide a first/last name or company name", line 197; "Invalid email format", line 162 — though those omit periods, this one is longer and benefits from the sentence-close).

**States this message covers:** only renders when save is attempted with `types.length === 0`. It does not render on initial open or while the admin is filling fields before attempting to save. No separate loading or error variant needed for this message.

---

#### A4. Status tabs

Per design doc D5 + Axis 6 — status tabs on the Contacts list. "All" pre-approved Phase 1.

| Location | State | String | Intent |
|---|---|---|---|
| `<StatusTabs>` — Contacts list | Subscribed contacts visible | "Subscribed" | Filters to `marketing_consent = true` rows. Sentence case. |
| `<StatusTabs>` — Contacts list | Unsubscribed contacts visible | "Unsubscribed" | Filters to `marketing_consent = false` rows. Sentence case. |
| `<StatusTabs>` — Contacts list | All contacts visible | "All" | Pre-approved Phase 1. Cited for completeness. |

**Tab count format:** Inherits Phase 1 / Phase 2 pattern — each tab renders with an inline count. Bolt's wiring concern; label strings are the Aria gate concern.

---

#### A5. Search placeholder

Per sprint plan F9.a — search across name, email, phone, and company.

| Location | String | Intent |
|---|---|---|
| Search input — Contacts filter bar | "Search by name, email, phone, or company" | Enumerates searchable fields so the admin knows what to type. Oxford comma is correct here — four items. |

**Why enumerate all four fields:** The admin may not know the person's name (looking up by email or company). Listing all four fields removes the guesswork. The string is 44 characters — slightly long for a placeholder, but it earns every word. Do not shorten to "Search contacts" — that hides the multi-field capability.

---

#### A6. Secondary filter labels

Per sprint plan F9.g — labeled Type and Team dropdowns in the filter bar.

| Location | String | Intent |
|---|---|---|
| Secondary filter dropdown label — contact type | "Type" | Names the filter dimension. Single word. Consistent with the admin-efficient voice: the admin knows what "Type" means on the Contacts surface. |
| Secondary filter dropdown label — team assignment | "Team" | Names the filter dimension. Single word. |

**Dropdown option labels for Type filter:** The options in the Type dropdown are the five role labels: "Player", "Sponsor", "Donor", "Volunteer", "Other" — already locked in A2 above. Bolt uses these verbatim. No additional Aria gate needed for the dropdown options themselves.

---

#### A7. Boolean toggle

Per sprint plan — Captains only filter toggle in the filter bar.

| Location | String | Intent |
|---|---|---|
| Boolean toggle — filter bar | "Captains only" | Filters to contacts who are team captains. Two words. Sentence case. No punctuation. Communicates the filter's effect, not the mechanism. |

---

#### A8. Salutation options

Per sprint plan F15 — replace salutation free-text with a `<Select>`. Six locked options plus the blank/unset option.

| Location | String | Intent |
|---|---|---|
| `<Select>` option — salutation | "Mr." | Standard honorific. Trailing period is part of the abbreviation, not sentence punctuation. |
| `<Select>` option — salutation | "Mrs." | Standard honorific. |
| `<Select>` option — salutation | "Ms." | Standard honorific. |
| `<Select>` option — salutation | "Mx." | Gender-neutral honorific. Trailing period is part of the abbreviation. |
| `<Select>` option — salutation | "Dr." | Professional honorific. |
| `<Select>` option — salutation | "Miss" | Standard honorific. No trailing period — "Miss" is not an abbreviation. |

**Blank/unset option:** The `<Select>` should include a blank option representing "no salutation." The blank option has no visible label — it renders as an empty `<SelectItem>` or placeholder text. Bolt wires the blank option; no string needed from Aria (the absence of a salutation is not a string, it's a null value).

**Order:** Mr. / Mrs. / Ms. / Mx. / Dr. / Miss — most common first, gender-neutral before professional. Mx. is included because the contact database may serve a wide range of tournament participants.

---

#### A9. Contacts — state enumeration

States enumerated per HARD-GATE requirement:

- **Happy path (list populated, contact edited):** Modal section headers A1 (5 headers), role cards A2 (5 titles), status tabs A4 (Subscribed/Unsubscribed), search placeholder A5, filter labels A6 (Type/Team), toggle A7, salutation options A8 (6 options). All strings locked above.
- **Empty state (no data / filter active):** Covered in Phase 1 (§2a + §3). Not re-gated here — citation: Phase 1 Aria-approved PR #372.
- **Loading:** No new loading strings introduced by Phase 3 Contacts. Inherits existing loading infrastructure.
- **Error / degraded:** Toast messages "Contact created" / "Contact updated" / "Contact moved to Trash" are existing strings in the contact action layer. Not new strings — carry over verbatim. Not re-gated.
- **Inline validation — zero roles:** A3 above. Renders only on save-attempt with `types.length === 0`.
- **Inline validation — identity:** "Provide a first/last name or company name" — existing string in `contact-form.tsx` line 197. Not a new string. Not re-gated.
- **Offline:** No offline-specific copy introduced. Network errors surface via existing toast infrastructure.
- **Partial:** No partial-render copy needed for this surface. Form renders with available data.

---

### B. Teams (PR-3-teams)

#### B1. Status tabs

Per design doc D5 + Axis 6 — status tabs on the Teams list. "All" pre-approved Phase 1.

| Location | State | String | Intent |
|---|---|---|---|
| `<StatusTabs>` — Teams list | Pending-payment teams visible | "Pending" | Filters to `payment_status = 'pending'` rows. Sentence case. Single word. |
| `<StatusTabs>` — Teams list | Paid teams visible | "Paid" | Filters to `payment_status = 'paid'` rows. Sentence case. Single word. |
| `<StatusTabs>` — Teams list | All teams visible | "All" | Pre-approved Phase 1. Cited for completeness. |

---

#### B2. Modal section headers

Per design doc D11 — banded `<ModalSection>` applied to the Teams modal. Two sections.

| Location | String | Intent |
|---|---|---|
| `<ModalSection>` header — Session + Captain + Players 2–4 fields | "Roster" | Groups the team composition fields. "Roster" names the concept precisely — who is on the team. |
| `<ModalSection>` header — Payment status + Amount paid + Payment method + Reference number + Date paid fields | "Payment" | Groups all payment-related fields. Single word, sufficient. |

**Voice note — why "Roster" not "Team members" or "Players":** "Roster" is the conventional term for a team's composition in tournament administration. The admin is a tournament organizer; this register is appropriate. It's also shorter and cleaner than "Team members."

---

#### B3. Secondary filter label

Per sprint plan — Session filter dropdown on the Teams list.

| Location | String | Intent |
|---|---|---|
| Secondary filter dropdown label — session | "Session" | Names the filter dimension. Single word. The admin knows "Session" = Morning / Afternoon on this surface. |

**Dropdown option labels for Session filter:** "Morning" and "Afternoon" — already rendered in `team-form.tsx` line 119–127. No new Aria gate needed. Bolt uses these verbatim.

---

#### B4. Search placeholder

Per sprint plan — search by captain name on the Teams list.

| Location | String | Intent |
|---|---|---|
| Search input — Teams filter bar | "Search by captain name" | Tells the admin what field is searched. Captain name is the team's identity on this surface (craven invariant). |

**Why not "Search teams":** The admin needs to know the field searched. Since team identity = captain name, naming the field ("captain name") is both accurate and consistent with the craven invariant.

---

#### B5. Mark-paid button

Per sprint plan — hover-row labeled button, visible only when `payment_status = 'pending'`.

| Location | State | String | Intent |
|---|---|---|---|
| Hover-row labeled button — Teams list | Row has `payment_status = 'pending'` | "Mark paid" | Verb phrase. Names the action precisely. Two words, sentence case, no punctuation. Replaces always-visible payment button. |

**State note:** This button only renders when `payment_status = 'pending'`. It does not render for paid teams. No separate string needed for the paid state — the row's status badge handles that visual feedback.

---

#### B6. Mark-paid modal — field labels and options

Per sprint plan F-T8 — the "Mark paid" action opens a modal to capture payment method details before writing the record.

**Field labels:**

| Location | String | Intent |
|---|---|---|
| Mark-paid modal field label | "Payment method" | Labels the required dropdown. Two words, sentence case. Names the concept precisely. |
| Mark-paid modal optional field label | "Reference number" | Labels the optional text field for check numbers, Venmo transaction IDs, etc. Two words, sentence case. |
| Mark-paid modal optional field label | "Date paid" | Labels the optional date field. Two words, sentence case. "Date paid" is the event (when payment occurred), not "Payment date" (which sounds like a due date). |

**Payment method `<Select>` options:**

| String | Intent |
|---|---|
| "Check" | Physical check payment. Sentence case — generic payment type. |
| "Cash" | Cash payment. Sentence case — generic payment type. |
| "Venmo" | Venmo peer-to-peer payment. Proper noun — capitalize. |
| "Zelle" | Zelle peer-to-peer payment. Proper noun — capitalize. |
| "Wire" | Wire transfer. Sentence case — generic payment type. |
| "Comped" | Complimentary registration — no payment collected. Sentence case. "Comped" is standard admin shorthand for "complimentary." |
| "Stripe" | Stripe online payment (typically auto-set by webhook). Proper noun — capitalize. |
| "Other" | Catch-all for payment methods not listed. Sentence case. |

**Option order:** Check / Cash / Venmo / Zelle / Wire / Comped / Stripe / Other — most common manual-entry methods first, auto-set method (Stripe) near the end, catch-all last.

**"Comped" note:** The admin is a power user who knows this term. "Complimentary" is more formal but longer; "Comped" is standard in event administration. Consistent with admin-efficient voice.

**Stripe auto-set note:** The sprint plan specifies that the Stripe webhook auto-sets `payment_method = 'stripe'` on successful team payment (sprint plan line 339). Bolt should render "Stripe" in the dropdown for those records. The string is locked here.

---

#### B7. Teams delete-confirm dialog

Per sprint plan + design doc D4c + Axis 9 — delete confirms name linked records and predict the aftermath. The Teams delete-confirm must enumerate team members (by name + count) and linked player score records (by count).

The soft-delete invariant applies: action moves the team to Trash.

**Dialog title (all variants):** `"Delete [Captain Full Name]'s team?"`

(Interpolate captain's full name. Possessive form per craven team-identity invariant. Example: "Delete Scott Davenport's team?")

**Fallback title — no captain:** `"Delete this team?"`

---

**Variant 1 — Zero members, zero score records:**

```
Moving this team to Trash removes it from the active list. You can restore it from Admin → Trash.
```

Intent: Confirm the consequence without alarming. No cascade to name. Matches the Sponsors Phase 2 zero-linked-records pattern (C2 above).

---

**Variant 2 — Has members, zero score records:**

Singular (1 member):
```
1 member is on this team: [Full Name]. Moving this team to Trash keeps that record intact.
```

Plural (N ≥ 2 members):
```
[N] members are on this team: [Name 1], [Name 2][, … and N more]. Moving this team to Trash keeps those records intact.
```

Name display rule: show up to 3 names, then "+ [N] more" for the remainder. Example with 5 members:
```
5 members are on this team: Allan Haseley, Jane Smith, Bob Jones, and 2 more. Moving this team to Trash keeps those records intact.
```

Intent: Name the linked people so the admin can verify they're deleting the right team. "Keeps those records intact" — the member contact records are not deleted, only the team association is trashed.

---

**Variant 3 — Zero members, has score records:**

Singular (1 score record):
```
1 player score record is linked to this team. Moving this team to Trash keeps that record intact — it will display "(no team)" where the team name appeared.
```

Plural (N ≥ 2 score records):
```
[N] player score records are linked to this team. Moving this team to Trash keeps those records intact — they will display "(no team)" where the team name appeared.
```

Intent: Warn the admin about orphaned score records. "(no team)" is the locked fallback display string for orphaned score records — lock it here explicitly (see B8 below).

---

**Variant 4 — Has members AND has score records:**

```
[N] members are on this team: [Name 1], [Name 2][, … and N more]. [M] player score records are linked. Moving this team to Trash keeps all records intact — score records will display "(no team)" where the team name appeared.
```

Example:
```
3 members are on this team: Allan Haseley, Jane Smith, Bob Jones. 12 player score records are linked. Moving this team to Trash keeps all records intact — score records will display "(no team)" where the team name appeared.
```

Intent: Enumerate both link types concisely. "Keeps all records intact" covers both member contacts and score records in one phrase.

---

**Destructive button label (all variants):** "Move to Trash"
**Cancel button label (all variants):** "Cancel"

**Grammar rules for Bolt:**
- "member is" / "member are" — singular/plural based on fetched member count
- "that record" / "those records" — singular/plural
- "it will" / "they will" — singular/plural
- Member name list: up to 3 names shown; remainder as "+ [N] more" (not "and [N] more" — the Oxford comma variant "Name 1, Name 2, and [N] more" is also acceptable if Bolt's list-builder already produces it; do not change a working implementation to match a preference)

---

#### B8. Teams — fallback display string for orphaned score records

When a player score record has a `team_id` that references a soft-deleted team, the UI must display a fallback.

| Location | String | Intent |
|---|---|---|
| Any UI cell / field displaying a deleted team's name | "(no team)" | Names the condition plainly — the team was moved to Trash, and the score record is now orphaned. Parentheses signal a system-generated placeholder, not a data value. Lowercase. |

**Tone note:** "(no team)" follows the existing craven convention for structural placeholders (compare: "(no captain)" for teams without an assigned captain). Consistent register.

---

#### B9. CSV export button

| Location | String | Intent |
|---|---|---|
| Teams list toolbar | "Download CSV" | Names the action precisely. Two words, sentence case. Consistent across all surfaces (Sponsorships, Photos, Teams). |

---

#### B10. Teams — state enumeration

States enumerated per HARD-GATE requirement:

- **Happy path (list populated, team edited, payment marked):** Status tabs B1 (Pending/Paid), modal section headers B2 (Roster/Payment), filter label B3 (Session), search placeholder B4, mark-paid button B5, mark-paid field labels B6, payment method options B6 (8 options), CSV button B9. All strings locked above.
- **Empty state (no data / filter active):** Covered in Phase 1 (§2b + §3). Not re-gated here — citation: Phase 1 Aria-approved PR #372.
- **Loading:** No new loading strings introduced. Inherits existing infrastructure.
- **Error / degraded:** Toast messages "Team created" / "Team updated" / "Team moved to Trash" — existing strings in the team action layer. Not new. Not re-gated. "An unexpected error occurred. Please try again." — existing in `team-form.tsx` line 107. Not re-gated.
- **Delete-confirm (0 members, 0 scores):** B7 Variant 1.
- **Delete-confirm (has members, 0 scores):** B7 Variant 2 (singular + plural).
- **Delete-confirm (0 members, has scores):** B7 Variant 3 (singular + plural).
- **Delete-confirm (has members + has scores):** B7 Variant 4.
- **Orphaned score record (team deleted):** B8 fallback display string.
- **Mark-paid modal:** B6 all field labels and all 8 payment method options.
- **Offline:** No offline-specific copy introduced. Network errors surface via existing toast infrastructure.

---

### C. Sponsorships (PR-3-sponsorships)

#### C1. Modal section headers

Per design doc D11 — banded `<ModalSection>` applied to the Sponsorships modal. Two sections.

| Location | String | Intent |
|---|---|---|
| `<ModalSection>` header — Name + Description + Price + Year fields | "Item" | Groups the package-definition fields. "Item" names the concept: what this sponsorship package is. Single word, sufficient for a power-user admin context. |
| `<ModalSection>` header — Max quantity + Active toggle fields | "Inventory" | Groups the availability fields. "Inventory" names the concept precisely — how many of this item can be sold and whether it's currently offered. |

**Voice note — why "Item" not "Package" or "Package details":** "Item" is the shortest accurate label for this section. "Package" would collide with the surface name ("sponsorship packages"). "Item" is the admin data model term — `sponsorship_items` is the table name. One word wins.

---

#### C2. Secondary filter label

Per sprint plan — Year filter dropdown on the Sponsorships list.

| Location | String | Intent |
|---|---|---|
| Secondary filter dropdown label — year | "Year" | Names the filter dimension. Single word. The admin knows "Year" = tournament year on this surface. |

**Dropdown option labels for Year filter:** Year values from `sponsorship_items.year` column — rendered as four-digit integers (e.g., "2024", "2025"). No additional Aria gate needed for the year values themselves; they are data, not copy.

**"All years" option:** If the Year filter `<Select>` includes an "all" option, the label is "All years". This is consistent with the pattern where a filter's catch-all option names the dimension ("All years" not just "All" — because "All" on its own is ambiguous when there are multiple filter dimensions active). If the design implements a blank/placeholder option instead of an explicit "All years" option, the placeholder text is "Year" (matching the filter label, indicating no year filter applied). Bolt chooses one implementation; this lock covers both label options.

---

#### C3. Search placeholder

Per sprint plan — search by name on the Sponsorships list.

| Location | String | Intent |
|---|---|---|
| Search input — Sponsorships filter bar | "Search by name" | Names the searchable field. Two words after "Search by." Short and sufficient for this surface. |

---

#### C4. Sponsorships delete-confirm dialog

Per design doc D4c + Axis 9. The Sponsorships delete-confirm uses the F-N23 names + count pattern — linked entities are named sponsors (meaningful display names), unlike the Sponsors delete-confirm where linked entities are anonymous purchase transactions.

**Critical flag — soft-delete discrepancy:** The current `sponsorship-manager.tsx` (lines 449–452 and lines 510–514) uses **permanent deletion** with the string "It will be permanently deleted — this cannot be undone." The sprint plan specifies soft-delete behavior (sprint plan PR-3-sponsorships scope). Before Bolt wires this PR, this discrepancy must be resolved: the existing code contradicts the soft-delete invariant. The locked copy below assumes soft-delete is the correct behavior per the sprint plan. If permanent delete is intentional for sponsorship packages, Bolt must surface this to Forge before proceeding — the copy and the action must agree.

**Assuming soft-delete (consistent with sprint plan and craven invariant):**

**Dialog title:** `"Delete [Item Name]?"`

(Interpolate `item.name`. Example: "Delete Champion package?")

---

**Variant 1 — Zero linked sponsors:**

```
Moving this package to Trash removes it from the active list. You can restore it from Admin → Trash.
```

Intent: Confirm the consequence without alarming. No cascade to name. Matches Sponsors Phase 2 C2 pattern.

---

**Variant 2 — Has linked sponsors (N ≥ 1):**

Singular (1 linked sponsor):
```
1 sponsor is linked to this package: [Sponsor Name]. Moving this package to Trash keeps that record intact — it will display "(no package)" where the package name appeared.
```

Plural (N ≥ 2, up to 3 names shown):
```
[N] sponsors are linked to this package: [Name 1], [Name 2][, … and N more]. Moving this package to Trash keeps those records intact — they will display "(no package)" where the package name appeared.
```

Example (4 linked sponsors):
```
4 sponsors are linked to this package: Carolina East Health, First Bancorp, Tidewater, and 1 more. Moving this package to Trash keeps those records intact — they will display "(no package)" where the package name appeared.
```

Intent: Name the linked sponsors (the F-N23 pattern) so the admin can verify. "(no package)" is the locked fallback display string for orphaned sponsor references — lock it here explicitly (see C5 below).

**Name display rule:** Same as Teams B7 — up to 3 names, then "+ [N] more" / "and [N] more."

---

**Destructive button label (all variants):** "Move to Trash"
**Cancel button label (all variants):** "Cancel"

**Note on existing code strings:** The existing `sponsorship-manager.tsx` lines 211–215 contain an existing `buildCascadeDescription` function that produces: `"[N] sponsors are linked to this package: [names]. They'll show '(no package)' until you reassign them."` This existing string uses a different form ("They'll show" vs "they will display", and adds "until you reassign them"). The locked copy above supersedes the existing string. Bolt replaces `buildCascadeDescription`'s output with the locked variants above for Phase 3.

---

#### C5. Sponsorships — fallback display string for orphaned sponsor references

When a sponsor record references a soft-deleted sponsorship package, the UI must display a fallback.

| Location | String | Intent |
|---|---|---|
| Any UI cell / field displaying a deleted package's name | "(no package)" | Names the condition plainly. Parentheses signal a system-generated placeholder. Lowercase. Consistent with "(no team)" pattern (Teams B8) and "(no captain)" craven invariant. |

**Note:** The existing code in `sponsorship-manager.tsx` line 214 already uses `'(no package)'`. This spec formally locks that string.

---

#### C6. CSV export button

| Location | String | Intent |
|---|---|---|
| Sponsorships list toolbar | "Download CSV" | Consistent with Teams B9 and Photos D2. |

---

#### C7. Sponsorships — state enumeration

States enumerated per HARD-GATE requirement:

- **Happy path (list populated, package edited):** Modal section headers C1 (Item/Inventory), filter label C2 (Year), search placeholder C3, CSV button C6. All strings locked above.
- **Empty state (no data / filter active):** Covered in Phase 1 (§2d + §3). Not re-gated here — citation: Phase 1 Aria-approved PR #372.
- **Loading:** No new loading strings introduced. Inherits existing infrastructure.
- **Error / degraded:** Toast message "Package deleted" — existing in `sponsorship-manager.tsx` line 471 and 521. Not re-gated (carries over). Toast for soft-delete will change to "Package moved to Trash" — that is a new string if soft-delete is implemented. **New string requiring lock:** "Package moved to Trash" (intent: confirm the soft-delete action; the package is recoverable from Admin → Trash). If permanent delete is retained, "Package deleted" continues as the existing locked string.
- **Delete-confirm (0 linked sponsors):** C4 Variant 1.
- **Delete-confirm (1 linked sponsor):** C4 Variant 2 singular.
- **Delete-confirm (N ≥ 2 linked sponsors):** C4 Variant 2 plural.
- **Orphaned sponsor reference (package deleted):** C5 fallback display string.
- **Offline:** No offline-specific copy introduced. Network errors surface via existing toast infrastructure.

---

### D. Photos (PR-3-photos)

#### D1. Secondary filter label

Per sprint plan — Year filter dropdown on the Photos list.

| Location | String | Intent |
|---|---|---|
| Secondary filter dropdown label — year | "Year" | Names the filter dimension. Single word. Consistent with Sponsorships C2 — the same filter dimension gets the same label across surfaces. |

**Dropdown option labels and "All years" / blank option:** Same rule as Sponsorships C2 — year values are data; "All years" is the explicit catch-all option label if one is needed; blank placeholder text is "Year" if no explicit catch-all is used. Bolt chooses one implementation.

---

#### D2. CSV export button

| Location | String | Intent |
|---|---|---|
| Photos list toolbar | "Download CSV" | Consistent with Teams B9 and Sponsorships C6. |

---

#### D3. Photos — state enumeration

States enumerated per HARD-GATE requirement:

- **Happy path (list populated, photos moderated):** Year filter label D1, CSV button D2. All strings locked above.
- **Empty state (no data / filter active):** Covered in Phase 1 (§2e + §3). Not re-gated here — citation: Phase 1 Aria-approved PR #372.
- **Loading:** No new loading strings introduced.
- **Error / degraded:** Toast messages for approve / reject / delete actions are existing strings. Not new. Not re-gated.
- **Filter-aware empty state (combined Year × Status filter):** Covered in Phase 1 §6 edge case. "No photos match your filters" / "Clear filters." Not re-gated.
- **Offline:** No offline-specific copy introduced.

---

### E. Cross-surface consistency — "Download CSV"

Per sprint plan Phase 4 note (lines 420–421): "No Aria gate needed: 'Download CSV' string was countersigned in Phase 3 Aria gates above." This section formally closes that loop.

| Surface | String | Consistent? |
|---|---|---|
| Teams | "Download CSV" | Yes |
| Sponsorships | "Download CSV" | Yes |
| Photos | "Download CSV" | Yes |

All three use identical label. Phase 4's `<DownloadCsvButton>` universal component ships this string without a separate gate — it is locked here and cited in Phase 4's PR body.

---

### F. Open questions — surfaces this spec does not resolve

These require Forge or Scott to decide before Bolt implements:

1. **Sponsorships — soft-delete vs. permanent delete:** The existing `sponsorship-manager.tsx` uses permanent deletion for sponsorship packages. The sprint plan implies soft-delete (consistent with the craven invariant). If permanent delete is intentional, the delete-confirm copy changes significantly (no "Move to Trash", no restore path). Bolt must not proceed on PR-3-sponsorships without a resolution on this point. **Forge surfaces this to Scott before spawning Bolt.**

2. **Teams toast — soft-delete confirmation string:** If `markTeamPaid` action or the delete action uses a new server action, the toast string "Team moved to Trash" is a new string not in the existing codebase. This spec locks it here implicitly (same pattern as "Sponsor moved to Trash" from Phase 2). No additional Aria gate needed — the pattern is established.

3. **Mark-paid modal — required vs. optional fields:** "Payment method" is listed as a required field (sprint plan F-T8 implies capturing method is the point of the modal). "Reference number" and "Date paid" are labeled optional in the sprint plan. This spec locks the field labels but does not dictate validation behavior — Bolt wires validation per the sprint plan. If "Payment method" is required, Bolt may need a validation message. Locked now: "Payment method is required." (sentence case, period, consistent with existing inline validation patterns in `contact-form.tsx`).

---

### Phase 3 — Countersignature

All strings in sections A, B, C, and D above are approved. Every state enumerated for every surface. Every string has an explicit intent.

**String count by surface:**
- Contacts (A): 20 strings (5 modal headers + 5 role card titles + 1 validation message + 2 status tabs + 1 search placeholder + 2 filter labels + 1 toggle + 6 salutation options) — exceeds the estimated 18; the two additional strings are the "All" tab citation and the explicit blank-salutation note.
- Teams (B): 21 strings (2 status tabs + 2 modal headers + 1 filter label + 1 search placeholder + 1 mark-paid button + 3 field labels + 8 payment method options + 4 delete-confirm variants × body text + 1 fallback display string + 1 CSV button) — exceeds the estimated 14 because delete-confirm variants are enumerated individually, not as one template.
- Sponsorships (C): 8 strings (2 modal headers + 1 filter label + 1 search placeholder + 2 delete-confirm variants + 1 fallback display string + 1 CSV button).
- Photos (D): 2 strings (1 filter label + 1 CSV button).

**Open questions** in section F are flagged and do not block the gate — they are scoped decisions for Forge/Scott, not copy decisions. The locked strings above are deterministic.

**Aria-approved. PR-3-contacts, PR-3-teams, PR-3-sponsorships, and PR-3-photos may proceed to Bolt after open questions in §F are resolved (sponsorships Q1 is blocking for PR-3-sponsorships only).**
