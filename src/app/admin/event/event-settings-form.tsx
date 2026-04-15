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
    } catch {
      setError("Failed to update settings");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Settings updated successfully
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tournament Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Label htmlFor="date">Tournament Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={settings?.date ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              defaultValue={
                settings?.location ?? "New Bern Golf & Country Club"
              }
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}
