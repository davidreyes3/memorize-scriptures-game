# Status — what's built, what's next

**Keep this file current.** It's the first thing to read when picking the project up cold, and the
last thing to update when work lands. `build.md` says what to build; this says how far along it is.

Last updated: 2026-08-16.

---

## Built and verified

**Documentation** — all three docs are settled and consistent with each other.
`CLAUDE.md` (rules), `docs/spec.md` (product reasoning, with an amendments block recording every
reversal), `docs/build.md` (the implementation spec, incl. the finalized visual system in §7).

**Project scaffold** — Vite + React + TypeScript + Vitest. `npm install`, `npm test`,
`npm run build`, and `npm run dev` all work. Fonts are **not** self-hosted yet.

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
| `srs/grading.ts` | `gradeText`, `gradeRef`, look-up + aloud marking |
| `srs/introduction.ts` | `introduceNewVerses` — the per-day cap |
| `srs/queue.ts` | `assembleQueue`, `isHeld` |
| `srs/session.ts` | `timeLeft`, `isOverrun` — pure clock arithmetic only |
| `storage/index.ts` | `load`, `persist`, `reset` — the only module touching `localStorage` |
| `data/licensing.ts` | `screenForCopyrightedText`, `hasPreReformOrthography` — automated copyright screen |

**130 tests passing**, covering every case enumerated in `build.md` §9 plus the licensing screen.
`npm run build` type-checks clean.

**Copyright screening is automated.** `npm test` fails if any shipped verse carries markers of a
copyrighted translation, and also screens any Logos export sitting in `docs/` locally — so a bad
export trips the suite before its text can be ingested. It matches provenance tags loosely
(`lu84`, `lut84`, `lutbib1984`, `LUT2017`, …) *and* the text itself via reformed spellings and
known 1984 wordings, so stripping the tags doesn't get past it.

---

## Not built yet

Roughly in dependency order.

1. **The visual foundation** — CSS custom-property token system from `build.md` §7.1, both themes,
   and the four self-hosted `.woff2` faces from §7.2. Nothing else can look right until this lands.
2. **The stepping-stone component** (`build.md` §7.3) — four states, the 5-wedge cracked stone, the
   two-stage graduation. The single most important new component; build it first and in isolation.
3. **The session controller** — the stateful layer wiring pure `game/`/`srs/` functions to React:
   current screen, active queue, round in progress, the invisible five-minute clock and its
   "serve exactly one more item, then stop" rule (§4.11). This is the only genuinely new *logic*
   left; everything else is presentation.
4. **The four screens** (`build.md` §6) — Pfade, Pfad (the trail), Sitzung (seven exercise
   variants), Zusammenfassung. Sitzung is by far the biggest.
5. **`src/i18n/de.ts`** — currently holds only `appName`. Every user-facing string belongs here as
   screens get built, so a second locale stays possible.
6. **`src/components/`** — doesn't exist yet.

---

## Loose ends and risks

- **No GitHub remote configured yet.** The repo is local-only, so there's still no offsite backup.
  A GitHub repository exists but its URL hasn't been wired up, and **its public/private status is
  unconfirmed** — worth checking before the first push, since that decides whether an accidental
  copyrighted-verse commit would be a public distribution. Commit identity is set repo-locally to
  a GitHub noreply address, so the real email stays out of history either way.
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
