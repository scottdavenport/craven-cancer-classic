import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getProfile } from "@/lib/supabase/admin";

// Service-role client — bypasses RLS for admin invite operations
function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  // Step 1: Require admin auth
  const profile = await getProfile();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Step 2: Parse and validate body
  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, role } = body;

  if (
    !email ||
    typeof email !== "string" ||
    !role ||
    (role !== "admin" && role !== "viewer")
  ) {
    return NextResponse.json(
      { error: "Invalid body: email and role ('admin'|'viewer') required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Step 3: Insert invitation row — DB unique index on email+unaccepted enforces dedup.
  // A 23505 (unique constraint violation) means an active invite already exists.
  const { data: invitation, error: insertError } = await supabase
    .from("invitations")
    .insert({
      email,
      role,
      invited_by: profile.id,
    });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "Invite already pending for this email" },
        { status: 409 }
      );
    }
    console.error("invitations.insert failed:", insertError);
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
  }

  // Step 4: Trigger Supabase built-in invite email
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        role,
        invitation_id: (invitation as unknown as { id: string } | null)?.id ?? null,
      },
    }
  );

  if (inviteError) {
    console.error("auth.admin.inviteUserByEmail failed:", inviteError);
    return NextResponse.json({ error: "Failed to send invite email" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Invite sent" });
}
