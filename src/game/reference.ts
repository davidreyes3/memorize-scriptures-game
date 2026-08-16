// German reference parsing (docs/build.md §4.8).
//
// ⚠️ Deviation from the prototype: it expected "Book 1:1" with a colon. German convention
// is "1. Mose 1,1" — a comma separator, and book names may carry an ordinal prefix.
//
// Ranges: a memorization item can span multiple physical verses, e.g. "1. Mose 2,2–3"
// (en dash, U+2013 — German typographic convention, not a hyphen). `verseEnd` is undefined
// for a single-verse reference. The address-Bilden exercise (build the reference from
// tiles) only ever targets `verse` — the range end is a display-only detail, never
// something the user has to reconstruct.

export interface RefParts {
  book: string;
  chapter: number;
  verse: number;
  verseEnd?: number;
}

const REF_PATTERN = /^(.+?)\s+(\d+),(\d+)(?:–(\d+))?$/;

export function parseRef(ref: string): RefParts {
  const match = ref.match(REF_PATTERN);
  if (!match) throw new Error(`Ungültige Referenz: "${ref}"`);
  const parts: RefParts = { book: match[1], chapter: Number(match[2]), verse: Number(match[3]) };
  if (match[4] !== undefined) parts.verseEnd = Number(match[4]);
  return parts;
}

export function formatRef(parts: RefParts): string {
  const range = parts.verseEnd !== undefined ? `–${parts.verseEnd}` : "";
  return `${parts.book} ${parts.chapter},${parts.verse}${range}`;
}

/** Near-miss numbers around the true value, for the address-build word bank (§4.8). */
export function nearNumbers(n: number, count = 6): number[] {
  const candidates = [n, n + 1, Math.max(1, n - 1), n + 3, Math.max(1, n - 2), n + 7];
  return Array.from(new Set(candidates)).slice(0, count);
}
