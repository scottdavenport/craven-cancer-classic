"use client";

import { useState } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(
    settings?.registration_open ?? false
  );

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    setLoading(true);

    if (registrationOpen) {
      formData.set("registration_open", "on");
    } else {
      formData.delete("registration_open");
    }

    try {
      const result = await updateEventSettings(formData);
      if (result && "error" in result && typeof result.error === "string") {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('[EventSettingsForm] updateEventSettings failed:', err);
      setError("Failed to update settings");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-success-muted p-3 text-sm text-success border border-success/20">
          Settings updated successfully
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tournament Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset className="space-y-4">
            <legend className="font-sans text-[0.75rem] uppercase tracking-[0.15em] text-muted-foreground/70 mb-4">
              Event Details
            </legend>
            <div className="space-y-2">
              <Label htmlFor="name">Tournament Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={settings?.name ?? "Craven Cancer Classic"}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={settings?.description ?? ""}
              />
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
            <legend className="font-sans text-[0.75rem] uppercase tracking-[0.15em] text-muted-foreground/70 mb-4">
              Dates &amp; Venue
            </legend>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tournament_start_date">Start Date</Label>
                <Input
                  id="tournament_start_date"
                  name="tournament_start_date"
                  type="date"
                  defaultValue={settings?.tournament_start_date ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tournament_end_date">End Date</Label>
                <Input
                  id="tournament_end_date"
                  name="tournament_end_date"
                  type="date"
                  defaultValue={settings?.tournament_end_date ?? ""}
                />
              </div>
            </div>

            <div className="space-y-2">
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
            <legend className="font-sans text-[0.75rem] uppercase tracking-[0.15em] text-muted-foreground/70 mb-4">
              Registration
            </legend>
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

            <div className="space-y-2">
              <Label htmlFor="registration_fee">Registration Fee (USD)</Label>
              <Input
                id="registration_fee"
                name="registration_fee"
                type="number"
                step="0.01"
                min="0"
                defaultValue={
                  settings?.registration_fee_cents != null
                    ? (settings.registration_fee_cents / 100).toFixed(2)
                    : "700.00"
                }
              />
              <p className="mt-1 font-sans text-[0.75rem] text-muted-foreground">
                Per-team fee shown on the public registration page.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="morning_cap">Morning Slot Cap</Label>
                <Input
                  id="morning_cap"
                  name="morning_cap"
                  type="number"
                  defaultValue={settings?.morning_cap ?? 36}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="afternoon_cap">Afternoon Slot Cap</Label>
                <Input
                  id="afternoon_cap"
                  name="afternoon_cap"
                  type="number"
                  defaultValue={settings?.afternoon_cap ?? 36}
                  min={1}
                />
              </div>
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" disabled={loading}>
        {loading ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}
