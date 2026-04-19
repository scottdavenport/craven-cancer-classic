import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase/admin";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";
import { getContacts } from "./actions";
import { ContactList } from "./contact-list";

export const metadata: Metadata = {
  title: "Contacts",
};

export default async function AdminContactsPage() {
  await requireAdmin();
  const contacts = await getContacts();

  return (
    <div>
      <AdminPageHeading
        title="Contacts"
        description="Email contacts captured from public forms."
      />
      <ContactList contacts={contacts} />
    </div>
  );
}
