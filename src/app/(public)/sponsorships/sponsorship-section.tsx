"use client";

/**
 * SponsorshipSection — Sprint 33 Phase 3 (#307)
 *
 * Renders the Sponsorships section of /sponsorships.
 * Uses the existing SponsorshipGrid component to preserve the inline
 * buy-form pattern from Sprint 23.
 *
 * Copy: placeholder — Aria #308 finalizes all strings.
 */

import type { SponsorshipItem } from "@/types/database";
import { SponsorshipGrid } from "./sponsorship-grid";

interface SponsorshipSectionProps {
  items: SponsorshipItem[];
}

export function SponsorshipSection({ items }: SponsorshipSectionProps) {
  return (
    <section data-testid="section-sponsorships" data-section-type="sponsorship">
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
          Sponsorships
        </h2>
        <p className="mt-3 mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
          Named packages that put your brand in front of every player and guest. Each sponsorship supports transportation, lodging, and medical equipment for cancer patients in our community.
        </p>
      </div>

      <SponsorshipGrid items={items} />
    </section>
  );
}
