# Engrave — implementation spec

**This is the *how*.** [`spec.md`](spec.md) is the *why and what* and stays the reasoning
document; where the two disagree, **this file wins**. The frozen prototype at
[`../prototype/engrave.html`](../prototype/engrave.html) is the behavioural reference —
read it to answer "how should this feel?", never develop in it.

Status: no application code exists yet. Everything below is the target.

---

## 1. Product in one paragraph

A verse memorization app for a German-speaking, UCG-doctrine-aligned audience. Each verse is
learned on a **five-rung word ladder**, with an address question (book, chapter, verse) riding
along as ungated practice. Exercises are **generated from the verse text itself**, never authored
per verse. A session is **five minutes**, with the cap kept fully invisible (§4.11). Everything
runs locally in the browser, offline.

Two constraints govern every decision:

1. **Zero authoring per verse.** Adding a verse = adding a reference and its text. Nothing else.
2. **Five minutes is the promise.** The queue bends to the clock, never the reverse.

---

## 2. Decisions that override `spec.md`

`spec.md` was written KJV-only and English-only, and left four questions open. All are now settled.

| Topic | Decision | Supersedes |
|---|---|---|
| Scripture text | **Luther 1912** first; KJV added later | §2 |
| UI language | **German**; all strings in `src/i18n/` so English can follow | new |
| Verse text source | **The user supplies it.** Never write scripture from memory | new |
| Repo scope | This module only, not the larger Bible app | §1 |
| Deploy round | **Cut for v1** | §6, §10.3 |
| Long verses | **Cap rung 5 at `MAX_WINDOW`**, like rung 4. No authored split points | §10.1 |
| New verses per day | **2**, counted globally across all paths | §10.2 |
| Aloud gating | Never gates progression | §10.4 |
| TTS | None. The user speaks; the app is silent | stray §11 mention |
| Interaction | **Tap only.** No drag-and-drop, no typing | §9 (confirms) |
| Architecture | React + Vite + TypeScript + Vitest | §1 (confirms) |
| Persistence | `localStorage` only | new |
| Visual identity | **Reversed.** A pilgrimage trail — verses as stepping stones, moss/stone/brass, daylight — replaces spec §9's dark manuscript look. See §7 | §9 (reverses) |
| Session timer | **Reversed. Fully invisible** — no countdown, no draining bar, anywhere | §4 (reverses) |
| Address track | **Cut as a second ladder.** No `refStage`/`refDue`/gold-gating — it's one ungated question riding along with text review (§4.5, §4.10, §7.3) | §3 (reverses); also reverses an earlier `build.md` §7.3 pass |

Cutting Deploy removes what §6 calls *"the point of the whole module"* — a deliberate call.
The upside: **zero-authoring is now absolute.** No hand-written content remains anywhere in the app.

---

## 3. Data types

```ts
type VerseId  = string;
type PathId   = string;
type TextRung = 1 | 2 | 3 | 4 | 5;

interface Verse {
  id:   VerseId;
  path: PathId;
  ref:  string;   // German form: "1. Mose 1,1"
  text: string;   // Luther 1912, transcribed exactly. Never generated.
}

interface Path {
  id: PathId;
  name: string;
  blurb: string;
}

interface VerseProgress {
  stage:        TextRung;       // the only ladder
  due:          number;         // epoch ms; 0 = due now
  seen:         number;         // repeat counter; drives the window shift
  lastAloud:    number;         // epoch ms; 0 = never
  introducedAt: number | null;  // null = not yet in rotation
}

interface SaveData {
  schemaVersion: number;
  progress:      Record<VerseId, VerseProgress>;
}
```

New verses start `{ stage:1, due:0, seen:0, lastAloud:0, introducedAt:null }`.

> ⚠️ **Deviation from an earlier pass.** `VerseProgress` used to carry `refStage`/`refDue` — a
> second 3-rung ladder for the address (book, chapter, verse) that gated its own "gold" graduation.
> Cut: see the design decision in §7.3. The address question still exists (§4.5, §4.10) — it just
> no longer owns any scheduled state.

> ⚠️ **Deviation from an earlier pass.** `SaveData` used to also carry `introductions` (a
> `"YYYY-MM-DD" -> count` map) and `settings.newPerDay`, backing a daily cap on how many verses
> could be introduced at once. Cut once introduction became sequential per path (§4.9) — with a
> verse only unlockable after the one before it in its path is held, the cap had nothing left to
> bound; the user pointed out that tapping the next stone whenever you want to keep going is
> already the right pace, and a settings knob for it was one more thing to explain. `SCHEMA_VERSION`
> bumped to 3 for the shape change.

