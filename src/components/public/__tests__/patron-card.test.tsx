/**
 * patron-card.test.tsx — REWRITTEN for Tournament Program direction (#227)
 *
 * The previous "Engraved Donor Wall" aesthetic (drop-initial monogram, fleuron ❦,
 * ornament ❧, patron-ornament, patron-rule short teal rule) is REPLACED by the
 * Tournament Program direction (§Direction B in plans/sponsors-aesthetic-directions.md).
 *
 * This file asserts ABSENCE of the old pattern — it is the regression guard that
 * ensures the old ornamental elements never creep back in. All tests here should
 * be RED against main@9c7f9da (which still has the old design) and GREEN once
 * Bolt ships the Tournament Program redesign.
 *
 * For the POSITIVE Tournament Program test suite, see:
 *   src/components/public/__tests__/tournament-program-card.test.tsx
 *
 * TestIDs that must be ABSENT after the redesign:
 *   patron-drop-initial  — drop-cap monogram (gone)
 *   patron-fleuron       — ❦ fleuron (gone)
 *   patron-ornament      — ❧ ornament (gone)
 *   patron-rule          — short teal rule on Standard (gone)
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

let SponsorCard: React.ComponentType<{
  sponsor: {
    id: string;
    name: string;
    logo_url: string | null;
    website: string | null;
  };
  tierSize: "champion" | "eagle" | "standard" | "compact";
}> | null = null;

beforeAll(async () => {
  try {
    const mod = await import("../sponsor-card");
    SponsorCard = mod.SponsorCard;
  } catch {
    SponsorCard = null;
  }
});

type SponsorCardProps = {
  sponsor: {
    id: string;
    name: string;
    logo_url: string | null;
    website: string | null;
  };
  tierSize: "champion" | "eagle" | "standard" | "compact";
};

function renderCard(props: SponsorCardProps): ReturnType<typeof render> {
  if (!SponsorCard) {
    throw new Error(
      "SponsorCard not found — Bolt needs to create src/components/public/sponsor-card.tsx (#227)"
    );
  }
  return render(<SponsorCard {...props} />);
}

// ---------------------------------------------------------------------------
// Fixtures (all patron = logo_url null)
// ---------------------------------------------------------------------------

const CHAMPION_PATRON = {
  id: "pat-champion-1",
  name: "Scottie Davenport",
  logo_url: null,
  website: "https://example.com",
};

const EAGLE_PATRON = {
  id: "pat-eagle-1",
  name: "Mike Evans",
  logo_url: null,
  website: null,
};

const STANDARD_PATRON = {
  id: "pat-standard-1",
  name: "Jane Memorial Fund",
  logo_url: null,
  website: null,
};

const COMPACT_PATRON = {
  id: "pat-compact-1",
  name: "Friend of the Classic",
  logo_url: null,
  website: null,
};

// ===========================================================================
// OLD AESTHETIC ABSENCE — these tests are RED on main@9c7f9da
// They turn GREEN once Bolt ships the Tournament Program design.
// ===========================================================================

describe("Tournament Program (#227) — old Engraved Donor Wall aesthetic is gone", () => {
  const allPatrons: Array<{
    tier: "champion" | "eagle" | "standard" | "compact";
    sponsor: { id: string; name: string; logo_url: null; website: string | null };
  }> = [
    { tier: "champion", sponsor: CHAMPION_PATRON },
    { tier: "eagle", sponsor: EAGLE_PATRON },
    { tier: "standard", sponsor: STANDARD_PATRON },
    { tier: "compact", sponsor: COMPACT_PATRON },
  ];

  allPatrons.forEach(({ tier, sponsor }) => {
    describe(`${tier} patron`, () => {
      it(`${tier}: patron-drop-initial testid does NOT exist (drop-cap monogram removed)`, () => {
        renderCard({ sponsor, tierSize: tier });
        expect(
          screen.queryByTestId("patron-drop-initial")
        ).not.toBeInTheDocument();
      });

      it(`${tier}: patron-fleuron testid does NOT exist (❦ fleuron removed)`, () => {
        renderCard({ sponsor, tierSize: tier });
        expect(
          screen.queryByTestId("patron-fleuron")
        ).not.toBeInTheDocument();
      });

      it(`${tier}: patron-ornament testid does NOT exist (❧ ornament removed)`, () => {
        renderCard({ sponsor, tierSize: tier });
        expect(
          screen.queryByTestId("patron-ornament")
        ).not.toBeInTheDocument();
      });

      it(`${tier}: fleuron character ❦ does NOT appear in the DOM`, () => {
        const { container } = renderCard({ sponsor, tierSize: tier });
        expect(container.innerHTML).not.toContain("❦");
      });

      it(`${tier}: ornament character ❧ does NOT appear in the DOM`, () => {
        const { container } = renderCard({ sponsor, tierSize: tier });
        expect(container.innerHTML).not.toContain("❧");
      });
    });
  });

  it("standard patron: old patron-rule testid does NOT exist (replaced by unified frame — no more short teal rule)", () => {
    renderCard({ sponsor: STANDARD_PATRON, tierSize: "standard" });
    expect(screen.queryByTestId("patron-rule")).not.toBeInTheDocument();
  });
});
