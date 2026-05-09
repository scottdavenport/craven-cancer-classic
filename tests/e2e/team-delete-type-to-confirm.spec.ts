/**
 * E2E: Team delete — type-to-confirm gate for paid teams (#393 restoration)
 *
 * Contract (verified against team-modal.tsx after #393 source restore):
 * - NO row-level Delete button. Row actions = Edit + Mark Paid only.
 * - Delete trigger lives INSIDE the edit modal footer: "Delete team" button.
 * - DeleteConfirmDialog gates on requiresTypeConfirm = isPaid && captain_display_name non-empty.
 * - Paid teams: input [data-testid="delete-confirm-input"] visible; "Move to Trash" disabled until
 *   confirmText === team.captain_display_name (strict exact-match).
 * - Pending teams: no input rendered; "Move to Trash" enabled once scoreCount loads.
 *
 * Flow under test (paid-team path):
 *   1. Create paid-team fixture via service-key REST (no PROD team destruction)
 *   2. Navigate to /admin/teams
 *   3. Click "Edit Captain Name's team" on fixture row → edit modal opens
 *   4. Click "Delete team" in modal footer → DeleteConfirmDialog opens
 *   5. Verify type-to-confirm input is visible
 *   6. Verify "Move to Trash" button starts disabled
 *   7. Type wrong text → button stays disabled
 *   8. Clear and type captain_display_name exactly → button enabled
 *   9. Click "Move to Trash" → team gone from active list
 *  10. Navigate to /admin/trash → verify team appears in Teams tab
 *
 * Requires: E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD in env
 * Fixture cleanup: try/finally ensures fixture is removed if test fails mid-run.
 * Captain emails match e2e-*@example.com pattern for Forge orphan cleanup.
 */

import { test as baseTest, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

baseTest.skip(
  !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
  "Skipped: set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E tests"
);

import { test } from "./fixtures/admin-auth";

// ---------------------------------------------------------------------------
// Supabase service-key REST helpers
// ---------------------------------------------------------------------------

function getServiceKey(): string {
  // Prefer env var if available (e.g. injected in CI)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  // Fall back to secrets file
  const secretsPath = path.join(
    process.env.HOME ?? "/Users/openclaw",
    ".openclaw/secrets/supabase-craven-service-key"
  );
  return fs.readFileSync(secretsPath, "utf-8").trim();
}

const SUPABASE_URL = "https://kybfsxjruczbiokucyft.supabase.co";

async function supabasePost(
  endpoint: string,
  body: unknown,
  serviceKey: string
): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
}

async function supabasePatch(
  endpoint: string,
  body: unknown,
  serviceKey: string
): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
}

async function supabaseDelete(
  endpoint: string,
  serviceKey: string
): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method: "DELETE",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
}

async function supabaseRpc(
  fn: string,
  args: Record<string, string>,
  serviceKey: string
): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(args),
  });
}

// ---------------------------------------------------------------------------
// Fixture: create a paid team for the test, clean up after
// ---------------------------------------------------------------------------

interface FixtureTeam {
  teamId: string;
  contactId: string;
  captainDisplayName: string;
  captainEmail: string;
}

