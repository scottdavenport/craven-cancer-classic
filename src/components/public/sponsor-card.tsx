import Image from "next/image";
import type { JSX } from "react";

export type TierSize = "champion" | "eagle" | "standard" | "compact";

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

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

function CardWrapper({ sponsor, children, className, "data-testid": testId }: CardWrapperProps): JSX.Element {
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

function LogoContent({ sponsor, tierSize }: { sponsor: Sponsor; tierSize: TierSize }): JSX.Element {
  const maxH = {
    champion: "max-h-24",
    eagle: "max-h-[72px]",
    standard: "max-h-14",
    compact: "max-h-12",
  }[tierSize];

  return (
    <div className="flex flex-col items-start gap-3 w-full">
      <Image
        src={sponsor.logo_url!}
        alt={sponsor.name}
        data-testid={`sponsor-logo-${sponsor.id}`}
        width={320}
        height={96}
        className={cn("object-contain object-left w-auto", maxH)}
      />
      <p
        aria-hidden="true"
        style={{ letterSpacing: "0.15em" }}
        className="font-sans text-[0.6875rem] uppercase text-muted-foreground/70"
      >
        {sponsor.name}
      </p>
    </div>
  );
}

function PatronContent({ sponsor, tierSize }: { sponsor: Sponsor; tierSize: TierSize }): JSX.Element {
  const nameStyles: React.CSSProperties = {
    champion: { fontVariationSettings: "'opsz' 72", fontWeight: "500" },
    eagle: { fontVariationSettings: "'opsz' 36", fontWeight: "400", fontStyle: "italic" },
    standard: { fontVariationSettings: "'opsz' 36", fontWeight: "400" },
    compact: { fontVariationSettings: "'opsz' 9", fontWeight: "400" },
  }[tierSize];

  const nameClass = {
    champion: "font-display text-[28px] sm:text-[36px] leading-tight text-foreground",
    eagle: "font-display italic text-[20px] sm:text-[24px] leading-snug text-foreground",
    standard: "font-display text-[16px] leading-normal text-foreground",
    compact: "font-display text-[13px] leading-snug text-foreground",
  }[tierSize];

  return (
    <div className="flex flex-col items-start gap-2 w-full text-left">
      <span
        data-testid="patron-name"
        style={nameStyles}
        className={nameClass}
      >
        {sponsor.name}
      </span>
      {tierSize === "champion" && (
        <span
          data-testid="patron-subline"
          aria-hidden="true"
          style={{ letterSpacing: "0.2em" }}
          className="font-sans text-[0.625rem] font-medium uppercase text-muted-foreground"
        >
          Est. 2010 · Champion Patron
        </span>
      )}
    </div>
  );
}

const TIER_STRIP_CONFIG = {
  champion: { bg: "bg-brand", text: "text-white", label: "CHAMPION SPONSOR" },
  eagle: { bg: "bg-brand-muted", text: "text-brand", label: "EAGLE SPONSOR" },
  standard: null,
  compact: null,
} as const;

export function SponsorCard({ sponsor, tierSize }: SponsorCardProps): JSX.Element {
  const tierStripConfig = TIER_STRIP_CONFIG[tierSize];
  const showDoubleRule = tierSize === "champion" || tierSize === "eagle";

  const cardClasses = cn(
    "relative bg-cream grain-overlay rounded-md border border-border/60",
    tierSize === "champion" && "border-t-2 border-t-brand",
    tierSize === "eagle" && "border-t border-t-brand",
    tierSize === "compact" && "border-l-2 border-brand/30",
    "transition-shadow hover:shadow-sm"
  );

  return (
    <CardWrapper
      sponsor={sponsor}
      className={cardClasses}
      data-testid={`sponsor-card-${sponsor.id}`}
    >
      {tierStripConfig && (
        <div
          data-testid="tier-strip"
          className={cn(
            "flex items-center justify-center gap-3 px-4 py-2",
            tierStripConfig.bg,
            tierStripConfig.text
          )}
        >
          <span
            data-testid="tier-strip-diamond-left"
            aria-hidden="true"
            style={{ color: "var(--accent-gold)" }}
            className="text-sm"
          >
            ◆
          </span>
          <span
            data-testid="tier-strip-label"
            style={{ letterSpacing: "0.2em" }}
            className="font-sans text-[0.6875rem] font-semibold uppercase"
          >
            {tierStripConfig.label}
          </span>
          <span
            data-testid="tier-strip-diamond-right"
            aria-hidden="true"
            style={{ color: "var(--accent-gold)" }}
            className="text-sm"
          >
            ◆
          </span>
        </div>
      )}
      {showDoubleRule && (
        <div data-testid="double-rule" aria-hidden="true">
          <div className="h-px bg-brand" />
          <div className="h-px bg-brand-muted mt-0.5" />
        </div>
      )}
      <div className="p-5 flex items-start">
        {sponsor.logo_url ? (
          <LogoContent sponsor={sponsor} tierSize={tierSize} />
        ) : (
          <PatronContent sponsor={sponsor} tierSize={tierSize} />
        )}
      </div>
    </CardWrapper>
  );
}
