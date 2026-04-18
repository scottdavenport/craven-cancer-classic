"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Download, Search } from "lucide-react";
import { createTeamManually, deleteTeam } from "./actions";
import type { Team } from "@/types/database";

interface RegistrationListProps {
  teams: Team[];
}

export function RegistrationList({ teams }: RegistrationListProps) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = teams.filter(
    (t) =>
      t.team_name.toLowerCase().includes(search.toLowerCase()) ||
      t.captain_name.toLowerCase().includes(search.toLowerCase()) ||
      t.captain_email.toLowerCase().includes(search.toLowerCase())
  );

  const morningTeams = teams.filter((t) => t.session === "morning");
  const afternoonTeams = teams.filter((t) => t.session === "afternoon");
  const totalRevenue = teams.reduce((sum, t) => sum + t.amount_paid, 0);

  async function handleCreate(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      const result = await createTeamManually(formData);
      if (result && "error" in result && typeof result.error === "string") {
        setError(result.error);
      } else {
        setShowForm(false);
      }
    } catch (err) {
      console.error('[RegistrationList] createTeamManually failed:', err);
      setError("Failed to create team");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this team and all its players?")) return;
    setLoading(true);
    try {
      const result = await deleteTeam(id);
      if (result && "error" in result && typeof result.error === "string") {
        setError(result.error);
      }
    } catch (err) {
      console.error('[RegistrationList] deleteTeam failed:', err);
      setError("Failed to delete team");
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    const headers = [
      "Team Name",
      "Captain",
      "Email",
      "Phone",
      "Session",
      "Status",
      "Amount",
      "Date",
    ];
    const rows = teams.map((t) => [
      t.team_name,
      t.captain_name,
      t.captain_email,
      t.captain_phone || "",
      t.session,
      t.payment_status,
      t.amount_paid.toString(),
      new Date(t.created_at).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{teams.length}</p>
            <p className="text-xs text-muted-foreground">Total Teams</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{morningTeams.length}</p>
            <p className="text-xs text-muted-foreground">Morning</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{afternoonTeams.length}</p>
            <p className="text-xs text-muted-foreground">Afternoon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">
              ${totalRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV}>
          <Download className="mr-1 h-4 w-4" />
          Export CSV
        </Button>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" />
          Add Team
        </Button>
      </div>

      {/* Manual add form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Team Manually</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={handleCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="team_name">Team Name</Label>
                  <Input id="team_name" name="team_name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session">Session</Label>
                  <select
                    id="session"
                    name="session"
                    required
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                  </select>
                </div>
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
                <div className="space-y-2">
                  <Label htmlFor="captain_phone">Captain Phone</Label>
                  <Input id="captain_phone" name="captain_phone" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_status">Payment Status</Label>
                  <select
                    id="payment_status"
                    name="payment_status"
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
                    defaultValue="700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input id="notes" name="notes" />
                </div>
              </div>

              {/* Quick player fields */}
              <div>
                <p className="mb-2 text-sm font-medium">Players (optional)</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <Input
                      key={i}
                      name={`player_${i}_name`}
                      placeholder={`Player ${i + 1} name`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? "Saving..." : "Add Team"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Teams table */}
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Captain</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    {search
                      ? "No teams match your search"
                      : "No registrations yet"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">
                      {team.team_name}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{team.captain_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {team.captain_email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {team.session}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          team.payment_status === "paid"
                            ? "default"
                            : team.payment_status === "comped"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {team.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      ${team.amount_paid.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(team.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(team.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
