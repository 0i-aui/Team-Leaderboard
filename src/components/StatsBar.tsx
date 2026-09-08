import { formatNumber, timeAgo } from '../lib/format';
import { useCountUp } from '../hooks/useCountUp';
import { useLanguage } from '../i18n/LanguageContext';

/** A single quiet metadata line — totals without the dashboard cards. */
export function StatsBar({
  totalPeople,
  totalPoints,
  latestUpdate,
}: {
  totalPeople: number;
  totalPoints: number;
  latestUpdate: string | null;
}) {
  const { lang, t } = useLanguage();
  const points = useCountUp(totalPoints);
  return (
    <p className="num-tabular text-[13px] text-slate-500 dark:text-slate-400" aria-live="polite">
      <strong className="font-semibold text-slate-800 dark:text-slate-200">{formatNumber(totalPeople)}</strong>{' '}
      {t.list.members} · <strong className="font-semibold text-slate-800 dark:text-slate-200">{formatNumber(points)}</strong>{' '}
      {t.stats.points.toLowerCase()}
      {latestUpdate && (
        <span className="text-slate-400 dark:text-slate-500"> · {timeAgo(latestUpdate, lang)}</span>
      )}
    </p>
  );
}
