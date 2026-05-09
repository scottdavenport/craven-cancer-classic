"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { FilterBar } from "@/components/admin/filter-bar";
import { StatusTabs } from "@/components/admin/status-tabs";
import { RowActions } from "@/components/admin/row-actions";
import { DownloadCsvButton } from "@/components/admin/download-csv-button";
import { markTeamPaid, exportTeamsCSV } from "./actions";
import { TeamModal } from "./team-modal";
import type { TeamWithMembers } from "./actions";

// ---------------------------------------------------------------------------
// Payment method options — Aria Phase 3 §B6 (locked)
// ---------------------------------------------------------------------------

const PAYMENT_METHOD_OPTIONS = [
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
  { value: "venmo", label: "Venmo" },
  { value: "zelle", label: "Zelle" },
  { value: "wire", label: "Wire" },
  { value: "comped", label: "Comped" },
  { value: "stripe", label: "Stripe" },
  { value: "other", label: "Other" },
] as const;

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

function PaymentStatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    paid: "bg-success-muted text-success",
    pending: "bg-warning-muted text-warning",
    comped: "bg-neutral-100 text-neutral-600",
  };
  const cls = classes[status] ?? "bg-neutral-100 text-neutral-600";
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold capitalize ${cls}`}
    >
      {status}
    </span>
  );
}

function OpenSlotsBadge({ open }: { open: number }) {
  if (open === 0) return null;
  return (
    <span className="inline-flex items-center rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold bg-warning-muted text-warning">
      {open} open
    </span>
  );
}

function SessionBadge({ session }: { session: string }) {
  return (
    <span className="inline-flex items-center rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] bg-neutral-100 text-neutral-600">
      {session}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Mark Paid modal — F-T8 (P1)
// ---------------------------------------------------------------------------

interface MarkPaidModalProps {
  team: TeamWithMembers;
  defaultFeeDollars: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

function MarkPaidModal({ team, defaultFeeDollars, open, onOpenChange, onDone }: MarkPaidModalProps) {
  const [amount, setAmount] = useState(String(defaultFeeDollars || ""));
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [datePaid, setDatePaid] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setAmount(String(defaultFeeDollars || ""));
      setPaymentMethod("");
      setPaymentReference("");
      setDatePaid("");
      setError(null);
    }
  }

  function handleConfirm() {
    const dollars = parseFloat(amount);
    if (isNaN(dollars) || dollars < 0) {
      setError("Enter a valid dollar amount.");
      return;
    }
    if (!paymentMethod) {
      setError("Payment method is required.");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        // Guard invalid date input
        let paidAtIso: string | null = null;
        if (datePaid) {
          const d = new Date(datePaid);
          if (isNaN(d.getTime())) {
            setError("Enter a valid date paid.");
            return;
          }
          paidAtIso = d.toISOString();
        }

        const result = await markTeamPaid(team.id, {
          amount_cents: Math.round(dollars * 100),
          payment_method: paymentMethod,
          payment_reference: paymentReference.trim() || null,
          paid_at: paidAtIso,
        });
        if ("error" in result) {
          setError(result.error);
          return;
        }
        handleOpenChange(false);
        onDone();
      } catch (err) {
        console.error("[MarkPaidModal] markTeamPaid failed:", err);
        setError("Failed to mark team paid. Please try again.");
      }
    });
  }

  const captainName = team.members.find((m) => m.role === "captain")?.full_name?.trim();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            Mark paid{captainName ? ` — ${captainName}'s team` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Amount paid */}
          <div className="space-y-1.5">
            <Label htmlFor={`paid-amount-${team.id}`}>Amount paid ($)</Label>
            <Input
              id={`paid-amount-${team.id}`}
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-36"
              placeholder="0.00"
            />
          </div>

          {/* Payment method — Aria Phase 3 §B6 (required) */}
          <div className="space-y-1.5">
            <Label htmlFor={`paid-method-${team.id}`}>Payment method</Label>
            <input type="hidden" name="payment_method" value={paymentMethod} />
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v ?? "")}
              items={Object.fromEntries(PAYMENT_METHOD_OPTIONS.map((o) => [o.value, o.label]))}
            >
              <SelectTrigger id={`paid-method-${team.id}`} className="w-[200px]">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference number — Aria Phase 3 §B6 (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor={`paid-ref-${team.id}`}>
              Reference number{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id={`paid-ref-${team.id}`}
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Check #, transaction ID, etc."
            />
          </div>

          {/* Date paid — Aria Phase 3 §B6 (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor={`paid-date-${team.id}`}>
              Date paid{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id={`paid-date-${team.id}`}
              type="date"
              value={datePaid}
              onChange={(e) => setDatePaid(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={pending}>
            {pending ? "Saving..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// TeamList
// ---------------------------------------------------------------------------

interface TeamListProps {
  teams: TeamWithMembers[];
  defaultFeeDollars: number;
}

type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  team: TeamWithMembers | null;
};

type StatusFilter = "pending" | "paid" | "all";

export function TeamList({ teams: initialTeams, defaultFeeDollars }: TeamListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [modal, setModal] = useState<ModalState>({ open: false, mode: "create", team: null });
  const [markPaidTeam, setMarkPaidTeam] = useState<TeamWithMembers | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  function handleModalSuccess() {
    setModal((d) => ({ ...d, open: false }));
    startTransition(() => { router.refresh(); });
  }

  function handleMarkPaidDone() {
    setMarkPaidTeam(null);
    toast.success("Payment recorded");
    startTransition(() => { router.refresh(); });
  }

  const captainName = (team: TeamWithMembers): string => {
    const captain = team.members.find((m) => m.role === "captain");
    if (!captain) return "—";
    return captain.full_name?.trim() ? captain.full_name : "(deleted contact)";
  };

  const memberDisplayName = (member: TeamWithMembers["members"][number]): string => {
    return member.full_name?.trim() ? member.full_name : "(deleted contact)";
  };

  // Status tab counts
  const pendingCount = useMemo(() => initialTeams.filter((t) => t.payment_status === "pending").length, [initialTeams]);
  const paidCount = useMemo(() => initialTeams.filter((t) => t.payment_status === "paid").length, [initialTeams]);
  const allCount = initialTeams.length;

  const statusTabs = [
    { id: "pending", label: "Pending", count: pendingCount },
    { id: "paid", label: "Paid", count: paidCount },
    { id: "all", label: "All", count: allCount },
  ];

  const hasActiveFilters = search.trim().length > 0 || statusFilter !== "all";

  const displayedTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = initialTeams;

    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.payment_status === statusFilter);
    }

    if (q) {
      filtered = filtered.filter((t) => {
        const cap = t.members.find((m) => m.role === "captain");
        const capName = cap?.full_name?.toLowerCase() ?? "";
        return capName.includes(q);
      });
    }

    return filtered;
  }, [initialTeams, search, statusFilter]);

  return (
    <div className="space-y-0">
      {/* Status tabs — Aria Phase 3 §B1 */}
      <StatusTabs
        tabs={statusTabs}
        activeId={statusFilter}
        onChange={(id) => setStatusFilter(id as StatusFilter)}
        ariaLabel="Team payment status"
      />

      {/* Filter bar — search + session filter */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by captain name"
      />

      {/* Toolbar: count + Download CSV + New Team */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border/60">
        <p className="text-[0.8125rem] text-muted-foreground">
          {displayedTeams.length} team{displayedTeams.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <DownloadCsvButton
            label="Download CSV"
            fetchCsv={() => exportTeamsCSV()}
            filename={`teams-${new Date().toISOString().slice(0, 10)}.csv`}
          />
          <Button size="sm" onClick={() => setModal({ open: true, mode: "create", team: null })}>
            <Plus className="size-4" />
            New Team
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-b-lg border-x border-b border-border/60 shadow-sm">
        <Table>
          <TableHeader className="bg-neutral-50">
            <TableRow>
              {/* F-T1: CAPTAIN column dropped — team identity = captain via Team column */}
              {["Team", "Members", "Session", "Payment", "Open Slots", ""].map(
                (h) => (
                  <TableHead
                    key={h}
                    className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    {h}
                  </TableHead>
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedTeams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <AdminEmptyState
                    filterActive={hasActiveFilters}
                    title={hasActiveFilters ? "No teams match your filters" : "No teams yet"}
                    action={
                      hasActiveFilters ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearch("");
                            setStatusFilter("all");
                          }}
                        >
                          Clear filters
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setModal({ open: true, mode: "create", team: null })}
                        >
                          Add team
                        </Button>
                      )
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              displayedTeams.map((team) => {
                const captain = captainName(team);
                // Aria Phase 3 §B2b — possessive form for aria-labels
                const captainFull = team.members.find((m) => m.role === "captain")?.full_name?.trim();
                const editLabel = captainFull
                  ? `Edit ${captainFull}'s team`
                  : "Edit team";
                const deleteLabel = captainFull
                  ? `Delete ${captainFull}'s team`
                  : "Delete team";
                const selectLabel = captainFull
                  ? `Select ${captainFull}'s team`
                  : "Select team";

                return (
                  <TableRow
                    key={team.id}
                    className="group/row border-t border-border/60 hover:bg-neutral-50/50 transition-colors duration-100"
                  >
                    {/* Team (captain name = team identity) */}
                    <TableCell className="px-4 py-3">
                      <span className="text-[0.8125rem] font-medium text-foreground">
                        {team.captain_display_name}
                      </span>
                    </TableCell>

                    {/* Members */}
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[0.8125rem] text-foreground tabular-nums">
                          {team.member_count}/4
                        </span>
                        {team.members
                          .filter((m) => m.role !== "captain")
                          .map((m) => (
                            <span
                              key={m.contact_id}
                              className={`text-[0.75rem] ${!m.full_name?.trim() ? "text-muted-foreground italic" : "text-muted-foreground"}`}
                            >
                              {memberDisplayName(m)}
                            </span>
                          ))}
                      </div>
                    </TableCell>

                    {/* Session */}
                    <TableCell className="px-4 py-3">
                      <SessionBadge session={team.session} />
                    </TableCell>

                    {/* Payment status */}
                    <TableCell className="px-4 py-3">
                      <PaymentStatusBadge status={team.payment_status} />
                    </TableCell>

                    {/* Open slots */}
                    <TableCell className="px-4 py-3">
                      {team.open_slots > 0 ? (
                        <OpenSlotsBadge open={team.open_slots} />
                      ) : (
                        <span className="text-[0.75rem] text-muted-foreground">Full</span>
                      )}
                    </TableCell>

                    {/* Row actions — hover-reveal per design D6 */}
                    <TableCell className="px-4 py-3 w-32">
                      <div className="flex items-center justify-end gap-2">
                        <RowActions
                          editLabel={editLabel}
                          deleteLabel={deleteLabel}
                          selectLabel={selectLabel}
                          onEdit={() => setModal({ open: true, mode: "edit", team })}
                          onDelete={() => setModal({ open: true, mode: "edit", team })}
                          surfaceSpecial={
                            team.payment_status === "pending" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[0.75rem] h-7 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMarkPaidTeam(team);
                                }}
                              >
                                Mark paid
                              </Button>
                            ) : undefined
                          }
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

      <TeamModal
        open={modal.open}
        mode={modal.mode}
        team={modal.team}
        onOpenChange={(open) => setModal((d) => ({ ...d, open }))}
        onSuccess={handleModalSuccess}
      />

      {markPaidTeam && (
        <MarkPaidModal
          team={markPaidTeam}
          defaultFeeDollars={defaultFeeDollars}
          open={!!markPaidTeam}
          onOpenChange={(open) => { if (!open) setMarkPaidTeam(null); }}
          onDone={handleMarkPaidDone}
        />
      )}
    </div>
  );
}
