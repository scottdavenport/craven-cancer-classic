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
    };
    expect(event.name).toBe("Craven Cancer Classic");
    expect(event.registration_fee_cents).toBe(70000);
    expect(event.tournament_start_date).toBe("2026-09-18");
    expect(event.venue_name).toBe("New Bern Golf & Country Club");
  });

  it("Team type enforces session values", () => {
    const team: Team = {
      id: "uuid",
      team_name: "The Hackers",
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

  it("Insert types make required fields mandatory and optional fields optional", () => {
    type TeamInsert = Database["public"]["Tables"]["teams"]["Insert"];
    // These are the required fields for inserting a team
    // (captain_name/email/phone columns dropped in S11-2 — use captain_contact_id instead)
    const insert: TeamInsert = {
      team_name: "Test Team",
      session: "afternoon",
    };
    expect(insert.team_name).toBe("Test Team");
    // payment_status should default, so it's optional
    expect(insert.payment_status).toBeUndefined();
  });
});
