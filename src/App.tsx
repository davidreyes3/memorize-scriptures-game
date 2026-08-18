import { useState, type CSSProperties } from "react";
import { de } from "./i18n/de";
import { VERSES_DE } from "./data/verses.de";
import { PATHS_DE } from "./data/paths.de";
import { SteppingStone } from "./components/SteppingStone";
import { useSession } from "./session/useSession";
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

// Scaffolding for the session controller (docs/build.md §4.9-4.11, §6) — proves the
// reducer's wiring end to end before the four real screens exist. Not a real screen;
// remove once Pfade/Pfad/Sitzung/Zusammenfassung are built.
function SessionDebug() {
  const { state, selectPath, backToPaths, startSession, answer, lookup, aloudDone, endSession } =
    useSession(VERSES_DE);
  const verseById = (id: string) => VERSES_DE.find((v) => v.id === id);
  const btn: CSSProperties = { fontFamily: "var(--font-ui)", marginRight: "0.5rem" };

  return (
    <section style={{ marginTop: "2rem" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
        Session controller (debug) — {state.screen}
      </h2>

      {state.screen === "pfade" && (
        <div>
          {PATHS_DE.map((p) => (
            <button key={p.id} onClick={() => selectPath(p.id)} style={btn}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {state.screen === "pfad" && state.pathId && (
        <div>
          <p style={{ fontFamily: "var(--font-ui)" }}>
            Pfad: {PATHS_DE.find((p) => p.id === state.pathId)?.name}
          </p>
          <button onClick={() => startSession(false)} style={btn}>
            Los geht's
          </button>
          <button onClick={() => startSession(true)} style={btn}>
            Trotzdem üben
          </button>
          <button onClick={backToPaths} style={btn}>
            Zurück
          </button>
        </div>
      )}

      {state.screen === "sitzung" && state.current && (
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
            {state.current.kind}
            {state.current.addressForm ? ` · ${state.current.addressForm}` : ""} —{" "}
            {verseById(state.current.id)?.ref}
          </p>
          <p style={{ fontFamily: "var(--font-scripture)" }}>{verseById(state.current.id)?.text}</p>

          {(state.current.kind === "text" || state.current.kind === "ref") && (
            <>
              <button onClick={() => answer(true)} style={btn}>
                Richtig
              </button>
              <button onClick={() => answer(false)} style={btn}>
                Falsch
              </button>
            </>
          )}
          {state.current.kind === "text" && (
            <button onClick={lookup} style={btn}>
              Nachschlagen
            </button>
          )}
          {state.current.kind === "aloud" && (
            <button onClick={aloudDone} style={btn}>
              Gesagt
            </button>
          )}
          <button onClick={endSession} style={btn}>
            Beenden
          </button>

          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--ink-muted)" }}>
            Queue: {state.queue.length} remaining · one-more-served: {String(state.overrunExtraServed)}
          </p>
        </div>
      )}

      {state.screen === "zusammenfassung" && state.summary && (
        <div>
          <p style={{ fontFamily: "var(--font-ui)" }}>
            Beantwortet: {state.summary.answered} · Erstversuch richtig: {state.summary.firstTimeCorrect} ·
            Stufen erklommen: {state.summary.rungsClimbed} · Gehalten: {state.summary.held}
          </p>
          <button onClick={backToPaths} style={btn}>
            Fertig
          </button>
        </div>
      )}
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
      <SessionDebug />
    </main>
  );
}
