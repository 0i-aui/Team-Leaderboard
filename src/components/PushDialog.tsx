import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellRing, X } from 'lucide-react';
import type { Person } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { usePush } from '../hooks/usePush';

const BTN =
  'btn-press grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-900/5 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100';

/** Header bell + setup dialog. Permission is only requested from the enable button. */
export function PushBell({ people }: { people: Person[] }) {
  const { t } = useLanguage();
  const { status, selectedId, setSelectedId, activePersonId, enable, disable } = usePush();
  const [open, setOpen] = useState(false);

  const sorted = useMemo(() => [...people].sort((a, b) => a.name.localeCompare(b.name)), [people]);
  const activeName = activePersonId ? (people.find((p) => p.id === activePersonId)?.name ?? null) : null;
  const active = status === 'active';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open ]);

  const busy = status === 'busy';
  const blocked = status === 'denied';
  const unsupported = status === 'unsupported';
  const missingKey = status === 'no-key';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={active ? t.push.bellOn : t.push.bellOff}
        aria-expanded={open}
        title={active ? t.push.bellOn : t.push.bellOff}
        className={`${BTN} relative`}
      >
        {active ? <BellRing size={16} /> : <Bell size={16} />}
        {active && <span aria-hidden className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
      </button>

      {/*
        Portal OUTSIDE AnimatePresence (never the reverse): the portal
        escapes the header's backdrop-blur containing block so the dialog
        anchors to the viewport, while AnimatePresence keeps a plain
        element child it can mount, track, and animate reliably.
      */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={t.push.title}>
            <motion.button
              type="button"
              aria-label={t.sheet.close}
              onClick={() => setOpen(false)}
              className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              initial={{ opacity: 0, y: 48, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 32, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="surface relative max-h-[86vh] w-full overflow-y-auto rounded-t-3xl p-6 shadow-2xl sm:max-w-md sm:rounded-3xl"
            >
              <span aria-hidden className="mx-auto mb-4 block h-1 w-10 rounded-full bg-slate-300 sm:hidden dark:bg-slate-600" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.sheet.close}
                className="btn-press absolute end-4 top-4 grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-900/5 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X size={17} />
              </button>

              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-900/[0.05] text-slate-600 dark:bg-white/[0.07] dark:text-slate-300">
                  <Bell size={19} />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">{t.push.title}</h3>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400">{t.push.explainer}</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {unsupported ? (
                  <p role="status" className="rounded-xl bg-slate-900/[0.04] px-4 py-3 text-sm text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                    {t.push.unsupported}
                  </p>
                ) : missingKey ? (
                  <p role="status" className="rounded-xl bg-slate-900/[0.04] px-4 py-3 text-sm text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                    {t.push.noKey}
                  </p>
                ) : blocked ? (
                  <p role="alert" className="rounded-xl bg-slate-900/[0.04] px-4 py-3 text-sm text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                    {t.push.blocked}
                  </p>
                ) : (
                  <>
                    <label className="block">
                      <span className="mb-1.5 block text-[13px] font-semibold text-slate-600 dark:text-slate-300">
                        {t.push.selectLabel}
                      </span>
                      <select
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                        disabled={busy}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm font-medium outline-none disabled:opacity-60 dark:border-white/10"
                      >
                        <option value="">{t.push.selectPh}</option>
                        {sorted.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {status === 'error' && (
                      <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
                        {t.push.error}
                      </p>
                    )}
                    {active && activeName && (
                      <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
                        {t.push.success(activeName)}
                      </p>
                    )}

                    {active ? (
                      <button
                        type="button"
                        onClick={() => void disable()}
                        disabled={busy}
                        className="btn-press flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:border-slate-300 hover:text-slate-900 disabled:opacity-60 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
                      >
                        {busy ? t.push.disabling : t.push.disable}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void enable(selectedId)}
                        disabled={busy || !selectedId}
                        className="btn-press flex min-h-[44px] w-full items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
                      >
                        {busy ? t.push.enabling : t.push.enable}
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
