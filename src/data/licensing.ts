// Copyright screening for scripture text (CLAUDE.md: "Public domain translations only").
//
// This exists because Luther 1984 has already been supplied by accident twice, and because
// committing copyrighted text is worse than merely writing it to disk — git history is
// permanent and the GitHub remote makes it publishable. The screen runs in the test suite,
// so it fires automatically instead of relying on someone remembering to grep.
//
// Two independent detection layers, because either alone is defeatable:
//   1. Provenance tags — what a Logos/BibleGateway export says about itself.
//   2. The text itself — orthography and known wordings, which survive a stripped export.

export interface LicenseFinding {
  rule: string;
  detail: string;
}

/**
 * Resource identifiers for copyrighted editions, as they appear in export markup.
 * Deliberately loose: `lu84`, `lut84`, `lutbib1984`, `Luther 1984`, `luther-84`, `LUT2017`
 * and similar must all match, since different exporters spell it differently.
 */
const FORBIDDEN_PROVENANCE: Array<[string, RegExp]> = [
  // Any lu/lut/luth/luther token sitting near 84 or 1984, in either order.
  ["luther-1984 tag", /\blu(?:t|th|ther)?(?:bib)?[\s._:;/-]*(?:19)?84\b/i],
  ["luther-1984 tag", /\bluther\b[^A-Za-z0-9]{0,12}(?:19)?84\b/i],
  ["luther-1984 tag", /\b(?:19)?84[^A-Za-z0-9]{0,12}luther\b/i],
  // Luther 2017 is equally copyrighted (Deutsche Bibelgesellschaft).
  ["luther-2017 tag", /\blu(?:t|th|ther)?(?:bib)?[\s._:;/-]*(?:20)?17\b/i],
  ["luther-2017 tag", /\bluther\b[^A-Za-z0-9]{0,12}(?:20)?17\b/i],
  // Other copyrighted German editions.
  ["schlachter-2000", /\bschlachter\b[^A-Za-z0-9]{0,12}(?:2000|2k)\b/i],
  ["elberfelder revised", /\belberfelder\b[^A-Za-z0-9]{0,20}(?:1985|2006|rev)/i],
  ["neue-genfer", /\b(?:neue\s+genfer|ngü|ngue)\b/i],
  ["hoffnung-fuer-alle", /\b(?:hoffnung\s+für\s+alle|hfa)\b/i],
  ["gute-nachricht", /\b(?:gute\s+nachricht|gnb)\b/i],
  ["einheitsuebersetzung", /\beinheitsübersetzung\b/i],
  ["neues-leben", /\bneues\s+leben\b/i],
  ["basisbibel", /\bbasisbibel\b/i],
  ["zuercher-2007", /\bzürcher\b[^A-Za-z0-9]{0,12}(?:2007|2008)\b/i],
  // Copyrighted English editions.
  ["copyrighted english", /\b(?:niv|esv|nlt|nasb|nkjv|csb|hcsb|amp|the\s+message)\b/i],
];

/**
 * Post-1996 spelling reform markers. Luther 1912 predates the reform and writes ß where
 * modern revisions write ss, so these are strong evidence the text is NOT 1912 — and unlike
 * a resource tag, they survive copy-pasting the bare text out of an export.
 */
const REFORMED_ORTHOGRAPHY: Array<[string, RegExp]> = [
  ["reformed spelling 'dass'", /\bdass\b/i],
  ["reformed spelling 'muss'", /\bmuss\b/i],
  ["reformed spelling 'musst'", /\bmusst\b/i],
  ["reformed spelling 'gewiss'", /\bgewiss\b/i],
  ["reformed spelling 'wisst'", /\bwisst\b/i],
  ["reformed spelling 'bewusst'", /\bbewusst\b/i],
  ["reformed spelling 'wusste'", /\bwusste\b/i],
  ["reformed spelling 'Schluss'", /\bschluss\b/i],
  ["reformed spelling 'Fluss'", /\bfluss\b/i],
  ["reformed spelling 'Kuss'", /\bkuss\b/i],
  ["reformed spelling 'Riss'", /\briss\b/i],
];

/**
 * Wordings unique to Luther 1984/2017 where 1912 reads differently. Every one of these was
 * observed in an actual rejected export — see docs/build.md §8.
 */
const MODERN_REVISION_WORDINGS: Array<[string, RegExp]> = [
  // Hebräer 4,9 — 1912: "Darum ist noch eine Ruhe vorhanden dem Volke Gottes."
  ["Luther 1984 wording (Heb 4,9)", /für\s+das\s+Volk\s+Gottes/i],
  // Römer 6,23 — 1912: "in Christo Jesu".
  ["Luther 1984 wording (Röm 6,23)", /\bin\s+Christus\s+Jesus\b/i],
  // 2. Timotheus 3,16 — 1912: "zur Strafe, zur Besserung, zur Züchtigung".
  ["Luther 1984 wording (2Tim 3,16)", /zur\s+Zurechtweisung/i],
  ["Luther 1984 wording (2Tim 3,16)", /zur\s+Erziehung\s+in\s+der\s+Gerechtigkeit/i],
];

/**
 * Screens a chunk of text. Pass raw export markup to use every layer, or bare verse text —
 * the orthography and wording layers work on that alone.
 *
 * Returns every reason the text looks copyrighted. Empty array means it passed.
 */
export function screenForCopyrightedText(text: string): LicenseFinding[] {
  const findings: LicenseFinding[] = [];
  const seen = new Set<string>();

  const run = (rules: Array<[string, RegExp]>) => {
    for (const [rule, pattern] of rules) {
      const match = text.match(pattern);
      if (!match) continue;
      const key = `${rule}::${match[0].toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({ rule, detail: match[0] });
    }
  };

  run(FORBIDDEN_PROVENANCE);
  run(REFORMED_ORTHOGRAPHY);
  run(MODERN_REVISION_WORDINGS);
  return findings;
}

/**
 * Positive confirmation rather than absence of failure: genuine Luther 1912 should show
 * pre-reform ß spellings. Absence isn't proof of a problem (a short verse may contain none),
 * so this informs review rather than failing a build on its own.
 */
export function hasPreReformOrthography(text: string): boolean {
  // No \b or \w here: JavaScript defines both as ASCII-only, so "ß" is not a word character
  // and \bdaß\b can never match. Plain substring alternation is correct for these.
  return /(?:daß|muß|gewiß|wißt|bewußt|wußte|schluß|fluß)/i.test(text);
}
