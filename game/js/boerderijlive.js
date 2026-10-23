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
    vuil = true;
    if (Number.isFinite(nu) && nu - laatsteSchrijf > 60) { laatsteSchrijf = nu; markeer(); }
  }
  return uren;
}

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
