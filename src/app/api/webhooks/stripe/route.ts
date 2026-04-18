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

    // Idempotency check: insert event id into stripe_events.
    // Duplicate key (23505) → already processed, short-circuit with 200.
    // Any other insert error → 500 so Stripe retries.
    const { error: eventInsertError } = await supabase
      .from("stripe_events")
      .insert({ id: event.id });

    if (eventInsertError) {
      if (eventInsertError.code === "23505") {
        // Duplicate delivery — already processed, acknowledge without re-processing
        return NextResponse.json({ received: true });
      }
      console.error("stripe_events.insert failed for event", event.id, eventInsertError);
      return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
    }

    if (metadata.type === "registration" && metadata.team_id) {
      // Update team payment status
      const { error: teamUpdateError } = await supabase
        .from("teams")
        .update({
          payment_status: "paid" as const,
          stripe_payment_id: session.id,
          amount_paid: (session.amount_total ?? 0) / 100,
        })
        .eq("id", metadata.team_id);

      if (teamUpdateError) {
        console.error("teams.update failed for event", event.id, teamUpdateError);
        return NextResponse.json({ error: "db_update_failed" }, { status: 500 });
      }

      // Auto-create contact from captain
      const { data: team } = await supabase
        .from("teams")
        .select("captain_name, captain_email, captain_phone")
        .eq("id", metadata.team_id)
        .single();

      if (team) {
        const { error: contactUpsertError } = await supabase.from("contacts").upsert(
          {
            full_name: team.captain_name,
            email: team.captain_email,
            phone: team.captain_phone,
            type: "player" as const,
          },
          { onConflict: "email" }
        );

        if (contactUpsertError) {
          // Non-critical: log and continue — do NOT return 500 or Stripe will retry and double-charge
          console.error("contacts.upsert failed for event", event.id, contactUpsertError);
        }
      }
    }

    if (metadata.type === "sponsorship" && metadata.purchase_id) {
      // Update sponsorship purchase payment status
      const { error: purchaseUpdateError } = await supabase
        .from("sponsorship_purchases")
        .update({
          payment_status: "paid" as const,
          stripe_payment_id: session.id,
          amount_paid: (session.amount_total ?? 0) / 100,
        })
        .eq("id", metadata.purchase_id);

      if (purchaseUpdateError) {
        console.error("sponsorship_purchases.update failed for event", event.id, purchaseUpdateError);
        return NextResponse.json({ error: "db_update_failed" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
