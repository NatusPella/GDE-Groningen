// Karakterbonus (#1005, #981): wat een speelbaar personage extra kan. Tessa komt van het platteland ("ergens op het platteland in
// Nederland", bewust vaag): tot haar achtste een dorp op de klei, een boerderij met een voetbalveldje achter de schuur. Ze molk koeien voor
// schooltijd en speelde in het dorpsteam. Daarom kan ze iets beter boeren en voetballen; Tammo kan het ook, alleen minder vlot.
// Puur en ontkoppeld: een gegevenstabel plus een paar formules, geen DOM, geen wereld, geen THREE. Het voetbal (voetbal*.js) en de
// boerderij (boerderij.js, werktuigen.js, werkgang.js, boerderijlive.js) lezen hier; dit bestand leest niets van hen.
// Karakter-ids zijn die van world.player.character: 'tammo' en 'anita' (de speler ziet "Tessa").
// Samen spelen: het personage is per speler. Wie de formules aanroept geeft het karakter van het eigen lichaam mee
// (hoofdspeler(w).character); een bonus geldt dus voor die speler en nooit voor de wereld of voor de andere speler.
// Test: scripts/karakterbonus_test.mjs. Docs: docs/COOP-GAST.md, docs/verhaal/OPENING-BIJBEL.md (Tessa komt van het platteland).

// Neutraal: factor 1 en geen foutenhulp. Een onbekend personage (of geen) krijgt dit.
export const NEUTRAAL = Object.freeze({
  farm: Object.freeze({ snelheid: 1, opbrengst: 1, foutloos: 0 }),
  voetbal: Object.freeze({ sprint: 1, schotnauwkeurigheid: 1, aanname: 1 }),
});

// De tabel. farm.snelheid: factor op de werksnelheid waarbij het werk nog netjes is (de bovengrens van de snelheidsband, dus
// ongeveer 15% sneller klaar); farm.opbrengst: factor op de oogst; farm.foutloos (0..1): hoeveel van de slordigheid bij zaaien en
// oogsten wegvalt. voetbal.sprint: factor op de sprintsnelheid; voetbal.schotnauwkeurigheid: factor op de nauwkeurigheid van het
// schot (kleinere spreiding); voetbal.aanname: factor op de kans dat een pass of bal goed wordt aangenomen.
export const KARAKTER_BONUS = Object.freeze({
  tammo: NEUTRAAL,
  anita: Object.freeze({
    farm: Object.freeze({ snelheid: 1.15, opbrengst: 1.05, foutloos: 0.4 }),
    voetbal: Object.freeze({ sprint: 1.06, schotnauwkeurigheid: 1.08, aanname: 1.1 }),
  }),
});

// Grenzen: geen formule mag door een foute tabel onoverwinbaar of NaN worden.
export const MAX_FACTOR = 1.25;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const getal = (v, d) => (Number.isFinite(v) ? v : d);

// De bonussen van een personage voor een gebied ('farm' of 'voetbal'); onbekend geeft het neutrale.
export function bonusVoor(karakter, gebied) {
  const rij = KARAKTER_BONUS[karakter] || NEUTRAAL;
  return rij[gebied] || NEUTRAAL[gebied] || {};
}
export const farmBonus = (karakter) => bonusVoor(karakter, 'farm');
export const voetbalBonus = (karakter) => bonusVoor(karakter, 'voetbal');
export const heeftBonus = (karakter) => karakter === 'anita';

const factor = (v) => clamp(getal(v, 1), 1, MAX_FACTOR);

// Farm: de netheid van een klus (0..1). Alleen zaaien en oogsten krijgen foutenhulp: een deel van wat er misging valt weg.
export function farmFractie(karakter, taak, fractie) {
  const f = clamp(getal(fractie, 0), 0, 1);
  if (taak !== 'zaaien' && taak !== 'oogsten') return f;
  const hulp = clamp(getal(farmBonus(karakter).foutloos, 0), 0, 0.6);
  return clamp(f + (1 - f) * hulp, 0, 1);
}
export const farmOpbrengst = (karakter) => factor(farmBonus(karakter).opbrengst);
export const farmSnelheid = (karakter) => factor(farmBonus(karakter).snelheid);

// Voetbal: de factoren voor de voetbal-sim (een getal om mee te vermenigvuldigen; 1 is neutraal).
export const voetbalSprint = (karakter) => factor(voetbalBonus(karakter).sprint);
export const voetbalSchot = (karakter) => factor(voetbalBonus(karakter).schotnauwkeurigheid);
export const voetbalAanname = (karakter) => factor(voetbalBonus(karakter).aanname);
// Een kans (0..1) met de aanname-bonus: nooit boven 0,99, zodat een bal nooit gegarandeerd goed gaat.
export const aannameKans = (karakter, kans) => clamp(getal(kans, 0) * voetbalAanname(karakter), 0, 0.99);

