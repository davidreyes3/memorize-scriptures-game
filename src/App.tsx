import { useEffect } from "react";
import { de } from "./i18n/de";
import { VERSES_DE } from "./data/verses.de";
import { PATHS_DE } from "./data/paths.de";
import { useSession } from "./session/useSession";
import { PfadeScreen } from "./components/PfadeScreen";
import { PfadScreen } from "./components/PfadScreen";
import { Sitzung } from "./components/Sitzung";
import { ZusammenfassungScreen } from "./components/ZusammenfassungScreen";

export default function App() {
  const {
    state,
    selectPath,
    backToPaths,
    startSession,
    answer,
    lookup,
    aloudDone,
    endSession,
    resetProgress,
  } = useSession(VERSES_DE);

  useEffect(() => {
    document.title = de.appName;
  }, []);

  return (
    <main style={{ padding: "1.5rem", maxWidth: 520, margin: "0 auto" }}>
      {state.screen === "pfade" && (
        <PfadeScreen
          state={state}
          paths={PATHS_DE}
          verses={VERSES_DE}
          onSelectPath={selectPath}
          onReset={resetProgress}
        />
      )}

      {state.screen === "pfad" && (
        <PfadScreen state={state} paths={PATHS_DE} verses={VERSES_DE} onStart={startSession} onBack={backToPaths} />
      )}

      {state.screen === "sitzung" && (
        <Sitzung
          state={state}
          verses={VERSES_DE}
          onAnswer={answer}
          onLookup={lookup}
          onAloudDone={aloudDone}
          onEndSession={endSession}
        />
      )}

      {state.screen === "zusammenfassung" && <ZusammenfassungScreen state={state} onBackToPaths={backToPaths} />}
    </main>
  );
}
