import type { Metadata } from "next";
import { getSponsors, getSponsorshipItems } from "./actions";
import { SponsorList } from "./sponsor-list";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";

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
      <AdminPageHeading
        title="Sponsors"
        description="Manage confirmed sponsors — add, edit, assign to tiers."
      />
      <SponsorList sponsors={sponsors} sponsorshipItems={sponsorshipItems} />
    </div>
  );
}