### Constants

| Name | Value | Meaning |
|---|---|---|
| `FRACTION` | `[0, 0, .3, .6, 1, 1]` | share of the verse hidden, indexed by text rung |
| `DECOYS` | `[0, 0, 0, 1, 2, 3]` | spare words in the bank, by text rung |
| `INTERVALS` | `[0, 1, 2, 4, 9, 21]` | days until next review, by rung reached |
| `MAX_WINDOW` | `14` | most words hidden at once — **now applies at rung 5 too** |
| `MIN_WINDOW` | `3` | fewest, unless the verse is shorter |
| `SESSION_MS` | `300_000` | five minutes |
| `ALOUD_GAP_MS` | `7 * 86_400_000` | how often a held verse is read aloud again |
| `EROSION_MAX_CHARS` | `60` | how much of a verse the erosion strip shows before truncating |
| `SCHEMA_VERSION` | `3` | bump on any `SaveData` shape change |

Rung names: `["Lesen","Satzteil","Abschnitt","Aufbau","Kalt"]`.
Address question forms: `["Erkennen","Zuordnen","Bilden"]` — not rungs, just three shapes of the
same ungated question, picked at random each time one rides along (§4.10).

---

## 4. Algorithms

**The rule that makes this testable:** every function in `game/` and `srs/` is **pure**. Time and
randomness are injected — `now: number` and `rng: () => number` are parameters, never
`Date.now()` or `Math.random()` called inside. Nothing in these folders imports React.

### 4.1 Seeded randomness

```ts
function hashSeed(...parts: Array<string | number>): number  // FNV-1a over the joined parts
function mulberry32(seed: number): () => number              // returns [0,1)
function shuffle<T>(items: T[], rng: () => number): T[]      // Fisher–Yates, non-mutating
```

Any round built from `(verseId, seen)` must reproduce exactly. This is what makes round
construction assertable in tests.

### 4.2 Text handling

```ts
tokenize(text: string): string[]     // text.trim().split(/\s+/)
bare(word: string): string           // word.replace(/[^\p{L}']/gu, "")
```

Punctuation **stays attached to its word** — a tile is never bare punctuation. `„Wort"` is one tile.

> ⚠️ **Deviation.** The prototype's `bare()` uses `/[^A-Za-z']/g`
> ([engrave.html:251](../prototype/engrave.html#L251)), which deletes **ä ö ü ß**. `Väter` became
> `Vter`, breaking decoy de-duplication and the "not in target verse" check. Now Unicode-aware.

### 4.3 Round construction

```ts
buildRound(verse: Verse, stage: TextRung, seen: number): Round

