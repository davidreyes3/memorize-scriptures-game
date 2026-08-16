import { beforeEach, describe, expect, it } from "vitest";
import { load, persist, reset } from "./index";
import { SCHEMA_VERSION, createSaveData } from "../game/types";
import { FIXTURE_VERSES } from "../test/fixtures";

// Minimal in-memory localStorage shim — this project has no jsdom dependency yet, and the
// Storage interface here is trivially mockable without one.
class MemoryStorage implements Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
});

describe("load", () => {
  it("returns fresh defaults when nothing is stored", () => {
    const result = load(FIXTURE_VERSES);
    expect(result).toEqual(createSaveData(FIXTURE_VERSES));
  });

  it("round-trips a full save through persist", () => {
    const original = createSaveData(FIXTURE_VERSES);
    original.progress.f1.stage = 4;
    original.settings.newPerDay = 3;
    persist(original);
    expect(load(FIXTURE_VERSES)).toEqual(original);
  });

  it("degrades to defaults on corrupt JSON", () => {
    localStorage.setItem("engrave.save", "{not valid json");
    expect(load(FIXTURE_VERSES)).toEqual(createSaveData(FIXTURE_VERSES));
  });

  it("degrades to defaults on an unknown schema version, without touching the stored value", () => {
    const stale = JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1, progress: {}, introductions: {} });
    localStorage.setItem("engrave.save", stale);
    expect(load(FIXTURE_VERSES)).toEqual(createSaveData(FIXTURE_VERSES));
    expect(localStorage.getItem("engrave.save")).toBe(stale);
  });

  it("fills in blank progress for a verse missing from an older save", () => {
    const partial = createSaveData(FIXTURE_VERSES);
    delete (partial.progress as Record<string, unknown>).f1;
    persist(partial);
    const result = load(FIXTURE_VERSES);
    expect(result.progress.f1).toEqual(createSaveData(FIXTURE_VERSES).progress.f1);
  });
});

describe("reset", () => {
  it("persists and returns fresh defaults", () => {
    const original = createSaveData(FIXTURE_VERSES);
    original.progress.f1.stage = 5;
    persist(original);

    const result = reset(FIXTURE_VERSES);
    expect(result).toEqual(createSaveData(FIXTURE_VERSES));
    expect(load(FIXTURE_VERSES)).toEqual(createSaveData(FIXTURE_VERSES));
  });
});
