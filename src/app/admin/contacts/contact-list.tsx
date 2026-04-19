"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
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
import { exportContactsCSV, getContacts } from "./actions";
import { ContactDrawer } from "./contact-drawer";
import type { Contact } from "@/types/database";
import type { ContactFilter, TeamFilterOption } from "./actions";

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

const TABLE_HEADERS = ["Name", "Email", "Type", "Company", "Year", "Consent", "Added"];

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
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
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
        <Select value={yearFilter} onValueChange={(v) => setYearFilter(v ?? "all")}>
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
        <Select value={consentFilter} onValueChange={(v) => setConsentFilter(v ?? "all")}>
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
        <Select value={teamFilter} onValueChange={handleTeamFilterChange}>
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
          <input
            type="checkbox"
            checked={captainOnly}
            onChange={(e) => handleCaptainOnlyChange(e.target.checked)}
            className="accent-brand h-4 w-4 rounded"
          />
          Captains only
        </label>
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-lg border border-border/60 shadow-sm transition-opacity duration-150"
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
              {TABLE_HEADERS.map((h) => (
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
                <td colSpan={TABLE_HEADERS.length}>
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
              filtered.map((contact) => {
                const displayName =
                  contact.first_name || contact.last_name
                    ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
                    : null;

                return (
                  <tr
                    key={contact.id}
                    className="border-t border-border/60 hover:bg-neutral-50/50 transition-colors duration-100 cursor-pointer"
                    onClick={() => setDrawer({ open: true, mode: "edit", contact })}
                  >
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
    </div>
  );
}
