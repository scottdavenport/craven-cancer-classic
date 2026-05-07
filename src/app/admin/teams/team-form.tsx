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
import { ModalSection } from "@/components/admin/modal-section";
import { createTeam, updateTeamMembers } from "./actions";
import type {
  TeamWithMembers,
  MemberInput,
} from "./actions";

// ---------------------------------------------------------------------------
// Payment method options — Aria Phase 3 §B6 (locked)
// ---------------------------------------------------------------------------

const PAYMENT_METHOD_OPTIONS = [
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
  { value: "venmo", label: "Venmo" },
  { value: "zelle", label: "Zelle" },
  { value: "wire", label: "Wire" },
  { value: "comped", label: "Comped" },
  { value: "stripe", label: "Stripe" },
  { value: "other", label: "Other" },
] as const;

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
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Roster section — Aria Phase 3 §B2 */}
      <ModalSection title="Roster">
        <div className="space-y-5">
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
            defaultTypes={['player']}
          />

          {/* Player 2 */}
          <ContactTypeahead
            label="Player 2 (optional)"
            value={player2}
            onChange={setPlayer2}
            exclude={excludeFor(player2)}
            onInlineOpenChange={makeInlineHandler("player2")}
            defaultTypes={['player']}
          />

          {/* Player 3 */}
          <ContactTypeahead
            label="Player 3 (optional)"
            value={player3}
            onChange={setPlayer3}
            exclude={excludeFor(player3)}
            onInlineOpenChange={makeInlineHandler("player3")}
            defaultTypes={['player']}
          />

          {/* Player 4 */}
          <ContactTypeahead
            label="Player 4 (optional)"
            value={player4}
            onChange={setPlayer4}
            exclude={excludeFor(player4)}
            onInlineOpenChange={makeInlineHandler("player4")}
            defaultTypes={['player']}
          />
        </div>
      </ModalSection>

      {/* Payment section — Aria Phase 3 §B2 (read-only display for edit; capture via Mark Paid modal) */}
      {isEdit && (
        <ModalSection title="Payment">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <p className="text-sm text-foreground capitalize">{team.payment_status}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Amount paid</Label>
              <p className="text-sm text-foreground tabular-nums">
                ${(team.amount_paid_cents / 100).toFixed(2)}
              </p>
            </div>
            {team.payment_method && (
              <div className="space-y-1.5">
                <Label>Payment method</Label>
                <p className="text-sm text-foreground capitalize">{team.payment_method}</p>
              </div>
            )}
            {team.payment_reference && (
              <div className="space-y-1.5">
                <Label>Reference number</Label>
                <p className="text-sm text-foreground font-mono">{team.payment_reference}</p>
              </div>
            )}
            {team.paid_at && (
              <div className="space-y-1.5">
                <Label>Date paid</Label>
                <p className="text-sm text-foreground">
                  {(() => {
                    const d = new Date(team.paid_at!);
                    return isNaN(d.getTime()) ? team.paid_at : d.toLocaleDateString();
                  })()}
                </p>
              </div>
            )}
          </div>
        </ModalSection>
      )}

      {error && (
        <p className="mx-0 mt-4 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Actions — hidden while an inline contact form is open */}
      {!anyInlineOpen && (
        <div className="flex gap-2 pt-4">
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
