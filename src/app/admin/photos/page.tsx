import type { Metadata } from "next";
import { getPhotos } from "./actions";
import { PhotoModeration } from "./photo-moderation";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";

export const metadata: Metadata = {
  title: "Moderate Photos",
};

export default async function AdminPhotosPage() {
  const photos = await getPhotos();

  return (
    <div>
      <AdminPageHeading
        title="Photos"
        description="Review and moderate submitted photos."
      />
      <PhotoModeration photos={photos} />
    </div>
  );
}
