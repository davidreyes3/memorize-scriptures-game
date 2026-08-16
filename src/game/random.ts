// Seeded randomness (docs/build.md §4.1). Round construction must be reproducible from
// (verseId, seen), which is what makes it testable — see the deviation note in round.ts.

/** FNV-1a over the joined parts. Same inputs always produce the same seed. */
export function hashSeed(...parts: Array<string | number>): number {
  const str = parts.join("|");
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 — small, fast, deterministic PRNG. Returns a generator producing [0, 1). */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return function next(): number {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates, non-mutating. */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
