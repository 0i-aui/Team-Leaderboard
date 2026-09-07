import { motion } from 'framer-motion';
import { Users, ShieldCheck } from 'lucide-react';
import type { LeaderboardTab } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

/** Quiet underline tabs for switching boards — distinct from the nav pill. */
export function Tabs({
  tab,
  onChange,
  memberCount,
  supervisorCount,
}: {
  tab: LeaderboardTab;
  onChange: (t: LeaderboardTab) => void;
  memberCount: number;
  supervisorCount: number;
}) {
  const { t } = useLanguage();
  const items: { id: LeaderboardTab; label: string; icon: typeof Users; count: number }[] = [
    { id: 'members', label: t.tabs.members, icon: Users, count: memberCount },
    { id: 'supervisors', label: t.tabs.supervisors, icon: ShieldCheck, count: supervisorCount },
  ];
  return (
    <div className="flex items-center gap-1 border-b border-slate-200 dark:border-white/10" role="tablist" aria-label={t.tabs.label}>
      {items.map((it) => {
        const active = tab === it.id;
        const Icon = it.icon;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className={`btn-press relative flex min-h-[44px] items-center gap-2 px-3 text-sm font-semibold transition-colors sm:px-4 ${
              active ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            <Icon size={15} aria-hidden />
            {it.label}
            <span className={`num-tabular text-xs font-medium ${active ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-600'}`}>
              {it.count}
            </span>
            {active && (
              <motion.span
                layoutId="board-tab-underline"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-slate-900 dark:bg-white"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
