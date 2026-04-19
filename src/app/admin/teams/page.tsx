import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase/admin";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";
import { getTeams } from "./actions";
import { getEventSettings } from "@/app/admin/event/actions";
import { TeamList } from "./team-list";

export const metadata: Metadata = {
  title: "Teams",
};

export default async function AdminTeamsPage() {
  await requireAdmin();
  const [teams, eventSettings] = await Promise.all([getTeams(), getEventSettings()]);

  const defaultFeeDollars = eventSettings?.registration_fee_cents
    ? eventSettings.registration_fee_cents / 100
    : 0;

  return (
    <div>
      <AdminPageHeading
        title="Teams"
        description="Build and manage golf teams for the current year."
      />
      <TeamList teams={teams} defaultFeeDollars={defaultFeeDollars} />
    </div>
  );
}
