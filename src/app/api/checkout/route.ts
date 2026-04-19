import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Route to the correct handler based on type
    if (body.type === "sponsorship") {
      return handleSponsorshipCheckout(body);
    }
    return handleRegistrationCheckout(body);
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Split a full name on the last space — best-effort, no hard requirement. */
function splitName(fullName: string): { first_name: string; last_name: string | null } {
  const trimmed = fullName.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace === -1) {
    return { first_name: trimmed, last_name: null };
  }
  return {
    first_name: trimmed.slice(0, lastSpace),
    last_name: trimmed.slice(lastSpace + 1),
  };
}

/**
 * Find or create a contact row.
 *
 * If `email` is provided: upsert on the partial unique index
 * (contacts_email_unique_when_present) so we don't create duplicates.
 * If no email: always insert a new row (no deduplication possible).
 *
 * Returns the contact id, or throws on DB error.
 */
async function findOrCreateContact(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  params: {
    full_name: string;
    email?: string | null;
    phone?: string | null;
  }
): Promise<string> {
  const { first_name, last_name } = splitName(params.full_name);

  const contactPayload = {
    full_name: params.full_name,
    first_name,
    last_name,
    email: params.email || null,
    phone: params.phone || null,
    type: "player",
    source: "web_registration_2026",
  };

  if (params.email) {
    // Upsert: if email already exists (partial unique index), update metadata
    // but don't overwrite name (use ignoreDuplicates: false to merge).
    const { data, error } = await supabase
      .from("contacts")
      .upsert(contactPayload, {
        onConflict: "email",
        ignoreDuplicates: false,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Failed to upsert contact: ${error?.message}`);
    }
    return data.id;
  }

  // No email — always insert a new row
  const { data, error } = await supabase
    .from("contacts")
    .insert(contactPayload)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert contact: ${error?.message}`);
  }
  return data.id;
}

// ---------------------------------------------------------------------------
// Registration handler
// ---------------------------------------------------------------------------

interface TeammateInput {
  full_name: string;
  email?: string;
  phone?: string;
  tbd: boolean;
}

async function handleRegistrationCheckout(body: Record<string, unknown>) {
  const {
    team_name,
    captain_name,
    captain_email,
    captain_phone,
    session: sessionTime,
    teammates,
  } = body as {
    team_name: string;
    captain_name: string;
    captain_email: string;
    captain_phone?: string;
    session: string;
    teammates?: TeammateInput[];
  };

  if (!team_name || !captain_name || !captain_email || !sessionTime) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const { data: eventSettings } = await supabase
    .from("event_settings")
    .select("registration_open, morning_cap, afternoon_cap, registration_fee_cents")
    .eq("year", currentYear)
    .single();

  if (!eventSettings?.registration_open) {
    return NextResponse.json(
      { error: "Registration is currently closed" },
      { status: 400 }
    );
  }

  // Atomic cap-check + insert via RPC — prevents race condition where two
  // concurrent requests both see count < cap and both insert.
  const { data: rpcData, error: rpcError } = await supabase.rpc("register_team", {
    p_session: sessionTime,
    p_team_name: team_name,
    p_captain_name: captain_name,
    p_captain_email: captain_email,
    p_captain_phone: captain_phone || null,
  });

  if (rpcError) {
    if (rpcError.code === "SESSION_FULL") {
      return NextResponse.json(
        { error: `The ${sessionTime} session is full` },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: rpcError.message || "Failed to register team" },
      { status: 500 }
    );
  }

  const rpcResult = rpcData as unknown as { team_id: string; registration_fee_cents: number };
  const teamId: string = rpcResult.team_id;
  const registrationFeeCents: number =
    rpcResult.registration_fee_cents ??
    eventSettings.registration_fee_cents ??
    70000;

  // ---------------------------------------------------------------------------
  // Build contact rows + team_members after the team is created.
  // Failures here are logged but do NOT abort the Stripe session — the team
  // exists and roster can be fixed in admin (Sprint 9 simplicity trade-off).
  // ---------------------------------------------------------------------------
  try {
    // 1. Captain contact — find or create
    const captainContactId = await findOrCreateContact(supabase, {
      full_name: captain_name,
      email: captain_email,
      phone: captain_phone || null,
    });

    // 2. Insert captain as slot 1
    const { error: captainMemberError } = await supabase.from("team_members").insert({
      team_id: teamId,
      contact_id: captainContactId,
      role: "captain",
      slot: 1,
    });

    if (captainMemberError) {
      console.error("Failed to insert captain team_member:", captainMemberError);
    }

    // 3. Teammates in slots 2-4 (non-TBD only, up to 3)
    const nonTbdTeammates = (teammates ?? [])
      .filter((t) => !t.tbd && t.full_name)
      .slice(0, 3);

    for (let i = 0; i < nonTbdTeammates.length; i++) {
      const teammate = nonTbdTeammates[i];
      const slot = i + 2; // slots 2, 3, 4

      try {
        const contactId = await findOrCreateContact(supabase, {
          full_name: teammate.full_name,
          email: teammate.email || null,
          phone: teammate.phone || null,
        });

        const { error: memberError } = await supabase.from("team_members").insert({
          team_id: teamId,
          contact_id: contactId,
          role: "player",
          slot,
        });

        if (memberError) {
          console.error(`Failed to insert team_member slot ${slot}:`, memberError);
        }
      } catch (err) {
        console.error(`Failed to process teammate slot ${slot}:`, err);
      }
    }

    // 4. Update teams.captain_contact_id
    const { error: updateError } = await supabase
      .from("teams")
      .update({ captain_contact_id: captainContactId })
      .eq("id", teamId);

    if (updateError) {
      console.error("Failed to update captain_contact_id:", updateError);
    }
  } catch (err) {
    // Roster build failed — log and continue to Stripe. Team exists.
    console.error("Failed to build team roster (non-fatal):", err);
  }

  const checkoutSession = await getStripe().checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Craven Cancer Classic - Team Registration",
            description: `Team: ${team_name} | ${sessionTime === "morning" ? "Morning" : "Afternoon"} Session`,
          },
          unit_amount: registrationFeeCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      team_id: teamId,
      type: "registration",
    },
    customer_email: captain_email,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/register/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/register?canceled=true`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}

async function handleSponsorshipCheckout(body: Record<string, unknown>) {
  const {
    item_id,
    purchaser_name,
    purchaser_email,
    purchaser_phone,
    company_name,
  } = body as {
    item_id: string;
    purchaser_name: string;
    purchaser_email: string;
    purchaser_phone?: string;
    company_name?: string;
  };

  if (!item_id || !purchaser_name || !purchaser_email) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Fetch the sponsorship item server-side — never trust client-supplied price
  const { data: sponsorshipItem, error: itemError } = await supabase
    .from("sponsorship_items")
    .select("id, name, price_cents, active")
    .eq("id", item_id)
    .single();

  if (itemError || !sponsorshipItem) {
    return NextResponse.json(
      { error: "Sponsorship item not found" },
      { status: 400 }
    );
  }

  if (!sponsorshipItem.active) {
    return NextResponse.json(
      { error: "Sponsorship item is no longer available" },
      { status: 400 }
    );
  }

  // price_cents is already in cents (bigint) — use directly
  const unit_amount = sponsorshipItem.price_cents;

  // Create purchase record
  const { data: purchase, error: purchaseError } = await supabase
    .from("sponsorship_purchases")
    .insert({
      item_id,
      purchaser_name,
      purchaser_email,
      purchaser_phone: purchaser_phone || null,
      company_name: company_name || null,
      payment_status: "pending" as const,
      amount_paid_cents: 0,
    })
    .select()
    .single();

  if (purchaseError || !purchase) {
    return NextResponse.json(
      { error: purchaseError?.message || "Failed to create purchase" },
      { status: 500 }
    );
  }

  const checkoutSession = await getStripe().checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Craven Cancer Classic - ${sponsorshipItem.name}`,
            description: company_name
              ? `Sponsored by ${company_name}`
              : `Purchased by ${purchaser_name}`,
          },
          unit_amount,
        },
        quantity: 1,
      },
    ],
    metadata: {
      purchase_id: purchase.id,
      item_id,
      type: "sponsorship",
    },
    customer_email: purchaser_email,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/sponsorships?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/sponsorships?canceled=true`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
