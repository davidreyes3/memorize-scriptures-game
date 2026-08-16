// Erosion strip (docs/build.md §5) — the path-card progress bar and study aid in one.
import { EROSION_MAX_CHARS, type TextRung, type Verse } from "./types";
import { tokenize } from "./text";

// Index 0 unused (stage is never 0); index = stage.
const EROSION_KEEP: readonly number[] = [1, 1, 0.7, 0.4, 0.15, 0];
const MIN_SHOWN_WORDS = 3;

export interface ErosionPart {
  display: string;
  full: boolean;
}

export interface ErosionStrip {
  parts: ErosionPart[];
  truncated: boolean;
}

/**
 * ⚠️ Deviation from the prototype: it showed a fixed first 11 words
 * (engrave.html:272), which overflows 520px on German compounds. This caps by
 * character budget instead, always showing at least three words however long they are.
 */
export function erosionStrip(verse: Verse, stage: TextRung): ErosionStrip {
  const tokens = tokenize(verse.text);
  const shown: string[] = [];
  let length = 0;

  for (const word of tokens) {
    const projected = length + (shown.length > 0 ? 1 : 0) + word.length;
    if (shown.length >= MIN_SHOWN_WORDS && projected > EROSION_MAX_CHARS) break;
    shown.push(word);
    length = projected;
  }

  const truncated = shown.length < tokens.length;
  const keep = EROSION_KEEP[stage];

  const parts: ErosionPart[] = shown.map((word, i) => {
    const full = shown.length === 0 ? false : i / shown.length < keep;
    if (full) return { display: word.replace(/[.,;:]$/, ""), full: true };
    const letter = word.match(/\p{L}/u);
    return { display: letter ? letter[0] : "·", full: false };
  });

  return { parts, truncated };
}
