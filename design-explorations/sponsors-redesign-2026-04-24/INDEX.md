# Sponsors Page Redesign — 2026-04-24

Three distinct directions for the Craven Cancer Classic public sponsors page. Each takes the page apart and rebuilds the frame system from scratch — none patches the current Tournament Program implementation. All three solve the four named problems (logo normalization, missing-logo treatment, tier hierarchy continuity, empty-tier distinction) through unifying frame systems rather than tier-by-tier ornament.

## Open the previews

```
direction-1-atrium/index.html       # Memorial donor wall
direction-2-almanac/index.html      # Annual register
direction-3-field-house/index.html  # Vintage collegiate program
```

Each is a single-file static HTML page using Tailwind via CDN + inline tokens. Open each in a browser at desktop width, then resize to 390px to verify mobile behavior. Mike Evans (no-logo Champion patron) appears in every Champion mockup so you can compare his treatment across directions side-by-side.

## The three directions

| | **Direction 1 · The Atrium** | **Direction 2 · The Almanac** | **Direction 3 · The Field House** |
|---|---|---|---|
| **Vocabulary** | Memorial donor wall | Annual register | Vintage collegiate program |
| **Mood** | Brass on cream stone, engraved type, dignified | Type-driven, columnar, almost academic | Wool-blanket warmth, varsity letterman, oxblood + cream |
| **Frame system** | Brass-bordered plaques with stone-colored "viewing windows" | White logo cells + sage top-rule + tracked-caps name cells | Heritage-bordered varsity cards with corner ornaments + white logo cells |
| **Mike Evans treatment** | Engraved Fraunces nameplate inside the viewing window | Typeset italic name + same tracked-caps treatment everyone gets | Circular "M.E." monogram in heritage-bordered ring |
| **Tier cascade** | Same plaque, scales padding + window aspect | Same record cell, scales grid density | Letterman block scales to letterman rule at Compact |
| **Empty tier** | Dashed-border "awaiting dedication" plaque with package + CTA | Full-width sage-tagged "vacancy notice" with body copy + CTA | Heritage-muted letterman block + dashed open-position cards |
| **Palette extension** | `--brass: #8C6E3F` (+ light/deep variants, + `--stone`) | `--sage: #738B6E` (+ deep/muted variants) | `--heritage: #5C2A2F` (+ deep/muted variants) |
| **Implementation cost** | Same as shipped | Lower than shipped | Same as shipped |
| **Strongest at** | Tribute resonance, "wall" architecture | Editorial restraint, doubled-name discipline, build speed | Event identity, Mike Evans monogram, warmth |
| **Weakest at** | Risks feeling funereal | Risks feeling cold/academic | Boldest color move — could clash with site nav |

## Recommendation

**Ship Direction 3 — The Field House.**

Three reasons.

**1. It solves the personal-stakes problem without leaning on the memorial vocabulary.** The /sponsors page is where Scott Sr.'s kids, Mike Evans's friends, and the other families' supporters see their organizations honored. Those people are alive and giving money RIGHT NOW — they want to feel celebrated, not commemorated. The Atrium direction is the most poetically aligned with the tribute origin story, but it asks living donors to read themselves into a memorial frame. The Field House aesthetic celebrates them as participants in a 16-year-running event, which is what they actually are.

**2. The monogram solves Mike Evans more distinctively than any other treatment.** The Atrium's engraved nameplate is beautiful but reads as "honored deceased." The Almanac's typeset-name approach is fair but quiet. The Field House monogram — "M.E." in Fraunces inside a heritage-bordered double-ring — is a brand mark in its own right. It matches the visual weight of Carolina East's logo without competing, and it says "this person is one of us" with the same energy a varsity letter or fraternity crest would. It's the only Mike Evans solution that feels like an upgrade rather than a workaround.

**3. The letterman-block tier system is the most resilient hierarchy.** The Atrium's plaque cascade is elegant but every tier looks like the same idea at a different size — the page risks reading as monotonous at scroll. The Almanac's chapter markers are restrained to the point of austerity. The Field House's letterman blocks give each tier a distinctive header moment (different physical sizes, all heritage) and the variant "letterman rule" treatment at Compact prevents the smallest tier from feeling oversized — every tier reads as the right physical weight for its position in the cascade.

### Caveats — when to pick a different direction

- **Pick The Atrium** if the tribute-and-memorial aesthetic should dominate this page specifically. The brass-on-cream-stone vocabulary has the strongest emotional resonance with the founding-honorees story. Worth choosing if Scott wants the /sponsors page to feel like an extension of the /about In Loving Memory section rather than a tournament program insert. Risk: requires very careful copy work ("inscribed" / "dedication" / "engraved") to avoid feeling funereal for living donors.

- **Pick The Almanac** if the priority is shipping fastest with lowest implementation risk and the page should harmonize maximally with the rest of the site's existing cream + teal palette. The doubled-name treatment is also genuinely the strongest solution to the missing-logo problem on its own merits — Mike Evans's record is structurally identical to Carolina East's, just with the typeset layer replacing the logo layer. If "fair to all entries" is the load-bearing requirement, Almanac wins. Risk: page may read as a directory rather than a celebration.

- **Pick The Field House** as recommended above, OR if Scott wants the most distinctive page identity within the broader site (heritage oxblood is a bold move and the page would be unmistakably "the sponsors page").

### What I'd want to validate before committing

1. **Heritage oxblood vs site nav.** Open the Field House preview in a fresh tab and switch to a tab with the live site — does the heritage masthead clash with the brand-teal nav, or do they read as complementary? If clash: heritage may need to shift slightly (e.g. `#5C353A`) or the masthead could be cream with heritage as accent only.
2. **Mike Evans monogram type-rendering.** Fraunces opsz 96 in a 7rem circle has very specific anti-aliasing requirements. Test on Scott's M3 Mini at 100% zoom and at 150% zoom (some users browse at zoom). If the monogram type looks chunky or anti-aliased poorly, it can swap to opsz 72 weight 500.
3. **Mobile masthead.** Field House masthead at 390px wide with the largest tier name ("Champion Partners") and longest stamp ("Founding Tier · 2026 Season") — verify nothing wraps awkwardly. Same check for letterman blocks at each tier.

### Next move

Pick a direction. If Field House: spawn Compass to plan the implementation sprint, then Spec → Bolt → Watchdog as standard. The README in `direction-3-field-house/` has the full spec — Compass can lift it directly into a sprint plan.

If you want to mash up directions (e.g. "Field House cards, Almanac chapter markers"), say so — that's a fourth option I can sketch.

If none of the three feels right, tell me what's missing and I'll generate a fourth direction with a different vocabulary entirely. The frame-system thinking carries across; the surface aesthetic is the variable.
