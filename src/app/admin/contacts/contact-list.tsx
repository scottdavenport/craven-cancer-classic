"use client";

import { useState, useMemo, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { FilterBar } from "@/components/admin/filter-bar";
import { StatusTabs } from "@/components/admin/status-tabs";
import { RowActions } from "@/components/admin/row-actions";
import { ActiveFilterChips } from "@/components/admin/active-filter-chips";
import {
  exportContactsCSV,
  getContacts,
  bulkUpdateContacts,
  bulkDeleteContacts,
  bulkSetContactTypes,
  bulkAddContactType,
  bulkRemoveContactType,
} from "./actions";
import { ContactModal } from "./contact-modal";
import type { Contact } from "@/types/database";
import type { ContactFilter, TeamFilterOption } from "./actions";
import { toast } from "sonner";

type ContactType = "player" | "sponsor" | "donor" | "volunteer" | "other";

interface ContactListProps {
  contacts: Contact[];
  teams: TeamFilterOption[];
}

// Canonical display order for type chips: Player → Sponsor → Donor → Volunteer → Other
const CANONICAL_TYPE_ORDER: ContactType[] = [
  "player",
  "sponsor",
  "donor",
  "volunteer",
  "other",
];

const TYPE_BADGE_CLASSES: Record<string, string> = {
  player: "bg-brand-muted text-brand",
  sponsor: "bg-purple-muted text-purple",
  donor: "bg-success-muted text-success",
  volunteer: "bg-warning-muted text-warning",
  other: "bg-neutral-100 text-neutral-600",
};

function TypeBadge({ type }: { type: string }) {
  const classes = TYPE_BADGE_CLASSES[type] ?? TYPE_BADGE_CLASSES.other;
  return (
    <span
      className={`inline-block rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] ${classes}`}
    >
      {type}
    </span>
  );
}

function TypeBadgeList({ types }: { types: string[] | null | undefined }) {
  const safeTypes = types ?? [];
  const sorted = [...safeTypes].sort((a, b) => {
    const ai = CANONICAL_TYPE_ORDER.indexOf(a as ContactType);
    const bi = CANONICAL_TYPE_ORDER.indexOf(b as ContactType);
    return (ai === -1 ? CANONICAL_TYPE_ORDER.length : ai) -
      (bi === -1 ? CANONICAL_TYPE_ORDER.length : bi);
  });
  if (sorted.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {sorted.map((t) => (
        <TypeBadge key={t} type={t} />
      ))}
    </div>
  );
}

function ConsentBadge({ consented }: { consented: boolean }) {
  return consented ? (
    <span
      className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold bg-success-muted text-success"
      title="Subscribed to marketing"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path
          d="M1.5 5.5L3.5 7.5L8.5 2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Subscribed
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold bg-neutral-100 text-neutral-500"
      title="Not subscribed"
    >
      Unsubscribed
    </span>
  );
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  const diff = Date.now() - date.getTime();
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return rtf.format(-seconds, "second");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 30) return rtf.format(-days, "day");
  const months = Math.floor(days / 30);
  if (months < 12) return rtf.format(-months, "month");
  return rtf.format(-Math.floor(months / 12), "year");
}

const DATA_HEADERS = ["Name", "Email", "Type", "Company", "Consent", "Added"];

type DrawerState = {
  open: boolean;
  mode: "create" | "edit";
  contact: Contact | null;
};

type BlockedAlert = {
  reasons: string[];
};

type StatusFilter = "subscribed" | "unsubscribed" | "all";

