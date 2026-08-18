// Pfade (paths list) — docs/build.md §6. Masthead with held tally, one card per path
// with a 3-dot mini-trail preview (a symbol, never one dot per verse), the newPerDay
// stepper, and the reset control.
import { de } from "../i18n/de";
import type { PathId, Path, Verse } from "../game/types";
import type { SessionState } from "../session/controller";
import { assembleQueue, isHeld } from "../srs/queue";
import { introduceNewVerses } from "../srs/introduction";
import "./PfadeScreen.css";

interface PfadeScreenProps {
  state: SessionState;
  paths: readonly Path[];
  verses: readonly Verse[];
  onSelectPath: (id: PathId) => void;
  onSetNewPerDay: (n: number) => void;
  onReset: () => void;
}

export function PfadeScreen({ state, paths, verses, onSelectPath, onSetNewPerDay, onReset }: PfadeScreenProps) {
  const now = Date.now();
  const totalHeld = verses.filter((v) => isHeld(state.save.progress[v.id])).length;
  // Same preview as PfadScreen: introduceNewVerses runs before assembleQueue at session
  // start (§4.9), so a never-introduced verse should still count toward "ready" here.
  const projected = introduceNewVerses(state.save, verses, now);

  return (
    <section className="pfade">
      <header className="masthead">
        <h1>{de.pfadeTitle}</h1>
        <p className="held-tally">{de.held(totalHeld)}</p>
      </header>

      <div className="path-list">
        {paths.map((p) => {
          const pathVerses = verses.filter((v) => v.path === p.id);
          const heldInPath = pathVerses.filter((v) => isHeld(state.save.progress[v.id])).length;
          const ready = assembleQueue(p.id, projected, verses, now, () => 0.5).length;
          const fraction = pathVerses.length ? heldInPath / pathVerses.length : 0;
          const filledDots = Math.round(fraction * 3);

          return (
            <button key={p.id} className="path-card" onClick={() => onSelectPath(p.id)}>
              <div className="path-card-text">
                <h2>{p.name}</h2>
                <p className="blurb">{p.blurb}</p>
                <p className="ready">{de.ready(ready)}</p>
              </div>
              <div className="mini-trail" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`mini-dot${i < filledDots ? " filled" : ""}`} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="settings">
        <div className="stepper-row">
          <span className="stepper-label">{de.newPerDayLabel}</span>
          <div className="stepper">
            <button onClick={() => onSetNewPerDay(state.save.settings.newPerDay - 1)}>−</button>
            <span className="stepper-value">{state.save.settings.newPerDay}</span>
            <button onClick={() => onSetNewPerDay(state.save.settings.newPerDay + 1)}>+</button>
          </div>
        </div>
        <button
          className="reset-btn"
          onClick={() => {
            if (window.confirm(de.resetConfirm)) onReset();
          }}
        >
          {de.resetLabel}
        </button>
      </div>
    </section>
  );
}
