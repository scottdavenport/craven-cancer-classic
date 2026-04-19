import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GalleryGrid } from "@/app/(public)/gallery/gallery-grid";
import type { Photo } from "@/types/database";

// GalleryGrid calls /api/upload-photo via fetch — stub to prevent network calls
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function makePhoto(overrides: Partial<Photo> & { id: string }): Photo {
  return {
    id: overrides.id,
    uploaded_by_name: overrides.uploaded_by_name ?? "Seed Script",
    uploaded_by_email: overrides.uploaded_by_email ?? null,
    image_url:
      overrides.image_url ??
      `https://example.supabase.co/storage/v1/object/public/photos/2024/${overrides.id}.jpg`,
    caption: overrides.caption ?? null,
    status: overrides.status ?? "approved",
    year: overrides.year ?? 2024,
    created_at: overrides.created_at ?? "2024-09-01T00:00:00Z",
    deleted_at: overrides.deleted_at ?? null,
    deleted_by: overrides.deleted_by ?? null,
  };
}

describe("GalleryGrid — empty state", () => {
  it("renders the empty state when no photos are provided", () => {
    render(<GalleryGrid photos={[]} yearGroups={[]} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText(/no photos yet/i)).toBeInTheDocument();
  });

  it("shows zero photo count in the header", () => {
    render(<GalleryGrid photos={[]} yearGroups={[]} />);
    expect(screen.getByText("0 photos")).toBeInTheDocument();
  });
});

describe("GalleryGrid — year grouping", () => {
  const photos2024 = [
    makePhoto({ id: "a1", year: 2024, caption: "Fairway shot" }),
    makePhoto({ id: "a2", year: 2024, caption: "Putting green" }),
  ];
  const photos2023 = [
    makePhoto({ id: "b1", year: 2023, caption: "Tee box" }),
  ];

  const allPhotos = [...photos2024, ...photos2023];
  const yearGroups = [
    { year: 2024, photos: photos2024 },
    { year: 2023, photos: photos2023 },
  ];

  it("renders a heading for each year, most recent first", () => {
    render(<GalleryGrid photos={allPhotos} yearGroups={yearGroups} />);
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings[0]).toHaveTextContent("2024 Tournament");
    expect(headings[1]).toHaveTextContent("2023 Tournament");
  });

  it("renders the correct year-heading test ids", () => {
    render(<GalleryGrid photos={allPhotos} yearGroups={yearGroups} />);
    expect(screen.getByTestId("year-heading-2024")).toBeInTheDocument();
    expect(screen.getByTestId("year-heading-2023")).toBeInTheDocument();
  });

  it("shows total photo count across all years", () => {
    render(<GalleryGrid photos={allPhotos} yearGroups={yearGroups} />);
    expect(screen.getByText("3 photos")).toBeInTheDocument();
  });

  it("renders each photo's alt text from its caption", () => {
    render(<GalleryGrid photos={allPhotos} yearGroups={yearGroups} />);
    expect(screen.getByAltText("Fairway shot")).toBeInTheDocument();
    expect(screen.getByAltText("Putting green")).toBeInTheDocument();
    expect(screen.getByAltText("Tee box")).toBeInTheDocument();
  });

  it("falls back to 'Tournament photo' alt text when caption is null", () => {
    const photo = makePhoto({ id: "c1", year: 2024, caption: null });
    render(
      <GalleryGrid
        photos={[photo]}
        yearGroups={[{ year: 2024, photos: [photo] }]}
      />
    );
    expect(screen.getByAltText("Tournament photo")).toBeInTheDocument();
  });
});

describe("GalleryGrid — upload button", () => {
  it("renders the Upload Photo button", () => {
    render(<GalleryGrid photos={[]} yearGroups={[]} />);
    expect(
      screen.getByRole("button", { name: /upload photo/i })
    ).toBeInTheDocument();
  });
});
