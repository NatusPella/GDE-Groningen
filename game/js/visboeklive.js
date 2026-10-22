// Het visboek van deze speler in de eigen opslag (gde-visboek-v1, #412): geladen bij de eerste vraag, vertraagd geschreven,
// samengevoegd met wat een tweede tabblad schreef en bij een eerste keer gezaaid uit wat de prestaties al telden (wie al in
// Meerstad hengelde begint niet met een leeg boek). Los van elke savegame en per speler, ook bij samen spelen: je boek gaat
// mee naar elke wereld. Geen DOM, geen THREE: scripts/vis_test.mjs.
import { KEYS } from './storagekeys.js';
import * as B from './visboek.js';

const SCHRIJF_VERTRAGING_MS = 1500;

let boek = null;
let opslagOverride = null;
let momentopname = null;   // () => { stats }: wat de prestaties al telden, voor een eerste keer
let timer = 0;
let vuil = false;

const opslag = () => {
  if (opslagOverride !== null) return opslagOverride;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
};

// Een eerste keer: de rondes aan het meer in Meerstad die al geteld zijn geven een paar voorns, zodat het boek niet leeg begint.
export function zaaiUitPrestaties(stats) {
  const b = B.nieuwBoek();
  const rondes = stats && Number(stats.hengelSessions) > 0 ? Math.floor(Number(stats.hengelSessions)) : 0;
  if (rondes > 0) {
    const n = Math.min(40, rondes * 3);
    b.soorten.voorn = { n, kg: 0.3, typen: ['meer'], eerste: 'meer' };
    b.plekken.push('meer:Meerstad');
    b.types.meer = n;
    b.totaal.n = n;
    b.totaal.kg = Math.round(n * 0.3 * 100) / 100;
  }
  return b;
}

function lees() {
  const st = opslag();
  let raw = null;
  try { raw = st ? st.getItem(KEYS.visboek) : null; } catch (e) { raw = null; }
  if (raw == null) {
    let snap = null;
    try { snap = momentopname ? momentopname() : null; } catch (e) { snap = null; }
    return snap ? zaaiUitPrestaties(snap.stats) : B.nieuwBoek();
  }
  return B.normaliseer(raw);
}

export function getBoek() {
  if (!boek) boek = lees();
  return boek;
}

export function schrijfNu() {
  timer = 0;
  if (!vuil) return;
  const st = opslag();
  if (!st) return;
  try {
    let nu = getBoek();
    let bestaand = null;
    try { bestaand = st.getItem(KEYS.visboek); } catch (e) { bestaand = null; }
    if (bestaand != null) nu = boek = B.voegSamen(nu, bestaand);
    st.setItem(KEYS.visboek, JSON.stringify(nu));
    vuil = false;
  } catch (e) { /* opslag vol of geblokkeerd: het boek blijft in dit spel, de rest werkt */ }
}

function markeer() {
  vuil = true;
  if (!timer && typeof setTimeout === 'function') { timer = setTimeout(schrijfNu, SCHRIJF_VERTRAGING_MS); if (timer && timer.unref) timer.unref(); }
}

// Eenmalig bij het opstarten (achievementtracker.js).
export function initVisboek({ snapshot = null, opslag: st } = {}) {
  if (vuil) schrijfNu();
  momentopname = snapshot;
  if (st !== undefined) opslagOverride = st;
  boek = null;
  vuil = false;
  getBoek();
  let bestond = true;
  try { const o = opslag(); bestond = !!o && o.getItem(KEYS.visboek) != null; } catch (e) { bestond = true; }
  if (!bestond) { vuil = true; schrijfNu(); }
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('pagehide', () => { if (timer) clearTimeout(timer); schrijfNu(); });
  return boek;
}

// Noteer een vangst in het boek van deze speler; geeft terug wat er nieuw aan was (visboek.js noteerVangst).
export function boekVangst(id, kg, plek, type) {
  const r = B.noteerVangst(getBoek(), id, kg, plek, type);
  if (r) markeer();
  return r;
}

export const boekVoortgang = () => B.voortgang(getBoek());
export function zetBoekVoorTest(b, st) {
  boek = b ? B.normaliseer(b) : null;
  if (st !== undefined) opslagOverride = st;
  vuil = false;
  if (timer) { clearTimeout(timer); timer = 0; }
}
