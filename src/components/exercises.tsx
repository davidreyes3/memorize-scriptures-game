// The seven Sitzung exercise bodies (docs/build.md §6, §4.3-§4.8). Each is presentation
// over the pure game/ builders — buildRound, windowedSkeleton, parseRef/nearNumbers —
// called fresh on every render rather than memoized, since they're already deterministic
// on (verse.id, seen) and cheap at this data size.
import { useEffect, useState } from "react";
import { de } from "../i18n/de";
import { BOOKS_DE } from "../data/books.de";
import type { Verse, VerseProgress } from "../game/types";
import { buildRound } from "../game/round";
import { windowedSkeleton } from "../game/text";
import { formatRef, nearNumbers, parseRef, type RefParts } from "../game/reference";
import { hashSeed, mulberry32, shuffle } from "../game/random";
import "./exercises.css";

export interface BodyProps {
  verse: Verse;
  progress: VerseProgress;
  allVerses: readonly Verse[];
  onAnswer: (ok: boolean) => void;
}

export function LesenBody({ verse, onAnswer }: BodyProps) {
  return (
    <div>
      <p className="scripture-text">{verse.text}</p>
      <button className="primary-btn" onClick={() => onAnswer(true)}>
        {de.lesenDone}
      </button>
    </div>
  );
}

export function AloudBody({ verse, onDone }: { verse: Verse; onDone: () => void }) {
  return (
    <div>
      <p className="scripture-text">{verse.text}</p>
      <p className="hint">{de.aloudPrompt}</p>
      <button className="primary-btn" onClick={onDone}>
        {de.aloudDone}
      </button>
    </div>
  );
}

export function ClozeBody({ verse, progress, allVerses, onAnswer }: BodyProps) {
  const round = buildRound(verse, progress.stage, progress.seen, allVerses);
  const [placed, setPlaced] = useState<number[]>([]);
  const [verdict, setVerdict] = useState<boolean | null>(null);

  useEffect(() => {
    setPlaced([]);
    setVerdict(null);
  }, [verse.id, progress.seen]);

  const used = new Set(placed);
  const filled = placed.length === round.window.length;

  const tap = (bankIndex: number) => {
    if (verdict !== null || used.has(bankIndex) || filled) return;
    setPlaced((p) => [...p, bankIndex]);
  };

  const undo = () => {
    if (verdict !== null) return;
    setPlaced((p) => p.slice(0, -1));
  };

  const check = () => {
    setVerdict(round.window.every((tokenIndex, k) => round.bank[placed[k]] === round.tokens[tokenIndex]));
  };

  let windowPos = 0;
  return (
    <div>
      <p className="scripture-text">
        {round.tokens.map((tok, i) => {
          if (!round.window.includes(i)) return <span key={i}>{tok} </span>;
          const k = windowPos++;
          const tile = k < placed.length ? round.bank[placed[k]] : null;
          return (
            <span key={i} className={`blank${tile ? " filled" : ""}`}>
              {tile ?? "＿"}{" "}
            </span>
          );
        })}
      </p>

      {verdict === null ? (
        <>
          <div className="tile-bank">
            {round.bank.map((word, i) => (
              <button key={i} className="tile" disabled={used.has(i)} onClick={() => tap(i)}>
                {word}
              </button>
            ))}
          </div>
          <div className="body-actions">
            <button className="secondary-btn" onClick={undo} disabled={placed.length === 0}>
              {de.rueckgaengig}
            </button>
            <button className="primary-btn" onClick={check} disabled={!filled}>
              {de.pruefen}
            </button>
          </div>
        </>
      ) : (
        <VerdictAndContinue ok={verdict} onAnswer={onAnswer} />
      )}
    </div>
  );
}

