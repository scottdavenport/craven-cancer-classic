"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportContactsCSV, getContacts, bulkUpdateContacts, bulkDeleteContacts } from "./actions";
import { ContactDrawer } from "./contact-drawer";
import type { Contact } from "@/types/database";
import type { ContactFilter, TeamFilterOption } from "./actions";
import { toast } from "sonner";

type ContactType = "player" | "sponsor" | "donor" | "other";

interface ContactListProps {
  contacts: Contact[];
  teams: TeamFilterOption[];
}

const TYPE_BADGE_CLASSES: Record<string, string> = {
  player: "bg-brand-muted text-brand",
  sponsor: "bg-purple-muted text-purple",
  donor: "bg-success-muted text-success",
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

const DATA_HEADERS = ["Name", "Email", "Type", "Company", "Year", "Consent", "Added"];

type DrawerState = {
  open: boolean;
  mode: "create" | "edit";
  contact: Contact | null;
};

export function ContactList({ contacts: initialContacts, teams }: ContactListProps) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("");
  const [consentFilter, setConsentFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [captainOnly, setCaptainOnly] = useState(false);
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

  function refetch() {
    startTransition(async () => {
      try {
        const filter: ContactFilter = {};
        if (typeFilter !== "all") filter.type = typeFilter as ContactType;
        if (yearFilter !== "all") filter.year = Number(yearFilter);
        if (teamFilter !== "all") filter.team_id = teamFilter;
        if (captainOnly) filter.captain_only = true;
        const fresh = await getContacts(filter);
        setContacts(fresh);
      } catch (err) {
        console.error("[ContactList] refetch failed:", err);
      }
    });
  }

  // availableYears derived from the current contacts set (server-filtered when team/captain active)
  const availableYears = useMemo(() => {
    return Array.from(new Set(initialContacts.map((c) => c.year_first_seen))).sort(
      (a, b) => b - a
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContacts]);

  // Client-side filters: type, year, company, consent
  // team_id / captain_only are handled server-side via re-fetch
  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (yearFilter !== "all" && c.year_first_seen !== Number(yearFilter)) return false;
      if (companyFilter.trim()) {
        const search = companyFilter.trim().toLowerCase();
        if (!(c.company ?? "").toLowerCase().includes(search)) return false;
      }
      if (consentFilter === "subscribed" && !c.marketing_consent) return false;
      if (consentFilter === "unsubscribed" && c.marketing_consent) return false;
      return true;
    });
  }, [contacts, typeFilter, yearFilter, companyFilter, consentFilter]);

  const isFiltered =
    typeFilter !== "all" ||
    yearFilter !== "all" ||
    companyFilter.trim() !== "" ||
    consentFilter !== "all" ||
    teamFilter !== "all" ||
    captainOnly;

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

  async function handleExportCSV() {
    setExporting(true);
    try {
      const filterArg: ContactFilter = {};
      if (typeFilter !== "all") filterArg.type = typeFilter as ContactType;
      if (yearFilter !== "all") filterArg.year = Number(yearFilter);
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

  // Bulk action handlers
  async function handleBulkChangeType(type: ContactType) {
    const ids = Array.from(selected);
    setIsBulkPending(true);
    try {
      const result = await bulkUpdateContacts(ids, { type });
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
        refetch();
      }
    } finally {
      setIsBulkPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-[0.8125rem] text-muted-foreground">
          {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
          {isFiltered && contacts.length !== filtered.length
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

      {/* Filter controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Type */}
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")} items={{ all: "All Types", player: "Player", sponsor: "Sponsor", donor: "Donor", other: "Other" }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="player">Player</SelectItem>
            <SelectItem value="sponsor">Sponsor</SelectItem>
            <SelectItem value="donor">Donor</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Year */}
        <Select value={yearFilter} onValueChange={(v) => setYearFilter(v ?? "all")} items={{ all: "All Years", ...Object.fromEntries(availableYears.map((y) => [String(y), String(y)])) }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {availableYears.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Company search */}
        <Input
          type="text"
          placeholder="Search company..."
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="w-[180px] text-sm"
        />

        {/* Consent filter */}
        <Select value={consentFilter} onValueChange={(v) => setConsentFilter(v ?? "all")} items={{ all: "All Contacts", subscribed: "Subscribed only", unsubscribed: "Unsubscribed only" }}>
          <SelectTrigger className="w-[175px]">
            <SelectValue placeholder="All Contacts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Contacts</SelectItem>
            <SelectItem value="subscribed">Subscribed only</SelectItem>
            <SelectItem value="unsubscribed">Unsubscribed only</SelectItem>
          </SelectContent>
        </Select>

        {/* Team filter */}
        <Select value={teamFilter} onValueChange={handleTeamFilterChange} items={{ all: "All Teams", ...Object.fromEntries(teams.map((t) => [t.id, t.team_name])) }}>
          <SelectTrigger className="w-[175px]">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.team_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Captain-only toggle */}
        <label className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground cursor-pointer select-none">
          <Checkbox
            checked={captainOnly}
            onCheckedChange={handleCaptainOnlyChange}
          />
          Captains only
        </label>
      </div>

      {/* Selection counter */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
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
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-neutral-50 px-4 py-2.5 shadow-sm">
          <span className="text-[0.8125rem] font-semibold text-foreground mr-2">
            {selected.size} selected
          </span>

          {/* Change Type dropdown */}
          <Select
            onValueChange={(v) => {
              if (v) handleBulkChangeType(v as ContactType);
            }}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Change Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="player">Player</SelectItem>
              <SelectItem value="sponsor">Sponsor</SelectItem>
              <SelectItem value="donor">Donor</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={isBulkPending}
            onClick={handleBulkSubscribe}
          >
            Subscribe
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={isBulkPending}
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

      {/* Table */}
      <div
        className="overflow-x-auto rounded-lg border border-border/60 shadow-sm transition-opacity duration-150"
        style={{ opacity: isPending ? 0.6 : 1 }}
      >
        {isPending && (
          <div className="px-4 py-2 text-[0.75rem] text-muted-foreground bg-neutral-50 border-b border-border/60">
            Refreshing...
          </div>
        )}
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-neutral-50">
            <tr>
              {/* Checkbox header */}
              <th className="px-4 py-3 w-10">
                <Checkbox
                  aria-label="Select all visible contacts"
                  checked={allVisibleSelected}
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
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={DATA_HEADERS.length + 1}>
                  <div className="py-16 flex flex-col items-center gap-3">
                    <h3 className="font-display text-xl font-semibold text-foreground">
                      No contacts found
                    </h3>
                    {isFiltered ? (
                      <p className="font-sans text-sm text-muted-foreground max-w-xs text-center">
                        No contacts match the current filters. Try clearing some filters.
                      </p>
                    ) : (
                      <>
                        <p className="font-sans text-sm text-muted-foreground max-w-xs text-center">
                          Contacts are captured when visitors submit the email forms on
                          public pages, or imported from the mailing list.
                        </p>
                        <Link
                          href="/"
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          View public forms
                        </Link>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((contact, index) => {
                const isSelected = selected.has(contact.id);
                const displayName =
                  contact.first_name || contact.last_name
                    ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
                    : null;

                return (
                  <tr
                    key={contact.id}
                    className={`border-t border-border/60 hover:bg-neutral-50/50 transition-colors duration-100 cursor-pointer ${
                      isSelected ? "bg-brand-muted/30" : ""
                    }`}
                    onClick={() => setDrawer({ open: true, mode: "edit", contact })}
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
                        aria-label={`Select ${contact.full_name}`}
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

                    {/* Type */}
                    <td className="px-4 py-3">
                      <TypeBadge type={contact.type} />
                    </td>

                    {/* Company */}
                    <td
                      className="px-4 py-3 text-[0.8125rem] text-muted-foreground truncate max-w-[160px]"
                      title={contact.company ?? undefined}
                    >
                      {contact.company ?? <span className="text-neutral-300">—</span>}
                    </td>

                    {/* Year */}
                    <td className="px-4 py-3 font-mono tabular-nums text-[0.8125rem] text-foreground text-center">
                      {contact.year_first_seen}
                    </td>

                    {/* Consent */}
                    <td className="px-4 py-3">
                      <ConsentBadge consented={contact.marketing_consent} />
                    </td>

                    {/* Added */}
                    <td className="px-4 py-3 text-[0.75rem] text-muted-foreground">
                      {relativeTime(contact.created_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ContactDrawer
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
