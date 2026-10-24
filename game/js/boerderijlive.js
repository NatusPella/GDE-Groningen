// Eigen boerderij (#415): de haken van het spel naar boerderij.js. Houdt de boerderij van deze speler bij in de eigen opslag
// (gde-boerderij-v1, los van elke savegame, net als de loopbaan), telt de speluren mee uit de klok van het spel, betaalt huur,
// zaaigoed en machines uit het geld van de speler en verkoopt de oogst met de loonfactor van het vak Landbouw. Geen DOM en geen THREE
// (scripts/boerderij_live_test.mjs).
//
// Samen spelen: de boerderij is van wie speelt, op zijn eigen apparaat. Een gast draait updateGameplay niet, dus zijn gewassen groeien
// niet terwijl hij in de wereld van een ander meespeelt; ze wachten op hem. Wat wie het spel opende verdient met een verkoop deelt hij
// zoals alle verdiensten met de gasten (loopbaanVerdien).

import { KEYS } from './storagekeys.js';
import { noteMoney } from './finance.js';
import { loopbaanVerdien, loopbaanTel } from './loopbaanlive.js';
import * as B from './boerderij.js';
import * as PC from './percelen.js';

const SCHRIJF_VERTRAGING_MS = 2000;
export const VAK = 'landbouw';

let boer = null;
let opslagOverride = null;
let timer = 0;
let vuil = false;
let vorigeKlok = null;
let laatsteSchrijf = -Infinity;

const opslag = () => {
  if (opslagOverride !== null) return opslagOverride;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
};

export function getBoerderij() {
  if (!boer) {
    const st = opslag();
    let raw = null;
    try { raw = st ? st.getItem(KEYS.boerderij) : null; } catch (e) { raw = null; }
    boer = raw == null ? B.nieuweBoerderij() : B.normaliseer(raw);
  }
  return boer;
}

export function schrijfNu() {
  timer = 0;
  if (!vuil) return;
  const st = opslag();
  if (!st) return;
  try {
    st.setItem(KEYS.boerderij, JSON.stringify(getBoerderij()));
    vuil = false;
  } catch (e) { /* opslag vol of geblokkeerd: de boerderij blijft in dit spel */ }
}

function markeer() {
  vuil = true;
  if (!timer && typeof setTimeout === 'function') { timer = setTimeout(schrijfNu, SCHRIJF_VERTRAGING_MS); if (timer && timer.unref) timer.unref(); }
}

export function initBoerderij({ opslag: st } = {}) {
  if (vuil) schrijfNu();
  if (st !== undefined) opslagOverride = st;
  boer = null;
  vuil = false;
  vorigeKlok = null;
  getBoerderij();
  if (typeof window !== 'undefined' && window.__debug) window.__debug.boerderij = { get: getBoerderij, tik: (u) => { B.tikUren(getBoerderij(), u); markeer(); }, kies: kiesGewas };
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('pagehide', () => { if (timer) clearTimeout(timer); schrijfNu(); });
  return boer;
}

// Elk beeld (updateGameplay): de speluren die voorbij zijn gegaan. Een sprong vooruit (slapen, de trein) telt mee; een sprong terug
// (een lading) niet. Het schrijven gebeurt hooguit elke minuut.
export function boerderijTijd(w, nu = w && w.time) {
  const klok = w && w.clock;
  if (!Number.isFinite(klok)) return 0;
  let uren = 0;
  if (vorigeKlok != null) {
    const d = ((klok - vorigeKlok) % 24 + 24) % 24;
    if (d < 12) uren = d;
  }
  vorigeKlok = klok;
  if (uren > 0) {
    B.tikUren(getBoerderij(), uren);
    huurTik(w);
    vuil = true;
    if (Number.isFinite(nu) && nu - laatsteSchrijf > 60) { laatsteSchrijf = nu; markeer(); }
  }
  return uren;
}

// Een gast die net aansluit krijgt de klok van de gastheer: dat sprongetje telt niet als groeitijd (main.js, #429).
export function boerderijKlokNul() { vorigeKlok = null; }

// Het perceel van de speler staat vast zodra het gevonden is: bewaar het, zodat het er de volgende keer nog ligt.
export function zetPerceel(perceel) {
  const b = getBoerderij();
  if (!perceel || !Number.isFinite(perceel.x) || !Number.isFinite(perceel.y)) return false;
  b.perceel = { x: perceel.x, y: perceel.y, a: Number.isFinite(perceel.a) ? perceel.a : 0 };
  markeer();
  return true;
}

export function kiesGewas(gewas) {
  const ok = B.kiesGewas(getBoerderij(), gewas);
  if (ok) markeer();
  return ok;
}

// Een taak beginnen: de kosten gaan van het geld af (huur van de machine, zaaigoed of mest). { ok, kosten } of { ok: false, reden }.
export function neemTaak(w, taak) {
  const b = getBoerderij();
  const m = B.magTaak(b, taak, w.money || 0);
  if (!m.ok) return m;
  if (m.kosten.totaal > 0) { noteMoney('Winkels'); w.money -= m.kosten.totaal; }
  return m;
}

// Een taak is gedaan: het perceel verandert en het vak Landbouw telt punten. Geeft de uitkomst voor een melding.
export function rondAf(w, taak, fractie) {
  const b = getBoerderij();
  const uit = B.rondTaakAf(b, taak, fractie);
  const f = uit.fractie || 0;
  loopbaanTel(w, VAK, { xp: Math.round(4 + 8 * f), n: 0, uniek: taak === 'zaaien' && uit.gewas ? 'gewas-' + uit.gewas : null });
  markeer();
  return uit;
}

