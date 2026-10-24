// Samen een bus rijden (#444, coöp): rollen, wie er deelneemt aan de dienst, kaartjes valideren en de beloning per halte.
// Alle spelers zijn gelijkwaardig; de gastheer is alleen wie host. De chauffeur rijdt (het stuur is wisselbaar met Y, wiel*
// in coopnet.js), een tweede speler is hulpje: die bedient de deuren (O) en valideert de kaartjes van wie instapt (E).
// Puur: geen THREE, geen DOM, geen netwerk. coopbus.js is de lijm met het spel. Tests: scripts/coop/buscoop_test.mjs.
import { lateInstapVoor } from './coopmeedoen.js';
import { beloningVoorGebeurtenis, gebeurtenisId } from './coopbeloning.js';

export const VALIDEER_BONUS = 0.5;   // euro per gevalideerde reiziger
export const HALTE_BASIS = 3;        // euro per halte
export const HALTE_PER_REIZIGER = 0.8;

export function maakBusCoop(sessie = 's') {
  return { sessie: String(sessie).slice(0, 16), deelnemers: [], chauffeur: 0, begonnen: false, wacht: 0, gevalideerd: 0, haltes: 0, geboekt: 0 };
}

// Een dienst die loopt telt geen late instap: wie na de start instapt rijdt mee als reiziger, zonder rol of deel (lateInstapVoor met een klok).
export const LATE_INSTAP = lateInstapVoor({ type: 'bus', timer: true });

// Bij de start: wie dan aan boord zit (stoelen: slots van de medespelers) doet mee, plus de chauffeur. slot 0 is de gastheer, maar
// de chauffeur kan ook een ander zijn (het stuur is overgedragen).
export function startDienst(bc, { chauffeur = 0, aanboord = [] } = {}) {
  const lijst = [chauffeur, ...aanboord].filter((s) => Number.isInteger(s) && s >= 0);
  bc.deelnemers = [...new Set(lijst)];
  bc.chauffeur = chauffeur;
  bc.begonnen = true;
  bc.wacht = 0; bc.gevalideerd = 0; bc.haltes = 0;
  return bc;
}

export const doetMee = (bc, slot) => bc.deelnemers.includes(slot);
export const magDelen = doetMee;

// De rol van een speler die in de bus zit: chauffeur, hulpje (laagste meedoende slot dat niet de chauffeur is), passagier (doet mee,
// zonder taak) of 'kijkt mee' (later ingestapt). Hulpje is er alleen als er iemand anders dan de chauffeur meedoet.
export function hulpjeSlot(bc) {
  const rest = bc.deelnemers.filter((s) => s !== bc.chauffeur).sort((a, b) => a - b);
  return rest.length ? rest[0] : null;
}
export function rolVan(bc, slot) {
  if (!bc.begonnen || !doetMee(bc, slot)) return 'kijkt mee';
  if (slot === bc.chauffeur) return 'chauffeur';
  return slot === hulpjeSlot(bc) ? 'hulpje' : 'passagier';
}
// Deuren (O): de chauffeur en het hulpje.
export const magDeur = (bc, slot) => { const r = rolVan(bc, slot); return r === 'chauffeur' || r === 'hulpje'; };

// Het stuur wordt overgedragen (Y): de nieuwe chauffeur moet meedoen. Geeft true als het gelukt is.
export function wisselChauffeur(bc, naar) {
  if (!bc.begonnen || !doetMee(bc, naar) || naar === bc.chauffeur) return false;
  bc.chauffeur = naar;
  return true;
}

// Een speler valt weg of stapt uit. Valt de chauffeur weg, dan neemt een medespeler het stuur over, of de bus remt veilig af en
// blijft staan. Geeft { actie: 'doorgaan' | 'overnemen' | 'remmen', chauffeur }.
export function valtWeg(bc, slot, aanboord = []) {
  if (!bc.begonnen) return { actie: 'doorgaan', chauffeur: bc.chauffeur };
  const nog = bc.deelnemers.filter((s) => s !== slot && (s === bc.chauffeur || aanboord.includes(s)));
  if (slot !== bc.chauffeur) { bc.deelnemers = bc.deelnemers.filter((s) => s !== slot); return { actie: 'doorgaan', chauffeur: bc.chauffeur }; }
  bc.deelnemers = bc.deelnemers.filter((s) => s !== slot);
  const nieuw = nog.filter((s) => s !== slot).sort((a, b) => a - b)[0];
  if (nieuw === undefined) return { actie: 'remmen', chauffeur: null };
  bc.chauffeur = nieuw;
  return { actie: 'overnemen', chauffeur: nieuw };
}

// Kaartjes: elke instapper moet gevalideerd worden door wie dat mag (het hulpje, of de chauffeur zonder hulpje). nieuweHalte zet
// het aantal wachtende instappers; valideer telt er één af.
export function nieuweHalte(bc, instappers) { bc.wacht = Math.max(0, instappers | 0); bc.gevalideerd = 0; bc.haltes++; return bc.wacht; }
export const wachtend = (bc) => Math.max(0, bc.wacht - bc.gevalideerd);
export function valideer(bc, slot) {
  if (!bc.begonnen || !doetMee(bc, slot)) return { ok: false, reden: 'geen rol' };
  const r = rolVan(bc, slot);
  if (r === 'passagier') return { ok: false, reden: 'geen rol' };
  if (r === 'chauffeur' && hulpjeSlot(bc) !== null) return { ok: false, reden: 'hulpje' }; // met een hulpje valideert de chauffeur niet
  if (!(wachtend(bc) > 0)) return { ok: false, reden: 'niemand' };
  bc.gevalideerd++;
  return { ok: true, gevalideerd: bc.gevalideerd, resterend: wachtend(bc) };
}

// Het bedrag van één halte voor de hele bus (voor de verdeling: coopDeel van coopnet.js, gelijk met samenwerkingsbonus):
// meer reizigers en meer tevredenheid is meer geld; elke gevalideerde reiziger een kleine bonus. Hele euro's, minimaal 1 bij een uitwisseling.
export function haltebedrag({ board = 0, alight = 0, sat = 80, gevalideerd = 0 } = {}) {
  const uitw = Math.max(0, board) + Math.max(0, alight);
  if (!uitw) return 0;
  const tev = 0.8 + 0.4 * Math.min(100, Math.max(0, sat)) / 100;
  return Math.max(1, Math.round((HALTE_BASIS + HALTE_PER_REIZIGER * uitw) * tev + VALIDEER_BONUS * Math.max(0, gevalideerd)));
}

// De beloning van een halte als gebeurtenis (één keer toe te kennen, per id): { id, totaal, bonus, bedragen } over de deelnemers die
// nu verbonden zijn (slots). null zonder uitwisseling.
export function haltebeloning(bc, { board, alight, sat, slots = null }) {
  const bedrag = haltebedrag({ board, alight, sat, gevalideerd: bc.gevalideerd });
  if (!bedrag) return null;
  bc.geboekt++;
  return beloningVoorGebeurtenis({ id: gebeurtenisId(bc.sessie, 'bus', bc.geboekt), totaal: bedrag, deelnemers: slots || bc.deelnemers });
}
