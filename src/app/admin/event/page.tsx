import type { Metadata } from "next";
import { getEventSettings } from "./actions";
import { EventSettingsForm } from "./event-settings-form";

export const metadata: Metadata = {
  title: "Manage Event",
};

export default async function AdminEventPage() {
  const settings = await getEventSettings();

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Event Settings</h1>
      <p className="mt-1 text-muted-foreground">
        Manage tournament date, location, and registration
      </p>
      <div className="mt-8 max-w-2xl">
        <EventSettingsForm settings={settings} />
      </div>
    </div>
  );
}