const pct = (f) => Math.round((f - 1) * 100);

// De uitleg in beeld (zichtbaar, niet verstopt): een korte regel per gebied met de bonussen in procenten. Tammo krijgt de
// eerlijke tegenhanger: hij kan het ook, alleen minder vlot.
export function uitlegRegel(karakter, gebied) {
  if (karakter === 'anita') {
    if (gebied === 'farm') {
      const b = farmBonus('anita');
      return `Tessa: boerendochter. Werk dat ${pct(b.snelheid)}% sneller mag, ${pct(b.opbrengst)}% meer oogst en minder fouten bij zaaien en oogsten.`;
    }
    const b = voetbalBonus('anita');
    return `Tessa: dorpsteam. ${pct(b.sprint)}% meer sprint, ${pct(b.schotnauwkeurigheid)}% scherper schot en ${pct(b.aanname)}% betere aanname.`;
  }
  return gebied === 'farm' ? 'Tammo kan het ook, alleen wat minder vlot dan Tessa.' : 'Tammo voetbalt ook, alleen wat minder vlot dan Tessa.';
}

// Een korte regel voor een HUD-strook (de strook van de boerderij): leeg voor wie geen bonus heeft.
export function kortRegel(karakter, gebied) {
  if (karakter !== 'anita') return '';
  return gebied === 'farm' ? `Tessa: boerendochter (${pct(farmBonus('anita').snelheid)}% sneller werk)` : `Tessa: dorpsteam (${pct(voetbalBonus('anita').sprint)}% sprint)`;
}

// --- de teksten (alleen tekst, Nederlands, niet ingesproken; zie docs/verhaal/TTS-ACHTERSTAND-21-11-alleen-tekst.md) ---
export const LORE = 'Tessa komt van het platteland, ergens in Nederland: een dorp op de klei, een boerderij met een voetbalveldje achter de schuur. Ze molk koeien voor schooltijd en speelde in het dorpsteam.';

export const TESSA_REGELS = Object.freeze({
  farm: Object.freeze({
    hud: 'Tessa: boerendochter. Dit gaat mij sneller af, ik ben hier opgegroeid.',
    start: Object.freeze([
      'Tessa: Dit gaat mij sneller af, ik ben hier opgegroeid.',
      'Tessa: Ik molk dit soort koeien al voor schooltijd. Een akker is makkelijker.',
      'Tessa: Rechte rijen. Mijn vader zag het meteen als het scheef was.',
    ]),
    klaar: 'Tessa: Zo hoort het. Mijn vader zou knikken, en dat doet hij nooit.',
    beat: 'Een boer langs de weg: "Jij komt niet uit de stad, hè?" Tessa: "Nee. Ergens op het platteland. Ik ruik nog naar koe."',
    telefoon: 'Mam: Ik zag in het nieuws een trekker. Jij, hè? Eet iets. Pa vraagt of de kleppen goed staan.',
  }),
  voetbal: Object.freeze({
    uitleg: 'Tessa speelt al sinds haar zesde in het dorpsteam. Ze rent harder, schiet scherper en neemt de bal beter aan.',
    viering: Object.freeze([
      'Tessa: Zo deden we dat achter de schuur, met een lege mestemmer als doel.',
      'Tessa: Het dorpsteam is trots. Ook al weten ze het nog niet.',
    ]),
    keepersneer: Object.freeze([
      'Tessa tegen de keeper: Heb je ooit een bal gekeerd die over een koe heen kwam?',
      'Tessa tegen de keeper: Mijn zus in doel hield er meer tegen. Ze was negen.',
    ]),
    tegenstandersneer: Object.freeze([
      'Tessa tegen de verdediger: Ik speelde in de modder. Dit is een tapijt.',
      'Tessa tegen de tegenstander: Stadsjongen, hè? Dat zie je aan je schoenen.',
    ]),
  }),
  telefoon: Object.freeze({
    kiekdoar: 'KIEKDOAR: Boerendochter blijkt snelle voeten te hebben: "Ze rende al achter de koeien aan."',
  }),
  prestatie: Object.freeze({ id: 'boerendochter', titel: 'Boerendochter', desc: 'Oogst als Tessa een veld op je eigen akker' }),
});
