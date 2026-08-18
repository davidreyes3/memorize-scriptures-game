// New-verse introduction cap (docs/build.md §4.9) — resolves spec.md §10.2. Nothing in the
// prototype does this; every verse there starts `due: 0` and all arrive at once, which
// guarantees an ever-growing queue as the library grows.
//
// Verses unlock one at a time within a path, stepping-stone style: a verse only becomes
// introducible once the one immediately before it in its path is held. This is a gate on
// introduction only — once introduced, a verse stays introduced even if it's later
// reviewed and drops back out of "held", same as the daily cap never un-introduces.
import { DAY_MS, blankProgress, type PathId, type SaveData, type Verse } from "../game/types";
import { isHeld } from "./queue";

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

  const byPath = new Map<PathId, Verse[]>();
  for (const v of verses) {
    const list = byPath.get(v.path);
    if (list) list.push(v);
    else byPath.set(v.path, [v]);
  }

  // At most one candidate per path: its first not-yet-introduced verse, and only if
  // that verse's immediate predecessor in the path (if any) is held.
  const candidates: Verse[] = [];
  for (const pathVerses of byPath.values()) {
    for (let i = 0; i < pathVerses.length; i++) {
      const p = progress[pathVerses[i].id] ?? blankProgress();
      if (p.introducedAt !== null) continue;
      const prev = i > 0 ? (progress[pathVerses[i - 1].id] ?? blankProgress()) : null;
      if (!prev || isHeld(prev)) candidates.push(pathVerses[i]);
      break;
    }
  }

  const toIntroduce = candidates.slice(0, allowed);

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
