import { de } from "./i18n/de";
import { VERSES_DE } from "./data/verses.de";

// Placeholder only — proves the scaffold runs. Real screens (docs/build.md §6) are the
// next task, not part of this pass.
const sample = VERSES_DE[0];

export default function App() {
  return (
    <main style={{ padding: "2rem", maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-display)" }}>{de.appName}</h1>
      <p style={{ fontFamily: "var(--font-ui)" }}>
        Noch keine Screens gebaut — siehe docs/build.md §6.
      </p>
      <p style={{ fontFamily: "var(--font-scripture)", fontSize: "1.25rem" }}>{sample.text}</p>
      <p style={{ fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}>{sample.ref}</p>
    </main>
  );
}
