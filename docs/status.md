# Status — what's built, what's next

**Keep this file current.** It's the first thing to read when picking the project up cold, and the
last thing to update when work lands. `build.md` says what to build; this says how far along it is.

Last updated: 2026-08-18 (v1, then five rounds of user-feedback fixes). Pushed through `1cb5963`;
two more commits sit on top locally, not yet pushed (`9a4e6fc`..`c1b1575`).

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
| `srs/introduction.ts` | `introduceNewVerses` — one-verse-at-a-time unlocking per path; no daily cap |
| `srs/queue.ts` | `assembleQueue`, `isHeld(progress: { stage })` |
| `srs/session.ts` | `timeLeft`, `isOverrun` — pure clock arithmetic only |
| `storage/index.ts` | `load`, `persist`, `reset` — the only module touching `localStorage` |
| `data/licensing.ts` | `screenForCopyrightedText`, `hasPreReformOrthography` — automated copyright screen |

**151 tests passing**, covering every case enumerated in `build.md` §9 plus the licensing screen,
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

Graduation itself is two beats, not one: a transient "sealing" frame — all 5 wedges mended, still
not gold, with a small breathing pulse (`stone-seal` keyframe) — holds for 600ms before the gold
cross-fade plays (0.65s, synced with the `stone-graduate` keyframe). This frame has no backing
`stage` value (there isn't a 6th rung to spare). `stoneState` itself stays a pure 3-state function —
see `CLAUDE.md`'s Structure section for why the split lands there. Rendered for real on the Pfad
trail (`PfadScreen.tsx`); the old `App.tsx` gallery is gone.

**The graduation animation didn't actually play, and the fix wasn't a CSS tweak.** User feedback
("very abrupt going from gray to gold") turned out to be literally true: `App.tsx` swaps screens
rather than keeping them mounted, so the Pfad screen — and every `SteppingStone` on it — unmounts
the instant a session starts and remounts fresh, already in its final state, once the user returns.
The component never witnessed a live cracked→held transition to animate; there was also a real
one-frame flash in the old ref-based detection (`useEffect` runs after paint, so a bare
`data-state="held"` frame briefly rendered before snapping to the sealing look). Fixed by inverting
the design: `session/controller.ts` now tracks `justGraduated: VerseId[]` — verses that crossed into
held during the session just finished, populated in `completeCurrentItem`, deliberately *not*
cleared by `BACK_TO_PATHS` (the Pfad screen needs it after the round trip through Zusammenfassung),
cleared on the next `START_SESSION`. `PfadScreen` passes it down per stone; `SteppingStone` treats
it as a mount-time-only signal (a `useState` lazy initializer, no ref, no live-transition
detection) — correct precisely because it never relies on witnessing a change, only on being told
"you should open already sealing." Verified with `controller.test.ts` (the `justGraduated` tracking
itself) and a real Playwright run driving a verse from stage 1 to held across several actual
sessions, confirming via `MutationObserver` that `sealing -> held` now genuinely plays on remount.

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
transition logic so each stays simple and independently testable. `summary.timeMs` (elapsed session
time) was added once `ZusammenfassungScreen` needed it — the one place elapsed time is ever shown,
since it's after the session ends, never during it (§4.11). `SET_NEW_PER_DAY` and `HYDRATE` (used
for a full progress reset) round out the action set for the Pfade screen's settings.

**The four screens** (`build.md` §6) — `PfadeScreen`, `PfadScreen`, `Sitzung` (+ `exercises.tsx`
for the seven bodies), `ZusammenfassungScreen`, wired together in `App.tsx` by `screen` alone —
this is v1: the app is playable end to end, `npm run dev` and pick a path. No new logic landed
here; every screen is presentation over what `session/controller.ts` and `game/`/`srs/` already do.

- **Sitzung's graded bodies hold a local verdict before dispatching.** The controller advances
  `current` the instant `answer()`/`lookup()` is called, but the spec wants a verdict block *before*
  advancing — so cloze/Erkennen/Zuordnen/Bilden compute correctness themselves (comparing against
  `buildRound`'s window or `parseRef`'s parts), show right/wrong locally, and only call `onAnswer`
  once the user taps *Weiter*. `Lesen` and *Aloud* skip this — they're explicitly "not graded," so
  tapping the one button advances immediately.
- **Rung 5 (Kalt) reuses the same cloze body as rungs 2–4**, not a separate skeleton/tap-in-order
  exercise. The original build had one — first-letter skeleton, tiles tapped in a forced sequence,
  slip counting — but user feedback after actually using it was that this was more annoying than
  useful, so it's gone. `windowedSkeleton` (`game/text.ts`) went with it, since it only ever existed
  to back that rendering; `skeleton()` itself stays, since it's still `build.md`'s documented
  contract independent of what currently calls it (same status as `erosion.ts` below).
