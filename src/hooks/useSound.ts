import { useCallback, useEffect, useState } from 'react';
import { setSoundEnabled, sounds, unlockAudio, unlockOnEveryGesture } from '../lib/sound';

const KEY = 'team-leaderboard-sound';

function initial(): boolean {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'on') return true;
    if (saved === 'off') return false;
  } catch {
    /* fall through to default */
  }
  return true;
}

/** Persisted sound toggle. Independent from reduced-motion by design. */
export function useSound() {
  const [enabled, setEnabledState] = useState<boolean>(() =>
    typeof window === 'undefined' ? true : initial(),
  );

  useEffect(() => {
    setSoundEnabled(enabled);
    try {
      localStorage.setItem(KEY, enabled ? 'on' : 'off');
    } catch {
      /* private mode — preference just won't persist */
    }
  }, [enabled]);

  // Browsers gate audio behind user interaction: re-unlock on every
  // gesture so later event-driven sounds (e.g. realtime updates) are
  // allowed even if the context was re-suspended in the background.
  useEffect(() => {
    unlockOnEveryGesture();
  }, []);

  const toggle = useCallback(() => {
    const next = !enabled;
    // Enable synchronously (the tap is a gesture, so resume succeeds),
    // then play a quiet confirmation blip so users can hear the new state.
    setSoundEnabled(next);
    unlockAudio();
    setEnabledState(next);
    if (next) window.setTimeout(() => sounds.tap(), 60);
  }, [enabled]);

  return { enabled, toggle };
}
