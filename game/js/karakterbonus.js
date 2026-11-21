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
import { hoofdspeler } from './players.js';

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

// De uitleg in beeld (zichtbaar, niet verstopt): een korte regel per gebied met de bonussen in procenten.
export function uitlegRegel(karakter, gebied) {
  if (karakter === 'anita') {
    if (gebied === 'farm') {
      const b = farmBonus('anita');
      return `Tessa: boerendochter. Werk dat ${pct(b.snelheid)}% sneller mag, ${pct(b.opbrengst)}% meer oogst en minder fouten bij zaaien en oogsten.`;
    }
    const b = voetbalBonus('anita');
    return `Tessa: dorpsteam. ${pct(b.sprint)}% meer sprint, ${pct(b.schotnauwkeurigheid)}% scherper schot en ${pct(b.aanname)}% betere aanname.`;
  }
  return '';
}

// Een korte regel voor een HUD-strook (de strook van de boerderij): leeg voor wie geen bonus heeft.
export function kortRegel(karakter, gebied) {
  if (karakter !== 'anita') return '';
  return gebied === 'farm' ? `Tessa: boerendochter (${pct(farmBonus('anita').snelheid)}% sneller werk)` : `Tessa: dorpsteam (${pct(voetbalBonus('anita').sprint)}% sprint)`;
}

// --- de wissel: boeren en voetballen doe je als Tessa -------------------------------------------------------------
// Wie gaat farmen (in een machine van de boerderij, een boerderijklus) of voetballen (penaltyserie, wedstrijd) speelt dat als Tessa.
// Het spel wisselt dan op het bestaande mechanisme van story.js (de speler en de maat ruilen van personage, onder een korte
// fade met een regel) en wisselt terug als de activiteit klaar is. Het eigen personage blijft bewaard (karakterVoorSave), dus een
// save midden in een activiteit laadt als wie je was. Samen spelen: elke speler wisselt voor zichzelf op zijn eigen apparaat (de
// staat leeft op zijn eigen wereldobject); in een sessie met vaste personages (#95) blijft het lichaam zoals het is en gelden
// alleen de Tessa-regels (de bonus) tijdens de activiteit. Voetbal-sim: roep startActiviteit(w, 'voetbal') bij het begin van een
// wedstrijd of serie en eindActiviteit(w, 'voetbal') bij het einde (ook bij stoppen).
export const KARAKTER_VOOR_ACTIVITEIT = Object.freeze({ farm: 'anita', voetbal: 'anita' });
export const karakterVoorActiviteit = (soort) => KARAKTER_VOOR_ACTIVITEIT[soort] || null;
export const EINDE_WACHT_S = 4;   // zo lang buiten de machine voor de activiteit als geëindigd telt (even uitstappen wisselt niet)
const OVERNAME = Object.freeze({ farm: 'Tessa neemt het over: dit is haar terrein.', voetbal: 'Tessa neemt het over: dit is haar veld.' });
export const overnameTekst = (soort) => OVERNAME[soort] || 'Tessa neemt het over.';

let haak = null;   // { mag(w) -> bool, toon(w, tekst) }: story.js zet de rustige overgang (fade) en weet wanneer wisselen niet mag
export function zetWisselHaak(h) { haak = h || null; }

const lichaam = (w) => hoofdspeler(w);
const vast = (w) => !!(w && w.coop && w.coop.fixedChars);

function ruil(w, want) {
  const p = lichaam(w), c = w.companion;
  if (!p || p.character === want) return false;
  if (c && c.character === want) c.character = p.character;
  p.character = want;
  return true;
}

// De activiteit begint. Geeft true als het personage nu gewisseld is. Een tweede aanroep doet niets (houdt de activiteit vast).
export function startActiviteit(w, soort, via = 'eigen') {
  const want = karakterVoorActiviteit(soort);
  const p = lichaam(w);
  if (!w || !p || !want) return false;
  if (w.activiteitKar) { w.activiteitKar.uitSinds = 0; return false; }
  if (!vast(w) && haak && haak.mag && !haak.mag(w)) return false;   // niet midden in een scene of vlucht: later opnieuw
  w.activiteitKar = { soort, vorig: p.character, uitSinds: 0, via };
  if (vast(w) || p.character === want) return false;
  ruil(w, want);
  if (haak && haak.toon) haak.toon(w, overnameTekst(soort));
  else if (typeof w.addMessage === 'function') w.addMessage(overnameTekst(soort), 3);
  return true;
}

