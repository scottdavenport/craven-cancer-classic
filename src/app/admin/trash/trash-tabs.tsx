"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Contact, Team, Sponsor, SponsorshipItem, Photo } from "@/types/database";
import {
  restoreContact,
  restoreTeam,
  restoreSponsor,
  restoreSponsorshipItem,
  restorePhoto,
} from "./actions";

interface TrashTabsProps {
  contacts: Contact[];
  teams: Team[];
  sponsors: Sponsor[];
  sponsorshipItems: SponsorshipItem[];
  photos: Photo[];
}

type TabKey = "contacts" | "teams" | "sponsors" | "sponsorshipItems" | "photos";

const TAB_LABELS: Record<TabKey, string> = {
  contacts: "Contacts",
  teams: "Teams",
  sponsors: "Sponsors",
  sponsorshipItems: "Sponsorship Items",
  photos: "Photos",
};

function formatDeletedAt(value: string | null): string {
  if (!value) return "Unknown";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "Unknown";
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function truncateUuid(id: string | null): string {
  if (!id) return "Unknown";
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function EmptyState() {
  return <AdminEmptyState title="Nothing in trash" />;
}

// ---- Per-entity tab panels ----

function ContactsTab({ initial }: { initial: Contact[] }) {
  const [rows, setRows] = useState(initial);

  async function handleRestore(id: string) {
    const result = await restoreContact(id);
    if ("ok" in result) {
      toast.success("Restored");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } else {
      toast.error(result.error);
    }
  }

  if (rows.length === 0) return <EmptyState />;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Deleted</TableHead>
            <TableHead>Deleted By</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.full_name || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{formatDeletedAt(row.deleted_at)}</TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">{truncateUuid(row.deleted_by)}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => handleRestore(row.id)}>
                  Restore
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TeamsTab({ initial }: { initial: Team[] }) {
  const [rows, setRows] = useState(initial);

  async function handleRestore(id: string) {
    const result = await restoreTeam(id);
    if ("ok" in result) {
      toast.success("Restored");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } else {
      toast.error(result.error);
    }
  }

  if (rows.length === 0) return <EmptyState />;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Team Name</TableHead>
            <TableHead>Deleted</TableHead>
            <TableHead>Deleted By</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.team_name || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{formatDeletedAt(row.deleted_at)}</TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">{truncateUuid(row.deleted_by)}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => handleRestore(row.id)}>
                  Restore
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SponsorsTab({ initial }: { initial: Sponsor[] }) {
  const [rows, setRows] = useState(initial);

  async function handleRestore(id: string) {
    const result = await restoreSponsor(id);
    if ("ok" in result) {
      toast.success("Restored");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } else {
      toast.error(result.error);
    }
  }

  if (rows.length === 0) return <EmptyState />;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Deleted</TableHead>
            <TableHead>Deleted By</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.name || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{formatDeletedAt(row.deleted_at)}</TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">{truncateUuid(row.deleted_by)}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => handleRestore(row.id)}>
                  Restore
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SponsorshipItemsTab({ initial }: { initial: SponsorshipItem[] }) {
  const [rows, setRows] = useState(initial);

  async function handleRestore(id: string) {
    const result = await restoreSponsorshipItem(id);
    if ("ok" in result) {
      toast.success("Restored");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } else {
      toast.error(result.error);
    }
  }

  if (rows.length === 0) return <EmptyState />;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Deleted</TableHead>
            <TableHead>Deleted By</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.name || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{formatDeletedAt(row.deleted_at)}</TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">{truncateUuid(row.deleted_by)}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => handleRestore(row.id)}>
                  Restore
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PhotosTab({ initial }: { initial: Photo[] }) {
  const [rows, setRows] = useState(initial);

  async function handleRestore(id: string) {
    const result = await restorePhoto(id);
    if ("ok" in result) {
      toast.success("Restored");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } else {
      toast.error(result.error);
    }
  }

  if (rows.length === 0) return <EmptyState />;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Caption / ID</TableHead>
            <TableHead>Deleted</TableHead>
            <TableHead>Deleted By</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">
                {row.caption ? row.caption : (
                  <span className="font-mono text-xs text-muted-foreground">{truncateUuid(row.id)}</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDeletedAt(row.deleted_at)}</TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">{truncateUuid(row.deleted_by)}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => handleRestore(row.id)}>
                  Restore
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---- Main component ----

export function TrashTabs({
  contacts,
  teams,
  sponsors,
  sponsorshipItems,
  photos,
}: TrashTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("contacts");

  const counts: Record<TabKey, number> = {
    contacts: contacts.length,
    teams: teams.length,
    sponsors: sponsors.length,
    sponsorshipItems: sponsorshipItems.length,
    photos: photos.length,
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border/60 mb-6">
        {(Object.entries(TAB_LABELS) as [TabKey, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={[
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            ].join(" ")}
          >
            {label}
            {counts[key] > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[0.6875rem] font-semibold text-muted-foreground">
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === "contacts" && <ContactsTab initial={contacts} />}
      {activeTab === "teams" && <TeamsTab initial={teams} />}
      {activeTab === "sponsors" && <SponsorsTab initial={sponsors} />}
      {activeTab === "sponsorshipItems" && <SponsorshipItemsTab initial={sponsorshipItems} />}
      {activeTab === "photos" && <PhotosTab initial={photos} />}
    </div>
  );
}
