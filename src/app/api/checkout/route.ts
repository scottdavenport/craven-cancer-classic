import { NextResponse } from "next/server";
import { getStripe, REGISTRATION_PRICE_CENTS } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

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

async function handleRegistrationCheckout(body: Record<string, unknown>) {
  const {
    team_name,
    captain_name,
    captain_email,
    captain_phone,
    session: sessionTime,
    players,
  } = body as {
    team_name: string;
    captain_name: string;
    captain_email: string;
    captain_phone?: string;
    session: string;
    players?: { full_name: string; email?: string; phone?: string; handicap?: number }[];
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
    .select("*")
    .eq("year", currentYear)
    .single();

  if (!eventSettings?.registration_open) {
    return NextResponse.json(
      { error: "Registration is currently closed" },
      { status: 400 }
    );
  }

  const { count } = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("year", currentYear)
    .eq("session", sessionTime as "morning" | "afternoon");

  const cap =
    sessionTime === "morning"
      ? eventSettings.morning_cap
      : eventSettings.afternoon_cap;

  if (count !== null && count >= cap) {
    return NextResponse.json(
      { error: `The ${sessionTime} session is full` },
      { status: 400 }
    );
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      team_name,
      captain_name,
      captain_email,
      captain_phone: captain_phone || null,
      session: sessionTime as "morning" | "afternoon",
      payment_status: "pending" as const,
      amount_paid: 0,
    })
    .select()
    .single();

  if (teamError || !team) {
    return NextResponse.json(
      { error: teamError?.message || "Failed to create team" },
      { status: 500 }
    );
  }

  if (players && Array.isArray(players)) {
    const playerInserts = players
      .filter((p) => p.full_name)
      .map((p) => ({
        team_id: team.id,
        full_name: p.full_name,
        email: p.email || null,
        phone: p.phone || null,
        handicap: p.handicap || null,
      }));

    if (playerInserts.length > 0) {
      await supabase.from("players").insert(playerInserts);
    }
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
          unit_amount: REGISTRATION_PRICE_CENTS,
        },
        quantity: 1,
      },
    ],
    metadata: {
      team_id: team.id,
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
    .select("id, name, price, active")
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

  // price column is numeric(10,2) dollars — convert to cents
  const unit_amount = Math.round(sponsorshipItem.price * 100);

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
      amount_paid: 0,
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
