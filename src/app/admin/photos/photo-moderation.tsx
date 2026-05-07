"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X, Trash2 } from "lucide-react";
import { updatePhotoStatus, deletePhoto, exportPhotosCSV } from "./actions";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import type { Photo } from "@/types/database";
import { Tabs, TabsList, TabsTrigger, TabsPanel } from "@/components/ui/tabs";

interface PhotoModerationProps {
  photos: Photo[];
}

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
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Photo | null>(null);
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  // Derive available years from the full photos set, descending
  const availableYears = useMemo(() => {
    return Array.from(new Set(photos.map((p) => p.year))).sort((a, b) => b - a);
  }, [photos]);

  // Client-side year filter
  const filteredPhotos = useMemo(() => {
    if (yearFilter === "all") return photos;
    return photos.filter((p) => p.year === Number(yearFilter));
  }, [photos, yearFilter]);

  const filterActive = yearFilter !== "all";

  const pendingPhotos = filteredPhotos.filter((p) => p.status === "pending");
  const approvedPhotos = filteredPhotos.filter((p) => p.status === "approved");
  const rejectedPhotos = filteredPhotos.filter((p) => p.status === "rejected");

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

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setLoading(deleteTarget.id);
    await deletePhoto(deleteTarget.id);
    setLoading(null);
  }

  async function handleExportCSV() {
    setExporting(true);
    try {
      const yearParam = yearFilter !== "all" ? Number(yearFilter) : undefined;
      const csv = await exportPhotosCSV(yearParam);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10);
      const suffix = yearFilter !== "all" ? `-${yearFilter}` : "";
      const filename = `photos${suffix}-${today}.csv`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[PhotoModeration] exportPhotosCSV failed:", err);
    } finally {
      setExporting(false);
    }
  }

  function clearFilters() {
    setYearFilter("all");
  }

  function PhotoGrid({
    items,
    filterActive: gridFilterActive,
  }: {
    items: Photo[];
    filterActive: boolean;
  }) {
    if (items.length === 0) {
      return (
        <AdminEmptyState
          filterActive={gridFilterActive}
          title={
            gridFilterActive
              ? "No photos match your filters"
              : "No photos yet"
          }
          action={
            gridFilterActive ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((photo) => (
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
                    aria-label={`Approve photo from ${photo.uploaded_by_name}`}
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
                    aria-label={`Reject photo from ${photo.uploaded_by_name}`}
                    className="hover:text-destructive hover:border-destructive/40 transition-colors duration-150"
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Reject
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteTarget(photo)}
                  disabled={loading === photo.id}
                  title="Delete photo"
                  aria-label={`Delete photo from ${photo.uploaded_by_name}`}
                  className="ml-auto text-destructive hover:bg-destructive/10 transition-colors duration-150"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter bar — Year only (D1). Photos has no search input per design. */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Year</span>
          <Select
            value={yearFilter}
            onValueChange={(v) => setYearFilter(v ?? "all")}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={exporting}
        >
          {exporting ? "Exporting..." : "Download CSV"}
        </Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="flex gap-1 border-b border-border">
          <TabsTrigger
            value="pending"
            count={pendingPhotos.length}
            className="px-4 py-2 text-sm font-medium transition-colors data-[selected]:border-b-2 data-[selected]:border-primary data-[selected]:text-foreground text-muted-foreground hover:text-foreground"
          >
            Pending
          </TabsTrigger>
          <TabsTrigger
            value="approved"
            count={approvedPhotos.length}
            className="px-4 py-2 text-sm font-medium transition-colors data-[selected]:border-b-2 data-[selected]:border-primary data-[selected]:text-foreground text-muted-foreground hover:text-foreground"
          >
            Approved
          </TabsTrigger>
          <TabsTrigger
            value="rejected"
            count={rejectedPhotos.length}
            className="px-4 py-2 text-sm font-medium transition-colors data-[selected]:border-b-2 data-[selected]:border-primary data-[selected]:text-foreground text-muted-foreground hover:text-foreground"
          >
            Rejected
          </TabsTrigger>
          <TabsTrigger
            value="all"
            count={filteredPhotos.length}
            className="px-4 py-2 text-sm font-medium transition-colors data-[selected]:border-b-2 data-[selected]:border-primary data-[selected]:text-foreground text-muted-foreground hover:text-foreground"
          >
            All
          </TabsTrigger>
        </TabsList>

        <TabsPanel value="pending" className="mt-6">
          <PhotoGrid items={pendingPhotos} filterActive={filterActive} />
        </TabsPanel>
        <TabsPanel value="approved" className="mt-6">
          <PhotoGrid items={approvedPhotos} filterActive={filterActive} />
        </TabsPanel>
        <TabsPanel value="rejected" className="mt-6">
          <PhotoGrid items={rejectedPhotos} filterActive={filterActive} />
        </TabsPanel>
        <TabsPanel value="all" className="mt-6">
          <PhotoGrid items={filteredPhotos} filterActive={filterActive} />
        </TabsPanel>
      </Tabs>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete this photo?"
        description="This permanently removes the photo — it cannot be restored from Trash."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
      />
    </div>
  );
}