async function createPaidTeamFixture(serviceKey: string): Promise<FixtureTeam> {
  const timestamp = Date.now();
  const captainEmail = `e2e-delete-captain-${timestamp}@example.com`;
  const captainName = `E2E Delete ${timestamp}`;

  // 1. Create a contact for the captain
  const contactRes = await supabasePost(
    "contacts",
    { full_name: captainName, email: captainEmail },
    serviceKey
  );
  if (!contactRes.ok) {
    const text = await contactRes.text();
    throw new Error(`Failed to create fixture contact: ${contactRes.status} ${text}`);
  }
  const contactData = await contactRes.json();
  const contactId: string = Array.isArray(contactData) ? contactData[0].id : contactData.id;

  // 2. Create a team via register_team RPC (uses vestigial captain params)
  const rpcRes = await supabaseRpc(
    "register_team",
    {
      p_session: "morning",
      p_captain_name: captainName,
      p_captain_email: captainEmail,
      p_captain_phone: "",
    },
    serviceKey
  );
  if (!rpcRes.ok) {
    const text = await rpcRes.text();
    // Clean up the contact before throwing
    await supabaseDelete(`contacts?id=eq.${contactId}`, serviceKey);
    throw new Error(`Failed to create fixture team via register_team RPC: ${rpcRes.status} ${text}`);
  }
  const rpcData = await rpcRes.json();
  const teamId: string = rpcData.team_id ?? rpcData[0]?.team_id;
  if (!teamId) {
    await supabaseDelete(`contacts?id=eq.${contactId}`, serviceKey);
    throw new Error(`register_team RPC returned no team_id: ${JSON.stringify(rpcData)}`);
  }

  // 3. Set captain_contact_id and mark as paid
  const patchRes = await supabasePatch(
    `teams?id=eq.${teamId}`,
    {
      captain_contact_id: contactId,
      payment_status: "paid",
      amount_paid_cents: 70000,
    },
    serviceKey
  );
  if (!patchRes.ok) {
    const text = await patchRes.text();
    // Clean up
    await supabaseDelete(`teams?id=eq.${teamId}`, serviceKey);
    await supabaseDelete(`contacts?id=eq.${contactId}`, serviceKey);
    throw new Error(`Failed to patch fixture team: ${patchRes.status} ${text}`);
  }

  // 4. Also insert a team_members row so captain_display_name is populated via JOIN
  const memberRes = await supabasePost(
    "team_members",
    {
      team_id: teamId,
      contact_id: contactId,
      role: "captain",
      slot: 1,
    },
    serviceKey
  );
  if (!memberRes.ok) {
    const text = await memberRes.text();
    // Non-fatal — caption_display_name may fall back to FK lookup
    console.warn(`[fixture] team_members insert failed (non-fatal): ${memberRes.status} ${text}`);
  }

  return {
    teamId,
    contactId,
    captainDisplayName: captainName,
    captainEmail,
  };
}

