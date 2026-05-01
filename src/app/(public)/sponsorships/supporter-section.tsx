"use client";

/**
 * SupporterSection — Sprint 33 Phase 3 (#307)
 *
 * Renders the Supporters section of /sponsorships.
 * Uses the existing SponsorshipGrid component to preserve the inline
 * buy-form pattern from Sprint 23.
 *
 * Copy: placeholder — Aria #308 finalizes all strings.
 */

import type { SponsorshipItem } from "@/types/database";
import { SponsorshipGrid } from "./sponsorship-grid";

interface SupporterSectionProps {
  items: SponsorshipItem[];
}

export function SupporterSection({ items }: SupporterSectionProps) {
  return (
    <section data-testid="section-supporters" data-section-type="supporter">
      {/* Section header */}
      <div className="mb-10 text-center">
        <h2
          style={{
            fontFamily: "var(--font-manrope)",
            fontWeight: 800,
            fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.015em",
            color: "var(--foreground)",
          }}
        >
          Supporters
        </h2>
        <p className="mt-3 mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
          Put your name on the course. Tee signs and yard signs are placed throughout the fairways on the day of the event.
        </p>
      </div>

      <SponsorshipGrid items={items} />
    </section>
  );
}
