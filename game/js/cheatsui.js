// Pauzemenu › Cheats: the cheats as rows in the menu's own style (switches,
// quiet buttons, ??? for the locked ones, folded away). The one in focus is
// explained beside the list. State and effects live in cheats.js.
import { CHEATS } from './cheatlist.js';
import { ACHIEVEMENTS } from './achievements.js';
import { STEPS } from './storyarc.js';
import {
  isAvailable, isCheatOn, setCheat, achievementsBlocked, cheatsBusy, blockedReason,
  spawnChoices, spawnVehicleHere,
} from './cheats.js';
import { isFolded } from './todoui.js';

const KIND = { car: 'Auto', bike: 'Fiets', scooter: 'E-step', boat: 'Boot', heli: 'Heli' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="11" width="13" height="9" rx="1.5"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/></svg>';
const CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg>';

let picker = false;
let msg = '';
let sel = null;
let lastW = null;

function hintOf(c) {
  if (c.hint) return c.hint;
  const st = c.step && STEPS.find((x) => x.id === c.step);
  if (st) return `Speel het verhaal tot en met "${st.title}"`;
  if (c.ach) {
    const a = ACHIEVEMENTS.find((x) => x.id === c.ach);
    return a ? `Haal de prestatie "${a.title}"` : 'Haal een prestatie';
  }
  return '';
}

const noteOf = (c) => (c.safe || c.id === 'teleport' || c.id === 'voertuig' ? 'Prestaties blijven aan, ook tijdens missies.' : 'Niet tijdens missies en filmpjes. Prestaties staan uit zolang hij aan staat.');

function lockedRow(c) {
  return `<div class="m-li off" tabindex="0" data-cheat-row="${c.id}"><span class="nm"><span class="one">???</span><span class="mut one">${esc(hintOf(c))}</span></span>${LOCK}<span class="t">Op slot</span></div>`;
}

function actionRow(c, w) {
  const busy = blockedReason(w);
  let ctrl;
  if (c.id === 'teleport') ctrl = `<button type="button" class="m-bt" data-cheat-act="teleport"${busy ? ' disabled' : ''}>Kies op de kaart</button>`;
  else if (c.id === 'voertuig') ctrl = `<button type="button" class="m-bt" data-cheat-act="picker" aria-expanded="${picker}"${busy ? ' disabled' : ''}>${picker ? 'Lijst dicht' : 'Kies voertuig'}</button>`;
  else ctrl = '<span class="t g">Vrijgespeeld</span>';
  let row = `<div class="m-li" data-cheat-row="${c.id}"><span class="nm"><span class="one">${esc(c.name)}</span>${busy && (c.id === 'teleport' || c.id === 'voertuig') ? `<span class="mut one">${esc(busy)}</span>` : ''}</span>${ctrl}</div>`;
  if (c.id === 'voertuig' && picker && !busy) {
    row += '<div class="st-pick">' + spawnChoices(w).map((v) => `<button type="button" class="m-chip" data-cheat-spawn="${esc(v.id)}">${esc(v.label)} <span>${KIND[v.kind] || ''}${v.own ? '' : ' · showroom'}</span></button>`).join('') + '</div>';
  }
  return row;
}

function toggleRow(c) {
  return `<label class="m-li" data-cheat-row="${c.id}"><span class="nm"><span class="one">${esc(c.name)}</span></span><input type="checkbox" class="m-sw" data-cheat="${c.id}"${isCheatOn(c.id) ? ' checked' : ''}></label>`;
}

function paneHtml(w) {
  const c = CHEATS.find((x) => x.id === sel);
  const blocked = achievementsBlocked();
  const busy = cheatsBusy(w);
  const intro = blocked
    ? 'Prestaties staan uit zolang er een cheat aan staat (de uiterlijk-cheats en teleporteren tellen niet mee).'
    : 'Teleporteren, Voertuig hier en de uiterlijk-cheats laten je prestaties aan. Zet je een andere cheat aan, dan staan prestaties uit tot je hem weer uitzet.';
  if (!c) return `<div class="pm-pane-top"><span class="m-eb">Cheats</span><h2 class="m-h2 td-h2">Een beetje vals spelen</h2></div><p>${intro}</p>`;
  const open = isAvailable(c.id);
  return `<div class="pm-pane-top"><span class="m-eb">${c.kind === 'action' || c.kind === 'perk' ? 'Actie' : c.safe ? 'Cheat · uiterlijk' : 'Cheat'}</span><h2 class="m-h2 td-h2">${open ? esc(c.name) : '???'}</h2></div>` +
    `<p>${open ? esc(c.desc) : esc(hintOf(c))}</p>` +
    (open ? `<p class="${c.safe || c.kind === 'action' ? 'g' : 'mut'}">${noteOf(c)}</p>` : '') +
    '<span class="m-grow"></span>' +
    (busy ? '<p class="mut">Je bent nu bezig (missie, filmpje of uitdaging): alleen de uiterlijk-cheats doen nu mee.</p>' : '') +
    `<p class="${blocked ? 'red' : 'mut'}">${intro}</p><p class="g st-msg" role="status">${esc(msg)}</p>`;
}

// Fills the section; returns the sheet subtitle.
export function renderCheatsPanel(el, w) {
  lastW = w;
  const actions = CHEATS.filter((c) => c.kind === 'action' || c.kind === 'perk');
  const toggles = CHEATS.filter((c) => !c.kind || c.kind === 'toggle');
  const open = toggles.filter((c) => isAvailable(c.id));
  const shut = [...actions, ...toggles].filter((c) => !isAvailable(c.id));
  const lit = toggles.filter((c) => isCheatOn(c.id)).length;
  const lockedOpen = isFolded('locked');
  if (sel && !CHEATS.some((c) => c.id === sel)) sel = null;
  el.innerHTML = '<div class="m-main"><div class="m-list pm-slist">' +
    '<div class="m-gh"><span>Acties</span></div>' + actions.filter((c) => isAvailable(c.id)).map((c) => actionRow(c, w)).join('') +
    `<div class="m-gh"><span>Cheats</span><span>${lit ? `${lit} aan` : ''}</span></div>` + open.map(toggleRow).join('') +
    (shut.length ? `<div class="m-rule"></div><button type="button" class="m-disc" data-fold="locked" aria-expanded="${lockedOpen}" aria-controls="pm-f-locked">${CHEV}<b>Nog ${shut.length} op slot</b><span class="mut one">Speel verder in het verhaal of haal prestaties</span></button>` +
      `<div class="m-fold" id="pm-f-locked" data-fold-body="locked"${lockedOpen ? '' : ' hidden'}>${shut.map(lockedRow).join('')}</div>` : '') +
    `</div><aside class="m-pane cheat-pane" aria-live="polite">${paneHtml(w)}</aside></div>`;
  const n = CHEATS.filter((c) => isAvailable(c.id)).length;
  return `${n} van ${CHEATS.length} vrijgespeeld${lit ? ` · ${lit} aan` : ''}`;
}

// Focus on a row shows what it does.
export function cheatsFocus(panel, el) {
  const r = el && el.closest && el.closest('[data-cheat-row]');
  if (!r || !panel.contains(r) || r.dataset.cheatRow === sel) return;
  sel = r.dataset.cheatRow;
  const pane = panel.querySelector('.cheat-pane');
  if (pane && lastW) pane.innerHTML = paneHtml(lastW);
}

// A switch flipped (click, Enter or A): one of a group turns the others off.
export function cheatsInput(input) {
  setCheat(input.dataset.cheat, input.checked);
  msg = '';
}

// api: { teleport(), close(), rerender(focus) }. True when handled.
export function cheatsClick(e, w, api) {
  const act = e.target.closest('[data-cheat-act]');
  if (act) {
    const a = act.dataset.cheatAct;
    if (a === 'teleport') { msg = ''; picker = false; api.teleport(); return true; }
    if (a === 'picker') { picker = !picker; msg = ''; api.rerender('[data-cheat-act="picker"]'); return true; }
  }
  const sp = e.target.closest('[data-cheat-spawn]');
  if (sp) {
    const res = spawnVehicleHere(sp.dataset.cheatSpawn, w);
    if (res.ok) { picker = false; msg = ''; w.addMessage(res.text, 3, { kind: 'tip' }); api.close(); return true; }
    msg = res.text;
    api.rerender(`[data-cheat-spawn="${sp.dataset.cheatSpawn}"]`);
    return true;
  }
  return false;
}

export function resetCheatsPanel() {
  picker = false;
  msg = '';
  sel = null;
}
