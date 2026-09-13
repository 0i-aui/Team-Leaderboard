import { ShieldCheck, TriangleAlert } from 'lucide-react';
import type { Zone } from '../utils/rank';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Typographic zone divider: icon + status word + range + hairline rule.
 * Zone is never color alone — icon, label, and position all reinforce it.
 */
export function ZoneHeader({ zone, sub }: { zone: Zone; sub: string }) {
  const { t } = useLanguage();
  const safe = zone === 'safe';
  const Icon = safe ? ShieldCheck : TriangleAlert;
  return (
    <div role="separator" aria-label={`${safe ? t.zones.safe : t.zones.red} — ${sub}`} className="flex items-baseline gap-3 pt-1">
      <span
        className={`inline-flex items-baseline gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] ${
          safe ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`}
      >
        <Icon size={12} strokeWidth={2.5} aria-hidden className="translate-y-[1.5px]" />
        {safe ? t.zones.safe : t.zones.red}
      </span>
      <span className="num-tabular text-[11px] font-medium text-slate-500 dark:text-slate-400">{sub}</span>
      <span aria-hidden className={`h-px flex-1 ${safe ? 'bg-emerald-600/20' : 'bg-rose-600/20'}`} />
    </div>
  );
}
