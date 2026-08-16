import { describe, expect, it } from "vitest";
import { hashSeed, mulberry32, shuffle } from "./random";

describe("hashSeed", () => {
  it("is reproducible for identical inputs", () => {
    expect(hashSeed("gen1_1", 3, "window")).toBe(hashSeed("gen1_1", 3, "window"));
  });

  it("differs when any part differs", () => {
    const base = hashSeed("gen1_1", 3, "window");
    expect(hashSeed("gen1_1", 4, "window")).not.toBe(base);
    expect(hashSeed("gen1_2", 3, "window")).not.toBe(base);
    expect(hashSeed("gen1_1", 3, "decoys")).not.toBe(base);
  });
});

describe("mulberry32", () => {
  it("produces a deterministic sequence for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("stays within [0, 1)", () => {
    const rng = mulberry32(hashSeed("x", 1));
    for (let i = 0; i < 50; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("shuffle", () => {
  it("does not mutate the input array", () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffle(input, mulberry32(1));
    expect(input).toEqual(copy);
  });

  it("preserves the same elements", () => {
    const input = ["a", "b", "c", "d"];
    const result = shuffle(input, mulberry32(7));
    expect([...result].sort()).toEqual([...input].sort());
  });

  it("is deterministic for the same seed", () => {
    const input = [1, 2, 3, 4, 5, 6];
    expect(shuffle(input, mulberry32(99))).toEqual(shuffle(input, mulberry32(99)));
  });
});
