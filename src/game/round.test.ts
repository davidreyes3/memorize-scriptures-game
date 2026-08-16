import { describe, expect, it } from "vitest";
import { buildRound, decoysFor } from "./round";
import { DECOYS, FRACTION, MAX_WINDOW, MIN_WINDOW } from "./types";
import { mulberry32 } from "./random";
import { tokenize } from "./text";
import { FIXTURE_VERSES, LONG_COMPOUND_VERSE, SHORT_VERSE, verseById } from "../test/fixtures";

describe("buildRound", () => {
  it("honors FRACTION at rung 3", () => {
    const verse = verseById("f1"); // 9 words — short enough that MAX_WINDOW never kicks in
    const round = buildRound(verse, 3, 0, FIXTURE_VERSES);
    const expected = Math.round(round.tokens.length * FRACTION[3]);
    expect(round.window.length).toBe(expected);
  });

  it("caps at MAX_WINDOW, including at rung 5 (the long-verse decision)", () => {
    const verse = verseById("f5"); // 31 words — well over MAX_WINDOW
    const r4 = buildRound(verse, 4, 0, FIXTURE_VERSES);
    const r5 = buildRound(verse, 5, 0, FIXTURE_VERSES);
    expect(r4.window.length).toBe(MAX_WINDOW);
    expect(r5.window.length).toBe(MAX_WINDOW);
  });

  it("produces contiguous, in-bounds indices", () => {
    const verse = verseById("f2");
    const round = buildRound(verse, 4, 0, FIXTURE_VERSES);
    for (let i = 1; i < round.window.length; i++) {
      expect(round.window[i]).toBe(round.window[i - 1] + 1);
    }
    expect(Math.min(...round.window)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...round.window)).toBeLessThan(round.tokens.length);
  });

  it("reproduces identically for the same (verseId, seen)", () => {
    const verse = verseById("f1");
    const a = buildRound(verse, 3, 5, FIXTURE_VERSES);
    const b = buildRound(verse, 3, 5, FIXTURE_VERSES);
    expect(a.window).toEqual(b.window);
    expect(a.bank).toEqual(b.bank);
  });

  it("moves the window across successive seen values", () => {
    const verse = verseById("f5"); // plenty of room to move within
    const starts = new Set<number>();
    for (let seen = 0; seen < 10; seen++) {
      starts.add(buildRound(verse, 3, seen, FIXTURE_VERSES).window[0]);
    }
    expect(starts.size).toBeGreaterThan(1);
  });

  it("does not crash on a verse shorter than MIN_WINDOW, and covers it fully", () => {
    const round = buildRound(SHORT_VERSE, 3, 0, FIXTURE_VERSES);
    expect(round.window.length).toBe(tokenize(SHORT_VERSE.text).length);
    expect(round.window).toEqual([0, 1]);
  });

  it("floors the window at MIN_WINDOW for a short-enough verse", () => {
    const verse = verseById("f4"); // "Ein kurzer Satz genügt." — 4 words
    const round = buildRound(verse, 2, 0, FIXTURE_VERSES); // FRACTION[2] = .3 -> round(4*.3)=1
    expect(round.window.length).toBeGreaterThanOrEqual(MIN_WINDOW);
  });
});

describe("decoysFor", () => {
  it("never includes a word present in the target verse", () => {
    const verse = verseById("f1");
    const targetWords = new Set(tokenize(verse.text).map((w) => w.toLowerCase().replace(/[^\p{L}']/gu, "")));
    const decoys = decoysFor(verse, FIXTURE_VERSES, 3, mulberry32(1));
    for (const d of decoys) {
      expect(targetWords.has(d.toLowerCase())).toBe(false);
    }
  });

  it("only returns words longer than 3 characters", () => {
    const verse = verseById("f1");
    const decoys = decoysFor(verse, FIXTURE_VERSES, 3, mulberry32(2));
    for (const d of decoys) expect(d.length).toBeGreaterThan(3);
  });

  it("returns exactly n when the pool is large enough", () => {
    const verse = verseById("f1");
    const decoys = decoysFor(verse, FIXTURE_VERSES, DECOYS[4], mulberry32(3));
    expect(decoys.length).toBe(DECOYS[4]);
  });

  it("returns fewer than n without throwing when the path has one verse", () => {
    const solo = verseById("solo"); // path "gamma", the only verse in it
    expect(() => decoysFor(solo, FIXTURE_VERSES, 3, mulberry32(4))).not.toThrow();
    expect(decoysFor(solo, FIXTURE_VERSES, 3, mulberry32(4))).toEqual([]);
  });

  it("returns an empty array for n = 0", () => {
    const verse = verseById("f1");
    expect(decoysFor(verse, FIXTURE_VERSES, 0, mulberry32(5))).toEqual([]);
  });
});

describe("long compound verse (erosion-adjacent sanity check)", () => {
  it("still builds a round without throwing", () => {
    expect(() => buildRound(LONG_COMPOUND_VERSE, 3, 0, FIXTURE_VERSES)).not.toThrow();
  });
});
