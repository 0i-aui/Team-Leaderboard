import type { Transition } from 'framer-motion';

/**
 * Shared motion language — one small system instead of dozens of
 * slightly different durations/easings.
 *
 * Levels:
 *  Fast (guesture feedback) .... ~150ms ease-out
 *  Normal ( entrances/fades) ... ~220ms ease-out
 *  Sheet (dialogs/sheets) ...... spring, snappy but calm
 *  Row (list reordering) ....... spring, soft settle
 *
 * All transform/opacity only (GPU-cheap). Decorative motion is further
 * gated by <MotionConfig reducedMotion="user"> at the root plus the
 * global prefers-reduced-motion CSS override.
 */

/** Dialogs + bottom sheets: same calm spring everywhere. */
export const sheetSpring: Transition = { type: 'spring', stiffness: 380, damping: 36 };

/** Backdrop fades. */
export const fadeFast: Transition = { duration: 0.2, ease: 'easeOut' };

/** Route/page fades. */
export const fadePage: Transition = { duration: 0.18, ease: 'easeOut' };

/** Small entrances: toasts, reveals, back-to-top. */
export const riseSoft: Transition = { duration: 0.25, ease: 'easeOut' };

/** Leaderboard row mount + reorder settle. */
export const rowSpring: Transition = { type: 'spring', stiffness: 350, damping: 34 };
export const ROW_MOUNT_DELAY_CAP = 0.25;
export const ROW_MOUNT_DELAY_STEP = 0.03;

/** One-shot scroll reveals (About, history cards). */
export const revealTween: Transition = { duration: 0.3, ease: 'easeOut' };

/** Shared viewport config for one-shot reveals. */
export const revealViewport = { once: true, margin: '-40px' } as const;