// De lading is bij de afnemer: verkopen met de loonfactor van Landbouw. Geeft het uitbetaalde bedrag terug.
export function leverAf(w, kwaliteit) {
  const b = getBoerderij();
  const r = B.lever(b, kwaliteit);
  if (!(r.kg > 0)) return { ...r, betaald: 0 };
  const betaald = loopbaanVerdien(w, VAK, r.bedrag, { xp: 14, n: 1, uniek: r.gewas, rubriek: 'Overig inkomsten' });
  markeer();
  return { ...r, betaald };
}

export function koopMachine(w, id) {
  const b = getBoerderij();
  const r = B.koop(b, id, w.money || 0);
  if (r.ok) { noteMoney('Winkels'); w.money -= r.prijs; markeer(); }
  return r;
}

export function zetBoerderijVoorTest(raw, st) {
  boer = raw ? B.normaliseer(raw) : null;
  if (st !== undefined) opslagOverride = st;
  vuil = false;
  vorigeKlok = null;
  laatsteSchrijf = -Infinity;
  if (timer) { clearTimeout(timer); timer = 0; }
}

// --- percelen en erven (percelen.js, #415 stap 1) -----------------------------------------------------------------------------------

export const getBedrijf = () => getBoerderij().bedrijf;

const HUUR_TEKST = {
  betaald: (e) => `Huur betaald: €${e.bedrag}.`,
  achterstand: (e) => `Je loopt achter met de huur van ${PC.perceelOfErf(e.soort, e.id).naam} (€${e.schuld} open). Betaal snel, anders gaat hij terug naar de verhuurder.`,
  terug: (e) => `${PC.perceelOfErf(e.soort, e.id).naam} is terug naar de verhuurder: te laat betaald.`,
};

// De huur loopt mee met de speluren; wat niet kan staat als achterstand open. Elke betaling komt in het kasboek, een melding alleen bij problemen.
export function huurTik(w) {
  const b = getBoerderij();
  const r = PC.verwerkHuur(b.bedrijf, b.uren, w && Number.isFinite(w.money) ? w.money : 0);
  if (r.uitgave > 0) { noteMoney('Overige uitgaven'); w.money -= r.uitgave; }
  if (r.events.length) vuil = true;
  if (w && typeof w.addMessage === 'function') for (const e of r.events) if (e.type !== 'betaald') w.addMessage(HUUR_TEKST[e.type](e), 5);
  return r;
}

function bedrijfActie(r) {
  if (r.ok) markeer();
  return r;
}

export function koopPerceel(w, soort, id) {
  const r = PC.koop(getBedrijf(), soort, id, w.money || 0);
  if (r.ok) { noteMoney('Winkels'); w.money -= r.prijs; }
  return bedrijfActie(r);
}

export function huurPerceel(w, soort, id, betaling) {
  const r = PC.huur(getBedrijf(), soort, id, betaling, getBoerderij().uren, w.money || 0);
  if (r.ok) { noteMoney('Overige uitgaven'); w.money -= r.bedrag; }
  return bedrijfActie(r);
}

export function zegOpPerceel(soort, id) { return bedrijfActie(PC.zegOp(getBedrijf(), soort, id)); }

export function verkoopPerceel(w, soort, id) {
  const r = PC.verkoop(getBedrijf(), soort, id);
  if (r.ok) { noteMoney('Verkoop'); w.money += r.opbrengst; }
  return bedrijfActie(r);
}

export function betaalSchuldPerceel(w, soort, id) {
  const r = PC.betaalSchuld(getBedrijf(), soort, id, w.money || 0);
  if (r.ok) { noteMoney('Overige uitgaven'); w.money -= r.bedrag; }
  return bedrijfActie(r);
}

export const zetThuis = (erfId) => bedrijfActie({ ok: PC.zetThuis(getBedrijf(), erfId) }).ok;
export const zetActief = (id) => bedrijfActie({ ok: PC.zetActief(getBedrijf(), id) }).ok;

// De oogst uit de werkschuur (waar het afleveren hem ophaalt) naar de opslag van je thuis, en terug.
export function schuurNaarErf() {
  const b = getBoerderij();
  const s = b.schuur;
  if (!(s.kg > 0)) return { ok: false, kg: 0, reden: 'De schuur is leeg.' };
  const r = PC.bergOp(b.bedrijf, b.bedrijf.thuis, s.gewas, s.kg);
  if (!r.ok) return r;
  s.kg -= r.kg;
  if (s.kg <= 0) b.schuur = { gewas: null, kg: 0, kwaliteit: 1 };
  markeer();
  return r;
}

export function erfNaarSchuur(erfId, gewas) {
  const b = getBoerderij();
  if (b.schuur.kg > 0) return { ok: false, kg: 0, reden: 'Lever eerst af wat in de schuur ligt.' };
  const ligt = (b.bedrijf.opslag[erfId] || {})[gewas] || 0;
  const r = PC.haalUit(b.bedrijf, erfId, gewas, ligt);
  if (!r.ok) return r;
  if (!B.GEWASSEN[gewas]) { PC.bergOp(b.bedrijf, erfId, gewas, r.kg); return { ok: false, kg: 0, reden: 'Dat gewas kun je niet afleveren.' }; }
  b.schuur = { gewas, kg: r.kg, kwaliteit: 1 };
  markeer();
  return r;
}
