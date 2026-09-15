import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { Person } from '../types';
import type { Zone } from '../utils/rank';
import { formatNumber } from '../lib/format';
import { useCountUp } from '../hooks/useCountUp';
import { useLanguage } from '../i18n/LanguageContext';
import { Avatar } from './Avatar';
import { RoleMarks } from './RoleMarks';
import { displayName, nicknameFor } from '../i18n/names';
import type { Lang } from '../i18n/dictionary';
import { ROW_MOUNT_DELAY_CAP, ROW_MOUNT_DELAY_STEP, rowSpring } from '../utils/motion';

function Total({ value }: { value: number }) {
  const v = useCountUp(value);
  return <span className="num-tabular">{formatNumber(v)}</span>;
}

function Name({ name, query, lang }: { name: string; query?: string; lang: Lang }) {
  const { t } = useLanguage();
  const shown = displayName(name, lang);
  const q = (query ?? '').trim();
  if (!q) return <>{shown}</>;
  const i = shown.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return <>{shown}</>;
  return (
    <>
      {shown.slice(0, i)}
      <mark aria-label={t.search.label}>{shown.slice(i, i + q.length)}</mark>
      {shown.slice(i + q.length)}
    </>
  );
}

/**
 * Stock-market style point movement chip: ↑ +20 / — / ↓ −10.
 * Values come from the audit log (never invented): 0 renders as "—".
 */
export function PointsMove({ value }: { value: number }) {
  const { t } = useLanguage();
  if (value === 0) {
    return <span className="num-tabular text-[11px] font-semibold text-slate-300 dark:text-slate-600">{t.move.noChange}</span>;
  }
  const up = value > 0;
  return (
    <span
      className={`tick num-tabular inline-flex items-center gap-0.5 text-[11px] font-bold ${
        up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
      }`}
    >
      <span aria-hidden className={up ? 'tick-up' : 'tick-down'}>{up ? '↑' : '↓'}</span>
      {up ? t.move.pointsUp(value) : t.move.pointsDown(Math.abs(value))}
    </span>
  );
}

function RankMove({ value }: { value: number | null | undefined }) {
  const { t } = useLanguage();
  if (value == null || value === 0) return null;
  const up = value > 0;
  return (
    <span
      title={up ? t.move.up(Math.abs(value)) : t.move.down(Math.abs(value))}
      className={`tick num-tabular text-[10px] font-bold leading-tight ${
        up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
      }`}
    >
      <span aria-hidden className={up ? 'tick-up' : 'tick-down'}>{up ? '↑' : '↓'}</span>
      {Math.abs(value)}
    </span>
  );
}

export function PersonRow({
  person,
  rank,
  index,
  zone,
  labels,
  pointsMove,
  rankMove,
  query,
  flash,
  onSelect,
}: {
  person: Person;
  rank: number;
  index: number;
  zone: Zone;
  labels: { a: string; b: string };
  pointsMove?: number;
  rankMove?: number | null;
  query?: string;
  /** Transient highlight right after this row actually changed rank */
  flash?: 'up' | 'down';
  onSelect: () => void;
}) {
  const { lang, t } = useLanguage();
  const top = rank <= 3;
  const safe = zone === 'safe';
  const nick = nicknameFor(person.name, lang);
  const breakdown: { label: string; value: number }[] = [
    { label: labels.a, value: person.points_a },
    ...(labels.b ? [{ label: labels.b, value: person.points_b }] : []),
  ];
  return (
    <motion.button
      layout
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      whileTap={{ scale: 0.995 }}
      transition={{
        duration: 0.25,
        delay: Math.min(index * ROW_MOUNT_DELAY_STEP, ROW_MOUNT_DELAY_CAP),
        layout: rowSpring,
      }}
      aria-label={t.card.personAria(rank, displayName(person.name, lang), person.total_points)}
      className={`rowline row-hover row-press group w-full px-3 py-3 text-start sm:px-4 ${
        rank === 1 ? 'bg-slate-900/[0.025] dark:bg-white/[0.03]' : ''
      } ${flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : ''}`}
    >
      <span className="flex items-center gap-3">
        {/* Rank */}
        <span className="flex w-9 shrink-0 flex-col items-center">
          <span
            className={`num-tabular text-[15px] ${
              top ? 'font-extrabold text-slate-900 dark:text-white' : 'font-bold text-slate-400 dark:text-slate-500'
            }`}
          >
            {rank}
          </span>
          <RankMove value={rankMove} />
        </span>

        <Avatar name={person.name} color={person.avatar_color} size="sm" />

        {/* Identity: canonical name is primary; nickname (if any) is
            secondary metadata next to the role marks — never a replacement. */}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="truncate text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              <Name name={person.name} query={query} lang={lang} />
            </span>
            {nick && (
              <span className="truncate text-[13px] font-medium text-slate-400 dark:text-slate-500">
                {nick}
              </span>
            )}
            <RoleMarks roles={person.roles} />
          </span>
          {/* Mobile breakdown line */}
          <span className="num-tabular mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400 md:hidden">
            {breakdown.map((r) => `${r.label} ${formatNumber(r.value)}`).join(' · ')}
          </span>
        </span>

        {/* Desktop breakdown */}
        <span className="hidden shrink-0 items-center gap-5 md:flex">
          {breakdown.map((r) => (
            <span key={r.label} className="w-20 text-end">
              <span className="num-tabular block text-[15px] font-semibold text-slate-800 dark:text-slate-200">
                {formatNumber(r.value)}
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {r.label}
              </span>
            </span>
          ))}
        </span>

        {/* Total + point movement */}
        <span className="w-[76px] shrink-0 text-end sm:w-[92px]">
          <span className="num-tabular block text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            <Total value={person.total_points} />
          </span>
          <span className="mt-0.5 flex items-center justify-end">
            <PointsMove value={pointsMove ?? 0} />
          </span>
          <span
            className={`mt-0.5 flex items-center justify-end gap-1 text-[9px] font-bold uppercase tracking-[0.08em] ${
              safe ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
            }`}
          >
            <span aria-hidden className={`h-1 w-1 rounded-full ${safe ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            {safe ? t.zones.shortSafe : t.zones.shortRed}
          </span>
        </span>

        <ChevronRight size={16} className="shrink-0 text-slate-300 transition-colors duration-150 group-hover:text-slate-500 rtl:rotate-180 dark:text-slate-600 dark:group-hover:text-slate-300" aria-hidden />
      </span>
    </motion.button>
  );
}
