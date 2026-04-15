import { NextResponse } from "next/server";
import { getStripe, REGISTRATION_PRICE_CENTS } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      team_name,
      captain_name,
      captain_email,
      captain_phone,
      session: sessionTime,
      players,
    } = body;

    // Validate required fields
    if (!team_name || !captain_name || !captain_email || !sessionTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check slot availability
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
      .eq("session", sessionTime);

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

    // Create team record in pending state
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        team_name,
        captain_name,
        captain_email,
        captain_phone: captain_phone || null,
        session: sessionTime,
        payment_status: "pending",
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

    // Insert players
    if (players && Array.isArray(players)) {
      const playerInserts = players
        .filter((p: { full_name?: string }) => p.full_name)
        .map((p: { full_name: string; email?: string; phone?: string; handicap?: number }) => ({
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

    // Create Stripe checkout session
    const checkoutSession = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Craven Cancer Classic - Team Registration`,
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
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
