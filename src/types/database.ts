export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          auth_user_id: string;
          full_name: string;
          email: string;
          role: "admin" | "user";
          created_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          full_name: string;
          email: string;
          role?: "admin" | "user";
          created_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          full_name?: string;
          email?: string;
          role?: "admin" | "user";
          created_at?: string;
        };
        Relationships: [];
      };
      event_settings: {
        Row: {
          id: string;
          name: string;
          date: string | null;
          location: string;
          description: string | null;
          morning_slots: number;
          afternoon_slots: number;
          morning_cap: number;
          afternoon_cap: number;
          registration_open: boolean;
          // Added by migration 20260416000002 — regenerate via `supabase gen types typescript` when local stack is linked
          registration_fee_cents: number;
          year: number;
          hero_image_url: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          date?: string | null;
          location?: string;
          description?: string | null;
          morning_slots?: number;
          afternoon_slots?: number;
          morning_cap?: number;
          afternoon_cap?: number;
          registration_open?: boolean;
          registration_fee_cents?: number;
          year?: number;
          hero_image_url?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          date?: string | null;
          location?: string;
          description?: string | null;
          morning_slots?: number;
          afternoon_slots?: number;
          morning_cap?: number;
          afternoon_cap?: number;
          registration_open?: boolean;
          registration_fee_cents?: number;
          year?: number;
          hero_image_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      sponsor_tiers: {
        Row: {
          id: string;
          name: string;
          price: number;
          sort_order: number;
          benefits: Json;
          max_available: number | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          sort_order?: number;
          benefits?: Json;
          max_available?: number | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          sort_order?: number;
          benefits?: Json;
          max_available?: number | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      sponsors: {
        Row: {
          id: string;
          tier_id: string;
          name: string;
          logo_url: string | null;
          website: string | null;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          amount_paid: number;
          payment_status: "pending" | "paid" | "comped";
          stripe_payment_id: string | null;
          display_order: number;
          year: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tier_id: string;
          name: string;
          logo_url?: string | null;
          website?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          amount_paid?: number;
          payment_status?: "pending" | "paid" | "comped";
          stripe_payment_id?: string | null;
          display_order?: number;
          year?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tier_id?: string;
          name?: string;
          logo_url?: string | null;
          website?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          amount_paid?: number;
          payment_status?: "pending" | "paid" | "comped";
          stripe_payment_id?: string | null;
          display_order?: number;
          year?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          team_name: string;
          captain_name: string;
          captain_email: string;
          captain_phone: string | null;
          session: "morning" | "afternoon";
          payment_status: "pending" | "paid" | "comped";
          stripe_payment_id: string | null;
          amount_paid: number;
          notes: string | null;
          year: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_name: string;
          captain_name: string;
          captain_email: string;
          captain_phone?: string | null;
          session: "morning" | "afternoon";
          payment_status?: "pending" | "paid" | "comped";
          stripe_payment_id?: string | null;
          amount_paid?: number;
          notes?: string | null;
          year?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_name?: string;
          captain_name?: string;
          captain_email?: string;
          captain_phone?: string | null;
          session?: "morning" | "afternoon";
          payment_status?: "pending" | "paid" | "comped";
          stripe_payment_id?: string | null;
          amount_paid?: number;
          notes?: string | null;
          year?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          team_id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          handicap: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          handicap?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          handicap?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      sponsorship_items: {
        Row: {
          id: string;
          tier_id: string | null;
          name: string;
          description: string | null;
          price: number;
          max_quantity: number | null;
          sold_count: number;
          active: boolean;
          year: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tier_id?: string | null;
          name: string;
          description?: string | null;
          price: number;
          max_quantity?: number | null;
          sold_count?: number;
          active?: boolean;
          year?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tier_id?: string | null;
          name?: string;
          description?: string | null;
          price?: number;
          max_quantity?: number | null;
          sold_count?: number;
          active?: boolean;
          year?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      sponsorship_purchases: {
        Row: {
          id: string;
          item_id: string;
          purchaser_name: string;
          purchaser_email: string;
          purchaser_phone: string | null;
          company_name: string | null;
          payment_status: "pending" | "paid" | "comped";
          stripe_payment_id: string | null;
          amount_paid: number;
          year: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          purchaser_name: string;
          purchaser_email: string;
          purchaser_phone?: string | null;
          company_name?: string | null;
          payment_status?: "pending" | "paid" | "comped";
          stripe_payment_id?: string | null;
          amount_paid?: number;
          year?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          purchaser_name?: string;
          purchaser_email?: string;
          purchaser_phone?: string | null;
          company_name?: string | null;
          payment_status?: "pending" | "paid" | "comped";
          stripe_payment_id?: string | null;
          amount_paid?: number;
          year?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      photos: {
        Row: {
          id: string;
          uploaded_by_name: string;
          uploaded_by_email: string | null;
          image_url: string;
          caption: string | null;
          status: "pending" | "approved" | "rejected";
          year: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          uploaded_by_name: string;
          uploaded_by_email?: string | null;
          image_url: string;
          caption?: string | null;
          status?: "pending" | "approved" | "rejected";
          year?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          uploaded_by_name?: string;
          uploaded_by_email?: string | null;
          image_url?: string;
          caption?: string | null;
          status?: "pending" | "approved" | "rejected";
          year?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      scores: {
        Row: {
          id: string;
          team_id: string | null;
          team_name: string;
          session: "morning" | "afternoon" | null;
          total_score: number;
          individual_scores: Json;
          source: "csv" | "manual";
          year: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string | null;
          team_name: string;
          session?: "morning" | "afternoon" | null;
          total_score: number;
          individual_scores?: Json;
          source?: "csv" | "manual";
          year?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string | null;
          team_name?: string;
          session?: "morning" | "afternoon" | null;
          total_score?: number;
          individual_scores?: Json;
          source?: "csv" | "manual";
          year?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          type: "player" | "sponsor" | "donor" | "other";
          year_first_seen: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email: string;
          phone?: string | null;
          type?: "player" | "sponsor" | "donor" | "other";
          year_first_seen?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          phone?: string | null;
          type?: "player" | "sponsor" | "donor" | "other";
          year_first_seen?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      email_log: {
        Row: {
          id: string;
          subject: string;
          body: string;
          recipient_count: number;
          sent_by: string | null;
          sent_at: string;
          status: "sent" | "failed";
        };
        Insert: {
          id?: string;
          subject: string;
          body: string;
          recipient_count?: number;
          sent_by?: string | null;
          sent_at?: string;
          status?: "sent" | "failed";
        };
        Update: {
          id?: string;
          subject?: string;
          body?: string;
          recipient_count?: number;
          sent_by?: string | null;
          sent_at?: string;
          status?: "sent" | "failed";
        };
        Relationships: [];
      };
      // Added by migration 20260418000001_webhook_idempotency — regenerate via `supabase gen types typescript` when local stack is linked
      stripe_events: {
        Row: {
          id: string;
          processed_at: string | null;
          received_at: string;
        };
        Insert: {
          id: string;
          processed_at?: string | null;
          received_at?: string;
        };
        Update: {
          id?: string;
          processed_at?: string | null;
          received_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Convenience type aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type EventSettings = Database["public"]["Tables"]["event_settings"]["Row"];
export type SponsorTier = Database["public"]["Tables"]["sponsor_tiers"]["Row"];
export type Sponsor = Database["public"]["Tables"]["sponsors"]["Row"];
export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type Player = Database["public"]["Tables"]["players"]["Row"];
export type SponsorshipItem = Database["public"]["Tables"]["sponsorship_items"]["Row"];
export type SponsorshipPurchase = Database["public"]["Tables"]["sponsorship_purchases"]["Row"];
export type Photo = Database["public"]["Tables"]["photos"]["Row"];
export type Score = Database["public"]["Tables"]["scores"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type EmailLog = Database["public"]["Tables"]["email_log"]["Row"];
