// Gebieden veroveren (#414): de haken van het spel naar gebieden.js. Houdt het profiel van deze speler bij in de eigen
// opslag (gde-gebieden-v1, los van elke savegame), vraagt aan gebiedenbronnen.js wat er te doen is, telt wat je doet bij
// het gebied waar het hoort en betaalt de beloning als een gebied helemaal gedaan is. Geen DOM en geen THREE (de meldingen
// lopen via world.addMessage): scripts/gebieden_live_test.mjs.
//
// Wat het spel meldt heet een sleutel: 'm:<missie>' (een missie klaar), 'u:<plek>' (de plek uit de loopbaan, zoals een
// bijbaan of padelbaan), 's:<teller>' (een teller van de prestaties, zoals discgolfRounds) en 'v:<id>' (een vondst of
// geheim). Een taak in de catalogus noemt de sleutels waarmee hij klaar is (zie gebiedenbronnen.js).
//
// Samen spelen: elke speler telt op zijn eigen apparaat zijn eigen gebieden. Een gast draait updateGameplay niet; zijn
// missies en bijbanen komen dus alleen binnen via wat hij zelf doet, en een gedeelde beloning telt niet voor een gebied.

import { KEYS } from './storagekeys.js';
import { noteMoney } from './finance.js';
import * as G from './gebieden.js';

const SCHRIJF_VERTRAGING_MS = 1500;
const CACHE_MS = 5000;
const VERVERS_S = 4;

let profiel = null;
let opslagOverride = null;
let poort = null;      // () => true zolang cheats de prestaties blokkeren
let bronnen = null;    // () => { grenzen, taken, bekend() } of null als de wereld er nog niet is
let cache = null;      // { ind, t, sig }
let timer = 0;
let vuil = false;
let tikT = 0;
const luisteraars = new Set();

const nu = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const opslag = () => {
  if (opslagOverride !== null) return opslagOverride;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
};

function lees() {
  const st = opslag();
  let raw = null;
  try { raw = st ? st.getItem(KEYS.gebieden) : null; } catch (e) { raw = null; }
  return raw == null ? G.nieuwProfiel() : G.normaliseer(raw);
}

export function getProfiel() {
  if (!profiel) profiel = lees();
  return profiel;
}

export function schrijfNu() {
  timer = 0;
  if (!vuil) return;
  const st = opslag();
  if (!st) return;
  try {
    // een tweede tabblad kan ook geschreven hebben: wat in een van beide gedaan is, is gedaan
    let p = getProfiel();
    let bestaand = null;
    try { bestaand = st.getItem(KEYS.gebieden); } catch (e) { bestaand = null; }
    if (bestaand != null) p = profiel = G.voegSamen(p, bestaand);
    st.setItem(KEYS.gebieden, JSON.stringify(p));
    vuil = false;
  } catch (e) { /* opslag vol of geblokkeerd: de voortgang blijft in dit spel, de rest werkt */ }
}

function markeer() {
  vuil = true;
  for (const f of luisteraars) { try { f(profiel); } catch (e) { /* de luisteraar is niet ons probleem */ } }
  if (!timer && typeof setTimeout === 'function') { timer = setTimeout(schrijfNu, SCHRIJF_VERTRAGING_MS); if (timer && timer.unref) timer.unref(); }
}

// Eenmalig bij het opstarten (achievementtracker.js): de bronnen van de catalogus en of cheats het tellen blokkeren.
export function initGebieden({ gate = null, bron = null, opslag: st } = {}) {
  if (vuil) schrijfNu();
  poort = gate;
  bronnen = bron;
  if (st !== undefined) opslagOverride = st;
  profiel = null;
  cache = null;
  vuil = false;
  tikT = 0;
  getProfiel();
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('pagehide', () => { if (timer) clearTimeout(timer); schrijfNu(); });
  return profiel;
}

export function opVeranderen(f) {
  luisteraars.add(f);
  return () => luisteraars.delete(f);
}

const geblokkeerd = () => { try { return !!(poort && poort()); } catch (e) { return false; } };

// De indeling met alle taken, of null zolang de wereld er niet is. Een paar seconden bewaard (de bronnen vragen om
// de lijst van bijbanen en spellen); andere grenzen of een ander aantal taken bouwt hem opnieuw.
export function getIndeling(nuMs = nu()) {
  if (!bronnen) return cache ? cache.ind : null;
  if (cache && nuMs - cache.t < CACHE_MS) return cache.ind;
  let b = null;
  try { b = bronnen(); } catch (e) { b = null; }
  if (!b) return cache ? cache.ind : null;
  const sig = `${b.grenzen ? b.grenzen.jaar + ':' + b.grenzen.gemeenten.length + ':' + b.grenzen.buurten.length : 'geen'}|${b.taken.length}`;
  if (cache && cache.sig === sig) { cache.t = nuMs; return cache.ind; }
  const ind = G.bouwIndeling(b);
  cache = { ind, t: nuMs, sig, bekend: b.bekend };
  if (getProfiel().zaad) G.zaai(getProfiel(), ind, []); else zaaiAlsNodig(); // een nieuwe indeling: wat al klaar is krijgt zijn titel, zonder geld
  return ind;
}

