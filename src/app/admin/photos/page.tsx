import type { Metadata } from "next";
import { getPhotos } from "./actions";
import { PhotoModeration } from "./photo-moderation";

export const metadata: Metadata = {
  title: "Moderate Photos",
};

export default async function AdminPhotosPage() {
  const photos = await getPhotos();

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Photos</h1>
      <p className="mt-1 text-muted-foreground">
        Review and moderate uploaded tournament photos
      </p>
      <div className="mt-8">
        <PhotoModeration photos={photos} />
      </div>
    </div>
  );
}
