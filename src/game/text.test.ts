import { describe, expect, it } from "vitest";
import { bare, skeleton, tokenize, windowedSkeleton } from "./text";

describe("tokenize", () => {
  it("splits on whitespace and trims", () => {
    expect(tokenize("  Am Anfang schuf Gott  ")).toEqual(["Am", "Anfang", "schuf", "Gott"]);
  });

  it("collapses multiple spaces", () => {
    expect(tokenize("Ein   Wort    hier")).toEqual(["Ein", "Wort", "hier"]);
  });
});

describe("bare", () => {
  it("strips punctuation but keeps letters and apostrophes", () => {
    expect(bare("Gottes,")).toBe("Gottes");
    expect(bare("„Wort\"")).toBe("Wort");
    expect(bare("d'accord")).toBe("d'accord");
  });

  it("preserves ä ö ü ß", () => {
    expect(bare("Väter")).toBe("Väter");
    expect(bare("König")).toBe("König");
    expect(bare("müssen")).toBe("müssen");
    expect(bare("groß")).toBe("groß");
    expect(bare("Ägypten,")).toBe("Ägypten");
  });
});

describe("skeleton", () => {
  const tokens = ["Am", "Anfang", "schuf", "Gott,"];

  it("reveals words before revealCount in full", () => {
    const result = skeleton(tokens, 2);
    expect(result[0]).toEqual({ display: "Am", revealed: true });
    expect(result[1]).toEqual({ display: "Anfang", revealed: true });
  });

  it("shows first letter plus trailing punctuation for hidden words", () => {
    const result = skeleton(tokens, 2);
    expect(result[2]).toEqual({ display: "s", revealed: false });
    expect(result[3]).toEqual({ display: "G,", revealed: false });
  });

  it("renders a word with no letters as a dot", () => {
    const result = skeleton(["—"], 0);
    expect(result[0].display).toBe("·");
  });

  it("shows the umlaut-initial letter, not a dot", () => {
    const result = skeleton(["Ägypten"], 0);
    expect(result[0].display).toBe("Ä");
  });
});

describe("windowedSkeleton", () => {
  const tokens = ["Am", "Anfang", "schuf", "Gott,", "Himmel"];

  it("reveals words outside the window in full, regardless of position", () => {
    const result = windowedSkeleton(tokens, [1, 2]);
    expect(result[0]).toEqual({ display: "Am", revealed: true });
    expect(result[3]).toEqual({ display: "Gott,", revealed: true });
    expect(result[4]).toEqual({ display: "Himmel", revealed: true });
  });

  it("skeletonizes words inside the window, keeping trailing punctuation", () => {
    const result = windowedSkeleton(tokens, [1, 2]);
    expect(result[1]).toEqual({ display: "A", revealed: false });
    expect(result[2]).toEqual({ display: "s", revealed: false });
  });

  it("handles a window that isn't a prefix (unlike skeleton's revealCount)", () => {
    const result = windowedSkeleton(tokens, [0]);
    expect(result[0].revealed).toBe(false);
    expect(result[1].revealed).toBe(true);
  });
});
