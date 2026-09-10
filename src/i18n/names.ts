import type { Lang } from './dictionary';

/**
 * Canonical English name → Arabic display name.
 * Presentation layer only: database identity, joins, ranking, points
 * and history all keep using the English canonical names.
 */
export const AR_NAMES: Record<string, string> = {
  Islam: 'إسلام',
  'Ahmed Sameh': 'أحمد سامح',
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

/** Display name for the active language. Falls back to English. */
export function displayName(canonicalName: string, lang: Lang): string {
  if (lang === 'ar') return AR_NAMES[canonicalName] ?? canonicalName;
  return canonicalName;
}
