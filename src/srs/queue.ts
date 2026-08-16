// Session queue assembly (docs/build.md §4.10).
import { ALOUD_GAP_MS, type PathId, type SaveData, type VerseId, type Verse } from "../game/types";
import { shuffle } from "../game/random";

export type QueueItemKind = "text" | "ref" | "aloud";

export interface QueueItem {
  kind: QueueItemKind;
  id: VerseId;
}

/**
 * Verses with `introducedAt === null` never enter a queue. `force` (the "Trotzdem üben"
 * escape hatch) ignores due dates for text/ref, but `aloud` is never a test — it always
 * follows its own 7-day gate regardless of force.
 */
export function assembleQueue(
  pathId: PathId,
  save: SaveData,
  verses: readonly Verse[],
  now: number,
  rng: () => number,
  force = false,
): QueueItem[] {
  const items: QueueItem[] = [];

  for (const verse of verses) {
    if (verse.path !== pathId) continue;
    const p = save.progress[verse.id];
    if (!p || p.introducedAt == null) continue;

    if (force || p.due <= now) items.push({ kind: "text", id: verse.id });
    if (p.stage >= 2 && (force || p.refDue <= now)) items.push({ kind: "ref", id: verse.id });
    if (p.stage >= 3 && now - p.lastAloud > ALOUD_GAP_MS) items.push({ kind: "aloud", id: verse.id });
  }

  return shuffle(items, rng);
}

export function isHeld(progress: { stage: number; refStage: number }): boolean {
  return progress.stage >= 5 && progress.refStage >= 3;
}
