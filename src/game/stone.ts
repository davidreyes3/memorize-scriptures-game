// Pure presentation state for the stepping stone — docs/build.md §7.3.
// Lives in game/ (not components/) so it stays testable without React.

import type { VerseProgress } from "./types";

export type StoneState =
  | { state: "locked" }
  | { state: "cracked"; healed: number }
  | { state: "held" };

export function stoneState(progress: Pick<VerseProgress, "stage" | "introducedAt">): StoneState {
  if (progress.introducedAt === null) return { state: "locked" };
  if (progress.stage === 5) return { state: "held" };
  return { state: "cracked", healed: progress.stage - 1 };
}
