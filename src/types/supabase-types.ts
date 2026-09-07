export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      people: {
        Row: {
          avatar_color: string | null;
          board: string;
          created_at: string;
          id: string;
          name: string;
          points_a: number;
          points_b: number;
          role: string;
          updated_at: string;
        };
        Insert: {
          avatar_color?: string | null;
          board: string;
          created_at?: string;
          id?: string;
          name: string;
          points_a?: number;
          points_b?: number;
          role: string;
          updated_at?: string;
        };
        Update: {
          avatar_color?: string | null;
          board?: string;
          created_at?: string;
          id?: string;
          name?: string;
          points_a?: number;
          points_b?: number;
          role?: string;
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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
