import { describe, expect, it } from "vitest";
import { introduceNewVerses } from "./introduction";
import { DAY_MS, createSaveData } from "../game/types";
import { FIXTURE_VERSES } from "../test/fixtures";

// Local noon, not UTC — introduceNewVerses buckets by local calendar date, so the fixture
// times must be interpreted the same way to avoid timezone-dependent test failures.
const DAY1 = new Date(2026, 0, 15, 12, 0, 0).getTime();
const DAY2 = new Date(2026, 0, 16, 12, 0, 0).getTime();

describe("introduceNewVerses", () => {
  it("introduces exactly settings.newPerDay verses on the first call", () => {
    const save = createSaveData(FIXTURE_VERSES);
    const result = introduceNewVerses(save, FIXTURE_VERSES, DAY1);
    const introduced = Object.values(result.progress).filter((p) => p.introducedAt !== null);
    expect(introduced.length).toBe(save.settings.newPerDay);
  });

  it("stamps introducedAt with the given now", () => {
    const save = createSaveData(FIXTURE_VERSES);
    const result = introduceNewVerses(save, FIXTURE_VERSES, DAY1);
    const introduced = Object.values(result.progress).filter((p) => p.introducedAt !== null);
    for (const p of introduced) expect(p.introducedAt).toBe(DAY1);
  });

  it("introduces none on a second call the same day", () => {
    const save = createSaveData(FIXTURE_VERSES);
    const first = introduceNewVerses(save, FIXTURE_VERSES, DAY1);
    const second = introduceNewVerses(first, FIXTURE_VERSES, DAY1 + 1000);
    const introducedAfterSecond = Object.values(second.progress).filter((p) => p.introducedAt !== null);
    expect(introducedAfterSecond.length).toBe(save.settings.newPerDay);
  });

  it("introduces the full quota again on the next calendar day", () => {
    const save = createSaveData(FIXTURE_VERSES);
    const first = introduceNewVerses(save, FIXTURE_VERSES, DAY1);
    const second = introduceNewVerses(first, FIXTURE_VERSES, DAY2);
    const introduced = Object.values(second.progress).filter((p) => p.introducedAt !== null);
    expect(introduced.length).toBe(save.settings.newPerDay * 2);
  });

  it("is a no-op once every verse is introduced", () => {
    let save = createSaveData(FIXTURE_VERSES);
    let now = DAY1;
    for (let i = 0; i < FIXTURE_VERSES.length; i++) {
      save = introduceNewVerses(save, FIXTURE_VERSES, now);
      now += DAY_MS;
    }
    const before = JSON.stringify(save.progress);
    const after = introduceNewVerses(save, FIXTURE_VERSES, now);
    expect(JSON.stringify(after.progress)).toBe(before);
  });

  it("raising newPerDay mid-day frees the extra slots immediately", () => {
    const save = createSaveData(FIXTURE_VERSES);
    const first = introduceNewVerses(save, FIXTURE_VERSES, DAY1); // introduces 2
    const raised = { ...first, settings: { ...first.settings, newPerDay: 4 } };
    const second = introduceNewVerses(raised, FIXTURE_VERSES, DAY1 + 1000);
    const introduced = Object.values(second.progress).filter((p) => p.introducedAt !== null);
    expect(introduced.length).toBe(4);
  });

  it("lowering newPerDay below today's count introduces none, without throwing or reverting", () => {
    const save = createSaveData(FIXTURE_VERSES);
    const first = introduceNewVerses(save, FIXTURE_VERSES, DAY1); // introduces 2
    const lowered = { ...first, settings: { ...first.settings, newPerDay: 1 } };
    expect(() => introduceNewVerses(lowered, FIXTURE_VERSES, DAY1 + 1000)).not.toThrow();
    const result = introduceNewVerses(lowered, FIXTURE_VERSES, DAY1 + 1000);
    const introduced = Object.values(result.progress).filter((p) => p.introducedAt !== null);
    expect(introduced.length).toBe(2); // unchanged, not reverted to fewer
  });

  it("prunes introductions entries older than 30 days", () => {
    const save = createSaveData(FIXTURE_VERSES);
    const stale = { ...save, introductions: { "2020-01-01": 2 } };
    const result = introduceNewVerses(stale, FIXTURE_VERSES, DAY1);
    expect(result.introductions["2020-01-01"]).toBeUndefined();
  });
});
