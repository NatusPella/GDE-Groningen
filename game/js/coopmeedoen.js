// Samen spelen (#429): iedereen kiest zelf of hij meedoet met de opdracht van de gastheer. Pure logica.
// Bij het begin van een opdracht krijgt elke gast "Meedoen?" (J = ja, N = nee). Geen antwoord is nee (#452): wie afwezig is of
// niet reageert kijkt mee als toeschouwer, zonder deel van de beloning; de uitnodiging blijft in beeld tot de gast antwoordt
// of de opdracht voorbij is (een late J telt, behalve bij een opdracht die geen late instap kent, zie coopnet.js nodigLaatUit).
// Wie nee zegt wordt niet vastgezet ("je kijkt even mee") en krijgt geen deel van de beloning:
// hij loopt vrij en doet zijn eigen dingen (winkelen, eten); de wereld van de gastheer blijft leidend. Waar het verhaal de
// gast-hoofdrol nodig heeft (coopRule: presence 'beide' of needsTwo, cooproles.js) is meedoen verplicht.
import { statusTekst, BEVESTIG_GAST, BEVESTIG_HOST, geldigeStap } from './coopverhaal.js';
export const MEEDOEN_WACHT = 10; // zo lang staat de melding "Meedoen?" in beeld; de uitnodiging zelf blijft

// keuze per slot: 'wacht' (uitgenodigd), 'ja', 'nee' of 'verplicht'
// stap = de verhaalstap van de opdracht (coopverhaal.js), spoiler = wie een spoilerwaarschuwing te bevestigen heeft (geen standaard-ja)
export function maakMeedoen() { return { opdracht: null, keuze: {}, rest: {}, stap: null, spoiler: {}, sinds: 0 }; }

// Late instap (#452): mag een gast die later komt (of na het begin J zegt) nog meedoen? Nee bij een race of wedstrijd, een kluisklus
// en alles met een klok; ja bij open stukken (lopen, praten, instappen, een scène). De vlag hoort bij de opdracht en bij de stap.
export const LATE_GRENS = 15; // zoveel seconden na het begin van de opdracht telt een J als late instap
const GEEN_LATE_TYPE = ['checkpoint', 'boat', 'fatbike', 'stunt']; // ringrace, bruggenrace, Jelle-race, rondjes en stunts
const GEEN_LATE_STAGE = ['laser', 'crack', 'vault', 'lock', 'fuse', 'blast', 'plan', 'chase', 'boatchase', 'getaway', 'escape', 'hold']; // de kluis en wat tegen de klok gaat
export function lateInstapVoor({ type = '', stageKind = null, timer = false, race = false } = {}) {
  if (timer || race) return false;
  if (GEEN_LATE_TYPE.includes(type)) return false;
  if (stageKind && GEEN_LATE_STAGE.includes(stageKind)) return false;
  return true;
}

// Zelfde opdracht als daarnet? (alleen de stap verandert dan)
export const opdrachtSleutel = (m) => (m && m.actief ? `${m.index | 0}|${m.label || ''}` : null);

// De gast-hoofdrol (plek 1) kan het verhaal niet missen als de stap beide spelers vraagt.
export function verplichtVoor(slot, regel) {
  return slot === 1 && !!regel && (regel.presence === 'beide' || !!regel.needsTwo);
}

// Een nieuwe opdracht begint: nodig de gasten uit. Geeft de uitnodigingen [{ slot, verplicht, sec }] terug.
export function begin(st, sleutel, slots, regel = null, stap = null) {
  st.opdracht = sleutel; st.keuze = {}; st.rest = {}; st.spoiler = {}; st.stap = stap; st.sinds = 0;
  const uit = [];
  for (const slot of slots) {
    if (!(slot >= 1)) continue;
    const verplicht = verplichtVoor(slot, regel);
    st.keuze[slot] = verplicht ? 'verplicht' : 'wacht';
    uit.push({ slot, verplicht, sec: MEEDOEN_WACHT });
  }
  return uit;
}
// Een gast sluit aan terwijl de opdracht al loopt: dezelfde uitnodiging als wie erbij was. Wie al gekozen heeft (opnieuw aangesloten) wordt niet nogmaals gevraagd.
// mag = false (de opdracht kent geen late instap): de gast wordt toeschouwer en krijgt geen uitnodiging.
export function laat(st, slot, regel = null, mag = true) {
  if (!st.opdracht || !(slot >= 1)) return null;
  const k = st.keuze[slot];
  if (k === 'ja' || k === 'nee' || k === 'verplicht') return null;
  if (!mag) { st.keuze[slot] = 'nee'; delete st.rest[slot]; delete st.spoiler[slot]; return { slot, toeschouwer: true }; }
  const verplicht = verplichtVoor(slot, regel);
  st.keuze[slot] = verplicht ? 'verplicht' : 'wacht';
  delete st.rest[slot];
  return { slot, verplicht, sec: MEEDOEN_WACHT };
}
export function einde(st) { st.sinds = 0; st.opdracht = null; st.keuze = {}; st.rest = {}; st.stap = null; st.spoiler = {}; }

