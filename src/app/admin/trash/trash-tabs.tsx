"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { Tabs, TabsList, TabsTrigger, TabsPanel } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Contact, Team, Sponsor, SponsorshipItem, Photo } from "@/types/database";
import type { WithDeletedByName, TrashTeam } from "./actions";
import {
  restoreContact,
  restoreTeam,
  restoreSponsor,
  restoreSponsorshipItem,
  restorePhoto,
} from "./actions";

interface TrashTabsProps {
  contacts: WithDeletedByName<Contact>[];
  teams: TrashTeam[];
  sponsors: WithDeletedByName<Sponsor>[];
  sponsorshipItems: WithDeletedByName<SponsorshipItem>[];
  photos: WithDeletedByName<Photo>[];
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

function formatDeletedBy(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return value;
}

function EmptyState() {
  return <AdminEmptyState title="Nothing in trash" />;
}

// ---------------------------------------------------------------------------
// Generic TrashTable
// ---------------------------------------------------------------------------

interface ColumnDef<T> {
  /** Column header label */
  header: string;
  /** Render function for the primary data cell (first column) */
  renderName: (row: T) => React.ReactNode;
}

interface TrashTableProps<T extends { id: string; deleted_at: string | null; deleted_by: string | null; deleted_by_name: string | null }> {
  rows: T[];
  columns: ColumnDef<T>;
  onRestore: (id: string) => void;
}

function TrashTable<T extends { id: string; deleted_at: string | null; deleted_by: string | null; deleted_by_name: string | null }>({
  rows,
  columns,
  onRestore,
}: TrashTableProps<T>) {
  return (
    <div className="overflow-x-auto" data-testid="trash-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{columns.header}</TableHead>
            <TableHead>Deleted</TableHead>
            <TableHead>Deleted By</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{columns.renderName(row)}</TableCell>
              <TableCell className="text-muted-foreground">{formatDeletedAt(row.deleted_at)}</TableCell>
              <TableCell className="text-muted-foreground">{formatDeletedBy(row.deleted_by_name)}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => onRestore(row.id)}>
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

// ---- Per-entity tab panels ----

function ContactsTab({ initial }: { initial: WithDeletedByName<Contact>[] }) {
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
    <TrashTable
      rows={rows}
      columns={{ header: "Name", renderName: (row) => row.full_name || "—" }}
      onRestore={handleRestore}
    />
  );
}

function TeamsTab({ initial }: { initial: TrashTeam[] }) {
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
    <TrashTable
      rows={rows}
      columns={{ header: "Team", renderName: (row) => row.captain_display_name || "(no captain)" }}
      onRestore={handleRestore}
    />
  );
}

function SponsorsTab({ initial }: { initial: WithDeletedByName<Sponsor>[] }) {
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
    <TrashTable
      rows={rows}
      columns={{ header: "Name", renderName: (row) => row.name || "—" }}
      onRestore={handleRestore}
    />
  );
}

function SponsorshipItemsTab({ initial }: { initial: WithDeletedByName<SponsorshipItem>[] }) {
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
    <TrashTable
      rows={rows}
      columns={{ header: "Name", renderName: (row) => row.name || "—" }}
      onRestore={handleRestore}
    />
  );
}

function PhotosTab({ initial }: { initial: WithDeletedByName<Photo>[] }) {
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
    <TrashTable
      rows={rows}
      columns={{
        header: "Caption / ID",
        renderName: (row) =>
          row.caption ? (
            row.caption
          ) : (
            <span className="font-mono text-xs text-muted-foreground">
              {row.id.length > 8 ? `${row.id.slice(0, 8)}…` : row.id}
            </span>
          ),
      }}
      onRestore={handleRestore}
    />
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
  const counts: Record<TabKey, number> = {
    contacts: contacts.length,
    teams: teams.length,
    sponsors: sponsors.length,
    sponsorshipItems: sponsorshipItems.length,
    photos: photos.length,
  };

  return (
    <Tabs defaultValue="contacts">
      {/* Tab bar */}
      <TabsList className="flex gap-1 border-b border-border/60 mb-6">
        {(Object.entries(TAB_LABELS) as [TabKey, string][]).map(([key, label]) => (
          <TabsTrigger
            key={key}
            value={key}
            count={counts[key] > 0 ? counts[key] : undefined}
            className="px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px data-[selected]:border-primary data-[selected]:text-foreground border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Tab panels */}
      <TabsPanel value="contacts"><ContactsTab initial={contacts} /></TabsPanel>
      <TabsPanel value="teams"><TeamsTab initial={teams} /></TabsPanel>
      <TabsPanel value="sponsors"><SponsorsTab initial={sponsors} /></TabsPanel>
      <TabsPanel value="sponsorshipItems"><SponsorshipItemsTab initial={sponsorshipItems} /></TabsPanel>
      <TabsPanel value="photos"><PhotosTab initial={photos} /></TabsPanel>
    </Tabs>
  );
}
