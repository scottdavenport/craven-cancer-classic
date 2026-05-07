"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { StatusTabs } from "@/components/admin/status-tabs";
import { FilterBar } from "@/components/admin/filter-bar";
import { RowActions } from "@/components/admin/row-actions";
import { SponsorshipModal } from "./sponsorship-modal";
import {
  getSponsorshipItems,
  getLinkedSponsorNames,
  deleteSponsorshipItem,
  type SponsorshipItemWithCount,
} from "./actions";
import type { SponsorshipPurchase } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatusFilter = "active" | "inactive" | "all";

type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  sponsorship: SponsorshipItemWithCount | null;
};

type CascadeDialogState = {
  open: boolean;
  item: SponsorshipItemWithCount | null;
  names: string[];
  loading: boolean;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SponsorshipManagerProps {
  items: SponsorshipItemWithCount[];
  purchases: SponsorshipPurchase[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SponsorshipManager({
  items: initialItems,
  purchases,
}: SponsorshipManagerProps) {
  const currentYear = new Date().getFullYear();

  const [items, setItems] = useState<SponsorshipItemWithCount[]>(initialItems);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [yearFilter, setYearFilter] = useState<number>(currentYear);
  const [search, setSearch] = useState("");

  // Modal
  const [modal, setModal] = useState<ModalState>({
    open: false,
    mode: "create",
    sponsorship: null,
  });

  // Dialogs
  const [cascadeDialog, setCascadeDialog] = useState<CascadeDialogState>({
    open: false,
    item: null,
    names: [],
    loading: false,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<SponsorshipItemWithCount | null>(null);

  // ---------------------------------------------------------------------------
  // Available years (from initial items + current year)
  // ---------------------------------------------------------------------------

  const availableYears = useMemo(() => {
    const years = new Set<number>(initialItems.map((s) => s.year ?? currentYear));
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [initialItems, currentYear]);

  // ---------------------------------------------------------------------------
  // Status tab counts
  // ---------------------------------------------------------------------------

  const activeCount = useMemo(() => items.filter((i) => i.active).length, [items]);
  const inactiveCount = useMemo(() => items.filter((i) => !i.active).length, [items]);
  const allCount = items.length;

  const statusTabs = [
    { id: "active", label: "Active", count: activeCount },
    { id: "inactive", label: "Inactive", count: inactiveCount },
    { id: "all", label: "All", count: allCount },
  ];

  // ---------------------------------------------------------------------------
  // Derived: filtered list (client-side search; status+year are server-filtered on refetch)
  // ---------------------------------------------------------------------------

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, search]);

  const hasActiveFilters = search.trim().length > 0;

  // ---------------------------------------------------------------------------
  // Stats (always based on full, unfiltered sets)
  // ---------------------------------------------------------------------------

  const totalRevenue = purchases
    .filter((p) => p.payment_status === "paid")
    .reduce((sum, p) => sum + p.amount_paid_cents, 0);

  // ---------------------------------------------------------------------------
  // Refetch
  // ---------------------------------------------------------------------------

  function refetch(opts?: { year?: number; status?: StatusFilter }) {
    const resolvedYear = opts?.year ?? yearFilter;
    const resolvedStatus = opts?.status ?? statusFilter;
    startTransition(async () => {
      try {
        const fresh = await getSponsorshipItems({
          year: resolvedYear,
          status: resolvedStatus,
        });
        setItems(fresh);
      } catch (err) {
        console.error("[SponsorshipManager] refetch failed:", err);
      }
    });
  }

  function handleStatusChange(status: string) {
    const s = status as StatusFilter;
    setStatusFilter(s);
    refetch({ status: s });
  }

  function handleYearChange(yearStr: string | null) {
    if (yearStr === null) return;
    const year = Number(yearStr);
    setYearFilter(year);
    refetch({ year });
  }

  function handleModalSuccess() {
    refetch();
  }

  // ---------------------------------------------------------------------------
  // Delete handlers
  // ---------------------------------------------------------------------------

  async function handleDeleteRequest(item: SponsorshipItemWithCount) {
    if (item.active_sponsor_count > 0) {
      // Fetch sponsor names for cascade warning
      setCascadeDialog({ open: false, item, names: [], loading: true });
      try {
        const names = await getLinkedSponsorNames(item.id);
        setCascadeDialog({ open: true, item, names, loading: false });
      } catch (err) {
        console.error("[SponsorshipManager] getLinkedSponsorNames failed:", err);
        setCascadeDialog({ open: false, item: null, names: [], loading: false });
      }
    } else {
      // No linked sponsors — simple soft-delete confirm
      setPendingDeleteItem(item);
      setConfirmOpen(true);
    }
  }

  // Build cascade body per Aria Phase 3 §C4
  function buildCascadeBody(names: string[], count: number): string {
    if (count === 1) {
      const name = names[0] ?? "";
      return `1 sponsor is linked to this package: ${name}. Moving this package to Trash keeps that record intact — it will display "(no package)" where the package name appeared.`;
    }
    const maxShow = 3;
    const shown = names.slice(0, maxShow);
    const remaining = count - maxShow;
    const nameList =
      remaining > 0
        ? shown.join(", ") + `, and ${remaining} more`
        : shown.join(", ");
    return `${count} sponsors are linked to this package: ${nameList}. Moving this package to Trash keeps those records intact — they will display "(no package)" where the package name appeared.`;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ opacity: isPending ? 0.6 : 1 }}>
      {/* Status tabs */}
      <StatusTabs
        tabs={statusTabs}
        activeId={statusFilter}
        onChange={handleStatusChange}
        ariaLabel="Sponsorship package status"
      />

      {/* Filter bar: search + year filter */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name"
      >
        {/* Year filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.10em] text-muted-foreground">
            Year
          </label>
          <Select
            value={String(yearFilter)}
            onValueChange={handleYearChange}
            items={availableYears.reduce<Record<string, string>>((acc, y) => {
              acc[String(y)] = String(y);
              return acc;
            }, {})}
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
      </FilterBar>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 py-4">
        <Card className="shadow-sm border border-border/60">
          <CardContent className="pt-4">
            <p className="font-display text-2xl font-bold text-foreground">{items.length}</p>
            <p className="font-sans text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground/80">Packages</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border border-border/60">
          <CardContent className="pt-4">
            <p className="font-display text-2xl font-bold text-foreground">{purchases.length}</p>
            <p className="font-sans text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground/80">Purchases</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border border-border/60">
          <CardContent className="pt-4">
            <p className="font-display text-2xl font-bold text-foreground">
              ${(totalRevenue / 100).toLocaleString()}
            </p>
            <p className="font-sans text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground/80">Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Sponsorship items table */}
      <Card className="shadow-sm border border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-sans text-base font-semibold">
            Packages ({filteredItems.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setModal({ open: true, mode: "create", sponsorship: null })}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Package
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border/60 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Name</TableHead>
                  <TableHead className="text-right text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Price</TableHead>
                  <TableHead className="text-right text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sold</TableHead>
                  <TableHead className="text-right text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sponsors</TableHead>
                  <TableHead className="text-right text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Max</TableHead>
                  <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className="group/row border-t border-border/60 hover:bg-neutral-50/50 transition-colors duration-100"
                    >
                      <TableCell>
                        <p className="font-medium text-[0.9375rem]">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums lining-nums font-medium">
                        {(item.price_cents / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono tabular-nums lining-nums ${
                          item.max_quantity && item.sold_count >= item.max_quantity
                            ? "text-warning font-semibold"
                            : "text-foreground"
                        }`}
                      >
                        {item.sold_count}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums lining-nums text-muted-foreground">
                        {item.active_sponsor_count}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums lining-nums text-muted-foreground">
                        {item.max_quantity ?? "∞"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            `rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] ` +
                            (item.active
                              ? "bg-success-muted text-success"
                              : "bg-neutral-100 text-neutral-600")
                          }
                        >
                          {item.active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <RowActions
                            editLabel={`Edit ${item.name || "sponsorship package"}`}
                            deleteLabel={`Delete ${item.name || "sponsorship package"}`}
                            selectLabel={`Select ${item.name || "sponsorship package"}`}
                            onEdit={() => setModal({ open: true, mode: "edit", sponsorship: item })}
                            onDelete={() => handleDeleteRequest(item)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : null}
              </TableBody>
            </Table>
          </div>
          {filteredItems.length === 0 && (
            <AdminEmptyState
              filterActive={hasActiveFilters}
              title={
                hasActiveFilters
                  ? "No sponsorship packages match your filters"
                  : "No sponsorship packages yet"
              }
              action={
                hasActiveFilters ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearch("")}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setModal({ open: true, mode: "create", sponsorship: null })}
                  >
                    Add sponsorship package
                  </Button>
                )
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Purchases */}
      {purchases.length > 0 && (
        <Card className="shadow-sm border border-border/60 mt-6">
          <CardHeader>
            <CardTitle className="font-sans text-base font-semibold">Recent Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border/60 shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50">
                    <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Purchaser</TableHead>
                    <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Company</TableHead>
                    <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Amount</TableHead>
                    <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="text-[0.9375rem] font-medium">{p.purchaser_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.purchaser_email}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.company_name || "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            `rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] ` +
                            (p.payment_status === "paid"
                              ? "bg-success-muted text-success"
                              : p.payment_status === "pending"
                              ? "bg-warning-muted text-warning"
                              : "bg-destructive/10 text-destructive")
                          }
                        >
                          {p.payment_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums lining-nums">
                        {(p.amount_paid_cents / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </TableCell>
                      <TableCell className="font-mono text-[0.8125rem] text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <SponsorshipModal
        open={modal.open}
        onOpenChange={(open) => setModal((d) => ({ ...d, open }))}
        mode={modal.mode}
        sponsorship={modal.sponsorship}
        onSubmit={handleModalSuccess}
        onDeleteRequest={handleDeleteRequest}
      />

      {/* Soft-delete confirm dialog — zero linked sponsors (Aria Phase 3 §C4 Variant 1) */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {`Delete "${pendingDeleteItem?.name ?? "this package"}"?`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Moving this package to Trash removes it from the active list. You can restore it from Admin → Trash.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                if (!pendingDeleteItem) return;
                const result = await deleteSponsorshipItem(pendingDeleteItem.id);
                if ("error" in result) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Package moved to Trash");
                setConfirmOpen(false);
                setModal((d) => ({ ...d, open: false }));
                refetch();
              }}
            >
              Move to Trash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cascade confirm dialog — linked sponsors exist (Aria Phase 3 §C4 Variant 2) */}
      <Dialog
        open={cascadeDialog.open}
        onOpenChange={(open) =>
          setCascadeDialog((d) => ({ ...d, open }))
        }
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {`Delete "${cascadeDialog.item?.name ?? "this package"}"?`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {buildCascadeBody(
              cascadeDialog.names,
              cascadeDialog.item?.active_sponsor_count ?? cascadeDialog.names.length
            )}
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCascadeDialog((d) => ({ ...d, open: false }))}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                if (!cascadeDialog.item) return;
                const result = await deleteSponsorshipItem(cascadeDialog.item.id);
                if ("error" in result) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Package moved to Trash");
                setCascadeDialog((d) => ({ ...d, open: false }));
                setModal((d) => ({ ...d, open: false }));
                refetch();
              }}
            >
              Move to Trash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
