import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase/admin";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";
import Link from "next/link";
import { ImportClient } from "./import-client";

export const metadata: Metadata = {
  title: "Import Contacts",
};

export default async function AdminContactsImportPage() {
  await requireAdmin();

  return (
    <div>
      <AdminPageHeading
        title="Import Contacts"
        description="Upload a CSV file to preview and import contacts from the mailing list."
      >
        <Link
          href="/admin/contacts"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to Contacts
        </Link>
      </AdminPageHeading>
      <ImportClient />
    </div>
  );
}
