// New-verse introduction (docs/build.md §4.9, later revised — see status.md). Nothing in
// the prototype does this; every verse there starts `due: 0` and all arrive at once,
// which guarantees an ever-growing queue as the library grows.
//
// Verses unlock one at a time within a path, stepping-stone style: a verse only becomes
// introducible once the one immediately before it in its path is held. That pacing made
// the earlier daily newPerDay cap redundant — the user pointed out that once unlocking
// is sequential, tapping the next stone whenever you want to keep going is the natural
// throttle, and a separate settings knob had nothing left to do. This is a gate on
// introduction only — once introduced, a verse stays introduced even if it's later
// reviewed and drops back out of "held".
import { blankProgress, type PathId, type SaveData, type Verse } from "../game/types";
import { isHeld } from "./queue";

/** Called once at session start, before queue assembly. */
export function introduceNewVerses(save: SaveData, verses: readonly Verse[], now: number): SaveData {
  const progress = { ...save.progress };

  const byPath = new Map<PathId, Verse[]>();
  for (const v of verses) {
    const list = byPath.get(v.path);
    if (list) list.push(v);
    else byPath.set(v.path, [v]);
  }

  // At most one candidate per path: its first not-yet-introduced verse, and only if
  // that verse's immediate predecessor in the path (if any) is held.
  for (const pathVerses of byPath.values()) {
    for (let i = 0; i < pathVerses.length; i++) {
      const p = progress[pathVerses[i].id] ?? blankProgress();
      if (p.introducedAt !== null) continue;
      const prev = i > 0 ? (progress[pathVerses[i - 1].id] ?? blankProgress()) : null;
      if (!prev || isHeld(prev)) progress[pathVerses[i].id] = { ...p, introducedAt: now };
      break;
    }
  }

  return { ...save, progress };
}
