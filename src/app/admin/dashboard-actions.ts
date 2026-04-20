"use server";

// RED PHASE STUB — Bolt replaces this entire file with the real implementation.
// This stub exists only so test imports resolve during the RED phase.
// All exports here throw to guarantee every test fails until the real implementation lands.

export async function getDashboardStats(): Promise<{
  registrations: number;
  sponsors: number;
  revenue_cents: number;
  pending_photos: number;
  contacts: number;
  scores: number;
}> {
  throw new Error(
    "getDashboardStats not implemented — Bolt must replace this stub with real queries"
  );
}
