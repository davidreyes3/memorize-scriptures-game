// The session controller (docs/build.md §4.9-4.11, §6). A pure reducer wiring
// game/ and srs/ together into the 4-screen state machine — no React, no browser
// globals, `now`/`rng` passed in throughout, same as everything it calls into.
import {
  ADDRESS_QUESTION_FORMS,
  blankProgress,
  type AddressQuestionForm,
  type PathId,
  type SaveData,
  type TextRung,
  type Verse,
  type VerseId,
  type VerseProgress,
} from "../game/types";
import { introduceNewVerses } from "../srs/introduction";
import { assembleQueue, isHeld, type QueueItem, type QueueItemKind } from "../srs/queue";
import { gradeText, markAloud, markLookedUpText } from "../srs/grading";
import { isOverrun } from "../srs/session";

export type Screen = "pfade" | "pfad" | "sitzung" | "zusammenfassung";

export interface ActiveItem {
  kind: QueueItemKind;
  id: VerseId;
  addressForm: AddressQuestionForm | null; // set only for kind "ref"
}

export interface Attempt {
  kind: QueueItemKind;
  id: VerseId;
  ok: boolean;
  stageBefore: TextRung | null; // only "text" attempts carry a stage change
  stageAfter: TextRung | null;
}

export interface SessionSummary {
  answered: number;
  firstTimeCorrect: number;
  rungsClimbed: number;
  held: number;
  timeMs: number;
}

export interface SessionState {
  screen: Screen;
  save: SaveData;
  verses: readonly Verse[];
  pathId: PathId | null;
  queue: QueueItem[];
  current: ActiveItem | null;
  startedAt: number | null;
  overrunExtraServed: boolean;
  attempts: Attempt[];
  summary: SessionSummary | null;
}

export type SessionAction =
  | { type: "SELECT_PATH"; pathId: PathId }
  | { type: "START_SESSION"; now: number; rng: () => number; force?: boolean }
  | { type: "ANSWER"; ok: boolean; now: number; rng: () => number }
  | { type: "LOOKUP"; now: number; rng: () => number }
  | { type: "ALOUD_DONE"; now: number; rng: () => number }
  | { type: "END_SESSION"; now: number }
  | { type: "BACK_TO_PATHS" }
  | { type: "SET_NEW_PER_DAY"; value: number }
  | { type: "HYDRATE"; save: SaveData };

export function createInitialState(save: SaveData, verses: readonly Verse[]): SessionState {
  return {
    screen: "pfade",
    save,
    verses,
    pathId: null,
    queue: [],
    current: null,
    startedAt: null,
    overrunExtraServed: false,
    attempts: [],
    summary: null,
  };
}

export function reduce(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "SELECT_PATH":
      return { ...state, screen: "pfad", pathId: action.pathId };

    case "BACK_TO_PATHS":
      return {
        ...state,
        screen: "pfade",
        pathId: null,
        queue: [],
        current: null,
        startedAt: null,
        overrunExtraServed: false,
        attempts: [],
        summary: null,
      };

    case "START_SESSION": {
      if (!state.pathId) return state;
      const save = introduceNewVerses(state.save, state.verses, action.now);
      const queue = assembleQueue(state.pathId, save, state.verses, action.now, action.rng, action.force ?? false);
      if (queue.length === 0) return { ...state, save };

      const [first, ...rest] = queue;
      return {
        ...state,
        save,
        screen: "sitzung",
        queue: rest,
        current: toActiveItem(first, action.rng),
        startedAt: action.now,
        overrunExtraServed: false,
        attempts: [],
        summary: null,
      };
    }

    case "ANSWER": {
      if (!state.current || state.current.kind === "aloud") return state;
      const outcome = action.ok ? "answer-ok" : "answer-miss";
      return completeCurrentItem(state, outcome, action.now, action.rng);
    }

    case "LOOKUP": {
      if (!state.current || state.current.kind !== "text") return state;
      return completeCurrentItem(state, "lookup", action.now, action.rng);
    }

    case "ALOUD_DONE": {
      if (!state.current || state.current.kind !== "aloud") return state;
      return completeCurrentItem(state, "aloud-done", action.now, action.rng);
    }

    case "END_SESSION":
      return {
        ...state,
        screen: "zusammenfassung",
        current: null,
        queue: [],
        summary: summarize(state.attempts, state.save, state.verses, state.startedAt, action.now),
      };

    case "SET_NEW_PER_DAY":
      return { ...state, save: { ...state.save, settings: { ...state.save.settings, newPerDay: Math.max(0, action.value) } } };

    case "HYDRATE":
      return createInitialState(action.save, state.verses);

    default:
      return state;
  }
}

