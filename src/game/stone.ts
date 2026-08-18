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
  // healed = stage, not stage - 1: the wedge count runs 1..4 while cracked, so the
  // last visible crack heals in the same moment the stone turns whole and gold,
  // rather than two wedges healing invisibly at once on the jump to held.
  return { state: "cracked", healed: progress.stage };
}
