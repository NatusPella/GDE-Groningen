// De levende kant van de hulpopties (#215): leest de instellingen voor de
// runner (missions.js, vehicle.js, planestage.js), houdt per stap bij wat met
// hulp is gehaald en biedt hulp aan na twee mislukkingen. De regels staan in
// assist.js (getest); dit is de dunne laag met opslag en het aanbodscherm.
import { assistFactors, helpActive, scaleTime, scaleDamage, widenGate, shouldOffer, offerText, markHelped, cleanHelped, HELP_PRESETS } from './assist.js';
import { getSettings, setSetting } from './settings.js';
import { KEYS } from './storagekeys.js';
import { AUTOPLAY, STORY_TEST } from './devflags.js';

let data = null;
function load() {
  if (data) return data;
  data = { helped: {}, offered: {} };
  try {
    const raw = JSON.parse(localStorage.getItem(KEYS.help) || '{}');
    data.helped = cleanHelped(raw.helped);
    data.offered = cleanHelped(raw.offered);
  } catch (e) { /* geen opslag of kapot: begin leeg */ }
  return data;
}
function save() {
  try { localStorage.setItem(KEYS.help, JSON.stringify(data)); } catch (e) { /* vol of geblokkeerd */ }
}

export const getAssist = () => assistFactors(getSettings());
export const assistActive = () => helpActive(getSettings());
export const assistTime = (secs) => scaleTime(secs, getSettings());
export const assistDamage = (dmg) => scaleDamage(dmg, getSettings());
export const assistGate = (g) => widenGate(g, getSettings());

// Een stap is gehaald: met hulp aan krijgt hij het label.
export function noteStepCleared(stepId) {
  load();
  const next = markHelped(data.helped, stepId, getSettings());
  if (next[stepId] && !data.helped[stepId]) { data.helped = next; save(); }
}
export function wasHelped(stepId) { return !!load().helped[stepId]; }

// --- het aanbod ----------------------------------------------------------------

// the offer never waits for ever: after this long without an answer it counts as 'nee' (a bot, a player who walked away)
export const OFFER_TIMEOUT_MS = 45000;
let dlg = null;
let offerTimer = 0;
export function isHelpOfferOpen() { return !!(dlg && !dlg.el.hidden); }

function buildDialog() {
  const el = document.createElement('div');
  el.id = 'hulpaanbod';
  el.hidden = true;
  el.innerHTML = `<div class="ga-box" role="dialog" aria-modal="true" aria-labelledby="gh-title">
    <b id="gh-title">Even hulp?</b><p class="ga-text"></p>
    <div class="ga-btns"><button type="button" class="ga-primary" data-gh="licht">Ja, een beetje hulp</button><button type="button" class="ga-secondary" data-gh="veel">Ja, veel hulp</button><button type="button" class="ga-secondary" data-gh="nee">Nee, ik red het zelf</button></div></div>`;
  document.body.appendChild(el);
  const d = { el, world: null };
  el.addEventListener('mousedown', (e) => e.stopPropagation());
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-gh]');
    if (b) closeOffer(b.dataset.gh);
  });
  window.addEventListener('keydown', (e) => {
    if (el.hidden) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) return;
    const btns = [...el.querySelectorAll('button')];
    const i = Math.max(0, btns.indexOf(document.activeElement));
    if (e.key === 'Escape' || e.key === 'Backspace') closeOffer('nee');
    else if (e.key === 'Enter' || e.key === ' ') btns[i].click();
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') btns[(i + btns.length - 1) % btns.length].focus();
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'Tab') btns[(i + 1) % btns.length].focus();
  }, true);
  return d;
}

function closeOffer(choice) {
  const d = dlg;
  clearTimeout(offerTimer);
  d.el.hidden = true;
  if (d.world) {
    d.world.uiPaused = false;
    if (d.world.input) d.world.input.reset();
  }
  if (d.prevFocus && d.prevFocus.isConnected) d.prevFocus.focus({ preventScroll: true });
  if (HELP_PRESETS[choice] && choice !== 'uit') for (const [k, v] of Object.entries(HELP_PRESETS[choice])) setSetting(k, v);
}

// Na een mislukking van `stepId` (fails = het totaal tot nu toe). Eenmalig per stap.
export function maybeOfferHelp(world, stepId, fails) {
  if (!world || !stepId || AUTOPLAY || STORY_TEST) return false;
  load();
  if (!shouldOffer({ fails, offered: !!data.offered[stepId], settings: getSettings() })) return false;
  data.offered[stepId] = true;
  save();
  if (!dlg) dlg = buildDialog();
  dlg.el.querySelector('.ga-text').textContent = offerText('licht');
  dlg.world = world;
  dlg.prevFocus = document.activeElement;
  world.uiPaused = true;
  if (document.pointerLockElement) document.exitPointerLock();
  dlg.el.hidden = false;
  dlg.el.querySelector('[data-gh="licht"]').focus({ preventScroll: true });
  clearTimeout(offerTimer);
  offerTimer = setTimeout(() => { if (isHelpOfferOpen()) closeOffer('nee'); }, OFFER_TIMEOUT_MS);
  return true;
}
