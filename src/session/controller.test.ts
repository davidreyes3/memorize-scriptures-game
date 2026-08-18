import { describe, expect, it } from "vitest";
import { createInitialState, reduce, type SessionState } from "./controller";
import { createSaveData, SESSION_MS, type SaveData } from "../game/types";
import { hashSeed, mulberry32 } from "../game/random";
import { FIXTURE_VERSES } from "../test/fixtures";

const NOW = 1_000_000_000_000;
const rng = (seed: string) => mulberry32(hashSeed(seed));

function initState(overrides: (save: SaveData) => SaveData = (s) => s): SessionState {
  const save = overrides(createSaveData(FIXTURE_VERSES));
  return createInitialState(save, FIXTURE_VERSES);
}

// alpha = f1, f2, f3; beta = f4, f5; gamma = solo

describe("SELECT_PATH / BACK_TO_PATHS", () => {
  it("moves to pfad on select, back to pfade (clearing pathId) on back", () => {
    let state = initState();
    state = reduce(state, { type: "SELECT_PATH", pathId: "alpha" });
    expect(state.screen).toBe("pfad");
    expect(state.pathId).toBe("alpha");

    state = reduce(state, { type: "BACK_TO_PATHS" });
    expect(state.screen).toBe("pfade");
    expect(state.pathId).toBeNull();
  });
});

describe("START_SESSION", () => {
  it("does nothing without a selected path", () => {
    const state = initState();
    const result = reduce(state, { type: "START_SESSION", now: NOW, rng: rng("a") });
    expect(result).toBe(state);
  });

  it("introduces verses and starts a session when items are due", () => {
    let state = initState();
    state = reduce(state, { type: "SELECT_PATH", pathId: "alpha" });
    state = reduce(state, { type: "START_SESSION", now: NOW, rng: rng("a") });

    expect(state.screen).toBe("sitzung");
    expect(state.startedAt).toBe(NOW);
    expect(state.current).not.toBeNull();
    expect(["f1", "f2", "f3"]).toContain(state.current!.id);
    // Verses unlock one at a time per path (srs/introduction.ts) — f2/f3 need their
    // predecessor held first, so only f1 is introducible here regardless of newPerDay.
    const introducedCount = ["f1", "f2", "f3"].filter((id) => state.save.progress[id].introducedAt !== null).length;
    expect(introducedCount).toBe(1);
    expect(state.save.progress.f1.introducedAt).toBe(NOW);
  });

  it("stays put and only persists introductions when nothing ends up due", () => {
    let state = initState((save) => {
      for (const id of ["f1", "f2", "f3"]) {
        save.progress[id] = { ...save.progress[id], introducedAt: NOW, due: NOW + 999_999 };
      }
      save.settings.newPerDay = 0;
      return save;
    });
    state = reduce(state, { type: "SELECT_PATH", pathId: "alpha" });
    const result = reduce(state, { type: "START_SESSION", now: NOW, rng: rng("a") });

    expect(result.screen).toBe("pfad");
    expect(result.current).toBeNull();
  });
});

function startedAlphaSession(rngSeed = "seed"): SessionState {
  let state = initState((save) => {
    for (const id of ["f1", "f2", "f3"]) {
      save.progress[id] = { ...save.progress[id], introducedAt: NOW - 1000, due: 0 };
    }
    return save;
  });
  state = reduce(state, { type: "SELECT_PATH", pathId: "alpha" });
  state = reduce(state, { type: "START_SESSION", now: NOW, rng: rng(rngSeed) });
  return state;
}

describe("ANSWER on a text item", () => {
  it("advances the rung, sets due, and moves to the next item on success", () => {
    const state = startedAlphaSession();
    const id = state.current!.id;
    const before = state.save.progress[id];

    const result = reduce(state, { type: "ANSWER", ok: true, now: NOW + 1000, rng: rng("x") });

    expect(result.save.progress[id].stage).toBe(before.stage + 1);
    expect(result.save.progress[id].due).toBeGreaterThan(NOW);
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0]).toMatchObject({ id, ok: true, stageBefore: before.stage, stageAfter: before.stage + 1 });
    // f1/f2/f3 all start at stage 1 — text due, but stage < 2 means no ref item rides along,
    // so the queue is just the two remaining text items; current should now be one of them.
    expect(result.current).not.toBeNull();
    expect(result.current!.id).not.toBe(id);
  });

  it("floors the rung at 2, sets due to 0, and requeues the item on a miss", () => {
    const state = startedAlphaSession();
    const id = state.current!.id;

    const result = reduce(state, { type: "ANSWER", ok: false, now: NOW + 1000, rng: rng("x") });

    expect(result.save.progress[id].stage).toBe(2); // floors at 2, never back to 1
    expect(result.save.progress[id].due).toBe(0);
    // requeued: the failed item is back in the queue (possibly not immediately next, but present)
    const stillQueued = result.queue.some((q) => q.id === id) || result.current?.id === id;
    expect(stillQueued).toBe(true);
  });

  it("is a no-op when the current item is aloud", () => {
    let state = startedAlphaSession();
    state = { ...state, current: { kind: "aloud", id: "f1", addressForm: null } };
    const result = reduce(state, { type: "ANSWER", ok: true, now: NOW, rng: rng("x") });
    expect(result).toBe(state);
  });
});

