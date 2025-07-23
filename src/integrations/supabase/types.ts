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
      affiliate_campaigns: {
        Row: {
          budget_allocation: number | null
          business_id: string
          campaign_name: string
          campaign_type: string
          commission_rate: number | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          start_date: string
          status: string | null
          target_audience: Json | null
          updated_at: string | null
        }
        Insert: {
          budget_allocation?: number | null
          business_id: string
          campaign_name: string
          campaign_type?: string
          commission_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          start_date: string
          status?: string | null
          target_audience?: Json | null
          updated_at?: string | null
        }
        Update: {
          budget_allocation?: number | null
          business_id?: string
          campaign_name?: string
          campaign_type?: string
          commission_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          start_date?: string
          status?: string | null
          target_audience?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_transactions: {
        Row: {
          campaign_id: string
          commission_amount: number | null
          created_at: string | null
          creator_id: string
          id: string
          metadata: Json | null
          tracking_code: string | null
          transaction_type: string
          transaction_value: number | null
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          commission_amount?: number | null
          created_at?: string | null
          creator_id: string
          id?: string
          metadata?: Json | null
          tracking_code?: string | null
          transaction_type: string
          transaction_value?: number | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          commission_amount?: number | null
          created_at?: string | null
          creator_id?: string
          id?: string
          metadata?: Json | null
          tracking_code?: string | null
          transaction_type?: string
          transaction_value?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_transactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "affiliate_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_transactions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_content_assets: {
        Row: {
          ar_experience_id: string | null
          asset_metadata: Json | null
          asset_type: string
          asset_url: string
          created_at: string | null
          file_size_bytes: number | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          ar_experience_id?: string | null
          asset_metadata?: Json | null
          asset_type: string
          asset_url: string
          created_at?: string | null
          file_size_bytes?: number | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          ar_experience_id?: string | null
          asset_metadata?: Json | null
          asset_type?: string
          asset_url?: string
          created_at?: string | null
          file_size_bytes?: number | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_content_assets_ar_experience_id_fkey"
            columns: ["ar_experience_id"]
            isOneToOne: false
            referencedRelation: "ar_experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_experiences: {
        Row: {
          business_id: string
          content_version: number
          created_at: string | null
          description: string | null
          experience_type: string
          id: string
          interaction_triggers: Json | null
          is_active: boolean | null
          performance_metrics: Json | null
          spatial_anchor_data: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          content_version?: number
          created_at?: string | null
          description?: string | null
          experience_type?: string
          id?: string
          interaction_triggers?: Json | null
          is_active?: boolean | null
          performance_metrics?: Json | null
          spatial_anchor_data?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          content_version?: number
          created_at?: string | null
          description?: string | null
          experience_type?: string
          id?: string
          interaction_triggers?: Json | null
          is_active?: boolean | null
          performance_metrics?: Json | null
          spatial_anchor_data?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_experiences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_interactions: {
        Row: {
          ar_experience_id: string
          created_at: string | null
          customer_session_id: string | null
          duration_seconds: number | null
          id: string
          interaction_type: string
          location_id: string | null
          resulted_in_purchase: boolean | null
        }
        Insert: {
          ar_experience_id: string
          created_at?: string | null
          customer_session_id?: string | null
          duration_seconds?: number | null
          id?: string
          interaction_type: string
          location_id?: string | null
          resulted_in_purchase?: boolean | null
        }
        Update: {
          ar_experience_id?: string
          created_at?: string | null
          customer_session_id?: string | null
          duration_seconds?: number | null
          id?: string
          interaction_type?: string
          location_id?: string | null
          resulted_in_purchase?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_interactions_ar_experience_id_fkey"
            columns: ["ar_experience_id"]
            isOneToOne: false
            referencedRelation: "ar_menu_experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_interactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_menu_experiences: {
        Row: {
          ar_model_url: string | null
          conversion_rate: number | null
          created_at: string | null
          experience_type: string | null
          id: string
          interaction_count: number | null
          is_active: boolean | null
          menu_item_id: string
        }
        Insert: {
          ar_model_url?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          experience_type?: string | null
          id?: string
          interaction_count?: number | null
          is_active?: boolean | null
          menu_item_id: string
        }
        Update: {
          ar_model_url?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          experience_type?: string | null
          id?: string
          interaction_count?: number | null
          is_active?: boolean | null
          menu_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_menu_experiences_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_placement_zones: {
        Row: {
          ar_experience_id: string | null
          business_id: string
          created_at: string | null
          geospatial_bounds: Json
          id: string
          is_active: boolean | null
          location_id: string | null
          placement_rules: Json | null
          zone_name: string
        }
        Insert: {
          ar_experience_id?: string | null
          business_id: string
          created_at?: string | null
          geospatial_bounds: Json
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          placement_rules?: Json | null
          zone_name: string
        }
        Update: {
          ar_experience_id?: string | null
          business_id?: string
          created_at?: string | null
          geospatial_bounds?: Json
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          placement_rules?: Json | null
          zone_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_placement_zones_ar_experience_id_fkey"
            columns: ["ar_experience_id"]
            isOneToOne: false
            referencedRelation: "ar_experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_placement_zones_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_placement_zones_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_user_interactions: {
        Row: {
          ar_experience_id: string | null
          created_at: string | null
          device_info: Json | null
          duration_seconds: number | null
          id: string
          interaction_data: Json
          interaction_type: string
          location_data: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          ar_experience_id?: string | null
          created_at?: string | null
          device_info?: Json | null
          duration_seconds?: number | null
          id?: string
          interaction_data: Json
          interaction_type: string
          location_data?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          ar_experience_id?: string | null
          created_at?: string | null
          device_info?: Json | null
          duration_seconds?: number | null
          id?: string
          interaction_data?: Json
          interaction_type?: string
          location_data?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_user_interactions_ar_experience_id_fkey"
            columns: ["ar_experience_id"]
            isOneToOne: false
            referencedRelation: "ar_experiences"
            referencedColumns: ["id"]
          },
        ]
      }
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
      business_health_metrics: {
        Row: {
          business_id: string
          created_at: string | null
          customer_score: number | null
          id: string
          inventory_score: number | null
          labor_score: number | null
          location_id: string | null
          metric_date: string
          overall_bhi_score: number | null
          sales_score: number | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          customer_score?: number | null
          id?: string
          inventory_score?: number | null
          labor_score?: number | null
          location_id?: string | null
          metric_date: string
          overall_bhi_score?: number | null
          sales_score?: number | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          customer_score?: number | null
          id?: string
          inventory_score?: number | null
          labor_score?: number | null
          location_id?: string | null
          metric_date?: string
          overall_bhi_score?: number | null
          sales_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_health_metrics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_health_metrics_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_locations: {
        Row: {
          address: string
          business_id: string
          contact_email: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_health_check: string | null
          manager_name: string | null
          name: string
          operating_hours: Json | null
          phone: string | null
          pos_terminal_count: number | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          business_id: string
          contact_email?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_health_check?: string | null
          manager_name?: string | null
          name: string
          operating_hours?: Json | null
          phone?: string | null
          pos_terminal_count?: number | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          business_id?: string
          contact_email?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_health_check?: string | null
          manager_name?: string | null
          name?: string
          operating_hours?: Json | null
          phone?: string | null
          pos_terminal_count?: number | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_locations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_user_permissions: {
        Row: {
          business_user_id: string
          created_at: string | null
          id: string
          permission_key: string
          permission_value: boolean | null
          updated_at: string | null
        }
        Insert: {
          business_user_id: string
          created_at?: string | null
          id?: string
          permission_key: string
          permission_value?: boolean | null
          updated_at?: string | null
        }
        Update: {
          business_user_id?: string
          created_at?: string | null
          id?: string
          permission_key?: string
          permission_value?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_user_permissions_business_user_id_fkey"
            columns: ["business_user_id"]
            isOneToOne: false
            referencedRelation: "business_users"
            referencedColumns: ["id"]
          },
        ]
      }
      business_users: {
        Row: {
          accepted_at: string | null
          assigned_locations: string[] | null
          business_id: string
          created_at: string | null
          id: string
          invited_at: string | null
          is_active: boolean | null
          last_login: string | null
          notification_preferences: Json | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_locations?: string[] | null
          business_id: string
          created_at?: string | null
          id?: string
          invited_at?: string | null
          is_active?: boolean | null
          last_login?: string | null
          notification_preferences?: Json | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          assigned_locations?: string[] | null
          business_id?: string
          created_at?: string | null
          id?: string
          invited_at?: string | null
          is_active?: boolean | null
          last_login?: string | null
          notification_preferences?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_wallets: {
        Row: {
          balance: number | null
          business_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          wallet_address: string
          wallet_type: string | null
        }
        Insert: {
          balance?: number | null
          business_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          wallet_address: string
          wallet_type?: string | null
        }
        Update: {
          balance?: number | null
          business_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          wallet_address?: string
          wallet_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_wallets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          business_health_score: number | null
          business_type: string
          created_at: string | null
          data_coop_enabled: boolean | null
          email: string | null
          franchise_parent_id: string | null
          id: string
          name: string
          phone: string | null
          subscription_tier: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          business_health_score?: number | null
          business_type: string
          created_at?: string | null
          data_coop_enabled?: boolean | null
          email?: string | null
          franchise_parent_id?: string | null
          id?: string
          name: string
          phone?: string | null
          subscription_tier?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          business_health_score?: number | null
          business_type?: string
          created_at?: string | null
          data_coop_enabled?: boolean | null
          email?: string | null
          franchise_parent_id?: string | null
          id?: string
          name?: string
          phone?: string | null
          subscription_tier?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_franchise_parent_id_fkey"
            columns: ["franchise_parent_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_performance: {
        Row: {
          campaign_id: string
          created_at: string | null
          id: string
          location_id: string | null
          new_customers_acquired: number | null
          report_date: string | null
          revenue_generated: number | null
          total_discount_given: number | null
          usage_count: number | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          id?: string
          location_id?: string | null
          new_customers_acquired?: number | null
          report_date?: string | null
          revenue_generated?: number | null
          total_discount_given?: number | null
          usage_count?: number | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          id?: string
          location_id?: string | null
          new_customers_acquired?: number | null
          report_date?: string | null
          revenue_generated?: number | null
          total_discount_given?: number | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_performance_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "promotional_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_performance_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_profiles: {
        Row: {
          created_at: string | null
          creator_handle: string
          engagement_rate: number | null
          follower_count: number | null
          id: string
          performance_rating: number | null
          profile_metadata: Json | null
          specialty_categories: string[] | null
          total_earnings: number | null
          updated_at: string | null
          user_id: string
          verification_status: string | null
        }
        Insert: {
          created_at?: string | null
          creator_handle: string
          engagement_rate?: number | null
          follower_count?: number | null
          id?: string
          performance_rating?: number | null
          profile_metadata?: Json | null
          specialty_categories?: string[] | null
          total_earnings?: number | null
          updated_at?: string | null
          user_id: string
          verification_status?: string | null
        }
        Update: {
          created_at?: string | null
          creator_handle?: string
          engagement_rate?: number | null
          follower_count?: number | null
          id?: string
          performance_rating?: number | null
          profile_metadata?: Json | null
          specialty_categories?: string[] | null
          total_earnings?: number | null
          updated_at?: string | null
          user_id?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      customer_analytics: {
        Row: {
          analysis_date: string | null
          average_spend: number | null
          business_id: string
          created_at: string | null
          customer_segment: string
          id: string
          last_visit_days: number | null
          lifetime_value: number | null
          total_visits: number | null
          visit_frequency: number | null
        }
        Insert: {
          analysis_date?: string | null
          average_spend?: number | null
          business_id: string
          created_at?: string | null
          customer_segment: string
          id?: string
          last_visit_days?: number | null
          lifetime_value?: number | null
          total_visits?: number | null
          visit_frequency?: number | null
        }
        Update: {
          analysis_date?: string | null
          average_spend?: number | null
          business_id?: string
          created_at?: string | null
          customer_segment?: string
          id?: string
          last_visit_days?: number | null
          lifetime_value?: number | null
          total_visits?: number | null
          visit_frequency?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_analytics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
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
      data_monetization: {
        Row: {
          business_id: string
          created_at: string | null
          data_category: string
          data_points_shared: number | null
          id: string
          payment_status: string | null
          revenue_earned: number | null
          usage_period: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          data_category: string
          data_points_shared?: number | null
          id?: string
          payment_status?: string | null
          revenue_earned?: number | null
          usage_period: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          data_category?: string
          data_points_shared?: number | null
          id?: string
          payment_status?: string | null
          revenue_earned?: number | null
          usage_period?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_monetization_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
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
      data_sharing_preferences: {
        Row: {
          anonymization_level: string | null
          business_id: string
          category: string
          compensation_rate: number | null
          id: string
          sharing_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          anonymization_level?: string | null
          business_id: string
          category: string
          compensation_rate?: number | null
          id?: string
          sharing_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          anonymization_level?: string | null
          business_id?: string
          category?: string
          compensation_rate?: number | null
          id?: string
          sharing_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_sharing_preferences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      demographic_clusters: {
        Row: {
          behavior_patterns: Json
          cluster_name: string
          cluster_size: number | null
          confidence_score: number | null
          created_at: string | null
          demographic_profile: Json
          geographic_bounds: Json
          id: string
          updated_at: string | null
        }
        Insert: {
          behavior_patterns: Json
          cluster_name: string
          cluster_size?: number | null
          confidence_score?: number | null
          created_at?: string | null
          demographic_profile: Json
          geographic_bounds: Json
          id?: string
          updated_at?: string | null
        }
        Update: {
          behavior_patterns?: Json
          cluster_name?: string
          cluster_size?: number | null
          confidence_score?: number | null
          created_at?: string | null
          demographic_profile?: Json
          geographic_bounds?: Json
          id?: string
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
      economic_impact_metrics: {
        Row: {
          business_id: string | null
          calculated_at: string | null
          comparison_period: Json
          confidence_interval: Json | null
          id: string
          location_id: string | null
          methodology: string | null
          metric_category: string
          metric_value: number
        }
        Insert: {
          business_id?: string | null
          calculated_at?: string | null
          comparison_period: Json
          confidence_interval?: Json | null
          id?: string
          location_id?: string | null
          methodology?: string | null
          metric_category: string
          metric_value: number
        }
        Update: {
          business_id?: string | null
          calculated_at?: string | null
          comparison_period?: Json
          confidence_interval?: Json | null
          id?: string
          location_id?: string | null
          methodology?: string | null
          metric_category?: string
          metric_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "economic_impact_metrics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "economic_impact_metrics_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_schedules: {
        Row: {
          created_at: string | null
          created_by: string | null
          employee_id: string
          id: string
          location_id: string
          notes: string | null
          role_assignment: string | null
          shift_end: string
          shift_start: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          employee_id: string
          id?: string
          location_id: string
          notes?: string | null
          role_assignment?: string | null
          shift_end: string
          shift_start: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          employee_id?: string
          id?: string
          location_id?: string
          notes?: string | null
          role_assignment?: string | null
          shift_end?: string
          shift_start?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_timesheets: {
        Row: {
          approval_status: string | null
          approved_by: string | null
          break_minutes: number | null
          clock_in: string
          clock_in_method: string | null
          clock_out: string | null
          clock_out_method: string | null
          created_at: string | null
          employee_id: string
          hourly_rate: number | null
          id: string
          location_id: string
          notes: string | null
          overtime_hours: number | null
          overtime_rate: number | null
          total_hours: number | null
          updated_at: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_by?: string | null
          break_minutes?: number | null
          clock_in: string
          clock_in_method?: string | null
          clock_out?: string | null
          clock_out_method?: string | null
          created_at?: string | null
          employee_id: string
          hourly_rate?: number | null
          id?: string
          location_id: string
          notes?: string | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_by?: string | null
          break_minutes?: number | null
          clock_in?: string
          clock_in_method?: string | null
          clock_out?: string | null
          clock_out_method?: string | null
          created_at?: string | null
          employee_id?: string
          hourly_rate?: number | null
          id?: string
          location_id?: string
          notes?: string | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_timesheets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      franchise_agreements: {
        Row: {
          agreement_end_date: string | null
          agreement_start_date: string
          created_at: string | null
          franchisee_business_id: string
          franchisor_business_id: string
          id: string
          marketing_fee_percentage: number | null
          royalty_percentage: number
          status: string | null
          territory_description: string | null
        }
        Insert: {
          agreement_end_date?: string | null
          agreement_start_date: string
          created_at?: string | null
          franchisee_business_id: string
          franchisor_business_id: string
          id?: string
          marketing_fee_percentage?: number | null
          royalty_percentage: number
          status?: string | null
          territory_description?: string | null
        }
        Update: {
          agreement_end_date?: string | null
          agreement_start_date?: string
          created_at?: string | null
          franchisee_business_id?: string
          franchisor_business_id?: string
          id?: string
          marketing_fee_percentage?: number | null
          royalty_percentage?: number
          status?: string | null
          territory_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "franchise_agreements_franchisee_business_id_fkey"
            columns: ["franchisee_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franchise_agreements_franchisor_business_id_fkey"
            columns: ["franchisor_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      geospatial_analytics: {
        Row: {
          analysis_period: Json
          analysis_type: string
          created_at: string | null
          geographic_bounds: Json
          id: string
          results: Json
          updated_at: string | null
        }
        Insert: {
          analysis_period: Json
          analysis_type: string
          created_at?: string | null
          geographic_bounds: Json
          id?: string
          results: Json
          updated_at?: string | null
        }
        Update: {
          analysis_period?: Json
          analysis_type?: string
          created_at?: string | null
          geographic_bounds?: Json
          id?: string
          results?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      gift_card_transactions: {
        Row: {
          amount: number
          created_at: string | null
          gift_card_id: string
          id: string
          location_id: string | null
          pos_transaction_id: string | null
          processed_by: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          gift_card_id: string
          id?: string
          location_id?: string | null
          pos_transaction_id?: string | null
          processed_by?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          gift_card_id?: string
          id?: string
          location_id?: string | null
          pos_transaction_id?: string | null
          processed_by?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_transactions_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_transactions_pos_transaction_id_fkey"
            columns: ["pos_transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          business_id: string
          card_code: string
          created_at: string | null
          current_balance: number
          customer_email: string | null
          expires_at: string | null
          id: string
          initial_amount: number
          is_active: boolean | null
          issued_by: string | null
          last_used_at: string | null
          purchase_transaction_id: string | null
          qr_code_data: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          business_id: string
          card_code: string
          created_at?: string | null
          current_balance: number
          customer_email?: string | null
          expires_at?: string | null
          id?: string
          initial_amount: number
          is_active?: boolean | null
          issued_by?: string | null
          last_used_at?: string | null
          purchase_transaction_id?: string | null
          qr_code_data?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          business_id?: string
          card_code?: string
          created_at?: string | null
          current_balance?: number
          customer_email?: string | null
          expires_at?: string | null
          id?: string
          initial_amount?: number
          is_active?: boolean | null
          issued_by?: string | null
          last_used_at?: string | null
          purchase_transaction_id?: string | null
          qr_code_data?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_cards_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      health_metrics: {
        Row: {
          activity_type: string
          calories_burned: number | null
          created_at: string | null
          device_type: string | null
          distance_meters: number | null
          duration_seconds: number | null
          heart_rate: number | null
          id: string
          raw_data: Json | null
          recorded_at: string | null
          step_count: number | null
          user_id: string | null
        }
        Insert: {
          activity_type?: string
          calories_burned?: number | null
          created_at?: string | null
          device_type?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          heart_rate?: number | null
          id?: string
          raw_data?: Json | null
          recorded_at?: string | null
          step_count?: number | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          calories_burned?: number | null
          created_at?: string | null
          device_type?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          heart_rate?: number | null
          id?: string
          raw_data?: Json | null
          recorded_at?: string | null
          step_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      idia_payments: {
        Row: {
          amount_idia_usd: number
          blockchain_hash: string | null
          confirmation_status: string | null
          created_at: string | null
          exchange_rate_usd: number
          id: string
          network_fee: number | null
          transaction_id: string
          wallet_address: string
        }
        Insert: {
          amount_idia_usd: number
          blockchain_hash?: string | null
          confirmation_status?: string | null
          created_at?: string | null
          exchange_rate_usd: number
          id?: string
          network_fee?: number | null
          transaction_id: string
          wallet_address: string
        }
        Update: {
          amount_idia_usd?: number
          blockchain_hash?: string | null
          confirmation_status?: string | null
          created_at?: string | null
          exchange_rate_usd?: number
          id?: string
          network_fee?: number | null
          transaction_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "idia_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          barcode: string | null
          business_id: string
          category: string
          created_at: string | null
          current_cost: number | null
          id: string
          is_active: boolean | null
          lead_time_days: number | null
          minimum_order_quantity: number | null
          name: string
          par_level: number | null
          shelf_life_days: number | null
          storage_requirements: string | null
          supplier_id: string | null
          unit_of_measure: string
          updated_at: string | null
          vendor_sku: string | null
        }
        Insert: {
          barcode?: string | null
          business_id: string
          category: string
          created_at?: string | null
          current_cost?: number | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          minimum_order_quantity?: number | null
          name: string
          par_level?: number | null
          shelf_life_days?: number | null
          storage_requirements?: string | null
          supplier_id?: string | null
          unit_of_measure: string
          updated_at?: string | null
          vendor_sku?: string | null
        }
        Update: {
          barcode?: string | null
          business_id?: string
          category?: string
          created_at?: string | null
          current_cost?: number | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          minimum_order_quantity?: number | null
          name?: string
          par_level?: number | null
          shelf_life_days?: number | null
          storage_requirements?: string | null
          supplier_id?: string | null
          unit_of_measure?: string
          updated_at?: string | null
          vendor_sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string | null
          id: string
          inventory_item_id: string
          location_id: string
          movement_type: string
          notes: string | null
          quantity: number
          recorded_by: string | null
          reference_id: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_item_id: string
          location_id: string
          movement_type: string
          notes?: string | null
          quantity: number
          recorded_by?: string | null
          reference_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_item_id?: string
          location_id?: string
          movement_type?: string
          notes?: string | null
          quantity?: number
          recorded_by?: string | null
          reference_id?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          inventory_item_id: string | null
          invoice_id: string
          line_total: number
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          inventory_item_id?: string | null
          invoice_id: string
          line_total: number
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          inventory_item_id?: string | null
          invoice_id?: string
          line_total?: number
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          business_id: string
          created_at: string | null
          discount_amount: number | null
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          is_tokenized: boolean | null
          late_fee_amount: number | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_terms_days: number | null
          status: string | null
          subtotal: number
          supplier_id: string
          tax_amount: number
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          discount_amount?: number | null
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          is_tokenized?: boolean | null
          late_fee_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_terms_days?: number | null
          status?: string | null
          subtotal: number
          supplier_id: string
          tax_amount: number
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          discount_amount?: number | null
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          is_tokenized?: boolean | null
          late_fee_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_terms_days?: number | null
          status?: string | null
          subtotal?: number
          supplier_id?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      location_inventory: {
        Row: {
          cost_per_unit: number | null
          created_at: string | null
          current_stock: number | null
          expiration_date: string | null
          id: string
          inventory_item_id: string
          last_counted_at: string | null
          location_id: string
          lot_number: string | null
          max_stock_level: number | null
          par_level: number | null
          reorder_point: number | null
          updated_at: string | null
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          expiration_date?: string | null
          id?: string
          inventory_item_id: string
          last_counted_at?: string | null
          location_id: string
          lot_number?: string | null
          max_stock_level?: number | null
          par_level?: number | null
          reorder_point?: number | null
          updated_at?: string | null
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          expiration_date?: string | null
          id?: string
          inventory_item_id?: string
          last_counted_at?: string | null
          location_id?: string
          lot_number?: string | null
          max_stock_level?: number | null
          par_level?: number | null
          reorder_point?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_inventory_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_menu_items: {
        Row: {
          created_at: string | null
          id: string
          is_available: boolean | null
          local_price: number | null
          location_id: string
          menu_item_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          local_price?: number | null
          location_id: string
          menu_item_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          local_price?: number | null
          location_id?: string
          menu_item_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_menu_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_menu_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      location_menu_pricing: {
        Row: {
          approved_by: string | null
          created_at: string | null
          effective_from: string | null
          effective_until: string | null
          id: string
          location_id: string
          menu_item_id: string
          override_price: number
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          location_id: string
          menu_item_id: string
          override_price: number
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          location_id?: string
          menu_item_id?: string
          override_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "location_menu_pricing_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_menu_pricing_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_taglines: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          tagline: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          tagline: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          tagline?: string
          weight?: number | null
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
      menu_items: {
        Row: {
          allergen_info: Json | null
          ar_interaction_count: number | null
          ar_model_url: string | null
          ar_placement_data: Json | null
          base_price: number
          business_id: string
          calories: number | null
          category: string
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_locked: boolean | null
          menu_status: string | null
          name: string
          preparation_time: number | null
          promotion_eligible: boolean | null
          recipe_id: string | null
          recipe_ingredients: Json | null
          seasonal: boolean | null
          updated_at: string | null
        }
        Insert: {
          allergen_info?: Json | null
          ar_interaction_count?: number | null
          ar_model_url?: string | null
          ar_placement_data?: Json | null
          base_price: number
          business_id: string
          calories?: number | null
          category: string
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_locked?: boolean | null
          menu_status?: string | null
          name: string
          preparation_time?: number | null
          promotion_eligible?: boolean | null
          recipe_id?: string | null
          recipe_ingredients?: Json | null
          seasonal?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allergen_info?: Json | null
          ar_interaction_count?: number | null
          ar_model_url?: string | null
          ar_placement_data?: Json | null
          base_price?: number
          business_id?: string
          calories?: number | null
          category?: string
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_locked?: boolean | null
          menu_status?: string | null
          name?: string
          preparation_time?: number | null
          promotion_eligible?: boolean | null
          recipe_id?: string | null
          recipe_ingredients?: Json | null
          seasonal?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
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
      payment_methods: {
        Row: {
          accepts_idia_usd: boolean | null
          business_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          method_name: string
          processing_fee_percentage: number | null
          processor: string
        }
        Insert: {
          accepts_idia_usd?: boolean | null
          business_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          method_name: string
          processing_fee_percentage?: number | null
          processor: string
        }
        Update: {
          accepts_idia_usd?: boolean | null
          business_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          method_name?: string
          processing_fee_percentage?: number | null
          processor?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          additional_data: Json | null
          entity_id: string
          entity_type: string
          id: string
          metric_type: string
          metric_value: number
          recorded_at: string | null
          time_period: string
        }
        Insert: {
          additional_data?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          metric_type: string
          metric_value: number
          recorded_at?: string | null
          time_period: string
        }
        Update: {
          additional_data?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          metric_type?: string
          metric_value?: number
          recorded_at?: string | null
          time_period?: string
        }
        Relationships: []
      }
      pos_transactions: {
        Row: {
          ar_experience_id: string | null
          cashier_id: string | null
          created_at: string | null
          customer_id: string | null
          discount_amount: number | null
          id: string
          idia_usd_amount: number | null
          initiated_via_ar: boolean | null
          location_id: string
          loyalty_points_earned: number | null
          payment_method: string
          payment_processor: string | null
          payment_status: string | null
          receipt_sent: boolean | null
          subtotal: number
          tax_amount: number
          tip_amount: number | null
          total_amount: number
          transaction_items: Json
          transaction_number: string
          transaction_reference: string | null
        }
        Insert: {
          ar_experience_id?: string | null
          cashier_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          idia_usd_amount?: number | null
          initiated_via_ar?: boolean | null
          location_id: string
          loyalty_points_earned?: number | null
          payment_method: string
          payment_processor?: string | null
          payment_status?: string | null
          receipt_sent?: boolean | null
          subtotal: number
          tax_amount: number
          tip_amount?: number | null
          total_amount: number
          transaction_items?: Json
          transaction_number: string
          transaction_reference?: string | null
        }
        Update: {
          ar_experience_id?: string | null
          cashier_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          idia_usd_amount?: number | null
          initiated_via_ar?: boolean | null
          location_id?: string
          loyalty_points_earned?: number | null
          payment_method?: string
          payment_processor?: string | null
          payment_status?: string | null
          receipt_sent?: boolean | null
          subtotal?: number
          tax_amount?: number
          tip_amount?: number | null
          total_amount?: number
          transaction_items?: Json
          transaction_number?: string
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_transactions_ar_experience_id_fkey"
            columns: ["ar_experience_id"]
            isOneToOne: false
            referencedRelation: "ar_experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_preferences: string[] | null
          age: number | null
          bio: string | null
          created_at: string | null
          first_name: string | null
          gender: string | null
          health_goals: string[] | null
          id: string
          interests: string[] | null
          last_name: string | null
          location: string | null
          middle_name: string | null
          occupation: string | null
          suffix: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_preferences?: string[] | null
          age?: number | null
          bio?: string | null
          created_at?: string | null
          first_name?: string | null
          gender?: string | null
          health_goals?: string[] | null
          id?: string
          interests?: string[] | null
          last_name?: string | null
          location?: string | null
          middle_name?: string | null
          occupation?: string | null
          suffix?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_preferences?: string[] | null
          age?: number | null
          bio?: string | null
          created_at?: string | null
          first_name?: string | null
          gender?: string | null
          health_goals?: string[] | null
          id?: string
          interests?: string[] | null
          last_name?: string | null
          location?: string | null
          middle_name?: string | null
          occupation?: string | null
          suffix?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      promotional_campaigns: {
        Row: {
          applicable_items: Json | null
          business_id: string
          campaign_name: string
          campaign_type: string
          created_at: string | null
          created_by: string | null
          discount_value: number | null
          end_date: string
          id: string
          is_active: boolean | null
          max_uses_per_customer: number | null
          minimum_purchase: number | null
          start_date: string
          target_locations: string[] | null
          total_budget: number | null
        }
        Insert: {
          applicable_items?: Json | null
          business_id: string
          campaign_name: string
          campaign_type: string
          created_at?: string | null
          created_by?: string | null
          discount_value?: number | null
          end_date: string
          id?: string
          is_active?: boolean | null
          max_uses_per_customer?: number | null
          minimum_purchase?: number | null
          start_date: string
          target_locations?: string[] | null
          total_budget?: number | null
        }
        Update: {
          applicable_items?: Json | null
          business_id?: string
          campaign_name?: string
          campaign_type?: string
          created_at?: string | null
          created_by?: string | null
          discount_value?: number | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          max_uses_per_customer?: number | null
          minimum_purchase?: number | null
          start_date?: string
          target_locations?: string[] | null
          total_budget?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promotional_campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_health_data: {
        Row: {
          created_at: string | null
          device_type: string | null
          id: string
          last_error: string | null
          next_retry_at: string | null
          processed: boolean | null
          processing_completed_at: string | null
          processing_started_at: string | null
          processing_status: string | null
          raw_payload: Json
          recorded_at: string | null
          retry_count: number | null
          source: string | null
          step_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          processed?: boolean | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          processing_status?: string | null
          raw_payload: Json
          recorded_at?: string | null
          retry_count?: number | null
          source?: string | null
          step_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          processed?: boolean | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          processing_status?: string | null
          raw_payload?: Json
          recorded_at?: string | null
          retry_count?: number | null
          source?: string | null
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
      recipe_ingredients: {
        Row: {
          created_at: string | null
          id: string
          inventory_item_id: string
          notes: string | null
          quantity: number
          recipe_id: string
          unit: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_item_id: string
          notes?: string | null
          quantity?: number
          recipe_id: string
          unit: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_item_id?: string
          notes?: string | null
          quantity?: number
          recipe_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          allergens: Json | null
          business_id: string
          category: string
          cook_time: number | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          id: string
          instructions: Json | null
          is_active: boolean | null
          name: string
          prep_time: number | null
          servings: number | null
          updated_at: string | null
        }
        Insert: {
          allergens?: Json | null
          business_id: string
          category?: string
          cook_time?: number | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          instructions?: Json | null
          is_active?: boolean | null
          name: string
          prep_time?: number | null
          servings?: number | null
          updated_at?: string | null
        }
        Update: {
          allergens?: Json | null
          business_id?: string
          category?: string
          cook_time?: number | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          instructions?: Json | null
          is_active?: boolean | null
          name?: string
          prep_time?: number | null
          servings?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
      royalty_payments: {
        Row: {
          created_at: string | null
          due_date: string
          franchise_agreement_id: string
          gross_sales: number
          id: string
          marketing_fee: number | null
          paid_date: string | null
          payment_period_end: string
          payment_period_start: string
          payment_status: string | null
          royalty_amount: number
        }
        Insert: {
          created_at?: string | null
          due_date: string
          franchise_agreement_id: string
          gross_sales: number
          id?: string
          marketing_fee?: number | null
          paid_date?: string | null
          payment_period_end: string
          payment_period_start: string
          payment_status?: string | null
          royalty_amount: number
        }
        Update: {
          created_at?: string | null
          due_date?: string
          franchise_agreement_id?: string
          gross_sales?: number
          id?: string
          marketing_fee?: number | null
          paid_date?: string | null
          payment_period_end?: string
          payment_period_start?: string
          payment_status?: string | null
          royalty_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "royalty_payments_franchise_agreement_id_fkey"
            columns: ["franchise_agreement_id"]
            isOneToOne: false
            referencedRelation: "franchise_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_analytics: {
        Row: {
          average_ticket: number | null
          business_id: string
          cost_of_goods: number | null
          created_at: string | null
          gross_profit: number | null
          id: string
          labor_cost: number | null
          location_id: string | null
          report_date: string
          total_customers: number | null
          total_sales: number | null
          transaction_count: number | null
        }
        Insert: {
          average_ticket?: number | null
          business_id: string
          cost_of_goods?: number | null
          created_at?: string | null
          gross_profit?: number | null
          id?: string
          labor_cost?: number | null
          location_id?: string | null
          report_date: string
          total_customers?: number | null
          total_sales?: number | null
          transaction_count?: number | null
        }
        Update: {
          average_ticket?: number | null
          business_id?: string
          cost_of_goods?: number | null
          created_at?: string | null
          gross_profit?: number | null
          id?: string
          labor_cost?: number | null
          location_id?: string | null
          report_date?: string
          total_customers?: number | null
          total_sales?: number | null
          transaction_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_analytics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_analytics_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
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
      suppliers: {
        Row: {
          address: string | null
          business_id: string
          contact_name: string | null
          created_at: string | null
          credit_limit: number | null
          current_balance: number | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          payment_terms: string | null
          phone: string | null
          preferred_payment_method: string | null
          rating: number | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          contact_name?: string | null
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          payment_terms?: string | null
          phone?: string | null
          preferred_payment_method?: string | null
          rating?: number | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          contact_name?: string | null
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          payment_terms?: string | null
          phone?: string | null
          preferred_payment_method?: string | null
          rating?: number | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          business_id: string
          created_at: string | null
          effective_date: string
          id: string
          is_active: boolean | null
          jurisdiction: string
          location_id: string | null
          rate: number
          tax_type: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          effective_date: string
          id?: string
          is_active?: boolean | null
          jurisdiction: string
          location_id?: string | null
          rate: number
          tax_type: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          effective_date?: string
          id?: string
          is_active?: boolean | null
          jurisdiction?: string
          location_id?: string | null
          rate?: number
          tax_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_rates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
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
      urban_flow_events: {
        Row: {
          anonymized_user_id: string | null
          device_type: string | null
          event_data: Json
          event_type: string
          geospatial_data: Json | null
          id: string
          location_id: string | null
          session_id: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          anonymized_user_id?: string | null
          device_type?: string | null
          event_data: Json
          event_type: string
          geospatial_data?: Json | null
          id?: string
          location_id?: string | null
          session_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          anonymized_user_id?: string | null
          device_type?: string | null
          event_data?: Json
          event_type?: string
          geospatial_data?: Json | null
          id?: string
          location_id?: string | null
          session_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "urban_flow_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          colorblind_mode: boolean | null
          created_at: string | null
          data_sharing_consent: boolean | null
          font_size: string | null
          high_contrast: boolean | null
          id: string
          marketing_emails: boolean | null
          push_notifications: boolean | null
          theme_preference: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          colorblind_mode?: boolean | null
          created_at?: string | null
          data_sharing_consent?: boolean | null
          font_size?: string | null
          high_contrast?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          push_notifications?: boolean | null
          theme_preference?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          colorblind_mode?: boolean | null
          created_at?: string | null
          data_sharing_consent?: boolean | null
          font_size?: string | null
          high_contrast?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          push_notifications?: boolean | null
          theme_preference?: string | null
          updated_at?: string | null
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
      calculate_business_health_index: {
        Args: { p_business_id: string; p_location_id?: string }
        Returns: number
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
      check_health_data_pipeline_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_raw_records: number
          pending_records: number
          processing_records: number
          completed_records: number
          failed_records: number
          stuck_records: number
          pipeline_health_score: number
        }[]
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
      get_all_user_health_data: {
        Args: { p_user_id: string }
        Returns: {
          source_table: string
          record_id: string
          user_id: string
          activity_type: string
          recorded_at: string
          processed_at: string
          step_count: number
          heart_rate: number
          distance_meters: number
          duration_seconds: number
          calories_burned: number
          device_type: string
          raw_data: Json
          reward_amount: number
          processing_status: string
        }[]
      }
      get_user_business_role: {
        Args: { p_user_id: string; p_business_id: string }
        Returns: {
          role: Database["public"]["Enums"]["user_role"]
          permissions: Json
        }[]
      }
      process_backlog_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          processed_count: number
          error_count: number
        }[]
      }
      process_stuck_raw_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          processed_count: number
          error_count: number
        }[]
      }
      recover_all_stuck_health_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          recovered_count: number
          failed_count: number
        }[]
      }
      recover_stuck_health_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          recovered_count: number
          error_count: number
        }[]
      }
      update_raw_health_data_status: {
        Args: {
          p_record_id: string
          p_status: string
          p_error_message?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      user_role: "owner" | "manager" | "employee"
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
      user_role: ["owner", "manager", "employee"],
    },
  },
} as const
