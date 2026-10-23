// Samen spelen (#429): iedereen kiest zelf of hij meedoet met de opdracht van de gastheer. Pure logica.
// Bij het begin van een opdracht krijgt elke gast "Meedoen?" (J = ja, N = nee). Wie niet antwoordt doet na MEEDOEN_WACHT seconden
// mee (het bestaande gedrag). Wie nee zegt wordt niet vastgezet ("je kijkt even mee") en krijgt geen deel van de beloning:
// hij loopt vrij en doet zijn eigen dingen (winkelen, eten); de wereld van de gastheer blijft leidend. Waar het verhaal de
// gast-hoofdrol nodig heeft (coopRule: presence 'beide' of needsTwo, cooproles.js) is meedoen verplicht.
export const MEEDOEN_WACHT = 10;

// keuze per slot: 'wacht' (uitgenodigd), 'ja', 'nee' of 'verplicht'
export function maakMeedoen() { return { opdracht: null, keuze: {}, rest: {} }; }

// Zelfde opdracht als daarnet? (alleen de stap verandert dan)
export const opdrachtSleutel = (m) => (m && m.actief ? `${m.index | 0}|${m.label || ''}` : null);

// De gast-hoofdrol (plek 1) kan het verhaal niet missen als de stap beide spelers vraagt.
export function verplichtVoor(slot, regel) {
  return slot === 1 && !!regel && (regel.presence === 'beide' || !!regel.needsTwo);
}

// Een nieuwe opdracht begint: nodig de gasten uit. Geeft de uitnodigingen [{ slot, verplicht, sec }] terug.
export function begin(st, sleutel, slots, regel = null) {
  st.opdracht = sleutel; st.keuze = {}; st.rest = {};
  const uit = [];
  for (const slot of slots) {
    if (!(slot >= 1)) continue;
    const verplicht = verplichtVoor(slot, regel);
    st.keuze[slot] = verplicht ? 'verplicht' : 'wacht';
    if (!verplicht) st.rest[slot] = MEEDOEN_WACHT;
    uit.push({ slot, verplicht, sec: MEEDOEN_WACHT });
  }
  return uit;
}
// Een gast sluit aan terwijl de opdracht al loopt: dezelfde uitnodiging als wie erbij was. Wie al gekozen heeft (opnieuw aangesloten) wordt niet nogmaals gevraagd.
export function laat(st, slot, regel = null) {
  if (!st.opdracht || !(slot >= 1)) return null;
  const k = st.keuze[slot];
  if (k === 'ja' || k === 'nee' || k === 'verplicht') return null;
  const verplicht = verplichtVoor(slot, regel);
  st.keuze[slot] = verplicht ? 'verplicht' : 'wacht';
  if (!verplicht) st.rest[slot] = MEEDOEN_WACHT; else delete st.rest[slot];
  return { slot, verplicht, sec: MEEDOEN_WACHT };
}
export function einde(st) { st.opdracht = null; st.keuze = {}; st.rest = {}; }

// Het antwoord van een gast; een verplichte rol of een late of onbekende speler verandert niets.
export function antwoord(st, slot, ja) {
  if (st.keuze[slot] !== 'wacht') return false;
  st.keuze[slot] = ja ? 'ja' : 'nee'; delete st.rest[slot];
  return true;
}
// Time-out: wie niet antwoordt doet mee. Geeft de slots die zo meedoen.
export function tik(st, dt) {
  const klaar = [];
  for (const k of Object.keys(st.rest)) {
    st.rest[k] -= dt;
    if (st.rest[k] <= 0) { delete st.rest[k]; if (st.keuze[k] === 'wacht') { st.keuze[k] = 'ja'; klaar.push(+k); } }
  }
  return klaar;
}

// Loopt deze gast vrij? Tijdens het vragen en na 'nee': geen vastzetten. Zonder keuze (geen opdracht, laat aangesloten): oud gedrag.
export function loopVrij(st, slot) { const k = st.keuze[slot]; return k === 'nee' || k === 'wacht'; }
// Krijgt deze gast zijn deel van de beloning? Alleen wie nee zei niet.
export function krijgtDeel(st, slot) { return st.keuze[slot] !== 'nee'; }

// ---- de gast zelf: de uitnodiging op zijn scherm
export function maakUitnodiging(b) {
  if (!b || b.k !== 'meedoen' || typeof b.label !== 'string') return null;
  const sec = Number.isFinite(b.sec) ? Math.min(30, Math.max(1, b.sec)) : MEEDOEN_WACHT;
  return { label: b.label.slice(0, 80), verplicht: !!b.verplicht, rest: sec };
}
export function uitnodigingTekst(u, naam = 'De ander') {
  if (!u) return '';
  return u.verplicht ? `${naam} speelt ${u.label}. Het verhaal heeft jou nodig: je doet mee.` : `Meedoen met ${u.label}? J = ja, N = nee (anders doe je over ${Math.ceil(u.rest)} seconden mee).`;
}
