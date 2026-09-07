import type { Dict } from '../i18n/dictionary';
import type { Board, Person, Role } from '../types';

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

export function rankPeople(people: Person[]): (Person & { rank: number })[] {
  return rankBy(people, (p) => p.total_points);
}

/**
 * Point-category labels, DERIVED from (role, board) — mirrors the SQL
 * comment contract. Single source of truth for the whole UI.
 *  * admin ............ Members + Management
 *  * supervisors board  Leaders + Admin
 *  * members board .... Supervisors + Admin
 */
export function pointLabels(t: Dict, role: Role, board: Board): { a: string; b: string } {
  if (role === 'admin') return { a: t.card.membersPts, b: t.card.management };
  if (board === 'supervisors') return { a: t.card.leaders, b: t.card.admin };
  return { a: t.card.supervisor, b: t.card.admin };
}

/** Safe-zone rank cutoffs per board. Zones are computed from live rank. */
export const ZONE_CUTOFF: Record<Board, number> = {
  members: 10,
  supervisors: 3,
};

export type Zone = 'safe' | 'red';

export function getZone(board: Board, rank: number): Zone {
  return rank <= ZONE_CUTOFF[board] ? 'safe' : 'red';
}
