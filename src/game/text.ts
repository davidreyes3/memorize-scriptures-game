// Text handling (docs/build.md §4.2, §4.7). Unicode-aware throughout — the prototype's
// ASCII-only [A-Za-z] regexes destroyed ä/ö/ü/ß. See CLAUDE.md "Porting gotchas".

export function tokenize(text: string): string[] {
  return text.trim().split(/\s+/);
}

/** Strips everything but letters and apostrophes. Unicode-aware: ä ö ü ß survive. */
export function bare(word: string): string {
  return word.replace(/[^\p{L}']/gu, "");
}

export interface SkeletonPart {
  display: string;
  revealed: boolean;
}

/**
 * Words before `revealCount` render in full. The rest render as first letter plus any
 * trailing punctuation. A word with no letter (pure punctuation) renders "·".
 */
export function skeleton(tokens: string[], revealCount: number): SkeletonPart[] {
  return tokens.map((word, i) => {
    if (i < revealCount) return { display: word, revealed: true };
    const letter = word.match(/\p{L}/u);
    const trailing = word.match(/[.,;:!?]+$/);
    const display = (letter ? letter[0] : "·") + (trailing ? trailing[0] : "");
    return { display, revealed: false };
  });
}
