import type { Database } from './supabase-types';

export type RoleMark = 'admin' | 'mod' | 'supervisor' | 'leader';
export type SourceKey = 'supervisor' | 'admin' | 'leader' | 'members' | 'management';

export type PersonRow = Database['public']['Tables']['people']['Row'];
export type HistoryRow = Database['public']['Tables']['points_history']['Row'];

export interface Person extends Omit<PersonRow, 'roles' | 'created_at'> {
  /** Additive marks. Empty = regular member (displayed MEMBER). */
  roles: RoleMark[];
  /** Computed live: points_a + points_b. Never stored. */
  total_points: number;
}

export interface HistoryEntry extends Omit<HistoryRow, 'source_key'> {
  source_key: SourceKey;
  people?: { id: string; name: string } | null;
}

export type HistoryFilter = 'all' | SourceKey;
export type ThemeMode = 'light' | 'dark';
