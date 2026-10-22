// Loopbaan (#381): de haken van het spel naar loopbaan.js. Houdt het profiel van deze speler bij in de eigen opslag
// (gde-loopbaan-v1, los van elke savegame), betaalt het loon met de loonfactor van het niveau en meldt een niveau omhoog
// als een kaartje. Geen DOM en geen THREE (de meldingen lopen via world.addMessage): scripts/loopbaan_live_test.mjs.
//
// Samen spelen: de gastheer deelt een beloning met de gasten (coopnet.js deelMetGasten) en stuurt het vak en het deel
// van de punten mee in hetzelfde bericht; de gast verdient daar op zijn eigen apparaat zijn eigen loonfactor over en
// telt de punten bij zijn eigen profiel (loopbaanGast). Een gast draait updateGameplay niet; zijn tellers lopen dus
// alleen via die beloningen.

import { KEYS } from './storagekeys.js';
import { noteMoney } from './finance.js';
import * as L from './loopbaan.js';

const SCHRIJF_VERTRAGING_MS = 1500;
// Een gast krijgt de helft van de punten van de gastheer bij een gedeelde beloning (net als het geld, coopnet.js GAST_DEEL).
export const GAST_XP_DEEL = 0.5;

let profiel = null;
let opslagOverride = null;
let poort = null;          // () => true zolang cheats de prestaties blokkeren
let momentopname = null;   // () => { stats, sets }: wat de prestaties al telden, voor een eerste keer
let timer = 0;
let vuil = false;
const luisteraars = new Set();

const opslag = () => {
  if (opslagOverride !== null) return opslagOverride;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
};

function lees() {
  const st = opslag();
  let raw = null;
  try { raw = st ? st.getItem(KEYS.loopbaan) : null; } catch (e) { raw = null; }
  if (raw == null) {
    // een eerste keer: een deel van wat de prestaties al telden, zodat wie al lang speelt niet bij nul begint
    let snap = null;
    try { snap = momentopname ? momentopname() : null; } catch (e) { snap = null; }
    return snap ? L.zaaiUitPrestaties(snap.stats, snap.sets) : L.nieuwProfiel();
  }
  return L.normaliseer(raw);
}

// Het profiel van deze speler (geladen bij de eerste vraag).
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
    // een tweede tabblad kan ook geschreven hebben: neem per vak het grootste
    let nu = getProfiel();
    let bestaand = null;
    try { bestaand = st.getItem(KEYS.loopbaan); } catch (e) { bestaand = null; }
    if (bestaand != null) nu = profiel = L.voegSamen(nu, bestaand);
    st.setItem(KEYS.loopbaan, JSON.stringify(nu));
    vuil = false;
  } catch (e) { /* opslag vol of geblokkeerd: de loopbaan blijft in dit spel, de rest werkt */ }
}

function markeer() {
  vuil = true;
  for (const f of luisteraars) { try { f(profiel); } catch (e) { /* de luisteraar is niet ons probleem */ } }
  if (!timer && typeof setTimeout === 'function') { timer = setTimeout(schrijfNu, SCHRIJF_VERTRAGING_MS); if (timer && timer.unref) timer.unref(); }
}

// Eenmalig bij het opstarten (achievementtracker.js): hoe de prestaties heten die al geteld zijn en of cheats de tellers blokkeren.
export function initLoopbaan({ gate = null, snapshot = null, opslag: st } = {}) {
  if (vuil) schrijfNu(); // een nieuwe start verliest niets wat nog niet geschreven was
  poort = gate;
  momentopname = snapshot;
  if (st !== undefined) opslagOverride = st;
  profiel = null;
  vuil = false;
  getProfiel();
  if (!opslagLeestAl()) { vuil = true; schrijfNu(); }
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('pagehide', () => { if (timer) clearTimeout(timer); schrijfNu(); });
  return profiel;
}
function opslagLeestAl() {
  const st = opslag();
  try { return !!st && st.getItem(KEYS.loopbaan) != null; } catch (e) { return true; }
}

// Een luisteraar (het Loopbaan-scherm) hoort van elke verandering; geeft een functie om hem weer weg te halen.
export function opVeranderen(f) {
  luisteraars.add(f);
  return () => luisteraars.delete(f);
}

const geblokkeerd = () => { try { return !!(poort && poort()); } catch (e) { return false; } };

// Het loon voor een bedrag in dit vak, met de factor van het niveau van deze speler.
export function loopbaanLoon(vak, basis) {
  return L.loon(getProfiel(), vak, basis);
}

