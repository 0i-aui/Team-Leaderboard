import { useEffect, useState } from 'react';

/**
 * Rank movement vs. the last observed snapshot (persisted locally).
 * This is real observed data — ranks this client previously saw —
 * never invented. Returns per-person delta (positive = moved up)
 * and the set of ids never seen before.
 */
export function useRankDelta(
  key: string,
  ranked: { id: string; rank: number }[],
): { deltas: Record<string, number>; fresh: Set<string> } {
  const [deltas, setDeltas] = useState<Record<string, number>>({});
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (ranked.length === 0) return;
    const storageKey = `tl-rank-${key}`;
    let prev: Record<string, number> = {};
    try {
      prev = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Record<string, number>;
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
      localStorage.setItem(storageKey, JSON.stringify(snap));
    } catch {
      /* private mode — deltas just won't persist */
    }
  }, [key, ranked]);

  return { deltas, fresh };
}