interface Round {
  tokens: string[];    // the whole verse
  window: number[];    // contiguous indices being hidden
  bank:   string[];    // shuffled: window words + decoys
  placed: number[];    // indices into bank, in the order tapped
}
```

```
len    = tokens.length
n      = min(len, MAX_WINDOW, max(MIN_WINDOW, round(len * FRACTION[stage])))
room   = len - n
rng    = mulberry32(hashSeed(verse.id, seen))
start  = room <= 0 ? 0 : floor(rng() * (room + 1))
window = [start … start + n - 1]
bank   = shuffle([...window.map(i => tokens[i]), ...decoysFor(verse, DECOYS[stage], rng)], rng)
```

> ⚠️ **Deviation.** The prototype used `start = (seen*5 + random(room)) % (room+1)`
> ([engrave.html:483](../prototype/engrave.html#L483)). That mixes a counter with live
> `Math.random()`, so identical inputs give different windows and it cannot be asserted on.
> A pure fixed stride (`seen*5`) was also rejected: when `room+1` is 5 or 10 the window
> barely moves — `gcd(5, 10) = 5` gives a two-position cycle. The seeded PRNG is
> deterministic, testable, and well distributed.

**Edge cases:** verses shorter than `MIN_WINDOW` use `n = len`. When `room === 0` the window is
the whole verse and `start` is 0.

### 4.4 Decoys

```ts
decoysFor(verse: Verse, n: number, rng: () => number): string[]
```

Pool = every other verse **in the same path** → `tokenize` → `bare` → keep length > 3 → drop any
word present in the target verse (case-insensitive) → de-duplicate → `shuffle(rng)` → take `n`.

Same register as the target, plausible, and free — no authoring. Returns `[]` when `n` is 0.

> **Edge case the prototype ignores:** a path holding one verse has an empty pool, so fewer decoys
> than requested come back. That is allowed. It must not throw, and the UI must not assume
> `bank.length === window.length + DECOYS[stage]`.

### 4.5 Grading

```ts
gradeText(p: VerseProgress, ok: boolean, now: number): VerseProgress
```

| | pass | fail |
|---|---|---|
| Text | `stage = min(5, stage+1)`, `due = now + INTERVALS[stage]·day` | `stage = max(2, stage-1)`, `due = 0`, requeued this session |

`seen` increments on every graded text round, pass or fail. The rung floors at 2 — a miss never
sends a verse back to *Lesen*.

**The address question (Erkennen/Zuordnen/Bilden, picked at random) carries no rung of its own.**
It rides along with text review (§4.10) as a single ungated prompt. A pass records nothing beyond
the session's tally; a fail just requeues the same question later in the same session, exactly like
a missed text round. It never touches `stage`, and there is no `refStage`/`refDue` to update.

> **Deviation from an earlier pass.** The address track used to be its own 3-rung ladder
> (`refStage`/`refDue`/`REF_INTERVALS`, graded by a `gradeRef`) that gated a second "gold"
> graduation. Cut — full reasoning for both the original split and the later cut is in §7.3.

**Pass criteria:** fill rounds (2–4) require an exact word-for-word match. *Kalt* (5) and address
*Bilden* pass at **`slips <= 1`**.

**Look it up** — always available, always costs the round: no verdict is recorded, `stage` is
unchanged, and (for text) `due = 0` so the verse returns the same day. The round is not requeued.

### 4.6 The Cold rung and long verses

> ⚠️ **Deviation.** The prototype's `exCold` puts the *entire* verse on tiles
> ([engrave.html:525](../prototype/engrave.html#L525)), so 1. Korinther 15,52 demands 31 taps —
> §10.1 flags this as a genuine mobile problem.

*Kalt* now uses the **same windowing as every other rung**, so `MAX_WINDOW` applies:

- Words **outside** the window render in full, in the serif face.
- Words **inside** the window render as **first letters only**, filling in as they are tapped in order.
- 3 decoys, per `DECOYS[5]`.

For verses of 14 words or fewer the window is the whole verse and behaviour is identical to the
prototype. Only long verses change. No authored split points, so zero-authoring holds.

### 4.7 Skeleton rendering

```ts
skeleton(tokens: string[], revealCount: number): SkeletonPart[]
```

Words before `revealCount` render in full. The rest render as **first letter + any trailing
punctuation** (`Anfang,` → `A,`). A word with no letter renders `·`.

> ⚠️ **Deviation.** Prototype matched the first letter with `/[A-Za-z]/`
> ([engrave.html:265](../prototype/engrave.html#L265)), so *Ägypten* rendered as `·`. Use `/\p{L}/u`.

### 4.8 German references

```ts
parseRef(ref: string): { book: string; chapter: number; verse: number; verseEnd?: number }
formatRef(parts): string
```

Pattern: `/^(.+?)\s+(\d+),(\d+)(?:–(\d+))?$/` — German uses a **comma**, book names may carry an
ordinal prefix (`1. Mose`, `2. Timotheus`), and a memorization item may span a **verse range**
like `1. Mose 2,2–3` using an **en dash (–, U+2013)**, never a hyphen. Malformed input throws.

A ranged item is still exactly one `Verse` — one reference, one concatenated `text` covering every
verse in the range. The address-*Bilden* exercise (build the reference from tiles) only ever
targets the **start** verse number; `verseEnd` is a display-only detail the user never has to
reconstruct.

> ⚠️ **Deviation.** The prototype expects `Book 1:1` with a colon
> ([engrave.html:252](../prototype/engrave.html#L252)). Both the parser and the address-*Bilden*
> exercise need this.

`BOOKS` (German, for the address word bank — a one-time constant, never revisited):

```
1. Mose, 2. Mose, 3. Mose, 4. Mose, 5. Mose, Josua, Psalm, Sprüche, Prediger, Jesaja,
Jeremia, Hesekiel, Daniel, Hosea, Maleachi, Matthäus, Markus, Lukas, Johannes,
Apostelgeschichte, Römer, 1. Korinther, 2. Korinther, Galater, Epheser, Philipper,
Kolosser, 1. Thessalonicher, 1. Timotheus, 2. Timotheus, Titus, Hebräer, Jakobus,
1. Petrus, 1. Johannes, Judas, Offenbarung
```

Chapter and verse options are near-misses around the true number: `{n, n±1, n±2, n+3, n+7}`,
floored at 1, de-duplicated, six shown.

### 4.9 Introducing new verses

**New — nothing in the prototype does this.** All verses currently start `due: 0`
([engrave.html:229](../prototype/engrave.html#L229)), so all 11 arrive at once. With a larger
library that guarantees a queue that never clears.

```ts
introduceNewVerses(save: SaveData, verses: Verse[], now: number): SaveData
```

Called once at session start, **before** queue assembly. Verses unlock **one at a time within a
path**, stepping-stone style: for each path, take its first verse with `introducedAt === null`, and
introduce it only if the verse immediately before it in that path (if any) is held (`stage === 5`).
A path with no held verses yet still gets its first verse introduced immediately — there's no
predecessor to wait on. Stamp `introducedAt = now` for every verse introduced this way, across every
path that currently has an eligible candidate.

Verses with `introducedAt === null` **never enter a queue**. This is a gate on introduction only:
once introduced, a verse stays introduced even if a later review drops it back below `stage === 5`.

> ⚠️ **Deviation from an earlier pass.** This used to be capped globally across all paths by a
> user-adjustable `settings.newPerDay` (default `DEFAULT_NEW_PER_DAY = 2`), independent of mastery —
> "introduce up to N verses a day, in declaration order," full stop. Cut once unlocking became
> sequential: with a verse only introducible after the one before it in its path is held, the daily
> cap no longer bounded anything real. The user's own framing: once you can just tap the next stone
> whenever you want to keep going, a separate setting for "how many new ones per day" has nothing
> left to do. `settings`/`introductions` are gone from `SaveData` entirely (§3).

### 4.10 Session queue

```ts
assembleQueue(pathId: PathId, save: SaveData, verses: Verse[], now: number, rng): QueueItem[]
type QueueItem = { kind: "text" | "ref" | "aloud"; id: VerseId };
```

For each **introduced** verse in the path:

| Kind | Condition |
|---|---|
| `text` | `!isHeld(p)` **or** `due <= now` — see deviation below |
| `ref` | same as `text` **and** `stage >= 2` — rides the text review; no schedule of its own |
| `aloud` | `stage >= 3` **and** `now - lastAloud > ALOUD_GAP_MS` |

Shuffle the result. `aloud` is **not a test** — it shows the verse, asks the user to say it, resets
the timer on "Gesagt", and grades nothing. It never gates progression (§10.4). `ref` **is** graded
(right/wrong feeds the verdict block) but never gates progression either — see §4.5.

> ⚠️ **Deviation from an earlier pass.** `text`/`ref` used to be gated on `due <= now` regardless of
> `stage`, so `gradeText`'s interval bump (up to `INTERVALS[stage]` days, even mid-climb) could block
> the one verse a path's sequential unlocking (§4.9) leaves you anything to do on. Cut: `due` now
> only gates a verse once it's **held** (`stage === 5`) — spaced review of something already
> mastered, which is what the interval table is actually for. A verse still being learned is always
> due. This is what "the stone I'm working on" being freely repeatable (the user's framing) turned
> out to mean structurally — not a force flag, a narrower due-gate.

> ⚠️ **Deviation from an earlier pass.** `assembleQueue`'s `force` parameter used to back a
> **"Trotzdem üben"** UI escape hatch that assembled a queue ignoring due dates when nothing was
> due. The button is gone (§6, §7.3's Pfad description) — with introduction sequential (§4.9) there's
> always at most one active stone to tap, and forcing practice ahead of the algorithm's own schedule
> wasn't something the user wanted. `force` itself stays on `assembleQueue`, unused by the UI, since
> it's cheap to keep and nothing currently calls it with `true` — it still has a real job for a
> **held** verse (review it ahead of its own due date), which the due-gate change above doesn't touch.

### 4.11 Session clock

`timeLeft = max(0, SESSION_MS - (now - startedAt))`.

> ⚠️ **Deviation from spec.md §4.** The spec calls for the clock to be *"real and visible... shown
> as a countdown and a draining bar."* That's reversed: **the timer is fully invisible.** No
> countdown, no draining bar, no numeric badge anywhere in the UI — the five-minute cap is an
> ambient background constraint the user never sees a display of. This fits the trail metaphor
> (§7): nobody watches a stopwatch while walking a path, they just walk until they're done for
> the day. The underlying mechanic is unchanged — `timeLeft`/`isOverrun` (`srs/session.ts`) are
> still pure functions the session controller polls internally — only the display is gone.

At zero the session does **not** cut off mid-question: the current item finishes, **exactly one
more** is served, then the session ends — straight to the Zusammenfassung screen, with no
forewarning label, since there is no visible clock for a warning to attach to. Anything still due
rolls to tomorrow.

---

## 5. Module contracts

```
src/
  game/        tokenize, bare, buildRound, decoysFor, skeleton, erosionStrip,
               parseRef, formatRef, hashSeed, mulberry32, shuffle
  srs/         gradeText, introduceNewVerses, assembleQueue,
               isHeld, dueLabel
  storage/     load(), save(), reset()  — localStorage, key "engrave.save"
  data/        verses.de.ts, paths.de.ts, books.de.ts
  i18n/        de.ts  (every user-facing string; the app name lives here too)
  components/  React only
