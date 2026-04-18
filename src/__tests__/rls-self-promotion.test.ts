/**
 * RLS self-promotion regression test — Issue 1 (Sprint 1)
 *
 * SETUP: Requires a running local Supabase stack.
 *   npx supabase start
 *
 * Local Supabase defaults (supabase/config.toml):
 *   API URL:  http://127.0.0.1:54321
 *   anon key: see `npx supabase status` output
 *
 * This test is an INTEGRATION test against the local DB. It is intentionally
 * failing before the migration in `supabase/migrations/20260416000001_fix_rls_self_promotion.sql`
 * is applied. After Flux's migration lands, the test should pass.
 *
 * Run:  npx supabase start && npm run test:run -- rls-self-promotion
 */

import { describe, it, expect, afterAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Local Supabase stack — these are the standard local dev defaults.
// Override via env vars if your local stack uses non-default ports.
const SUPABASE_URL = process.env.SUPABASE_LOCAL_URL ?? "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_LOCAL_ANON_KEY ??
  // Default anon key for `supabase start` — safe to commit, local only
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRFA0NiK7kyqh5Or7n3Bj78N9LMWBZjmKyQeQVxHQeY";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY ??
  // Default service_role key for `supabase start` — safe to commit, local only
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0";

// Track created user for cleanup
let createdUserId: string | undefined;

afterAll(async () => {
  if (!createdUserId) return;
  // Use service role client to delete the test user — bypasses RLS
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  await adminClient.auth.admin.deleteUser(createdUserId);
});

describe("RLS self-promotion vulnerability (Issue 1)", () => {
  describe("profiles UPDATE policy", () => {
    it(
      "should NOT allow an authenticated user to elevate their own role to admin",
      async () => {
        // Unique email so repeated runs don't collide
        const testEmail = `rls-test-${Date.now()}@example-local.invalid`;
        const testPassword = "testpassword123!";

        // 1. Sign up a fresh user
        const userClient: SupabaseClient = createClient(
          SUPABASE_URL,
          SUPABASE_ANON_KEY,
          { auth: { persistSession: false } }
        );

        const { data: signUpData, error: signUpError } =
          await userClient.auth.signUp({
            email: testEmail,
            password: testPassword,
          });

        expect(signUpError).toBeNull();
        expect(signUpData.user).not.toBeNull();

        createdUserId = signUpData.user!.id;
        const uid = createdUserId;

        // 2. Confirm the auto-created profile exists with role = 'user'
        const { data: initialProfile, error: selectError } = await userClient
          .from("profiles")
          .select("role")
          .eq("auth_user_id", uid)
          .single();

        expect(selectError).toBeNull();
        expect(initialProfile).not.toBeNull();
        expect(initialProfile!.role).toBe("user");

        // 3. As the authenticated user, attempt to self-promote to admin
        const { error: updateError } = await userClient
          .from("profiles")
          .update({ role: "admin" })
          .eq("auth_user_id", uid);

        // The UPDATE may or may not return an error depending on the fix shape.
        // Both are acceptable — what matters is the final role value.
        // Log for diagnostic purposes:
        if (updateError) {
          // This is the desired post-fix behavior — RLS rejected the write
          // Test passes via the role assertion below either way
        }

        // 4. Re-read the profile — role MUST still be 'user'
        const { data: afterProfile, error: afterSelectError } = await userClient
          .from("profiles")
          .select("role")
          .eq("auth_user_id", uid)
          .single();

        expect(afterSelectError).toBeNull();
        expect(afterProfile).not.toBeNull();

        // THIS IS THE ASSERTION THAT FAILS TODAY.
        // Without WITH CHECK on the UPDATE policy, the role will read 'admin'.
        // After Flux's migration adds WITH CHECK, this will read 'user'.
        //
        // Expected failure message when vulnerability is present:
        //   AssertionError: expected 'admin' to be 'user'
        //   (role column was written — self-promotion succeeded)
        expect(
          afterProfile!.role,
          `Expected role to remain 'user' after self-promotion attempt — profiles UPDATE policy is missing WITH CHECK`
        ).toBe("user");
      },
      30_000 // 30s timeout — local Supabase auth can be slow
    );
  });
});
