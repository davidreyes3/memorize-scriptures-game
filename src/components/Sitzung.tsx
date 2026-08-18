// Sitzung (session item) chrome — docs/build.md §6. Shared shell: end-session link,
// rung segments, reference (hidden when it's the thing being asked for), Nachschlagen,
// and the body dispatch. No countdown, no draining bar anywhere here (§4.11).
import { de } from "../i18n/de";
import type { ActiveItem, SessionState } from "../session/controller";
import type { Verse, VerseProgress } from "../game/types";
import { AloudBody, BildenBody, ClozeBody, ErkennenBody, KaltBody, LesenBody, ZuordnenBody } from "./exercises";
import "./Sitzung.css";

interface SitzungProps {
  state: SessionState;
  verses: readonly Verse[];
  onAnswer: (ok: boolean) => void;
  onLookup: () => void;
  onAloudDone: () => void;
  onEndSession: () => void;
}

export function Sitzung({ state, verses, onAnswer, onLookup, onAloudDone, onEndSession }: SitzungProps) {
  const current = state.current;
  if (!current) return null;
  const verse = verses.find((v) => v.id === current.id)!;
  const progress = state.save.progress[current.id];

  const hidesRef = current.kind === "ref" && (current.addressForm === "Erkennen" || current.addressForm === "Bilden");

  return (
    <section className="sitzung">
      <div className="sitzung-top">
        <button className="link-btn" onClick={onEndSession}>
          {de.beenden}
        </button>
        <div className="rung-segments" title={`Stufe ${progress.stage}/5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={`rung-seg${n <= progress.stage ? " filled" : ""}`} />
          ))}
        </div>
      </div>

      {!hidesRef && <p className="sitzung-ref">{verse.ref}</p>}

      <div className="sitzung-body">{renderBody(current, verse, progress, verses, onAnswer, onAloudDone)}</div>

      {current.kind === "text" && (
        <button className="lookup-btn" onClick={onLookup}>
          {de.nachschlagen}
        </button>
      )}
    </section>
  );
}

function renderBody(
  current: ActiveItem,
  verse: Verse,
  progress: VerseProgress,
  verses: readonly Verse[],
  onAnswer: (ok: boolean) => void,
  onAloudDone: () => void,
) {
  if (current.kind === "aloud") return <AloudBody verse={verse} onDone={onAloudDone} />;

  if (current.kind === "text") {
    if (progress.stage === 1) return <LesenBody verse={verse} progress={progress} allVerses={verses} onAnswer={onAnswer} />;
    if (progress.stage === 5) return <KaltBody verse={verse} progress={progress} allVerses={verses} onAnswer={onAnswer} />;
    return <ClozeBody verse={verse} progress={progress} allVerses={verses} onAnswer={onAnswer} />;
  }

  if (current.addressForm === "Erkennen") return <ErkennenBody verse={verse} progress={progress} allVerses={verses} onAnswer={onAnswer} />;
  if (current.addressForm === "Zuordnen") return <ZuordnenBody verse={verse} progress={progress} allVerses={verses} onAnswer={onAnswer} />;
  return <BildenBody verse={verse} progress={progress} allVerses={verses} onAnswer={onAnswer} />;
}
