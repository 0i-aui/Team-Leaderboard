import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Board, HistoryEntry, Person, Role } from '../types';

function toPerson(row: {
  id: string;
  name: string;
  role: string;
  board: string;
  points_a: number;
  points_b: number;
  avatar_color: string | null;
  updated_at: string;
}): Person {
  return {
    ...row,
    role: row.role as Role,
    board: row.board as Board,
    total_points: row.points_a + row.points_b,
  };
}

export function useLeaderboard() {
  const [people, setPeople] = useState<Person[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const configured = isSupabaseConfigured;
  // Monotonic id: only the newest fetch may commit. Older overlapping
  // responses (realtime burst + manual retry) are discarded so stale
  // data can never overwrite fresh data.
  const reqId = useRef(0);
  // Skeletons only on the very first load. Background refreshes
  // (realtime, retry) update silently — never flash the list away.
  const initialLoad = useRef(true);

  const fetchAll = useCallback(async (manual = false) => {
    // No placeholders, no invented scores: without Supabase there is
    // simply no data. The UI shows a setup notice instead.
    if (!isSupabaseConfigured) {
      setPeople([]);
      setHistory([]);
      setLoading(false);
      setLive(false);
      return;
    }
    const id = ++reqId.current;
    // Skeletons for the initial load and explicit retries only.
    // Background realtime refreshes update silently — never flash the list.
    const visible = initialLoad.current || manual;
    if (visible) setLoading(true);
    setError(null);
    try {
      const [pRes, hRes] = await Promise.all([
        supabase
          .from('people')
          .select('id,name,role,board,points_a,points_b,avatar_color,updated_at')
          .order('name'),
        supabase
          .from('points_history')
          .select('*, people(id,name)')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);
      if (id !== reqId.current) return;
      if (pRes.error) throw pRes.error;
      if (hRes.error) throw hRes.error;
      setPeople((pRes.data ?? []).map(toPerson));
      setHistory((hRes.data ?? []) as HistoryEntry[]);
      setLive(true);
    } catch (e: unknown) {
      if (id !== reqId.current) return;
      // Never surface raw database errors to visitors (they can leak
      // table/column names and RLS internals). Log detail, expose a code
      // the UI translates into the visitor's language.
      console.error('[Team Leaderboard] load failed:', e);
      // A failed background refresh keeps stale data on screen; only the
      // initial load or an explicit retry may surface the error state.
      if (visible) setError('LOAD_FAILED');
    } finally {
      if (visible && id === reqId.current) {
        initialLoad.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // Realtime: refresh on any change (debounced lightly)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void fetchAll(), 400);
    };
    const ch = supabase
      .channel('leaderboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'people' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'points_history' }, refresh)
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(ch);
    };
  }, [fetchAll]);

  return { people, history, loading, error, live, configured, refetch: () => fetchAll(true) };
}
