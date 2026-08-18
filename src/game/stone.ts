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
  // healed = stage - 1: a wedge heals only once its rung has actually been passed, so a
  // freshly introduced verse (stage 1, nothing answered yet) shows all 5 wedges still
  // cracked. The last wedge closing *and* the stone turning gold in the same instant —
  // the reason an earlier version of this bumped healed up to `stage` instead — is a
  // separate concern now handled by SteppingStone's sealing beat (build.md §7.3), which
  // forces every wedge closed for a transient frame before the cross-fade to held plays.
  return { state: "cracked", healed: progress.stage - 1 };
}
