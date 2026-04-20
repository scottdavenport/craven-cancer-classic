"use client";

import { useState } from "react";
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
import type { Sponsor } from "@/types/database";

export interface SponsorshipItemOption {
  id: string;
  name: string;
  price_cents: number;
  year: number;
}

interface SponsorFormProps {
  defaultValues?: Partial<Sponsor>;
  sponsorshipItems: SponsorshipItemOption[];
  onSubmit: (formData: FormData) => void | Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export function SponsorForm({
  defaultValues,
  sponsorshipItems,
  onSubmit,
  onCancel,
  loading,
}: SponsorFormProps) {
  const [tierId, setTierId] = useState(defaultValues?.tier_id ?? "");
  const [paymentStatus, setPaymentStatus] = useState(
    defaultValues?.payment_status ?? "pending"
  );

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sf-name">Sponsor Name</Label>
          <Input
            id="sf-name"
            name="name"
            defaultValue={defaultValues?.name}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-tier_id">Sponsorship level</Label>
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
            <SelectTrigger id="sf-tier_id" className="w-full h-8">
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
          <Label htmlFor="sf-contact_name">Contact Name</Label>
          <Input
            id="sf-contact_name"
            name="contact_name"
            defaultValue={defaultValues?.contact_name ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-contact_email">Contact Email</Label>
          <Input
            id="sf-contact_email"
            name="contact_email"
            type="email"
            defaultValue={defaultValues?.contact_email ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-contact_phone">Contact Phone</Label>
          <Input
            id="sf-contact_phone"
            name="contact_phone"
            defaultValue={defaultValues?.contact_phone ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-website">Website</Label>
          <Input
            id="sf-website"
            name="website"
            type="url"
            defaultValue={defaultValues?.website ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-payment_status">Payment Status</Label>
          <input type="hidden" name="payment_status" value={paymentStatus} />
          <Select
            value={paymentStatus}
            onValueChange={(v) => setPaymentStatus(v ?? "pending")}
            items={{ pending: "Pending", paid: "Paid", comped: "Comped" }}
          >
            <SelectTrigger id="sf-payment_status" className="w-full h-8">
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
          <Label htmlFor="sf-amount_paid">Amount Paid</Label>
          <Input
            id="sf-amount_paid"
            name="amount_paid"
            type="number"
            step="0.01"
            defaultValue={
              defaultValues?.amount_paid_cents != null
                ? defaultValues.amount_paid_cents / 100
                : 0
            }
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
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
