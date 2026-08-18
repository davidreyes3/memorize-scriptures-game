// localStorage persistence (docs/build.md §5). The only module allowed to touch
// localStorage — game/ and srs/ never do.
//
// ⚠️ Deviation from the prototype: it persisted via `window.storage.get/set`
// (engrave.html:234), the Claude Artifacts runtime API, which does not exist in a Vite
// app. This uses the real browser `localStorage`.
import { SCHEMA_VERSION, createSaveData, type SaveData, type Verse } from "../game/types";

const STORAGE_KEY = "engrave.save";

/**
 * Loads saved progress, seeded with blank progress for any verse not yet in the save
 * (new library entries). A newer/unknown `schemaVersion`, corrupt JSON, or unavailable
 * storage all degrade to fresh defaults — the stored value is never overwritten by a load.
 */
export function load(verses: readonly Verse[]): SaveData {
  const defaults = createSaveData(verses);

  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return defaults;
  }
  if (!raw) return defaults;

  let parsed: Partial<SaveData> | null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaults;
  }
  if (!parsed || typeof parsed !== "object" || parsed.schemaVersion !== SCHEMA_VERSION) {
    return defaults;
  }

  return {
    schemaVersion: parsed.schemaVersion,
    progress: { ...defaults.progress, ...parsed.progress },
  };
}

/** Storage unavailable (private browsing, quota) silently no-ops — never crashes. */
export function persist(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // intentionally silent
  }
}

export function reset(verses: readonly Verse[]): SaveData {
  const defaults = createSaveData(verses);
  persist(defaults);
  return defaults;
}
