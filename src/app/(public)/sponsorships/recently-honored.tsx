/**
 * RecentlyHonored — Sprint 33 Phase 3 (#307)
 *
 * Server component. Queries sponsorship_purchases for the top 20 tribute
 * recipient names ordered by created_at DESC and renders them as a list.
 *
 * Copy: placeholder — Aria #308 finalizes all strings.
 */

import { createClient } from "@/lib/supabase/server";

async function getRecentTributeRecipients(): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("sponsorship_purchases")
    .select("tribute_recipient, created_at")
    .not("tribute_recipient", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!data) return [];

  return data
    .map((row: { tribute_recipient: string | null }) => row.tribute_recipient)
    .filter((name): name is string => name !== null);
}

export async function RecentlyHonored() {
  const recipients = await getRecentTributeRecipients();

  if (recipients.length === 0) {
    return (
      <div data-testid="recently-honored-empty" className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          {/* TODO-aria-308: empty-state copy for Recently Honored list */}
          No tributes yet — be the first to honor someone.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3
        className="mb-4 text-center text-base font-semibold"
        style={{
          fontFamily: "var(--font-manrope)",
          color: "var(--foreground)",
        }}
      >
        {/* TODO-aria-308: heading for Recently Honored list */}
        Recently Honored
      </h3>
      <ul className="mx-auto max-w-sm space-y-2 text-center">
        {recipients.map((name, index) => (
          <li
            key={`${name}-${index}`}
            className="text-sm text-muted-foreground"
          >
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RecentlyHonored;
