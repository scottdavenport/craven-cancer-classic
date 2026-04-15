import type { Metadata } from "next";
import { getSponsorshipItems, getSponsorshipPurchases } from "./actions";
import { SponsorshipManager } from "./sponsorship-manager";

export const metadata: Metadata = {
  title: "Manage Sponsorships",
};

export default async function AdminSponsorshipsPage() {
  const [items, purchases] = await Promise.all([
    getSponsorshipItems(),
    getSponsorshipPurchases(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Sponsorships</h1>
      <p className="mt-1 text-muted-foreground">
        Manage sponsorship packages and track purchases
      </p>
      <div className="mt-8">
        <SponsorshipManager items={items} purchases={purchases} />
      </div>
    </div>
  );
}
