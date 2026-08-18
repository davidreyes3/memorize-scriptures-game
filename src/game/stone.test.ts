import { describe, expect, it } from "vitest";
import { stoneState } from "./stone";
import { blankProgress } from "./types";
import type { TextRung } from "./types";

describe("stoneState", () => {
  it("is locked when introducedAt is null, regardless of stage", () => {
    for (const stage of [1, 2, 3, 4, 5] as TextRung[]) {
      const progress = { ...blankProgress(), stage, introducedAt: null };
      expect(stoneState(progress).state).toBe("locked");
    }
  });

  it("is cracked with healed = stage - 1 once introduced, for stage 1-4", () => {
    const cases: [TextRung, number][] = [
      [1, 0],
      [2, 1],
      [3, 2],
      [4, 3],
    ];
    for (const [stage, healed] of cases) {
      const progress = { ...blankProgress(), stage, introducedAt: 1000 };
      const result = stoneState(progress);
      if (result.state !== "cracked") throw new Error("expected cracked");
      expect(result.healed).toBe(healed);
    }
  });

  it("is held at stage 5, once introduced", () => {
    const progress = { ...blankProgress(), stage: 5 as TextRung, introducedAt: 1000 };
    expect(stoneState(progress).state).toBe("held");
  });

  it("locked wins over stage 5 when never introduced", () => {
    const progress = { ...blankProgress(), stage: 5 as TextRung, introducedAt: null };
    expect(stoneState(progress).state).toBe("locked");
  });
});
