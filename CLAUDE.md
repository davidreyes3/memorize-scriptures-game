# Engrave — scripture memorization app

A browser app for memorizing Bible verses, for a German-speaking, UCG-doctrine-aligned audience.
Each verse is learned on two independent ladders — the words, and the address (book, chapter,
verse) — with exercises **generated from the verse text itself**, never authored per verse.
Sessions are capped at **five minutes**, but the timer is **never shown**. Everything runs locally
and offline.

Visually it's a **pilgrimage trail**: each verse is a stepping stone, cracked into five pieces that
heal as you master it, going whole and then gold when it's fully held. See `build.md` §7.

*"Engrave" is a placeholder name.* It lives in `src/i18n/de.ts` so renaming stays a one-line
change. Choosing the real name is a separate task and must never block programming.

## Where things are

| File | What it is |
|---|---|
| [docs/status.md](docs/status.md) | **What's built and what's next.** Read this first when picking the project up cold; update it when work lands. |
| [docs/build.md](docs/build.md) | **The implementation spec.** Types, algorithms, contracts, screens, visual system, tests. Read before writing code. |
| [docs/spec.md](docs/spec.md) | The product reasoning — why the app works this way. Carries an amendments block listing every later reversal. |
| [prototype/engrave.html](prototype/engrave.html) | Frozen single-file prototype. **Behavioural reference only** — its visual design is superseded by `build.md` §7, and never develop in it. |

`build.md` wins where documents conflict. It records every decision that supersedes `spec.md` —
German-first, the Deploy round cut, the invisible timer, and the pilgrimage-trail redesign.

## Hard rules

**Never write scripture text from memory, and never paraphrase it.** Verse text is transcribed
data, supplied by the user. If a verse is missing from `src/data/verses.de.ts`, say so and ask —
do not fill it in, not even as a placeholder to correct later.

**Public domain translations only: Luther 1912 and KJV.** Never add Luther 1984 (© Deutsche
Bibelgesellschaft), NIV, ESV, NLT, or Schlachter 2000 — not one verse, not temporarily, not in a
test fixture.

**Zero authoring per verse, absolutely.** Adding a verse means adding a reference and its text,
nothing more. If a proposed feature needs a human to write something for each verse, it is the
wrong feature — say so and suggest something derived from the text instead. There are no
exceptions left now that Deploy is cut.

**The five minutes are real, and invisible.** Never add anything that quietly extends a session —
and never show a countdown, draining bar, or "last one" warning. The cap is felt, not displayed.

**The address question never gates the stone.** `stage` (`build.md` §3) is the only ladder — the
address prompt (book, chapter, verse) rides along with text review as an ungated question with no
schedule of its own. A miss just re-asks it later in the same session; it never changes `stage` or
delays a stone's progression. This replaced an earlier two-ladder model (`refStage`/`refDue`) that
gated a second "gold" graduation on the address answer — reasoning for both the original split and
the later cut is in `build.md` §7.3. Don't reintroduce a second scheduled field for the address
question without treating that as a deliberate new decision, not a reversion.

**Gold is only for mastery.** `--waymark` marks fully-held verses and the primary action, nothing
else. Spend it elsewhere and the mastery moment stops meaning anything.

**Tap targets only.** No drag-and-drop, no typed input. Mobile-first, single column, max 520px.

**No backend, no accounts, no network calls at runtime.** The app must work fully offline —
that includes self-hosted fonts. State lives in `localStorage` and nowhere else.

**Ask before adding a dependency.**

## Stack

Every runtime and dev dependency in `package.json`, and why it's there. **Ask before adding a
dependency** (see Hard rules) — and when one is approved, add its row here in the same commit.