async function cleanupFixture(
  fixture: FixtureTeam,
  serviceKey: string
): Promise<void> {
  // Order: team_members → teams (soft-deleted or hard-delete) → contacts
  // The team may already be soft-deleted by the test; delete from teams table directly
  await supabaseDelete(`team_members?team_id=eq.${fixture.teamId}`, serviceKey);
  // Hard-delete the team record (bypass soft-delete filter by querying teams directly)
  await supabaseDelete(`teams?id=eq.${fixture.teamId}`, serviceKey);
  await supabaseDelete(`contacts?id=eq.${fixture.contactId}`, serviceKey);
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

test.describe("Team delete — type-to-confirm gate (#393)", () => {
  test(
    "paid-team fixture: type-to-confirm input gates Move to Trash until captain_display_name typed exactly",
    async ({ adminPage: page }) => {
      const serviceKey = getServiceKey();
      let fixture: FixtureTeam | null = null;

      try {
        // ---- Fixture setup ----
        fixture = await createPaidTeamFixture(serviceKey);
        const captainDisplayName = fixture.captainDisplayName;

        // ---- Navigate to teams list ----
        await page.goto("/admin/teams");
        await expect(
          page.getByRole("heading", { name: /teams/i })
        ).toBeVisible({ timeout: 10_000 });

        // Reload to pick up the newly created team (RSC may cache the prior render)
        await page.reload();
        await expect(
          page.getByRole("heading", { name: /teams/i })
        ).toBeVisible({ timeout: 10_000 });

        // ---- Find the fixture team row by captain display name ----
        const fixtureRow = page
          .getByRole("row")
          .filter({ hasText: captainDisplayName });

        await expect(fixtureRow).toBeVisible({ timeout: 10_000 });

        // ---- Click Edit on the fixture row ----
        // Row actions are hover-reveal (opacity-0 + pointer-events-none until hover per design D6).
        // Hover the row first to expose the action buttons, then click Edit.
        // Aria Phase 3 §B2b: edit button label is "Edit [Captain Name]'s team"
        await fixtureRow.hover();
        await fixtureRow
          .getByRole("button", { name: `Edit ${captainDisplayName}'s team`, exact: true })
          .click();

        // ---- Edit modal should open ----
        const editModal = page.getByRole("dialog");
        await expect(editModal).toBeVisible({ timeout: 5_000 });

        // ---- Click "Delete team" in the modal footer ----
        await editModal
          .getByRole("button", { name: "Delete team", exact: true })
          .click();

        // ---- DeleteConfirmDialog should open ----
        // Anchor on the dialog title per Aria Phase 3 §B7:
        //   "Delete [Captain Full Name]'s team?"
        // Use a fragment of the possessive title to avoid exact-match brittleness.
        const deleteDialog = page.getByRole("dialog").filter({
          has: page.getByText("'s team?", { exact: false }),
        });
        await expect(deleteDialog).toBeVisible({ timeout: 5_000 });

        // ---- Type-to-confirm input must be visible (paid team = requiresTypeConfirm) ----
        const confirmInput = deleteDialog.getByTestId("delete-confirm-input");
        await expect(confirmInput).toBeVisible({ timeout: 3_000 });

        // ---- "Move to Trash" button starts DISABLED ----
        // Two reasons it could be disabled at this point:
        //   1. scoreCount === null (async load not yet resolved)
        //   2. confirmText doesn't match captain_display_name yet
        // Either way, the user-facing assertion is "starts disabled".
        const moveToTrashBtn = deleteDialog.getByRole("button", {
          name: "Move to Trash",
          exact: true,
        });
        await expect(moveToTrashBtn).toBeDisabled({ timeout: 3_000 });

        // ---- Wait for score count to load — button still disabled (now only by type-gate) ----
        // Confirm the type-gate, not the score-load, is the active disabler from here on.
        // Type a clearly-wrong string and assert button stays disabled even after score load settles.
        await confirmInput.click();
        await confirmInput.fill("wrong-name-that-wont-match");
        await confirmInput.dispatchEvent("input");

        // Give scoreCount up to 15s to resolve. Button must remain disabled because the gate fails.
        await expect(moveToTrashBtn).toBeDisabled({ timeout: 15_000 });

        // ---- Clear and type the EXACT captain_display_name — gate unlocks ----
        // Use triple-click to select all, then pressSequentially so React onChange fires reliably.
        await confirmInput.click({ clickCount: 3 });
        await confirmInput.pressSequentially(captainDisplayName, { delay: 20 });
        await expect(moveToTrashBtn).toBeEnabled({ timeout: 5_000 });

        // ---- Click "Move to Trash" — team should be removed from active list ----
        await moveToTrashBtn.click();

        // The delete dialog should close
        await expect(deleteDialog).not.toBeVisible({ timeout: 5_000 });

        // The team row should be gone from the active list
        await expect(
          page.getByRole("row").filter({ hasText: captainDisplayName })
        ).not.toBeVisible({ timeout: 8_000 });

        // ---- Navigate to Trash and verify team appears in Teams tab ----
        await page.goto("/admin/trash");
        const teamsTab = page.getByRole("tab", { name: /teams/i });
        if (await teamsTab.isVisible({ timeout: 3_000 })) {
          await teamsTab.click();
        }
        await expect(
          page.getByText(captainDisplayName)
        ).toBeVisible({ timeout: 8_000 });

        // Test succeeded — fixture was soft-deleted by the app.
        // cleanupFixture in finally will remove the hard record + contact.
      } finally {
        if (fixture) {
          await cleanupFixture(fixture, serviceKey);
        }
      }
    }
  );
});
