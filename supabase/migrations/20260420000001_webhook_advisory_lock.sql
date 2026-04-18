-- S4-2: Advisory lock helpers for Stripe webhook idempotency.
--
-- pg_advisory_xact_lock is transaction-scoped and would release immediately
-- when the RPC call returns over PostgREST (each rpc() runs its own transaction).
-- Session-scoped pg_advisory_lock / pg_advisory_unlock hold for the duration of
-- the connection-pool session, which safely spans the insert → downstream-writes
-- sequence in the webhook handler.
--
-- The route calls acquire_stripe_event_lock BEFORE stripe_events.insert and
-- release_stripe_event_lock in a finally block after all downstream work.

create or replace function public.acquire_stripe_event_lock(event_id text)
returns void language plpgsql as $$
begin
  perform pg_advisory_lock(hashtext('stripe_event:' || event_id));
end;
$$;

create or replace function public.release_stripe_event_lock(event_id text)
returns void language plpgsql as $$
begin
  perform pg_advisory_unlock(hashtext('stripe_event:' || event_id));
end;
$$;
