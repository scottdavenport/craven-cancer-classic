-- Stripe delivers events at least once; dedupe table short-circuits duplicates.
create table public.stripe_events (
  id text primary key,
  received_at timestamptz not null default now()
);

-- Defense-in-depth: DB-level uniqueness on payment IDs.
-- Partial indexes handle the nullable-until-paid state.
create unique index if not exists teams_stripe_payment_id_unique
  on public.teams (stripe_payment_id)
  where stripe_payment_id is not null;

create unique index if not exists sponsorship_purchases_stripe_payment_id_unique
  on public.sponsorship_purchases (stripe_payment_id)
  where stripe_payment_id is not null;
