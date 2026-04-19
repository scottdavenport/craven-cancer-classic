import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase/admin";
import { InviteForm } from "./invite-form";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function AdminSettingsPage() {
  await requireAdmin();

  return (
    <div>
      <AdminPageHeading
        title="Settings"
        description="Manage admin user access and invitations."
      />
      <div className="max-w-2xl">
        <InviteForm />
      </div>
    </div>
  );
}
