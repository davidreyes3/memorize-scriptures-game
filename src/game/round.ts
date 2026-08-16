// Round construction (docs/build.md §4.3, §4.4, §4.6).
import { DECOYS, FRACTION, MAX_WINDOW, MIN_WINDOW, type TextRung, type Verse } from "./types";
import { hashSeed, mulberry32, shuffle } from "./random";
import { bare, tokenize } from "./text";

export interface Round {
  tokens: string[]; // the whole verse
  window: number[]; // contiguous indices being hidden
  bank: string[]; // shuffled: window words + decoys
  placed: number[]; // indices into bank, in the order tapped
}

/**
 * ⚠️ Deviation from the prototype (docs/build.md §4.3): the prototype computed
 * `start = (seen*5 + random(room)) % (room+1)`, mixing a counter with live Math.random(),
 * so identical inputs gave different windows and it couldn't be asserted on. This version
 * seeds a PRNG from (verse.id, seen) — deterministic and reproducible, still well
 * distributed. A pure fixed stride (seen*5) was rejected: it degenerates into a short cycle
 * when `room+1` shares a small factor with 5.
 *
 * ⚠️ Also per the long-verse decision (docs/build.md §4.6, resolves spec.md §10.1),
 * MAX_WINDOW now applies at rung 5 (Kalt) too, not just rung 4.
 */
export function buildRound(verse: Verse, stage: TextRung, seen: number, allVerses: readonly Verse[]): Round {
  const tokens = tokenize(verse.text);
  const len = tokens.length;
  const n = Math.min(len, MAX_WINDOW, Math.max(MIN_WINDOW, Math.round(len * FRACTION[stage])));
  const room = len - n;

  const windowRng = mulberry32(hashSeed(verse.id, seen, "window"));
  const start = room <= 0 ? 0 : Math.floor(windowRng() * (room + 1));
  const window = Array.from({ length: n }, (_, i) => start + i);

  const decoyRng = mulberry32(hashSeed(verse.id, seen, "decoys"));
  const decoys = decoysFor(verse, allVerses, DECOYS[stage], decoyRng);

  const bankRng = mulberry32(hashSeed(verse.id, seen, "bank"));
  const bank = shuffle([...window.map((i) => tokens[i]), ...decoys], bankRng);

  return { tokens, window, bank, placed: [] };
}

/**
 * Pool = every other verse in the same path -> tokenize -> bare -> length > 3 -> not
 * present in the target verse (case-insensitive) -> de-duplicate -> shuffle -> take n.
 *
 * Note: this adds an explicit `allVerses` parameter beyond docs/build.md's literal
 * signature, since "the other verses in the same path" requires the full verse set and
 * game/ functions may not reach into a global — see CLAUDE.md's purity rule.
 */
export function decoysFor(verse: Verse, allVerses: readonly Verse[], n: number, rng: () => number): string[] {
  if (n <= 0) return [];

  const targetWords = new Set(tokenize(verse.text).map((w) => bare(w).toLowerCase()));
  const pool = allVerses
    .filter((v) => v.path === verse.path && v.id !== verse.id)
    .flatMap((v) => tokenize(v.text).map(bare))
    .filter((w) => w.length > 3 && !targetWords.has(w.toLowerCase()));

  const unique = Array.from(new Set(pool));
  return shuffle(unique, rng).slice(0, n);
}
