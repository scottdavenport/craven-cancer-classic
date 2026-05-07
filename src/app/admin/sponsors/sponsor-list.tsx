"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { FilterBar } from "@/components/admin/filter-bar";
import { StatusTabs } from "@/components/admin/status-tabs";
import { RowActions } from "@/components/admin/row-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { getSponsors } from "./actions";
import { SponsorModal } from "./sponsor-modal";
import type { SponsorshipItemOption } from "./sponsor-form";
import type { Sponsor } from "@/types/database";

interface SponsorListProps {
  sponsors: Sponsor[];
  sponsorshipItems: SponsorshipItemOption[];
}

type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  sponsor: Sponsor | null;
};

type SortKey = "name" | "tier" | "website" | "payment_status" | "amount_paid_cents";
type SortDir = "asc" | "desc";
type StatusFilter = "active" | "inactive" | "all";

const STATUS_RANK: Record<string, number> = { pending: 0, paid: 1, comped: 2 };

function LogoCell({ logoUrl, sponsorName }: { logoUrl: string | null; sponsorName: string }) {
  const [errored, setErrored] = useState(false);

  if (!logoUrl || errored) {
    return (
      <div
        data-testid="logo-placeholder"
        className="w-8 h-8 rounded bg-neutral-100 flex items-center justify-center"
        aria-hidden="true"
      />
    );
  }

  return (
    <Dialog>
      <DialogTrigger
        data-testid="logo-thumbnail-trigger"
        onClick={(e) => e.stopPropagation()}
        aria-label={`View ${sponsorName} logo`}
        className="rounded hover:ring-2 hover:ring-primary/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
      >
        <img
          src={logoUrl}
          alt={`${sponsorName} logo`}
          loading="lazy"
          className="w-8 h-8 object-contain rounded"
          onError={() => setErrored(true)}
        />
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{sponsorName} logo</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center rounded-md border border-border/60 bg-neutral-50 p-4">
          <img
            src={logoUrl}
            alt={`${sponsorName} logo`}
            className="max-h-[360px] w-auto object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SponsorList({ sponsors: initialSponsors, sponsorshipItems }: SponsorListProps) {
  const currentYear = new Date().getFullYear();

  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors);
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<ModalState>({
    open: false,
    mode: "create",
    sponsor: null,
  });
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [yearFilter, setYearFilter] = useState<number>(currentYear);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [tierFilter, setTierFilter] = useState<string>("all");

  function refetch(opts?: { year?: number; is_active?: boolean }) {
    startTransition(async () => {
      try {
        const fresh = await getSponsors(opts);
        setSponsors(fresh);
      } catch (err) {
        console.error("[SponsorList] refetch failed:", err);
      }
    });
  }

  function handleYearChange(yearStr: string | null) {
    if (yearStr === null) return;
    const year = Number(yearStr);
    setYearFilter(year);
    const isActiveArg = statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;
    refetch({ year, is_active: isActiveArg });
  }

  function handleStatusChange(status: string) {
    const s = status as StatusFilter;
    setStatusFilter(s);
    const isActiveArg = s === "active" ? true : s === "inactive" ? false : undefined;
    refetch({ year: yearFilter, is_active: isActiveArg });
  }

  function handleHeaderClick(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const availableYears = useMemo(() => {
    const years = new Set<number>(initialSponsors.map((s) => s.year));
    for (let y = currentYear - 2; y <= currentYear; y++) years.add(y);
    return Array.from(years).sort((a, b) => b - a);
  }, [initialSponsors, currentYear]);

  const yearItems = useMemo(() => {
    return availableYears.reduce<Record<string, string>>((acc, y) => {
      acc[String(y)] = String(y);
      return acc;
    }, {});
  }, [availableYears]);

  const tierNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of sponsorshipItems) {
      map.set(item.id, item.name);
    }
    return map;
  }, [sponsorshipItems]);

  // Compute counts per status tab from current sponsors array
  const activeCount = useMemo(() => sponsors.filter((s) => (s as Sponsor & { is_active?: boolean }).is_active !== false).length, [sponsors]);
  const inactiveCount = useMemo(() => sponsors.filter((s) => (s as Sponsor & { is_active?: boolean }).is_active === false).length, [sponsors]);
  const allCount = sponsors.length;

  const statusTabs = [
    { id: "active", label: "Active", count: activeCount },
    { id: "inactive", label: "Inactive", count: inactiveCount },
    { id: "all", label: "All", count: allCount },
  ];

  const tierItems = useMemo(() => {
    const items: Record<string, string> = { all: "All tiers" };
    for (const item of sponsorshipItems) {
      items[item.id] = item.name;
    }
    return items;
  }, [sponsorshipItems]);

  const hasActiveFilters = search.trim().length > 0 || tierFilter !== "all";

  const displayedSponsors = useMemo(() => {
    const q = search.trim().toLowerCase();

    let filtered = q
      ? sponsors.filter((s) => {
          const tierName = s.tier_id ? (tierNameById.get(s.tier_id) ?? "") : "";
          return (
            s.name.toLowerCase().includes(q) ||
            (s.website ?? "").toLowerCase().includes(q) ||
            tierName.toLowerCase().includes(q)
          );
        })
      : sponsors;

    if (tierFilter !== "all") {
      filtered = filtered.filter((s) => s.tier_id === tierFilter);
    }

    filtered = [...filtered].sort((a, b) => {
      if (sortKey !== null) {
        let aVal: string | number;
        let bVal: string | number;
        if (sortKey === "tier") {
          aVal = a.tier_id ? (tierNameById.get(a.tier_id) ?? "") : "";
          bVal = b.tier_id ? (tierNameById.get(b.tier_id) ?? "") : "";
        } else if (sortKey === "payment_status") {
          aVal = STATUS_RANK[a.payment_status] ?? 99;
          bVal = STATUS_RANK[b.payment_status] ?? 99;
        } else if (sortKey === "website") {
          aVal = a.website ?? "";
          bVal = b.website ?? "";
        } else {
          aVal = (a as Record<string, unknown>)[sortKey] as string | number ?? "";
          bVal = (b as Record<string, unknown>)[sortKey] as string | number ?? "";
        }

        let cmp: number;
        if (typeof aVal === "number" && typeof bVal === "number") {
          cmp = aVal - bVal;
        } else {
          cmp = String(aVal).localeCompare(String(bVal));
        }
        if (cmp !== 0) return sortDir === "asc" ? cmp : -cmp;
        return a.id.localeCompare(b.id);
      }

      const rankA = STATUS_RANK[a.payment_status] ?? 99;
      const rankB = STATUS_RANK[b.payment_status] ?? 99;
      if (rankA !== rankB) return rankA - rankB;
      const nameCmp = a.name.localeCompare(b.name);
      if (nameCmp !== 0) return nameCmp;
      return a.id.localeCompare(b.id);
    });

    return filtered;
  }, [sponsors, search, sortKey, sortDir, tierNameById, tierFilter]);

  function arrowFor(key: SortKey) {
    if (sortKey !== key) return null;
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  const headClass =
    "text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground cursor-pointer select-none";

  return (
    <div className="space-y-0">
      {/* Status tabs */}
      <StatusTabs
        tabs={statusTabs}
        activeId={statusFilter}
        onChange={handleStatusChange}
        ariaLabel="Sponsor status"
      />

      {/* Filter bar */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search sponsors…"
      >
        {/* Year filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.10em] text-muted-foreground">
            Year
          </label>
          <Select
            value={String(yearFilter)}
            onValueChange={handleYearChange}
            items={yearItems}
          >
            <SelectTrigger
              aria-label="Year"
              data-testid="year-filter-trigger"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tier filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.10em] text-muted-foreground">
            Tier
          </label>
          <Select
            value={tierFilter}
            onValueChange={(v) => setTierFilter(v ?? "all")}
            items={tierItems}
          >
            <SelectTrigger
              aria-label="Tier"
              data-testid="tier-filter-trigger"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              {sponsorshipItems.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      {/* Sponsors table */}
      <Card
        className="shadow-sm border border-border/60"
        style={{ opacity: isPending ? 0.6 : 1 }}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-sans text-base font-semibold">
            Sponsors ({displayedSponsors.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setModal({ open: true, mode: "create", sponsor: null })}
          >
            <Plus className="mr-1 h-4 w-4" />
            New Sponsor
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border/60 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead className={headClass}>
                    Logo
                  </TableHead>
                  <TableHead className={headClass} onClick={() => handleHeaderClick("name")}>
                    Name{arrowFor("name")}
                  </TableHead>
                  <TableHead className={headClass} onClick={() => handleHeaderClick("tier")}>
                    Tier{arrowFor("tier")}
                  </TableHead>
                  <TableHead className={headClass} onClick={() => handleHeaderClick("website")}>
                    Website{arrowFor("website")}
                  </TableHead>
                  <TableHead className={headClass} onClick={() => handleHeaderClick("payment_status")}>
                    Status{arrowFor("payment_status")}
                  </TableHead>
                  <TableHead
                    className={`text-right ${headClass}`}
                    onClick={() => handleHeaderClick("amount_paid_cents")}
                  >
                    Amount{arrowFor("amount_paid_cents")}
                  </TableHead>
                  <TableHead className={headClass} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedSponsors.length > 0 && (
                  displayedSponsors.map((sponsor) => {
                    const tierName = sponsor.tier_id ? tierNameById.get(sponsor.tier_id) : undefined;
                    const inactive = (sponsor as Sponsor & { is_active?: boolean }).is_active === false;
                    return (
                      <TableRow
                        key={sponsor.id}
                        className="group/row border-t border-border/60 hover:bg-neutral-50/50 transition-colors duration-100"
                      >
                        <TableCell className="w-10">
                          <LogoCell logoUrl={sponsor.logo_url ?? null} sponsorName={sponsor.name} />
                        </TableCell>
                        <TableCell className="font-medium text-[0.9375rem]">
                          {sponsor.name}
                          {inactive && (
                            <span
                              data-testid={`inactive-badge-${sponsor.id}`}
                              className="ml-2 rounded-sm px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.05em] bg-neutral-200 text-neutral-500"
                            >
                              Inactive
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tierName ?? (
                            <em className="text-muted-foreground/50">(deleted package)</em>
                          )}
                        </TableCell>
                        <TableCell>
                          {sponsor.website ? (
                            <span className="font-mono text-xs text-muted-foreground/70 truncate max-w-[160px] block">
                              {sponsor.website}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              `rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] ` +
                              (sponsor.payment_status === "paid"
                                ? "bg-success-muted text-success"
                                : sponsor.payment_status === "comped"
                                ? "bg-neutral-100 text-neutral-600"
                                : "bg-warning-muted text-warning")
                            }
                          >
                            {sponsor.payment_status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          ${(sponsor.amount_paid_cents / 100).toLocaleString()}
                        </TableCell>
                        <TableCell className="w-24">
                          <div className="flex items-center justify-end gap-2">
                            <RowActions
                              editLabel={`Edit ${sponsor.name || "sponsor"}`}
                              deleteLabel={`Delete ${sponsor.name || "sponsor"}`}
                              selectLabel={`Select ${sponsor.name || "sponsor"}`}
                              onEdit={() => setModal({ open: true, mode: "edit", sponsor })}
                              onDelete={() => setModal({ open: true, mode: "edit", sponsor })}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {displayedSponsors.length === 0 && (
            <AdminEmptyState
              filterActive={hasActiveFilters}
              title={hasActiveFilters ? "No sponsors match your filters" : "No sponsors yet"}
              action={
                hasActiveFilters ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setTierFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setModal({ open: true, mode: "create", sponsor: null })}
                  >
                    Add sponsor
                  </Button>
                )
              }
            />
          )}
        </CardContent>
      </Card>

      <SponsorModal
        open={modal.open}
        onOpenChange={(open) => setModal((d) => ({ ...d, open }))}
        mode={modal.mode}
        sponsor={modal.sponsor ?? undefined}
        sponsorshipItems={sponsorshipItems}
        onSuccess={() => refetch({ year: yearFilter })}
      />
    </div>
  );
}
