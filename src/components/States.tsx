import { Inbox, RotateCcw } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export function LoadingList({ rows = 6 }: { rows?: number }) {
  const { t } = useLanguage();
  return (
    <div className="surface divide-y divide-slate-100 overflow-hidden rounded-2xl dark:divide-white/[0.06]" aria-busy="true" aria-label={t.states.loading}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="skeleton h-5 w-6 shrink-0 rounded" />
          <div className="skeleton h-8 w-8 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3.5 w-1/3 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
          <div className="skeleton h-6 w-12 shrink-0 rounded" />
        </div>
      ))}
      <span className="sr-only">{t.states.loading}</span>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="enter flex flex-col items-center px-6 py-14 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-slate-900/[0.05] text-slate-400 dark:bg-white/[0.06] dark:text-slate-500">
        <Inbox size={19} />
      </div>
      <p className="mt-3 text-[15px] font-semibold">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="enter flex flex-col items-center px-6 py-14 text-center">
      <p className="text-[15px] font-semibold">{t.states.errorTitle}</p>
      <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="btn-press mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
      >
        <RotateCcw size={14} /> {t.states.retry}
      </button>
    </div>
  );
}
