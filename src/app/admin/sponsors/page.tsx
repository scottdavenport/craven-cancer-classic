import type { Metadata } from "next";
import { getSponsors, getSponsorshipItems } from "./actions";
import { SponsorList } from "./sponsor-list";

export const metadata: Metadata = {
  title: "Manage Sponsors",
};

export default async function AdminSponsorsPage() {
  const [sponsors, sponsorshipItems] = await Promise.all([
    getSponsors(),
    getSponsorshipItems(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Sponsors</h1>
      <p className="mt-1 text-muted-foreground">
        Manage sponsor tiers and individual sponsors
      </p>
      <div className="mt-8">
        <SponsorList sponsors={sponsors} sponsorshipItems={sponsorshipItems} />
      </div>
    </div>
  );
}
