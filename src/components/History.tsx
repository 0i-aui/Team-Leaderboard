import { motion } from 'framer-motion';
import { StickyNote } from 'lucide-react';
import type { ActivityFilter, HistoryEntry, HistoryFilter, SourceKey, TeamFilter, WeekFilter } from '../types';
import type { RankedEvent } from '../utils/rank';
import { formatDateTime, timeAgo } from '../lib/format';
import { useLanguage } from '../i18n/LanguageContext';
import { displayName } from '../i18n/names';
import { PointsMove } from './PersonRow';
import { revealTween } from '../utils/motion';

const FRESH_MS = 24 * 3600 * 1000;

const DOT: Record<SourceKey, string> = {
  supervisor: 'bg-sky-500',
  leader: 'bg-amber-500',
  members: 'bg-emerald-500',
  admin: 'bg-violet-500',
  management: 'bg-orange-500',
};

function sourceWord(t: ReturnType<typeof useLanguage>['t'], key: SourceKey): string {
  return {
    supervisor: t.history.supervisor,
    leader: t.history.leader,
    members: t.history.membersSrc,
    admin: t.history.admin,
    management: t.history.management,
  }[key];
}

/**
 * User-friendly history card: who, what happened, previous → new,
 * point + rank movement, team, and human time. No technical jargon.
 */
export function HistoryItem({
  item,
  event,
}: {
  item: HistoryEntry;
  event?: RankedEvent;
}) {
  const { lang, t } = useLanguage();
  const { date, time } = formatDateTime(item.created_at, lang);
  const ago = timeAgo(item.created_at, lang);
  const isFresh = Date.now() - new Date(item.created_at).getTime() < FRESH_MS;
  const gain = item.points_change > 0;
  const source = sourceWord(t, item.source_key);
  const name = item.people ? displayName(item.people.name, lang) : t.history.unknownMember;
  const what = gain
    ? t.history.addedPoints(source, Math.abs(item.points_change))
    : t.history.removedPoints(source, Math.abs(item.points_change));
  const move = event?.rankMove ?? null;
  return (
    <motion.li
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-24px' }}
      transition={revealTween}
      className="relative ps-6"
    >
      <span aria-hidden className={`absolute start-[5px] top-[7px] h-2 w-2 rounded-full ${DOT[item.source_key]}`} />
      <div className="surface rounded-2xl px-3.5 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-[15px] font-bold tracking-tight">{name}</span>
          <PointsMove value={item.points_change} />
        </div>
        <p className="mt-0.5 text-[13px] text-slate-600 dark:text-slate-300">{what}</p>
        <p className="num-tabular mt-1 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
          {t.history.fromTo(item.previous_total, item.new_total)}
          <span className="font-normal opacity-80"> · {t.history.pointsWord}</span>
        </p>
        {item.reason && (
          <p className="mt-1 flex max-w-full items-start gap-1 text-[13px] text-slate-500 dark:text-slate-400">
            <StickyNote size={11} className="mt-1 shrink-0" aria-hidden />
            <span className="min-w-0 break-words">{item.reason}</span>
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="num-tabular">
            {ago} · {date} · {time}
          </span>
          {event?.team && (
            <span className="rounded-full bg-slate-900/[0.05] px-2 py-0.5 text-[11px] font-bold dark:bg-white/[0.07]">
              {event.team === 'A' ? t.teams.a : t.teams.b}
            </span>
          )}
          {isFresh && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              {t.history.new}
            </span>
          )}
        </div>
        {move != null && move !== 0 && (
          <p className={`mt-1 text-xs font-bold ${move > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
            <span aria-hidden>{move > 0 ? '↑' : '↓'} </span>
            {move > 0 ? t.history.rankImproved(Math.abs(move)) : t.history.rankDropped(Math.abs(move))}
          </p>
        )}
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
    <div className="flex flex-wrap gap-1.5" aria-label={t.history.filtersLabel}>
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={filter === o.id}
          className={`btn-press min-h-[40px] rounded-full border px-3.5 text-xs font-semibold transition-colors ${
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

function Pill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`btn-press min-h-[40px] rounded-full border px-3.5 text-xs font-semibold transition-colors ${
        active
          ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-white/10 dark:text-slate-400 dark:hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

export function TeamFilterPills({ value, onChange }: { value: TeamFilter; onChange: (v: TeamFilter) => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap gap-1.5" aria-label={t.historyView.teamLabel}>
      <Pill active={value === 'all'} onClick={() => onChange('all')} label={t.history.all} />
      <Pill active={value === 'A'} onClick={() => onChange('A')} label={t.teams.a} />
      <Pill active={value === 'B'} onClick={() => onChange('B')} label={t.teams.b} />
    </div>
  );
}

export function ActivityFilterPills({ value, onChange }: { value: ActivityFilter; onChange: (v: ActivityFilter) => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap gap-1.5" aria-label={t.historyView.typeLabel}>
      <Pill active={value === 'all'} onClick={() => onChange('all')} label={t.historyView.typeAll} />
      <Pill active={value === 'points'} onClick={() => onChange('points')} label={t.historyView.typePoints} />
      <Pill active={value === 'ranks'} onClick={() => onChange('ranks')} label={t.historyView.typeRanks} />
    </div>
  );
}

export function WeekFilterPills({ value, onChange }: { value: WeekFilter; onChange: (v: WeekFilter) => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap gap-1.5" aria-label={t.historyView.weekLabel}>
      <Pill active={value === 'all'} onClick={() => onChange('all')} label={t.historyView.dateAll} />
      <Pill active={value === 'this'} onClick={() => onChange('this')} label={t.historyView.thisWeek} />
      <Pill active={value === 'previous'} onClick={() => onChange('previous')} label={t.historyView.prevWeeks} />
    </div>
  );
}
