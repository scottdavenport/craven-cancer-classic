"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { getSponsors } from "./actions";
import { SponsorDrawer } from "./sponsor-drawer";
import type { SponsorshipItemOption } from "./sponsor-form";
import type { Sponsor } from "@/types/database";

interface SponsorListProps {
  sponsors: Sponsor[];
  sponsorshipItems: SponsorshipItemOption[];
}

type DrawerState = {
  open: boolean;
  mode: "create" | "edit";
  sponsor: Sponsor | null;
};

type SortKey = "name" | "tier" | "contact_name" | "website" | "payment_status" | "amount_paid_cents";
type SortDir = "asc" | "desc";

const STATUS_RANK: Record<string, number> = { pending: 0, paid: 1, comped: 2 };

export function SponsorList({ sponsors: initialSponsors, sponsorshipItems }: SponsorListProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors);
  const [isPending, startTransition] = useTransition();
  const [drawer, setDrawer] = useState<DrawerState>({
    open: false,
    mode: "create",
    sponsor: null,
  });
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function refetch() {
    startTransition(async () => {
      try {
        const fresh = await getSponsors();
        setSponsors(fresh);
      } catch (err) {
        console.error("[SponsorList] refetch failed:", err);
      }
    });
  }

  function handleHeaderClick(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // Build a tier name lookup map once
  const tierNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of sponsorshipItems) {
      map.set(item.id, item.name);
    }
    return map;
  }, [sponsorshipItems]);

  const displayedSponsors = useMemo(() => {
    const q = search.trim().toLowerCase();

    // Filter
    let filtered = q
      ? sponsors.filter((s) => {
          const tierName = s.tier_id ? (tierNameById.get(s.tier_id) ?? "") : "";
          return (
            s.name.toLowerCase().includes(q) ||
            (s.contact_name ?? "").toLowerCase().includes(q) ||
            (s.website ?? "").toLowerCase().includes(q) ||
            tierName.toLowerCase().includes(q)
          );
        })
      : sponsors;

    // Sort
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
        } else if (sortKey === "contact_name") {
          aVal = a.contact_name ?? "";
          bVal = b.contact_name ?? "";
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
        // Stable tiebreaker
        return a.id.localeCompare(b.id);
      }

      // Default sort: pending → paid → comped, then name A→Z within bucket
      const rankA = STATUS_RANK[a.payment_status] ?? 99;
      const rankB = STATUS_RANK[b.payment_status] ?? 99;
      if (rankA !== rankB) return rankA - rankB;
      const nameCmp = a.name.localeCompare(b.name);
      if (nameCmp !== 0) return nameCmp;
      return a.id.localeCompare(b.id);
    });

    return filtered;
  }, [sponsors, search, sortKey, sortDir, tierNameById]);

  function arrowFor(key: SortKey) {
    if (sortKey !== key) return null;
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  const headClass =
    "text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground cursor-pointer select-none";

  return (
    <div className="space-y-6">
      {/* Search input */}
      <Input
        placeholder="Search sponsors…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

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
            onClick={() => setDrawer({ open: true, mode: "create", sponsor: null })}
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
                  <TableHead className={headClass} onClick={() => handleHeaderClick("name")}>
                    Name{arrowFor("name")}
                  </TableHead>
                  <TableHead className={headClass} onClick={() => handleHeaderClick("tier")}>
                    Tier{arrowFor("tier")}
                  </TableHead>
                  <TableHead className={headClass} onClick={() => handleHeaderClick("contact_name")}>
                    Contact{arrowFor("contact_name")}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedSponsors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No sponsors yet. Click &quot;New Sponsor&quot; to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedSponsors.map((sponsor) => {
                    const tierName = sponsor.tier_id ? tierNameById.get(sponsor.tier_id) : undefined;
                    return (
                      <TableRow
                        key={sponsor.id}
                        className="border-t border-border/60 hover:bg-neutral-50/50 transition-colors duration-100 cursor-pointer"
                        onClick={() =>
                          setDrawer({ open: true, mode: "edit", sponsor })
                        }
                      >
                        <TableCell className="font-medium text-[0.9375rem]">
                          {sponsor.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tierName ?? (
                            <em className="text-muted-foreground/50">(deleted package)</em>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {sponsor.contact_name || "—"}
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
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <SponsorDrawer
        open={drawer.open}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
        mode={drawer.mode}
        sponsor={drawer.sponsor ?? undefined}
        sponsorshipItems={sponsorshipItems}
        onSuccess={refetch}
      />
    </div>
  );
}
