# Engrave — scripture memorization module

*Working name. Part of a larger Bible app (name also provisional). This document is the build spec; a working single-file HTML prototype exists and should be treated as the reference implementation for behaviour, not for architecture.*

---

> ## ⚠️ Amendments — read before relying on anything below
>
> This document is now the **product reasoning** — why the app works the way it does. It is no
> longer the build spec. That role belongs to **[`build.md`](build.md)**, which holds the types,
> algorithms, module contracts, screens and test cases. **Where the two disagree, `build.md` wins.**
>
> The body below is preserved unedited, because its reasoning stays valuable even where the
> conclusion changed. But these decisions have since been settled or reversed:
>
> | § | Said | Now |
> |---|---|---|
> | §1 | "part of a larger Bible app" | This repo is **the memorization module only** |
> | §2 | KJV | **Luther 1912 first**, KJV later. UI is German. Verse text is supplied by the user, never generated |
> | §6 | Deploy round — "the point of the whole module" | **Cut for v1.** Zero-authoring is now absolute |
> | §9 | — | Confirmed: tap only, mobile-first, max 520px |
> | §10.1 | Long verses — open | **Cap rung 5 at 14 words**, like rung 4. No authored split points |
> | §10.2 | Backlog cap — "needs a number" | **2 new verses per day**, counted globally |
> | §10.3 | Deploy scope — confirm it earns its keep | It didn't. Cut |
> | §10.4 | Should `aloud` gate progression? | **No.** It never gates |
> | §11 | mentions a "TTS layer" | **No TTS.** The user speaks; the app is silent |
> | §4 | "The clock is real and visible... shown as a countdown and a draining bar" | **Reversed. The timer is fully invisible** — no countdown, no draining bar, no numeric badge anywhere. The five-minute cap is an ambient background constraint; see `build.md` §4.11 |
> | §9 | dark, printerly, restrained; ink/vellum/gold | **Reversed. Redesigned as a pilgrimage trail** — verses as stepping stones that crack into five pieces and heal as you master them; moss/stone/brass palette, daylight not manuscript. Full palette, type and component spec in [`build.md`](build.md) §7 |
> | §8 | erosion strip as the progress display | Superseded on the path screens by the stepping stone (`build.md` §7.3) and the 3-dot mini-trail (§6). `game/erosion.ts` exists and is tested but may now be unused — see `build.md` §11 |
> | §3 | "A verse counts as held only when both tracks are full" | **Reversed.** The address track is no longer a scored ladder — it's one ungated question (Recognise/Match/Build, picked at random) that rides along whenever text review is due. A miss just re-asks it later in the session; it never advances or costs a rung, and `held` means the word ladder alone reaching rung 5. Full reasoning in `build.md` §7.3 |
>
> Architecture is now React + Vite + TypeScript + Vitest, persisting to `localStorage`.
> The prototype remains the behavioural reference — see `build.md` for the four places its
> code breaks on German or outside its original runtime.

---

## 1. What this is

A verse memorization module built around one constraint that shapes everything else:

> **Zero authoring per verse.** Adding a verse to the app means adding a reference and its text. Nothing else. No hand-written questions, no hand-written wrong answers, no per-verse metadata.

Every exercise in the app is generated from the verse text itself plus the other verses in the same path. This is not a performance optimisation — it is the product decision that makes the content library scalable by one person.

The second shaping constraint:

> **A session is five minutes.** Not "about five minutes." The clock is real and visible, and the queue bends to the clock rather than the other way round.

## 2. Who it's for

A narrow, specific Christian audience (United Church of God doctrinal alignment — Sabbath, holy days, clean meats, nature of God). This matters for content selection, not mechanics: verses are grouped into **doctrine paths**, and the payoff exercise is about being able to produce the right verse when a doctrinal question comes up in conversation. The app is not aimed at the general Christian market.

Text is KJV (public domain, close to the NKJV wording used in the associated commentary material).

## 3. Core model

### Two independent tracks per verse

Every verse is memorized on two ladders that advance separately:

**Text track — 5 rungs**

| Rung | Name | What happens |
|---|---|---|
| 1 | Read | Verse shown in full. User reads it aloud, taps to confirm. No grading. |
| 2 | Phrase | ~30% of the verse is blanked. User taps scrambled word tiles back into the gaps, in order. No spare words. |
| 3 | Passage | ~60% blanked. 1 spare word in the bank. |
| 4 | Rebuild | Whole verse on tiles (capped — see §5). 2 spare words. |
| 5 | Cold | No verse text on screen at all — only first letters of each word. User taps the full word bank in order. 3 spare words. |

**Address track — 3 rungs** (book, chapter, verse — treated as first-class content, not a label)

| Rung | Name | What happens |
|---|---|---|
| 1 | Recognise | Verse text shown. Pick its reference from 4 options. |
| 2 | Match | Reference shown. Pick its text from 4 options. |
| 3 | Build | Verse text shown. Assemble the reference from tiles: book first, then chapter, then verse. |

A verse counts as **held** only when both tracks are full. Knowing the words without the address is half a verse.

