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
import { ModalSection } from "@/components/admin/modal-section";
import type { SponsorshipItem } from "@/types/database";

export interface SponsorshipFormValues {
  name: string;
  price: string;
  description: string;
  max_quantity: string;
  active: string;
  category: string;
}

type SponsorshipCategory = "sponsorship" | "tribute" | "supporter";

const CATEGORY_ITEMS: Record<SponsorshipCategory, string> = {
  sponsorship: "Sponsorship",
  tribute: "Tribute",
  supporter: "Supporter",
};

interface SponsorshipFormProps {
  defaultValues?: Partial<SponsorshipItem>;
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
  loading?: boolean;
}

export function SponsorshipForm({
  defaultValues,
  onSubmit,
  onCancel,
  onDelete,
  loading = false,
}: SponsorshipFormProps) {
  const [active, setActive] = useState(
    defaultValues?.active !== false ? "true" : "false"
  );
  const [category, setCategory] = useState<SponsorshipCategory>(
    (defaultValues?.category as SponsorshipCategory) ?? "sponsorship"
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    // controlled fields — inject current values
    formData.set("active", active);
    formData.set("category", category);
    await onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Item section: Name, Description, Price, Year */}
      <ModalSection title="Item">
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
            <Label htmlFor="sf-category">Category</Label>
            {/* Hidden input ensures FormData always carries the value */}
            <input type="hidden" name="category" value={category} />
            <Select
              value={category}
              onValueChange={(v) => setCategory((v ?? "sponsorship") as SponsorshipCategory)}
              items={CATEGORY_ITEMS}
            >
              <SelectTrigger id="sf-category" className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sponsorship">Sponsorship</SelectItem>
                <SelectItem value="tribute">Tribute</SelectItem>
                <SelectItem value="supporter">Supporter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ModalSection>

      {/* Inventory section: Max quantity, Active toggle */}
      <ModalSection title="Inventory">
        <div className="grid gap-4 sm:grid-cols-2">
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
      </ModalSection>

      {/* Footer: Delete (left) + Cancel/Save (right) */}
      <div className="flex justify-between items-center pt-4 mt-2">
        <div>
          {onDelete && defaultValues?.id && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={onDelete}
              disabled={loading}
            >
              Move to Trash
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Saving..." : defaultValues?.id ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </form>
  );
}
