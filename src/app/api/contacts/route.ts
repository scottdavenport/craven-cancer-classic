import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const ALLOWED_TYPES = ["player", "sponsor", "donor", "volunteer", "other"] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

const MAX_FULL_NAME = 200;
const MAX_EMAIL = 254;
const MAX_NOTES = 2000;
const MAX_COMPANY_NAME = 200;

// Use service role client to bypass RLS — public prospects cannot self-insert
function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { full_name, email, company_name, type, notes } = body as {
    full_name: unknown;
    email: unknown;
    company_name?: unknown;
    type?: unknown;
    notes?: unknown;
  };

  if (
    typeof full_name !== "string" ||
    !full_name.trim() ||
    typeof email !== "string" ||
    !email.trim()
  ) {
    return NextResponse.json(
      { error: "full_name and email are required" },
      { status: 400 }
    );
  }

  const trimmedFullName = full_name.trim();
  const trimmedEmail = email.trim();

  if (trimmedFullName.length > MAX_FULL_NAME) {
    return NextResponse.json(
      { error: `full_name must be ${MAX_FULL_NAME} characters or fewer` },
      { status: 400 }
    );
  }
  if (trimmedEmail.length > MAX_EMAIL) {
    return NextResponse.json(
      { error: `email must be ${MAX_EMAIL} characters or fewer` },
      { status: 400 }
    );
  }
  if (typeof notes === "string" && notes.trim().length > MAX_NOTES) {
    return NextResponse.json(
      { error: `notes must be ${MAX_NOTES} characters or fewer` },
      { status: 400 }
    );
  }
  if (typeof company_name === "string" && company_name.trim().length > MAX_COMPANY_NAME) {
    return NextResponse.json(
      { error: `company_name must be ${MAX_COMPANY_NAME} characters or fewer` },
      { status: 400 }
    );
  }

  // Validate type strictly: undefined/empty defaults to "other";
  // any other non-whitelisted value is rejected (no silent coercion).
  let contactType: AllowedType;
  if (type === undefined || type === "") {
    contactType = "other";
  } else if ((ALLOWED_TYPES as readonly unknown[]).includes(type)) {
    contactType = type as AllowedType;
  } else {
    return NextResponse.json(
      {
        error: `type must be one of: ${ALLOWED_TYPES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const notesParts: string[] = [];
  if (typeof notes === "string" && notes.trim()) {
    notesParts.push(notes.trim());
  }
  if (typeof company_name === "string" && company_name.trim()) {
    notesParts.push(`Company: ${company_name.trim()}`);
  }

  const supabase = createServiceClient();
  const currentYear = new Date().getFullYear();

  const { error } = await supabase.from("contacts").insert({
    full_name: trimmedFullName,
    email: trimmedEmail.toLowerCase(),
    types: [contactType],
    year_first_seen: currentYear,
    notes: notesParts.length > 0 ? notesParts.join(" | ") : null,
  });

  if (error) {
    // PG 23505 = unique_violation. The contacts table has a partial unique index
    // on email (where email is not null), so duplicate email collides here.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "This email is already on file." },
        { status: 409 }
      );
    }
    console.error("contacts insert error:", error);
    return NextResponse.json(
      { error: "Failed to save your information. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