export function KaltBody({ verse, progress, allVerses, onAnswer }: BodyProps) {
  const round = buildRound(verse, progress.stage, progress.seen, allVerses);
  const [placed, setPlaced] = useState<number[]>([]);
  const [slips, setSlips] = useState(0);
  const [wrongTile, setWrongTile] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<boolean | null>(null);

  useEffect(() => {
    setPlaced([]);
    setSlips(0);
    setWrongTile(null);
    setVerdict(null);
  }, [verse.id, progress.seen]);

  const used = new Set(placed);
  const nextIndex = placed.length;

  const tap = (bankIndex: number) => {
    if (verdict !== null || nextIndex >= round.window.length || used.has(bankIndex)) return;
    const expected = round.tokens[round.window[nextIndex]];
    if (round.bank[bankIndex] === expected) {
      const next = [...placed, bankIndex];
      setPlaced(next);
      if (next.length === round.window.length) setVerdict(slips <= 1);
    } else {
      setSlips((s) => s + 1);
      setWrongTile(bankIndex);
      setTimeout(() => setWrongTile((w) => (w === bankIndex ? null : w)), 350);
    }
  };

  const skel = windowedSkeleton(round.tokens, round.window);
  let k = 0;
  const display = round.tokens.map((tok, i) => {
    if (!round.window.includes(i)) return tok;
    const filled = k < placed.length;
    const word = filled ? round.bank[placed[k]] : skel[i].display;
    k++;
    return word;
  });

  return (
    <div>
      <p className="scripture-text">{display.join(" ")}</p>

      {verdict === null ? (
        <div className="tile-bank">
          {round.bank.map((word, i) => (
            <button
              key={i}
              className={`tile${used.has(i) ? " used" : ""}${wrongTile === i ? " wrong" : ""}`}
              disabled={used.has(i)}
              onClick={() => tap(i)}
            >
              {word}
            </button>
          ))}
        </div>
      ) : (
        <VerdictAndContinue ok={verdict} onAnswer={onAnswer} />
      )}
    </div>
  );
}

function buildRefDecoys(parts: RefParts, rng: () => number): RefParts[] {
  const chapterOptions = nearNumbers(parts.chapter, 4);
  const verseOptions = nearNumbers(parts.verse, 4);
  const decoys: RefParts[] = [];
  let attempts = 0;
  while (decoys.length < 3 && attempts < 100) {
    attempts++;
    const chapter = chapterOptions[Math.floor(rng() * chapterOptions.length)];
    const verse = verseOptions[Math.floor(rng() * verseOptions.length)];
    if (chapter === parts.chapter && verse === parts.verse) continue;
    if (decoys.some((d) => d.chapter === chapter && d.verse === verse)) continue;
    decoys.push({ book: parts.book, chapter, verse });
  }
  return decoys;
}

export function ErkennenBody({ verse, progress, onAnswer }: BodyProps) {
  const rng = mulberry32(hashSeed(verse.id, progress.seen, "erkennen"));
  const parts = parseRef(verse.ref);
  const options = shuffle([parts, ...buildRefDecoys(parts, rng)], rng);

  const [selected, setSelected] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<boolean | null>(null);

  useEffect(() => {
    setSelected(null);
    setVerdict(null);
  }, [verse.id, progress.seen]);

  const choose = (i: number) => {
    if (verdict !== null) return;
    setSelected(i);
    setVerdict(options[i].chapter === parts.chapter && options[i].verse === parts.verse);
  };

  return (
    <div>
      <p className="scripture-text">{verse.text}</p>
      <p className="prompt">{de.erkennenPrompt}</p>
      <div className="options">
        {options.map((opt, i) => (
          <button
            key={i}
            className={`option${selected === i ? (verdict ? " verdict-ok" : " verdict-fail") : ""}`}
            disabled={verdict !== null}
            onClick={() => choose(i)}
          >
            {formatRef(opt)}
          </button>
        ))}
      </div>
      {verdict !== null && <ContinueButton ok={verdict} onAnswer={onAnswer} />}
    </div>
  );
}

