import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hasPreReformOrthography, screenForCopyrightedText } from "./licensing";
import { VERSES_DE } from "./verses.de";

describe("screenForCopyrightedText — provenance tags", () => {
  // The point of the loose matching: exporters spell the same resource many ways.
  const luther84Spellings = [
    "lutbib1984",
    ";lutbib1984",
    "lu84",
    "lut84",
    "luth84",
    "luther84",
    "LUTHER84",
    "luther-84",
    "luther_84",
    "luther.84",
    "luther 84",
    "Luther 1984",
    "luther1984",
    "LUT1984",
    "ref.ly/Ro6.23;lutbib1984",
  ];

  it.each(luther84Spellings)("flags %s", (sample) => {
    expect(screenForCopyrightedText(sample).length).toBeGreaterThan(0);
  });

  it("flags Luther 2017, which is equally copyrighted", () => {
    for (const s of ["lutbib2017", "LUT2017", "Luther 2017", "luther-17"]) {
      expect(screenForCopyrightedText(s).length).toBeGreaterThan(0);
    }
  });

  it("flags other copyrighted editions", () => {
    for (const s of ["Schlachter 2000", "NIV", "ESV", "Hoffnung für Alle", "Einheitsübersetzung"]) {
      expect(screenForCopyrightedText(s).length).toBeGreaterThan(0);
    }
  });

  it("does NOT flag the public-domain resource tags we rely on", () => {
    for (const s of ["lu1912", ";lu1912", "Luther 1912", "ref.ly/Ge2.3;lu1912", "KJV", "Elberfelder 1905"]) {
      expect(screenForCopyrightedText(s)).toEqual([]);
    }
  });

  it("does not confuse 1912 with 1984 on a shared prefix", () => {
    expect(screenForCopyrightedText("lutbib1912")).toEqual([]);
  });
});

describe("screenForCopyrightedText — text-level detection", () => {
  it("catches reformed orthography even with every tag stripped", () => {
    const stripped = "Gedenke des Sabbattages, dass du ihn heiligest.";
    const findings = screenForCopyrightedText(stripped);
    expect(findings.some((f) => f.rule.includes("dass"))).toBe(true);
  });

  it("catches the 1984 wording of Hebräer 4,9", () => {
    const text = "Es ist also noch eine Ruhe vorhanden für das Volk Gottes.";
    expect(screenForCopyrightedText(text).length).toBeGreaterThan(0);
  });

  it("catches the 1984 wording of Römer 6,23", () => {
    const text = "die Gabe Gottes aber ist das ewige Leben in Christus Jesus, unserm Herrn.";
    expect(screenForCopyrightedText(text).length).toBeGreaterThan(0);
  });

  it("catches the 1984 wording of 2. Timotheus 3,16", () => {
    const text = "ist nütze zur Lehre, zur Zurechtweisung, zur Besserung, zur Erziehung in der Gerechtigkeit,";
    expect(screenForCopyrightedText(text).length).toBeGreaterThan(0);
  });

  it("passes the genuine 1912 readings of those same verses", () => {
    const passages = [
      "Darum ist noch eine Ruhe vorhanden dem Volke Gottes.",
      "Denn der Tod ist der Sünde Sold; aber die Gabe Gottes ist das ewige Leben in Christo Jesu, unserm HERRN.",
      "Denn alle Schrift, von Gott eingegeben, ist nütze zur Lehre, zur Strafe, zur Besserung, zur Züchtigung in der Gerechtigkeit,",
    ];
    for (const p of passages) expect(screenForCopyrightedText(p)).toEqual([]);
  });
});

describe("hasPreReformOrthography", () => {
  it("recognises pre-reform ß spellings", () => {
    expect(hasPreReformOrthography("Gedenke des Sabbattags, daß Du ihn heiligest.")).toBe(true);
    expect(hasPreReformOrthography("Denn der Staub muß wieder zu der Erde kommen")).toBe(true);
  });

  it("is false for reformed spelling", () => {
    expect(hasPreReformOrthography("Gedenke des Sabbattages, dass du ihn heiligest.")).toBe(false);
  });
});

// --- The checks that actually guard the repository ---

describe("shipped verse data is public domain", () => {
  it.each(VERSES_DE.map((v) => [v.ref, v.text] as const))(
    "%s contains no copyrighted-translation markers",
    (ref, text) => {
      const findings = screenForCopyrightedText(text);
      expect(findings, `${ref} → ${findings.map((f) => `${f.rule} (${f.detail})`).join("; ")}`).toEqual([]);
    },
  );

  it("collectively shows pre-reform orthography, confirming it really is 1912", () => {
    const all = VERSES_DE.map((v) => v.text).join(" ");
    expect(hasPreReformOrthography(all)).toBe(true);
  });

  it("has no empty verse text", () => {
    for (const v of VERSES_DE) expect(v.text.trim().length).toBeGreaterThan(0);
  });
});

// Logos exports are gitignored but live in docs/ locally. Screening them here means dropping
// a copyrighted export into the project fails `npm test` before its text can be ingested.
// Skipped rather than failed when absent, since CI and fresh clones won't have them.
describe("local source exports (if present)", () => {
  const docsDir = join(process.cwd(), "docs");
  const exports = existsSync(docsDir)
    ? readdirSync(docsDir).filter((f) => f.startsWith("source-") && f.endsWith(".html"))
    : [];

  if (exports.length === 0) {
    it.skip("no local exports to screen", () => {});
    return;
  }

  it.each(exports)("%s is a public-domain export", (file) => {
    const raw = readFileSync(join(docsDir, file), "utf8");
    const findings = screenForCopyrightedText(raw);
    expect(findings, `${file} → ${findings.map((f) => `${f.rule} (${f.detail})`).join("; ")}`).toEqual([]);
  });
});
