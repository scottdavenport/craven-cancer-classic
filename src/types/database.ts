export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contacts: {
        Row: {
          address1: string | null
          address2: string | null
          city: string | null
          company: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          first_name: string | null
          full_name: string
          handicap: number | null
          id: string
          last_name: string | null
          marketing_consent: boolean
          notes: string | null
          phone: string | null
          recognition_name: string | null
          salutation: string | null
          shirt_size: string | null
          show_on_wall: boolean
          source: string | null
          state: string | null
          types: string[]
          year_first_seen: number
          zip: string | null
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          first_name?: string | null
          full_name: string
          handicap?: number | null
          id?: string
          last_name?: string | null
          marketing_consent?: boolean
          notes?: string | null
          phone?: string | null
          recognition_name?: string | null
          salutation?: string | null
          shirt_size?: string | null
          show_on_wall?: boolean
          source?: string | null
          state?: string | null
          types?: string[]
          year_first_seen?: number
          zip?: string | null
        }
        Update: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string
          handicap?: number | null
          id?: string
          last_name?: string | null
          marketing_consent?: boolean
          notes?: string | null
          phone?: string | null
          recognition_name?: string | null
          salutation?: string | null
          shirt_size?: string | null
          show_on_wall?: boolean
          source?: string | null
          state?: string | null
          types?: string[]
          year_first_seen?: number
          zip?: string | null
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
          description: string | null
          hero_image_url: string | null
          id: string
          lifetime_raised_cents: number | null
          morning_cap: number
          morning_slots: number
          name: string
          registration_fee_cents: number
          registration_open: boolean
          tournament_end_date: string | null
          tournament_start_date: string | null
          updated_at: string
          venue_name: string | null
          year: number
        }
        Insert: {
          afternoon_cap?: number
          afternoon_slots?: number
          description?: string | null
          hero_image_url?: string | null
          id?: string
          lifetime_raised_cents?: number | null
          morning_cap?: number
          morning_slots?: number
          name?: string
          registration_fee_cents?: number
          registration_open?: boolean
          tournament_end_date?: string | null
          tournament_start_date?: string | null
          updated_at?: string
          venue_name?: string | null
          year?: number
        }
        Update: {
          afternoon_cap?: number
          afternoon_slots?: number
          description?: string | null
          hero_image_url?: string | null
          id?: string
          lifetime_raised_cents?: number | null
          morning_cap?: number
          morning_slots?: number
          name?: string
          registration_fee_cents?: number
          registration_open?: boolean
          tournament_end_date?: string | null
          tournament_start_date?: string | null
          updated_at?: string
          venue_name?: string | null
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
          deleted_at: string | null
          deleted_by: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          image_url?: string
          status?: string
          uploaded_by_email?: string | null
          uploaded_by_name?: string
          year?: number
        }
        Relationships: []
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
          {
            foreignKeyName: "scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_active"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_contacts: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          role: string
          sponsor_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          role?: string
          sponsor_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          role?: string
          sponsor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_contacts_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          amount_paid_cents: number
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          display_order: number
          id: string
          is_active: boolean
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
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
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
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
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
          {
            foreignKeyName: "sponsors_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_items_active"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorship_items: {
        Row: {
          active: boolean
          benefits: Json
          category: Database["public"]["Enums"]["sponsorship_category"]
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
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
          category?: Database["public"]["Enums"]["sponsorship_category"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
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
          category?: Database["public"]["Enums"]["sponsorship_category"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
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
          tribute_recipient: string | null
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
          tribute_recipient?: string | null
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
          tribute_recipient?: string | null
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
          {
            foreignKeyName: "sponsorship_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_items_active"
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
      team_members: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          role: string
          slot: number
          team_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          role: string
          slot: number
          team_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          role?: string
          slot?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_active"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          amount_paid_cents: number
          captain_contact_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          session: string
          stripe_payment_id: string | null
          year: number
        }
        Insert: {
          amount_paid_cents?: number
          captain_contact_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          session: string
          stripe_payment_id?: string | null
          year?: number
        }
        Update: {
          amount_paid_cents?: number
          captain_contact_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          session?: string
          stripe_payment_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_contact_id_fkey"
            columns: ["captain_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_captain_contact_id_fkey"
            columns: ["captain_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_active"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      contacts_active: {
        Row: {
          address1: string | null
          address2: string | null
          city: string | null
          company: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          handicap: number | null
          id: string | null
          last_name: string | null
          marketing_consent: boolean | null
          notes: string | null
          phone: string | null
          recognition_name: string | null
          salutation: string | null
          shirt_size: string | null
          show_on_wall: boolean | null
          source: string | null
          state: string | null
          types: string[] | null
          year_first_seen: number | null
          zip: string | null
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          company?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          handicap?: number | null
          id?: string | null
          last_name?: string | null
          marketing_consent?: boolean | null
          notes?: string | null
          phone?: string | null
          recognition_name?: string | null
          salutation?: string | null
          shirt_size?: string | null
          show_on_wall?: boolean | null
          source?: string | null
          state?: string | null
          types?: string[] | null
          year_first_seen?: number | null
          zip?: string | null
        }
        Update: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          company?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          handicap?: number | null
          id?: string | null
          last_name?: string | null
          marketing_consent?: boolean | null
          notes?: string | null
          phone?: string | null
          recognition_name?: string | null
          salutation?: string | null
          shirt_size?: string | null
          show_on_wall?: boolean | null
          source?: string | null
          state?: string | null
          types?: string[] | null
          year_first_seen?: number | null
          zip?: string | null
        }
        Relationships: []
      }
      photos_active: {
        Row: {
          caption: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string | null
          image_url: string | null
          status: string | null
          uploaded_by_email: string | null
          uploaded_by_name: string | null
          year: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string | null
          image_url?: string | null
          status?: string | null
          uploaded_by_email?: string | null
          uploaded_by_name?: string | null
          year?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string | null
          image_url?: string | null
          status?: string | null
          uploaded_by_email?: string | null
          uploaded_by_name?: string | null
          year?: number | null
        }
        Relationships: []
      }
      sponsors_active: {
        Row: {
          amount_paid_cents: number | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          display_order: number | null
          id: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string | null
          payment_status: string | null
          stripe_payment_id: string | null
          tier_id: string | null
          website: string | null
          year: number | null
        }
        Insert: {
          amount_paid_cents?: number | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_order?: number | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          payment_status?: string | null
          stripe_payment_id?: string | null
          tier_id?: string | null
          website?: string | null
          year?: number | null
        }
        Update: {
          amount_paid_cents?: number | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_order?: number | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          payment_status?: string | null
          stripe_payment_id?: string | null
          tier_id?: string | null
          website?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsors_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsors_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_items_active"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorship_items_active: {
        Row: {
          active: boolean | null
          benefits: Json | null
          category: Database["public"]["Enums"]["sponsorship_category"] | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string | null
          max_quantity: number | null
          name: string | null
          price_cents: number | null
          sold_count: number | null
          sort_order: number | null
          year: number | null
        }
        Insert: {
          active?: boolean | null
          benefits?: Json | null
          category?: Database["public"]["Enums"]["sponsorship_category"] | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string | null
          max_quantity?: number | null
          name?: string | null
          price_cents?: number | null
          sold_count?: number | null
          sort_order?: number | null
          year?: number | null
        }
        Update: {
          active?: boolean | null
          benefits?: Json | null
          category?: Database["public"]["Enums"]["sponsorship_category"] | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string | null
          max_quantity?: number | null
          name?: string | null
          price_cents?: number | null
          sold_count?: number | null
          sort_order?: number | null
          year?: number | null
        }
        Relationships: []
      }
      teams_active: {
        Row: {
          amount_paid_cents: number | null
          captain_contact_id: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          session: string | null
          stripe_payment_id: string | null
          year: number | null
        }
        Insert: {
          amount_paid_cents?: number | null
          captain_contact_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          session?: string | null
          stripe_payment_id?: string | null
          year?: number | null
        }
        Update: {
          amount_paid_cents?: number | null
          captain_contact_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          session?: string | null
          stripe_payment_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_contact_id_fkey"
            columns: ["captain_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_captain_contact_id_fkey"
            columns: ["captain_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_active"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      acquire_stripe_event_lock: {
        Args: { event_id: string }
        Returns: undefined
      }
      dearmor: { Args: { "": string }; Returns: string }
      gen_random_uuid: { Args: never; Returns: string }
      gen_salt: { Args: { "": string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_viewer: { Args: never; Returns: boolean }
      pgp_armor_headers: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      register_team: {
        Args: {
          p_captain_email: string
          p_captain_name: string
          p_captain_phone?: string
          p_session: string
        }
        Returns: Json
      }
      release_stripe_event_lock: {
        Args: { event_id: string }
        Returns: undefined
      }
    }
    Enums: {
      sponsorship_category: "sponsorship" | "tribute" | "supporter"
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
  public: {
    Enums: {
      sponsorship_category: ["sponsorship", "tribute", "supporter"] as const,
    },
  },
} as const

// Convenience type aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type EventSettings = Database["public"]["Tables"]["event_settings"]["Row"];
export type Sponsor = Database["public"]["Tables"]["sponsors"]["Row"];
export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type SponsorshipItem = Database["public"]["Tables"]["sponsorship_items"]["Row"];
export type SponsorshipPurchase = Database["public"]["Tables"]["sponsorship_purchases"]["Row"];
export type Photo = Database["public"]["Tables"]["photos"]["Row"];
export type Score = Database["public"]["Tables"]["scores"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type SponsorContact = Database["public"]["Tables"]["sponsor_contacts"]["Row"];
export type EmailLog = Database["public"]["Tables"]["email_log"]["Row"];
export type Invitation = Database["public"]["Tables"]["invitations"]["Row"];
