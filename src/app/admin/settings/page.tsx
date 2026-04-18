import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase/admin";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function AdminSettingsPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      <p className="mt-1 text-muted-foreground">
        Manage admin access and user invitations
      </p>
      <div className="mt-8 max-w-2xl">
        <InviteForm />
      </div>
    </div>
  );
}
