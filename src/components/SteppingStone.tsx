import { useEffect, useState, type CSSProperties } from "react";
import { stoneState } from "../game/stone";
import type { VerseProgress } from "../game/types";
import "./SteppingStone.css";

interface SteppingStoneProps {
  progress: Pick<VerseProgress, "stage" | "introducedAt">;
  // True when this verse crossed into "held" during the session that just ended — see
  // session/controller.ts's `justGraduated`. Plays the sealing+gold sequence once, on
  // mount, instead of the stone just silently appearing already gold.
  justGraduated?: boolean;
}

// How long the stone holds at "all 5 wedges mended, still not gold" before the
// cross-fade to held plays — long enough to register as its own beat, not a glitch.
const SEAL_MS = 600;

export function SteppingStone({ progress, justGraduated = false }: SteppingStoneProps) {
  const visual = stoneState(progress);

  // Mount-only by design, not a live transition watcher: the Pfad screen unmounts
  // while a session runs (App.tsx swaps screens, it doesn't keep them mounted
  // side by side), so SteppingStone never sees progress change under it — it always
  // mounts fresh, already in its final state. `justGraduated` is how the parent tells
  // a freshly-mounted, already-held stone to play the graduation sequence anyway.
  // If that ever stops being true (Pfad kept mounted across a session), this needs
  // to become a real prop-change watcher instead of a mount-time-only one.
  const [sealing, setSealing] = useState(() => {
    if (!justGraduated || visual.state !== "held") return false;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (!sealing) return;
    const timer = setTimeout(() => setSealing(false), SEAL_MS);
    return () => clearTimeout(timer);
    // Intentionally mount-only — see the comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
