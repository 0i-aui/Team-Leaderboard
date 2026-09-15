import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, PlugZap } from 'lucide-react';
import { SearchBar } from '../components/SearchBar';
import { StatsBar } from '../components/StatsBar';
import { PersonRow } from '../components/PersonRow';
import { PersonSheet } from '../components/PersonSheet';
import { ZoneHeader } from '../components/ZoneHeader';
import {
  HistoryItem,
  HistoryFilters,
  TeamFilterPills,
  ActivityFilterPills,
  WeekFilterPills,
} from '../components/History';
import { LoadingList, EmptyState, ErrorState } from '../components/States';
import type { MainView } from '../components/Header';
import { useLanguage } from '../i18n/LanguageContext';
import { displayName, searchNames } from '../i18n/names';
import { formatDateTime } from '../lib/format';
import { sounds } from '../lib/sound';
import {
  computeMovement,
  getZone,
  historyRankMoves,
  pointLabels,
  rankSequential,
  weekStartLocal,
  SAFE_CUTOFF,
  type Zone,
} from '../utils/rank';
import { teamOfPerson } from '../utils/teams';
import type {
  ActivityFilter,
  HistoryEntry,
  HistoryFilter,
  Person,
  TeamFilter,
  WeekFilter,
} from '../types';
import type { TeamId } from '../utils/teams';

const HISTORY_PAGE = 20;
const BOARD_TEAM_KEY = 'tl-board-team';

function initialBoardTeam(): TeamId {
  try {
    const saved = localStorage.getItem(BOARD_TEAM_KEY);
    if (saved === 'A' || saved === 'B') return saved;
  } catch {
    /* private mode — fall through to default */
  }
  return 'A';
}

interface Props {
  people: Person[];
  history: HistoryEntry[];
  resetAt: string | null;
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
    <p className="num-tabular text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
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

function TeamHeader({ team, count }: { team: 'A' | 'B'; count: number }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-[15px] font-extrabold text-white shadow-sm dark:bg-white dark:text-slate-900"
        >
          {team}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-extrabold tracking-tight">
            {team === 'A' ? t.teams.teamALabel : t.teams.teamBLabel}
          </h2>
          <p className="num-tabular text-xs text-slate-500 dark:text-slate-400">
            {team === 'A' ? t.teams.a : t.teams.b} · {count} {t.list.members}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Secondary Team A / Team B selector. Mirrors the top navigation's
 * segmented-pill language (same shape, same sliding indicator, same
 * motion) so it reads as one product. Full-width on mobile with
 * comfortable 44px touch targets; no horizontal overflow.
 */
function TeamTabs({ value, onChange }: { value: TeamId; onChange: (t: TeamId) => void }) {
  const { t } = useLanguage();
  const seg = (active: boolean) =>
    `btn-press relative min-h-[44px] flex-1 rounded-full px-4 py-2 text-sm font-bold transition-colors sm:flex-none sm:px-8 ${
      active ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
    }`;
  const segment = (id: TeamId, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => onChange(id)}
      aria-pressed={value === id}
      className={seg(value === id)}
    >
      {value === id && (
        <motion.span
          layoutId="board-team-pill"
          className="absolute inset-0 rounded-full bg-slate-900 dark:bg-white"
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
          aria-hidden
        />
      )}
      <span className="relative">{label}</span>
    </button>
  );
  return (
    <div
      role="group"
      aria-label={`${t.teams.a} / ${t.teams.b}`}
      className="flex items-center gap-0.5 rounded-full border border-slate-200 p-1 dark:border-white/10"
    >
      {segment('A', t.teams.a)}
      {segment('B', t.teams.b)}
    </div>
  );
}

export function Home({ people, history, resetAt, loading, error, configured, view, onViewChange, refetch }: Props) {
  const { lang, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<HistoryFilter>('all');
  const [team, setTeam] = useState<TeamFilter>('all');
  const [activity, setActivity] = useState<ActivityFilter>('all');
  const [week, setWeek] = useState<WeekFilter>('all');
  const [personId, setPersonId] = useState<string>('all');
  const [visibleHistory, setVisibleHistory] = useState(HISTORY_PAGE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Selected leaderboard team. Persists across visits (default Team A);
  // only ONE team's board is rendered at a time.
  const [boardTeam, setBoardTeam] = useState<TeamId>(initialBoardTeam);
  const boardTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(BOARD_TEAM_KEY, boardTeam);
    } catch {
      /* private mode — preference just won't persist */
    }
  }, [boardTeam]);

