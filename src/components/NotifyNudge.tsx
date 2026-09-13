import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { getVapidPublicKey, isPushSupported } from '../lib/push';
import { riseSoft } from '../utils/motion';

const DISMISS_KEY = 'team-leaderboard-notify-nudge';
const SHOW_DELAY_MS = 1500;

/**
 * One-time educational nudge about push notifications.
 * Informational only — it NEVER requests permission itself.
 * Shows only when notifications are neither enabled nor blocked,
 * and stays dismissed once closed.
 */
export function NotifyNudge() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      if (localStorage.getItem(DISMISS_KEY) === 'dismissed') return;
    } catch {
      return;
    }
    if (!isPushSupported() || !getVapidPublicKey()) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, 'dismissed');
    } catch {
      /* private mode — shows again next visit, harmless */
    }
    setVisible(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={riseSoft}
      role="status"
      aria-label={t.nudge.title}
      className="surface fixed bottom-4 start-4 z-40 max-w-[calc(100vw-2rem)] rounded-2xl p-4 shadow-xl sm:max-w-xs"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900/[0.05] text-slate-600 dark:bg-white/[0.07] dark:text-slate-300">
          <Bell size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{t.nudge.title}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            {t.nudge.body}
          </p>
          <p className="mt-1 text-[13px] font-semibold text-slate-600 dark:text-slate-300">
            {t.nudge.hint}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.nudge.dismiss}
          className="btn-press grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-900/5 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X size={15} />
        </button>
      </div>
    </motion.div>
  );
}
