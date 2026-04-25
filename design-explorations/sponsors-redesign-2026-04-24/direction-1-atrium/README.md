# Direction 1 — The Atrium

## Concept

Every sponsor is a brass-bordered plaque on a memorial atrium wall. The wall (the page) is the unifier — its texture, its rhythm, its negative space. Each plaque is the same physical size within tier, differing only in content: a logo or an engraved name. The wall doesn't care if you're a corporation or a person. Both are inscribed equals on the same surface.

The visual vocabulary borrows from hospital atrium donor walls and museum founders' plaques — refined, dignified, considered. Brass on cream stone. Type that reads as etched. The page feels as if it could be photographed for a Sports Illustrated retrospective on club history twenty years from now.

## Mood References

1. **Smithsonian National Museum of African American History — Founders' donor wall** (lobby installation, brass nameplates inset into limestone, identical frames regardless of donation amount, alphabetical, quiet dignity)
2. **Memorial Sloan Kettering hospital donor walls** (etched glass + brass nameplates in geometric grid, the architecture itself the design)
3. **AT&T Stadium "Founders Plaza"** (cast bronze plaques in repeating grid, engraved corporate logos and individual names side-by-side, the FRAME is the equalizer)

## How It Solves the Four Problems

### 1. Logo normalization across wildly different aspect ratios

Every plaque has a "viewing window" — an inset stone-colored area with a fixed aspect ratio per tier (5:3 at Champion, 4:3 at Eagle, 3:2 at Standard, 2:1 at Compact). Logos `object-contain` into the window. The WINDOW is what reads, not the logo. A square JPG (Carolina East), a wide horizontal banner (Lynne Davenport / Century 21), and a circular oval (Fuel Market) all sit in identical brass-framed apertures. The eye sees the apertures repeating; the logos become the contents within them. This is the architectural solution that the shipped Tournament Program direction tried to achieve with `object-contain` alone but couldn't — because there's no surrounding frame to anchor the optical weight.

### 2. Missing-logo treatment (Mike Evans)

Mike Evans's plaque is identical to Carolina East's. Same brass border. Same outline. Same viewing window aspect ratio. Same inscription bar below. The only difference: his window holds an engraved nameplate ("Mike Evans" in Fraunces opsz 96, italic, light weight, brass-toned, with engraved text-shadow) instead of an image. The inscription bar shows the same tracked-caps name treatment as everyone else, with a sub-line "Patron · MMXXVI" replacing "Inscribed · MMXXVI."

The reading is unambiguous: the wall accommodates both insignia and name with equal grace. There is no "fallback" — there is just a different mode of inscription. This mirrors how a real donor wall handles individuals who have no corporate logo: their names are simply engraved in the same brass plate as the company names.

### 3. Tier hierarchy that doesn't drop off a cliff after Eagle

Every tier — Champion through Compact — uses the SAME plaque component. Same brass border. Same viewing-window inset. Same inscription bar. What changes across the cascade:

- **Plaque padding** scales: 2rem at Champion, 1.5rem at Eagle, 1.25rem at Standard, 0.875rem at Compact
- **Window aspect ratio** flattens: 5:3 → 4:3 → 3:2 → 2:1 (more horizontal at smaller sizes — fits more per row)
- **Outline offset** scales: 5px → 4px → 3px → 2px
- **Inscription type-size** scales but never disappears
- **Tier headings** all use the same chiseled-Fraunces caps, just stepping down in size (2.5rem → 2rem → 1.625rem → 1.375rem)
- **Tier numeral** (I, II, III, IV) appears at every tier in italic Fraunces opsz 9

There is no point where the design gives up on a tier. Compact looks like the natural smallest member of the same family, not an afterthought.

### 4. Filled-vs-empty tier visual distinction

