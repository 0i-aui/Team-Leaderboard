import type { Dict } from '../i18n/dictionary';
import type { Person, RoleMark } from '../types';

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
 * Point-category labels, DERIVED from role marks — mirrors the SQL
 * comment contract. Single source of truth for the whole UI.
 *  * ADMIN mark ......... Members + Management
 *  * SUPERVISOR mark .... Leaders + Admin
 *  * otherwise .......... Supervisors + Admin
 */
export function pointLabels(t: Dict, roles: RoleMark[]): { a: string; b: string } {
  if (roles.includes('admin')) return { a: t.card.membersPts, b: t.card.management };
  if (roles.includes('supervisor')) return { a: t.card.leaders, b: t.card.admin };
  return { a: t.card.supervisor, b: t.card.admin };
}

/** Safe-zone rank cutoff for the single 20-person board. Zone is computed from live rank. */
export const SAFE_CUTOFF = 10;

export type Zone = 'safe' | 'red';

export function getZone(rank: number): Zone {
  return rank <= SAFE_CUTOFF ? 'safe' : 'red';
}
