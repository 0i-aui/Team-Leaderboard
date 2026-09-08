import { useEffect, useRef, useState } from 'react';

export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(target);
  // Tracks the currently displayed value so a mid-flight retarget
  // animates from where the number visibly is — never jumps backward.
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    if (from === target) {
      setValue(target);
      return;
    }
    // Scale travel time with distance so small ticks feel snappy and
    // large jumps still land quickly — never a slow crawl.
    const distance = Math.abs(target - from);
    const effective = Math.min(900, Math.max(300, 300 + distance * 3));
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / effective);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (target - from) * eased);
      shownRef.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