export function ZuordnenBody({ verse, progress, allVerses, onAnswer }: BodyProps) {
  const rng = mulberry32(hashSeed(verse.id, progress.seen, "zuordnen"));
  const others = shuffle(
    allVerses.filter((v) => v.id !== verse.id),
    rng,
  ).slice(0, 3);
  const options = shuffle([verse, ...others], rng);

  const [selected, setSelected] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<boolean | null>(null);

  useEffect(() => {
    setSelected(null);
    setVerdict(null);
  }, [verse.id, progress.seen]);

  const choose = (i: number) => {
    if (verdict !== null) return;
    setSelected(i);
    setVerdict(options[i].id === verse.id);
  };

  return (
    <div>
      <p className="prompt">{de.zuordnenPrompt(verse.ref)}</p>
      <div className="options options-text">
        {options.map((opt, i) => (
          <button
            key={opt.id}
            className={`option${selected === i ? (verdict ? " verdict-ok" : " verdict-fail") : ""}`}
            disabled={verdict !== null}
            onClick={() => choose(i)}
          >
            {opt.text}
          </button>
        ))}
      </div>
      {verdict !== null && <ContinueButton ok={verdict} onAnswer={onAnswer} />}
    </div>
  );
}

export function BildenBody({ verse, progress, onAnswer }: BodyProps) {
  const rng = mulberry32(hashSeed(verse.id, progress.seen, "bilden"));
  const parts = parseRef(verse.ref);

  const bookOptions = shuffle(
    [parts.book, ...shuffle(BOOKS_DE.filter((b) => b !== parts.book), rng).slice(0, 3)],
    rng,
  );
  const chapterOptions = shuffle(nearNumbers(parts.chapter, 4), rng);
  const verseOptions = shuffle(nearNumbers(parts.verse, 4), rng);

  const [book, setBook] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [verseNum, setVerseNum] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<boolean | null>(null);

  useEffect(() => {
    setBook(null);
    setChapter(null);
    setVerseNum(null);
    setVerdict(null);
  }, [verse.id, progress.seen]);

  const allChosen = book !== null && chapter !== null && verseNum !== null;
  const check = () => setVerdict(book === parts.book && chapter === parts.chapter && verseNum === parts.verse);

  return (
    <div>
      <p className="scripture-text">{verse.text}</p>
      <p className="prompt">{de.bildenPrompt}</p>

      <p className="field-label">{de.bildenBook}</p>
      <div className="options">
        {bookOptions.map((b) => (
          <button
            key={b}
            className={`option${book === b ? " selected" : ""}`}
            disabled={verdict !== null}
            onClick={() => setBook(b)}
          >
            {b}
          </button>
        ))}
      </div>

      <p className="field-label">{de.bildenChapter}</p>
      <div className="options">
        {chapterOptions.map((c) => (
          <button
            key={c}
            className={`option${chapter === c ? " selected" : ""}`}
            disabled={verdict !== null}
            onClick={() => setChapter(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="field-label">{de.bildenVerse}</p>
      <div className="options">
        {verseOptions.map((v) => (
          <button
            key={v}
            className={`option${verseNum === v ? " selected" : ""}`}
            disabled={verdict !== null}
            onClick={() => setVerseNum(v)}
          >
            {v}
          </button>
        ))}
      </div>

      {verdict === null ? (
        <button className="primary-btn" disabled={!allChosen} onClick={check}>
          {de.pruefen}
        </button>
      ) : (
        <VerdictAndContinue ok={verdict} onAnswer={onAnswer} />
      )}
    </div>
  );
}

function VerdictAndContinue({ ok, onAnswer }: { ok: boolean; onAnswer: (ok: boolean) => void }) {
  return (
    <>
      <p className={ok ? "verdict-ok" : "verdict-fail"}>{ok ? de.richtig : de.falsch}</p>
      <ContinueButton ok={ok} onAnswer={onAnswer} />
    </>
  );
}

function ContinueButton({ ok, onAnswer }: { ok: boolean; onAnswer: (ok: boolean) => void }) {
  return (
    <button className="primary-btn" onClick={() => onAnswer(ok)}>
      {de.weiter}
    </button>
  );
}
