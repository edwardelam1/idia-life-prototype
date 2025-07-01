export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bundle_generation_logs: {
        Row: {
          bundle_id: string | null
          created_at: string | null
          data_source_count: number | null
          generation_type: string
          id: string
          processing_duration: unknown | null
          quality_metrics: Json | null
        }
        Insert: {
          bundle_id?: string | null
          created_at?: string | null
          data_source_count?: number | null
          generation_type: string
          id?: string
          processing_duration?: unknown | null
          quality_metrics?: Json | null
        }
        Update: {
          bundle_id?: string | null
          created_at?: string | null
          data_source_count?: number | null
          generation_type?: string
          id?: string
          processing_duration?: unknown | null
          quality_metrics?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "bundle_generation_logs_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "marketplace_bundles"
            referencedColumns: ["bundle_id"]
          },
        ]
      }
      data_connections: {
        Row: {
          access_token: string | null
          connection_name: string
          connection_type: string
          created_at: string
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connection_name: string
          connection_type: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          connection_name?: string
          connection_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      data_processing_queue: {
        Row: {
          created_at: string | null
          error_details: Json | null
          id: string
          processing_stage: string | null
          processing_status: string | null
          raw_data_id: string | null
          retry_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_details?: Json | null
          id?: string
          processing_stage?: string | null
          processing_status?: string | null
          raw_data_id?: string | null
          retry_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_details?: Json | null
          id?: string
          processing_stage?: string | null
          processing_status?: string | null
          raw_data_id?: string | null
          retry_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_processing_queue_raw_data_id_fkey"
            columns: ["raw_data_id"]
            isOneToOne: false
            referencedRelation: "raw_strava_data"
            referencedColumns: ["id"]
          },
        ]
      }
      device_events: {
        Row: {
          event_timestamp: string
          event_type: string
          id: number
          json_payload: Json
          processed_at: string | null
          user_id: string
        }
        Insert: {
          event_timestamp?: string
          event_type: string
          id?: number
          json_payload: Json
          processed_at?: string | null
          user_id: string
        }
        Update: {
          event_timestamp?: string
          event_type?: string
          id?: number
          json_payload?: Json
          processed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      marketplace_bundles: {
        Row: {
          bundle_id: string
          bundle_version: number | null
          category: string
          contacts_count: number | null
          created_at: string | null
          data_json: Json
          data_points: string[] | null
          description: string
          features: string[] | null
          is_active: boolean | null
          key_insights: string[] | null
          match_percentage: number | null
          price: number
          suggested_filters: string[] | null
          tier: string
          title: string
          updated_at: string | null
        }
        Insert: {
          bundle_id?: string
          bundle_version?: number | null
          category: string
          contacts_count?: number | null
          created_at?: string | null
          data_json: Json
          data_points?: string[] | null
          description: string
          features?: string[] | null
          is_active?: boolean | null
          key_insights?: string[] | null
          match_percentage?: number | null
          price: number
          suggested_filters?: string[] | null
          tier: string
          title: string
          updated_at?: string | null
        }
        Update: {
          bundle_id?: string
          bundle_version?: number | null
          category?: string
          contacts_count?: number | null
          created_at?: string | null
          data_json?: Json
          data_points?: string[] | null
          description?: string
          features?: string[] | null
          is_active?: boolean | null
          key_insights?: string[] | null
          match_percentage?: number | null
          price?: number
          suggested_filters?: string[] | null
          tier?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      raw_strava_data: {
        Row: {
          activity_id: number
          connection_id: string
          id: string
          processed: boolean | null
          raw_data: Json
          received_at: string
          user_id: string
        }
        Insert: {
          activity_id: number
          connection_id: string
          id?: string
          processed?: boolean | null
          raw_data: Json
          received_at?: string
          user_id: string
        }
        Update: {
          activity_id?: number
          connection_id?: string
          id?: string
          processed?: boolean | null
          raw_data?: Json
          received_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_strava_data_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "data_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      staged_data: {
        Row: {
          activity_type: string
          anonymized_location_zone: string | null
          average_heartrate: number | null
          average_speed_mps: number | null
          device_type: string | null
          distance_meters: number | null
          duration_seconds: number | null
          effort_score: number | null
          elevation_gain_meters: number | null
          id: string
          max_heartrate: number | null
          max_speed_mps: number | null
          processed_at: string
          raw_data_id: string
          reward_amount: number | null
          reward_calculated: boolean | null
          user_id: string
          weather_conditions: Json | null
        }
        Insert: {
          activity_type: string
          anonymized_location_zone?: string | null
          average_heartrate?: number | null
          average_speed_mps?: number | null
          device_type?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          effort_score?: number | null
          elevation_gain_meters?: number | null
          id?: string
          max_heartrate?: number | null
          max_speed_mps?: number | null
          processed_at?: string
          raw_data_id: string
          reward_amount?: number | null
          reward_calculated?: boolean | null
          user_id: string
          weather_conditions?: Json | null
        }
        Update: {
          activity_type?: string
          anonymized_location_zone?: string | null
          average_heartrate?: number | null
          average_speed_mps?: number | null
          device_type?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          effort_score?: number | null
          elevation_gain_meters?: number | null
          id?: string
          max_heartrate?: number | null
          max_speed_mps?: number | null
          processed_at?: string
          raw_data_id?: string
          reward_amount?: number | null
          reward_calculated?: boolean | null
          user_id?: string
          weather_conditions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "staged_data_raw_data_id_fkey"
            columns: ["raw_data_id"]
            isOneToOne: false
            referencedRelation: "raw_strava_data"
            referencedColumns: ["id"]
          },
        ]
      }
      staged_health_data: {
        Row: {
          activity_type: string
          anonymized_location_hash: string | null
          anonymized_location_zone: string | null
          average_heartrate: number | null
          average_speed_mps: number | null
          calories_burned: number | null
          created_at: string
          data_quality_score: number | null
          device_type: string | null
          distance_meters: number | null
          duration_seconds: number | null
          effort_score: number | null
          elevation_gain_meters: number | null
          id: string
          max_heartrate: number | null
          max_speed_mps: number | null
          processed_at: string
          pseudo_user_id: string
          raw_data_id: string | null
          recovery_score: number | null
          resting_heart_rate: number | null
          sleep_duration: number | null
          sleep_quality_score: number | null
          steps_count: number | null
          stress_level: number | null
          weather_conditions: Json | null
          workout_intensity: number | null
        }
        Insert: {
          activity_type: string
          anonymized_location_hash?: string | null
          anonymized_location_zone?: string | null
          average_heartrate?: number | null
          average_speed_mps?: number | null
          calories_burned?: number | null
          created_at?: string
          data_quality_score?: number | null
          device_type?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          effort_score?: number | null
          elevation_gain_meters?: number | null
          id?: string
          max_heartrate?: number | null
          max_speed_mps?: number | null
          processed_at?: string
          pseudo_user_id: string
          raw_data_id?: string | null
          recovery_score?: number | null
          resting_heart_rate?: number | null
          sleep_duration?: number | null
          sleep_quality_score?: number | null
          steps_count?: number | null
          stress_level?: number | null
          weather_conditions?: Json | null
          workout_intensity?: number | null
        }
        Update: {
          activity_type?: string
          anonymized_location_hash?: string | null
          anonymized_location_zone?: string | null
          average_heartrate?: number | null
          average_speed_mps?: number | null
          calories_burned?: number | null
          created_at?: string
          data_quality_score?: number | null
          device_type?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          effort_score?: number | null
          elevation_gain_meters?: number | null
          id?: string
          max_heartrate?: number | null
          max_speed_mps?: number | null
          processed_at?: string
          pseudo_user_id?: string
          raw_data_id?: string | null
          recovery_score?: number | null
          resting_heart_rate?: number | null
          sleep_duration?: number | null
          sleep_quality_score?: number | null
          steps_count?: number | null
          stress_level?: number | null
          weather_conditions?: Json | null
          workout_intensity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staged_health_data_raw_data_id_fkey"
            columns: ["raw_data_id"]
            isOneToOne: false
            referencedRelation: "raw_strava_data"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          source: string | null
          status: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          source?: string | null
          status?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          source?: string | null
          status?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          created_at: string
          id: string
          idia_usd_balance: number | null
          total_earned: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idia_usd_balance?: number | null
          total_earned?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idia_usd_balance?: number | null
          total_earned?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      anonymize_location: {
        Args: { lat: number; lng: number }
        Returns: string
      }
      calculate_data_quality_score: {
        Args: {
          p_heartrate: number
          p_elevation: number
          p_duration: number
          p_distance: number
        }
        Returns: number
      }
      generate_pseudonym: {
        Args: { input_text: string }
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
