import type { Dict } from '../i18n/dictionary';
import type { HistoryEntry, Person, RoleMark } from '../types';
import { teamOf as teamOfFallback, teamOfPerson, type TeamId } from './teams';

/** Sort descending by total, sharing ranks on ties (1, 2, 2, 4 …). */
export function rankBy<T>(rows: T[], value: (row: T) => number): (T & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => value(b) - value(a));
  let rank = 0;
  let prev: number | null = null;
  return sorted.map((row, i) => {
    const v = value(row);
    if (prev === null || v !== prev) rank = i + 1;
    prev = v;
    return { ...row, rank };
  });
}

/**
 * Team-board ranking: sequential positions 1…N ordered by total points
 * DESC, ties broken deterministically by canonical name ASC. Used for the
 * leaderboard display (and therefore zones) so every member always holds
 * a valid distinct rank — even at 0–0 ties — while history replay keeps
 * shared-rank semantics in rankBy() untouched.
 */
export function rankSequential(rows: Person[]): (Person & { rank: number })[] {
  return [...rows]
    .sort((a, b) => b.total_points - a.total_points || a.name.localeCompare(b.name))
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

/**
 * Point-category labels, DERIVED from role marks.
 *  * ADMIN mark (historical — no active member currently carries it;
 *    kept so old audit rows still render) ... Members + Management
 *  * everyone else ...... Admin only (single scoring source)
 */
export function pointLabels(t: Dict, roles: RoleMark[]): { a: string; b: string } {
  if (roles.includes('admin')) return { a: t.card.membersPts, b: t.card.management };
  return { a: t.card.admin, b: '' };
}

/** Safe-zone cutoff INSIDE each 10-person team: ranks 1–5 safe, 6–10 red. */
export const SAFE_CUTOFF = 5;

export type Zone = 'safe' | 'red';

export function getZone(rank: number): Zone {
  return rank <= SAFE_CUTOFF ? 'safe' : 'red';
}

/** Start of the current week (Monday 00:00 local) — Monday → Sunday weeks. */
export function weekStartLocal(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday = 0 … Sunday = 6
  d.setDate(d.getDate() - day);
  return d;
}

export interface Movement {
  /** Net points gained in the current scoring period (sums of history rows). */
  pointsMove: number;
  /** Rank improvement vs period start (positive = moved up). Null when not computable. */
  rankMove: number | null;
  /** Total at the start of the current scoring period. */
  periodStartTotal: number;
}

export interface PeriodBounds {
  /** Scoring period starts at the later of: Monday 00:00 or the last reset. */
  start: Date;
}

/**
 * Stock-market style movement, computed ONLY from real data:
 * people totals + the append-only points_history audit log.
 * Nothing is invented: when there is no period activity, movement is 0/—.
 *
 * Baseline = each person's total at the later of (week start, scoring reset).
 * Reconstructed as: current total − sum(period history rows for that person).
 * Rank movement = baseline rank − current rank, computed within `scope`
 * (pass a single team's roster for per-team ranks).
 */
export function computeMovement(
  scope: Person[],
  history: HistoryEntry[],
  bounds: PeriodBounds,
): Record<string, Movement> {
  const startMs = bounds.start.getTime();
  const periodGain = new Map<string, number>();
  for (const h of history) {
    if (new Date(h.created_at).getTime() < startMs) continue;
    periodGain.set(h.person_id, (periodGain.get(h.person_id) ?? 0) + h.points_change);
  }
  const startTotals = new Map<string, number>();
  for (const p of scope) {
    startTotals.set(p.id, p.total_points - (periodGain.get(p.id) ?? 0));
  }
  const curRanked = rankBy(scope, (p) => p.total_points);
  const baseRanked = rankBy(scope, (p) => startTotals.get(p.id) ?? p.total_points);
  const baseRank = new Map(baseRanked.map((p) => [p.id, p.rank]));
  const out: Record<string, Movement> = {};
  for (const p of curRanked) {
    const b = baseRank.get(p.id) ?? p.rank;
    const gain = periodGain.get(p.id) ?? 0;
    out[p.id] = {
      pointsMove: gain,
      rankMove: gain === 0 && b === p.rank ? 0 : b - p.rank,
      periodStartTotal: startTotals.get(p.id) ?? p.total_points,
    };
  }
  return out;
}

export interface RankedEvent {
  team: TeamId | null;
  rankBefore: number | null;
  rankAfter: number | null;
  rankMove: number | null;
}

/**
 * Per-event rank movement, replayed honestly from the audit log.
 * Walks history newest→oldest, undoing each row from the live totals,
 * so every event gets its within-team rank just before and just after.
 * Rows older than the fetched window degrade gracefully (null ranks).
 */
export function historyRankMoves(
  people: Person[],
  history: HistoryEntry[],
): Record<string, RankedEvent> {
  const nameById = new Map(people.map((p) => [p.id, p.name]));
  const teamMembers = (team: TeamId): string[] =>
    people.filter((p) => teamOfPerson(p) === team).map((p) => p.id);
  const totals = new Map(people.map((p) => [p.id, p.total_points]));
  const desc = [...history].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  const rankIn = (team: TeamId, totalsAt: Map<string, number>, personId: string): number | null => {
    const ids = teamMembers(team);
    if (!ids.includes(personId)) return null;
    const ranked = rankBy(ids, (id) => totalsAt.get(id) ?? 0);
    return ranked.findIndex((id) => id === personId) + 1 || null;
  };

  const out: Record<string, RankedEvent> = {};
  const byId = new Map(people.map((p) => [p.id, p]));
  for (const h of desc) {
    const person = byId.get(h.person_id);
    const name = h.people?.name ?? person?.name ?? nameById.get(h.person_id);
    const team = person ? teamOfPerson(person) : name != null ? teamOfFallback(name) : null;
    if (team == null) {
      out[h.id] = { team: null, rankBefore: null, rankAfter: null, rankMove: null };
      continue;
    }
    const rankAfter = rankIn(team, totals, h.person_id);
    totals.set(h.person_id, (totals.get(h.person_id) ?? 0) - h.points_change);
    const rankBefore = rankIn(team, totals, h.person_id);
    out[h.id] = {
      team,
      rankBefore,
      rankAfter,
      rankMove: rankBefore != null && rankAfter != null ? rankBefore - rankAfter : null,
    };
  }
  return out;
}
