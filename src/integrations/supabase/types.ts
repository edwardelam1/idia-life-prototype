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
          data_source_type: string | null
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
          data_source_type?: string | null
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
          data_source_type?: string | null
          error_details?: Json | null
          id?: string
          processing_stage?: string | null
          processing_status?: string | null
          raw_data_id?: string | null
          retry_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      raw_health_data: {
        Row: {
          created_at: string | null
          device_type: string | null
          id: string
          processed: boolean | null
          processing_completed_at: string | null
          processing_started_at: string | null
          raw_payload: Json
          recorded_at: string | null
          step_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          processed?: boolean | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          raw_payload: Json
          recorded_at?: string | null
          step_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          processed?: boolean | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          raw_payload?: Json
          recorded_at?: string | null
          step_count?: number | null
          user_id?: string | null
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
      remediation_plans: {
        Row: {
          actions: Json
          agent_name: string
          created_at: string
          explanation: string
          id: string
          security_event_id: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          agent_name: string
          created_at?: string
          explanation: string
          id?: string
          security_event_id?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          agent_name?: string
          created_at?: string
          explanation?: string
          id?: string
          security_event_id?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "remediation_plans_security_event_id_fkey"
            columns: ["security_event_id"]
            isOneToOne: false
            referencedRelation: "security_events"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          action_type: string
          agent_name: string
          created_at: string | null
          id: string
          resolved: boolean | null
          result_data: Json
          severity: string
          timestamp: string
        }
        Insert: {
          action_type: string
          agent_name: string
          created_at?: string | null
          id?: string
          resolved?: boolean | null
          result_data: Json
          severity?: string
          timestamp?: string
        }
        Update: {
          action_type?: string
          agent_name?: string
          created_at?: string | null
          id?: string
          resolved?: boolean | null
          result_data?: Json
          severity?: string
          timestamp?: string
        }
        Relationships: []
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
        Relationships: []
      }
      staged_health_data: {
        Row: {
          activity_type: string
          anonymized_location_hash: string | null
          anonymized_location_zone: string | null
          average_heartrate: number | null
          average_speed_mps: number | null
          awake_duration_minutes: number | null
          basal_body_temperature_celsius: number | null
          blood_oxygen_saturation: number | null
          body_fat_percentage: number | null
          body_mass_index: number | null
          body_temperature_celsius: number | null
          caffeine_mg: number | null
          calcium_mg: number | null
          calories_burned: number | null
          carbohydrates_g: number | null
          cervical_mucus_quality: string | null
          clinical_allergies: Json | null
          clinical_conditions: Json | null
          clinical_immunizations: Json | null
          clinical_lab_results: Json | null
          clinical_medications: Json | null
          clinical_procedures: Json | null
          clinical_vitals: Json | null
          core_sleep_duration_minutes: number | null
          created_at: string
          data_completeness_score: number | null
          data_quality_score: number | null
          deep_sleep_duration_minutes: number | null
          device_type: string | null
          diastolic_blood_pressure: number | null
          dietary_energy_kcal: number | null
          distance_cycling_meters: number | null
          distance_meters: number | null
          distance_walking_running_meters: number | null
          double_support_time_percentage: number | null
          duration_seconds: number | null
          ecg_classification: string | null
          effort_score: number | null
          elevation_gain_meters: number | null
          emotional_state: string | null
          fiber_g: number | null
          flights_climbed: number | null
          healthkit_source_bundles: Json | null
          heart_rate_variability_ms: number | null
          height_cm: number | null
          id: string
          iron_mg: number | null
          lean_body_mass_kg: number | null
          max_heartrate: number | null
          max_speed_mps: number | null
          medication_adherence_score: number | null
          medication_doses: Json | null
          menstrual_flow: string | null
          mindful_minutes: number | null
          monounsaturated_fat_g: number | null
          mood_score: number | null
          ovulation_test_result: string | null
          polyunsaturated_fat_g: number | null
          potassium_mg: number | null
          processed_at: string
          protein_g: number | null
          pseudo_user_id: string
          raw_data_id: string | null
          recovery_score: number | null
          rem_duration_minutes: number | null
          respiratory_rate_per_min: number | null
          resting_heart_rate: number | null
          saturated_fat_g: number | null
          sexual_activity: boolean | null
          sleep_duration: number | null
          sleep_quality_score: number | null
          sodium_mg: number | null
          step_length_cm: number | null
          steps_count: number | null
          stress_level: number | null
          sugar_g: number | null
          symptoms_logged: Json | null
          systolic_blood_pressure: number | null
          time_asleep_minutes: number | null
          time_in_bed_minutes: number | null
          total_fat_g: number | null
          vitamin_c_mg: number | null
          vitamin_d_mcg: number | null
          vo2_max: number | null
          waist_circumference_cm: number | null
          walking_asymmetry_percentage: number | null
          walking_speed_mps: number | null
          water_ml: number | null
          weather_conditions: Json | null
          weight_kg: number | null
          workout_intensity: number | null
        }
        Insert: {
          activity_type: string
          anonymized_location_hash?: string | null
          anonymized_location_zone?: string | null
          average_heartrate?: number | null
          average_speed_mps?: number | null
          awake_duration_minutes?: number | null
          basal_body_temperature_celsius?: number | null
          blood_oxygen_saturation?: number | null
          body_fat_percentage?: number | null
          body_mass_index?: number | null
          body_temperature_celsius?: number | null
          caffeine_mg?: number | null
          calcium_mg?: number | null
          calories_burned?: number | null
          carbohydrates_g?: number | null
          cervical_mucus_quality?: string | null
          clinical_allergies?: Json | null
          clinical_conditions?: Json | null
          clinical_immunizations?: Json | null
          clinical_lab_results?: Json | null
          clinical_medications?: Json | null
          clinical_procedures?: Json | null
          clinical_vitals?: Json | null
          core_sleep_duration_minutes?: number | null
          created_at?: string
          data_completeness_score?: number | null
          data_quality_score?: number | null
          deep_sleep_duration_minutes?: number | null
          device_type?: string | null
          diastolic_blood_pressure?: number | null
          dietary_energy_kcal?: number | null
          distance_cycling_meters?: number | null
          distance_meters?: number | null
          distance_walking_running_meters?: number | null
          double_support_time_percentage?: number | null
          duration_seconds?: number | null
          ecg_classification?: string | null
          effort_score?: number | null
          elevation_gain_meters?: number | null
          emotional_state?: string | null
          fiber_g?: number | null
          flights_climbed?: number | null
          healthkit_source_bundles?: Json | null
          heart_rate_variability_ms?: number | null
          height_cm?: number | null
          id?: string
          iron_mg?: number | null
          lean_body_mass_kg?: number | null
          max_heartrate?: number | null
          max_speed_mps?: number | null
          medication_adherence_score?: number | null
          medication_doses?: Json | null
          menstrual_flow?: string | null
          mindful_minutes?: number | null
          monounsaturated_fat_g?: number | null
          mood_score?: number | null
          ovulation_test_result?: string | null
          polyunsaturated_fat_g?: number | null
          potassium_mg?: number | null
          processed_at?: string
          protein_g?: number | null
          pseudo_user_id: string
          raw_data_id?: string | null
          recovery_score?: number | null
          rem_duration_minutes?: number | null
          respiratory_rate_per_min?: number | null
          resting_heart_rate?: number | null
          saturated_fat_g?: number | null
          sexual_activity?: boolean | null
          sleep_duration?: number | null
          sleep_quality_score?: number | null
          sodium_mg?: number | null
          step_length_cm?: number | null
          steps_count?: number | null
          stress_level?: number | null
          sugar_g?: number | null
          symptoms_logged?: Json | null
          systolic_blood_pressure?: number | null
          time_asleep_minutes?: number | null
          time_in_bed_minutes?: number | null
          total_fat_g?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_mcg?: number | null
          vo2_max?: number | null
          waist_circumference_cm?: number | null
          walking_asymmetry_percentage?: number | null
          walking_speed_mps?: number | null
          water_ml?: number | null
          weather_conditions?: Json | null
          weight_kg?: number | null
          workout_intensity?: number | null
        }
        Update: {
          activity_type?: string
          anonymized_location_hash?: string | null
          anonymized_location_zone?: string | null
          average_heartrate?: number | null
          average_speed_mps?: number | null
          awake_duration_minutes?: number | null
          basal_body_temperature_celsius?: number | null
          blood_oxygen_saturation?: number | null
          body_fat_percentage?: number | null
          body_mass_index?: number | null
          body_temperature_celsius?: number | null
          caffeine_mg?: number | null
          calcium_mg?: number | null
          calories_burned?: number | null
          carbohydrates_g?: number | null
          cervical_mucus_quality?: string | null
          clinical_allergies?: Json | null
          clinical_conditions?: Json | null
          clinical_immunizations?: Json | null
          clinical_lab_results?: Json | null
          clinical_medications?: Json | null
          clinical_procedures?: Json | null
          clinical_vitals?: Json | null
          core_sleep_duration_minutes?: number | null
          created_at?: string
          data_completeness_score?: number | null
          data_quality_score?: number | null
          deep_sleep_duration_minutes?: number | null
          device_type?: string | null
          diastolic_blood_pressure?: number | null
          dietary_energy_kcal?: number | null
          distance_cycling_meters?: number | null
          distance_meters?: number | null
          distance_walking_running_meters?: number | null
          double_support_time_percentage?: number | null
          duration_seconds?: number | null
          ecg_classification?: string | null
          effort_score?: number | null
          elevation_gain_meters?: number | null
          emotional_state?: string | null
          fiber_g?: number | null
          flights_climbed?: number | null
          healthkit_source_bundles?: Json | null
          heart_rate_variability_ms?: number | null
          height_cm?: number | null
          id?: string
          iron_mg?: number | null
          lean_body_mass_kg?: number | null
          max_heartrate?: number | null
          max_speed_mps?: number | null
          medication_adherence_score?: number | null
          medication_doses?: Json | null
          menstrual_flow?: string | null
          mindful_minutes?: number | null
          monounsaturated_fat_g?: number | null
          mood_score?: number | null
          ovulation_test_result?: string | null
          polyunsaturated_fat_g?: number | null
          potassium_mg?: number | null
          processed_at?: string
          protein_g?: number | null
          pseudo_user_id?: string
          raw_data_id?: string | null
          recovery_score?: number | null
          rem_duration_minutes?: number | null
          respiratory_rate_per_min?: number | null
          resting_heart_rate?: number | null
          saturated_fat_g?: number | null
          sexual_activity?: boolean | null
          sleep_duration?: number | null
          sleep_quality_score?: number | null
          sodium_mg?: number | null
          step_length_cm?: number | null
          steps_count?: number | null
          stress_level?: number | null
          sugar_g?: number | null
          symptoms_logged?: Json | null
          systolic_blood_pressure?: number | null
          time_asleep_minutes?: number | null
          time_in_bed_minutes?: number | null
          total_fat_g?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_mcg?: number | null
          vo2_max?: number | null
          waist_circumference_cm?: number | null
          walking_asymmetry_percentage?: number | null
          walking_speed_mps?: number | null
          water_ml?: number | null
          weather_conditions?: Json | null
          weight_kg?: number | null
          workout_intensity?: number | null
        }
        Relationships: []
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
      user_proposals: {
        Row: {
          ai_validation_feedback: string | null
          ai_validation_score: number | null
          category: string
          created_at: string
          description: string
          id: string
          status: string
          suggested_impact: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_validation_feedback?: string | null
          ai_validation_score?: number | null
          category: string
          created_at?: string
          description: string
          id?: string
          status?: string
          suggested_impact?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_validation_feedback?: string | null
          ai_validation_score?: number | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          status?: string
          suggested_impact?: string
          title?: string
          updated_at?: string
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
      calculate_comprehensive_data_quality_score: {
        Args: {
          p_basic_metrics_count?: number
          p_vitals_count?: number
          p_nutrition_count?: number
          p_sleep_data?: boolean
          p_clinical_data?: boolean
          p_symptoms_count?: number
        }
        Returns: number
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
      check_pipeline_health: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_raw_data: number
          unprocessed_raw_data: number
          processing_raw_data: number
          processed_raw_data: number
          total_staged_data: number
          unrewarded_staged_data: number
          total_transactions: number
        }[]
      }
      check_raw_health_data_duplicate: {
        Args: { p_step_count: number; p_recorded_at: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_orphaned_queue_items: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_pseudonym: {
        Args: { input_text: string }
        Returns: string
      }
      process_backlog_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          processed_count: number
          error_count: number
        }[]
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
