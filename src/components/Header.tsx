import { Trophy, Sun, Moon, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import type { Person, ThemeMode } from '../types';
import type { Lang } from '../i18n/dictionary';
import { useLanguage } from '../i18n/LanguageContext';
import { useSound } from '../hooks/useSound';
import { PushBell } from './PushDialog';

export type MainView = 'board' | 'history';

interface Props {
  theme: ThemeMode;
  onToggleTheme: () => void;
  live: boolean;
  configured: boolean;
  view: MainView;
  onViewChange: (v: MainView) => void;
  people: Person[];
}

function LangToggle({ lang, setLang, label, enLabel, arLabel }: { lang: Lang; setLang: (l: Lang) => void; label: string; enLabel: string; arLabel: string }) {
  return (
    <div className="flex shrink-0 items-center rounded-full border border-slate-200 p-0.5 dark:border-white/10" role="group" aria-label={label}>
      {(['en', 'ar'] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`btn-press min-h-[30px] rounded-full px-2 text-[11px] font-bold transition-colors sm:px-2.5 ${
            lang === l
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {l === 'en' ? enLabel : arLabel}
        </button>
      ))}
    </div>
  );
}

export function Header({ theme, onToggleTheme, live, configured, view, onViewChange, people }: Props) {
  const { lang, setLang, t } = useLanguage();
  const { enabled: soundOn, toggle: onToggleSound } = useSound();
  const location = useLocation();
  const navigate = useNavigate();
  const onAbout = location.pathname === '/about';

  const go = (v: MainView) => {
    onViewChange(v);
    if (location.pathname !== '/') navigate('/');
  };

  const seg = (active: boolean) =>
    `btn-press relative rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors sm:px-4 ${
      active ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
    }`;

  // Shared sliding pill — one layoutId per nav group so the indicator
  // glides between tabs instead of blinking in place.
  const segment = (key: string, label: string, active: boolean, onClick: () => void, indicatorId: string) => (
    <button key={key} type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={seg(active)}>
      {active && (
        <motion.span
          layoutId={indicatorId}
          className="absolute inset-0 rounded-full bg-slate-900 dark:bg-white"
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
          aria-hidden
        />
      )}
      <span className="relative">{label}</span>
    </button>
  );

  const aboutLink = (indicatorId: string) => (
    <NavLink to="/about" className={({ isActive }) => seg(isActive)}>
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId={indicatorId}
              className="absolute inset-0 rounded-full bg-slate-900 dark:bg-white"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              aria-hidden
            />
          )}
          <span className="relative">{t.nav.about}</span>
        </>
      )}
    </NavLink>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f6f7f9]/85 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#0a0d13]/85">
      <div className="mx-auto w-full max-w-5xl px-3 sm:px-4">
        <div className="flex h-14 items-center justify-between gap-1 sm:gap-2">
          <Link to="/" onClick={() => onViewChange('board')} className="btn-press flex min-w-0 items-center gap-1.5 sm:gap-2" aria-label={t.brand.name}>
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-slate-900 text-white sm:h-7 sm:w-7 dark:bg-white dark:text-slate-900">
              <Trophy size={13} strokeWidth={2.4} className="sm:hidden" />
              <Trophy size={14} strokeWidth={2.4} className="hidden sm:block" />
            </span>
            <span className="truncate text-[13px] font-bold tracking-tight min-[400px]:text-sm sm:text-[15px]">
              <span className="min-[400px]:hidden">{t.brand.short}</span>
              <span className="hidden min-[400px]:inline">{t.brand.name}</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <nav className="hidden items-center gap-0.5 rounded-full border border-slate-200 p-0.5 sm:flex dark:border-white/10" aria-label={t.nav.primary}>
              {segment('board', t.nav.board, !onAbout && view === 'board', () => go('board'), 'nav-pill')}
              {segment('history', t.nav.history, !onAbout && view === 'history', () => go('history'), 'nav-pill')}
              {aboutLink('nav-pill')}
            </nav>

            <LangToggle lang={lang} setLang={setLang} label={t.lang.label} enLabel={t.lang.en} arLabel={t.lang.ar} />

            <span
              className="hidden min-[400px]:flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"
              title={!configured ? t.live.setupTitle : live ? t.live.connectedTitle : t.live.connecting}
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  !configured ? 'bg-slate-300 dark:bg-slate-600' : live ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="hidden min-[480px]:inline">
                {!configured ? t.live.setup : live ? t.live.live : t.live.connecting}
              </span>
              <span className="sr-only">{!configured ? t.live.setup : live ? t.live.live : t.live.connecting}</span>
            </span>

            <PushBell people={people} />

            <button
              type="button"
              onClick={onToggleSound}
              aria-label={soundOn ? t.sound.off : t.sound.on}
              aria-pressed={soundOn}
              title={soundOn ? t.sound.off : t.sound.on}
              className="btn-press grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-900/5 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
            >
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={t.theme.toggle}
              className="btn-press grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-slate-500 hover:bg-slate-900/5 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
            >
              <motion.span
                key={theme}
                initial={{ rotate: -60, opacity: 0, scale: 0.7 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="grid place-items-center"
                aria-hidden
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </motion.span>
            </button>
          </div>
        </div>

        <nav className="flex items-center gap-0.5 pb-2 sm:hidden" aria-label={t.nav.primary}>
          <div className="flex items-center gap-0.5 rounded-full border border-slate-200 p-0.5 dark:border-white/10">
            {segment('board-m', t.nav.board, !onAbout && view === 'board', () => go('board'), 'nav-pill-m')}
            {segment('history-m', t.nav.history, !onAbout && view === 'history', () => go('history'), 'nav-pill-m')}
            {aboutLink('nav-pill-m')}
          </div>
        </nav>
      </div>
    </header>
  );
}
