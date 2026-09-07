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
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
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
