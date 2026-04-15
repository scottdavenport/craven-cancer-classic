"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Trash2 } from "lucide-react";
import { updatePhotoStatus, deletePhoto } from "./actions";
import type { Photo } from "@/types/database";

interface PhotoModerationProps {
  photos: Photo[];
}

type FilterTab = "all" | "pending" | "approved" | "rejected";

export function PhotoModeration({ photos }: PhotoModerationProps) {
  const [tab, setTab] = useState<FilterTab>("pending");
  const [loading, setLoading] = useState<string | null>(null);

  const filtered =
    tab === "all" ? photos : photos.filter((p) => p.status === tab);
  const pendingCount = photos.filter((p) => p.status === "pending").length;
  const approvedCount = photos.filter((p) => p.status === "approved").length;

  async function handleApprove(id: string) {
    setLoading(id);
    await updatePhotoStatus(id, "approved");
    setLoading(null);
  }

  async function handleReject(id: string) {
    setLoading(id);
    await updatePhotoStatus(id, "rejected");
    setLoading(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this photo?")) return;
    setLoading(id);
    await deletePhoto(id);
    setLoading(null);
  }

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "pending", label: "Pending", count: pendingCount },
    { key: "approved", label: "Approved", count: approvedCount },
    { key: "rejected", label: "Rejected" },
    { key: "all", label: "All", count: photos.length },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({t.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Photo grid */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No {tab === "all" ? "" : tab} photos
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((photo) => (
            <Card key={photo.id} className="overflow-hidden">
              <div className="relative aspect-[4/3]">
                <Image
                  src={photo.image_url}
                  alt={photo.caption || "Tournament photo"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute right-2 top-2">
                  <Badge
                    variant={
                      photo.status === "approved"
                        ? "default"
                        : photo.status === "rejected"
                          ? "destructive"
                          : "outline"
                    }
                    className="bg-white/90 text-xs"
                  >
                    {photo.status}
                  </Badge>
                </div>
              </div>
              <CardContent className="pt-3">
                {photo.caption && (
                  <p className="text-sm text-foreground line-clamp-2">
                    {photo.caption}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  By {photo.uploaded_by_name}
                  {photo.uploaded_by_email && ` (${photo.uploaded_by_email})`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(photo.created_at).toLocaleDateString()}
                </p>

                <div className="mt-3 flex gap-2">
                  {photo.status !== "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApprove(photo.id)}
                      disabled={loading === photo.id}
                      className="text-green-600"
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Approve
                    </Button>
                  )}
                  {photo.status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(photo.id)}
                      disabled={loading === photo.id}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Reject
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(photo.id)}
                    disabled={loading === photo.id}
                    className="ml-auto text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
