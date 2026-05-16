# E2E Cleanup Infrastructure Runbook

## `cleanupTestData` throws on import (missing env var)

**Symptom:** Test suite fails to start with `cleanup-helper: SUPABASE_SERVICE_ROLE_KEY is not set`.

**Diagnostic command:**
```bash
grep SUPABASE_SERVICE_ROLE_KEY .env.local
```

**Remediation:**
1. Open `.env.local` (or `.env.local.example` for the placeholder).
2. Add `SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>`.
3. Find the key in Supabase dashboard → Settings → API → `service_role` section.
4. Re-run the test suite.

**Escalation:** If the key is set but tests still fail, verify the Supabase project URL (`NEXT_PUBLIC_SUPABASE_URL`) matches the project that issued the service-role key. File a priority:p1 issue if still blocked.

---

## `cleanupTestData` returns partial failure (table name in error)

**Symptom:** `cleanupTestData: failed to delete from <table>: <error>` thrown in `afterAll`.

**Diagnostic command:**
```bash
# Check Supabase project health
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/contacts?limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq .
```

**Remediation:**
1. If error is `permission denied` — the service-role key may be stale; rotate in Supabase dashboard and update `.env.local`.
2. If error is `FK violation` — the delete order in `cleanupTestData` may need updating to reflect a new FK relationship. Check `src/types/database.ts` for new `Relationships` entries.
3. If error is `connection refused` — Supabase project may be paused; resume it in the dashboard.

**Escalation:** File a priority:p1 issue with the full error message and stack trace.

---

## e2e test data accumulates in prod (e2e-* rows not cleaned up)

**Symptom:** `npm run e2e:verify-clean` exits non-zero; e2e-* rows found in prod tables.

**Diagnostic command:**
```bash
# Count e2e rows in each tracked table (run from project root with service-role key)
npx tsx scripts/e2e-verify-clean.ts
```

**Remediation:**
1. Run one-time manual scrub: `npm run e2e:scrub`.
2. If scrub fails, check the partial-failure runbook entry above.
3. Verify all 15 e2e specs have `afterAll(() => cleanupTestData(SEED_TAG))` wired.

**Escalation:** If scrub deletes 0 rows but verify-clean still fails, the marker pattern may have drifted — check that test emails match `e2e-%@example.com`.
