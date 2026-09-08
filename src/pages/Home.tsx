import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronDown, PlugZap } from 'lucide-react';
import { SearchBar } from '../components/SearchBar';
import { StatsBar } from '../components/StatsBar';
import { PersonRow } from '../components/PersonRow';
import { PersonSheet } from '../components/PersonSheet';
import { ZoneHeader } from '../components/ZoneHeader';
import { HistoryItem, HistoryFilters } from '../components/History';
import { LoadingList, EmptyState, ErrorState } from '../components/States';
import type { MainView } from '../components/Header';
import { useRankDelta } from '../hooks/useRankDelta';
import { useLanguage } from '../i18n/LanguageContext';
import { sounds } from '../lib/sound';
import { getZone, pointLabels, rankPeople, SAFE_CUTOFF, type Zone } from '../utils/rank';
import type { HistoryEntry, HistoryFilter, Person } from '../types';

const HISTORY_PAGE = 20;
type DateRange = 'all' | 'today' | 'week' | 'month';

interface Props {
  people: Person[];
  history: HistoryEntry[];
  loading: boolean;
  error: string | null;
  configured: boolean;
  view: MainView;
  onViewChange: (v: MainView) => void;
  refetch: () => void;
}

type Ranked = Person & { rank: number };

function ListMeta({ shown, total, label }: { shown: number; total: number; label: string }) {
  const { t } = useLanguage();
  return (
    <p className="num-tabular text-xs text-slate-400 dark:text-slate-500" aria-live="polite">
      {t.list.showing(shown, total, label)}
    </p>
  );
}

function SetupNotice() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-slate-900/[0.05] text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
        <PlugZap size={19} />
      </div>
      <p className="mt-3 text-lg font-bold tracking-tight">{t.setup.title}</p>
      <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{t.setup.body}</p>
    </div>
  );
}

function inRange(iso: string, range: DateRange): boolean {
  if (range === 'all') return true;
  const diff = Date.now() - new Date(iso).getTime();
  const day = 24 * 3600 * 1000;
  if (range === 'today') return diff < day;
  if (range === 'week') return diff < 7 * day;
  return diff < 30 * day;
}

