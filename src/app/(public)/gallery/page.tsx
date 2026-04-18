import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { GalleryGrid } from "./gallery-grid";
import type { Photo } from "@/types/database";

export const metadata: Metadata = {
  title: "Photo Gallery",
  description: "Photos from the Craven Cancer Classic tournament.",
};

async function getApprovedPhotos(): Promise<Photo[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("photos")
    .select("*")
    .eq("status", "approved")
    .order("year", { ascending: false })
    .order("created_at", { ascending: false });

  return data ?? [];
}

export default async function GalleryPage() {
  const photos = await getApprovedPhotos();

  // Build year groups: [{year, photos}], most recent first
  const yearGroups: { year: number; photos: Photo[] }[] = [];
  for (const photo of photos) {
    const last = yearGroups[yearGroups.length - 1];
    if (last && last.year === photo.year) {
      last.photos.push(photo);
    } else {
      yearGroups.push({ year: photo.year, photos: [photo] });
    }
  }

  return (
    <div>
      <section className="bg-[#1A2E3A] px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8BB5C9]">
            Memories
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
            Photo Gallery
          </h1>
          <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-[#5B8FA8] to-transparent" />
          <p className="mt-6 text-base text-white/50">
            Moments from the tournament — share yours too
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <GalleryGrid photos={photos} yearGroups={yearGroups} />
        </div>
      </section>
    </div>
  );
}
