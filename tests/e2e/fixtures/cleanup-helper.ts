/**
 * E2E test data cleanup helper.
 *
 * Uses the service-role key to bypass RLS and delete all rows bearing the
 * e2e marker pattern from tracked tables, in FK-safe order (child → parent).
 *
 * Tracked tables (FK-safe delete order):
 *   1. scores         — team_id → teams.id
 *   2. team_members   — contact_id → contacts.id
 *   3. teams          — captain_contact_id → contacts.id
 *   4. contacts       — email marker root (includes soft-deleted rows)
 *
 * Marker pattern: contacts.email ILIKE 'e2e-%@example.com'
 * Per-seed-tag:   contacts.email ILIKE 'e2e-<seedTag>%@example.com'
 *
 * FAILURE MODE: cleanupTestData missing/500
 *   Symptom: test afterAll throws, e2e-* rows accumulate in prod.
 *   Diagnostic: check SUPABASE_SERVICE_ROLE_KEY is set; verify Supabase project URL is reachable.
 *   Remediation: set env var, re-run the test suite; run `npm run e2e:scrub` for manual cleanup.
 *   Escalation: file a priority:p1 issue if rows persist after manual scrub.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// AC3: import-time guard — refuses to run if key is absent
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "cleanup-helper: NEXT_PUBLIC_SUPABASE_URL is not set. Set it in .env.local."
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "cleanup-helper: SUPABASE_SERVICE_ROLE_KEY is not set. Set it in .env.local. " +
      "This key is required to bypass RLS for e2e test data cleanup."
  );
}

// AC2: exported symbol 1 — service-role client (bypass RLS, no session)
export const serviceRoleClient: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  serviceRoleKey,
  { auth: { persistSession: false } }
);

// Module-level orphan registry: seedTag → Set of { table, id }
type TrackedTable = "scores" | "team_members" | "teams" | "contacts";
type OrphanEntry = { table: TrackedTable; id: string };
const orphanRegistry = new Map<string, Set<OrphanEntry>>();

/**
 * AC2: exported symbol 3 — register a specific row ID for cleanup by seedTag.
 *
 * Call from tests that create rows via direct Supabase writes (not UI flows),
 * e.g. team-delete-type-to-confirm.spec.ts.
 *
 * @param table   - The tracked table the row belongs to.
 * @param id      - The row's UUID.
 * @param seedTag - The test's seed tag (used to scope cleanup in afterAll).
 */
export function registerOrphan(
  table: TrackedTable,
  id: string,
  seedTag: string
): void {
  if (!orphanRegistry.has(seedTag)) {
    orphanRegistry.set(seedTag, new Set());
  }
  orphanRegistry.get(seedTag)!.add({ table, id });
}

/**
 * Delete result counts per tracked table.
 */
export interface CleanupResult {
  deleted: {
    scores: number;
    team_members: number;
    teams: number;
    contacts: number;
  };
}

/**
 * AC2: exported symbol 2 — delete all e2e test data for a seedTag (or all e2e rows).
 *
 * FK-safe delete order: scores → team_members → teams → contacts.
 * Ignores deleted_at — hard-deletes soft-deleted rows too.
 * Idempotent — second call with no matching rows returns all-zeros without throwing.
 *
 * @param seedTag - Optional. When provided, restricts deletion to rows matching
 *                  'e2e-<seedTag>%@example.com'. When omitted, matches all
 *                  'e2e-%@example.com'. Use omitted form only from scrub scripts.
 */
export async function cleanupTestData(seedTag?: string): Promise<CleanupResult> {
  const emailPattern = seedTag
    ? `e2e-${seedTag}%@example.com`
    : "e2e-%@example.com";

  const counts = { scores: 0, team_members: 0, teams: 0, contacts: 0 };

  // Step 1: Resolve target contact IDs by email marker
  const { data: contactRows, error: contactSelectError } = await serviceRoleClient
    .from("contacts")
    .select("id")
    .ilike("email", emailPattern);

  if (contactSelectError) {
    throw new Error(
      `cleanupTestData: failed to query contacts: ${contactSelectError.message}`
    );
  }

  const contactIds = (contactRows ?? []).map((r) => r.id);

  // Step 2: Resolve team IDs whose captain is an e2e contact
  let teamIds: string[] = [];
  if (contactIds.length > 0) {
    const { data: teamRows, error: teamSelectError } = await serviceRoleClient
      .from("teams")
      .select("id")
      .in("captain_contact_id", contactIds);

    if (teamSelectError) {
      throw new Error(
        `cleanupTestData: failed to query teams: ${teamSelectError.message}`
      );
    }
    teamIds = (teamRows ?? []).map((r) => r.id);
  }

  // Step 3a: Delete any registered orphan rows for this seedTag (by explicit ID)
  if (seedTag && orphanRegistry.has(seedTag)) {
    const orphans = orphanRegistry.get(seedTag)!;
    for (const { table, id } of orphans) {
      const { error } = await serviceRoleClient
        .from(table)
        .delete()
        .eq("id", id);
      if (error) {
        throw new Error(
          `cleanupTestData: failed to delete orphan from ${table} (id=${id}): ${error.message}`
        );
      }
    }
    orphanRegistry.delete(seedTag);
  }

  // Step 3b: Delete scores (child of teams) — FK-safe first
  if (teamIds.length > 0) {
    const { data: deletedScores, error: scoresError } = await serviceRoleClient
      .from("scores")
      .delete()
      .in("team_id", teamIds)
      .select("id");

    if (scoresError) {
      throw new Error(
        `cleanupTestData: failed to delete from scores: ${scoresError.message}`
      );
    }
    counts.scores = (deletedScores ?? []).length;
  }

  // Step 4: Delete team_members (child of contacts + teams)
  if (contactIds.length > 0) {
    const { data: deletedMembers, error: membersError } = await serviceRoleClient
      .from("team_members")
      .delete()
      .in("contact_id", contactIds)
      .select("id");

    if (membersError) {
      throw new Error(
        `cleanupTestData: failed to delete from team_members: ${membersError.message}`
      );
    }
    counts.team_members = (deletedMembers ?? []).length;
  }

  // Step 5: Delete teams (parent of scores/team_members, child of contacts)
  if (contactIds.length > 0) {
    const { data: deletedTeams, error: teamsError } = await serviceRoleClient
      .from("teams")
      .delete()
      .in("captain_contact_id", contactIds)
      .select("id");

    if (teamsError) {
      throw new Error(
        `cleanupTestData: failed to delete from teams: ${teamsError.message}`
      );
    }
    counts.teams = (deletedTeams ?? []).length;
  }

  // Step 6: Delete contacts — includes soft-deleted rows (no deleted_at filter)
  if (contactIds.length > 0) {
    const { data: deletedContacts, error: contactsError } = await serviceRoleClient
      .from("contacts")
      .delete()
      .in("id", contactIds)
      .select("id");

    if (contactsError) {
      throw new Error(
        `cleanupTestData: failed to delete from contacts: ${contactsError.message}`
      );
    }
    counts.contacts = (deletedContacts ?? []).length;
  }

  return { deleted: counts };
}
