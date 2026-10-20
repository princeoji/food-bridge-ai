export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      donations: {
        Row: {
          best_before: string | null;
          claimed_by: string | null;
          created_at: string;
          donor_id: string;
          food_name: string;
          id: string;
          notes: string | null;
          pickup_address: string;
          quantity: number;
          status: string;
          pickup_code: string | null;
          delivery_address: string | null;
          volunteer_id: string | null;
          picked_up_at: string | null;
          delivered_at: string | null;
        };
        Insert: {
          best_before?: string | null;
          claimed_by?: string | null;
          created_at?: string;
          donor_id: string;
          food_name: string;
          id?: string;
          notes?: string | null;
          pickup_address: string;
          quantity: number;
          status?: string;
        };
        Update: {
          best_before?: string | null;
          claimed_by?: string | null;
          created_at?: string;
          donor_id?: string;
          food_name?: string;
          id?: string;
          notes?: string | null;
          pickup_address?: string;
          quantity?: number;
          status?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          capacity: number;
          created_at: string;
          id: string;
          organisation_name: string;
          organisation_type: string;
          phone: string;
        };
        Insert: {
          capacity?: number;
          created_at?: string;
          id: string;
          organisation_name?: string;
          organisation_type?: string;
          phone?: string;
        };
        Update: {
          capacity?: number;
          created_at?: string;
          id?: string;
          organisation_name?: string;
          organisation_type?: string;
          phone?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_donation: {
        Args: { p_donation_id: string; p_delivery_address?: string };
        Returns: Database["public"]["Tables"]["donations"]["Row"];
      };
      complete_donation: {
        Args: { p_donation_id: string };
        Returns: Database["public"]["Tables"]["donations"]["Row"];
      };
      accept_delivery: {
        Args: { p_donation_id: string };
        Returns: Database["public"]["Tables"]["donations"]["Row"];
      };
      confirm_pickup: {
        Args: { p_donation_id: string; p_pickup_code: string };
        Returns: Database["public"]["Tables"]["donations"]["Row"];
      };
      set_delivery_address: {
        Args: { p_donation_id: string; p_address: string };
        Returns: Database["public"]["Tables"]["donations"]["Row"];
      };
      available_deliveries: {
        Args: { p_offset?: number };
        Returns: {
          id: string;
          food_name: string;
          quantity: number;
          pickup_address: string;
          delivery_address: string;
          best_before: string;
        }[];
      };
      release_donation: {
        Args: { p_donation_id: string };
        Returns: Database["public"]["Tables"]["donations"]["Row"];
      };
      submit_contact_message: {
        Args: { p_name: string; p_email: string; p_message: string };
        Returns: boolean;
      };
      impact_stats: { Args: never; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
