export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          wallet_address: string | null;
          // Add other columns here as needed or keep empty for now
        };
        Insert: {
          id: string;
          wallet_address?: string | null;
        };
        Update: {
          id?: string;
          wallet_address?: string | null;
        };
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
