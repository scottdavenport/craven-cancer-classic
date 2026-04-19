import type { Metadata } from "next";
import { getTeams } from "./actions";
import { RegistrationList } from "./registration-list";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";

export const metadata: Metadata = {
  title: "Manage Registrations",
};

export default async function AdminRegistrationsPage() {
  const teams = await getTeams();

  return (
    <div>
      <AdminPageHeading
        title="Registrations"
        description="Review team registrations, export CSV, manually add entries."
      />
      <RegistrationList teams={teams} />
    </div>
  );
}