// Een nieuwe sleutel: neem over wat het spel al wist, zodat wie al lang speelt niet bij nul begint (titels, geen geld).
function zaaiAlsNodig() {
  const p = getProfiel();
  if (p.zaad || !cache || !cache.bekend) return;
  let bekend = null;
  try { bekend = cache.bekend(); } catch (e) { bekend = null; }
  if (!bekend) return;
  G.zaai(p, cache.ind, bekend);
  markeer();
}

function meldVoortgang(w, ind, taakId) {
  if (!w || !w.addMessage) return;
  const ids = ind.perTaak.get(taakId) || [];
  // het kleinste gebied (de laatste in de lijst, van groot naar klein) dat te veroveren is en nog niet af
  const p = getProfiel();
  const gid = [...ids].reverse().find((id) => ind.gebied.get(id).veroverbaar && !G.voortgang(p, ind, id).voltooid);
  if (!gid) return;
  const v = G.voortgang(getProfiel(), ind, gid);
  if (v.voltooid) return;
  w.addMessage(`${v.klaar} van ${v.totaal} gedaan`, 3, { kind: 'prestatie', kicker: `Veroveren: ${ind.gebied.get(gid).naam}`, key: 'gebied-voortgang' });
}

function betaal(w, b) {
  if (!w) return;
  if (b.geld > 0) { noteMoney('Overig inkomsten'); w.money = (w.money || 0) + b.geld; }
  if (w.addMessage) w.addMessage(`${b.titel}! ${b.regel} (+€${b.geld})${b.huis ? ' En de sleutel van je safehouse ligt op de mat.' : ''}`, 7, { kind: 'prestatie', kicker: `${G.niveauInfo(b.niveau).enkel[0].toUpperCase()}${G.niveauInfo(b.niveau).enkel.slice(1)} veroverd`, key: 'gebied-' + b.gebied });
}

// Een taak is gedaan. Geeft de beloningen terug (gebieden die er nu helemaal klaar door zijn).
export function doeTaak(w, taakId) {
  if (geblokkeerd()) return [];
  const ind = getIndeling();
  if (!ind) return [];
  const r = G.markeer(getProfiel(), ind, taakId);
  if (!r.nieuw) return [];
  markeer();
  if (r.beloningen.length) for (const b of r.beloningen) betaal(w, b); else meldVoortgang(w, ind, taakId);
  return r.beloningen;
}

// Een melding van het spel: de taak met die sleutel die het dichtst bij de speler ligt is gedaan.
export function opSleutel(w, sleutel) {
  if (geblokkeerd() || typeof sleutel !== 'string' || !sleutel) return [];
  const ind = getIndeling();
  if (!ind) return [];
  const p = w && w.player;
  const id = G.kiesTaak(ind, sleutel, p ? p.x : NaN, p ? p.y : NaN);
  return id ? doeTaak(w, id) : [];
}
export const gebiedenOpUniek = (w, uniek) => opSleutel(w, 'u:' + uniek);
export const gebiedenOpStat = (w, key) => opSleutel(w, 's:' + key);
export const gebiedenOpVondst = (w, set, waarde) => opSleutel(w, 'v:' + waarde);

// Elke paar seconden (achievementtracker.js): de missies die klaar zijn in deze save tellen mee.
export function updateGebieden(dt, w, klaarMissies) {
  tikT -= dt;
  if (tikT > 0) return;
  tikT = VERVERS_S;
  if (geblokkeerd() || !klaarMissies) return;
  let ids = null;
  try { ids = klaarMissies(); } catch (e) { ids = null; }
  if (!ids || !ids.length) return;
  const ind = getIndeling();
  if (!ind) return;
  for (const id of ids) {
    if (ind.perSleutel.has('m:' + id)) opSleutel(w, 'm:' + id);
  }
}

// Safehouses (fase 2): kopen met je eigen geld; cadeau bij een veroverd gebied (gebieden.js geefHuis).
export function koopHuisLive(w, huisIdent) {
  const ind = getIndeling();
  if (!ind || !w) return { ok: false, prijs: 0, reden: 'onbekend' };
  const r = G.koopHuis(getProfiel(), ind, huisIdent, w.money);
  if (r.ok) { noteMoney('Overige uitgaven'); w.money -= r.prijs; markeer(); }
  return r;
}
export const heeftHuisLive = (huisIdent) => G.heeftHuis(getProfiel(), huisIdent);

// Voor het scherm, de kaart en de tests.
export function getOverzicht() {
  const ind = getIndeling();
  return ind ? { ind, profiel: getProfiel(), overzicht: G.overzicht(getProfiel(), ind) } : null;
}
export function zetVoorTest(p, st, bron) {
  profiel = p ? G.normaliseer(p) : null;
  if (st !== undefined) opslagOverride = st;
  if (bron !== undefined) bronnen = bron;
  cache = null;
  vuil = false;
  tikT = 0;
  if (timer) { clearTimeout(timer); timer = 0; }
}
