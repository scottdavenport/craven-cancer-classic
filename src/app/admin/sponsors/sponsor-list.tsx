"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this sponsor?")) return;
    setLoading(true);
    try {
      const result = await deleteSponsor(id);
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

  const statusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "comped":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Sponsors table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
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
            <div className="mb-6 rounded-lg border border-border p-4">
              <h3 className="mb-4 font-medium">New Sponsor</h3>
              <SponsorForm
                onSubmit={handleCreate}
                loading={loading}
                onCancel={() => setShowForm(false)}
                sponsorshipItems={sponsorshipItems}
              />
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sponsors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No sponsors yet. Click &quot;Add Sponsor&quot; to get started.
                  </TableCell>
                </TableRow>
              ) : (
                sponsors.map((sponsor) =>
                  editingId === sponsor.id ? (
                    <TableRow key={sponsor.id}>
                      <TableCell colSpan={6}>
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
                      <TableCell className="font-medium">
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
                        <Badge variant={statusColor(sponsor.payment_status)}>
                          {sponsor.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
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
                            onClick={() => handleDelete(sponsor.id)}
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
          <select
            id="tier_id"
            name="tier_id"
            required
            defaultValue={defaultValues?.tier_id ?? ""}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="" disabled>Select a level</option>
            {sponsorshipItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — ${(item.price_cents / 100).toLocaleString()}
              </option>
            ))}
          </select>
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
          <select
            id="payment_status"
            name="payment_status"
            defaultValue={defaultValues?.payment_status ?? "pending"}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="comped">Comped</option>
          </select>
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
