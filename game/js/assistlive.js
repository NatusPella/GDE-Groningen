// De levende kant van de hulpopties (#215): leest de instellingen voor de
// runner (missions.js, vehicle.js, planestage.js), houdt per stap bij wat met
// hulp is gehaald en biedt hulp aan na twee mislukkingen. De regels staan in
// assist.js (getest); dit is de dunne laag met opslag en het aanbodscherm.
import { assistFactors, helpActive, scaleTime, scaleDamage, widenGate, shouldOffer, offerText, offerLegenda, OFFER_KORT, OFFER_KLEIN, markHelped, cleanHelped, HELP_PRESETS } from './assist.js';
import { getSettings, setSetting } from './settings.js';
import { KEYS } from './storagekeys.js';
import { AUTOPLAY, STORY_TEST } from './devflags.js';
import { zachtePauze } from './coopgroep.js';
import { maakWidget } from './regelwidget.js'; // #989: wat de hulp verandert als icoon met een woord, niet als zin

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

// Het aanbod wacht niet eindeloos: na deze tijd zonder antwoord gaat het scherm weg. Dat telt
// alleen als "niets gezien" en niet als "nee" (#QoL): de teller blijft staan, zodat de volgende
// mislukking van dezelfde stap het aanbod opnieuw laat zien. Wie bewust "Nee" kiest of Escape
// indrukt, sluit het voor die stap wél af.
export const OFFER_TIMEOUT_MS = 45000;
let dlg = null;
let offerTimer = 0;
export function isHelpOfferOpen() { return !!(dlg && !dlg.el.hidden); }

function buildDialog() {
  const el = document.createElement('div');
  el.id = 'hulpaanbod';
  el.hidden = true;
  el.innerHTML = `<div class="ga-box" role="dialog" aria-modal="true" aria-labelledby="gh-title">
    <b id="gh-title">Even hulp?</b><p class="ga-text"></p><div class="ga-legenda"></div><p class="ga-klein"></p>
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
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.repeat) return;
    const btns = [...el.querySelectorAll('button')];
    if (!btns.length) return;
    const idx = btns.indexOf(document.activeElement);
    const i = Math.max(0, idx);
    if (e.key === 'Escape' || e.key === 'Backspace') closeOffer('nee');
    else if (e.key === 'Enter' || e.key === ' ') btns[i].click();
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) btns[idx < 0 ? btns.length - 1 : (idx + btns.length - 1) % btns.length].focus();
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'Tab') btns[idx < 0 ? 0 : (idx + 1) % btns.length].focus();
  }, true);
  return d;
}

// tel = de speler heeft echt geantwoord (een knop, Escape): alleen dán telt het aanbod voor
// deze stap als gedaan. Een time-out laat de teller staan, zodat de volgende mislukking het
// aanbod opnieuw laat zien.
function closeOffer(choice, tel = true) {
  const d = dlg;
  clearTimeout(offerTimer);
  d.el.hidden = true;
  if (d.world) {
    d.world.uiPaused = false;
    zachtePauze(d.world, 'hulpaanbod', false);
    if (d.world.input) d.world.input.reset();
  }
  if (d.prevFocus && d.prevFocus.isConnected) d.prevFocus.focus({ preventScroll: true });
  if (HELP_PRESETS[choice] && choice !== 'uit') for (const [k, v] of Object.entries(HELP_PRESETS[choice])) setSetting(k, v);
  if (tel && d.stepId) { load(); data.offered[d.stepId] = true; save(); }
  d.stepId = '';
}

// Na een mislukking van `stepId` (fails = het totaal tot nu toe). Eenmalig per stap.
export function maybeOfferHelp(world, stepId, fails) {
  if (!world || !stepId || AUTOPLAY || STORY_TEST) return false;
  load();
  if (!shouldOffer({ fails, offered: !!data.offered[stepId], settings: getSettings() })) return false;
  if (!dlg) dlg = buildDialog();
  dlg.el.querySelector('.ga-text').textContent = OFFER_KORT;
  dlg.el.querySelector('.ga-klein').textContent = OFFER_KLEIN;
  const leg = dlg.el.querySelector('.ga-legenda');
  // een sier-widget mag het aanbod nooit blokkeren: lukt hij niet, dan blijft alleen de zin staan
  try {
    if (dlg.legenda) dlg.legenda.verwijder();
    dlg.legenda = maakWidget('stappen', leg, { modus: 'legenda', label: 'Dit verandert de hulp', stappen: offerLegenda('licht') });
    if (dlg.legenda) dlg.legenda.ververs();
    // de schermlezer hoort nog steeds de hele tekst
    dlg.el.querySelector('.ga-box').setAttribute('aria-description', offerText('licht'));
  } catch (e) { dlg.legenda = null; }

  dlg.world = world;
  dlg.stepId = stepId;
  dlg.prevFocus = document.activeElement;
  world.uiPaused = true;
  zachtePauze(world, 'hulpaanbod', true); // met meer spelers loopt de wereld door (#452)
  if (document.pointerLockElement) document.exitPointerLock();
  dlg.el.hidden = false;
  dlg.el.querySelector('[data-gh="licht"]').focus({ preventScroll: true });
  clearTimeout(offerTimer);
  // time-out: scherm weg zonder als "nee" te tellen (zie closeOffer)
  offerTimer = setTimeout(() => { if (isHelpOfferOpen()) closeOffer('nee', false); }, OFFER_TIMEOUT_MS);
  return true;
}
