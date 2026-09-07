import type { Database } from './supabase-types';

export type Role = 'admin' | 'leader' | 'member';
export type Board = 'members' | 'supervisors';
export type SourceKey = 'supervisor' | 'admin' | 'leader' | 'members' | 'management';

export type PersonRow = Database['public']['Tables']['people']['Row'];
export type HistoryRow = Database['public']['Tables']['points_history']['Row'];

export interface Person extends Omit<PersonRow, 'role' | 'board' | 'created_at'> {
  role: Role;
  board: Board;
  /** Computed live: points_a + points_b. Never stored. */
  total_points: number;
}

export interface HistoryEntry extends Omit<HistoryRow, 'source_key'> {
  source_key: SourceKey;
  people?: { id: string; name: string } | null;
}

export type LeaderboardTab = 'members' | 'supervisors';
export type HistoryFilter = 'all' | SourceKey;
export type ThemeMode = 'light' | 'dark';
