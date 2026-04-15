"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
    .reduce((sum, p) => sum + p.amount_paid, 0);

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
    } catch {
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
    } catch {
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
    } catch {
      setError("Failed to delete item");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{items.length}</p>
            <p className="text-xs text-muted-foreground">Packages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{purchases.length}</p>
            <p className="text-xs text-muted-foreground">Purchases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">
              ${totalRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Sponsorship items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Packages ({items.length})</CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Package
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="mb-6 rounded-lg border border-border p-4">
              <h3 className="mb-4 font-medium">New Sponsorship Package</h3>
              <ItemForm
                onSubmit={handleCreate}
                loading={loading}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">Sold / Max</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    No sponsorship packages yet
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) =>
                  editingId === item.id ? (
                    <TableRow key={item.id}>
                      <TableCell colSpan={5}>
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
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${item.price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.sold_count}
                        {item.max_quantity ? ` / ${item.max_quantity}` : ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.active ? "default" : "outline"}>
                          {item.active ? "Active" : "Inactive"}
                        </Badge>
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
                            className="text-destructive"
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
        </CardContent>
      </Card>

      {/* Purchases */}
      {purchases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Purchaser</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{p.purchaser_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.purchaser_email}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.company_name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.payment_status === "paid" ? "default" : "outline"
                        }
                      >
                        {p.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      ${p.amount_paid.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
            defaultValue={defaultValues?.price}
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
