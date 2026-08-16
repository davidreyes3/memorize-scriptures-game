// Grading (docs/build.md §4.5). Rungs floor at 2 (text) and 1 (address) — a miss never
// sends a verse back to the first rung.
import { DAY_MS, INTERVALS, REF_INTERVALS, type RefRung, type TextRung, type VerseProgress } from "../game/types";

export function gradeText(progress: VerseProgress, ok: boolean, now: number): VerseProgress {
  const seen = progress.seen + 1;
  if (ok) {
    const stage = Math.min(5, progress.stage + 1) as TextRung;
    return { ...progress, seen, stage, due: now + INTERVALS[stage] * DAY_MS };
  }
  const stage = Math.max(2, progress.stage - 1) as TextRung;
  return { ...progress, seen, stage, due: 0 };
}

export function gradeRef(progress: VerseProgress, ok: boolean, now: number): VerseProgress {
  if (ok) {
    const refStage = Math.min(3, progress.refStage + 1) as RefRung;
    return { ...progress, refStage, refDue: now + REF_INTERVALS[refStage] * DAY_MS };
  }
  const refStage = Math.max(1, progress.refStage - 1) as RefRung;
  return { ...progress, refStage, refDue: 0 };
}

/**
 * Look it up: always available, always costs the rung. No rung changes in either
 * direction; `due`/`refDue` reset to 0 so the verse returns the same day.
 */
export function markLookedUpText(progress: VerseProgress): VerseProgress {
  return { ...progress, due: 0 };
}

export function markLookedUpRef(progress: VerseProgress): VerseProgress {
  return { ...progress, refDue: 0 };
}

export function markAloud(progress: VerseProgress, now: number): VerseProgress {
  return { ...progress, lastAloud: now };
}
