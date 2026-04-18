import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

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

  // contacts.type CHECK: "player" | "sponsor" | "donor" | "other"
  const contactType =
    type === "player" || type === "sponsor" || type === "donor" || type === "other"
      ? type
      : "other";

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
    full_name: full_name.trim(),
    email: email.trim().toLowerCase(),
    type: contactType,
    year_first_seen: currentYear,
    notes: notesParts.length > 0 ? notesParts.join(" | ") : null,
  });

  if (error) {
    console.error("contacts insert error:", error);
    return NextResponse.json(
      { error: "Failed to save your information. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
