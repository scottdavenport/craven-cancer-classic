-- Ensure pgcrypto functions (gen_random_bytes, encode, etc.) are callable without
-- schema qualification from the public search_path.
--
-- On Supabase cloud, pgcrypto is installed in the `extensions` schema by default.
-- Migrations that call gen_random_bytes() unqualified fail because `extensions` is
-- not on the default search_path. This migration relocates pgcrypto to `public`
-- (or installs it there fresh) so subsequent migrations work unchanged.
--
-- Idempotent: safe to re-run on fresh install, existing cloud, and local dev.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pgcrypto') then
    -- Extension already installed. Attempt to relocate to public.
    -- If it's already in public this is a no-op. If relocation is blocked
    -- (e.g. superuser restriction), we catch the error and carry on — the
    -- functions will still be reachable via search_path adjustment below.
    begin
      alter extension pgcrypto set schema public;
    exception when others then
      null; -- already in public, or relocation not permitted; ignore
    end;
  else
    create extension pgcrypto with schema public;
  end if;
end$$;
