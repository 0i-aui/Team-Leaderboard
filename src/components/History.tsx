import { motion } from 'framer-motion';
import { StickyNote } from 'lucide-react';
import type { HistoryEntry, HistoryFilter, SourceKey } from '../types';
import { formatDateTime, formatNumber, timeAgo } from '../lib/format';
import { useLanguage } from '../i18n/LanguageContext';

const FRESH_MS = 24 * 3600 * 1000;

const DOT: Record<SourceKey, string> = {
  supervisor: 'bg-sky-500',
  leader: 'bg-amber-500',
  members: 'bg-emerald-500',
  admin: 'bg-violet-500',
  management: 'bg-orange-500',
};

export function HistoryItem({ item, index }: { item: HistoryEntry; index: number }) {
  const { lang, t } = useLanguage();
  const { date } = formatDateTime(item.created_at, lang);
  const isFresh = Date.now() - new Date(item.created_at).getTime() < FRESH_MS;
  const gain = item.points_change > 0;
  const sourceLabel = {
    supervisor: t.history.supervisor,
    leader: t.history.leader,
    members: t.history.membersSrc,
    admin: t.history.admin,
    management: t.history.management,
  }[item.source_key];
  return (
    <motion.li
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-24px' }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.15) }}
      className="relative ps-6"
    >
      <span aria-hidden className={`absolute start-[5px] top-[7px] h-2 w-2 rounded-full ${DOT[item.source_key]}`} />
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className={`num-tabular text-[15px] font-bold ${gain ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
          {gain ? '+' : ''}{formatNumber(item.points_change)}
        </span>
        <span className="truncate text-sm font-semibold">{item.people?.name ?? t.history.unknownMember}</span>
        {isFresh && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            {t.history.new}
          </span>
        )}
      </div>
      <div className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
        {sourceLabel}
        {item.reason && (
          <span className="inline-flex max-w-full items-start gap-1">
            {' · '}
            <span className="truncate">
              <StickyNote size={11} className="me-0.5 inline shrink-0 -mt-0.5" aria-hidden />
              {item.reason}
            </span>
          </span>
        )}
      </div>
      <div className="num-tabular mt-0.5 text-xs text-slate-400 dark:text-slate-500">
        {timeAgo(item.created_at, lang)} · {date}
        <span className="opacity-70"> · {formatNumber(item.previous_points)} → {formatNumber(item.new_points)}</span>
      </div>
    </motion.li>
  );
}

export function HistoryFilters({ filter, onChange }: { filter: HistoryFilter; onChange: (f: HistoryFilter) => void }) {
  const { t } = useLanguage();
  const opts: { id: HistoryFilter; label: string }[] = [
    { id: 'all', label: t.history.all },
    { id: 'supervisor', label: t.history.supervisor },
    { id: 'leader', label: t.history.leader },
    { id: 'members', label: t.history.membersSrc },
    { id: 'admin', label: t.history.admin },
    { id: 'management', label: t.history.management },
  ];
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t.history.filtersLabel}>
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-selected={filter === o.id}
          className={`btn-press min-h-[34px] rounded-full border px-3.5 text-xs font-semibold transition-colors ${
            filter === o.id
              ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
              : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-white/10 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
