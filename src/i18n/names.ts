import type { Lang } from './dictionary';

/**
 * Canonical English name → Arabic display name.
 * Presentation layer only: database identity, joins, ranking, points
 * and history all keep using the English canonical names.
 */
export const AR_NAMES: Record<string, string> = {
  Islam: 'إسلام',
  'Ahmed Mohamed': 'أحمد محمد',
  Eman: 'إيمان',
  Basant: 'بسنت',
  Thomas: 'توماس',
  Jana: 'جنى',
  Habiba: 'حبيبة',
  Khaled: 'خالد',
  Zahra: 'زهرة',
  'Abdel Rahman': 'عبد الرحمن',
  Fayrouz: 'فيروز',
  'Mohamed Ahmed': 'محمد أحمد',
  'Mohamed Ashraf': 'محمد أشرف',
  'Mohamed El Desouky': 'محمد الدسوقي',
  'Mohamed Sayed Hassan': 'محمد سيد حسن',
  'Mohamed Sayed Saleh': 'محمد سيد صالح',
  'Mohamed Nady': 'محمد نادي',
  Youssef: 'يوسف',
  Mohreal: 'مهرائيل',
};

/**
 * Localized nicknames/aliases — presentation layer only.
 * Canonical database names MUST remain unchanged; matching, search,
 * ranking and history keep using the canonical member id/name.
 *
 * Source of truth lives in the database (`people.name_ar`,
 * `nickname_en/ar`); the maps below are fallback defaults kept in
 * sync with supabase/seed.sql for offline/empty states.
 */
export const NICKNAMES: Record<string, { en: string; ar: string }> = {
  'Mohamed El Desouky': { en: 'Turkey', ar: 'تركي' },
  'Mohamed Sayed Hassan': { en: "Don't Care", ar: 'دونت كير' },
};

export interface DbDisplayStrings {
  name: string;
  name_ar: string | null;
  nickname_en: string | null;
  nickname_ar: string | null;
}

// Runtime overrides from the database, populated by useLeaderboard on
// every fetch. DB values win; static maps above are the fallback.
const dbOverrides = new Map<string, DbDisplayStrings>();

/** Register display strings from `people` rows (call on every fetch). */
export function registerDisplayStrings(rows: DbDisplayStrings[]): void {
  dbOverrides.clear();
  for (const r of rows) dbOverrides.set(r.name, r);
}

function dbNick(canonicalName: string): { en: string; ar: string } | null {
  const r = dbOverrides.get(canonicalName);
  if (r && (r.nickname_en || r.nickname_ar)) {
    return { en: r.nickname_en ?? canonicalName, ar: r.nickname_ar ?? canonicalName };
  }
  return null;
}

function dbAr(canonicalName: string): string | null {
  return dbOverrides.get(canonicalName)?.name_ar ?? null;
}

/**
 * Primary display name. ALWAYS the canonical identity, never the nickname:
 * Arabic UI → Arabic name, English UI → canonical English name.
 * Nicknames are rendered separately via nicknameFor() (see below).
 */
export function displayName(canonicalName: string, lang: Lang): string {
  if (lang === 'ar') return dbAr(canonicalName) ?? AR_NAMES[canonicalName] ?? canonicalName;
  return canonicalName;
}

/**
 * Nickname for a member in the active language, or null when the member
 * has none. Render this as SECONDARY metadata next to the canonical name
 * (e.g. "Mohamed El Desouky" + "Turkey · MEMBER"). Never use it as an
 * identifier for IDs, queries, history, scoring, teams, or routing.
 */
export function nicknameFor(canonicalName: string, lang: Lang): string | null {
  const nick = dbNick(canonicalName) ?? NICKNAMES[canonicalName];
  if (!nick) return null;
  return lang === 'ar' ? nick.ar : nick.en;
}

/** All searchable strings for a member: canonical + nickname + Arabic name. */
export function searchNames(canonicalName: string): string[] {
  const out = [canonicalName];
  const nick = dbNick(canonicalName) ?? NICKNAMES[canonicalName];
  if (nick) out.push(nick.en, nick.ar);
  const ar = dbAr(canonicalName) ?? AR_NAMES[canonicalName];
  if (ar) out.push(ar);
  return out;
}
