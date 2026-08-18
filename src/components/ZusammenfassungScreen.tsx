// Zusammenfassung (summary) — docs/build.md §6. Time, questions answered, first-time
// correct, rungs climbed, total held. The one place elapsed time is shown — after the
// session, never during it (§4.11).
import { de } from "../i18n/de";
import type { SessionState } from "../session/controller";
import "./exercises.css"; // shared .primary-btn
import "./ZusammenfassungScreen.css";

interface ZusammenfassungScreenProps {
  state: SessionState;
  onBackToPaths: () => void;
}

export function ZusammenfassungScreen({ state, onBackToPaths }: ZusammenfassungScreenProps) {
  const summary = state.summary;
  if (!summary) return null;

  const seconds = Math.round(summary.timeMs / 1000);
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");

  const stats: Array<[string, string | number]> = [
    [de.statTime, `${mm}:${ss}`],
    [de.statAnswered, summary.answered],
    [de.statFirstTimeCorrect, summary.firstTimeCorrect],
    [de.statRungsClimbed, summary.rungsClimbed],
    [de.statHeld, summary.held],
  ];

  return (
    <section className="zusammenfassung">
      <h1>{de.zusammenfassungTitle}</h1>
      <dl className="stats">
        {stats.map(([label, value]) => (
          <div key={label} className="stat">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <button className="primary-btn" onClick={onBackToPaths}>
        {de.fertig}
      </button>
    </section>
  );
}
