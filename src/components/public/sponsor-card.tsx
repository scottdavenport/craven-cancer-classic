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

function PatronChampion({ sponsor }: { sponsor: SponsorCardProps["sponsor"] }): JSX.Element {
  const initial = sponsor.name.split(" ")[0]?.[0]?.toUpperCase() ?? "";
  return (
    <div className="group relative bg-cream grain-overlay rounded-lg border border-border/60 border-l-4 border-l-brand p-6 overflow-hidden transition-shadow hover:shadow-md">
      {initial && (
        <span
          data-testid="patron-drop-initial"
          aria-hidden="true"
          style={{ fontVariationSettings: "'opsz' 144", fontWeight: 300 }}
          className="font-display italic text-[56px] sm:text-[80px] leading-none text-brand group-hover:text-brand-dark transition-colors duration-150 float-left mr-3 mt-1"
        >
          {initial}
        </span>
      )}
      <div>
        <span
          style={{ fontVariationSettings: "'opsz' 144", fontWeight: 500 }}
          className="font-display text-[22px] sm:text-[28px] leading-tight text-foreground block"
        >
          {sponsor.name}
        </span>
        <span
          data-testid="patron-subline"
          aria-hidden="true"
          style={{ fontVariationSettings: "'opsz' 9", fontVariant: "small-caps" }}
          className="font-display italic text-[11px] text-muted-foreground block mt-1"
        >
          Est. 2010 · Champion Patron
        </span>
      </div>
      <span
        data-testid="patron-fleuron"
        aria-hidden="true"
        style={{ fontVariationSettings: "'opsz' 9" }}
        className="font-display absolute bottom-0 right-0 p-4 text-[16px] text-brand-muted"
      >
        ❦
      </span>
    </div>
  );
}

function PatronEagle({ sponsor }: { sponsor: SponsorCardProps["sponsor"] }): JSX.Element {
  return (
    <div className="group relative bg-cream grain-overlay rounded-md border border-border/60 p-5 transition-shadow hover:shadow-sm">
      <div aria-hidden="true" className="mb-4">
        <div className="h-px bg-brand-muted" />
        <div className="h-px bg-brand-muted mt-0.5" />
      </div>
      <div className="flex items-baseline gap-2">
        <span
          data-testid="patron-ornament"
          aria-hidden="true"
          style={{ fontVariationSettings: "'opsz' 9" }}
          className="font-display text-[13px] sm:text-[14px] text-brand group-hover:text-brand-dark transition-colors duration-150"
        >
          ❧
        </span>
        <span
          style={{ fontVariationSettings: "'opsz' 72", fontWeight: 400 }}
          className="font-display text-[18px] sm:text-[20px] leading-snug text-foreground"
        >
          {sponsor.name}
        </span>
      </div>
    </div>
  );
}

function PatronStandard({ sponsor }: { sponsor: SponsorCardProps["sponsor"] }): JSX.Element {
  return (
    <div className="bg-cream rounded-md border border-border/60 p-5 transition-shadow hover:shadow-xs group">
      <div
        data-testid="patron-rule"
        aria-hidden="true"
        className="h-px w-6 bg-brand mb-3 transition-[width] duration-200 group-hover:w-10 group-hover:bg-brand-dark"
      />
      <span
        style={{ fontVariationSettings: "'opsz' 36", fontWeight: 400 }}
        className="font-display text-[15px] sm:text-[16px] leading-normal text-foreground block"
      >
        {sponsor.name}
      </span>
    </div>
  );
}

function PatronCompact({ sponsor }: { sponsor: SponsorCardProps["sponsor"] }): JSX.Element {
  return (
    <div className="bg-cream rounded-md border border-border/60 p-3 min-h-[5rem] flex items-center transition-shadow hover:shadow-xs">
      <div
        data-testid="patron-accent-wrapper"
        className="border-l-2 border-brand/40 pl-3 hover:border-brand/80 transition-colors"
      >
        <span
          style={{ fontVariationSettings: "'opsz' 9", fontWeight: 400 }}
          className="font-display text-[13px] leading-snug text-foreground"
        >
          {sponsor.name}
        </span>
      </div>
    </div>
  );
}

function PatronCard({
  sponsor,
  tierSize,
}: SponsorCardProps): JSX.Element {
  let content: JSX.Element;
  if (tierSize === "champion") {
    content = <PatronChampion sponsor={sponsor} />;
  } else if (tierSize === "eagle") {
    content = <PatronEagle sponsor={sponsor} />;
  } else if (tierSize === "standard") {
    content = <PatronStandard sponsor={sponsor} />;
  } else {
    content = <PatronCompact sponsor={sponsor} />;
  }

  if (sponsor.website) {
    return (
      <a
        href={sponsor.website}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={`sponsor-card-text-${sponsor.id}`}
        className="block"
      >
        {content}
      </a>
    );
  }
  return (
    <div data-testid={`sponsor-card-text-${sponsor.id}`}>
      {content}
    </div>
  );
}

export function SponsorCard({ sponsor, tierSize }: SponsorCardProps): JSX.Element {
  const logoHeight = {
    champion: "h-24",
    eagle: "h-[72px]",
    standard: "h-14",
    compact: "h-12",
  }[tierSize];

  const logoCardBase = {
    champion: "border-l-4 border-brand bg-cream p-6 rounded-lg border border-border/60",
    eagle: "border border-border/60 bg-white p-5 rounded-md",
    standard: "border border-border/60 bg-white p-5 rounded-md",
    compact: "border border-border/60 bg-white p-3 rounded-md min-h-[5rem]",
  }[tierSize];

  if (!sponsor.logo_url) {
    return <PatronCard sponsor={sponsor} tierSize={tierSize} />;
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
