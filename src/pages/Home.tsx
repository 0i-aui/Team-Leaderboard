import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, PlugZap } from 'lucide-react';
import { Tabs } from '../components/Tabs';
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
import { getZone, pointLabels, rankPeople, ZONE_CUTOFF, type Zone } from '../utils/rank';
import type { Board, HistoryEntry, HistoryFilter, LeaderboardTab, Person } from '../types';

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
  const [tab, setTab] = useState<LeaderboardTab>('members');
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<HistoryFilter>('all');
  const [personId, setPersonId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [visibleHistory, setVisibleHistory] = useState(HISTORY_PAGE);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allMembers = useMemo(() => people.filter((p) => p.board === 'members'), [people]);
  const allSupervisors = useMemo(() => people.filter((p) => p.board === 'supervisors'), [people]);

  // Canonical board ranks (unfiltered) — every rank shown anywhere comes from here.
  const rankedBoards = useMemo(
    () => ({ members: rankPeople(allMembers), supervisors: rankPeople(allSupervisors) }),
    [allMembers, allSupervisors],
  );
  const rankInfo = useMemo(() => {
    const m = new Map<string, { rank: number; board: Board }>();
    for (const p of rankedBoards.members) m.set(p.id, { rank: p.rank, board: 'members' });
    for (const p of rankedBoards.supervisors) m.set(p.id, { rank: p.rank, board: 'supervisors' });
    return m;
  }, [rankedBoards]);

  const memberMovement = useRankDelta('members', rankedBoards.members);
  const supervisorMovement = useRankDelta('supervisors', rankedBoards.supervisors);

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
      totalMembers: allMembers.length,
      totalSupervisors: allSupervisors.length,
      totalPoints: people.reduce((a, p) => a + p.total_points, 0),
      latestUpdate,
    };
  }, [people, history, allMembers, allSupervisors]);

  const selected = selectedId ? (people.find((p) => p.id === selectedId) ?? null) : null;
  const selectedRank = selected ? (rankInfo.get(selected.id)?.rank ?? 0) : 0;
  const selectedBoardSize = selected
    ? selected.board === 'members'
      ? allMembers.length
      : allSupervisors.length
    : 0;

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

  const renderRow = (
    p: Ranked,
    i: number,
    deltas: Record<string, number>,
    fresh: Set<string>,
    highlight?: string,
  ) => {
    const zone: Zone = getZone(p.board, p.rank);
    return (
      <PersonRow
        key={p.id}
        person={p}
        rank={p.rank}
        index={i}
        zone={zone}
        labels={pointLabels(t, p.role, p.board)}
        delta={deltas[p.id]}
        isNew={fresh.has(p.id)}
        query={highlight}
        onSelect={() => setSelectedId(p.id)}
      />
    );
  };

  const boardSection = (board: Board) => {
    const ranked = rankedBoards[board];
    const total = board === 'members' ? allMembers.length : allSupervisors.length;
    const { deltas, fresh } = board === 'members' ? memberMovement : supervisorMovement;
    const cutoff = ZONE_CUTOFF[board];
    const safe = ranked.filter((p) => getZone(board, p.rank) === 'safe');
    const red = ranked.filter((p) => getZone(board, p.rank) === 'red');
    const redFrom = red.length > 0 ? Math.min(...red.map((p) => p.rank)) : cutoff + 1;
    const label = board === 'members' ? t.list.members : t.list.supervisors;
    const emptyTitle = board === 'members' ? t.home.noMembersYet : t.home.noSupervisorsYet;
    const emptyHint = board === 'members' ? t.home.addMembersHint : t.home.addSupervisorsHint;
    if (ranked.length === 0) return <EmptyState title={emptyTitle} hint={emptyHint} />;
    return (
      <>
        <ListMeta shown={ranked.length} total={total} label={label} />
        <div className="surface overflow-hidden rounded-2xl">
          <div className="px-3 pt-3 sm:px-4">
            <ZoneHeader zone="safe" sub={t.zones.safeSub(cutoff)} />
          </div>
          <div className="mt-1">{safe.map((p, i) => renderRow(p, i, deltas, fresh))}</div>
          {red.length > 0 && (
            <>
              <div className="px-3 pt-3 sm:px-4">
                <ZoneHeader zone="red" sub={t.zones.redSub(redFrom)} />
              </div>
              <div className="mt-1">{red.map((p, i) => renderRow(p, safe.length + i, deltas, fresh))}</div>
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
          {searchResults.map((p, i) => {
            const info = rankInfo.get(p.id);
            const zone: Zone = info ? getZone(info.board, info.rank) : 'safe';
            const mv = info?.board === 'members' ? memberMovement : supervisorMovement;
            return (
              <PersonRow
                key={p.id}
                person={p}
                rank={info?.rank ?? 0}
                index={i}
                zone={zone}
                labels={pointLabels(t, p.role, p.board)}
                delta={info ? mv.deltas[p.id] : undefined}
                isNew={info ? mv.fresh.has(p.id) : false}
                query={q}
                onSelect={() => setSelectedId(p.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  ) : (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={tab}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="space-y-3"
        aria-label={tab === 'members' ? t.tabs.members : t.tabs.supervisors}
      >
        {boardSection(tab)}
      </motion.div>
    </AnimatePresence>
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
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {view === 'board' ? (
            <div className="space-y-4">
              <div className="space-y-1 pt-1">
                <h1 className="text-xl font-bold tracking-tight">{t.nav.board}</h1>
                <StatsBar {...stats} />
              </div>
              <Tabs tab={tab} onChange={setTab} memberCount={allMembers.length} supervisorCount={allSupervisors.length} />
              <SearchBar value={query} onChange={setQuery} placeholder={t.search.teamPh} />
              {boardView}
            </div>
          ) : (
            historyView
          )}
        </motion.div>
      </AnimatePresence>

      <PersonSheet
        person={selected}
        rank={selectedRank}
        boardSize={selectedBoardSize}
        history={history}
        labels={selected ? pointLabels(t, selected.role, selected.board) : { a: '', b: '' }}
        onClose={() => setSelectedId(null)}
        onViewHistory={openHistoryFor}
      />
    </div>
  );
}