| Package | Why |
|---|---|
| `react`, `react-dom` | The UI is a small state machine over screens; components keep that legible. |
| `vite` | Instant dev server, no config to learn. Also the production bundler — it's what fingerprints and locally emits the self-hosted fonts below, so there's no CDN call at runtime. |
| `typescript` | The rung ladder (`stage`) is the kind of thing types catch mistakes in early. |
| `vitest` | Pure logic is where the bugs would hide, so it gets real tests. |
| `@vitejs/plugin-react` | Vite's official plugin for JSX transform and Fast Refresh. |
| `@types/react`, `@types/react-dom` | Type declarations for React/ReactDOM — neither ships its own. |
| `@types/node` | Type declarations for `node:fs`/`node:path`/`process`, needed only by `licensing.test.ts` (the local, dev-only Logos-export copyright screen — see *Scripture licensing and git history* below). |
| `@fontsource/bevan`, `@fontsource/karla`, `@fontsource/eb-garamond`, `@fontsource/ibm-plex-mono` | Self-hosted `.woff2`/`.woff` files for the four faces in `build.md` §7.2, bundled locally instead of loaded from the Google Fonts CDN — required by the no-network-calls-at-runtime rule. |

## Structure

```
src/
  components/   React only — stepping stone, trail, cloze board, tile bank, session chrome
  game/         tokenizing, round building, decoys, skeleton, reference parsing
  srs/          grading, scheduling, verse introduction, queue assembly
  data/         verses.de.ts, paths.de.ts, books.de.ts
  i18n/         de.ts — every user-facing string, app name included
  storage/      localStorage read/write + schema versioning
```

**`game/` and `srs/` import nothing from React and touch no browser globals.** They are pure
functions over plain data, with `now` and `rng` passed in rather than called inside. This is the
most important structural rule in the project — it is what makes the logic testable, and
`build.md` §9 specifies the tests. `storage/` is the only module allowed to touch `localStorage`.

Write the failing test first for anything in `game/` or `srs/`. Components don't need that.

## Porting gotchas

The prototype has four bugs that break on German or outside its original runtime. `build.md`
specifies the fixes; don't rediscover them the hard way.

