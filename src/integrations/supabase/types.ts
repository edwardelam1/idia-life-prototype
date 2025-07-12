export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      governance_proposals: {
        Row: {
          created_at: string | null
          created_by: string
          description: string
          id: string
          metadata: Json | null
          no_votes: number | null
          proposal_type: string
          status: string | null
          title: string
          total_tokens_voted: number | null
          voting_ends_at: string
          yes_votes: number | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description: string
          id?: string
          metadata?: Json | null
          no_votes?: number | null
          proposal_type: string
          status?: string | null
          title: string
          total_tokens_voted?: number | null
          voting_ends_at: string
          yes_votes?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string
          id?: string
          metadata?: Json | null
          no_votes?: number | null
          proposal_type?: string
          status?: string | null
          title?: string
          total_tokens_voted?: number | null
          voting_ends_at?: string
          yes_votes?: number | null
        }
        Relationships: []
      }
      governance_votes: {
        Row: {
          id: string
          proposal_id: string
          tokens_weight: number
          user_id: string
          vote: string
          voted_at: string | null
        }
        Insert: {
          id?: string
          proposal_id: string
          tokens_weight: number
          user_id: string
          vote: string
          voted_at?: string | null
        }
        Update: {
          id?: string
          proposal_id?: string
          tokens_weight?: number
          user_id?: string
          vote?: string
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "governance_votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "governance_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      health_metrics: {
        Row: {
          created_at: string | null
          id: string
          metric_type: string
          metric_value: number
          recorded_date: string
          source_data_ids: string[] | null
          unit: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_type: string
          metric_value: number
          recorded_date: string
          source_data_ids?: string[] | null
          unit: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_type?: string
          metric_value?: number
          recorded_date?: string
          source_data_ids?: string[] | null
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      raw_health_data: {
        Row: {
          created_at: string | null
          data_source: string
          data_type: string
          id: string
          processed: boolean | null
          processed_at: string | null
          raw_data: Json
          recorded_at: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_source: string
          data_type: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          raw_data: Json
          recorded_at: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_source?: string
          data_type?: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          raw_data?: Json
          recorded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rewards: {
        Row: {
          amount: number
          data_source: string
          description: string | null
          earned_at: string | null
          id: string
          reference_id: string | null
          reward_type: string
          user_id: string
        }
        Insert: {
          amount: number
          data_source: string
          description?: string | null
          earned_at?: string | null
          id?: string
          reference_id?: string | null
          reward_type: string
          user_id: string
        }
        Update: {
          amount?: number
          data_source?: string
          description?: string | null
          earned_at?: string | null
          id?: string
          reference_id?: string | null
          reward_type?: string
          user_id?: string
        }
        Relationships: []
      }
      staged_data: {
        Row: {
          created_at: string | null
          data_type: string
          id: string
          processed: boolean | null
          processed_at: string | null
          raw_data_id: string
          recorded_at: string
          reward_amount: number | null
          step_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_type: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          raw_data_id: string
          recorded_at: string
          reward_amount?: number | null
          step_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_type?: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          raw_data_id?: string
          recorded_at?: string
          reward_amount?: number | null
          step_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staged_data_raw_data_id_fkey"
            columns: ["raw_data_id"]
            isOneToOne: false
            referencedRelation: "raw_health_data"
            referencedColumns: ["id"]
          },
        ]
      }
      staged_health_data: {
        Row: {
          anonymized_data: Json
          created_at: string | null
          id: string
          location_zone: string | null
          pseudonym: string
          raw_data_id: string
          recorded_at: string
        }
        Insert: {
          anonymized_data: Json
          created_at?: string | null
          id?: string
          location_zone?: string | null
          pseudonym: string
          raw_data_id: string
          recorded_at: string
        }
        Update: {
          anonymized_data?: Json
          created_at?: string | null
          id?: string
          location_zone?: string | null
          pseudonym?: string
          raw_data_id?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staged_health_data_raw_data_id_fkey"
            columns: ["raw_data_id"]
            isOneToOne: false
            referencedRelation: "raw_health_data"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string
          id: string
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_connections: {
        Row: {
          connection_data: Json | null
          connection_status: string | null
          created_at: string | null
          id: string
          last_sync_at: string | null
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          connection_data?: Json | null
          connection_status?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          connection_data?: Json | null
          connection_status?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          total_earned: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          total_earned?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          total_earned?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      virtuous_cycle_impacts: {
        Row: {
          cost_in_tokens: number
          id: string
          impact_date: string | null
          impact_type: string
          impact_unit: string
          impact_value: number
          metadata: Json | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          cost_in_tokens: number
          id?: string
          impact_date?: string | null
          impact_type: string
          impact_unit: string
          impact_value: number
          metadata?: Json | null
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          cost_in_tokens?: number
          id?: string
          impact_date?: string | null
          impact_type?: string
          impact_unit?: string
          impact_value?: number
          metadata?: Json | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "virtuous_cycle_impacts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      anonymize_location: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_pseudonym: {
        Args: Record<PropertyKey, never>
        Returns: string
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
  public: {
    Enums: {},
  },
} as const
