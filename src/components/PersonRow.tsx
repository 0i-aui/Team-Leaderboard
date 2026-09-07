import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { Person } from '../types';
import type { Zone } from '../utils/rank';
import { formatNumber } from '../lib/format';
import { useCountUp } from '../hooks/useCountUp';
import { useLanguage } from '../i18n/LanguageContext';
import { Avatar } from './Avatar';
import { RoleBadge } from './RoleBadge';

function Total({ value }: { value: number }) {
  const v = useCountUp(value);
  return <span className="num-tabular">{formatNumber(v)}</span>;
}

function Name({ name, query }: { name: string; query?: string }) {
  const { t } = useLanguage();
  const q = (query ?? '').trim();
  if (!q) return <>{name}</>;
  const i = name.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return <>{name}</>;
  return (
    <>
      {name.slice(0, i)}
      <mark aria-label={t.search.label}>{name.slice(i, i + q.length)}</mark>
      {name.slice(i + q.length)}
    </>
  );
}

export function PersonRow({
  person,
  rank,
  index,
  zone,
  labels,
  delta,
  isNew,
  query,
  onSelect,
}: {
  person: Person;
  rank: number;
  index: number;
  zone: Zone;
  labels: { a: string; b: string };
  delta?: number;
  isNew?: boolean;
  query?: string;
  onSelect: () => void;
}) {
  const { t } = useLanguage();
  const top = rank <= 3;
  const safe = zone === 'safe';
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
        delay: Math.min(index * 0.03, 0.25),
        layout: { type: 'spring', stiffness: 350, damping: 34 },
      }}
      aria-label={t.card.personAria(rank, person.name, person.total_points)}
      className={`rowline row-hover row-press w-full px-3 py-3 text-start sm:px-4 ${
        rank === 1 ? 'bg-slate-900/[0.025] dark:bg-white/[0.03]' : ''
      }`}
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
          {delta != null && delta !== 0 && (
            <span
              title={delta > 0 ? t.move.up(Math.abs(delta)) : t.move.down(Math.abs(delta))}
              className={`num-tabular text-[10px] font-bold leading-tight ${
                delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
              }`}
            >
              {delta > 0 ? `↑${delta}` : `↓${Math.abs(delta)}`}
            </span>
          )}
          {isNew && (
            <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              {t.history.new}
            </span>
          )}
        </span>

        <Avatar name={person.name} color={person.avatar_color} size="sm" />

        {/* Identity */}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="truncate text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              <Name name={person.name} query={query} />
            </span>
            <RoleBadge role={person.role} />
          </span>
          {/* Mobile breakdown line */}
          <span className="num-tabular mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400 md:hidden">
            {labels.a} {formatNumber(person.points_a)} · {labels.b} {formatNumber(person.points_b)}
          </span>
        </span>

        {/* Desktop breakdown */}
        <span className="hidden shrink-0 items-center gap-5 md:flex">
          <span className="w-20 text-end">
            <span className="num-tabular block text-[15px] font-semibold text-slate-800 dark:text-slate-200">
              {formatNumber(person.points_a)}
            </span>
            <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {labels.a}
            </span>
          </span>
          <span className="w-20 text-end">
            <span className="num-tabular block text-[15px] font-semibold text-slate-800 dark:text-slate-200">
              {formatNumber(person.points_b)}
            </span>
            <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {labels.b}
            </span>
          </span>
        </span>

        {/* Total */}
        <span className="w-[76px] shrink-0 text-end sm:w-[92px]">
          <span className="num-tabular block text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            <Total value={person.total_points} />
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

        <ChevronRight size={16} className="shrink-0 text-slate-300 rtl:rotate-180 dark:text-slate-600" aria-hidden />
      </span>
    </motion.button>
  );
}
