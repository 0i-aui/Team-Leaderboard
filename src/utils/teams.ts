/**
 * Team split.
 * Source of truth is the database (`people.team`, seeded in
 * supabase/seed.sql). The static maps below mirror the seed exactly
 * and serve only as a fallback for rows missing a team value —
 * membership is never guessed.
 */

export type TeamId = 'A' | 'B';

export function isTeamId(v: unknown): v is TeamId {
  return v === 'A' || v === 'B';
}

export const TEAM_A: readonly string[] = [
  'Eman',
  'Jana',
  'Habiba',
  'Mohreal',
  'Mohamed Sayed Hassan',
  'Zahra',
  'Fayrouz',
  'Basant',
  'Mohamed El Desouky',
  'Abdel Rahman',
];

export const TEAM_B: readonly string[] = [
  'Mohamed Ashraf',
  'Khaled',
  'Thomas',
  'Mohamed Ahmed',
  'Mohamed Sayed Saleh',
  'Mohamed Nady',
  'Youssef',
  'Islam',
  'Ahmed Mohamed',
];

const TEAM_OF = new Map<string, TeamId>();
for (const n of TEAM_A) TEAM_OF.set(n, 'A');
for (const n of TEAM_B) TEAM_OF.set(n, 'B');

/** Team for a canonical member name. Unknown names → null (never guessed). */
export function teamOf(canonicalName: string): TeamId | null {
  return TEAM_OF.get(canonicalName) ?? null;
}

/**
 * Team for a member row: the database `team` column wins; the static
 * seed mirror above is the fallback for rows missing a team value.
 */
export function teamOfPerson(person: { team?: unknown; name: string }): TeamId | null {
  if (isTeamId(person.team)) return person.team;
  return teamOf(person.name);
}
