import { useEffect, useRef, useState, type CSSProperties } from "react";
import { stoneState } from "../game/stone";
import type { VerseProgress } from "../game/types";
import "./SteppingStone.css";

interface SteppingStoneProps {
  progress: Pick<VerseProgress, "stage" | "introducedAt">;
}

// How long the stone holds at "all 5 wedges mended, still not gold" before the
// cross-fade to held plays — long enough to register as its own beat, not a glitch.
const SEAL_MS = 600;

export function SteppingStone({ progress }: SteppingStoneProps) {
  const visual = stoneState(progress);
  const [sealing, setSealing] = useState(false);
  const prevState = useRef(visual.state);

  // stage jumps straight from "4 wedges healed" to "held" in the data — there's no
  // stage for "all 5 healed, not yet gold." That frame is inserted here, transiently,
  // so graduation reads as two beats (last wedge mends, then it turns gold) instead
  // of one jump. Skipped under reduced motion, matching every other state swap here.
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prevState.current === "cracked" && visual.state === "held" && !reduceMotion) {
      setSealing(true);
      const timer = setTimeout(() => setSealing(false), SEAL_MS);
      prevState.current = visual.state;
      return () => clearTimeout(timer);
    }
    prevState.current = visual.state;
  }, [visual.state]);

  const healed = visual.state === "cracked" ? visual.healed : sealing ? 5 : 0;
  const showWedges = visual.state === "cracked" || sealing;
  const dataState = sealing ? "sealing" : visual.state;

  const wedgeStyle: CSSProperties = showWedges
    ? ({
        "--p1": healed >= 1 ? "var(--moss)" : "var(--stone)",
        "--p2": healed >= 2 ? "var(--moss)" : "var(--stone)",
        "--p3": healed >= 3 ? "var(--moss)" : "var(--stone)",
        "--p4": healed >= 4 ? "var(--moss)" : "var(--stone)",
        "--p5": healed >= 5 ? "var(--moss)" : "var(--stone)",
      } as CSSProperties)
    : {};

  return (
    <div className="stone" data-state={dataState} style={wedgeStyle}>
      {visual.state === "locked" && <span className="stone-mark">?</span>}
      {visual.state === "held" && !sealing && <span className="stone-mark">✓</span>}
    </div>
  );
}