- **The address-`Bilden`/`Erkennen` decoy addresses use `nearNumbers` on chapter and verse**,
  combined with the verse's own book; `Zuordnen`'s decoy texts are three other verses picked at
  random via the same seeded-`rng`-per-item pattern everything else here uses
  (`hashSeed(verse.id, seen, salt)`), so a body's options are stable across re-renders without
  memoization.
- **Verses now unlock one at a time within a path** (`srs/introduction.ts`) — a verse is only
  introducible once the one before it in its path is held, not just "up to `newPerDay` in
  declaration order" as originally built. This is a gate on introduction only; once introduced a
  verse stays introduced regardless of later review outcomes. See `introduction.test.ts` for the
  unlock-on-mastery / paths-unlock-independently cases.
- **The daily `newPerDay` cap is gone entirely, not just its UI.** Once unlocking became
  sequential, the user pointed out it had nothing left to bound — you already can't get more than
  one verse "in flight" per path, and tapping the next stone whenever you want to keep going is
  already the right pace. `settings`/`introductions` are gone from `SaveData` (`SCHEMA_VERSION`
  bumped to 3, no migration needed — see `storage/`'s existing "unknown version degrades to
  defaults" rule), and `introduceNewVerses` just introduces every currently-eligible candidate on
  every call. `PfadeScreen`'s stepper and `capReached` messaging are gone with it.
- **`due` only gates a verse once it's held** (`srs/queue.ts`). It used to gate `text`/`ref`
  regardless of `stage`, so `gradeText`'s interval bump (up to 21 days, even mid-climb) could stall
  the one verse a path leaves you anything to do on, once sequential unlocking meant there's nothing
  else in that path to fall back to. The user's framing was "let me keep going with the stone I'm
  working on" — not a force flag, but a narrower due-gate: `!isHeld(p) || p.due <= now`. A verse
  below stage 5 is now always due; a held verse still respects its review schedule exactly as
  before, matching "it comes up to practice again according to the algorithm" from an earlier round.
- **`Trotzdem üben` is gone.** With unlocking sequential, the held verses in a path always form a
  prefix, so there's always at most one "active" stone — that stone is now the tap target itself
  (`PfadScreen`, pulses gently via `trail-stone-active`), starting a session with no way to force
  practice ahead of what's actually due. A stone that's technically still un-introduced but *is*
  the active one gets an opacity/outline override so it doesn't read as inert the way a genuinely
  future-locked stone does.
- **Two bugs were found by actually running the app** (Playwright against the dev server, not just
  `tsc`/`vitest`) and are fixed, not just noted: `PfadeScreen`/`PfadScreen` were computing "ready"
  from the queue *before* `introduceNewVerses` ran, so a first-time visit always read "Alles
  erledigt" instead of "Los geht's" — both now project `introduceNewVerses` first, same as
  `START_SESSION` will actually do. And the trail's stones were positioned with raw pixel
  `left`/`top` matching the SVG `viewBox`'s units, which only lined up with the drawn path at
  exactly 520px — narrower phones cut plaques off past the edge. Fixed by moving to a 0–100
  abstract x-axis (`preserveAspectRatio="none"` on the SVG, `left: X%` on the stone divs), so the
  two always agree at any width.
- **What looked like a third bug — "it never gets past the same scriptures" — was the daily
  `newPerDay` cap plus `Trotzdem üben`** re-serving already-held verses with no signal explaining
  why nothing new appeared. Fully resolved now: sequential unlocking, no `Trotzdem üben`, and no
  daily cap left to hit in the first place.

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

Everything load-bearing from `build.md` is now built. What's left is refinement, not new features:

1. **Visual polish pass against `build.md` §7 in the browser.** The four screens use the real
   tokens/fonts and are functionally complete and verified end to end (see below), but haven't had
   a dedicated design pass — spacing, the verdict-block treatment, and the trail's curve are all
   "reasonable v1," not checked against the mockup artifact referenced in §7.
2. **`window.confirm`/`window.alert`** are used for the reset confirmation (`PfadeScreen`) — fine
   functionally, but a native browser dialog rather than an in-app one; revisit if it looks out of
   place next to everything else.
3. Everything in *Loose ends and risks* below.

---

## Loose ends and risks

- **`src/i18n/de.ts`'s UI copy (button labels, prompts, stat labels) was written for v1 and hasn't
  had a native-speaker pass** — it's plain, direct German, not reviewed for tone or naturalness the
  way the path names/blurbs and scripture text have been. Worth a look before this is shown to
  anyone.
- **End-to-end verification of this pass was an ad hoc Playwright script run against the dev
  server, not a committed test.** It drove all four screens and all seven exercise bodies (seeding
  `localStorage` directly to reach every rung without waiting on real spaced-repetition scheduling)
  at 320/375/520px, confirmed no console errors, and is what caught the two bugs described above.
  The script itself wasn't kept — `npm test` covers the logic layer; the screens have no automated
  test of their own yet.
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
