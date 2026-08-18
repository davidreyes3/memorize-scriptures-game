import { describe, expect, it } from "vitest";
import { introduceNewVerses } from "./introduction";
import { createSaveData, type SaveData } from "../game/types";
import { FIXTURE_VERSES } from "../test/fixtures";

const NOW = new Date(2026, 0, 15, 12, 0, 0).getTime();
const LATER = NOW + 1000;

// alpha = f1, f2, f3; beta = f4, f5; gamma = solo (see src/test/fixtures.ts)

function introducedIds(save: SaveData): string[] {
  return Object.entries(save.progress)
    .filter(([, p]) => p.introducedAt !== null)
    .map(([id]) => id);
}

function hold(save: SaveData, id: string): SaveData {
  return { ...save, progress: { ...save.progress, [id]: { ...save.progress[id], stage: 5 } } };
}

describe("introduceNewVerses", () => {
  it("introduces the first verse of every path in one call", () => {
    const save = createSaveData(FIXTURE_VERSES);
    const result = introduceNewVerses(save, FIXTURE_VERSES, NOW);
    expect(introducedIds(result).sort()).toEqual(["f1", "f4", "solo"]);
  });

  it("stamps introducedAt with the given now", () => {
    const save = createSaveData(FIXTURE_VERSES);
    const result = introduceNewVerses(save, FIXTURE_VERSES, NOW);
    for (const id of introducedIds(result)) expect(result.progress[id].introducedAt).toBe(NOW);
  });

  it("is a no-op on a second call when nothing new has been held since", () => {
    const save = createSaveData(FIXTURE_VERSES);
    const first = introduceNewVerses(save, FIXTURE_VERSES, NOW);
    const second = introduceNewVerses(first, FIXTURE_VERSES, LATER);
    expect(introducedIds(second).sort()).toEqual(["f1", "f4", "solo"]);
  });

  it("does not introduce a path's second verse until its first is held", () => {
    let save = createSaveData(FIXTURE_VERSES);
    for (let i = 0; i < 10; i++) save = introduceNewVerses(save, FIXTURE_VERSES, NOW);
    // f1/f4 never get held here, so f2/f5 should never unlock no matter how many times
    // introduceNewVerses runs — introduction plateaus at one verse per path.
    expect(introducedIds(save).sort()).toEqual(["f1", "f4", "solo"]);
  });

  it("introduces a path's second verse as soon as its first is held", () => {
    let save = createSaveData(FIXTURE_VERSES);
    save = introduceNewVerses(save, FIXTURE_VERSES, NOW); // f1, f4, solo
    save = hold(save, "f1");
    const result = introduceNewVerses(save, FIXTURE_VERSES, LATER);
    expect(result.progress.f2.introducedAt).toBe(LATER);
    // f4 (beta) is still not held, so f5 stays locked.
    expect(result.progress.f5.introducedAt).toBeNull();
  });

  it("each path unlocks independently — one path's progress doesn't gate another's", () => {
    let save = createSaveData(FIXTURE_VERSES);
    save = introduceNewVerses(save, FIXTURE_VERSES, NOW);
    save = hold(save, "f4"); // beta's first verse held; alpha's is not
    const result = introduceNewVerses(save, FIXTURE_VERSES, LATER);
    expect(result.progress.f5.introducedAt).toBe(LATER);
    expect(result.progress.f2.introducedAt).toBeNull();
  });

  it("is a no-op once every verse in the library is introduced", () => {
    let save = createSaveData(FIXTURE_VERSES);
    // Introduce whatever's eligible, hold everything introduced so far, repeat — walks
    // every path to the end exactly like real usage (mastering each stone unlocks the next).
    for (let i = 0; i < FIXTURE_VERSES.length; i++) {
      save = introduceNewVerses(save, FIXTURE_VERSES, NOW + i);
      for (const id of introducedIds(save)) save = hold(save, id);
    }
    expect(introducedIds(save).sort()).toEqual(["f1", "f2", "f3", "f4", "f5", "solo"]);

    const before = JSON.stringify(save.progress);
    const after = introduceNewVerses(save, FIXTURE_VERSES, NOW + 999);
    expect(JSON.stringify(after.progress)).toBe(before);
  });
});