// Het antwoord van een gast; een verplichte rol of een late of onbekende speler verandert niets.
export function antwoord(st, slot, ja) {
  if (st.keuze[slot] !== 'wacht') return false;
  st.keuze[slot] = ja ? 'ja' : 'nee'; delete st.rest[slot]; delete st.spoiler[slot];
  return true;
}
// De gast leest een spoilerwaarschuwing (zijn eigen verhaal is nog niet zover): geen standaard-ja meer, hij moet zelf J zeggen;
// zonder antwoord valt hij na BEVESTIG_HOST seconden af (nee). Wie bevestigt loopt intussen vrij en krijgt nog geen deel.
export function bevestig(st, slot) {
  if (st.keuze[slot] !== 'wacht') return false;
  st.spoiler[slot] = true; st.rest[slot] = BEVESTIG_HOST;
  return true;
}
// Time-out: alleen een spoilerwaarschuwing zonder bevestiging loopt af (nee). Wie gewoon niet antwoordt is toeschouwer en doet nooit vanzelf mee (#452).
export function tik(st, dt) {
  const klaar = [];
  if (st.opdracht) st.sinds = (st.sinds || 0) + dt;
  for (const k of Object.keys(st.rest)) {
    st.rest[k] -= dt;
    if (st.rest[k] <= 0) {
      delete st.rest[k];
      if (st.keuze[k] === 'wacht') { if (st.spoiler[k]) { st.keuze[k] = 'nee'; delete st.spoiler[k]; } }
    }
  }
  return klaar;
}

// Loopt deze gast vrij? Tijdens het vragen en na 'nee': geen vastzetten. Zonder keuze (geen opdracht, laat aangesloten): oud gedrag.
export function loopVrij(st, slot) { const k = st.keuze[slot]; return k === 'nee' || k === 'wacht'; }
// Krijgt deze gast zijn deel van de beloning? Alleen wie nee zei niet.
export function krijgtDeel(st, slot) { return st.keuze[slot] !== 'nee' && st.keuze[slot] !== 'wacht'; }
// Wie speelt de opdracht echt mee (en krijgt dus ook de verhaalstap in zijn eigen spel)? Alleen wie ja zei of verplicht meedoet.
// Wie nog niets zei, nee zei, een spoiler nog niet bevestigde of nooit is uitgenodigd (late of oude gast) is toeschouwer.
export function meespelers(st) {
  return Object.keys(st.keuze).map(Number).filter((s) => st.keuze[s] === 'ja' || st.keuze[s] === 'verplicht');
}

// ---- de gast zelf: de uitnodiging op zijn scherm
// status = wat de gast zelf weet van zijn eigen verhaal bij deze stap (coopverhaal.js verhaalStatus): 'gedaan', 'normaal', 'vooruit' of null
export function maakUitnodiging(b, status = null) {
  if (!b || b.k !== 'meedoen' || typeof b.label !== 'string') return null;
  const stap = geldigeStap(b.stap);
  const st = stap && (status === 'gedaan' || status === 'vooruit') ? status : null;
  const sec = st === 'vooruit' ? BEVESTIG_GAST : Number.isFinite(b.sec) ? Math.min(30, Math.max(1, b.sec)) : MEEDOEN_WACHT;
  return { label: b.label.slice(0, 80), verplicht: !!b.verplicht, rest: sec, stap, status: st };
}
// De melding voor een laatkomer bij een opdracht zonder late instap.
export const toeschouwerTekst = (label) => `${String(label || 'De opdracht').slice(0, 60)} loopt al, de volgende doe je mee.`;
export function uitnodigingTekst(u, naam = 'De ander') {
  if (!u) return '';
  if (u.status && !u.verplicht) return statusTekst(u.status, u.label, u.rest);
  return u.verplicht ? `${naam} speelt ${u.label}. Het verhaal heeft jou nodig: je doet mee.` : `Meedoen met ${u.label}? J = ja, N = nee (zonder antwoord kijk je mee).`;
}
