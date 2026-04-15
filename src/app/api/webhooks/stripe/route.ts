import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe, Stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Use service role client for webhook (bypasses RLS)
function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (!metadata) {
      return NextResponse.json({ received: true });
    }

    const supabase = createServiceClient();

    if (metadata.type === "registration" && metadata.team_id) {
      // Update team payment status
      await supabase
        .from("teams")
        .update({
          payment_status: "paid" as const,
          stripe_payment_id: session.id,
          amount_paid: (session.amount_total ?? 0) / 100,
        })
        .eq("id", metadata.team_id);

      // Auto-create contact from captain
      const { data: team } = await supabase
        .from("teams")
        .select("captain_name, captain_email, captain_phone")
        .eq("id", metadata.team_id)
        .single();

      if (team) {
        await supabase.from("contacts").upsert(
          {
            full_name: team.captain_name,
            email: team.captain_email,
            phone: team.captain_phone,
            type: "player" as const,
          },
          { onConflict: "email" }
        );
      }
    }

    if (metadata.type === "sponsorship" && metadata.purchase_id) {
      // Update sponsorship purchase payment status
      await supabase
        .from("sponsorship_purchases")
        .update({
          payment_status: "paid" as const,
          stripe_payment_id: session.id,
          amount_paid: (session.amount_total ?? 0) / 100,
        })
        .eq("id", metadata.purchase_id);
    }
  }

  return NextResponse.json({ received: true });
}
