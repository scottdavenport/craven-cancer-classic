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
import { ContactTypeahead } from "@/components/admin/contact-typeahead";
import type { ContactPickResult } from "@/components/admin/contact-typeahead";
import { createTeam, updateTeamMembers } from "./actions";
import type {
  TeamWithMembers,
  MemberInput,
} from "./actions";

// ---------------------------------------------------------------------------
// TeamForm
// ---------------------------------------------------------------------------

export interface TeamFormProps {
  /** Existing team being edited. Null = new team. */
  team: TeamWithMembers | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TeamForm({ team, onSuccess, onCancel }: TeamFormProps) {
  const isEdit = team !== null;

  // Resolve initial member slots from existing team data
  function initialContact(role: "captain" | "player", slot: number): ContactPickResult | null {
    if (!team) return null;
    const member = team.members.find((m) => m.role === role && m.slot === slot);
    if (!member) return null;
    return { id: member.contact_id, full_name: member.full_name, email: null, company: null };
  }

  const [teamName, setTeamName] = useState(team?.team_name ?? "");
  const [session, setSession] = useState(team?.session ?? "morning");
  const [captain, setCaptain] = useState<ContactPickResult | null>(initialContact("captain", 1));
  const [player2, setPlayer2] = useState<ContactPickResult | null>(initialContact("player", 2));
  const [player3, setPlayer3] = useState<ContactPickResult | null>(initialContact("player", 3));
  const [player4, setPlayer4] = useState<ContactPickResult | null>(initialContact("player", 4));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set of slot IDs currently showing an inline create-contact form.
  // Using a Set instead of a boolean prevents a race: if two inline forms were
  // open simultaneously, closing the first would not prematurely clear the gate.
  const [inlineOpenSlots, setInlineOpenSlots] = useState<Set<string>>(new Set());
  const anyInlineOpen = inlineOpenSlots.size > 0;

  function makeInlineHandler(slotId: string) {
    return (open: boolean) => {
      setInlineOpenSlots((prev) => {
        const next = new Set(prev);
        if (open) {
          next.add(slotId);
        } else {
          next.delete(slotId);
        }
        return next;
      });
    };
  }

  // All selected contact IDs (for exclusion in other pickers)
  const allSelected = [captain, player2, player3, player4]
    .filter(Boolean)
    .map((c) => c!.id);

  function excludeFor(current: ContactPickResult | null): string[] {
    return allSelected.filter((id) => id !== current?.id);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) { setError("Team name is required."); return; }
    if (!captain) { setError("Captain is required."); return; }

    setError(null);
    setSubmitting(true);

    try {
      const players = [player2, player3, player4].filter(Boolean) as ContactPickResult[];

      if (isEdit) {
        const members: MemberInput[] = [
          { contact_id: captain.id, role: "captain", slot: 1 },
          ...players.map((p, i) => ({ contact_id: p.id, role: "player" as const, slot: i + 2 })),
        ];
        const result = await updateTeamMembers(team.id, members);
        if ("error" in result) { setError(result.error); return; }
      } else {
        const result = await createTeam({
          team_name: teamName.trim(),
          session,
          captain_contact_id: captain.id,
          player_contact_ids: players.map((p) => p.id),
        });
        if ("error" in result) { setError(result.error); return; }
      }

      onSuccess();
    } catch (err) {
      console.error("[TeamForm] submit failed:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Team name */}
      <div className="space-y-1.5">
        <Label htmlFor="team-name">Team Name</Label>
        <Input
          id="team-name"
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="e.g. The Birdies"
          disabled={isEdit} // name locked when editing — use registrations page to rename
          required
        />
        {isEdit && (
          <p className="text-xs text-muted-foreground">Team name cannot be changed here.</p>
        )}
      </div>

      {/* Session */}
      <div className="space-y-1.5">
        <Label>Session</Label>
        <Select value={session} onValueChange={(v) => setSession(v ?? "morning")} items={{ morning: "Morning", afternoon: "Afternoon" }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="morning">Morning</SelectItem>
            <SelectItem value="afternoon">Afternoon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Captain */}
      <ContactTypeahead
        label="Captain"
        value={captain}
        onChange={setCaptain}
        exclude={excludeFor(captain)}
        onInlineOpenChange={makeInlineHandler("captain")}
      />

      {/* Player 2 */}
      <ContactTypeahead
        label="Player 2 (optional)"
        value={player2}
        onChange={setPlayer2}
        exclude={excludeFor(player2)}
        onInlineOpenChange={makeInlineHandler("player2")}
      />

      {/* Player 3 */}
      <ContactTypeahead
        label="Player 3 (optional)"
        value={player3}
        onChange={setPlayer3}
        exclude={excludeFor(player3)}
        onInlineOpenChange={makeInlineHandler("player3")}
      />

      {/* Player 4 */}
      <ContactTypeahead
        label="Player 4 (optional)"
        value={player4}
        onChange={setPlayer4}
        exclude={excludeFor(player4)}
        onInlineOpenChange={makeInlineHandler("player4")}
      />

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Actions — hidden while an inline contact form is open to avoid button label conflicts */}
      {!anyInlineOpen && (
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save Team"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        </div>
      )}
    </form>
  );
}
