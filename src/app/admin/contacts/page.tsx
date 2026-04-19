import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase/admin";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";
import { getContacts, getTeamsForFilter } from "./actions";
import { ContactList } from "./contact-list";

export const metadata: Metadata = {
  title: "Contacts",
};

export default async function AdminContactsPage() {
  await requireAdmin();
  const [contacts, teams] = await Promise.all([getContacts(), getTeamsForFilter()]);

  return (
    <div>
      <AdminPageHeading
        title="Contacts"
        description="People captured from public forms and the mailing list import."
      />
      <ContactList contacts={contacts} teams={teams} />
    </div>
  );
}