An empty tier shows ONE thing: a single "awaiting dedication" plaque (or a row of them, sized to match the tier's normal grid). The plaque has dashed brass borders (vs solid), a stone-toned interior, and presents:

- An italic Fraunces "awaiting dedication" engraving in the window
- A package summary line ("Eagle Sponsorship · **$2,500**") in the same window
- A bordered CTA below: "Inquire to Inscribe →"

The tier heading is visibly muted (50% opacity on the rule + inscription) to telegraph "this section is open" without breaking the page rhythm. The plaque IS a real sponsor's slot waiting to be claimed. It feels like a proposal, not an absence.

## Tier Cascade Strategy

The cascade is **continuous scale**, not **stripped-down ornament**. Every tier inherits the full plaque DNA. The eye sees the same component at successively smaller scale, like the same stone on the wall cut at different sizes — Champion plaques are large limestone tablets, Eagle plaques are smaller engraved stones, Standard plaques are cornerstones, Compact plaques are foundation pavers. They're all from the same quarry.

| Tier | Grid (desktop) | Plaque padding | Window aspect | Inscription |
|---|---|---|---|---|
| Champion | 1 → 2-up | 2rem | 5:3 | Name + sub |
| Eagle | 2 → 3-up | 1.5rem | 4:3 | Name |
| Standard | 3 → 4-up | 1.25rem | 3:2 | Name |
| Compact | 4 → 6-up | 0.875rem | 2:1 | Name |

## Empty Tier Treatment

Rendered in the preview as a "ghost" Eagle tier with two open dedication plaques. The tier heading appears at 50% opacity to read as "open section." Each empty plaque carries the package name + price + a CTA — making it commercial without being a billboard. The dashed border is the only structural change from a real plaque; everything else is the same DNA, including the viewing window and the inscription bar (repurposed as the CTA).

## Palette Extension Proposal

**`--brass: #8C6E3F`** — used on plaque borders, tier-rule diamonds, "awaiting" engraving, and inscription accents.

**`--brass-light: #B8965A`** — used in the dark CTA section's eyebrow text and button border, and as the hover state for borders.

**`--brass-deep: #6B5530`** — used as the engraved-text shadow color and the empty-package emphasis.

**`--stone: #EDE5D5`** — used for the viewing-window interior. Pairs with the existing `--cream` to create a two-tone stone-and-cream palette without competing with brand teal.

These four tokens form a cohesive "atrium" sub-palette. Brand teal is intentionally absent from the sponsor cards themselves (it appears only in the existing site nav/header) — the brass is the dominant accent here. This gives the page its own visual identity within the larger site.

## Risks

- **Could feel too funereal.** Memorial donor walls are often associated with the dead. The page must read as "honoring your support" not "honoring your loss." Copy choices ("inscribed" vs "engraved," "dedicated" vs "memorial") matter a lot. The hero copy in the preview leans toward "their support builds the wall on which this tournament stands" — that framing is doing a lot of work. If it feels too solemn, it may need a warmer alternative.
- **Brass-on-cream can feel dated** if the brass is too saturated — risks "1990s law-firm letterhead" energy. The brass tone (#8C6E3F) was chosen to be muted enough to feel restrained, but real-world testing on a high-resolution display is required.
- **Photo logos with white grounds (Carolina East, BSH, Chick-fil-A)** will create a visible boundary between the logo's white square and the stone-colored window — slightly harsh. Mitigation: the inset shadow on the window adds a subtle stone-on-stone depth, and the brass border draws the eye to the frame, not the gap. May need a 1-2px window inset padding adjustment per logo type if it reads poorly.
- **The "awaiting dedication" copy** must be reviewed by Aria — it borders on melancholy. Alternative phrasings: "open for the 2026 season," "this slot is yours to claim," "available to inscribe." The italic Fraunces treatment of the phrase is the load-bearing aesthetic moment; the words can be tuned.
- **Mike Evans's engraved nameplate at Champion size requires Fraunces variable-font support** in the user's browser. Fallback (non-variable Fraunces) will look acceptable but loses the optical-size hairline contrast that makes the engraving feel monumental.

## Implementation Cost vs Shipped Design

**Same.** The `SponsorCard` component already has tier-stepped sizing. The change is: replace tier-strip + double-rule decoration with the brass-frame + viewing-window + inscription-bar structure. New CSS tokens (--brass, --brass-light, --brass-deep, --stone) are additive. The `engraved` text-shadow utility is one CSS rule. The chiseled-caps tier heading style is a className swap. No new schema, no logo image processing, no new database fields. Spec/Bolt could ship this in the same scope as the current direction took (one PR, one builder).

The empty-tier `EmptyPlaque` component is genuinely new — but it's a self-contained component with no dependencies on the sponsor data shape, just on tier metadata (name + package price). That metadata already exists in `sponsorship_items`.
