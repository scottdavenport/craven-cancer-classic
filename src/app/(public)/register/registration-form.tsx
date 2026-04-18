"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RegistrationFormProps {
  morningCap: number;
  afternoonCap: number;
  morningCount: number;
  afternoonCount: number;
  /** Registration fee in cents (e.g. 70000 = $700). Displayed as formatted dollars. */
  registrationFeeCents: number;
}

interface PlayerInfo {
  full_name: string;
  email: string;
  phone: string;
  handicap: string;
}

const emptyPlayer = (): PlayerInfo => ({
  full_name: "",
  email: "",
  phone: "",
  handicap: "",
});

function formatFee(cents: number): string {
  const dollars = cents / 100;
  return dollars % 1 === 0
    ? `$${dollars.toFixed(0)}`
    : `$${dollars.toFixed(2)}`;
}

export function RegistrationForm({
  morningCap,
  afternoonCap,
  morningCount,
  afternoonCount,
  registrationFeeCents,
}: RegistrationFormProps) {
  const formattedFee = formatFee(registrationFeeCents);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<"morning" | "afternoon">("morning");
  const [players, setPlayers] = useState<PlayerInfo[]>([
    emptyPlayer(),
    emptyPlayer(),
    emptyPlayer(),
    emptyPlayer(),
  ]);

  const morningAvailable = morningCap - morningCount;
  const afternoonAvailable = afternoonCap - afternoonCount;

  function updatePlayer(index: number, field: keyof PlayerInfo, value: string) {
    setPlayers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const body = {
      team_name: formData.get("team_name"),
      captain_name: formData.get("captain_name"),
      captain_email: formData.get("captain_email"),
      captain_phone: formData.get("captain_phone"),
      session,
      players: players.filter((p) => p.full_name.trim()),
    };

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('[RegistrationForm] checkout fetch failed:', err);
      setError("Failed to start registration. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Session picker */}
      <Card>
        <CardHeader>
          <CardTitle>Select Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSession("morning")}
              disabled={morningAvailable <= 0}
              className={`rounded-lg border-2 p-4 text-center transition-colors ${
                session === "morning"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              } ${morningAvailable <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <p className="font-semibold">Morning</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {morningAvailable > 0
                  ? `${morningAvailable} spots remaining`
                  : "Full"}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setSession("afternoon")}
              disabled={afternoonAvailable <= 0}
              className={`rounded-lg border-2 p-4 text-center transition-colors ${
                session === "afternoon"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              } ${afternoonAvailable <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <p className="font-semibold">Afternoon</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {afternoonAvailable > 0
                  ? `${afternoonAvailable} spots remaining`
                  : "Full"}
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Team & Captain info */}
      <Card>
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team_name">Team Name</Label>
            <Input id="team_name" name="team_name" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="captain_name">Captain Name</Label>
              <Input id="captain_name" name="captain_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="captain_email">Captain Email</Label>
              <Input
                id="captain_email"
                name="captain_email"
                type="email"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="captain_phone">Captain Phone</Label>
            <Input id="captain_phone" name="captain_phone" type="tel" />
          </div>
        </CardContent>
      </Card>

      {/* Players */}
      <Card>
        <CardHeader>
          <CardTitle>Players</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {players.map((player, i) => (
            <div key={i} className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Player {i + 1} {i === 0 && "(Captain)"}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`player_${i}_name`} className="text-xs">
                    Name
                  </Label>
                  <Input
                    id={`player_${i}_name`}
                    value={player.full_name}
                    onChange={(e) =>
                      updatePlayer(i, "full_name", e.target.value)
                    }
                    required={i === 0}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`player_${i}_email`} className="text-xs">
                    Email
                  </Label>
                  <Input
                    id={`player_${i}_email`}
                    type="email"
                    value={player.email}
                    onChange={(e) => updatePlayer(i, "email", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`player_${i}_phone`} className="text-xs">
                    Phone
                  </Label>
                  <Input
                    id={`player_${i}_phone`}
                    type="tel"
                    value={player.phone}
                    onChange={(e) => updatePlayer(i, "phone", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`player_${i}_handicap`} className="text-xs">
                    Handicap
                  </Label>
                  <Input
                    id={`player_${i}_handicap`}
                    type="number"
                    value={player.handicap}
                    onChange={(e) =>
                      updatePlayer(i, "handicap", e.target.value)
                    }
                  />
                </div>
              </div>
              {i < 3 && <div className="border-b border-border/50" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="rounded-lg border border-border bg-muted/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">Team Registration</p>
            <p className="text-sm text-muted-foreground">
              {session === "morning" ? "Morning" : "Afternoon"} session &middot;
              4 players
            </p>
          </div>
          <p className="text-2xl font-bold text-foreground">{formattedFee}</p>
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-none bg-primary text-sm uppercase tracking-wider text-primary-foreground hover:bg-secondary"
        >
          {loading ? "Processing..." : "Proceed to Payment"}
        </Button>
      </div>
    </form>
  );
}
