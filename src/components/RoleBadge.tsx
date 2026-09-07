import type { Role } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Quiet text role labels — recognizable, never distracting.
 * ADMIN gets a restrained amber accent; LEADER a violet one;
 * MEMBER stays neutral.
 */
export function RoleBadge({ role }: { role: Role }) {
  const { t } = useLanguage();
  if (role === 'admin') {
    return (
      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-amber-600 dark:text-amber-400">
        {t.roles.admin}
      </span>
    );
  }
  if (role === 'leader') {
    return (
      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-violet-600 dark:text-violet-400">
        {t.roles.leader}
      </span>
    );
  }
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 dark:text-slate-500">
      {t.roles.member}
    </span>
  );
}