export function ContactList({ contacts: initialContacts, teams }: ContactListProps) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [captainOnly, setCaptainOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [drawer, setDrawer] = useState<DrawerState>({
    open: false,
    mode: "create",
    contact: null,
  });

  // Multi-select state — persists across filter changes
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isBulkPending, setIsBulkPending] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Inline blocked-row alert shown below bulk-action bar
  const [blockedAlert, setBlockedAlert] = useState<BlockedAlert | null>(null);

  function refetch() {
    startTransition(async () => {
      try {
        const filter: ContactFilter = {};
        if (typeFilter !== "all") filter.type = typeFilter as ContactType;
        if (teamFilter !== "all") filter.team_id = teamFilter;
        if (captainOnly) filter.captain_only = true;
        const fresh = await getContacts(filter);
        setContacts(fresh);
      } catch (err) {
        console.error("[ContactList] refetch failed:", err);
      }
    });
  }

  // Client-side filters: type, search (name/email/phone/company), consent (via status tabs)
  // team_id / captain_only are handled server-side via re-fetch
  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (typeFilter !== "all" && !(c.types ?? []).includes(typeFilter)) return false;
      if (statusFilter === "subscribed" && !c.marketing_consent) return false;
      if (statusFilter === "unsubscribed" && c.marketing_consent) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const displayName = c.first_name || c.last_name
          ? [c.first_name, c.last_name].filter(Boolean).join(" ")
          : null;
        const nameMatch =
          (displayName ?? "").toLowerCase().includes(q) ||
          (c.full_name ?? "").toLowerCase().includes(q);
        const emailMatch = (c.email ?? "").toLowerCase().includes(q);
        const phoneMatch = (c.phone ?? "").toLowerCase().includes(q);
        const companyMatch = (c.company ?? "").toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !phoneMatch && !companyMatch) return false;
      }
      return true;
    });
  }, [contacts, typeFilter, statusFilter, search]);

  // Status tab counts from current (server-filtered) contacts
  const subscribedCount = useMemo(() => contacts.filter((c) => c.marketing_consent).length, [contacts]);
  const unsubscribedCount = useMemo(() => contacts.filter((c) => !c.marketing_consent).length, [contacts]);
  const allCount = contacts.length;

  const statusTabs = [
    { id: "subscribed", label: "Subscribed", count: subscribedCount },
    { id: "unsubscribed", label: "Unsubscribed", count: unsubscribedCount },
    { id: "all", label: "All", count: allCount },
  ];

  const hasActiveFilters =
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    search.trim() !== "" ||
    teamFilter !== "all" ||
    captainOnly;

  const overCap = selected.size > 500;

  // Re-fetch contacts from server when team/captain filters change
  function fetchWithServerFilter(newTeamFilter: string, newCaptainOnly: boolean) {
    startTransition(async () => {
      try {
        const filterArg: ContactFilter = {};
        if (newTeamFilter !== "all") filterArg.team_id = newTeamFilter;
        if (newCaptainOnly) filterArg.captain_only = true;
        const result = await getContacts(filterArg);
        setContacts(result);
      } catch (err) {
        console.error("[ContactList] getContacts re-fetch failed:", err);
      }
    });
  }

  function handleTeamFilterChange(value: string | null) {
    const next = value ?? "all";
    setTeamFilter(next);
    fetchWithServerFilter(next, captainOnly);
  }

  function handleCaptainOnlyChange(checked: boolean) {
    setCaptainOnly(checked);
    fetchWithServerFilter(teamFilter, checked);
  }

  function handleClearAllFilters() {
    setStatusFilter("all");
    setTypeFilter("all");
    setSearch("");
    setTeamFilter("all");
    setCaptainOnly(false);
    fetchWithServerFilter("all", false);
  }

  async function handleExportCSV() {
    setExporting(true);
    try {
      const filterArg: ContactFilter = {};
      if (typeFilter !== "all") filterArg.type = typeFilter as ContactType;
      if (teamFilter !== "all") filterArg.team_id = teamFilter;
      if (captainOnly) filterArg.captain_only = true;

      const csv = await exportContactsCSV(filterArg);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10);
      const typeLabel = typeFilter !== "all" ? typeFilter : "all";
      const filename = `contacts-subscribed-${typeLabel}-${today}.csv`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[ContactList] exportContactsCSV failed:", err);
    } finally {
      setExporting(false);
    }
  }

  // Selection helpers
  const filteredIds = useMemo(() => filtered.map((c) => c.id), [filtered]);
  const allVisibleSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const someVisibleSelected = filteredIds.some((id) => selected.has(id));
  const notInViewCount = selected.size - filtered.filter((c) => selected.has(c.id)).length;

  function handleHeaderCheckbox() {
    if (allVisibleSelected) {
      // Deselect all visible
      setSelected((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all visible
      setSelected((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
    setLastSelectedIndex(null);
  }

  function handleRowCheckbox(
    e: React.MouseEvent<HTMLElement>,
    contactId: string,
    index: number
  ) {
    e.stopPropagation();

    if (e.shiftKey && lastSelectedIndex !== null) {
      // Range select
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = filteredIds.slice(start, end + 1);
      const isSelecting = !selected.has(contactId);
      setSelected((prev) => {
        const next = new Set(prev);
        rangeIds.forEach((id) => {
          if (isSelecting) next.add(id);
          else next.delete(id);
        });
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(contactId)) next.delete(contactId);
        else next.add(contactId);
        return next;
      });
    }
    setLastSelectedIndex(index);
  }

  // Bulk action handlers — type operations
  async function handleBulkSetTypes(types: ContactType[]) {
    const ids = Array.from(selected);
    setBlockedAlert(null);
    setIsBulkPending(true);
    try {
      const result = await bulkSetContactTypes(ids, types);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Updated ${result.updated} contact${result.updated !== 1 ? "s" : ""}`);
        setSelected(new Set());
        refetch();
      }
    } finally {
      setIsBulkPending(false);
    }
  }

  async function handleBulkAddType(type: ContactType) {
    const ids = Array.from(selected);
    setBlockedAlert(null);
    setIsBulkPending(true);
    try {
      const result = await bulkAddContactType(ids, type);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Updated ${result.updated} contact${result.updated !== 1 ? "s" : ""}`);
        setSelected(new Set());
        refetch();
      }
    } finally {
      setIsBulkPending(false);
    }
  }

  async function handleBulkRemoveType(type: ContactType) {
    const ids = Array.from(selected);
    setBlockedAlert(null);
    setIsBulkPending(true);
    try {
      const result = await bulkRemoveContactType(ids, type);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        if (result.blocked.length > 0) {
          setBlockedAlert({ reasons: result.blocked.map((b) => b.reason) });
        }
        if (result.updated > 0) {
          toast.success(`Updated ${result.updated} contact${result.updated !== 1 ? "s" : ""}`);
        }
        setSelected(new Set());
        refetch();
      }
    } finally {
      setIsBulkPending(false);
    }
  }

  async function handleBulkSubscribe() {
    const ids = Array.from(selected);
    setIsBulkPending(true);
    try {
      const result = await bulkUpdateContacts(ids, { marketing_consent: true });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Subscribed ${result.updated} contact${result.updated !== 1 ? "s" : ""}`);
        setSelected(new Set());
        refetch();
      }
    } finally {
      setIsBulkPending(false);
    }
  }

  async function handleBulkUnsubscribe() {
    const ids = Array.from(selected);
    setIsBulkPending(true);
    try {
      const result = await bulkUpdateContacts(ids, { marketing_consent: false });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(
          `Unsubscribed ${result.updated} contact${result.updated !== 1 ? "s" : ""}`
        );
        setSelected(new Set());
        refetch();
      }
    } finally {
      setIsBulkPending(false);
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selected);
    setIsBulkPending(true);
    setDeleteDialogOpen(false);
    try {
      const result = await bulkDeleteContacts(ids);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Deleted ${result.deleted} contact${result.deleted !== 1 ? "s" : ""}`);
        setSelected(new Set());
        // Optimistically remove deleted contacts from local state synchronously so
        // the rows disappear before the next RSC re-render. This eliminates the
        // webkit race where startTransition's async refetch() didn't resolve before
        // the test asserted .not.toBeVisible (Spec diagnostic — ci-unblock task).
        setContacts((prev) => prev.filter((c) => !ids.includes(c.id)));
      }
    } finally {
      setIsBulkPending(false);
    }
  }

  // Build active filter chips
  const filterChips = useMemo(() => {
    const chips: Array<{ id: string; keyText: string; valueText?: string; onRemove: () => void }> = [];
    if (statusFilter !== "all") {
      chips.push({
        id: "status",
        keyText: "Status",
        valueText: statusFilter === "subscribed" ? "Subscribed" : "Unsubscribed",
        onRemove: () => setStatusFilter("all"),
      });
    }
    if (typeFilter !== "all") {
      const labels: Record<string, string> = {
        player: "Player",
        sponsor: "Sponsor",
        donor: "Donor",
        volunteer: "Volunteer",
        other: "Other",
      };
      chips.push({
        id: "type",
        keyText: "Type",
        valueText: labels[typeFilter] ?? typeFilter,
        onRemove: () => setTypeFilter("all"),
      });
    }
    if (teamFilter !== "all") {
      const team = teams.find((t) => t.id === teamFilter);
      chips.push({
        id: "team",
        keyText: "Team",
        valueText: team?.captain_display_name ?? teamFilter,
        onRemove: () => handleTeamFilterChange("all"),
      });
    }
    if (captainOnly) {
      chips.push({
        id: "captains",
        keyText: "Captains only",
        onRemove: () => handleCaptainOnlyChange(false),
      });
    }
    return chips;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, teamFilter, captainOnly, teams]);

  return (
    <div className="space-y-0">
      {/* Status tabs */}
      <StatusTabs
        tabs={statusTabs}
        activeId={statusFilter}
        onChange={(id) => setStatusFilter(id as StatusFilter)}
        ariaLabel="Contact status"
      />

      {/* Filter bar */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email, phone, or company"
        chips={
          filterChips.length > 0 ? (
            <ActiveFilterChips
              chips={filterChips}
              onClearAll={handleClearAllFilters}
            />
          ) : undefined
        }
      >
        {/* Type filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Type
          </label>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v ?? "all")}
            items={{
              all: "All types",
              player: "Player",
              sponsor: "Sponsor",
              donor: "Donor",
              volunteer: "Volunteer",
              other: "Other",
            }}
          >
            <SelectTrigger
              aria-label="Type"
              data-testid="type-filter-trigger"
              className="w-full"
            >
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="player">Player</SelectItem>
              <SelectItem value="sponsor">Sponsor</SelectItem>
              <SelectItem value="donor">Donor</SelectItem>
              <SelectItem value="volunteer">Volunteer</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Team filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Team
          </label>
          <Select
            value={teamFilter}
            onValueChange={handleTeamFilterChange}
            items={{
              all: "All teams",
              ...Object.fromEntries(teams.map((t) => [t.id, t.captain_display_name])),
            }}
          >
            <SelectTrigger
              aria-label="Team"
              data-testid="team-filter-trigger"
              className="w-full"
            >
              <SelectValue placeholder="All teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.captain_display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Captains only toggle */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            &nbsp;
          </label>
          <label className="flex items-center gap-2 h-9 text-[0.8125rem] text-muted-foreground select-none">
            <Checkbox
              checked={captainOnly}
              onCheckedChange={handleCaptainOnlyChange}
            />
            Captains only
          </label>
        </div>
      </FilterBar>

      {/* Action bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border/60">
        <p className="text-[0.8125rem] text-muted-foreground">
          {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
          {hasActiveFilters && contacts.length !== filtered.length
            ? ` of ${contacts.length} total`
            : ""}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={exporting}
            title="Exports subscribed contacts only (CAN-SPAM)"
          >
            {exporting ? "Exporting..." : "Export CSV (subscribed only)"}
          </Button>
          <Button
            size="sm"
            onClick={() => setDrawer({ open: true, mode: "create", contact: null })}
          >
            New Contact
          </Button>
        </div>
      </div>

      {/* Selection counter */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 text-[0.8125rem] text-muted-foreground bg-card border-b border-border/60">
          <span className="font-medium text-foreground">{selected.size} selected</span>
          {notInViewCount > 0 && (
            <span className="text-neutral-400">({notInViewCount} not in current view)</span>
          )}
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-brand underline underline-offset-2 hover:no-underline ml-1"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-neutral-50 px-4 py-2.5 shadow-sm mx-4 my-2">
          <span className="text-[0.8125rem] font-semibold text-foreground mr-2">
            {selected.size} selected
          </span>

          {overCap ? (
            <span className="text-[0.8125rem] text-destructive">
              Select 500 or fewer contacts to use bulk actions.
            </span>
          ) : (
            <>
              {/* Set types — overwrites existing types for selected contacts */}
              <Select
                onValueChange={(v) => {
                  if (v) handleBulkSetTypes([v as ContactType]);
                }}
                items={{
                  player: "Player",
                  sponsor: "Sponsor",
                  donor: "Donor",
                  volunteer: "Volunteer",
                  other: "Other",
                }}
              >
                <SelectTrigger
                  className="h-8 w-[130px] text-xs"
                  disabled={isBulkPending}
                  aria-label="Set types"
                >
                  <SelectValue placeholder="Set types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Player</SelectItem>
                  <SelectItem value="sponsor">Sponsor</SelectItem>
                  <SelectItem value="donor">Donor</SelectItem>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              {/* Add a type */}
              <Select
                onValueChange={(v) => {
                  if (v) handleBulkAddType(v as ContactType);
                }}
                items={{
                  player: "Player",
                  sponsor: "Sponsor",
                  donor: "Donor",
                  volunteer: "Volunteer",
                  other: "Other",
                }}
              >
                <SelectTrigger
                  className="h-8 w-[130px] text-xs"
                  disabled={isBulkPending}
                  aria-label="Add type"
                >
                  <SelectValue placeholder="Add type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Player</SelectItem>
                  <SelectItem value="sponsor">Sponsor</SelectItem>
                  <SelectItem value="donor">Donor</SelectItem>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              {/* Remove a type — blocked rows surface inline Alert below */}
              <Select
                onValueChange={(v) => {
                  if (v) handleBulkRemoveType(v as ContactType);
                }}
                items={{
                  player: "Player",
                  sponsor: "Sponsor",
                  donor: "Donor",
                  volunteer: "Volunteer",
                  other: "Other",
                }}
              >
                <SelectTrigger
                  className="h-8 w-[140px] text-xs"
                  disabled={isBulkPending}
                  aria-label="Remove type"
                >
                  <SelectValue placeholder="Remove type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Player</SelectItem>
                  <SelectItem value="sponsor">Sponsor</SelectItem>
                  <SelectItem value="donor">Donor</SelectItem>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={isBulkPending || overCap}
            onClick={handleBulkSubscribe}
          >
            Subscribe
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={isBulkPending || overCap}
            onClick={handleBulkUnsubscribe}
          >
            Unsubscribe
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
            disabled={isBulkPending}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            disabled={isBulkPending}
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Inline blocked-row Alert — rendered below the bulk-action bar, stays until dismissed */}
      {blockedAlert && (
        <div
          role="alert"
          aria-live="polite"
          data-testid="bulk-blocked-alert"
          className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-muted/40 px-4 py-3 text-[0.8125rem] mx-4"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="flex-shrink-0 mt-0.5 text-warning"
            aria-hidden="true"
          >
            <path
              d="M8 5v3.5M8 11h.01M7.13 1.86 1.4 12.13a1 1 0 0 0 .87 1.5h11.46a1 1 0 0 0 .87-1.5L8.87 1.86a1 1 0 0 0-1.74 0Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex-1">
            <p className="font-semibold text-warning mb-1">
              Some contacts could not be updated
            </p>
            <ul className="space-y-0.5 text-foreground">
              {blockedAlert.reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setBlockedAlert(null)}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Table */}
      <div
        className="overflow-x-auto rounded-b-lg border border-border/60 shadow-sm transition-opacity duration-150"
        style={{ opacity: isPending ? 0.6 : 1 }}
      >
        {isPending && (
          <div className="px-4 py-2 text-[0.75rem] text-muted-foreground bg-neutral-50 border-b border-border/60">
            Refreshing...
          </div>
        )}
        {filtered.length === 0 ? (
          <AdminEmptyState
            filterActive={hasActiveFilters}
            title={hasActiveFilters ? "No contacts match your filters" : "No contacts yet"}
            action={
              hasActiveFilters ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllFilters}
                >
                  Clear filters
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setDrawer({ open: true, mode: "create", contact: null })}
                >
                  Add contact
                </Button>
              )
            }
          />
        ) : (
          <table className="w-full caption-bottom text-sm">
            <thead className="bg-neutral-50">
              <tr>
                {/* Checkbox header */}
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    aria-label="Select all"
                    checked={allVisibleSelected}
                    indeterminate={!allVisibleSelected && someVisibleSelected}
                    onCheckedChange={() => handleHeaderCheckbox()}
                  />
                </th>
                {DATA_HEADERS.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
                {/* Row actions column */}
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact, index) => {
                const isSelected = selected.has(contact.id);
                const displayName =
                  contact.first_name || contact.last_name
                    ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
                    : null;
                const nameForLabel =
                  displayName ?? contact.full_name ?? null;
                const editLabel = nameForLabel
                  ? `Edit ${nameForLabel}`
                  : "Edit contact";
                const deleteLabel = nameForLabel
                  ? `Delete ${nameForLabel}`
                  : "Delete contact";
                const selectLabel = nameForLabel
                  ? `Select ${nameForLabel}`
                  : "Select contact";

                return (
                  <tr
                    key={contact.id}
                    className={`group/row border-t border-border/60 hover:bg-neutral-50/50 transition-colors duration-100 ${
                      isSelected ? "bg-brand-muted/30" : ""
                    }`}
                  >
                    {/* Checkbox cell */}
                    <td
                      className="px-4 py-3 w-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowCheckbox(e, contact.id, index);
                      }}
                    >
                      <Checkbox
                        aria-label={selectLabel}
                        checked={isSelected}
                        onCheckedChange={() => {/* controlled by td onClick */}}
                      />
                    </td>

                    {/* Name — structured name + full_name fallback */}
                    <td className="px-4 py-3">
                      <span className="text-[0.8125rem] font-medium text-foreground block">
                        {displayName ?? contact.full_name}
                      </span>
                      {displayName && displayName !== contact.full_name && (
                        <span className="text-[0.75rem] text-muted-foreground block">
                          {contact.full_name}
                        </span>
                      )}
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 font-mono text-[0.75rem] text-muted-foreground">
                      {contact.email ?? <span className="text-neutral-400 italic">none</span>}
                    </td>

                    {/* Type — stacked chips in canonical order */}
                    <td className="px-4 py-3">
                      <TypeBadgeList types={contact.types} />
                    </td>

                    {/* Company */}
                    <td
                      className="px-4 py-3 text-[0.8125rem] text-muted-foreground truncate max-w-[160px]"
                      title={contact.company ?? undefined}
                    >
                      {contact.company ?? <span className="text-neutral-300">—</span>}
                    </td>

                    {/* Consent */}
                    <td className="px-4 py-3">
                      <ConsentBadge consented={contact.marketing_consent} />
                    </td>

                    {/* Added */}
                    <td className="px-4 py-3 text-[0.75rem] text-muted-foreground">
                      {relativeTime(contact.created_at)}
                    </td>

                    {/* Row actions */}
                    <td className="px-4 py-3 w-24">
                      <div className="flex items-center justify-end gap-2">
                        <RowActions
                          editLabel={editLabel}
                          deleteLabel={deleteLabel}
                          selectLabel={selectLabel}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(contact.id);
                              else next.delete(contact.id);
                              return next;
                            });
                          }}
                          onEdit={() => setDrawer({ open: true, mode: "edit", contact })}
                          onDelete={() => setDrawer({ open: true, mode: "edit", contact })}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ContactModal
        open={drawer.open}
        mode={drawer.mode}
        contact={drawer.contact}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
        onSuccess={refetch}
      />

      {/* Bulk delete confirm dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Soft-delete {selected.size} contact{selected.size !== 1 ? "s" : ""}?</DialogTitle>
            <DialogDescription>
              {selected.size} contact{selected.size !== 1 ? "s" : ""} will be moved to Trash and
              hidden from default views. You can restore them from Admin &rarr; Trash.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isBulkPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isBulkPending}
            >
              {isBulkPending ? "Deleting..." : `Delete ${selected.size} contact${selected.size !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
