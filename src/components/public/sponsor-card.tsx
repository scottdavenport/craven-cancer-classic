import Image from "next/image";
import type { JSX } from "react";

export type TierSize = "champion" | "eagle" | "standard" | "compact";

interface SponsorCardProps {
  sponsor: {
    id: string;
    name: string;
    logo_url: string | null;
    website: string | null;
  };
  tierSize: TierSize;
}

export function SponsorCard({ sponsor, tierSize }: SponsorCardProps): JSX.Element {
  const logoHeight = {
    champion: "h-24",
    eagle: "h-[72px]",
    standard: "h-14",
    compact: "h-12",
  }[tierSize];

  const nameClass = {
    champion: "font-display text-base font-semibold",
    eagle: "font-display text-sm font-semibold",
    standard: "font-display text-sm font-semibold",
    compact: "font-sans text-xs",
  }[tierSize];

  const logoCardBase = {
    champion: "border-l-4 border-brand bg-cream p-6 rounded-lg border border-border/60",
    eagle: "border border-border/60 bg-white p-5 rounded-md",
    standard: "border border-border/60 bg-white p-5 rounded-md",
    compact: "border border-border/60 bg-white p-3 rounded-md min-h-[5rem]",
  }[tierSize];

  const textCardBase = {
    champion: "border-l-4 border-brand bg-cream p-6 rounded-lg border border-border/60",
    eagle: "border border-border/60 bg-cream p-5 rounded-md",
    standard: "border border-border/60 bg-cream p-5 rounded-md",
    compact: "border border-border/60 bg-cream p-3 rounded-md min-h-[5rem]",
  }[tierSize];

  if (!sponsor.logo_url) {
    const cardClass = `flex flex-col items-center gap-3 ${textCardBase} transition-shadow hover:shadow-sm`;
    const cardContent = (
      <>
        <div className="h-px w-8 bg-brand-muted mx-auto" />
        <p className={`${nameClass} text-foreground text-center`}>{sponsor.name}</p>
      </>
    );

    if (sponsor.website) {
      return (
        <a
          href={sponsor.website}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`sponsor-card-text-${sponsor.id}`}
          className={cardClass}
        >
          {cardContent}
        </a>
      );
    }
    return (
      <div data-testid={`sponsor-card-text-${sponsor.id}`} className={cardClass}>
        {cardContent}
      </div>
    );
  }

  const cardClass = `flex flex-col items-center gap-3 ${logoCardBase} transition-shadow hover:shadow-sm`;

  const logoContent = (
    <div className={`relative ${logoHeight} w-full`}>
      <Image
        src={sponsor.logo_url}
        alt={sponsor.name}
        data-testid={`sponsor-logo-${sponsor.id}`}
        fill
        sizes="(max-width: 640px) 50vw, 33vw"
        className="object-contain"
      />
    </div>
  );

  if (sponsor.website) {
    return (
      <a
        href={sponsor.website}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={`sponsor-card-logo-${sponsor.id}`}
        className={cardClass}
      >
        {logoContent}
      </a>
    );
  }
  return (
    <div data-testid={`sponsor-card-logo-${sponsor.id}`} className={cardClass}>
      {logoContent}
    </div>
  );
}
