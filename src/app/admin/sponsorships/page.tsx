import type { Metadata } from "next";
import { getSponsorshipItems, getSponsorshipPurchases } from "./actions";
import { SponsorshipManager } from "./sponsorship-manager";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";

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
      <AdminPageHeading
        title="Sponsorships"
        description="Manage sponsorship packages — pricing, availability, active status."
      />
      <SponsorshipManager items={items} purchases={purchases} />
    </div>
  );
}
