import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { registerDisplayStrings } from '../i18n/names';
import type { HistoryEntry, HistoryRow, Person, RoleMark, ScoringReset } from '../types';

function toPerson(row: {
  id: string;
  name: string;
  team?: string | null;
  roles: string[];
  points_a: number;
  points_b: number;
  avatar_color: string | null;
  name_ar?: string | null;
  nickname_en?: string | null;
  nickname_ar?: string | null;
  updated_at: string;
}): Person {
  return {
    id: row.id,
    name: row.name,
    // Legacy databases predate the `team`/alias columns — an empty team
    // falls through to the static seed mirror (teamOfPerson), and null
    // display strings fall through to the static name maps.
    team: typeof row.team === 'string' ? row.team : '',
    roles: row.roles as RoleMark[],
    points_a: row.points_a,
    points_b: row.points_b,
    avatar_color: row.avatar_color,
    name_ar: row.name_ar ?? null,
    nickname_en: row.nickname_en ?? null,
    nickname_ar: row.nickname_ar ?? null,
    updated_at: row.updated_at,
    total_points: row.points_a + row.points_b,
  };
}

/** Legacy column names (pre-migration databases). Never written, only read. */
interface LegacyHistoryFields {
  previous_points?: number | null;
  new_points?: number | null;
}

function toHistoryEntry(row: HistoryRow & LegacyHistoryFields): HistoryEntry {
  const { previous_points, new_points, ...rest } = row;
  return {
    ...rest,
    previous_total: row.previous_total ?? previous_points ?? 0,
    new_total: row.new_total ?? new_points ?? 0,
  } as HistoryEntry;
}

/** True when PostgREST reports an unknown column — i.e. the database
 *  predates the migration that added it. Used to degrade gracefully
 *  instead of failing the whole board. */
function isUnknownColumn(e: { code?: string; message?: string } | null): boolean {
  if (!e) return false;
  return e.code === '42703' || /column .* does not exist/i.test(e.message ?? '');
}

/** True when PostgREST reports a missing table — i.e. the database
 *  predates the migration that created it. */
function isMissingTable(e: { code?: string; message?: string } | null): boolean {
  if (!e) return false;
  return e.code === 'PGRST205' || /could not find the table/i.test(e.message ?? '');
}

const PEOPLE_SELECT =
  'id,name,team,roles,points_a,points_b,avatar_color,name_ar,nickname_en,nickname_ar,updated_at';
const PEOPLE_SELECT_LEGACY = 'id,name,roles,points_a,points_b,avatar_color,updated_at';

export function useLeaderboard() {
  const [people, setPeople] = useState<Person[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [resetAt, setResetAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const configured = isSupabaseConfigured;
  // Monotonic id: only the newest fetch may commit. Older overlapping
  // responses (realtime burst + manual retry) are discarded so stale
  // data can never overwrite fresh data.
  const reqId = useRef(0);
  // Schema-shape memory: once the backend proves it predates a migration
  // (missing columns/table), stop re-issuing the failing query on every
  // realtime refresh — one failed request per page load is enough signal.
  const legacyPeople = useRef(false);
  const noResetsTable = useRef(false);
  // Skeletons only on the very first load. Background refreshes
  // (realtime, retry) update silently — never flash the list away.
  const initialLoad = useRef(true);

  const fetchAll = useCallback(async (manual = false) => {
    // No placeholders, no invented scores: without Supabase there is
    // simply no data. The UI shows a setup notice instead.
    if (!isSupabaseConfigured) {
      setPeople([]);
      setHistory([]);
      setResetAt(null);
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
      // Tagged wrapper: keeps both select shapes fully typed (a ternary
      // inside .select() would defeat the query-type parser).
      const [pRes, hRes] = await Promise.all([
        legacyPeople.current
          ? supabase
              .from('people')
              .select(PEOPLE_SELECT_LEGACY)
              .order('name')
              .then((r) => ({ ...r, legacy: true as const }))
          : supabase
              .from('people')
              .select(PEOPLE_SELECT)
              .order('name')
              .then((r) => ({ ...r, legacy: false as const })),
        supabase
          .from('points_history')
          .select('*, people(id,name)')
          .order('created_at', { ascending: false })
          .limit(500),
      ]);
      if (id !== reqId.current) return;
      // People: prefer the full migration-chain column set, but stay
      // usable against older databases that lack `team`/alias columns.
      // Once legacy shape is proven, it is reused directly so realtime
      // refreshes don't re-issue a failing query every time.
      const toLegacyRows = (
        rows: { id: string; name: string; roles: string[]; points_a: number; points_b: number; avatar_color: string | null; updated_at: string }[],
      ): Parameters<typeof toPerson>[0][] =>
        rows.map((r) => ({
          team: '',
          name_ar: null,
          nickname_en: null,
          nickname_ar: null,
          ...r,
        }));
      let pRows: Parameters<typeof toPerson>[0][];
      if (pRes.legacy) {
        if (pRes.error) throw pRes.error;
        pRows = toLegacyRows(pRes.data ?? []);
      } else if (
        pRes.error &&
        isUnknownColumn({ code: pRes.error.code, message: pRes.error.message })
      ) {
        legacyPeople.current = true;
        const pLegacy = await supabase.from('people').select(PEOPLE_SELECT_LEGACY).order('name');
        if (id !== reqId.current) return;
        if (pLegacy.error) throw pLegacy.error;
        pRows = toLegacyRows(pLegacy.data ?? []);
      } else {
        if (pRes.error) throw pRes.error;
        pRows = pRes.data ?? [];
      }
      if (hRes.error) throw hRes.error;
      setPeople(pRows.map(toPerson));
      // Display strings come from the database; static maps in
      // i18n/names.ts remain as fallback defaults only.
      registerDisplayStrings(
        pRows.map((r) => ({
          name: r.name,
          name_ar: r.name_ar ?? null,
          nickname_en: r.nickname_en ?? null,
          nickname_ar: r.nickname_ar ?? null,
        })),
      );
      setHistory(
        ((hRes.data ?? []) as unknown as (HistoryRow & LegacyHistoryFields)[]).map(toHistoryEntry),
      );
      // Scoring-period boundary (skipped entirely once the backend proves
      // the table doesn't exist — see noResetsTable above).
      if (!noResetsTable.current) {
        const rRes = await supabase
          .from('scoring_resets')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (id !== reqId.current) return;
        if (rRes.error) {
          if (isMissingTable({ code: rRes.error.code, message: rRes.error.message })) {
            noResetsTable.current = true;
          }
        } else {
          const row = rRes.data as Pick<ScoringReset, 'created_at'> | null;
          setResetAt(row?.created_at ?? null);
        }
      }
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

  return { people, history, resetAt, loading, error, live, configured, refetch: () => fetchAll(true) };
}
