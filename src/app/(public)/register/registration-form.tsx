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

interface TeammateInfo {
  full_name: string;
  email: string;
  phone: string;
  tbd: boolean;
}

const emptyTeammate = (): TeammateInfo => ({
  full_name: "",
  email: "",
  phone: "",
  tbd: false,
});

function formatFee(cents: number): string {
  const dollars = cents / 100;
  return dollars % 1 === 0
    ? `$${dollars.toFixed(0)}`
    : `$${dollars.toFixed(2)}`;
}

const TEAMMATE_LABELS = ["Player 2", "Player 3", "Player 4"];

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
  const [teammates, setTeammates] = useState<TeammateInfo[]>([
    emptyTeammate(),
    emptyTeammate(),
    emptyTeammate(),
  ]);

  const morningAvailable = morningCap - morningCount;
  const afternoonAvailable = afternoonCap - afternoonCount;

  function updateTeammate(
    index: number,
    field: keyof TeammateInfo,
    value: string | boolean
  ) {
    setTeammates((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
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
      teammates: teammates.map((t) =>
        t.tbd
          ? { full_name: "", email: "", phone: "", tbd: true }
          : {
              full_name: t.full_name.trim(),
              email: t.email.trim(),
              phone: t.phone.trim(),
              tbd: false,
            }
      ),
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
      console.error("[RegistrationForm] checkout fetch failed:", err);
      setError("Failed to start registration. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      {/* Session picker */}
      <Card>
        <CardHeader>
          <CardTitle as="h3">Preferred Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div role="radiogroup" aria-label="Preferred session" className="grid grid-cols-2 gap-4">
            <button
              type="button"
              role="radio"
              aria-pressed={session === "morning"}
              onClick={() => setSession("morning")}
              disabled={morningAvailable <= 0}
              className={`rounded-lg border-2 p-4 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none ${
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
              role="radio"
              aria-pressed={session === "afternoon"}
              onClick={() => setSession("afternoon")}
              disabled={afternoonAvailable <= 0}
              className={`rounded-lg border-2 p-4 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none ${
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
          <p className="mt-3 text-sm text-muted-foreground">
            The committee balances morning and afternoon groups. Your final session will be confirmed by email.
          </p>
        </CardContent>
      </Card>

      {/* Team & Captain info */}
      <Card>
        <CardHeader>
          <CardTitle as="h3">Team Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team_name">Team Name</Label>
            <Input id="team_name" name="team_name" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="captain_name">Your Name (Captain)</Label>
              <Input id="captain_name" name="captain_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="captain_email">Your Email</Label>
              <Input
                id="captain_email"
                name="captain_email"
                type="email"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="captain_phone">
              Your Phone{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input id="captain_phone" name="captain_phone" type="tel" />
          </div>
        </CardContent>
      </Card>

      {/* Teammate cards */}
      {TEAMMATE_LABELS.map((label, i) => {
        const teammate = teammates[i];
        return (
          <Card key={i}>
            <CardHeader>
              <CardTitle as="h3">{label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* TBD checkbox */}
              <div className="flex items-center gap-3">
                <input
                  id={`teammate_${i}_tbd`}
                  type="checkbox"
                  checked={teammate.tbd}
                  onChange={(e) => updateTeammate(i, "tbd", e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                />
                <Label
                  htmlFor={`teammate_${i}_tbd`}
                  className="cursor-pointer text-sm font-normal text-muted-foreground"
                >
                  I&apos;ll add this player later
                </Label>
              </div>

              {teammate.tbd ? (
                <p className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
                  Slot reserved — you can add this player after registration.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor={`teammate_${i}_name`}>Name</Label>
                    <Input
                      id={`teammate_${i}_name`}
                      value={teammate.full_name}
                      onChange={(e) =>
                        updateTeammate(i, "full_name", e.target.value)
                      }
                      autoComplete="off"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor={`teammate_${i}_email`}>
                        Email{" "}
                        <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id={`teammate_${i}_email`}
                        type="email"
                        value={teammate.email}
                        onChange={(e) =>
                          updateTeammate(i, "email", e.target.value)
                        }
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`teammate_${i}_phone`}>
                        Phone{" "}
                        <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id={`teammate_${i}_phone`}
                        type="tel"
                        value={teammate.phone}
                        onChange={(e) =>
                          updateTeammate(i, "phone", e.target.value)
                        }
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

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
          className="mt-4 w-full bg-primary text-sm uppercase tracking-wider text-primary-foreground hover:bg-secondary"
        >
          {loading ? "Processing..." : "Continue to Payment"}
        </Button>
      </div>
    </form>
  );
}
