import { Link } from 'react-router-dom';
import { DEVELOPER } from '../lib/developer';
import { useLanguage } from '../i18n/LanguageContext';

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="mx-auto w-full max-w-5xl px-4 pb-[env(safe-area-inset-bottom)]" aria-label="Footer">
      <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 py-6 text-[13px] text-slate-500 sm:flex-row dark:border-white/10 dark:text-slate-400">
        <p>
          <span className="font-semibold text-slate-700 dark:text-slate-300">{t.footer.credit}</span>
          <span className="block text-xs sm:inline"> · {t.footer.tagline}</span>
        </p>
        <nav className="flex items-center gap-4" aria-label="Footer navigation">
          <Link to="/about" className="btn-press font-medium hover:text-slate-900 dark:hover:text-white">
            {t.footer.about}
          </Link>
          <a href={DEVELOPER.github} target="_blank" rel="noreferrer" className="btn-press font-medium hover:text-slate-900 dark:hover:text-white">
            GitHub
          </a>
          <a href={DEVELOPER.instagram} target="_blank" rel="noreferrer" className="btn-press font-medium hover:text-slate-900 dark:hover:text-white">
            Instagram
          </a>
          <a href={DEVELOPER.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="btn-press font-medium hover:text-slate-900 dark:hover:text-white">
            LinkedIn
          </a>
        </nav>
      </div>
    </footer>
  );
}
