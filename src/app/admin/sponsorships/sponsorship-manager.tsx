"use client";

import { useState, useTransition } from "react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
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

type SponsorshipCategory = "sponsorship" | "tribute" | "supporter";
type CategoryFilter = "all" | SponsorshipCategory;

const CATEGORY_FILTER_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "sponsorship", label: "Sponsorship" },
  { value: "tribute", label: "Tribute" },
  { value: "supporter", label: "Supporter" },
];

// ---------------------------------------------------------------------------
// CategoryFilterSelect — inline listbox (no portal) so test isolation works
// ---------------------------------------------------------------------------

interface CategoryFilterSelectProps {
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
}

function CategoryFilterSelect({ value, onChange }: CategoryFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    CATEGORY_FILTER_OPTIONS.find((o) => o.value === value)?.label ?? "All";

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="category-filter"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-7 items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {selectedLabel}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md"
        >
          {CATEGORY_FILTER_OPTIONS.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={value === opt.value}
              className="cursor-default px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface SponsorshipManagerProps {
  items: SponsorshipItemWithCount[];
  purchases: SponsorshipPurchase[];
}

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
// Component
// ---------------------------------------------------------------------------

export function SponsorshipManager({
  items: initialItems,
  purchases,
}: SponsorshipManagerProps) {
  const [items, setItems] = useState<SponsorshipItemWithCount[]>(initialItems);
  const [isPending, startTransition] = useTransition();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [modal, setModal] = useState<ModalState>({
    open: false,
    mode: "create",
    sponsorship: null,
  });
  const [cascadeDialog, setCascadeDialog] = useState<CascadeDialogState>({
    open: false,
    item: null,
    names: [],
    loading: false,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<SponsorshipItemWithCount | null>(null);

  // ---------------------------------------------------------------------------
  // Derived: filtered lists
  // ---------------------------------------------------------------------------

  const filteredItems =
    categoryFilter === "all"
      ? items
      : items.filter((item) => item.category === categoryFilter);

  // Build a set of filtered item IDs so purchases can be filtered by category via item_id
  const filteredItemIds = new Set(filteredItems.map((item) => item.id));

  const filteredPurchases =
    categoryFilter === "all"
      ? purchases
      : purchases.filter((p) => filteredItemIds.has(p.item_id));

  const showTributeRecipient = categoryFilter === "tribute";

  // ---------------------------------------------------------------------------
  // Stats (always based on full, unfiltered sets)
  // ---------------------------------------------------------------------------

  const totalRevenue = purchases
    .filter((p) => p.payment_status === "paid")
    .reduce((sum, p) => sum + p.amount_paid_cents, 0);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function refetch() {
    startTransition(async () => {
      try {
        const fresh = await getSponsorshipItems();
        setItems(fresh);
      } catch (err) {
        console.error("[SponsorshipManager] refetch failed:", err);
      }
    });
  }

  function handleModalSuccess() {
    refetch();
  }

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
      // Normal delete confirm — no cascade warning
      setPendingDeleteItem(item);
      setConfirmOpen(true);
    }
  }

  function buildCascadeDescription(names: string[], count: number): string {
    if (names.length === 0) return "";
    const maxShow = 3;
    const shown = names.slice(0, maxShow);
    const remaining = count - maxShow;
    const nameList = shown.join(", ");
    if (remaining > 0) {
      return `${count} sponsors are linked to this package: ${nameList}, … and ${remaining} more. They'll show '(no package)' until you reassign them.`;
    }
    return `${count} sponsors are linked to this package: ${nameList}. They'll show '(no package)' until you reassign them.`;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6" style={{ opacity: isPending ? 0.6 : 1 }}>
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
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

      {/* Category filter chip */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Filter:</span>
        <CategoryFilterSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
        />
      </div>

      {/* Sponsorship items */}
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
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <AdminEmptyState title="No sponsorship packages yet" />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className="border-t border-border/60 hover:bg-neutral-50/50 transition-colors duration-100 cursor-pointer"
                      onClick={() =>
                        setModal({ open: true, mode: "edit", sponsorship: item })
                      }
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
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModal({ open: true, mode: "edit", sponsorship: item });
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Purchases */}
      {filteredPurchases.length > 0 && (
        <Card className="shadow-sm border border-border/60">
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
                    {showTributeRecipient && (
                      <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Honored</TableHead>
                    )}
                    <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Amount</TableHead>
                    <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((p) => (
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
                      {showTributeRecipient && (
                        <TableCell className="text-sm">
                          {p.tribute_recipient || "—"}
                        </TableCell>
                      )}
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

      {/* Normal delete confirm dialog (zero linked sponsors) */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {`Delete "${pendingDeleteItem?.name ?? "this package"}"?`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This package has no linked sponsors. It will be permanently deleted — this cannot be undone.
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
                toast.success("Package deleted");
                setConfirmOpen(false);
                setModal((d) => ({ ...d, open: false }));
                refetch();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cascade warning dialog (linked sponsors exist) */}
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
            {buildCascadeDescription(
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
                toast.success("Package deleted");
                setCascadeDialog((d) => ({ ...d, open: false }));
                setModal((d) => ({ ...d, open: false }));
                refetch();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
