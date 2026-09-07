import { useEffect, useState } from 'react';
import type { Board } from '../types';

/**
 * Rank movement vs. the last observed snapshot (persisted locally).
 * This is real observed data — ranks this client previously saw —
 * never invented. Returns per-person delta (positive = moved up)
 * and the set of ids never seen before.
 */
export function useRankDelta(
  board: Board,
  ranked: { id: string; rank: number }[],
): { deltas: Record<string, number>; fresh: Set<string> } {
  const [deltas, setDeltas] = useState<Record<string, number>>({});
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (ranked.length === 0) return;
    const key = `tl-rank-${board}`;
    let prev: Record<string, number> = {};
    try {
      prev = JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, number>;
    } catch {
      prev = {};
    }
    const hadBaseline = Object.keys(prev).length > 0;
    const d: Record<string, number> = {};
    const f = new Set<string>();
    for (const r of ranked) {
      const p = prev[r.id];
      if (p == null) {
        if (hadBaseline) f.add(r.id);
      } else if (p !== r.rank) {
        d[r.id] = p - r.rank;
      }
    }
    setDeltas(d);
    setFresh(f);
    const snap: Record<string, number> = {};
    for (const r of ranked) snap[r.id] = r.rank;
    try {
      localStorage.setItem(key, JSON.stringify(snap));
    } catch {
      /* private mode — deltas just won't persist */
    }
  }, [board, ranked]);

  return { deltas, fresh };
}
