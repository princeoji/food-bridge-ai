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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          submitted_by: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          submitted_by?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          submitted_by?: string | null
        }
        Relationships: []
      }
      donations: {
        Row: {
          best_before: string | null
          claimed_by: string | null
          created_at: string
          delivered_at: string | null
          delivery_address: string | null
          donor_id: string
          food_name: string
          id: string
          notes: string | null
          picked_up_at: string | null
          pickup_address: string
          pickup_code: string | null
          quantity: number
          status: string
          volunteer_id: string | null
        }
        Insert: {
          best_before?: string | null
          claimed_by?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          donor_id: string
          food_name: string
          id?: string
          notes?: string | null
          picked_up_at?: string | null
          pickup_address: string
          pickup_code?: string | null
          quantity: number
          status?: string
          volunteer_id?: string | null
        }
        Update: {
          best_before?: string | null
          claimed_by?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          donor_id?: string
          food_name?: string
          id?: string
          notes?: string | null
          picked_up_at?: string | null
          pickup_address?: string
          pickup_code?: string | null
          quantity?: number
          status?: string
          volunteer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_claimant_fk"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_donor_fk"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          capacity: number
          created_at: string
          id: string
          organisation_name: string
          organisation_type: string
          phone: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id: string
          organisation_name?: string
          organisation_type?: string
          phone?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          organisation_name?: string
          organisation_type?: string
          phone?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_delivery: {
        Args: { p_donation_id: string }
        Returns: {
          best_before: string | null
          claimed_by: string | null
          created_at: string
          delivered_at: string | null
          delivery_address: string | null
          donor_id: string
          food_name: string
          id: string
          notes: string | null
          picked_up_at: string | null
          pickup_address: string
          pickup_code: string | null
          quantity: number
          status: string
          volunteer_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "donations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      available_deliveries: {
        Args: { p_offset?: number }
        Returns: {
          best_before: string
          delivery_address: string
          food_name: string
          id: string
          pickup_address: string
          quantity: number
        }[]
      }
      claim_donation: {
        Args: { p_delivery_address?: string; p_donation_id: string }
        Returns: {
          best_before: string | null
          claimed_by: string | null
          created_at: string
          delivered_at: string | null
          delivery_address: string | null
          donor_id: string
          food_name: string
          id: string
          notes: string | null
          picked_up_at: string | null
          pickup_address: string
          pickup_code: string | null
          quantity: number
          status: string
          volunteer_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "donations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_donation: {
        Args: { p_donation_id: string }
        Returns: {
          best_before: string | null
          claimed_by: string | null
          created_at: string
          delivered_at: string | null
          delivery_address: string | null
          donor_id: string
          food_name: string
          id: string
          notes: string | null
          picked_up_at: string | null
          pickup_address: string
          pickup_code: string | null
          quantity: number
          status: string
          volunteer_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "donations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_pickup: {
        Args: { p_donation_id: string; p_pickup_code: string }
        Returns: {
          best_before: string | null
          claimed_by: string | null
          created_at: string
          delivered_at: string | null
          delivery_address: string | null
          donor_id: string
          food_name: string
          id: string
          notes: string | null
          picked_up_at: string | null
          pickup_address: string
          pickup_code: string | null
          quantity: number
          status: string
          volunteer_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "donations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      impact_stats: { Args: never; Returns: Json }
      release_donation: {
        Args: { p_donation_id: string }
        Returns: {
          best_before: string | null
          claimed_by: string | null
          created_at: string
          delivered_at: string | null
          delivery_address: string | null
          donor_id: string
          food_name: string
          id: string
          notes: string | null
          picked_up_at: string | null
          pickup_address: string
          pickup_code: string | null
          quantity: number
          status: string
          volunteer_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "donations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_delivery_address: {
        Args: { p_address: string; p_donation_id: string }
        Returns: {
          best_before: string | null
          claimed_by: string | null
          created_at: string
          delivered_at: string | null
          delivery_address: string | null
          donor_id: string
          food_name: string
          id: string
          notes: string | null
          picked_up_at: string | null
          pickup_address: string
          pickup_code: string | null
          quantity: number
          status: string
          volunteer_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "donations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_contact_message: {
        Args: { p_email: string; p_message: string; p_name: string }
        Returns: boolean
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