```

**`game/` and `srs/` import nothing from React and touch no browser globals.** They are plain
functions over plain data. This is the single most important structural rule in the project.

`storage/` is the only module allowed to touch `localStorage`. On load: parse, and if
`schemaVersion` is missing or newer than `SCHEMA_VERSION`, **return defaults without overwriting
the stored value** — never silently destroy progress. Any parse failure degrades to defaults.

> ⚠️ **Deviation.** The prototype persists through `window.storage.get/set`
> ([engrave.html:234](../prototype/engrave.html#L234)). That is the **Claude Artifacts runtime
> API, not a browser API** — it does not exist in a Vite app and must become `localStorage`.

`erosionStrip(verse, stage)` keeps `[1, 1, .7, .4, .15, 0][stage]` of the shown words in full and
reduces the rest to first letters — the progress bar and study aid in one (`spec.md` §8).

> ⚠️ **Deviation.** The prototype shows a fixed **first 11 words**
> ([engrave.html:272](../prototype/engrave.html#L272)). German compounds — *Schöpfungsordnung*,
> *Apostelgeschichte* — make a word count the wrong unit: 11 German words routinely overflow the
> 520 px column while 11 short words underfill it. Instead accumulate words until the running
> length would exceed `EROSION_MAX_CHARS` (60), then stop and append `…`. Always show at least
> three words, however long they are.

---

## 6. Screens

Four. Deploy is cut.

**Pfade (paths list)** — masthead with *held* tally, one card per path showing name, blurb, and how
many items are ready. Below: the reset control. No newPerDay stepper — see the §4.9 deviation note;
"keep going" is the next stone on the Pfad trail, not a setting here.

Each card also carries a **mini-trail preview** — a small decorative squiggle with **always exactly
3** dots, echoing the full stepping-stone trail on the Pfad screen at a glance. It's a symbol, not a
counter: never one dot per verse. A path with 3 verses and a path with 30 render the identical
squiggle shape; only the dots' colors shift with overall progress. The full trail on the Pfad screen
carries no such simplification — it represents every verse individually and scales by scrolling,
like a real long path.

**Pfad (path detail)** — **the trail.** Not a list of rows: verses are stepping stones (§7.3)
positioned along a winding SVG path, walked segment solid, the rest dotted. Each stone carries an
opaque plaque below it with the reference and a short quote snippet. The held stones in a path
always form a prefix (introduction is sequential, §4.9), so there's always at most one **active**
stone — the first non-held one — and it doubles as the tap target: pulsing gently, it starts a
session directly when tapped. When nothing is due, no stone is tappable and the trail reads *"Alles
erledigt"* — no force-practice override. No pips, no per-verse rung numbers, no erosion strip — a
stone's state **is** the progress display.

**Sitzung (session item)** — shared chrome: end-session link, rung segments, reference,
**Nachschlagen** button, reveal area. No countdown, no draining bar — per §4.11 the timer is fully
invisible. Seven bodies:

| Item | Body |
|---|---|
| Text 1 · Lesen | full verse, "Ich habe es laut gelesen". Not graded |
| Text 2–4 | cloze with gaps + tile bank; *Prüfen* enabled once every gap is filled; *Rückgängig* |
| Text 5 · Kalt | windowed first-letter skeleton + bank, tapped in order; wrong tile flashes and counts a slip |
| Address · Erkennen | verse shown, pick the reference from 4 |
| Address · Zuordnen | reference shown, pick the text from 4 |
| Address · Bilden | build book → chapter → verse from tiles |
| Aloud | verse shown, "Gesagt". Not graded |

The three address forms aren't a sequence — one is picked at random each time a `ref` item rides a
due text review (§4.10). After grading: a verdict block, then *Weiter* (or *Fertig*).

**Zusammenfassung (summary)** — time, questions answered, first-time correct, rungs climbed, total held.

---

## 7. Visual system

> ⚠️ **Deviation from spec.md §9.** The prototype's dark ink/vellum/gold manuscript look is
> **replaced entirely** by a pilgrimage-trail identity: verses are stepping stones on a winding
> path, engraved as they're mastered. Everything below is **settled and reviewed** — build to it.
> A visual mockup exists as a published artifact — **"Waymarks"**,
> <https://claude.ai/code/artifact/a91d943b-ce45-4b44-8301-52254cac72c9> — showing the trail, the
> stone states and the graduation animation in motion. This section is the source of truth; the
> artifact is a convenience, not a dependency, and may lag behind these notes.

### 7.1 Palette

Light is the default. Both themes ship — this is not a dark-only redesign. Follow the three-state
theming rule (bare `:root` = light, `@media (prefers-color-scheme: dark)` guarded with
`:root:not([data-theme="light"])`, plus `:root[data-theme="dark"]`), and never define a color only
inside a media or `[data-theme]` block.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--ground` | `#E7EAE0` | `#1B211A` | page ground, the trail floor |
| `--surface` | `#F3F4EC` | `#232A20` | cards, plaques, phone frame |
| `--surface-line` | `#D7DBCB` | `#35402F` | hairline borders |
| `--ink` | `#262B23` | `#E7E9DC` | primary text |
| `--ink-muted` | `#6B7364` | `#9BA38D` | secondary text |
| `--stone` | `#ADB39F` | `#454F3F` | unhealed stone, untrodden path |
| `--stone-line` | `#8B9280` | `#5B6652` | stone edges, dashed outlines |
| `--moss` | `#4F6647` | `#7FA06E` | trodden path, healed pieces |
| `--on-moss` | `#F1F3EA` | `#15220F` | text on moss |
| `--waymark` | `#C6862F` | `#E3A94F` | **the single accent** — mastery only |
| `--on-waymark` | `#2B2008` | `#2B1D06` | text on waymark |
| `--water` | `#3E7D72` | `#5FAE9E` | correct |
| `--clay` | `#A24A34` | `#C97456` | missed, and the look-up crutch |
| `--trail-ahead` | `#C4C9B8` | `#3A4434` | dotted path not yet walked |

