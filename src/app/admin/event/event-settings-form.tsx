"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateEventSettings } from "./actions";
import type { EventSettings } from "@/types/database";

interface EventSettingsFormProps {
  settings: EventSettings | null;
}

export function EventSettingsForm({ settings }: EventSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [registrationOpen, setRegistrationOpen] = useState(
    settings?.registration_open ?? false
  );

  const [nameError, setNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  function validateName(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return "Tournament name is required";
    if (trimmed.length > 100) return "Name must be 100 characters or fewer";
    return null;
  }

  function validateDescription(value: string): string | null {
    if (value.trim().length > 2000) return "Description must be 2000 characters or fewer";
    return null;
  }

  function validateFee(value: string): string | null {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0) return "Invalid registration fee";
    return null;
  }

  function validateDateRange(startValue: string, endValue: string): string | null {
    if (startValue && endValue && endValue < startValue) {
      return "End date must be on or after start date";
    }
    return null;
  }

  function hasAnyError(): boolean {
    return !!(nameError || descriptionError || feeError || dateRangeError);
  }

  function handleSubmit(formData: FormData) {
    if (registrationOpen) {
      formData.set("registration_open", "on");
    } else {
      formData.delete("registration_open");
    }

    const nameVal = (formData.get("name") as string) ?? "";
    const descVal = (formData.get("description") as string) ?? "";
    const feeVal = (formData.get("registration_fee") as string) ?? "";
    const startVal = (formData.get("tournament_start_date") as string) ?? "";
    const endVal = (formData.get("tournament_end_date") as string) ?? "";

    const nameErr = validateName(nameVal);
    const descErr = validateDescription(descVal);
    const feeErr = validateFee(feeVal);
    const dateErr = validateDateRange(startVal, endVal);

    setNameError(nameErr);
    setDescriptionError(descErr);
    setFeeError(feeErr);
    setDateRangeError(dateErr);

    if (nameErr || descErr || feeErr || dateErr) return;

    startTransition(async () => {
      const result = await updateEventSettings(formData);
      if (result?.error !== undefined) {
        toast.error(result.error || "Failed to save");
      } else {
        toast.success("Event settings saved");
      }
    });
  }

  return (
    <form action={handleSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tournament Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Tournament Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={settings?.name ?? "Craven Cancer Classic"}
                onBlur={(e) => setNameError(validateName(e.target.value))}
                onChange={() => setNameError(null)}
              />
              {nameError && (
                <p className="text-destructive text-sm">{nameError}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={settings?.description ?? ""}
                onBlur={(e) => setDescriptionError(validateDescription(e.target.value))}
                onChange={() => setDescriptionError(null)}
              />
              {descriptionError && (
                <p className="text-destructive text-sm">{descriptionError}</p>
              )}
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tournament Dates &amp; Venue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tournament_start_date">Start Date</Label>
                <Input
                  id="tournament_start_date"
                  name="tournament_start_date"
                  type="date"
                  defaultValue={settings?.tournament_start_date ?? ""}
                  onChange={() => setDateRangeError(null)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tournament_end_date">End Date</Label>
                <Input
                  id="tournament_end_date"
                  name="tournament_end_date"
                  type="date"
                  defaultValue={settings?.tournament_end_date ?? ""}
                  onBlur={(e) => {
                    const form = e.target.form;
                    if (!form) return;
                    const startEl = form.elements.namedItem("tournament_start_date") as HTMLInputElement | null;
                    setDateRangeError(validateDateRange(startEl?.value ?? "", e.target.value));
                  }}
                  onChange={() => setDateRangeError(null)}
                />
              </div>
            </div>
            {dateRangeError && (
              <p className="text-destructive text-sm">{dateRangeError}</p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="venue_name">Venue Name</Label>
              <Input
                id="venue_name"
                name="venue_name"
                defaultValue={settings?.venue_name ?? ""}
                placeholder="New Bern Golf &amp; Country Club"
              />
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="registration_open">Registration Open</Label>
                <p className="text-sm text-muted-foreground">
                  Allow teams to register for the tournament
                </p>
              </div>
              <Switch
                id="registration_open"
                checked={registrationOpen}
                onCheckedChange={setRegistrationOpen}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="registration_fee">Registration Fee (USD)</Label>
              <Input
                id="registration_fee"
                name="registration_fee"
                type="number"
                step="0.01"
                defaultValue={
                  settings?.registration_fee_cents != null
                    ? (settings.registration_fee_cents / 100).toFixed(2)
                    : "700.00"
                }
                onBlur={(e) => setFeeError(validateFee(e.target.value))}
                onChange={() => setFeeError(null)}
              />
              {feeError && (
                <p className="text-destructive text-sm">{feeError}</p>
              )}
              <p className="mt-1 font-sans text-[0.75rem] text-muted-foreground">
                Amount shown on the public registration page per team.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="morning_cap">Morning Slot Cap</Label>
                <Input
                  id="morning_cap"
                  name="morning_cap"
                  type="number"
                  defaultValue={settings?.morning_cap ?? 36}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="afternoon_cap">Afternoon Slot Cap</Label>
                <Input
                  id="afternoon_cap"
                  name="afternoon_cap"
                  type="number"
                  defaultValue={settings?.afternoon_cap ?? 36}
                />
              </div>
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}
