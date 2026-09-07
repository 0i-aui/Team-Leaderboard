import type { Lang } from '../i18n/dictionary';

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

function localeFor(lang: Lang): string {
  // Arabic month/day names, Latin digits (consistent tabular numerals everywhere).
  return lang === 'ar' ? 'ar-u-nu-latn' : 'en-US';
}

export function formatDateTime(iso: string, lang: Lang = 'en'): { date: string; time: string } {
  const locale = localeFor(lang);
  const d = new Date(iso);
  const date = d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  return { date, time };
}

export function timeAgo(iso: string, lang: Lang = 'en'): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (lang === 'ar') {
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} د`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} س`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'منذ يوم';
    if (days === 2) return 'منذ يومين';
    if (days < 30) return `منذ ${days} يوم`;
    return formatDateTime(iso, lang).date;
  }
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateTime(iso, lang).date;
}

export function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return trimmed.slice(0, 2);
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