// De activiteit is voorbij: terug naar wie je was. Geeft true als er gewisseld is.
export function eindActiviteit(w, soort) {
  const a = w && w.activiteitKar;
  if (!a || (soort && a.soort !== soort)) return false;
  w.activiteitKar = null;
  if (vast(w)) return false;
  const gewisseld = ruil(w, a.vorig);
  if (gewisseld && haak && haak.toon) haak.toon(w, a.vorig === 'tammo' ? 'Tammo neemt het weer over.' : 'Tessa neemt het weer over.');
  return gewisseld;
}

// Per beeld voor een activiteit zonder eigen begin en einde (de boerderij: in een machine of niet). bezig=false telt pas na
// EINDE_WACHT_S als einde, zodat even uitstappen niet wisselt. Geeft 'start', 'eind' of null.
export function volgActiviteit(w, soort, bezig, dt = 0) {
  if (bezig) return startActiviteit(w, soort, 'beeld') ? 'start' : null;
  const a = w && w.activiteitKar;
  if (!a || a.soort !== soort || a.via !== 'beeld') return null;   // een activiteit met eigen einde (bijbaan, serie) beëindigt zichzelf
  a.uitSinds += Number.isFinite(dt) ? dt : 0;
  if (a.uitSinds < EINDE_WACHT_S) return null;
  eindActiviteit(w, soort);
  return 'eind';
}

// Wat een save bewaart: het eigen personage, niet het tijdelijke van de activiteit.
export function karakterVoorSave(w) {
  const p = lichaam(w);
  return w && w.activiteitKar ? w.activiteitKar.vorig : p ? p.character : 'tammo';
}
// Bij laden loopt een activiteit niet door; het personage komt uit de save.
export function wisActiviteit(w) { if (w) w.activiteitKar = null; }

// --- persona-regels: Tessa's achtergrond komt er af en toe terloops in (niet elke klus) -------------------------------------
export const PERSONA_COOLDOWN_S = 240;
export const PERSONA_KANS = 0.4;
const laatst = {};   // per soort: wanneer er voor het laatst een regel kwam (per apparaat, dus per speler)
export function personaRegel(soort, { rng = Math.random, nu = 0 } = {}) {
  const pool = PERSONA_POOL[soort];
  if (!pool || !pool.length) return null;
  if (Number.isFinite(laatst[soort]) && nu - laatst[soort] < PERSONA_COOLDOWN_S) return null;
  if (!(rng() < PERSONA_KANS)) return null;
  laatst[soort] = nu;
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}
export const wisPersona = () => { for (const k of Object.keys(laatst)) delete laatst[k]; };

// --- de teksten (alleen tekst, Nederlands, niet ingesproken; zie docs/verhaal/TTS-ACHTERSTAND-21-11-alleen-tekst.md) ---
export const LORE = 'Tessa komt van het platteland, ergens in Nederland: een dorp op de klei, een boerderij met een voetbalveldje achter de schuur. Ze molk koeien voor schooltijd en speelde in het dorpsteam.';

// Per soort een lijst: Tessa zelf, Tammo over haar ("Tessa weet dat soort dingen") en af en toe een voorbijganger.
const PERSONA_POOL = Object.freeze({
  farm: Object.freeze([
    'Tessa: Dit gaat mij sneller af, ik ben hier opgegroeid.',
    'Tessa: Ik molk dit soort koeien al voor schooltijd. Een akker is makkelijker.',
    'Tessa: Rechte rijen. Mijn vader zag het meteen als het scheef was.',
    'Tammo: Tessa weet dat soort dingen. Ik ook, maar zij eerder.',
    'Een boer langs de weg: "Die rij loopt als van iemand van het land."',
  ]),
  voetbal: Object.freeze([
    'Tessa: Zo deden we dat achter de schuur, met een lege mestemmer als doel.',
    'Tessa: Het dorpsteam leerde me één ding: nooit eerst naar de keeper kijken.',
    'Tammo: Tessa speelt al sinds haar zesde. Ik sinds vanochtend.',
  ]),
  land: Object.freeze([
    'Tessa: Die lucht betekent een bui voor het hooi. Mijn vader keek er altijd eerst naar.',
    'Tessa: Koeien gaan liggen voor regen, zeiden ze thuis. Het klopte half.',
    'Tammo: Tessa kent dieren. Ik ken eigenlijk alleen duiven.',
  ]),
});
export const PERSONA_SOORTEN = Object.freeze(Object.keys(PERSONA_POOL));

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
