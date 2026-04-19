import { headers } from "next/headers";

/**
 * Derive the auth callback URL from the incoming request's own headers
 * rather than a build-time env var.
 *
 * Priority:
 *   1. `origin` header (most direct)
 *   2. `x-forwarded-proto` + `host` (Vercel edge proxy pattern)
 *   3. `NEXT_PUBLIC_SITE_URL` env var (last resort)
 *
 * Why: relying on NEXT_PUBLIC_SITE_URL means any env drift between
 * local / preview / production yields a redirectTo that Supabase rejects,
 * and Supabase falls back to Site URL (root) — breaking the OAuth flow.
 * Request headers are authoritative for the current runtime.
 */
export async function getCallbackUrl(): Promise<string> {
  const h = await headers();
  const fromOrigin = h.get("origin");
  if (fromOrigin) return `${fromOrigin}/auth/callback`;

  const proto = h.get("x-forwarded-proto");
  const host = h.get("host");
  if (proto && host) return `${proto}://${host}/auth/callback`;

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  return `${fromEnv}/auth/callback`;
}