export function Home({ people, history, loading, error, configured, view, onViewChange, refetch }: Props) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<HistoryFilter>('all');
  const [personId, setPersonId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [visibleHistory, setVisibleHistory] = useState(HISTORY_PAGE);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Canonical ranks (unfiltered) — every rank shown anywhere comes from here.
  const ranked = useMemo(() => rankPeople(people), [people]);
  const rankInfo = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of ranked) m.set(p.id, p.rank);
    return m;
  }, [ranked]);

  const { deltas, fresh } = useRankDelta('board', ranked);

  // Transient movement spotlight + event sounds, driven ONLY by real
  // data changes: each committed ranking is diffed against the previous
  // one. First load establishes the baseline silently — nothing "moves".
  const [moved, setMoved] = useState<Record<string, 'up' | 'down'>>({});
  const prevSnapshot = useRef<Map<string, { rank: number; total: number }> | null>(null);

  useEffect(() => {
    if (loading || ranked.length === 0) return;
    const cur = new Map(ranked.map((p) => [p.id, { rank: p.rank, total: p.total_points }]));
    const prev = prevSnapshot.current;
    prevSnapshot.current = cur;
    if (!prev) return;
    const next: Record<string, 'up' | 'down'> = {};
    let ups = 0;
    let downs = 0;
    let milestones = 0;
    let pointsOnly = false;
    for (const p of ranked) {
      const was = prev.get(p.id);
      if (!was) continue;
      if (was.rank !== p.rank) {
        const dir = p.rank < was.rank ? 'up' : 'down';
        next[p.id] = dir;
        if (dir === 'up') ups++;
        else downs++;
        if (p.rank <= 3 && was.rank > 3) milestones++;
      } else if (was.total !== p.total_points) {
        pointsOnly = true;
      }
    }
    const changed = Object.keys(next).length;
    if (changed === 0 && !pointsOnly) return;
    setMoved(next);
    if (milestones > 0) sounds.milestone();
    else if (ups > 0 && downs === 0) sounds.rankUp();
    else if (downs > 0 && ups === 0) sounds.rankDown();
    else sounds.points();
    const timer = setTimeout(() => setMoved({}), 2200);
    return () => clearTimeout(timer);
  }, [ranked, loading]);

  const q = query.trim();
  const searchResults = useMemo(() => {
    if (!q) return null;
    const needle = q.toLowerCase();
    return people
      .filter((p) => p.name.toLowerCase().includes(needle))
      .sort((a, b) => b.total_points - a.total_points);
  }, [people, q]);

  // History view filters are explicit (source + person + period) and
  // independent of the board search box — no hidden coupling.
  const filteredHistory = useMemo(() => {
    return history.filter((h) => {
      if (source !== 'all' && h.source_key !== source) return false;
      if (personId !== 'all' && h.person_id !== personId) return false;
      if (!inRange(h.created_at, dateRange)) return false;
      return true;
    });
  }, [history, source, personId, dateRange]);
  const shownHistory = filteredHistory.slice(0, visibleHistory);

  const stats = useMemo(() => {
    const stamps = [...history.map((h) => h.created_at), ...people.map((p) => p.updated_at)];
    const latestUpdate = stamps.length > 0 ? stamps.reduce((a, b) => (a > b ? a : b)) : null;
    return {
      totalPeople: people.length,
      totalPoints: people.reduce((a, p) => a + p.total_points, 0),
      latestUpdate,
    };
  }, [people, history]);

  const selected = selectedId ? (people.find((p) => p.id === selectedId) ?? null) : null;
  const selectedRank = selected ? (rankInfo.get(selected.id) ?? 0) : 0;

  const openHistoryFor = (id: string) => {
    setSelectedId(null);
    setPersonId(id);
    onViewChange('history');
  };

  if (!configured && !loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4">
        <SetupNotice />
      </div>
    );
  }

  const openSheet = (id: string) => {
    sounds.tap();
    setSelectedId(id);
  };

  const renderRow = (p: Ranked, i: number, highlight?: string) => {
    const zone: Zone = getZone(p.rank);
    return (
      <PersonRow
        key={p.id}
        person={p}
        rank={p.rank}
        index={i}
        zone={zone}
        labels={pointLabels(t, p.roles)}
        delta={deltas[p.id]}
        isNew={fresh.has(p.id)}
        query={highlight}
        flash={moved[p.id]}
        onSelect={() => openSheet(p.id)}
      />
    );
  };

  const boardList = (list: Ranked[], highlight?: string) => {
    if (list.length === 0) return <EmptyState title={t.home.noMembersYet} hint={t.home.addMembersHint} />;
    const safe = list.filter((p) => getZone(p.rank) === 'safe');
    const red = list.filter((p) => getZone(p.rank) === 'red');
    const redFrom = red.length > 0 ? Math.min(...red.map((p) => p.rank)) : SAFE_CUTOFF + 1;
    return (
      <>
        <ListMeta shown={list.length} total={people.length} label={t.list.members} />
        <div className="surface overflow-hidden rounded-2xl">
          <div className="px-3 pt-3 sm:px-4">
            <ZoneHeader zone="safe" sub={t.zones.safeSub(SAFE_CUTOFF)} />
          </div>
          <div className="mt-1">
            <AnimatePresence initial={false}>
              {safe.map((p, i) => renderRow(p, i, highlight))}
            </AnimatePresence>
          </div>
          {red.length > 0 && (
            <>
              <div className="px-3 pt-3 sm:px-4">
                <ZoneHeader zone="red" sub={t.zones.redSub(redFrom)} />
              </div>
              <div className="mt-1">
                <AnimatePresence initial={false}>
                  {red.map((p, i) => renderRow(p, safe.length + i, highlight))}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </>
    );
  };

  const boardView = loading ? (
    <LoadingList />
  ) : error ? (
    <ErrorState message={t.states.loadError} onRetry={() => refetch()} />
  ) : searchResults ? (
    <div className="space-y-3">
      <p className="label-caps" aria-live="polite">
        {t.search.results(searchResults.length)}
      </p>
      {searchResults.length === 0 ? (
        <EmptyState title={t.search.noMatch(q)} hint={t.search.tryDifferent} />
      ) : (
        <div className="surface overflow-hidden rounded-2xl">
          <AnimatePresence initial={false}>
            {searchResults.map((p, i) => {
              const rank = rankInfo.get(p.id) ?? 0;
              const zone: Zone = getZone(rank);
              return (
                <PersonRow
                  key={p.id}
                  person={p}
                  rank={rank}
                  index={i}
                  zone={zone}
                  labels={pointLabels(t, p.roles)}
                  delta={deltas[p.id]}
                  isNew={fresh.has(p.id)}
                  query={q}
                  flash={moved[p.id]}
                  onSelect={() => openSheet(p.id)}
                />
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  ) : (
    <div className="space-y-3" aria-label={t.nav.board}>
      {boardList(ranked)}
    </div>
  );

  const dateOpts: { id: DateRange; label: string }[] = [
    { id: 'all', label: t.historyView.dateAll },
    { id: 'today', label: t.historyView.today },
    { id: 'week', label: t.historyView.week },
    { id: 'month', label: t.historyView.month },
  ];
  const selectCls =
    'h-9 rounded-lg border border-slate-200 bg-transparent px-2 text-[13px] font-medium text-slate-600 outline-none dark:border-white/10 dark:text-slate-300';

  const historyView = (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight">{t.history.title}</h1>
        <span className="num-tabular text-[13px] text-slate-400 dark:text-slate-500">
          {t.historyView.count(filteredHistory.length)}
        </span>
      </div>

      <div className="space-y-3">
        <HistoryFilters
          filter={source}
          onChange={(f) => {
            setSource(f);
            setVisibleHistory(HISTORY_PAGE);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
            {t.historyView.personLabel}
            <select
              value={personId}
              onChange={(e) => {
                setPersonId(e.target.value);
                setVisibleHistory(HISTORY_PAGE);
              }}
              className={`${selectCls} max-w-[200px]`}
            >
              <option value="all">{t.historyView.personAll}</option>
              {[...people]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
            {t.historyView.dateLabel}
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value as DateRange);
                setVisibleHistory(HISTORY_PAGE);
              }}
              className={selectCls}
            >
              {dateOpts.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <LoadingList rows={4} />
      ) : shownHistory.length === 0 ? (
        <EmptyState title={t.history.emptyTitle} hint={t.history.emptyHint} />
      ) : (
        <>
          <ul className="relative space-y-5 before:absolute before:bottom-2 before:start-[5px] before:top-2 before:w-px before:bg-slate-200 dark:before:bg-white/10">
            {shownHistory.map((h, i) => (
              <HistoryItem key={h.id} item={h} index={i} />
            ))}
          </ul>
          {visibleHistory < filteredHistory.length && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setVisibleHistory((v) => v + HISTORY_PAGE)}
                className="btn-press inline-flex min-h-[42px] items-center gap-2 rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
              >
                {t.history.showMore} <ChevronDown size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4">
      {view === 'board' ? (
        <div className="space-y-4">
          <div className="space-y-1 pt-1">
            <h1 className="text-xl font-bold tracking-tight">{t.nav.board}</h1>
            <StatsBar {...stats} />
          </div>
          <SearchBar value={query} onChange={setQuery} placeholder={t.search.teamPh} />
          {boardView}
        </div>
      ) : (
        historyView
      )}

      <PersonSheet
        person={selected}
        rank={selectedRank}
        totalCount={people.length}
        history={history}
        labels={selected ? pointLabels(t, selected.roles) : { a: '', b: '' }}
        onClose={() => setSelectedId(null)}
        onViewHistory={openHistoryFor}
      />
    </div>
  );
}
