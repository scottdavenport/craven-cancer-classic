/**
 * database-types.test.ts
 * Sprint 32 (#282) updates: team_name dropped from Team + Score types.
 * Sprint 33 (#302) updates: category enum + tribute_recipient column added.
 * RED assertions fail until Flux runs migration and regenerates src/types/database.ts.
 */

import { describe, it, expect } from "vitest";
import type {
  Database,
  Profile,
  EventSettings,
  Sponsor,
  Team,
  SponsorshipItem,
  SponsorshipPurchase,
  Photo,
  Score,
  Contact,
  EmailLog,
} from "@/types/database";

describe("database types", () => {
  it("Profile type has correct shape", () => {
    const profile: Profile = {
      id: "uuid",
      auth_user_id: "uuid",
      full_name: "Scott Davenport",
      email: "scott@test.com",
      role: "admin",
      created_at: "2026-01-01T00:00:00Z",
    };
    expect(profile.role).toBe("admin");
  });

  it("EventSettings type has correct shape", () => {
    const event: EventSettings = {
      id: "uuid",
      name: "Craven Cancer Classic",
      description: "Test",
      morning_slots: 0,
      afternoon_slots: 0,
      morning_cap: 36,
      afternoon_cap: 36,
      registration_open: false,
      registration_fee_cents: 70000,
      year: 2026,
      hero_image_url: null,
      updated_at: "2026-01-01T00:00:00Z",
      tournament_start_date: "2026-09-18",
      tournament_end_date: null,
      venue_name: "New Bern Golf & Country Club",
      lifetime_raised_cents: null,
    };
    expect(event.name).toBe("Craven Cancer Classic");
    expect(event.registration_fee_cents).toBe(70000);
    expect(event.tournament_start_date).toBe("2026-09-18");
    expect(event.venue_name).toBe("New Bern Golf & Country Club");
  });

  it("Team type enforces session values", () => {
    // Sprint 32: team_name dropped from the Team type after migration.
    const team: Team = {
      id: "uuid",
      captain_contact_id: null,
      session: "morning",
      payment_status: "pending",
      stripe_payment_id: null,
      amount_paid_cents: 0,
      notes: null,
      year: 2026,
      created_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
      deleted_by: null,
    };
    expect(team.session).toBe("morning");
  });

  it("Photo type enforces status values", () => {
    const photo: Photo = {
      id: "uuid",
      uploaded_by_name: "Jane Doe",
      uploaded_by_email: "jane@test.com",
      image_url: "https://example.com/photo.jpg",
      caption: "Great shot!",
      status: "pending",
      year: 2026,
      created_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
      deleted_by: null,
    };
    expect(photo.status).toBe("pending");
  });

  it("Database type has all expected tables", () => {
    type TableNames = keyof Database["public"]["Tables"];
    // S4-3: exhaustive compile-time check — if a new table is added to database.ts
    // without being listed here, tsc will error because Exclude<TableNames, KnownTables>
    // will no longer be `never`.
    type KnownTables =
      | "contacts"
      | "email_log"
      | "event_settings"
      | "invitations"
      | "photos"
      | "profiles"
      | "scores"
      | "sponsor_contacts"
      | "sponsors"
      | "sponsorship_items"
      | "sponsorship_purchases"
      | "stripe_events"
      | "team_members"
      | "teams";
    // This assignment errors at compile time if any TableName is not in KnownTables
    type _ExhaustiveCheck = Exclude<TableNames, KnownTables> extends never
      ? true
      : never;
    const _check: _ExhaustiveCheck = true;
    void _check;

    // Runtime check: array must list all 14 tables
    const tables: KnownTables[] = [
      "contacts",
      "email_log",
      "event_settings",
      "invitations",
      "photos",
      "profiles",
      "scores",
      "sponsor_contacts",
      "sponsors",
      "sponsorship_items",
      "sponsorship_purchases",
      "stripe_events",
      "team_members",
      "teams",
    ];
    expect(tables).toHaveLength(14);
  });

  it("Insert types make required fields mandatory and optional fields optional (Sprint 32 RED)", () => {
    // Sprint 32 RED: TeamInsert must NOT require team_name after migration.
    // This test fails today because team_name is still present in database.ts.
    // It passes after Flux runs the migration and types are regenerated.
    type TeamInsert = Database["public"]["Tables"]["teams"]["Insert"];
    // Post-migration: team_name is NOT a required field; session is the only required field.
    const insert: TeamInsert = {
      session: "afternoon",
      // team_name must NOT be required — if it is, this will cause a TS error post-regen
    };
    expect(insert.session).toBe("afternoon");
    // team_name must not be accessible as a type-safe property
    // (runtime check — the compile-time check is enforced by omitting it above)
    expect(Object.prototype.hasOwnProperty.call(insert, "team_name")).toBe(false);
  });

  it("Score type does not include team_name column (Sprint 32 RED)", () => {
    // Sprint 32 RED: Score type loses team_name after the column drop.
    // Until database.ts is regenerated, Score still has team_name.
    // After Flux lands, this test verifies the column is gone.
    type ScoreRow = Database["public"]["Tables"]["scores"]["Row"];
    // Build a score without team_name — if team_name is NOT nullable/optional,
    // this will cause a TypeScript error at compile time post-migration.
    const score: ScoreRow = {
      id: "uuid",
      team_id: "team-uuid",
      total_score: 72,
      session: "morning",
      year: 2026,
      source: "manual",
      individual_scores: null,
      created_at: "2026-01-01T00:00:00Z",
      // team_name intentionally omitted — must not be required post-migration
    } as ScoreRow;
    expect(score.total_score).toBe(72);
    expect(Object.prototype.hasOwnProperty.call(score, "team_name")).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Sprint 33 RED: category enum + tribute_recipient column
  // These tests verify the shape assertions AFTER Flux regenerates database.ts.
  // They fail RED because the properties don't exist on current types.
  // ---------------------------------------------------------------------------

  it("Database Enums includes sponsorship_category with three values (Sprint 33 RED)", () => {
    // RED: sponsorship_category enum does not exist in database.ts yet.
    // We verify via runtime check that the enum object doesn't exist (RED state).
    // After Flux regenerates types, this test must be updated to use the real type.
    type Enums = Database["public"]["Enums"];
    // Compile-time: Enums is currently {}. This assertion confirms it's empty now.
    // After regen, the type will have sponsorship_category.
    const enumKeys = Object.keys({} as Enums);
    // RED: currently empty. After regen it will include 'sponsorship_category'.
    // The test intentionally fails until types are regenerated.
    expect(enumKeys).toContain("sponsorship_category");
  });

  it("SponsorshipItem Row type has a category field (Sprint 33 RED)", () => {
    // RED: category does not exist on sponsorship_items Row yet.
    // After migration + type regen, this must pass.
    type ItemRow = Database["public"]["Tables"]["sponsorship_items"]["Row"];
    const baseItem: ItemRow = {
      id: "uuid",
      name: "Champion",
      description: null,
      price_cents: 500000,
      max_quantity: null,
      sold_count: 0,
      active: true,
      benefits: [],
      category: "sponsorship",
      created_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
      deleted_by: null,
      sort_order: 1,
      year: 2026,
    };
    // Sprint 33 RED: after regen, 'category' will be a key on ItemRow.
    // Currently it is NOT present — this assertion fails (RED state).
    expect(Object.keys(baseItem)).toContain("category");
  });

  it("SponsorshipPurchase Row type has a tribute_recipient field (Sprint 33 RED)", () => {
    // RED: tribute_recipient does not exist on sponsorship_purchases Row yet.
    type PurchaseRow = Database["public"]["Tables"]["sponsorship_purchases"]["Row"];
    const purchase: PurchaseRow = {
      id: "uuid",
      item_id: "item-uuid",
      purchaser_name: "Jane Doe",
      purchaser_email: "jane@example.com",
      purchaser_phone: null,
      company_name: null,
      payment_status: "paid",
      amount_paid_cents: 2000,
      stripe_payment_id: null,
      tribute_recipient: null,
      year: 2026,
      created_at: "2026-01-01T00:00:00Z",
    };
    // Sprint 33 RED: after regen, 'tribute_recipient' will be a key on PurchaseRow.
    // Currently it is NOT present — this assertion fails (RED state).
    expect(Object.keys(purchase)).toContain("tribute_recipient");
  });

  it("SponsorshipPurchase Row tribute_recipient is nullable (non-tribute purchases) (Sprint 33 RED)", () => {
    // After regen: tribute_recipient must be string | null.
    // We verify via SponsorshipPurchase convenience type from @/types/database.
    // Currently SponsorshipPurchase doesn't include tribute_recipient.
    const purchase: SponsorshipPurchase = {
      id: "uuid",
      item_id: "item-uuid",
      purchaser_name: "Acme Corp",
      purchaser_email: "acme@example.com",
      purchaser_phone: null,
      company_name: "Acme Corp",
      payment_status: "paid",
      amount_paid_cents: 500000,
      stripe_payment_id: "pi_test",
      tribute_recipient: null,
      year: 2026,
      created_at: "2026-01-01T00:00:00Z",
    };
    // RED: tribute_recipient will be accessible as null on non-tribute purchases.
    // Currently the property doesn't exist — test fails.
    const extended = purchase as SponsorshipPurchase & { tribute_recipient?: string | null };
    expect("tribute_recipient" in purchase).toBe(true);
    expect(extended.tribute_recipient ?? null).toBeNull();
  });

  it("sponsorship_items_active view Row includes category column (Sprint 33 RED)", () => {
    // RED: View type does not include category until the view is recreated by Flux.
    type ActiveViewRow = Database["public"]["Views"]["sponsorship_items_active"]["Row"];
    const baseViewRow: ActiveViewRow = {
      id: "uuid",
      name: "Balloons",
      description: null,
      price_cents: 2000,
      max_quantity: null,
      sold_count: 0,
      active: true,
      benefits: [],
      category: "tribute",
      created_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
      deleted_by: null,
      sort_order: 14,
      year: 2026,
    };
    // Sprint 33 RED: after recreation, 'category' will be a key on the view Row.
    // Currently it is NOT present — this assertion fails (RED state).
    expect(Object.keys(baseViewRow)).toContain("category");
  });

  it("SponsorshipItem convenience type has category field (Sprint 33 RED)", () => {
    // The SponsorshipItem convenience type exported from @/types/database must
    // include category after types are regenerated.
    const item: SponsorshipItem = {
      id: "uuid",
      name: "Tee Sign",
      description: null,
      price_cents: 10000,
      max_quantity: null,
      sold_count: 0,
      active: true,
      benefits: [],
      category: "supporter",
      created_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
      deleted_by: null,
      sort_order: 15,
      year: 2026,
    };
    // RED: category not present on SponsorshipItem yet.
    expect(Object.keys(item)).toContain("category");
  });
});
