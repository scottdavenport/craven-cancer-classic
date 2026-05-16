/**
 * e2e-scrub.ts — delete ALL e2e test rows from the production DB.
 *
 * BEHAVIOR
 *   Interactive mode:  npm run e2e:scrub
 *     Prints a pre-scrub summary (table → count), then prompts before deleting.
 *
 *   CI mode:  npm run e2e:scrub:ci  (passes --yes flag)
 *     Prints the pre-scrub summary and deletes without any stdin prompt.
 *     Also auto-confirms when the CI environment variable is set to "true".
 *
 * SCOPE
 *   Matches ALL rows carrying the e2e marker pattern: contacts.email ILIKE 'e2e-%@example.com'
 *   Cascades through dependent tables in FK-safe order (child → parent):
 *     1. scores       (FK → teams.id)
 *     2. team_members (FK → contacts.id)
 *     3. teams        (FK → contacts.id as captain_contact_id)
 *     4. contacts     (marker anchor)
 *
 *   IMPORTANT: hard-delete ignores deleted_at — soft-deleted rows are included.
 *   (27% of known polluted contacts are soft-deleted per the Issue #431 audit.)
 *
 * IMPLEMENTATION NOTE
 *   Count queries use PostgREST join filters (no client-side ID collection) to
 *   avoid the 1000-row default page limit on SELECT queries.
 *   Delete queries paginate contact/team IDs in 500-row chunks for the same reason.
 *
 * REQUIRED ENV
 *   NEXT_PUBLIC_SUPABASE_URL       — loaded from .env.local or process.env
 *   SUPABASE_SERVICE_ROLE_KEY      — service-role key; bypasses RLS
 *
 * USAGE
 *   npx tsx scripts/e2e-scrub.ts          # interactive
 *   npx tsx scripts/e2e-scrub.ts --yes    # CI / non-interactive
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import readline from "readline";

// ---------------------------------------------------------------------------
// Env loading — mirrors seed-photos.ts pattern
// ---------------------------------------------------------------------------
function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return; // CI provides env directly; no .env.local needed
  const raw = fs.readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile();

// ---------------------------------------------------------------------------
// Env validation — exit 1 with a clear message if keys are missing
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error(
    "ERROR: NEXT_PUBLIC_SUPABASE_URL is not set.\n" +
      "  Set it in .env.local (local) or as an environment variable (CI)."
  );
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error(
    "ERROR: SUPABASE_SERVICE_ROLE_KEY is not set.\n" +
      "  This script requires the service-role key to bypass RLS.\n" +
      "  Set it in .env.local (local) or as an environment variable (CI).\n" +
      "  Never use the anon key here — it will silently fail to delete rows."
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Supabase service-role client
// ---------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Marker pattern
// ---------------------------------------------------------------------------
const CONTACT_EMAIL_PATTERN = "e2e-%@example.com";

// ---------------------------------------------------------------------------
// Step 1: Count rows using PostgREST join filters (avoids 1000-row page limit)
// ---------------------------------------------------------------------------
interface TableCounts {
  contacts: number;
  teams: number;
  team_members: number;
  scores: number;
}

async function countE2eRows(): Promise<TableCounts> {
  // contacts — direct email match
  const { count: contactCount, error: contactErr } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .ilike("email", CONTACT_EMAIL_PATTERN);

  if (contactErr) {
    throw new Error(`Failed to count contacts: ${contactErr.message}`);
  }

  const contacts = contactCount ?? 0;
  if (contacts === 0) {
    return { contacts: 0, teams: 0, team_members: 0, scores: 0 };
  }

  // teams — captain email join
  const { count: teamCount, error: teamErr } = await supabase
    .from("teams")
    .select("id, contacts!captain_contact_id!inner(email)", {
      count: "exact",
      head: true,
    })
    .ilike("contacts.email", CONTACT_EMAIL_PATTERN);

  if (teamErr) {
    throw new Error(`Failed to count teams: ${teamErr.message}`);
  }

  // team_members — contact email join
  const { count: memberCount, error: memberErr } = await supabase
    .from("team_members")
    .select("id, contacts!contact_id!inner(email)", {
      count: "exact",
      head: true,
    })
    .ilike("contacts.email", CONTACT_EMAIL_PATTERN);

  if (memberErr) {
    throw new Error(`Failed to count team_members: ${memberErr.message}`);
  }

  // scores — team → captain contact join
  const { count: scoreCount, error: scoreErr } = await supabase
    .from("scores")
    .select(
      "id, teams!team_id!inner(contacts!captain_contact_id!inner(email))",
      { count: "exact", head: true }
    )
    .ilike("teams.contacts.email", CONTACT_EMAIL_PATTERN);

  if (scoreErr) {
    throw new Error(`Failed to count scores: ${scoreErr.message}`);
  }

  return {
    contacts,
    teams: teamCount ?? 0,
    team_members: memberCount ?? 0,
    scores: scoreCount ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Step 2: Print summary
// ---------------------------------------------------------------------------
function printSummary(counts: TableCounts, label: string): number {
  const total =
    counts.contacts + counts.teams + counts.team_members + counts.scores;
  console.log(`\n${label}`);
  console.log(`  contacts     → ${counts.contacts}`);
  console.log(`  teams        → ${counts.teams} (via captain_contact_id)`);
  console.log(`  team_members → ${counts.team_members} (via contact_id)`);
  console.log(`  scores       → ${counts.scores} (via team_id)`);
  console.log(`  ─────────────────────────────`);
  console.log(`  total        → ${total}`);
  return total;
}

// ---------------------------------------------------------------------------
// Step 3: Interactive confirmation prompt
// ---------------------------------------------------------------------------
async function confirmDelete(totalRows: number): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`\nDelete ${totalRows} rows? (yes/no) `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "yes");
    });
  });
}

// ---------------------------------------------------------------------------
// Paginated ID fetch — returns all matching IDs regardless of table size
// ---------------------------------------------------------------------------
async function fetchAllContactIds(): Promise<string[]> {
  const ids: string[] = [];
  let from = 0;
  const PAGE = 500;
  while (true) {
    const { data, error } = await supabase
      .from("contacts")
      .select("id")
      .ilike("email", CONTACT_EMAIL_PATTERN)
      .range(from, from + PAGE - 1);

    if (error) {
      throw new Error(`Failed to fetch contact IDs (page ${from}): ${error.message}`);
    }

    ids.push(...(data ?? []).map((r) => r.id));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return ids;
}

async function fetchAllTeamIds(contactIds: string[]): Promise<string[]> {
  const ids: string[] = [];
  const CHUNK = 500;
  for (let i = 0; i < contactIds.length; i += CHUNK) {
    const chunk = contactIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("teams")
      .select("id")
      .in("captain_contact_id", chunk);

    if (error) {
      throw new Error(`Failed to fetch team IDs (chunk ${i}): ${error.message}`);
    }
    ids.push(...(data ?? []).map((r) => r.id));
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Step 4: Execute deletes in FK-safe order (child → parent)
// ---------------------------------------------------------------------------
async function deleteE2eRows(): Promise<void> {
  const contactIds = await fetchAllContactIds();
  if (contactIds.length === 0) {
    console.log("\nNo e2e rows found — nothing to delete.");
    return;
  }

  const teamIds = await fetchAllTeamIds(contactIds);

  console.log("\nDeleting rows...");

  // 1. scores (FK → teams.id) — delete in chunks
  const CHUNK = 500;
  for (let i = 0; i < teamIds.length; i += CHUNK) {
    const chunk = teamIds.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("scores")
      .delete()
      .in("team_id", chunk);
    if (error) {
      throw new Error(`Failed to delete scores (chunk ${i}): ${error.message}`);
    }
  }
  console.log("  scores deleted");

  // 2. team_members (FK → contacts.id) — delete in chunks
  for (let i = 0; i < contactIds.length; i += CHUNK) {
    const chunk = contactIds.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("team_members")
      .delete()
      .in("contact_id", chunk);
    if (error) {
      throw new Error(
        `Failed to delete team_members (chunk ${i}): ${error.message}`
      );
    }
  }
  console.log("  team_members deleted");

  // 3. teams (FK → contacts.id as captain_contact_id) — delete in chunks
  for (let i = 0; i < contactIds.length; i += CHUNK) {
    const chunk = contactIds.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("teams")
      .delete()
      .in("captain_contact_id", chunk);
    if (error) {
      throw new Error(`Failed to delete teams (chunk ${i}): ${error.message}`);
    }
  }
  console.log("  teams deleted");

  // 4. contacts (marker anchor — hard-delete ignores deleted_at)
  // ilike delete operates on the whole table; Supabase handles it server-side
  const { error: contactErr } = await supabase
    .from("contacts")
    .delete()
    .ilike("email", CONTACT_EMAIL_PATTERN);
  if (contactErr) {
    throw new Error(`Failed to delete contacts: ${contactErr.message}`);
  }
  console.log("  contacts deleted");
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
async function main() {
  const isCI =
    process.argv.includes("--yes") || process.env.CI === "true";

  console.log("e2e-scrub: scanning for e2e test rows...");
  console.log(`  marker pattern: contacts.email ILIKE '${CONTACT_EMAIL_PATTERN}'`);
  console.log(`  mode: ${isCI ? "CI (non-interactive)" : "interactive"}`);

  // Pre-scrub count
  const before = await countE2eRows();
  const total = printSummary(before, "Pre-scrub summary:");

  if (total === 0) {
    console.log("\nDB is already clean — nothing to do.");
    process.exit(0);
  }

  // Confirm (skip in CI mode)
  if (!isCI) {
    const confirmed = await confirmDelete(total);
    if (!confirmed) {
      console.log("Aborted — no rows deleted.");
      process.exit(0);
    }
  }

  // Delete
  await deleteE2eRows();

  // Post-scrub count
  const after = await countE2eRows();
  printSummary(after, "Post-scrub summary:");

  const remaining =
    after.contacts + after.teams + after.team_members + after.scores;
  if (remaining > 0) {
    console.error(
      `\nERROR: ${remaining} rows remain after scrub — check logs above.`
    );
    process.exit(1);
  }

  console.log("\nScrub complete — DB is clean.");
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error("e2e-scrub failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
