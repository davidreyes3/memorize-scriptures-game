// Pfad (path detail) — docs/build.md §6, §7.4. The trail: stepping stones positioned
// along a winding SVG path, walked segment solid, the rest dotted. Each stone carries
// an opaque plaque below it (§7.4's label rules) with the reference and a quote snippet.
import { de } from "../i18n/de";
import type { Path, PathId, Verse } from "../game/types";
import type { SessionState } from "../session/controller";
import { assembleQueue, isHeld } from "../srs/queue";
import { introduceNewVerses } from "../srs/introduction";
import { SteppingStone } from "./SteppingStone";
import "./exercises.css"; // shared .primary-btn/.secondary-btn/.link-btn
import "./PfadScreen.css";

interface PfadScreenProps {
  state: SessionState;
  paths: readonly Path[];
  verses: readonly Verse[];
  onStart: (force: boolean) => void;
  onBack: () => void;
}

// X is in abstract 0-100 units (percent of the trail's actual rendered width) so the
// SVG (stretched with preserveAspectRatio="none") and the absolutely-positioned stone
// divs (placed with `left: X%`) always agree, at any viewport width — not just at one
// specific pixel width a fixed viewBox would silently assume. Y stays in real pixels;
// only the horizontal axis needs to track a shrinking container.
const SPACING = 190;
const AMPLITUDE = 16;
const CENTER_X = 50;
const TOP_MARGIN = 70;
const QUOTE_LEN = 42;

export function PfadScreen({ state, paths, verses, onStart, onBack }: PfadScreenProps) {
  const path = paths.find((p) => p.id === (state.pathId as PathId))!;
  const pathVerses = verses.filter((v) => v.path === path.id);
  const now = Date.now();
  // Preview what starting a session would do: introduceNewVerses runs first (§4.9),
  // so a never-introduced verse should still count as "ready" here, not just already-due ones.
  const projected = introduceNewVerses(state.save, verses, now);
  const ready = assembleQueue(path.id, projected, verses, now, () => 0.5).length;
  // If nothing's ready but this path still has verses nobody's ever seen, that's the
  // daily newPerDay cap talking, not "nothing left" — say so, since Trotzdem üben can
  // only re-serve already-introduced verses, never unlock these.
  const capReached = ready === 0 && pathVerses.some((v) => projected.progress[v.id]?.introducedAt == null);

  const stones = pathVerses.map((v, i) => ({
    verse: v,
    x: CENTER_X + (i % 2 === 0 ? -AMPLITUDE : AMPLITUDE),
    y: TOP_MARGIN + i * SPACING,
  }));

  let walked = 0;
  while (walked < stones.length && isHeld(state.save.progress[stones[walked].verse.id])) walked++;

  const height = TOP_MARGIN + (stones.length - 1) * SPACING + 100;
  const fullPath = stones.map((s, i) => `${i === 0 ? "M" : "L"} ${s.x} ${s.y}`).join(" ");
  const walkedPath = stones
    .slice(0, Math.max(walked, 1))
    .map((s, i) => `${i === 0 ? "M" : "L"} ${s.x} ${s.y}`)
    .join(" ");

  return (
    <section className="pfad">
      <button className="link-btn" onClick={onBack}>
        {de.zurueck}
      </button>
      <h1>{path.name}</h1>
      <p className="blurb">{path.blurb}</p>

      <div className="trail-wrap" style={{ height }}>
        <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="trail-svg">
          <path d={fullPath} className="trail-ahead" fill="none" vectorEffect="non-scaling-stroke" />
          {walked > 0 && <path d={walkedPath} className="trail-walked" fill="none" vectorEffect="non-scaling-stroke" />}
        </svg>

        {stones.map((s) => (
          <div key={s.verse.id} className="trail-stone" style={{ left: `${s.x}%`, top: s.y }}>
            <SteppingStone progress={state.save.progress[s.verse.id]} />
            <div className="plaque">
              <p className="plaque-ref">{s.verse.ref}</p>
              <p className="plaque-quote">
                {s.verse.text.length > QUOTE_LEN ? `${s.verse.text.slice(0, QUOTE_LEN)}…` : s.verse.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="pfad-cta">
        {ready > 0 ? (
          <button className="primary-btn" onClick={() => onStart(false)}>
            {de.losGehts}
          </button>
        ) : (
          <>
            <p className="cta-hint">{capReached ? de.capReached : de.allesErledigt}</p>
            <button className="secondary-btn" onClick={() => onStart(true)}>
              {de.trotzdemUeben}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
