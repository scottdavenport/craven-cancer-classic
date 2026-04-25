/**
 * SponsorsMasthead — Sprint 22
 *
 * Dark-teal masthead for the public /sponsors page.
 * Server component — receives props, no client state.
 */

import { formatLifetimeRaised } from "@/lib/sponsors-utils";

interface SponsorsMastheadProps {
  year: number;
  partnerCount: number;
  lifetimeRaisedCents: number | null;
}

export function SponsorsMasthead({
  year,
  partnerCount,
  lifetimeRaisedCents,
}: SponsorsMastheadProps) {
  const lifetimeFormatted = formatLifetimeRaised(lifetimeRaisedCents);
  const yearsRunning = year - 2010;

  return (
    <section
      data-testid="sponsors-masthead"
      style={{
        background: [
          "radial-gradient(ellipse 80% 60% at 20% -10%, rgba(87,151,166,0.18) 0%, transparent 70%)",
          "radial-gradient(ellipse 60% 50% at 85% 110%, rgba(87,151,166,0.12) 0%, transparent 65%)",
          "var(--brand-darker)",
        ].join(", "),
        animation: "fadeUp 0.6s var(--ease-out) both",
      }}
      className="relative overflow-hidden px-6 py-20 sm:py-28"
    >
      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Eyebrow */}
        <div className="flex items-center gap-3 mb-6">
          <div
            aria-hidden="true"
            style={{ width: 28, height: 1, backgroundColor: "var(--brand)" }}
          />
          <span
            style={{
              fontFamily: "var(--font-manrope)",
              fontWeight: 700,
              fontSize: "0.6875rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--brand)",
            }}
          >
            Our Partners
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "var(--font-manrope)",
            fontWeight: 800,
            fontSize: "clamp(3.5rem, 11vw, 8rem)",
            lineHeight: 0.92,
            textTransform: "uppercase",
            letterSpacing: "-0.025em",
            color: "#FFFFFF",
          }}
        >
          {year} Partners
        </h1>

        {/* Body copy */}
        <p
          style={{
            marginTop: "1.5rem",
            maxWidth: "44ch",
            fontSize: "1rem",
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.82)",
          }}
        >
          The organizations and individuals behind the Craven Cancer Classic —
          funding transportation, lodging, and medical equipment for cancer
          patients in active treatment.
        </p>

        {/* Stat row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "2rem 2.5rem",
            marginTop: "3rem",
          }}
        >
          {/* Stat 1: partner count */}
          <StatCell value={String(partnerCount)} label={`${year} Partners`} />

          {/* Stat 2: years running */}
          <StatCell value={String(yearsRunning)} label="Years Running" />

          {/* Stat 3: lifetime raised — omit entire cell when null */}
          {lifetimeFormatted !== null && (
            <StatCell value={lifetimeFormatted} label="Raised to Date" />
          )}
        </div>
      </div>
    </section>
  );
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <span
        style={{
          fontFamily: "var(--font-manrope)",
          fontWeight: 800,
          fontSize: "clamp(2rem, 4vw, 2.75rem)",
          lineHeight: 1,
          color: "#FFFFFF",
          letterSpacing: "-0.025em",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: "var(--font-manrope)",
          fontWeight: 600,
          fontSize: "0.6875rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