Gold (`--waymark`) is spent **only** on fully-held verses and the primary action. If it starts
appearing elsewhere, the mastery moment stops meaning anything.

### 7.2 Type

Four faces, each with one job. **Self-host all of them as `.woff2`** under a static asset path.

| Face | Role |
|---|---|
| **Bevan** | Display slab — path names, screen titles. Carved-in-stone feel; never body copy |
| **Karla** | Interface voice — buttons, prompts, captions |
| **EB Garamond** | **Scripture only.** The one carryover from spec §9 |
| **IBM Plex Mono** | References, small stamped labels, tallies |

The serif/sans split is load-bearing: it separates *the app talking* from *the Bible talking*.

> ⚠️ **Deviation.** The prototype loads fonts from the Google Fonts CDN
> ([engrave.html:7-9](../prototype/engrave.html#L7-L9)). **Self-host them** — the app must work
> offline. (The mockup artifact inlines them as base64 data URIs; that trick exists only to keep a
> single mockup file portable and must **not** be copied into `src/`.)

### 7.3 The stepping stone — the core component

The most important new component; every path screen needs it. One irregular blob shape throughout:

```css
border-radius: 61% 39% 52% 48% / 46% 40% 60% 54%;
```

**Three states, driven by `stage` (§3) alone:**

| State | Look | Condition |
|---|---|---|
| **Locked** | 76px dotted `--stone-line` outline, `opacity: .6`, `?` mark, no fill | `introducedAt === null` |
| **Cracked** | 76px, fractured into **5 wedges**; each wedge is `--stone` until its rung passes, then `--moss` | introduced, `stage < 5` |
| **Held** | 72px **solid `--waymark`**, whole, `✓` mark | `stage === 5` |

The cracked stone renders as **one element, not five**: a `conic-gradient` of five 72°-wedges whose
colors come from five custom properties (`--p1`…`--p5`), over a `repeating-conic-gradient` hairline
that draws the seams, plus the same `box-shadow` a solid stone uses so it reads as genuinely
fractured and dimensional rather than a flat pie chart. No per-piece DOM node, no hand-placed
coordinates — set `--p1..--p5` from `stage` and the shape follows.

**The address question never touches the stone.** It rides along with text review (§4.10) as a
single ungated prompt — Erkennen, Zuordnen, or Bilden, picked at random — and a miss just requeues
it later in the same session. It has no rung, no schedule of its own, and no visible effect on
progression; the stone tracks the word ladder alone.

> **Design decision — the address track used to be a second ladder, and no longer is.** An earlier
> pass gave book/chapter/verse its own 3-rung ladder (`refStage`) that gated a second "gold"
> graduation on top of "moss" for mastered words. Before that, a fully-merged single ladder was
> also considered and rejected: word-recall and address-recall are genuinely different memory
> tasks, and forcing a shared rung would make someone who knows the wording cold re-drill mastered
> word exercises just for another shot at the address. The two-ladder compromise was itself cut
> later: gating mastery on the address answer meant a forgotten book name could hold a verse just
> short of gold indefinitely, which isn't what stone progression should hinge on. The address
> question is now asked for its own sake — real retrieval practice — without owning any part of
> the reward. **Do not reintroduce a second scheduled field for it** (`refStage`/`refDue`); if it
> ever needs one, that's a deliberate new decision, not a reversion to this one.

**Graduation is one quiet moment.** All five pieces healed → the stone goes whole and **gold**,
gaining its mark. The transition cross-fades with a slight scale and a brief glow. Honour
`prefers-reduced-motion` — under it, swap states with no scale or glow.

### 7.4 Layout

Mobile-first, single column, `max-width: 520px`. **Tap targets only.** Keep a visible
`:focus-visible` outline.

On the Pfad trail: stones are absolutely positioned along an SVG path, with the walked segment a
solid `--moss` stroke and the rest a dotted `--trail-ahead`. Two rules keep labels from colliding —
learned by getting both wrong first:

1. **Every label sits centered directly below its own stone**, at `stoneY + stoneRadius + gap`.
   Never beside a stone at a guessed offset, and never positioned relative to a neighbour's size.
2. **Labels are opaque plaques** (`--surface` fill, hairline border, soft shadow), because the trail
   line passes behind them; transparent text over the stroke is unreadable.

Vertical spacing between stones is ~180px — enough for the tallest stone plus a two-line plaque.
The primary "Los geht's" pill gets its own horizontal slot beside the current stone, never sharing
vertical space with a plaque.

**No visible session timer** anywhere in the chrome (§4.11).

---

## 8. Content

Three paths, **17 memorization items** (some spanning a verse range — §4.8), all populated with
verified Luther 1912 text supplied by the user. `docs/spec.md` §7 originally specified 11
single-verse items; the Sabbath path was later replaced with a larger range-inclusive set.

| Path id | Name | Items |
|---|---|---|
| `foundation` | Fundament | 1. Mose 1,1 · Johannes 1,1 · Römer 6,23 · 2. Timotheus 3,16 |
| `sabbath` | Der Sabbat | 1. Mose 2,2–3 · 2. Mose 20,8–11 · 2. Mose 31,16–17 · 3. Mose 23,3 · Jesaja 58,13–14 · Jesaja 66,23 · Markus 2,27–28 · Lukas 4,16 · Hebräer 4,9 · 5. Mose 5,12–13 |
| `death` | Was beim Tod geschieht | Prediger 9,5 · Prediger 12,7 · 1. Korinther 15,52 |

**Verse text is never written from memory, generated, or paraphrased** — not even as a placeholder
to be fixed later. Source exports are archived under `docs/` for provenance
(`source-luther1912.html`, plus the Sabbath replacement's source) with a comment in
`verses.de.ts` pointing at them.

**Two doctrine paths were supplied and rejected: Baptism and Salvation.** Both exports were Luther
**1984**, not 1912 — confirmed from the Logos export markup itself, which tags each inline verse
link with its source resource (`;lutbib1984` vs `;lu1912`). Luther 1984 is copyright Deutsche
Bibelgesellschaft; the files were deleted rather than added anywhere in the repo, per the rule
below. Re-export both from Logos with the **Lutherbibel 1912** resource active (the same fix
already applied once to the Sabbath path) to add them.

**Licensing:** Luther 1912 and KJV are public domain. **Luther 1984 is copyright Deutsche
Bibelgesellschaft** and must never be added, nor NIV, ESV, NLT or Schlachter 2000 — not one verse,
not temporarily.

---

## 9. Tests

Vitest. Written before implementation for `game/` and `srs/`, per `spec.md` §11 — they are pure
functions with clean contracts. Components don't need the same treatment.

**`tokenize` / `bare`** — punctuation stays attached; multiple spaces collapse; **ä ö ü ß survive**;
`bare("„Väter\"")` → `Väter`.

**`buildRound`** — window size honours `FRACTION`, `MIN_WINDOW` and `MAX_WINDOW`, **including
rung 5**; a 31-word verse at rung 5 yields exactly 14; indices contiguous and in bounds; same
`(id, seen)` reproduces byte-identically; window position varies across successive `seen`; a
2-word verse doesn't crash.

**`decoysFor`** — never returns a word from the target verse (case-insensitive); all longer than 3
characters; returns exactly `DECOYS[stage]` when the pool allows; **returns fewer without throwing
when the path holds one verse**; returns `[]` for `n = 0`.

**`gradeText`** — advances one rung; floors at 2; ceilings at 5; due dates match the interval
table; `seen` increments on pass and on fail; a looked-up round moves no rung and sets `due = 0`.

**`introduceNewVerses`** — introduces the first verse of every path in one call; stamps
`introducedAt`; a path's second verse never unlocks until its first is held, no matter how many
times the function runs; unlocks immediately once it is; paths unlock independently of each other;
no-op once every verse in the library is introduced.

**`erosionStrip`** — stops before exceeding `EROSION_MAX_CHARS` and appends `…`; shows at least
three words even when they are long compounds; a short verse shows in full with no ellipsis;
the full/first-letter split follows the rung fractions.

**`assembleQueue`** — excludes verses with `introducedAt === null`; a verse below `stage 5` is
always due regardless of its `due` date; a held verse is excluded until its `due` date passes; `ref`
only alongside a due text item and only at `stage >= 2`; `aloud` only at `stage >= 3` and after 7
days; a verse can yield up to three items at once; the force flag ignores a held verse's due date.

**`parseRef`** — `1. Mose 1,1`, `Johannes 3,16`, `1. Korinther 15,52`; throws on `Genesis 1:1`
(colon), on missing verse, and on empty input. `formatRef(parseRef(x)) === x` for all book names.

**`skeleton`** — reveals exactly `revealCount` words; keeps trailing punctuation;
**umlaut-initial words show their letter, not `·`**.

**`storage`** — round-trips a full `SaveData`; corrupt JSON degrades to defaults; a newer
`schemaVersion` returns defaults **and leaves the stored value intact**.

---

## 10. Acceptance criteria

- A session ends within one item of the five-minute mark, never mid-question, and with no visible
  countdown, draining bar, or "last one" warning anywhere in the session UI (§4.11).
- A missed verse returns later in the same session; a passed verse does not.
- A missed address question returns later in the same session, exactly like a missed text round —
  and, right or wrong, it never changes `stage` or a stone's progression.
- **Nachschlagen** visibly prevents advancement, and the verse returns the same day.
- Progress survives a page reload, and a fresh profile introduces exactly 2 verses on day one.
- Every control is reachable and tappable at 375 px wide.
- The app works fully with the network disconnected.
- `npm test` green; `npm run build` clean; no React import anywhere under `game/` or `srs/`.

---

## 11. Still open

Nothing blocking. One item deliberately deferred:

- **The retrieval gap left by cutting Deploy.** `spec.md` §6 called it *"the point of the whole
  module"* — the only exercise testing whether a verse arrives when a real question prompts it,
  rather than when the verse itself is the prompt. Deferred on purpose: use the app first, and
  decide from experience whether the word ladder plus the ungated address question actually
  produce recall in conversation.
  If they don't, the replacement should be **derived, not authored** — for example, showing one
  verse from a path and asking which *other* verse in that path speaks to the same question.
  Weaker than a real objection, but it keeps zero-authoring absolute.

- **Where the erosion strip fits after the visual pivot.** `game/erosion.ts` (§5, tested in §9)
  implements the word-decaying strip from `spec.md` §8, but the pilgrimage-trail redesign (§7)
  replaced its Pfade-card role with the mini-trail preview above, and the Pfad screen's stone
  previews use a plain quote snippet rather than eroding text. The function isn't wired to
  anything in the new visual direction yet — decide whether it still has a home (e.g. an
  expanded/detail view of a single stone) or whether it's now dead code once the trail UI is built.

Resolved since first draft: the introduction cap is global and user-adjustable (§4.9); the erosion
strip caps by character count rather than word count (§5).
