"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  createSponsorshipItem,
  updateSponsorshipItem,
  deleteSponsorshipItem,
} from "./actions";
import type { SponsorshipItem, SponsorshipPurchase } from "@/types/database";

interface SponsorshipManagerProps {
  items: SponsorshipItem[];
  purchases: SponsorshipPurchase[];
}

export function SponsorshipManager({
  items,
  purchases,
}: SponsorshipManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const totalRevenue = purchases
    .filter((p) => p.payment_status === "paid")
    .reduce((sum, p) => sum + p.amount_paid_cents, 0);

  async function handleCreate(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      const result = await createSponsorshipItem(formData);
      if (result && "error" in result && typeof result.error === "string") {
        setError(result.error);
      } else {
        setShowForm(false);
      }
    } catch (err) {
      console.error('[SponsorshipManager] createSponsorshipItem failed:', err);
      setError("Failed to create item");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: string, formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      const result = await updateSponsorshipItem(id, formData);
      if (result && "error" in result && typeof result.error === "string") {
        setError(result.error);
      } else {
        setEditingId(null);
      }
    } catch (err) {
      console.error('[SponsorshipManager] updateSponsorshipItem failed:', err);
      setError("Failed to update item");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this sponsorship package?")) return;
    setLoading(true);
    try {
      const result = await deleteSponsorshipItem(id);
      if (result && "error" in result && typeof result.error === "string") {
        setError(result.error);
      }
    } catch (err) {
      console.error('[SponsorshipManager] deleteSponsorshipItem failed:', err);
      setError("Failed to delete item");
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

      {/* Sponsorship items */}
      <Card className="shadow-sm border border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-sans text-base font-semibold">Packages ({items.length})</CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Package
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="mb-6 rounded-lg border border-border/60 bg-neutral-50 p-6 shadow-sm max-w-2xl">
              <h3 className="mb-4 font-sans text-base font-semibold text-foreground">New Sponsorship Package</h3>
              <ItemForm
                onSubmit={handleCreate}
                loading={loading}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-border/60 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Name</TableHead>
                  <TableHead className="text-right text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Price</TableHead>
                  <TableHead className="text-right text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sold</TableHead>
                  <TableHead className="text-right text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Max</TableHead>
                  <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      No sponsorship packages yet
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) =>
                    editingId === item.id ? (
                      <TableRow key={item.id}>
                        <TableCell colSpan={6}>
                          <ItemForm
                            defaultValues={item}
                            onSubmit={(fd) => handleUpdate(item.id, fd)}
                            loading={loading}
                            onCancel={() => setEditingId(null)}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium text-[0.9375rem]">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {item.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums lining-nums font-medium">
                          {(item.price_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}
                        </TableCell>
                        <TableCell className={`text-right font-mono tabular-nums lining-nums ${item.max_quantity && item.sold_count >= item.max_quantity ? "text-warning font-semibold" : "text-foreground"}`}>
                          {item.sold_count}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums lining-nums text-muted-foreground">
                          {item.max_quantity ?? "∞"}
                        </TableCell>
                        <TableCell>
                          <span className={
                            `rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] ` +
                            (item.active
                              ? "bg-success-muted text-success"
                              : "bg-neutral-100 text-neutral-600")
                          }>
                            {item.active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setEditingId(item.id)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(item.id)}
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

      {/* Purchases */}
      {purchases.length > 0 && (
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
                        <span className={
                          `rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] ` +
                          (p.payment_status === "paid"
                            ? "bg-success-muted text-success"
                            : p.payment_status === "pending"
                            ? "bg-warning-muted text-warning"
                            : "bg-destructive/10 text-destructive")
                        }>
                          {p.payment_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums lining-nums">
                        {(p.amount_paid_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}
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
    </div>
  );
}

function ItemForm({
  defaultValues,
  onSubmit,
  loading,
  onCancel,
}: {
  defaultValues?: Partial<SponsorshipItem>;
  onSubmit: (formData: FormData) => void;
  loading: boolean;
  onCancel: () => void;
}) {
  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="item_name">Package Name</Label>
          <Input
            id="item_name"
            name="name"
            defaultValue={defaultValues?.name}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="item_price">Price ($)</Label>
          <Input
            id="item_price"
            name="price"
            type="number"
            step="0.01"
            defaultValue={defaultValues?.price_cents !== undefined ? defaultValues.price_cents / 100 : undefined}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="item_description">Description</Label>
          <Textarea
            id="item_description"
            name="description"
            rows={2}
            defaultValue={defaultValues?.description ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="item_max">Max Quantity (blank = unlimited)</Label>
          <Input
            id="item_max"
            name="max_quantity"
            type="number"
            defaultValue={defaultValues?.max_quantity ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="item_active">Status</Label>
          <select
            id="item_active"
            name="active"
            defaultValue={defaultValues?.active !== false ? "true" : "false"}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Saving..." : defaultValues ? "Update" : "Create"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
