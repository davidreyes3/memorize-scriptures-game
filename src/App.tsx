import { de } from "./i18n/de";

// Placeholder only — proves the scaffold runs. Real screens (docs/build.md §6) are the
// next task, not part of this pass.
export default function App() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 520, margin: "0 auto" }}>
      <h1>{de.appName}</h1>
      <p>Noch keine Screens gebaut — siehe docs/build.md §6.</p>
    </main>
  );
}
