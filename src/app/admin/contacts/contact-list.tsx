"use client";

import { useState, useMemo } from "react";
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
import { exportContactsCSV } from "./actions";
import type { Contact } from "@/types/database";

type ContactType = "player" | "sponsor" | "donor" | "other";

interface ContactListProps {
  contacts: Contact[];
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

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
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

export function ContactList({ contacts }: ContactListProps) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(contacts.map((c) => c.year_first_seen))).sort(
      (a, b) => b - a
    );
    return years;
  }, [contacts]);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (yearFilter !== "all" && c.year_first_seen !== Number(yearFilter)) return false;
      return true;
    });
  }, [contacts, typeFilter, yearFilter]);

  const isFiltered = typeFilter !== "all" || yearFilter !== "all";

  async function handleExportCSV() {
    setExporting(true);
    try {
      const filterArg: { type?: ContactType; year?: number } = {};
      if (typeFilter !== "all") filterArg.type = typeFilter as ContactType;
      if (yearFilter !== "all") filterArg.year = Number(yearFilter);

      const csv = await exportContactsCSV(filterArg);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10);
      const typeLabel = typeFilter !== "all" ? typeFilter : "all";
      const yearLabel = yearFilter !== "all" ? yearFilter : "all";
      const filename = `contacts-${typeLabel}-${yearLabel}-${today}.csv`;

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
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={exporting}
        >
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap gap-3">
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

        <Select value={yearFilter} onValueChange={(v) => setYearFilter(v ?? "all")}>
          <SelectTrigger className="w-[160px]">
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
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border/60 shadow-sm">
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-neutral-50">
            <tr>
              {["Name", "Email", "Type", "Year", "Notes", "Added"].map((h) => (
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
                <td colSpan={6}>
                  <div className="py-16 flex flex-col items-center gap-3">
                    <h3 className="font-display text-xl font-semibold text-foreground">
                      No contacts yet
                    </h3>
                    {isFiltered ? (
                      <p className="font-sans text-sm text-muted-foreground max-w-xs text-center">
                        No contacts match the current filter.
                      </p>
                    ) : (
                      <>
                        <p className="font-sans text-sm text-muted-foreground max-w-xs text-center">
                          Contacts are captured when visitors submit the email forms on
                          public pages.
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
              filtered.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-t border-border/60 hover:bg-neutral-50/50 transition-colors duration-100"
                >
                  <td className="px-4 py-3 text-[0.8125rem] font-medium text-foreground">
                    {contact.full_name}
                  </td>
                  <td className="px-4 py-3 font-mono text-[0.75rem] text-muted-foreground">
                    {contact.email}
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={contact.type} />
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-[0.8125rem] text-foreground text-center">
                    {contact.year_first_seen}
                  </td>
                  <td
                    className="px-4 py-3 text-[0.8125rem] text-muted-foreground truncate max-w-[180px]"
                    title={contact.notes ?? undefined}
                  >
                    {contact.notes ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[0.75rem] text-muted-foreground">
                    {relativeTime(contact.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
