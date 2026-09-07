import { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Header, type MainView } from './components/Header';
import { Footer } from './components/Footer';
import { BackToTop } from './components/BackToTop';
import { useLanguage } from './i18n/LanguageContext';
import { Home } from './pages/Home';
import { useLeaderboard } from './hooks/useLeaderboard';
import { useTheme } from './hooks/useTheme';

const About = lazy(() => import('./pages/About').then((m) => ({ default: m.About })));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

function RouteFallback() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto w-full max-w-5xl px-4" aria-busy="true" aria-label={t.states.loadingPage}>
      <div className="space-y-3 py-6">
        <div className="skeleton h-6 w-1/3 rounded-lg" />
        <div className="skeleton h-4 w-2/3 rounded-lg" />
        <div className="skeleton h-4 w-1/2 rounded-lg" />
      </div>
      <span className="sr-only">{t.states.loadingPage}</span>
    </div>
  );
}

export default function App() {
  const { theme, toggle } = useTheme();
  const { people, history, loading, error, live, configured, refetch } = useLeaderboard();
  const location = useLocation();
  const [view, setView] = useState<MainView>('board');

  const home = (
    <Home
      people={people}
      history={history}
      loading={loading}
      error={error}
      configured={configured}
      view={view}
      onViewChange={setView}
      refetch={() => void refetch()}
    />
  );

  return (
    <div className="min-h-screen pb-10">
      <ScrollToTop />
      <Header theme={theme} onToggleTheme={toggle} live={live} configured={configured} view={view} onViewChange={setView} />

      <main className="pt-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Suspense fallback={<RouteFallback />}>
              <Routes location={location}>
                <Route path="/" element={home} />
                <Route path="/about" element={<About />} />
                <Route path="*" element={home} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}
