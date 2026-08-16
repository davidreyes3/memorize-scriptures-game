import { describe, expect, it } from "vitest";
import { formatRef, nearNumbers, parseRef } from "./reference";

describe("parseRef", () => {
  it("parses German references with an ordinal-prefixed book", () => {
    expect(parseRef("1. Mose 1,1")).toEqual({ book: "1. Mose", chapter: 1, verse: 1 });
  });

  it("parses a plain book name", () => {
    expect(parseRef("Johannes 3,16")).toEqual({ book: "Johannes", chapter: 3, verse: 16 });
  });

  it("parses multi-digit chapter and verse", () => {
    expect(parseRef("1. Korinther 15,52")).toEqual({ book: "1. Korinther", chapter: 15, verse: 52 });
  });

  it("rejects the English colon form", () => {
    expect(() => parseRef("Genesis 1:1")).toThrow();
  });

  it("rejects a missing verse number", () => {
    expect(() => parseRef("Johannes 3")).toThrow();
  });

  it("rejects an empty string", () => {
    expect(() => parseRef("")).toThrow();
  });

  it("parses a verse range with an en dash", () => {
    expect(parseRef("1. Mose 2,2–3")).toEqual({ book: "1. Mose", chapter: 2, verse: 2, verseEnd: 3 });
  });

  it("parses a multi-digit verse range", () => {
    expect(parseRef("2. Mose 20,8–11")).toEqual({ book: "2. Mose", chapter: 20, verse: 8, verseEnd: 11 });
  });

  it("leaves verseEnd undefined for a single verse", () => {
    expect(parseRef("Hebräer 4,9").verseEnd).toBeUndefined();
  });

  it("rejects a hyphen in place of the en dash", () => {
    expect(() => parseRef("1. Mose 2,2-3")).toThrow();
  });
});

describe("formatRef", () => {
  it("round-trips through parseRef", () => {
    for (const ref of [
      "1. Mose 1,1",
      "Johannes 3,16",
      "1. Korinther 15,52",
      "Hebräer 4,9",
      "1. Mose 2,2–3",
      "2. Mose 20,8–11",
    ]) {
      expect(formatRef(parseRef(ref))).toBe(ref);
    }
  });
});

describe("nearNumbers", () => {
  it("includes the true number and stays unique", () => {
    const result = nearNumbers(10);
    expect(result).toContain(10);
    expect(new Set(result).size).toBe(result.length);
  });

  it("floors near-misses at 1 rather than going negative or zero", () => {
    const result = nearNumbers(1);
    expect(Math.min(...result)).toBeGreaterThanOrEqual(1);
  });
});
