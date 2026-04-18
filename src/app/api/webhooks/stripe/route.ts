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

    // S3-7 idempotency: insert event row without processed_at.
    // Three cases on duplicate key (23505):
    //   a) processed_at IS NOT NULL → fully processed, short-circuit 200.
    //   b) processed_at IS NULL     → prior attempt failed midway, re-run downstream.
    // Any other insert error → 500 so Stripe retries.
    const { error: eventInsertError } = await supabase
      .from("stripe_events")
      .insert({ id: event.id });

    if (eventInsertError) {
      if (eventInsertError.code === "23505") {
        // Duplicate delivery — check whether prior attempt fully succeeded.
        const { data: existingRow, error: selectError } = await supabase
          .from("stripe_events")
          .select("processed_at")
          .eq("id", event.id)
          .single();

        if (selectError || !existingRow) {
          // Unexpected: row must exist after 23505. Acknowledge safely.
          console.error("stripe_events.select failed after 23505 for event", event.id, selectError);
          return NextResponse.json({ received: true });
        }

        if (existingRow.processed_at !== null) {
          // Fully processed duplicate — short-circuit.
          return NextResponse.json({ received: true });
        }

        // processed_at IS NULL — prior attempt failed downstream. Fall through to re-run.
      } else {
        console.error("stripe_events.insert failed for event", event.id, eventInsertError);
        return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
      }
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

    // S3-7: All downstream writes succeeded — stamp processed_at so retries short-circuit.
    const { error: stampError } = await supabase
      .from("stripe_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", event.id);

    if (stampError) {
      // Non-fatal: downstream work is done. Log and acknowledge.
      // Next Stripe retry will re-run downstream (idempotent) and attempt stamp again.
      console.error("stripe_events processed_at stamp failed for event", event.id, stampError);
    }
  }

  return NextResponse.json({ received: true });
}
