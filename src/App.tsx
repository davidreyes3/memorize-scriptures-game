import { useState } from "react";
import { de } from "./i18n/de";
import { VERSES_DE } from "./data/verses.de";
import { SteppingStone } from "./components/SteppingStone";
import type { TextRung, VerseProgress } from "./game/types";

// Placeholder only — proves the scaffold runs. Real screens (docs/build.md §6) are the
// next task, not part of this pass.
const sample = VERSES_DE[0];

// Scaffolding for docs/build.md §7.3, not a real screen — remove once the stone is
// wired into the actual Pfad trail.
const GALLERY_STAGES: TextRung[] = [1, 2, 3, 4, 5];

function StoneGallery() {
  const [climbStage, setClimbStage] = useState<TextRung>(1);
  const [climbIntroduced, setClimbIntroduced] = useState(false);

  const climb = () => {
    if (!climbIntroduced) {
      setClimbIntroduced(true);
      return;
    }
    setClimbStage((stage) => (stage === 5 ? 1 : ((stage + 1) as TextRung)));
    if (climbStage === 5) setClimbIntroduced(false);
  };

  const climbProgress: Pick<VerseProgress, "stage" | "introducedAt"> = {
    stage: climbStage,
    introducedAt: climbIntroduced ? 1 : null,
  };

  return (
    <section style={{ marginTop: "2rem" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>Stone gallery</h2>
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ textAlign: "center" }}>
          <SteppingStone progress={{ stage: 1, introducedAt: null }} />
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>locked</p>
        </div>
        {GALLERY_STAGES.filter((s) => s < 5).map((stage) => (
          <div key={stage} style={{ textAlign: "center" }}>
            <SteppingStone progress={{ stage, introducedAt: 1 }} />
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>stage {stage}</p>
          </div>
        ))}
        <div style={{ textAlign: "center" }}>
          <SteppingStone progress={{ stage: 5, introducedAt: 1 }} />
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>held</p>
        </div>
      </div>

      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", marginTop: "1.5rem" }}>
        Watch it climb
      </h3>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <SteppingStone progress={climbProgress} />
        <button onClick={climb} style={{ fontFamily: "var(--font-ui)" }}>
          {climbIntroduced ? "Advance rung" : "Introduce"}
        </button>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <main style={{ padding: "2rem", maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-display)" }}>{de.appName}</h1>
      <p style={{ fontFamily: "var(--font-ui)" }}>
        Noch keine Screens gebaut — siehe docs/build.md §6.
      </p>
      <p style={{ fontFamily: "var(--font-scripture)", fontSize: "1.25rem" }}>{sample.text}</p>
      <p style={{ fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}>{sample.ref}</p>
      <StoneGallery />
    </main>
  );
}
