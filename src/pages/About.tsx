import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { DEVELOPER } from '../lib/developer';
import { useLanguage } from '../i18n/LanguageContext';

/** One quiet scroll reveal, reused by every section — opacity + 10px, once. */
function Reveal({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      aria-label={label}
      className="mt-8 border-t border-slate-200 pt-5 dark:border-white/10"
    >
      {children}
    </motion.section>
  );
}

export function About() {
  const { t } = useLanguage();
  const principles = [
    { n: '01', title: t.about.p1t, text: t.about.p1x },
    { n: '02', title: t.about.p2t, text: t.about.p2x },
    { n: '03', title: t.about.p3t, text: t.about.p3x },
  ];
  const contacts = [
    { label: 'GitHub', href: DEVELOPER.github },
    { label: 'Instagram', href: DEVELOPER.instagram },
    { label: 'LinkedIn', href: DEVELOPER.linkedin },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-2xl px-4"
    >
      <p className="label-caps pt-2">{t.about.kicker}</p>
      <h1 className="mt-2 text-[26px] font-bold leading-snug tracking-tight sm:text-3xl">
        {t.about.titleA}
        {t.about.titleB}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
        {t.about.lede}
      </p>

      <Reveal>
        <h2 className="text-[15px] font-bold">{t.about.whatTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {t.about.whatBody}
          </p>
      </Reveal>

      <Reveal>
        <h2 className="text-[15px] font-bold">{t.about.missionTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {t.about.missionText}
        </p>
      </Reveal>

      <Reveal label={t.about.principlesTitle}>
        <h2 className="text-[15px] font-bold">{t.about.principlesTitle}</h2>
        <ol className="mt-1 divide-y divide-slate-100 dark:divide-white/[0.06]">
          {principles.map((p) => (
            <li key={p.n} className="flex gap-4 py-4">
              <span className="num-tabular text-[13px] font-bold text-slate-300 dark:text-slate-600">{p.n}</span>
              <div>
                <p className="text-sm font-bold">{p.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{p.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>

      <Reveal label={t.about.devKicker}>
        <p className="label-caps">{t.about.devKicker}</p>
        <p className="mt-2 text-[15px] font-bold">{t.footer.credit}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.about.devText}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {contacts.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target="_blank"
              rel="noreferrer"
              className="btn-press text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:text-slate-300 dark:decoration-slate-600"
            >
              {c.label}
            </a>
          ))}
        </div>
      </Reveal>

      <div className="mt-8">
        <Link
          to="/"
          className="btn-press inline-flex min-h-[42px] items-center gap-2 rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
        >
          <ArrowLeft size={15} className="rtl:rotate-180" />
          {t.about.back}
        </Link>
      </div>
    </motion.div>
  );
}
