// Oefenronde (#201): wires practicekit.js to the world. Started from Hulp in the
// pause menu (event 'gde-oefenronde'); one hint card per step, shown again now
// and then while the step is open, a closing card at the end. No mission, no
// stakes, no save: stopping means leaving it alone. Done is kept per device
// (gde-oefenronde) only to say so in Hulp.
import { showCard, cardsBusy } from './hudcards.js';
import { mayStart } from './narrative.js';
import { isCinematicActive } from './cinematics.js';
import { playerBusy } from './busy.js';
import { isPauseMenuOpen } from './pausemenu.js';
import { isMapOpen } from './mapview.js';
import { getSettings } from './settings.js';
import { physicalKey, keyName, tokenKey } from './controls.js';
import { glyphHtml } from './prompts.js';
import { unlockAchievement } from './achievements.js';
import { KEYS } from './storagekeys.js';
import { startPractice, stepPractice, currentStep, DONE } from './practicekit.js';

const REMIND = 25;
const KEY_TOKEN = /\{(\w+)\}/g;
const escHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const plainKeys = (t) => t.replace(KEY_TOKEN, (m, k) => keyName(physicalKey(getSettings().keyBinds || {}, tokenKey(k))));
const htmlKeys = (t) => t.split(KEY_TOKEN).map((part, i) => (i % 2 ? glyphHtml(part) : escHtml(part))).join('');

let st = null;
let last = null;
let shownAt = -Infinity;
let t = 0;

export function practiceDone() {
  try { return localStorage.getItem(KEYS.oefenronde) === '1'; } catch (e) { return false; }
}

// One-time offer (value '0' in gde-oefenronde; '1' stays 'done'): a quiet card after the first minute of play.
const OFFER_AFTER = 60;
let playT = 0;
function offered() {
  try { return localStorage.getItem(KEYS.oefenronde) !== null; } catch (e) { return true; }
}
function maybeOffer(dt, w) {
  playT += dt;
  if (playT < OFFER_AFTER || w.paused || isPauseMenuOpen() || isCinematicActive() || offered()) return;
  if ((w.wanted || 0) > 0 || getSettings().onboardingTips === false || cardsBusy() || !mayStart('card')) return;
  if (playerBusy(w).busy) return;
  showCard(w, { kind: 'tip', kicker: 'Oefenronde', title: 'Even oefenen?', body: 'Wil je de basis rustig oefenen, zonder gevolgen? Open het menu en kies Besturing, dan Hulp, dan Oefenen.', key: 'oefen-aanbod', important: false, voice: false, duration: 10 });
  try { localStorage.setItem(KEYS.oefenronde, '0'); } catch (e) { /* memory only */ }
}

export function practiceActive() { return !!st && !st.done; }

export function beginPractice() {
  st = startPractice();
  last = null;
  shownAt = -Infinity;
}

export function stopPractice() { st = null; }

function card(w, s, key) {
  showCard(w, { kind: 'tip', kicker: 'Oefenronde', title: s.title, body: plainKeys(s.body), bodyHtml: htmlKeys(s.body), key, important: true, voice: false, duration: 10 });
}

export function updatePractice(dt, w) {
  if (!document.body.classList.contains('game-started')) return;
  if (!st) { maybeOffer(dt, w); return; }
  if (st.done) return;
  t += dt;
  const p = w.player;
  const inV = !!p.inVehicle;
  let dist = 0;
  if (last && !w.paused) {
    const d = Math.hypot(p.x - last.x, p.y - last.y);
    if (d < 30) dist = d;
  }
  last = { x: p.x, y: p.y };
  const input = w.input;
  const r = stepPractice(st, {
    dt, dist, inVehicle: inV,
    sprinting: !!(input && input.isDown('shift')),
    mapOpen: isMapOpen() || !!(input && input.wasPressed('m')),
    menuOpen: isPauseMenuOpen(),
  });
  st = r.st;
  if (st.done) {
    try { localStorage.setItem(KEYS.oefenronde, '1'); } catch (e) { /* memory only */ }
    unlockAchievement(w, 'oefenronde_klaar');
    card(w, DONE, 'oefen-klaar');
    return;
  }
  if (w.paused) return;
  const s = currentStep(st);
  if (r.advanced || t - shownAt > REMIND) {
    card(w, s, 'oefen-' + s.id + (r.advanced ? '' : '-' + Math.floor(t)));
    shownAt = t;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('gde-oefenronde', () => { beginPractice(); shownAt = t - REMIND - 1; });
  window.__practice = { active: practiceActive, stop: stopPractice };
}
