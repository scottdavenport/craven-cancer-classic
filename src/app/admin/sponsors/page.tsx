import type { Metadata } from "next";
import { getSponsorTiers, getSponsors } from "./actions";
import { SponsorList } from "./sponsor-list";

export const metadata: Metadata = {
  title: "Manage Sponsors",
};

export default async function AdminSponsorsPage() {
  const [tiers, sponsors] = await Promise.all([
    getSponsorTiers(),
    getSponsors(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Sponsors</h1>
      <p className="mt-1 text-muted-foreground">
        Manage sponsor tiers and individual sponsors
      </p>
      <div className="mt-8">
        <SponsorList tiers={tiers} sponsors={sponsors} />
      </div>
    </div>
  );
}
