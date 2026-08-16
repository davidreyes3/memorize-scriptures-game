// Synthetic fixture data for tests. Never real scripture — see CLAUDE.md: verse text is
// transcribed data, supplied by the user, never invented, not even for a placeholder.
import type { Verse } from "../game/types";

const RAW_FIXTURES: Array<Omit<Verse, "ref">> = [
  { id: "f1", path: "alpha", text: "Der Anfang aller Weisheit beginnt mit Ehrfurcht und Geduld." },
  { id: "f2", path: "alpha", text: "Wahre Freundschaft trägt Lasten und teilt Freuden gemeinsam." },
  { id: "f3", path: "alpha", text: "Ohne Vertrauen kann keine Gemeinschaft wirklich bestehen bleiben." },
  { id: "f4", path: "beta", text: "Ein kurzer Satz genügt." },
  {
    id: "f5",
    path: "beta",
    // 31 words — mirrors 1. Korinther 15,52's length, to test the long-verse cap.
    text:
      "und dasselbe plötzlich in einem Augenblick zur Zeit der letzten Posaune " +
      "denn es wird die Posaune schallen und die Toten werden auferstehen unverweslich " +
      "und wir werden alle miteinander gänzlich verwandelt werden",
  },
  { id: "solo", path: "gamma", text: "Ganz allein steht dieser einzelne Vers hier still." },
];

export const FIXTURE_VERSES: Verse[] = RAW_FIXTURES.map((v, i) => ({ ...v, ref: `Fixture ${i + 1},1` }));

// A two-word verse — shorter than MIN_WINDOW (3).
export const SHORT_VERSE: Verse = { id: "short", path: "alpha", ref: "Fixture Kurz", text: "Gott ist." };

// Words each long enough that three of them alone exceed EROSION_MAX_CHARS (60 chars).
export const LONG_COMPOUND_VERSE: Verse = {
  id: "compound",
  path: "alpha",
  ref: "Fixture Lang",
  text: "Schöpfungsordnungsverständnis Glaubensbekenntnisformulierung Wortverkündigungsdienstleistung kurz.",
};

export function verseById(id: string): Verse {
  const v = [...FIXTURE_VERSES, SHORT_VERSE, LONG_COMPOUND_VERSE].find((x) => x.id === id);
  if (!v) throw new Error(`no fixture verse "${id}"`);
  return v;
}
