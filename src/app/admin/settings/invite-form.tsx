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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessEmail(null);
    setLoading(true);

    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      if (res.ok) {
        setSuccessEmail(email);
        setEmail("");
        setRole("viewer");
      } else {
        let message = "Failed to send invite";
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch (parseErr) {
          console.error("[InviteForm] failed to parse error response:", parseErr);
        }
        setError(message);
      }
    } catch (err) {
      console.error("[InviteForm] fetch failed:", err);
      setError("Failed to send invite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-sans text-base font-semibold">
          Invite Admin
        </CardTitle>
        <CardDescription className="font-sans text-[0.8125rem] text-muted-foreground">
          Invited users will receive an email with a sign-in link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              {error}
            </div>
          )}
          {successEmail && (
            <div className="rounded-md bg-success-muted p-3 text-sm text-success border border-success/20">
              Invite sent to {successEmail}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole((v as "admin" | "viewer") ?? "viewer")}
              items={{ admin: "Admin", viewer: "Viewer" }}
            >
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Sending…" : "Send Invite"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
