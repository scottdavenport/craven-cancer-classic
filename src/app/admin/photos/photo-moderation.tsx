"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Trash2 } from "lucide-react";
import { updatePhotoStatus, deletePhoto } from "./actions";
import type { Photo } from "@/types/database";

interface PhotoModerationProps {
  photos: Photo[];
}

type FilterTab = "all" | "pending" | "approved" | "rejected";

function StatusBadge({ status }: { status: string }) {
  const base =
    "text-[0.6875rem] font-semibold uppercase tracking-[0.05em] px-2 py-0.5 rounded-sm shadow-xs";
  if (status === "approved")
    return (
      <span
        className={`${base} bg-success-muted text-success border border-success/20`}
      >
        {status}
      </span>
    );
  if (status === "rejected")
    return (
      <span
        className={`${base} bg-destructive/10 text-destructive border border-destructive/20`}
      >
        {status}
      </span>
    );
  // pending
  return (
    <span
      className={`${base} bg-warning-muted text-warning border border-warning/20`}
    >
      {status}
    </span>
  );
}

export function PhotoModeration({ photos }: PhotoModerationProps) {
  const [tab, setTab] = useState<FilterTab>("pending");
  const [loading, setLoading] = useState<string | null>(null);

  const filtered =
    tab === "all" ? photos : photos.filter((p) => p.status === tab);
  const pendingCount = photos.filter((p) => p.status === "pending").length;
  const approvedCount = photos.filter((p) => p.status === "approved").length;
  const rejectedCount = photos.filter((p) => p.status === "rejected").length;

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
    { key: "rejected", label: "Rejected", count: rejectedCount },
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
              <span
                className={`ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold tabular-nums ${
                  tab === t.key
                    ? "bg-primary/10 text-primary"
                    : "bg-neutral-100 text-muted-foreground"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Photo grid */}
      {filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-2">
          <p className="font-sans text-sm text-muted-foreground/70">
            No {tab === "all" ? "" : tab} photos
          </p>
          {tab === "pending" && (
            <p className="font-sans text-xs text-muted-foreground/50">
              Photos submitted via the public gallery appear here.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((photo) => (
            <Card
              key={photo.id}
              className="group overflow-hidden shadow-sm border border-border/60"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <div className="absolute inset-0 transition-transform duration-200 group-hover:scale-[1.02]">
                  <Image
                    src={photo.image_url}
                    alt={photo.caption || "Tournament photo"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className="absolute right-2 top-2 z-10">
                  <StatusBadge status={photo.status} />
                </div>
              </div>
              <CardContent className="pt-3">
                {photo.caption && (
                  <p className="text-sm text-foreground line-clamp-2">
                    {photo.caption}
                  </p>
                )}
                <p className="mt-1 font-sans text-[0.75rem] text-muted-foreground">
                  By {photo.uploaded_by_name}
                  {photo.uploaded_by_email && ` (${photo.uploaded_by_email})`}
                </p>
                <p className="font-sans text-[0.75rem] tabular-nums text-muted-foreground">
                  {new Date(photo.created_at).toLocaleDateString()}
                </p>

                <div
                  className={`mt-3 flex gap-2 ${loading === photo.id ? "opacity-50 pointer-events-none" : ""}`}
                >
                  {photo.status !== "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApprove(photo.id)}
                      disabled={loading === photo.id}
                      className="text-success hover:text-success"
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
                      className="hover:text-destructive hover:border-destructive/40 transition-colors duration-150"
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
                    className="ml-auto text-destructive hover:bg-destructive/10 transition-colors duration-150"
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
