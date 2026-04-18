export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      contacts: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          type: string
          year_first_seen: number
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          type?: string
          year_first_seen?: number
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          type?: string
          year_first_seen?: number
        }
        Relationships: []
      }
      email_log: {
        Row: {
          body: string
          id: string
          recipient_count: number
          sent_at: string
          sent_by: string | null
          status: string
          subject: string
        }
        Insert: {
          body: string
          id?: string
          recipient_count?: number
          sent_at?: string
          sent_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          body?: string
          id?: string
          recipient_count?: number
          sent_at?: string
          sent_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_settings: {
        Row: {
          afternoon_cap: number
          afternoon_slots: number
          date: string | null
          description: string | null
          hero_image_url: string | null
          id: string
          location: string
          morning_cap: number
          morning_slots: number
          name: string
          registration_fee_cents: number
          registration_open: boolean
          updated_at: string
          year: number
        }
        Insert: {
          afternoon_cap?: number
          afternoon_slots?: number
          date?: string | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          location?: string
          morning_cap?: number
          morning_slots?: number
          name?: string
          registration_fee_cents?: number
          registration_open?: boolean
          updated_at?: string
          year?: number
        }
        Update: {
          afternoon_cap?: number
          afternoon_slots?: number
          date?: string | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          location?: string
          morning_cap?: number
          morning_slots?: number
          name?: string
          registration_fee_cents?: number
          registration_open?: boolean
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          status: string
          uploaded_by_email: string | null
          uploaded_by_name: string
          year: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          status?: string
          uploaded_by_email?: string | null
          uploaded_by_name: string
          year?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          status?: string
          uploaded_by_email?: string | null
          uploaded_by_name?: string
          year?: number
        }
        Relationships: []
      }
      players: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          handicap: number | null
          id: string
          phone: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          handicap?: number | null
          id?: string
          phone?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          handicap?: number | null
          id?: string
          phone?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          role: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          role?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      scores: {
        Row: {
          created_at: string
          id: string
          individual_scores: Json
          session: string | null
          source: string
          team_id: string | null
          team_name: string
          total_score: number
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          individual_scores?: Json
          session?: string | null
          source?: string
          team_id?: string | null
          team_name: string
          total_score: number
          year?: number
        }
        Update: {
          created_at?: string
          id?: string
          individual_scores?: Json
          session?: string | null
          source?: string
          team_id?: string | null
          team_name?: string
          total_score?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          amount_paid_cents: number
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          display_order: number
          id: string
          logo_url: string | null
          name: string
          payment_status: string
          stripe_payment_id: string | null
          tier_id: string
          website: string | null
          year: number
        }
        Insert: {
          amount_paid_cents?: number
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          display_order?: number
          id?: string
          logo_url?: string | null
          name: string
          payment_status?: string
          stripe_payment_id?: string | null
          tier_id: string
          website?: string | null
          year?: number
        }
        Update: {
          amount_paid_cents?: number
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          display_order?: number
          id?: string
          logo_url?: string | null
          name?: string
          payment_status?: string
          stripe_payment_id?: string | null
          tier_id?: string
          website?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "sponsors_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorship_items: {
        Row: {
          active: boolean
          benefits: Json
          created_at: string
          description: string | null
          id: string
          max_quantity: number | null
          name: string
          price_cents: number
          sold_count: number
          sort_order: number
          year: number
        }
        Insert: {
          active?: boolean
          benefits?: Json
          created_at?: string
          description?: string | null
          id?: string
          max_quantity?: number | null
          name: string
          price_cents: number
          sold_count?: number
          sort_order?: number
          year?: number
        }
        Update: {
          active?: boolean
          benefits?: Json
          created_at?: string
          description?: string | null
          id?: string
          max_quantity?: number | null
          name?: string
          price_cents?: number
          sold_count?: number
          sort_order?: number
          year?: number
        }
        Relationships: []
      }
      sponsorship_purchases: {
        Row: {
          amount_paid_cents: number
          company_name: string | null
          created_at: string
          id: string
          item_id: string
          payment_status: string
          purchaser_email: string
          purchaser_name: string
          purchaser_phone: string | null
          stripe_payment_id: string | null
          year: number
        }
        Insert: {
          amount_paid_cents?: number
          company_name?: string | null
          created_at?: string
          id?: string
          item_id: string
          payment_status?: string
          purchaser_email: string
          purchaser_name: string
          purchaser_phone?: string | null
          stripe_payment_id?: string | null
          year?: number
        }
        Update: {
          amount_paid_cents?: number
          company_name?: string | null
          created_at?: string
          id?: string
          item_id?: string
          payment_status?: string
          purchaser_email?: string
          purchaser_name?: string
          purchaser_phone?: string | null
          stripe_payment_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "sponsorship_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          id: string
          processed_at: string | null
          received_at: string
        }
        Insert: {
          id: string
          processed_at?: string | null
          received_at?: string
        }
        Update: {
          id?: string
          processed_at?: string | null
          received_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          amount_paid_cents: number
          captain_email: string
          captain_name: string
          captain_phone: string | null
          created_at: string
          id: string
          notes: string | null
          payment_status: string
          session: string
          stripe_payment_id: string | null
          team_name: string
          year: number
        }
        Insert: {
          amount_paid_cents?: number
          captain_email: string
          captain_name: string
          captain_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_status?: string
          session: string
          stripe_payment_id?: string | null
          team_name: string
          year?: number
        }
        Update: {
          amount_paid_cents?: number
          captain_email?: string
          captain_name?: string
          captain_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_status?: string
          session?: string
          stripe_payment_id?: string | null
          team_name?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_stripe_event_lock: {
        Args: { event_id: string }
        Returns: void
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_viewer: { Args: never; Returns: boolean }
      register_team: {
        Args: {
          p_session: string
          p_team_name: string
          p_captain_name: string
          p_captain_email: string
          p_captain_phone?: string | null
        }
        Returns: Json
      }
      release_stripe_event_lock: {
        Args: { event_id: string }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const


// Convenience type aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type EventSettings = Database["public"]["Tables"]["event_settings"]["Row"];
export type Sponsor = Database["public"]["Tables"]["sponsors"]["Row"];
export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type Player = Database["public"]["Tables"]["players"]["Row"];
export type SponsorshipItem = Database["public"]["Tables"]["sponsorship_items"]["Row"];
export type SponsorshipPurchase = Database["public"]["Tables"]["sponsorship_purchases"]["Row"];
export type Photo = Database["public"]["Tables"]["photos"]["Row"];
export type Score = Database["public"]["Tables"]["scores"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type EmailLog = Database["public"]["Tables"]["email_log"]["Row"];
export type Invitation = Database["public"]["Tables"]["invitations"]["Row"];