describe("LOOKUP", () => {
  it("prevents advancement (stage unchanged), sets due to 0, and requeues", () => {
    const state = startedAlphaSession();
    const id = state.current!.id;
    const before = state.save.progress[id];

    const result = reduce(state, { type: "LOOKUP", now: NOW + 1000, rng: rng("x") });

    expect(result.save.progress[id].stage).toBe(before.stage);
    expect(result.save.progress[id].due).toBe(0);
    expect(result.attempts[0]).toMatchObject({ id, ok: false });
    const stillQueued = result.queue.some((q) => q.id === id) || result.current?.id === id;
    expect(stillQueued).toBe(true);
  });

  it("is a no-op on a ref or aloud item", () => {
    let state = startedAlphaSession();
    state = { ...state, current: { kind: "aloud", id: "f1", addressForm: null } };
    const result = reduce(state, { type: "LOOKUP", now: NOW, rng: rng("x") });
    expect(result).toBe(state);
  });
});

describe("ANSWER on a ref item", () => {
  function withRefCurrent(state: SessionState): SessionState {
    return { ...state, current: { kind: "ref", id: state.current!.id, addressForm: "Erkennen" } };
  }

  it("never touches progress, right or wrong", () => {
    const state = withRefCurrent(startedAlphaSession());
    const id = state.current!.id;
    const before = state.save.progress[id];

    const ok = reduce(state, { type: "ANSWER", ok: true, now: NOW + 1000, rng: rng("x") });
    expect(ok.save.progress[id]).toEqual(before);

    const miss = reduce(state, { type: "ANSWER", ok: false, now: NOW + 1000, rng: rng("x") });
    expect(miss.save.progress[id]).toEqual(before);
  });

  it("requeues on a miss, not on a pass", () => {
    const state = withRefCurrent(startedAlphaSession());
    const id = state.current!.id;

    const ok = reduce(state, { type: "ANSWER", ok: true, now: NOW + 1000, rng: rng("x") });
    expect(ok.queue.some((q) => q.id === id && q.kind === "ref")).toBe(false);

    const miss = reduce(state, { type: "ANSWER", ok: false, now: NOW + 1000, rng: rng("x") });
    const stillQueued = miss.queue.some((q) => q.id === id && q.kind === "ref") || miss.current?.id === id;
    expect(stillQueued).toBe(true);
  });
});

describe("ALOUD_DONE", () => {
  it("marks lastAloud, is never graded, and is not requeued", () => {
    let state = startedAlphaSession();
    const id = state.current!.id;
    state = { ...state, current: { kind: "aloud", id, addressForm: null } };

    const result = reduce(state, { type: "ALOUD_DONE", now: NOW + 1000, rng: rng("x") });

    expect(result.save.progress[id].lastAloud).toBe(NOW + 1000);
    expect(result.attempts).toHaveLength(0); // aloud never counts as "answered"
    expect(result.queue.some((q) => q.kind === "aloud" && q.id === id)).toBe(false);
  });
});

describe("overrun handling (docs/build.md §4.11)", () => {
  it("serves exactly one more item once time is up, then ends regardless of what's left", () => {
    // Three items queued; grade the first with `now` already past the session cap.
    const state = startedAlphaSession();
    const overrunNow = NOW + SESSION_MS + 1;

    const afterFirst = reduce(state, { type: "ANSWER", ok: true, now: overrunNow, rng: rng("x") });
    expect(afterFirst.screen).toBe("sitzung"); // the "one more" item
    expect(afterFirst.overrunExtraServed).toBe(true);

    const afterSecond = reduce(afterFirst, { type: "ANSWER", ok: true, now: overrunNow + 10, rng: rng("y") });
    expect(afterSecond.screen).toBe("zusammenfassung");
    expect(afterSecond.current).toBeNull();
  });

  it("ends immediately if overrun is detected with nothing left to serve", () => {
    let state = initState((save) => {
      save.progress.solo = { ...save.progress.solo, introducedAt: NOW - 1000, due: 0 };
      return save;
    });
    state = reduce(state, { type: "SELECT_PATH", pathId: "gamma" }); // gamma has exactly one verse
    state = reduce(state, { type: "START_SESSION", now: NOW, rng: rng("a") });
    expect(state.queue).toHaveLength(0); // only item is `current`

    const result = reduce(state, { type: "ANSWER", ok: true, now: NOW + SESSION_MS + 1, rng: rng("x") });
    expect(result.screen).toBe("zusammenfassung");
  });
});

describe("summary", () => {
  it("computes answered / firstTimeCorrect / rungsClimbed / held from the session's attempts", () => {
    let state = initState((save) => {
      save.progress.solo = { ...save.progress.solo, introducedAt: NOW - 1000, due: 0, stage: 4 };
      return save;
    });
    state = reduce(state, { type: "SELECT_PATH", pathId: "gamma" });
    state = reduce(state, { type: "START_SESSION", now: NOW, rng: rng("a") });

    // At stage 4, ref (stage >= 2) and aloud (stage >= 3) are also eligible alongside
    // text, so the queue isn't just the one item. Force a known text item as current
    // and drain the rest, isolating the one grade this test actually cares about.
    state = { ...state, current: { kind: "text", id: "solo", addressForm: null }, queue: [] };

    // stage 4 -> pass -> stage 5 (held), one rung climbed, first-time correct.
    const result = reduce(state, { type: "ANSWER", ok: true, now: NOW + 1000, rng: rng("x") });

    expect(result.screen).toBe("zusammenfassung");
    expect(result.summary).toEqual({ answered: 1, firstTimeCorrect: 1, rungsClimbed: 1, held: 1, timeMs: 1000 });
  });
});

describe("END_SESSION", () => {
  it("jumps to the summary screen, discarding the in-progress item", () => {
    const state = startedAlphaSession();
    const result = reduce(state, { type: "END_SESSION", now: NOW + 1000 });

    expect(result.screen).toBe("zusammenfassung");
    expect(result.current).toBeNull();
    expect(result.summary).toEqual({ answered: 0, firstTimeCorrect: 0, rungsClimbed: 0, held: 0, timeMs: 1000 });
  });
});
