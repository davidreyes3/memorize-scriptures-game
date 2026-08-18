import type { CSSProperties } from "react";
import { stoneState } from "../game/stone";
import type { VerseProgress } from "../game/types";
import "./SteppingStone.css";

interface SteppingStoneProps {
  progress: Pick<VerseProgress, "stage" | "introducedAt">;
}

export function SteppingStone({ progress }: SteppingStoneProps) {
  const visual = stoneState(progress);

  const wedgeStyle: CSSProperties =
    visual.state === "cracked"
      ? ({
          "--p1": visual.healed >= 1 ? "var(--moss)" : "var(--stone)",
          "--p2": visual.healed >= 2 ? "var(--moss)" : "var(--stone)",
          "--p3": visual.healed >= 3 ? "var(--moss)" : "var(--stone)",
          "--p4": visual.healed >= 4 ? "var(--moss)" : "var(--stone)",
          "--p5": "var(--stone)",
        } as CSSProperties)
      : {};

  return (
    <div className="stone" data-state={visual.state} style={wedgeStyle}>
      {visual.state === "locked" && <span className="stone-mark">?</span>}
      {visual.state === "held" && <span className="stone-mark">✓</span>}
    </div>
  );
}
