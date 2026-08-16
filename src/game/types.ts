// Shared data types. Per CLAUDE.md, nothing in game/ or srs/ imports React
// or touches browser globals — see docs/build.md §5.

export type VerseId = string;
export type PathId = string;
export type TextRung = 1 | 2 | 3 | 4 | 5;

export interface Verse {
  id: VerseId;
  path: PathId;
  ref: string; // German form: "1. Mose 1,1"
  text: string; // Luther 1912, transcribed exactly. Never generated.
}

export interface Path {
  id: PathId;
  name: string;
  blurb: string;
}

export interface VerseProgress {
  stage: TextRung; // the only ladder
  due: number; // epoch ms; 0 = due now
  seen: number; // repeat counter; drives the window shift
  lastAloud: number; // epoch ms; 0 = never
  introducedAt: number | null; // null = not yet in rotation
}

export interface Settings {
  newPerDay: number;
}

export interface SaveData {
  schemaVersion: number;
  progress: Record<VerseId, VerseProgress>;
  introductions: Record<string, number>; // "YYYY-MM-DD" -> count
  settings: Settings;
}

export function blankProgress(): VerseProgress {
  return {
    stage: 1,
    due: 0,
    seen: 0,
    lastAloud: 0,
    introducedAt: null,
  };
}

export function createSaveData(verses: readonly Verse[]): SaveData {
  const progress: Record<VerseId, VerseProgress> = {};
  for (const v of verses) progress[v.id] = blankProgress();
  return {
    schemaVersion: SCHEMA_VERSION,
    progress,
    introductions: {},
    settings: { newPerDay: DEFAULT_NEW_PER_DAY },
  };
}

// --- Constants (docs/build.md §3) ---

export const FRACTION: readonly number[] = [0, 0, 0.3, 0.6, 1, 1];
export const DECOYS: readonly number[] = [0, 0, 0, 1, 2, 3];
export const INTERVALS: readonly number[] = [0, 1, 2, 4, 9, 21];
export const MAX_WINDOW = 14;
export const MIN_WINDOW = 3;
export const SESSION_MS = 300_000;
export const DAY_MS = 86_400_000;
export const ALOUD_GAP_MS = 7 * DAY_MS;
export const DEFAULT_NEW_PER_DAY = 2;
export const EROSION_MAX_CHARS = 60;
export const SCHEMA_VERSION = 2;

export const TEXT_RUNG_NAMES = ["Lesen", "Satzteil", "Abschnitt", "Aufbau", "Kalt"] as const;
// Not rungs — three forms of one ungated address question, picked at random (build.md §4.10).
export const ADDRESS_QUESTION_FORMS = ["Erkennen", "Zuordnen", "Bilden"] as const;
