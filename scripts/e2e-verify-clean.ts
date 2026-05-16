/**
 * e2e-verify-clean.ts — assert that no e2e test rows remain in the DB.
 *
 * BEHAVIOR
 *   Queries all tracked tables for rows matching the e2e marker pattern.
 *   Exits 0 if the DB is clean.
 *   Exits 1 with a per-table breakdown if any rows remain.
 *
 * SCOPE
 *   Same 4 tracked tables as e2e-scrub.ts:
 *     contacts, teams, team_members, scores
 *   Marker anchor: contacts.email ILIKE 'e2e-%@example.com'
 *
 * IMPLEMENTATION NOTE
 *   Count queries use PostgREST join filters (no client-side ID collection) to
 *   avoid the 1000-row default page limit on SELECT queries.
 *
 * REQUIRED ENV
 *   NEXT_PUBLIC_SUPABASE_URL       — loaded from .env.local or process.env
 *   SUPABASE_SERVICE_ROLE_KEY      — service-role key; bypasses RLS
 *
 * USAGE
 *   npm run e2e:verify-clean
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Env loading — mirrors seed-photos.ts / e2e-scrub.ts pattern
// ---------------------------------------------------------------------------
function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
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
// Env validation
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
      "  Never use the anon key here — soft-deleted rows are excluded by RLS."
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
// Count rows using PostgREST join filters (avoids 1000-row page limit)
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
// Entry point
// ---------------------------------------------------------------------------
async function main() {
  console.log("e2e-verify-clean: checking for e2e test rows...");

  const counts = await countE2eRows();
  const total =
    counts.contacts + counts.teams + counts.team_members + counts.scores;

  if (total === 0) {
    console.log("DB is clean — no e2e rows found.");
    process.exit(0);
  }

  // Rows remain — print breakdown and exit non-zero
  console.error("FAIL: e2e rows remain in the database.");
  console.error("");
  console.error("Per-table breakdown:");
  console.error(`  contacts     → ${counts.contacts}`);
  console.error(`  teams        → ${counts.teams} (via captain_contact_id)`);
  console.error(`  team_members → ${counts.team_members} (via contact_id)`);
  console.error(`  scores       → ${counts.scores} (via team_id)`);
  console.error(`  ─────────────────────────────`);
  console.error(`  total        → ${total}`);
  console.error("");
  console.error("Run 'npm run e2e:scrub' to clean up.");
  process.exit(1);
}

main().catch((err: unknown) => {
  console.error(
    "e2e-verify-clean failed:",
    err instanceof Error ? err.message : err
  );
  process.exit(1);
});
