// Session queue assembly (docs/build.md §4.10).
import { ALOUD_GAP_MS, type PathId, type SaveData, type VerseId, type Verse } from "../game/types";
import { shuffle } from "../game/random";

export type QueueItemKind = "text" | "ref" | "aloud";

export interface QueueItem {
  kind: QueueItemKind;
  id: VerseId;
}

/**
 * Verses with `introducedAt === null` never enter a queue. The `due` schedule only ever
 * gates a verse once it's held (`stage === 5`) — that's spaced review of something
 * already mastered, which is what the interval table is for. A verse still being
 * learned (`stage < 5`) is always due: there's exactly one such verse per path at a time
 * (introduction is sequential, srs/introduction.ts), and gating the one thing the user
 * is actively working toward mastery behind a multi-day interval just stalls them with
 * nothing else to do in that path. `force` (previously "Trotzdem üben", no longer wired
 * to any UI) still lets a held verse be reviewed ahead of its own due date; `ref` has no
 * schedule of its own and simply rides along whenever text does; `aloud` is never a
 * test — it always follows its own 7-day gate regardless of force.
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

    const textDue = force || !isHeld(p) || p.due <= now;
    if (textDue) items.push({ kind: "text", id: verse.id });
    if (textDue && p.stage >= 2) items.push({ kind: "ref", id: verse.id });
    if (p.stage >= 3 && now - p.lastAloud > ALOUD_GAP_MS) items.push({ kind: "aloud", id: verse.id });
  }

  return shuffle(items, rng);
}

export function isHeld(progress: { stage: number }): boolean {
  return progress.stage >= 5;
}
