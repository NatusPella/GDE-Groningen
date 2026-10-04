// Pauzemenu › Streken: the cheats as rows in the menu's own style (switches,
// buttons, ??? for the locked ones). State and effects live in cheats.js.
import { CHEATS } from './cheatlist.js';
import { ACHIEVEMENTS } from './achievements.js';
import {
  isAvailable, isCheatOn, setCheat, achievementsBlocked, cheatsBusy, blockedReason,
  spawnChoices, spawnVehicleHere, takeMoney, wasUsed,
} from './cheats.js';

const KIND = { car: 'Auto', bike: 'Fiets', scooter: 'E-step', boat: 'Boot', heli: 'Heli' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let picker = false;
let msg = '';
let styled = false;

const CSS = `
  #pause-menu .st-intro { margin: 0 0 10px; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(63,201,122,0.3); background: rgba(30,158,86,0.08); font: 15px/1.4 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.85); }
  #pause-menu .st-intro.st-off { border-color: rgba(217,63,63,0.55); background: rgba(217,63,63,0.1); }
  #pause-menu .st-intro b { color: #f2f2f2; }
  #pause-menu .st-tag { justify-self: start; grid-column: 2 / -1; font: 16px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 1px; color: rgba(240,237,228,0.5); }
  #pause-menu .st-tag.st-yes { color: #3fc97a; }
  #pause-menu .pm-row small em { font-style: normal; color: #3fc97a; }
  #pause-menu .pm-row small i { font-style: normal; color: rgba(240,237,228,0.75); }
  #pause-menu .st-locked > span:first-child { color: rgba(240,237,228,0.5); }
  #pause-menu .pm-streken .pm-row > .pm-secondary { font-size: 19px; letter-spacing: 1px; padding: 8px 16px 6px; min-height: 0; }
  #pause-menu .st-pick { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 0 12px; }
  #pause-menu .st-pick button { font: 15px 'Arial Narrow', Arial, sans-serif; padding: 7px 12px; border-radius: 8px; color: #f0ede4; cursor: pointer; }
  #pause-menu .st-pick button small { margin-left: 6px; color: rgba(240,237,228,0.55); }
  #pause-menu .st-msg:empty { display: none; }
`;

function hintOf(c) {
  if (c.hint) return c.hint;
  if (c.ach) {
    const a = ACHIEVEMENTS.find((x) => x.id === c.ach);
    return a ? `Haal de prestatie "${a.title}"` : 'Haal een prestatie';
  }
  return '';
}

function note(c) {
  return c.safe ? '<em>uiterlijk · prestaties blijven aan</em>' : '<i>niet tijdens missies</i>';
}

function lockedRow(c) {
  return `<div class="pm-row st-locked"><span>???<small>${esc(hintOf(c))}</small></span><span class="st-tag">Op slot</span></div>`;
}

function actionRow(c, w) {
  if (!isAvailable(c.id)) return lockedRow(c);
  const busy = blockedReason(w, { vehicleOk: c.id === 'teleport' });
  let ctrl = '';
  if (c.id === 'teleport') ctrl = `<button type="button" class="pm-secondary" data-cheat-act="teleport"${busy ? ' disabled' : ''}><span>Kies op de kaart</span></button>`;
  else if (c.id === 'voertuig') ctrl = `<button type="button" class="pm-secondary" data-cheat-act="picker" aria-expanded="${picker}"${busy ? ' disabled' : ''}><span>${picker ? 'Lijst dicht' : 'Kies voertuig'}</span></button>`;
  else if (c.id === 'geld') ctrl = wasUsed('geld') ? '<span class="st-tag">Al gepind in dit spel</span>' : '<button type="button" class="pm-secondary" data-cheat-act="geld"><span>Pinnen</span></button>';
  else ctrl = '<span class="st-tag st-yes">Vrijgespeeld</span>';
  const extra = c.id === 'teleport' || c.id === 'voertuig' ? '<em>prestaties blijven aan</em>' : c.id === 'geld' ? '<i>prestaties uit tot je een save laadt</i>' : '';
  let row = `<div class="pm-row"><span>${esc(c.name)}<small>${esc(c.desc)}${extra ? ' · ' + extra : ''}${busy && (c.id === 'teleport' || c.id === 'voertuig') ? ' · <i>' + esc(busy) + '</i>' : ''}</small></span>${ctrl}</div>`;
  if (c.id === 'voertuig' && picker && !busy) {
    row += '<div class="st-pick">' + spawnChoices(w).map((v) => `<button type="button" class="pm-secondary" data-cheat-spawn="${esc(v.id)}">${esc(v.label)}<small>${KIND[v.kind] || ''}${v.own ? '' : ' · showroom'}</small></button>`).join('') + '</div>';
  }
  return row;
}

function toggleRow(c) {
  if (!isAvailable(c.id)) return lockedRow(c);
  return `<label class="pm-row"><span>${esc(c.name)}<small>${esc(c.desc)} · ${note(c)}</small></span><input type="checkbox" data-cheat="${c.id}"${isCheatOn(c.id) ? ' checked' : ''}></label>`;
}

// Fills the section; returns the sheet subtitle.
export function renderCheatsPanel(el, w) {
  if (!styled) {
    styled = true;
    const s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  const blocked = achievementsBlocked();
  const busy = cheatsBusy(w);
  const actions = CHEATS.filter((c) => c.kind === 'action' || c.kind === 'perk');
  const toggles = CHEATS.filter((c) => !c.kind || c.kind === 'toggle');
  const intro = blocked
    ? '<b>Prestaties staan uit</b> zolang er een streek aan staat (de uiterlijk-streken en teleporteren tellen niet mee).'
    : 'Teleporteren, Voertuig hier en de uiterlijk-streken laten je prestaties aan. Zet je een andere streek aan, dan staan prestaties uit tot je hem weer uitzet.';
  el.innerHTML = `<p class="st-intro${blocked ? ' st-off' : ''}">${intro}${busy ? '<br>Je bent nu bezig (missie, filmpje of uitdaging): alleen de uiterlijk-streken doen nu mee.' : ''}</p>` +
    `<p class="pm-note st-msg" role="status">${esc(msg)}</p>` +
    '<h3 class="pm-subhead">Acties</h3><div class="pm-group">' + actions.map((c) => actionRow(c, w)).join('') + '</div>' +
    '<h3 class="pm-subhead">Streken</h3><div class="pm-group">' + toggles.map(toggleRow).join('') + '</div>';
  const n = CHEATS.filter((c) => isAvailable(c.id)).length;
  const lit = toggles.filter((c) => isCheatOn(c.id)).length;
  return `${n} van ${CHEATS.length} vrijgespeeld${lit ? ` · ${lit} aan` : ''}`;
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
    if (a === 'geld') { msg = takeMoney(w).text; api.rerender('[data-cheat-act="geld"], [data-cheat]'); return true; }
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
}
