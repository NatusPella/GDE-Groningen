// Recap card "Waar waren we?", showing it: after loading a saved game (Doorgaan) this waits for a calm moment and then
// puts one short card on screen: what the story is about, what was done last, what the goal is now.
// The rules are in recapcard.js (pure, tested by scripts/recapcard_test.mjs); this is the thin layer with the card in
// the DOM, the pause and the per-device storage.
//
// What this never does: write anything into the save or the progress, send anything over the network or move the
// player. The world stands still while the card is open (world.uiPaused, like the help offer) and carries on where it was.
// Samen spelen: local, see recapcard.js. Follows the setting Terugkeerscène (which now covers the whole return).
import { getSettings } from './settings.js';
import { isCinematicActive, sinceCinematic } from './cinematics.js';
import { narrativeBusy } from './narrative.js';
import { storyDataReady } from './storytext.js';
import { currentStep, getStoryView, getStorySteps } from './storyquery.js';
import { PARTS, WHY, partName } from './storyarc.js';
import { isMissionActive } from './missions.js';
import { AUTOPLAY, STORY_TEST } from './devflags.js';
import { zachtePauze } from './coopgroep.js';
import { isRecapOpen, markRecapOpen } from './recapstate.js';
import { icoon } from './icons.js';
import { sprekerNaam } from './spelstatus.js';
import { hoofdspeler } from './players.js';
import { dsButtonKey } from './dsbutton.js';
import { recapContent, recapRows, recapBlockers, recapDecide, readRecapSeen, writeRecapSeen, recapSeenRecently, RECAP_CLOSE_S } from './recapcard.js';
import { escapeHtml as esc } from './htmlescape.js';

let seenLoad = 0;    // the last world.loadCount we already made an attempt for
let attempt = null;  // { waitS, calmS } while we wait for a calm moment
let dlg = null;
let closeTimer = 0;
let cssDone = false;

function storage() { try { return window.localStorage; } catch (e) { return null; } }
export { isRecapOpen };

// De kaartlook (sp-recap, sp-ikoon, ds-z-knop) staat in ds-spel.css; hier alleen de laag eromheen.
const CSS = `
#recapkaart { position: fixed; inset: 0; z-index: 61; display: grid; place-items: center; background: color-mix(in srgb, var(--ds-c-ink-inkt) 55%, transparent); font-family: var(--ds-font-zeef-tekst); }
#recapkaart[hidden] { display: none; }
#recapkaart .rk-box { zoom: calc(var(--ui, 1.2) / 1.2); width: min(640px, calc(100vw / var(--ui, 1.2) * 1.2 - 32px)); }
html.rustig-drukwerk #recapkaart .rk-box { animation: none; }
`;

function ensureCss() {
  if (cssDone) return;
  cssDone = true;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
}

function build() {
  ensureCss();
  const el = document.createElement('div');
  el.id = 'recapkaart';
  el.hidden = true;
  el.innerHTML = `<div class="rk-box ds-zeef sp-recap" role="dialog" aria-modal="true" aria-labelledby="rk-kop"><b class="sp-recap__kop" id="rk-kop">Waar waren we?</b><span class="sp-hulp rk-deel"></span><div class="rk-rijen"></div><div class="sp-actie" style="justify-content:space-between"><button type="button" class="ds-z-link" data-rk-over>Naar het Overzicht</button>${dsButtonKey({ label: 'Verder', toets: 'ENTER', attrs: 'data-rk-ok' })}</div></div>`;
  document.body.appendChild(el);
  el.addEventListener('mousedown', (e) => e.stopPropagation());
  el.addEventListener('click', (e) => {
    const naarOverzicht = e.target.closest && e.target.closest('[data-rk-over]');
    close();
    if (naarOverzicht) import('./pausemenu.js').then((m) => m.openPauseMenu('spel')).catch((err) => console.warn('recap naar overzicht', err));
  });
  window.addEventListener('keydown', (e) => {
    if (el.hidden) return;
    if (e.key === 'Tab') {
      const knoppen = [...el.querySelectorAll('button:not([disabled])')];
      if (!knoppen.length) return;
      e.preventDefault();
      e.stopPropagation();
      const i = knoppen.indexOf(document.activeElement);
      knoppen[i < 0 ? (e.shiftKey ? knoppen.length - 1 : 0) : (i + (e.shiftKey ? -1 : 1) + knoppen.length) % knoppen.length].focus({ preventScroll: true });
      return;
    }
    if (!['Enter', ' ', 'Escape', 'Backspace'].includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) return;
    if (e.key === 'Enter' || e.key === ' ') {
      const active = document.activeElement;
      const over = active && el.contains(active) && active.closest && active.closest('[data-rk-over]');
      if (over) { over.click(); return; }
    }
    close();
  }, true);
  return { el, world: null, prevFocus: null };
}

