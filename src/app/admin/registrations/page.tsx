import type { Metadata } from "next";
import { getTeams } from "./actions";
import { RegistrationList } from "./registration-list";

export const metadata: Metadata = {
  title: "Manage Registrations",
};

export default async function AdminRegistrationsPage() {
  const teams = await getTeams();

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Registrations</h1>
      <p className="mt-1 text-muted-foreground">
        Manage team registrations and player details
      </p>
      <div className="mt-8">
        <RegistrationList teams={teams} />
      </div>
    </div>
  );
}
