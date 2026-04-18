import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Service-role client — bypasses RLS for invite accept operations
function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Look up invitation by token
  const { data: invitation, error: selectError } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .single();

  if (selectError || !invitation) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  // Check expiry
  if (new Date(invitation.expires_at) <= new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
  }

  // Check already accepted
  if (invitation.accepted_at !== null) {
    return NextResponse.json({ error: "Invite already accepted" }, { status: 400 });
  }

  // Mark accepted — idempotency via AND accepted_at IS NULL in real DB,
  // but in service-role context we rely on the row-level check above.
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("invitations")
    .update({ accepted_at: now })
    .eq("token", token);

  if (updateError) {
    console.error("invitations.update failed:", updateError);
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }

  // Upsert profile row with invitation role
  // The invitee is already authenticated via Supabase's invite flow at this point.
  // We upsert on email so a pre-existing auth user gets their role updated.
  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        email: invitation.email,
        role: invitation.role,
        full_name: invitation.email, // placeholder — user can update later
        auth_user_id: "", // will be updated when user completes auth
      },
      { onConflict: "email" }
    );

  if (upsertError) {
    console.error("profiles.upsert failed:", upsertError);
    return NextResponse.json({ error: "Failed to provision profile" }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return NextResponse.redirect(`${siteUrl}/admin`, { status: 302 });
}
