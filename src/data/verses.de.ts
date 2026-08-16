// Luther 1912 (public domain). Text transcribed from Logos Bibelsoftware exports,
// verified against known 1912 readings (pre-1996 orthography, "Christo Jesu", "Darum ist
// noch eine Ruhe..."). Source exports preserved at ../../docs/source-luther1912.html
// (foundation, death, and the original 4-verse sabbath) and
// ../../docs/source-luther1912-sabbath.html (the replacement 10-item sabbath path below).
//
// Two doctrine paths (Baptism, Salvation) were supplied and rejected: both exports were
// Luther 1984 (copyright Deutsche Bibelgesellschaft), confirmed via the `;lutbib1984`
// resource tag in the Logos export markup. Not added — see docs/build.md §8.
//
// Do not edit verse text by hand — see CLAUDE.md: scripture text is transcribed data,
// never generated or paraphrased.

import type { Verse } from "../game/types";

export const VERSES_DE: Verse[] = [
  {
    id: "gen1_1",
    path: "foundation",
    ref: "1. Mose 1,1",
    text: "Am Anfang schuf Gott Himmel und Erde.",
  },
  {
    id: "joh1_1",
    path: "foundation",
    ref: "Johannes 1,1",
    text: "Im Anfang war das Wort, und das Wort war bei Gott, und Gott war das Wort.",
  },
  {
    id: "roem6_23",
    path: "foundation",
    ref: "Römer 6,23",
    text: "Denn der Tod ist der Sünde Sold; aber die Gabe Gottes ist das ewige Leben in Christo Jesu, unserm HERRN.",
  },
  {
    id: "2tim3_16",
    path: "foundation",
    ref: "2. Timotheus 3,16",
    text: "Denn alle Schrift, von Gott eingegeben, ist nütze zur Lehre, zur Strafe, zur Besserung, zur Züchtigung in der Gerechtigkeit,",
  },
  {
    id: "gen2_2_3",
    path: "sabbath",
    ref: "1. Mose 2,2–3",
    text: "Und also vollendete Gott am siebenten Tage seine Werke, die er machte, und ruhte am siebenten Tage von allen seinen Werken, die er machte. Und Gott segnete den siebenten Tag und heiligte ihn, darum daß er an demselben geruht hatte von allen seinen Werken, die Gott schuf und machte.",
  },
  {
    id: "ex20_8_11",
    path: "sabbath",
    ref: "2. Mose 20,8–11",
    text: "Gedenke des Sabbattags, daß Du ihn heiligest. Sechs Tage sollst du arbeiten und alle dein Dinge beschicken; aber am siebenten Tage ist der Sabbat des HERRN, deines Gottes; da sollst du kein Werk tun noch dein Sohn noch deine Tochter noch dein Knecht noch deine Magd noch dein Vieh noch dein Fremdling, der in deinen Toren ist. Denn in sechs Tagen hat der HERR Himmel und Erde gemacht und das Meer und alles, was darinnen ist, und ruhte am siebenten Tage. Darum segnete der HERR den Sabbattag und heiligte ihn.",
  },
  {
    id: "ex31_16_17",
    path: "sabbath",
    ref: "2. Mose 31,16–17",
    text: "Darum sollen die Kinder Israel den Sabbat halten, daß sie ihn auch bei ihren Nachkommen halten zum ewigen Bund. Er ist ein ewiges Zeichen zwischen mir und den Kindern Israel. Denn in sechs Tagen machte der HERR Himmel und Erde; aber am siebenten Tage ruhte er und erquickte sich.",
  },
  {
    id: "lev23_3",
    path: "sabbath",
    ref: "3. Mose 23,3",
    text: "Sechs Tage sollst du arbeiten; der siebente Tag aber ist der große, heilige Sabbat, da ihr zusammenkommt. Keine Arbeit sollt ihr an dem tun; denn es ist der Sabbat des HERRN in allen euren Wohnungen.",
  },
  {
    id: "jes58_13_14",
    path: "sabbath",
    ref: "Jesaja 58,13–14",
    text: "So du deinen Fuß von dem Sabbat kehrst, daß du nicht tust, was dir gefällt an meinem heiligen Tage, und den Sabbat eine Lust heißt und den Tag, der dem HERRN heilig ist, ehrest, so du ihn also ehrest, daß du nicht tust deine Wege, noch darin erfunden werde, was dir gefällt oder leeres Geschwätz; alsdann wirst du Lust haben am HERRN, und ich will dich über die Höhen auf Erden schweben lassen und will dich speisen mit dem Erbe deines Vaters Jakob; denn des HERRN Mund sagt's.",
  },
  {
    id: "jes66_23",
    path: "sabbath",
    ref: "Jesaja 66,23",
    text: "Und alles Fleisch wird einen Neumond nach dem andern und einen Sabbat nach dem andern kommen, anzubeten vor mir, spricht der HERR.",
  },
  {
    id: "mk2_27_28",
    path: "sabbath",
    ref: "Markus 2,27–28",
    text: "Und er sprach zu ihnen: Der Sabbat ist um des Menschen willen gemacht, und nicht der Mensch um des Sabbat willen. So ist des Menschen Sohn ein HERR auch des Sabbats.",
  },
  {
    id: "lk4_16",
    path: "sabbath",
    ref: "Lukas 4,16",
    text: "Und er kam gen Nazareth, da er erzogen war, und ging in die Schule nach seiner Gewohnheit am Sabbattage und stand auf und wollte lesen.",
  },
  {
    id: "heb4_9",
    path: "sabbath",
    ref: "Hebräer 4,9",
    text: "Darum ist noch eine Ruhe vorhanden dem Volke Gottes.",
  },
  {
    id: "dtn5_12_13",
    path: "sabbath",
    ref: "5. Mose 5,12–13",
    text: "Den Sabbattag sollst du halten, daß du ihn heiligest, wie dir der HERR, dein Gott, geboten hat. Sechs Tage sollst du arbeiten und alle deine Werke tun.",
  },
  {
    id: "pred9_5",
    path: "death",
    ref: "Prediger 9,5",
    text: "Denn die Lebendigen wissen, daß sie sterben werden; die Toten aber wissen nichts, sie haben auch keinen Lohn mehr, denn ihr Gedächtnis ist vergessen,",
  },
  {
    id: "pred12_7",
    path: "death",
    ref: "Prediger 12,7",
    text: "Denn der Staub muß wieder zu der Erde kommen, wie er gewesen ist, und der Geist wieder zu Gott, der ihn gegeben hat.",
  },
  {
    id: "1kor15_52",
    path: "death",
    ref: "1. Korinther 15,52",
    text: "und dasselbe plötzlich, in einem Augenblick, zur Zeit der letzten Posaune. Denn es wird die Posaune schallen, und die Toten werden auferstehen unverweslich, und wir werden verwandelt werden.",
  },
];
