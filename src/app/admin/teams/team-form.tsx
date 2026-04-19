"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
import { X } from "lucide-react";
import { searchContacts, createTeam, updateTeamMembers } from "./actions";
import type {
  TeamWithMembers,
  ContactSearchResult,
  MemberInput,
} from "./actions";

// ---------------------------------------------------------------------------
// ContactTypeahead
// ---------------------------------------------------------------------------

interface ContactTypeaheadProps {
  label: string;
  value: ContactSearchResult | null;
  onChange: (contact: ContactSearchResult | null) => void;
  exclude?: string[]; // contact IDs to exclude from results
}

function ContactTypeahead({ label, value, onChange, exclude = [] }: ContactTypeaheadProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const data = await searchContacts(q);
        const filtered = data.filter((c) => !exclude.includes(c.id));
        setResults(filtered.slice(0, 20));
        setOpen(filtered.length > 0);
      } catch (err) {
        console.error("[ContactTypeahead] searchContacts failed:", err);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exclude.join(",")]
  );

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q), 200);
  }

  function handleSelect(contact: ContactSearchResult) {
    onChange(contact);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <Label>{label}</Label>

      {value ? (
        /* Selected chip */
        <div className="flex items-center gap-2 rounded-lg border border-input bg-neutral-50 px-3 py-2 text-sm">
          <span className="flex-1 font-medium text-foreground">{value.full_name}</span>
          {value.company && (
            <span className="text-muted-foreground text-xs">{value.company}</span>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="ml-1 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Remove ${value.full_name}`}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        /* Search input + dropdown */
        <div className="relative">
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={query}
            onChange={handleQueryChange}
            onFocus={() => query.trim() && results.length > 0 && setOpen(true)}
            autoComplete="off"
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              Searching...
            </span>
          )}
          {open && results.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-md overflow-y-auto max-h-52 text-sm">
              {results.map((contact) => (
                <li key={contact.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center justify-between gap-2 transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent input blur before click
                      handleSelect(contact);
                    }}
                  >
                    <span className="font-medium">{contact.full_name}</span>
                    {contact.company && (
                      <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                        {contact.company}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

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
  function initialContact(role: "captain" | "player", slot: number): ContactSearchResult | null {
    if (!team) return null;
    const member = team.members.find((m) => m.role === role && m.slot === slot);
    if (!member) return null;
    return { id: member.contact_id, full_name: member.full_name, email: null, company: null };
  }

  const [teamName, setTeamName] = useState(team?.team_name ?? "");
  const [session, setSession] = useState(team?.session ?? "morning");
  const [captain, setCaptain] = useState<ContactSearchResult | null>(initialContact("captain", 1));
  const [player2, setPlayer2] = useState<ContactSearchResult | null>(initialContact("player", 2));
  const [player3, setPlayer3] = useState<ContactSearchResult | null>(initialContact("player", 3));
  const [player4, setPlayer4] = useState<ContactSearchResult | null>(initialContact("player", 4));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // All selected contact IDs (for exclusion in other pickers)
  const allSelected = [captain, player2, player3, player4]
    .filter(Boolean)
    .map((c) => c!.id);

  function excludeFor(current: ContactSearchResult | null): string[] {
    return allSelected.filter((id) => id !== current?.id);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) { setError("Team name is required."); return; }
    if (!captain) { setError("Captain is required."); return; }

    setError(null);
    setSubmitting(true);

    try {
      const players = [player2, player3, player4].filter(Boolean) as ContactSearchResult[];

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
        <Select value={session} onValueChange={(v) => setSession(v ?? "morning")}>
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
      />

      {/* Player 2 */}
      <ContactTypeahead
        label="Player 2 (optional)"
        value={player2}
        onChange={setPlayer2}
        exclude={excludeFor(player2)}
      />

      {/* Player 3 */}
      <ContactTypeahead
        label="Player 3 (optional)"
        value={player3}
        onChange={setPlayer3}
        exclude={excludeFor(player3)}
      />

      {/* Player 4 */}
      <ContactTypeahead
        label="Player 4 (optional)"
        value={player4}
        onChange={setPlayer4}
        exclude={excludeFor(player4)}
      />

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save Team"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
