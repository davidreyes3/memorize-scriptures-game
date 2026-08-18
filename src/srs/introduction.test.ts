import { describe, expect, it } from "vitest";
import { introduceNewVerses } from "./introduction";
import { DAY_MS, createSaveData, type SaveData } from "../game/types";
import { FIXTURE_VERSES } from "../test/fixtures";

// Local noon, not UTC — introduceNewVerses buckets by local calendar date, so the fixture
// times must be interpreted the same way to avoid timezone-dependent test failures.
const DAY1 = new Date(2026, 0, 15, 12, 0, 0).getTime();
const DAY2 = new Date(2026, 0, 16, 12, 0, 0).getTime();

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
  it("introduces exactly settings.newPerDay verses on the first call, one per path", () => {
    const save = createSaveData(FIXTURE_VERSES);
    const result = introduceNewVerses(save, FIXTURE_VERSES, DAY1);
    const introduced = introducedIds(result);
    expect(introduced.length).toBe(save.settings.newPerDay);
    // Only the first verse of each path is ever a candidate before anything is held.
    expect(introduced.every((id) => ["f1", "f4", "solo"].includes(id))).toBe(true);
  });

  it("stamps introducedAt with the given now", () => {
    const save = createSaveData(FIXTURE_VERSES);
    const result = introduceNewVerses(save, FIXTURE_VERSES, DAY1);
    for (const id of introducedIds(result)) expect(result.progress[id].introducedAt).toBe(DAY1);
  });

  it("introduces none on a second call the same day", () => {
    const save = createSaveData(FIXTURE_VERSES);
    const first = introduceNewVerses(save, FIXTURE_VERSES, DAY1);
    const second = introduceNewVerses(first, FIXTURE_VERSES, DAY1 + 1000);
    expect(introducedIds(second).length).toBe(save.settings.newPerDay);
  });

  it("does not introduce a path's second verse until its first is held, even across many days", () => {
    let save = createSaveData(FIXTURE_VERSES);
    let now = DAY1;
    // f1 (alpha) and f4 (beta) get introduced day one; solo (gamma) has no second verse.
    // Nothing here ever grades f1 or f4, so f2/f5 should never unlock no matter how many
    // days pass — introduction plateaus at one verse per path.
    for (let i = 0; i < 10; i++) {
      save = introduceNewVerses(save, FIXTURE_VERSES, now);
      now += DAY_MS;
    }
    expect(introducedIds(save).sort()).toEqual(["f1", "f4", "solo"]);
  });

  it("introduces a path's second verse once its first is held", () => {
    let save = createSaveData(FIXTURE_VERSES);
    save = introduceNewVerses(save, FIXTURE_VERSES, DAY1); // f1, f4 introduced
    save = hold(save, "f1");
    const result = introduceNewVerses(save, FIXTURE_VERSES, DAY2);
    expect(result.progress.f2.introducedAt).toBe(DAY2);
    // f4 (beta) is still not held, so f5 stays locked.
    expect(result.progress.f5.introducedAt).toBeNull();
  });

  it("each path unlocks independently — one path's progress doesn't gate another's", () => {
    let save = createSaveData(FIXTURE_VERSES);
    save = introduceNewVerses(save, FIXTURE_VERSES, DAY1); // f1, f4
    save = hold(save, "f4"); // beta's first verse held; alpha's is not
    const result = introduceNewVerses(save, FIXTURE_VERSES, DAY2);
    expect(result.progress.f5.introducedAt).toBe(DAY2);
    expect(result.progress.f2.introducedAt).toBeNull();
  });

  it("raising newPerDay mid-day introduces an extra eligible verse from another path immediately", () => {
    let save = createSaveData(FIXTURE_VERSES);
    save = introduceNewVerses(save, FIXTURE_VERSES, DAY1); // f1, f4 (newPerDay defaults to 2)
    save = hold(save, "f1");
    save = hold(save, "f4");
    // Without raising the cap, today's quota (2) is already spent on f1 and f4.
    const capped = introduceNewVerses(save, FIXTURE_VERSES, DAY1 + 1000);
    expect(introducedIds(capped).length).toBe(2);
    const raised = { ...save, settings: { ...save.settings, newPerDay: 4 } };
    const result = introduceNewVerses(raised, FIXTURE_VERSES, DAY1 + 1000);
    expect(result.progress.f2.introducedAt).toBe(DAY1 + 1000);
    expect(result.progress.f5.introducedAt).toBe(DAY1 + 1000);
  });

  it("lowering newPerDay below today's count introduces none, without throwing or reverting", () => {
    const save = createSaveData(FIXTURE_VERSES);
    const first = introduceNewVerses(save, FIXTURE_VERSES, DAY1); // introduces 2
    const lowered = { ...first, settings: { ...first.settings, newPerDay: 1 } };
    expect(() => introduceNewVerses(lowered, FIXTURE_VERSES, DAY1 + 1000)).not.toThrow();
    const result = introduceNewVerses(lowered, FIXTURE_VERSES, DAY1 + 1000);
    expect(introducedIds(result).length).toBe(2); // unchanged, not reverted to fewer
  });

  it("prunes introductions entries older than 30 days", () => {
    const save = createSaveData(FIXTURE_VERSES);
    const stale = { ...save, introductions: { "2020-01-01": 2 } };
    const result = introduceNewVerses(stale, FIXTURE_VERSES, DAY1);
    expect(result.introductions["2020-01-01"]).toBeUndefined();
  });
});
