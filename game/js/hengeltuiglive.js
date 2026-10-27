// Het hengeltuig van deze speler in de eigen opslag (gde-hengeltuig-v1, #492): bij de eerste vraag geladen,
// vertraagd geschreven en nooit onderdeel van een savegame. Elke speler heeft zijn eigen tuig, ook bij samen
// spelen: de gast hengelt op zijn eigen scherm met zijn eigen hengel en betaalt zijn eigen aas. Geen DOM, geen
// THREE, geen netwerkbericht: scripts/hengeltuig_test.mjs.
import { KEYS } from './storagekeys.js';
import * as H from './hengeltuig.js';

const SCHRIJF_VERTRAGING_MS = 1200;

let tuig = null;
let opslagOverride = null;
let timer = 0;
let vuil = false;

const opslag = () => {
  if (opslagOverride !== null) return opslagOverride;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
};

function lees() {
  const st = opslag();
  let raw = null;
  try { raw = st ? st.getItem(KEYS.hengeltuig) : null; } catch (e) { raw = null; }
  return H.normaliseer(raw);
}

export function getTuig() {
  if (!tuig) tuig = lees();
  return tuig;
}

export function schrijfNu() {
  timer = 0;
  if (!vuil) return;
  const st = opslag();
  if (!st) { vuil = false; return; }
  try {
    st.setItem(KEYS.hengeltuig, JSON.stringify(getTuig()));
    vuil = false;
  } catch (e) { /* opslag vol of geblokkeerd: het tuig blijft in dit spel, de rest werkt */ }
}

function markeer() {
  vuil = true;
  if (!timer && typeof setTimeout === 'function') { timer = setTimeout(schrijfNu, SCHRIJF_VERTRAGING_MS); if (timer && timer.unref) timer.unref(); }
}

// Een nieuw tuig (na een koop of een verbetering): eerst normaliseren, dan bewaren.
export function zetTuig(nieuw) {
  tuig = H.normaliseer(nieuw);
  markeer();
  return tuig;
}

// Eén cast: er gaat een beet van het pak aas af. Zonder aas gebeurt er niets (en wordt er niets geschreven).
export function gebruikAas() {
  const t = getTuig();
  if (!t.aas) return false;
  zetTuig(H.gebruikAas(t));
  return true;
}

// Eenmalig bij het opstarten (of in een test met een nep-opslag): leest het tuig opnieuw.
export function initHengeltuig({ opslag: st } = {}) {
  if (vuil) schrijfNu();
  if (st !== undefined) opslagOverride = st;
  tuig = null;
  vuil = false;
  return getTuig();
}

export function zetTuigVoorTest(t, st) {
  tuig = t ? H.normaliseer(t) : null;
  if (st !== undefined) opslagOverride = st;
  vuil = false;
  if (timer) { clearTimeout(timer); timer = 0; }
}

// Het spel sluit: wat nog niet geschreven is, gaat alsnog naar de opslag (vissen hoeft niets te schrijven).
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('pagehide', () => { if (timer) clearTimeout(timer); schrijfNu(); });