function close() {
  const d = dlg;
  if (!d || d.el.hidden) return;
  clearTimeout(closeTimer);
  d.el.hidden = true;
  markRecapOpen(false);
  if (d.world) {
    d.world.uiPaused = false;
    zachtePauze(d.world, 'recapkaart', false);
    if (d.world.input) d.world.input.reset();
  }
  if (d.prevFocus && d.prevFocus.isConnected) d.prevFocus.focus({ preventScroll: true });
}

// The input for recapContent, from the story progress (storyquery.js: read only, no import of story.js).
function contentInput(w) {
  const step = currentStep();
  if (!step || step.end) return { ended: true };
  const view = getStoryView();
  const done = [...getStorySteps()].reverse().find((s) => s.done && !s.skipped && s.kind === 'mission');
  return {
    ended: false,
    wie: (() => { try { return sprekerNaam(hoofdspeler(w).character); } catch (e) { return ''; } })(),
    step: { id: step.id, part: step.part, title: step.title, lead: view && view.lead ? view.lead : '' },
    last: done ? done.title : '',
    partTitle: PARTS[step.part] ? PARTS[step.part].title : partName(step.part),
    why: WHY[step.part] || '',
  };
}

function snapshot(w, menuOpen) {
  const st = currentStep();
  return {
    off: getSettings().terugkeerScene === false,
    testbed: !!(AUTOPLAY || STORY_TEST),
    started: document.body.classList.contains('game-started'),
    loading: !!document.getElementById('load-screen'),
    loaded: !!w.loadedFromSave,
    client: w.coopRole === 'client',
    session: !!(w.coopNet && !w.coopSolo),
    openingDue: !!st && !st.end && !!st.goal && st.goal.type === 'opening',
    missionActive: isMissionActive(),
    cinematicActive: isCinematicActive(),
    sinceCinematicS: sinceCinematic(),
    narrativeBusy: narrativeBusy(),
    pigeon: !!w.pigeonMode,
    activity: !!w.activityGame,
    respawn: !!w.pendingRespawn,
    menuOpen: !!(w.uiPaused || w.devPanelOpen || (menuOpen && menuOpen())),
    dataReady: storyDataReady(),
  };
}

function fill(card, withNowClass) {
  dlg.el.querySelector('.rk-deel').textContent = [card.wie ? `Je speelt als ${card.wie}` : '', card.part].filter(Boolean).join(' · ');
  const IC = { 'Waar het om draait': 'verhaal', 'Laatst gedaan': 'vinkje', Nu: 'doel' };
  dlg.el.querySelector('.rk-rijen').innerHTML = recapRows(card)
    .map(([label, text]) => `<div class="sp-recap__rij${withNowClass && label === 'Nu' ? ' sp-recap__rij--nu' : ''}"><span class="sp-ikoon${label === 'Nu' ? ' sp-ikoon--geel' : ''}">${icoon(IC[label] || 'verhaal', { cls: 'sp-ic' })}</span><div><small>${esc(label)}</small><p>${esc(text)}</p></div></div>`).join('');
}

// `menuOpen`: main.js passes whether a menu, the map, the phone or a shop is open.
export function updateRecap(dt, w, menuOpen) {
  if (!w || isRecapOpen()) return;
  const lc = w.loadCount || 0;
  if (lc > seenLoad) { seenLoad = lc; attempt = { waitS: 0, calmS: 0 }; }
  if (!attempt) return;
  if (!document.body.classList.contains('game-started')) return;
  attempt.waitS += dt;
  const blockers = recapBlockers(snapshot(w, menuOpen));
  attempt.calmS = blockers.length ? 0 : attempt.calmS + dt;
  const decision = recapDecide({ blockers, waitS: attempt.waitS, calmS: attempt.calmS });
  if (decision === 'wait') return;
  attempt = null;
  if (decision === 'show') show(w);
}

// Op verzoek (Overzicht > Waar waren we?): de kaart opnieuw, ook als hij net al is getoond.
export function toonRecapNu(w) {
  if (!w || isRecapOpen()) return false;
  return show(w, true);
}

function show(w, opVerzoek = false) {
  const card = recapContent(contentInput(w));
  if (!card) return false;
  const store = storage();
  if (!opVerzoek && recapSeenRecently(readRecapSeen(store), card.stepId)) return false;
  if (!dlg) dlg = build();
  dlg.world = w;
  fill(card, true);
  dlg.prevFocus = document.activeElement;
  w.uiPaused = true;
  zachtePauze(w, 'recapkaart', true);
  if (document.pointerLockElement) document.exitPointerLock();
  dlg.el.hidden = false;
  markRecapOpen(true);
  dlg.el.querySelector('[data-rk-ok]').focus({ preventScroll: true });
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => { if (isRecapOpen()) close(); }, RECAP_CLOSE_S * 1000);
  writeRecapSeen(store, card.stepId);
  return true;
}

