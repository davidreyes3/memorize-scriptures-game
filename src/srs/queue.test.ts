import { describe, expect, it } from "vitest";
import { assembleQueue, isHeld } from "./queue";
import { ALOUD_GAP_MS, blankProgress, createSaveData, type SaveData } from "../game/types";
import { mulberry32 } from "../game/random";
import { FIXTURE_VERSES } from "../test/fixtures";

const NOW = 1_700_000_000_000;

function withProgress(overrides: Record<string, Partial<ReturnType<typeof blankProgress>>>): SaveData {
  const save = createSaveData(FIXTURE_VERSES);
  for (const [id, patch] of Object.entries(overrides)) {
    save.progress[id] = { ...save.progress[id], introducedAt: NOW - 1, ...patch };
  }
  return save;
}

describe("assembleQueue", () => {
  it("excludes verses that have not been introduced", () => {
    const save = createSaveData(FIXTURE_VERSES); // nothing introduced
    const items = assembleQueue("alpha", save, FIXTURE_VERSES, NOW, mulberry32(1));
    expect(items).toEqual([]);
  });

  it("includes a text item once introduced and due", () => {
    const save = withProgress({ f1: { due: 0 } });
    const items = assembleQueue("alpha", save, FIXTURE_VERSES, NOW, mulberry32(1));
    expect(items.some((i) => i.kind === "text" && i.id === "f1")).toBe(true);
  });

  it("excludes a text item that is introduced but not yet due", () => {
    const save = withProgress({ f1: { due: NOW + 10_000 } });
    const items = assembleQueue("alpha", save, FIXTURE_VERSES, NOW, mulberry32(1));
    expect(items.some((i) => i.kind === "text" && i.id === "f1")).toBe(false);
  });

  it("includes a ref item only at stage >= 2 and refDue elapsed", () => {
    const notYetRung2 = withProgress({ f1: { stage: 1, refDue: 0 } });
    expect(
      assembleQueue("alpha", notYetRung2, FIXTURE_VERSES, NOW, mulberry32(1)).some((i) => i.kind === "ref"),
    ).toBe(false);

    const ready = withProgress({ f1: { stage: 2, refDue: 0 } });
    expect(
      assembleQueue("alpha", ready, FIXTURE_VERSES, NOW, mulberry32(1)).some(
        (i) => i.kind === "ref" && i.id === "f1",
      ),
    ).toBe(true);
  });

  it("includes an aloud item only at stage >= 3 and after the 7-day gap", () => {
    const tooSoon = withProgress({ f1: { stage: 3, lastAloud: NOW - 1000 } });
    expect(
      assembleQueue("alpha", tooSoon, FIXTURE_VERSES, NOW, mulberry32(1)).some((i) => i.kind === "aloud"),
    ).toBe(false);

    const overdue = withProgress({ f1: { stage: 3, lastAloud: NOW - ALOUD_GAP_MS - 1000 } });
    expect(
      assembleQueue("alpha", overdue, FIXTURE_VERSES, NOW, mulberry32(1)).some(
        (i) => i.kind === "aloud" && i.id === "f1",
      ),
    ).toBe(true);
  });

  it("can yield all three item kinds for one verse at once", () => {
    const save = withProgress({
      f1: { stage: 3, due: 0, refStage: 2, refDue: 0, lastAloud: 0 },
    });
    const items = assembleQueue("alpha", save, FIXTURE_VERSES, NOW, mulberry32(1));
    const kinds = items.filter((i) => i.id === "f1").map((i) => i.kind);
    expect(kinds.sort()).toEqual(["aloud", "ref", "text"]);
  });

  it("force ignores due dates for text and ref", () => {
    const save = withProgress({ f1: { stage: 2, due: NOW + 100_000, refDue: NOW + 100_000 } });
    const items = assembleQueue("alpha", save, FIXTURE_VERSES, NOW, mulberry32(1), true);
    expect(items.some((i) => i.kind === "text" && i.id === "f1")).toBe(true);
    expect(items.some((i) => i.kind === "ref" && i.id === "f1")).toBe(true);
  });

  it("force does not bypass the aloud gate", () => {
    const save = withProgress({ f1: { stage: 3, lastAloud: NOW - 1000 } });
    const items = assembleQueue("alpha", save, FIXTURE_VERSES, NOW, mulberry32(1), true);
    expect(items.some((i) => i.kind === "aloud" && i.id === "f1")).toBe(false);
  });

  it("only includes verses from the requested path", () => {
    const save = withProgress({ f4: { due: 0 } }); // f4 is path "beta"
    const items = assembleQueue("alpha", save, FIXTURE_VERSES, NOW, mulberry32(1));
    expect(items.some((i) => i.id === "f4")).toBe(false);
  });
});

describe("isHeld", () => {
  it("is true only when both ladders are full", () => {
    expect(isHeld({ stage: 5, refStage: 3 })).toBe(true);
    expect(isHeld({ stage: 5, refStage: 2 })).toBe(false);
    expect(isHeld({ stage: 4, refStage: 3 })).toBe(false);
  });
});