  const selectBoardTeam = (next: TeamId) => {
    setBoardTeam(next);
    // Bring the newly selected board into view (mobile UX); respect
    // reduced-motion preferences.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    boardTopRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  // Scoring period starts at the later of: Monday 00:00 or the last reset.
  const periodStart = useMemo(() => {
    const monday = weekStartLocal();
    if (!resetAt) return monday;
    const reset = new Date(resetAt);
    return reset > monday ? reset : monday;
  }, [resetAt]);

  // Two independent rosters from the database `team` column (static
  // name map in utils/teams.ts is the fallback only). Anyone unassigned
  // still appears in Team A so nobody is silently omitted.
  const teamAPeople = useMemo(() => people.filter((p) => teamOfPerson(p) !== 'B'), [people]);
  const teamBPeople = useMemo(() => people.filter((p) => teamOfPerson(p) === 'B'), [people]);

  // Independent per-team ranking: rank 1 = highest INSIDE the team.
  // Sequential positions with a deterministic name tie-break, so ranks
  // stay valid (1…10) and zones stay meaningful even at 0–0 ties.
  const rankedA = useMemo(() => rankSequential(teamAPeople), [teamAPeople]);
  const rankedB = useMemo(() => rankSequential(teamBPeople), [teamBPeople]);

  // Stock-market movement from the audit log only — never invented.
  const moveA = useMemo(
    () => computeMovement(teamAPeople, history, { start: periodStart }),
    [teamAPeople, history, periodStart],
  );
  const moveB = useMemo(
    () => computeMovement(teamBPeople, history, { start: periodStart }),
    [teamBPeople, history, periodStart],
  );

  // Per-event rank movement for the history cards (replayed from the log).
  const rankEvents = useMemo(() => historyRankMoves(people, history), [people, history]);

  const rankInfo = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of [...rankedA, ...rankedB]) m.set(p.id, p.rank);
    return m;
  }, [rankedA, rankedB]);
  const teamInfo = useMemo(() => {
    const m = new Map<string, 'A' | 'B'>();
    for (const p of teamAPeople) m.set(p.id, 'A');
    for (const p of teamBPeople) m.set(p.id, 'B');
    return m;
  }, [teamAPeople, teamBPeople]);

  // Transient movement spotlight + event sounds, driven ONLY by real
  // data changes: each committed ranking is diffed against the previous
  // one. First load establishes the baseline silently — nothing "moves".
  const [moved, setMoved] = useState<Record<string, 'up' | 'down'>>({});
  const prevSnapshot = useRef<Map<string, { rank: number; total: number }> | null>(null);
  const allRanked = useMemo(() => [...rankedA, ...rankedB], [rankedA, rankedB]);

  useEffect(() => {
    if (loading || allRanked.length === 0) return;
    const cur = new Map(allRanked.map((p) => [p.id, { rank: p.rank, total: p.total_points }]));
    const prev = prevSnapshot.current;
    prevSnapshot.current = cur;
    if (!prev) return;
    const next: Record<string, 'up' | 'down'> = {};
    let ups = 0;
    let downs = 0;
    let milestones = 0;
    let pointsOnly = false;
    for (const p of allRanked) {
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
  }, [allRanked, loading]);

  const q = query.trim();
  const searchResults = useMemo(() => {
    if (!q) return null;
    const needle = q.toLowerCase();
    return people
      .filter((p) => searchNames(p.name).some((n) => n.toLowerCase().includes(needle)))
      .sort((a, b) => b.total_points - a.total_points);
  }, [people, q]);

  const mondayMs = useMemo(() => weekStartLocal().getTime(), []);

  const filteredHistory = useMemo(() => {
    return history.filter((h) => {
      if (source !== 'all' && h.source_key !== source) return false;
      if (personId !== 'all' && h.person_id !== personId) return false;
      const ev = rankEvents[h.id];
      if (team !== 'all' && ev?.team !== team) {
        // Fall back to roster mapping when the event predates replay detail.
        const person = people.find((p) => p.id === h.person_id);
        if (!person || teamOfPerson(person) !== team) return false;
      }
      if (activity === 'points' && h.points_change === 0) return false;
      if (activity === 'ranks') {
        const mv = ev?.rankMove ?? 0;
        if (mv === 0) return false;
      }
      const ts = new Date(h.created_at).getTime();
      if (week === 'this' && ts < mondayMs) return false;
      if (week === 'previous' && ts >= mondayMs) return false;
      return true;
    });
  }, [history, source, personId, rankEvents, team, people, activity, week, mondayMs]);
  const shownHistory = filteredHistory.slice(0, visibleHistory);

  // Activity-feed grouping: one labeled section per calendar day so the
  // list scans as "what happened when", not as a database table.
  const groupedHistory = useMemo(() => {
    const groups: { key: string; label: string; items: HistoryEntry[] }[] = [];
    const todayStr = new Date().toDateString();
    for (const h of shownHistory) {
      const d = new Date(h.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const date = formatDateTime(h.created_at, lang).date;
      const label = d.toDateString() === todayStr ? `${t.historyView.today} · ${date}` : date;
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(h);
      else groups.push({ key, label, items: [h] });
    }
    return groups;
  }, [shownHistory, lang, t]);

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
  const selectedTeam = selected ? (teamInfo.get(selected.id) ?? 'A') : 'A';
  const selectedTeamSize = selectedTeam === 'A' ? teamAPeople.length : teamBPeople.length;

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

  const renderRow = (p: Ranked, i: number, moves: Record<string, { pointsMove: number; rankMove: number | null }>, highlight?: string) => {
    const zone: Zone = getZone(p.rank);
    return (
      <PersonRow
        key={p.id}
        person={p}
        rank={p.rank}
        index={i}
        zone={zone}
        labels={pointLabels(t, p.roles)}
        pointsMove={moves[p.id]?.pointsMove ?? 0}
        rankMove={moves[p.id]?.rankMove}
        query={highlight}
        flash={moved[p.id]}
        onSelect={() => openSheet(p.id)}
      />
    );
  };

  const teamList = (list: Ranked[], moves: Record<string, { pointsMove: number; rankMove: number | null }>, highlight?: string) => {
    if (list.length === 0) return <EmptyState title={t.home.noMembersYet} hint={t.home.addMembersHint} />;
    const safe = list.filter((p) => getZone(p.rank) === 'safe');
    const red = list.filter((p) => getZone(p.rank) === 'red');
    const redFrom = red.length > 0 ? Math.min(...red.map((p) => p.rank)) : SAFE_CUTOFF + 1;
    return (
      <div className="surface overflow-hidden rounded-2xl">
        <div className="px-3 pt-3 sm:px-4">
          <ZoneHeader zone="safe" sub={t.zones.safeSub(SAFE_CUTOFF)} />
        </div>
        <div className="mt-1">
          <AnimatePresence initial={false}>
            {safe.map((p, i) => renderRow(p, i, moves, highlight))}
          </AnimatePresence>
        </div>
        {red.length > 0 && (
          <>
            <div className="px-3 pt-3 sm:px-4">
              <ZoneHeader zone="red" sub={t.zones.redSub(redFrom)} />
            </div>
            <div className="mt-1">
              <AnimatePresence initial={false}>
                {red.map((p, i) => renderRow(p, safe.length + i, moves, highlight))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
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
              const mv = (teamInfo.get(p.id) === 'B' ? moveB : moveA)[p.id];
              return (
                <PersonRow
                  key={p.id}
                  person={p}
                  rank={rank}
                  index={i}
                  zone={zone}
                  labels={pointLabels(t, p.roles)}
                  pointsMove={mv?.pointsMove ?? 0}
                  rankMove={mv?.rankMove}
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
    <div className="space-y-4" aria-label={t.nav.board}>
      <div ref={boardTopRef} className="scroll-mt-20">
        <TeamTabs value={boardTeam} onChange={selectBoardTeam} />
      </div>
      {(() => {
        const activeRanked = boardTeam === 'A' ? rankedA : rankedB;
        const activeMoves = boardTeam === 'A' ? moveA : moveB;
        return (
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={boardTeam}
              className="space-y-3"
              aria-label={boardTeam === 'A' ? t.teams.teamALabel : t.teams.teamBLabel}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <ListMeta shown={activeRanked.length} total={people.length} label={t.list.members} />
              <TeamHeader team={boardTeam} count={activeRanked.length} />
              {teamList(activeRanked, activeMoves)}
            </motion.section>
          </AnimatePresence>
        );
      })()}
    </div>
  );

  const selectCls =
    'h-10 rounded-lg border border-slate-200 bg-transparent px-2 text-[13px] font-medium text-slate-600 outline-none dark:border-white/10 dark:text-slate-300';

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
        <TeamFilterPills
          value={team}
          onChange={(v) => {
            setTeam(v);
            setVisibleHistory(HISTORY_PAGE);
          }}
        />
        <ActivityFilterPills
          value={activity}
          onChange={(v) => {
            setActivity(v);
            setVisibleHistory(HISTORY_PAGE);
          }}
        />
        <WeekFilterPills
          value={week}
          onChange={(v) => {
            setWeek(v);
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
                .sort((a, b) => displayName(a.name, lang).localeCompare(displayName(b.name, lang)))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {displayName(p.name, lang)}
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
          <div className="relative space-y-6 before:absolute before:bottom-2 before:start-[5px] before:top-2 before:w-px before:bg-slate-200 dark:before:bg-white/10">
            {groupedHistory.map((g) => (
              <section key={g.key} aria-label={g.label}>
                <p className="label-caps pb-2 ps-6">{g.label}</p>
                <ul className="space-y-3">
                  {g.items.map((h) => (
                    <HistoryItem key={h.id} item={h} event={rankEvents[h.id]} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
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
        totalCount={selectedTeamSize}
        history={history}
        labels={selected ? pointLabels(t, selected.roles) : { a: '', b: '' }}
        teamName={selectedTeam === 'A' ? t.teams.a : t.teams.b}
        pointsMove={
          selected
            ? ((selectedTeam === 'A' ? moveA : moveB)[selected.id]?.pointsMove ?? 0)
            : 0
        }
        onClose={() => setSelectedId(null)}
        onViewHistory={openHistoryFor}
      />
    </div>
  );
}
