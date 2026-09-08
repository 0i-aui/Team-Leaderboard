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
          points_a: number;
          points_b: number;
          roles: string[];
          updated_at: string;
        };
        Insert: {
          avatar_color?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          points_a?: number;
          points_b?: number;
          roles?: string[];
          updated_at?: string;
        };
        Update: {
          avatar_color?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          points_a?: number;
          points_b?: number;
          roles?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      points_history: {
        Row: {
          created_at: string;
          id: string;
          new_points: number;
          person_id: string;
          points_change: number;
          previous_points: number;
          reason: string | null;
          source_key: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          new_points: number;
          person_id: string;
          points_change: number;
          previous_points: number;
          reason?: string | null;
          source_key: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          new_points?: number;
          person_id?: string;
          points_change?: number;
          previous_points?: number;
          reason?: string | null;
          source_key?: string;
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
