export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      push_log: {
        Row: {
          created_at: string;
          history_id: string;
          person_id: string;
        };
        Insert: {
          created_at?: string;
          history_id: string;
          person_id: string;
        };
        Update: {
          created_at?: string;
          history_id?: string;
          person_id?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          is_active: boolean;
          p256dh: string;
          person_id: string;
          updated_at: string;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          is_active?: boolean;
          p256dh: string;
          person_id: string;
          updated_at?: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          is_active?: boolean;
          p256dh?: string;
          person_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      people: {
        Row: {
          avatar_color: string | null;
          created_at: string;
          id: string;
          name: string;
          name_ar: string | null;
          nickname_ar: string | null;
          nickname_en: string | null;
          points_a: number;
          points_b: number;
          roles: string[];
          team: string;
          updated_at: string;
        };
        Insert: {
          avatar_color?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          name_ar?: string | null;
          nickname_ar?: string | null;
          nickname_en?: string | null;
          points_a?: number;
          points_b?: number;
          roles?: string[];
          team: string;
          updated_at?: string;
        };
        Update: {
          avatar_color?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          name_ar?: string | null;
          nickname_ar?: string | null;
          nickname_en?: string | null;
          points_a?: number;
          points_b?: number;
          roles?: string[];
          team?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      points_history: {
        Row: {
          created_at: string;
          id: string;
          new_total: number;
          person_id: string;
          points_change: number;
          previous_total: number;
          reason: string | null;
          source_key: string;
          week_start: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          new_total: number;
          person_id: string;
          points_change: number;
          previous_total: number;
          reason?: string | null;
          source_key: string;
          week_start?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          new_total?: number;
          person_id?: string;
          points_change?: number;
          previous_total?: number;
          reason?: string | null;
          source_key?: string;
          week_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'points_history_person_id_fkey';
            columns: ['person_id'];
            referencedRelation: 'people';
            referencedColumns: ['id'];
          },
        ];
      };
      scoring_resets: {
        Row: {
          created_at: string;
          id: string;
          reason: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          reason?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          reason?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      add_points: {
        Args: { p_person_id: string; p_source_key: string; p_points: number; p_reason?: string };
        Returns: string;
      };
      rebuild_person_points: {
        Args: Record<string, never>;
        Returns: number;
      };
      register_push_subscription: {
        Args: { p_person_id: string; p_endpoint: string; p_p256dh: string; p_auth: string };
        Returns: string;
      };
      unregister_push_subscription: {
        Args: { p_person_id: string; p_endpoint: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
