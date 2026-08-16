// New-verse introduction cap (docs/build.md §4.9) — resolves spec.md §10.2. Nothing in the
// prototype does this; every verse there starts `due: 0` and all arrive at once, which
// guarantees an ever-growing queue as the library grows.
import { DAY_MS, blankProgress, type SaveData, type Verse } from "../game/types";

const PRUNE_AFTER_DAYS = 30;

function dateKey(now: number): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Called once at session start, before queue assembly. The cap is global across all
 * paths (it exists to bound total daily workload) and user-adjustable via
 * `save.settings.newPerDay`. Raising the setting mid-day makes the extra slots available
 * immediately; lowering it below today's count introduces none rather than throwing or
 * un-introducing anything already stamped.
 */
export function introduceNewVerses(save: SaveData, verses: readonly Verse[], now: number): SaveData {
  const today = dateKey(now);
  const introducedToday = save.introductions[today] ?? 0;
  const allowed = save.settings.newPerDay - introducedToday;
  const introductions = pruneIntroductions(save.introductions, now);

  if (allowed <= 0) {
    return { ...save, introductions };
  }

  const progress = { ...save.progress };
  const uninitialized = verses.filter((v) => (progress[v.id] ?? blankProgress()).introducedAt == null);
  const toIntroduce = uninitialized.slice(0, allowed);

  for (const verse of toIntroduce) {
    const existing = progress[verse.id] ?? blankProgress();
    progress[verse.id] = { ...existing, introducedAt: now };
  }

  if (toIntroduce.length > 0) {
    introductions[today] = introducedToday + toIntroduce.length;
  }

  return { ...save, progress, introductions };
}

function pruneIntroductions(introductions: Record<string, number>, now: number): Record<string, number> {
  const cutoff = now - PRUNE_AFTER_DAYS * DAY_MS;
  const result: Record<string, number> = {};
  for (const [key, count] of Object.entries(introductions)) {
    const time = new Date(`${key}T00:00:00`).getTime();
    if (!Number.isNaN(time) && time >= cutoff) result[key] = count;
  }
  return result;
}
