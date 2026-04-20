"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { createSponsor, updateSponsor, deleteSponsor } from "./actions";
import type { Sponsor } from "@/types/database";

interface SponsorshipItemOption {
  id: string;
  name: string;
  price_cents: number;
  year: number;
}

interface SponsorListProps {
  sponsors: Sponsor[];
  sponsorshipItems: SponsorshipItemOption[];
}

export function SponsorList({ sponsors, sponsorshipItems }: SponsorListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Sponsor | null>(null);

  async function handleCreate(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      const result = await createSponsor(formData);
      if (result && "error" in result && typeof result.error === "string") {
        setError(result.error);
      } else {
        setShowForm(false);
      }
    } catch (err) {
      console.error('[SponsorList] createSponsor failed:', err);
      setError("Failed to create sponsor");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: string, formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      const result = await updateSponsor(id, formData);
      if (result && "error" in result && typeof result.error === "string") {
        setError(result.error);
      } else {
        setEditingId(null);
      }
    } catch (err) {
      console.error('[SponsorList] updateSponsor failed:', err);
      setError("Failed to update sponsor");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      const result = await deleteSponsor(deleteTarget.id);
      if (result && "error" in result && typeof result.error === "string") {
        setError(result.error);
      }
    } catch (err) {
      console.error('[SponsorList] deleteSponsor failed:', err);
      setError("Failed to delete sponsor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive border border-destructive/20 p-3 text-sm">
          {error}
        </div>
      )}

      {/* Sponsors table */}
      <Card className="shadow-sm border border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-sans text-base font-semibold">
            Sponsors ({sponsors.length})
          </CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Sponsor
          </Button>
        </CardHeader>
        <CardContent>
          {/* Add form */}
          {showForm && (
            <div className="mb-6 rounded-lg border border-border/60 bg-neutral-50 p-6 shadow-sm">
              <h3 className="mb-4 font-sans text-base font-semibold text-foreground">New Sponsor</h3>
              <SponsorForm
                onSubmit={handleCreate}
                loading={loading}
                onCancel={() => setShowForm(false)}
                sponsorshipItems={sponsorshipItems}
              />
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-border/60 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Name</TableHead>
                  <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tier</TableHead>
                  <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Contact</TableHead>
                  <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Website</TableHead>
                  <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Amount</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sponsors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No sponsors yet. Click &quot;Add Sponsor&quot; to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  sponsors.map((sponsor) =>
                    editingId === sponsor.id ? (
                      <TableRow key={sponsor.id}>
                        <TableCell colSpan={7}>
                          <SponsorForm
                            defaultValues={sponsor}
                            onSubmit={(fd) => handleUpdate(sponsor.id, fd)}
                            loading={loading}
                            onCancel={() => setEditingId(null)}
                            sponsorshipItems={sponsorshipItems}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={sponsor.id}>
                        <TableCell className="font-medium text-[0.9375rem]">
                          {sponsor.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {sponsorshipItems.find((item) => item.id === sponsor.tier_id)?.name ?? (
                            <span className="text-muted-foreground/50">Unknown tier</span>
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
                          <span className={
                            `rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] ` +
                            (sponsor.payment_status === "paid"
                              ? "bg-success-muted text-success"
                              : sponsor.payment_status === "comped"
                              ? "bg-neutral-100 text-neutral-600"
                              : "bg-warning-muted text-warning")
                          }>
                            {sponsor.payment_status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          ${(sponsor.amount_paid_cents / 100).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setEditingId(sponsor.id)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleteTarget(sponsor)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete this sponsor?"
        description="Are you sure you want to delete this sponsor? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
      />
    </div>
  );
}

function SponsorForm({
  defaultValues,
  onSubmit,
  loading,
  onCancel,
  sponsorshipItems,
}: {
  defaultValues?: Partial<Sponsor>;
  onSubmit: (formData: FormData) => void;
  loading: boolean;
  onCancel: () => void;
  sponsorshipItems: SponsorshipItemOption[];
}) {
  const [tierId, setTierId] = useState(defaultValues?.tier_id ?? "");
  const [paymentStatus, setPaymentStatus] = useState(defaultValues?.payment_status ?? "pending");

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Sponsor Name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={defaultValues?.name}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tier_id">Sponsorship level</Label>
          <input type="hidden" name="tier_id" value={tierId} />
          <Select
            value={tierId}
            onValueChange={(v) => setTierId(v ?? "")}
            items={Object.fromEntries(
              sponsorshipItems.map((item) => [
                item.id,
                `${item.name} — $${(item.price_cents / 100).toLocaleString()}`,
              ])
            )}
          >
            <SelectTrigger id="tier_id" className="w-full h-8">
              <SelectValue placeholder="Select a level" />
            </SelectTrigger>
            <SelectContent>
              {sponsorshipItems.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} — ${(item.price_cents / 100).toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_name">Contact Name</Label>
          <Input
            id="contact_name"
            name="contact_name"
            defaultValue={defaultValues?.contact_name ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_email">Contact Email</Label>
          <Input
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={defaultValues?.contact_email ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_phone">Contact Phone</Label>
          <Input
            id="contact_phone"
            name="contact_phone"
            defaultValue={defaultValues?.contact_phone ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            type="url"
            defaultValue={defaultValues?.website ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment_status">Payment Status</Label>
          <input type="hidden" name="payment_status" value={paymentStatus} />
          <Select
            value={paymentStatus}
            onValueChange={(v) => setPaymentStatus(v ?? "pending")}
            items={{ pending: "Pending", paid: "Paid", comped: "Comped" }}
          >
            <SelectTrigger id="payment_status" className="w-full h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="comped">Comped</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount_paid">Amount Paid</Label>
          <Input
            id="amount_paid"
            name="amount_paid"
            type="number"
            step="0.01"
            defaultValue={defaultValues?.amount_paid_cents != null ? defaultValues.amount_paid_cents / 100 : 0}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Saving..." : defaultValues ? "Update" : "Create"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
