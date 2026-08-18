# Status — what's built, what's next

**Keep this file current.** It's the first thing to read when picking the project up cold, and the
last thing to update when work lands. `build.md` says what to build; this says how far along it is.

Last updated: 2026-08-18 (session controller landed). Pushed through `e6182a7`; nine more commits
sit on top locally, not yet pushed (`33c5c18`..`335256f`).

---

## Built and verified

**Documentation** — all three docs are settled and consistent with each other.
`CLAUDE.md` (rules), `docs/spec.md` (product reasoning, with an amendments block recording every
reversal), `docs/build.md` (the implementation spec, incl. the finalized visual system in §7).

**Project scaffold** — Vite + React + TypeScript + Vitest. `npm install`, `npm test`,
`npm run build`, and `npm run dev` all work.

**Content** (`src/data/`) — 17 memorization items across 3 paths, all verified Luther 1912 supplied
by the user, with source exports archived in `docs/` for provenance. German path names and blurbs
finalized. German book-name constant complete.

**The whole pure-logic layer** — `game/`, `srs/`, `storage/`, all pure functions with `now`/`rng`
injected, importing nothing from React:

| Module | Contains |
|---|---|
| `game/types.ts` | all types + constants + `blankProgress` / `createSaveData` |
| `game/random.ts` | `hashSeed`, `mulberry32`, `shuffle` — deterministic seeding |
| `game/text.ts` | `tokenize`, `bare`, `skeleton` — Unicode-aware |
| `game/round.ts` | `buildRound`, `decoysFor` |
| `game/reference.ts` | `parseRef`, `formatRef`, `nearNumbers` — incl. verse ranges |
| `game/erosion.ts` | `erosionStrip` — ⚠️ see loose ends |
| `srs/grading.ts` | `gradeText`, look-up + aloud marking — **no `gradeRef`**, see below |
| `srs/introduction.ts` | `introduceNewVerses` — the per-day cap |
| `srs/queue.ts` | `assembleQueue`, `isHeld(progress: { stage })` |
| `srs/session.ts` | `timeLeft`, `isOverrun` — pure clock arithmetic only |
| `storage/index.ts` | `load`, `persist`, `reset` — the only module touching `localStorage` |
| `data/licensing.ts` | `screenForCopyrightedText`, `hasPreReformOrthography` — automated copyright screen |

