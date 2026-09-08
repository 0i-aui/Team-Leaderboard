import type { RoleMark } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

const MARK_STYLE: Record<RoleMark, string> = {
  admin: 'text-amber-600 dark:text-amber-400',
  mod: 'text-sky-600 dark:text-sky-400',
  supervisor: 'text-emerald-600 dark:text-emerald-400',
  leader: 'text-violet-600 dark:text-violet-400',
};

/**
 * Additive role marks — a person can carry several at once
 * (e.g. SUPERVISOR + LEADER). No marks = regular MEMBER.
 * Quiet text labels, never distracting.
 */
export function RoleMarks({ roles }: { roles: RoleMark[] }) {
  const { t } = useLanguage();
  const marks = roles.length > 0 ? roles : (['member'] as const);
  const label = { admin: t.roles.admin, mod: t.roles.mod, supervisor: t.roles.supervisor, leader: t.roles.leader, member: t.roles.member };
  return (
    <span className="flex flex-wrap items-center gap-x-1.5">
      {marks.map((m) => (
        <span
          key={m}
          className={`text-[11px] font-bold uppercase tracking-[0.06em] ${
            m === 'member' ? 'font-semibold text-slate-400 dark:text-slate-500' : MARK_STYLE[m]
          }`}
        >
          {label[m]}
        </span>
      ))}
    </span>
  );
}