### Generation rules (no authored content)

- **Which words to blank:** a contiguous window sized by rung fraction. The window's start position shifts on each repeat (seeded off a per-verse `seen` counter) so the verse can't be learned positionally.
- **Spare/decoy words:** drawn from the *other verses in the same path* — content words (length > 3) that don't appear in the target verse. Same register, plausible, free.
- **Address distractors:** other verses in the corpus. Chapter/verse number options are generated as near-misses around the true number.

## 4. Session model

- Session length: **5 minutes**, shown as a countdown and a draining bar.
- At 0:00 the session does **not** cut off mid-question. The current item completes, one more item is served, then the session ends. The clock label changes to "last one" so the end is visible before it arrives.
- Anything still due rolls to the next day.
- After the bell, one optional **Deploy** question closes the session (see §6).

### Session queue

The queue is assembled per path from three item kinds, shuffled together:

1. **`text`** — due by text-track interval
2. **`ref`** — due by address-track interval, only for verses at text rung ≥ 2
3. **`aloud`** — any verse at text rung ≥ 3 not spoken aloud in 7 days

The `aloud` item is deliberately not a test. It shows the verse and asks the user to say it out loud. Tapping "Said it" resets the 7-day timer and grades nothing. This exists because the sound of a verse is a real part of retaining it, and the ladder otherwise drifts entirely toward silent tapping.

### Scheduling

Simple interval ladder, not full SM-2 (chosen for legibility at this stage):

- Text track, on success: **1, 2, 4, 9, 21 days** by rung reached.
- Address track, on success: **2, 6, 21 days**.
- On failure: drop one rung, due immediately, requeued later in the same session.
- Rungs floor at 2 (text) and 1 (address) — a miss never sends a verse back to "Read."

## 5. Look it up

A **Look it up** button is present on every exercise screen.

It reveals the reference and full verse text **inline, from local data**. No network call, no external Bible site, no tab switch — the app already has the text, and this has to work offline.

Tapping it flags the round: the item will not advance a rung that session and returns the same day. Tapping again hides it. The crutch is always available and never free.

## 6. Deploy round

The one place with authored text, and it is authored **per doctrine path, not per verse** — roughly 2 lines per path.

After the session bell, the user gets a real-world objection ("A friend says the Sabbath was given only to Israel at Sinai — which verse pushes the question back before Sinai?") and picks the right verse from four they've already reached rung 3 on.

This is the point of the whole module. Memorization is only worth the effort if the verse arrives when it's needed, and nothing else in the ladder tests retrieval under a prompt that isn't the verse itself.

## 7. Content model

The entire content file:

```js
{ id: "heb4_9", path: "sabbath", ref: "Hebrews 4:9",
  text: "There remaineth therefore a rest to the people of God." }
```

Plus a path list (id, name, one-line blurb) and the small Deploy question set. A book-name list exists for the address-build word bank; it's a one-time constant.

Paths in the prototype: Foundation, The Sabbath, What happens at death.

## 8. Progress display

Two signature elements worth preserving:

- **The erosion strip.** Each verse row in a path shows the verse itself decaying into first letters as its rung climbs. The library becomes a page of progressively vanishing text — it doubles as the progress bar and as a study aid.
- **Dual rung indicators.** Gold pips for the text track, shorter green pips for the address track, side by side on each row.

## 9. Visual direction

Dark, printerly, restrained. Deep indigo-black ground, warm vellum text, gold as the single accent for progress and scripture references; verdigris for correct, rust for missed and for the look-up crutch. EB Garamond for all scripture, IBM Plex Sans for interface, IBM Plex Mono for references, rung labels and the clock — the mono/serif split does the work of separating *the app talking* from *the Bible talking*.

Mobile-first, single column, max ~520px. Tap targets only; no drag-and-drop, no typing.

---

## 10. Open decisions — please raise these rather than silently picking

1. **Long verses.** 1 Cor 15:52 is 31 words. Rung 4 currently caps tiles at 14; rung 5 makes the user tap all 31, which is a slog on a phone. Options: split long verses into halves memorized separately and joined at the end (needs one authored split point per long verse — a real but small violation of the zero-authoring rule), or cap rung 5 too and accept partial cold recall.
2. **Backlog control.** With a large library, five minutes will not clear the daily queue, and a queue that grows every day is how these apps lose people. Preferred fix is capping *new verses introduced per day* rather than capping reviews, so the steady state stabilises on its own. Needs a number.
3. **Deploy round scope.** It is the only authored content left. Confirm it earns its keep before expanding path count.
4. **Whether `aloud` should ever gate progression.** Currently it never does. Arguable either way.

## 11. How to work on this

Plan first. Explore the existing prototype, propose an approach, and wait for review before writing implementation code. Write failing tests before implementing logic-heavy pieces — the scheduler, the window-shifting round builder, the decoy generator and the address parser all have clean testable contracts. TTS and UI layers don't need the same treatment.

Do not introduce mechanics that require per-verse authored content. If a proposed feature needs a human to write something for each verse, it is the wrong feature for this module — say so and suggest an alternative that derives from the text.
