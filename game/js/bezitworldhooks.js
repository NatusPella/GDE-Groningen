// De haken van Bezit naar de wereld (epic #1095, #1101): de boerenregels van Tessa bij een gebeurtenis (tessarules.js) en de dagrapportage voor de zichtbare
// werkers (farmworkers.js). Puur: geen THREE, geen DOM, geen klok, geen Math.random, geen opslag buiten bezit.x.tessa (scripts/herdview_test.mjs). bezitlive.js
// importeert dit niet (de bouwer koppelt): koopPerceel roept onParcelBought aan, huurArbeider onWorkerHired, het neerzetten van vee onHerdStocked en main.js
// onDayReport met wat dagTik teruggeeft. Elke functie geeft de regel (met "Tessa: ") of null; tonen doet de aanroeper met deliverLine (alleen tekst, geen TTS).
// Tessa praat hier als boerin: de regels horen bij de activiteit 'farm' (characterForActivity), ook als je het beheer als Tammo doet. De staat (wat al getoond is
// en de cooldown) zit in het eigen bezit, per speler (#429), en wordt niet gedeeld.
import { pickTessaLine, tessaOf, parcelEventFor } from './tessarules.js';
import { characterForActivity } from './karakterbonus.js';
import { herdsOf } from './livestock.js';
import { staffOf } from './farmstaff.js';
import { noteStaffWork } from './farmworkers.js';

const withName = (r) => (r ? `Tessa: ${r.text}` : null);
const farmCharacter = () => characterForActivity('farm');

// Eén gebeurtenis aan Tessa voorleggen. Geeft de regel of null (kans, cooldown, al eerder getoond).
export function tessaLineFor(bezit, event, key, day, character = farmCharacter()) {
  if (!bezit) return null;
  return withName(pickTessaLine(tessaOf(bezit), { character, event, key, day }));
}

// Het eerste perceel in een streek: klei, zand of veen, met de streek als sleutel. region is een streek-id van bezitprijs.js.
export function tessaLineForPurchase(bezit, region, day, character = farmCharacter()) {
  const e = parcelEventFor(region);
  return tessaLineFor(bezit, e.event, e.key, day, character);
}

// De haken voor de rest, in de volgorde van het ontwerp (5.9).
export const onParcelBought = (bezit, region, day) => tessaLineForPurchase(bezit, region, day);
export const onWorkerHired = (bezit, day) => tessaLineFor(bezit, 'eerste-personeel', '', day);
export const onHerdStocked = (bezit, day) => tessaLineFor(bezit, 'eerste-vee', '', day);
export const onLeasedOut = (bezit, day) => tessaLineFor(bezit, 'eerste-pacht', '', day);
export const onFirstHarvest = (bezit, gewas, day) => tessaLineFor(bezit, 'eerste-oogst', String(gewas || ''), day);

// Het rapport van een speldag (wat bezitlive.dagTik teruggeeft: { to, worked, ... }): zet de bewerkte percelen klaar voor de zichtbare werkers en zoekt de
// eerste regel van Tessa die nu past (een oogst van het personeel, vee, personeel, pacht). Geeft de regel of null; hoogstens één per aanroep.
export function onDayReport(bezit, rep) {
  if (!rep) return null;
  noteStaffWork(rep.to, rep.worked);
  if (!bezit) return null;
  const day = Number.isFinite(rep.to) ? rep.to : 0;
  for (const j of rep.worked || []) {
    if (j.gewas && j.kg > 0) { const l = onFirstHarvest(bezit, j.gewas, day); if (l) return l; }
  }
  if (Object.keys(herdsOf(bezit)).length) { const l = onHerdStocked(bezit, day); if (l) return l; }
  if (staffOf(bezit).workers.length) { const l = onWorkerHired(bezit, day); if (l) return l; }
  for (const id in bezit.parcels) if (bezit.parcels[id].m === 'leased') return onLeasedOut(bezit, day);
  return null;
}

// Een regel in beeld zetten (de bestaande meldingskeuze van het spel; geen gesproken regel).
export function deliverLine(w, text, dur = 6) {
  if (!text || !w || typeof w.addMessage !== 'function') return false;
  w.addMessage(text, dur);
  return true;
}
