// Grading (docs/build.md §4.5). The rung floors at 2 — a miss never sends a verse back
// to the first rung. The address question rides along ungated (build.md §7.3) and has
// no grading function of its own: a miss just requeues it, handled by the session
// controller, not here.
import { DAY_MS, INTERVALS, type TextRung, type VerseProgress } from "../game/types";

export function gradeText(progress: VerseProgress, ok: boolean, now: number): VerseProgress {
  const seen = progress.seen + 1;
  if (ok) {
    const stage = Math.min(5, progress.stage + 1) as TextRung;
    return { ...progress, seen, stage, due: now + INTERVALS[stage] * DAY_MS };
  }
  const stage = Math.max(2, progress.stage - 1) as TextRung;
  return { ...progress, seen, stage, due: 0 };
}

/**
 * Look it up: always available, always costs the round. No rung change; `due` resets
 * to 0 so the verse returns the same day.
 */
export function markLookedUpText(progress: VerseProgress): VerseProgress {
  return { ...progress, due: 0 };
}

export function markAloud(progress: VerseProgress, now: number): VerseProgress {
  return { ...progress, lastAloud: now };
}
