/**
 * Featherweight sound engine — synthesized Web Audio tones, no assets,
 * no dependencies. Everything is quiet by design (master gain ≈ 0.05)
 * and every call is safe to make at any time: if audio is disabled,
 * locked, or blocked, calls are silent no-ops that never throw.
 */

type ToneOpts = {
  /** Start frequency in Hz */
  from: number;
  /** End frequency in Hz (glide target) */
  to?: number;
  /** Seconds */
  dur?: number;
  /** Oscillator shape */
  type?: OscillatorType;
  /** Peak gain 0..1 (scaled by master) */
  gain?: number;
  /** Delay before starting, in seconds */
  at?: number;
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let unlockAttached = false;

const MASTER_GAIN = 0.05;

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = MASTER_GAIN;
      master.connect(ctx.destination);
    }
    return ctx;
  } catch {
    return null;
  }
}

/** Resume the context after a user gesture. Browsers start it suspended. */
export function unlockAudio(): void {
  const c = ensureCtx();
  if (!c) return;
  try {
    if (c.state === 'suspended') void c.resume().catch(() => {});
  } catch {
    /* never surface audio errors */
  }
}

/**
 * Keep the context unlocked on every user gesture — not just the first.
 * A context can be re-suspended at any time (backgrounded tab, OS policy),
 * so one-shot listeners would leave sounds permanently dead afterwards.
 * These are cheap no-ops when already running.
 */
export function unlockOnEveryGesture(): void {
  if (unlockAttached || typeof window === 'undefined') return;
  unlockAttached = true;
  const handler = () => {
    unlockAudio();
  };
  window.addEventListener('pointerdown', handler, { passive: true });
  // touchend covers mobile Safari cases where pointerdown alone is unreliable
  window.addEventListener('touchend', handler, { passive: true });
  window.addEventListener('keydown', handler);
}

/** @deprecated Use unlockOnEveryGesture instead. Kept for compatibility. */
export function unlockOnFirstGesture(): void {
  unlockOnEveryGesture();
}

export function setSoundEnabled(v: boolean): void {
  enabled = v;
  if (!v) return;
  // Enabling is itself a gesture — try to unlock right away.
  unlockAudio();
}

function tone({ from, to, dur = 0.09, type = 'sine', gain = 1, at = 0 }: ToneOpts): void {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c || !master || c.state !== 'running') return;
  try {
    const t0 = c.currentTime + at;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to != null && to !== from) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    // Soft attack, exponential decay — no clicks, no harsh edges.
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
    osc.onended = () => {
      try {
        osc.disconnect();
        g.disconnect();
      } catch {
        /* noop */
      }
    };
  } catch {
    /* never surface audio errors */
  }
}

/** Meaningful moments only — never hover, keystrokes, or routine taps. */
export const sounds = {
  /** Rank moved up: soft two-note rise */
  rankUp(): void {
    tone({ from: 523.25, dur: 0.09, gain: 0.9 });
    tone({ from: 783.99, dur: 0.12, gain: 0.8, at: 0.08 });
  },
  /** Rank moved down: soft two-note fall, triangle for neutrality */
  rankDown(): void {
    tone({ from: 392, dur: 0.09, type: 'triangle', gain: 0.7 });
    tone({ from: 311.13, dur: 0.12, type: 'triangle', gain: 0.6, at: 0.08 });
  },
  /** Points changed without rank movement: single quiet blip */
  points(): void {
    tone({ from: 659.25, dur: 0.07, gain: 0.55 });
  },
  /** Entered the top 3: gentle three-note chime, still restrained */
  milestone(): void {
    tone({ from: 523.25, dur: 0.1, gain: 0.8 });
    tone({ from: 659.25, dur: 0.1, gain: 0.75, at: 0.09 });
    tone({ from: 783.99, dur: 0.16, gain: 0.7, at: 0.18 });
  },
  /** Important actions only (e.g. opening a detail sheet) */
  tap(): void {
    tone({ from: 880, dur: 0.035, gain: 0.3 });
  },
};
