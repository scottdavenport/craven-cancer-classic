/**
 * SponsorCard — Sprint 22 redesign
 *
 * Clean white card with fixed aspect-ratio logo region.
 * Patron-name fallback (bg-cream region) when logo_url is null.
 *
 * Drops from prior version:
 *   - Tier strip headers, gold diamonds, double rules
 *   - Fraunces opsz patron-name dance
 *   - Cream card background, grain overlay
 *
 * Keeps: unified data-testid="sponsor-card-{id}", logo data-testid,
 * patron-name data-testid, <a> vs <div> wrapper logic.
 */

import Image from "next/image";
import type { JSX } from "react";
import type { TierSize } from "@/lib/sponsors-utils";

// Re-export TierSize so existing imports from this path still resolve
export type { TierSize };

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
}

interface SponsorCardProps {
  sponsor: Sponsor;
  tierSize: TierSize;
}

interface CardWrapperProps {
  sponsor: Sponsor;
  children: React.ReactNode;
  className: string;
  "data-testid": string;
}

function CardWrapper({
  sponsor,
  children,
  className,
  "data-testid": testId,
}: CardWrapperProps): JSX.Element {
  if (sponsor.website) {
    return (
      <a
        href={sponsor.website}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        data-testid={testId}
      >
        {children}
      </a>
    );
  }
  return (
    <div className={className} data-testid={testId}>
      {children}
    </div>
  );
}

// Logo region aspect ratio + padding by tier
const LOGO_ASPECT: Record<TierSize, React.CSSProperties> = {
  champion: { aspectRatio: "16 / 11", padding: "2rem" },
  eagle: { aspectRatio: "4 / 3", padding: "1.5rem" },
  standard: { aspectRatio: "4 / 3", padding: "1.125rem 1rem" },
  compact: { aspectRatio: "3 / 2", padding: "0.875rem 0.75rem" },
};

// Patron name font-size by tier
const PATRON_FONT_SIZE: Record<TierSize, string> = {
  champion: "clamp(2rem, 4.5vw, 2.75rem)",
  eagle: "1.875rem",
  standard: "1.25rem",
  compact: "1.25rem",
};

export function SponsorCard({ sponsor, tierSize }: SponsorCardProps): JSX.Element {
  const logoRegionStyle = LOGO_ASPECT[tierSize];

  return (
    <CardWrapper
      sponsor={sponsor}
      className="relative bg-white rounded-xl border border-border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      data-testid={`sponsor-card-${sponsor.id}`}
    >
      {/* Logo / patron region with fixed aspect ratio */}
      <div
        data-tier={tierSize}
        style={{
          ...logoRegionStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {sponsor.logo_url ? (
          <Image
            src={sponsor.logo_url}
            alt={sponsor.name}
            data-testid={`sponsor-logo-${sponsor.id}`}
            width={400}
            height={300}
            className="object-contain"
            style={{ maxWidth: "82%", maxHeight: "72%" }}
          />
        ) : (
          /* Patron fallback — cream background, Manrope 800 name centered */
          <div className="bg-cream w-full h-full flex items-center justify-center rounded-lg p-4">
            <span
              data-testid="patron-name"
              className="font-display"
              style={{
                fontWeight: 800,
                fontSize: PATRON_FONT_SIZE[tierSize],
                letterSpacing: "-0.025em",
                lineHeight: 1,
                textAlign: "center",
                color: "var(--foreground)",
                textTransform: "uppercase",
              }}
            >
              {sponsor.name}
            </span>
          </div>
        )}
      </div>
    </CardWrapper>
  );
}
