import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { History as HistoryIcon, X } from 'lucide-react';
import type { HistoryEntry, Person } from '../types';
import { formatDateTime, formatNumber, timeAgo } from '../lib/format';
import { useLanguage } from '../i18n/LanguageContext';
import { getZone } from '../utils/rank';
import { Avatar } from './Avatar';
import { RoleMarks } from './RoleMarks';
import { displayName, nicknameFor } from '../i18n/names';
import { fadeFast, sheetSpring } from '../utils/motion';

const SOURCE_WORD: Record<HistoryEntry['source_key'], 'supervisor' | 'leader' | 'membersSrc' | 'admin' | 'management'> = {
  supervisor: 'supervisor',
  leader: 'leader',
  members: 'membersSrc',
  admin: 'admin',
  management: 'management',
};

export function PersonSheet({
  person,
  rank,
  totalCount,
  history,
  labels,
  teamName,
  pointsMove,
  onClose,
  onViewHistory,
}: {
  person: Person | null;
  rank: number;
  totalCount: number;
  history: HistoryEntry[];
  labels: { a: string; b: string };
  teamName?: string;
  pointsMove?: number;
  onClose: () => void;
  onViewHistory: (personId: string) => void;
}) {
  const { lang, t } = useLanguage();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!person) return;
    // Move focus into the dialog on open; restore it on close so
    // keyboard and screen-reader users never lose their place.
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus({ preventScroll: true });
    };
  }, [person, onClose]);

  const recent = person ? history.filter((h) => h.person_id === person.id).slice(0, 6) : [];
  const nick = person ? nicknameFor(person.name, lang) : null;
  const rows = person
    ? [{ label: labels.a, value: person.points_a }, ...(labels.b ? [{ label: labels.b, value: person.points_b }] : [])]
    : [];
  const max = rows.length > 0 ? Math.max(...rows.map((r) => r.value), 1) : 1;

  return (
    <AnimatePresence>
      {person && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={displayName(person.name, lang)}>
          <motion.button
            type="button"
            aria-label={t.sheet.close}
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeFast}
          />
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.98 }}
            transition={sheetSpring}
            className="surface relative max-h-[86vh] w-full overflow-y-auto rounded-t-3xl p-6 shadow-2xl sm:max-w-md sm:rounded-3xl"
          >
            <span aria-hidden className="mx-auto mb-4 block h-1 w-10 rounded-full bg-slate-300 sm:hidden dark:bg-slate-600" />
            <button
              type="button"
              ref={closeRef}
              onClick={onClose}
              aria-label={t.sheet.close}
                className="btn-press absolute end-4 top-4 grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-slate-900/5 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
            >
              <X size={17} />
            </button>

            <div className="flex items-center gap-3">
              <Avatar name={person.name} color={person.avatar_color} />
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold tracking-tight">{displayName(person.name, lang)}</h3>
                {nick && (
                  <p className="truncate text-sm font-medium text-slate-400 dark:text-slate-500">{nick}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <RoleMarks roles={person.roles} />
                  {teamName && (
                    <span className="rounded-full bg-slate-900/[0.05] px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-white/[0.07] dark:text-slate-400">
                      {teamName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 border-y border-slate-200 py-4 dark:border-white/10">
              <div>
                <div className="label-caps">{t.sheet.rank}</div>
                <div className="num-tabular mt-1 text-xl font-extrabold">
                  {rank} <span className="text-xs font-medium text-slate-400">{t.sheet.of(totalCount)}</span>
                </div>
              </div>
              <div>
                <div className="label-caps">{t.sheet.zone}</div>
                <div className={`mt-1 break-words text-lg font-extrabold leading-tight ${getZone(rank) === 'safe' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                  {getZone(rank) === 'safe' ? t.zones.safe : t.zones.red}
                </div>
              </div>
              <div className="text-end">
                <div className="label-caps">{t.sheet.total}</div>
                <div className="num-tabular mt-1 text-xl font-extrabold">{formatNumber(person.total_points)}</div>
                {(pointsMove ?? 0) !== 0 && (
                  <div
                    className={`num-tabular mt-0.5 text-xs font-bold ${
                      (pointsMove ?? 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                    }`}
                  >
                    {(pointsMove ?? 0) > 0 ? '↑' : '↓'} {formatNumber(Math.abs(pointsMove ?? 0))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5">
              <div className="label-caps mb-3">{t.sheet.breakdown}</div>
              {rows.map((row) => (
                <div key={row.label} className="mb-3 last:mb-0">
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium text-slate-600 dark:text-slate-300">{row.label}</span>
                    <span className="num-tabular font-bold">{formatNumber(row.value)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-900/[0.07] dark:bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-slate-800 dark:bg-slate-200"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((row.value / max) * 100)}%` }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <div className="label-caps mb-2">{t.sheet.recent}</div>
              {recent.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t.sheet.noActivity}</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {recent.map((h) => {
                    const { time } = formatDateTime(h.created_at, lang);
                    return (
                      <li key={h.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                        <span className="min-w-0">
                          <span className={`num-tabular font-bold ${h.points_change > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                            {h.points_change > 0 ? '+' : ''}{formatNumber(h.points_change)}
                          </span>{' '}
                          <span className="text-slate-500 dark:text-slate-400">{t.history[SOURCE_WORD[h.source_key]]}</span>
                          {h.reason && <span className="block truncate text-xs text-slate-400">{h.reason}</span>}
                        </span>
                        <span className="num-tabular shrink-0 text-xs text-slate-400">
                          {timeAgo(h.created_at, lang)} · {time}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <button
              type="button"
              onClick={() => onViewHistory(person.id)}
              className="btn-press mt-5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white dark:bg-white dark:text-slate-900"
            >
              <HistoryIcon size={15} />
              {t.sheet.viewAll}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
