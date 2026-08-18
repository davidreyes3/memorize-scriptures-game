// German UI strings. "Engrave" is a placeholder name (see CLAUDE.md) — kept isolated here
// so renaming stays a one-line change.

export const de = {
  appName: "Engrave",

  // Pfade (paths list)
  pfadeTitle: "Pfade",
  held: (n: number) => `${n} gehalten`,
  ready: (n: number) => (n === 1 ? "1 bereit" : `${n} bereit`),
  newPerDayLabel: "Neue Verse pro Tag",
  resetLabel: "Fortschritt zurücksetzen",
  resetConfirm: "Wirklich den gesamten Fortschritt löschen? Das kann nicht rückgängig gemacht werden.",

  // Pfad (path detail / trail)
  losGehts: "Los geht's",
  allesErledigt: "Alles erledigt",
  capReached:
    "Für heute sind schon alle neuen Verse eingeführt. Erhöhe „Neue Verse pro Tag” auf der Pfade-Übersicht, um mehr freizuschalten.",
  trotzdemUeben: "Trotzdem üben",
  zurueck: "Zurück",

  // Sitzung chrome
  beenden: "Beenden",
  nachschlagen: "Nachschlagen",
  pruefen: "Prüfen",
  rueckgaengig: "Rückgängig",
  weiter: "Weiter",
  fertig: "Fertig",
  richtig: "Richtig!",
  falsch: "Leider falsch.",
  looked_up: "Nachgeschlagen.",

  // Text bodies
  lesenDone: "Ich habe es laut gelesen",
  aloudPrompt: "Sag den Vers laut auf.",
  aloudDone: "Gesagt",

  // Address bodies
  erkennenPrompt: "Welche Stelle ist das?",
  zuordnenPrompt: (ref: string) => `Welcher Text gehört zu ${ref}?`,
  bildenPrompt: "Baue die Stellenangabe.",
  bildenBook: "Buch",
  bildenChapter: "Kapitel",
  bildenVerse: "Vers",

  // Zusammenfassung
  zusammenfassungTitle: "Zusammenfassung",
  statTime: "Zeit",
  statAnswered: "Beantwortet",
  statFirstTimeCorrect: "Erstversuch richtig",
  statRungsClimbed: "Stufen erklommen",
  statHeld: "Gehalten",
} as const;
