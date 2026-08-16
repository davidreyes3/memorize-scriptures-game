import { describe, expect, it } from "vitest";
import { gradeRef, gradeText, markAloud, markLookedUpRef, markLookedUpText } from "./grading";
import { DAY_MS, INTERVALS, REF_INTERVALS, blankProgress } from "../game/types";

const NOW = 1_700_000_000_000;

describe("gradeText", () => {
  it("advances one rung on pass and sets the matching interval", () => {
    const p = { ...blankProgress(), stage: 2 as const };
    const result = gradeText(p, true, NOW);
    expect(result.stage).toBe(3);
    expect(result.due).toBe(NOW + INTERVALS[3] * DAY_MS);
  });

  it("ceilings at rung 5", () => {
    const p = { ...blankProgress(), stage: 5 as const };
    const result = gradeText(p, true, NOW);
    expect(result.stage).toBe(5);
    expect(result.due).toBe(NOW + INTERVALS[5] * DAY_MS);
  });

  it("drops one rung on fail and floors at rung 2", () => {
    const p = { ...blankProgress(), stage: 3 as const };
    expect(gradeText(p, false, NOW).stage).toBe(2);
    const floored = { ...blankProgress(), stage: 2 as const };
    expect(gradeText(floored, false, NOW).stage).toBe(2);
  });

  it("sets due to 0 on fail", () => {
    const p = { ...blankProgress(), stage: 3 as const };
    expect(gradeText(p, false, NOW).due).toBe(0);
  });

  it("increments seen on both pass and fail", () => {
    const p = blankProgress();
    expect(gradeText(p, true, NOW).seen).toBe(1);
    expect(gradeText(p, false, NOW).seen).toBe(1);
  });
});

describe("gradeRef", () => {
  it("advances one rung on pass with the matching interval", () => {
    const p = { ...blankProgress(), refStage: 1 as const };
    const result = gradeRef(p, true, NOW);
    expect(result.refStage).toBe(2);
    expect(result.refDue).toBe(NOW + REF_INTERVALS[2] * DAY_MS);
  });

  it("ceilings at rung 3", () => {
    const p = { ...blankProgress(), refStage: 3 as const };
    expect(gradeRef(p, true, NOW).refStage).toBe(3);
  });

  it("floors at rung 1 on fail", () => {
    const p = blankProgress();
    expect(gradeRef(p, false, NOW).refStage).toBe(1);
  });
});

describe("look-up marks", () => {
  it("resets due without changing stage", () => {
    const p = { ...blankProgress(), stage: 4 as const, due: NOW + 1000 };
    const result = markLookedUpText(p);
    expect(result.stage).toBe(4);
    expect(result.due).toBe(0);
  });

  it("resets refDue without changing refStage", () => {
    const p = { ...blankProgress(), refStage: 2 as const, refDue: NOW + 1000 };
    const result = markLookedUpRef(p);
    expect(result.refStage).toBe(2);
    expect(result.refDue).toBe(0);
  });
});

describe("markAloud", () => {
  it("sets lastAloud and changes nothing else", () => {
    const p = blankProgress();
    const result = markAloud(p, NOW);
    expect(result.lastAloud).toBe(NOW);
    expect(result.stage).toBe(p.stage);
    expect(result.refStage).toBe(p.refStage);
  });
});