**147 tests passing**, covering every case enumerated in `build.md` §9 plus the licensing screen,
the stepping stone, and the session controller. `npm run build` type-checks clean (`@types/node`
added as a dev dependency to fix `licensing.test.ts`'s use of `node:fs`/`node:path`, which `tsc`
couldn't resolve without it).

**The address track lost its ladder** (`e6182a7`, following the docs commit `45f89be`). Gating the
stone's gold graduation on a second `refStage`/`refDue` ladder meant a forgotten book name could
hold a verse just short of mastery indefinitely — cut. The address question (Erkennen/Zuordnen/
Bilden, picked at random) now rides along with text review as a single ungated prompt: right or
wrong, it never touches `stage`; a miss just requeues it later in the same session. `isHeld` /
"held" now means `stage === 5` alone. `SCHEMA_VERSION` bumped to 2 — `storage/` already discards
any save with a mismatched version, so this needed no migration code, and there's no real user
data yet to lose. Full reasoning: `build.md` §7.3's design-decision callout, and `CLAUDE.md`'s
"the address question never gates the stone" hard rule.

**The stepping stone** (`build.md` §7.3) — `src/game/stone.ts`'s pure `stoneState(progress)`
(test-first, `stone.test.ts`) plus `src/components/SteppingStone.tsx`/`.css`. Three states off
`stage`/`introducedAt` alone: locked (dotted outline, `?`), cracked (one element, a
`conic-gradient` of 5 wedges over a `repeating-conic-gradient` seam layer, `--p1`…`--p5` driven by
a `healed` count), held (72px solid gold, `✓`). One design correction along the way: `healed` is
`stage`, not `stage - 1` — the original formula only ever reached 3-of-5 healed at the last cracked
stage, so reaching held silently healed *two* wedges (4 and 5) in the same instant it turned gold,
which read as a jump rather than a completion. `healed = stage` reaches 4-of-5, leaving exactly one
crack for graduation to close.

Graduation itself is two beats, not one: `SteppingStone` detects the cracked→held transition and
holds a transient "sealing" frame — all 5 wedges mended, still not gold, with a small breathing
pulse (`stone-seal` keyframe) — for 600ms before the existing gold cross-fade plays. This frame has
no backing `stage` value (there isn't a 6th rung to spare); it's inserted at the component level
via a `useState`/`useEffect` pair watching for that one edge, and skipped entirely under
`prefers-reduced-motion`. `stoneState` itself stays a pure 3-state function — see `CLAUDE.md`'s
Structure section for why the split lands there. A temporary gallery lives in `App.tsx`
(`StoneGallery`) showing every state plus a "watch it climb" button — scaffolding, remove once the
real Pfad trail exists.

**The session controller** (`build.md` §4.9–4.11, §6) — `src/session/controller.ts`'s pure
`reduce(state, action)` (test-first, 16 cases in `controller.test.ts`) plus the thin
`src/session/useSession.ts` React hook. Wires `introduceNewVerses` → `assembleQueue` →
`gradeText`/`markAloud`/`markLookedUpText` into the four-screen state machine
(Pfade → Pfad → Sitzung → Zusammenfassung). Two things worth knowing before touching it:

- **The invisible clock never ticks.** `isOverrun` is checked only at the moment an item
  finishes — there's no live countdown state to maintain. "Serve exactly one more, then stop" is a
  single `overrunExtraServed` flag: once set, the *next* item completion ends the session
  unconditionally, regardless of what's still queued.
- **A missed text/ref item and a Nachschlagen both requeue onto the session's own `queue` array**,
  separate from the `due`-date persistence `gradeText`/`markLookedUpText` already handle — this is
  what makes a miss "return later in the same session" per the acceptance criteria, on top of (not
  instead of) returning on a future day.

Session summary stats (`answered`, `firstTimeCorrect`, `rungsClimbed`, `held`) are computed by a
separate `summarize()` from a plain attempts log at session end, kept apart from the per-action
transition logic so each stays simple and independently testable. A temporary `SessionDebug` view
in `App.tsx` drives the whole reducer — pick a path, start a session, grade items, watch the
summary land — same scaffolding pattern as `StoneGallery`, and the real place `SteppingStone` and
this controller meet is the Pfad/Sitzung screens, not yet built.

**The visual foundation** (`build.md` §7.1–7.2) — `src/styles/tokens.css` holds the full light/dark
token table (three-state theming: bare `:root`, `prefers-color-scheme` media guard, `[data-theme]`
override) plus four `--font-*` variables. The four faces (Bevan, Karla, EB Garamond, IBM Plex Mono)
are self-hosted via `@fontsource/*` packages — Vite bundles their `.woff2`/`.woff` files locally at
build time, so there's no CDN call at runtime. `App.tsx`'s placeholder now renders through the real
tokens/fonts as a smoke test (pulling its sample verse from `verses.de.ts`, not hand-typed).

**Copyright screening is automated.** `npm test` fails if any shipped verse carries markers of a
copyrighted translation, and also screens any Logos export sitting in `docs/` locally — so a bad
export trips the suite before its text can be ingested. It matches provenance tags loosely
(`lu84`, `lut84`, `lutbib1984`, `LUT2017`, …) *and* the text itself via reformed spellings and
known 1984 wordings, so stripping the tags doesn't get past it.

---

## Not built yet

Roughly in dependency order.

1. **The four screens** (`build.md` §6) — Pfade, Pfad (the trail), Sitzung (seven exercise
   variants), Zusammenfassung. Sitzung is by far the biggest — it needs `buildRound`, `decoysFor`,
   `skeleton`, and `parseRef`/`formatRef`/`nearNumbers` wired to `useSession`'s current item to
   actually render the seven exercise bodies, none of which the controller builds itself. Pfad is
   where `SteppingStone` gets a real home, replacing the temporary `App.tsx` gallery; the debug
   view's buttons (`Richtig`/`Falsch`/`Nachschlagen`/`Gesagt`/`Beenden`) map directly to
   `useSession`'s existing `answer`/`lookup`/`aloudDone`/`endSession` actions, so the screens are
   presentation on top of what's already wired, not new logic.
2. **`src/i18n/de.ts`** — currently holds only `appName`. Every user-facing string belongs here as
   screens get built, so a second locale stays possible.

---

## Loose ends and risks

- **GitHub remote is configured and pushed to** (`origin` → `davidreyes3/memorize-scriptures-game`,
  up to date through `e6182a7`). An unauthenticated API check returned 404, which is how GitHub
  hides private repos from the public — so it's **likely private**, but that was inferred, not
  confirmed directly on github.com. Worth a quick look there before it matters. Commit identity is
  set repo-locally to a GitHub noreply address, so the real email stays out of history either way.
- **`game/erosion.ts` may be dead code.** It implements `spec.md` §8's word-decaying strip, is
  fully tested, but the trail redesign gave its Pfade-card job to the 3-dot mini-trail, and stone
  plaques use a plain quote snippet instead. Decide whether it has a home (a single-stone detail
  view?) or gets deleted. Tracked in `build.md` §11.
- **The retrieval gap from cutting the Deploy round** — deliberately deferred until the app has
  been used. Full reasoning in `build.md` §11.
- **The app name is still "Engrave"**, a placeholder, isolated in `src/i18n/de.ts`. Renaming is a
  separate research task that must not block programming.
- **Two doctrine paths are blocked on re-export** — Baptism and Salvation were supplied as Luther
  **1984** (copyrighted) and rejected. Re-export from Logos with the *Lutherbibel 1912* resource
  active to add them. Details in `build.md` §8.

---

## Environment notes

- **Neither Node nor git is on the shell PATH**, though both are installed — Node 26.7.0 at
  `C:\Program Files\nodejs`, git 2.55 at `C:\Program Files\Git\cmd`. Every command needs:
  ```powershell
  $env:Path += ";C:\Program Files\nodejs;C:\Program Files\Git\cmd"
  ```
  This does not persist between tool calls — re-add it each time.
- **Git identity is set repo-locally, not globally** (`git config user.name` / `user.email` inside
  this repo). Other projects on this machine are unaffected and still have no global identity.
- The commit convention — message format, when to commit, and the mandatory scripture-licensing
  check before staging verse data — is documented in `CLAUDE.md` under *Committing*.
- `npm audit` reports vulnerabilities in the **dev-only** Vite/esbuild toolchain (a dev-server
  CORS issue). Not a runtime risk for an offline app with no backend; fixing means a major Vite
  version bump. Deliberately left alone.
- `esbuild`'s postinstall script is approved in `package.json` under `allowScripts` — it needs to
  run to fetch its native binary, or Vite and Vitest won't work at all.