- [prototype/engrave.html:234](prototype/engrave.html#L234) — persists via `window.storage.get/set`,
  which is the **Claude Artifacts runtime API, not a browser API**. Must become `localStorage`.
- [prototype/engrave.html:251](prototype/engrave.html#L251) — `bare()` strips to `[^A-Za-z']`,
  **destroying ä/ö/ü/ß**. Must be Unicode-aware.
- [prototype/engrave.html:265](prototype/engrave.html#L265) — `skeleton()` finds first letters with
  `[A-Za-z]`, so umlaut-initial words render as `·`. Same fix.
- [prototype/engrave.html:252](prototype/engrave.html#L252) — `parseRef()` expects `Book 1:1`.
  German is **`1. Mose 1,1`** — comma, and ordinal-prefixed book names.

Also: the prototype builds UI by concatenating HTML strings against global mutable `round`,
`session` and `window._ref`. Don't carry that across — it is exactly the architecture `spec.md` §1
says not to copy.

## Working with me

I'm learning as we go, so explain the *why* behind non-obvious decisions — briefly, while the work
happens, not as a lecture afterwards.

- Prefer plain readable code over clever abstraction. Don't add a pattern to save three lines.
- Build in small increments I can run and see, rather than large batches.
- **Plan first.** Propose an approach and wait for review before writing implementation code.
- Ask before big structural changes.
- Raise the open questions in `build.md` §11 rather than silently deciding them.

## Running anything

**Neither Node nor git is on the shell PATH.** Every command needs the relevant prefix first, and
it does not persist between calls:

```powershell
$env:Path += ";C:\Program Files\nodejs;C:\Program Files\Git\cmd"
```

## Committing

**Commit often.** A commit per logical change, not per session. If a change can be described in one
sentence without "and", it's probably one commit. Small commits are what make `git revert` and
`git bisect` useful later — that's the whole reason we're doing this.

**Commit before starting anything risky**, so there's a clean point to return to: a refactor, a
dependency change, a big new component.

### Before every commit

1. `npm test` must pass. Don't commit a red suite — if work is genuinely mid-flight, say so in the
   message rather than pretending it's green.
2. Run `git status` and actually read it. Check nothing unintended is staged.
3. **Check for copyrighted scripture.** This is the one that really matters here — see below.
4. Never use `--no-verify` or skip hooks.

### ⚠️ Scripture licensing and git history

Committing copyrighted verse text is materially worse than writing it to a file, because **history
is permanent** — deleting it in a later commit does not remove it, and scrubbing it means rewriting
history. Luther 1984 has already been supplied twice by accident (see `build.md` §8).

So: before committing anything under `src/data/` or `docs/source-*.html`, confirm the text is
Luther 1912 or KJV. The reliable tell in a Logos export is the resource tag on each inline verse
link — `;lu1912` is fine, **`;lutbib1984` is not**. If a file with copyrighted text was already
committed, stop and flag it rather than quietly deleting it in a new commit.

### Message format

Short imperative subject, then a blank line, then *why* — not a restatement of the diff, which git
already shows.

```
srs: cap new verse introductions per day

The prototype started every verse due at once, so the daily queue could
never clear once the library grew past a handful. Introductions are now
gated globally and the number is user-adjustable.
```

Use a scope prefix matching the folder: `game:`, `srs:`, `storage:`, `data:`, `ui:`, `docs:`,
`chore:` (tooling, deps, config). Subject line under ~72 characters, no trailing period.

**Write multi-line messages to a file and use `git commit -F <file>`** — see Gotchas below.

Skip the body only when the subject genuinely says everything (`chore: add .gitignore`). Anything
involving a judgment call gets a body explaining the reasoning — future-you will not remember it.

## Gotchas — read before debugging

**When something breaks, don't just fix it.** Find the actual root cause, then add it here with
the symptom, the cause, and the fix. A bug that cost time once should never cost it twice. If the
same class of mistake shows up a third time, that's a signal the rule above it isn't strong enough
— strengthen it rather than adding another entry.

### JavaScript regex is ASCII-only. This project is German.

**This has already caused three separate bugs.** `\w`, `\b`, `\d` and ranges like `[A-Za-z]` do
**not** match `ä ö ü ß`. Worse, `\b` fails silently around them: in `"daß"`, the `ß` is not a word
character, so `/\bdaß\b/` can never match anything, ever.

- ❌ `word.replace(/[^A-Za-z']/g, "")` — deletes every umlaut
- ❌ `/\bmuß\b/` — never matches
- ✅ `word.replace(/[^\p{L}']/gu, "")` — Unicode property escape, needs the `u` flag
- ✅ `/(?:daß|muß)/i` — plain alternation, no boundaries needed

Rule: **any regex touching scripture text uses `\p{L}` with the `u` flag, or no character classes
at all.** Reach for `\w` or `[A-Za-z]` in this codebase and you have almost certainly written a bug.

### PowerShell mangles quotes passed to native executables

`git commit -m @'...'@` breaks apart the moment the message contains a double quote, producing
baffling `pathspec ... did not match any file(s)` errors rather than a clear failure. Write the
message to a scratchpad file and use `git commit -F <file>`.

### PowerShell's `Get-Content -Raw` corrupts UTF-8 by default

It falls back to the system codepage, silently turning `ä ö ü ß` and curly quotes into mojibake
(`Ã¶`, `â€ž`). This mangled every German string in a generated file once. Always pass the encoding
explicitly on **both** sides:

```powershell
Get-Content $path -Raw -Encoding UTF8
[IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
```

### PowerShell reports native stderr as a failure

`git push` writes normal progress to stderr, so PowerShell wraps it in a `NativeCommandError` and
the tool reports exit 1 even when the command fully succeeded. **Read the actual output before
concluding something failed** — check for `git status -sb` agreement rather than trusting the exit
code.

### Neither Node nor git is on PATH

See *Running anything* above. Applies to every single shell call; it does not persist.

## Verification

`npm test` for the logic, `npm run dev` and actually play a round for everything else. Check the
layout at 375px wide, and confirm nothing under `game/` or `srs/` imports React.

When work lands, update [docs/status.md](docs/status.md) — it's how the next session knows where
things stand.
