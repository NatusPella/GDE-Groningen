// De live-laag van de voetbalcarrière (#1110, ADR 0042): houdt het profiel van deze speler bij in de eigen opslag (gde-voetbalcarriere-v1, los van elke savegame), telt nachten op het signaal
// van calendarday.js (de klok die meer dan vier uur terugspringt) en betaalt geld uit via loopbaanVerdien (nooit world.money +=). Geen DOM en geen THREE: scripts/voetbal_carrierelive_test.mjs.
// Samen spelen: de carrière is van de speler zelf (nooit gedeeld); een gast betaalt zijn eigen uitslag uit zijn eigen profiel (zie voetbalsamen.js). Zonder profiel (nog niet gestart) doet dit bestand niets.
import { KEYS } from './storagekeys.js';
import * as C from './voetbalcarriere.js';
import { nightPassed } from './voetbalagenda.js';
import { makeParkIndex, fallbackIndex, HOME_WGS } from './voetbalparken.js';
import { wgsToWorld } from './rdnew.js';
import { loopbaanVerdien } from './loopbaanlive.js';
import { euro } from './geldtekst.js';

const WRITE_DELAY_MS = 1500;
let career = null, storageOverride = null, timer = 0, dirty = false, prevClock = null, index = null;
const listeners = new Set();

const storage = () => {
  if (storageOverride !== null) return storageOverride;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
};
// Voor de tests: een eigen opslag (nooit de echte gde-*-sleutels).
export function setStorage(st) { storageOverride = st; career = null; dirty = false; prevClock = null; }
export function setParkData(raw) { index = raw ? makeParkIndex(raw) : null; if (index && index.clubs.length < 8) index = null; }
export const getIndex = () => index || (index = fallbackIndex());
export const getClub = (id) => C.clubResolver(getIndex())(id);
export async function loadParkData(mapUrl = 'stad.json') {
  const base = mapUrl.replace(/[^/]*$/, '');
  try { const r = await fetch(base + 'voetbalparken.json'); setParkData(r.ok ? await r.json() : null); } catch (e) { setParkData(null); }
  return getIndex().parkCount;
}

export function getCareer() {
  if (!career) {
    let raw = null;
    try { const st = storage(); raw = st ? st.getItem(KEYS.voetbalCarriere) : null; } catch (e) { raw = null; }
    career = C.normalize(raw);
  }
  return career;
}
export function saveNow() {
  timer = 0;
  if (!dirty) return;
  const st = storage();
  if (!st) return;
  try { st.setItem(KEYS.voetbalCarriere, C.serialize(getCareer())); dirty = false; } catch (e) { /* opslag vol of geblokkeerd: de carrière blijft in dit spel */ }
}
function mark() {
  dirty = true;
  for (const f of listeners) { try { f(career); } catch (e) { /* de luisteraar is niet ons probleem */ } }
  if (!timer && typeof setTimeout === 'function') { timer = setTimeout(saveNow, WRITE_DELAY_MS); if (timer && timer.unref) timer.unref(); }
}
export function subscribe(f) { listeners.add(f); return () => listeners.delete(f); }
export const set = (c) => { career = c; mark(); return career; };
export const isStarted = () => C.isStarted(getCareer());

// Het geld uit een lijst `earn`-regels: één betaling via loopbaanVerdien (het vak Buiten, zoals de Euroborg-wedstrijd; geen eigen loonfactor). Geeft het bedrag dat echt betaald is.
export function payEarn(w, lines, { xp = 0, label = '' } = {}) {
  const total = (lines || []).reduce((a, x) => a + (x.amount | 0), 0);
  if (!(total > 0) || !w) return 0;
  const paid = loopbaanVerdien(w, 'buiten', total, { xp, n: 0, deel: false, rubriek: 'Overig inkomsten' });
  if (w.addMessage) w.addMessage(`${label ? `${label}: ` : ''}${euro(paid)}`, 3.5, { kind: 'geld', key: 'voetbal-pay' });
  return paid;
}

// Een nieuwe carrière (de speler nam de uitnodiging aan): `char` is het personage waarmee hij speelt.
export function startNew(_w, char, day = 0) {
  const [hx, hy] = wgsToWorld(HOME_WGS.lat, HOME_WGS.lon);
  career = C.startCareer({ char, index: getIndex(), home: { x: hx, y: hy }, day });
  mark(); saveNow();
  return career;
}
export function reset() { career = C.newCareer(); mark(); saveNow(); }

// Elke frame (main.js, naast updateCalendar): een nacht verder? De klok springt meer dan vier uur terug. Lazy en goedkoop: alleen een vergelijking, de rest bij een nacht.
export function updateDay(dt, w) {
  const c = getCareer();
  const h = w && Number.isFinite(w.clock) ? ((w.clock % 24) + 24) % 24 : null;
  const night = nightPassed(prevClock, h);
  prevClock = h;
  if (!night || !C.isStarted(c)) return null;
  return advance(w, 1);
}
export function advance(w, nights) {
  const r = C.advanceDays(getCareer(), nights, getClub);
  career = r.career;
  const paid = payEarn(w, r.earn, { label: 'Voetbal' });
  if (w && w.addMessage) for (const n of r.notes.slice(0, 3)) w.addMessage(n, 4);
  mark();
  return { ...r, paid };
}
// Een wedstrijd is gespeeld of uitgerekend: verwerk, betaal, meld. result = { gf, ga, pens?, stats? } of null (uitrekenen).
export function finishMatch(w, result) {
  const r = C.playEvent(getCareer(), getClub, result);
  if (!r.summary) return r;
  career = r.career;
  const paid = payEarn(w, r.summary.earn, { label: r.summary.played ? 'Voetbal' : 'Uitgerekend', xp: r.summary.played ? 20 : 8 });
  if (w && w.addMessage && r.summary.injury) w.addMessage(r.summary.injury.text, 5);
  mark();
  return { ...r, paid };
}
export function trainNow(w, focus, score = 0.8) {
  const r = C.train(getCareer(), focus, score);
  if (r.ok) { career = r.career; mark(); if (w && w.addMessage) w.addMessage(`Training klaar: ${r.gains.length ? '+1 ' + r.gains.join(', +1 ') : 'je voelt het groeien'}`, 3); }
  return r;
}
export function setFocusNow(focus) { career = C.setFocus(getCareer(), focus); mark(); return career; }
export function setInjuries(on) { const c = getCareer(); if (!C.isStarted(c)) return c; career = { ...c, settings: { ...c.settings, injuries: !!on }, injury: on ? c.injury : null }; mark(); return career; }
export function flush() { saveNow(); }
