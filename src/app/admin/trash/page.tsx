import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase/admin";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";
import { TrashTabs } from "./trash-tabs";
import {
  getTrashContacts,
  getTrashTeams,
  getTrashSponsors,
  getTrashSponsorshipItems,
  getTrashPhotos,
} from "./actions";

export const metadata: Metadata = { title: "Trash" };

export default async function AdminTrashPage() {
  await requireAdmin();
  const [contacts, teams, sponsors, sponsorshipItems, photos] = await Promise.all([
    getTrashContacts(),
    getTrashTeams(),
    getTrashSponsors(),
    getTrashSponsorshipItems(),
    getTrashPhotos(),
  ]);

  return (
    <div>
      <AdminPageHeading
        title="Trash"
        description="Soft-deleted records. Restore to bring back to active lists."
      />
      <TrashTabs
        contacts={contacts}
        teams={teams}
        sponsors={sponsors}
        sponsorshipItems={sponsorshipItems}
        photos={photos}
      />
    </div>
  );
}