type Outcome = "answer-ok" | "answer-miss" | "lookup" | "aloud-done";

function toActiveItem(item: QueueItem, rng: () => number): ActiveItem {
  const addressForm =
    item.kind === "ref" ? ADDRESS_QUESTION_FORMS[Math.floor(rng() * ADDRESS_QUESTION_FORMS.length)] : null;
  return { kind: item.kind, id: item.id, addressForm };
}

function withProgress(save: SaveData, id: VerseId, progress: VerseProgress): SaveData {
  return { ...save, progress: { ...save.progress, [id]: progress } };
}

function applyOutcome(
  state: SessionState,
  outcome: Outcome,
  now: number,
): { save: SaveData; ok: boolean; requeue: boolean; stageBefore: TextRung | null; stageAfter: TextRung | null } {
  const current = state.current!;
  const progress = state.save.progress[current.id] ?? blankProgress();

  if (current.kind === "text") {
    if (outcome === "lookup") {
      const updated = markLookedUpText(progress);
      return { save: withProgress(state.save, current.id, updated), ok: false, requeue: true, stageBefore: progress.stage, stageAfter: updated.stage };
    }
    const ok = outcome === "answer-ok";
    const updated = gradeText(progress, ok, now);
    return { save: withProgress(state.save, current.id, updated), ok, requeue: !ok, stageBefore: progress.stage, stageAfter: updated.stage };
  }

  if (current.kind === "ref") {
    const ok = outcome === "answer-ok";
    return { save: state.save, ok, requeue: !ok, stageBefore: null, stageAfter: null };
  }

  // aloud — never fails, never requeues, no grading of its own
  const updated = markAloud(progress, now);
  return { save: withProgress(state.save, current.id, updated), ok: true, requeue: false, stageBefore: null, stageAfter: null };
}

function completeCurrentItem(state: SessionState, outcome: Outcome, now: number, rng: () => number): SessionState {
  const current = state.current!;
  const { save, ok, requeue, stageBefore, stageAfter } = applyOutcome(state, outcome, now);

  const attempts =
    current.kind === "aloud" ? state.attempts : [...state.attempts, { kind: current.kind, id: current.id, ok, stageBefore, stageAfter }];

  const queue = requeue ? [...state.queue, { kind: current.kind, id: current.id }] : state.queue;
  const overrunNow = state.startedAt !== null && isOverrun(state.startedAt, now);

  if (state.overrunExtraServed || queue.length === 0) {
    return {
      ...state,
      save,
      queue,
      current: null,
      screen: "zusammenfassung",
      attempts,
      summary: summarize(attempts, save, state.verses, state.startedAt, now),
    };
  }

  const [next, ...rest] = queue;
  return {
    ...state,
    save,
    queue: rest,
    current: toActiveItem(next, rng),
    attempts,
    overrunExtraServed: overrunNow,
  };
}

function summarize(
  attempts: readonly Attempt[],
  save: SaveData,
  verses: readonly Verse[],
  startedAt: number | null,
  now: number,
): SessionSummary {
  const seenText = new Set<VerseId>();
  let firstTimeCorrect = 0;
  let rungsClimbed = 0;

  for (const a of attempts) {
    if (a.kind !== "text") continue;
    if (!seenText.has(a.id)) {
      seenText.add(a.id);
      if (a.ok) firstTimeCorrect++;
    }
    if (a.stageBefore !== null && a.stageAfter !== null) {
      rungsClimbed += Math.max(0, a.stageAfter - a.stageBefore);
    }
  }

  const held = verses.filter((v) => isHeld(save.progress[v.id] ?? blankProgress())).length;
  const timeMs = startedAt !== null ? Math.max(0, now - startedAt) : 0;

  return { answered: attempts.length, firstTimeCorrect, rungsClimbed, held, timeMs };
}