// Een prijs die je zelf betaalt (een treinkaartje): vaste reizigers krijgen korting, omgekeerd evenredig met de loonfactor.
export function loopbaanPrijs(vak, bedrag) {
  if (!(bedrag > 0)) return 0;
  return Math.max(1, Math.round(bedrag / L.loonFactor(getProfiel(), vak)));
}

// Een niveau omhoog als kaartje (hudcards via world.addMessage; titel, vak en wat het oplevert).
function meldOmhoog(w, o) {
  if (!w || !w.addMessage) return;
  const info = L.vakInfo(o.vak);
  const plus = L.percentage(L.factorVoorNiveau(o.naar));
  w.addMessage(`${o.titel}: ${info.naam} niveau ${o.naar}, ${plus}% meer loon`, 5, { kind: 'prestatie', kicker: 'Loopbaan', key: 'loopbaan-' + o.vak });
}

// Tel een gebeurtenis in een vak: teller (n), punten en een nieuwe plek. Geeft de punten terug (voor de gasten).
export function loopbaanTel(w, vak, opties = {}) {
  if (geblokkeerd()) return { xp: 0, omhoog: null };
  const r = L.tel(getProfiel(), vak, opties);
  if (r.xp > 0 || (opties.n || 0) > 0) markeer();
  if (r.omhoog) meldOmhoog(w, r.omhoog);
  return r;
}

// Wat de gastheer zijn gasten meestuurt bij een gedeelde beloning.
export function loopbaanDeel(vak, basis, xp = 0) {
  return { vak, basis: Math.max(0, Math.floor(basis || 0)), xp: Math.max(0, Math.round(xp || 0)) };
}

// Verdien geld in een vak: het basisbedrag keer de loonfactor gaat in de portemonnee, de punten in het vak, en de gasten
// krijgen hun deel (met hun eigen factor). Geeft het uitbetaalde bedrag terug.
export function loopbaanVerdien(w, vak, basis, { xp = 0, n = 0, uniek = null, rubriek = null, deel = true } = {}) {
  const betaald = loopbaanLoon(vak, basis);
  if (betaald > 0) {
    if (rubriek) noteMoney(rubriek);
    w.money += betaald;
  }
  loopbaanTel(w, vak, { n, xp, uniek });
  if (deel && w.coopDeel && betaald > 0) w.coopDeel(betaald, loopbaanDeel(vak, basis, xp));
  return betaald;
}

// achievements.js recordStat: een gebeurtenis die de prestaties al telden en die geen eigen haak heeft.
// Met premie (zie STAT_VAK) is dit ook geld voor vakken die anders niets uitbetalen.
export function loopbaanOpStat(w, key, n = 1) {
  const r = L.STAT_VAK[key];
  if (!r || !w || !(n > 0)) return;
  const keer = Math.max(1, Math.round(n));
  if (r.premie) {
    const b = loopbaanVerdien(w, r.vak, r.premie * keer, { xp: r.xp * keer, n: r.n * keer, rubriek: 'Overig inkomsten' });
    if (b > 0 && w.addMessage) w.addMessage(`Premie: €${b}`, 2.5, { kind: 'geld', key: 'loopbaan-premie' });
  } else {
    loopbaanTel(w, r.vak, { n: r.n * keer, xp: r.xp * keer });
  }
}

// Kilometers (achievementtracker.js): per vak punten volgens KM_XP.
export function loopbaanKm(w, vak, meters) {
  const k = L.kmPunten(vak, meters);
  if (k.n > 0) loopbaanTel(w, vak, k);
}

// coopnet.js: een beloning van de gastheer bij een gast. Geeft het bedrag voor de portemonnee van de gast terug:
// zijn eigen factor over het deel dat de gastheer stuurde, en de punten gaan naar zijn eigen profiel.
export function loopbaanGast(w, geld, vak, xp = 0) {
  if (!L.vakInfo(vak)) return geld;
  const bedrag = L.gastBedrag(getProfiel(), geld, vak);
  const punten = Number.isFinite(xp) && xp > 0 ? Math.min(500, xp) : 0;
  if (punten) loopbaanTel(w, vak, { xp: punten });
  return bedrag;
}

// Voor het scherm en de tests.
export const loopbaanSamenvatting = () => L.samenvatting(getProfiel());
export function zetProfielVoorTest(p, st) {
  profiel = p ? L.normaliseer(p) : null;
  if (st !== undefined) opslagOverride = st;
  vuil = false;
  if (timer) { clearTimeout(timer); timer = 0; }
}
