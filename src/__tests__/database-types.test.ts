import { describe, it, expect } from "vitest";
import type {
  Database,
  Profile,
  EventSettings,
  SponsorTier,
  Sponsor,
  Team,
  Player,
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
      date: "2026-09-18",
      location: "New Bern Golf & Country Club",
      description: "Test",
      morning_slots: 0,
      afternoon_slots: 0,
      morning_cap: 36,
      afternoon_cap: 36,
      registration_open: false,
      year: 2026,
      hero_image_url: null,
      updated_at: "2026-01-01T00:00:00Z",
    };
    expect(event.name).toBe("Craven Cancer Classic");
  });

  it("Team type enforces session values", () => {
    const team: Team = {
      id: "uuid",
      team_name: "The Hackers",
      captain_name: "John Doe",
      captain_email: "john@test.com",
      captain_phone: null,
      session: "morning",
      payment_status: "pending",
      stripe_payment_id: null,
      amount_paid: 0,
      notes: null,
      year: 2026,
      created_at: "2026-01-01T00:00:00Z",
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
    };
    expect(photo.status).toBe("pending");
  });

  it("Database type has all expected tables", () => {
    type TableNames = keyof Database["public"]["Tables"];
    const tables: TableNames[] = [
      "profiles",
      "event_settings",
      "sponsor_tiers",
      "sponsors",
      "teams",
      "players",
      "sponsorship_items",
      "sponsorship_purchases",
      "photos",
      "scores",
      "contacts",
      "email_log",
    ];
    expect(tables).toHaveLength(12);
  });

  it("Insert types make required fields mandatory and optional fields optional", () => {
    type TeamInsert = Database["public"]["Tables"]["teams"]["Insert"];
    // These are the required fields for inserting a team
    const insert: TeamInsert = {
      team_name: "Test Team",
      captain_name: "Captain",
      captain_email: "cap@test.com",
      session: "afternoon",
    };
    expect(insert.team_name).toBe("Test Team");
    // payment_status should default, so it's optional
    expect(insert.payment_status).toBeUndefined();
  });
});
