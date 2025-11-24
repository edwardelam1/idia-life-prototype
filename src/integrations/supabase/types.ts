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
      ar_campaign_performance: {
        Row: {
          business_id: string
          campaign_id: string
          conversion_count: number | null
          created_at: string | null
          date: string
          engagement_duration_avg: number | null
          id: string
          revenue_generated: number | null
          total_interactions: number | null
          unique_users: number | null
        }
        Insert: {
          business_id: string
          campaign_id: string
          conversion_count?: number | null
          created_at?: string | null
          date?: string
          engagement_duration_avg?: number | null
          id?: string
          revenue_generated?: number | null
          total_interactions?: number | null
          unique_users?: number | null
        }
        Update: {
          business_id?: string
          campaign_id?: string
          conversion_count?: number | null
          created_at?: string | null
          date?: string
          engagement_duration_avg?: number | null
          id?: string
          revenue_generated?: number | null
          total_interactions?: number | null
          unique_users?: number | null
        }
        Relationships: []
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
          campaign_id: string | null
          content_version: number
          conversion_rate: number | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          experience_type: string
          id: string
          interaction_triggers: Json | null
          is_active: boolean | null
          performance_metrics: Json | null
          revenue_attributed: number | null
          spatial_anchor_data: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          campaign_id?: string | null
          content_version?: number
          conversion_rate?: number | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          experience_type?: string
          id?: string
          interaction_triggers?: Json | null
          is_active?: boolean | null
          performance_metrics?: Json | null
          revenue_attributed?: number | null
          spatial_anchor_data?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          campaign_id?: string | null
          content_version?: number
          conversion_rate?: number | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          experience_type?: string
          id?: string
          interaction_triggers?: Json | null
          is_active?: boolean | null
          performance_metrics?: Json | null
          revenue_attributed?: number | null
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
      ar_menu_interactions: {
        Row: {
          ar_menu_item_id: string
          created_at: string | null
          customer_id: string | null
          device_info: Json | null
          duration_seconds: number | null
          id: string
          interaction_type: string
          location_data: Json | null
          resulted_in_purchase: boolean | null
          session_id: string | null
        }
        Insert: {
          ar_menu_item_id: string
          created_at?: string | null
          customer_id?: string | null
          device_info?: Json | null
          duration_seconds?: number | null
          id?: string
          interaction_type: string
          location_data?: Json | null
          resulted_in_purchase?: boolean | null
          session_id?: string | null
        }
        Update: {
          ar_menu_item_id?: string
          created_at?: string | null
          customer_id?: string | null
          device_info?: Json | null
          duration_seconds?: number | null
          id?: string
          interaction_type?: string
          location_data?: Json | null
          resulted_in_purchase?: boolean | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_menu_interactions_ar_menu_item_id_fkey"
            columns: ["ar_menu_item_id"]
            isOneToOne: false
            referencedRelation: "ar_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_menu_items: {
        Row: {
          ar_model_type: string | null
          ar_model_url: string | null
          average_view_time_seconds: number | null
          business_id: string
          conversion_rate: number | null
          created_at: string | null
          experience_type: string | null
          id: string
          interaction_count: number | null
          is_active: boolean | null
          menu_item_id: string
          updated_at: string | null
        }
        Insert: {
          ar_model_type?: string | null
          ar_model_url?: string | null
          average_view_time_seconds?: number | null
          business_id: string
          conversion_rate?: number | null
          created_at?: string | null
          experience_type?: string | null
          id?: string
          interaction_count?: number | null
          is_active?: boolean | null
          menu_item_id: string
          updated_at?: string | null
        }
        Update: {
          ar_model_type?: string | null
          ar_model_url?: string | null
          average_view_time_seconds?: number | null
          business_id?: string
          conversion_rate?: number | null
          created_at?: string | null
          experience_type?: string | null
          id?: string
          interaction_count?: number | null
          is_active?: boolean | null
          menu_item_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_menu_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
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
      bin_assignments: {
        Row: {
          created_at: string | null
          id: string
          inventory_item_id: string
          is_primary_location: boolean | null
          last_movement_date: string | null
          quantity: number
          reserved_quantity: number | null
          updated_at: string | null
          warehouse_bin_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_item_id: string
          is_primary_location?: boolean | null
          last_movement_date?: string | null
          quantity?: number
          reserved_quantity?: number | null
          updated_at?: string | null
          warehouse_bin_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_item_id?: string
          is_primary_location?: boolean | null
          last_movement_date?: string | null
          quantity?: number
          reserved_quantity?: number | null
          updated_at?: string | null
          warehouse_bin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bin_assignments_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bin_assignments_warehouse_bin_id_fkey"
            columns: ["warehouse_bin_id"]
            isOneToOne: false
            referencedRelation: "warehouse_bins"
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
          processing_duration: unknown
          quality_metrics: Json | null
        }
        Insert: {
          bundle_id?: string | null
          created_at?: string | null
          data_source_count?: number | null
          generation_type: string
          id?: string
          processing_duration?: unknown
          quality_metrics?: Json | null
        }
        Update: {
          bundle_id?: string | null
          created_at?: string | null
          data_source_count?: number | null
          generation_type?: string
          id?: string
          processing_duration?: unknown
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
          facility_type: string | null
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
          facility_type?: string | null
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
          facility_type?: string | null
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
      business_processing_queue: {
        Row: {
          business_id: string
          created_at: string | null
          data_category: string | null
          error_details: Json | null
          id: string
          processing_stage: string | null
          processing_status: string | null
          retry_count: number | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          data_category?: string | null
          error_details?: Json | null
          id?: string
          processing_stage?: string | null
          processing_status?: string | null
          retry_count?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          data_category?: string | null
          error_details?: Json | null
          id?: string
          processing_stage?: string | null
          processing_status?: string | null
          retry_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
      competitive_analysis: {
        Row: {
          analysis_date: string
          business_id: string
          business_value: number
          competitive_gap: number
          created_at: string | null
          id: string
          industry_average: number
          metric_category: string
          percentile_rank: number
          recommendations: Json | null
        }
        Insert: {
          analysis_date?: string
          business_id: string
          business_value: number
          competitive_gap: number
          created_at?: string | null
          id?: string
          industry_average: number
          metric_category: string
          percentile_rank: number
          recommendations?: Json | null
        }
        Update: {
          analysis_date?: string
          business_id?: string
          business_value?: number
          competitive_gap?: number
          created_at?: string | null
          id?: string
          industry_average?: number
          metric_category?: string
          percentile_rank?: number
          recommendations?: Json | null
        }
        Relationships: []
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
      cross_platform_insights: {
        Row: {
          analysis_period: Json
          business_health_impact: Json | null
          confidence_score: number | null
          created_at: string | null
          economic_indicators: Json | null
          geographic_region: string | null
          health_lifestyle_correlation: Json | null
          id: string
          insight_type: string
          sample_size: number | null
          updated_at: string | null
        }
        Insert: {
          analysis_period: Json
          business_health_impact?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          economic_indicators?: Json | null
          geographic_region?: string | null
          health_lifestyle_correlation?: Json | null
          id?: string
          insight_type: string
          sample_size?: number | null
          updated_at?: string | null
        }
        Update: {
          analysis_period?: Json
          business_health_impact?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          economic_indicators?: Json | null
          geographic_region?: string | null
          health_lifestyle_correlation?: Json | null
          id?: string
          insight_type?: string
          sample_size?: number | null
          updated_at?: string | null
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
      cycle_count_items: {
        Row: {
          counted_at: string | null
          counted_by: string | null
          counted_quantity: number | null
          created_at: string | null
          cycle_count_id: string
          expected_quantity: number
          id: string
          inventory_item_id: string
          notes: string | null
          reason_code: string | null
          status: string | null
          variance: number | null
          variance_value: number | null
          warehouse_bin_id: string | null
        }
        Insert: {
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string | null
          cycle_count_id: string
          expected_quantity: number
          id?: string
          inventory_item_id: string
          notes?: string | null
          reason_code?: string | null
          status?: string | null
          variance?: number | null
          variance_value?: number | null
          warehouse_bin_id?: string | null
        }
        Update: {
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string | null
          cycle_count_id?: string
          expected_quantity?: number
          id?: string
          inventory_item_id?: string
          notes?: string | null
          reason_code?: string | null
          status?: string | null
          variance?: number | null
          variance_value?: number | null
          warehouse_bin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cycle_count_items_cycle_count_id_fkey"
            columns: ["cycle_count_id"]
            isOneToOne: false
            referencedRelation: "cycle_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_count_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_count_items_warehouse_bin_id_fkey"
            columns: ["warehouse_bin_id"]
            isOneToOne: false
            referencedRelation: "warehouse_bins"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_counts: {
        Row: {
          accuracy_percentage: number | null
          assigned_to: string | null
          business_id: string
          completed_at: string | null
          count_number: string
          count_type: string
          created_at: string | null
          created_by: string | null
          discrepancies_found: number | null
          id: string
          items_counted: number | null
          location_id: string
          scheduled_date: string
          started_at: string | null
          status: string
          total_items: number | null
          updated_at: string | null
        }
        Insert: {
          accuracy_percentage?: number | null
          assigned_to?: string | null
          business_id: string
          completed_at?: string | null
          count_number: string
          count_type?: string
          created_at?: string | null
          created_by?: string | null
          discrepancies_found?: number | null
          id?: string
          items_counted?: number | null
          location_id: string
          scheduled_date: string
          started_at?: string | null
          status?: string
          total_items?: number | null
          updated_at?: string | null
        }
        Update: {
          accuracy_percentage?: number | null
          assigned_to?: string | null
          business_id?: string
          completed_at?: string | null
          count_number?: string
          count_type?: string
          created_at?: string | null
          created_by?: string | null
          discrepancies_found?: number | null
          id?: string
          items_counted?: number | null
          location_id?: string
          scheduled_date?: string
          started_at?: string | null
          status?: string
          total_items?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      data_connections: {
        Row: {
          access_token: string | null
          connection_name: string
          connection_type: string
          created_at: string
          id: string
          is_active: boolean | null
          last_successful_sync: string | null
          last_sync_at: string | null
          refresh_token: string | null
          sync_failure_count: number | null
          sync_status: string | null
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
          last_successful_sync?: string | null
          last_sync_at?: string | null
          refresh_token?: string | null
          sync_failure_count?: number | null
          sync_status?: string | null
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
          last_successful_sync?: string | null
          last_sync_at?: string | null
          refresh_token?: string | null
          sync_failure_count?: number | null
          sync_status?: string | null
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
      data_sources: {
        Row: {
          created_at: string | null
          encrypted_token: string | null
          id: string
          last_sync_at: string | null
          source_name: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          encrypted_token?: string | null
          id?: string
          last_sync_at?: string | null
          source_name: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          encrypted_token?: string | null
          id?: string
          last_sync_at?: string | null
          source_name?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_sources_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
          anonymized_at: string | null
          bundled_at: string | null
          data_category: string | null
          event_timestamp: string
          event_type: string
          id: number
          json_payload: Json
          processed_at: string | null
          processing_status: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          anonymized_at?: string | null
          bundled_at?: string | null
          data_category?: string | null
          event_timestamp?: string
          event_type: string
          id?: number
          json_payload: Json
          processed_at?: string | null
          processing_status?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          anonymized_at?: string | null
          bundled_at?: string | null
          data_category?: string | null
          event_timestamp?: string
          event_type?: string
          id?: number
          json_payload?: Json
          processed_at?: string | null
          processing_status?: string | null
          session_id?: string | null
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
      endorsements: {
        Row: {
          created_at: string | null
          endorsee_id: string
          endorser_id: string
          id: string
          message: string | null
          skill_text: string
        }
        Insert: {
          created_at?: string | null
          endorsee_id: string
          endorser_id: string
          id?: string
          message?: string | null
          skill_text: string
        }
        Update: {
          created_at?: string | null
          endorsee_id?: string
          endorser_id?: string
          id?: string
          message?: string | null
          skill_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "endorsements_endorsee_id_fkey"
            columns: ["endorsee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "endorsements_endorser_id_fkey"
            columns: ["endorser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      facility_assignments: {
        Row: {
          assigned_at: string | null
          facility_id: string
          id: string
          is_active: boolean | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          facility_id: string
          id?: string
          is_active?: boolean | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          facility_id?: string
          id?: string
          is_active?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_assignments_facility_id_fkey"
            columns: ["facility_id"]
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
      friends: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          status: string | null
          user_id_1: string
          user_id_2: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          user_id_1: string
          user_id_2: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          user_id_1?: string
          user_id_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "friends_user_id_1_fkey"
            columns: ["user_id_1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friends_user_id_2_fkey"
            columns: ["user_id_2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
      gift_card_redemptions: {
        Row: {
          amount_redeemed: number
          gift_card_id: string
          id: string
          location_id: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          remaining_balance: number
          transaction_id: string | null
        }
        Insert: {
          amount_redeemed: number
          gift_card_id: string
          id?: string
          location_id?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          remaining_balance: number
          transaction_id?: string | null
        }
        Update: {
          amount_redeemed?: number
          gift_card_id?: string
          id?: string
          location_id?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          remaining_balance?: number
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_redemptions_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_redemptions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_redemptions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
        ]
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
          activation_code: string | null
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
          message: string | null
          pin_code: string | null
          purchase_transaction_id: string | null
          purchaser_email: string | null
          qr_code_data: string | null
          recipient_email: string | null
          redemption_locations: Json | null
          terms_accepted: boolean | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          activation_code?: string | null
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
          message?: string | null
          pin_code?: string | null
          purchase_transaction_id?: string | null
          purchaser_email?: string | null
          qr_code_data?: string | null
          recipient_email?: string | null
          redemption_locations?: Json | null
          terms_accepted?: boolean | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          activation_code?: string | null
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
          message?: string | null
          pin_code?: string | null
          purchase_transaction_id?: string | null
          purchaser_email?: string | null
          qr_code_data?: string | null
          recipient_email?: string | null
          redemption_locations?: Json | null
          terms_accepted?: boolean | null
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
      good_deeds: {
        Row: {
          created_at: string | null
          description: string
          evidence_url: string | null
          id: string
          title: string
          user_id: string
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          evidence_url?: string | null
          id?: string
          title: string
          user_id: string
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          evidence_url?: string | null
          id?: string
          title?: string
          user_id?: string
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "good_deeds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "good_deeds_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
      interests: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      inventory_adjustments: {
        Row: {
          adjustment_number: string
          adjustment_quantity: number
          adjustment_type: string
          approved_at: string | null
          approved_by: string | null
          business_id: string
          created_at: string | null
          created_by: string | null
          id: string
          inventory_item_id: string
          location_id: string
          quantity_after: number
          quantity_before: number
          reason: string
          reference_document: string | null
          total_value: number | null
          unit_cost: number | null
          warehouse_bin_id: string | null
        }
        Insert: {
          adjustment_number: string
          adjustment_quantity: number
          adjustment_type: string
          approved_at?: string | null
          approved_by?: string | null
          business_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_item_id: string
          location_id: string
          quantity_after: number
          quantity_before: number
          reason: string
          reference_document?: string | null
          total_value?: number | null
          unit_cost?: number | null
          warehouse_bin_id?: string | null
        }
        Update: {
          adjustment_number?: string
          adjustment_quantity?: number
          adjustment_type?: string
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_item_id?: string
          location_id?: string
          quantity_after?: number
          quantity_before?: number
          reason?: string
          reference_document?: string | null
          total_value?: number | null
          unit_cost?: number | null
          warehouse_bin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_warehouse_bin_id_fkey"
            columns: ["warehouse_bin_id"]
            isOneToOne: false
            referencedRelation: "warehouse_bins"
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
      legal_agreements: {
        Row: {
          agreed_at: string | null
          agreement_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          agreed_at?: string | null
          agreement_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
          version: string
        }
        Update: {
          agreed_at?: string | null
          agreement_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_agreements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lifestyle_processing_queue: {
        Row: {
          created_at: string | null
          data_category: string | null
          device_event_id: number
          error_details: Json | null
          id: string
          processing_stage: string | null
          processing_status: string | null
          retry_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_category?: string | null
          device_event_id: number
          error_details?: Json | null
          id?: string
          processing_stage?: string | null
          processing_status?: string | null
          retry_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_category?: string | null
          device_event_id?: number
          error_details?: Json | null
          id?: string
          processing_stage?: string | null
          processing_status?: string | null
          retry_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
      market_benchmarks: {
        Row: {
          created_at: string | null
          data_period: string
          geographic_region: string | null
          id: string
          industry_category: string
          metric_name: string
          metric_value: number
          percentile_25: number | null
          percentile_50: number | null
          percentile_75: number | null
          percentile_90: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_period: string
          geographic_region?: string | null
          id?: string
          industry_category: string
          metric_name: string
          metric_value: number
          percentile_25?: number | null
          percentile_50?: number | null
          percentile_75?: number | null
          percentile_90?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_period?: string
          geographic_region?: string | null
          id?: string
          industry_category?: string
          metric_name?: string
          metric_value?: number
          percentile_25?: number | null
          percentile_50?: number | null
          percentile_75?: number | null
          percentile_90?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      market_intelligence_subscriptions: {
        Row: {
          auto_renew: boolean | null
          bundle_id: string
          business_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          started_at: string | null
          status: string
          subscription_type: string
        }
        Insert: {
          auto_renew?: boolean | null
          bundle_id: string
          business_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          subscription_type?: string
        }
        Update: {
          auto_renew?: boolean | null
          bundle_id?: string
          business_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          subscription_type?: string
        }
        Relationships: []
      }
      marketing_config: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          taglines: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          taglines?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          taglines?: Json | null
          updated_at?: string | null
        }
        Relationships: []
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
          bundle_category: string | null
          bundle_id: string
          bundle_version: number | null
          category: string
          contacts_count: number | null
          created_at: string | null
          cross_platform_insights: Json | null
          data_fusion_level: string | null
          data_json: Json
          data_points: string[] | null
          description: string
          features: string[] | null
          is_active: boolean | null
          key_insights: string[] | null
          match_percentage: number | null
          predictive_analytics: Json | null
          price: number
          suggested_filters: string[] | null
          tier: string
          title: string
          updated_at: string | null
        }
        Insert: {
          bundle_category?: string | null
          bundle_id?: string
          bundle_version?: number | null
          category: string
          contacts_count?: number | null
          created_at?: string | null
          cross_platform_insights?: Json | null
          data_fusion_level?: string | null
          data_json: Json
          data_points?: string[] | null
          description: string
          features?: string[] | null
          is_active?: boolean | null
          key_insights?: string[] | null
          match_percentage?: number | null
          predictive_analytics?: Json | null
          price: number
          suggested_filters?: string[] | null
          tier: string
          title: string
          updated_at?: string | null
        }
        Update: {
          bundle_category?: string | null
          bundle_id?: string
          bundle_version?: number | null
          category?: string
          contacts_count?: number | null
          created_at?: string | null
          cross_platform_insights?: Json | null
          data_fusion_level?: string | null
          data_json?: Json
          data_points?: string[] | null
          description?: string
          features?: string[] | null
          is_active?: boolean | null
          key_insights?: string[] | null
          match_percentage?: number | null
          predictive_analytics?: Json | null
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
      merchant_notifications: {
        Row: {
          auto_resolve_at: string | null
          created_at: string | null
          facility_id: string
          id: string
          message: string | null
          notification_type: string
          order_id: string | null
          payload: Json | null
          priority: number | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          title: string
        }
        Insert: {
          auto_resolve_at?: string | null
          created_at?: string | null
          facility_id: string
          id?: string
          message?: string | null
          notification_type: string
          order_id?: string | null
          payload?: Json | null
          priority?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          title: string
        }
        Update: {
          auto_resolve_at?: string | null
          created_at?: string | null
          facility_id?: string
          id?: string
          message?: string | null
          notification_type?: string
          order_id?: string | null
          payload?: Json | null
          priority?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_notifications_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      nfc_transactions: {
        Row: {
          blockchain_hash: string | null
          confirmation_block: number | null
          created_at: string | null
          customer_wallet_address: string
          exchange_rate: number
          id: string
          idia_amount: number
          signature_payload: string
          transaction_id: string | null
          usd_equivalent: number
          verification_status: string | null
          verified_at: string | null
        }
        Insert: {
          blockchain_hash?: string | null
          confirmation_block?: number | null
          created_at?: string | null
          customer_wallet_address: string
          exchange_rate: number
          id?: string
          idia_amount: number
          signature_payload: string
          transaction_id?: string | null
          usd_equivalent: number
          verification_status?: string | null
          verified_at?: string | null
        }
        Update: {
          blockchain_hash?: string | null
          confirmation_block?: number | null
          created_at?: string | null
          customer_wallet_address?: string
          exchange_rate?: number
          id?: string
          idia_amount?: number
          signature_payload?: string
          transaction_id?: string | null
          usd_equivalent?: number
          verification_status?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfc_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
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
      permissions: {
        Row: {
          category: string | null
          description: string | null
          id: number
          name: string
        }
        Insert: {
          category?: string | null
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          category?: string | null
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      pick_list_items: {
        Row: {
          created_at: string | null
          expiry_date: string | null
          id: string
          inventory_item_id: string
          lot_number: string | null
          notes: string | null
          pick_list_id: string
          pick_sequence: number | null
          picked_at: string | null
          picked_by: string | null
          quantity_picked: number | null
          quantity_requested: number
          status: string | null
          warehouse_bin_id: string | null
        }
        Insert: {
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          inventory_item_id: string
          lot_number?: string | null
          notes?: string | null
          pick_list_id: string
          pick_sequence?: number | null
          picked_at?: string | null
          picked_by?: string | null
          quantity_picked?: number | null
          quantity_requested: number
          status?: string | null
          warehouse_bin_id?: string | null
        }
        Update: {
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          inventory_item_id?: string
          lot_number?: string | null
          notes?: string | null
          pick_list_id?: string
          pick_sequence?: number | null
          picked_at?: string | null
          picked_by?: string | null
          quantity_picked?: number | null
          quantity_requested?: number
          status?: string | null
          warehouse_bin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pick_list_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_list_items_pick_list_id_fkey"
            columns: ["pick_list_id"]
            isOneToOne: false
            referencedRelation: "pick_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_list_items_warehouse_bin_id_fkey"
            columns: ["warehouse_bin_id"]
            isOneToOne: false
            referencedRelation: "warehouse_bins"
            referencedColumns: ["id"]
          },
        ]
      }
      pick_lists: {
        Row: {
          actual_pick_time: number | null
          assigned_to: string | null
          business_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          estimated_pick_time: number | null
          id: string
          location_id: string
          pick_list_number: string
          pick_method: string | null
          priority: string | null
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          actual_pick_time?: number | null
          assigned_to?: string | null
          business_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_pick_time?: number | null
          id?: string
          location_id: string
          pick_list_number: string
          pick_method?: string | null
          priority?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          actual_pick_time?: number | null
          assigned_to?: string | null
          business_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_pick_time?: number | null
          id?: string
          location_id?: string
          pick_list_number?: string
          pick_method?: string | null
          priority?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
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
          nfc_payload: Json | null
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
          nfc_payload?: Json | null
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
          nfc_payload?: Json | null
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
      praises: {
        Row: {
          circle_id: string | null
          created_at: string | null
          id: string
          message: string
          praised_id: string
          praiser_id: string
        }
        Insert: {
          circle_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          praised_id: string
          praiser_id: string
        }
        Update: {
          circle_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          praised_id?: string
          praiser_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "praises_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "trust_circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "praises_praised_id_fkey"
            columns: ["praised_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "praises_praiser_id_fkey"
            columns: ["praiser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string | null
          activity_preferences: string[] | null
          address: Json | null
          age: number | null
          ai_assistant_name: string | null
          aliases: string[] | null
          available_credit_line: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          date_of_birth: string | null
          display_name: string | null
          ein: string | null
          first_name: string | null
          full_legal_address: Json | null
          gender: string | null
          health_goals: string[] | null
          id: string
          interests: string[] | null
          is_501c3_verified: boolean | null
          is_seed_backed_up: boolean | null
          kyc_status: string | null
          last_name: string | null
          location: string | null
          middle_name: string | null
          motivational_phase: string | null
          occupation: string | null
          phone: string | null
          phone_number: string | null
          quiet_time_enabled: boolean | null
          quiet_time_end: string | null
          quiet_time_start: string | null
          ssn_last4: string | null
          suffix: string | null
          trust_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_type?: string | null
          activity_preferences?: string[] | null
          address?: Json | null
          age?: number | null
          ai_assistant_name?: string | null
          aliases?: string[] | null
          available_credit_line?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          ein?: string | null
          first_name?: string | null
          full_legal_address?: Json | null
          gender?: string | null
          health_goals?: string[] | null
          id?: string
          interests?: string[] | null
          is_501c3_verified?: boolean | null
          is_seed_backed_up?: boolean | null
          kyc_status?: string | null
          last_name?: string | null
          location?: string | null
          middle_name?: string | null
          motivational_phase?: string | null
          occupation?: string | null
          phone?: string | null
          phone_number?: string | null
          quiet_time_enabled?: boolean | null
          quiet_time_end?: string | null
          quiet_time_start?: string | null
          ssn_last4?: string | null
          suffix?: string | null
          trust_score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_type?: string | null
          activity_preferences?: string[] | null
          address?: Json | null
          age?: number | null
          ai_assistant_name?: string | null
          aliases?: string[] | null
          available_credit_line?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          ein?: string | null
          first_name?: string | null
          full_legal_address?: Json | null
          gender?: string | null
          health_goals?: string[] | null
          id?: string
          interests?: string[] | null
          is_501c3_verified?: boolean | null
          is_seed_backed_up?: boolean | null
          kyc_status?: string | null
          last_name?: string | null
          location?: string | null
          middle_name?: string | null
          motivational_phase?: string | null
          occupation?: string | null
          phone?: string | null
          phone_number?: string | null
          quiet_time_enabled?: boolean | null
          quiet_time_end?: string | null
          quiet_time_start?: string | null
          ssn_last4?: string | null
          suffix?: string | null
          trust_score?: number | null
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
      pulse_survey_responses: {
        Row: {
          created_at: string | null
          id: string
          responses: Json
          sentiment_score: number | null
          survey_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          responses: Json
          sentiment_score?: number | null
          survey_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          responses?: Json
          sentiment_score?: number | null
          survey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "pulse_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_survey_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pulse_surveys: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          questions: Json
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          questions: Json
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          questions?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      purchase_order_line_items: {
        Row: {
          created_at: string | null
          expiry_date: string | null
          id: string
          inventory_item_id: string | null
          item_name: string
          lot_number: string | null
          ordered_quantity: number
          purchase_order_id: string
          received_quantity: number | null
          sku: string
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          inventory_item_id?: string | null
          item_name: string
          lot_number?: string | null
          ordered_quantity: number
          purchase_order_id: string
          received_quantity?: number | null
          sku: string
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          inventory_item_id?: string | null
          item_name?: string
          lot_number?: string | null
          ordered_quantity?: number
          purchase_order_id?: string
          received_quantity?: number | null
          sku?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_line_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_line_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          actual_delivery_date: string | null
          business_id: string
          created_at: string | null
          created_by: string | null
          expected_delivery_date: string | null
          id: string
          location_id: string
          notes: string | null
          order_date: string
          po_number: string
          status: string
          supplier_contact: Json | null
          supplier_name: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          business_id: string
          created_at?: string | null
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          location_id: string
          notes?: string | null
          order_date?: string
          po_number: string
          status?: string
          supplier_contact?: Json | null
          supplier_name: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          business_id?: string
          created_at?: string | null
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          status?: string
          supplier_contact?: Json | null
          supplier_name?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      raw_health_data: {
        Row: {
          activity_type: string | null
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
          activity_type?: string | null
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
          activity_type?: string | null
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
      receiving_discrepancies: {
        Row: {
          actual_quantity: number | null
          created_at: string | null
          created_by: string | null
          description: string
          discrepancy_type: string
          expected_quantity: number | null
          id: string
          photo_urls: Json | null
          purchase_order_id: string
          purchase_order_line_item_id: string | null
          resolution_notes: string | null
          resolution_status: string | null
          resolved_at: string | null
          resolved_by: string | null
          supplier_notified: boolean | null
          supplier_notified_at: string | null
          variance_quantity: number | null
        }
        Insert: {
          actual_quantity?: number | null
          created_at?: string | null
          created_by?: string | null
          description: string
          discrepancy_type: string
          expected_quantity?: number | null
          id?: string
          photo_urls?: Json | null
          purchase_order_id: string
          purchase_order_line_item_id?: string | null
          resolution_notes?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          supplier_notified?: boolean | null
          supplier_notified_at?: string | null
          variance_quantity?: number | null
        }
        Update: {
          actual_quantity?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          discrepancy_type?: string
          expected_quantity?: number | null
          id?: string
          photo_urls?: Json | null
          purchase_order_id?: string
          purchase_order_line_item_id?: string | null
          resolution_notes?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          supplier_notified?: boolean | null
          supplier_notified_at?: string | null
          variance_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receiving_discrepancies_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_discrepancies_purchase_order_line_item_id_fkey"
            columns: ["purchase_order_line_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_line_items"
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
            foreignKeyName: "fk_recipe_ingredients_recipe"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
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
      shipment_line_items: {
        Row: {
          created_at: string | null
          expiry_date: string | null
          id: string
          inventory_item_id: string
          lot_number: string | null
          package_number: string | null
          quantity: number
          shipment_id: string
        }
        Insert: {
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          inventory_item_id: string
          lot_number?: string | null
          package_number?: string | null
          quantity: number
          shipment_id: string
        }
        Update: {
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          inventory_item_id?: string
          lot_number?: string | null
          package_number?: string | null
          quantity?: number
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_line_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_line_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          actual_delivery_date: string | null
          actual_pickup_date: string | null
          actual_weight: number | null
          business_id: string
          carrier: string | null
          created_at: string | null
          created_by: string | null
          customer_address: Json | null
          customer_name: string | null
          delivery_instructions: string | null
          estimated_delivery_date: string | null
          estimated_weight: number | null
          id: string
          location_id: string
          scheduled_pickup_date: string | null
          service_type: string | null
          shipment_number: string
          shipping_cost: number | null
          status: string
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          actual_pickup_date?: string | null
          actual_weight?: number | null
          business_id: string
          carrier?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: Json | null
          customer_name?: string | null
          delivery_instructions?: string | null
          estimated_delivery_date?: string | null
          estimated_weight?: number | null
          id?: string
          location_id: string
          scheduled_pickup_date?: string | null
          service_type?: string | null
          shipment_number: string
          shipping_cost?: number | null
          status?: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          actual_pickup_date?: string | null
          actual_weight?: number | null
          business_id?: string
          carrier?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: Json | null
          customer_name?: string | null
          delivery_instructions?: string | null
          estimated_delivery_date?: string | null
          estimated_weight?: number | null
          id?: string
          location_id?: string
          scheduled_pickup_date?: string | null
          service_type?: string | null
          shipment_number?: string
          shipping_cost?: number | null
          status?: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      social_analytics_consent: {
        Row: {
          excluded_friend_ids: string[] | null
          is_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          excluded_friend_ids?: string[] | null
          is_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          excluded_friend_ids?: string[] | null
          is_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_analytics_consent_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      social_health_metrics: {
        Row: {
          last_calculated: string | null
          network_vitality_score: number | null
          reciprocity_score: number | null
          trust_network_size: number | null
          updated_at: string | null
          user_id: string
          weekly_interactions_count: number | null
        }
        Insert: {
          last_calculated?: string | null
          network_vitality_score?: number | null
          reciprocity_score?: number | null
          trust_network_size?: number | null
          updated_at?: string | null
          user_id: string
          weekly_interactions_count?: number | null
        }
        Update: {
          last_calculated?: string | null
          network_vitality_score?: number | null
          reciprocity_score?: number | null
          trust_network_size?: number | null
          updated_at?: string | null
          user_id?: string
          weekly_interactions_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_health_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      staged_app_data: {
        Row: {
          anonymized_payload: Json
          created_at: string | null
          data_category: string
          data_quality_score: number | null
          event_type: string
          id: string
          location_zone: string | null
          processed_at: string
          pseudo_user_id: string
          session_context: Json | null
        }
        Insert: {
          anonymized_payload: Json
          created_at?: string | null
          data_category: string
          data_quality_score?: number | null
          event_type: string
          id?: string
          location_zone?: string | null
          processed_at?: string
          pseudo_user_id: string
          session_context?: Json | null
        }
        Update: {
          anonymized_payload?: Json
          created_at?: string | null
          data_category?: string
          data_quality_score?: number | null
          event_type?: string
          id?: string
          location_zone?: string | null
          processed_at?: string
          pseudo_user_id?: string
          session_context?: Json | null
        }
        Relationships: []
      }
      staged_business_data: {
        Row: {
          anonymized_from_business_id: string | null
          ar_engagement_data: Json | null
          business_category: string
          created_at: string | null
          data_completeness_score: number | null
          data_quality_score: number | null
          employee_analytics: Json | null
          id: string
          location_performance: Json | null
          operational_metrics: Json | null
          processed_at: string | null
          pseudo_business_id: string
          seasonal_trends: Json | null
          transaction_patterns: Json | null
        }
        Insert: {
          anonymized_from_business_id?: string | null
          ar_engagement_data?: Json | null
          business_category: string
          created_at?: string | null
          data_completeness_score?: number | null
          data_quality_score?: number | null
          employee_analytics?: Json | null
          id?: string
          location_performance?: Json | null
          operational_metrics?: Json | null
          processed_at?: string | null
          pseudo_business_id: string
          seasonal_trends?: Json | null
          transaction_patterns?: Json | null
        }
        Update: {
          anonymized_from_business_id?: string | null
          ar_engagement_data?: Json | null
          business_category?: string
          created_at?: string | null
          data_completeness_score?: number | null
          data_quality_score?: number | null
          employee_analytics?: Json | null
          id?: string
          location_performance?: Json | null
          operational_metrics?: Json | null
          processed_at?: string | null
          pseudo_business_id?: string
          seasonal_trends?: Json | null
          transaction_patterns?: Json | null
        }
        Relationships: []
      }
      staged_data: {
        Row: {
          activity_type: string
          anonymized_location_zone: string | null
          average_heartrate: number | null
          average_speed_mps: number | null
          calories_burned: number | null
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
          calories_burned?: number | null
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
          calories_burned?: number | null
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
      staged_lifestyle_data: {
        Row: {
          activity_context: Json | null
          anonymized_from_event_id: number | null
          app_usage_patterns: Json | null
          created_at: string | null
          data_completeness_score: number | null
          data_quality_score: number | null
          device_usage_metrics: Json | null
          event_category: string
          event_type: string
          id: string
          location_zone: string | null
          processed_at: string | null
          pseudo_user_id: string
          session_duration: number | null
          social_interactions: Json | null
        }
        Insert: {
          activity_context?: Json | null
          anonymized_from_event_id?: number | null
          app_usage_patterns?: Json | null
          created_at?: string | null
          data_completeness_score?: number | null
          data_quality_score?: number | null
          device_usage_metrics?: Json | null
          event_category?: string
          event_type: string
          id?: string
          location_zone?: string | null
          processed_at?: string | null
          pseudo_user_id: string
          session_duration?: number | null
          social_interactions?: Json | null
        }
        Update: {
          activity_context?: Json | null
          anonymized_from_event_id?: number | null
          app_usage_patterns?: Json | null
          created_at?: string | null
          data_completeness_score?: number | null
          data_quality_score?: number | null
          device_usage_metrics?: Json | null
          event_category?: string
          event_type?: string
          id?: string
          location_zone?: string | null
          processed_at?: string | null
          pseudo_user_id?: string
          session_duration?: number | null
          social_interactions?: Json | null
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
      sync_logs: {
        Row: {
          created_at: string
          failed_syncs: number
          id: string
          successful_syncs: number
          sync_results: Json | null
          sync_type: string
          total_connections: number
        }
        Insert: {
          created_at?: string
          failed_syncs?: number
          id?: string
          successful_syncs?: number
          sync_results?: Json | null
          sync_type: string
          total_connections?: number
        }
        Update: {
          created_at?: string
          failed_syncs?: number
          id?: string
          successful_syncs?: number
          sync_results?: Json | null
          sync_type?: string
          total_connections?: number
        }
        Relationships: []
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
      trust_circle_members: {
        Row: {
          circle_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          circle_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          circle_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "trust_circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_circle_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      trust_circles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_private: boolean | null
          name: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          name: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          name?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trust_circles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      universal_data_bundles: {
        Row: {
          bundle_category: string
          bundle_metadata: Json
          bundle_size_bytes: number | null
          created_at: string | null
          data_types: Json
          expires_at: string | null
          id: string
          market_value: number | null
          quality_score: number | null
          unique_users_count: number | null
        }
        Insert: {
          bundle_category: string
          bundle_metadata: Json
          bundle_size_bytes?: number | null
          created_at?: string | null
          data_types: Json
          expires_at?: string | null
          id?: string
          market_value?: number | null
          quality_score?: number | null
          unique_users_count?: number | null
        }
        Update: {
          bundle_category?: string
          bundle_metadata?: Json
          bundle_size_bytes?: number | null
          created_at?: string | null
          data_types?: Json
          expires_at?: string | null
          id?: string
          market_value?: number | null
          quality_score?: number | null
          unique_users_count?: number | null
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
      user_consents: {
        Row: {
          consent_type: string
          granted_at: string | null
          granular_permissions: Json | null
          id: string
          is_granted: boolean | null
          revoked_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          granted_at?: string | null
          granular_permissions?: Json | null
          id?: string
          is_granted?: boolean | null
          revoked_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          granted_at?: string | null
          granular_permissions?: Json | null
          id?: string
          is_granted?: boolean | null
          revoked_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_interests: {
        Row: {
          created_at: string | null
          id: string
          interest_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interest_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interest_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_permission_overrides: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          is_granted: boolean
          permission_id: number
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_granted: boolean
          permission_id: number
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_granted?: boolean
          permission_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
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
      user_votes: {
        Row: {
          created_at: string | null
          id: string
          proposal_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          proposal_id: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          proposal_id?: string
          user_id?: string
          vote_type?: string
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
      wallets: {
        Row: {
          cash_balance: number | null
          created_at: string | null
          id: string
          idia_token_balance: number | null
          idia_usd_balance: number | null
          updated_at: string | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          cash_balance?: number | null
          created_at?: string | null
          id?: string
          idia_token_balance?: number | null
          idia_usd_balance?: number | null
          updated_at?: string | null
          user_id: string
          wallet_address: string
        }
        Update: {
          cash_balance?: number | null
          created_at?: string | null
          id?: string
          idia_token_balance?: number | null
          idia_usd_balance?: number | null
          updated_at?: string | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      warehouse_bins: {
        Row: {
          aisle: string | null
          bin_code: string
          bin_type: string | null
          business_id: string
          capacity_cubic_feet: number | null
          coordinates: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          level: string | null
          location_id: string
          shelf: string | null
          temperature_controlled: boolean | null
          weight_capacity_lbs: number | null
          zone: string
        }
        Insert: {
          aisle?: string | null
          bin_code: string
          bin_type?: string | null
          business_id: string
          capacity_cubic_feet?: number | null
          coordinates?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          location_id: string
          shelf?: string | null
          temperature_controlled?: boolean | null
          weight_capacity_lbs?: number | null
          zone: string
        }
        Update: {
          aisle?: string | null
          bin_code?: string
          bin_type?: string | null
          business_id?: string
          capacity_cubic_feet?: number | null
          coordinates?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          location_id?: string
          shelf?: string | null
          temperature_controlled?: boolean | null
          weight_capacity_lbs?: number | null
          zone?: string
        }
        Relationships: []
      }
      warehouse_tasks: {
        Row: {
          actual_duration: number | null
          assigned_to: string | null
          business_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string
          due_date: string | null
          estimated_duration: number | null
          id: string
          location_id: string
          notes: string | null
          priority: string | null
          reference_id: string | null
          reference_type: string | null
          started_at: string | null
          status: string
          task_number: string
          task_type: string
          updated_at: string | null
        }
        Insert: {
          actual_duration?: number | null
          assigned_to?: string | null
          business_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          due_date?: string | null
          estimated_duration?: number | null
          id?: string
          location_id: string
          notes?: string | null
          priority?: string | null
          reference_id?: string | null
          reference_type?: string | null
          started_at?: string | null
          status?: string
          task_number: string
          task_type: string
          updated_at?: string | null
        }
        Update: {
          actual_duration?: number | null
          assigned_to?: string | null
          business_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          due_date?: string | null
          estimated_duration?: number | null
          id?: string
          location_id?: string
          notes?: string | null
          priority?: string | null
          reference_id?: string | null
          reference_type?: string | null
          started_at?: string | null
          status?: string
          task_number?: string
          task_type?: string
          updated_at?: string | null
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
          p_clinical_data?: boolean
          p_nutrition_count?: number
          p_sleep_data?: boolean
          p_symptoms_count?: number
          p_vitals_count?: number
        }
        Returns: number
      }
      calculate_data_quality_score: {
        Args: {
          p_distance: number
          p_duration: number
          p_elevation: number
          p_heartrate: number
        }
        Returns: number
      }
      check_health_data_pipeline_status: {
        Args: never
        Returns: {
          completed_records: number
          failed_records: number
          pending_records: number
          pipeline_health_score: number
          processing_records: number
          stuck_records: number
          total_raw_records: number
        }[]
      }
      check_pipeline_health: {
        Args: never
        Returns: {
          processed_raw_data: number
          processing_raw_data: number
          total_raw_data: number
          total_staged_data: number
          total_transactions: number
          unprocessed_raw_data: number
          unrewarded_staged_data: number
        }[]
      }
      check_raw_health_data_duplicate: {
        Args: { p_recorded_at: string; p_step_count: number; p_user_id: string }
        Returns: boolean
      }
      cleanup_orphaned_queue_items: { Args: never; Returns: number }
      generate_pseudonym: { Args: { input_text: string }; Returns: string }
      get_all_user_health_data: {
        Args: { p_user_id: string }
        Returns: {
          activity_type: string
          calories_burned: number
          device_type: string
          distance_meters: number
          duration_seconds: number
          heart_rate: number
          processed_at: string
          processing_status: string
          raw_data: Json
          record_id: string
          recorded_at: string
          reward_amount: number
          source_table: string
          step_count: number
          user_id: string
        }[]
      }
      get_user_business_access: {
        Args: { p_user_id: string }
        Returns: {
          business_id: string
        }[]
      }
      get_user_business_role: {
        Args: { p_business_id: string; p_user_id: string }
        Returns: {
          permissions: Json
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      process_backlog_data: {
        Args: never
        Returns: {
          error_count: number
          processed_count: number
        }[]
      }
      process_stuck_raw_data: {
        Args: never
        Returns: {
          error_count: number
          processed_count: number
        }[]
      }
      process_synapse_backlog: {
        Args: never
        Returns: {
          bundles_generated: number
          processed_business_queue: number
          processed_health_data: number
          processed_lifestyle_queue: number
        }[]
      }
      recover_all_stuck_health_data: {
        Args: never
        Returns: {
          failed_count: number
          recovered_count: number
        }[]
      }
      recover_stuck_health_data: {
        Args: never
        Returns: {
          error_count: number
          recovered_count: number
        }[]
      }
      trigger_daily_apple_health_sync: {
        Args: never
        Returns: {
          request_id: number
        }[]
      }
      update_raw_health_data_status: {
        Args: {
          p_error_message?: string
          p_record_id: string
          p_status: string
        }
        Returns: undefined
      }
      user_has_permission: {
        Args: { p_permission_name: string; p_user_id: string }
        Returns: boolean
      }
      validate_nfc_signature: {
        Args: {
          p_signature: string
          p_transaction_data: Json
          p_wallet_address: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "owner" | "manager" | "employee" | "warehouse_associate"
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
      user_role: ["owner", "manager", "employee", "warehouse_associate"],
    },
  },
} as const
