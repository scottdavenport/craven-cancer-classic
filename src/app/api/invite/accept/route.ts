import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

// Service-role client — bypasses RLS for privileged DB writes
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

  // Block 3: Verify the caller is authenticated before accepting any invite.
  // SSR client reads cookies to check the active session.
  const ssrClient = await createServerClient();
  const {
    data: { user },
    error: userErr,
  } = await ssrClient.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json(
      { error: "Must be authenticated to accept" },
      { status: 401 }
    );
  }

  const supabase = createServiceClient();

  // Belt-and-suspenders expiry check using a read before the atomic update.
  // The real race guard is the `.is('accepted_at', null)` filter below.
  const { data: invitation, error: selectError } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .single();

  if (selectError || !invitation) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (new Date(invitation.expires_at) <= new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
  }

  // Belt-and-suspenders: reject already-accepted invites before the atomic update.
  // The atomic update's `.is('accepted_at', null)` is the true race guard, but
  // this early return gives a distinct error message and avoids a spurious DB write.
  if (invitation.accepted_at !== null) {
    return NextResponse.json({ error: "Invite already accepted" }, { status: 409 });
  }

  // Block 2: Atomic accept — the `.is('accepted_at', null)` filter means only
  // one concurrent request wins. If the row was already accepted (race or stale),
  // `updated` will be null and we return 400.
  const { data: updated, error: updateError } = await supabase
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("token", token)
    .is("accepted_at", null)
    .select()
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "Invite invalid or already accepted" },
      { status: 400 }
    );
  }

  // Block 3: Upsert profile keyed on auth_user_id (from verified session),
  // role and email sourced from the invitation row — never from the request body.
  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        auth_user_id: user.id,
        email: updated.email,
        full_name:
          (user.user_metadata?.full_name as string | undefined) ??
          updated.email.split("@")[0],
        role: updated.role,
      },
      { onConflict: "auth_user_id" }
    );

  if (upsertError) {
    console.error("profiles.upsert failed:", upsertError);
    return NextResponse.json(
      { error: "Failed to provision profile" },
      { status: 500 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return NextResponse.redirect(`${siteUrl}/admin`, { status: 302 });
}
