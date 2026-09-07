import type { Zone } from '../utils/rank';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Typographic zone divider: status word + range + hairline rule.
 * A status system, not a warning screen.
 */
export function ZoneHeader({ zone, sub }: { zone: Zone; sub: string }) {
  const { t } = useLanguage();
  const safe = zone === 'safe';
  return (
    <div role="separator" aria-label={`${safe ? t.zones.safe : t.zones.red} — ${sub}`} className="flex items-baseline gap-3 pt-1">
      <span
        className={`text-[11px] font-bold uppercase tracking-[0.08em] ${
          safe ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`}
      >
        {safe ? t.zones.safe : t.zones.red}
      </span>
      <span className="num-tabular text-[11px] font-medium text-slate-400 dark:text-slate-500">{sub}</span>
      <span aria-hidden className={`h-px flex-1 ${safe ? 'bg-emerald-600/20' : 'bg-rose-600/20'}`} />
    </div>
  );
}
