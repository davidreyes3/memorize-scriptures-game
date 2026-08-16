import { describe, expect, it } from "vitest";
import { erosionStrip } from "./erosion";
import { EROSION_MAX_CHARS } from "./types";
import { LONG_COMPOUND_VERSE, verseById } from "../test/fixtures";

describe("erosionStrip", () => {
  it("shows a short verse in full, untruncated", () => {
    const verse = verseById("f4"); // "Ein kurzer Satz genügt." — well under 60 chars
    const result = erosionStrip(verse, 1);
    expect(result.truncated).toBe(false);
    expect(result.parts.length).toBe(4);
  });

  it("stops before exceeding EROSION_MAX_CHARS on a long verse", () => {
    const verse = verseById("f5"); // 31 words, well over 60 chars
    const result = erosionStrip(verse, 1);
    expect(result.truncated).toBe(true);
    expect(result.parts.length).toBeLessThan(31);
  });

  it("always shows at least three words, even long German compounds", () => {
    // LONG_COMPOUND_VERSE's first three words alone exceed EROSION_MAX_CHARS.
    const result = erosionStrip(LONG_COMPOUND_VERSE, 1);
    expect(result.parts.length).toBeGreaterThanOrEqual(3);
  });

  it("word length that triggered the check exceeds EROSION_MAX_CHARS for the compound fixture", () => {
    const firstThreeLength = "Schöpfungsordnungsverständnis Glaubensbekenntnisformulierung Wortverkündigungsdienstleistung"
      .length;
    expect(firstThreeLength).toBeGreaterThan(EROSION_MAX_CHARS);
  });

  it("shows every word in full at rung 1 (keep = 1)", () => {
    const verse = verseById("f2");
    const result = erosionStrip(verse, 1);
    expect(result.parts.every((p) => p.full)).toBe(true);
  });

  it("shows no word in full at rung 5 (keep = 0)", () => {
    const verse = verseById("f2");
    const result = erosionStrip(verse, 5);
    expect(result.parts.every((p) => !p.full)).toBe(true);
  });

  it("shows a partial mix at an intermediate rung", () => {
    const verse = verseById("f3"); // several words, plenty of room
    const result = erosionStrip(verse, 3); // keep = .4
    const fullCount = result.parts.filter((p) => p.full).length;
    expect(fullCount).toBeGreaterThan(0);
    expect(fullCount).toBeLessThan(result.parts.length);
  });
});
