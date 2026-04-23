import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { GalleryGrid } from "./gallery-grid";
import type { Photo } from "@/types/database";
import { SectionEyebrow } from "@/components/public/section-eyebrow";

export const metadata: Metadata = {
  title: "Photo Gallery",
  description: "Photos from the Craven Cancer Classic tournament.",
};

const PAGE_SIZE = 24;

async function getApprovedPhotos(
  offset: number
): Promise<{ photos: Photo[]; totalCount: number }> {
  const supabase = await createClient();

  const { data, count } = await supabase
    .from("photos")
    .select("*", { count: "exact" })
    .eq("status", "approved")
    .order("year", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  return { photos: data ?? [], totalCount: count ?? 0 };
}

interface GalleryPageProps {
  searchParams?: Promise<Record<string, string>> | Record<string, string>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps = {}) {
  const resolvedParams =
    searchParams instanceof Promise
      ? await searchParams
      : (searchParams ?? {});

  const pageNum = Math.max(1, parseInt(resolvedParams.page ?? "1", 10) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const { photos, totalCount } = await getApprovedPhotos(offset);

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
          <SectionEyebrow tone="light">Memories</SectionEyebrow>
          <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
            Photo Gallery
          </h1>
          <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-brand to-transparent" />
          <p className="mt-6 text-base text-white/50">
            Moments from the tournament — share yours too
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <GalleryGrid
            photos={photos}
            yearGroups={yearGroups}
            totalCount={totalCount}
            currentPage={pageNum}
            pageSize={PAGE_SIZE}
          />
        </div>
      </section>
    </div>
  );
}
