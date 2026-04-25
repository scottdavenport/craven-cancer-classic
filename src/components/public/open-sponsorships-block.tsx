/**
 * OpenSponsorshipsBlock — Sprint 22
 *
 * Promotional chip grid for sponsorship tiers that have no active sponsors.
 * Server component — receives items as props, no client state.
 * Returns null when items is empty.
 */

interface OpenSponsorshipsItem {
  id: string;
  name: string;
  price_cents: number;
}

interface OpenSponsorshipsBlockProps {
  items: OpenSponsorshipsItem[];
}

/**
 * Format price_cents to a display string like "$2,500" (no .00 for round dollars).
 */
function formatPrice(cents: number): string {
  const dollars = cents / 100;
  // Use toLocaleString for thousands separator, no decimal for whole dollars
  if (Number.isInteger(dollars)) {
    return `$${dollars.toLocaleString("en-US")}`;
  }
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function OpenSponsorshipsBlock({ items }: OpenSponsorshipsBlockProps) {
  if (items.length === 0) return null;

  return (
    <section
      data-testid="open-sponsorships-block"
      style={{
        background: "linear-gradient(135deg, var(--brand-darker) 0%, var(--brand-dark) 100%)",
        position: "relative",
        overflow: "hidden",
        borderRadius: "0.75rem",
        padding: "3rem 2.5rem",
      }}
    >
      {/* Decorative radial overlay */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-30%",
          right: "-10%",
          width: "50%",
          height: "200%",
          background: "radial-gradient(ellipse at center, rgba(87,151,166,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Intro */}
        <h2
          style={{
            fontFamily: "var(--font-manrope)",
            fontWeight: 800,
            fontSize: "1.875rem",
            lineHeight: 1.15,
            color: "#FFFFFF",
            marginBottom: "0.75rem",
          }}
        >
          {`There's still room to back the ${new Date().getFullYear()} tournament.`}
        </h2>
        <p
          style={{
            fontSize: "1rem",
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.75)",
            maxWidth: "60ch",
            marginBottom: "2rem",
          }}
        >
          {`${items.length} ${items.length === 1 ? "category is" : "categories are"} still open, with multiple slots available in most. From premier packages to high-visibility add-ons, every level puts your organization in front of every player and family on the course.`}
        </p>

        {/* Chip grid */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "2rem",
          }}
        >
          {items.map((item) => (
            <a
              key={item.id}
              href="/sponsorships"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "9999px",
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.20)",
                color: "#FFFFFF",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: 600,
                transition: "background 0.15s, transform 0.15s",
              }}
            >
              <span>{item.name}</span>
              <span style={{ opacity: 0.75 }}>From {formatPrice(item.price_cents)}</span>
            </a>
          ))}
        </div>

        {/* CTA */}
        <a
          href="/sponsorships"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.75rem 1.75rem",
            borderRadius: "0.625rem",
            background: "#FFFFFF",
            color: "var(--brand-darker)",
            fontFamily: "var(--font-manrope)",
            fontWeight: 700,
            fontSize: "0.875rem",
            letterSpacing: "0.03em",
            textDecoration: "none",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          Browse all sponsorships →
        </a>
      </div>
    </section>
  );
}
