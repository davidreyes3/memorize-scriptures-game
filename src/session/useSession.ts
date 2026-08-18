// Thin React wiring for the session controller — no logic of its own beyond
// supplying real Date.now()/Math.random() and persisting on every save change.
// The state machine itself lives in controller.ts, pure and tested there.
import { useEffect, useReducer } from "react";
import type { PathId, Verse } from "../game/types";
import { load, persist, reset } from "../storage";
import { createInitialState, reduce } from "./controller";

export function useSession(verses: readonly Verse[]) {
  const [state, dispatch] = useReducer(reduce, undefined, () => createInitialState(load(verses), verses));

  useEffect(() => {
    persist(state.save);
  }, [state.save]);

  return {
    state,
    selectPath: (pathId: PathId) => dispatch({ type: "SELECT_PATH", pathId }),
    backToPaths: () => dispatch({ type: "BACK_TO_PATHS" }),
    startSession: () => dispatch({ type: "START_SESSION", now: Date.now(), rng: Math.random }),
    answer: (ok: boolean) => dispatch({ type: "ANSWER", ok, now: Date.now(), rng: Math.random }),
    lookup: () => dispatch({ type: "LOOKUP", now: Date.now(), rng: Math.random }),
    aloudDone: () => dispatch({ type: "ALOUD_DONE", now: Date.now(), rng: Math.random }),
    endSession: () => dispatch({ type: "END_SESSION" }),
    resetProgress: () => dispatch({ type: "HYDRATE", save: reset(verses) }),
  };
}
