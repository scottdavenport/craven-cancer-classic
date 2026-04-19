import type { Metadata } from "next";
import { getEventSettings } from "./actions";
import { EventSettingsForm } from "./event-settings-form";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";

export const metadata: Metadata = {
  title: "Manage Event",
};

export default async function AdminEventPage() {
  const settings = await getEventSettings();

  return (
    <div>
      <AdminPageHeading
        title="Event Settings"
        description="Configure tournament dates, registration settings, and capacity."
      />
      <div className="max-w-2xl">
        <EventSettingsForm settings={settings} />
      </div>
    </div>
  );
}
