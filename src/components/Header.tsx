import { Trophy, Sun, Moon } from 'lucide-react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import type { ThemeMode } from '../types';
import type { Lang } from '../i18n/dictionary';
import { useLanguage } from '../i18n/LanguageContext';

export type MainView = 'board' | 'history';

interface Props {
  theme: ThemeMode;
  onToggleTheme: () => void;
  live: boolean;
  configured: boolean;
  view: MainView;
  onViewChange: (v: MainView) => void;
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
          className={`btn-press min-h-[30px] rounded-full px-2.5 text-[11px] font-bold transition-colors ${
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

export function Header({ theme, onToggleTheme, live, configured, view, onViewChange }: Props) {
  const { lang, setLang, t } = useLanguage();
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

  const segment = (key: string, label: string, active: boolean, onClick: () => void) => (
    <button key={key} type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={seg(active)}>
      {active && <span className="absolute inset-0 rounded-full bg-slate-900 dark:bg-white" aria-hidden />}
      <span className="relative">{label}</span>
    </button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f6f7f9]/85 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#0a0d13]/85">
      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="flex h-14 items-center justify-between gap-2">
          <Link to="/" onClick={() => onViewChange('board')} className="btn-press flex min-w-0 items-center gap-2" aria-label={t.brand.name}>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              <Trophy size={14} strokeWidth={2.4} />
            </span>
            <span className="truncate text-[15px] font-bold tracking-tight">{t.brand.name}</span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <nav className="hidden items-center gap-0.5 rounded-full border border-slate-200 p-0.5 sm:flex dark:border-white/10" aria-label={t.nav.primary}>
              {segment('board', t.nav.board, !onAbout && view === 'board', () => go('board'))}
              {segment('history', t.nav.history, !onAbout && view === 'history', () => go('history'))}
              <NavLink to="/about" className={({ isActive }) => seg(isActive)}>
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute inset-0 rounded-full bg-slate-900 dark:bg-white" aria-hidden />}
                    <span className="relative">{t.nav.about}</span>
                  </>
                )}
              </NavLink>
            </nav>

            <LangToggle lang={lang} setLang={setLang} label={t.lang.label} enLabel={t.lang.en} arLabel={t.lang.ar} />

            <span
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"
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

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={t.theme.toggle}
              className="btn-press grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-900/5 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        <nav className="flex items-center gap-0.5 pb-2 sm:hidden" aria-label={t.nav.primary}>
          <div className="flex items-center gap-0.5 rounded-full border border-slate-200 p-0.5 dark:border-white/10">
            {segment('board-m', t.nav.board, !onAbout && view === 'board', () => go('board'))}
            {segment('history-m', t.nav.history, !onAbout && view === 'history', () => go('history'))}
            <NavLink to="/about" className={({ isActive }) => seg(isActive)}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute inset-0 rounded-full bg-slate-900 dark:bg-white" aria-hidden />}
                  <span className="relative">{t.nav.about}</span>
                </>
              )}
            </NavLink>
          </div>
        </nav>
      </div>
    </header>
  );
}
