"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Photo } from "@/types/database";

interface YearGroup {
  year: number;
  photos: Photo[];
}

interface GalleryGridProps {
  photos: Photo[];
  yearGroups: YearGroup[];
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
}

export function GalleryGrid({
  photos,
  yearGroups,
  totalCount = photos.length,
  currentPage = 1,
  pageSize = 24,
}: GalleryGridProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setUploading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("photo") as File;

    if (!file || file.size === 0) {
      setError("Please select a photo");
      setUploading(false);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Photo must be under 10MB");
      setUploading(false);
      return;
    }

    try {
      const res = await fetch("/api/upload-photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      setSuccess(true);
      setShowUpload(false);
      form.reset();
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error('[GalleryGrid] photo upload failed:', err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Upload toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {photos.length} photo{photos.length !== 1 ? "s" : ""}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUpload(!showUpload)}
        >
          <Camera className="mr-1 h-4 w-4" />
          Upload Photo
        </Button>
      </div>

      {success && (
        <div className="rounded-md bg-success-muted p-3 text-sm text-success">
          Photo uploaded! It will appear after admin review.
        </div>
      )}

      {/* Upload form */}
      {showUpload && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-display text-lg font-semibold">Share a Photo</h3>
            <p className="mt-1 font-sans text-[0.9375rem] text-muted-foreground">
              Photos are reviewed by an admin before appearing in the gallery.
            </p>

            {error && (
              <div className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleUpload} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="uploader_name">Your Name</Label>
                  <Input id="uploader_name" name="uploader_name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uploader_email">Email (optional)</Label>
                  <Input
                    id="uploader_email"
                    name="uploader_email"
                    type="email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="caption">Caption (optional)</Label>
                <Textarea id="caption" name="caption" rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="photo">Photo</Label>
                <Input
                  id="photo"
                  name="photo"
                  type="file"
                  accept="image/*"
                  required
                />
                <p className="text-[0.8125rem] text-muted-foreground">
                  Max 10MB. JPG, PNG, or WebP.
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={uploading}>
                  <Upload className="mr-1 h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUpload(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Year-grouped photo grid */}
      {yearGroups.length === 0 ? (
        <div className="py-16 text-center" data-testid="empty-state">
          <Camera className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 font-display text-xl font-semibold text-foreground">
            No Photos Yet
          </p>
          <p className="mt-2 text-muted-foreground">
            Be the first to share a moment from the tournament.
          </p>
        </div>
      ) : (
        <div className="space-y-16">
          {yearGroups.map(({ year, photos: yearPhotos }) => (
            <section key={year} aria-label={`${year} Tournament photos`}>
              <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-brand-light mb-3">
                Tournament Year
              </p>
              <h2
                className="mb-6 font-display text-2xl font-semibold text-foreground"
                data-testid={`year-heading-${year}`}
              >
                {year} Tournament
              </h2>
              <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
                {yearPhotos.map((photo) => (
                  <div key={photo.id} className="mb-4 break-inside-avoid">
                    <div className="group relative overflow-hidden rounded-lg">
                      <div className="transition-transform duration-200 group-hover:scale-[1.01]">
                        <Image
                          src={photo.image_url}
                          alt={photo.caption || "Tournament photo"}
                          width={600}
                          height={400}
                          className="w-full object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                      {photo.caption && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                          <p className="text-sm text-white">{photo.caption}</p>
                          <p className="mt-1 text-xs text-white/60">
                            {photo.uploaded_by_name}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Pagination controls — only when totalCount > pageSize */}
      {totalCount > pageSize && (
        <div
          className="flex items-center justify-between border-t border-border pt-8"
          data-testid="pagination-controls"
        >
          {hasPrev ? (
            <Link
              href={`/gallery?page=${currentPage - 1}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              aria-label="Previous page"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Link>
          ) : (
            <span
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "pointer-events-none opacity-50"
              )}
              aria-disabled="true"
              aria-label="Previous page"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </span>
          )}

          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>

          {hasNext ? (
            <Link
              href={`/gallery?page=${currentPage + 1}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              aria-label="Next page"
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          ) : (
            <span
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "pointer-events-none opacity-50"
              )}
              aria-disabled="true"
              aria-label="Next page"
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
