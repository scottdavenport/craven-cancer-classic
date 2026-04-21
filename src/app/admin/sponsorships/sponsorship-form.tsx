"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SponsorshipItem } from "@/types/database";

export interface SponsorshipFormValues {
  name: string;
  price: string;
  description: string;
  max_quantity: string;
  active: string;
}

interface SponsorshipFormProps {
  defaultValues?: Partial<SponsorshipItem>;
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function SponsorshipForm({
  defaultValues,
  onSubmit,
  onCancel,
  loading = false,
}: SponsorshipFormProps) {
  const [active, setActive] = useState(
    defaultValues?.active !== false ? "true" : "false"
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    // active is controlled — inject current value
    formData.set("active", active);
    await onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sf-name">Package Name</Label>
          <Input
            id="sf-name"
            name="name"
            defaultValue={defaultValues?.name}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sf-price">Price ($)</Label>
          <Input
            id="sf-price"
            name="price"
            type="number"
            step="0.01"
            defaultValue={
              defaultValues?.price_cents !== undefined
                ? defaultValues.price_cents / 100
                : undefined
            }
            required
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="sf-description">Description</Label>
          <Textarea
            id="sf-description"
            name="description"
            rows={3}
            defaultValue={defaultValues?.description ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sf-max">Max Quantity</Label>
          <Input
            id="sf-max"
            name="max_quantity"
            type="number"
            defaultValue={defaultValues?.max_quantity ?? ""}
          />
          <p className="text-xs text-muted-foreground">Leave blank for unlimited</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sf-active">Status</Label>
          {/* Hidden input ensures FormData always carries the value */}
          <input type="hidden" name="active" value={active} />
          <Select
            value={active}
            onValueChange={(v) => setActive(v ?? "true")}
            items={{ true: "Active", false: "Inactive" }}
          >
            <SelectTrigger id="sf-active" className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Saving..." : defaultValues?.id ? "Update" : "Create"}
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
